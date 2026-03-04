/**
 * AI Agent Pro - 资源管理器
 * 统一管理定时器、事件监听器，页面卸载时自动清理，降低内存泄漏风险
 */

(function() {
    'use strict';

    const ResourceManager = {
        /**
         * 页面卸载时执行统一清理
         */
        cleanup() {
            if (window.TimerManager) window.TimerManager.clearAll();
            if (window.EventManager) window.EventManager.removeAll();
            window.Logger?.info?.('ResourceManager: 已清理定时器和事件监听器');
        },

        /**
         * 组件销毁时清理该组件的资源
         * @param {string} componentId - 组件ID
         */
        cleanupComponent(componentId) {
            if (!componentId) return;
            if (window.TimerManager) window.TimerManager.clearByComponent(componentId);
            if (window.EventManager) window.EventManager.removeComponentListeners(componentId);
        },

        /**
         * 获取资源统计（用于调试）
         */
        getStats() {
            const stats = { timers: null, events: null };
            if (window.TimerManager) stats.timers = window.TimerManager.getStats();
            if (window.EventManager) stats.events = window.EventManager.getStats();
            return stats;
        }
    };

    window.addEventListener('beforeunload', () => ResourceManager.cleanup());
    window.addEventListener('pagehide', () => ResourceManager.cleanup());
    window.ResourceManager = ResourceManager;
})();
