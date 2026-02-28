/**
 * AI Agent Pro - 事件管理器
 * 统一管理事件监听器，防止内存泄漏
 */

(function() {
    'use strict';

    /**
     * 事件管理器类
     */
    class EventManager {
        constructor() {
            this.listeners = new Map(); // 存储所有监听器
            this.componentListeners = new Map(); // 按组件存储监听器
        }

        /**
         * 添加事件监听器
         * @param {HTMLElement|string} element - DOM元素或选择器
         * @param {string} event - 事件类型
         * @param {Function} handler - 事件处理函数
         * @param {Object} options - 选项
         * @param {string} options.componentId - 组件ID（用于批量清理）
         * @param {boolean} options.once - 是否只执行一次
         * @param {boolean} options.capture - 是否在捕获阶段执行
         * @returns {Function} 清理函数
         */
        on(element, event, handler, options = {}) {
            const {
                componentId = null,
                once = false,
                capture = false
            } = options;

            // 如果是选择器，获取元素
            const el = typeof element === 'string' 
                ? document.querySelector(element) 
                : element;

            if (!el) {
                window.Logger?.warn(`EventManager: Element not found for selector "${element}"`);
                return () => {};
            }

            // 包装处理函数，支持once
            let wrappedHandler = handler;
            if (once) {
                wrappedHandler = (...args) => {
                    handler(...args);
                    this.off(el, event, wrappedHandler);
                };
            }

            // 添加事件监听器
            el.addEventListener(event, wrappedHandler, capture);

            // 生成唯一ID
            const listenerId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // 存储监听器信息
            const listenerInfo = {
                id: listenerId,
                element: el,
                event,
                handler: wrappedHandler,
                originalHandler: handler,
                componentId,
                capture
            };

            this.listeners.set(listenerId, listenerInfo);

            // 如果指定了组件ID，也存储到组件映射中
            if (componentId) {
                if (!this.componentListeners.has(componentId)) {
                    this.componentListeners.set(componentId, []);
                }
                this.componentListeners.get(componentId).push(listenerId);
            }

            // 返回清理函数
            return () => {
                this.off(el, event, wrappedHandler);
            };
        }

        /**
         * 移除事件监听器
         * @param {HTMLElement} element - DOM元素
         * @param {string} event - 事件类型
         * @param {Function} handler - 事件处理函数
         */
        off(element, event, handler) {
            const el = typeof element === 'string' 
                ? document.querySelector(element) 
                : element;

            if (!el) return;

            // 查找并移除监听器
            for (const [id, info] of this.listeners.entries()) {
                if (info.element === el && 
                    info.event === event && 
                    (handler === undefined || info.handler === handler || info.originalHandler === handler)) {
                    el.removeEventListener(event, info.handler, info.capture);
                    this.listeners.delete(id);

                    // 从组件映射中移除
                    if (info.componentId) {
                        const componentListeners = this.componentListeners.get(info.componentId);
                        if (componentListeners) {
                            const index = componentListeners.indexOf(id);
                            if (index > -1) {
                                componentListeners.splice(index, 1);
                            }
                        }
                    }
                }
            }
        }

        /**
         * 移除组件所有监听器
         * @param {string} componentId - 组件ID
         */
        removeComponentListeners(componentId) {
            const listenerIds = this.componentListeners.get(componentId);
            if (!listenerIds) return;

            listenerIds.forEach(id => {
                const info = this.listeners.get(id);
                if (info) {
                    info.element.removeEventListener(
                        info.event, 
                        info.handler, 
                        info.capture
                    );
                    this.listeners.delete(id);
                }
            });

            this.componentListeners.delete(componentId);
        }

        /**
         * 移除所有监听器
         */
        removeAll() {
            this.listeners.forEach(info => {
                info.element.removeEventListener(
                    info.event,
                    info.handler,
                    info.capture
                );
            });

            this.listeners.clear();
            this.componentListeners.clear();
        }

        /**
         * 获取监听器统计信息
         * @returns {Object} 统计信息
         */
        getStats() {
            const stats = {
                total: this.listeners.size,
                byComponent: {},
                byEvent: {}
            };

            this.listeners.forEach(info => {
                // 按组件统计
                if (info.componentId) {
                    stats.byComponent[info.componentId] = 
                        (stats.byComponent[info.componentId] || 0) + 1;
                }

                // 按事件类型统计
                stats.byEvent[info.event] = 
                    (stats.byEvent[info.event] || 0) + 1;
            });

            return stats;
        }
    }

    // 创建全局实例
    const eventManager = new EventManager();

    // 导出到全局
    window.EventManager = eventManager;

    // 页面卸载时清理所有监听器
    window.addEventListener('beforeunload', () => {
        eventManager.removeAll();
    });
})();
