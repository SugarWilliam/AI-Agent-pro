# 资源显示问题修复说明

## ✅ 问题已修复

### 修复内容

**文件**: `js/app.js`  
**位置**: 第1939行  
**问题**: `loadState()` 函数中的资源合并逻辑会覆盖内置资源

### 修复前

```javascript
if (state.resources) AppState.resources = { ...AppState.resources, ...state.resources };
```

**问题**：如果localStorage中的 `state.resources.rag = []`（空数组），会覆盖掉 `AppState.resources.rag` 中的内置资源。

### 修复后

```javascript
// 智能合并资源：如果localStorage中的资源为空数组，保留内置资源
if (state.resources) {
    // RAG资源：如果localStorage中的资源为空，保留内置资源
    if (state.resources.rag && Array.isArray(state.resources.rag) && state.resources.rag.length > 0) {
        AppState.resources.rag = state.resources.rag;
    }
    // Skills资源：如果localStorage中的资源为空，保留内置资源
    if (state.resources.skills && Array.isArray(state.resources.skills) && state.resources.skills.length > 0) {
        AppState.resources.skills = state.resources.skills;
    }
    // MCP资源：如果localStorage中的资源为空，保留内置资源
    if (state.resources.mcp && Array.isArray(state.resources.mcp) && state.resources.mcp.length > 0) {
        AppState.resources.mcp = state.resources.mcp;
    }
    // Rules资源：如果localStorage中的资源为空，保留内置资源
    if (state.resources.rules && Array.isArray(state.resources.rules) && state.resources.rules.length > 0) {
        AppState.resources.rules = state.resources.rules;
    }
}
```

**逻辑**：
- ✅ 如果localStorage中的资源数组**不为空**，使用localStorage中的资源（用户自定义资源）
- ✅ 如果localStorage中的资源数组**为空**，保留内置资源（不会被覆盖）

## 📋 问题回答

### 1. 资源是被清空了吗？

**答案**：不是被清空，而是被localStorage中的空数组覆盖了。

**原因**：
- `initResources()` 正确初始化了内置资源
- 但 `loadState()` 从localStorage加载时，如果localStorage中的资源为空数组，会覆盖内置资源

### 2. 还是没有展示出来？

**答案**：资源确实存在，但被覆盖了，所以无法展示。

**修复后**：
- ✅ 资源会正确显示
- ✅ 内置资源不会被空数组覆盖

### 3. SubAgent能调用到关联的资源吗？

**答案（修复前）**：**不能**！

**原因**：
- SubAgent的资源配置（ID列表）被正确加载
- 但实际的资源对象数组被空数组覆盖
- `getSubAgentResources()` 函数尝试根据ID查找资源时，由于资源列表为空，`filter()` 返回空数组
- **结果：SubAgent无法调用到关联的资源**

**修复后**：
- ✅ 资源列表正确加载
- ✅ `getSubAgentResources()` 能正确找到关联的资源
- ✅ SubAgent可以正常调用资源

## 🔍 验证方法

### 1. 检查资源显示

刷新页面后：
1. 进入设置 → 资源
2. 检查RAG、Skills、Rules、MCP是否显示
3. 应该能看到内置资源列表

### 2. 检查SubAgent资源选择

1. 进入设置 → 助手
2. 编辑任意SubAgent
3. 检查"关联资源"部分
4. 应该能看到可勾选的资源卡片

### 3. 检查SubAgent调用资源

1. 选择一个有资源配置的SubAgent
2. 发送一条消息
3. 检查系统提示词中是否包含关联的资源内容
4. 应该能看到Rules、Skills、RAG、MCP的内容

## 🛠️ 如果问题仍然存在

### 清理localStorage中的空资源

如果修复后问题仍然存在，可能需要清理localStorage中的空资源：

```javascript
// 在浏览器控制台执行
const state = JSON.parse(localStorage.getItem('ai_agent_state_v6'));
if (state && state.resources) {
    // 检查资源是否为空
    const isEmpty = 
        (!state.resources.rag || state.resources.rag.length === 0) &&
        (!state.resources.skills || state.resources.skills.length === 0) &&
        (!state.resources.mcp || state.resources.mcp.length === 0) &&
        (!state.resources.rules || state.resources.rules.length === 0);
    
    if (isEmpty) {
        // 删除resources字段，让系统使用内置资源
        delete state.resources;
        localStorage.setItem('ai_agent_state_v6', JSON.stringify(state));
        console.log('已清理空资源，请刷新页面');
    }
}
```

---

**修复时间**: 2026-03-01  
**版本**: v8.0.0
