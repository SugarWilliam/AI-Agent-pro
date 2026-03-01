# 版本更新总结 v8.2.0

**发布日期**: 2026-03-01

---

## 更新概述

v8.2.0 为深度评审与优化版本，包含文件解析体验改进、冗余文件清理及文档刷新。

---

## 主要变更

### 1. 文件附件体验优化
- 解析/加载状态改为附件后小字显示，移除遮挡输入框的 Toast
- 附件进度圈改为完整 360° 百分比显示（SVG）
- 加载完成后显示圆角矩形移除按钮，与进度圈区分

### 2. 图片解析增强
- Tesseract OCR 成功阈值降低（接受任意非空结果）
- 多 CDN 降级（jsdelivr → unpkg）
- RAGManager 不可用时仍能处理图片附件

### 3. PDF 解析增强
- 多方法降级：pdf 字段 → file 字段 → 二进制 POST
- 大文件优先使用二进制 POST（无 Base64 膨胀）
- 413 等错误时给出明确提示

### 4. 网页爬取优化
- 优先使用 POST + url 参数（避免 CORS/URL 编码问题）
- GET 作为备选，URL 正确编码

### 5. 项目清理
- 删除冗余脚本：`deploy-with-token.sh`（与 DEPLOY_NOW.sh 重复）
- 归档 SSH 文档至 `docs/archive/ssh/`
- 归档冗余部署文档至 `docs/archive/deploy/`
- 移动 `test_search_optimization.js` 至 `test/` 目录

### 6. 文档与版本
- 统一版本号至 8.2.0
- 更新 README 更新日志
- 修复 rag.js parseImage 后缺少逗号导致的语法错误

---

## 版本号更新位置

| 文件 | 更新内容 |
|------|----------|
| index.html | title、splash、sidebar |
| js/app.js | VERSION 常量 |
| js/*.js | 文件头注释 |
| deploy.sh, DEPLOY_NOW.sh | 脚本注释 |
| README.md | badge、更新日志 |
| docs/*.md | 版本声明 |

---

## 兼容性说明

- 无破坏性变更
- LocalStorage 数据结构未变
- API 调用方式未变
