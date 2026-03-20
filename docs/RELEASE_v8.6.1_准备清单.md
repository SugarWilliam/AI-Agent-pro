# v8.6.1 Release 准备清单

**目标版本**: v8.6.1  
**准备日期**: 2026-03-15  

---

## 一、已完成

- [x] 代码提交并推送至 gh-pages
- [x] main 分支已同步 gh-pages
- [x] 版本号已统一为 8.6.1
- [x] CHANGELOG、RELEASES、输出规范模板已更新

---

## 二、发布前检查（需人工确认）

| 项 | 操作 | 状态 |
|----|------|------|
| API Key | 确认 `js/app.js` 中 DEFAULT_API_KEYS 策略（移除/占位/保留） | ⬜ |
| 本地验证 | `./start-server.sh`，访问 http://localhost:8000 功能抽查 | ⬜ |
| 控制台 | 浏览器控制台无报错 | ⬜ |

---

## 三、执行 Release（二选一）

### 方式 A：使用 release.sh（推荐）

```bash
git checkout gh-pages
./release.sh 8.6.1
```

脚本将自动：推送 gh-pages → 创建并推送 tag v8.6.1 → 合并 main 并推送。

### 方式 B：手动执行

```bash
git checkout gh-pages
git push origin gh-pages
git tag -a v8.6.1 -m "AI Agent Pro v8.6.1 正式发布

- 量化幻方 V4.1 协议栈（V4.0 全栈 + V6.0 可选增强）
- 禁止动作清单、时间止损强化、贝叶斯+置信区间
- 发布说明汇总于 docs/RELEASES.md，变更见 CHANGELOG
- 版本号统一至 8.6.1"
git push origin v8.6.1
```

> 注：main 已同步，无需再 merge。

---

## 四、GitHub Release 创建（发布后）

1. 打开：https://github.com/SugarWilliam/AI-Agent-pro/releases/new?tag=v8.6.1
2. 若 tag 已推送，页面会自动选中 v8.6.1
3. 标题：`v8.6.1 量化幻方 V4.1 协议栈升级`
4. 说明：可复制下方「Release 说明模板」

---

## 五、Release 说明模板（复制用）

```markdown
## AI Agent Pro v8.6.1

**发布日期**: 2026-03-15

### 量化幻方 V4.1 协议栈升级（V4.0 全栈 + V6.0 可选增强）

- **协议栈 V4.1**：在 V4.0 全栈基础上，将 V6.0 增强能力作为可选模块纳入
- **V6.0 可选增强**：信息期权定价、全天候组合、三维退出网格、3×3×3 压力测试、BMP-E 四维矩阵、时间止损强化、贝叶斯+置信区间+动态更新
- **禁止动作清单**：阶梯式执行手册须含 3–5 条可执行禁止项，编号格式
- **概率处理分层**：V4.0 基础层母概率 + KDI 再归一化（必须）；V6.0 可选层贝叶斯+置信区间（互补）
- **输出规范模板**：`docs/量化幻方矩阵_输出规范模板_V4.1.md`

### 版本号统一为 8.6.1

应用、脚本与文档已统一为 v8.6.1。

---

**完整变更**: [CHANGELOG.md](CHANGELOG.md) [8.6.1]  
**发布说明**: [docs/RELEASES.md](docs/RELEASES.md) v8.6.1 节
```

---

## 六、发布后验证

- [ ] Pages 部署：https://sugarwilliam.github.io/AI-Agent-pro/
- [ ] Release 页面：https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.6.1
