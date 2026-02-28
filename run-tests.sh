#!/bin/bash
# AI Agent Pro 自动化测试启动脚本

echo "=========================================="
echo "AI Agent Pro 自动化测试"
echo "=========================================="
echo ""

# 检查服务器是否运行
echo "检查服务器状态..."
if curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo "✅ 服务器运行正常"
else
    echo "⚠️  服务器未运行，正在启动..."
    cd "$(dirname "$0")"
    python3 -m http.server 8080 > /dev/null 2>&1 &
    SERVER_PID=$!
    echo "服务器已启动 (PID: $SERVER_PID)"
    sleep 3
    
    # 等待服务器就绪
    for i in {1..10}; do
        if curl -s http://localhost:8080 > /dev/null 2>&1; then
            echo "✅ 服务器就绪"
            break
        fi
        sleep 1
    done
fi

echo ""
echo "进入测试目录..."
cd "$(dirname "$0")/test"

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "安装测试依赖..."
    npm install
fi

echo ""
echo "开始运行测试..."
echo "=========================================="
echo ""

# 运行测试
npm test

TEST_EXIT_CODE=$?

echo ""
echo "=========================================="
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ 所有测试通过"
else
    echo "❌ 部分测试失败，请查看上方输出"
fi
echo "=========================================="

# 清理（如果是我们启动的服务器）
if [ ! -z "$SERVER_PID" ]; then
    echo ""
    echo "停止测试服务器..."
    kill $SERVER_PID 2>/dev/null
fi

exit $TEST_EXIT_CODE
