---
name: fund-selection-portfolio-pro
description: >-
  专业级基金选基与投资组合方法论（MPT、CAPM、Black-Litterman、风险平价、费用-流程-业绩框架、
  多源校验、回测与压力测试、行为偏差与强制披露）。与量化基金助手 F6.0 协同。
  在仓库中的运行态定义见 js/app.js → skill_fund_selection_portfolio_pro。
version: "2.0.0"
---

# 基金选基与组合（高级）

本目录为 **Cursor/项目侧** 技能说明；**应用内建绑定**以 `js/app.js` 中 `BUILTIN_SKILLS` 的 **`skill_fund_selection_portfolio_pro`** 为准（仅 **quant_fund** 助手加载）。

## 与运行时代码的对应关系

| 项目 | 位置 |
|------|------|
| Skill id | `skill_fund_selection_portfolio_pro` |
| 注入对象 | `BUILTIN_SUB_AGENTS.quant_fund.skills` |
| 提示词全文 | `BUILTIN_SKILLS` 中该条目的 `prompt` / `skillMD` |

## 核心内容摘要（v2.0.0 整理稿）

- **理论**：MPT、CAPM、Black-Litterman、风险平价、行为金融；**实证约束**（Carhart、Fama-French）→ 历史业绩预测力有限，**FPP**：费用 40% / 流程 35% / 业绩 25%。
- **数据**：多源优先级与交叉验证概念；一致性/时效性；无 API 时依赖 RAG+搜索并标注置信度。
- **筛选**：与 F6「初筛—短名单—横向表」衔接；不得单用近一年排名。
- **组合**：SAA 模板化区间；MVO 约束（如单基≤20%）；BL / 风险平价择案说明。
- **回测与压力**：Bootstrap、样本外、过拟合警示；历史压力情景与流动性假设。
- **行为**：近因、追涨、集中、羊群等识别与缓解。
- **输出**：强制披露、limitations、与 M06/PCL 冲突时以 F6 为准。

**声明**：决策支持用途，不构成投资建议；本 Skill 不包含在浏览器内执行 Python 运行时。
