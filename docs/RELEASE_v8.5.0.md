# AI Agent Pro v8.5.0 发布说明

**发布日期**: 2026-03-15

## A2A 工作流多轮对话优化

### 主 Agent 控住上下文，避免重复走链
- 当主 Agent 配置了「关联助手」（delegateTo）时：
  - **首轮**：走完整 Workflow 链（主 Agent 分析 → 子 Agent 执行 → 主 Agent 整合），主 Agent 基于自身分析结果与各子 Agent 产出综合给出最终结果。
  - **后续轮次**：不再重新执行整条 Workflow，仅由主 Agent 基于完整对话历史进行单轮回复，避免信息流丢失、避免重复调用子 Agent。
- **例外**：用户显式输入 `[Workflow:...]` 时，该条消息仍按手动指定链执行。
- 实现：`js/events.js`（多轮时置空 workflowChainSteps，走 sendMessage 路径）。文档：DESIGN_A2A.md 新增「8.3 多轮对话行为」。

---

## 新增 SubAgent：量化幻方矩阵

- **id**: quant_magic_square · **名称**: 量化幻方矩阵
- **定位**：专业价值投资分析（股票、基金、数据分析、政策研究、企业、金融），侧重中国市场。
- **核心能力**：高级量化幻方与决策矩阵、BMP 选股、定量财务分析（ROE/股东盈余/毛利率/留存利润效率）、定性竞争优势、数据甄别/分类/分层/清洗、深度分析、重要程度/优先级/权重显式设定；事实与观点识别、逻辑严谨、时序与时效（含陈旧信息处理）。
- **默认资源**：参考超级决策与认知分析，绑定认知心理学、冰山模型、SMART、金字塔、行业/政府报告、心理学与脑科学等；RAG 含雪球等专业财经实时、价值投资与量化。

---

## 新增 RAG 与技能

- **RAG**：`rag_value_investment`（价值投资与量化）、`rag_snowball_realtime`（雪球、同花顺、东方财富、财联社、金十数据、巨潮、华尔街见闻、格隆汇等，用于实时抓取最新信息）。
- **Skill**：`skill_value_investment`（价值投资与量化幻方，BMP、数据甄别与权重）。

---

## RAG 新建保存修复

- 「上传文件」创建知识库并导入 Markdown/PDF 等后，现会正确创建 RAG 条目、写入 AppState 并 saveState，新建知识库可持久化；增加「知识库名称」必填项。实现：`js/events.js`。

---

## 文档更新

- DESIGN_A2A.md：多轮对话行为（8.3）、行为矩阵首轮/多轮区分，版本 v2.1。
- 助手能力全集.md：新增「量化幻方矩阵」能力列表与能力统计。
- 版本号统一为 8.5.0（app.js、index.html、js 模块头、release.sh、CHANGELOG、RELEASE_READINESS、DEPLOYMENT、唐宋文化设计.md）。

---

## 下载与发布

- **在线访问**: https://sugarwilliam.github.io/AI-Agent-pro/
- **发布脚本**: `./release.sh 8.5.0`（需在 gh-pages 分支执行）
- **Source code (zip)**: 在 Release 页面点击下载
