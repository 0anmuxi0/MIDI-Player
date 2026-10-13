"""把前端产物、音色库与 WebView2Loader 打成资源包，追加到宿主 exe 尾部。

布局：  [exe 原始内容][zip 数据][uint64 zipSize][uint64 zipOffset][8B "MIDIPAY1"]

运行时宿主把整个 exe 映射进内存，按需从 zip 中切片读取单个文件——
不解压、不产生临时文件，因此启动与 Python 版本相比几乎无等待。

用法：  python host/pack.py [exe 路径]
"""
import os
import sys
import zipfile
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MAGIC = b"MIDIPAY1"
DEFAULT_EXE = BASE_DIR / "host" / "build" / "MIDI Player.exe"
ZIP_PATH = BASE_DIR / "host" / "build" / "payload.zip"
# WebView2Loader.dll 在 SDK 目录里（该工具链没有静态 loader）
WORKSPACE = Path(r"C:\Users\_anmuxi_\Documents\deepseek-harness\default-workspace")


def collect_sources():
    """返回 [(zip 内前缀, 源路径)]，前缀为空表示按文件名直接放入。"""
    items = [
        ("assets", BASE_DIR / "assets"),
        ("soundfonts", BASE_DIR / "soundfonts"),
    ]
    for loader in (
        WORKSPACE / "tools" / "webview2sdk" / "WebView2Loader.dll",
        BASE_DIR / "tools" / "webview2sdk" / "WebView2Loader.dll",
    ):
        if loader.is_file():
            items.append(("", loader))
            break
    return items


def build_zip():
    count = 0
    total = 0
    ZIP_PATH.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_STORED, allowZip64=True) as archive:
        for prefix, source in collect_sources():
            source = Path(source)
            if source.is_file():
                arcname = prefix + "/" + source.name if prefix else source.name
                archive.write(source, arcname)
                count += 1
                total += source.stat().st_size
            elif source.is_dir():
                for root, _, files in os.walk(source):
                    for name in files:
                        full = Path(root) / name
                        relative = full.relative_to(source).as_posix()
                        arcname = f"{prefix}/{relative}" if prefix else relative
                        archive.write(full, arcname)
                        count += 1
                        total += full.stat().st_size
    print(f"资源包: {count} 个文件, {total / 1024 / 1024:.1f} MB -> {ZIP_PATH.name}")
    return count


def append_payload(exe_path):
    payload = ZIP_PATH.read_bytes()
    original = exe_path.read_bytes()
    offset = len(original)
    with open(exe_path, "wb") as handle:
        handle.write(original)
        handle.write(payload)
        handle.write(len(payload).to_bytes(8, "little"))
        handle.write(offset.to_bytes(8, "little"))
        handle.write(MAGIC)
    return offset, len(payload)


def main():
    exe_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_EXE
    if not exe_path.is_file():
        print(f"找不到宿主 exe: {exe_path}")
        return 1

    count = build_zip()
    if count == 0:
        print("资源包为空，终止")
        return 1

    offset, size = append_payload(exe_path)
    final = exe_path.stat().st_size
    print(f"已附加资源包: 偏移={offset} 大小={size / 1024 / 1024:.1f} MB")
    print(f"最终 exe: {exe_path}  {final / 1024 / 1024:.1f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
