# 8.4.3 与远端 (origin/gh-pages) 代码评审报告

**评审日期**: 2026-03-14  
**对比分支**: 本地 gh-pages vs origin/gh-pages  
**版本**: 8.4.3

---

## 一、变更概览

| 文件 | 变更类型 | 主要改动 |
|------|----------|----------|
| CHANGELOG.md | 修改 | 新增 8.4.3 条目 |
| index.html | 修改 | 版本号 8.4.3 |
| js/app.js | 修改 | VERSION 8.4.3、唐宋文化 workflowSteps、getCurrentTimeForBook、rule_workflow |
| js/events.js | 修改 | 版本号 8.4.3 |
| js/ui.js | 修改 | 版本号 8.4.3、推广页 H5 识别、ensureXhtmlStructure |
| docs/唐宋文化设计.md | 新增 | 唐宋文化完整设计文档 |
| docs/CHANGELOG-唐宋文化本次改动.md | 修改 | 8.4.3 版本历史、变更说明 |
| docs/助手能力全集.md | 修改 | 唐宋文化新增「推广简介档H5」 |
| docs/REVIEW_8.4.3_vs_remote.md | 新增 | 本评审报告 |
| .qoder/repowiki/.../EPUB Generation & Export.md | 修改 | H5 排除、ensureXhtmlStructure 说明 |

---

## 二、核心功能变更

### 2.1 推广简介档 H5 识别修复

- **问题**：推广页被误识别为 chapter-01.xhtml，下载为 .xhtml 格式
- **修复**：inferContentType 优先识别推广简介档，使用 .html 扩展名、正确文件名（推广简介-书名.html）
- **extractEpubBlocksFromContent**：排除 H5/推广内容，不纳入 EPUB chapters

### 2.2 EPUB 文件打不开修复

- **问题**：唐宋文化生成的 EPUB 在部分阅读器中打不开
- **修复**：ensureXhtmlStructure 规范化 XHTML（XML 声明、DOCTYPE、UTF-8、移除 BOM）

### 2.3 唐宋文化工作流

- 10 步 workflowSteps 分步展示
- 流程标记 [唐宋文化步骤:N]
- 唐宋文化署名约束

---

## 三、评审结论

- **整体质量**：✅ 良好
- **与远端兼容性**：✅ 增量增强，无破坏性变更
- **建议合并**：是
