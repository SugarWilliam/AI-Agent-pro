# 唐宋文化助手 - 改动 Review 报告

> 审查范围：EPUB 附件、输出后询问、MECE 重构、合规与风险审查、推广简介档 H5、XHTML 规范化

---

## 〇、版本历史

| 版本 | 日期 | 主要变更 |
|------|------|----------|
| 8.4.2 | 2026-03-11 | EPUB 自动打包、MECE 九段式、30 项 capabilities、合规审查 |
| 8.4.3 | 2026-03-14 | 推广页 H5 识别修复、EPUB XHTML 规范化、10 步 workflowSteps、确认流程、封面预览 |

---

## 〇、与远端对比（origin/gh-pages，截至 8.4.3）

**基准**：`origin/gh-pages`（当前分支 gh-pages 的远端）

| 文件 | 变更行数（约） | 变更类型 |
|------|----------------|----------|
| index.html | +43 | 后台模式、工作流预览、文件产物面板、版本号 |
| js/app.js | +275 | 唐宋文化 systemPrompt 强化、workflowSteps、getCurrentTimeForBook、rule_workflow |
| js/events.js | +232 | 后台模式、EPUB 生成、deliverable 刷新、确认快捷按钮 |
| js/ui.js | +938 | 唐宋文化进度、文件产物、EPUB 构建增强、ensureXhtmlStructure、推广页 H5 识别 |
| js/utils/book-cover.js | +49 | 参考封面叠加 |
| css/style-new.css | +439 | 唐宋工作流、文件产物、后台指示器 |

**说明**：`origin/main` 的 creative 为「创意大师」，与 gh-pages 的「唐宋文化」不同；本 Review 以 gh-pages 为基准。

### 远端 vs 本地 核心差异

| 模块 | 远端 (origin/gh-pages) | 本地（8.4.3） |
|------|------------------------|---------------------|
| 唐宋文化 | 十段式 Prompt，20 项 capabilities | MECE 九段式，30 项 capabilities，10 步 workflowSteps |
| EPUB | 无 | JSZip、extractEpubBlocksFromContent、buildEpubAsAttachment、ensureXhtmlStructure |
| 推广简介档 H5 | 无 | 优先识别为 .html，不纳入 EPUB，正确文件名 |
| 输出后询问 | 无 | 上架/版权/纸质/运营指导/推广简介档H5（需用户确认） |
| 合规审查 | 无 | 风险识别、侵权、免责、AI 声明、法律合规、原创、参考文献、敏感词、真实性 |

---

## 一、改动清单

| 模块 | 文件 | 改动内容 |
|------|------|----------|
| EPUB 打包 | index.html | 引入 JSZip CDN |
| EPUB 解析/打包 | js/ui.js | extractEpubBlocksFromContent、buildEpubAsAttachment、downloadEpubAttachment |
| EPUB 附件渲染 | js/ui.js | epub 附件展示、点击下载（事件委托） |
| EPUB 自动生成 | js/events.js | 消息流结束后自动打包并加入 attachments |
| 唐宋文化 Prompt | js/app.js | MECE 重构、输出后询问、合规与风险审查、可选补充合入 |
| 唐宋文化 Capabilities | js/app.js | 20 → 30 项 |
| Workflow 预设 | js/events.js | creative instruction 更新 |
| 文档 | docs/助手能力全集.md | 创建并同步更新 |

---

## 二、代码审查结论

### ✅ 通过项

1. **EPUB 解析逻辑**
   - 正则 `[\w.-]+` 可正确匹配 `content.opf`、`chapter-01.xhtml` 等
   - 兜底逻辑：opf 有 manifest 但 chapters 为空时，从 content 按 href 查找
   - 支持 appendix、copyright、通用 xhtml 块

2. **EPUB 打包结构**
   - mimetype 首文件且 STORE 不压缩，符合 EPUB 规范
   - META-INF/container.xml、OEBPS/content.opf 路径正确
   - 章节按 `OEBPS/Text/` 或 href 含路径时按 OEBPS/ 放置

3. **事件与状态**
   - Workflow 末步为 creative 时也会触发 EPUB 打包
   - `workflowChainSteps?.length` 在非 Workflow 时为 undefined，短路安全
   - epub 下载通过 data-message-id、data-attachment-idx 查找，避免 base64 入 HTML

4. **MECE 结构**
   - 一~九 按阶段划分，无明显重叠
   - 合规与风险审查独立成章，职责清晰

5. **能力与 Prompt 一致性**
   - capabilities 与 systemPrompt 八、合规与风险审查 一一对应

### ⚠️ 建议项

1. **localStorage 体积**
   - EPUB base64 存入 attachments 会增大消息体积，单条可能数百 KB
   - 建议：在文档或设置中说明「含 EPUB 附件的对话可能接近 localStorage 上限（约 5MB）」
   - 可选优化：attachments 仅存 `{ type, name, size }`，data 按需从 content 重新生成（需缓存策略）

2. **EPUB 体积阈值**
   - 当前 `size < 3072` 返回 null，避免生成过小无效文件
   - 可考虑在打包失败时给用户轻量提示（如「未检测到完整 epub 结构」），当前静默忽略

3. **capabilities 冗余**
   - `引用标注规范`、`内容真实性核查` 已包含在 `参考文献审查` 的 systemPrompt 描述中
   - 保留独立 capability 便于 UI 展示和筛选，可接受；若需精简可合并为 `参考文献与真实性审查`

### ❌ 未发现问题

- 无逻辑错误、内存泄漏或明显安全风险
- 无破坏性变更，兼容既有对话与加载逻辑

---

## 三、唐宋文化能力全集（30 项）

| 阶段 | 能力 |
|------|------|
| 理解与诊断 | 深度理解、冗余歧义提示、章节问题检测 |
| 编辑 | 结构编排、内容润色、三审三阅 |
| 呈现 | 排版布局 |
| 交付物 | epub结构输出、出版术语与平台规范 |
| 交互 | 输出前询问、完整电子档附件、电子书上架指导、版权申请指导、纸质输出版本指导、运营指导 |
| 创作 | 创意写作、故事创作、诗歌创作 |
| 质量 | MECE检验、EPUB完整性审查 |
| 合规 | 风险识别与补充、敏感词过滤、侵权审查、免责声明补充、AI贡献声明、法律合规审查、原创新声明、参考文献审查、引用标注规范、内容真实性核查 |

---

## 四、测试建议

1. **EPUB 打包**：用唐宋文化生成含 content.opf + 多章 xhtml 的回复，确认附件出现且可下载
2. **Workflow**：运行 creative 流程，确认末步输出也能生成 EPUB 附件
3. **历史加载**：加载含 EPUB 附件的旧对话，确认点击下载正常
4. **无结构**：发送不包含 epub 结构的消息，确认无报错、无多余附件

---

## 五、与远端合并注意事项

1. **分支**：改动在 `gh-pages`，若需同步到 `main`，需注意 `main` 的 creative 为「创意大师」，合并时以 gh-pages 为准或需人工决策。
2. **CDN 依赖**：新增 JSZip CDN，离线或内网部署需自备 jszip 或改用本地 vendor。
3. **向后兼容**：旧对话无 attachments，加载正常；新对话含 epub 附件会增大存储。

---

## 六、结论

**本次改动可合并。** 与 `origin/gh-pages` 对比，逻辑正确、结构清晰，无破坏性变更。建议关注 localStorage 体积与 CDN 可用性。
