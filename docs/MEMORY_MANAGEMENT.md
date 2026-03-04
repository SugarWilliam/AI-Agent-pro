# AI Agent Pro - 内存管理指南

## 概述

为降低内存泄漏风险，项目提供统一的定时器管理器和事件管理器，并在页面卸载时自动清理。

## 模块说明

| 模块 | 用途 | 清理时机 |
|------|------|----------|
| **TimerManager** | 统一管理 setTimeout/setInterval | beforeunload 自动 clearAll |
| **EventManager** | 统一管理 addEventListener | beforeunload 自动 removeAll |
| **ResourceManager** | 统一入口，协调上述两者 | beforeunload 调用 cleanup |

## 使用规范

### 1. 定时器（推荐使用 TimerManager）

```javascript
// 延迟执行
const id = window.TimerManager?.setDelay?.(() => { /* ... */ }, 3000, { componentId: 'my-component' });
// 需要取消时
window.TimerManager?.clear?.(id);

// 周期执行
const id = window.TimerManager?.setRepeat?.(() => { /* ... */ }, 5000, { componentId: 'sync-service' });
window.TimerManager?.clear?.(id);

// 组件销毁时批量清理
window.TimerManager?.clearByComponent?.('my-component');
```

### 2. 事件监听（推荐使用 EventManager）

```javascript
// 添加监听，返回清理函数
const unbind = window.EventManager?.on?.('#my-btn', 'click', handler, { componentId: 'my-panel' });
// 需要移除时
unbind();  // 或 EventManager.off(element, 'click', handler);

// 组件销毁时批量清理
window.EventManager?.removeComponentListeners?.('my-panel');
```

### 3. innerHTML 替换前的清理

在 `innerHTML = '...'` 替换容器内容前，若该容器或其子元素曾通过 EventManager 注册监听，应先清理：

```javascript
// 替换 messagesList 前
window.EventManager?.removeComponentListeners?.('messages-list');
messagesList.innerHTML = '';
```

对于**事件委托**（在父元素上监听），无需清理子元素，因为监听器在父元素上。

### 4. 组件销毁模式

```javascript
function destroyMyComponent() {
    window.ResourceManager?.cleanupComponent?.('my-component');
    // 或分别调用
    window.TimerManager?.clearByComponent?.('my-component');
    window.EventManager?.removeComponentListeners?.('my-component');
}
```

## 当前集成情况

- **TimerManager**：sync.js 的 setInterval 已接入
- **EventManager**：已加载，events.js/ui.js 可逐步迁移
- **ResourceManager**：beforeunload 统一清理

## 迁移建议

1. **高优先级**：周期性定时器（setInterval）、长延迟 setTimeout（>5s）
2. **中优先级**：动态创建/销毁的组件上的 addEventListener
3. **低优先级**：一次性短延迟（如 300ms 动画）、常驻 UI 的监听器

## 调试

```javascript
// 控制台查看当前资源统计
window.ResourceManager?.getStats?.();
// { timers: { timeouts: N, intervals: M }, events: { total: K } }
```
