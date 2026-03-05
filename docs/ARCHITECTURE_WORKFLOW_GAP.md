# Workflow 主 Agent 自主调度能力差距分析

**版本**: v8.3.2  
**日期**: 2026-03-04  
**目标**: 明确主 Agent 绑定 delegateTo 后的当前实现 vs 预期能力

> **v8.3.2 更新**：A2A 自主调度已实现，详见 [DESIGN_A2A.md](DESIGN_A2A.md)。本文档保留为历史差距分析参考。

---

## 1. 预期能力 vs 当前实现

| 能力 | 预期 | 当前 | 说明 |
|------|------|------|------|
| 根据任务自主决策 | 主 Agent 分析任务后决定调用谁、按什么顺序 | ✅ 已实现 | parseScheduleFromOutput 解析 schedule |
| 动态调度顺序 | 主 Agent 可跳过、重排、按需选择被委托 Agent | ✅ 已实现 | schedule 有效时替换链 |
| 监控被绑定 Agent 行为 | 主 Agent 实时掌握各 Agent 执行情况 | ⚠ 部分 | 仅流水线传递，无真正监控 |
| 整合各 Agent 输出 | 整合步骤接收并汇总所有中间步骤输出 | ✅ 已实现 | 整合步骤接收全部 stepOutputs，按步骤汇总传入 |

---

## 2. 当前实现详细分析

### 2.1 自主决策 ❌

**现状**（`events.js` 984-988 行）:

```javascript
workflowChainSteps = [
    { agentId: mainId, label: mainName, instruction: '分析任务、根据问题决定调度后续助手并监控执行' },
    ...validDelegates.map(id => ({ agentId: id, label: '', instruction: '' })),
    { agentId: mainId, label: mainName, instruction: '整合各助手输出，完成最终结论与交付物' }
];
```

- 主 Agent 第一步的 instruction 是固定的
- 主 Agent 的输出**不会被解析**为「调用谁、按什么顺序」
- 系统只是按预设链顺序执行，与主 Agent 分析结果无关

### 2.2 调度顺序 ❌

**链结构固定**:

```
主Agent(分析) → 委托Agent1 → 委托Agent2 → ... → 主Agent(整合)
```

- 顺序完全由 `delegateTo` 的勾选顺序决定
- 主 Agent 无法跳过、重排或按需选择

### 2.3 监控与执行 ⚠

**原逻辑**（`llm.js` 3100-3112 行）:

- 每一步只接收**上一步**的输出，形成单向流水线
- 整合步骤只看到**最后一个**被委托 Agent 的输出
- `stepOutputs` 虽保存了各步输出，但原未在整合步骤的上下文中使用

**已改进**：整合步骤现可接收并汇总所有中间步骤输出（见实现说明）。

---

## 3. 架构级改造方向

### 3.1 主 Agent 输出结构化调度指令

**思路**：主 Agent 第一步输出 JSON，系统解析后动态构建执行链。

```json
{
  "schedule": [
    { "agentId": "plan", "instruction": "制定项目计划" },
    { "agentId": "task", "instruction": "拆解为 TODO" }
  ],
  "skip": ["super_decision"]
}
```

**实现要点**:
- 主 Agent 的 systemPrompt 中约定输出格式
- 解析主 Agent 输出，提取 JSON
- 根据 schedule 动态构建 `workflowChainSteps`
- 失败时回退到 delegateTo 默认顺序

### 3.2 整合步骤接收全部输出

**已实现**：整合步骤的 messages 包含所有 `stepOutputs[0..n-1]`，主 Agent 可基于完整上下文做最终整合。

### 3.3 主 Agent 对中间结果的校验与重试

**思路**:
- 主 Agent 在整合前可增加「校验」步骤
- 若某步输出不满足要求，可触发该 Agent 重试或补充
- 需扩展 Workflow 支持条件分支与循环

---

## 4. A2A（Agent-to-Agent）协议参考

[A2A Protocol](https://github.com/google/A2A) 是 Google 主导的 Agent 间通信开放标准，可用于指导自主调度与监控的架构设计。

### 4.1 A2A 核心能力（可借鉴）

| A2A 能力 | 说明 | 与当前 Workflow 的对应 |
|----------|------|------------------------|
| **AgentCard** | Agent 能力描述（skills、MIME 类型、认证） | SubAgent 的 capabilities、skills、rag 配置 |
| **Task** | 任务单元，含 status、history、artifacts | Workflow 链中每一步可建模为 Task |
| **Message** | role + parts（text/file/data） | 当前 messages 数组，可扩展为 Part 结构 |
| **Artifact** | 步骤产出物 | stepOutputs 即各步 Artifact |
| **Task 状态** | submitted / working / completed / input-required | 可用于监控与重试 |
| **message/send** | JSON-RPC 2.0 发送消息 | 主 Agent 输出可约定为「调度指令」结构 |

### 4.2 使用方式建议

**方案 A：A2A 数据模型参考（推荐）**

在现有进程内架构下，采用 A2A 的数据结构作为主 Agent 输出约定：

```json
{
  "jsonrpc": "2.0",
  "method": "schedule/execute",
  "params": {
    "taskId": "workflow-xxx",
    "schedule": [
      { "agentId": "plan", "instruction": "制定项目计划", "parts": [] },
      { "agentId": "task", "instruction": "拆解为 TODO", "parts": [] }
    ],
    "skip": ["super_decision"],
    "metadata": {}
  }
}
```

- 主 Agent 第一步输出上述 JSON（或嵌入在 Markdown 代码块中）
- 系统解析 `schedule` 动态构建 `workflowChainSteps`
- 解析失败时回退到 delegateTo 默认顺序

**方案 B：SubAgent 暴露为 A2A 端点（远期）**

- 每个 SubAgent 实现为独立 A2A 服务（或 MCP 桥接）
- 主 Agent 通过 `message/send` 委托子 Agent
- 需架构级改造，适合多实例、跨进程场景

**方案 C：AgentCard 能力发现**

- 为每个 SubAgent 生成 A2A 风格 AgentCard（skills、描述、输入输出类型）
- 主 Agent 在 systemPrompt 中注入可选 Agent 的 AgentCard
- 主 Agent 根据能力描述自主选择调度对象

### 4.3 参考链接

- [A2A GitHub](https://github.com/google/A2A)
- [A2A 示例与工作流](https://a2aprotocol.ai/docs/guide/a2a-sample-methods-and-json-responses.html)
- [AgentCard 概念](https://agent2agent.info/docs/concepts/agentcard/)

---

## 5. 实现优先级建议

| 优先级 | 改造项 | 复杂度 | 收益 |
|--------|--------|--------|------|
| P0 | 整合步骤接收全部输出 | 低 | 高（已实现） |
| P1 | 主 Agent 输出 A2A 风格调度指令 | 中 | 高 |
| P2 | AgentCard 能力注入 | 中 | 中 |
| P3 | 校验与重试逻辑 | 高 | 中 |

---

**文档版本**: v8.3.2  
**维护者**: AI Agent Pro Team
