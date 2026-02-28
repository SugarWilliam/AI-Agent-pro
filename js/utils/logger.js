/**
 * AI Agent Pro - 日志工具模块
 * 统一管理日志输出，生产环境自动禁用调试信息
 */

(function() {
    'use strict';

    // 检测运行环境
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.search.includes('debug=true');

    // 日志级别
    const LogLevel = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        NONE: 4
    };

    // 当前日志级别（生产环境默认只显示ERROR）
    let currentLevel = isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR;

    /**
     * 日志工具类
     */
    const Logger = {
        /**
         * 设置日志级别
         * @param {number} level - 日志级别
         */
        setLevel(level) {
            currentLevel = level;
        },

        /**
         * 获取当前日志级别
         * @returns {number} 当前日志级别
         */
        getLevel() {
            return currentLevel;
        },

        /**
         * Debug日志（仅开发环境）
         * @param {...any} args - 日志参数
         */
        debug(...args) {
            if (currentLevel <= LogLevel.DEBUG && isDevelopment) {
                console.debug('[DEBUG]', ...args);
            }
        },

        /**
         * Info日志
         * @param {...any} args - 日志参数
         */
        info(...args) {
            if (currentLevel <= LogLevel.INFO) {
                console.info('[INFO]', ...args);
            }
        },

        /**
         * Warning日志
         * @param {...any} args - 日志参数
         */
        warn(...args) {
            if (currentLevel <= LogLevel.WARN) {
                console.warn('[WARN]', ...args);
                // 可以在这里发送到错误追踪服务
                this._sendToErrorTracker('warn', args);
            }
        },

        /**
         * Error日志
         * @param {...any} args - 日志参数
         */
        error(...args) {
            if (currentLevel <= LogLevel.ERROR) {
                console.error('[ERROR]', ...args);
                // 发送到错误追踪服务
                this._sendToErrorTracker('error', args);
            }
        },

        /**
         * 发送错误到追踪服务（可扩展）
         * @private
         * @param {string} level - 错误级别
         * @param {Array} args - 错误信息
         */
        _sendToErrorTracker(level, args) {
            // TODO: 集成错误追踪服务（如Sentry）
            // if (window.Sentry) {
            //     window.Sentry.captureException(new Error(args.join(' ')));
            // }
            
            // 存储到localStorage用于调试（仅开发环境）
            if (isDevelopment) {
                try {
                    const errors = JSON.parse(localStorage.getItem('ai_agent_errors') || '[]');
                    errors.push({
                        level,
                        message: args.map(arg => 
                            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                        ).join(' '),
                        timestamp: new Date().toISOString(),
                        url: window.location.href,
                        userAgent: navigator.userAgent
                    });
                    // 只保留最近100条错误
                    if (errors.length > 100) {
                        errors.shift();
                    }
                    localStorage.setItem('ai_agent_errors', JSON.stringify(errors));
                } catch (e) {
                    // 忽略存储错误
                }
            }
        },

        /**
         * 获取错误日志
         * @returns {Array} 错误日志数组
         */
        getErrors() {
            try {
                return JSON.parse(localStorage.getItem('ai_agent_errors') || '[]');
            } catch (e) {
                return [];
            }
        },

        /**
         * 清除错误日志
         */
        clearErrors() {
            localStorage.removeItem('ai_agent_errors');
        },

        /**
         * 性能计时开始
         * @param {string} label - 计时标签
         */
        time(label) {
            if (isDevelopment) {
                console.time(label);
            }
        },

        /**
         * 性能计时结束
         * @param {string} label - 计时标签
         */
        timeEnd(label) {
            if (isDevelopment) {
                console.timeEnd(label);
            }
        },

        /**
         * 性能标记
         * @param {string} label - 标记标签
         */
        mark(label) {
            if (isDevelopment && performance.mark) {
                performance.mark(label);
            }
        }
    };

    // 导出到全局
    window.Logger = Logger;
    window.LogLevel = LogLevel;

    // 开发环境提示
    if (isDevelopment) {
        Logger.debug('Logger initialized in development mode');
    }
})();
