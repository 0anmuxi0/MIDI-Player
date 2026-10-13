"""用 Win32 UpdateResource 给 exe 嵌入图标（该工具链没有 windres，因此绕开 .rc）。

会把 icon.ico 中的每个尺寸写成一个 RT_ICON 资源，并生成 RT_GROUP_ICON 把它们串起来。
必须在追加资源包之前执行（UpdateResource 会重建 exe 结构）。

用法：  python host/seticon.py <exe> <ico>
"""
import ctypes
import struct
import sys
from ctypes import wintypes
from pathlib import Path

RT_ICON = 3
RT_GROUP_ICON = 14

kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
kernel32.BeginUpdateResourceW.argtypes = [wintypes.LPCWSTR, wintypes.BOOL]
kernel32.BeginUpdateResourceW.restype = wintypes.HANDLE
kernel32.UpdateResourceW.argtypes = [
    wintypes.HANDLE, ctypes.c_void_p, ctypes.c_void_p,
    wintypes.WORD, ctypes.c_void_p, wintypes.DWORD,
]
kernel32.UpdateResourceW.restype = wintypes.BOOL
kernel32.EndUpdateResourceW.argtypes = [wintypes.HANDLE, wintypes.BOOL]
kernel32.EndUpdateResourceW.restype = wintypes.BOOL


def read_ico(path):
    raw = Path(path).read_bytes()
    reserved, ico_type, count = struct.unpack("<HHH", raw[:6])
    if reserved != 0 or ico_type != 1:
        raise ValueError("不是有效的 ICO 文件")
    entries = []
    for index in range(count):
        offset = 6 + index * 16
        width, height, colors, _reserved, planes, bpp, size, data_offset = struct.unpack(
            "<BBBBHHII", raw[offset:offset + 16]
        )
        entries.append({
            "width": width or 256,
            "height": height or 256,
            "colors": colors,
            "planes": planes or 1,
            "bpp": bpp or 32,
            "size": size,
            "data": raw[data_offset:data_offset + size],
        })
    return entries


def build_group(entries, ids):
    # GRPICONDIR: reserved(0), type(1=icon), count
    out = struct.pack("<HHH", 0, 1, len(entries))
    for entry, rid in zip(entries, ids):
        out += struct.pack(
            "<BBBBHHIH",
            0 if entry["width"] >= 256 else entry["width"],
            0 if entry["height"] >= 256 else entry["height"],
            entry["colors"],
            0,
            entry["planes"],
            entry["bpp"],
            entry["size"],
            rid,
        )
    return out


def main():
    if len(sys.argv) < 3:
        print("用法: python host/seticon.py <exe> <ico>")
        return 1

    exe_path = Path(sys.argv[1])
    ico_path = Path(sys.argv[2])
    if not exe_path.is_file():
        print(f"找不到 exe: {exe_path}")
        return 1
    if not ico_path.is_file():
        print(f"找不到 ico: {ico_path}")
        return 1

    entries = read_ico(ico_path)
    handle = kernel32.BeginUpdateResourceW(str(exe_path), False)
    if not handle:
        print(f"BeginUpdateResource 失败: {ctypes.get_last_error()}")
        return 1

    ok = True
    ids = []
    try:
        for index, entry in enumerate(entries, start=1):
            ids.append(index)
            buffer = ctypes.create_string_buffer(entry["data"], len(entry["data"]))
            if not kernel32.UpdateResourceW(handle, RT_ICON, index, 0, buffer, len(entry["data"])):
                print(f"写入 RT_ICON {index} 失败")
                ok = False
                break
        if ok:
            group = build_group(entries, ids)
            buffer = ctypes.create_string_buffer(group, len(group))
            if not kernel32.UpdateResourceW(handle, RT_GROUP_ICON, 1, 0, buffer, len(group)):
                print("写入 RT_GROUP_ICON 失败")
                ok = False
    finally:
        if not kernel32.EndUpdateResourceW(handle, not ok):
            print("EndUpdateResource 失败")
            ok = False

    if ok:
        print(f"已嵌入图标: {len(entries)} 个尺寸 -> {exe_path.name}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
