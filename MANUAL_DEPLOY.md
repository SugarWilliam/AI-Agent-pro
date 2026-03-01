# 📤 手动部署到GitHub - 完整指南

**版本**: v8.1.0  
**日期**: 2026-03-01

---

## ✅ 当前状态

- ✅ 所有更改已提交到本地仓库
- ✅ 工作目录干净
- ✅ 3个提交待推送
- ⏳ 等待推送到GitHub

---

## 🚀 方法1: 使用部署脚本（推荐）

### 步骤1: 执行部署脚本

```bash
cd /home/pyc/ai-agent-pro-source/AI-Agent-pro
./deploy.sh
```

脚本会自动：
1. 检查Git状态
2. 显示最新提交
3. 尝试SSH方式推送
4. 如果失败，自动切换到HTTPS方式

---

## 🚀 方法2: 手动执行命令

### 步骤1: 检查当前状态

```bash
cd /home/pyc/ai-agent-pro-source/AI-Agent-pro

# 查看Git状态
git status

# 查看待推送的提交
git log --oneline origin/gh-pages..HEAD
```

### 步骤2: 推送到GitHub

#### 方式A: SSH推送（推荐）

```bash
git push origin gh-pages
```

**如果SSH失败，检查SSH配置**:
```bash
# 测试SSH连接
ssh -T git@github.com

# 如果显示 "Hi SugarWilliam! You've successfully authenticated..."
# 说明SSH配置正确
```

#### 方式B: HTTPS推送（如果SSH不可用）

```bash
# 切换到HTTPS方式
git remote set-url origin https://github.com/SugarWilliam/AI-Agent-pro.git

# 推送（可能需要输入GitHub用户名和密码/Token）
git push origin gh-pages
```

**使用Personal Access Token**:
1. 访问: https://github.com/settings/tokens
2. 生成新Token（权限: `repo`）
3. 推送时使用Token作为密码

---

## 📋 推送后的步骤

### 步骤1: 验证推送成功

访问GitHub仓库，确认最新提交已推送：
```
https://github.com/SugarWilliam/AI-Agent-pro
```

### 步骤2: 配置GitHub Pages

1. **访问Pages设置**
   ```
   https://github.com/SugarWilliam/AI-Agent-pro/settings/pages
   ```

2. **配置设置**
   - **Source**: 选择 `gh-pages` 分支
   - **Folder**: 选择 `/ (root)` 目录
   - 点击 **Save**

3. **等待部署**
   - GitHub会自动构建和部署
   - 通常需要1-2分钟
   - 可以在Actions标签页查看部署状态

### 步骤3: 访问部署的应用

部署完成后，访问：
```
https://sugarwilliam.github.io/AI-Agent-pro/
```

---

## 🔧 故障排查

### 问题1: SSH连接失败

**错误信息**:
```
ssh: Could not resolve hostname github.com
Permission denied (publickey)
```

**解决方法**:

1. **检查网络连接**
   ```bash
   ping github.com
   ```

2. **检查SSH密钥**
   ```bash
   ls -la ~/.ssh/id_rsa.pub
   cat ~/.ssh/id_rsa.pub
   ```

3. **添加SSH密钥到GitHub**
   - 复制公钥内容
   - 访问: https://github.com/settings/keys
   - 点击 "New SSH key"
   - 粘贴公钥并保存

4. **或使用HTTPS方式**（见方法2方式B）

### 问题2: HTTPS推送需要认证

**错误信息**:
```
remote: Support for password authentication was removed
```

**解决方法**:

1. **使用Personal Access Token**
   - 访问: https://github.com/settings/tokens
   - 生成新Token（权限: `repo`）
   - 推送时使用Token作为密码

2. **或配置Git凭据**
   ```bash
   git config --global credential.helper store
   git push origin gh-pages
   # 输入用户名和Token，下次会自动保存
   ```

### 问题3: 推送被拒绝

**错误信息**:
```
! [rejected]        gh-pages -> gh-pages (fetch first)
```

**解决方法**:

```bash
# 先拉取远程更改
git pull origin gh-pages

# 如果有冲突，解决冲突后再次推送
git push origin gh-pages
```

---

## 📊 部署检查清单

推送前检查：
- [ ] Git状态干净（`git status`）
- [ ] 所有更改已提交
- [ ] 网络连接正常
- [ ] SSH/HTTPS配置正确

推送后检查：
- [ ] 推送成功（GitHub仓库显示最新提交）
- [ ] Pages设置正确（gh-pages分支）
- [ ] 部署完成（Actions显示成功）
- [ ] 应用可访问（https://sugarwilliam.github.io/AI-Agent-pro/）
- [ ] 功能正常（测试主要功能）
- [ ] 版本号正确（显示v8.1.0）

---

## 🔗 相关链接

- **GitHub仓库**: https://github.com/SugarWilliam/AI-Agent-pro
- **GitHub Pages**: https://sugarwilliam.github.io/AI-Agent-pro/
- **仓库设置**: https://github.com/SugarWilliam/AI-Agent-pro/settings
- **Pages设置**: https://github.com/SugarWilliam/AI-Agent-pro/settings/pages
- **SSH密钥管理**: https://github.com/settings/keys
- **Personal Access Token**: https://github.com/settings/tokens

---

## 📝 快速命令参考

```bash
# 进入项目目录
cd /home/pyc/ai-agent-pro-source/AI-Agent-pro

# 检查状态
git status
git log --oneline -3

# SSH方式推送
git push origin gh-pages

# HTTPS方式推送（如果SSH不可用）
git remote set-url origin https://github.com/SugarWilliam/AI-Agent-pro.git
git push origin gh-pages

# 查看远程仓库
git remote -v

# 查看分支
git branch -a
```

---

## ⚠️ 注意事项

1. **网络要求**: 需要能够访问GitHub
2. **权限要求**: 需要有仓库的推送权限
3. **SSH密钥**: 如果使用SSH，需要配置SSH密钥
4. **Token**: 如果使用HTTPS，需要Personal Access Token
5. **部署时间**: GitHub Pages部署通常需要1-2分钟

---

**提示**: 如果遇到问题，请参考故障排查部分或查看 `GITHUB_DEPLOY.md` 获取更多帮助。
