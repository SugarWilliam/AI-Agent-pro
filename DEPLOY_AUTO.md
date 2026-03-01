# 🤖 自动化部署 - 完整指南

**版本**: v8.1.0  
**日期**: 2026-03-01

---

## ✅ 当前状态

- ✅ **7个提交待推送**
- ✅ **GitHub Actions工作流已配置**
- ✅ **部署脚本已优化**
- ⏳ **等待推送到GitHub**

---

## 🚀 自动化部署方法

### 方法1: 使用Token脚本（推荐，最安全）

#### 步骤1: 生成Personal Access Token

1. 访问: https://github.com/settings/tokens
2. 点击 "Generate new token" → "Generate new token (classic)"
3. 设置:
   - **Note**: `AI-Agent-pro Deploy`
   - **Expiration**: 根据需要选择（建议90天或No expiration）
   - **权限**: 勾选 `repo`（完整仓库权限）
4. 点击 "Generate token"
5. **复制Token**（只显示一次，请保存）

#### 步骤2: 执行部署

```bash
cd /home/pyc/ai-agent-pro-source/AI-Agent-pro

# 设置Token环境变量
export GITHUB_TOKEN=your_personal_access_token_here

# 执行部署脚本
./deploy-with-token.sh
```

**一键执行**:
```bash
cd /home/pyc/ai-agent-pro-source/AI-Agent-pro && \
export GITHUB_TOKEN=your_token && \
./deploy-with-token.sh
```

---

### 方法2: 使用标准部署脚本

```bash
cd /home/pyc/ai-agent-pro-source/AI-Agent-pro

# 自动模式（无需确认）
./deploy.sh --auto
```

**注意**: 如果使用HTTPS，需要手动输入用户名和Token

---

### 方法3: 直接Git推送

#### 使用Token推送

```bash
cd /home/pyc/ai-agent-pro-source/AI-Agent-pro

# 临时配置Token
git remote set-url origin https://your_token@github.com/SugarWilliam/AI-Agent-pro.git

# 推送
git push origin gh-pages

# 恢复URL（安全）
git remote set-url origin https://github.com/SugarWilliam/AI-Agent-pro.git
```

#### 使用SSH推送（如果已配置SSH密钥）

```bash
cd /home/pyc/ai-agent-pro-source/AI-Agent-pro

# 切换到SSH方式
git remote set-url origin git@github.com:SugarWilliam/AI-Agent-pro.git

# 推送
git push origin gh-pages
```

---

## 📋 待推送的提交

```
bfc56bb docs: 添加自动化部署指南
f5c708e ci: 添加GitHub Actions自动部署工作流和优化部署脚本
05ded1c docs: 添加推送命令参考文件
ac58891 docs: 添加手动部署脚本和说明文档
9376813 docs: 添加GitHub部署快速参考
9c409e1 docs: 添加GitHub部署指南
7a11d27 feat: 更新到v8.1.0 - 更新功能说明书、优化菜单链接、统一版本号
```

---

## 🔄 推送后自动部署流程

### GitHub Actions自动部署

推送成功后，GitHub Actions会自动：

1. **检测推送事件**
   - 检测到 `gh-pages` 分支更新
   - 自动触发部署工作流

2. **执行部署步骤**
   - Checkout代码
   - Setup Pages
   - Upload artifact
   - Deploy to GitHub Pages

3. **完成部署**
   - 通常1-2分钟内完成
   - 可在Actions页面查看进度

### 查看部署状态

- **Actions页面**: https://github.com/SugarWilliam/AI-Agent-pro/actions
- **Pages设置**: https://github.com/SugarWilliam/AI-Agent-pro/settings/pages
- **部署的应用**: https://sugarwilliam.github.io/AI-Agent-pro/

---

## 🔧 配置Git凭据（可选）

### 方法1: 使用Git凭据助手

```bash
# 配置凭据存储
git config --global credential.helper store

# 推送时会提示输入用户名和Token
git push origin gh-pages
# Username: SugarWilliam
# Password: your_personal_access_token
```

### 方法2: 使用SSH密钥（推荐）

```bash
# 生成SSH密钥（如果还没有）
ssh-keygen -t ed25519 -C "your_email@example.com"

# 复制公钥
cat ~/.ssh/id_ed25519.pub

# 添加到GitHub
# 访问: https://github.com/settings/keys
# 点击 "New SSH key"，粘贴公钥

# 切换到SSH方式
git remote set-url origin git@github.com:SugarWilliam/AI-Agent-pro.git

# 测试连接
ssh -T git@github.com

# 推送
git push origin gh-pages
```

---

## 📝 快速执行命令

### 一键部署（使用Token）

```bash
cd /home/pyc/ai-agent-pro-source/AI-Agent-pro && \
export GITHUB_TOKEN=your_token && \
./deploy-with-token.sh
```

### 检查状态

```bash
cd /home/pyc/ai-agent-pro-source/AI-Agent-pro

# 查看待推送提交
git log --oneline origin/gh-pages..HEAD

# 查看Git状态
git status

# 查看远程仓库
git remote -v
```

---

## ✅ 部署检查清单

推送前:
- [ ] Token已生成并保存
- [ ] Token有repo权限
- [ ] 网络连接正常
- [ ] Git配置正确

推送后:
- [ ] 推送成功（无错误）
- [ ] GitHub仓库显示最新提交
- [ ] GitHub Actions运行成功
- [ ] Pages设置正确
- [ ] 应用可访问
- [ ] 功能正常

---

## 🔗 相关链接

- **生成Token**: https://github.com/settings/tokens
- **SSH密钥管理**: https://github.com/settings/keys
- **GitHub仓库**: https://github.com/SugarWilliam/AI-Agent-pro
- **Actions**: https://github.com/SugarWilliam/AI-Agent-pro/actions
- **Pages设置**: https://github.com/SugarWilliam/AI-Agent-pro/settings/pages
- **部署的应用**: https://sugarwilliam.github.io/AI-Agent-pro/

---

## 💡 提示

1. **Token安全**: 不要将Token提交到Git仓库
2. **Token权限**: 只需要 `repo` 权限即可
3. **Token过期**: 定期更新Token
4. **SSH方式**: 如果经常推送，建议配置SSH密钥

---

**执行命令**: `export GITHUB_TOKEN=your_token && ./deploy-with-token.sh`
