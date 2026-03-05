# AI Agent Pro - A2A 自主调度设计文档

**版本**: v2.0  
**日期**: 2026-03-03  
**状态**: 可发布级设计文档  
**参考**: [A2A Protocol](https://github.com/google/A2A)

---

## 📋 目录

1. [需求与目标](#1-需求与目标)
2. [需求详细解读](#2-需求详细解读)
3. [功能完备性结论](#3-功能完备性结论)
4. [系统拓扑](#4-系统拓扑)
5. [流程设计](#5-流程设计)
6. [数据流与协议](#6-数据流与协议)
7. [AgentCard 能力描述](#7-agentcard-能力描述)
8. [实现与约束](#8-实现与约束)
9. [当前限制与后续](#9-当前限制与后续)
10. [附录](#10-附录)
11. [SubAgent 集群与提示词专家默认绑定](#11-subagent-集群与提示词专家默认绑定)

---

## 1. 需求与目标

### 1.1 核心需求

| 需求 | 描述 | 优先级 |
|------|------|--------|
| 主 Agent 智能化分析任务 | 主 Agent 分析用户任务，理解需要什么能力、如何分解 | P0 |
| 根据任务分解选择合适的 Agent | 主 Agent 根据任务决定调用谁、按什么顺序、可子集选择 | P0 |
| 根据被绑定 Agent 能力制定工作流 | 主 Agent 根据各 Agent 能力决定顺序和每步指令 | P0 |
| 智能化调度和使用 subagent 输入输出 | 子 Agent 接收上步输出，整合步骤接收全部输出 | P0 |

### 1.2 设计原则

- **不削弱现有能力**：保留所有 SubAgent 设计、delegateTo、自定义 Workflow、手动 [Workflow:...] 前缀
- **向后兼容**：delegateTo 为空或解析失败时，行为与改造前一致（无 delegateTo 则不走 Workflow）
- **渐进增强**：主 Agent 输出有效调度指令时启用动态链；否则回退到 delegateTo 固定顺序

---

## 2. 需求详细解读

### 2.1 主 Agent 智能化分析任务

**需求含义**：主 Agent 收到用户任务后，能够理解任务本质、所需能力、执行步骤，而非机械执行。

**解读要点**：
- 任务理解：用户意图、目标、约束、交付物
- 能力分解：任务需要哪些能力（决策、计划、执行、分析等）
- 步骤规划：逻辑顺序、依赖关系、优先级

**实现方式**：
- 步骤 0 为「分析」步骤，由主 Agent 执行
- 注入 AgentCard 列表（含 id、name、description、capabilities）
- 主 Agent 输出分析结论 + 可选 schedule JSON

### 2.2 根据任务分解选择合适的 Agent

**需求含义**：主 Agent 根据任务分析结果，从可用的子 Agent 中选出最合适的参与者，并决定执行顺序。

**解读要点**：
- 选人：任务-能力匹配，可只选部分 delegateTo 中的 Agent（子集选择）
- 排序：按任务逻辑依赖决定执行顺序
- 白名单：schedule 中的 agentId 必须 ∈ delegateTo，保证安全

**实现方式**：
- 主 Agent 输出 `schedule` JSON，格式为 `[{agentId, instruction}, ...]`
- `parseScheduleFromOutput` 解析并校验 agentId 白名单
- 无效时回退到 delegateTo 默认顺序

### 2.3 根据被绑定 Agent 能力制定工作流

**需求含义**：主 Agent 需了解各子 Agent 的能力，才能正确匹配任务与能力，制定合理的工作流。

**解读要点**：
- 能力可见：AgentCard 需展示 capabilities（能力标签）
- 能力来源：Agent 的 capabilities、关联 skills 的 description
- 工作流形式：线性链 [分析, ...子Agent, 整合]，每步有 instruction

**实现方式**：
- `buildAgentCards`、`formatAgentCardsForPrompt` 含 capabilities 列
- capabilities 不足时从 skills 的 description 补充
- 主 Agent 根据表格匹配任务与能力，输出 schedule 及每步 instruction

### 2.4 智能化调度和使用 subagent 输入输出

**需求含义**：子 Agent 正确接收上一步产出，整合步骤能获取全部中间产出，完成最终汇总。

**解读要点**：
- 流水线传递：步骤 i 接收步骤 i-1 的输出
- 整合汇总：整合步骤接收 stepOutputs[0..n-1] 全部
- 主 Agent 监控：整合步骤由主 Agent 执行，可基于完整上下文做最终整合

**实现方式**：
- 非整合步骤：messages 含上一步输出 + 本步 instruction
- 整合步骤：messages 含全部 stepOutputs，按步骤汇总传入

---

## 3. 功能完备性结论

### 3.1 实现状态

| 需求 | 实现状态 | 说明 |
|------|----------|------|
| 主 Agent 智能化分析任务 | ✅ 已实现 | 步骤 0 为分析步骤，注入 AgentCard |
| 根据任务分解选择合适的 Agent | ✅ 已实现 | parseScheduleFromOutput 解析 schedule，可子集选择+重排 |
| 根据被绑定 Agent 能力制定工作流 | ✅ 已增强 | AgentCard 含 capabilities 列，主 Agent 可匹配任务与能力 |
| 智能化调度和使用 subagent 输入输出 | ✅ 已实现 | 流水线传递 + 整合步骤汇总全部 stepOutputs |

### 3.2 核心结论

**A2A 核心能力已具备**：主 Agent 可智能化分析任务、根据 AgentCard 能力选择与排序助手、制定工作流（顺序 + 每步 instruction）、正确调度 subagent 的输入输出。增强 AgentCard 的 capabilities 展示后，主 Agent 能更准确地进行任务-能力匹配。

---

## 4. 系统拓扑

### 4.1 整体拓扑

```
┌─────────────────────────────────────────────────────────────────────────┐
│  User                                                                     │
└─────────────────────────────────────────┬───────────────────────────────┘
                                           │ 任务
                                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Orchestrator (events.js + llm.js)                                        │
│  ├─ 构建初始链（含 AgentCard 注入）                                        │
│  ├─ 执行主 Agent 分析步骤                                                 │
│  ├─ 解析调度指令（parseScheduleFromOutput）                               │
│  ├─ 动态替换链（可选）                                                     │
│  └─ 执行完整链 + 整合                                                      │
└─────────────────────────────────────────┬───────────────────────────────┘
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         ▼                                 ▼                                 ▼
┌─────────────────┐             ┌─────────────────┐             ┌─────────────────┐
│  主 Agent       │             │  子 Agent 1     │             │  子 Agent N     │
│  (分析/整合)    │             │  (super_decision)│             │  (task)         │
└─────────────────┘             └─────────────────┘             └─────────────────┘
         │                                 │                                 │
         │  stepOutputs[0]                 │  stepOutputs[1]                 │  stepOutputs[n]
         │                                 │                                 │
         └─────────────────────────────────┼─────────────────────────────────┘
                                           ▼
                              ┌─────────────────────────┐
                              │  整合步骤（主 Agent）    │
                              │  输入：全部 stepOutputs │
                              │  输出：最终结论与交付物 │
                              └─────────────────────────┘
```

### 4.2 参与角色

| 角色 | 说明 | 职责 |
|------|------|------|
| **Orchestrator** | 系统（events.js + llm.js） | 构建链、解析调度、执行、传递上下文 |
| **主 Agent** | 有 delegateTo 的 SubAgent（如 work_secretary） | 分析任务、输出调度指令、整合输出 |
| **子 Agent** | delegateTo 中的 SubAgent | 执行具体任务 |
| **AgentCard** | 能力描述（A2A 风格） | 供主 Agent 决策 |

---

## 5. 流程设计

### 5.1 主流程（含动态调度）

```
用户发送消息
    │
    ├─ 有 [Workflow:...] 前缀
    │   └─ 使用手动指定链，不经过动态调度
    │
    ├─ 有 delegateTo 且无 Workflow 前缀
    │   │
    │   ├─ 1. 构建初始链
    │   │      [主Agent(分析), ...delegateTo, 主Agent(整合)]
    │   │
    │   ├─ 2. 生成 AgentCard 列表
    │   │      buildAgentCards(mainId, delegateIds)
    │   │
    │   ├─ 3. 执行步骤 0（主 Agent 分析）
    │   │      - 注入 AgentCard 到 systemPrompt
    │   │      - 注入调度指令格式说明
    │   │      - 调用 LLM，得到 analysisOutput
    │   │
    │   ├─ 4. 解析调度指令
    │   │      schedule = parseScheduleFromOutput(analysisOutput)
    │   │
    │   ├─ 5. 若 schedule 有效
    │   │      - 用 schedule 替换链中的 delegateTo 部分
    │   │      - 新链 = [主Agent(分析)-已完成, ...schedule, 主Agent(整合)]
    │   │
    │   ├─ 6. 若 schedule 无效
    │   │      - 保持 delegateTo 原顺序
    │   │
    │   └─ 7. 执行步骤 1..N-1（子 Agent + 整合）
    │          - 每步接收上一步输出（或整合步骤接收全部）
    │          - 主 Agent 在整合步骤可监控全部 stepOutputs
    │
    └─ 无 delegateTo
        └─ 单 Agent 对话，不进入 Workflow
```

### 5.2 两阶段执行

```
阶段 1：分析
├─ 输入：用户任务 + AgentCard 列表
├─ 执行：主 Agent
└─ 输出：analysisOutput（含可选 schedule JSON）

阶段 2：执行
├─ 解析：parseScheduleFromOutput(analysisOutput)
├─ 链构建：schedule 有效 ? 用 schedule 替换 : 用 delegateTo
├─ 执行：子 Agent 链 + 主 Agent 整合
└─ 输出：最终内容
```

---

## 6. 数据流与协议

### 6.1 数据结构

#### AgentCard（A2A 风格）

```json
{
  "id": "super_decision",
  "name": "超级决策",
  "description": "深度决策分析、认知偏差识别、思维模式分析",
  "capabilities": ["认知偏差识别", "思维模式分析", "决策优化"]
}
```

#### 调度指令（Schedule）

```json
{
  "schedule": [
    { "agentId": "super_decision", "instruction": "先做决策分析，识别关键假设" },
    { "agentId": "plan", "instruction": "再制定项目计划" },
    { "agentId": "task", "instruction": "最后拆解为 TODO" }
  ]
}
```

### 6.2 调度指令格式

主 Agent 在分析步骤输出中，可包含以下格式的 JSON 块（Markdown 代码块）：

```markdown
```schedule
{
  "schedule": [
    { "agentId": "super_decision", "instruction": "先做决策分析" },
    { "agentId": "plan", "instruction": "制定计划" },
    { "agentId": "task", "instruction": "拆解 TODO" }
  ]
}
```
```

或：

```markdown
```json
{
  "schedule": [
    { "agentId": "plan", "instruction": "制定计划" }
  ]
}
```
```

### 6.3 约束

| 约束 | 说明 |
|------|------|
| **agentId 白名单** | schedule 中的 agentId 必须存在于 delegateTo 中，否则视为无效 |
| **instruction 可选** | agentId 必填；instruction 可选，默认空 |
| **顺序** | schedule 数组顺序即为执行顺序 |
| **子集选择** | 可只选部分 delegateTo 中的 Agent |
| **解析失败** | 回退到 delegateTo 默认顺序，不报错 |

---

## 7. AgentCard 能力描述

### 7.1 能力来源

- **优先**：agent.capabilities（Agent 内置能力标签）
- **补充**：capabilities 不足时，从关联 skills 的 description 提取
- **兜底**：若仍为空，使用 description 前 80 字符

### 7.2 注入 Prompt 模板

```
【可选调度助手】根据任务分析，选择需要的助手及执行顺序。下表列出各助手的能力，请根据任务匹配最合适的助手：

| id | name | description | capabilities |
|----|------|-------------|--------------|
| super_decision | 超级决策 | 深度决策分析、认知偏差识别 | 认知偏差识别、思维模式分析、决策优化 |
| plan | 计划大师 | 项目计划、TODO 生成 | 项目规划、时间管理、目标设定 |
| task | 任务助手 | 任务管理、优先级 | 任务管理、待办事项、进度跟踪 |

若需自定义顺序或仅调用部分助手，请在输出末尾包含 ```schedule 代码块。
- agentId 必须为上表中的 id
- 可只选部分助手（如只需 plan 和 task 则只列二者）
- instruction 为该步骤的具体指令
- 若不输出此块，将按默认顺序执行全部
```

---

## 8. 实现与约束

### 8.1 关键函数

| 函数 | 位置 | 说明 |
|------|------|------|
| `buildAgentCards(mainId, delegateIds)` | llm.js | 根据 delegateIds 生成 AgentCard 数组，含 capabilities |
| `formatAgentCardsForPrompt(cards)` | llm.js | 将 AgentCard 格式化为可注入 systemPrompt 的文本 |
| `parseScheduleFromOutput(output, delegateIds)` | llm.js | 从主 Agent 输出中解析 schedule JSON |
| `runWorkflowChain` | llm.js | 执行链，支持动态 schedule 替换 |

### 8.2 步骤输入输出

| 步骤类型 | 输入 | 输出 |
|----------|------|------|
| 分析（步骤 0） | 用户任务 + AgentCard | 分析 + 可选 schedule |
| 子 Agent（步骤 1..n-1） | 上一步输出 + 本步 instruction | 本步产出 |
| 整合（最后一步） | 全部 stepOutputs[0..n-1] | 最终结论与交付物 |

### 8.3 行为矩阵

| 场景 | 行为 |
|------|------|
| delegateTo 为空 | 不进入 Workflow，单 Agent 对话 |
| delegateTo 有值，主 Agent 输出有效 schedule | 用 schedule 替换链中 delegate 部分（**prompt_expert 固定第二位**） |
| delegateTo 有值，主 Agent 未输出 schedule | 用 delegateTo 顺序（**prompt_expert 固定第二位**） |
| delegateTo 有值，schedule 解析失败 | 用 delegateTo 顺序（**prompt_expert 固定第二位**） |
| [Workflow:...] 前缀 | 使用手动指定链，不经过动态调度 |

### 8.4 硬性约束（v8.3.3）

| 约束 | 说明 |
|------|------|
| **prompt_expert 固定第二位** | 当 delegateTo 含 prompt_expert 时，其必须排在主 Agent(分析)之后、其他子 Agent 之前，顺序不可颠倒 |
| **schedule 仅编排其他助手** | 主 Agent 输出的 schedule 仅编排 plan/task/... 等助手，prompt_expert 无需且不应出现在 schedule 中 |
| **UI 步骤体现主 Agent 编排** | 动态调度后，UI 显示的步骤顺序必须为主 Agent 的最优编排，而非 delegateTo 关联顺序 |

---

## 9. 当前限制与后续

### 9.1 当前限制

| 限制 | 说明 |
|------|------|
| 线性链 | 不支持条件分支、循环、并行 |
| 白名单 | schedule 中的 agentId 必须 ∈ delegateTo |
| 无重试 | 某步失败无自动重试或校验 |
| 无并行 | 子 Agent 串行执行 |

### 9.2 后续建议

若需条件分支、重试、并行，需扩展 Workflow 架构。

---

## 10. 附录

### 10.1 示例

**用户输入**：帮我分析 2024 年 AI 行业发展趋势，并给出投资建议和可执行计划

**主 Agent 分析输出（含 schedule）**：

```markdown
根据任务，需要：
1. 先做深度决策分析，识别关键假设
2. 再制定投资计划
3. 最后拆解为可执行 TODO

```schedule
{
  "schedule": [
    { "agentId": "super_decision", "instruction": "分析 AI 行业趋势的关键假设与认知偏差" },
    { "agentId": "plan", "instruction": "制定投资计划框架" },
    { "agentId": "task", "instruction": "拆解为可执行 TODO" }
  ]
}
```
```

### 10.2 测试运行

```bash
./start-server.sh
# 浏览器访问 http://localhost:8000/test/test-a2a-orchestration.html
```

### 10.3 版本变更记录

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-03-03 | 初版设计，实现动态调度、AgentCard、parseSchedule |
| v1.1 | 2026-03-03 | 单元测试完成 |
| v2.0 | 2026-03-03 | 合并完备性分析，增加需求详细解读，AgentCard 能力增强 |
| v2.1 | 2026-03-04 | SubAgent 集群、提示词专家默认绑定、精准调动增强 |
| v2.2 | 2026-03-05 | 硬性约束：prompt_expert 固定第二位，schedule 仅编排其他助手 |

---

## 11. SubAgent 集群与提示词专家默认绑定

### 11.1 修改原因

- **精准描述**：各 SubAgent 需提升输出与指令的精准度
- **精准调动**：多 SubAgent 关联时，主 Agent 需更精准地调动被关联 Agent
- **指令优化**：提示词专家可提炼、优化指令，消除歧义，使后续助手可精准执行

### 11.2 逻辑设计

**SubAgent 集群**：多个 SubAgent 通过 delegateTo 关联形成的执行链，由主 Agent 分析任务并调度。

**默认绑定**：除 prompt_expert 外，各 SubAgent 默认 `delegateTo: ['prompt_expert']`。

**执行流程**（顺序不可颠倒）：
```
主 Agent(分析) → 提示词专家(优化指令) → [其他 delegate，按 schedule 编排] → 主 Agent(整合)
```

**硬性约束**：prompt_expert 固定第二位，无论 delegateTo 原始顺序如何；schedule 仅编排其他助手。

**Workflow 链中 prompt_expert 的 instruction**：
- 提炼、优化上一步的指令与描述，消除歧义，使后续助手可精准执行

### 11.3 效果

| 场景 | 行为 |
|------|------|
| 单 Agent + delegateTo | 主 Agent → prompt_expert → 主 Agent 整合 |
| 多 Agent 链 | 主 Agent → prompt_expert → plan/task/... → 主 Agent 整合 |
| 指令质量 | 提示词专家优化后，后续 Agent 接收更清晰、无歧义的指令 |

### 11.4 拓扑（含提示词专家）

```
用户任务
    │
    ▼
主 Agent（分析：提炼关键需求，说明后续由提示词专家优化）
    │
    ▼
提示词专家（优化指令，消除歧义）← 默认首节点
    │
    ▼
子 Agent 1、2、... N（按 schedule 或 delegateTo 顺序）
    │
    ▼
主 Agent（整合：含提示词专家的精准描述）
```

---

**文档版本**: v2.2  
**维护者**: AI Agent Pro Team
