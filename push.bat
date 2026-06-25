@echo off
cd /d "%~dp0"
chcp 65001 >nul
git add -A
set /p msg="Message:"
if "%msg%"=="" set msg=更新 %date%
git commit -m "%msg%"
if %errorlevel% neq 0 (
    echo 没有需要提交的变更，或提交失败
    pause
    exit /b
)
git push
if %errorlevel% neq 0 (
    echo push 失败，请检查网络或仓库权限
    pause
    exit /b
)
echo 推送成功！
pause
