# 与远端对比评审汇总

本文档合并历史与远端对比的评审报告，便于查阅。当前发布说明见 [RELEASES.md](RELEASES.md)，版本变更见 [CHANGELOG.md](../CHANGELOG.md)。

---

## 〇、v8.6.0 发布评审（2026-03-15）

| 项 | 结论 |
|----|------|
| **范围** | 版本号统一 **8.6.0**；量化幻方 **V4.0 黄金样例** 与 **KDI/期望/阶梯** 口径对齐；**v8.6.0 说明已并入 [RELEASES.md](RELEASES.md)** |
| **逻辑与计算** | 样例内 **E[r]、E[r']** 与 **P_i、C、P₀** 一致；**类型 A/B 再归一化** 可执行；**S1/S2** 灵敏度分源 |
| **衔接** | **决策链总览**与 **〇·8** 清单、管道自证一致 |
| **建议** | 发布前按 `docs/RELEASE_READINESS.md` 执行 API Key 策略与本地抽查；打 tag **v8.6.0** |

**详细变更**: [CHANGELOG.md](../CHANGELOG.md) **[8.6.0]** · [RELEASES.md — v8.6.0](RELEASES.md)

---

## 一、v8.5.3 与远端对比（2026-03-15）

**对比基准**: origin/gh-pages  
**当前分支**: gh-pages（含 v8.5.3 及量化幻方等增强）

### 1.1 变更概览

| 类别 | 说明 |
|------|------|
| 版本统一 8.5.3 | app.js、index.html、js 模块头、release.sh、CHANGELOG、RELEASE_READINESS、DEPLOYMENT、唐宋文化设计、助手能力全集、DESIGN_A2A、review-test、README |
| 量化幻方助手 | app.js systemPrompt + 技能/RAG、llm.js 注入当前日期与约束重申、DESIGN_QUANT_MAGIC_SQUARE.md |
| 导出/下载仅报告 | ui.js formatAs*、events.js export*、对话 PDF 实现 |
| 时效与禁止占位 | app.js【禁止与强制执行】、十 实时数据 强化、rag_snowball、skill_value_investment |
| 发布与文档 | RELEASES.md（合并发布说明）、CHANGELOG [8.5.3] 条目 |

### 1.2 评审结论

| 维度 | 状态 | 说明 |
|------|------|------|
| 版本一致性 | ✅ | 本地已统一为 8.5.3，与 CHANGELOG/RELEASES 一致 |
| 量化幻方约束 | ✅ | 禁止占位/模拟、强制实时数据在多处强化 |
| 导出与下载 | ✅ | 单条与对话导出均仅报告、不含思考；PDF 对话导出已实现 |
| 时效 | ✅ | 当前日期注入 + systemPrompt 时效与报告时间要求 |
| 文档覆盖 | ✅ | 设计、发布、部署、就绪清单、能力全集、唐宋文化已更新或合并 |

**建议**：推送前在本地做一次功能抽查（量化幻方、导出 MD/HTML/PDF、单条下载），确认无误后再推送到 origin/gh-pages 并视需打 tag v8.5.3。

---

## 二、8.4.3 与远端对比（2026-03-14）

**对比分支**: 本地 gh-pages vs origin/gh-pages  
**版本**: 8.4.3

### 2.1 变更概览

| 文件 | 变更类型 | 主要改动 |
|------|----------|----------|
| CHANGELOG.md | 修改 | 新增 8.4.3 条目 |
| index.html | 修改 | 版本号 8.4.3 |
| js/app.js | 修改 | VERSION 8.4.3、唐宋文化 workflowSteps、getCurrentTimeForBook、rule_workflow |
| js/events.js | 修改 | 版本号 8.4.3 |
| js/ui.js | 修改 | 版本号 8.4.3、推广页 H5 识别、ensureXhtmlStructure、extractEpubBlocksFromContent while 循环闭合修复 |
| docs/唐宋文化设计.md | 新增 | 唐宋文化完整设计文档 |
| docs/助手能力全集.md | 修改 | 唐宋文化新增「推广简介档H5」 |

### 2.2 核心功能变更

- **推广简介档 H5 识别修复**：inferContentType 优先识别推广简介档，使用 .html 扩展名；extractEpubBlocksFromContent 排除 H5/推广内容。
- **EPUB 文件打不开修复**：ensureXhtmlStructure 规范化 XHTML（XML 声明、DOCTYPE、UTF-8、移除 BOM）。
- **唐宋文化工作流**：10 步 workflowSteps、流程标记 [唐宋文化步骤:N]、唐宋文化署名约束。

### 2.3 评审结论

- **整体质量**：✅ 良好  
- **与远端兼容性**：✅ 增量增强，无破坏性变更  
- **建议合并**：是  

---

**文档版本**: v8.6.3 · 最后更新: 2026-03-26
