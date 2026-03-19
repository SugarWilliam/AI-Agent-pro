# AI Agent Pro 发布说明汇总

本文档合并历史各版本 RELEASE_v*.md，便于查阅。详细变更列表见 [CHANGELOG.md](../CHANGELOG.md)。

---

## v8.5.3（2026-03-19）

### 量化幻方矩阵 V3.0 与能力增强

- **协议**：V3.0 全栈（动态适应声明、22 项专业级增强、设计文档 4.7 检查结论）；硬性必须体现**现金流分析**、**3×3 估值压力测试矩阵**（估值类）、**三维坐标 X/Y/Z 显式小标题**、**时间止损**；**动态情绪因子**纳入 KDI/情景；新增 **〇·6 期望值与工程化落地**、**〇·7 霍华德·马克斯/橡树资本思想**（第二层次思维、周期、永久资本损失、安全边际）。
- **RAG / capabilities / DESIGN_QUANT_MAGIC_SQUARE.md**：同步上述要点。

### 版本号统一为 8.5.3

- 应用、脚本与文档已统一为 v8.5.3（app.js、index.html、js 模块、release.sh、deploy.sh、CHANGELOG、RELEASES、RELEASE_READINESS、DEPLOYMENT、DESIGN 系列、PROJECT_REVIEW、REVIEWS、唐宋文化设计、助手能力全集、README、review-test 等）。

**下载与发布**：在线访问 https://sugarwilliam.github.io/AI-Agent-pro/ ；发布脚本 `./release.sh 8.5.3`（需在 gh-pages 分支执行）。

---

## v8.5.2（2026-03-18）

### 量化幻方矩阵 V2.0 全栈协议与钻石标准能力升级

- **协议增强**：〇·3 数据贞操与溯源（数据溯源表）、〇·4 立体交叉验证（X/Y/Z 三维定位）、六·2 逻辑量化锚定、八·1 程序化操作清单（阶梯式交易执行手册、KDI 监控与自动警报清单）；魔鬼代言人**每份报告必含**。
- **报告结构**：V2.0 强制 8 段（核心结论、数据层与溯源表、立体分析与量化矩阵、决策路径图、KDI 与警报清单、压力测试含魔鬼代言人+3×3 估值压力测试矩阵、阶梯式交易执行手册、报告使用指南与版本更新日志及免责声明）；报告末尾须注明建议提交量化幻方矩阵标准委员会署名评估与审核。
- **RAG 与设计文档**：`rag_quant_output_protocols` 合入 V2.0 要点；DESIGN_QUANT_MAGIC_SQUARE.md 同步 3.1 表、输出规范与必须/可选说明。

### 版本号统一为 8.5.2

- 应用、脚本与文档已统一为 v8.5.2（app.js、index.html、js 模块、release.sh、deploy.sh、CHANGELOG、RELEASES、RELEASE_READINESS、DEPLOYMENT、DESIGN 系列、PROJECT_REVIEW、REVIEWS、唐宋文化设计、助手能力全集、README、review-test 等）。

**下载与发布**：在线访问 https://sugarwilliam.github.io/AI-Agent-pro/ ；发布脚本 `./release.sh 8.5.2`（需在 gh-pages 分支执行）。

---

## v8.5.1（2026-03-15）

### 导出与下载：仅报告、不含思考过程（全助手）

- **单条消息**：消息操作「导出」可选 Markdown、HTML、TXT、JSON、PDF；除 JSON 保留完整数据外，MD/HTML/TXT/PDF **仅包含报告内容，不包含 AI 思考过程**。
- **对话导出**：工具面板「导出 Markdown」「导出 HTML」仅包含每条消息的报告内容；「导出 PDF」打开仅报告内容的 HTML 并调起打印，用户选择「另存为 PDF」即可保存。
- **H5**：若助手输出了 H5/HTML 报告块，「下载 H5」得到该内容块对应的 HTML 文件，不含思考过程。详见设计文档「导出与下载（全助手通用）」章节。

### 量化幻方设计文档更新

- 设计文档增加：**投资免责声明**（文首）、**助手调用逻辑**（2.4）、**技能使用说明**（3.2.7）、**导出与下载（全助手通用）**（1.4）；版本与维护说明更新为 v8.5.1。量化幻方完整设计见 [DESIGN.md](DESIGN.md) 第 14 章及 [DESIGN_QUANT_MAGIC_SQUARE.md](DESIGN_QUANT_MAGIC_SQUARE.md)。

### 版本号统一为 8.5.1

- 应用版本：app.js（VERSION）、index.html、js 模块头、release.sh 默认、README 徽章。
- 文档：CHANGELOG、RELEASE_READINESS、DEPLOYMENT、唐宋文化设计、助手能力全集、DESIGN_A2A、review-test 等。

### 数据 API 基础连通性验证

- 新增 **`scripts/verify_data_apis.py`**：对 AkShare、Tushare Pro、国家数据、信用中国做最小调用/HTTP 可达性测试；结果写入 `scripts/verify_data_apis_result.txt`，含校验日期。
- RAG 与设计文档中已注明：**已于某日做过基础连通性验证**，验证日期以脚本输出为准。详见 [DESIGN_QUANT_MAGIC_SQUARE.md](DESIGN_QUANT_MAGIC_SQUARE.md) 第 3.6 节。

**下载与发布**：在线访问 https://sugarwilliam.github.io/AI-Agent-pro/ ；发布脚本 `./release.sh 8.5.1`（需在 gh-pages 分支执行）。

---

## v8.5.0（2026-03-15）

### A2A 工作流多轮对话优化

- **主 Agent 控住上下文，避免重复走链**：当主 Agent 配置了「关联助手」（delegateTo）时，**首轮**走完整 Workflow 链（主 Agent 分析 → 子 Agent 执行 → 主 Agent 整合）；**后续轮次**不再重新执行整条 Workflow，仅由主 Agent 基于完整对话历史进行单轮回复，避免信息流丢失与重复调用子 Agent。
- **例外**：用户显式输入 `[Workflow:...]` 时，该条消息仍按手动指定链执行。
- 实现：`js/events.js`（多轮时置空 workflowChainSteps，走 sendMessage 路径）。文档：DESIGN_A2A.md 新增「8.3 多轮对话行为」。

### 新增 SubAgent：量化幻方矩阵

- **id**: quant_magic_square · **名称**: 量化幻方矩阵
- **定位**：专业价值投资分析（股票、基金、数据分析、政策研究、企业、金融），侧重中国市场。
- **核心能力**：高级量化幻方与决策矩阵、BMP 选股、定量财务分析（ROE/股东盈余/毛利率/留存利润效率）、定性竞争优势、数据甄别/分类/分层/清洗、深度分析、重要程度/优先级/权重显式设定；事实与观点识别、逻辑严谨、时序与时效（含陈旧信息处理）。
- **默认资源**：参考超级决策与认知分析，绑定认知心理学、冰山模型、SMART、金字塔、行业/政府报告、心理学与脑科学等；RAG 含雪球等专业财经实时、价值投资与量化。

### 新增 RAG 与技能

- **RAG**：`rag_value_investment`（价值投资与量化）、`rag_snowball_realtime`（雪球、同花顺、东方财富、财联社、金十数据、巨潮、华尔街见闻、格隆汇等）。
- **Skill**：`skill_value_investment`（价值投资与量化幻方，BMP、数据甄别与权重）。

### RAG 新建保存修复

- 「上传文件」创建知识库并导入 Markdown/PDF 等后，现会正确创建 RAG 条目、写入 AppState 并 saveState，新建知识库可持久化；增加「知识库名称」必填项。实现：`js/events.js`。

### 文档更新

- DESIGN_A2A.md：多轮对话行为（8.3）、行为矩阵首轮/多轮区分。
- 助手能力全集.md：新增「量化幻方矩阵」能力列表与能力统计。
- 版本号统一为 8.5.0（app.js、index.html、js 模块头、release.sh、CHANGELOG、RELEASE_READINESS、DEPLOYMENT、唐宋文化设计.md）。

**下载与发布**：在线访问 https://sugarwilliam.github.io/AI-Agent-pro/ ；发布脚本 `./release.sh 8.5.0`（需在 gh-pages 分支执行）。

---

## 8.4.x 唐宋文化专项（摘要）

| 版本 | 日期 | 主要变更 |
|------|------|----------|
| 8.4.2 | 2026-03-11 | EPUB 自动打包、MECE 九段式、30 项 capabilities、合规审查 |
| 8.4.3 | 2026-03-14 | 推广页 H5 识别修复、EPUB XHTML 规范化、10 步 workflowSteps、确认流程、封面预览 |

唐宋文化助手：MECE 九段式 systemPrompt、30 项 capabilities、10 步 workflowSteps；EPUB 自动打包（JSZip、extractEpubBlocksFromContent、buildEpubAsAttachment、ensureXhtmlStructure）；推广简介档 H5 优先识别；输出后询问（上架/版权/纸质/运营指导）；合规与风险审查。详见 [CHANGELOG.md](../CHANGELOG.md) 对应版本条目。

---

**文档版本**: v8.5.3 · 最后更新: 2026-03-19
