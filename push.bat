@echo off
cd /d "%~dp0"
chcp 65001 >nul
git add -A
set /p msg="Message:"
git commit -m "%msg%"
git push
pause
