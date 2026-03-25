# 更新日志

本文档记录 AI Agent Pro 的版本变更。各版本发布说明汇总见 [docs/RELEASES.md](docs/RELEASES.md)。

---

## [8.6.2] - 2026-03-25

### 新增 SubAgent：量化基金（quant_fund）

- **协议**：家庭基金投资 **F6.0-Ultimate-Personal**（方法论见仓库 `test/量化基金` 文档 1～6；内置 RAG `rag_quant_fund_f6`）。
- **能力要点**：SCVO 租约、三维档位 C×S×M、规则化贝叶斯与租约 L3→L0、平台算法陷阱对抗、极简/标准分层输出、魔鬼代言人 15 问与预验尸、数据质量 A/B/C 与补全清单。
- **实现**：`js/app.js` → `BUILTIN_SUB_AGENTS.quant_fund`；`js/llm.js` 注入北京时间、禁止占位、署名「量化基金助手 呈上」；`js/events.js` 与量化幻方矩阵助手相同，多轮对话仍执行网络搜索以核对基金数据。
- **文档**：`docs/助手能力全集.md` 新增「量化基金」能力表与合计能力数；`docs/DESIGN.md` 新增第 15 章。

### 版本号统一为 8.6.2

- 应用、脚本与主要展示文档已统一为 v8.6.2。

---

## [8.6.1] - 2026-03-15

### 量化幻方助手 V4.1 协议栈升级（V4.0 全栈 + V6.0 可选增强）

- **协议栈 V4.1**：在 V4.0 全栈基础上，将 V6.0 增强能力作为可选模块纳入；助手版本升级至 **V4.1**。
- **V6.0 可选增强模块**：信息期权定价、全天候组合、三维退出网格、3×3×3 压力测试、BMP-E 四维矩阵、时间止损强化、贝叶斯+置信区间+动态更新；当场景适用时建议输出，不替代 V4.0 强制 8 段。
- **禁止动作清单**：阶梯式执行手册须含禁止动作清单（3–5 条，编号格式），由禁止动作条款升级为清单化。
- **概率处理分层**：V4.0 基础层（必须）母概率 + KDI 再归一化；V6.0 可选层贝叶斯 + 置信区间 + 动态更新（互补，不替代）。
- **输出规范模板**：新增 `docs/量化幻方矩阵_输出规范模板_V4.1.md`，整合 8 段结构、必须体现、V6.0 可选、检查清单。
- **fix**：模板字符串反引号转义导致 SyntaxError（`test/...` 未转义，Unexpected identifier 'test'）。

### 版本号统一为 8.6.1

- 应用与脚本：app.js（VERSION）、index.html、js 模块头、release.sh 默认、deploy.sh。
- 文档：CHANGELOG、RELEASES、DESIGN_QUANT_MAGIC_SQUARE、输出稳定性升级、量化幻方输出规范模板。

---

## [8.6.0] - 2026-03-15

### 量化幻方 V4.0 黄金样例与文档链对齐（评审发布）

- **黄金基准样例**（`test/量化幻方矩阵投资决策报告【V4.0钻石标准】.md`）：〇·6 期望值与 **P_i、C、P₀** 代数对齐；**母概率↔派生 60/40** 强制一致；**KDI→类型 A/B 再归一化程序**（含算例）；**阶梯3** **E[r'|止盈]** vs **E[r'|持有]** 与第六节目标价同源；**持有期 H、路径约定、r_i↔r'_i** 校验；**决策链总览**与 **〇·8** 检查清单、决策流管道同步；魔鬼代言人表述修正（毛利率口径）。
- **设计文档**：`docs/DESIGN_QUANT_MAGIC_SQUARE.md` 对应应用版本 **v8.6.0**，第七节补充与黄金样例行维护说明。
- **发布文档**：**v8.6.0** 执行摘要与评审表已**并入** **`docs/RELEASES.md`**（不再单独维护 `RELEASE_v8.6.0.md`）；`RELEASE_READINESS.md` / `PROJECT_REVIEW.md` / `REVIEWS.md` 等引用已指向 RELEASES；`docs/MODIFICATIONS_2026-03.md` 增加「以 CHANGELOG/RELEASES 为准」指引。

### 版本号统一为 8.6.0

- 应用与脚本：app.js（VERSION）、index.html、js 模块头、release.sh 默认、deploy.sh。
- 文档：CHANGELOG、RELEASES、RELEASE_READINESS、DEPLOYMENT、DEPLOYMENT_GUIDE、DESIGN、DESIGN_QUANT_MAGIC_SQUARE、DESIGN_A2A、PROJECT_REVIEW、REVIEWS、唐宋文化设计、助手能力全集、docs 内 HTML、README 徽章、review-test。

---

## [8.5.3] - 2026-03-19

### 量化幻方矩阵协议与版本维护

- **V3.0 协议栈**：动态适应声明、22 项专业级增强、能力与协议检查（设计文档 4.7）；必须体现现金流分析、3×3 估值矩阵、时间止损、三维坐标显式小标题、动态情绪因子；新增 〇·6 期望值思维与工程化落地、〇·7 霍华德·马克斯/橡树资本思想融合。
- **RAG**：`rag_quant_output_protocols` 增补「九、必须体现与思想融合」等要点。

### 版本号统一为 8.5.3

- 应用与脚本：app.js（VERSION）、index.html、js 模块头、release.sh 默认、deploy.sh。
- 文档：CHANGELOG、RELEASES、RELEASE_READINESS、DEPLOYMENT、DEPLOYMENT_GUIDE、DESIGN、DESIGN_QUANT_MAGIC_SQUARE、DESIGN_A2A、PROJECT_REVIEW、REVIEWS、唐宋文化设计、助手能力全集、docs 内 HTML、README 徽章、review-test。

---

## [8.5.2] - 2026-03-18

### 量化幻方矩阵 V2.0 全栈协议与钻石标准能力升级

- **systemPrompt 增强**：新增 〇·3 数据贞操与溯源协议、〇·4 立体交叉验证框架（行业景气度 X / 公司相对优势 Y / 市场系统性风险 Z）、六·2 逻辑量化锚定协议、八·1 程序化操作清单（阶梯式交易执行手册、KDI 监控与自动警报清单）；魔鬼代言人由可选改为**每份报告必含**。
- **输出规范 V2.0**：强制 8 段结构（核心结论、数据层与溯源表、立体分析与量化矩阵、决策路径图、KDI 与警报清单、压力测试含魔鬼代言人+3×3 估值压力测试矩阵、阶梯式交易执行手册、报告使用指南与版本更新日志及免责声明）；报告末尾须注明「建议提交量化幻方矩阵标准委员会进行署名评估与审核」。
- **RAG**：`rag_quant_output_protocols` 合入 V2.0 协议要点（数据溯源、立体交叉验证、逻辑锚定、程序化清单、魔鬼代言人必含、标准委员会署名审核）。
- **能力列表**：补全并保留原能力表述（含 KDI 监控仪表盘、AI 魔鬼代言人报告鲁棒性测试），新增数据溯源表与溯源协议、立体交叉验证三维定位、逻辑量化锚定与 KDI 触发公式、阶梯式交易执行手册、KDI 监控与自动警报清单、3×3 估值压力测试矩阵、报告使用指南与版本更新日志、魔鬼代言人必含、标准委员会署名评估与审核、V2.0 钻石标准报告结构。
- **设计文档**：DESIGN_QUANT_MAGIC_SQUARE.md 同步 3.1 表（〇·3、〇·4、六·2、八·1）、输出规范、必须/可选说明及 RAG 职责。

### 版本号统一为 8.5.2

- 应用与脚本：app.js（VERSION）、index.html、js 模块头（app/rag/events/ui/sync/plan/llm）、release.sh 默认、deploy.sh。
- 文档：CHANGELOG、RELEASES、RELEASE_READINESS、DEPLOYMENT、DEPLOYMENT_GUIDE、DESIGN、DESIGN_QUANT_MAGIC_SQUARE、DESIGN_A2A、PROJECT_REVIEW、REVIEWS、唐宋文化设计、助手能力全集、docs 内 HTML、README 徽章、review-test。

---

## [8.5.1] - 2026-03-15

### 导出与下载：仅报告、不含思考过程（全助手）

- **单条消息**：导出/下载（Markdown、HTML、TXT、PDF）仅包含报告内容，不包含 AI 思考过程；`formatAsMarkdown`、`formatAsHTML`、`formatAsText` 及单条 PDF 已统一为报告 only。
- **对话导出**：导出 Markdown、导出 HTML 仅包含每条消息的报告内容；**导出 PDF** 改为可用：打开仅报告内容的 HTML 并调起打印，用户选择「另存为 PDF」即可。
- **H5**：下载 H5 报告块仍为内容块本身，不含思考过程。设计文档见 docs/DESIGN.md 第 14 章及 DESIGN_QUANT_MAGIC_SQUARE.md。

### 量化幻方设计文档

- 设计文档增加：助手调用逻辑（2.4）、技能使用说明（3.2.7）、导出与下载全助手通用说明（1.4）、投资免责声明（文首）。
- 版本与维护说明更新为 v8.5.1。

### 版本号统一为 8.5.1

- app.js（VERSION）、index.html（title、splash、brand）、js 模块头（app/ui/events/rag/llm/sync/plan）、release.sh 默认、CHANGELOG、RELEASE_READINESS、DEPLOYMENT、DESIGN_QUANT_MAGIC_SQUARE、唐宋文化设计、助手能力全集、DESIGN_A2A、review-test、README 徽章。

---

## [8.5.0] - 2026-03-15

### A2A 工作流多轮对话优化

- **多轮由主 Agent 控住上下文**：当主 Agent 配置了 delegateTo 时，首轮走完整 Workflow（分析→子 Agent→整合）；后续轮次不再重复执行整条链，仅由主 Agent 基于完整对话历史回复，避免信息流丢失与重复调用子 Agent。
- **例外**：用户显式输入 `[Workflow:...]` 时仍按手动指定链执行。
- **文档**：DESIGN_A2A.md 增加「多轮对话行为」小节（8.3），与实现一致。

### 新增 SubAgent：量化幻方矩阵 (quant_magic_square)

- **定位**：专业价值投资分析（股票、基金、数据分析、政策研究、企业、金融），侧重中国市场。
- **核心能力**：高级量化幻方与决策矩阵、BMP 选股框架、定量财务分析（ROE/股东盈余/毛利率/留存利润效率）、定性竞争优势、信息与数据可靠性识别、数据甄别/分类/分层/清洗、深度分析、重要程度/优先级/权重显式设定。
- **事实与观点、逻辑与时效**：识别并标注事实与观点；逻辑严谨、时序正确；关键信息标注时间，陈旧信息（如 5 年前）说明是否仍适用或降权。
- **实时数据**：默认绑定「雪球等专业财经实时」RAG，支持多渠道最新信息；任务解析与多源/多模型协同。
- **默认资源**：参考超级决策与认知分析，默认绑定认知心理学、冰山模型、SMART、金字塔、行业/政府报告、心理学与脑科学等 RAG 与技能。

### 新增 RAG 与技能

- **RAG**：`rag_value_investment`（价值投资与量化）、`rag_snowball_realtime`（雪球、同花顺、东方财富、财联社、金十数据、巨潮、华尔街见闻、格隆汇等专业财经实时）。
- **Skill**：`skill_value_investment`（价值投资与量化幻方，含 BMP、数据甄别与权重）。

### RAG 新建保存修复

- 添加知识库时选择「上传文件」并导入 Markdown/PDF 等：现会正确创建 RAG 条目并写入 AppState、调用 saveState，新建知识库可持久化并在列表中显示；增加「知识库名称」必填项。

### 文档与发布准备

- 版本号统一为 8.5.0（app.js、index.html、js 模块头、release.sh 默认、CHANGELOG、RELEASE_READINESS、DEPLOYMENT、唐宋文化设计.md）。
- 助手能力全集.md 增加「量化幻方矩阵」能力列表与统计；发布说明见 docs/RELEASES.md，CHANGELOG 补充 8.5.0 完整变更。

---

## [8.4.3] - 2026-03-14

### 唐宋文化助手增强

**推广简介档 H5 识别修复**
- 推广页不再误识别为 chapter-01.xhtml：`inferContentType` 优先识别推广简介档，使用 `.html` 扩展名、正确文件名（如 `推广简介-书名.html`）
- `extractEpubBlocksFromContent` 排除 H5/推广内容，不纳入 EPUB chapters
- 语法修复：`extractEpubBlocksFromContent` 中 while 循环缺少闭合括号，修复 `SyntaxError: Unexpected token ')'` 及 `renderChatHistory is not a function`
- `renderH5Content` 从代码块提取 HTML，避免混入说明文字

**EPUB 文件打不开修复**
- 新增 `ensureXhtmlStructure`：打包时规范化 XHTML（XML 声明、DOCTYPE、UTF-8 编码、移除 BOM）
- 对 nav.xhtml 及所有章节 XHTML 统一应用，提升阅读器兼容性

**唐宋文化工作流与交互**
- 10 步 workflowSteps 分步展示（理解诊断→编排润色→合规检查→输出前确认→EPUB 输出→完成度报告→输出后询问）
- 流程标记 `[唐宋文化步骤:N]` 用于界面进度展示
- 唐宋文化署名约束：出现「唐宋文化」时须说明为彭耀成开发的 AI Agent Pro SubAgent 文稿助手
- 书本生成时间：`getCurrentTimeForBook` 优先网络时间（WorldTimeAPI），失败则用设备时间

**后台模式与确认流程**
- 后台模式切换、关闭按钮逻辑
- 确认快捷按钮（【确认】【同意】【继续】【是】【否】）
- 无人模式：「后续步骤使用相同方式」勾选，任务结束或需确认时推送/响铃
- 免责、合规、版权、AI 声明各有独立确认步骤

**EPUB 导出与封面**
- 导出对话框增加封面预览与确认
- 参考封面叠加书名、作者（优先 参考封面.jpg）

**其他**
- 新增 rule_workflow：任务分解与长任务续写
- 文件产物勾选样式与 SubAgent 资源一致（全选圆形、选中项背景略亮）

---

## [8.4.2] - 2026-03-11

### 唐宋文化助手增强

**EPUB 自动打包与附件**
- 唐宋文化输出完整 epub 结构后，系统自动打包为标准版与微信读书版 EPUB 附件
- 引入 JSZip，实现 extractEpubBlocksFromContent、buildEpubAsAttachment
- 消息附件支持 epub 点击下载

**MECE 能力框架重构**
- 唐宋文化 systemPrompt 按 MECE 原则重组为九段式
- 能力从 20 项扩展至 30 项

**合规与风险审查**
- 新增：风险识别与补充、敏感词过滤、侵权审查、免责声明补充、AI 贡献声明、法律合规审查、原创新声明、参考文献审查、引用标注规范、内容真实性核查

**输出后指导询问**
- 定稿后询问：电子书上架、版权申请、纸质出版、运营指导

**Bug 修复**
- extractEpubBlocksFromContent 兜底正则修正
- FileReader 错误处理

---

## [8.4.1] - 2026-03-10

### SubAgent 唐宋文创更名为唐宋文化

- 创意/出版助手 SubAgent 名称：唐宋文创 → 唐宋文化
- 更新 index.html、app.js、llm.js、docs 中的引用

---

## [8.4.0] - 2026-03-05

### 设置页「清除数据」行为优化

**仅清除用户自定义与历史数据**
- 清除数据仅清除会话、计划、任务、自定义模型、自定义 SubAgent、自定义 Workflow、RAG 向量等用户数据
- 保留 API 密钥、同步配置、Jina AI 配置、主题/语言等设置
- 恢复到初始化状态，而非清空整个 localStorage

**实现**
- app.js：新增 `resetToInitialState()`， selective 清除并保留配置
- events.js：`clearAllData()` 调用 `resetToInitialState()`，更新确认文案

---

## [8.3.3] - 2026-03-05

### Workflow 执行顺序修复（设计约束落地）

**prompt_expert 固定第二位**
- 当 delegateTo 含 prompt_expert 时，其必须排在主 Agent(分析)之后、其他子 Agent 之前，顺序不可颠倒
- events.js：构建链时 orderedDelegates 强制 prompt_expert 为首位 delegate
- llm.js：动态调度时保留 prompt_expert 第二位，schedule 仅编排其他助手（plan/task/...）

**UI 步骤体现主 Agent 编排**
- 动态调度后，UI 显示的步骤顺序为主 Agent 的最优编排，而非 delegateTo 关联顺序

**文档**
- docs/DESIGN_A2A.md：新增 8.4 硬性约束、版本 v2.2
- docs/MODIFICATIONS_2026-03.md：v1.1 约束说明

---

## [8.3.2] - 2026-03-04

### 任务与计划强化

**计划模块**
- MECE 原则、分类分级、原子化、依赖关系、SubAgent 强绑定
- roadmap、里程碑、风险矩阵、资源约束、时间点智能识别
- 根据任务难度、人力、任务数、deadline 智能规划
- 计划详情展示路线图、里程碑、风险、约束；支持 HTML/MD 导出

**任务助手与计划大师 SubAgent**
- 任务助手：skill_mece、skill_dependency，输出 task-classification-table、dependency-graph
- 计划大师：skill_gantt、skill_risk_identification，输出 roadmap、milestones、risk-matrix、resource-constraints

### SubAgent 集群与提示词专家默认绑定

- 各 SubAgent 默认 delegateTo 含 prompt_expert
- Workflow 链：主 Agent(分析) → 提示词专家(优化指令) → 子 Agent 链 → 主 Agent(整合)
- 启动页、侧边栏增加「SubAgent 集群」功能特性

### 文档

- `docs/MODIFICATIONS_2026-03.md`：修改摘要（原因、逻辑、效果）
- `docs/DESIGN_A2A.md`：第 11 节 SubAgent 集群与提示词专家默认绑定
- `docs/DESIGN.md`：2.3 SubAgent 集群

---

## [8.3.1] - 2026-03-04

### 项目整理与清理

**文件清理**
- 删除冗余测试脚本：analyze-and-fix.js、analyze-and-fix-report.py、analyze-test-report.js、fix-failed-tests.py、process-test-report.sh、process-report.py、TEST_STATUS.txt
- 删除 simple-server.py（与 start-server.sh 功能重复）
- 合并 DEPLOY_NOW.sh 到 deploy.sh（新增 --token 参数）

**project-dashboard 渲染增强**
- 支持 `` 双反引号代码块格式
- JSON 容错：字符串内换行、尾逗号、缺失逗号、未转义引号
- managementgaps 嵌套对象（识别/根因）渲染
- 扩展 hasDashboardStructure 检测字段

**文档**
- DIAGRAM_FORMAT_SPEC 更新 project-dashboard 格式说明
- 版本号统一至 v8.3.1

---

## [8.3.0] - 2026-03-03

### A2A 重大升级

**主 Agent 智能化调度**
- 主 Agent 分析任务后根据 AgentCard 能力选择与排序助手
- AgentCard 含 capabilities 列，从 skills 补充能力描述
- parseScheduleFromOutput 解析 schedule，支持子集选择与重排
- 整合步骤接收全部 stepOutputs

**设计文档**
- `docs/DESIGN_A2A.md`：A2A 自主调度完整设计（含需求解读、完备性结论）
- 主设计文档增加 A2A 链接

**其他修复**
- 设置/会话/SubAgent 绑定刷新后恢复默认：主状态优先 localStorage、subAgentConfigs 并入主状态
- 消息下载：跨会话查找、错误提示、PDF 弹窗拦截检测
- 输出渲染：含图表块时强制 markdown、```json 识别 project-dashboard、```html 内嵌 JSON 提取

**文档与菜单**
- 菜单设计/部署/功能说明改为 H5 链接（保留 MD 双文档）
- 新增 `AI-Agent-Pro-Deployment.html`，补充 start-server.sh
- 冗余文档已合并至 DESIGN_A2A.md（A2A_COMPLETENESS_ANALYSIS、DESIGN_A2A_ORCHESTRATION 内容已整合）

---

## [8.2.6] - 2026-03-03

### A2A 风格自主调度（初版）

- **设计书**：`docs/DESIGN_A2A.md`（可发布级）
- **主 Agent 根据任务分析流程**：输出 schedule JSON 指定执行顺序
- **AgentCard**：buildAgentCards、formatAgentCardsForPrompt
- **parseScheduleFromOutput**：解析并动态替换链
- **单元测试**：`test/test-a2a-orchestration.js`、`test/test-a2a-orchestration.html`

---

## [8.2.5] - 2026-03-03

> **预发布版本**：此版本标注为非生产就绪（Pre-release / non-production ready）

### 项目评审与整理

**主要变更**

- **项目评审**
  - 全面评审项目结构、冗余文件、文档一致性
  - 版本号统一至 v8.2.5

- **决策矩阵**
  - 修复 Markdown 表格格式解析：AI 返回 `| 列 | 列 |` 时不再 JSON 解析报错
  - 优先识别表格格式，再尝试 JSON 解析

- **文档与清理**
  - 更新 docs 文档版本引用
  - 合并冗余部署文档说明

---

## [8.2.4.a] - 2026-03-03

### UI 无响应修复

- 初始化超时保护（10 秒），防止 loadState/loadRagVectors 挂起导致界面永不显示
- 启动页隐藏后增加 pointer-events: none，避免阻挡点击
- 修复图片预览 modal ID 不匹配，新增 closeImagePreview

---

## [8.2.4] - 2026-03-03

### 版本号更新

- 统一版本号至 v8.2.4

---

## [8.2.3] - 2026-03-03

### 全面评审与增强

**主要变更**

- **Workflow 与工作秘书**
  - 修复前级到下一级 instruction 丢失、长内容截断防 token 溢出
  - 工作秘书首尾结构、取消默认 delegateTo、默认超级决策能力
  - 工作秘书系统提示词支持服务对象占位符

- **图表渲染与交互**
  - 修复 Mermaid/流程图/甘特图/决策矩阵不渲染（图表块优先于通用代码块提取）
  - 图表工具栏：全屏、下载、预览、代码、复制
  - 消息排版优化（标题层级、行高、段落间距）

- **持久化**
  - IndexedDB 存储层，大容量无 5MB 限制
  - localStorage 双写备份，file:// 协议提示

- **Bug 修复**
  - plan.js、app.js、llm.js 空指针防护（resources 空值）
  - StorageService 异常日志

- **项目整理**
  - 版本号统一至 v8.2.3
  - 文档更新、冗余文件清理

---

## [8.2.2] - 2026-03-01

### 工程评审与文档同步

**主要变更**

- **工程评审**
  - 新增 docs/PROJECT_REVIEW.md 工程评审报告
  - 架构、代码质量、近期变更评审

- **文档更新**
  - DESIGN.md：SubAgent 扩展字段、工作秘书、问题演化
  - AI-Agent-Pro-Features.html：工作秘书、问题演化、delegateTo 配置
  - PROJECT_SUMMARY、README 文档引用

---

## [8.2.1] - 2026-03-01

### 正式发布版本

**主要变更**

- **项目整理**
  - 清理冗余文档（FEATURES.md、AI-Agent-Pro-Features.md、历史版本更新文档）
  - 功能说明书合并为 H5 格式（AI-Agent-Pro-Features.html）
  - 侧边栏仅保留功能说明书入口

- **状态持久化优化**
  - 页面关闭/隐藏前先同步当前对话消息再保存
  - 使用 immediateSave 替代防抖保存，避免快速关闭时数据丢失
  - 增加 QuotaExceededError 识别与调试日志

- **链接修正**
  - 修正下载源码、Star、Issues 等 GitHub 链接为正确仓库地址
  - 修正部署文档中的访问地址

---

## [8.2.0] - 2026-03-01

- 深度评审与代码优化
- 文件附件解析优化、图片/PDF 解析增强
- 网页爬取改用 POST+url
- 合并冗余部署脚本

---

## [8.1.0] - 2026-03-01

- 更新功能说明书
- 优化菜单文档链接
- 9 源并行网络搜索
- 发送按钮中断功能

---

## [8.0.1] - 2026-03-01

- 修复消息操作按钮
- 多文件上传支持
- 完善文档系统

---

[8.6.2]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.6.2
[8.6.1]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.6.1
[8.6.0]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.6.0
[8.5.3]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.5.3
[8.5.2]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.5.2
[8.5.1]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.5.1
[8.5.0]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.5.0
[8.4.0]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.4.0
[8.3.3]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.3.3
[8.3.2]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.3.2
[8.3.1]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.3.1
[8.3.0]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.3.0
[8.2.6]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.2.6
[8.2.5]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.2.5
[8.2.4]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.2.4
[8.2.3]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.2.3
[8.2.2]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.2.2
[8.2.1]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.2.1
[8.2.0]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.2.0
