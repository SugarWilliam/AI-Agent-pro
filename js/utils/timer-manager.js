/**
 * AI Agent Pro - 定时器管理器
 * 统一管理 setTimeout/setInterval，防止内存泄漏
 * 支持按组件清理、页面卸载时自动清理
 */

(function() {
    'use strict';

    class TimerManager {
        constructor() {
            this.timeouts = new Map();   // id -> { type: 'timeout', id, componentId }
            this.intervals = new Map();  // id -> { type: 'interval', id, componentId }
        }

        /**
         * 创建延迟执行（替代 setTimeout）
         * @param {Function} callback - 回调函数
         * @param {number} ms - 延迟毫秒
         * @param {Object} options - 选项
         * @param {string} options.componentId - 组件ID（用于批量清理）
         * @returns {string} 定时器ID，可用于 clear
         */
        setDelay(callback, ms, options = {}) {
            const componentId = options.componentId || null;
            const id = 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
            const nativeId = setTimeout(() => {
                try { callback(); } catch (e) { window.Logger?.error?.('TimerManager callback error:', e); }
                this.timeouts.delete(id);
            }, ms);
            this.timeouts.set(id, { nativeId, type: 'timeout', componentId });
            return id;
        }

        /**
         * 创建周期执行（替代 setInterval）
         * @param {Function} callback - 回调函数
         * @param {number} ms - 间隔毫秒
         * @param {Object} options - 选项
         * @param {string} options.componentId - 组件ID（用于批量清理）
         * @returns {string} 定时器ID，可用于 clear
         */
        setRepeat(callback, ms, options = {}) {
            const componentId = options.componentId || null;
            const id = 'i_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
            const nativeId = setInterval(callback, ms);
            this.intervals.set(id, { nativeId, type: 'interval', componentId });
            return id;
        }

        /**
         * 清除单个定时器
         * @param {string} id - 由 setDelay/setRepeat 返回的 ID
         */
        clear(id) {
            if (!id) return;
            const timeout = this.timeouts.get(id);
            if (timeout) {
                clearTimeout(timeout.nativeId);
                this.timeouts.delete(id);
                return;
            }
            const interval = this.intervals.get(id);
            if (interval) {
                clearInterval(interval.nativeId);
                this.intervals.delete(id);
            }
        }

        /**
         * 清除指定组件的所有定时器
         * @param {string} componentId - 组件ID
         */
        clearByComponent(componentId) {
            if (!componentId) return;
            for (const [id, info] of this.timeouts) {
                if (info.componentId === componentId) {
                    clearTimeout(info.nativeId);
                    this.timeouts.delete(id);
                }
            }
            for (const [id, info] of this.intervals) {
                if (info.componentId === componentId) {
                    clearInterval(info.nativeId);
                    this.intervals.delete(id);
                }
            }
        }

        /**
         * 清除所有定时器
         */
        clearAll() {
            this.timeouts.forEach(info => clearTimeout(info.nativeId));
            this.timeouts.clear();
            this.intervals.forEach(info => clearInterval(info.nativeId));
            this.intervals.clear();
        }

        /**
         * 获取统计信息
         */
        getStats() {
            return {
                timeouts: this.timeouts.size,
                intervals: this.intervals.size,
                total: this.timeouts.size + this.intervals.size
            };
        }
    }

    const timerManager = new TimerManager();
    window.TimerManager = timerManager;

    window.addEventListener('beforeunload', () => timerManager.clearAll());
})();
