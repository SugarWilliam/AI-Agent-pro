/**
 * Jina AI 代理模块
 * 解决浏览器直连 r.jina.ai 时的 CORS 限制，通过同源代理转发请求
 */
(function () {
    'use strict';

    const JINA_BASE = 'https://r.jina.ai';
    const PROXY_PATH = '/api/jina-proxy';

    /**
     * 获取 Jina API Key
     */
    function getApiKey() {
        return (window.AIAgentApp && typeof window.AIAgentApp.getJinaAIKey === 'function')
            ? window.AIAgentApp.getJinaAIKey() : '';
    }

    /**
     * 是否应使用代理（同源时使用，避免 CORS）
     */
    function shouldUseProxy() {
        try {
            const origin = window.location.origin;
            return origin && (origin.startsWith('http://') || origin.startsWith('https://'));
        } catch (_) {
            return false;
        }
    }

    /**
     * 通过代理发起 Jina POST 请求
     * @param {string} postBody - 发送给 Jina 的 JSON 对象（如 { url: "..." } 或 { pdf: "base64..." }）
     * @param {Object} [extraHeaders] - 额外请求头（如 X-Return-Format）
     * @returns {Promise<Response>}
     */
    async function proxyPost(postBody, extraHeaders = {}) {
        const proxyUrl = `${window.location.origin}${PROXY_PATH}`;
        const apiKey = getApiKey();
        const body = JSON.stringify({
            jinaUrl: JINA_BASE + '/',
            apiKey: apiKey,
            method: 'POST',
            postBody: postBody
        });
        const headers = {
            'Content-Type': 'application/json',
            ...extraHeaders
        };
        return fetch(proxyUrl, { method: 'POST', headers, body });
    }

    /**
     * 通过代理发起 Jina GET 请求
     * @param {string} targetUrl - 完整 Jina URL，如 https://r.jina.ai/https%3A%2F%2Fexample.com
     * @returns {Promise<Response>}
     */
    async function proxyGet(targetUrl) {
        const proxyUrl = `${window.location.origin}${PROXY_PATH}?url=${encodeURIComponent(targetUrl)}`;
        const apiKey = getApiKey();
        const headers = {};
        if (apiKey && apiKey.trim()) headers['X-Jina-Api-Key'] = apiKey.trim();
        return fetch(proxyUrl, { method: 'GET', headers });
    }

    /**
     * 统一 Jina 请求入口：优先走代理，失败时降级直连（可能因 CORS 失败）
     * @param {string} url - Jina 完整 URL（GET）或 JINA_BASE + '/'（POST）
     * @param {Object} options - fetch 选项 { method, headers, body }
     * @returns {Promise<Response>}
     */
    async function jinaFetch(url, options = {}) {
        const method = (options.method || 'GET').toUpperCase();
        const apiKey = getApiKey();
        if (apiKey) {
            const headers = options.headers || {};
            if (!headers['Authorization']) headers['Authorization'] = `Bearer ${apiKey}`;
            if (!headers['X-Return-Format']) headers['X-Return-Format'] = 'text';
            options.headers = headers;
        }

        if (shouldUseProxy()) {
            try {
                if (method === 'POST') {
                    let postBody = null;
                    if (options.body) {
                        try {
                            postBody = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
                        } catch (_) {
                            postBody = null;
                        }
                    }
                    if (postBody) {
                        const res = await proxyPost(postBody, options.headers);
                        if (res.ok || res.status === 401 || res.status === 429) return res;
                        if (res.status === 404) {
                            window.Logger?.warn('Jina 代理不可用(404)，尝试直连');
                        } else {
                            return res;
                        }
                    }
                } else {
                    const res = await proxyGet(url);
                    if (res.ok || res.status === 401 || res.status === 429) return res;
                    if (res.status === 404) {
                        window.Logger?.warn('Jina 代理不可用(404)，尝试直连');
                    } else {
                        return res;
                    }
                }
            } catch (proxyErr) {
                window.Logger?.warn('Jina 代理请求异常，尝试直连', proxyErr?.message);
            }
        }

        return fetch(url, options);
    }

    window.JinaProxy = {
        jinaFetch,
        proxyPost,
        proxyGet,
        getApiKey,
        shouldUseProxy,
        JINA_BASE
    };
})();
