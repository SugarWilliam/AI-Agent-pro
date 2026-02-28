/**
 * AI Agent Pro - 统一错误处理模块
 * 提供统一的错误处理机制，包括错误捕获、用户提示、重试机制
 */

(function() {
    'use strict';

    /**
     * 错误类型枚举
     */
    const ErrorType = {
        NETWORK: 'network',
        API: 'api',
        VALIDATION: 'validation',
        PERMISSION: 'permission',
        UNKNOWN: 'unknown'
    };

    /**
     * 错误处理类
     */
    const ErrorHandler = {
        /**
         * 处理错误
         * @param {Error|string} error - 错误对象或错误消息
         * @param {Object} options - 处理选项
         * @param {string} options.type - 错误类型
         * @param {boolean} options.showToast - 是否显示Toast提示
         * @param {boolean} options.logError - 是否记录日志
         * @param {Function} options.onError - 错误回调
         * @returns {Object} 错误信息对象
         */
        handle(error, options = {}) {
            const {
                type = ErrorType.UNKNOWN,
                showToast = true,
                logError = true,
                onError = null
            } = options;

            // 解析错误信息
            const errorInfo = this._parseError(error, type);

            // 记录日志
            if (logError) {
                window.Logger?.error('Error handled:', errorInfo);
            }

            // 显示用户提示
            if (showToast && window.AIAgentUI?.showToast) {
                const userMessage = this._getUserMessage(errorInfo);
                window.AIAgentUI.showToast(userMessage, 'error');
            }

            // 执行回调
            if (onError && typeof onError === 'function') {
                try {
                    onError(errorInfo);
                } catch (e) {
                    window.Logger?.error('Error callback failed:', e);
                }
            }

            return errorInfo;
        },

        /**
         * 解析错误信息
         * @private
         * @param {Error|string} error - 错误对象
         * @param {string} type - 错误类型
         * @returns {Object} 错误信息对象
         */
        _parseError(error, type) {
            if (typeof error === 'string') {
                return {
                    type,
                    message: error,
                    originalError: null,
                    timestamp: new Date().toISOString()
                };
            }

            if (error instanceof Error) {
                return {
                    type,
                    message: error.message,
                    stack: error.stack,
                    originalError: error,
                    timestamp: new Date().toISOString()
                };
            }

            if (error && error.response) {
                // 处理HTTP响应错误
                return {
                    type: ErrorType.NETWORK,
                    message: `请求失败: ${error.response.status} ${error.response.statusText}`,
                    status: error.response.status,
                    data: error.response.data,
                    originalError: error,
                    timestamp: new Date().toISOString()
                };
            }

            return {
                type,
                message: '未知错误',
                originalError: error,
                timestamp: new Date().toISOString()
            };
        },

        /**
         * 获取用户友好的错误消息
         * @private
         * @param {Object} errorInfo - 错误信息对象
         * @returns {string} 用户友好的错误消息
         */
        _getUserMessage(errorInfo) {
            const messages = {
                [ErrorType.NETWORK]: '网络连接失败，请检查网络后重试',
                [ErrorType.API]: 'API请求失败，请稍后重试',
                [ErrorType.VALIDATION]: '输入验证失败，请检查输入内容',
                [ErrorType.PERMISSION]: '权限不足，请检查配置',
                [ErrorType.UNKNOWN]: '发生未知错误，请稍后重试'
            };

            // 根据HTTP状态码提供更具体的消息
            if (errorInfo.status) {
                switch (errorInfo.status) {
                    case 401:
                        return '认证失败，请检查API密钥';
                    case 403:
                        return '权限不足，请检查API权限';
                    case 404:
                        return '请求的资源不存在';
                    case 429:
                        return '请求过于频繁，请稍后重试';
                    case 500:
                    case 502:
                    case 503:
                        return '服务器错误，请稍后重试';
                    default:
                        return messages[errorInfo.type] || `请求失败 (${errorInfo.status})`;
                }
            }

            return messages[errorInfo.type] || errorInfo.message || '发生错误，请稍后重试';
        },

        /**
         * 带重试的异步操作
         * @param {Function} fn - 要执行的异步函数
         * @param {Object} options - 重试选项
         * @param {number} options.maxRetries - 最大重试次数
         * @param {number} options.retryDelay - 重试延迟（毫秒）
         * @param {Function} options.shouldRetry - 判断是否应该重试的函数
         * @returns {Promise} Promise对象
         */
        async withRetry(fn, options = {}) {
            const {
                maxRetries = 3,
                retryDelay = 1000,
                shouldRetry = (error) => {
                    // 默认重试网络错误和5xx错误
                    return error.type === ErrorType.NETWORK || 
                           (error.status && error.status >= 500);
                }
            } = options;

            let lastError = null;

            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                try {
                    return await fn();
                } catch (error) {
                    lastError = error;
                    const errorInfo = this._parseError(error, ErrorType.NETWORK);

                    // 判断是否应该重试
                    if (attempt < maxRetries && shouldRetry(errorInfo)) {
                        window.Logger?.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${retryDelay}ms`);
                        await this._sleep(retryDelay * (attempt + 1)); // 指数退避
                        continue;
                    }

                    // 不再重试，抛出错误
                    throw errorInfo;
                }
            }

            throw lastError;
        },

        /**
         * 延迟函数
         * @private
         * @param {number} ms - 延迟毫秒数
         * @returns {Promise} Promise对象
         */
        _sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        /**
         * 包装异步函数，自动处理错误
         * @param {Function} fn - 要包装的异步函数
         * @param {Object} options - 处理选项
         * @returns {Function} 包装后的函数
         */
        wrapAsync(fn, options = {}) {
            return async (...args) => {
                try {
                    return await fn(...args);
                } catch (error) {
                    return this.handle(error, options);
                }
            };
        },

        /**
         * 验证输入
         * @param {*} value - 要验证的值
         * @param {Object} rules - 验证规则
         * @returns {Object|null} 错误信息或null
         */
        validate(value, rules) {
            if (!rules) return null;

            if (rules.required && (!value || value.trim().length === 0)) {
                return {
                    type: ErrorType.VALIDATION,
                    message: rules.message || '此字段为必填项'
                };
            }

            if (rules.minLength && value.length < rules.minLength) {
                return {
                    type: ErrorType.VALIDATION,
                    message: `长度不能少于${rules.minLength}个字符`
                };
            }

            if (rules.maxLength && value.length > rules.maxLength) {
                return {
                    type: ErrorType.VALIDATION,
                    message: `长度不能超过${rules.maxLength}个字符`
                };
            }

            if (rules.pattern && !rules.pattern.test(value)) {
                return {
                    type: ErrorType.VALIDATION,
                    message: rules.message || '格式不正确'
                };
            }

            return null;
        }
    };

    // 导出到全局
    window.ErrorHandler = ErrorHandler;
    window.ErrorType = ErrorType;

    // 全局错误捕获
    window.addEventListener('error', (event) => {
        ErrorHandler.handle(event.error, {
            type: ErrorType.UNKNOWN,
            showToast: false, // 全局错误不显示Toast，避免刷屏
            logError: true
        });
    });

    // Promise未捕获错误
    window.addEventListener('unhandledrejection', (event) => {
        ErrorHandler.handle(event.reason, {
            type: ErrorType.UNKNOWN,
            showToast: false,
            logError: true
        });
    });
})();
