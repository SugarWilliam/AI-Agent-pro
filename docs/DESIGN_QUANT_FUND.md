# 量化基金助手 — 能力协议、资源与调用链

**对应应用版本**: v8.6.2  
**SubAgent id**: `quant_fund`  
**配置来源**: `js/app.js` → `BUILTIN_SUB_AGENTS.quant_fund`  
**方法论文档**: 仓库 `test/量化基金`（文档 1～6）；内置 RAG `rag_quant_fund_f6`（`alwaysInject: true`）

---

## 1. 协议层级（F6.0 与资源对应关系）

| 层级 | 模块（设计文档） | 含义 | 主要依赖 |
|------|------------------|------|----------|
| **L5** | M11/M12 进化 | 用户自建案例与调参；**不承诺**系统自动蒸馏/进化 | `systemPrompt` 诚实边界 |
| **L4** | M08 解释 / M09 纪律哨兵 / M10 人类确认 | 报告结构、情绪检查、核对清单 | `skill_behavior_guardrails`、`rag_decision_behavior_protocols`、MCP 搜索 |
| **L3** | M05 情景 / M06 组合 / M07 租约机 | 三档情景、硬约束、L3→L0 | `skill_scenario_dynamic_probability`、`skill_cn_core_satellite`、`skill_cn_allweather`、`rag_quant_fund_f6` |
| **L2** | M02 平台 / M03 杠铃 / M04 PCL | 平台对抗、杠铃、租约离散估值 | `rag_snowball_realtime`、`rag_finance`、`rag_value_investment`、`rag_quant_fund_f6` |
| **L1** | M01 数据融合 | 数据分级、补全清单、溯源、行情拉取规则 | `skill_data_cleaning`、`skill_analyst`、`rag_realtime_finance_data`、`rag_data_api_finance`、`rag_data_api_official` |

**横向能力（贯穿多层）**：第一性原理、逻辑、认知心理、魔鬼代言人、预验尸 → `skill_first_principles`、`rag_logic`、`rag_psychology`、`skill_devil_advocate`、`skill_decision_premortem`、`rag_iceberg_model`。

---

## 2. 资源绑定（与「量化幻方矩阵」对齐策略）

与 `quant_magic_square` **共用**同一套 **Rules（6 条）** 与 **MCP（web_search + calculator）**，并在 **Skills / RAG** 上对齐「数据 + CN + 行为 + 认知」底座；**不绑定** `rag_quant_output_protocols`（该库为股票 V4.x 报告体例与「量化幻方矩阵」署名，避免与基金 F6.0 混用）。

### 2.1 Skills（29 个，与矩阵助手同列表）

| 分组 | skill id |
|------|----------|
| 投资与决策 | `skill_value_investment`, `skill_decision_expert`, `skill_advanced_analytics`, `skill_data_cleaning` |
| 分析与结构 | `skill_first_principles`, `skill_analyst`, `skill_researcher`, `skill_swot`, `skill_pyramid`, `skill_mece` |
| 可视化与计划 | `skill_mermaid_visualization`, `skill_planner`, `skill_smart`, `skill_dependency`, `skill_temporal_relation` |
| 情景与沙盘 | `skill_scenario_dynamic_probability`, `skill_multi_temporal_sandbox`, `skill_backtest` |
| CN 本土化 | `skill_cn_quality_value`, `skill_cn_multifactor`, `skill_cn_cycle_timing`, `skill_cn_core_satellite`, `skill_cn_smallcap_specialized`, `skill_cn_allweather` |
| 认知与行为 | `skill_cognitive_psychology`, `skill_iceberg_model`, `skill_decision_premortem`, `skill_devil_advocate`, `skill_behavior_guardrails` |

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
        ② llm.js：【当前日期与时间】【约束重申】【署名】【期望值/橡树硬性小节】【实时金融数据】
        ③ systemPrompt（F6.0 全文）
        ④ 【规则】
        ⑤ 【技能指引】
        ⑥ 网络搜索结果（若有）
        ⑦ MCP 工具结果（若有）
        ⑧ 【知识库参考】（RAG）
        ⑨ 【输出格式要求】
  → callLLM
```

**多轮对话**：`js/events.js` 中与 `quant_magic_square` 相同策略——开启网络搜索时，**多轮仍执行搜索**，便于持续核对基金净值、规模、费率。

---

## 4. 与量化幻方矩阵（`quant_magic_square`）的差异

| 维度 | quant_magic_square | quant_fund |
|------|-------------------|------------|
| 核心协议 | V4.x 钻石 / BMP / DCF 个股 | F6.0：PCL、SCVO、租约、组合硬约束 |
| 专属 RAG | 含 `rag_quant_output_protocols`；均绑定 `rag_realtime_finance_data` | 含 `rag_quant_fund_f6`，**不含**股票输出协议；均绑定 `rag_realtime_finance_data` |
| 系统提示注入 | 〇·6/〇·7 显式 + 矩阵专用 + 实时数据 | 期望值 + 橡树 + 基金数据约束 + 实时数据 |
| 署名 | 量化幻方矩阵 呈上 | 量化基金助手 呈上 |

---

## 5. 维护说明

- 增删 **skill/rag** 时须同步：`js/app.js` → `BUILTIN_SUB_AGENTS.quant_fund` → 本文档 §2 → `docs/助手能力全集.md` 能力表与合计。
- **capabilities** 数组为 AgentCard / 展示用，与 `systemPrompt` 能力描述保持一致。
