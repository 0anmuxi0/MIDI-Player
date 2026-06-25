@echo off
cd /d "%~dp0"

git add -A
if %errorlevel% neq 0 (
    echo [错误] git add 失败
    pause
    exit /b
)

echo 提交信息:
set /p msg=

if "%msg%"=="" set "msg=更新 %date% %time%"

git commit -m "%msg%"
if %errorlevel% neq 0 (
    echo [错误] git commit 失败，可能没有需要提交的变更
    pause
    exit /b
)

git push
if %errorlevel% neq 0 (
    echo [错误] git push 失败
    pause
    exit /b
)
echo  ✅ 推送成功！
pause
