# 历史会话丢失问题修复

## 🐛 问题描述

浏览器刷新后，AI Agent Pro的历史会话没有保持，重新新建了，历史会话也找不到了。

## 🔍 问题分析

### 根本原因

1. **初始化时序问题**：
   - `events.js` 中的 `initSplashScreen()` 在2秒后就隐藏启动页并调用 `initUI()`
   - 但 `app.js` 的 `init()` 是异步的，可能需要3-4秒才能完成
   - 当 `initUI()` 执行时，`loadState()` 可能还没完成，导致 `AppState.chats` 还是空的

2. **数据加载时机问题**：
   - `loadState()` 在 `init()` 中调用，但UI初始化可能在数据加载完成前执行
   - 如果 `initUI()` 在 `loadState()` 之前执行，历史会话列表会是空的

3. **会话恢复逻辑问题**：
   - `initUI()` 中检查 `currentChatId` 时，如果对应的会话不存在，没有正确处理

## ✅ 修复方案

### 1. 修改初始化流程

**文件**: `js/app.js`

在 `init()` 函数完成后，确保调用 `initUI()`：

```javascript
setTimeout(() => {
    hideSplash();
    // 显示主应用界面
    const app = document.getElementById('app');
    if (app) {
        app.style.display = 'flex';
    }
    // 初始化完成后，确保UI已渲染历史会话
    setTimeout(() => {
        if (window.AIAgentEvents && typeof window.AIAgentEvents.initUI === 'function') {
            window.AIAgentEvents.initUI();
        }
    }, 100);
}, Math.min(remaining, maxRemaining));
```

### 2. 改进数据加载逻辑

**文件**: `js/app.js`

在 `loadState()` 中添加日志和验证：

```javascript
if (state.chats && Array.isArray(state.chats)) {
    AppState.chats = state.chats;
    window.Logger?.debug(`加载了 ${state.chats.length} 个历史会话`);
}
```

### 3. 完善UI初始化逻辑

**文件**: `js/events.js`

改进 `initUI()` 函数：

```javascript
function initUI() {
    window.Logger?.debug('初始化UI，当前会话数:', window.AppState?.chats?.length || 0);
    
    if (window.AIAgentUI) {
        // 先渲染历史会话列表
        window.AIAgentUI.renderChatHistory();
        window.AIAgentUI.updateCurrentModelDisplay();
    }
    
    // 如果有当前会话ID，加载该会话
    if (window.AppState?.currentChatId) {
        const chat = window.AppState.chats?.find(c => c.id === window.AppState.currentChatId);
        if (chat) {
            window.Logger?.debug('加载当前会话:', window.AppState.currentChatId);
            loadChat(window.AppState.currentChatId);
        } else {
            window.Logger?.warn('当前会话ID不存在，清除currentChatId');
            window.AppState.currentChatId = null;
            window.AppState.messages = [];
            if (window.AIAgentUI) {
                window.AIAgentUI.showWelcomeScreen();
            }
        }
    } else {
        // 如果没有当前会话，显示欢迎界面
        if (window.AIAgentUI) {
            window.AIAgentUI.showWelcomeScreen();
        }
    }
    
    updateAgentName();
    updateModeBadge();
    updateSearchButton();
    
    window.Logger?.debug('UI初始化完成');
}
```

### 4. 暴露initUI函数

**文件**: `js/events.js`

将 `initUI` 暴露到 `window.AIAgentEvents`：

```javascript
window.AIAgentEvents = {
    initUI,
    loadChat,
    // ... 其他函数
};
```

### 5. 修改启动页逻辑

**文件**: `js/events.js`

修改 `initSplashScreen()` 作为备用处理：

```javascript
function initSplashScreen() {
    // 注意：启动页的隐藏和UI初始化由app.js的init()函数控制
    // 这里只做备用处理，如果app.js的init()没有调用initUI()，则延迟调用
    setTimeout(() => {
        // 检查是否已经初始化完成（通过检查AppState是否已加载）
        if (window.AppState && window.AppState.chats !== undefined) {
            // 如果数据已加载但UI未初始化，则初始化UI
            const app = document.getElementById('app');
            if (app && app.style.display === 'none') {
                const splash = document.getElementById('splash');
                if (splash && !splash.classList.contains('hidden')) {
                    splash.classList.add('hidden');
                    setTimeout(() => {
                        splash.style.display = 'none';
                        if (app) app.style.display = 'flex';
                        initUI();
                    }, 500);
                }
            }
        }
    }, 5000); // 5秒后检查，确保app.js的init()有足够时间完成
}
```

## 🧪 测试验证

### 测试步骤

1. **创建会话**：
   - 打开应用
   - 发送几条消息，创建会话
   - 刷新页面

2. **验证历史会话**：
   - 检查左侧历史会话列表是否显示
   - 检查当前会话是否自动加载
   - 检查消息是否正常显示

3. **验证数据持久化**：
   - 打开浏览器开发者工具
   - 检查 `localStorage` 中的 `ai_agent_state_v6`
   - 确认 `chats` 数组包含历史会话

### 预期结果

- ✅ 刷新后历史会话列表正常显示
- ✅ 如果有当前会话，自动加载并显示消息
- ✅ 如果没有当前会话，显示欢迎界面
- ✅ 控制台日志显示数据加载和UI初始化过程

## 📋 修复文件清单

- `js/app.js` - 修改初始化流程和数据加载逻辑
- `js/events.js` - 改进UI初始化逻辑和启动页处理

## 🔄 版本信息

- **修复版本**: v8.0.1
- **修复时间**: 2026-03-01
- **问题状态**: ✅ 已修复

## 📝 注意事项

1. **数据备份**：修复前建议导出数据备份
2. **浏览器兼容性**：确保浏览器支持 `localStorage`
3. **存储限制**：注意 `localStorage` 的5MB限制
4. **调试日志**：打开浏览器控制台查看详细日志
