# 🔐 解决SSH认证错误 - 完整指南

**错误**: `Permission denied (publickey)`

---

## 📋 当前状态

- ✅ 已发现SSH公钥文件: `ssh_public_key.txt`
- ⚠️ SSH密钥可能未正确配置到系统
- ⚠️ 公钥可能未添加到GitHub

---

## 🚀 解决方案

### 方案1: 配置SSH密钥（推荐，长期使用）

#### 步骤1: 运行SSH配置脚本

```bash
cd /home/pyc/ai-agent-pro-source/AI-Agent-pro
./setup_ssh.sh
```

脚本会自动：
- 检查现有SSH密钥
- 如果不存在，生成新密钥
- 显示公钥内容
- 指导添加到GitHub
- 测试SSH连接

#### 步骤2: 手动配置（如果脚本无法运行）

**2.1 检查SSH目录**

```bash
# 创建SSH目录（如果不存在）
mkdir -p ~/.ssh
chmod 700 ~/.ssh
```

**2.2 生成SSH密钥（如果不存在）**

```bash
# 生成新的SSH密钥
ssh-keygen -t ed25519 -C "github-ai-agent-pro" -f ~/.ssh/id_ed25519

# 按提示操作（可以直接回车使用默认设置）
# 设置密码（可选，建议设置）
```

**2.3 查看公钥**

```bash
# 显示公钥
cat ~/.ssh/id_ed25519.pub

# 或复制到剪贴板（如果支持）
cat ~/.ssh/id_ed25519.pub | xclip -selection clipboard
```

**2.4 添加到GitHub**

1. **访问SSH密钥页面**
   ```
   https://github.com/settings/keys
   ```

2. **添加新密钥**
   - 点击 "New SSH key"
   - **Title**: `AI-Agent-pro Deploy`
   - **Key**: 粘贴刚才复制的公钥
   - 点击 "Add SSH key"

**2.5 测试SSH连接**

```bash
# 测试连接
ssh -T git@github.com

# 应该看到: Hi SugarWilliam! You've successfully authenticated...
```

**2.6 推送代码**

```bash
cd /home/pyc/ai-agent-pro-source/AI-Agent-pro
git push origin gh-pages
```

---

### 方案2: 切换到HTTPS + Token（快速解决）

如果不想配置SSH，可以切换到HTTPS方式：

#### 步骤1: 切换到HTTPS

```bash
cd /home/pyc/ai-agent-pro-source/AI-Agent-pro
git remote set-url origin https://github.com/SugarWilliam/AI-Agent-pro.git
```

#### 步骤2: 生成Personal Access Token

1. 访问: https://github.com/settings/tokens
2. 点击 "Generate new token" → "Generate new token (classic)"
3. 设置:
   - **Note**: `AI-Agent-pro Deploy`
   - **权限**: 勾选 `repo`
4. 点击 "Generate token"
5. **复制Token**（只显示一次）

#### 步骤3: 使用Token推送

**方法1: 使用自动脚本**

```bash
export GITHUB_TOKEN=your_token_here
./DEPLOY_NOW.sh
```

**方法2: 手动推送**

```bash
# 临时配置Token
git remote set-url origin https://your_token@github.com/SugarWilliam/AI-Agent-pro.git

# 推送
git push origin gh-pages

# 恢复URL（安全）
git remote set-url origin https://github.com/SugarWilliam/AI-Agent-pro.git
```

---

## 🔍 故障排查

### 问题1: SSH连接失败

**检查SSH密钥是否存在**

```bash
ls -la ~/.ssh/id_*
```

**检查公钥是否已添加**

```bash
# 查看公钥
cat ~/.ssh/id_ed25519.pub

# 访问GitHub检查
# https://github.com/settings/keys
```

**测试SSH连接**

```bash
ssh -T git@github.com -v
```

### 问题2: Host key verification failed

**添加GitHub到known_hosts**

```bash
# 添加GitHub主机密钥
ssh-keyscan github.com >> ~/.ssh/known_hosts
chmod 600 ~/.ssh/known_hosts
```

### 问题3: 权限错误

**检查文件权限**

```bash
# SSH目录权限
chmod 700 ~/.ssh

# 私钥权限
chmod 600 ~/.ssh/id_ed25519

# 公钥权限
chmod 644 ~/.ssh/id_ed25519.pub
```

---

## 📝 快速命令参考

### SSH方式

```bash
# 1. 配置SSH
./setup_ssh.sh

# 2. 测试连接
ssh -T git@github.com

# 3. 推送
git push origin gh-pages
```

### HTTPS方式

```bash
# 1. 切换远程
git remote set-url origin https://github.com/SugarWilliam/AI-Agent-pro.git

# 2. 使用Token推送
export GITHUB_TOKEN=your_token
./DEPLOY_NOW.sh
```

---

## ✅ 验证修复

推送成功后，检查：

```bash
# 检查远程配置
git remote -v

# 检查推送状态
git log --oneline origin/gh-pages..HEAD

# 查看GitHub Actions
# https://github.com/SugarWilliam/AI-Agent-pro/actions
```

---

## 🔗 相关链接

- **SSH密钥管理**: https://github.com/settings/keys
- **生成Token**: https://github.com/settings/tokens
- **GitHub仓库**: https://github.com/SugarWilliam/AI-Agent-pro
- **Actions**: https://github.com/SugarWilliam/AI-Agent-pro/actions

---

## 💡 推荐方案

**对于自动化部署，推荐使用SSH方式**：
- ✅ 一次配置，长期使用
- ✅ 不需要每次输入Token
- ✅ 更安全（密钥可以设置密码）
- ✅ 适合CI/CD自动化

**如果只是临时推送，可以使用HTTPS + Token**：
- ✅ 配置简单快速
- ✅ 不需要SSH密钥管理

---

**执行命令**: `./setup_ssh.sh` 开始配置SSH密钥
