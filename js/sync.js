/**
 * AI Agent Pro v8.1.0 - 云同步服务
 * 支持私人云端服务器对接
 */

(function() {
    'use strict';

    const SyncService = {
        syncInterval: null,
        isSyncing: false,

        // 初始化同步服务
        init() {
            this.loadConfig();
            this.startAutoSync();
        },

        // 加载配置
        loadConfig() {
            const saved = localStorage.getItem('ai_agent_sync_config_v5');
            if (saved) {
                try {
                    window.AppState.syncConfig = { 
                        ...window.AppState.syncConfig, 
                        ...JSON.parse(saved) 
                    };
                } catch (e) {
                    window.Logger?.error('加载同步配置失败:', e);
                }
            }
        },

        // 保存配置
        saveConfig() {
            localStorage.setItem('ai_agent_sync_config_v5', JSON.stringify(window.AppState.syncConfig));
        },

        // 启动自动同步
        startAutoSync() {
            if (this.syncInterval) {
                clearInterval(this.syncInterval);
            }

            const config = window.AppState?.syncConfig;
            if (!config) {
                window.Logger?.warn('startAutoSync: syncConfig is not available');
                return;
            }
            if (config?.enabled && config?.interval) {
                const intervalMs = config.interval * 60 * 1000;
                this.syncInterval = setInterval(() => {
                    this.syncToCloud();
                }, intervalMs);
            }
        },

        // 测试连接
        async testConnection(serverUrl, apiKey) {
            try {
                const response = await fetch(serverUrl + '/health', {
                    method: 'GET',
                    headers: apiKey ? { 'X-API-Key': apiKey } : {},
                    signal: AbortSignal.timeout(10000)
                });
                
                return { success: response.ok, status: response.status };
            } catch (error) {
                return { success: false, error: error.message };
            }
        },

        // 同步到云端
        async syncToCloud() {
            if (this.isSyncing) return { success: false, error: '正在同步中' };

            const config = window.AppState.syncConfig;
            if (!config?.enabled || !config?.serverUrl || !config?.apiKey) {
                return { success: false, error: '未配置同步服务器' };
            }

            this.isSyncing = true;

            try {
                const data = {
                    version: window.AIAgentApp?.VERSION || '8.1.0',
                    timestamp: Date.now(),
                    device: this.getDeviceInfo(),
                    data: {
                        chats: window.AppState.chats || [],
                        plans: window.AppState.plans || [],
                        tasks: window.AppState.tasks || [],
                        settings: window.AppState.settings || {},
                        customSubAgents: window.AppState.customSubAgents || {}
                    }
                };

                const response = await fetch(config.serverUrl + '/sync/upload', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': config.apiKey
                    },
                    body: JSON.stringify(data),
                    signal: AbortSignal.timeout(30000)
                });

                if (response.ok) {
                    const result = await response.json();
                    window.AppState.syncConfig.lastSync = Date.now();
                    this.saveConfig();
                    this.isSyncing = false;
                    return { success: true, data: result };
                } else {
                    const error = await response.text();
                    this.isSyncing = false;
                    return { success: false, error: `同步失败: ${response.status} - ${error}` };
                }
            } catch (error) {
                this.isSyncing = false;
                return { success: false, error: error.message };
            }
        },

        // 从云端同步
        async syncFromCloud() {
            if (this.isSyncing) return { success: false, error: '正在同步中' };

            const config = window.AppState.syncConfig;
            if (!config?.enabled || !config?.serverUrl || !config?.apiKey) {
                return { success: false, error: '未配置同步服务器' };
            }

            this.isSyncing = true;

            try {
                const response = await fetch(config.serverUrl + '/sync/download', {
                    method: 'GET',
                    headers: {
                        'X-API-Key': config.apiKey
                    },
                    signal: AbortSignal.timeout(30000)
                });

                if (response.ok) {
                    const result = await response.json();
                    
                    // 合并数据
                    if (result.data) {
                        this.mergeData(result.data);
                    }
                    
                    window.AppState.syncConfig.lastSync = Date.now();
                    this.saveConfig();
                    this.isSyncing = false;
                    return { success: true, data: result };
                } else {
                    const error = await response.text();
                    this.isSyncing = false;
                    return { success: false, error: `下载失败: ${response.status} - ${error}` };
                }
            } catch (error) {
                this.isSyncing = false;
                return { success: false, error: error.message };
            }
        },

        // 合并云端数据
        mergeData(cloudData) {
            // 合并对话（按更新时间）
            if (cloudData.chats) {
                const localChats = window.AppState.chats || [];
                const chatMap = new Map(localChats.map(c => [c.id, c]));
                
                cloudData.chats.forEach(cloudChat => {
                    const localChat = chatMap.get(cloudChat.id);
                    if (!localChat || (cloudChat.updatedAt > localChat.updatedAt)) {
                        chatMap.set(cloudChat.id, cloudChat);
                    }
                });
                
                window.AppState.chats = Array.from(chatMap.values());
            }

            // 合并计划
            if (cloudData.plans) {
                const localPlans = window.AppState.plans || [];
                const planMap = new Map(localPlans.map(p => [p.id, p]));
                
                cloudData.plans.forEach(cloudPlan => {
                    const localPlan = planMap.get(cloudPlan.id);
                    if (!localPlan || (cloudPlan.updatedAt > localPlan.updatedAt)) {
                        planMap.set(cloudPlan.id, cloudPlan);
                    }
                });
                
                window.AppState.plans = Array.from(planMap.values());
            }

            // 合并任务
            if (cloudData.tasks) {
                const localTasks = window.AppState.tasks || [];
                const taskMap = new Map(localTasks.map(t => [t.id, t]));
                
                cloudData.tasks.forEach(cloudTask => {
                    const localTask = taskMap.get(cloudTask.id);
                    if (!localTask || (cloudTask.updatedAt > localTask.updatedAt)) {
                        taskMap.set(cloudTask.id, cloudTask);
                    }
                });
                
                window.AppState.tasks = Array.from(taskMap.values());
            }

            // 保存合并后的数据
            window.AIAgentApp?.saveState?.();
        },

        // 获取设备信息
        getDeviceInfo() {
            return {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                screen: {
                    width: window.screen.width,
                    height: window.screen.height
                }
            };
        },

        // 获取同步状态
        getStatus() {
            return {
                enabled: window.AppState.syncConfig?.enabled || false,
                lastSync: window.AppState.syncConfig?.lastSync,
                isSyncing: this.isSyncing,
                serverUrl: window.AppState.syncConfig?.serverUrl
            };
        }
    };

    // 初始化
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => SyncService.init(), 1000);
    });

    // 暴露到全局
    window.SyncService = SyncService;
})();
