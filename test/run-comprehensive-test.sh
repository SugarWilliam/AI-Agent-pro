#!/bin/bash

# AI Agent Pro 全面测试套件启动脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PORT=8080

echo "=========================================="
echo "AI Agent Pro 全面测试套件"
echo "=========================================="
echo ""

# 检查Python3
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未找到 python3"
    exit 1
fi

# 检查端口是否被占用
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✅ 服务器已在端口 $PORT 运行"
    SERVER_PID=$(lsof -ti:$PORT)
    echo "   PID: $SERVER_PID"
else
    echo "🚀 启动本地服务器..."
    cd "$PROJECT_DIR"
    python3 -m http.server $PORT > /dev/null 2>&1 &
    SERVER_PID=$!
    echo "   PID: $SERVER_PID"
    echo "   等待服务器启动..."
    sleep 2
fi

# 打开测试页面
TEST_URL="http://localhost:$PORT/test/comprehensive-test.html"
echo ""
echo "=========================================="
echo "测试页面: $TEST_URL"
echo "=========================================="
echo ""
echo "正在打开浏览器..."

# 根据操作系统打开浏览器
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open "$TEST_URL" 2>/dev/null || sensible-browser "$TEST_URL" 2>/dev/null || firefox "$TEST_URL" 2>/dev/null
elif [[ "$OSTYPE" == "darwin"* ]]; then
    open "$TEST_URL"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    start "$TEST_URL"
else
    echo "请手动打开浏览器访问: $TEST_URL"
fi

echo ""
echo "提示:"
echo "  1. 点击 '🚀 运行所有测试 (100%覆盖)' 开始全面测试"
echo "  2. 测试完成后可点击 '📊 导出报告' 导出测试报告"
echo "  3. 按 Ctrl+C 停止服务器"
echo ""

# 等待用户中断
trap "echo ''; echo '停止服务器...'; kill $SERVER_PID 2>/dev/null; exit" INT TERM

wait $SERVER_PID 2>/dev/null || while true; do sleep 1; done
