@echo off
chcp 65001 >nul
title Minecraft AI 机器人启动器

:: 检查 Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 未找到 Python！
    echo    请先安装 Python 3.10 或更高版本：
    echo    https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

:: 检查 Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 未找到 Node.js！
    echo    请先安装 Node.js 18 或更高版本：
    echo    https://nodejs.org/zh-cn
    echo.
    pause
    exit /b 1
)

echo ✅ 环境检测通过，正在启动图形界面...
python launcher.py
