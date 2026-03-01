#!/bin/bash

# AI Agent Pro v8.1.0 - 使用Token的自动化部署脚本
# 使用方法: GITHUB_TOKEN=your_token ./deploy-with-token.sh

set -e

echo "🚀 AI Agent Pro v8.1.0 - Token认证部署脚本"
echo "=========================================="
echo ""

# 检查Token
if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ 错误: 请设置GITHUB_TOKEN环境变量"
    echo ""
    echo "使用方法:"
    echo "  export GITHUB_TOKEN=your_personal_access_token"
    echo "  ./deploy-with-token.sh"
    echo ""
    echo "生成Token: https://github.com/settings/tokens"
    echo "权限需要: repo"
    exit 1
fi

# 检查是否在正确的目录
if [ ! -f "index.html" ]; then
    echo "❌ 错误: 请在项目根目录执行此脚本"
    exit 1
fi

# 配置Git使用Token
echo "🔧 配置Git认证..."
git remote set-url origin https://${GITHUB_TOKEN}@github.com/SugarWilliam/AI-Agent-pro.git

# 检查Git状态
echo ""
echo "📋 检查Git状态..."
PENDING_COMMITS=$(git log --oneline origin/gh-pages..HEAD 2>/dev/null | wc -l)

if [ "$PENDING_COMMITS" -eq 0 ]; then
    echo "✅ 没有待推送的提交"
    exit 0
fi

echo "📊 待推送提交数: $PENDING_COMMITS"
echo ""
echo "📝 最新提交:"
git log --oneline -5

echo ""
echo "🔄 开始推送..."

# 推送
if git push origin gh-pages 2>&1; then
    echo ""
    echo "✅ 推送成功！"
    echo ""
    echo "📝 下一步:"
    echo "1. GitHub Actions会自动部署（如果已配置）"
    echo "2. 或访问 https://github.com/SugarWilliam/AI-Agent-pro/settings/pages 配置Pages"
    echo "3. 等待1-2分钟部署完成"
    echo "4. 访问 https://sugarwilliam.github.io/AI-Agent-pro/"
    echo ""
    
    # 恢复远程URL（移除Token）
    git remote set-url origin https://github.com/SugarWilliam/AI-Agent-pro.git
    echo "🔒 已清除Token信息"
    
    exit 0
else
    PUSH_ERROR=$?
    echo ""
    echo "❌ 推送失败（退出码: $PUSH_ERROR）"
    echo ""
    echo "请检查:"
    echo "1. Token是否正确"
    echo "2. Token是否有repo权限"
    echo "3. 网络连接"
    
    # 恢复远程URL
    git remote set-url origin https://github.com/SugarWilliam/AI-Agent-pro.git
    
    exit $PUSH_ERROR
fi
