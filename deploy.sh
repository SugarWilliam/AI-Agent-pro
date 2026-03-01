#!/bin/bash

# AI Agent Pro v8.1.0 - GitHub部署脚本
# 使用方法: ./deploy.sh

set -e

echo "🚀 AI Agent Pro v8.1.0 - GitHub部署脚本"
echo "========================================"
echo ""

# 检查是否在正确的目录
if [ ! -f "index.html" ]; then
    echo "❌ 错误: 请在项目根目录执行此脚本"
    exit 1
fi

# 检查Git状态
echo "📋 检查Git状态..."
git status --short

echo ""
echo "📊 最新提交:"
git log --oneline -3

echo ""
read -p "是否继续推送到GitHub? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消"
    exit 1
fi

# 尝试SSH方式推送
echo ""
echo "🔄 尝试SSH方式推送..."
if git push origin gh-pages 2>&1; then
    echo ""
    echo "✅ 推送成功！"
    echo ""
    echo "📝 下一步:"
    echo "1. 访问 https://github.com/SugarWilliam/AI-Agent-pro/settings/pages"
    echo "2. 确认Source设置为 'gh-pages' 分支"
    echo "3. 等待1-2分钟部署完成"
    echo "4. 访问 https://sugarwilliam.github.io/AI-Agent-pro/"
    exit 0
fi

# 如果SSH失败，尝试HTTPS
echo ""
echo "⚠️  SSH推送失败，尝试HTTPS方式..."
echo ""

read -p "是否切换到HTTPS方式? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消"
    exit 1
fi

git remote set-url origin https://github.com/SugarWilliam/AI-Agent-pro.git

echo ""
echo "🔄 使用HTTPS方式推送..."
if git push origin gh-pages 2>&1; then
    echo ""
    echo "✅ 推送成功！"
    echo ""
    echo "📝 下一步:"
    echo "1. 访问 https://github.com/SugarWilliam/AI-Agent-pro/settings/pages"
    echo "2. 确认Source设置为 'gh-pages' 分支"
    echo "3. 等待1-2分钟部署完成"
    echo "4. 访问 https://sugarwilliam.github.io/AI-Agent-pro/"
    exit 0
else
    echo ""
    echo "❌ 推送失败"
    echo ""
    echo "请检查:"
    echo "1. 网络连接"
    echo "2. GitHub访问权限"
    echo "3. 仓库权限"
    exit 1
fi
