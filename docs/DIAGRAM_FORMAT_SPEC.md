# 图表格式规范与 Agent-渲染器对接

本文档说明 Agent 输出格式与渲染器的对接规范。**格式规范常量**定义在 `js/app.js` 的 `DIAGRAM_FORMAT_SPEC`，并作为**内置标准**注入到所有 Agent 的系统提示词中。

## 一、对接原则

1. **内置标准**：图表格式规范在 `js/llm.js` 的 `buildEnhancedSystemPrompt` 中注入到【输出格式要求】，**所有 Agent**（工作秘书、决策专家、创意大师、编程专家等）在输出图表时均须遵循
2. **单一数据源**：`DIAGRAM_FORMAT_SPEC`（暴露为 `window.AIAgentApp.DIAGRAM_FORMAT_SPEC`）为格式规范，渲染器按此解析
3. **渲染器兼容**：对常见变体（camelCase、中文字段名、对象/数组）做别名兼容

## 二、Mermaid

### Agent 输出要求
- 节点标签内换行必须用 `<br/>`，禁止真实换行
- 例：`A[第一行<br/>第二行]` 或 `B{平台<br/>组件}`

### 渲染器预处理（自动修复）
- `[..]`、`{..}`、`(..)` 内换行 → `<br/>`

## 三、project-dashboard

### Agent 输出要求（DIAGRAM_FORMAT_SPEC.projectDashboard）
- 使用 ` ```project-dashboard `、` ``project-dashboard ` 或 ` ```json ` 包裹 `{ "project-dashboard": {...} }`
- 支持双反引号 `` 与三反引号 ```
- 字段：project、owner、leverage_points、blocker_priority、critical_closure、management_gaps、key_actions、resourceload、dependencies、blockingdeps、cognitivebiases 等
- blocker_priority：`[{level, items:[...]}]`
- critical_closure：`[{problem, status, next_action}]`
- management_gaps：对象（如 `{识别, 根因}`）或数组
- key_actions：`[{action, owner, description}]`

### 渲染器兼容
- 支持 `project-dashboard` 包裹、camelCase 别名（leveragepoints、blockerpriority、criticalclosure、managementgaps、keyactions 等）
- 支持 `problem`/`name`、`next_action`、`description` 等字段
- JSON 容错：字符串内换行、尾逗号、缺失逗号、未转义引号

## 四、problem-evolution

### Agent 输出要求
- `{problemname, phases:[{phase,description,response}], blockers:[{blocker,breakthrough}], currentstatus}`

### 渲染器兼容
- 支持 `phase`/`name`、`problemname`/`title`

## 五、其他图表

| 类型 | Agent 格式 | 渲染器兼容 |
|------|-----------|-----------|
| chart | Chart.js 标准 | 弯引号替换 |
| decision-matrix | JSON 或 Markdown 表格 | 中英文字段别名 |
| decision-chain | {nodes, edges} | 节点/边、从/到 |
| probability | {labels, data} | 标签/数据 |
| milestones | {title, milestones} | 多种别名 |
| dependency-graph | {nodes, edges} | 节点/边、从/到 |
| roadmap | {title, phases, milestones} | 路线图、阶段、里程碑 |
| task-classification-table | Markdown 表格 | 任务分类分级表 |
| resource-constraints | {constraints:[{type,description,impact}]} | 资源约束 |

## 六、通用规则
- JSON 一律使用英文双引号 `"`，禁止弯引号
- 渲染器对所有 JSON 解析前做弯引号替换（sanitizeJsonForParse）
