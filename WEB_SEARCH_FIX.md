# 网络搜索和爬取功能修复说明

## ✅ 问题已修复

### 问题描述

互联网搜索和爬取功能不生效，不能实时搜索。

### 问题根源

1. **搜索API问题**：
   - 原实现使用 `https://r.jina.ai/http://www.google.com/search?q=...` 方式
   - Google搜索页面是动态加载的，Jina AI Reader无法解析JavaScript渲染的内容
   - 导致搜索结果为空

2. **搜索触发条件**：
   - 需要同时满足：`enableWebSearch` 为true 且 SubAgent配置了 `mcp_web_search`
   - 搜索关键词提取逻辑过于严格，很多查询无法触发搜索

3. **网页爬取问题**：
   - URL清理逻辑不完善，DuckDuckGo重定向URL未正确处理
   - 错误处理不完善，失败时返回null导致后续处理失败

### 修复内容

#### 1. 改用DuckDuckGo API（无需API密钥）

**修复前**：
```javascript
const searchUrl = `https://r.jina.ai/http://www.google.com/search?q=${query}`;
```

**修复后**：
```javascript
// 优先使用DuckDuckGo Instant Answer API
const ddgUrl = `https://api.duckduckgo.com/?q=${query}&format=json&no_html=1&skip_disambig=1`;

// 备用：DuckDuckGo HTML搜索
const htmlSearchUrl = `https://html.duckduckgo.com/html/?q=${query}`;

// 最后：Jina AI Reader API（如果配置了密钥）
const jinaSearchUrl = `https://r.jina.ai/https://html.duckduckgo.com/html/?q=${query}`;
```

#### 2. 改进搜索结果解析

- 使用DOM解析器解析HTML（更准确）
- 处理DuckDuckGo重定向URL
- 提取标题、URL和摘要信息

#### 3. 优化搜索关键词提取

**修复前**：
- 只匹配特定关键词（如"搜索"、"查找"）
- 匹配逻辑过于严格

**修复后**：
- 更宽松的匹配规则
- 支持问号触发搜索
- 短问题自动触发搜索
- 移除停用词和搜索指令词

#### 4. 改进网页爬取功能

- 清理DuckDuckGo重定向URL
- 优先使用Jina AI Reader API（如果配置了密钥）
- 改进错误处理（返回基本信息而不是null）
- 添加详细的调试日志

#### 5. 添加调试日志

- 搜索过程的所有步骤都有日志记录
- 便于排查问题

## 🚀 修复后的行为

### 网络搜索流程

1. **用户发送消息**
   - 消息包含搜索关键词（如"搜索"、"最新"、"什么"等）
   - 或包含问号

2. **提取搜索关键词**
   - 从消息中提取关键词
   - 移除停用词和搜索指令词

3. **执行搜索**
   - 优先使用DuckDuckGo Instant Answer API
   - 如果失败，使用DuckDuckGo HTML搜索
   - 最后尝试Jina AI Reader API（如果配置了密钥）

4. **解析搜索结果**
   - 解析返回的JSON或HTML
   - 提取标题、URL和摘要

5. **爬取网页内容**
   - 自动爬取前3个搜索结果的内容
   - 使用Jina AI Reader API（如果配置了密钥）

6. **整合到AI回复**
   - 搜索结果添加到思考过程
   - 爬取的内容添加到RAG上下文

### 搜索策略

1. **DuckDuckGo Instant Answer API**（优先）
   - 无需API密钥
   - 返回即时答案和相关主题
   - 速度快，结果准确

2. **DuckDuckGo HTML搜索**（备用）
   - 无需API密钥
   - 返回HTML格式的搜索结果
   - 需要解析HTML

3. **Jina AI Reader API**（最后）
   - 需要配置API密钥
   - 可以解析动态内容
   - 结果更准确

## 📋 使用方法

### 1. 启用网络搜索

- 点击工具栏的"网络搜索"按钮（地球图标）
- 或确保设置中"网络搜索"开关已开启

### 2. 确保SubAgent配置了网络搜索MCP

- 打开设置 → SubAgent设置
- 确保当前SubAgent关联了"网络搜索"MCP资源

### 3. 发送包含搜索关键词的消息

**触发搜索的关键词**：
- 搜索、查找、查询、搜一下、找一下
- 最新、现在、当前、实时、今天、最近
- 什么、如何、为什么、哪里、哪个、谁
- 新闻、资讯、消息、动态、更新
- 价格、多少钱、多少、什么时候、几点

**示例消息**：
- "搜索一下最新的AI技术"
- "现在比特币价格是多少？"
- "什么是量子计算？"
- "如何学习Python？"

## ⚠️ 注意事项

1. **网络连接**：
   - 需要访问DuckDuckGo API和网站
   - 确保网络连接正常

2. **Jina AI API密钥**：
   - 如果配置了Jina AI API密钥，网页爬取功能会更可靠
   - 未配置时，只能获取搜索结果，无法爬取网页内容

3. **搜索频率**：
   - DuckDuckGo API有频率限制
   - 建议不要过于频繁地搜索

4. **CORS限制**：
   - 直接fetch网页可能遇到CORS限制
   - 建议使用Jina AI Reader API进行网页爬取

## 🔧 如果仍然失败

### 检查1：网络搜索是否启用

```javascript
// 在浏览器控制台检查
console.log('Web Search Enabled:', window.AppState?.settings?.webSearchEnabled);
```

### 检查2：SubAgent是否配置了网络搜索MCP

```javascript
// 在浏览器控制台检查
const currentAgent = window.AppState?.currentSubAgent || 'general';
const agent = window.AppState?.subAgents?.[currentAgent];
console.log('MCP Resources:', agent?.resources?.mcp);
console.log('Has Web Search MCP:', agent?.resources?.mcp?.some(m => m.id === 'mcp_web_search'));
```

### 检查3：查看控制台日志

打开浏览器控制台（F12），查看搜索相关的日志：
- "开始网络搜索: xxx"
- "网络搜索完成，返回x个结果"
- "开始爬取网页: xxx"

---

**修复时间**: 2026-03-01  
**版本**: v8.0.0
