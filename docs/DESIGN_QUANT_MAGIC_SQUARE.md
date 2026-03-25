# 量化幻方助手 — 完整设计文档

**版本**: 1.1  
**对应应用版本**: v8.6.2  
**协议栈**: V4.1（V4.0 全栈 + V6.0 可选增强）  
**最后更新**: 2026-03-15  

> 本文档为量化幻方助手完整设计（含配置清单、技能/RAG 表格、与实现文件对应关系）。摘要与索引见 [DESIGN.md](DESIGN.md) 第 14 章及专项设计文档列表。

---

## 投资免责声明

**本助手及本设计文档仅供个人 Agent 学习与研究方法论使用，不构成任何投资建议、理财建议或买卖依据。**

- 本助手输出的分析、矩阵、情景概率、结论等均为**学习与思考辅助**，使用者须独立判断并承担全部投资风险。
- 本助手**不提供**也不替代专业持牌机构的投资顾问服务；涉及实盘或大额资金决策时，请咨询持牌机构并遵守当地法规。
- 历史回测与情景推演不代表未来表现；市场有风险，投资需谨慎。
- 本项目的设计文档、配置与代码仅用于说明「量化幻方助手」这一 SubAgent 的功能与实现，不表示对任何标的或策略的推荐或背书。

---

## 一、概述与定位

### 1.1 定义

**量化幻方矩阵**（SubAgent id: `quant_magic_square`）是面向**专业价值投资分析**的专用助手，主要服务**中国股市**（A 股/基金/政策/企业），输出**可复现、可操作**的矩阵评分、情景概率与报告结论。

### 1.2 核心定位

| 维度 | 说明 |
|------|------|
| **主战场** | 股票、基金、数据分析、政策与企业研究；中国市场政策、资金面、估值与监管 |
| **方法论** | 高级量化幻方与决策矩阵、BMP 选股、情景动态概率、CN 本土化分析框架（政策β+质量α+行为γ） |
| **输出形态** | 结论简洁可操作；数据与来源注明；矩阵/情景双重决策；强支撑位与多层次退出；**每份报告必含魔鬼代言人压力测试**；建议提交量化幻方矩阵标准委员会署名评估与审核；质量基准须**稳定达到并努力远超**《量化幻方矩阵投资决策报告【V4.0钻石标准】》（`test/量化幻方矩阵投资决策报告【V4.0钻石标准】.md`）；输出稳定性见 `test/输出稳定性升级.txt` 与 systemPrompt **〇·8**；协议栈版本 **V4.1**（V4.0 全栈 + V6.0 可选增强：信息期权、全天候组合、三维退出、3×3×3、BMP-E、时间止损强化、贝叶斯+置信区间）；每份报告文末**强制署名「量化幻方矩阵 呈上」** |
| **边界** | 不替代用户决策；行为护栏与重大决策协议为「可选」；量化标准优先于行为建议；**仅供个人 Agent 学习与研究方法论使用，不构成投资建议**（见文首免责声明） |

### 1.3 与其它助手的关系

- **超级决策**（super_decision）：偏通用决策与认知偏差，已绑定「量化幻方分析」相关技能，可做决策支持；量化幻方则专注**投资分析闭环**（数据→矩阵→情景→报告）。
- **工作秘书**（work_secretary）：偏项目与任务协调，可调度包括量化幻方在内的助手；量化幻方不参与调度，仅作为被选助手。
- **通用助手**（general）：无投资专用能力；量化幻方为投资垂直能力子集。

### 1.4 导出与下载（全助手通用）

- **报告优先**：所有助手的**单条消息下载**（MD/HTML/TXT/PDF）与**对话导出**（导出 Markdown、导出 HTML、导出/另存为 PDF）**仅包含报告内容，不包含 AI 思考过程**。
- **单条**：消息操作「导出」→ 可选格式为 Markdown、HTML、TXT、JSON、PDF；PDF 通过浏览器打印对话框「另存为 PDF」。
- **对话**：工具面板「导出 Markdown」「导出 HTML」为整轮对话（仅报告）；「导出 PDF」打开打印窗口，用户选择「另存为 PDF」即可。
- **H5**：若助手输出了 H5/HTML 块，其「下载 H5」得到该内容块对应的 HTML 文件，本身即为报告内容，不含思考过程。

---

## 二、架构与调用链

### 2.1 配置来源

- **定义位置**：`js/app.js` → `BUILTIN_SUB_AGENTS.quant_magic_square`
- **资源解析**：`getSubAgentResources(subAgentId)` 从 `AppState.subAgents` 与 `AppState.resources` 中按 id 解析 `skills`、`rules`、`mcp`、`rag`（仅包含 `enabled` 且被幻方引用的项）。

### 2.2 请求到响应的调用链

```
用户发送消息
  → LLMService.sendMessage(messages, model, enableWebSearch, onStream, { subAgentId })
  → invokeIntelligentAgent(..., subAgentId)
  → getCurrentSubAgent() / 指定 subAgentId → quant_magic_square
  → getSubAgentResources('quant_magic_square') → { skills, rules, mcp, rag }
  → buildSkillPrompts(resources.skills) → 按数组顺序拼接「## 技能名\n」+ skill.prompt
  → queryRAG(lastMessage.content, resources.rag) → RAGManager.queryRAGKnowledgeBase
       （每 RAG：文档向量检索 > defaultContent 关键词匹配 > 外部数据源）
  → buildEnhancedSystemPrompt({ subAgent, skillPrompts, rulesPrompt, mcpResults, ragContext, ... })
  → callLLM({ messages, systemPrompt, modelId, ... })
  → 流式/非流式返回
```

### 2.3 系统提示词组装顺序（buildEnhancedSystemPrompt）

| 顺序 | 块 | 说明 |
|------|-----|------|
| 1 | 角色与描述 | 「你是「量化幻方矩阵」，{description}」 |
| 1.1 | **【当前日期与时间】+【约束重申】**（仅量化幻方） | 注入真实北京时间；重申禁止占位符/模拟报告/模拟数据、须先 RAG/网络检索后再生成报告（见 llm.js buildEnhancedSystemPrompt） |
| 2 | **systemPrompt** | 含【禁止与强制执行】硬性约束 + 十三大能力块 + 输出规范（见下文 3.1） |
| 3 | 【规则】 | 6 条 rule 按 priority 排序 |
| 4 | 【技能指引】 | 29 个 skill 的 `## 名称` + prompt 顺序拼接 |
| 5 | 【补充信息：网络搜索结果】 | 若有 MCP/网络搜索 |
| 6 | 【补充信息：工具搜索结果】 | 若有 MCP 结果 |
| 7 | 【知识库参考】 | queryRAG 返回的 context（多 RAG 检索结果合并） |
| 8 | 【输出格式要求】 | Markdown、代码块、图表规范等 |

**说明**：RAG 内容不是按「RAG 列表顺序」逐条注入，而是由 **queryRAG(query, ragList)** 根据**用户问题**对每个 RAG 做检索/匹配后合并为一段 `ragContext`，再整体放入【知识库参考】。因此 RAG 列表顺序不表示「调用顺序」，只影响传入 RAGManager 的集合。

### 2.4 助手调用逻辑（何时、如何触发量化幻方）

| 维度 | 说明 |
|------|------|
| **触发方式** | 用户在界面选择「量化幻方矩阵」为当前助手后发送消息；或工作秘书/工作流在调度时指定 `subAgentId: 'quant_magic_square'`。 |
| **入口** | `sendMessageWithContent`（或等价发送）→ `LLMService.sendMessage(..., { subAgentId: 'quant_magic_square' })` → `invokeIntelligentAgent` 使用该 subAgent 的配置与资源。 |
| **单轮 vs 多轮** | 每次用户发送一条消息即走一遍完整调用链（资源解析 → 技能拼接 → RAG 查询 → 系统提示组装 → LLM 调用）；多轮对话时，历史消息在 `messages` 中，但 **RAG 与技能均只基于当前 subAgent 配置与当前轮用户消息**（RAG 的 query 为 lastMessage.content）。 |
| **工作流模式** | 若本次请求带 `isWorkflow: true`，会在 systemPrompt 前插入 Workflow 模式说明（先分析问题、再以自身知识为主、网络补充、再整合输出）；量化幻方绑定的 skills/rag 不变。 |
| **参数传递** | `subAgentId`、`enableWebSearch`、`modelId`、`outputFormat` 等由调用方传入；助手内部不修改这些参数，仅按 subAgent 的 skills/rules/rag/mcp 列表解析资源。 |
| **与其它助手切换** | 用户切换助手后，下一次发送消息即使用新助手的 systemPrompt 与资源；同一会话内可多次切换，每次发送都按**当前选中助手**重新构建 systemPrompt。 |

---

## 三、能力体系

### 3.1 systemPrompt 结构（十三大块 + 输出规范）

| 块 | 标题 | 职责 | 与 Skill/RAG 的关系 |
|----|------|------|----------------------|
| 〇 | 数据甄别、分类、分层、清洗与深度分析 | 基础数据能力；重要程度/优先级/权重显式 | skill_data_cleaning, skill_advanced_analytics, skill_value_investment |
| - | **【禁止与强制执行】** | **禁止**：占位符、模拟报告、模拟数据、占位模拟；**强制执行**：实时最新数据收集（须先 RAG/网络检索再输出，数据须来自本次检索并注明来源；无法获取时须说明并仅给方法框架） | 硬性约束，见 systemPrompt 首段 |
| 〇·1 | 事实与观点、逻辑严谨、时序与时效 | 硬性约束；事实 vs 观点；时效与陈旧信息 | rule_accuracy；贯穿各 skill |
| 〇·2 | 量化幻方报告输出协议（王者级） | 数据贞操与分级响应 A/B/C；强观点概率-结论；决策路径图与复查节点；五条技术条款；王者级四要件；示例与数据引用防误用 | rag_quant_output_protocols |
| 〇·3 | 数据贞操与溯源协议（V4.0） | 关键数据精确来源；报告末尾**数据溯源表**；禁止模糊表述；存疑数据剔除或敏感性分析 | rag_quant_output_protocols |
| 〇·4 | 立体交叉验证框架（V4.0） | 标的置于「行业景气度(X)-公司相对优势(Y)-市场系统性风险(Z)」三维坐标系；同业含动态估值对比与溢价/折价历史分位 | rag_quant_output_protocols |
| 〇·5 | 专业级钻石标准增强协议（V4.0） | 逻辑量化锚定（每评分/权重+条件调整公式）、魔鬼代言人+反驳所需证据、历史估值分位、风险警示与个性化揭示、**禁止动作清单**（3–5 条，编号格式）、数据加工过程标注、情景冲击力、概率-结论量化、KDI 融合与调整公式、**DCF 敏感性分析**（WACC/g 表，与决策矩阵 P 维、决策链阶梯显式衔接）、PE-Band/回测/组合/可比细化/宏观政策/技术面/用户个性化、标准委员会签署+**强制署名量化幻方矩阵**；**必须体现**现金流、3×3、三维坐标、时间止损、**禁止动作清单**、动态情绪因子 | rag_quant_output_protocols |
| 〇·6 | 期望值思维与工程化落地 | 第一性原理：E(结果)=ΣP×结果；底层拆解（现金回报、不可逆损失）；范围管理（假设上下界与敏感性）；工程化落地（检查清单、触发条件、复查日期） | rag_quant_output_protocols；skill_first_principles |
| 〇·7 | 霍华德·马克斯 / 橡树资本思想 | 第二层次思维、周期与钟摆、风险=永久资本损失、安全边际与逆向（与数据锚定结合，非口号） | rag_quant_output_protocols；skill_cognitive_psychology |
| 〇·8 | V4.0 输出稳定性与黄金基准 | 黄金基准 `test/量化幻方矩阵投资决策报告【V4.0钻石标准】.md`；检查清单（8段+即时行动指令+动态公式+个性化压力测试+委员会+署名）；决策流管道与**阶梯0立即执行**；基金经理/决策系统思维、以终为始；对照 `test/输出稳定性升级.txt` | rag_quant_output_protocols |
| 一 | 高级量化幻方与决策矩阵 | 多维度权重评分、阈值筛选、综合排序 | skill_value_investment, skill_decision_expert |
| 二 | BMP选股框架 | B(业务)/M(管理)/P(价格)；估值含**动态PE、PEG** | skill_value_investment, skill_cn_quality_value |
| 三 | 定量财务分析 | ROE、股东盈余、毛利率、留存利润效率；**现金流与盈利质量深化**（OCF、资本开支计划、FCF/净利润等） | skill_value_investment, skill_advanced_analytics |
| 四 | 定性竞争优势判断 | 护城河、行业地位、定价权、治理 | skill_value_investment, skill_swot |
| 五 | 信息与数据可靠性识别 | 审计意见、口径、关联交易、来源可信度 | skill_value_investment |
| 六 | 数据高级分析 | 时间序列、可比公司、异常值、多源交叉验证 | skill_advanced_analytics, skill_analyst, skill_researcher |
| 六·1 | 数据档案 | 事实层/解读层/推断层；来源与时间 | 与〇分层一致，强调「档案」落地 |
| 六·2 | 逻辑量化锚定协议（V4.0） | 主观判断须有客观量化依据或动态调整公式；鼓励 KDI 触发调整公式；输出时注明权重与概率依据 | rag_quant_output_protocols |
| 七 | 情景动态概率与双重决策体系 | **概率处理分层**：V4.0 基础（必须）**母概率 + 派生 + KDI 再归一化**；V6.0 可选**贝叶斯 + 置信区间 + 动态更新**（互补，不替代）；初始概率、KDI 权重、多时间维度沙盘、量化矩阵+情景概率、按季度更新 | skill_scenario_dynamic_probability, skill_multi_temporal_sandbox |
| 八 | 强支撑位与多层次退出 | **PE Band 下轨**；**短期支撑位**结合成交量、均线等技术面；多层次退出；**八·1 程序化操作清单（V4.0）**：阶梯式交易执行手册、**禁止动作清单**（3–5 条，编号格式）、KDI 监控与自动警报清单；**重大决策与行为护栏（可选）** | skill_behavior_guardrails；rag_quant_output_protocols；预验尸/魔鬼代言人/行为约束见绑定 skill 与 RAG「决策与行为协议」 |
| 九 | 策略回测与对冲 | 回测设计、绩效指标、稳健性；对冲方案 | skill_backtest |
| 十 | 实时最新数据收集 | RAG 与网络必须精准全面调用；**可连通时须用 RAG 数据**；**随时可再次调用全部 RAG 与网络**，必要时**向用户反馈并请求补充信息** | 绑定 RAG（含上交所/深交所官方、雪球实时等）+ mcp_web_search |
| 十一 | 关键指标分析 | ROE、股东盈余、毛利率、留存利润；**估值深度**（动态PE、PEG）；**现金流与盈利质量** | 与三、二呼应 |
| 十二 | 中国市场特点 | 政策、资金面、估值体系、板块轮动 | rag_cn_analysis_framework, skill_cn_* |
| 十二·1 | 行业差异化分析 | **不同行业不同侧重**：制造业/互联网/周期/金融/消费等对应方法与关键指标 | skill_value_investment |
| 十二·2 | 行业周期与经济周期 | **四维**：识别位置、判断方向、衡量幅度、管理时间；库存/政策/盈利/资金周期 | skill_cn_cycle_timing, skill_value_investment |
| 十三 | 中国本土化分析框架（CN分析框架） | 政策β+质量α+行为γ；本土化方法论；实施节奏；关键原则 | 须调用 CN 框架 RAG 与 6 个 CN 技能 |
| **V6.0** | **V6.0 可选增强模块** | **当场景适用时建议输出**（不替代 V4.0 强制 8 段）：①**信息期权定价**（持有观察仓且 E[r] 为负时）；②**全天候组合**（多标的/询问分散时）；③**三维退出网格**（价格/基本面/时间+优先级，可补充阶梯表）；④**3×3×3 压力测试**（可替代或补充 3×3）；⑤**BMP-E 四维矩阵**（E 环境适应性，可选）；⑥**时间止损强化**（持有观察仓时：观测期、观测价、到期日、触发条件、执行动作，数值动态设定）；⑦**贝叶斯 + 置信区间 + 动态更新**（解释概率更新逻辑或量化不确定性时：P(情景)=X% [下界%-上界%]，注明更新触发节点，可与 KDI 再归一化并存） | rag_quant_output_protocols 十一 |
| - | 【输出规范】 | **V4.0 强制 8 段**：核心结论含**即时行动指令**；现金流、3×3、三维坐标、**DCF 敏感性分析**（与 P 维/阶梯衔接）、KDI 情绪因子+公式、个性化压力测试、**阶梯0立即执行**（适用时）、时间止损与**禁止动作清单**（3–5 条，编号格式）；魔鬼代言人+反驳证据；标准委员会+**「量化幻方矩阵 呈上」强制署名**；**可叠加 V6.0 可选增强**（见上表） | 黄金基准《【V4.0钻石标准】》；协议栈 V4.0 融合 V6.0 增强；稳定性见 〇·8 与 `test/输出稳定性升级.txt` |

### 3.2 技能（Skills）分组与职责

共 **29 个** skill，按功能分组如下。**调用逻辑**：全部按数组顺序拼接进【技能指引】，模型同时可见；无「条件调用」分支，由模型根据问题与 systemPrompt 自行选用。

#### 3.2.1 价值投资与量化核心

| id | 名称 | 职责 | 与其它资源关系 |
|----|------|------|----------------|
| skill_value_investment | 价值投资与量化幻方 | BMP、动态PE/PEG、现金流与盈利质量深化、PE Band 与短期支撑位（成交量/均线）、行业差异化、周期四维、随时调用 RAG/网络并可向用户索要补充 | 与 rag_value_investment 互补；与 skill_cn_quality_value 为通用 vs 中国改造 |
| skill_decision_expert | 决策专家 | 决策矩阵、决策链、概率分析、Mermaid、图表规范 | 通用决策工具；重大决策时可叠加 skill_decision_premortem |
| skill_advanced_analytics | 高级数据分析 | 微积分、概率、矩阵、统计分析、回归、时间序列 | 支撑情景概率与回测 |
| skill_data_cleaning | 数据分层清洗 | 数据分层、清洗、质量管理 | 支撑〇与六·1 |

#### 3.2.2 思维与结构化

| id | 名称 | 职责 |
|----|------|------|
| skill_first_principles | 第一性原理思维 | 质疑假设、分解到底、逻辑推导 |
| skill_iceberg_model | 冰山模型分析 | 事件→模式→结构→心智模型 |
| skill_cognitive_psychology | 认知心理学应用 | 认知偏差、决策优化、思维模式 |
| skill_pyramid | 金字塔方法 | 先结论后论据、结构化表达 |
| skill_mece | MECE原则 | 相互独立、完全穷尽 |
| skill_swot | SWOT分析 | 优劣势、机会威胁 |
| skill_smart | SMART方法 | 目标具体、可衡量、可达成、有时限 |
| skill_planner | 计划制定 | 规划、时间管理、目标设定 |

#### 3.2.3 研究、分析与可视化

| id | 名称 | 职责 |
|----|------|------|
| skill_analyst | 数据分析师 | 数据分析、可视化建议 |
| skill_researcher | 研究助手 | 文献检索、资料收集、研究报告 |
| skill_mermaid_visualization | Mermaid可视化 | 流程图、时序图、甘特图、思维导图 |

#### 3.2.4 依赖、时序、情景与回测

| id | 名称 | 职责 |
|----|------|------|
| skill_dependency | 依赖关系分析 | 任务/因素依赖、FS/SS/FF/SF、依赖图 |
| skill_temporal_relation | 时序关系分析 | 因果顺序、时间约束、关键节点 |
| skill_scenario_dynamic_probability | 情景动态概率模型 | 初始概率（历史/蒙特卡洛）、KDI 权重（回归）、动态更新 |
| skill_multi_temporal_sandbox | 多时间维度沙盘推演 | 短期/中期/长期情景与路径、关键节点与拐点 |
| skill_backtest | 策略回测 | 回测设计、绩效指标、归因、稳健性检验 |

#### 3.2.5 CN 本土化（6 个）

| id | 名称 | 职责 |
|----|------|------|
| skill_cn_quality_value | 中国特色质量价值 | ROE/毛利率/负债/分红/护城河中国改造；政策敏感度、大股东行为、流动性 |
| skill_cn_multifactor | 中国A股多因子 | 政策/行为/制度/地缘因子；规模改中盘溢价、价值加质量过滤 |
| skill_cn_cycle_timing | 中国周期与择时 | 政策-市场双周期、政策底→市场底→经济底、政策-资金-情绪三维择时 |
| skill_cn_core_satellite | 中国版核心-卫星配置 | 高股息蓝筹底仓 + 政策主题卫星 + 现金 |
| skill_cn_smallcap_specialized | 专精特新与小盘策略 | 壳价值消亡后真成长筛选、专精特新得分、剔除条件 |
| skill_cn_allweather | 中国全天候策略 | 经济/通胀/政策三维；联海本土化：风险因子拆解、典型/非典型周期、回撤前置；宏观情景概率；贝塔底仓+阿尔法择时 |

#### 3.2.6 重大决策与行为、鲁棒性（3 个）

| id | 名称 | 职责 | 调用时机 |
|----|------|------|----------|
| skill_decision_premortem | 重大决策预验尸与二阶思维 | 二阶思维两问、预验尸、决策日志要素 | 涉及重大仓位或战略转向时**可调用**（不替代矩阵与情景概率） |
| skill_devil_advocate | AI魔鬼代言人 | 对报告与结论做对立面反驳、逻辑漏洞与未证实假设检查 | **每份报告必须**包含魔鬼代言人环节（V4.0 强制） |
| skill_behavior_guardrails | 行为约束协议 | 大跌>20% 检查+48h 冷静期、涨幅>100% 再平衡、决策日与情绪自评 | 仅作行为护栏，不替代量化标准 |

### 3.2.7 技能使用说明（如何选用、无条件分支）

- **注入方式**：所有 29 个技能的 `name` + `prompt` 在每次请求时按配置数组顺序拼接成一大段「【技能指引】」，与 systemPrompt、规则、RAG 等一起交给 LLM。**没有**根据用户意图或关键词做「只注入部分技能」的条件分支；模型在同一轮中能看到全部技能描述。
- **选用责任**：由**模型**根据用户问题、systemPrompt 中的十三大块要求及自身推理，自行决定调用哪些技能、以何种顺序与深度使用。设计上不强制「必须先调用 A 再调用 B」，但 systemPrompt 中已约定：涉及 A 股须结合 CN 框架；涉及重大仓位/战略转向可调用预验尸与魔鬼代言人；行为约束仅作护栏。
- **推荐对应关系（供理解与维护用）**：  
  - 选股/估值/财务 → value_investment, advanced_analytics, cn_quality_value, decision_expert；  
  - 情景与概率 → scenario_dynamic_probability, multi_temporal_sandbox, backtest；  
  - 结构化表达 → pyramid, mece, mermaid_visualization；  
  - 思维与偏差 → first_principles, iceberg_model, cognitive_psychology；  
  - 中国政策/周期/配置 → 6 个 skill_cn_* + rag_cn_analysis_framework；  
  - 重大决策或报告鲁棒性 → decision_premortem, devil_advocate；  
  - 行为与纪律 → behavior_guardrails。  
  以上为「建议侧重」，非硬性调用顺序。
- **注意**：技能过多会拉长 systemPrompt，若观察到 token 压力或模型忽略后半段技能，可考虑在「版本与维护建议」中的可选优化里做按需注入或分组轮换（当前版本未实现）。

### 3.3 RAG 知识库分组与职责

共 **21 个** RAG。**调用逻辑**：`queryRAG(userMessage, ragList)` 对**每个** RAG 执行检索/匹配（文档向量 → **内置 defaultContent**：`alwaysInject===true` 时**绑定即全文注入** → 否则中文增强关键词匹配 → 外部源），结果合并为一段 `ragContext` 注入【知识库参考】。其中 **rag_quant_output_protocols、rag_cn_analysis_framework、rag_decision_behavior_protocols、rag_value_investment、rag_snowball_realtime** 带有 **`alwaysInject: true`**，避免「个股/数据补全」类问句与协议正文词面重合度过低导致本地命中统计恒为 0。其余 RAG 仍按相关度匹配；用户上传的财报/研报文档走向量检索，命中后单独计入 documentMatches。**可连通时须优先使用 RAG 与检索得到的数据**，以保持样本足够多、足够实时、足够专业。

#### 3.3.1 投资与市场（优先）

| id | 名称 | 职责 |
|----|------|------|
| rag_cn_analysis_framework | CN分析框架 | 本土化适配、质量价值改造、多因子、全天候、双周期、三维择时、核心-卫星、专精特新、政策β+质量α+行为γ |
| rag_decision_behavior_protocols | 决策与行为协议 | 二阶思维、预验尸、决策日志要素、行为约束（大跌/大涨/决策日与情绪自评） |
| rag_quant_output_protocols | 量化幻方报告输出协议 | 数据贞操与分级响应、强观点、决策路径图、五条技术条款、王者级四要件；**V4.0**：8 段结构、**母概率 + KDI 再归一化**（概率基础层）、魔鬼代言人+反驳证据、标准委员会+**量化幻方矩阵强制署名**、**禁止动作清单**（3–5 条，编号格式）、输出稳定性检查清单、决策流管道、阶梯0、黄金基准【V4.0钻石标准】、`test/输出稳定性升级.txt`；专业级增强（22 项）同前；**V6.0 可选增强**（十一）：信息期权、全天候组合、三维退出网格、3×3×3、BMP-E、时间止损强化、**贝叶斯+置信区间+动态更新**；**动态适应**：模板与示例数值须本次会话动态填充。 |
| rag_snowball_realtime | 雪球等专业财经实时 | 雪球、同花顺、东财、财联社等实时渠道说明与使用建议 |
| rag_value_investment | 价值投资与量化 | 关键指标、BMP、中国股市特点、定性分析、数据可靠性、政策与宏观 |
| rag_data_api_finance | 免费金融与行情数据API | AkShare、BaoStock、Tushare Pro、Yahoo Finance、CoinGecko、CryptoCompare 等免费/免费额度数据源知识；实际可用性需用户自行验证 |
| rag_data_api_official | 官方与免费开放数据 | 国家数据（data.stats.gov.cn）、信用中国等官方免费开放数据 |
| rag_sse | 上交所官方数据 | 上海证券交易所公告、披露、市场数据；沪市标的须在可连通时优先引用 |
| rag_szse | 深交所官方数据 | 深圳证券交易所公告、披露、市场数据；深市标的须在可连通时优先引用 |
| rag_finance | 金融知识库 | 货币银行、投资理论、风险管理、财务报表基础 |

#### 3.3.2 政策与行业

| id | 名称 | 职责 |
|----|------|------|
| rag_industry_reports | 行业权威报告 | 安防、AI、奶粉、直播、短视频、前瞻行业等 |
| rag_government_reports | 政府工作报告 | 五年规划、年度报告、国家政策、发展规划 |

#### 3.3.3 思维与逻辑

| id | 名称 | 职责 |
|----|------|------|
| rag_social | 社科知识库 | 社会学、心理学、政治学、历史学 |
| rag_first_principles | 第一性原理 | 第一性原理思维、本质思考 |
| rag_logic | 逻辑学知识库 | 形式逻辑、论证、谬误 |
| rag_iceberg_model | 冰山模型 | 冰山模型、系统思考 |
| rag_psychology | 心理学知识库 | 认知、社会、发展、人格、临床 |
| rag_neuroscience | 脑科学与神经科学 | 大脑结构、认知神经、应用 |
| rag_temporal_logic | 时间逻辑知识库 | 时间逻辑、时序推理、因果关系 |
| rag_common_sense | 常识知识库 | 日常、社会、科学、文化常识 |
| rag_history | 历史知识库 | 中外历史、历史规律、案例 |

### 3.4 规则（Rules）

共 **6 条**：rule_format, rule_accuracy, rule_examples, rule_structure, rule_context, rule_workflow。用于格式、准确性、示例、结构、上下文与任务分解/续写的通用约束，与 systemPrompt 中的「输出规范」一致且不冲突。

### 3.5 MCP 工具

- **mcp_web_search**：网络搜索，支撑「实时最新数据收集」。
- **mcp_calculator**：计算器，支撑回测与指标计算。

### 3.6 数据 API 基础连通性验证

- 项目内提供脚本 **`scripts/verify_data_apis.py`**，对部分数据源做**最小调用/HTTP 可达性**测试（AkShare、Tushare Pro、国家数据、信用中国），便于在 RAG 或说明中注明「已于某日做过基础连通性验证」。
- 运行方式：`pip install akshare requests`（可选 `tushare`）；若验证 Tushare Pro 需设置环境变量 `TUSHARE_TOKEN`；执行 `python scripts/verify_data_apis.py`。结果打印到终端并写入 **`scripts/verify_data_apis_result.txt`**（含校验日期与逐项通过/跳过/失败）。
- **验证日期**：以脚本输出或 `verify_data_apis_result.txt` 中的「校验时间」为准。例如：**已于 2026-03-16 做过基础连通性验证**（以实际运行结果为准）。
- RAG `rag_data_api_finance` 与 `rag_data_api_official` 的 defaultContent 中已注明：本项目对部分数据源做过基础连通性验证，详见上述脚本及结果文件。

---

## 四、冗余与边界说明

### 4.1 技能间边界（无重复逻辑）

- **skill_decision_expert** vs **skill_decision_premortem**：前者为通用决策矩阵/链/概率；后者为重大决策时的**可选**协议（二阶思维+预验尸+决策日志）。二者互补，不替代。
- **skill_value_investment** vs **skill_cn_quality_value**：前者为 BMP + 数据甄别 + 量化幻方 + 中国市场**通用**表述；后者为巴菲特质量价值**中国改造**（ROE/毛利率/政策敏感度/大股东行为等）。CN 技能更细、更可操作，与 value_investment 叠加使用。
- **skill_behavior_guardrails** vs systemPrompt 八：八中已写明「行为约束…仅作行为护栏，详见绑定技能与 RAG」；guardrails 为该协议的详细展开，避免在 systemPrompt 中重复长文。

### 4.2 RAG 与 Skill 分工

- **RAG**：提供可检索的**知识摘要与要点**（如 CN 框架的十段 defaultContent、决策与行为协议的四段）；检索由 query 驱动，不相关 RAG 可不返回。
- **Skill**：提供**操作指引**（prompt 中的步骤与输出要求），全部拼接进【技能指引】，模型可见但可按需选用。
- **CN 框架**：既在 `rag_cn_analysis_framework` 中以 RAG 形式存在，又以 6 个 `skill_cn_*` 提供执行细节。RAG 偏「是什么/原则」，Skill 偏「怎么做」。若用户问题强相关，可能同时命中 RAG 与多个 cn skill，属设计预期；若需控制 token，可后续将 RAG 改为更精炼的索引式描述。

### 4.3 禁止与强制执行（硬性）

- **禁止**：不得输出占位符（如【XXX】、待补充、TBD、示例数据）、模拟报告、模拟数据或占位模拟；不得用训练数据中的旧数据冒充当前数据或编造未在检索中出现的数值与日期。
- **强制执行**：实时最新数据收集——每次回答须先调用 RAG 与网络搜索获取与问题相关的最新信息；报告中引用的关键数据须来自本次会话的检索结果并注明来源与时间；若某类数据无法获取须明确说明并仅给出方法框架或建议用户自行补充，不得用占位或模拟数据填充。

### 4.4 可选 vs 必须

- **必须**：数据甄别/分层/事实与观点/逻辑与时效、量化矩阵与情景概率双重决策、强支撑位与多层次退出、数据来源与时间与本报告时间、**先 RAG/网络检索再输出（禁止占位与模拟）**、CN 框架结合（凡涉及 A 股）；**V4.0**：**每份报告必须包含魔鬼代言人环节**；报告末尾须含标准委员会签署+**「量化幻方矩阵 呈上」**；报告结构须符合 V4.0 强制 8 段；阶梯式执行手册须含**禁止动作清单**（3–5 条，编号格式）；须执行 〇·8 输出稳定性检查清单（含即时行动指令、阶梯0 适用场景）。
- **可选**：重大决策预验尸与二阶思维（仅涉及重大仓位或战略转向时）；行为约束协议（仅作行为护栏）；**V6.0 可选增强**（信息期权、全天候组合、三维退出、3×3×3、BMP-E、时间止损强化、贝叶斯+置信区间+动态更新）——当场景适用时建议输出，不替代 V4.0 强制 8 段。**概率处理**：V4.0 基础层为母概率 + KDI 再归一化（必须）；V6.0 可叠加贝叶斯+置信区间（可选，互补）。systemPrompt 中已明确标注「可选」「不替代量化标准」。

### 4.5 调用逻辑合理性

- 无「条件分支」：当前实现不根据用户意图自动选择部分 skill 或部分 RAG；所有绑定 skill 与 RAG 均参与构建提示（RAG 为检索结果，可能为空）。合理性：模型可根据问题与篇幅自行侧重，避免漏能力。
- 顺序：Skill 顺序为配置数组顺序，建议保持「核心投资 → 思维与结构 → 研究可视化 → 依赖时序情景回测 → CN 本土化 → 决策与行为」的大类顺序，便于模型优先看到核心能力。当前顺序已基本符合。

### 4.6 示例与数据引用（防误用）

- RAG 与技能中出现的**公司名、股票代码、具体价格或数值**（如「长江电力、中国神华」「沪电股份、深南电路」等）均为**方法论示例**，用于说明框架或筛选标准，**不得**直接当作本次分析的标的、可比公司或结论数据。
- 具体分析须以**本次用户问题**与**本次 RAG/网络检索结果**为准；可比公司组、估值结论、支撑位等均须来自本次检索或用户提供，并注明来源与时间。systemPrompt 〇·2 已含「示例与数据引用」条款。
- **V4.0 动态适应**：`rag_quant_output_protocols` 开篇已增**动态适应声明**：协议中的百分比、阈值、代码格式等为规范模板或方法论示例，具体数值、标的、时间节点均由本次会话的用户输入与检索结果动态决定，禁止照搬协议示例为报告结论或数据。

### 4.7 能力与协议检查（V4.0）

**1. 特异化信息与动态适应**
- **检查结果**：能力列表（capabilities）与 RAG defaultContent 中**未发现**固定时间、具体公司名、股票代码、具体价格等特异化信息残留（已全文检索：无 600183、生益、64.5、67.38 等钻石报告中的具体数值）。
- **方法论示例**：协议中出现的「70%/30%」「OCF/净利润<0.7」「超过 15%」「QHFM-Archive-代码-日期」等为**规范模板或阈值示例**，非某只股票的特异数据；已通过 〇·2「示例与数据引用」与 RAG「动态适应声明」明确：具体数值与标的由本次会话动态决定，具备动态适应能力。

**2. 能力调用逻辑、顺序、边界、冲突与冗余**
- **调用逻辑**：capabilities 为**平铺数组**，与 systemPrompt、技能、RAG 一并注入；**无按序调用或条件分支**，由模型根据问题与协议自行选用，无执行顺序依赖。
- **边界与冲突**：各协议块（〇·1～〇·8、一～十三、输出规范）职责清晰，无互斥约束；数据层/矩阵/情景/KDI/魔鬼代言人/行动清单/委员会签署/**强制署名**各司其职，未发现协议冲突。
- **重叠与冗余**：存在刻意保留的**名称层面重叠**——「KDI 监控仪表盘」与「KDI 监控与自动警报清单」（后者为前者升级，保留两项以实现全面覆盖）；「魔鬼代言人必含」与「AI 魔鬼代言人报告鲁棒性测试」（前者为强制要求，后者为能力描述）；「标准委员会署名评估与审核」与「标准委员会签署归档与编号」（审核 + 签署归档）。上述重叠为设计意图，不造成逻辑冲突或重复约束。

**3. 与钻石标准报告的覆盖度及稳定超越基础**
- **覆盖度**：V4.0 在 V3.0 样例结构基础上增加**输出稳定性三层工程**（协议硬化检查清单、决策流管道、优化循环）、**即时行动指令**与**阶梯0立即执行**、**强制署名量化幻方矩阵**；黄金基准为《【V4.0钻石标准】.md》。
- **结论**：协议上**已具备**稳定达到并努力远超原 V3.0 钻石样例力度的条件；实际稳定性依赖模型对检查清单与 〇·8 的遵循度，建议与黄金基准定期对比评审。

---

## 五、配置清单（完整）

### 5.1 Skills（29 个，顺序即注入顺序）

```
skill_value_investment, skill_decision_expert, skill_advanced_analytics, skill_data_cleaning,
skill_first_principles, skill_analyst, skill_researcher, skill_swot, skill_pyramid, skill_mece,
skill_mermaid_visualization, skill_cognitive_psychology, skill_iceberg_model, skill_planner, skill_smart,
skill_dependency, skill_temporal_relation, skill_scenario_dynamic_probability, skill_multi_temporal_sandbox,
skill_backtest,
skill_cn_quality_value, skill_cn_multifactor, skill_cn_cycle_timing, skill_cn_core_satellite,
skill_cn_smallcap_specialized, skill_cn_allweather,
skill_decision_premortem, skill_devil_advocate, skill_behavior_guardrails
```

### 5.2 RAG（21 个）

```
rag_cn_analysis_framework, rag_decision_behavior_protocols, rag_quant_output_protocols, rag_snowball_realtime, rag_value_investment,
rag_data_api_finance, rag_data_api_official, rag_sse, rag_szse,
rag_finance, rag_industry_reports, rag_government_reports, rag_social, rag_first_principles, rag_logic,
rag_iceberg_model, rag_psychology, rag_neuroscience, rag_temporal_logic, rag_common_sense, rag_history
```

### 5.3 Rules（6 条）

```
rule_format, rule_accuracy, rule_examples, rule_structure, rule_context, rule_workflow
```

### 5.4 MCP（2 个）

```
mcp_web_search, mcp_calculator
```

### 5.5 Capabilities（UI 与卡片用）

用于展示与 buildAgentCards，与 systemPrompt/技能一一对应，无独立调用逻辑；清单见 `BUILTIN_SUB_AGENTS.quant_magic_square.capabilities`（含估值深度、现金流与盈利质量、PE Band 与短期支撑位技术面、行业差异化、行业与经济周期四维、可连通时须用 RAG、随时调用与向用户索要补充等）。

---

## 六、与实现文件的对应关系

| 内容 | 文件与位置 |
|------|------------|
| SubAgent 定义（id/name/description/icon/systemPrompt/capabilities/skills/rules/mcp/rag） | `js/app.js` → `BUILTIN_SUB_AGENTS.quant_magic_square` |
| 各 Skill 定义 | `js/app.js` → `BUILTIN_SKILLS`（按 id 查找） |
| 各 RAG 定义 | `js/app.js` → `BUILTIN_RAG`（按 id 查找） |
| 资源解析 | `js/app.js` → `getSubAgentResources(subAgentId)` |
| 技能拼接 | `js/llm.js` → `buildSkillPrompts(skills, taskAnalysis)` |
| RAG 查询 | `js/rag.js` / RAGManager → `queryRAGKnowledgeBase(query, ragList)` |
| 系统提示词组装 | `js/llm.js` → `buildEnhancedSystemPrompt(...)` |
| 发送与流式 | `js/llm.js` → `invokeIntelligentAgent` → `callLLM`；`js/events.js` → `sendMessageWithContent` |
| 全天候本土化（联海） | `docs/全天候本土化框架_增强版.md`；RAG 见 `rag_cn_analysis_framework` 第四节，技能见 `skill_cn_allweather` |
| 报告输出协议（王者级） | 源于 test/ 生益科技报告评价与自我反省；RAG 见 `rag_quant_output_protocols`，systemPrompt 见 〇·2 |
| 实时数据获取 | 见 [量化幻方_实时数据获取方案.md](量化幻方_实时数据获取方案.md)；量化幻方多轮也执行网络搜索（events.js）；数据补全请求模板见 rag_quant_output_protocols |

---

## 七、版本与维护建议

- **版本**：本设计文档与 **v8.6.2** 的量化幻方助手实现一致；后续若增删 skill/RAG 或调整 systemPrompt 结构，应同步更新本文档。
- **v8.6.x 与黄金样例行（维护检查）**：仓库内 **`test/量化幻方矩阵投资决策报告【V4.0钻石标准】.md`** 为 **V4.0 协议** 的落地样例（V4.1 协议栈 = V4.0 全栈 + V6.0 可选增强）；样例重大修订时，应核对本文 **3.1 协议表**、**输出规范**、**〇·8** 与 `test/输出稳定性升级.txt`、`docs/量化幻方矩阵_输出规范模板_V4.1.md` 是否需同步；应用发版时仅更新本抬头 **对应应用版本** 与 CHANGELOG/RELEASES。
- **维护**：新增技能时建议归入 3.2 的某一分组并注明与现有技能的边界；新增 RAG 时建议注明与现有 RAG 的互补点，避免与某 skill 完全同质。
- **可选优化**：若需控制 token，可（1）将 CN 框架 RAG 的 defaultContent 改为索引式短段；（2）或对「重大决策/鲁棒性测试」类 skill 采用「仅当用户明确请求或问题含关键词时再注入」的轻量策略（需改 invokeIntelligentAgent 逻辑）。

---

**【文档完】**
