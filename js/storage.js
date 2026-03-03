/**
 * AI Agent Pro - 统一存储层
 * 优先使用 IndexedDB（大容量、无 5MB 限制），不可用时回退到 localStorage
 * 解决会话、设置刷新后丢失及 localStorage 配额溢出问题
 */
(function() {
    'use strict';

    const DB_NAME = 'AI_Agent_Pro_DB';
    const DB_VERSION = 1;
    const STORE_NAME = 'kv';

    let db = null;
    let useIndexedDB = null; // null=未检测, true=用IDB, false=用localStorage

    function isIndexedDBAvailable() {
        try {
            return typeof indexedDB !== 'undefined' && indexedDB !== null;
        } catch (e) {
            return false;
        }
    }

    function openDB() {
        return new Promise((resolve, reject) => {
            if (!isIndexedDBAvailable()) {
                resolve(null);
                return;
            }
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onerror = () => reject(req.error);
            req.onsuccess = () => resolve(req.result);
            req.onupgradeneeded = (e) => {
                if (!e.target.result.objectStoreNames.contains(STORE_NAME)) {
                    e.target.result.createObjectStore(STORE_NAME);
                }
            };
        });
    }

    /**
     * 初始化存储（检测用 IDB 还是 localStorage）
     */
    async function init() {
        if (useIndexedDB !== null) return useIndexedDB;
        try {
            db = await openDB();
            useIndexedDB = !!db;
            if (useIndexedDB) {
                window.Logger?.info?.('存储: 使用 IndexedDB');
            } else {
                window.Logger?.info?.('存储: 使用 localStorage（IndexedDB 不可用）');
            }
            return useIndexedDB;
        } catch (e) {
            window.Logger?.warn?.('IndexedDB 不可用，回退到 localStorage:', e?.message);
            useIndexedDB = false;
            return false;
        }
    }

    /**
     * 异步获取
     */
    function get(key) {
        return new Promise((resolve) => {
            const fallback = () => {
                try {
                    const v = localStorage.getItem(key);
                    resolve(v ? JSON.parse(v) : null);
                } catch (e) {
                    resolve(null);
                }
            };

            if (useIndexedDB === false) {
                fallback();
                return;
            }

            if (!db && useIndexedDB !== true) {
                init().then(() => get(key).then(resolve));
                return;
            }

            if (!db) {
                fallback();
                return;
            }

            try {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const req = store.get(key);
                req.onsuccess = () => resolve(req.result ?? null);
                req.onerror = () => fallback();
            } catch (e) {
                fallback();
            }
        });
    }

    /**
     * 异步写入
     */
    function set(key, value) {
        return new Promise((resolve) => {
            const fallback = () => {
                try {
                    localStorage.setItem(key, JSON.stringify(value));
                    resolve(true);
                } catch (e) {
                    if (e?.name === 'QuotaExceededError') {
                        window.Logger?.warn?.('localStorage 已满，数据可能未保存');
                    }
                    resolve(false);
                }
            };

            if (useIndexedDB === false) {
                fallback();
                return;
            }

            if (!db && useIndexedDB !== true) {
                init().then(() => set(key, value).then(resolve));
                return;
            }

            if (!db) {
                fallback();
                return;
            }

            try {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const req = store.put(value, key);
                req.onsuccess = () => resolve(true);
                req.onerror = () => fallback();
            } catch (e) {
                fallback();
            }
        });
    }

    /**
     * 移除
     */
    function remove(key) {
        return new Promise((resolve) => {
            const fallback = () => {
                try {
                    localStorage.removeItem(key);
                } catch (_) {}
                resolve();
            };

            if (!db || useIndexedDB === false) {
                fallback();
                return;
            }

            try {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const req = store.delete(key);
                req.onsuccess = () => resolve();
                req.onerror = () => fallback();
            } catch (e) {
                fallback();
            }
        });
    }

    /**
     * 从 localStorage 迁移到 IndexedDB（首次使用新存储时）
     */
    async function migrateFromLocalStorage(keys) {
        if (!useIndexedDB || !db) return;
        for (const key of keys) {
            try {
                const v = localStorage.getItem(key);
                if (v) {
                    const parsed = JSON.parse(v);
                    await set(key, parsed);
                }
            } catch (_) {}
        }
    }

    window.StorageService = {
        init,
        get,
        set,
        remove,
        migrateFromLocalStorage,
        isIndexedDB: () => useIndexedDB === true
    };
})();
