#!/bin/bash

# AI Agent Pro v8.1.0 - 快速修复SSH错误
# 使用方法: ./quick_fix_ssh.sh

set -e

echo "🔧 快速修复SSH认证错误"
echo "======================"
echo ""

# 检查是否在正确的目录
if [ ! -f "index.html" ]; then
    echo "❌ 错误: 请在项目根目录执行此脚本"
    exit 1
fi

# 方案选择
echo "请选择解决方案:"
echo ""
echo "1. 配置SSH密钥（推荐，长期使用）"
echo "2. 切换到HTTPS + Token（快速解决）"
echo ""
read -p "请选择 (1/2): " CHOICE

case $CHOICE in
    1)
        echo ""
        echo "🔐 配置SSH密钥..."
        echo ""
        
        # 检查SSH目录
        SSH_DIR="$HOME/.ssh"
        if [ ! -d "$SSH_DIR" ]; then
            mkdir -p "$SSH_DIR"
            chmod 700 "$SSH_DIR"
        fi
        
        KEY_FILE="$SSH_DIR/id_ed25519"
        PUB_KEY_FILE="$SSH_DIR/id_ed25519.pub"
        
        # 检查是否已有密钥
        if [ -f "$KEY_FILE" ] && [ -f "$PUB_KEY_FILE" ]; then
            echo "✅ 发现现有SSH密钥"
            echo ""
            echo "📋 公钥:"
            cat "$PUB_KEY_FILE"
            echo ""
            echo "💡 请确认这个公钥已添加到GitHub:"
            echo "   https://github.com/settings/keys"
            echo ""
            read -p "公钥已添加? (y/n) " -n 1 -r
            echo ""
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                echo "请先添加公钥到GitHub，然后重新运行此脚本"
                exit 1
            fi
        else
            # 生成新密钥
            echo "🔑 生成新的SSH密钥..."
            ssh-keygen -t ed25519 -C "github-ai-agent-pro" -f "$KEY_FILE" -N ""
            
            echo ""
            echo "✅ SSH密钥已生成"
            echo ""
            echo "📋 公钥内容:"
            cat "$PUB_KEY_FILE"
            echo ""
            echo "📝 请将上面的公钥添加到GitHub:"
            echo "   1. 访问: https://github.com/settings/keys"
            echo "   2. 点击 'New SSH key'"
            echo "   3. Title: AI-Agent-pro Deploy"
            echo "   4. Key: 粘贴上面的公钥"
            echo "   5. 点击 'Add SSH key'"
            echo ""
            read -p "添加完成后按回车继续..."
        fi
        
        # 添加GitHub到known_hosts
        echo ""
        echo "🔍 配置GitHub主机密钥..."
        if ! grep -q "github.com" "$SSH_DIR/known_hosts" 2>/dev/null; then
            ssh-keyscan github.com >> "$SSH_DIR/known_hosts" 2>/dev/null || true
            chmod 600 "$SSH_DIR/known_hosts" 2>/dev/null || true
        fi
        
        # 测试连接
        echo "🔍 测试SSH连接..."
        if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
            echo "✅ SSH连接成功！"
            echo ""
            echo "🚀 现在可以推送代码了:"
            echo "   git push origin gh-pages"
        else
            echo "⚠️  SSH连接测试失败"
            echo ""
            echo "请检查:"
            echo "1. 公钥是否已添加到GitHub"
            echo "2. 网络连接是否正常"
            echo ""
            echo "或者使用方案2切换到HTTPS方式"
        fi
        ;;
        
    2)
        echo ""
        echo "🌐 切换到HTTPS方式..."
        echo ""
        
        # 切换到HTTPS
        git remote set-url origin https://github.com/SugarWilliam/AI-Agent-pro.git
        
        echo "✅ 已切换到HTTPS方式"
        echo ""
        echo "📝 下一步:"
        echo "1. 生成Personal Access Token:"
        echo "   https://github.com/settings/tokens"
        echo "   权限选择: repo"
        echo ""
        echo "2. 使用Token推送:"
        echo "   export GITHUB_TOKEN=your_token"
        echo "   ./DEPLOY_NOW.sh"
        echo ""
        echo "或手动推送:"
        echo "   git remote set-url origin https://your_token@github.com/SugarWilliam/AI-Agent-pro.git"
        echo "   git push origin gh-pages"
        echo "   git remote set-url origin https://github.com/SugarWilliam/AI-Agent-pro.git"
        ;;
        
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac
