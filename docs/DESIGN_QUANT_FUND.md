# 量化基金助手 — 能力协议、资源与调用链

**对应应用版本**: v8.6.3  
**SubAgent id**: `quant_fund`  
**配置来源**: `js/app.js` → `BUILTIN_SUB_AGENTS.quant_fund`  
**方法论文档**: 仓库 `test/量化基金`（文档 1～6）；内置 RAG `rag_quant_fund_f6`（`alwaysInject: true`）

**选基能力**：助手须完成「约束澄清 → 初筛 → 短名单 → 横向比较表 → M04/C×S×M/贝叶斯深度」闭环（见 `js/app.js` 中 `quant_fund.systemPrompt` 的 **【选基能力】**）；`js/llm.js` 对 `quant_fund` 注入 **【选基能力】** 以强化筛选/推荐/对比类问题。**高级方法论**由内置 Skill **`skill_fund_selection_portfolio_pro`**（基金选基与组合（高级））提供：MPT/CAPM/Black-Litterman/风险平价、费用-流程-业绩(FPP)、多源校验、回测与压力测试、行为偏差披露等（见 `js/app.js` → `BUILTIN_SKILLS`）。

---

## 1. 协议层级（F6.0 与资源对应关系）

| 层级 | 模块（设计文档） | 含义 | 主要依赖 |
|------|------------------|------|----------|
| **L5** | M11/M12 进化 | 用户自建案例与调参；**不承诺**系统自动蒸馏/进化 | `systemPrompt` 诚实边界 |
| **L4** | M08 解释 / M09 纪律哨兵 / M10 人类确认 | 报告结构、情绪检查、核对清单 | `skill_behavior_guardrails`、`rag_decision_behavior_protocols`、MCP 搜索 |
| **L3** | M05 情景 / M06 组合 / M07 租约机 | 三档情景、硬约束、L3→L0 | `skill_scenario_dynamic_probability`、`skill_cn_core_satellite`、`skill_cn_allweather`、`rag_quant_fund_f6` |
| **L2** | M02 平台 / M03 杠铃 / M04 PCL | 平台对抗、杠铃、租约离散估值 | `rag_snowball_realtime`、`rag_finance`、`rag_value_investment`、`rag_quant_fund_f6` |
| **L1** | M01 数据融合 | 数据分级、补全清单、溯源、行情拉取；**与矩阵同一数据红线**（禁止模拟、分层甄别、置信度、补全模板） | `skill_data_cleaning`、`skill_analyst`、`rag_realtime_finance_data`、`rag_data_api_finance`、`rag_data_api_official` |

**横向能力（贯穿多层）**：第一性原理、逻辑、认知心理、魔鬼代言人、预验尸 → `skill_first_principles`、`rag_logic`、`rag_psychology`、`skill_devil_advocate`、`skill_decision_premortem`、`rag_iceberg_model`。

---

## 2. 资源绑定（与「量化幻方矩阵」对齐策略）

与 `quant_magic_square` **共用**同一套 **Rules（6 条）** 与 **MCP（web_search + calculator）**，并在 **Skills / RAG** 上对齐「数据 + CN + 行为 + 认知」底座；**不绑定** `rag_quant_output_protocols`（该库为股票 V4.x 报告体例与「量化幻方矩阵」署名，避免与基金 F6.0 混用）。

### 2.1 Skills（共 **30** 个：与矩阵助手同列表的 **29** 个 + **量化基金专属** 1 个）

| 分组 | skill id |
|------|----------|
| 投资与决策 | `skill_value_investment`, `skill_decision_expert`, `skill_advanced_analytics`, `skill_data_cleaning` |
| 分析与结构 | `skill_first_principles`, `skill_analyst`, `skill_researcher`, `skill_swot`, `skill_pyramid`, `skill_mece` |
| 可视化与计划 | `skill_mermaid_visualization`, `skill_planner`, `skill_smart`, `skill_dependency`, `skill_temporal_relation` |
| 情景与沙盘 | `skill_scenario_dynamic_probability`, `skill_multi_temporal_sandbox`, `skill_backtest` |
| CN 本土化 | `skill_cn_quality_value`, `skill_cn_multifactor`, `skill_cn_cycle_timing`, `skill_cn_core_satellite`, `skill_cn_smallcap_specialized`, `skill_cn_allweather` |
| 认知与行为 | `skill_cognitive_psychology`, `skill_iceberg_model`, `skill_decision_premortem`, `skill_devil_advocate`, `skill_behavior_guardrails` |
| **量化基金专属** | **`skill_fund_selection_portfolio_pro`** — 基金选基与组合（高级）：MPT/CAPM/BL/风险平价、FPP 三维度、多源校验、回测与压力测试、行为偏差与强制披露 |

### 2.2 RAG（22 项：1 个 F6 内置摘要 + 21 个扩展库）

| 顺序 | id | 作用 |
|------|-----|------|
| 1 | `rag_quant_fund_f6` | F6.0 协议摘要（alwaysInject） |
| 2 | `rag_realtime_finance_data` | **实时金融数据接口**：天天基金估算净值、iFinD/东财/Yahoo 等约定与强制执行（与矩阵助手共用） |
| 3 | `rag_cn_analysis_framework` | CN 政策/市场/行为框架 |
| 4 | `rag_decision_behavior_protocols` | 决策与行为护栏 |
| 5 | `rag_value_investment` | 价值投资与组合思想 |
| 6 | `rag_finance` | 通用财经 |
| 7 | `rag_data_api_finance` | 数据 API 说明 |
| 8 | `rag_data_api_official` | 官方数据口径 |
| 9 | `rag_sse` | 上交所规则与披露语境 |
| 10 | `rag_szse` | 深交所规则与披露语境 |
| 11 | `rag_snowball_realtime` | 雪球等实时财经源 |
| 12 | `rag_industry_reports` | 行业报告 |
| 13 | `rag_government_reports` | 政府/政策报告 |
| 14 | `rag_social` | 社会结构等 |
| 15 | `rag_first_principles` | 第一性原理 |
| 16 | `rag_logic` | 逻辑 |
| 17 | `rag_iceberg_model` | 冰山模型 |
| 18 | `rag_psychology` | 心理学 |
| 19 | `rag_neuroscience` | 脑科学（与认知补充） |
| 20 | `rag_temporal_logic` | 时序逻辑 |
| 21 | `rag_common_sense` | 常识 |
| 22 | `rag_history` | 历史类比 |

### 2.3 Rules & MCP

- **Rules**: `rule_format`, `rule_accuracy`, `rule_examples`, `rule_structure`, `rule_context`, `rule_workflow`
- **MCP**: `mcp_web_search`, `mcp_calculator`

---

## 3. 调用链（运行时）

```
用户消息（当前助手 = quant_fund）
  → sendMessage / invokeIntelligentAgent
  → getCurrentSubAgent() → quant_fund
  → getSubAgentResources('quant_fund')
  → buildSkillPrompts（按 skills 数组顺序注入技能 MD）
  → queryRAG（用户 query + rag 列表；rag_quant_fund_f6 因 alwaysInject 常注入）
  → buildEnhancedSystemPrompt
        ① 角色 + description
        ② llm.js 前缀注入（见下「与矩阵对齐的数据红线」）
        ③ systemPrompt（F6.0 全文，含【禁止与强制执行】、数据分层/完备度 A·B·C、溯源与置信度表等）
        ④ 【规则】
        ⑤ 【技能指引】
        ⑥ 网络搜索结果（若有）
        ⑦ MCP 工具结果（若有）
        ⑧ 【知识库参考】（RAG）
        ⑨ 【输出格式要求】
  → callLLM
```

**llm.js 前缀（`quant_fund`）与「量化幻方矩阵」对齐要点**（实现见 `js/llm.js` → `buildEnhancedSystemPrompt`）：

| 注入块 | 含义 |
|--------|------|
| 【当前日期与时间】 | 报告时间、数据基准时点与北京时间一致 |
| 【约束重申】 | **禁止**占位符、**模拟报告/模拟数据**、训练记忆冒充当前；数据须**甄别来源、分层（事实/加工/推断）、清洗口径**后再用于结论；关键数据须标**来源、时间与置信度**；无法获取时只给方法与**补全清单模板**，禁止虚构或示例填数 |
| 【署名】 | 「量化基金助手 呈上」 |
| 【期望值 / 橡树思想（硬性落笔）】 | 两节四级标题，与矩阵助手同结构（基金语境） |
| 【实时金融数据】 | 可观测数值须按 `rag_realtime_finance_data` + 网络搜索，禁止用训练记忆充当行情 |

**systemPrompt 内与矩阵对齐的基金专用条款**（实现见 `js/app.js` → `BUILTIN_SUB_AGENTS.quant_fund.systemPrompt`）：**【禁止与强制执行】**（占位/模拟/编造红线）、**〇·数据甄别·分类·分层·清洗与置信度**、**〇·1·事实与观点与时效**、**数据完备度 A/B/C**（B 级须输出**补全清单模板**）、**数据溯源与置信度表**（标准深度版默认附）、与【数据诚实与诚实边界】交叉引用。

**多轮对话**：`js/events.js` 中与 `quant_magic_square` 相同策略——开启网络搜索时，**多轮仍执行搜索**，便于持续核对基金净值、规模、费率。

---

## 4. 与量化幻方矩阵（`quant_magic_square`）的差异

| 维度 | quant_magic_square | quant_fund |
|------|-------------------|------------|
| 核心协议 | V4.x 钻石 / BMP / DCF 个股 | F6.0：PCL、SCVO、租约、组合硬约束 |
| 专属 RAG | 含 `rag_quant_output_protocols`；均绑定 `rag_realtime_finance_data` | 含 `rag_quant_fund_f6`，**不含**股票输出协议；均绑定 `rag_realtime_finance_data` |
| 系统提示注入 | 〇·6/〇·7 + 矩阵专用 + 禁止模拟/分层/溯源（V4.x）+ 实时数据 | llm 前缀与矩阵**同一数据红线** + systemPrompt 内【禁止与强制执行】、分层/ A·B·C / 补全模板 / **溯源与置信度表** + 实时数据 |
| 署名 | 量化幻方矩阵 呈上 | 量化基金助手 呈上 |

---

## 5. 维护说明

- 增删 **skill/rag** 时须同步：`js/app.js` → `BUILTIN_SUB_AGENTS.quant_fund` → 本文档 §2 → `docs/助手能力全集.md` 能力表与合计。
- **capabilities** 数组为 AgentCard / 展示用，与 `systemPrompt` 能力描述保持一致。
- 调整**数据红线**（禁止模拟、分层、补全模板、置信度表）时须同步：`js/app.js` 中 `quant_fund.systemPrompt`、`js/llm.js` 中 `quant_fund` 分支、本文档 **§3** 与 **§4**。
