# 更新日志

本文档记录 AI Agent Pro 的版本变更。

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

[8.2.1]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.2.1
[8.2.0]: https://github.com/SugarWilliam/AI-Agent-pro/releases/tag/v8.2.0
