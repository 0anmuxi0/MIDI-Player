"""把 soundfonts 目录打包成单个 zip（ZIP_STORED，不压缩）。

为什么需要它：
  PyInstaller 单文件模式在每次启动时都会把打包进去的内容解开到 %TEMP%。
  4504 个音色小文件要解压约 10 秒；打成一个 zip 后启动只需解压这 1 个文件，
  具体音色在浏览器请求时由 Flask 按需从 zip 中取出（见 MIDI Player.py 的
  serve_soundfont）。这样启动从约 11 秒降到约 3 秒，同时保持单文件分发。

用法：
  python tools/pack_soundfonts.py     # 生成/更新 soundfonts.zip
  然后打包 exe 时用 --add-data "soundfonts.zip;." 代替 --add-data "soundfonts;soundfonts"
"""
import os
import sys
import zipfile
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SRC_DIR = BASE_DIR / "soundfonts"
DST_ZIP = BASE_DIR / "soundfonts.zip"


def main():
    if not SRC_DIR.is_dir():
        print(f"找不到音色目录：{SRC_DIR}")
        return 1

    count = 0
    with zipfile.ZipFile(DST_ZIP, "w", zipfile.ZIP_STORED, allowZip64=True) as archive:
        for root, _, files in os.walk(SRC_DIR):
            for name in files:
                full = Path(root) / name
                arcname = full.relative_to(SRC_DIR).as_posix()
                archive.write(full, arcname)
                count += 1

    size_mb = DST_ZIP.stat().st_size / 1024 / 1024
    print(f"已打包 {count} 个文件 -> {DST_ZIP}（{size_mb:.1f} MB）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
