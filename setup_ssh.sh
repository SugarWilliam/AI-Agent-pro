#!/bin/bash

# AI Agent Pro v8.1.0 - SSH密钥配置脚本
# 使用方法: ./setup_ssh.sh

set -e

echo "🔐 AI Agent Pro v8.1.0 - SSH密钥配置"
echo "===================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "index.html" ]; then
    echo "❌ 错误: 请在项目根目录执行此脚本"
    exit 1
fi

# 检查SSH目录
SSH_DIR="$HOME/.ssh"
if [ ! -d "$SSH_DIR" ]; then
    echo "📁 创建SSH目录..."
    mkdir -p "$SSH_DIR"
    chmod 700 "$SSH_DIR"
fi

# 检查是否已有SSH密钥
KEY_FILE="$SSH_DIR/id_ed25519"
PUB_KEY_FILE="$SSH_DIR/id_ed25519.pub"

if [ -f "$KEY_FILE" ] && [ -f "$PUB_KEY_FILE" ]; then
    echo "✅ 发现现有SSH密钥"
    echo ""
    echo "📋 公钥内容:"
    cat "$PUB_KEY_FILE"
    echo ""
    echo "💡 如果这个密钥已添加到GitHub，可以直接测试连接"
    echo "   如果未添加，请复制上面的公钥添加到GitHub"
    echo ""
    read -p "是否测试SSH连接? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔍 测试SSH连接..."
        ssh -T git@github.com 2>&1 || true
    fi
    exit 0
fi

# 检查项目中是否有公钥文件
if [ -f "ssh_public_key.txt" ]; then
    echo "📄 发现项目中的公钥文件: ssh_public_key.txt"
    PUB_KEY_CONTENT=$(grep -v "^#" ssh_public_key.txt | grep -v "^$" | head -1)
    
    if [ -n "$PUB_KEY_CONTENT" ]; then
        echo ""
        echo "📋 公钥内容:"
        echo "$PUB_KEY_CONTENT"
        echo ""
        echo "💡 请确认这个公钥是否已添加到GitHub"
        echo "   添加地址: https://github.com/settings/keys"
        echo ""
        read -p "公钥是否已添加到GitHub? (y/n) " -n 1 -r
        echo ""
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # 检查是否有对应的私钥
            echo "🔍 查找对应的私钥..."
            
            # 尝试从公钥提取指纹来查找私钥
            # 如果找不到，提示用户生成新密钥
            echo "⚠️  未找到对应的私钥文件"
            echo ""
            read -p "是否生成新的SSH密钥? (y/n) " -n 1 -r
            echo ""
            
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                # 生成新密钥
                echo "🔑 生成新的SSH密钥..."
                ssh-keygen -t ed25519 -C "github-ai-agent-pro" -f "$KEY_FILE" -N ""
                
                echo ""
                echo "✅ SSH密钥已生成"
                echo ""
                echo "📋 新的公钥内容:"
                cat "$PUB_KEY_FILE"
                echo ""
                echo "📝 请将上面的公钥添加到GitHub:"
                echo "   https://github.com/settings/keys"
                echo ""
                echo "   点击 'New SSH key'"
                echo "   Title: AI-Agent-pro Deploy"
                echo "   Key: 粘贴上面的公钥"
                echo ""
                read -p "添加完成后按回车继续测试连接..."
                
                echo ""
                echo "🔍 测试SSH连接..."
                ssh -T git@github.com 2>&1 || true
            fi
        fi
        exit 0
    fi
fi

# 生成新的SSH密钥
echo "🔑 生成新的SSH密钥..."
echo ""
read -p "输入邮箱地址（可选，直接回车使用默认）: " EMAIL
EMAIL=${EMAIL:-"github-ai-agent-pro"}

ssh-keygen -t ed25519 -C "$EMAIL" -f "$KEY_FILE" -N ""

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
read -p "添加完成后按回车继续测试连接..."

echo ""
echo "🔍 测试SSH连接..."
if ssh -T git@github.com 2>&1; then
    echo ""
    echo "✅ SSH连接成功！"
    echo ""
    echo "🚀 现在可以推送代码了:"
    echo "   git push origin gh-pages"
else
    echo ""
    echo "⚠️  SSH连接测试失败，请检查:"
    echo "   1. 公钥是否已添加到GitHub"
    echo "   2. 网络连接是否正常"
    echo ""
    echo "💡 或者使用HTTPS方式:"
    echo "   git remote set-url origin https://github.com/SugarWilliam/AI-Agent-pro.git"
    echo "   然后使用Token推送"
fi
