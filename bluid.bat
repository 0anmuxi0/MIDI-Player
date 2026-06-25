@echo off
title Build MIDI Player
cd /d "%~dp0"
.venv\Scripts\python.exe -m PyInstaller --noconfirm --onefile --windowed ^
    --icon icon.ico ^
    --hidden-import flask ^
    --hidden-import webview ^
    --hidden-import ctypes ^
    --hidden-import json ^
    --hidden-import threading ^
    --hidden-import logging ^
    --hidden-import pathlib ^
    --add-data "assets;assets" ^
    --add-data "soundfonts;soundfonts" ^
    --distpath "dist" ^
    "MIDI Player.py"
start "" "%CD%\dist"
if exist "build" rmdir /s /q "build"
if exist "*.spec" del /q "*.spec" 
if exist "nuld" del /q "nuld"
pause >nul