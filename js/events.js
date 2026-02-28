/**
 * AI Agent Pro v5.0.0 - 事件处理模块
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
        setTimeout(() => {
            const splash = document.getElementById('splash');
            const app = document.getElementById('app');
            if (splash) {
                splash.classList.add('hidden');
                setTimeout(() => {
                    splash.style.display = 'none';
                    if (app) app.style.display = 'flex';
                    initUI();
                }, 500);
            }
        }, 2000);
    }

    function initUI() {
        if (window.AIAgentUI) {
            window.AIAgentUI.renderChatHistory();
            window.AIAgentUI.updateCurrentModelDisplay();
        }
        
        if (window.AppState.currentChatId) {
            loadChat(window.AppState.currentChatId);
        }
        
        updateAgentName();
        updateModeBadge();
    }

    function updateAgentName() {
        const agentNameEl = document.getElementById('current-agent-name');
        if (agentNameEl) {
            const agent = window.AppState.subAgents?.[window.AppState.currentSubAgent];
            agentNameEl.textContent = agent?.name || '通用助手';
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

        // 发送按钮
        document.getElementById('send-btn')?.addEventListener('click', sendMessage);

        // 文件上传
        document.getElementById('upload-btn')?.addEventListener('click', () => {
            document.getElementById('file-input')?.click();
        });
        document.getElementById('file-input')?.addEventListener('change', handleFileUpload);

        // 图片
        document.getElementById('image-btn')?.addEventListener('click', () => {
            document.getElementById('image-input')?.click();
        });
        document.getElementById('image-input')?.addEventListener('change', handleImageUpload);

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

        // Sub Agent按钮
        document.getElementById('subagent-btn')?.addEventListener('click', () => {
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

        // 页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                window.AIAgentApp?.saveState?.();
            }
        });

        // 窗口关闭前保存
        window.addEventListener('beforeunload', () => {
            window.AIAgentApp?.saveState?.();
        });
    }

    // ==================== SubAgent选择器 ====================
    function showSubAgentSelector() {
        const subAgents = window.AppState?.subAgents || {};
        const currentAgent = window.AppState?.currentSubAgent || 'general';
        
        // 使用专门的subagent-modal
        const subagentList = document.getElementById('subagent-list');
        if (!subagentList) {
            console.error('subagent-list element not found');
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

    // ==================== 发送消息 ====================
    async function sendMessage() {
        const input = document.getElementById('message-input');
        if (!input) return;

        const content = input.value.trim();
        if (!content) return;

        // 创建新对话（如果没有）
        if (!window.AppState.currentChatId) {
            createNewChat();
        }

        // 添加用户消息
        const userMessage = {
            id: 'msg_' + Date.now(),
            role: 'user',
            content: content,
            timestamp: Date.now()
        };

        if (!window.AppState.messages) window.AppState.messages = [];
        window.AppState.messages.push(userMessage);

        // 清空输入
        input.value = '';
        input.style.height = 'auto';

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

            // 完成流式消息
            window.AIAgentUI?.finalizeStreamMessage?.(response.content, response.thinking);

            // 添加AI消息
            const aiMessage = {
                id: 'msg_' + Date.now(),
                role: 'assistant',
                content: response.content,
                thinking: response.thinking,
                timestamp: Date.now()
            };

            window.AppState.messages.push(aiMessage);
            updateCurrentChat();
            window.AIAgentApp?.saveState?.();

        } catch (error) {
            console.error('发送消息失败:', error);
            window.AIAgentUI?.showToast?.('发送失败: ' + error.message, 'error');
            window.AIAgentUI?.finalizeStreamMessage?.('发送失败，请检查网络连接或API配置后重试。', '');
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

        // 创建新对话（如果没有）
        if (!window.AppState.currentChatId) {
            createNewChat();
        }

        // 存储上传的文件
        if (!window.AppState.uploadedFiles) {
            window.AppState.uploadedFiles = [];
        }

        window.AIAgentUI?.showToast?.(`已选择 ${files.length} 个文件，点击"分析文件"按钮开始分析`, 'info');

        try {
            for (const file of files) {
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
                    content = `[图片: ${file.name}]`;
                } else if (file.type === 'text/plain' || file.type === 'text/markdown') {
                    content = await readFileAsText(file);
                    attachment = {
                        type: 'file',
                        name: file.name,
                        content: content.substring(0, 1000)
                    };
                } else if (file.type === 'application/pdf') {
                    content = await parsePDFFile(file);
                    attachment = {
                        type: 'pdf',
                        name: file.name,
                        content: content.substring(0, 1000)
                    };
                } else if (file.type.includes('word') || file.type.includes('document')) {
                    content = `[Word文档: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(2)} KB`;
                    attachment = {
                        type: 'doc',
                        name: file.name
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
                    content = `[电子表格: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(2)} KB\n(支持CSV格式，Excel文件请转换为CSV后上传)`;
                    attachment = {
                        type: 'excel',
                        name: file.name
                    };
                } else {
                    content = `[文件: ${file.name}]`;
                    attachment = {
                        type: 'file',
                        name: file.name
                    };
                }

                window.AppState.uploadedFiles.push({
                    file: file,
                    content: content,
                    attachment: attachment
                });
            }

            // 显示文件列表
            showFileList();

        } catch (error) {
            console.error('文件处理失败:', error);
            window.AIAgentUI?.showToast?.('文件处理失败: ' + error.message, 'error');
        }

        e.target.value = '';
    }

    // 显示文件列表
    function showFileList() {
        const files = window.AppState.uploadedFiles || [];
        if (files.length === 0) return;

        // 创建或更新文件列表UI
        let fileListEl = document.getElementById('file-list-container');
        if (!fileListEl) {
            fileListEl = document.createElement('div');
            fileListEl.id = 'file-list-container';
            fileListEl.className = 'file-list-container';
            const messagesContainer = document.getElementById('messages-container');
            if (messagesContainer) {
                messagesContainer.insertBefore(fileListEl, messagesContainer.firstChild);
            }
        }

        fileListEl.innerHTML = `
            <div class="file-list-header">
                <span><i class="fas fa-paperclip"></i> 已选择 ${files.length} 个文件</span>
                <button class="btn btn-sm btn-primary" id="analyze-files-btn">
                    <i class="fas fa-magic"></i> 分析文件
                </button>
            </div>
            <div class="file-list-items">
                ${files.map((f, i) => `
                    <div class="file-list-item">
                        <input type="checkbox" id="file-check-${i}" class="file-checkbox" checked>
                        <label for="file-check-${i}">
                            <i class="fas fa-file"></i>
                            <span>${f.file.name}</span>
                            <span class="file-size">(${(f.file.size / 1024).toFixed(1)} KB)</span>
                        </label>
                    </div>
                `).join('')}
            </div>
        `;

        // 绑定分析按钮事件
        document.getElementById('analyze-files-btn')?.addEventListener('click', analyzeSelectedFiles);
    }

    // 分析选中的文件
    async function analyzeSelectedFiles() {
        const files = window.AppState.uploadedFiles || [];
        const checkboxes = document.querySelectorAll('.file-checkbox:checked');
        const selectedIndices = Array.from(checkboxes).map(cb => 
            parseInt(cb.id.replace('file-check-', ''))
        );

        if (selectedIndices.length === 0) {
            window.AIAgentUI?.showToast?.('请至少选择一个文件', 'warning');
            return;
        }

        window.AIAgentUI?.showToast?.(`正在分析 ${selectedIndices.length} 个文件...`, 'info');

        // 移除文件列表UI
        const fileListEl = document.getElementById('file-list-container');
        if (fileListEl) fileListEl.remove();

        // 处理选中的文件
        for (const index of selectedIndices) {
            const fileData = files[index];
            if (!fileData) continue;

            const userMessage = {
                id: 'msg_' + Date.now() + '_' + index,
                role: 'user',
                content: `请分析以下文件：\n\n文件名：${fileData.file.name}\n\n内容：\n${fileData.content}`,
                attachments: fileData.attachment ? [fileData.attachment] : [],
                timestamp: Date.now()
            };

            if (!window.AppState.messages) window.AppState.messages = [];
            window.AppState.messages.push(userMessage);
        }

        // 清空已上传文件列表
        window.AppState.uploadedFiles = [];

        // 更新UI
        window.AIAgentUI?.renderMessages?.();
        updateCurrentChat();
        window.AIAgentApp?.debouncedSave?.();

        // 发送消息获取AI回复
        await sendMessageWithContent(`请分析以上 ${selectedIndices.length} 个文件的内容`);
    }

    // 解析PDF文件
    async function parsePDFFile(file) {
        return `[PDF文档: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(2)} KB\n\n注意：完整PDF解析需要PDF.js库支持，当前显示基本信息。\n\n如需完整解析，请：\n1. 将PDF转换为文本格式\n2. 或使用支持PDF的在线工具提取内容后粘贴`;
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
            console.error('CSV解析失败:', error);
            return `[CSV文件: ${file.name}]\n解析失败: ${error.message}`;
        }
    }

    async function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            window.AIAgentUI?.showToast?.('请选择图片文件', 'error');
            return;
        }

        // 创建新对话（如果没有）
        if (!window.AppState.currentChatId) {
            createNewChat();
        }

        window.AIAgentUI?.showToast?.('正在处理图片...', 'info');

        try {
            const base64 = await readFileAsBase64(file);

            // 添加用户消息（带图片附件）
            const userMessage = {
                id: 'msg_' + Date.now(),
                role: 'user',
                content: `[图片: ${file.name}]`,
                attachments: [{
                    type: 'image',
                    name: file.name,
                    data: base64
                }],
                timestamp: Date.now()
            };

            if (!window.AppState.messages) window.AppState.messages = [];
            window.AppState.messages.push(userMessage);

            // 更新UI
            window.AIAgentUI?.renderMessages?.();
            updateCurrentChat();
            window.AIAgentApp?.saveState?.();

            // 自动发送消息获取AI回复
            await sendMessageWithContent('请分析这张图片的内容');

        } catch (error) {
            console.error('图片处理失败:', error);
            window.AIAgentUI?.showToast?.('图片处理失败: ' + error.message, 'error');
        }

        e.target.value = '';
    }

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

            // 完成流式消息
            window.AIAgentUI?.finalizeStreamMessage?.(response.content, response.thinking);

            // 添加AI消息
            const aiMessage = {
                id: 'msg_' + Date.now(),
                role: 'assistant',
                content: response.content,
                thinking: response.thinking,
                timestamp: Date.now()
            };

            window.AppState.messages.push(aiMessage);
            updateCurrentChat();
            window.AIAgentApp?.saveState?.();

        } catch (error) {
            console.error('发送消息失败:', error);
            window.AIAgentUI?.showToast?.('发送失败: ' + error.message, 'error');
            window.AIAgentUI?.finalizeStreamMessage?.('发送失败，请检查网络连接或API配置后重试。', '');
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
            console.error('语音识别错误:', event.error);
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
                // 处理文件上传
                for (const file of selectedFiles) {
                    window.AIAgentUI?.showToast?.(`正在解析: ${file.name}...`, 'info');
                    try {
                        const docInfo = await window.RAGManager?.parseDocument?.(file);
                        if (docInfo) {
                            window.AIAgentUI?.showToast?.(`${file.name} 解析完成`, 'success');
                        }
                    } catch (error) {
                        window.AIAgentUI?.showToast?.(`${file.name} 解析失败: ${error.message}`, 'error');
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
                
                window.AIAgentUI?.showToast?.('正在获取网页内容...', 'info');
                try {
                    const docInfo = await window.RAGManager?.parseURL?.(url);
                    if (docInfo && name) {
                        docInfo.name = name;
                    }
                    window.AIAgentUI?.showToast?.('网页内容已添加', 'success');
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
                console.error('创建计划失败:', error);
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
        openPlanModal
    };
})();
