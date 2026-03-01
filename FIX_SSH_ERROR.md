# 🔧 解决SSH认证错误

**错误信息**: `Permission denied (publickey)`

---

## ✅ 解决方案：切换到HTTPS + Token

### 快速修复（推荐）

```bash
cd /home/pyc/ai-agent-pro-source/AI-Agent-pro

# 1. 切换到HTTPS方式
git remote set-url origin https://github.com/SugarWilliam/AI-Agent-pro.git

# 2. 生成Token（如果还没有）
# 访问: https://github.com/settings/tokens
# 生成Token，权限选择: repo

# 3. 使用Token推送
export GITHUB_TOKEN=your_token_here
./deploy-with-token.sh
```

---

## 📋 详细步骤

### 步骤1: 切换到HTTPS

```bash
cd /home/pyc/ai-agent-pro-source/AI-Agent-pro
git remote set-url origin https://github.com/SugarWilliam/AI-Agent-pro.git

# 验证
git remote -v
# 应该显示: origin  https://github.com/SugarWilliam/AI-Agent-pro.git
```

### 步骤2: 生成Personal Access Token

1. **访问Token页面**
   ```
   https://github.com/settings/tokens
   ```

2. **生成新Token**
   - 点击 "Generate new token" → "Generate new token (classic)"
   - **Note**: `AI-Agent-pro Deploy`
   - **Expiration**: 根据需要选择
   - **权限**: 勾选 `repo`（完整仓库权限）
   - 点击 "Generate token"
   - **复制Token**（只显示一次）

### 步骤3: 使用Token推送

#### 方法1: 使用Token脚本（推荐，最安全）

```bash
export GITHUB_TOKEN=your_token_here
./deploy-with-token.sh
```

#### 方法2: 临时配置Token推送

```bash
# 临时配置Token
git remote set-url origin https://your_token@github.com/SugarWilliam/AI-Agent-pro.git

# 推送
git push origin gh-pages

# 恢复URL（安全）
git remote set-url origin https://github.com/SugarWilliam/AI-Agent-pro.git
```

#### 方法3: 使用Git凭据助手

```bash
# 配置凭据存储
git config --global credential.helper store

# 推送（会提示输入用户名和Token）
git push origin gh-pages
# Username: SugarWilliam
# Password: your_personal_access_token
```

---

## 🔐 配置SSH密钥（可选，如果以后想用SSH）

### 步骤1: 生成SSH密钥

```bash
# 生成新的SSH密钥
ssh-keygen -t ed25519 -C "your_email@example.com"

# 按提示操作（可以直接回车使用默认路径）
# 设置密码（可选，建议设置）
```

### 步骤2: 复制公钥

```bash
# 显示公钥
cat ~/.ssh/id_ed25519.pub

# 或复制到剪贴板（如果支持）
cat ~/.ssh/id_ed25519.pub | xclip -selection clipboard
```

### 步骤3: 添加到GitHub

1. 访问: https://github.com/settings/keys
2. 点击 "New SSH key"
3. **Title**: `AI-Agent-pro Deploy`
4. **Key**: 粘贴刚才复制的公钥
5. 点击 "Add SSH key"

### 步骤4: 测试SSH连接

```bash
# 测试连接
ssh -T git@github.com

# 应该看到: Hi SugarWilliam! You've successfully authenticated...
```

### 步骤5: 切换回SSH方式

```bash
cd /home/pyc/ai-agent-pro-source/AI-Agent-pro
git remote set-url origin git@github.com:SugarWilliam/AI-Agent-pro.git

# 推送
git push origin gh-pages
```

---

## 🚀 一键执行（HTTPS + Token）

```bash
cd /home/pyc/ai-agent-pro-source/AI-Agent-pro && \
git remote set-url origin https://github.com/SugarWilliam/AI-Agent-pro.git && \
export GITHUB_TOKEN=your_token_here && \
./deploy-with-token.sh
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
# 访问: https://github.com/SugarWilliam/AI-Agent-pro/actions
```

---

## 💡 推荐方案

**对于自动化部署，推荐使用HTTPS + Token方式**：
- ✅ 配置简单
- ✅ 不需要SSH密钥管理
- ✅ Token可以设置过期时间
- ✅ 更安全（Token可以随时撤销）

---

## 🔗 相关链接

- **生成Token**: https://github.com/settings/tokens
- **SSH密钥管理**: https://github.com/settings/keys
- **GitHub仓库**: https://github.com/SugarWilliam/AI-Agent-pro
- **Actions**: https://github.com/SugarWilliam/AI-Agent-pro/actions
