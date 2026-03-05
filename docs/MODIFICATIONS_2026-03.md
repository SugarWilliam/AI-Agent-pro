# AI Agent Pro 重要修改摘要（2026-03）

**版本**: v1.0  
**日期**: 2026-03-04  
**适用范围**: 任务与计划增强、SubAgent 强化、提示词专家默认绑定、SubAgent 集群

---

## 一、修改概览

| 修改项 | 原因 | 逻辑 | 效果 |
|--------|------|------|------|
| 任务与计划处理强化 | 提升任务分解、计划制定的专业性和可执行性 | MECE、分类分级、原子化、依赖、SubAgent 绑定、roadmap、里程碑、风险矩阵、资源约束 | 计划可输出表格、roadmap、里程碑、风险矩阵；支持 HTML/MD 导出 |
| 任务助手/计划大师 SubAgent 强化 | 提升专业能力与输出规范性 | 扩展 systemPrompt、新增 skills、明确输出格式 | 任务助手输出分类表、依赖图；计划大师输出 roadmap、风险矩阵、任务-SubAgent 强绑定 |
| SubAgent 默认绑定提示词专家 | 强化精准描述与多 Agent 精准调动 | 各 SubAgent 默认 delegateTo 含 prompt_expert；Workflow 中 prompt_expert 负责优化指令 | 主 Agent 分析 → 提示词专家优化 → 其他助手执行 → 主 Agent 整合 |
| SubAgent 集群 | 多 Agent 协同、能力互补 | delegateTo 形成链，主 Agent 调度，提示词专家首节点 | 启动页、侧边栏、文档中体现 SubAgent 集群能力 |

---

## 二、任务与计划处理强化

### 2.1 原因

- 原计划模块仅支持简单 TODO 列表，缺乏 MECE 分解、分类分级、依赖分析
- 无法输出 roadmap、里程碑、风险矩阵、资源约束
- 计划与任务未与 SubAgent 强绑定，执行时无法按任务类型调度

### 2.2 逻辑

1. **MECE 原则**：任务相互独立、完全穷尽、原子化
2. **分类分级**：按业务域分类，P0–P3 优先级，easy/medium/hard 难度
3. **依赖关系**：FS/SS/FF/SF，输出 dependency-graph
4. **SubAgent 强绑定**：每个任务指定 subAgentId
5. **智能规划**：结合任务难度、人力、任务数、deadline 规划
6. **输出格式**：task-classification-table、roadmap、milestones、risk-matrix、resource-constraints

### 2.3 效果

- 计划详情展示：路线图、里程碑、风险矩阵、资源约束
- 任务列表展示：分类、优先级、绑定 SubAgent、预计工时
- 导出：支持 HTML、Markdown
- 执行 TODO 时优先使用任务绑定的 SubAgent

### 2.4 涉及文件

- `js/plan.js`：buildAnalysisPrompt、parsePlanFullOutput、executeTodo
- `js/ui.js`：showPlanDetail、exportPlanAs、create plan dialog
- `js/events.js`：createPlanFromMessage
- `css/style-new.css`：计划详情样式

---

## 三、任务助手与计划大师 SubAgent 强化

### 3.1 原因

- 任务助手需强化 MECE、分类、依赖、表格输出
- 计划大师需强化 roadmap、里程碑、风险矩阵、资源约束、任务-SubAgent 绑定、智能规划

### 3.2 逻辑

**任务助手**：
- systemPrompt 明确 MECE、分类分级、依赖、输出规范
- 新增 skills：skill_mece、skill_dependency
- 输出：task-classification-table、dependency-graph、json TODO

**计划大师**：
- systemPrompt 明确 roadmap、里程碑、风险矩阵、资源约束、时间识别、任务-SubAgent 绑定、智能规划
- 新增 skills：skill_mece、skill_gantt、skill_dependency、skill_risk_identification
- 输出：roadmap、milestones、dependency-graph、risk-matrix、resource-constraints、task-classification-table

### 3.3 效果

- 任务助手输出更结构化、可表格化
- 计划大师输出更完整，含路线图、风险、约束、SubAgent 绑定

### 3.4 涉及文件

- `js/app.js`：task、plan SubAgent 的 systemPrompt、skills、capabilities

---

## 四、SubAgent 默认绑定提示词专家

### 4.1 原因

- 各 SubAgent 需提升精准描述能力
- 多 SubAgent 关联时，主 SubAgent 需更精准地调动被关联 Agent
- 提示词专家可提炼、优化指令，消除歧义，使后续助手可精准执行

### 4.2 逻辑

1. **默认 delegateTo**：除 prompt_expert 外，各 SubAgent 默认 `delegateTo: ['prompt_expert']`
2. **Workflow 链**：当 delegateTo 含 prompt_expert 时：
   - 主 Agent 第一步：分析任务、提炼关键需求；说明后续由提示词专家优化指令
   - 提示词专家步骤：提炼、优化上一步的指令与描述，消除歧义
   - 主 Agent 最后一步：整合各助手输出（含提示词专家的精准描述）

3. **执行顺序**：主 Agent(分析) → prompt_expert(优化) → [其他 delegate] → 主 Agent(整合)

### 4.3 效果

- 单 Agent 对话：主 Agent → prompt_expert → 主 Agent 整合
- 多 Agent 链：主 Agent → prompt_expert → plan/task/... → 主 Agent 整合
- 指令更清晰、歧义更少，后续 Agent 执行更精准

### 4.4 涉及文件

- `js/app.js`：各 SubAgent 的 delegateTo
- `js/events.js`：workflowChainSteps 构建，**prompt_expert 固定第二位**（orderedDelegates）
- `js/llm.js`：动态调度时保留 prompt_expert 第二位，schedule 仅编排其他助手

---

## 五、SubAgent 集群

### 5.1 概念

**SubAgent 集群**：多个 SubAgent 通过 delegateTo 关联形成的执行链，由主 Agent 分析任务并调度，实现能力互补与协同。

### 5.2 拓扑

```
用户任务
    │
    ▼
主 Agent（分析）
    │
    ▼
提示词专家（优化指令）← 默认首节点
    │
    ▼
子 Agent 1、2、... N（按 schedule 或 delegateTo 顺序）
    │
    ▼
主 Agent（整合）
```

### 5.3 特性

- **默认首节点**：提示词专家，提升指令精准度
- **动态调度**：主 Agent 可输出 schedule，选择子集、重排顺序
- **能力可见**：AgentCard 含 capabilities，主 Agent 可任务-能力匹配

### 5.4 展示

- 启动页功能特性：增加「SubAgent 集群」
- 侧边栏功能摘要：增加「SubAgent 集群」
- 设计文档：A2A、DESIGN 中补充 SubAgent 集群说明

---

## 六、版本变更记录

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-03-04 | 初版：任务与计划强化、SubAgent 强化、提示词专家默认绑定、SubAgent 集群文档化 |
| v1.1 | 2026-03-05 | 硬性约束：prompt_expert 固定第二位（顺序不可颠倒）；schedule 仅编排其他助手；UI 步骤体现主 Agent 最优编排 |

---

**文档版本**: v1.1  
**维护者**: AI Agent Pro Team
