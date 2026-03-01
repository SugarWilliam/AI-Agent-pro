#!/bin/bash

# AI Agent Pro v8.2.1 - GitHub自动化部署脚本
# 使用方法: ./deploy.sh [--auto] [--force]

set -e

AUTO_MODE=false
FORCE_MODE=false

# 解析参数
for arg in "$@"; do
    case $arg in
        --auto)
            AUTO_MODE=true
            shift
            ;;
        --force)
            FORCE_MODE=true
            shift
            ;;
        *)
            ;;
    esac
done

echo "🚀 AI Agent Pro v8.2.1 - GitHub自动化部署脚本"
echo "=============================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "index.html" ]; then
    echo "❌ 错误: 请在项目根目录执行此脚本"
    exit 1
fi

# 检查Git状态
echo "📋 检查Git状态..."
PENDING_COMMITS=$(git log --oneline origin/gh-pages..HEAD 2>/dev/null | wc -l)

if [ "$PENDING_COMMITS" -eq 0 ]; then
    echo "✅ 没有待推送的提交"
    if [ "$FORCE_MODE" = false ]; then
        echo "💡 提示: 使用 --force 参数强制推送"
        exit 0
    fi
fi

echo "📊 待推送提交数: $PENDING_COMMITS"
echo ""
echo "📝 最新提交:"
git log --oneline -5

echo ""

# 非自动模式需要确认
if [ "$AUTO_MODE" = false ]; then
    read -p "是否继续推送到GitHub? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 已取消"
        exit 1
    fi
fi

# 检查远程仓库URL
REMOTE_URL=$(git remote get-url origin)
echo "🔗 远程仓库: $REMOTE_URL"
echo ""

# 尝试推送
echo "🔄 开始推送..."
if git push origin gh-pages 2>&1; then
    echo ""
    echo "✅ 推送成功！"
    echo ""
    echo "📝 下一步操作:"
    echo "1. 访问 https://github.com/SugarWilliam/AI-Agent-pro/settings/pages"
    echo "2. 确认Source设置为 'gh-pages' 分支"
    echo "3. 确认Folder设置为 '/ (root)' 目录"
    echo "4. 等待1-2分钟部署完成"
    echo "5. 访问 https://sugarwilliam.github.io/AI-Agent-pro/"
    echo ""
    echo "🔍 检查部署状态:"
    echo "   https://github.com/SugarWilliam/AI-Agent-pro/actions"
    exit 0
else
    PUSH_ERROR=$?
    echo ""
    echo "⚠️  推送遇到问题（退出码: $PUSH_ERROR）"
    echo ""
    
    # 如果是HTTPS URL，提示可能需要Token
    if [[ "$REMOTE_URL" == *"https://"* ]]; then
        echo "💡 HTTPS推送提示:"
        echo "   - 如果提示需要认证，请使用Personal Access Token"
        echo "   - 生成Token: https://github.com/settings/tokens"
        echo "   - 权限需要: repo"
    fi
    
    # 如果是SSH URL，提示检查SSH配置
    if [[ "$REMOTE_URL" == *"git@"* ]]; then
        echo "💡 SSH推送提示:"
        echo "   - 检查SSH密钥配置: ssh -T git@github.com"
        echo "   - 或切换到HTTPS: git remote set-url origin https://github.com/SugarWilliam/AI-Agent-pro.git"
    fi
    
    echo ""
    echo "请检查:"
    echo "1. 网络连接"
    echo "2. GitHub访问权限"
    echo "3. 仓库推送权限"
    echo "4. SSH/HTTPS配置"
    exit $PUSH_ERROR
fi
