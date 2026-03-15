#!/bin/bash
cd "$(dirname "$0")"

# 检查 Python
if ! command -v python3 &>/dev/null; then
    osascript -e 'display alert "未找到 Python 3" message "请先安装 Python 3.10+\nhttps://www.python.org/downloads/"'
    exit 1
fi

# 检查 Node.js
if ! command -v node &>/dev/null; then
    osascript -e 'display alert "未找到 Node.js" message "请先安装 Node.js 18+\nhttps://nodejs.org/zh-cn"'
    exit 1
fi

echo "✅ 环境检测通过，启动图形界面..."
python3 launcher.py
