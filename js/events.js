/**
 * AI Agent Pro v8.2.0 - 事件处理模块
 * 未来科技感交互设计
 */

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        initEventListeners();
        initSplashScreen();
    });

    // ==================== 启动页 ====================
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

    function updateSearchButton() {
        const btn = document.getElementById('search-btn');
        if (btn) {
            const isEnabled = window.AppState.settings?.webSearchEnabled || false;
            btn.classList.toggle('active', isEnabled);
        }
    }

    function updateAgentName() {
        const agentNameEl = document.getElementById('current-agent-name');
        const agentIconEl = document.querySelector('#subagent-btn i');
        
        if (agentNameEl) {
            const agent = window.AppState.subAgents?.[window.AppState.currentSubAgent];
            agentNameEl.textContent = agent?.name || '通用助手';
        }
        
        // 更新助手图标（显示当前选中助手的图标）
        if (agentIconEl) {
            const agent = window.AppState.subAgents?.[window.AppState.currentSubAgent];
            const iconClass = agent?.icon || 'fa-user-astronaut';
            // 移除所有FontAwesome图标类（保留fas基础类）
            const classesToRemove = Array.from(agentIconEl.classList).filter(cls => 
                cls.startsWith('fa-') && cls !== 'fas'
            );
            classesToRemove.forEach(cls => agentIconEl.classList.remove(cls));
            // 添加新的图标类
            if (!agentIconEl.classList.contains(iconClass)) {
                agentIconEl.classList.add(iconClass);
            }
        }
    }

    function updateModeBadge() {
        const modeBadge = document.getElementById('current-mode-badge');
        if (modeBadge) {
            const modeNames = {
                chat: '对话',
                task: '任务',
                plan: '计划',
                creative: '创意',
                creation: '创作'
            };
            modeBadge.textContent = modeNames[window.AppState.currentMode] || '对话';
        }
    }

    // ==================== 事件绑定 ====================
    function initEventListeners() {
        // 侧边栏
        document.getElementById('menu-btn')?.addEventListener('click', toggleSidebar);
        document.getElementById('close-sidebar')?.addEventListener('click', closeSidebar);
        document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);

        // 新建对话
        document.getElementById('new-chat-btn')?.addEventListener('click', createNewChat);

        // 模型选择
        document.getElementById('model-selector-btn')?.addEventListener('click', () => {
            window.AIAgentUI?.renderModelSelector?.();
            window.AIAgentUI?.openModal?.('model-modal');
        });

        // 设置
        document.getElementById('settings-btn')?.addEventListener('click', openSettings);

        // 设置标签切换 - 支持新布局
        document.querySelectorAll('.settings-menu-item').forEach(item => {
            item.addEventListener('click', () => switchSettingsTab(item.dataset.tab));
        });
        
        // 兼容旧版设置标签
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', () => switchSettingsTab(tab.dataset.tab));
        });

        // 资源子标签切换 - 支持新布局
        document.querySelectorAll('.resource-subtab').forEach(tab => {
            tab.addEventListener('click', () => switchResourceTab(tab.dataset.subtab));
        });
        
        // 兼容旧版资源标签
        document.querySelectorAll('.resource-tab').forEach(tab => {
            tab.addEventListener('click', () => switchResourceTab(tab.dataset.tab));
        });

        // 添加自定义模型
        document.getElementById('add-custom-model-btn')?.addEventListener('click', showAddModelDialog);

        // 添加资源
        document.getElementById('add-rag-btn')?.addEventListener('click', () => showAddResourceDialog('rag'));
        document.getElementById('add-skill-btn')?.addEventListener('click', () => showAddSkillDialog());
        document.getElementById('add-mcp-btn')?.addEventListener('click', () => showAddResourceDialog('mcp'));
        document.getElementById('add-rule-btn')?.addEventListener('click', () => showAddResourceDialog('rules'));

        // 添加Sub Agent
        document.getElementById('add-subagent-btn')?.addEventListener('click', showAddSubAgentDialog);
        document.getElementById('add-custom-subagent-btn')?.addEventListener('click', showAddSubAgentDialog);

        // 模式选择器
        document.querySelectorAll('.mode-option').forEach(btn => {
            btn.addEventListener('click', () => switchMode(btn.dataset.mode));
        });

        // 快捷操作
        document.querySelectorAll('.quick-action[data-prompt]').forEach(btn => {
            btn.addEventListener('click', () => {
                const prompt = btn.dataset.prompt;
                const input = document.getElementById('message-input');
                if (input) {
                    input.value = prompt;
                    autoResizeTextarea();
                    sendMessage();
                }
            });
        });

        // 输入框
        const messageInput = document.getElementById('message-input');
        messageInput?.addEventListener('input', autoResizeTextarea);
        messageInput?.addEventListener('keydown', handleInputKeydown);

        // 发送按钮 - 支持打断功能
        const sendBtn = document.getElementById('send-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                // 如果正在处理中，点击则打断
                if (sendBtn.classList.contains('processing')) {
                    cancelCurrentRequest();
                } else {
                    sendMessage();
                }
            });
        }

        // 文件上传（支持所有文件类型，包括图片）
        document.getElementById('upload-btn')?.addEventListener('click', () => {
            document.getElementById('file-input')?.click();
        });
        document.getElementById('file-input')?.addEventListener('change', handleFileUpload);

        // 语音输入
        document.getElementById('voice-btn')?.addEventListener('click', startVoiceInput);

        // 网络搜索
        document.getElementById('search-btn')?.addEventListener('click', toggleWebSearch);

        // 工具
        document.getElementById('tools-btn')?.addEventListener('click', () => {
            window.AIAgentUI?.openModal?.('tools-modal');
        });

        // 新建任务按钮
        document.getElementById('new-task-btn')?.addEventListener('click', () => {
            window.AIAgentUI?.showCreateTaskDialog?.();
        });

        // 新建计划按钮
        document.getElementById('new-plan-btn')?.addEventListener('click', () => {
            window.AIAgentUI?.showCreatePlanDialog?.();
        });

        // Sub Agent按钮（已移到顶部栏）
        document.getElementById('subagent-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            showSubAgentSelector();
        });

        // 工具项
        document.querySelectorAll('.tool-item').forEach(item => {
            item.addEventListener('click', () => handleToolAction(item.dataset.tool));
        });

        // 数据管理
        document.getElementById('export-data-btn')?.addEventListener('click', exportData);
        document.getElementById('import-data-btn')?.addEventListener('click', () => {
            document.getElementById('import-file-input')?.click();
        });
        document.getElementById('import-file-input')?.addEventListener('change', importData);
        document.getElementById('clear-data-btn')?.addEventListener('click', clearAllData);

        // 消息操作按钮事件委托（修复复制和下载按钮无法点击的问题）
        const messagesContainer = document.getElementById('messages-list') || document.getElementById('messages-container');
        if (messagesContainer) {
            messagesContainer.addEventListener('click', (e) => {
                // 处理消息操作按钮（复制、下载等）
                const btn = e.target.closest('.msg-action-btn');
                if (btn) {
                    const action = btn.dataset.action;
                    const messageId = btn.dataset.messageId;

                    if (!action || !messageId) return;

                    e.stopPropagation();
                    e.preventDefault();

                    // 根据action调用相应的函数
                    switch (action) {
                        case 'copy':
                            if (window.AIAgentUI?.copyMessage) {
                                window.AIAgentUI.copyMessage(messageId);
                            }
                            break;
                        case 'download':
                            if (window.AIAgentUI?.downloadMessage) {
                                window.AIAgentUI.downloadMessage(messageId);
                            }
                            break;
                        case 'speak':
                            if (window.AIAgentUI?.speakMessage) {
                                window.AIAgentUI.speakMessage(messageId);
                            }
                            break;
                        case 'regenerate':
                            if (window.AIAgentUI?.regenerateMessage) {
                                window.AIAgentUI.regenerateMessage(messageId);
                            }
                            break;
                        case 'edit':
                            if (window.AIAgentUI?.editMessage) {
                                window.AIAgentUI.editMessage(messageId);
                            }
                            break;
                        case 'delete':
                            if (window.AIAgentUI?.deleteMessage) {
                                window.AIAgentUI.deleteMessage(messageId);
                            }
                            break;
                    }
                    return;
                }
                
                // 处理PDF下载按钮
                const pdfBtn = e.target.closest('.pdf-download-btn');
                if (pdfBtn) {
                    e.stopPropagation();
                    e.preventDefault();
                    const pdfId = pdfBtn.dataset.pdfId;
                    if (pdfId && window.AIAgentUI?.downloadAsPDF) {
                        window.AIAgentUI.downloadAsPDF(pdfId);
                    }
                    return;
                }
                
                // 处理DOC下载按钮
                const docBtn = e.target.closest('.doc-download-btn');
                if (docBtn) {
                    e.stopPropagation();
                    e.preventDefault();
                    const docId = docBtn.dataset.docId;
                    if (docId && window.AIAgentUI?.downloadAsDOC) {
                        window.AIAgentUI.downloadAsDOC(docId);
                    }
                    return;
                }
                
                // 处理CSV下载按钮
                const csvBtn = e.target.closest('.csv-download-btn');
                if (csvBtn) {
                    e.stopPropagation();
                    e.preventDefault();
                    if (window.AIAgentUI?.downloadAsCSV) {
                        window.AIAgentUI.downloadAsCSV(csvBtn);
                    }
                    return;
                }
                
                // 处理H5预览按钮
                const h5PreviewBtn = e.target.closest('.h5-preview-btn');
                if (h5PreviewBtn) {
                    e.stopPropagation();
                    e.preventDefault();
                    if (window.AIAgentUI?.previewH5) {
                        window.AIAgentUI.previewH5(h5PreviewBtn);
                    }
                    return;
                }
                
                // 处理H5下载按钮
                const h5DownloadBtn = e.target.closest('.h5-download-btn');
                if (h5DownloadBtn) {
                    e.stopPropagation();
                    e.preventDefault();
                    if (window.AIAgentUI?.downloadH5) {
                        window.AIAgentUI.downloadH5(h5DownloadBtn);
                    }
                    return;
                }
            });
        }

        // 通用设置
        document.getElementById('setting-theme')?.addEventListener('change', (e) => {
            window.AIAgentApp?.applyTheme?.(e.target.value);
            window.AIAgentUI?.showToast?.('主题已更新', 'success');
        });
        document.getElementById('setting-language')?.addEventListener('change', (e) => {
            window.AIAgentApp?.applyLanguage?.(e.target.value);
            window.AIAgentUI?.showToast?.('语言已更新', 'success');
        });
        document.getElementById('setting-shortcut')?.addEventListener('change', (e) => {
            window.AppState.settings = window.AppState.settings || {};
            window.AppState.settings.sendShortcut = e.target.value;
            window.AIAgentApp?.saveState?.();
            window.AIAgentUI?.showToast?.('快捷键已更新', 'success');
        });
        document.getElementById('setting-font-size')?.addEventListener('change', (e) => {
            window.AppState.settings = window.AppState.settings || {};
            window.AppState.settings.fontSize = e.target.value;
            document.body.classList.remove('font-small', 'font-large');
            if (e.target.value !== 'medium') {
                document.body.classList.add(`font-${e.target.value}`);
            }
            window.AIAgentApp?.saveState?.();
            window.AIAgentUI?.showToast?.('字体大小已更新', 'success');
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') window.AIAgentUI?.closeAllModals?.();
        });

        // 页面可见性变化 - 支持后台运行
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                // 页面隐藏时保存状态
                window.AIAgentApp?.saveState?.();
                // 标记为后台运行状态
                window.AppState.isBackground = true;
            } else {
                // 页面显示时恢复
                window.AppState.isBackground = false;
                // 检查是否有未完成的任务
                checkPendingTasks();
            }
        });

        // 窗口关闭前保存
        window.addEventListener('beforeunload', () => {
            window.AIAgentApp?.saveState?.();
        });
        
        // 页面失焦/获得焦点事件（额外支持）
        window.addEventListener('blur', () => {
            window.AppState.isBackground = true;
        });
        
        window.addEventListener('focus', () => {
            window.AppState.isBackground = false;
            checkPendingTasks();
        });
        
        // 检查待处理任务
        function checkPendingTasks() {
            // 检查是否有正在进行的LLM请求
            if (window.LLMService?.currentController) {
                // 请求仍在进行，继续处理
                return;
            }
            
            // 可以在这里添加其他后台任务检查逻辑
        }
    }

    // ==================== SubAgent选择器 ====================
    function showSubAgentSelector() {
        const subAgents = window.AppState?.subAgents || {};
        const currentAgent = window.AppState?.currentSubAgent || 'general';
        
        // 使用专门的subagent-modal
        const subagentList = document.getElementById('subagent-list');
        if (!subagentList) {
            window.Logger?.warn('subagent-list element not found');
            return;
        }
        
        let html = '';
        Object.values(subAgents).forEach(agent => {
            const isActive = agent.id === currentAgent;
            html += `
                <div class="subagent-item ${isActive ? 'active' : ''}" data-id="${agent.id}">
                    <div class="subagent-icon"><i class="fas ${agent.icon || 'fa-robot'}"></i></div>
                    <div class="subagent-info">
                        <div class="subagent-name">${agent.name}</div>
                        <div class="subagent-desc">${agent.description || ''}</div>
                    </div>
                </div>
            `;
        });
        subagentList.innerHTML = html;
        
        // 打开专门的subagent-modal
        window.AIAgentUI?.openModal?.('subagent-modal');
        
        // 绑定点击事件
        document.querySelectorAll('#subagent-list .subagent-item').forEach(item => {
            item.addEventListener('click', () => {
                const agentId = item.dataset.id;
                const result = window.AIAgentApp?.switchSubAgent?.(agentId);
                if (result) {
                    window.AIAgentUI?.closeModal?.('subagent-modal');
                    window.AIAgentUI?.showToast?.('已切换到: ' + (subAgents[agentId]?.name || '通用助手'), 'success');
                    updateAgentName();
                }
            });
        });
    }

    // ==================== 侧边栏 ====================
    function toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        
        if (window.innerWidth <= 768) {
            sidebar?.classList.toggle('open');
            overlay?.classList.toggle('show');
        }
    }

    function closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        
        sidebar?.classList.remove('open');
        overlay?.classList.remove('show');
    }

    // ==================== 模式切换 ====================
    function switchMode(mode) {
        window.AppState.currentMode = mode;
        
        document.querySelectorAll('.mode-option').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        updateModeBadge();
        window.AIAgentApp?.saveState?.();
        
        const modeActions = {
            chat: () => window.AIAgentUI?.showToast?.('切换到对话模式', 'success'),
            task: () => openTaskModal(),
            plan: () => openPlanModal(),
            creative: () => window.AIAgentUI?.showToast?.('切换到创意模式', 'success'),
            creation: () => window.AIAgentUI?.showToast?.('切换到创作模式', 'success')
        };
        
        modeActions[mode]?.();
    }

    function openTaskModal() {
        window.AIAgentUI?.renderTasks?.();
        window.AIAgentUI?.openModal?.('task-modal');
    }

    function openPlanModal() {
        window.AIAgentUI?.renderPlans?.();
        window.AIAgentUI?.openModal?.('plan-modal');
    }

    // ==================== 新建对话 ====================
    function createNewChat() {
        const chatId = 'chat_' + Date.now();
        const newChat = {
            id: chatId,
            title: '新对话',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        if (!window.AppState.chats) window.AppState.chats = [];
        window.AppState.chats.unshift(newChat);
        window.AppState.currentChatId = chatId;
        window.AppState.messages = [];

        window.AIAgentUI?.renderChatHistory?.();
        window.AIAgentUI?.showWelcomeScreen?.();

        closeSidebar();
        window.AIAgentApp?.saveState?.();
        window.AIAgentUI?.showToast?.('新建对话成功', 'success');
    }

    // ==================== 加载对话 ====================
    function loadChat(chatId) {
        const chat = window.AppState.chats?.find(c => c.id === chatId);
        if (!chat) return;

        window.AppState.currentChatId = chatId;
        window.AppState.messages = chat.messages || [];

        if ((window.AppState.messages || []).length === 0) {
            window.AIAgentUI?.showWelcomeScreen?.();
        } else {
            window.AIAgentUI?.renderMessages?.();
        }

        closeSidebar();
        window.AIAgentApp?.saveState?.();
    }

    // ==================== 取消当前请求 ====================
    function cancelCurrentRequest() {
        const sendBtn = document.getElementById('send-btn');
        if (!sendBtn) return;
        
        // 如果按钮不在processing状态，直接返回
        if (!sendBtn.classList.contains('processing')) {
            return;
        }
        
        // 中断LLM请求
        if (window.LLMService?.currentController) {
            try {
                window.LLMService.currentController.abort();
            } catch (e) {
                window.Logger?.warn('中断请求时出错:', e);
            }
            window.LLMService.currentController = null;
        }
        
        // 立即更新按钮状态（确保UI立即响应）
        sendBtn.classList.remove('processing');
        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
        sendBtn.title = '发送';
        
        // 隐藏搜索状态
        window.AIAgentUI?.hideSearchStatus?.();
        
        // 显示提示
        window.AIAgentUI?.showToast?.('已取消请求', 'info');
        
        // 完成流式消息（显示已取消）
        if (window.AIAgentUI?.currentStreamMessageEl) {
            const errorMessageId = 'msg_' + Date.now();
            window.AIAgentUI?.finalizeStreamMessage?.('请求已被用户取消。', '', errorMessageId);
            
            // 添加取消消息到AppState
            const cancelMessage = {
                id: errorMessageId,
                role: 'assistant',
                content: '请求已被用户取消。',
                timestamp: Date.now()
            };
            if (!window.AppState.messages) window.AppState.messages = [];
            window.AppState.messages.push(cancelMessage);
            updateCurrentChat();
            window.AIAgentApp?.saveState?.();
        }
        
        // 清理流式消息引用
        if (window.AIAgentUI) {
            window.AIAgentUI.currentStreamMessageEl = null;
        }
    }
    
    // ==================== 发送消息 ====================
    async function sendMessage() {
        const input = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');
        if (!input || !sendBtn) return;

        const content = input.value.trim();
        if (!content && (!window.AppState.uploadedFiles || window.AppState.uploadedFiles.length === 0)) return;
        
        // 如果正在处理中，不允许重复发送
        if (sendBtn.classList.contains('processing')) {
            return;
        }
        
        // 更新按钮状态为处理中
        sendBtn.classList.add('processing');
        sendBtn.innerHTML = '<i class="fas fa-stop"></i>';
        sendBtn.title = '点击取消';

        // 创建新对话（如果没有）
        if (!window.AppState.currentChatId) {
            createNewChat();
        }

        // 处理文件附件
        let messageContent = content;
        let attachments = [];
        
        if (window.AppState.uploadedFiles && window.AppState.uploadedFiles.length > 0) {
            const fileContents = window.AppState.uploadedFiles.map(f => {
                return `\n\n【文件：${f.file.name}】\n${f.content}`;
            }).join('');
            
            if (messageContent) {
                messageContent += fileContents;
            } else {
                messageContent = fileContents.substring(2);
            }
            
            attachments = window.AppState.uploadedFiles.map(f => f.attachment);
        }

        // 添加用户消息
        const userMessage = {
            id: 'msg_' + Date.now(),
            role: 'user',
            content: messageContent,
            attachments: attachments,
            timestamp: Date.now()
        };

        if (!window.AppState.messages) window.AppState.messages = [];
        window.AppState.messages.push(userMessage);

        // 清空输入和文件附件
        input.value = '';
        input.style.height = 'auto';
        window.AppState.uploadedFiles = [];
        renderFileAttachments();

        // 更新UI
        window.AIAgentUI?.renderMessages?.();
        updateCurrentChat();
        window.AIAgentApp?.saveState?.();

        // 创建流式消息元素
        window.AIAgentUI?.createStreamMessageElement?.();

        try {
            // 获取响应
            const response = await window.LLMService?.sendMessage?.(
                window.AppState.messages,
                window.AppState.currentModel,
                window.AppState.settings?.webSearchEnabled || false,
                window.AIAgentUI?.streamMessageUpdate
            );

            // 恢复按钮状态
            sendBtn.classList.remove('processing');
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
            sendBtn.title = '发送';
            window.AIAgentUI?.hideSearchStatus?.();

            // 生成消息ID（在finalizeStreamMessage之前生成，确保ID一致）
            const aiMessageId = 'msg_' + Date.now();
            
            // 完成流式消息，传入消息ID确保一致性
            window.AIAgentUI?.finalizeStreamMessage?.(response.content, response.thinking, aiMessageId);

            // 添加AI消息（使用相同的ID）
            const aiMessage = {
                id: aiMessageId,
                role: 'assistant',
                content: response.content,
                thinking: response.thinking,
                timestamp: Date.now()
            };

            window.AppState.messages.push(aiMessage);
            updateCurrentChat();
            window.AIAgentApp?.saveState?.();

        } catch (error) {
            // 恢复按钮状态（无论什么错误都要恢复）
            sendBtn.classList.remove('processing');
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
            sendBtn.title = '发送';
            window.AIAgentUI?.hideSearchStatus?.();
            
            // 检查是否是用户中断
            if (error.message && (error.message.includes('中断') || error.message.includes('取消') || error.name === 'AbortError')) {
                // 用户中断，不显示错误提示
                window.Logger?.info('请求已被用户中断');
                return;
            }
            
            window.ErrorHandler?.handle(error, {
                type: window.ErrorType?.API,
                showToast: true,
                logError: true
            });
            window.AIAgentUI?.showToast?.('发送失败: ' + error.message, 'error');
            // 失败时也生成ID并保存错误消息
            const errorMessageId = 'msg_' + Date.now();
            window.AIAgentUI?.finalizeStreamMessage?.('发送失败，请检查网络连接或API配置后重试。', '', errorMessageId);
            
            // 保存错误消息到AppState
            const errorMessage = {
                id: errorMessageId,
                role: 'assistant',
                content: '发送失败，请检查网络连接或API配置后重试。',
                timestamp: Date.now()
            };
            if (!window.AppState.messages) window.AppState.messages = [];
            window.AppState.messages.push(errorMessage);
            updateCurrentChat();
            window.AIAgentApp?.saveState?.();
        }
    }

    // ==================== 更新当前对话 ====================
    function updateCurrentChat() {
        const chat = window.AppState.chats?.find(c => c.id === window.AppState.currentChatId);
        if (chat) {
            chat.messages = [...(window.AppState.messages || [])];
            chat.updatedAt = Date.now();

            if (chat.messages.length > 0 && chat.title === '新对话') {
                const firstUserMsg = chat.messages.find(m => m.role === 'user');
                if (firstUserMsg) {
                    chat.title = firstUserMsg.content.slice(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '');
                }
            }
        }

        window.AIAgentUI?.renderChatHistory?.();
    }

    // ==================== 输入框处理 ====================
    function autoResizeTextarea() {
        const textarea = document.getElementById('message-input');
        if (!textarea) return;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    function handleInputKeydown(e) {
        const shortcut = window.AppState.settings?.sendShortcut || 'enter';

        if (e.key === 'Enter' && e.shiftKey) {
            return;
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            if (shortcut === 'enter' || (shortcut === 'ctrl-enter' && e.ctrlKey)) {
                e.preventDefault();
                sendMessage();
            }
        }
    }

    // ==================== 文件上传 ====================
    async function handleFileUpload(e) {
        const files = Array.from(e.target.files);
        if (!files || files.length === 0) return;

        // 存储上传的文件（不清空已有文件，支持追加）
        if (!window.AppState.uploadedFiles) {
            window.AppState.uploadedFiles = [];
        }

        const totalFiles = files.length;
        let successCount = 0;
        let failCount = 0;
        const errors = [];

        // 先添加占位项，状态在附件后小字显示，避免 Toast 覆盖输入框
        const baseIndex = window.AppState.uploadedFiles.length;
        for (let i = 0; i < files.length; i++) {
            window.AppState.uploadedFiles.push({
                file: files[i],
                content: null,
                attachment: null,
                status: 'parsing',
                progress: 0
            });
        }
        renderFileAttachments();

        // 逐个处理文件
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const itemIndex = baseIndex + i;
            const updateProgress = (status, progress) => {
                const item = window.AppState.uploadedFiles[itemIndex];
                if (item) {
                    item.status = status;
                    item.progress = progress;
                    renderFileAttachments();
                }
            };
            try {
                updateProgress('parsing', 30);
                await new Promise(r => requestAnimationFrame(r)); // 让解析中状态先渲染
                let content = '';
                let attachment = null;

                // 根据文件类型处理
                if (file.type.startsWith('image/')) {
                    const base64 = await readFileAsBase64(file);
                    attachment = {
                        type: 'image',
                        name: file.name,
                        data: base64
                    };
                    // 使用 RAGManager.parseImage 解析图片（Jina AI + Tesseract OCR 降级）
                    try {
                        const parsedContent = window.RAGManager?.parseImage
                            ? await window.RAGManager.parseImage(file)
                            : null;
                        if (parsedContent && parsedContent.trim().length > 0) {
                            content = parsedContent.startsWith('[') ? parsedContent : `【图片: ${file.name}】\n\n${parsedContent}`;
                        } else {
                            content = `[图片: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(2)} KB\n\n图片已作为附件上传，请根据用户问题分析图片内容。`;
                        }
                    } catch (error) {
                        window.Logger?.error(`图片解析异常: ${file.name}`, error);
                        content = `[图片: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(2)} KB\n\n图片已作为附件上传，请根据用户问题分析图片内容。`;
                    }
                } else if (file.type === 'text/plain' || file.type === 'text/markdown') {
                    content = await readFileAsText(file);
                    attachment = {
                        type: 'file',
                        name: file.name,
                        content: content.substring(0, 1000)
                    };
                } else if (file.type === 'application/pdf') {
                    try {
                        let rawContent;
                        if (window.RAGManager && typeof window.RAGManager.parsePDF === 'function') {
                            rawContent = await window.RAGManager.parsePDF(file);
                        } else {
                            window.Logger?.warn(`RAGManager.parsePDF 不可用，请确保页面已完全加载`);
                            rawContent = null;
                        }
                        
                        // 检查解析结果
                        const errorMarkers = [
                            '[PDF文档:',
                            '(注意：请配置Jina AI',
                            '(注意：PDF内容解析失败',
                            'PDF解析失败',
                            'Jina AI未配置或已禁用'
                        ];
                        const hasErrorMarker = rawContent && errorMarkers.some(m => rawContent.includes(m));
                        const isShortError = rawContent && rawContent.length < 100 && hasErrorMarker;
                        const startsWithError = rawContent && rawContent.trim().startsWith('[PDF文档:');
                        
                        if (!rawContent || isShortError || startsWithError) {
                            const reason = !rawContent ? 'RAGManager 未加载或 API 返回空' : (hasErrorMarker ? 'API 返回错误' : '内容无效');
                            window.Logger?.warn(`PDF解析失败: ${file.name}`, { reason, contentLength: rawContent?.length });
                            content = `[PDF文档: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(2)} KB\n\n${rawContent || 'PDF解析失败。请检查：1) 设置中 Jina AI API 密钥已配置并保存；2) 刷新页面后重试；3) 查看控制台获取详细错误。'}`;
                        } else {
                            window.Logger?.info(`PDF解析成功: ${file.name}, 内容长度: ${rawContent.length} 字符`);
                            content = `【文件: ${file.name}】\n\n${rawContent}`;
                        }
                    } catch (error) {
                        window.Logger?.error(`PDF解析异常: ${file.name}`, error);
                        content = `[PDF文档: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(2)} KB\n\nPDF解析失败: ${error.message}`;
                    }
                    attachment = {
                        type: 'pdf',
                        name: file.name,
                        content: content.substring(0, 1000)
                    };
                } else if (file.type.includes('word') || file.type.includes('document')) {
                    try {
                        content = await window.RAGManager?.parseDOC?.(file);
                        if (!content || content.includes('[Word文档:') || content.includes('注意：')) {
                            // 如果解析失败或返回占位符，使用降级方案
                            content = `[Word文档: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(2)} KB\n\n${content || 'Word文档解析失败，请检查Jina AI配置'}`;
                        }
                    } catch (error) {
                        window.Logger?.error(`Word文档解析失败: ${file.name}`, error);
                        content = `[Word文档: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(2)} KB\n\nWord文档解析失败: ${error.message}`;
                    }
                    attachment = {
                        type: 'doc',
                        name: file.name,
                        content: content.substring(0, 1000)
                    };
                } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
                    content = await parseCSVFile(file);
                    attachment = {
                        type: 'csv',
                        name: file.name,
                        content: content.substring(0, 1000)
                    };
                } else if (file.type.includes('sheet') || file.type.includes('excel') || 
                           file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                    try {
                        content = await window.RAGManager?.parseExcel?.(file);
                        if (!content || content.includes('[电子表格:') || content.includes('注意：')) {
                            // 如果解析失败或返回占位符，使用降级方案
                            content = `[电子表格: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(2)} KB\n(支持CSV格式，Excel文件请转换为CSV后上传)\n\n${content || 'Excel解析失败，请检查Jina AI配置'}`;
                        }
                    } catch (error) {
                        window.Logger?.error(`Excel解析失败: ${file.name}`, error);
                        content = `[电子表格: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(2)} KB\n(支持CSV格式，Excel文件请转换为CSV后上传)\n\nExcel解析失败: ${error.message}`;
                    }
                    attachment = {
                        type: 'excel',
                        name: file.name,
                        content: content.substring(0, 1000)
                    };
                } else if (file.type.includes('presentation') || file.type.includes('powerpoint') ||
                           file.name.endsWith('.ppt') || file.name.endsWith('.pptx')) {
                    try {
                        content = await window.RAGManager?.parsePPT?.(file);
                        if (!content || content.includes('[PowerPoint文档:') || content.includes('注意：')) {
                            // 如果解析失败或返回占位符，使用降级方案
                            content = `[演示文稿: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(2)} KB\n\n${content || 'PPT解析失败，请检查Jina AI配置'}`;
                        }
                    } catch (error) {
                        window.Logger?.error(`PPT解析失败: ${file.name}`, error);
                        content = `[演示文稿: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(2)} KB\n\nPPT解析失败: ${error.message}`;
                    }
                    attachment = {
                        type: 'ppt',
                        name: file.name,
                        content: content.substring(0, 1000)
                    };
                } else if (file.type === 'text/html' || file.name.endsWith('.html') || 
                           file.name.endsWith('.htm') || file.name.endsWith('.h5')) {
                    content = await readFileAsText(file);
                    attachment = {
                        type: 'html',
                        name: file.name,
                        content: content.substring(0, 1000)
                    };
                } else if (file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
                    content = await readFileAsText(file);
                    attachment = {
                        type: 'markdown',
                        name: file.name,
                        content: content.substring(0, 1000)
                    };
                } else {
                    // 默认处理：尝试作为文本读取，失败则只显示文件名
                    try {
                        if (file.type.startsWith('text/') || file.size < 1024 * 1024) {
                            // 小于1MB的文本类型文件，尝试读取内容
                            content = await readFileAsText(file);
                            attachment = {
                                type: 'file',
                                name: file.name,
                                content: content.substring(0, 1000)
                            };
                        } else {
                            content = `[文件: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(2)} KB\n文件类型: ${file.type || '未知'}`;
                            attachment = {
                                type: 'file',
                                name: file.name
                            };
                        }
                    } catch (readError) {
                        window.Logger?.warn(`读取文件 ${file.name} 失败:`, readError);
                        content = `[文件: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(2)} KB\n文件类型: ${file.type || '未知'}`;
                        attachment = {
                            type: 'file',
                            name: file.name
                        };
                    }
                }

                // 更新已占位的文件项
                const item = window.AppState.uploadedFiles[itemIndex];
                if (item) {
                    item.content = content;
                    item.attachment = attachment;
                    item.status = 'loaded';
                    item.progress = 100;
                }
                successCount++;
                renderFileAttachments();

            } catch (error) {
                // 单个文件处理失败，记录错误但继续处理其他文件
                failCount++;
                errors.push(`${file.name}: ${error.message}`);
                window.Logger?.error(`处理文件 ${file.name} 失败:`, error);
                
                // 更新占位项为失败状态
                const failItem = window.AppState.uploadedFiles[itemIndex];
                if (failItem) {
                    failItem.content = `[文件: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(2)} KB\n处理失败: ${error.message}`;
                    failItem.attachment = { type: 'file', name: file.name };
                    failItem.status = 'error';
                    failItem.progress = 0;
                    renderFileAttachments();
                }
            }
        }

        // 在输入框上方显示文件附件（状态在附件后小字显示，不再弹 Toast）
        renderFileAttachments();

        // 清空文件输入，允许再次选择相同文件
        e.target.value = '';
    }

    // 渲染文件附件
    function renderFileAttachments() {
        const container = document.getElementById('file-attachments');
        const containerWrapper = document.getElementById('file-attachments-container');
        if (!container) return;

        const files = window.AppState.uploadedFiles || [];
        
        if (files.length === 0) {
            container.innerHTML = '';
            if (containerWrapper) {
                containerWrapper.style.display = 'none';
            }
            return;
        }
        
        // 显示容器
        if (containerWrapper) {
            containerWrapper.style.display = 'block';
        }

        container.innerHTML = files.map((fileData, index) => {
            const file = fileData.file;
            const fileSize = (file.size / 1024).toFixed(1);
            const iconClass = getFileIcon(file.type, file.name);
            const status = fileData.status || 'loaded';
            const progress = Math.min(100, Math.max(0, fileData.progress ?? 100));
            const statusText = status === 'parsing' ? '解析中' : status === 'loaded' ? '已加载' : '加载失败';
            const showProgress = status === 'parsing';  // 仅解析中显示进度圈
            const showRemove = status === 'loaded' || status === 'error';  // 加载完成/失败显示移除按钮
            
            const circumference = 2 * Math.PI * 8;
            const strokeDash = (progress / 100) * circumference;
            return `
                <div class="file-attachment-item" data-index="${index}" data-status="${status}">
                    <i class="fas ${iconClass} file-icon"></i>
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">${fileSize} KB</span>
                    <span class="file-status-badge${status === 'error' ? ' file-status-error' : ''}${status === 'parsing' ? ' file-status-parsing' : ''}">
                        ${status === 'parsing' ? '<i class="fas fa-spinner fa-spin"></i>' : ''}
                        ${statusText}
                    </span>
                    ${showProgress ? `
                    <span class="file-progress-wrap" title="解析中 ${progress}%">
                        <svg class="file-progress-svg" viewBox="0 0 20 20">
                            <circle class="file-progress-bg" cx="10" cy="10" r="8"/>
                            <circle class="file-progress-fg" cx="10" cy="10" r="8" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference - strokeDash}"/>
                        </svg>
                        <span class="file-progress-num">${progress}%</span>
                    </span>
                    ` : ''}
                    ${showRemove ? `
                    <button type="button" class="file-remove" onclick="removeFileAttachment(${index})" title="移除">
                        <i class="fas fa-times"></i>
                    </button>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    // 获取文件图标
    function getFileIcon(fileType, fileName) {
        if (fileType.startsWith('image/')) return 'fa-image';
        if (fileType === 'application/pdf') return 'fa-file-pdf';
        if (fileType.includes('word') || fileType.includes('document')) return 'fa-file-word';
        if (fileType === 'text/csv' || fileName.endsWith('.csv')) return 'fa-file-csv';
        if (fileType.includes('sheet') || fileType.includes('excel') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) return 'fa-file-excel';
        if (fileType === 'text/plain' || fileName.endsWith('.txt')) return 'fa-file-alt';
        if (fileType === 'text/markdown' || fileName.endsWith('.md')) return 'fa-file-code';
        return 'fa-file';
    }

    // 移除文件附件
    window.removeFileAttachment = function(index) {
        if (window.AppState.uploadedFiles) {
            window.AppState.uploadedFiles.splice(index, 1);
            renderFileAttachments();
        }
    };

    // 解析PDF文件（已废弃，使用RAGManager.parsePDF）
    async function parsePDFFile(file) {
        // 此函数已废弃，现在使用RAGManager.parsePDF来解析PDF
        // 保留此函数以防其他地方调用
        if (window.RAGManager && typeof window.RAGManager.parsePDF === 'function') {
            return await window.RAGManager.parsePDF(file);
        }
        return `[PDF文档: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(2)} KB\n\n注意：请使用RAGManager.parsePDF解析PDF文件`;
    }

    // 解析CSV文件
    async function parseCSVFile(file) {
        try {
            const text = await readFileAsText(file);
            const lines = text.split('\n').filter(line => line.trim());
            const previewLines = lines.slice(0, 10);
            
            let result = `[CSV文件: ${file.name}]\n`;
            result += `总行数: ${lines.length}\n\n`;
            result += `预览前10行:\n`;
            result += previewLines.map((line, i) => `${i + 1}. ${line}`).join('\n');
            
            if (lines.length > 10) {
                result += `\n... 还有 ${lines.length - 10} 行`;
            }
            
            return result;
        } catch (error) {
            window.Logger?.error('CSV解析失败:', error);
            return `[CSV文件: ${file.name}]\n解析失败: ${error.message}`;
        }
    }

    // handleImageUpload函数已移除，图片上传统一通过handleFileUpload处理

    // 辅助函数：读取文件为Base64
    function readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // 辅助函数：读取文件为文本
    function readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    // 发送消息（带内容）
    async function sendMessageWithContent(content) {
        // 创建流式消息元素
        window.AIAgentUI?.createStreamMessageElement?.();

        try {
            // 获取响应
            const response = await window.LLMService?.sendMessage?.(
                window.AppState.messages,
                window.AppState.currentModel,
                window.AppState.settings?.webSearchEnabled || false,
                window.AIAgentUI?.streamMessageUpdate
            );

            // 生成消息ID（在finalizeStreamMessage之前生成，确保ID一致）
            const aiMessageId = 'msg_' + Date.now();
            
            // 完成流式消息，传入消息ID确保一致性
            window.AIAgentUI?.finalizeStreamMessage?.(response.content, response.thinking, aiMessageId);

            // 添加AI消息（使用相同的ID）
            const aiMessage = {
                id: aiMessageId,
                role: 'assistant',
                content: response.content,
                thinking: response.thinking,
                timestamp: Date.now()
            };

            window.AppState.messages.push(aiMessage);
            updateCurrentChat();
            window.AIAgentApp?.saveState?.();

        } catch (error) {
            window.ErrorHandler?.handle(error, {
                type: window.ErrorType?.API,
                showToast: true,
                logError: true
            });
            window.AIAgentUI?.showToast?.('发送失败: ' + error.message, 'error');
            // 失败时也生成ID并保存错误消息
            const errorMessageId = 'msg_' + Date.now();
            window.AIAgentUI?.finalizeStreamMessage?.('发送失败，请检查网络连接或API配置后重试。', '', errorMessageId);
            
            // 保存错误消息到AppState
            const errorMessage = {
                id: errorMessageId,
                role: 'assistant',
                content: '发送失败，请检查网络连接或API配置后重试。',
                timestamp: Date.now()
            };
            if (!window.AppState.messages) window.AppState.messages = [];
            window.AppState.messages.push(errorMessage);
            updateCurrentChat();
            window.AIAgentApp?.saveState?.();
        }
    }

    // ==================== 语音输入 ====================
    function startVoiceInput() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            window.AIAgentUI?.showToast?.('您的浏览器不支持语音输入', 'error');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'zh-CN';
        recognition.continuous = false;
        recognition.interimResults = true;

        const voiceBtn = document.getElementById('voice-btn');
        voiceBtn?.classList.add('active');
        window.AIAgentUI?.showToast?.('正在聆听...', 'info');

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const input = document.getElementById('message-input');
            if (input) {
                input.value = transcript;
                autoResizeTextarea();
            }
        };

        recognition.onerror = (event) => {
            window.ErrorHandler?.handle(event.error, {
                type: window.ErrorType?.UNKNOWN,
                showToast: true,
                logError: true
            });
            window.AIAgentUI?.showToast?.('语音识别失败', 'error');
            voiceBtn?.classList.remove('active');
        };

        recognition.onend = () => {
            voiceBtn?.classList.remove('active');
        };

        recognition.start();
    }

    // ==================== 网络搜索 ====================
    function toggleWebSearch() {
        window.AppState.settings = window.AppState.settings || {};
        window.AppState.settings.webSearchEnabled = !window.AppState.settings.webSearchEnabled;
        
        const btn = document.getElementById('search-btn');
        btn?.classList.toggle('active', window.AppState.settings.webSearchEnabled);
        
        window.AIAgentUI?.showToast?.(
            window.AppState.settings.webSearchEnabled ? '网络搜索已开启' : '网络搜索已关闭',
            'success'
        );
        
        window.AIAgentApp?.saveState?.();
    }

    // ==================== Sub Agent选择 ====================
    function selectSubAgent(agentId) {
        const result = window.AIAgentApp?.switchSubAgent?.(agentId);
        if (!result) {
            window.AIAgentUI?.showToast?.('切换助手失败', 'error');
            return;
        }
        const agent = window.AppState.subAgents?.[agentId];
        
        window.AIAgentUI?.renderSubAgentList?.();
        updateAgentName();
        
        window.AIAgentUI?.showToast?.(`已切换到 ${agent?.name || '通用助手'}`, 'success');
    }

    // ==================== 设置 ====================
    function openSettings() {
        window.AIAgentUI?.renderModelSettings?.();
        window.AIAgentUI?.renderResources?.('rag');
        window.AIAgentUI?.renderResources?.('skills');
        window.AIAgentUI?.renderResources?.('mcp');
        window.AIAgentUI?.renderResources?.('rules');
        window.AIAgentUI?.renderSubAgentsSettings?.();
        window.AIAgentUI?.openModal?.('settings-modal');
        
        // 加载同步配置
        loadSyncConfigUI();
        loadJinaAIConfigUI();
    }

    function switchSettingsTab(tab) {
        // 支持新的菜单项布局
        document.querySelectorAll('.settings-menu-item').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));

        document.querySelector(`.settings-menu-item[data-tab="${tab}"]`)?.classList.add('active');
        document.getElementById(`settings-${tab}`)?.classList.add('active');
        
        // 兼容旧版标签
        document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`.settings-tab[data-tab="${tab}"]`)?.classList.add('active');
    }

    function switchResourceTab(tab) {
        // 支持新的子标签布局
        document.querySelectorAll('.resource-subtab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.resources-subpanel').forEach(p => p.classList.remove('active'));
        
        document.querySelector(`.resource-subtab[data-subtab="${tab}"]`)?.classList.add('active');
        document.getElementById(`resources-${tab}`)?.classList.add('active');
        
        // 兼容旧版标签
        document.querySelectorAll('.resource-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.resources-panel').forEach(p => p.classList.remove('active'));
        document.querySelector(`.resource-tab[data-tab="${tab}"]`)?.classList.add('active');
        document.getElementById(`resources-${tab}`)?.classList.add('active');

        window.AIAgentUI?.renderResources?.(tab);
    }

    // ==================== 添加模型对话框 ====================
    function showAddModelDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'modal active';
        dialog.id = 'add-model-dialog';
        dialog.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>添加自定义模型</h3>
                    <button class="modal-close" onclick="AIAgentUI.closeModal('add-model-dialog')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>模型名称 <span class="required">*</span></label>
                        <input type="text" id="new-model-name" placeholder="例如: GPT-4">
                    </div>
                    <div class="form-group">
                        <label>模型ID <span class="required">*</span></label>
                        <input type="text" id="new-model-id" placeholder="例如: gpt-4">
                    </div>
                    <div class="form-group">
                        <label>供应商 <span class="required">*</span></label>
                        <select id="new-model-provider">
                            <option value="openai">OpenAI</option>
                            <option value="anthropic">Anthropic</option>
                            <option value="deepseek">DeepSeek</option>
                            <option value="glm">智谱AI</option>
                            <option value="kimi">Moonshot</option>
                            <option value="custom">自定义</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>API URL <span class="required">*</span></label>
                        <input type="text" id="new-model-url" placeholder="https://api.example.com/v1/chat/completions">
                    </div>
                    <div class="form-group">
                        <label>API Key</label>
                        <input type="password" id="new-model-key" placeholder="可选">
                    </div>
                    <div class="form-group">
                        <label>描述</label>
                        <input type="text" id="new-model-desc" placeholder="模型描述">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="AIAgentUI.closeModal('add-model-dialog')">取消</button>
                    <button class="btn-primary" id="save-new-model">保存</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        dialog.querySelector('#save-new-model').addEventListener('click', () => {
            const name = dialog.querySelector('#new-model-name').value.trim();
            const id = dialog.querySelector('#new-model-id').value.trim();
            const provider = dialog.querySelector('#new-model-provider').value;
            const url = dialog.querySelector('#new-model-url').value.trim();
            const apiKey = dialog.querySelector('#new-model-key').value.trim();
            const description = dialog.querySelector('#new-model-desc').value.trim();

            if (!name || !id || !url) {
                window.AIAgentUI?.showToast?.('请填写必填项', 'error');
                return;
            }

            const modelConfig = {
                name,
                id,
                provider,
                url,
                description: description || '自定义模型',
                maxTokens: 4096,
                temperature: 0.7
            };

            window.AIAgentApp?.addCustomModel?.(modelConfig);

            if (apiKey) {
                window.AIAgentApp?.setAPIKey?.(id, apiKey);
            }

            window.AIAgentUI?.renderModelSettings?.();
            window.AIAgentUI?.renderModelSelector?.();
            window.AIAgentUI?.closeModal?.('add-model-dialog');
            window.AIAgentUI?.showToast?.('模型已添加', 'success');
        });
    }

    // ==================== 添加资源对话框 ====================
    function showAddResourceDialog(type) {
        // RAG类型使用专门的对话框
        if (type === 'rag') {
            showAddRAGDialog();
            return;
        }

        const names = { mcp: 'MCP服务', rules: '规则' };
        const name = names[type] || type;

        const dialog = document.createElement('div');
        dialog.className = 'modal active';
        dialog.id = 'add-resource-dialog';
        dialog.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>添加${name}</h3>
                    <button class="modal-close" onclick="AIAgentUI.closeModal('add-resource-dialog')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>名称 <span class="required">*</span></label>
                        <input type="text" id="new-resource-name" placeholder="${name}名称">
                    </div>
                    <div class="form-group">
                        <label>描述</label>
                        <input type="text" id="new-resource-desc" placeholder="描述信息">
                    </div>
                    ${type === 'mcp' ? `
                    <div class="form-group">
                        <label>服务URL</label>
                        <input type="text" id="new-resource-url" placeholder="MCP服务URL">
                    </div>
                    ` : ''}
                    ${type === 'rules' ? `
                    <div class="form-group">
                        <label>规则内容</label>
                        <textarea id="new-resource-content" rows="5" placeholder="规则内容"></textarea>
                    </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="AIAgentUI.closeModal('add-resource-dialog')">取消</button>
                    <button class="btn-primary" id="save-new-resource">保存</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        dialog.querySelector('#save-new-resource').addEventListener('click', () => {
            const itemName = dialog.querySelector('#new-resource-name').value.trim();
            const description = dialog.querySelector('#new-resource-desc').value.trim();

            if (!itemName) {
                window.AIAgentUI?.showToast?.('请输入名称', 'error');
                return;
            }

            const newItem = {
                id: type + '_' + Date.now(),
                name: itemName,
                description: description || '',
                enabled: true,
                createdAt: Date.now()
            };

            if (type === 'mcp') {
                newItem.url = dialog.querySelector('#new-resource-url')?.value.trim() || '';
                newItem.type = 'custom';
                newItem.protocol = 'mcp://1.0';
            } else if (type === 'rules') {
                newItem.content = dialog.querySelector('#new-resource-content')?.value.trim() || '';
            }

            if (!window.AppState.resources) window.AppState.resources = {};
            if (!window.AppState.resources[type]) window.AppState.resources[type] = [];
            
            window.AppState.resources[type].push(newItem);
            window.AIAgentApp?.saveState?.();

            window.AIAgentUI?.renderResources?.(type);
            window.AIAgentUI?.closeModal?.('add-resource-dialog');
            window.AIAgentUI?.showToast?.(`${name}已添加`, 'success');
        });
    }

    // ==================== RAG专用对话框（支持文档导入）====================
    function showAddRAGDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'modal active';
        dialog.id = 'add-rag-dialog';
        dialog.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3><i class="fas fa-database"></i> 添加知识库 (RAG)</h3>
                    <button class="modal-close" onclick="AIAgentUI.closeModal('add-rag-dialog')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="rag-import-tabs">
                        <button class="rag-tab active" data-tab="file">
                            <i class="fas fa-file-upload"></i> 上传文件
                        </button>
                        <button class="rag-tab" data-tab="url">
                            <i class="fas fa-link"></i> 网页链接
                        </button>
                        <button class="rag-tab" data-tab="manual">
                            <i class="fas fa-edit"></i> 手动创建
                        </button>
                    </div>
                    
                    <!-- 文件上传 -->
                    <div class="rag-tab-content active" data-tab="file">
                        <div class="file-upload-area" id="rag-file-dropzone">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>拖拽文件到此处，或点击选择文件</p>
                            <span class="file-types">支持: PDF, DOC, DOCX, TXT, MD, HTML</span>
                            <input type="file" id="rag-file-input" accept=".pdf,.doc,.docx,.txt,.md,.html" multiple style="display: none;">
                        </div>
                        <div id="rag-file-list" class="rag-file-list"></div>
                    </div>
                    
                    <!-- 网页链接 -->
                    <div class="rag-tab-content" data-tab="url">
                        <div class="form-group">
                            <label>网页URL</label>
                            <input type="text" id="rag-url-input" placeholder="https://example.com/article">
                            <small>支持文章、文档等网页内容</small>
                        </div>
                        <div class="form-group">
                            <label>知识库名称（可选）</label>
                            <input type="text" id="rag-url-name" placeholder="自动从网页获取标题">
                        </div>
                    </div>
                    
                    <!-- 手动创建 -->
                    <div class="rag-tab-content" data-tab="manual">
                        <div class="form-group">
                            <label>知识库名称 <span class="required">*</span></label>
                            <input type="text" id="rag-manual-name" placeholder="输入知识库名称">
                        </div>
                        <div class="form-group">
                            <label>描述</label>
                            <input type="text" id="rag-manual-desc" placeholder="知识库描述">
                        </div>
                        <div class="form-group">
                            <label>分类</label>
                            <input type="text" id="rag-manual-category" placeholder="例如: 技术文档">
                        </div>
                        <div class="form-group">
                            <label>外部数据源（可多选）</label>
                            <div id="new-rag-external-sources" class="external-sources-editor">
                                <!-- 外部数据源列表 -->
                            </div>
                            <button class="btn-secondary btn-add-ext-src" style="margin-top: 8px; width: 100%;">
                                <i class="fas fa-plus"></i> 添加外部数据源链接
                            </button>
                        </div>
                        <div class="form-group">
                            <label>默认知识内容</label>
                            <textarea id="rag-manual-content" rows="4" placeholder="输入默认知识内容..."></textarea>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="AIAgentUI.closeModal('add-rag-dialog')">取消</button>
                    <button class="btn-primary" id="save-rag-btn">
                        <i class="fas fa-plus"></i> 创建知识库
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // 标签切换
        dialog.querySelectorAll('.rag-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                dialog.querySelectorAll('.rag-tab').forEach(t => t.classList.remove('active'));
                dialog.querySelectorAll('.rag-tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                dialog.querySelector(`.rag-tab-content[data-tab="${tab.dataset.tab}"]`).classList.add('active');
            });
        });

        // 文件上传处理
        const dropzone = dialog.querySelector('#rag-file-dropzone');
        const fileInput = dialog.querySelector('#rag-file-input');
        let selectedFiles = [];

        dropzone.addEventListener('click', () => fileInput.click());
        
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });
        
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            handleRAGFiles(e.dataTransfer.files);
        });

        fileInput.addEventListener('change', (e) => {
            handleRAGFiles(e.target.files);
        });

        function handleRAGFiles(files) {
            selectedFiles = Array.from(files);
            const fileList = dialog.querySelector('#rag-file-list');
            fileList.innerHTML = selectedFiles.map(f => `
                <div class="rag-file-item">
                    <i class="fas fa-file"></i>
                    <span>${f.name}</span>
                    <span class="file-size">(${(f.size / 1024).toFixed(1)} KB)</span>
                </div>
            `).join('');
        }

        // 外部数据源管理
        const extSourcesEditor = dialog.querySelector('#new-rag-external-sources');
        
        function addExternalSourceRow(name = '', url = '') {
            const row = document.createElement('div');
            row.className = 'external-source-edit-item';
            row.innerHTML = `
                <input type="text" class="ext-src-name" placeholder="名称" value="${name}" style="flex: 1;">
                <input type="text" class="ext-src-url" placeholder="https://example.com" value="${url}" style="flex: 2;">
                <button class="btn-icon btn-remove-ext-src" title="删除">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            extSourcesEditor.appendChild(row);
            row.querySelector('.btn-remove-ext-src').addEventListener('click', () => row.remove());
        }
        
        // 绑定添加外部数据源按钮
        dialog.querySelector('.btn-add-ext-src').addEventListener('click', () => {
            addExternalSourceRow();
        });
        
        // 默认添加一个空行
        addExternalSourceRow();

        // 保存按钮
        dialog.querySelector('#save-rag-btn').addEventListener('click', async () => {
            const activeTab = dialog.querySelector('.rag-tab.active').dataset.tab;
            
            if (activeTab === 'file' && selectedFiles.length > 0) {
                for (const file of selectedFiles) {
                    try {
                        await window.RAGManager?.parseDocument?.(file);
                    } catch (error) {
                        window.Logger?.error(`RAG 解析失败: ${file.name}`, error);
                    }
                }
                window.AIAgentUI?.renderResources?.('rag');
                AIAgentUI.closeModal('add-rag-dialog');
            } else if (activeTab === 'url') {
                const url = dialog.querySelector('#rag-url-input').value.trim();
                const name = dialog.querySelector('#rag-url-name').value.trim();
                
                if (!url) {
                    window.AIAgentUI?.showToast?.('请输入URL', 'error');
                    return;
                }
                
                try {
                    const docInfo = await window.RAGManager?.parseURL?.(url);
                    if (docInfo && name) {
                        docInfo.name = name;
                    }
                    window.AIAgentUI?.renderResources?.('rag');
                    AIAgentUI.closeModal('add-rag-dialog');
                } catch (error) {
                    window.AIAgentUI?.showToast?.('获取失败: ' + error.message, 'error');
                }
            } else if (activeTab === 'manual') {
                const name = dialog.querySelector('#rag-manual-name').value.trim();
                const desc = dialog.querySelector('#rag-manual-desc').value.trim();
                const category = dialog.querySelector('#rag-manual-category').value.trim();
                const defaultContent = dialog.querySelector('#rag-manual-content')?.value.trim() || '';
                
                if (!name) {
                    window.AIAgentUI?.showToast?.('请输入知识库名称', 'error');
                    return;
                }
                
                // 收集外部数据源
                const externalSources = [];
                dialog.querySelectorAll('#new-rag-external-sources .external-source-edit-item').forEach(el => {
                    const srcName = el.querySelector('.ext-src-name').value.trim();
                    const srcUrl = el.querySelector('.ext-src-url').value.trim();
                    if (srcName && srcUrl) {
                        externalSources.push({ name: srcName, url: srcUrl, type: 'website' });
                    }
                });
                
                const newRAG = {
                    id: 'rag_' + Date.now(),
                    name,
                    description: desc || '',
                    category: category || '其他',
                    documents: [],
                    protocol: 'rag://1.0',
                    supportedTypes: ['pdf', 'doc', 'docx', 'txt', 'md', 'html', 'url'],
                    enabled: true,
                    createdAt: Date.now(),
                    externalSources,
                    defaultContent
                };
                
                if (!window.AppState.resources) window.AppState.resources = {};
                if (!window.AppState.resources.rag) window.AppState.resources.rag = [];
                window.AppState.resources.rag.push(newRAG);
                window.AIAgentApp?.saveState?.();
                
                window.AIAgentUI?.renderResources?.('rag');
                AIAgentUI.closeModal('add-rag-dialog');
                window.AIAgentUI?.showToast?.('知识库已创建', 'success');
            }
        });
    }

    // ==================== SKILL.md 范式支持 ====================
    function showAddSkillDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'modal active';
        dialog.id = 'add-skill-dialog';
        dialog.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>添加技能 (SKILL.md)</h3>
                    <button class="modal-close" onclick="AIAgentUI.closeModal('add-skill-dialog')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>SKILL.md 内容</label>
                        <textarea id="new-skill-md" rows="12" style="font-family: monospace; font-size: 11px;" placeholder="# 技能名称

\`\`\`yaml
name: 技能名称
description: 技能描述
version: 1.0.0
author: 作者
tags: tag1, tag2
\`\`\`

## 描述

详细描述...

## 提示词

\`\`\`
提示词内容...
\`\`\`">${getDefaultSkillMDTemplate()}</textarea>
                        <small>支持标准SKILL.md格式</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="AIAgentUI.closeModal('add-skill-dialog')">取消</button>
                    <button class="btn-primary" id="save-new-skill">保存</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        dialog.querySelector('#save-new-skill').addEventListener('click', () => {
            const skillMD = dialog.querySelector('#new-skill-md').value.trim();

            if (!skillMD) {
                window.AIAgentUI?.showToast?.('请输入SKILL.md内容', 'error');
                return;
            }

            const skill = window.AIAgentUI?.parseSkillMD?.(skillMD);
            
            if (!skill || !skill.name) {
                window.AIAgentUI?.showToast?.('SKILL.md格式错误，请检查', 'error');
                return;
            }

            const newItem = {
                id: 'skills_' + Date.now(),
                name: skill.name,
                description: skill.description || '',
                skillMD: skillMD,
                prompt: skill.prompt || '',
                enabled: true,
                createdAt: Date.now()
            };

            if (!window.AppState.resources) window.AppState.resources = {};
            if (!window.AppState.resources.skills) window.AppState.resources.skills = [];
            
            window.AppState.resources.skills.push(newItem);
            window.AIAgentApp?.saveState?.();

            window.AIAgentUI?.renderResources?.('skills');
            window.AIAgentUI?.closeModal?.('add-skill-dialog');
            window.AIAgentUI?.showToast?.('技能已添加', 'success');
        });
    }

    function getDefaultSkillMDTemplate() {
        return `# 代码审查专家

\`\`\`yaml
name: 代码审查专家
description: 专业的代码审查助手
version: 1.0.0
author: AI Agent Pro
tags: code, review, quality
\`\`\`

## 描述

你是一位专业的代码审查专家，擅长发现代码中的问题和改进点。

## 提示词

你是一位资深的代码审查专家。你的任务是审查用户提供的代码，并从以下几个方面进行分析：

1. **代码质量**: 检查代码是否符合最佳实践
2. **性能优化**: 识别性能瓶颈
3. **安全性**: 检查安全漏洞
4. **可读性**: 评估代码可读性

请以结构化的方式输出审查结果。`;
    }

    // ==================== 添加Sub Agent对话框 ====================
    function showAddSubAgentDialog() {
        // 获取可用资源
        const resources = window.AppState.resources || {};
        const skills = resources.skills || [];
        const rules = resources.rules || [];
        const mcp = resources.mcp || [];
        const rag = resources.rag || [];

        const dialog = document.createElement('div');
        dialog.className = 'modal active';
        dialog.id = 'add-subagent-dialog';
        dialog.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>添加自定义 Sub Agent</h3>
                    <button class="modal-close" onclick="AIAgentUI.closeModal('add-subagent-dialog')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>助手ID <span class="required">*</span></label>
                        <input type="text" id="new-subagent-id" placeholder="唯一标识，如: my_agent">
                    </div>
                    <div class="form-group">
                        <label>名称 <span class="required">*</span></label>
                        <input type="text" id="new-subagent-name" placeholder="助手名称">
                    </div>
                    <div class="form-group">
                        <label>描述</label>
                        <input type="text" id="new-subagent-desc" placeholder="助手描述">
                    </div>
                    <div class="form-group">
                        <label>系统提示词</label>
                        <textarea id="new-subagent-system" rows="4" placeholder="系统提示词，定义助手的行为"></textarea>
                    </div>
                    <div class="form-group">
                        <label>图标</label>
                        <select id="new-subagent-icon">
                            <option value="fa-robot">机器人</option>
                            <option value="fa-user-tie">专业人士</option>
                            <option value="fa-code">程序员</option>
                            <option value="fa-paint-brush">创意</option>
                            <option value="fa-brain">思考</option>
                            <option value="fa-lightbulb">灵感</option>
                        </select>
                    </div>
                    
                    <!-- 资源选择 -->
                    <div class="form-group">
                        <label>关联资源</label>
                        <div class="subagent-resources-section">
                            ${skills.length > 0 ? `
                            <div class="resource-checkbox-group">
                                <h5><i class="fas fa-magic"></i> Skills (${skills.length})</h5>
                                <div class="resource-checkbox-list">
                                    ${skills.map(s => `
                                        <label class="resource-checkbox-item">
                                            <input type="checkbox" name="subagent-skill" value="${s.id}">
                                            <span class="custom-checkbox"></span>
                                            <span class="checkbox-text">${s.name}</span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                            ` : ''}
                            ${rules.length > 0 ? `
                            <div class="resource-checkbox-group">
                                <h5><i class="fas fa-list-check"></i> Rules (${rules.length})</h5>
                                <div class="resource-checkbox-list">
                                    ${rules.map(r => `
                                        <label class="resource-checkbox-item">
                                            <input type="checkbox" name="subagent-rule" value="${r.id}">
                                            <span class="custom-checkbox"></span>
                                            <span class="checkbox-text">${r.name}</span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                            ` : ''}
                            ${mcp.length > 0 ? `
                            <div class="resource-checkbox-group">
                                <h5><i class="fas fa-plug"></i> MCP (${mcp.length})</h5>
                                <div class="resource-checkbox-list">
                                    ${mcp.map(m => `
                                        <label class="resource-checkbox-item">
                                            <input type="checkbox" name="subagent-mcp" value="${m.id}">
                                            <span class="custom-checkbox"></span>
                                            <span class="checkbox-text">${m.name}</span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                            ` : ''}
                            ${rag.length > 0 ? `
                            <div class="resource-checkbox-group">
                                <h5><i class="fas fa-database"></i> RAG知识库 (${rag.length})</h5>
                                <div class="resource-checkbox-list">
                                    ${rag.map(r => `
                                        <label class="resource-checkbox-item">
                                            <input type="checkbox" name="subagent-rag" value="${r.id}">
                                            <span class="custom-checkbox"></span>
                                            <span class="checkbox-text">${r.name}</span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="AIAgentUI.closeModal('add-subagent-dialog')">取消</button>
                    <button class="btn-primary" id="save-new-subagent">保存</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        dialog.querySelector('#save-new-subagent').addEventListener('click', () => {
            const id = dialog.querySelector('#new-subagent-id').value.trim();
            const name = dialog.querySelector('#new-subagent-name').value.trim();
            const description = dialog.querySelector('#new-subagent-desc').value.trim();
            const systemPrompt = dialog.querySelector('#new-subagent-system').value.trim();
            const icon = dialog.querySelector('#new-subagent-icon').value;

            if (!id || !name) {
                window.AIAgentUI?.showToast?.('请填写必填项', 'error');
                return;
            }

            if (window.AppState.subAgents?.[id]) {
                window.AIAgentUI?.showToast?.('助手ID已存在', 'error');
                return;
            }

            // 收集选中的资源
            const selectedSkills = Array.from(dialog.querySelectorAll('input[name="subagent-skill"]:checked')).map(cb => cb.value);
            const selectedRules = Array.from(dialog.querySelectorAll('input[name="subagent-rule"]:checked')).map(cb => cb.value);
            const selectedMCP = Array.from(dialog.querySelectorAll('input[name="subagent-mcp"]:checked')).map(cb => cb.value);
            const selectedRAG = Array.from(dialog.querySelectorAll('input[name="subagent-rag"]:checked')).map(cb => cb.value);

            const config = {
                id,
                name,
                description: description || '',
                systemPrompt: systemPrompt || '你是一个 helpful 的AI助手。',
                icon,
                capabilities: ['自定义'],
                modelPreference: ['auto'],
                skills: selectedSkills,
                rules: selectedRules,
                mcp: selectedMCP,
                rag: selectedRAG,
                color: '#3b82f6'
            };

            window.AIAgentApp?.addCustomSubAgent?.(config);

            window.AIAgentUI?.renderSubAgentList?.();
            window.AIAgentUI?.renderSubAgentsSettings?.();
            window.AIAgentUI?.closeModal?.('add-subagent-dialog');
            window.AIAgentUI?.showToast?.('助手已添加', 'success');
        });
    }

    // ==================== 工具功能 ====================
    function handleToolAction(tool) {
        const actions = {
            'export-md': exportToMarkdown,
            'export-html': exportToHTML,
            'export-pdf': exportToPDF,
            'share': shareConversation,
            'copy': copyAllMessages,
            'clear': clearConversation,
            'stats': showStats,
            'shortcuts': showShortcuts
        };
        
        actions[tool]?.();
        window.AIAgentUI?.closeModal?.('tools-modal');
    }

    function exportToMarkdown() {
        const messages = window.AppState.messages || [];
        if (messages.length === 0) {
            window.AIAgentUI?.showToast?.('没有可导出的内容', 'error');
            return;
        }

        const filename = `对话_${Date.now()}.md`;
        
        let md = `# 对话记录\n\n`;
        md += `> 导出时间: ${new Date().toLocaleString('zh-CN')}\n\n`;
        md += `---\n\n`;

        messages.forEach(msg => {
            const role = msg.role === 'user' ? '**我**' : '**AI**';
            md += `## ${role}\n\n${msg.content}\n\n`;
            if (msg.thinking) {
                md += `> **思考过程**: ${msg.thinking}\n\n`;
            }
            md += `---\n\n`;
        });

        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        // 显示导出成功对话框，包含文件路径信息
        showExportSuccessDialog(filename, 'Markdown');
    }

    function exportToHTML() {
        const messages = window.AppState.messages || [];
        if (messages.length === 0) {
            window.AIAgentUI?.showToast?.('没有可导出的内容', 'error');
            return;
        }

        const filename = `对话_${Date.now()}.html`;
        
        let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>对话记录</title>
    <style>
        body { font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
        .message { margin: 20px 0; padding: 15px; border-radius: 8px; }
        .user { background: #e3f2fd; }
        .assistant { background: #f5f5f5; }
        .header { font-weight: bold; margin-bottom: 10px; }
        .thinking { color: #666; font-style: italic; margin: 10px 0; padding: 10px; background: #fafafa; border-left: 3px solid #2196f3; }
    </style>
</head>
<body>
    <h1>对话记录</h1>
    <p>导出时间: ${new Date().toLocaleString('zh-CN')}</p>
    <hr>`;

        messages.forEach(msg => {
            html += `
    <div class="message ${msg.role}">
        <div class="header">${msg.role === 'user' ? '我' : 'AI'}</div>
        <div>${msg.content.replace(/\n/g, '<br>')}</div>
        ${msg.thinking ? `<div class="thinking">思考: ${msg.thinking}</div>` : ''}
    </div>`;
        });

        html += `
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        // 显示导出成功对话框
        showExportSuccessDialog(filename, 'HTML');
    }

    function exportToPDF() {
        window.AIAgentUI?.showToast?.('PDF导出功能需要后端支持', 'info');
    }

    function showExportSuccessDialog(filename, format) {
        const dialog = document.createElement('div');
        dialog.className = 'modal active';
        dialog.id = 'export-success-dialog';
        dialog.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3><i class="fas fa-check-circle" style="color: var(--success-color);"></i> 导出成功</h3>
                    <button class="modal-close" onclick="AIAgentUI.closeModal('export-success-dialog')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="export-info">
                        <div class="export-info-item">
                            <span class="export-info-label">文件名:</span>
                            <span class="export-info-value">${filename}</span>
                        </div>
                        <div class="export-info-item">
                            <span class="export-info-label">格式:</span>
                            <span class="export-info-value">${format}</span>
                        </div>
                        <div class="export-info-item">
                            <span class="export-info-label">保存位置:</span>
                            <span class="export-info-value">浏览器下载文件夹</span>
                        </div>
                    </div>
                    <p class="export-hint">
                        <i class="fas fa-info-circle"></i>
                        文件已保存到浏览器的默认下载位置。您可以在浏览器设置中更改下载路径。
                    </p>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="AIAgentUI.closeModal('export-success-dialog')">关闭</button>
                    <button class="btn-primary" onclick="AIAgentUI.closeModal('export-success-dialog'); window.AIAgentUI?.showToast?.('请在浏览器的下载管理中查看文件', 'info')">
                        <i class="fas fa-folder-open"></i> 打开下载管理
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);
    }

    function shareConversation() {
        const messages = window.AppState.messages || [];
        if (messages.length === 0) {
            window.AIAgentUI?.showToast?.('没有可分享的内容', 'error');
            return;
        }

        const shareText = messages.map(m => `${m.role === 'user' ? '我' : 'AI'}: ${m.content.substring(0, 100)}${m.content.length > 100 ? '...' : ''}`).join('\n\n');

        if (navigator.share) {
            navigator.share({
                title: 'AI Agent Pro 对话',
                text: shareText
            });
        } else {
            navigator.clipboard.writeText(shareText).then(() => {
                window.AIAgentUI?.showToast?.('已复制到剪贴板', 'success');
            });
        }
    }

    function copyAllMessages() {
        const messages = window.AppState.messages || [];
        if (messages.length === 0) {
            window.AIAgentUI?.showToast?.('没有可复制的内容', 'error');
            return;
        }

        const text = messages.map(m => `${m.role === 'user' ? '我' : 'AI'}: ${m.content}`).join('\n\n');
        navigator.clipboard.writeText(text).then(() => {
            window.AIAgentUI?.showToast?.('已复制全部消息', 'success');
        });
    }

    function clearConversation() {
        if (!confirm('确定要清空当前对话吗？')) return;

        window.AppState.messages = [];
        window.AIAgentUI?.showWelcomeScreen?.();
        updateCurrentChat();
        window.AIAgentApp?.saveState?.();
        window.AIAgentUI?.showToast?.('对话已清空', 'success');
    }

    function showStats() {
        const chats = window.AppState.chats || [];
        const messages = chats.reduce((sum, c) => sum + (c.messages?.length || 0), 0);
        
        window.AIAgentUI?.showToast?.(`对话: ${chats.length} | 消息: ${messages}`, 'info');
    }

    function showShortcuts() {
        const shortcuts = [
            'Enter - 发送消息',
            'Shift + Enter - 换行',
            'Esc - 关闭弹窗'
        ];
        alert(shortcuts.join('\n'));
    }

    // ==================== 数据管理 ====================
    function exportData() {
        window.AIAgentApp?.exportData?.();
        window.AIAgentUI?.showToast?.('数据已导出', 'success');
    }

    function importData(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = window.AIAgentApp?.importData?.(event.target.result);
            if (result?.success) {
                window.AIAgentUI?.showToast?.('数据导入成功，页面将刷新', 'success');
                setTimeout(() => location.reload(), 1500);
            } else {
                window.AIAgentUI?.showToast?.(result?.error || '导入失败', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    function clearAllData() {
        if (confirm('确定要清除所有数据吗？此操作不可恢复！')) {
            localStorage.clear();
            window.AIAgentUI?.showToast?.('数据已清除，页面将刷新', 'success');
            setTimeout(() => location.reload(), 1500);
        }
    }

    // ==================== 云同步配置 ====================
    function loadSyncConfigUI() {
        const config = window.AppState.syncConfig || {};
        
        const serverUrlInput = document.getElementById('sync-server-url');
        const apiKeyInput = document.getElementById('sync-api-key');
        const intervalInput = document.getElementById('sync-interval');
        const statusText = document.getElementById('sync-status-text');
        const lastTimeText = document.getElementById('sync-last-time');
        
        if (serverUrlInput) serverUrlInput.value = config.serverUrl || '';
        if (apiKeyInput) apiKeyInput.value = config.apiKey || '';
        if (intervalInput) intervalInput.value = config.interval || 30;
        
        if (statusText) {
            statusText.textContent = config.enabled ? '已配置' : '未配置';
            statusText.style.color = config.enabled ? 'var(--success)' : 'var(--text-tertiary)';
        }
        
        if (lastTimeText) {
            lastTimeText.textContent = config.lastSync 
                ? `上次同步: ${new Date(config.lastSync).toLocaleString('zh-CN')}` 
                : '上次同步: 从未';
        }
        
        // 绑定事件
        document.getElementById('sync-test-btn')?.addEventListener('click', testSyncConnection);
        document.getElementById('sync-save-btn')?.addEventListener('click', saveSyncConfig);
        document.getElementById('sync-now-btn')?.addEventListener('click', syncNow);
    }

    // ==================== Jina AI配置 ====================
    function loadJinaAIConfigUI() {
        const config = window.AppState?.jinaAI || {};
        
        const apiKeyInput = document.getElementById('jina-api-key');
        const enabledCheckbox = document.getElementById('jina-enabled');
        
        if (apiKeyInput) apiKeyInput.value = config.apiKey || '';
        if (enabledCheckbox) enabledCheckbox.checked = config.enabled !== false;
        
        // 绑定事件
        document.getElementById('jina-save-btn')?.addEventListener('click', saveJinaAIConfig);
        document.getElementById('jina-test-btn')?.addEventListener('click', testJinaAIConnection);
    }

    async function testJinaAIConnection() {
        const apiKey = document.getElementById('jina-api-key')?.value.trim();
        
        if (!apiKey) {
            window.AIAgentUI?.showToast?.('请输入Jina AI API密钥', 'error');
            return;
        }
        
        window.AIAgentUI?.showToast?.('正在测试连接...', 'info');
        
        try {
            // 测试一个简单的URL解析请求
            const headers = {
                'X-Return-Format': 'text'
            };
            
            if (apiKey) {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }
            
            const response = await fetch('https://r.jina.ai/http://example.com', {
                method: 'GET',
                headers: headers
            });
            
            if (response.ok) {
                window.AIAgentUI?.showToast?.('Jina AI连接成功', 'success');
            } else if (response.status === 401 || response.status === 403) {
                window.AIAgentUI?.showToast?.('API密钥无效或已过期', 'error');
            } else if (response.status === 429) {
                window.AIAgentUI?.showToast?.('请求频率限制，请稍后重试', 'warning');
            } else {
                window.AIAgentUI?.showToast?.('连接失败: ' + response.status, 'error');
            }
        } catch (error) {
            window.AIAgentUI?.showToast?.('连接失败: ' + error.message, 'error');
        }
    }

    function saveJinaAIConfig() {
        const apiKey = document.getElementById('jina-api-key')?.value.trim();
        const enabled = document.getElementById('jina-enabled')?.checked !== false;
        
        if (window.AIAgentApp && typeof window.AIAgentApp.setJinaAIKey === 'function') {
            window.AIAgentApp.setJinaAIKey(apiKey);
            window.AIAgentApp.setJinaAIEnabled(enabled);
            window.AIAgentUI?.showToast?.('Jina AI配置已保存', 'success');
        } else {
            window.AIAgentUI?.showToast?.('保存失败：AIAgentApp未初始化', 'error');
        }
    }

    async function testSyncConnection() {
        const serverUrl = document.getElementById('sync-server-url')?.value.trim();
        const apiKey = document.getElementById('sync-api-key')?.value.trim();
        
        if (!serverUrl) {
            window.AIAgentUI?.showToast?.('请输入服务器地址', 'error');
            return;
        }
        
        window.AIAgentUI?.showToast?.('正在测试连接...', 'info');
        
        try {
            const response = await fetch(serverUrl + '/health', {
                method: 'GET',
                headers: apiKey ? { 'X-API-Key': apiKey } : {}
            });
            
            if (response.ok) {
                window.AIAgentUI?.showToast?.('连接成功', 'success');
            } else {
                window.AIAgentUI?.showToast?.('连接失败: ' + response.status, 'error');
            }
        } catch (error) {
            window.AIAgentUI?.showToast?.('连接失败: ' + error.message, 'error');
        }
    }

    function saveSyncConfig() {
        const serverUrl = document.getElementById('sync-server-url')?.value.trim();
        const apiKey = document.getElementById('sync-api-key')?.value.trim();
        const interval = parseInt(document.getElementById('sync-interval')?.value) || 30;
        
        window.AppState.syncConfig = {
            serverUrl,
            apiKey,
            interval,
            enabled: !!(serverUrl && apiKey),
            lastSync: window.AppState.syncConfig?.lastSync
        };
        
        window.AIAgentApp?.saveSyncConfig?.();
        loadSyncConfigUI();
        window.AIAgentUI?.showToast?.('同步配置已保存', 'success');
    }

    async function syncNow() {
        const config = window.AppState.syncConfig;
        
        if (!config?.enabled || !config?.serverUrl) {
            window.AIAgentUI?.showToast?.('请先配置同步服务器', 'error');
            return;
        }
        
        window.AIAgentUI?.showToast?.('正在同步...', 'info');
        
        try {
            const response = await fetch(config.serverUrl + '/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': config.apiKey
                },
                body: JSON.stringify({
                    version: window.AIAgentApp?.VERSION,
                    data: {
                        chats: window.AppState.chats,
                        plans: window.AppState.plans,
                        tasks: window.AppState.tasks,
                        settings: window.AppState.settings
                    }
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                window.AppState.syncConfig.lastSync = Date.now();
                window.AIAgentApp?.saveSyncConfig?.();
                loadSyncConfigUI();
                window.AIAgentUI?.showToast?.('同步成功', 'success');
            } else {
                window.AIAgentUI?.showToast?.('同步失败: ' + response.status, 'error');
            }
        } catch (error) {
            window.AIAgentUI?.showToast?.('同步失败: ' + error.message, 'error');
        }
    }

    // ==================== 计划模式事件 ====================
    async function createPlanFromMessage(message) {
        const dialog = document.createElement('div');
        dialog.className = 'modal active';
        dialog.id = 'create-plan-from-msg-dialog';
        dialog.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-magic"></i> 将消息转为计划</h3>
                    <button class="modal-close" onclick="AIAgentUI.closeModal('create-plan-from-msg-dialog')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>计划标题</label>
                        <input type="text" id="plan-from-msg-title" value="${escapeHtml(message.slice(0, 50))}" placeholder="计划标题">
                    </div>
                    <div class="form-group">
                        <label>任务描述</label>
                        <textarea id="plan-from-msg-desc" rows="4">${escapeHtml(message)}</textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="AIAgentUI.closeModal('create-plan-from-msg-dialog')">取消</button>
                    <button class="btn-primary" id="confirm-create-plan">创建计划</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        dialog.querySelector('#confirm-create-plan').addEventListener('click', async () => {
            const title = dialog.querySelector('#plan-from-msg-title').value.trim();
            const description = dialog.querySelector('#plan-from-msg-desc').value.trim();

            if (!title) {
                window.AIAgentUI?.showToast?.('请输入计划标题', 'error');
                return;
            }

            AIAgentUI.closeModal('create-plan-from-msg-dialog');
            window.AIAgentUI?.showToast?.('正在生成计划...', 'info');

            try {
                const plan = await window.PlanManager.createPlan(title, description, {
                    taskType: 'general',
                    enableSkills: true,
                    enableRules: true,
                    enableMCP: true,
                    enableRAG: true
                });

                // 调用AI生成TODO
                const analysisPrompt = window.PlanManager.buildAnalysisPrompt(title, description,
                    window.AIAgentApp.getSubAgentResources(window.AIAgentApp.getCurrentSubAgent().id));

                const result = await window.LLMService.invokeIntelligentAgent(
                    [{ role: 'user', content: analysisPrompt }],
                    { modelId: 'auto', outputFormat: 'markdown' }
                );

                const todos = window.PlanManager.parseTodoList(result.content);
                if (todos.length > 0) {
                    plan.todos = todos;
                    window.PlanManager.updatePlan(plan.id, { todos });
                }

                window.AIAgentUI?.showToast?.(`计划创建成功，包含 ${todos.length} 个任务`, 'success');
                window.AIAgentUI?.showPlanDetail?.(plan.id);
            } catch (error) {
                window.ErrorHandler?.handle(error, {
                    type: window.ErrorType?.API,
                    showToast: true,
                    logError: true
                });
                window.AIAgentUI?.showToast?.('创建计划失败: ' + error.message, 'error');
            }
        });
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ==================== 暴露到全局 ====================
    window.AIAgentEvents = {
        initUI,
        loadChat,
        updateCurrentChat,
        sendMessage,
        createNewChat,
        selectSubAgent,
        openSettings,
        showAddModelDialog,
        showAddResourceDialog,
        showAddSkillDialog,
        showAddSubAgentDialog,
        handleToolAction,
        switchMode,
        createPlanFromMessage,
        showAddRAGDialog,
        openTaskModal,
        openPlanModal,
        toggleSidebar,
        closeSidebar
    };
})();
