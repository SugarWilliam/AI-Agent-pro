#!/bin/bash

# AI Agent Pro 全面测试启动脚本（自动化）

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PORT=8000

echo "=========================================="
echo "AI Agent Pro 全面测试套件 - 自动化执行"
echo "=========================================="
echo ""

# 检查Python3
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未找到 python3"
    exit 1
fi

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 node"
    echo "请先安装 Node.js"
    exit 1
fi

# 检查端口是否被占用
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✅ 服务器已在端口 $PORT 运行"
    SERVER_PID=$(lsof -ti:$PORT)
    echo "   PID: $SERVER_PID"
    SERVER_STARTED=false
else
    echo "🚀 启动本地服务器..."
    cd "$PROJECT_DIR"
    python3 -m http.server $PORT > /dev/null 2>&1 &
    SERVER_PID=$!
    echo "   PID: $SERVER_PID"
    echo "   等待服务器启动..."
    sleep 3
    SERVER_STARTED=true
fi

# 检查测试依赖
cd "$SCRIPT_DIR"
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 安装测试依赖..."
    npm install
fi

# 运行自动化测试
echo ""
echo "🧪 启动自动化测试..."
echo ""

node auto-run-tests.js

TEST_EXIT_CODE=$?

# 清理
if [ "$SERVER_STARTED" = true ]; then
    echo ""
    echo "🛑 停止服务器..."
    kill $SERVER_PID 2>/dev/null
fi

exit $TEST_EXIT_CODE
