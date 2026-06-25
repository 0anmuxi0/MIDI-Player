@echo off
cd /d "%~dp0"
chcp 65001 >nul
setlocal enabledelayedexpansion
git add -A
set msg=
set /p msg=Message:
if "!msg!"=="" set msg=更新 %date%
git commit -m "!msg!"
if errorlevel 1 (
    echo Nothing to commit, working tree clean.
    pause
    exit /b
)
git push
if errorlevel 1 (
    echo push failed, please check your network connection or authentication.
    pause
    exit /b
)
echo Push successful!
pause >nul
