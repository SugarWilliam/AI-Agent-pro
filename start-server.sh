#!/bin/bash
# AI Agent Pro 本地服务器启动脚本

echo "=========================================="
echo "AI Agent Pro 本地部署服务器"
echo "=========================================="
echo ""

# 检查Python版本
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "错误: 未找到Python，请先安装Python 3"
    exit 1
fi

echo "使用命令: $PYTHON_CMD"
echo ""

# 获取当前目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "工作目录: $SCRIPT_DIR"
echo ""
echo "启动HTTP服务器..."
echo "访问地址: http://localhost:8080"
echo ""
echo "按 Ctrl+C 停止服务器"
echo "=========================================="
echo ""

# 启动服务器
$PYTHON_CMD -m http.server 8080
