# 更新日志

本文档记录 AI Agent Pro 的版本变更。

---

## [8.2.5] - 2026-03-03

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

[8.2.5]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.2.5
[8.2.4]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.2.4
[8.2.3]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.2.3
[8.2.2]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.2.2
[8.2.1]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.2.1
[8.2.0]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.2.0
