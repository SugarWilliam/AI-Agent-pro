#!/bin/bash

# 测试报告处理脚本
# 分析测试报告并生成修复建议

REPORT_FILE="$1"

if [ -z "$REPORT_FILE" ]; then
    echo "用法: $0 <测试报告JSON文件路径>"
    echo ""
    echo "示例:"
    echo "  $0 comprehensive-test-report-1772300854086.json"
    echo "  $0 /path/to/report.json"
    exit 1
fi

if [ ! -f "$REPORT_FILE" ]; then
    echo "❌ 错误: 文件不存在: $REPORT_FILE"
    exit 1
fi

echo "=========================================="
echo "📊 分析测试报告: $REPORT_FILE"
echo "=========================================="
echo ""

# 使用Node.js分析报告
if command -v node &> /dev/null; then
    node test/analyze-test-report.js "$REPORT_FILE"
else
    echo "⚠️  Node.js未安装，使用基础分析..."
    # 基础分析（使用grep和awk）
    echo "总测试数: $(grep -o '"total":[0-9]*' "$REPORT_FILE" | grep -o '[0-9]*' || echo 'N/A')"
    echo "通过: $(grep -o '"passed":[0-9]*' "$REPORT_FILE" | grep -o '[0-9]*' || echo 'N/A')"
    echo "失败: $(grep -o '"failed":[0-9]*' "$REPORT_FILE" | grep -o '[0-9]*' || echo 'N/A')"
    echo ""
    echo "失败的测试:"
    grep -A 5 '"status":"failed"' "$REPORT_FILE" | grep '"name"' | head -10
fi

echo ""
echo "=========================================="
echo "✅ 分析完成"
echo "=========================================="
