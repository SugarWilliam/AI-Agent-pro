# AI Agent Pro Release 正式版本准备清单

**版本**: v8.4.0  
**评审日期**: 2026-03-03  
**目标**: 深度评审与 release 正式版本准备

---

## 1. 评审结论摘要

| 维度 | 状态 | 说明 |
|------|------|------|
| 架构 | ✅ 通过 | 分层清晰，扩展性好 |
| 代码质量 | ✅ 通过 | 规范良好，空值防护完善 |
| 资源加载 | ✅ 通过 | vendor 本地化，无 CDN 依赖 |
| 版本一致性 | ✅ 通过 | 8.4.0 已统一 |
| 文档 | ✅ 通过 | 设计/部署/功能说明书齐全 |
| **安全** | ⚠️ 需关注 | API Key 硬编码（见下） |

---

## 2. 安全项（Release 前必读）

### 2.1 API Key 硬编码 ⚠️ 高优先级

**位置**: `js/app.js` 第 40-46 行、第 2223-2230 行

```javascript
const DEFAULT_API_KEYS = {
    'glm-4-plus': '...',
    'deepseek-chat': 'sk-...',
    'jina-ai': 'jina_...'
};
```

**风险**: 密钥随源码公开，可能被滥用、产生费用。

**建议**（三选一）:
1. **发布前移除**: 清空 `DEFAULT_API_KEYS`，改为 `''`，强制用户自行配置
2. **占位符**: 使用 `'YOUR_API_KEY_HERE'` 等占位符
3. **保留（仅内测）**: 若仅内部/演示使用，可暂保留，但需在 Release 说明中标注

### 2.2 敏感文件

- `ssh_private_key`: 已在 .gitignore，未跟踪 ✅
- `ssh_public_key.txt`: 未在 .gitignore，若含敏感信息建议加入

---

## 3. 资源检查

### 3.1 静态资源（vendor）

| 资源 | 路径 | 状态 |
|------|------|------|
| Font Awesome | vendor/fontawesome/css/all.min.css | ✅ |
| Font Awesome 字体 | vendor/fontawesome/webfonts/* | ✅ |
| Chart.js | vendor/chartjs/chart.umd.min.js | ✅ |
| Mermaid | vendor/mermaid/mermaid.min.js | ✅ |
| Highlight.js | vendor/highlightjs/atom-one-dark.min.css | ✅ |
| html2canvas | vendor/html2canvas/html2canvas.min.js | ✅ |

**结论**: 无 CDN 依赖，离线可运行。

### 3.2 脚本加载顺序

```
storage.js → logger → error-handler → event-manager → ui-utils
→ app.js → ui.js → rag.js → llm.js → events.js → plan.js → sync.js
```

**结论**: 依赖顺序正确，rag 在 events 前加载 ✅

---

## 4. 项目结构检查

### 4.1 核心文件

| 文件 | 行数 | 职责 |
|------|------|------|
| js/app.js | ~3200 | 状态、模型、SubAgent、资源 |
| js/ui.js | ~4200 | 渲染、模态框、图表 |
| js/events.js | ~2900 | 事件、发送、Workflow |
| js/llm.js | ~1000 | LLM 调用、流式、多模型 |
| js/rag.js | ~1600 | RAG、向量化、文档解析 |
| js/storage.js | ~200 | IndexedDB/localStorage 统一层 |
| js/plan.js | ~400 | 计划、TODO |
| js/sync.js | ~250 | 云同步 |

### 4.2 文档

| 文档 | 用途 |
|------|------|
| docs/DESIGN.md | 设计、架构、算法 |
| docs/DEPLOYMENT.md | 部署说明 |
| docs/AI-Agent-Pro-Features.html | 功能说明书 |
| docs/PROJECT_REVIEW.md | 工程评审 |
| CHANGELOG.md | 版本变更 |

### 4.3 链接检查

| 链接 | 目标 | 状态 |
|------|------|------|
| 下载源码 | main.zip | ✅（若 main 存在） |
| GitHub | SugarWilliam/AI-Agent-pro | ✅ |
| 设计/部署文档 | docs/*.md | ✅ 相对路径 |

---

## 5. Release 执行清单

### 5.1 发布前

- [ ] 确认 API Key 策略（移除/占位/保留）
- [ ] 运行 `./start-server.sh` 本地验证
- [ ] 访问 http://localhost:8000 功能抽查
- [ ] 检查浏览器控制台无报错

### 5.2 发布命令

```bash
# 1. 确保在 gh-pages 分支
git checkout gh-pages

# 2. 执行发布脚本（默认 8.4.0）
./release.sh 8.4.0

# 或手动：
git push origin gh-pages
git tag -a v8.4.0 -m "Release v8.4.0"
git push origin v8.4.0
git checkout main && git merge gh-pages && git push origin main && git checkout gh-pages
```

### 5.3 发布后

- [ ] 在 GitHub 创建 Release：https://github.com/SugarWilliam/AI-Agent-pro/releases/new?tag=v8.4.0
- [ ] **勾选「Set as a pre-release」**：此版本标注为非生产就绪（non-production ready）
- [ ] 填写 Release 说明（可复制 CHANGELOG 8.4.0 内容）
- [ ] 验证 Pages 部署：https://sugarwilliam.github.io/AI-Agent-pro/

---

## 6. 已知问题与建议

| 项 | 说明 | 优先级 |
|----|------|--------|
| API Key | 见 2.1 | 高 |
| app.js 体积 | 可考虑拆分为 app-state、app-models、app-subagents | 低 |
| 下载链接 | main.zip 需 main 分支存在；若仅用 gh-pages 可改为 gh-pages.zip | 低 |

---

**文档版本**: v8.4.0  
**最后更新**: 2026-03-03  
**维护者**: AI Agent Pro Team
