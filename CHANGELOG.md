# 更新日志

本文档记录 AI Agent Pro 的版本变更。

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
