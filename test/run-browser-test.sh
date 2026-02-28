#!/bin/bash
# 浏览器测试启动脚本

echo "=========================================="
echo "AI Agent Pro 浏览器自动化测试"
echo "=========================================="
echo ""

# 检查服务器是否运行
if ! curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo "⚠️  服务器未运行，正在启动..."
    cd "$(dirname "$0")/.."
    python3 -m http.server 8080 > /dev/null 2>&1 &
    SERVER_PID=$!
    echo "服务器已启动 (PID: $SERVER_PID)"
    sleep 3
fi

echo "✅ 服务器运行正常"
echo ""
echo "测试页面地址: http://localhost:8080/test/browser-test.html"
echo ""
echo "请在浏览器中打开上述地址进行测试"
echo ""
echo "或者使用以下命令自动打开："
echo "  - Linux: xdg-open http://localhost:8080/test/browser-test.html"
echo "  - macOS: open http://localhost:8080/test/browser-test.html"
echo "  - Windows: start http://localhost:8080/test/browser-test.html"
echo ""

# 尝试自动打开浏览器
if command -v xdg-open &> /dev/null; then
    echo "正在打开浏览器..."
    xdg-open http://localhost:8080/test/browser-test.html 2>/dev/null &
elif command -v open &> /dev/null; then
    echo "正在打开浏览器..."
    open http://localhost:8080/test/browser-test.html 2>/dev/null &
fi

echo ""
echo "=========================================="
