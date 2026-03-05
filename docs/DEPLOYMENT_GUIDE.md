# GitHub 上传和部署指南

**版本**: v8.3.2  
**日期**: 2026-03-04

> 本文档专注 GitHub Pages 部署。完整部署说明（本地、生产、配置）见 [DEPLOYMENT.md](./DEPLOYMENT.md)。

---

## 📋 当前状态

### Git仓库信息
- **远程仓库**: `https://github.com/SugarWilliam/AI-Agent-pro.git`
- **部署分支**: `gh-pages`

---

## 🚀 部署步骤

### 步骤1: 推送到GitHub

```bash
cd /path/to/Agent-pro

# 推送到gh-pages分支（GitHub Pages部署分支）
git push origin gh-pages

# 如果需要同时更新main分支
git checkout main
git merge gh-pages
git push origin main
```

### 步骤2: 配置GitHub Pages

1. **访问GitHub仓库设置**
   - 打开: https://github.com/SugarWilliam/AI-Agent-pro/settings/pages

2. **配置Pages设置**
   - **Source**: 选择 `gh-pages` 分支
   - **Folder**: 选择 `/ (root)` 目录
   - 点击 **Save**

3. **等待部署完成**
   - GitHub会自动构建和部署
   - 通常需要1-2分钟
   - 部署完成后会显示访问URL

### 步骤3: 访问部署的应用

部署完成后，访问地址为：
```
https://sugarwilliam.github.io/AI-Agent-pro/
```

---

## 🔧 故障排查

### 问题1: 推送失败 - 网络连接问题

**错误信息**:
```
ssh: Could not resolve hostname github.com: Temporary failure in name resolution
```

**解决方法**:
1. 检查网络连接
2. 检查SSH密钥配置
3. 使用HTTPS方式推送（如果SSH不可用）:
   ```bash
   git remote set-url origin https://github.com/SugarWilliam/AI-Agent-pro.git
   git push origin gh-pages
   ```

### 问题2: 推送失败 - 权限问题

**错误信息**:
```
Permission denied (publickey)
```

**解决方法**:
1. 检查SSH密钥是否已添加到GitHub账户
2. 测试SSH连接:
   ```bash
   ssh -T git@github.com
   ```
3. 如果SSH不可用，切换到HTTPS方式

### 问题3: GitHub Pages未更新

**解决方法**:
1. 检查Pages设置是否正确
2. 检查gh-pages分支是否已推送
3. 等待几分钟后刷新页面
4. 检查GitHub Actions日志（如果有）

---

## 📊 部署检查清单

- [ ] 所有更改已提交
- [ ] 推送到gh-pages分支
- [ ] GitHub Pages配置正确
- [ ] 部署成功（访问URL可访问）
- [ ] 功能测试通过
- [ ] 文档链接正常
- [ ] 版本号显示正确

---

## 🔗 相关链接

- **GitHub仓库**: https://github.com/SugarWilliam/AI-Agent-pro
- **GitHub Pages**: https://sugarwilliam.github.io/AI-Agent-pro/
- **仓库设置**: https://github.com/SugarWilliam/AI-Agent-pro/settings
- **Pages设置**: https://github.com/SugarWilliam/AI-Agent-pro/settings/pages

---

## 📝 后续维护

### 更新流程

1. **本地修改**
   ```bash
   # 修改代码
   # 测试功能
   ```

2. **提交更改**
   ```bash
   git add -A
   git commit -m "feat: 更新描述"
   ```

3. **推送到GitHub**
   ```bash
   git push origin gh-pages
   ```

4. **等待自动部署**
   - GitHub Pages会自动重新部署
   - 通常1-2分钟内完成

### 版本发布

建议为每个版本创建标签：

```bash
# 创建标签
git tag -a v8.1.0 -m "Release v8.1.0"

# 推送标签
git push origin v8.1.0
```

---

**文档版本**: v8.3.2  
**最后更新**: 2026-03-01  
**维护者**: AI Agent Pro Team
