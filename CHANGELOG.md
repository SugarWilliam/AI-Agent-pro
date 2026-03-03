# 更新日志

本文档记录 AI Agent Pro 的版本变更。

---

## [8.2.3] - 2026-03-03

### Workflow 与工作秘书增强

**主要变更**

- **Workflow 流程修复**
  - 修复前级到下一级传递时 instruction 丢失问题
  - 上一级输出超长时自动截断（12000 字符），避免 token 溢出导致 API 报错

- **工作秘书 SubAgent 重构**
  - 取消默认 delegateTo 关联，用户按需配置
  - 工作秘书作为组织者：首步分析任务并调度、末步整合输出
  - 流程结构：工作秘书(分析调度) → 所选助手 → 工作秘书(整合输出)
  - 中间过程由工作秘书监控，最终输出由工作秘书完成

- **工作秘书默认超级决策能力**
  - 新增 skills：skill_decision_expert、skill_cognitive_psychology、skill_swot、skill_first_principles、skill_iceberg_model、skill_pyramid、skill_smart
  - 新增 rag：rag_first_principles、rag_iceberg_model、rag_psychology、rag_neuroscience、rag_common_sense、rag_history、rag_industry_reports、rag_government_reports、rag_finance、rag_social
  - 新增 mcp：mcp_calculator

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

[8.2.3]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.2.3
[8.2.2]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.2.2
[8.2.1]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.2.1
[8.2.0]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.2.0
