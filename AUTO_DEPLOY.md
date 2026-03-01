# 🤖 自动化部署指南

**版本**: v8.1.0  
**日期**: 2026-03-01

---

## ✅ 已配置的自动化部署

### 1. GitHub Actions工作流

已创建 `.github/workflows/deploy.yml`，支持：
- ✅ 自动部署到GitHub Pages
- ✅ 当推送到 `gh-pages` 分支时自动触发
- ✅ 手动触发部署（workflow_dispatch）

### 2. 部署脚本

已创建 `deploy.sh`，支持：
- ✅ 自动检查Git状态
- ✅ 自动推送到GitHub
- ✅ 支持 `--auto` 参数（无需确认）
- ✅ 支持 `--force` 参数（强制推送）

---

## 🚀 自动化部署方法

### 方法1: 使用部署脚本（推荐）

#### 交互式部署
```bash
cd /home/pyc/ai-agent-pro-source/AI-Agent-pro
./deploy.sh
```

#### 自动部署（无需确认）
```bash
cd /home/pyc/ai-agent-pro-source/AI-Agent-pro
./deploy.sh --auto
```

#### 强制推送
```bash
cd /home/pyc/ai-agent-pro-source/AI-Agent-pro
./deploy.sh --auto --force
```

### 方法2: 直接Git推送（触发GitHub Actions）

```bash
cd /home/pyc/ai-agent-pro-source/AI-Agent-pro
git push origin gh-pages
```

推送后，GitHub Actions会自动：
1. 检测到 `gh-pages` 分支更新
2. 运行部署工作流
3. 自动部署到GitHub Pages

---

## 📋 部署流程

### 完整自动化流程

```
1. 代码修改
   ↓
2. git add -A
   ↓
3. git commit -m "更新描述"
   ↓
4. ./deploy.sh --auto
   ↓
5. 推送到GitHub
   ↓
6. GitHub Actions自动部署
   ↓
7. GitHub Pages自动更新
   ↓
8. 访问 https://sugarwilliam.github.io/AI-Agent-pro/
```

---

## 🔧 GitHub Actions配置

### 工作流文件位置
```
.github/workflows/deploy.yml
```

### 触发条件
- **自动触发**: 推送到 `gh-pages` 分支
- **手动触发**: 在GitHub Actions页面点击"Run workflow"

### 部署步骤
1. Checkout代码
2. Setup Pages
3. Upload artifact
4. Deploy to GitHub Pages

---

## 📊 当前状态

### 待推送提交
```
ac58891 docs: 添加手动部署脚本和说明文档
9376813 docs: 添加GitHub部署快速参考
9c409e1 docs: 添加GitHub部署指南
7a11d27 feat: 更新到v8.1.0 - 更新功能说明书、优化菜单链接、统一版本号
```

### 执行推送

```bash
cd /home/pyc/ai-agent-pro-source/AI-Agent-pro

# 方法1: 使用脚本（推荐）
./deploy.sh --auto

# 方法2: 直接推送
git push origin gh-pages
```

---

## 🔍 部署状态检查

### 1. 检查推送状态
```bash
git log --oneline origin/gh-pages..HEAD
```

### 2. 检查GitHub Actions
访问: https://github.com/SugarWilliam/AI-Agent-pro/actions

### 3. 检查Pages设置
访问: https://github.com/SugarWilliam/AI-Agent-pro/settings/pages

### 4. 检查部署的应用
访问: https://sugarwilliam.github.io/AI-Agent-pro/

---

## ⚙️ GitHub Pages配置

### 必需配置

1. **访问Pages设置**
   ```
   https://github.com/SugarWilliam/AI-Agent-pro/settings/pages
   ```

2. **配置设置**
   - **Source**: `Deploy from a branch`
   - **Branch**: `gh-pages`
   - **Folder**: `/ (root)`
   - 点击 **Save**

3. **启用GitHub Actions部署**（如果使用Actions）
   - 在Pages设置中选择 "GitHub Actions" 作为Source
   - 或保持 "Deploy from a branch"（Actions会自动部署）

---

## 🔧 故障排查

### 问题1: 推送失败

**检查网络连接**:
```bash
ping github.com
```

**检查Git配置**:
```bash
git remote -v
git config --list | grep user
```

### 问题2: GitHub Actions未触发

**检查**:
1. 工作流文件是否存在: `.github/workflows/deploy.yml`
2. 文件语法是否正确
3. 是否推送到 `gh-pages` 分支

**查看Actions日志**:
```
https://github.com/SugarWilliam/AI-Agent-pro/actions
```

### 问题3: Pages未更新

**检查**:
1. Pages设置是否正确
2. Actions部署是否成功
3. 等待几分钟后刷新

---

## 📝 快速命令参考

```bash
# 进入项目目录
cd /home/pyc/ai-agent-pro-source/AI-Agent-pro

# 检查状态
git status
git log --oneline -5

# 自动部署
./deploy.sh --auto

# 或直接推送
git push origin gh-pages

# 查看部署状态
git log --oneline origin/gh-pages..HEAD
```

---

## 🔗 相关链接

- **GitHub仓库**: https://github.com/SugarWilliam/AI-Agent-pro
- **GitHub Pages**: https://sugarwilliam.github.io/AI-Agent-pro/
- **Actions**: https://github.com/SugarWilliam/AI-Agent-pro/actions
- **Pages设置**: https://github.com/SugarWilliam/AI-Agent-pro/settings/pages

---

**提示**: 执行 `./deploy.sh --auto` 即可完成自动化部署！
