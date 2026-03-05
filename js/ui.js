/**
 * AI Agent Pro v8.3.2 - UI渲染模块
 * 未来科技感UI
 */

(function() {
    'use strict';

    let currentStreamMessageEl = null;
    let currentStreamContentEl = null;

    // ==================== 对话历史 ====================
    function renderChatHistory() {
        const container = document.getElementById('chat-history');
        if (!container) return;

        container.innerHTML = '';

        const chats = window.AppState.chats || [];
        if (chats.length === 0) {
            container.innerHTML = `
                <div class="empty-history">
                    <i class="fas fa-comments"></i>
                    <p>暂无对话记录</p>
                </div>
            `;
            return;
        }

        const sortedChats = [...chats].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

        sortedChats.forEach(chat => {
            const item = document.createElement('div');
            item.className = 'chat-item' + (chat.id === window.AppState.currentChatId ? ' active' : '');
            item.dataset.chatId = chat.id;

            const time = formatTime(chat.updatedAt);
            const preview = chat.messages?.length > 0
                ? chat.messages[chat.messages.length - 1].content.slice(0, 30) + '...'
                : '暂无消息';

            item.innerHTML = `
                <div class="chat-item-icon">
                    <i class="fas fa-comment"></i>
                </div>
                <div class="chat-item-content">
                    <div class="chat-item-title">${escapeHtml(chat.title || '新对话')}</div>
                    <div class="chat-item-preview">${escapeHtml(preview)}</div>
                </div>
                <div class="chat-item-meta">
                    <span class="chat-item-time">${time}</span>
                    <button class="chat-item-delete" title="删除对话">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            item.addEventListener('click', (e) => {
                if (e.target.closest('.chat-item-delete')) {
                    e.stopPropagation();
                    deleteChat(chat.id);
                } else {
                    window.AIAgentEvents.loadChat(chat.id);
                }
            });

            container.appendChild(item);
        });
    }

    function deleteChat(chatId) {
        if (!confirm('确定要删除这个对话吗？')) return;

        window.AppState.chats = (window.AppState.chats || []).filter(c => c.id !== chatId);

        if (window.AppState.currentChatId === chatId) {
            window.AppState.currentChatId = null;
            window.AppState.messages = [];
            showWelcomeScreen();
        }

        renderChatHistory();
        window.AIAgentApp?.saveState?.();
        showToast('对话已删除', 'success');
    }

    // ==================== 消息渲染 ====================
    function renderMessages() {
        const container = document.getElementById('messages-container');
        const welcomeScreen = document.getElementById('welcome-screen');
        const messagesList = document.getElementById('messages-list');

        if (!container || !welcomeScreen || !messagesList) return;

        const messages = window.AppState.messages || [];

        if (messages.length === 0) {
            welcomeScreen.style.display = 'flex';
            messagesList.style.display = 'none';
            return;
        }

        welcomeScreen.style.display = 'none';
        messagesList.style.display = 'flex';
        messagesList.innerHTML = '';

        messages.forEach(msg => {
            const msgEl = createMessageElement(msg);
            messagesList.appendChild(msgEl);
        });

        scrollToBottom();
    }

    function createMessageElement(msg) {
        const div = document.createElement('div');
        div.className = `message ${msg.role}`;
        div.dataset.messageId = msg.id;

        const isUser = msg.role === 'user';
        const avatar = isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
        const name = isUser ? '我' : (window.AppState.subAgents?.[window.AppState.currentSubAgent]?.name || 'AI助手');

        // 渲染附件：仅显示图标+文件名+大小，不展开内容，点击可预览
        let attachmentsHtml = '';
        if (msg.attachments?.length > 0) {
            const formatSize = (bytes) => {
                if (!bytes) return '';
                if (bytes < 1024) return bytes + ' B';
                if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
                return (bytes / 1024 / 1024).toFixed(1) + ' MB';
            };
            attachmentsHtml = '<div class="message-attachments">' +
                msg.attachments.map((att, idx) => {
                    if (!att) return '';
                    const icon = att.type === 'image' ? 'fa-image' : 'fa-file';
                    const name = escapeHtml(att.name || '附件');
                    const sizeStr = att.size != null ? formatSize(att.size) : '';
                    const sizeHtml = sizeStr ? `<span class="message-attachment-size">${sizeStr}</span>` : '';
                    if (att.type === 'image' && att.data) {
                        return `<div class="message-attachment-item message-attachment-preview" onclick="AIAgentUI.previewImage('${att.data.replace(/'/g, "\\'")}')" title="点击预览">` +
                            `<i class="fas ${icon}"></i> <span class="message-attachment-name">${name}</span>${sizeHtml}</div>`;
                    }
                    const hasContent = att.content && att.content.trim().length > 0;
                    const clickable = hasContent ? ` onclick="AIAgentUI.previewFileAttachment('${msg.id}', ${idx})" title="点击预览"` : ` title="文件名: ${name}"`;
                    return `<div class="message-attachment-item${hasContent ? ' message-attachment-preview' : ''}"${clickable}>` +
                        `<i class="fas ${icon}"></i> <span class="message-attachment-name">${name}</span>${sizeHtml}</div>`;
                }).join('') +
            '</div>';
        }

        // 处理思考过程 - 动态显示（不格式化输出，纯文本）
        let thinkingHtml = '';
        let contentHtml = msg.content;
        
        if (msg.role === 'assistant' && msg.thinking && window.AppState.settings?.showThinking !== false) {
            const thinkingLines = msg.thinking.split('\n').filter(line => line.trim());
            const hasMore = thinkingLines.length > 3;
            
            // 纯文本显示思考过程（不格式化）
            const previewText = thinkingLines.slice(0, 3).join('\n') + (hasMore ? '\n...' : '');
            const fullText = thinkingLines.join('\n');
            
            thinkingHtml = `
                <div class="thinking-section" data-message-id="${msg.id}">
                    <div class="thinking-header" onclick="AIAgentUI.toggleThinking('${msg.id}')">
                        <i class="fas fa-brain"></i>
                        <span>思考过程</span>
                        <span class="thinking-count">${thinkingLines.length} 步</span>
                        <i class="fas fa-chevron-down thinking-toggle-icon" style="margin-left: auto; font-size: 10px;"></i>
                    </div>
                    <div class="thinking-content collapsed">
                        <div class="thinking-preview"><pre>${escapeHtml(previewText)}</pre></div>
                        <div class="thinking-full" style="display: none;"><pre>${escapeHtml(fullText)}</pre></div>
                    </div>
                </div>
            `;
        }

        // 根据任务类型渲染内容
        if (msg.role === 'assistant') {
            const outputFormat = msg.outputFormat || detectOutputFormat(msg.content);
            contentHtml = renderContentByFormat(renderMarkdown(msg.content), outputFormat);
        } else {
            let displayContent = msg.content || '';
            if (msg.attachments?.length > 0) {
                displayContent = displayContent.replace(/【文件[：:][^】]+】[\s\S]*/g, '').trim();
            }
            contentHtml = displayContent ? escapeHtml(displayContent).replace(/\n/g, '<br>') : '';
        }

        // 左下角操作按钮（打开、导出、复制）- 使用data属性而不是onclick
        const leftActions = `
            <button class="msg-action-btn" data-action="open" data-message-id="${msg.id}" title="打开">
                <i class="fas fa-external-link-alt"></i>
            </button>
            <button class="msg-action-btn" data-action="download" data-message-id="${msg.id}" title="导出">
                <i class="fas fa-download"></i>
            </button>
            <button class="msg-action-btn" data-action="copy" data-message-id="${msg.id}" title="复制">
                <i class="fas fa-copy"></i>
            </button>
        `;
        
        // 右侧操作按钮 - 使用data属性而不是onclick
        const rightActions = `
            ${!isUser ? `<button class="msg-action-btn" data-action="speak" data-message-id="${msg.id}" title="语音播放"><i class="fas fa-volume-up"></i></button>` : ''}
            ${!isUser ? `<button class="msg-action-btn" data-action="regenerate" data-message-id="${msg.id}" title="重新生成"><i class="fas fa-redo"></i></button>` : ''}
            <button class="msg-action-btn" data-action="edit" data-message-id="${msg.id}" title="编辑">
                <i class="fas fa-edit"></i>
            </button>
            <button class="msg-action-btn" data-action="delete" data-message-id="${msg.id}" title="删除">
                <i class="fas fa-trash"></i>
            </button>
        `;

        div.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-name">${escapeHtml(name)}</span>
                    <span class="message-time">${formatTime(msg.timestamp)}</span>
                </div>
                ${attachmentsHtml}
                ${thinkingHtml}
                <div class="message-body">${contentHtml}</div>
                <div class="message-actions">
                    <div class="message-actions-left">${leftActions}</div>
                    <div class="message-actions-right">${rightActions}</div>
                </div>
            </div>
        `;

        return div;
    }

    function createStreamMessageElement() {
        const messagesList = document.getElementById('messages-list');
        const welcomeScreen = document.getElementById('welcome-screen');
        
        if (!messagesList) return;

        if (welcomeScreen) welcomeScreen.style.display = 'none';
        messagesList.style.display = 'flex';

        const div = document.createElement('div');
        div.className = 'message assistant streaming';
        div.id = 'stream-message';

        const name = window.AppState.subAgents?.[window.AppState.currentSubAgent]?.name || 'AI助手';

        div.innerHTML = `
            <div class="message-avatar"><i class="fas fa-robot"></i></div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-name">${escapeHtml(name)}</span>
                    <span class="message-time">${formatTime(Date.now())}</span>
                </div>
                <div class="message-body">
                    <div class="search-status search-todo" id="search-status" style="display: none;">
                        <div class="search-todo-steps" id="search-todo-steps"></div>
                    </div>
                    <div class="workflow-step-progress" id="workflow-step-progress" style="display: none;">
                        <div class="workflow-steps" id="workflow-steps"></div>
                    </div>
                    <div class="thinking-indicator">
                        <span class="thinking-dot"></span>
                        <span class="thinking-dot"></span>
                        <span class="thinking-dot"></span>
                    </div>
                    <div class="stream-content"></div>
                </div>
            </div>
        `;

        messagesList.appendChild(div);
        currentStreamMessageEl = div;
        currentStreamContentEl = div.querySelector('.stream-content');
        
        // 存储搜索状态和 Workflow 步骤元素的引用
        window.currentSearchStatusEl = div.querySelector('#search-status');
        window.currentWorkflowProgressEl = div.querySelector('#workflow-step-progress');

        scrollToBottom();
    }
    
    /** 搜索状态 todolist：done=✔, in_progress=转圈, pending=○ */
    function showSearchTodoSteps(steps) {
        if (!window.currentSearchStatusEl) return;
        const container = window.currentSearchStatusEl.querySelector('#search-todo-steps');
        if (!container) return;
        window.currentSearchStatusEl.style.display = 'block';
        container.innerHTML = steps.map((s, i) => {
            let icon = '<i class="far fa-circle search-step-icon"></i>';
            if (s.status === 'done') {
                icon = '<i class="fas fa-check-circle search-step-icon search-step-done"></i>';
            } else if (s.status === 'in_progress') {
                icon = '<i class="fas fa-spinner fa-spin search-step-icon search-step-spin"></i>';
            }
            let detailHtml = '';
            if (s.searchQuery) {
                detailHtml = `<div class="search-query-row"><span class="search-query-label">搜索词：</span><span class="search-query-value">${escapeHtml(s.searchQuery)}</span></div>`;
            } else if (s.detail) {
                detailHtml = ` <span class="search-step-detail">${escapeHtml(s.detail)}</span>`;
            }
            return `<div class="search-todo-item search-todo-${s.status}">${icon}<div class="search-step-content"><span class="search-step-text">${escapeHtml(s.text)}</span>${detailHtml}</div></div>`;
        }).join('');
    }

    /** @deprecated 兼容旧调用，转为单步 todolist */
    function showSearchStatus(text) {
        showSearchTodoSteps([{ status: 'in_progress', text }]);
    }

    function hideSearchStatus() {
        if (window.currentSearchStatusEl) {
            window.currentSearchStatusEl.style.display = 'none';
        }
    }

    /** Workflow 步骤进展：步骤状态 + 部分信息滚动展示，默认折叠，点击展开 */
    function showWorkflowStepProgress(steps) {
        if (!window.currentWorkflowProgressEl) return;
        const container = window.currentWorkflowProgressEl.querySelector('#workflow-steps');
        if (!container) return;
        window.currentWorkflowProgressEl.style.display = 'block';
        const thinkingIndicator = currentStreamMessageEl?.querySelector('.thinking-indicator');
        if (thinkingIndicator) thinkingIndicator.style.display = 'none';
        container.innerHTML = steps.map((s, i) => {
            let icon = '<i class="far fa-circle search-step-icon"></i>';
            if (s.status === 'done') {
                icon = '<i class="fas fa-check-circle search-step-icon search-step-done"></i>';
            } else if (s.status === 'in_progress') {
                icon = '<i class="fas fa-spinner fa-spin search-step-icon search-step-spin"></i>';
            }
            let previewHtml = '';
            const hasPreview = s.preview && s.preview.trim();
            if (hasPreview) {
                const safeTitle = escapeHtml(s.preview.replace(/"/g, '&quot;').substring(0, 300));
                previewHtml = `<div class="workflow-step-preview" title="${safeTitle}">${escapeHtml(s.preview)}</div>`;
            }
            const showToggle = hasPreview && s.status === 'done';
            const toggleIcon = showToggle ? '<i class="fas fa-chevron-right workflow-step-toggle"></i>' : '';
            const agentHtml = s.agentDisplayName ? `<span class="workflow-step-res" title="助手"><i class="fas fa-user-astronaut"></i> ${escapeHtml(s.agentDisplayName)}</span>` : '';
            const ragHtml = (s.rag && s.rag.length) ? `<span class="workflow-step-res" title="RAG"><i class="fas fa-book"></i> ${s.rag.map(n => escapeHtml(n)).join(', ')}</span>` : '';
            const mcpHtml = (s.mcp && s.mcp.length) ? `<span class="workflow-step-res" title="MCP"><i class="fas fa-plug"></i> ${s.mcp.map(n => escapeHtml(n)).join(', ')}</span>` : '';
            const skillHtml = (s.skills && s.skills.length) ? `<span class="workflow-step-res" title="Skills"><i class="fas fa-magic"></i> ${s.skills.map(n => escapeHtml(n)).join(', ')}</span>` : '';
            const resHtml = (agentHtml || ragHtml || mcpHtml || skillHtml) ? `<div class="workflow-step-resources">${agentHtml}${ragHtml}${mcpHtml}${skillHtml}</div>` : '';
            return `<div class="workflow-step-item workflow-step-${s.status}" data-step-index="${i}">${icon}<div class="workflow-step-content"><div class="workflow-step-label-btn"><span class="workflow-step-label">步骤 ${i + 1}/${steps.length}：${escapeHtml(s.agentName)}</span>${toggleIcon}</div>${resHtml}${previewHtml}</div></div>`;
        }).join('');
        container.querySelectorAll('.workflow-step-item').forEach(item => {
            const preview = item.querySelector('.workflow-step-preview');
            const labelBtn = item.querySelector('.workflow-step-label-btn');
            const toggle = item.querySelector('.workflow-step-toggle');
            if (preview && toggle) {
                labelBtn.addEventListener('click', () => item.classList.toggle('workflow-step-expanded'));
            }
        });
        scrollToBottom();
    }

    function hideWorkflowStepProgress() {
        if (window.currentWorkflowProgressEl) {
            window.currentWorkflowProgressEl.style.display = 'none';
        }
    }

    function streamMessageUpdate(content) {
        if (!currentStreamContentEl) return;

        const thinkingIndicator = currentStreamMessageEl?.querySelector('.thinking-indicator');
        if (thinkingIndicator) {
            thinkingIndicator.style.display = 'none';
        }

        currentStreamContentEl.innerHTML = renderMarkdown(content);
        scrollToBottom();
    }

    function finalizeStreamMessage(finalContent, thinking = '', messageId = null) {
        if (!currentStreamMessageEl) return null;

        currentStreamMessageEl.classList.remove('streaming');
        
        // 使用传入的消息ID，如果没有则生成新的
        const msgId = messageId || 'msg_' + Date.now();
        currentStreamMessageEl.dataset.messageId = msgId;

        const messageBody = currentStreamMessageEl.querySelector('.message-body');
        if (messageBody) {
            let thinkingHtml = '';
            if (thinking && window.AppState.settings?.showThinking !== false) {
                // 使用与 createMessageElement 相同的HTML结构
                const thinkingLines = thinking.split('\n').filter(line => line.trim());
                const hasMore = thinkingLines.length > 3;
                const previewText = thinkingLines.slice(0, 3).join('\n') + (hasMore ? '\n...' : '');
                const fullText = thinkingLines.join('\n');
                
                thinkingHtml = `
                    <div class="thinking-section" data-message-id="${msgId}">
                        <div class="thinking-header" onclick="AIAgentUI.toggleThinking('${msgId}')">
                            <i class="fas fa-brain"></i>
                            <span>思考过程</span>
                            <span class="thinking-count">${thinkingLines.length} 步</span>
                            <i class="fas fa-chevron-down thinking-toggle-icon" style="margin-left: auto; font-size: 10px;"></i>
                        </div>
                        <div class="thinking-content collapsed">
                            <div class="thinking-preview"><pre>${escapeHtml(previewText)}</pre></div>
                            <div class="thinking-full" style="display: none;"><pre>${escapeHtml(fullText)}</pre></div>
                        </div>
                    </div>
                `;
            }
            
            // 渲染内容
            const outputFormat = detectOutputFormat(finalContent);
            const contentHtml = renderContentByFormat(renderMarkdown(finalContent), outputFormat);
            
            // 添加操作按钮 - 使用data属性而不是onclick
            const leftActions = `
                <button class="msg-action-btn" data-action="open" data-message-id="${msgId}" title="打开">
                    <i class="fas fa-external-link-alt"></i>
                </button>
                <button class="msg-action-btn" data-action="download" data-message-id="${msgId}" title="导出">
                    <i class="fas fa-download"></i>
                </button>
                <button class="msg-action-btn" data-action="copy" data-message-id="${msgId}" title="复制">
                    <i class="fas fa-copy"></i>
                </button>
            `;
            
            const rightActions = `
                <button class="msg-action-btn" data-action="speak" data-message-id="${msgId}" title="语音播放"><i class="fas fa-volume-up"></i></button>
                <button class="msg-action-btn" data-action="regenerate" data-message-id="${msgId}" title="重新生成"><i class="fas fa-redo"></i></button>
                <button class="msg-action-btn" data-action="edit" data-message-id="${msgId}" title="编辑">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="msg-action-btn" data-action="delete" data-message-id="${msgId}" title="删除">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            
            messageBody.innerHTML = thinkingHtml + contentHtml;
            
            // 添加操作按钮
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'message-actions';
            actionsDiv.innerHTML = `
                <div class="message-actions-left">${leftActions}</div>
                <div class="message-actions-right">${rightActions}</div>
            `;
            messageBody.appendChild(actionsDiv);
        }

        currentStreamMessageEl = null;
        currentStreamContentEl = null;
        window.currentSearchStatusEl = null;
        window.currentWorkflowProgressEl = null;

        scrollToBottom();
        
        // 返回消息ID，供调用者使用
        return msgId;
    }

    // ==================== Markdown渲染 ====================
    function renderMarkdown(text) {
        if (!text) return '';

        // 解码 AI/存储 可能返回的 HTML 实体（如 &lt;strong&gt;金月湾&lt;/strong&gt;），使其能正确渲染
        text = String(text)
            .replace(/&amp;lt;/g, '<').replace(/&amp;gt;/g, '>')
            .replace(/&lt;/g, '<').replace(/&gt;/g, '>');

        // 【关键】先提取图表类代码块（mermaid/chart/decision-matrix 等），必须在通用代码块之前
        // 否则会被通用正则当作普通代码块处理，导致图表无法渲染
        const diagramBlocks = [];
        const diagramRegex = /(```|``)(mermaid|chart|decision-matrix|probability|decision-chain|project-dashboard|problem-evolution|milestones|dependency-graph|risk-matrix|roadmap|task-classification-table|resource-constraints)\s*\n([\s\S]*?)\1/g;
        text = text.replace(diagramRegex, (match, _ticks, dtype, code) => {
            diagramBlocks.push({ type: dtype, raw: match, code: code.trim() });
            return `\x00DIAGRAM${diagramBlocks.length - 1}\x00`;
        });

        // 保存通用代码块，避免被其他规则处理
        // 特殊处理：```json 块若含 project-dashboard 结构（project/owner + timeline/top_risks/status），按仪表板渲染
        const codeBlocks = [];
        text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            const trimmed = code.trim();
            if (lang === 'json' || !lang) {
                let jsonStr = trimmed.replace(/^\s*project-dashboard\s*/i, '').trim();
                if (jsonStr.startsWith('{')) {
                try {
                    const data = parseProjectDashboardJson(trimmed);
                    const d = data['project-dashboard'] || data.projectDashboard || data;
                    const hasProject = !!(d.project || d.项目 || d.owner || d.负责人);
                    const hasDashboardFields = !!(d.timeline || d.时间线 || d.top_risks || d.topRisks || d.风险 || d.status || d.状态);
                    const hasDashboardStructure = !!(d.leverage_points || d.leveragePoints || d.leveragepoints || d.blocker_priority || d.blockerPriority || d.blockerpriority || d.critical_closure || d.criticalClosure || d.criticalclosure || d.management_gaps || d.managementGaps || d.managementgaps || d.key_actions || d.keyActions || d.keyactions || d.resource_load || d.resourceLoad || d.resourceload || d.dependencies || d.blocking_deps || d.blockingDeps || d.blockingdeps || d.cognitive_biases || d.cognitiveBiases || d.cognitivebiases);
                    if ((hasProject && hasDashboardFields) || hasDashboardStructure) {
                        diagramBlocks.push({ type: 'project-dashboard', raw: match, code: trimmed });
                        return `\x00DIAGRAM${diagramBlocks.length - 1}\x00`;
                    }
                } catch (_) { /* 非合法 JSON，按普通代码块处理 */ }
                }
            }
            // 兼容 AI 在 ```html 中输出 diagram-block + 内嵌 JSON 的情况
            if (lang === 'html' && /diagram-block|project-dashboard/i.test(trimmed)) {
                const jsonMatch = trimmed.match(/\{[\s\S]*?"(?:project|项目|owner|负责人)"[\s\S]*?"(?:timeline|时间线|top_risks|status|状态)"[\s\S]*?\}/);
                if (jsonMatch) {
                    try {
                        const data = JSON.parse(sanitizeJsonForParse(jsonMatch[0]));
                        const d = data['project-dashboard'] || data.projectDashboard || data;
                        if (d && (d.project || d.项目 || d.owner || d.负责人)) {
                            diagramBlocks.push({ type: 'project-dashboard', raw: match, code: jsonMatch[0] });
                            return `\x00DIAGRAM${diagramBlocks.length - 1}\x00`;
                        }
                    } catch (_) { /* 解析失败则按代码块显示 */ }
                }
            }
            codeBlocks.push(`<pre class="code-block"><code class="language-${lang || 'text'}">${escapeHtml(trimmed)}</code></pre>`);
            return `\x00CODEBLOCK${codeBlocks.length - 1}\x00`;
        });

        // 行内代码
        text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

        // 粗体
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');

        // 斜体（避免与粗体冲突）
        text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        text = text.replace(/_([^_]+)_/g, '<em>$1</em>');

        // 标题
        text = text.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
        text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        text = text.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        text = text.replace(/^# (.*$)/gim, '<h1>$1</h1>');

        // 处理列表 - 使用行处理以确保正确嵌套
        const lines = text.split('\n');
        const result = [];
        let inUl = false;
        let inOl = false;
        let listStack = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            
            // 检查无序列表项
            const ulMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
            // 检查有序列表项
            const olMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
            
            if (ulMatch) {
                const indent = ulMatch[1].length;
                const content = ulMatch[2];
                
                if (!inUl) {
                    result.push('<ul>');
                    inUl = true;
                }
                result.push(`<li>${content}</li>`);
            } else if (olMatch) {
                const content = olMatch[2];
                
                if (inUl) {
                    result.push('</ul>');
                    inUl = false;
                }
                if (!inOl) {
                    result.push('<ol>');
                    inOl = true;
                }
                result.push(`<li>${content}</li>`);
            } else {
                // 非列表行
                if (inUl) {
                    result.push('</ul>');
                    inUl = false;
                }
                if (inOl) {
                    result.push('</ol>');
                    inOl = false;
                }
                result.push(line);
            }
        }
        
        // 关闭未闭合的列表
        if (inUl) result.push('</ul>');
        if (inOl) result.push('</ol>');
        
        text = result.join('\n');

        // 链接
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

        // 引用块
        text = text.replace(/^>\s+(.*$)/gim, '<blockquote>$1</blockquote>');

        // 水平线
        text = text.replace(/^---+$/gim, '<hr>');

        // 表格处理
        text = renderMarkdownTable(text);

        // 恢复代码块
        text = text.replace(/\x00CODEBLOCK(\d+)\x00/g, (match, index) => codeBlocks[index]);

        // 恢复并渲染图表块（流程图、甘特图、决策矩阵等）
        text = text.replace(/\x00DIAGRAM(\d+)\x00/g, (match, index) => {
            const d = diagramBlocks[index];
            if (!d) return '';
            if (d.type === 'mermaid') return renderMermaid('```mermaid\n' + d.code + '\n```') || d.raw;
            if (d.type === 'chart') return renderChart('```chart\n' + d.code + '\n```') || d.raw;
            if (d.type === 'decision-matrix') return renderDecisionMatrix('```decision-matrix\n' + d.code + '\n```') || d.raw;
            if (d.type === 'probability') return renderProbabilityDistribution('```probability\n' + d.code + '\n```') || d.raw;
            if (d.type === 'decision-chain') return renderDecisionChain('```decision-chain\n' + d.code + '\n```') || d.raw;
            if (d.type === 'project-dashboard') return renderProjectDashboard('```project-dashboard\n' + d.code + '\n```') || d.raw;
            if (d.type === 'problem-evolution') return renderProblemEvolution('```problem-evolution\n' + d.code + '\n```') || d.raw;
            if (d.type === 'milestones') return renderMilestones('```milestones\n' + d.code + '\n```') || d.raw;
            if (d.type === 'dependency-graph') return renderDependencyGraph('```dependency-graph\n' + d.code + '\n```') || d.raw;
            if (d.type === 'risk-matrix') return renderRiskMatrix('```risk-matrix\n' + d.code + '\n```') || d.raw;
            if (d.type === 'roadmap') return renderRoadmap('```roadmap\n' + d.code + '\n```') || d.raw;
            if (d.type === 'task-classification-table') return renderTaskClassificationTable('```task-classification-table\n' + d.code + '\n```') || d.raw;
            if (d.type === 'resource-constraints') return renderResourceConstraints('```resource-constraints\n' + d.code + '\n```') || d.raw;
            return d.raw;
        });

        // 段落和换行处理
        // 将连续换行分隔的文本块包装为段落
        const paragraphs = text.split(/\n\n+/);
        text = paragraphs.map(p => {
            p = p.trim();
            if (!p) return '';
            // 如果已经是块级元素（含 AI 可能输出的 <p>/<div>），不重复包装
            if (p.match(/^<(h[1-6]|ul|ol|pre|blockquote|hr|p|div)/)) return p;
            // 将单个换行转为<br>
            p = p.replace(/\n/g, '<br>');
            return `<p>${p}</p>`;
        }).join('\n');

        // 移除孤儿闭合标签（如 AI 返回的 "有异常</strong>" 中多余的 </strong>）
        text = removeOrphanClosingTags(text);

        return text;
    }

    /** 移除孤儿闭合标签，修复 "xxx有异常</strong>" 等显示异常 */
    function removeOrphanClosingTags(html) {
        if (!html || !/<\/\w+>/.test(html)) return html;
        const tags = ['strong', 'em', 'b', 'i', 'code', 'a'];
        let out = html;
        tags.forEach(tag => {
            const opens = (out.match(new RegExp(`<${tag}(\\s[^>]*)?>`, 'gi')) || []).length;
            const closes = (out.match(new RegExp(`</${tag}>`, 'gi')) || []).length;
            if (closes > opens) {
                for (let n = closes - opens; n > 0; n--) {
                    out = out.replace(new RegExp(`</${tag}>`, 'i'), '');
                }
            }
        });
        return out;
    }

    /** 图表 JSON 解析前预处理：替换弯引号等，避免 Agent 输出导致解析失败 */
    function sanitizeJsonForParse(str) {
        if (typeof str !== 'string') return str;
        str = str.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"').replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'");
        return str;
    }

    /** project-dashboard 专用：更激进的 JSON 容错，处理 AI 常输出的非法格式 */
    function parseProjectDashboardJson(str) {
        if (typeof str !== 'string') return null;
        let s = str.replace(/^\s*project-dashboard\s*/i, '').trim();
        s = s.replace(/,(\s*[}\]])/g, '$1');
        s = sanitizeJsonForParse(s);
        s = s.replace(/"(?:[^"\\]|\\.)*"/g, (m) => {
            const inner = m.slice(1, -1);
            if (!/\r?\n/.test(inner)) return m;
            return '"' + inner.replace(/\r\n/g, '\\n').replace(/\r/g, '\\r').replace(/\n/g, '\\n') + '"';
        });
        s = s.replace(/\}\s*\{/g, '},{').replace(/\]\s*\{/g, '],{').replace(/\}\s*\[/g, '},[').replace(/\]\s*\[/g, '],[');
        s = s.replace(/"\s*\n\s*"/g, '",\n"');
        s = s.replace(/(?<=[a-zA-Z0-9\u4e00-\u9fa5\s])"\s*"/g, '","');
        try {
            return JSON.parse(s);
        } catch (e) {
            s = s.replace(/([^\\])"(?=\s*[a-zA-Z\u4e00-\u9fa5])/g, '$1\\"');
            try { return JSON.parse(s); } catch (_) { /* fall through */ }
            const braceMatch = s.match(/\{[\s\S]*\}/);
            if (braceMatch) {
                try { return JSON.parse(braceMatch[0]); } catch (_) { /* fall through */ }
            }
            throw e;
        }
    }

    // ==================== Markdown表格渲染 ====================
    function renderMarkdownTable(text) {
        // 匹配Markdown表格格式
        // 格式1: | 列1 | 列2 | 列3 |
        // 格式2: 列1\t列2\t列3（TAB分隔，AI 常输出此格式）
        const lines = text.split('\n');
        const result = [];
        let inTable = false;
        let tableLines = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            // TAB 分隔行转为管道格式，便于统一解析
            if (/\t/.test(line) && !/^\s*\|.*\|\s*$/.test(line)) {
                const cells = line.split('\t').map(c => c.trim());
                if (cells.length >= 2) line = '| ' + cells.join(' | ') + ' |';
            }
            // 检查是否是表格行（以|开头和结尾，或包含|）
            const isTableLine = /^\s*\|.*\|\s*$/.test(line);
            
            if (isTableLine) {
                if (!inTable) {
                    inTable = true;
                    tableLines = [];
                }
                tableLines.push(line);
            } else {
                if (inTable) {
                    // 表格结束，渲染表格
                    result.push(renderTableLines(tableLines));
                    inTable = false;
                    tableLines = [];
                }
                result.push(line);
            }
        }
        
        // 处理最后可能未结束的表格
        if (inTable && tableLines.length > 0) {
            result.push(renderTableLines(tableLines));
        }
        
        return result.join('\n');
    }

    /**
     * 表格单元格内容安全处理：允许 Markdown 渲染后的安全标签（strong/em/code/a 等），
     * 移除危险标签和事件属性，避免 <strong>9. 价格与价值</strong> 等被转义显示异常
     */
    function sanitizeTableCellHtml(html) {
        if (!html) return '';
        let str = String(html);
        // 解码 AI 可能返回的 HTML 实体（如 &lt;strong&gt;），使其能正确渲染
        str = str.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        // 无 HTML 标签时直接转义返回
        if (!/<[^>]+>/.test(str)) return escapeHtml(str);
        // 白名单：仅保留 Markdown 常用安全标签（含 br 用于换行）
        const allowedTags = ['strong', 'em', 'b', 'i', 'code', 'a', 'br'];
        let out = str
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
            .replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '');
        // 用占位符保护白名单标签，移除非白名单标签后恢复
        allowedTags.forEach(tag => {
            const open = new RegExp(`<${tag}(\\s[^>]*)?>`, 'gi');
            const close = new RegExp(`</${tag}>`, 'gi');
            out = out.replace(open, `\x00OPEN_${tag}\x00`).replace(close, `\x00CLOSE_${tag}\x00`);
        });
        out = out.replace(/<[^>]+>/g, '');
        allowedTags.forEach(tag => {
            out = out.replace(new RegExp(`\x00OPEN_${tag}\x00`, 'gi'), `<${tag}>`)
                    .replace(new RegExp(`\x00CLOSE_${tag}\x00`, 'gi'), `</${tag}>`);
        });
        return out;
    }

    function renderTableLines(lines) {
        if (lines.length < 2) return lines.join('\n');
        
        // 解析表头
        const headerLine = lines[0].trim();
        const headers = headerLine.split('|').map(h => h.trim()).filter(h => h);
        
        // 跳过分隔线（第二行通常是 |---|---| 格式）
        let dataStartIndex = 1;
        if (lines[1] && /^\s*\|[-:|\s]+\|\s*$/.test(lines[1])) {
            dataStartIndex = 2;
        }
        
        // 解析数据行
        const rows = [];
        for (let i = dataStartIndex; i < lines.length; i++) {
            const cells = lines[i].split('|').map(c => c.trim()).filter((c, idx, arr) => {
                // 过滤掉开头的空元素
                if (idx === 0 && c === '') return false;
                // 过滤掉结尾的空元素
                if (idx === arr.length - 1 && c === '') return false;
                return true;
            });
            if (cells.length > 0) {
                rows.push(cells);
            }
        }
        
        if (headers.length === 0 && rows.length === 0) return lines.join('\n');
        
        // 构建HTML表格
        let html = '<table>';
        
        // 表头：与单元格一致，支持 <strong> 等 Markdown 渲染标签
        if (headers.length > 0) {
            html += '<thead><tr>';
            headers.forEach(header => {
                html += `<th>${sanitizeTableCellHtml(header)}</th>`;
            });
            html += '</tr></thead>';
        }
        
        // 数据行：单元格可能含 Markdown 渲染后的 <strong>/<em>/<code>/<a>，需保留渲染效果而非转义
        if (rows.length > 0) {
            html += '<tbody>';
            rows.forEach(row => {
                html += '<tr>';
                row.forEach((cell) => {
                    html += `<td>${sanitizeTableCellHtml(cell)}</td>`;
                });
                html += '</tr>';
            });
            html += '</tbody>';
        }
        
        html += '</table>';
        return html;
    }

    // ==================== 图表渲染 ====================
    function renderChart(content) {
        // 解析图表数据
        const chartMatch = content.match(/```chart\n([\s\S]*?)```/);
        if (!chartMatch) return null;
        
        try {
            const chartData = JSON.parse(sanitizeJsonForParse(chartMatch[1]));
            const chartId = 'chart-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            
            // 延迟渲染图表（确保DOM已插入）
            setTimeout(() => {
                const ctx = document.getElementById(chartId);
                if (ctx && typeof Chart !== 'undefined') {
                    new Chart(ctx, {
                        type: chartData.type || 'line',
                        data: chartData.data,
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    labels: { color: '#e0e0e0' }
                                }
                            },
                            scales: {
                                x: {
                                    ticks: { color: '#a0a0a0' },
                                    grid: { color: 'rgba(255,255,255,0.1)' }
                                },
                                y: {
                                    ticks: { color: '#a0a0a0' },
                                    grid: { color: 'rgba(255,255,255,0.1)' }
                                }
                            },
                            ...chartData.options
                        }
                    });
                }
            }, 100);
            
            const chartCode = chartMatch[1];
            const chartCodeEscaped = escapeHtml(chartCode);
            return `<div class="diagram-block" data-diagram-type="chart" data-diagram-target="${chartId}">
                <div class="diagram-toolbar">
                    <button class="diagram-btn" data-action="fullscreen" title="全屏"><i class="fas fa-expand"></i> 全屏</button>
                    <button class="diagram-btn" data-action="download" title="下载为PNG"><i class="fas fa-download"></i> 下载</button>
                    <button class="diagram-btn" data-action="preview" title="预览"><i class="fas fa-search-plus"></i> 预览</button>
                    <button class="diagram-btn" data-action="code" title="查看/隐藏代码"><i class="fas fa-code"></i> 代码</button>
                    <button class="diagram-btn" data-action="copy" title="复制代码"><i class="fas fa-copy"></i> 复制</button>
                </div>
                <div class="chart-container" style="height: 320px; margin: 16px 0;"><canvas id="${chartId}"></canvas></div>
                <pre class="diagram-code-panel" style="display:none"><code>${chartCodeEscaped}</code></pre>
            </div>`;
        } catch (e) {
            window.Logger?.error('Chart render error:', e);
            return null;
        }
    }

    function parseDecisionMatrixTable(text) {
        const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) return null;
        const parseRow = (line) => line.split('|').map(c => c.trim()).filter(c => c);
        const header = parseRow(lines[0]);
        const isSepLine = (line) => /^[\|\s\-:]+$/.test(line) && line.includes('-');
        const sepIdx = lines.findIndex((l, i) => i > 0 && isSepLine(l));
        const dataStart = sepIdx >= 0 ? sepIdx + 1 : 1;
        if (header.length < 2) return null;
        const lastIsTotal = header[header.length - 1] === '总分' || header[header.length - 1] === '加权得分' || header[header.length - 1] === '得分';
        const criteria = header.slice(1, lastIsTotal ? -1 : undefined).map((name) => ({ name, weight: 1 }));
        const alternatives = [];
        const scores = [];
        for (let i = dataStart; i < lines.length; i++) {
            const cells = parseRow(lines[i]);
            if (cells.length < 2) continue;
            alternatives.push(cells[0]);
            const nums = cells.slice(1, criteria.length + 1).map(c => parseFloat(String(c).replace(/[^\d.-]/g, '')) || 0);
            scores.push(nums);
        }
        if (!alternatives.length || !criteria.length) return null;
        return { criteria, alternatives, scores };
    }

    function renderDecisionMatrix(content) {
        const matrixMatch = content.match(/```decision-matrix\n([\s\S]*?)```/);
        if (!matrixMatch) return null;
        
        const matrixCode = matrixMatch[1];
        const matrixCodeEscaped = escapeHtml(matrixCode);
        let criteria, alternatives, scores, rawCriteria, rawAlternatives;

        try {
            let matrix;
            const trimmed = matrixCode.trim();
            const looksLikeTable = trimmed.startsWith('|') || (trimmed.includes('|') && trimmed.includes('\n') && /^\s*\|/.test(trimmed));
            if (looksLikeTable) {
                const parsed = parseDecisionMatrixTable(matrixCode);
                if (!parsed) throw new Error('Invalid table format');
                criteria = parsed.criteria;
                alternatives = parsed.alternatives;
                scores = parsed.scores;
                rawCriteria = criteria;
                rawAlternatives = alternatives.map((a, i) => ({ 方案: a, 评分: scores[i] }));
                matrix = null;
            } else if (trimmed.startsWith('{')) {
                matrix = JSON.parse(sanitizeJsonForParse(matrixCode));
                rawCriteria = matrix.决策标准 || matrix.criteria || [];
                rawAlternatives = matrix.备选方案 || matrix.alternatives || [];
                criteria = rawCriteria.map(c => ({
                    name: c.标准 ?? c.name ?? '',
                    weight: c.权重 ?? c.weight ?? 0
                }));
                alternatives = rawAlternatives.map(a => (typeof a === 'string' ? a : (a.方案 ?? a.描述 ?? a.name ?? '')));
                scores = rawAlternatives.map(a => (typeof a === 'object' && a !== null ? (a.评分 ?? a.scores ?? []) : [])).map(s => Array.isArray(s) ? s : []);
            } else {
                throw new Error('Decision matrix: expected JSON or Markdown table');
            }

            if (!criteria.length || !alternatives.length) {
                window.Logger?.warn('Decision matrix: missing criteria or alternatives');
                return null;
            }
            
            let html = '<div class="diagram-block" data-diagram-type="decision-matrix"><div class="diagram-toolbar">' +
                '<button class="diagram-btn" data-action="fullscreen" title="全屏"><i class="fas fa-expand"></i> 全屏</button>' +
                '<button class="diagram-btn" data-action="download" title="下载为PNG"><i class="fas fa-download"></i> 下载</button>' +
                '<button class="diagram-btn" data-action="preview" title="预览"><i class="fas fa-search-plus"></i> 预览</button>' +
                '<button class="diagram-btn" data-action="code" title="查看/隐藏代码"><i class="fas fa-code"></i> 代码</button>' +
                '<button class="diagram-btn" data-action="copy" title="复制代码"><i class="fas fa-copy"></i> 复制</button>' +
                '</div><div class="decision-matrix-container">';
            html += '<h4><i class="fas fa-th"></i> 决策矩阵</h4>';
            if (matrix?.决策问题 || matrix?.question) {
                html += `<p class="decision-question">${escapeHtml(matrix.决策问题 || matrix.question)}</p>`;
            }
            html += '<table class="decision-matrix">';
            
            html += '<thead><tr><th>方案</th>';
            criteria.forEach(c => {
                html += `<th>${escapeHtml(String(c.name))}<br><small>权重:${c.weight}</small></th>`;
            });
            html += '<th>总分</th></tr></thead><tbody>';
            
            alternatives.forEach((alt, idx) => {
                const altName = typeof alt === 'string' ? alt : (alt.方案 ?? alt.描述 ?? alt.name ?? '');
                html += `<tr><td><strong>${escapeHtml(String(altName))}</strong></td>`;
                let total = 0;
                criteria.forEach((c, cidx) => {
                    const score = Number(scores[idx]?.[cidx]) || 0;
                    total += score * (Number(c.weight) || 0);
                    html += `<td>${score}</td>`;
                });
                html += `<td class="total-score">${total.toFixed(2)}</td></tr>`;
            });
            html += '</tbody></table>';
            
            const weightedScores = alternatives.map((_, i) => {
                let s = 0;
                criteria.forEach((c, j) => { s += (Number(scores[i]?.[j]) || 0) * (Number(c.weight) || 0); });
                return { idx: i, score: s };
            });
            const best = weightedScores.sort((a, b) => b.score - a.score)[0];
            if (best && best.score > 0) {
                const bestName = typeof alternatives[best.idx] === 'string' ? alternatives[best.idx] : (alternatives[best.idx]?.方案 ?? alternatives[best.idx]?.描述 ?? '');
                html += `<div class="recommendation"><i class="fas fa-star"></i> 推荐方案: <strong>${escapeHtml(String(bestName))}</strong> (得分: ${best.score.toFixed(2)})</div>`;
            }
            const bestRaw = rawAlternatives[best?.idx];
            if (typeof bestRaw === 'object' && bestRaw?.评价) {
                html += `<div class="recommendation-desc"><small>${escapeHtml(bestRaw.评价)}</small></div>`;
            }
            
            html += '</div><pre class="diagram-code-panel" style="display:none"><code>' + matrixCodeEscaped + '</code></pre></div>';
            return html;
        } catch (e) {
            window.Logger?.error('Decision matrix render error:', e);
            return null;
        }
    }

    function renderProbabilityDistribution(content) {
        // 解析概率分布数据
        const distMatch = content.match(/```probability\n([\s\S]*?)```/);
        if (!distMatch) return null;
        
        try {
            const dist = JSON.parse(sanitizeJsonForParse(distMatch[1]));
            const chartId = 'prob-chart-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            const probLabels = dist.labels || dist.标签 || dist.xAxis || [];
            const probData = dist.data || dist.数据 || dist.values || [];
            setTimeout(() => {
                const ctx = document.getElementById(chartId);
                if (ctx && typeof Chart !== 'undefined') {
                    new Chart(ctx, {
                        type: dist.type || 'bar',
                        data: {
                            labels: probLabels,
                            datasets: [{
                                label: dist.label || dist.标签 || '概率',
                                data: probData,
                                backgroundColor: dist.colors || 'rgba(0, 212, 255, 0.6)',
                                borderColor: dist.borderColor || '#00d4ff',
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { labels: { color: '#e0e0e0' } },
                                title: {
                                    display: !!dist.title,
                                    text: dist.title,
                                    color: '#e0e0e0'
                                }
                            },
                            scales: {
                                x: {
                                    ticks: { color: '#a0a0a0' },
                                    grid: { color: 'rgba(255,255,255,0.1)' }
                                },
                                y: {
                                    ticks: { color: '#a0a0a0' },
                                    grid: { color: 'rgba(255,255,255,0.1)' },
                                    beginAtZero: true
                                }
                            }
                        }
                    });
                }
            }, 100);
            
            const probCode = distMatch[1];
            const probCodeEscaped = escapeHtml(probCode);
            return `<div class="diagram-block" data-diagram-type="probability" data-diagram-target="${chartId}">
                <div class="diagram-toolbar">
                    <button class="diagram-btn" data-action="fullscreen" title="全屏"><i class="fas fa-expand"></i> 全屏</button>
                    <button class="diagram-btn" data-action="download" title="下载为PNG"><i class="fas fa-download"></i> 下载</button>
                    <button class="diagram-btn" data-action="preview" title="预览"><i class="fas fa-search-plus"></i> 预览</button>
                    <button class="diagram-btn" data-action="code" title="查看/隐藏代码"><i class="fas fa-code"></i> 代码</button>
                    <button class="diagram-btn" data-action="copy" title="复制代码"><i class="fas fa-copy"></i> 复制</button>
                </div>
                <div class="chart-container probability-container" style="height: 320px; margin: 16px 0;"><canvas id="${chartId}"></canvas></div>
                <pre class="diagram-code-panel" style="display:none"><code>${probCodeEscaped}</code></pre>
            </div>`;
        } catch (e) {
            window.Logger?.error('Probability render error:', e);
            return null;
        }
    }

    function renderDecisionChain(content) {
        // 解析决策链数据
        const chainMatch = content.match(/```decision-chain\n([\s\S]*?)```/);
        if (!chainMatch) return null;
        
        try {
            const chain = JSON.parse(sanitizeJsonForParse(chainMatch[1]));
            const nodes = chain.nodes || chain.节点 || [];
            const edges = chain.edges || chain.边 || [];
            const chainCode = chainMatch[1];
            const chainCodeEscaped = escapeHtml(chainCode);
            
            let html = '<div class="diagram-block" data-diagram-type="decision-chain"><div class="diagram-toolbar">';
            html += '<button class="diagram-btn" data-action="fullscreen" title="全屏"><i class="fas fa-expand"></i> 全屏</button>';
            html += '<button class="diagram-btn" data-action="download" title="下载为PNG"><i class="fas fa-download"></i> 下载</button>';
            html += '<button class="diagram-btn" data-action="preview" title="预览"><i class="fas fa-search-plus"></i> 预览</button>';
            html += '<button class="diagram-btn" data-action="code" title="查看/隐藏代码"><i class="fas fa-code"></i> 代码</button>';
            html += '<button class="diagram-btn" data-action="copy" title="复制代码"><i class="fas fa-copy"></i> 复制</button>';
            html += '</div><div class="decision-chain-container">';
            html += '<h4><i class="fas fa-project-diagram"></i> 决策链</h4>';
            html += '<div class="decision-chain">';
            
            nodes.forEach((node, idx) => {
                const nodeId = node.id ?? node.节点id ?? idx;
                const nodeLabel = node.label ?? node.标签 ?? node.描述 ?? node.name ?? '';
                const isDecision = node.type === 'decision' || node.类型 === 'decision';
                const isEnd = node.type === 'end' || node.类型 === 'end';
                const nodeClass = isDecision ? 'decision-node' : (isEnd ? 'end-node' : 'process-node');
                
                html += `<div class="chain-node ${nodeClass}">`;
                html += `<div class="node-content">${escapeHtml(nodeLabel)}</div>`;
                if (node.description) {
                    html += `<div class="node-desc">${escapeHtml(node.description)}</div>`;
                }
                html += '</div>';
                
                // 添加连接线（除了最后一个节点）
                if (idx < nodes.length - 1) {
                    const edge = edges?.find(e => (e.from ?? e.从) === nodeId || (e.from ?? e.从) === node.id);
                    if (edge) {
                        html += `<div class="chain-edge"><span class="edge-label">${escapeHtml(edge.label ?? edge.标签 ?? '是')}</span><i class="fas fa-arrow-down"></i></div>`;
                    } else {
                        html += '<div class="chain-edge"><i class="fas fa-arrow-down"></i></div>';
                    }
                }
            });
            
            html += '</div></div><pre class="diagram-code-panel" style="display:none"><code>' + chainCodeEscaped + '</code></pre></div>';
            return html;
        } catch (e) {
            window.Logger?.error('Decision chain render error:', e);
            return null;
        }
    }

    /** project-dashboard 渲染：格式规范见 js/app.js DIAGRAM_FORMAT_SPEC 及 docs/DIAGRAM_FORMAT_SPEC.md；支持 ``` 或 `` 包裹 */
    function renderProjectDashboard(content) {
        const match = content.match(/(```|``)project-dashboard\s*\n([\s\S]*?)\1/);
        if (!match) return null;
        try {
            const jsonContent = match[2];
            let data = parseProjectDashboardJson(jsonContent);
            const codeEscaped = escapeHtml(jsonContent.trim());
            if (data['project-dashboard']) data = data['project-dashboard'];
            else if (data.projectDashboard) data = data.projectDashboard;
            const title = data.title || data.标题 || data.project || '项目管理仪表板';
            const dashId = 'dash_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            if (!window._tempDashboardContent) window._tempDashboardContent = {};
            window._tempDashboardContent[dashId] = jsonContent;
            let html = '<div class="diagram-block" data-diagram-type="project-dashboard" data-dashboard-id="' + dashId + '"><div class="diagram-toolbar">' +
                '<button class="diagram-btn" data-action="fullscreen" title="全屏"><i class="fas fa-expand"></i> 全屏</button>' +
                '<button class="diagram-btn" data-action="open-html" title="打开"><i class="fas fa-external-link-alt"></i> 打开</button>' +
                '<button class="diagram-btn" data-action="export-html" title="导出HTML"><i class="fas fa-file-code"></i> 导出HTML</button>' +
                '<button class="diagram-btn" data-action="download" title="下载为PNG"><i class="fas fa-download"></i> 下载</button>' +
                '<button class="diagram-btn" data-action="preview" title="预览"><i class="fas fa-search-plus"></i> 预览</button>' +
                '<button class="diagram-btn" data-action="code" title="查看/隐藏代码"><i class="fas fa-code"></i> 代码</button>' +
                '<button class="diagram-btn" data-action="copy" title="复制代码"><i class="fas fa-copy"></i> 复制</button>' +
                '</div><div class="project-dashboard-container">';
            html += `<h4><i class="fas fa-tachometer-alt"></i> ${escapeHtml(String(title))}</h4>`;

            const project = data.project || data.项目;
            const owner = data.owner || data.负责人;
            const date = data.date || data.日期;
            const status = data.status || data.状态;
            if (project || owner || date || status) {
                html += '<div class="dashboard-overview">';
                if (project) html += `<div class="dashboard-overview-row"><span class="dashboard-label">项目</span><span class="dashboard-value">${escapeHtml(String(project))}</span></div>`;
                if (owner) html += `<div class="dashboard-overview-row"><span class="dashboard-label">负责人</span><span class="dashboard-value">${escapeHtml(String(owner))}</span></div>`;
                if (date) html += `<div class="dashboard-overview-row"><span class="dashboard-label">日期</span><span class="dashboard-value">${escapeHtml(String(date))}</span></div>`;
                if (status) html += `<div class="dashboard-overview-row"><span class="dashboard-label">状态</span><span class="dashboard-value dashboard-status">${escapeHtml(String(status))}</span></div>`;
                html += '</div>';
            }

            const timeline = data.timeline || data.时间线;
            if (timeline && typeof timeline === 'object') {
                const now = timeline.now || timeline.当前 || timeline.现状;
                const next = timeline.next_milestone || timeline.下一里程碑 || timeline.nextMilestone || timeline.nextmilestone;
                const path = timeline.critical_path || timeline.关键路径 || timeline.criticalPath || timeline.criticalpath;
                if (now || next || path) {
                    html += '<div class="dashboard-timeline"><h5><i class="fas fa-clock"></i> 时间线</h5>';
                    if (now) html += `<div class="dashboard-timeline-item"><span class="dashboard-label">当前</span><span>${escapeHtml(String(now))}</span></div>`;
                    if (next) html += `<div class="dashboard-timeline-item"><span class="dashboard-label">下一里程碑</span><span>${escapeHtml(String(next))}</span></div>`;
                    if (path) html += `<div class="dashboard-timeline-item"><span class="dashboard-label">关键路径</span><span>${escapeHtml(String(path))}</span></div>`;
                    html += '</div>';
                }
            }

            const leveragePoints = data.leverage_points || data.leveragePoints || data.leveragepoints || data.杠杆点 || [];
            if (Array.isArray(leveragePoints) && leveragePoints.length > 0) {
                html += '<div class="dashboard-leverage"><h5><i class="fas fa-hand-pointer"></i> 杠杆点</h5><ul>';
                leveragePoints.forEach(l => {
                    const text = typeof l === 'string' ? l : (l.text || l.description || l.desc || l);
                    html += `<li>${escapeHtml(String(text))}</li>`;
                });
                html += '</ul></div>';
            }

            const blockerPriorityRaw = data.blocker_priority || data.blockerPriority || data.blockerpriority || data.阻塞项优先级 || [];
            let blockerPriority = [];
            if (Array.isArray(blockerPriorityRaw)) {
                blockerPriorityRaw.forEach(b => {
                    const item = typeof b === 'string' ? { item: b } : (b || {});
                    const subItems = item.items || item.blockers || [];
                    if (subItems.length > 0) {
                        subItems.forEach(s => blockerPriority.push({ level: item.level || item.priority || '', item: typeof s === 'string' ? s : (s.text || s.name || s) }));
                    } else {
                        blockerPriority.push({ level: item.level || item.priority || '', item: item.name || item.id || item.blocker || item.item || '' });
                    }
                });
            }
            if (blockerPriority.length > 0) {
                html += '<div class="dashboard-blockers"><h5><i class="fas fa-ban"></i> 阻塞项优先级</h5>';
                blockerPriority.forEach(b => {
                    const name = typeof b === 'object' ? (b.item || b.name || '') : String(b);
                    const priority = typeof b === 'object' ? (b.level || b.priority || '') : '';
                    const priorityClass = (String(priority).indexOf('P0') >= 0 || String(priority).indexOf('致命') >= 0) ? 'high' : (String(priority).indexOf('P1') >= 0 || String(priority).indexOf('高') >= 0) ? 'medium' : 'low';
                    html += `<div class="dashboard-blocker-card blocker-${priorityClass}"><div class="dashboard-blocker-header"><span>${escapeHtml(String(name))}</span>${priority ? `<span class="blocker-priority">${escapeHtml(String(priority))}</span>` : ''}</div></div>`;
                });
                html += '</div>';
            }

            const criticalClosure = data.critical_closure || data.criticalClosure || data.criticalclosure || data.严重问题闭环 || {};
            if (criticalClosure && typeof criticalClosure === 'object' && Object.keys(criticalClosure).length > 0) {
                let items = Array.isArray(criticalClosure) ? criticalClosure : (criticalClosure.items || criticalClosure.list || []);
                if (items.length === 0 && !Array.isArray(criticalClosure)) {
                    const skipKeys = ['summary', '摘要', 'items', 'list'];
                    items = [];
                    Object.entries(criticalClosure).forEach(([k, v]) => {
                        if (skipKeys.includes(k)) return;
                        if (v && typeof v === 'object' && !Array.isArray(v)) {
                            Object.entries(v).forEach(([nk, nv]) => items.push({ name: nk, status: nv }));
                        } else {
                            items.push({ name: k, status: v });
                        }
                    });
                }
                const summary = criticalClosure.summary || criticalClosure.摘要 || '';
                if (summary || items.length > 0) {
                    html += '<div class="dashboard-closure"><h5><i class="fas fa-check-double"></i> 严重问题闭环情况</h5>';
                    if (summary) html += `<p class="closure-summary">${escapeHtml(String(summary))}</p>`;
                    items.forEach(c => {
                        const name = c.name || c.problem || c.issue || c.问题 || '';
                        const status = c.status || c.状态 || '';
                        const nextAction = c.next_action || c.nextAction || c.nextaction || c.下一步 || '';
                        html += `<div class="closure-item"><div class="closure-main"><span>${escapeHtml(String(name))}</span><span class="closure-status">${escapeHtml(String(status))}</span></div>${nextAction ? `<div class="closure-next">${escapeHtml(String(nextAction))}</div>` : ''}</div>`;
                    });
                    html += '</div>';
                }
            }

            const managementGaps = data.management_gaps || data.managementGaps || data.managementgaps || data.管理漏洞 || {};
            if (managementGaps && typeof managementGaps === 'object') {
                let rework = managementGaps.rework_tug_of_war || managementGaps.reworkTugOfWar || managementGaps.reworktugofwar || managementGaps.反复拉锯 || managementGaps.rework || [];
                let processAnomalies = managementGaps.process_anomalies || managementGaps.processAnomalies || managementGaps.processanomalies || managementGaps.流程异常 || [];
                let delayAnomalies = managementGaps.delay_anomalies || managementGaps.delayAnomalies || managementGaps.delayanomalies || managementGaps.delay异常 || [];
                let infoFrag = managementGaps.info_chain_fragmentation || managementGaps.infoChainFragmentation || managementGaps.infochainfragmentation || managementGaps.信息链条与碎片化 || [];
                let orphan = managementGaps.orphan_issues || managementGaps.orphanIssues || managementGaps.orphanissues || managementGaps.悬置问题 || managementGaps.orphan || [];
                let friction = managementGaps.execution_friction || managementGaps.executionFriction || managementGaps.executionfriction || managementGaps.执行摩擦 || managementGaps.friction || [];
                orphan = Array.isArray(orphan) ? orphan : (typeof orphan === 'string' ? [orphan] : []);
                friction = Array.isArray(friction) ? friction : (typeof friction === 'string' ? [friction] : []);
                const toList = (v) => {
                    if (Array.isArray(v)) return v;
                    if (typeof v === 'string') return [v];
                    if (v && typeof v === 'object') {
                        if (v.识别 || v.根因) return [v];
                        return Object.entries(v).map(([k, val]) => {
                            if (val && typeof val === 'object' && (val.识别 || val.根因)) return val;
                            const s = typeof val === 'string' ? val : (val && typeof val === 'object' ? JSON.stringify(val) : String(val));
                            return `${k}: ${s}`;
                        });
                    }
                    return [];
                };
                rework = toList(rework);
                processAnomalies = toList(processAnomalies);
                delayAnomalies = toList(delayAnomalies);
                infoFrag = toList(infoFrag);
                const hasGaps = [rework, processAnomalies, delayAnomalies, infoFrag, orphan, friction].some(x => x.length > 0);
                if (hasGaps) {
                    html += '<div class="dashboard-gaps"><h5><i class="fas fa-exclamation-circle"></i> 管理漏洞</h5>';
                    const renderGapItem = (x) => {
                        if (typeof x === 'string') return escapeHtml(x);
                        if (x && typeof x === 'object' && (x.识别 || x.根因)) {
                            const parts = [];
                            if (x.识别) parts.push(`识别：${x.识别}`);
                            if (x.根因) parts.push(`根因：${x.根因}`);
                            return escapeHtml(parts.join('；'));
                        }
                        return escapeHtml(String(x.text || x.desc || JSON.stringify(x)));
                    };
                    if (rework.length > 0) {
                        html += `<div class="gap-section"><span class="gap-label">反复与拉锯（需求/方案/测试/结论）</span><ul>`;
                        rework.forEach(x => html += `<li>${renderGapItem(x)}</li>`);
                        html += '</ul></div>';
                    }
                    if (processAnomalies.length > 0) {
                        html += `<div class="gap-section"><span class="gap-label">流程异常</span><ul>`;
                        processAnomalies.forEach(x => html += `<li>${renderGapItem(x)}</li>`);
                        html += '</ul></div>';
                    }
                    if (delayAnomalies.length > 0) {
                        html += `<div class="gap-section"><span class="gap-label">Delay异常</span><ul>`;
                        delayAnomalies.forEach(x => html += `<li>${renderGapItem(x)}</li>`);
                        html += '</ul></div>';
                    }
                    if (infoFrag.length > 0) {
                        html += `<div class="gap-section"><span class="gap-label">信息链条与碎片化</span><ul>`;
                        infoFrag.forEach(x => html += `<li>${renderGapItem(x)}</li>`);
                        html += '</ul></div>';
                    }
                    if (orphan.length > 0) {
                        html += `<div class="gap-section"><span class="gap-label">悬置无人推动</span><ul>`;
                        orphan.forEach(x => html += `<li>${renderGapItem(x)}</li>`);
                        html += '</ul></div>';
                    }
                    if (friction.length > 0) {
                        html += `<div class="gap-section"><span class="gap-label">执行摩擦</span><ul>`;
                        friction.forEach(x => html += `<li>${renderGapItem(x)}</li>`);
                        html += '</ul></div>';
                    }
                    html += '</div>';
                }
            }

            const keyActions = data.key_actions || data.keyActions || data.keyactions || data.关键行动 || [];
            if (Array.isArray(keyActions) && keyActions.length > 0) {
                html += '<div class="dashboard-actions"><h5><i class="fas fa-bolt"></i> 关键行动</h5><ul>';
                keyActions.forEach(a => {
                    const item = typeof a === 'string' ? { action: a } : (a || {});
                    const action = item.action || item.name || item.行动 || '';
                    const owner = item.owner || item.负责人 || '';
                    const deadline = item.deadline || item.截止 || '';
                    const desc = item.description || item.desc || item.描述 || '';
                    const ownerStr = owner ? (String(owner).startsWith('@') ? escapeHtml(String(owner)) : '@' + escapeHtml(String(owner))) : '';
                    html += `<li>${escapeHtml(String(action))}${ownerStr ? ` <span class="action-owner">${ownerStr}</span>` : ''}${deadline ? ` <span class="action-deadline">${escapeHtml(String(deadline))}</span>` : ''}${desc ? `<div class="action-desc">${escapeHtml(String(desc))}</div>` : ''}</li>`;
                });
                html += '</ul></div>';
            }

            let resourceLoad = data.resource_load || data.resourceLoad || data.resourceload || data.资源负荷 || [];
            if (!Array.isArray(resourceLoad) && resourceLoad && typeof resourceLoad === 'object') {
                resourceLoad = Object.entries(resourceLoad).map(([name, load]) => ({ name, load }));
            }
            if (Array.isArray(resourceLoad) && resourceLoad.length > 0) {
                html += '<div class="dashboard-resource"><h5><i class="fas fa-users"></i> 关键资源负荷</h5><div class="resource-load-list">';
                resourceLoad.forEach(r => {
                    const item = typeof r === 'string' ? { name: r } : (r || {});
                    const name = item.name || item.resource || item.资源 || '';
                    const load = item.load || item.负荷 || item.loadPercent || 0;
                    const loadStr = typeof load === 'number' ? load + '%' : String(load);
                    const loadClass = (typeof load === 'number' && load >= 80) ? 'overload' : (typeof load === 'number' && load >= 60) ? 'high' : (typeof load === 'number' && load >= 40) ? 'medium' : (String(load).indexOf('过载') >= 0 || String(load).indexOf('90') >= 0) ? 'overload' : (String(load).indexOf('高') >= 0 || String(load).indexOf('80') >= 0) ? 'high' : (String(load).indexOf('中') >= 0) ? 'medium' : 'low';
                    html += `<div class="resource-load-item load-${loadClass}"><span class="resource-name">${escapeHtml(String(name))}</span><span class="resource-load">${escapeHtml(String(loadStr))}</span></div>`;
                });
                html += '</div></div>';
            }

            const depsRaw = data.dependencies || data.依赖 || data.deps || {};
            const depsArray = Array.isArray(depsRaw) ? depsRaw : (depsRaw.critical || depsRaw.list || depsRaw.edges || []);
            let blockingDeps = data.blocking_deps || data.blockingDeps || data.blockingdeps || data.阻塞性依赖 || [];
            if (depsRaw && typeof depsRaw === 'object' && !Array.isArray(depsRaw) && (depsRaw.blocking_deps || depsRaw.blockingDeps || depsRaw.blockingdeps)) {
                blockingDeps = blockingDeps.length > 0 ? blockingDeps : (depsRaw.blocking_deps || depsRaw.blockingDeps || depsRaw.blockingdeps || []);
            }
            if ((Array.isArray(depsArray) && depsArray.length > 0) || (Array.isArray(blockingDeps) && blockingDeps.length > 0)) {
                html += '<div class="dashboard-deps"><h5><i class="fas fa-project-diagram"></i> 依赖情况</h5>';
                if (Array.isArray(blockingDeps) && blockingDeps.length > 0) {
                    html += '<div class="deps-blocking"><strong>阻塞性依赖:</strong> ';
                    html += blockingDeps.map(d => escapeHtml(String(typeof d === 'string' ? d : (d.name || d.dep || d)))).join('；');
                    html += '</div>';
                }
                if (Array.isArray(depsArray) && depsArray.length > 0) {
                    html += '<ul class="deps-list">';
                    depsArray.forEach(d => {
                        const str = typeof d === 'string' ? d : (d.from && d.to ? `${d.from} → ${d.to} (${d.type || 'FS'})` : (d.text || d.desc || JSON.stringify(d)));
                        html += `<li>${escapeHtml(String(str))}</li>`;
                    });
                    html += '</ul>';
                }
                html += '</div>';
            }

            const cognitiveBiases = data.cognitive_biases || data.cognitiveBiases || data.cognitivebiases || data.认知偏差 || [];
            if (Array.isArray(cognitiveBiases) && cognitiveBiases.length > 0) {
                html += '<div class="dashboard-biases"><h5><i class="fas fa-brain"></i> 认知偏差</h5><ul>';
                cognitiveBiases.forEach(b => {
                    const item = typeof b === 'string' ? { name: b } : (b || {});
                    const name = item.name || item.bias || item.偏差 || '';
                    const impact = item.impact || item.影响 || '';
                    html += `<li>${escapeHtml(String(name))}${impact ? ` <span class="bias-impact">— ${escapeHtml(String(impact))}</span>` : ''}</li>`;
                });
                html += '</ul></div>';
            }

            const topRisks = data.top_risks || data.topRisks || data.风险 || data.risks || [];
            if (Array.isArray(topRisks) && topRisks.length > 0) {
                html += '<div class="dashboard-risks"><h5><i class="fas fa-exclamation-triangle"></i> 主要风险</h5>';
                topRisks.forEach(r => {
                    const id = r.id || r.风险ID || '';
                    const desc = r.description || r.描述 || r.desc || '';
                    const level = r.level || r.等级 || r.级别 || '';
                    const impact = r.impact || r.影响 || '';
                    const riskOwner = r.owner || r.责任人 || r.负责人 || '';
                    const mitigation = r.mitigation || r.缓解措施 || r.应对 || '';
                    const levelClass = (String(level).indexOf('高') >= 0 || level === 'high') ? 'high' : (String(level).indexOf('中') >= 0 || level === 'medium') ? 'medium' : 'low';
                    html += `<div class="dashboard-risk-card risk-${levelClass}"><div class="dashboard-risk-header"><span class="dashboard-risk-id">${escapeHtml(String(id))}</span><span class="dashboard-risk-level">${escapeHtml(String(level))}</span></div>`;
                    if (desc) html += `<div class="dashboard-risk-desc">${escapeHtml(String(desc))}</div>`;
                    if (impact) html += `<div class="dashboard-risk-impact"><span class="dashboard-label">影响</span>${escapeHtml(String(impact))}</div>`;
                    if (riskOwner) html += `<div class="dashboard-risk-owner"><span class="dashboard-label">责任人</span>${escapeHtml(String(riskOwner))}</div>`;
                    if (mitigation) html += `<div class="dashboard-risk-mitigation"><span class="dashboard-label">缓解措施</span>${escapeHtml(String(mitigation))}</div>`;
                    html += '</div>';
                });
                html += '</div>';
            }

            const statsData = data.stats || data.统计 || {};
            if (Array.isArray(statsData) && statsData.length > 0) {
                html += '<div class="dashboard-stats">';
                statsData.forEach(s => {
                    const colorClass = s.color || 'primary';
                    html += `<div class="dashboard-stat stat-${colorClass}"><span class="stat-value">${escapeHtml(String(s.value))}</span><span class="stat-label">${escapeHtml(s.label || '')}</span></div>`;
                });
                html += '</div>';
            } else if (statsData && typeof statsData === 'object' && !Array.isArray(statsData) && Object.keys(statsData).length > 0) {
                const statLabels = { total_tasks_identified: '任务总数', tasks_in_progress: '进行中', tasks_blocked: '阻塞', tasks_legacy: '遗留', tasks_completed: '已完成' };
                html += '<div class="dashboard-stats">';
                Object.entries(statsData).forEach(([k, v]) => {
                    const label = statLabels[k] || k.replace(/_/g, ' ');
                    html += `<div class="dashboard-stat"><span class="stat-value">${escapeHtml(String(v))}</span><span class="stat-label">${escapeHtml(label)}</span></div>`;
                });
                html += '</div>';
            }
            if (data.tasks && data.tasks.length > 0) {
                html += '<div class="dashboard-tasks"><h5>任务进度</h5>';
                data.tasks.forEach(t => {
                    const pct = Math.min(100, Math.max(0, t.progress || 0));
                    const statusClass = (t.status || 'pending').replace('_', '-');
                    html += `<div class="dashboard-task"><div class="task-info"><span class="task-name">${escapeHtml(t.name || t.名称 || '')}</span><span class="task-pct">${pct}%</span></div><div class="task-bar"><div class="task-progress" style="width:${pct}%" data-status="${statusClass}"></div></div></div>`;
                });
                html += '</div>';
            }
            const dashMilestones = data.milestones || data.里程碑 || data.milestoneList || [];
            if (Array.isArray(dashMilestones) && dashMilestones.length > 0) {
                html += '<div class="dashboard-milestones"><h5><i class="fas fa-flag-checkered"></i> 项目里程碑</h5><div class="milestones-timeline">';
                dashMilestones.forEach(m => {
                    const item = typeof m === 'string' ? { name: m } : (m || {});
                    const name = item.name || item.title || item.名称 || item.里程碑 || '';
                    const dateVal = item.date || item.targetDate || item.日期 || item.目标日期 || '';
                    const statusClass = (item.status || item.状态 || 'pending').replace('_', '-');
                    html += `<div class="milestone-item ${statusClass}"><div class="milestone-marker"></div><div class="milestone-content"><span class="milestone-name">${escapeHtml(String(name))}</span><span class="milestone-date">${escapeHtml(String(dateVal))}</span></div></div>`;
                });
                html += '</div></div>';
            }
            html += '</div><pre class="diagram-code-panel" style="display:none"><code>' + codeEscaped + '</code></pre></div>';
            return html;
        } catch (e) {
            window.Logger?.error('Project dashboard render error:', e);
            return null;
        }
    }

    function renderProblemEvolution(content) {
        const match = content.match(/```problem-evolution\n([\s\S]*?)```/);
        if (!match) return null;
        try {
            const data = JSON.parse(sanitizeJsonForParse(match[1]));
            const codeEscaped = escapeHtml(match[1]);
            const title = data.title || data.problemname || data.problem_name || '问题演化分析';
            let html = '<div class="diagram-block" data-diagram-type="problem-evolution"><div class="diagram-toolbar">' +
                '<button class="diagram-btn" data-action="fullscreen" title="全屏"><i class="fas fa-expand"></i> 全屏</button>' +
                '<button class="diagram-btn" data-action="download" title="下载为PNG"><i class="fas fa-download"></i> 下载</button>' +
                '<button class="diagram-btn" data-action="preview" title="预览"><i class="fas fa-search-plus"></i> 预览</button>' +
                '<button class="diagram-btn" data-action="code" title="查看/隐藏代码"><i class="fas fa-code"></i> 代码</button>' +
                '<button class="diagram-btn" data-action="copy" title="复制代码"><i class="fas fa-copy"></i> 复制</button>' +
                '</div><div class="problem-evolution-container">';
            html += `<h4><i class="fas fa-project-diagram"></i> ${escapeHtml(title)}</h4>`;
            const currentStatus = data.currentstatus || data.current_status || data.currentStatus || '';
            if (currentStatus) {
                html += `<div class="evolution-current-status"><strong>当前状态：</strong>${escapeHtml(currentStatus)}</div>`;
            }
            if (data.phases && data.phases.length > 0) {
                html += '<div class="evolution-kanban"><h5>问题演化阶段</h5><div class="kanban-columns">';
                data.phases.forEach((p) => {
                    const statusClass = (p.status || 'pending').replace('_', '-');
                    html += `<div class="kanban-col col-${statusClass}"><div class="kanban-col-title">${escapeHtml(p.name || p.phase || '')}</div>`;
                    if (p.description) html += `<div class="kanban-col-desc">${escapeHtml(p.description)}</div>`;
                    if (p.response) html += `<div class="kanban-col-response"><strong>响应：</strong>${escapeHtml(p.response)}</div>`;
                    const items = p.items || [];
                    const blockers = p.blockers || [];
                    items.forEach(item => html += `<div class="kanban-card">${escapeHtml(typeof item === 'string' ? item : item.text || JSON.stringify(item))}</div>`);
                    blockers.forEach(b => {
                        const name = b.name || b.blocker || '';
                        const desc = b.description ? `<p class="blocker-desc">${escapeHtml(b.description)}</p>` : '';
                        const solution = b.breakthrough || b.solution || '';
                        html += `<div class="blocker-card"><div class="blocker-name">${escapeHtml(name)}</div>${desc}<div class="blocker-solution"><strong>突破方案：</strong>${escapeHtml(solution)}</div></div>`;
                    });
                    html += '</div>';
                });
                html += '</div></div>';
            }
            if (data.blockers && data.blockers.length > 0) {
                html += '<div class="blocker-breakthrough"><h5><i class="fas fa-exclamation-triangle"></i> 当前阻塞点与突破方案</h5>';
                data.blockers.forEach(b => {
                    const desc = b.description ? `<p class="blocker-desc">${escapeHtml(b.description)}</p>` : '';
                    html += `<div class="blocker-card"><div class="blocker-name">${escapeHtml(b.name || b.blocker || '')}</div>${desc}<div class="blocker-solution"><strong>突破方案：</strong>${escapeHtml(b.breakthrough || b.solution || '')}</div></div>`;
                });
                html += '</div>';
            }
            html += '</div><pre class="diagram-code-panel" style="display:none"><code>' + codeEscaped + '</code></pre></div>';
            return html;
        } catch (e) {
            window.Logger?.error('Problem evolution render error:', e);
            return null;
        }
    }

    function renderMilestones(content) {
        const match = content.match(/```milestones\n([\s\S]*?)```/);
        if (!match) return null;
        try {
            const parsed = JSON.parse(sanitizeJsonForParse(match[1]));
            const codeEscaped = escapeHtml(match[1]);
            const data = Array.isArray(parsed) ? { milestones: parsed } : parsed;
            let title = data.title || data.标题 || '项目里程碑';
            let rawList = data.milestones || data.items || data.里程碑 || data.里程碑列表 || data.list || [];
            if (!Array.isArray(rawList) && rawList && typeof rawList === 'object') {
                rawList = rawList.里程碑 || rawList.items || rawList.milestones || [];
            }
            let milestones = Array.isArray(rawList) ? rawList : [];
            if (!milestones.length && data.sections && Array.isArray(data.sections)) {
                const sec = data.sections.find(s => (s.milestones || s.里程碑 || s.items)?.length);
                if (sec) {
                    title = sec.title || sec.标题 || title;
                    milestones = sec.milestones || sec.里程碑 || sec.items || [];
                }
            }
            if (!milestones.length && typeof data === 'object') {
                for (const k of Object.keys(data)) {
                    const v = data[k];
                    if (Array.isArray(v) && v.length > 0 && v[0] && typeof v[0] === 'object' && (v[0].name || v[0].title || v[0].名称 || v[0].里程碑)) {
                        milestones = v;
                        if (typeof k === 'string' && !['milestones','items','list','里程碑','里程碑列表'].includes(k)) title = k;
                        break;
                    }
                }
            }
            
            let html = '<div class="diagram-block" data-diagram-type="milestones"><div class="diagram-toolbar">' +
                '<button class="diagram-btn" data-action="fullscreen" title="全屏"><i class="fas fa-expand"></i> 全屏</button>' +
                '<button class="diagram-btn" data-action="download" title="下载为PNG"><i class="fas fa-download"></i> 下载</button>' +
                '<button class="diagram-btn" data-action="preview" title="预览"><i class="fas fa-search-plus"></i> 预览</button>' +
                '<button class="diagram-btn" data-action="code" title="查看/隐藏代码"><i class="fas fa-code"></i> 代码</button>' +
                '<button class="diagram-btn" data-action="copy" title="复制代码"><i class="fas fa-copy"></i> 复制</button>' +
                '</div><div class="milestones-container">';
            html += `<h4><i class="fas fa-flag-checkered"></i> ${escapeHtml(title)}</h4><div class="milestones-timeline">`;
            milestones.forEach((m, i) => {
                const item = typeof m === 'string' ? { name: m } : (m || {});
                const name = item.name || item.title || item.名称 || item.里程碑 || item.节点 || '';
                const date = item.date || item.targetDate || item.日期 || item.目标日期 || item.时间 || '';
                const desc = item.description || item.描述 || item.desc || '';
                const statusClass = (item.status || item.状态 || 'pending').replace('_', '-');
                html += `<div class="milestone-item ${statusClass}"><div class="milestone-marker"></div><div class="milestone-content"><span class="milestone-name">${escapeHtml(String(name))}</span><span class="milestone-date">${escapeHtml(String(date))}</span>${desc ? `<p class="milestone-desc">${escapeHtml(desc)}</p>` : ''}</div></div>`;
            });
            html += '</div></div><pre class="diagram-code-panel" style="display:none"><code>' + codeEscaped + '</code></pre></div>';
            return html;
        } catch (e) {
            window.Logger?.error('Milestones render error:', e);
            return null;
        }
    }

    function renderDependencyGraph(content) {
        const match = content.match(/```dependency-graph\n([\s\S]*?)```/);
        if (!match) return null;
        try {
            const data = JSON.parse(sanitizeJsonForParse(match[1]));
            const codeEscaped = escapeHtml(match[1]);
            const nodes = data.nodes || data.节点 || [];
            const edges = data.edges || data.边 || [];
            const title = data.title || '依赖关系图';
            const nodeMap = {};
            nodes.forEach(n => { const id = n.id || n.nodeId || n.label || n.节点id; nodeMap[id] = n.label || n.name || n.标签 || id; });
            let html = '<div class="diagram-block" data-diagram-type="dependency-graph"><div class="diagram-toolbar">' +
                '<button class="diagram-btn" data-action="fullscreen" title="全屏"><i class="fas fa-expand"></i> 全屏</button>' +
                '<button class="diagram-btn" data-action="download" title="下载为PNG"><i class="fas fa-download"></i> 下载</button>' +
                '<button class="diagram-btn" data-action="preview" title="预览"><i class="fas fa-search-plus"></i> 预览</button>' +
                '<button class="diagram-btn" data-action="code" title="查看/隐藏代码"><i class="fas fa-code"></i> 代码</button>' +
                '<button class="diagram-btn" data-action="copy" title="复制代码"><i class="fas fa-copy"></i> 复制</button>' +
                '</div><div class="dependency-graph-container">';
            html += `<h4><i class="fas fa-sitemap"></i> ${escapeHtml(title)}</h4>`;
            html += '<div class="dep-graph"><div class="dep-nodes">';
            nodes.forEach(n => {
                const nodeId = n.id || n.nodeId || n.label;
                const isCritical = n.critical || n.isCritical;
                html += `<div class="dep-node ${isCritical ? 'critical' : ''}" data-id="${escapeHtml(nodeId)}"><span class="dep-node-label">${escapeHtml(n.label || n.name || nodeId)}</span>${n.duration ? `<span class="dep-node-duration">${escapeHtml(n.duration)}</span>` : ''}</div>`;
            });
            html += '</div><div class="dep-edges-list"><table class="dep-table"><thead><tr><th>前置</th><th></th><th>后续</th><th>类型</th></tr></thead><tbody>';
            edges.forEach(e => {
                const fromId = e.from ?? e.从;
                const toId = e.to ?? e.到;
                const fromLabel = nodeMap[fromId] ?? fromId;
                const toLabel = nodeMap[toId] ?? toId;
                html += `<tr><td>${escapeHtml(fromLabel)}</td><td><i class="fas fa-arrow-right"></i></td><td>${escapeHtml(toLabel)}</td><td><span class="dep-type">${escapeHtml(e.label ?? e.类型 ?? e.type ?? 'FS')}</span></td></tr>`;
            });
            html += '</tbody></table></div></div></div><pre class="diagram-code-panel" style="display:none"><code>' + codeEscaped + '</code></pre></div>';
            return html;
        } catch (e) {
            window.Logger?.error('Dependency graph render error:', e);
            return null;
        }
    }

    function renderRiskMatrix(content) {
        const match = content.match(/```risk-matrix\n([\s\S]*?)```/);
        if (!match) return null;
        try {
            const raw = match[1].trim();
            const codeEscaped = escapeHtml(match[1]);
            let high = [], medium = [], low = [];
            if (raw.startsWith('{')) {
                const data = JSON.parse(sanitizeJsonForParse(raw));
                high = data.high || data.high_risk || data.高风险 || data.highRisk || [];
                medium = data.medium || data.medium_risk || data.中风险 || data.mediumRisk || [];
                low = data.low || data.low_risk || data.低风险 || data.lowRisk || [];
            } else {
                const lines = raw.split(/\r?\n/);
                let current = null;
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const t = line.trim();
                    const highMatch = /^(#+\s*|\*{0,2})?(高风险|High\s*Risk|high_risk|high)(\s*[（(].*)?[：:]?\s*$/i.test(t);
                    const medMatch = /^(#+\s*|\*{0,2})?(中风险|Medium\s*Risk|medium_risk|medium)(\s*[（(].*)?[：:]?\s*$/i.test(t);
                    const lowMatch = /^(#+\s*|\*{0,2})?(低风险|Low\s*Risk|low_risk|low)(\s*[（(].*)?[：:]?\s*$/i.test(t);
                    if (highMatch) { current = 'high'; continue; }
                    if (medMatch) { current = 'medium'; continue; }
                    if (lowMatch) { current = 'low'; continue; }
                    const itemMatch = line.match(/^\s*[-*]?\s*\d+\.?\s*(.+)$/) || line.match(/^\s*[-*]\s+(.+)$/);
                    if (itemMatch && current) {
                        const item = itemMatch[1].trim();
                        if (item && !/^(高风险|中风险|低风险|High|Medium|Low)/i.test(item)) {
                            if (current === 'high') high.push(item);
                            else if (current === 'medium') medium.push(item);
                            else low.push(item);
                        }
                    }
                }
            }
            high = Array.isArray(high) ? high : [String(high)];
            medium = Array.isArray(medium) ? medium : [String(medium)];
            low = Array.isArray(low) ? low : [String(low)];
            if (high.length === 0 && medium.length === 0 && low.length === 0) return null;
            let html = '<div class="diagram-block" data-diagram-type="risk-matrix"><div class="diagram-toolbar">' +
                '<button class="diagram-btn" data-action="fullscreen" title="全屏"><i class="fas fa-expand"></i> 全屏</button>' +
                '<button class="diagram-btn" data-action="open-html" title="打开"><i class="fas fa-external-link-alt"></i> 打开</button>' +
                '<button class="diagram-btn" data-action="export-html" title="导出HTML"><i class="fas fa-file-code"></i> 导出HTML</button>' +
                '<button class="diagram-btn" data-action="download" title="下载为PNG"><i class="fas fa-download"></i> 下载</button>' +
                '<button class="diagram-btn" data-action="preview" title="预览"><i class="fas fa-search-plus"></i> 预览</button>' +
                '<button class="diagram-btn" data-action="code" title="查看/隐藏代码"><i class="fas fa-code"></i> 代码</button>' +
                '<button class="diagram-btn" data-action="copy" title="复制代码"><i class="fas fa-copy"></i> 复制</button>' +
                '</div><div class="risk-matrix-container">';
            html += '<h4><i class="fas fa-exclamation-triangle"></i> 风险矩阵</h4>';
            html += '<div class="risk-matrix-grid">';
            if (high.length > 0) {
                html += '<div class="risk-matrix-col risk-high"><div class="risk-matrix-header"><i class="fas fa-circle"></i> 高风险</div><ul>';
                high.forEach(item => html += `<li>${escapeHtml(String(typeof item === 'string' ? item : (item.text || item.desc || item.name || JSON.stringify(item))))}</li>`);
                html += '</ul></div>';
            }
            if (medium.length > 0) {
                html += '<div class="risk-matrix-col risk-medium"><div class="risk-matrix-header"><i class="fas fa-circle"></i> 中风险</div><ul>';
                medium.forEach(item => html += `<li>${escapeHtml(String(typeof item === 'string' ? item : (item.text || item.desc || item.name || JSON.stringify(item))))}</li>`);
                html += '</ul></div>';
            }
            if (low.length > 0) {
                html += '<div class="risk-matrix-col risk-low"><div class="risk-matrix-header"><i class="fas fa-circle"></i> 低风险</div><ul>';
                low.forEach(item => html += `<li>${escapeHtml(String(typeof item === 'string' ? item : (item.text || item.desc || item.name || JSON.stringify(item))))}</li>`);
                html += '</ul></div>';
            }
            html += '</div></div><pre class="diagram-code-panel" style="display:none"><code>' + codeEscaped + '</code></pre></div>';
            return html;
        } catch (e) {
            window.Logger?.error('Risk matrix render error:', e);
            return null;
        }
    }

    function renderRoadmap(content) {
        const match = content.match(/```roadmap\n([\s\S]*?)```/);
        if (!match) return null;
        try {
            const data = JSON.parse(sanitizeJsonForParse(match[1]));
            const codeEscaped = escapeHtml(match[1]);
            const title = data.title || data.标题 || '项目路线图';
            const phases = data.phases || data.阶段 || data.phasesList || [];
            const milestones = data.milestones || data.里程碑 || [];
            let html = '<div class="diagram-block" data-diagram-type="roadmap"><div class="diagram-toolbar">' +
                '<button class="diagram-btn" data-action="fullscreen" title="全屏"><i class="fas fa-expand"></i> 全屏</button>' +
                '<button class="diagram-btn" data-action="download" title="下载"><i class="fas fa-download"></i> 下载</button>' +
                '<button class="diagram-btn" data-action="code" title="代码"><i class="fas fa-code"></i> 代码</button>' +
                '</div><div class="roadmap-container">';
            html += `<h4><i class="fas fa-route"></i> ${escapeHtml(title)}</h4>`;
            if (phases.length > 0) {
                html += '<div class="roadmap-phases">';
                phases.forEach((p, i) => {
                    const name = p.name || p.阶段 || p.phase || '';
                    const start = p.start || p.开始 || '';
                    const end = p.end || p.结束 || '';
                    const ms = p.milestones || p.里程碑 || [];
                    html += `<div class="roadmap-phase"><div class="roadmap-phase-header"><span class="phase-name">${escapeHtml(name)}</span><span class="phase-dates">${escapeHtml(start)} ~ ${escapeHtml(end)}</span></div>`;
                    if (ms.length) html += '<ul class="phase-milestones">' + ms.map(m => `<li>${escapeHtml(typeof m === 'string' ? m : (m.name || m))}</li>`).join('') + '</ul>';
                    html += '</div>';
                });
                html += '</div>';
            }
            if (milestones.length > 0) {
                html += '<div class="roadmap-milestones"><h5><i class="fas fa-flag-checkered"></i> 里程碑</h5><div class="milestones-timeline">';
                milestones.forEach(m => {
                    const item = typeof m === 'string' ? { name: m } : (m || {});
                    const name = item.name || item.title || item.名称 || '';
                    const date = item.date || item.日期 || item.targetDate || '';
                    const desc = item.description || item.描述 || '';
                    html += `<div class="milestone-item"><div class="milestone-marker"></div><div class="milestone-content"><span class="milestone-name">${escapeHtml(name)}</span><span class="milestone-date">${escapeHtml(date)}</span>${desc ? `<p class="milestone-desc">${escapeHtml(desc)}</p>` : ''}</div></div>`;
                });
                html += '</div></div>';
            }
            html += '</div><pre class="diagram-code-panel" style="display:none"><code>' + codeEscaped + '</code></pre></div>';
            return html;
        } catch (e) {
            window.Logger?.error('Roadmap render error:', e);
            return null;
        }
    }

    function renderTaskClassificationTable(content) {
        const match = content.match(/```task-classification-table\n([\s\S]*?)```/);
        if (!match) return null;
        try {
            const raw = match[1].trim();
            const codeEscaped = escapeHtml(match[1]);
            const lines = raw.split('\n').filter(l => l.trim());
            let tableHtml = '';
            if (lines.length >= 2 && /^\s*\|.*\|\s*$/.test(lines[0])) {
                tableHtml = renderMarkdownTable(raw);
            } else {
                tableHtml = '<table class="markdown-table"><tbody>' + lines.map((line, i) => {
                    const cells = line.split('|').map(c => c.trim()).filter(c => c && !/^-+$/.test(c));
                    if (cells.length === 0) return '';
                    const tag = (i === 0 || /^-+$/.test(lines[i - 1])) ? 'th' : 'td';
                    return '<tr>' + cells.map(c => `<${tag}>${escapeHtml(c)}</${tag}>`).join('') + '</tr>';
                }).filter(Boolean).join('') + '</tbody></table>';
            }
            let html = '<div class="diagram-block" data-diagram-type="task-classification-table"><div class="diagram-toolbar">' +
                '<button class="diagram-btn" data-action="fullscreen" title="全屏"><i class="fas fa-expand"></i> 全屏</button>' +
                '<button class="diagram-btn" data-action="code" title="代码"><i class="fas fa-code"></i> 代码</button>' +
                '</div><div class="task-classification-container">';
            html += '<h4><i class="fas fa-table"></i> 任务分类表</h4><div class="task-classification-table-wrapper">' + (tableHtml || escapeHtml(raw)) + '</div>';
            html += '</div><pre class="diagram-code-panel" style="display:none"><code>' + codeEscaped + '</code></pre></div>';
            return html;
        } catch (e) {
            window.Logger?.error('Task classification table render error:', e);
            return null;
        }
    }

    function renderResourceConstraints(content) {
        const match = content.match(/```resource-constraints\n([\s\S]*?)```/);
        if (!match) return null;
        try {
            const data = JSON.parse(sanitizeJsonForParse(match[1]));
            const codeEscaped = escapeHtml(match[1]);
            const constraints = data.constraints || data.资源约束 || data.items || [];
            let html = '<div class="diagram-block" data-diagram-type="resource-constraints"><div class="diagram-toolbar">' +
                '<button class="diagram-btn" data-action="fullscreen" title="全屏"><i class="fas fa-expand"></i> 全屏</button>' +
                '<button class="diagram-btn" data-action="code" title="代码"><i class="fas fa-code"></i> 代码</button>' +
                '</div><div class="resource-constraints-container">';
            html += '<h4><i class="fas fa-exclamation-circle"></i> 资源约束</h4><ul class="resource-constraints-list">';
            (Array.isArray(constraints) ? constraints : []).forEach(c => {
                const item = typeof c === 'string' ? { description: c } : (c || {});
                const type = item.type || item.类型 || '约束';
                const desc = item.description || item.描述 || item.desc || '';
                const impact = item.impact || item.影响 || '';
                html += `<li><span class="constraint-type">${escapeHtml(type)}</span> ${escapeHtml(desc)}${impact ? ` <span class="constraint-impact">(${escapeHtml(impact)})</span>` : ''}</li>`;
            });
            html += '</ul></div><pre class="diagram-code-panel" style="display:none"><code>' + codeEscaped + '</code></pre></div>';
            return html;
        } catch (e) {
            window.Logger?.error('Resource constraints render error:', e);
            return null;
        }
    }

    // ==================== Mermaid图表渲染 ====================
    // 全局Mermaid配置（只初始化一次）
    let mermaidInitialized = false;
    
    function initMermaid() {
        if (mermaidInitialized || typeof mermaid === 'undefined') return;
        
        mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            themeVariables: {
                primaryColor: '#00d4ff',
                primaryTextColor: '#ffffff',
                primaryBorderColor: '#00d4ff',
                lineColor: '#a0a0a0',
                secondaryColor: '#1e3a5f',
                tertiaryColor: '#0d2137',
                background: '#0d1117',
                mainBkg: '#1e3a5f',
                secondBkg: '#0d2137',
                nodeBorder: '#00d4ff',
                clusterBkg: '#0d2137',
                clusterBorder: '#00d4ff',
                titleColor: '#ffffff',
                edgeLabelBackground: '#0d1117',
                nodeTextColor: '#ffffff'
            },
            flowchart: {
                useMaxWidth: true,
                htmlLabels: true,
                curve: 'basis',
                padding: 20,
                nodeSpacing: 50,
                rankSpacing: 50
            },
            sequence: {
                useMaxWidth: true,
                diagramMarginX: 50,
                diagramMarginY: 10
            },
            gantt: {
                useMaxWidth: true,
                fontSize: 16,
                sectionFontSize: 16,
                barHeight: 36,
                barGap: 14,
                topPadding: 80,
                leftPadding: 220,
                rightPadding: 120,
                gridLineStartPadding: 55,
                titleTopMargin: 40,
                topAxis: true,
                axisFormat: '%Y-%m-%d'
            }
        });
        mermaidInitialized = true;
    }
    
    function renderMermaid(content) {
        // 解析Mermaid代码块
        const mermaidMatch = content.match(/```mermaid\n([\s\S]*?)```/);
        if (!mermaidMatch) return null;
        
        try {
            let mermaidCode = mermaidMatch[1].trim();
            // 预处理：将节点标签 [..] 和 {..} 内的换行转为 <br/>，否则 Mermaid 解析失败（Agent 常生成含换行的标签）
            mermaidCode = mermaidCode.replace(/\[([\s\S]*?)\]/g, (_, inner) =>
                '[' + inner.replace(/\r?\n/g, '<br/>') + ']');
            mermaidCode = mermaidCode.replace(/\{([\s\S]*?)\}/g, (_, inner) =>
                '{' + inner.replace(/\r?\n/g, '<br/>') + '}');
            mermaidCode = mermaidCode.replace(/\(([\s\S]*?)\)/g, (_, inner) =>
                '(' + inner.replace(/\r?\n/g, '<br/>') + ')');
            const mermaidId = 'mermaid-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            
            // 初始化Mermaid
            initMermaid();
            
            // 延迟渲染Mermaid图表
            setTimeout(() => {
                if (typeof mermaid !== 'undefined') {
                    const element = document.getElementById(mermaidId);
                    if (element) {
                        // 清空元素内容
                        element.innerHTML = '';
                        // 设置mermaid类以便自动渲染
                        element.classList.add('mermaid');
                        // 插入mermaid代码
                        element.textContent = mermaidCode;
                        // 使用mermaid.run渲染
                        try {
                            mermaid.run({
                                nodes: [element],
                                suppressErrors: true
                            }).catch(err => {
                                window.Logger?.error('Mermaid run error:', err);
                                element.innerHTML = '<div class="mermaid-error"><i class="fas fa-exclamation-triangle"></i> 图表渲染失败，请检查语法</div>';
                            });
                        } catch (e) {
                            window.Logger?.error('Mermaid render error:', e);
                            element.innerHTML = '<div class="mermaid-error"><i class="fas fa-exclamation-triangle"></i> 图表渲染失败</div>';
                        }
                    }
                } else {
                    window.Logger?.warn('Mermaid library not loaded');
                }
            }, 200);
            
            const codeEscaped = escapeHtml(mermaidCode);
            return `<div class="diagram-block" data-diagram-type="mermaid" data-diagram-target="${mermaidId}">
                <div class="diagram-toolbar">
                    <button class="diagram-btn" data-action="fullscreen" title="全屏"><i class="fas fa-expand"></i> 全屏</button>
                    <button class="diagram-btn" data-action="download" title="下载为PNG"><i class="fas fa-download"></i> 下载</button>
                    <button class="diagram-btn" data-action="preview" title="预览"><i class="fas fa-search-plus"></i> 预览</button>
                    <button class="diagram-btn" data-action="code" title="查看/隐藏代码"><i class="fas fa-code"></i> 代码</button>
                    <button class="diagram-btn" data-action="copy" title="复制代码"><i class="fas fa-copy"></i> 复制</button>
                </div>
                <div class="mermaid-container"><div id="${mermaidId}" class="mermaid-wrapper">正在加载图表...</div></div>
                <pre class="diagram-code-panel" style="display:none"><code>${codeEscaped}</code></pre>
            </div>`;
        } catch (e) {
            window.Logger?.error('Mermaid parse error:', e);
            return null;
        }
    }

    /** 图表工具栏事件委托（全屏、下载、预览、代码、复制） */
    function initDiagramToolbarEvents() {
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.diagram-btn');
            if (!btn) return;
            const block = btn.closest('.diagram-block');
            if (!block) return;
            const action = btn.dataset.action;
            const targetId = block.dataset.diagramTarget;
            const codePanel = block.querySelector('.diagram-code-panel');
            const codeEl = codePanel?.querySelector('code');
            const vizContainer = block.querySelector('.mermaid-container, .chart-container, .decision-matrix-container, .probability-container, .decision-chain-container, .project-dashboard-container, .problem-evolution-container, .milestones-container, .dependency-graph-container, .risk-matrix-container');
            const svgEl = block.querySelector('.mermaid svg, .mermaid-container svg');

            switch (action) {
                case 'fullscreen':
                    openDiagramFullscreen(block);
                    break;
                case 'download':
                    if (svgEl) downloadDiagramAsPng(svgEl);
                    else if (block.querySelector('canvas')) downloadChartAsPng(block.querySelector('canvas'));
                    else if (vizContainer && typeof html2canvas === 'function') {
                        html2canvas(vizContainer, { backgroundColor: '#1a1a25', scale: 2 }).then(canvas => {
                            const a = document.createElement('a');
                            a.download = 'diagram-' + Date.now() + '.png';
                            a.href = canvas.toDataURL('image/png');
                            a.click();
                        });
                    }
                    break;
                case 'open-html':
                    if (block.dataset.diagramType === 'project-dashboard') {
                        openProjectDashboardHtml(block);
                    } else if (block.dataset.diagramType === 'risk-matrix') {
                        openRiskMatrixHtml(block);
                    }
                    break;
                case 'export-html':
                    if (block.dataset.diagramType === 'project-dashboard') {
                        exportProjectDashboardHtml(block);
                    } else if (block.dataset.diagramType === 'risk-matrix') {
                        exportRiskMatrixHtml(block);
                    }
                    break;
                case 'preview':
                    openDiagramPreview(block);
                    break;
                case 'code':
                    if (codePanel) {
                        const isHidden = codePanel.style.display === 'none';
                        codePanel.style.display = isHidden ? 'block' : 'none';
                        if (vizContainer) vizContainer.style.display = isHidden ? 'none' : 'block';
                        const icon = btn.querySelector('i');
                        if (icon) {
                            icon.className = isHidden ? 'fas fa-eye-slash' : 'fas fa-code';
                        }
                    }
                    break;
                case 'copy':
                    if (codeEl) {
                        navigator.clipboard.writeText(codeEl.textContent).then(() => {
                            const orig = btn.innerHTML;
                            btn.innerHTML = '<i class="fas fa-check"></i> 已复制';
                            setTimeout(() => { btn.innerHTML = orig; }, 1500);
                        });
                    }
                    break;
            }
        });
    }

    function openDiagramFullscreen(block) {
        const overlay = document.createElement('div');
        overlay.className = 'diagram-fullscreen-overlay';
        overlay.innerHTML = `<div class="diagram-fullscreen-content"><button class="diagram-close-btn"><i class="fas fa-times"></i></button><div class="diagram-fullscreen-body"></div></div>`;
        const body = overlay.querySelector('.diagram-fullscreen-body');
        const viz = block.querySelector('.mermaid-container, .chart-container, .decision-matrix-container, .probability-container, .decision-chain-container, .project-dashboard-container, .problem-evolution-container, .milestones-container, .dependency-graph-container, .risk-matrix-container, .roadmap-container, .task-classification-container, .resource-constraints-container');
        if (viz) {
            const canvas = viz.querySelector('canvas');
            if (canvas) {
                const img = document.createElement('img');
                img.src = canvas.toDataURL('image/png');
                img.style.maxWidth = '100%';
                img.style.maxHeight = '90vh';
                body.appendChild(img);
            } else {
                body.appendChild(viz.cloneNode(true));
            }
        }
        overlay.querySelector('.diagram-close-btn').onclick = () => overlay.remove();
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
        document.body.appendChild(overlay);
    }

    function openDiagramPreview(block) {
        openDiagramFullscreen(block);
    }

    function downloadDiagramAsPng(svgEl) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const svgData = new XMLSerializer().serializeToString(svgEl);
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const a = document.createElement('a');
            a.download = 'diagram-' + Date.now() + '.png';
            a.href = canvas.toDataURL('image/png');
            a.click();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }

    function downloadChartAsPng(canvas) {
        const a = document.createElement('a');
        a.download = 'chart-' + Date.now() + '.png';
        a.href = canvas.toDataURL('image/png');
        a.click();
    }

    /** 导出 project-dashboard 为完整 HTML 文件（参考 533/costco 模板，避免乱码、信息不全） */
    function exportProjectDashboardHtml(block) {
        const dashId = block?.getAttribute('data-dashboard-id');
        let jsonContent = dashId ? (window._tempDashboardContent?.[dashId] || '') : (block?.querySelector('.diagram-code-panel code')?.textContent || '');
        if (!jsonContent) {
            showToast?.('仪表盘数据为空', 'error');
            return;
        }
        try {
            let data = parseProjectDashboardJson(jsonContent);
            if (data['project-dashboard']) data = data['project-dashboard'];
            else if (data.projectDashboard) data = data.projectDashboard;
            const title = escapeHtml(String(data.title || data.标题 || data.project || '项目仪表盘'));
            const project = escapeHtml(String(data.project || data.项目 || '—'));
            const owner = escapeHtml(String(data.owner || data.负责人 || '—'));
            const date = escapeHtml(String(data.date || data.日期 || new Date().toLocaleDateString('zh-CN')));
            const status = escapeHtml(String(data.status || data.状态 || '—'));

            const alertBanner = data.alert_banner || data.alertBanner;
            let alertHtml = '';
            if (alertBanner && typeof alertBanner === 'object' && (alertBanner.level || alertBanner.message)) {
                alertHtml = `<div class="glass-panel rounded-xl p-4 mb-4 border-l-4 border-amber-500"><div class="flex items-center gap-2"><i class="fas fa-exclamation-triangle text-amber-400 text-xl"></i><span class="font-semibold text-amber-200">${escapeHtml(String(alertBanner.level || ''))}</span><span class="text-slate-300 ml-2">${escapeHtml(String(alertBanner.message || ''))}</span></div></div>`;
            } else if (typeof alertBanner === 'string' && alertBanner) {
                alertHtml = `<div class="glass-panel rounded-xl p-4 mb-4 border-l-4 border-amber-500"><div class="flex items-center gap-2"><i class="fas fa-exclamation-triangle text-amber-400 text-xl"></i><span class="text-slate-300">${escapeHtml(alertBanner)}</span></div></div>`;
            }

            const leveragePoints = data.leverage_points || data.leveragePoints || data.杠杆点 || [];
            const lpArr = Array.isArray(leveragePoints) ? leveragePoints : [];
            let lpHtml = lpArr.map(l => `<li><i class="fas fa-check-circle text-emerald-500 mr-2"></i>${escapeHtml(String(typeof l === 'string' ? l : (l.text || l.desc || l.name || '—')))}</li>`).join('');
            if (!lpHtml) lpHtml = '<li><i class="fas fa-check-circle text-emerald-500 mr-2"></i>—</li>';

            const blockerPriority = data.blocker_priority || data.blockerPriority || data.阻塞项优先级 || [];
            let blockerHtml = '';
            (Array.isArray(blockerPriority) ? blockerPriority : []).forEach(b => {
                const items = (b.items || b.blockers || []).length ? (b.items || b.blockers) : [b.item || b.name || b.blocker || b];
                const level = String(b.level || b.priority || '');
                const isP0 = level.indexOf('P0') >= 0 || level.indexOf('致命') >= 0;
                items.forEach(it => {
                    const txt = typeof it === 'string' ? it : (it.text || it.name || it);
                    if (txt) blockerHtml += `<div class="risk-card rounded-lg p-4 ${isP0 ? 'bg-red-500/10 border border-red-500/30' : 'bg-amber-500/10 border border-amber-500/30'} transition-all" data-level="${isP0 ? 'p0' : 'p1'}"><div class="flex justify-between"><span>${escapeHtml(String(txt))}</span><span class="${isP0 ? 'text-red-400' : 'text-amber-400'}">${escapeHtml(level) || (isP0 ? 'P0/致命' : 'P1/严重')}</span></div></div>`;
                });
            });
            if (!blockerHtml) blockerHtml = '<p class="text-slate-400">暂无</p>';

            const criticalClosure = data.critical_closure || data.criticalClosure || data.严重问题闭环 || [];
            const ccArr = Array.isArray(criticalClosure) ? criticalClosure : (criticalClosure.items || []);
            let ccHtml = ccArr.length ? ccArr.map(c => `<div class="flex flex-col md:flex-row md:items-center gap-2 p-3 bg-slate-800/50 rounded-lg"><span class="font-medium">${escapeHtml(String(c.problem || c.name || c.问题 || ''))}</span><span class="text-amber-400">${escapeHtml(String(c.status || c.状态 || ''))}</span><span class="text-slate-400 text-sm">${escapeHtml(String(c.next_action || c.nextAction || c.下一步 || ''))}</span></div>`).join('') : '<p class="text-slate-400">暂无</p>';

            const keyActions = data.key_actions || data.keyActions || data.关键行动 || [];
            const kaArr = Array.isArray(keyActions) ? keyActions : [];
            let kaHtml = kaArr.length ? kaArr.map(a => { const o = typeof a === 'object' ? a : {}; return `<li><span class="text-cyan-400">@${escapeHtml(String(o.owner || o.负责人 || '责任人'))}</span> ${escapeHtml(String(o.action || o.行动 || ''))}</li>`; }).join('') : '<li class="text-slate-400">暂无</li>';

            const resourceLoad = data.resource_load || data.resourceLoad || data.资源负荷 || [];
            const rlArr = Array.isArray(resourceLoad) ? resourceLoad : [];
            let rlHtml = rlArr.length ? rlArr.map(r => { const o = typeof r === 'object' ? r : {}; return `<div class="p-3 rounded-lg bg-slate-800/50"><span class="text-slate-400">${escapeHtml(String(o.name || o.资源 || ''))}</span><p class="font-medium">${escapeHtml(String(o.load || o.负荷 || '—'))}</p></div>`; }).join('') : '<div class="p-3 rounded-lg bg-slate-800/50"><span class="text-slate-400">硬件</span><p class="font-medium">—</p></div><div class="p-3 rounded-lg bg-slate-800/50"><span class="text-slate-400">软件</span><p class="font-medium">—</p></div><div class="p-3 rounded-lg bg-slate-800/50"><span class="text-slate-400">测试</span><p class="font-medium">—</p></div>';

            const html = '\uFEFF' + `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - 项目仪表盘</title>
    <script src="https://cdn.tailwindcss.com"><\/script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        body{font-family:'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif;}
        .glass-panel{background:rgba(15,23,42,0.6);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(148,163,184,0.1);}
        .risk-card:hover{transform:translateY(-2px);box-shadow:0 8px 25px rgba(0,0,0,0.3);}
    </style>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen p-4 md:p-6">
${alertHtml}
<div class="glass-panel rounded-xl p-6 mb-4">
    <h1 class="text-2xl font-bold mb-4"><i class="fas fa-tachometer-alt text-cyan-400 mr-2"></i>${title}</h1>
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div><span class="text-slate-400">项目</span><p class="font-medium">${project}</p></div>
        <div><span class="text-slate-400">负责人</span><p class="font-medium">${owner}</p></div>
        <div><span class="text-slate-400">日期</span><p class="font-medium" id="live-date">${date}</p></div>
        <div><span class="text-slate-400">状态</span><p class="font-medium text-amber-400">${status}</p></div>
    </div>
</div>
<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
    <div class="glass-panel rounded-xl p-4 border-l-4 border-red-500"><div class="text-3xl font-bold text-red-400" id="p0-count">0</div><div class="text-slate-400 text-sm">P0/致命</div></div>
    <div class="glass-panel rounded-xl p-4 border-l-4 border-amber-500"><div class="text-3xl font-bold text-amber-400" id="p1-count">0</div><div class="text-slate-400 text-sm">P1/严重</div></div>
    <div class="glass-panel rounded-xl p-4 border-l-4 border-cyan-500"><div class="text-3xl font-bold text-cyan-400">—</div><div class="text-slate-400 text-sm">进行中任务</div></div>
    <div class="glass-panel rounded-xl p-4 border-l-4 border-emerald-500"><div class="text-3xl font-bold text-emerald-400">—</div><div class="text-slate-400 text-sm">已完成</div></div>
</div>
<div class="glass-panel rounded-xl p-6 mb-4"><h2 class="text-lg font-semibold mb-3"><i class="fas fa-hand-pointer text-cyan-400 mr-2"></i>杠杆点</h2><ul class="space-y-2 text-slate-300">${lpHtml}</ul></div>
<div class="glass-panel rounded-xl p-6 mb-4"><h2 class="text-lg font-semibold mb-3"><i class="fas fa-ban text-red-400 mr-2"></i>阻塞项优先级</h2><div class="space-y-3">${blockerHtml}</div></div>
<div class="glass-panel rounded-xl p-6 mb-4"><h2 class="text-lg font-semibold mb-3"><i class="fas fa-check-double text-emerald-400 mr-2"></i>严重问题闭环</h2><div class="space-y-3 text-slate-300">${ccHtml}</div></div>
<div class="glass-panel rounded-xl p-6 mb-4"><h2 class="text-lg font-semibold mb-3"><i class="fas fa-users text-cyan-400 mr-2"></i>关键资源负荷</h2><div class="grid grid-cols-1 md:grid-cols-3 gap-4">${rlHtml}</div></div>
<div class="glass-panel rounded-xl p-6 mb-4"><h2 class="text-lg font-semibold mb-3"><i class="fas fa-bolt text-cyan-400 mr-2"></i>关键行动</h2><ul class="space-y-3 text-slate-300">${kaHtml}</ul></div>
<footer class="text-center text-slate-500 text-sm py-4">${new Date().toLocaleString('zh-CN')}、工作秘书、MECE,可链接/下载</footer>
<script>document.getElementById('live-date').textContent=new Date().toLocaleDateString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});document.getElementById('p0-count').textContent=document.querySelectorAll('[data-level="p0"]').length;document.getElementById('p1-count').textContent=document.querySelectorAll('[data-level="p1"]').length;</script>
</body>
</html>`;

            const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `项目仪表盘-${Date.now()}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('HTML 已下载', 'success');
        } catch (e) {
            showToast?.('导出失败: ' + (e.message || '解析错误'), 'error');
        }
    }

    function openProjectDashboardHtml(block) {
        const dashId = block?.getAttribute('data-dashboard-id');
        let jsonContent = dashId ? (window._tempDashboardContent?.[dashId] || '') : (block?.querySelector('.diagram-code-panel code')?.textContent || '');
        if (!jsonContent) {
            showToast?.('仪表盘数据为空', 'error');
            return;
        }
        try {
            let data = parseProjectDashboardJson(jsonContent);
            if (data['project-dashboard']) data = data['project-dashboard'];
            else if (data.projectDashboard) data = data.projectDashboard;
            const title = escapeHtml(String(data.title || data.标题 || data.project || '项目仪表盘'));
            const project = escapeHtml(String(data.project || data.项目 || '—'));
            const owner = escapeHtml(String(data.owner || data.负责人 || '—'));
            const date = escapeHtml(String(data.date || data.日期 || new Date().toLocaleDateString('zh-CN')));
            const status = escapeHtml(String(data.status || data.状态 || '—'));
            const alertBanner = data.alert_banner || data.alertBanner;
            let alertHtml = '';
            if (alertBanner && typeof alertBanner === 'object' && (alertBanner.level || alertBanner.message)) {
                alertHtml = `<div class="glass-panel rounded-xl p-4 mb-4 border-l-4 border-amber-500"><div class="flex items-center gap-2"><i class="fas fa-exclamation-triangle text-amber-400 text-xl"></i><span class="font-semibold text-amber-200">${escapeHtml(String(alertBanner.level || ''))}</span><span class="text-slate-300 ml-2">${escapeHtml(String(alertBanner.message || ''))}</span></div></div>`;
            } else if (typeof alertBanner === 'string' && alertBanner) {
                alertHtml = `<div class="glass-panel rounded-xl p-4 mb-4 border-l-4 border-amber-500"><div class="flex items-center gap-2"><i class="fas fa-exclamation-triangle text-amber-400 text-xl"></i><span class="text-slate-300">${escapeHtml(alertBanner)}</span></div></div>`;
            }
            const leveragePoints = data.leverage_points || data.leveragePoints || data.杠杆点 || [];
            const lpArr = Array.isArray(leveragePoints) ? leveragePoints : [];
            let lpHtml = lpArr.map(l => `<li><i class="fas fa-check-circle text-emerald-500 mr-2"></i>${escapeHtml(String(typeof l === 'string' ? l : (l.text || l.desc || l.name || '—')))}</li>`).join('');
            if (!lpHtml) lpHtml = '<li><i class="fas fa-check-circle text-emerald-500 mr-2"></i>—</li>';
            const blockerPriority = data.blocker_priority || data.blockerPriority || data.阻塞项优先级 || [];
            let blockerHtml = '';
            (Array.isArray(blockerPriority) ? blockerPriority : []).forEach(b => {
                const items = (b.items || b.blockers || []).length ? (b.items || b.blockers) : [b.item || b.name || b.blocker || b];
                const level = String(b.level || b.priority || '');
                const isP0 = level.indexOf('P0') >= 0 || level.indexOf('致命') >= 0;
                items.forEach(it => {
                    const txt = typeof it === 'string' ? it : (it.text || it.name || it);
                    if (txt) blockerHtml += `<div class="risk-card rounded-lg p-4 ${isP0 ? 'bg-red-500/10 border border-red-500/30' : 'bg-amber-500/10 border border-amber-500/30'} transition-all" data-level="${isP0 ? 'p0' : 'p1'}"><div class="flex justify-between"><span>${escapeHtml(String(txt))}</span><span class="${isP0 ? 'text-red-400' : 'text-amber-400'}">${escapeHtml(level) || (isP0 ? 'P0/致命' : 'P1/严重')}</span></div></div>`;
                });
            });
            if (!blockerHtml) blockerHtml = '<p class="text-slate-400">暂无</p>';
            const criticalClosure = data.critical_closure || data.criticalClosure || data.严重问题闭环 || [];
            const ccArr = Array.isArray(criticalClosure) ? criticalClosure : (criticalClosure.items || []);
            let ccHtml = ccArr.length ? ccArr.map(c => `<div class="flex flex-col md:flex-row md:items-center gap-2 p-3 bg-slate-800/50 rounded-lg"><span class="font-medium">${escapeHtml(String(c.problem || c.name || c.问题 || ''))}</span><span class="text-amber-400">${escapeHtml(String(c.status || c.状态 || ''))}</span><span class="text-slate-400 text-sm">${escapeHtml(String(c.next_action || c.nextAction || c.下一步 || ''))}</span></div>`).join('') : '<p class="text-slate-400">暂无</p>';
            const keyActions = data.key_actions || data.keyActions || data.关键行动 || [];
            const kaArr = Array.isArray(keyActions) ? keyActions : [];
            let kaHtml = kaArr.length ? kaArr.map(a => { const o = typeof a === 'object' ? a : {}; return `<li><span class="text-cyan-400">@${escapeHtml(String(o.owner || o.负责人 || '责任人'))}</span> ${escapeHtml(String(o.action || o.行动 || ''))}</li>`; }).join('') : '<li class="text-slate-400">暂无</li>';
            const resourceLoad = data.resource_load || data.resourceLoad || data.资源负荷 || [];
            const rlArr = Array.isArray(resourceLoad) ? resourceLoad : [];
            let rlHtml = rlArr.length ? rlArr.map(r => { const o = typeof r === 'object' ? r : {}; return `<div class="p-3 rounded-lg bg-slate-800/50"><span class="text-slate-400">${escapeHtml(String(o.name || o.资源 || ''))}</span><p class="font-medium">${escapeHtml(String(o.load || o.负荷 || '—'))}</p></div>`; }).join('') : '<div class="p-3 rounded-lg bg-slate-800/50"><span class="text-slate-400">硬件</span><p class="font-medium">—</p></div><div class="p-3 rounded-lg bg-slate-800/50"><span class="text-slate-400">软件</span><p class="font-medium">—</p></div><div class="p-3 rounded-lg bg-slate-800/50"><span class="text-slate-400">测试</span><p class="font-medium">—</p></div>';
            const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title} - 项目仪表盘</title><script src="https://cdn.tailwindcss.com"><\/script><link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet"><style>body{font-family:'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif;}.glass-panel{background:rgba(15,23,42,0.6);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(148,163,184,0.1);}.risk-card:hover{transform:translateY(-2px);box-shadow:0 8px 25px rgba(0,0,0,0.3);}</style></head><body class="bg-slate-900 text-slate-100 min-h-screen p-4 md:p-6">${alertHtml}<div class="glass-panel rounded-xl p-6 mb-4"><h1 class="text-2xl font-bold mb-4"><i class="fas fa-tachometer-alt text-cyan-400 mr-2"></i>${title}</h1><div class="grid grid-cols-1 md:grid-cols-4 gap-4"><div><span class="text-slate-400">项目</span><p class="font-medium">${project}</p></div><div><span class="text-slate-400">负责人</span><p class="font-medium">${owner}</p></div><div><span class="text-slate-400">日期</span><p class="font-medium" id="live-date">${date}</p></div><div><span class="text-slate-400">状态</span><p class="font-medium text-amber-400">${status}</p></div></div></div><div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4"><div class="glass-panel rounded-xl p-4 border-l-4 border-red-500"><div class="text-3xl font-bold text-red-400" id="p0-count">0</div><div class="text-slate-400 text-sm">P0/致命</div></div><div class="glass-panel rounded-xl p-4 border-l-4 border-amber-500"><div class="text-3xl font-bold text-amber-400" id="p1-count">0</div><div class="text-slate-400 text-sm">P1/严重</div></div><div class="glass-panel rounded-xl p-4 border-l-4 border-cyan-500"><div class="text-3xl font-bold text-cyan-400">—</div><div class="text-slate-400 text-sm">进行中任务</div></div><div class="glass-panel rounded-xl p-4 border-l-4 border-emerald-500"><div class="text-3xl font-bold text-emerald-400">—</div><div class="text-slate-400 text-sm">已完成</div></div></div><div class="glass-panel rounded-xl p-6 mb-4"><h2 class="text-lg font-semibold mb-3"><i class="fas fa-hand-pointer text-cyan-400 mr-2"></i>杠杆点</h2><ul class="space-y-2 text-slate-300">${lpHtml}</ul></div><div class="glass-panel rounded-xl p-6 mb-4"><h2 class="text-lg font-semibold mb-3"><i class="fas fa-ban text-red-400 mr-2"></i>阻塞项优先级</h2><div class="space-y-3">${blockerHtml}</div></div><div class="glass-panel rounded-xl p-6 mb-4"><h2 class="text-lg font-semibold mb-3"><i class="fas fa-check-double text-emerald-400 mr-2"></i>严重问题闭环</h2><div class="space-y-3 text-slate-300">${ccHtml}</div></div><div class="glass-panel rounded-xl p-6 mb-4"><h2 class="text-lg font-semibold mb-3"><i class="fas fa-users text-cyan-400 mr-2"></i>关键资源负荷</h2><div class="grid grid-cols-1 md:grid-cols-3 gap-4">${rlHtml}</div></div><div class="glass-panel rounded-xl p-6 mb-4"><h2 class="text-lg font-semibold mb-3"><i class="fas fa-bolt text-cyan-400 mr-2"></i>关键行动</h2><ul class="space-y-3 text-slate-300">${kaHtml}</ul></div><footer class="text-center text-slate-500 text-sm py-4">${new Date().toLocaleString('zh-CN')}、工作秘书、MECE</footer><script>document.getElementById('live-date').textContent=new Date().toLocaleDateString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});document.getElementById('p0-count').textContent=document.querySelectorAll('[data-level="p0"]').length;document.getElementById('p1-count').textContent=document.querySelectorAll('[data-level="p1"]').length;</script></body></html>`;
            const win = window.open('', '_blank');
            if (win) { win.document.write(html); win.document.close(); }
        } catch (e) {
            showToast?.('打开失败: ' + (e.message || '解析错误'), 'error');
        }
    }

    /** 风险矩阵：导出/打开 HTML */
    function buildRiskMatrixHtml(block) {
        const codeEl = block?.querySelector('.diagram-code-panel code');
        const raw = codeEl?.textContent?.trim() || '';
        if (!raw) return null;
        let high = [], medium = [], low = [];
        try {
            if (raw.startsWith('{')) {
                const data = JSON.parse(sanitizeJsonForParse(raw));
                high = data.high || data.high_risk || data.高风险 || [];
                medium = data.medium || data.medium_risk || data.中风险 || [];
                low = data.low || data.low_risk || data.低风险 || [];
            } else {
                const lines = raw.split(/\r?\n/);
                let current = null;
                for (let i = 0; i < lines.length; i++) {
                    const t = lines[i].trim();
                    if (/^(#+\s*|\*{0,2})?(高风险|High\s*Risk|high)(\s*[（(].*)?[：:]?\s*$/i.test(t)) { current = 'high'; continue; }
                    if (/^(#+\s*|\*{0,2})?(中风险|Medium\s*Risk|medium)(\s*[（(].*)?[：:]?\s*$/i.test(t)) { current = 'medium'; continue; }
                    if (/^(#+\s*|\*{0,2})?(低风险|Low\s*Risk|low)(\s*[（(].*)?[：:]?\s*$/i.test(t)) { current = 'low'; continue; }
                    const m = lines[i].match(/^\s*[-*]?\s*\d+\.?\s*(.+)$/) || lines[i].match(/^\s*[-*]\s+(.+)$/);
                    if (m && current) {
                        const item = m[1].trim();
                        if (item && !/^(高风险|中风险|低风险|High|Medium|Low)/i.test(item)) {
                            if (current === 'high') high.push(item);
                            else if (current === 'medium') medium.push(item);
                            else low.push(item);
                        }
                    }
                }
            }
            high = Array.isArray(high) ? high : [];
            medium = Array.isArray(medium) ? medium : [];
            low = Array.isArray(low) ? low : [];
        } catch (e) { return null; }
        const toLi = (arr) => arr.map(x => `<li>${escapeHtml(String(typeof x === 'string' ? x : (x.text || x.desc || x.name || JSON.stringify(x))))}</li>`).join('');
        const highUl = high.length ? `<div class="risk-matrix-col risk-high"><div class="risk-matrix-header"><i class="fas fa-circle"></i> 高风险</div><ul>${toLi(high)}</ul></div>` : '<div class="risk-matrix-col risk-high"><div class="risk-matrix-header"><i class="fas fa-circle"></i> 高风险</div><ul><li class="text-slate-400">暂无</li></ul></div>';
        const medUl = medium.length ? `<div class="risk-matrix-col risk-medium"><div class="risk-matrix-header"><i class="fas fa-circle"></i> 中风险</div><ul>${toLi(medium)}</ul></div>` : '<div class="risk-matrix-col risk-medium"><div class="risk-matrix-header"><i class="fas fa-circle"></i> 中风险</div><ul><li class="text-slate-400">暂无</li></ul></div>';
        const lowUl = low.length ? `<div class="risk-matrix-col risk-low"><div class="risk-matrix-header"><i class="fas fa-circle"></i> 低风险</div><ul>${toLi(low)}</ul></div>` : '<div class="risk-matrix-col risk-low"><div class="risk-matrix-header"><i class="fas fa-circle"></i> 低风险</div><ul><li class="text-slate-400">暂无</li></ul></div>';
        return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>风险矩阵</title><script src="https://cdn.tailwindcss.com"><\/script><link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet"><style>body{font-family:'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif;}.glass-panel{background:rgba(15,23,42,0.6);backdrop-filter:blur(12px);}.risk-matrix-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;}.risk-high .risk-matrix-header{color:#f87171;}.risk-medium .risk-matrix-header{color:#fbbf24;}.risk-low .risk-matrix-header{color:#34d399;}</style></head><body class="bg-slate-900 text-slate-100 min-h-screen p-4 md:p-6"><div class="glass-panel rounded-xl p-6"><h2 class="text-xl font-bold mb-4"><i class="fas fa-exclamation-triangle text-amber-400 mr-2"></i>风险矩阵</h2><div class="risk-matrix-grid">${highUl}${medUl}${lowUl}</div></div><footer class="text-center text-slate-500 text-sm py-4">${new Date().toLocaleString('zh-CN')}</footer></body></html>`;
    }

    function exportRiskMatrixHtml(block) {
        const html = buildRiskMatrixHtml(block);
        if (!html) { showToast?.('风险矩阵数据为空', 'error'); return; }
        const blob = new Blob(['\uFEFF' + html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `风险矩阵-${Date.now()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('HTML 已下载', 'success');
    }

    function openRiskMatrixHtml(block) {
        const html = buildRiskMatrixHtml(block);
        if (!html) { showToast?.('风险矩阵数据为空', 'error'); return; }
        const win = window.open('', '_blank');
        if (win) { win.document.write(html); win.document.close(); }
    }

    // ==================== 检测输出格式 ====================
    function detectOutputFormat(content) {
        if (!content) return 'markdown';

        // 检测H5/网页内容
        if (content.match(/^(H5|网页|HTML|webpage)/im) || content.includes('<!DOCTYPE html>') || content.includes('<html')) {
            return 'h5';
        }

        // 检测PDF文档
        if (content.match(/^(PDF|文档|pdf)/im) || content.includes('PDF文档') || content.includes('【PDF】')) {
            return 'pdf';
        }

        // 检测Word文档
        if (content.match(/^(Word|DOC|文档)/im) || content.includes('Word文档') || content.includes('【DOC】')) {
            return 'doc';
        }

        // 检测电子表格
        if (content.match(/^(表格|电子表格|Excel|Spreadsheet)/im) || content.includes('【表格】') || content.includes('【电子表格】')) {
            return 'spreadsheet';
        }

        // 检测表格（优先于代码：含表格+代码块时用 markdown 渲染，避免 <strong>/<br> 被转义显示）
        if (content.match(/\|.*\|.*\|/)) {
            return 'table';
        }

        // 【关键】含图表/仪表板块时强制使用 markdown，否则会被当作 code 格式整段转义，导致 HTML 与图表无法渲染
        const diagramMarkers = ['```project-dashboard', '```mermaid', '```chart', '```decision-matrix',
            '```decision-chain', '```probability', '```problem-evolution', '```milestones', '```dependency-graph', '```risk-matrix'];
        if (diagramMarkers.some(m => content.includes(m))) {
            return 'markdown';
        }

        // 检测代码（纯代码输出，非混合 markdown）
        if (content.includes('```') || content.match(/^(function|class|const|let|var|import|export|def|class\s+\w+)/m)) {
            return 'code';
        }

        // 检测PPT/幻灯片
        if (content.match(/^(幻灯片|Slide|PPT|演示文稿)\s*\d+/im) || content.match(/^#+\s*第\s*\d+\s*[页张]/im)) {
            return 'ppt';
        }

        // 检测图片生成提示
        if (content.match(/^(图片|Image|生成图片|Generate image)/im) || content.includes('![image]')) {
            return 'image';
        }

        return 'markdown';
    }

    // ==================== 根据格式渲染内容 ====================
    function renderContentByFormat(content, format) {
        switch (format) {
            case 'code':
                return renderCodeContent(content);
            case 'ppt':
                return renderPPTContent(content);
            case 'image':
                return renderImageContent(content);
            case 'table':
                return renderTableContent(content);
            case 'h5':
                return renderH5Content(content);
            case 'pdf':
                return renderPDFContent(content);
            case 'doc':
                return renderDOCContent(content);
            case 'spreadsheet':
                return renderSpreadsheetContent(content);
            case 'markdown':
            default:
                return renderMarkdown(content);
        }
    }

    // 渲染代码内容
    function renderCodeContent(content) {
        // 提取代码块
        let html = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            return `<pre class="code-block"><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`;
        });
        
        // 如果没有代码块，将整个内容作为代码块
        if (!html.includes('<pre class="code-block">')) {
            html = `<pre class="code-block"><code>${escapeHtml(content)}</code></pre>`;
        }
        
        // 添加代码操作按钮
        html = `<div class="code-output-container">
            <div class="code-output-header">
                <span class="code-output-label"><i class="fas fa-code"></i> 代码</span>
                <button class="btn-icon btn-copy-code" onclick="AIAgentUI.copyCode(this)" title="复制代码">
                    <i class="fas fa-copy"></i>
                </button>
            </div>
            ${html}
        </div>`;
        
        return html;
    }

    // 渲染PPT内容
    function renderPPTContent(content) {
        // 解析幻灯片
        const slides = [];
        const lines = content.split('\n');
        let currentSlide = null;
        
        for (const line of lines) {
            const slideMatch = line.match(/^(?:幻灯片|Slide)\s*(\d+)[:：]?\s*(.*)/i) ||
                              line.match(/^#+\s*第\s*(\d+)\s*[页张][:：]?\s*(.*)/i);
            
            if (slideMatch) {
                if (currentSlide) slides.push(currentSlide);
                currentSlide = {
                    number: slideMatch[1],
                    title: slideMatch[2] || '',
                    content: []
                };
            } else if (currentSlide) {
                currentSlide.content.push(line);
            }
        }
        
        if (currentSlide) slides.push(currentSlide);
        
        // 如果没有解析到幻灯片，使用默认渲染
        if (slides.length === 0) {
            return renderMarkdown(content);
        }
        
        // 渲染幻灯片
        let html = '<div class="ppt-output-container">';
        html += '<div class="ppt-output-header">';
        html += '<span class="ppt-output-label"><i class="fas fa-presentation"></i> 演示文稿</span>';
        html += `<span class="ppt-slide-count">${slides.length} 页</span>`;
        html += '</div>';
        html += '<div class="ppt-slides">';
        
        slides.forEach((slide, index) => {
            const slideContent = renderMarkdown(slide.content.join('\n'));
            html += `
                <div class="ppt-slide" data-slide="${index + 1}">
                    <div class="ppt-slide-number">${slide.number}</div>
                    <div class="ppt-slide-title">${escapeHtml(slide.title)}</div>
                    <div class="ppt-slide-content">${slideContent}</div>
                </div>
            `;
        });
        
        html += '</div></div>';
        return html;
    }

    // 渲染图片内容
    function renderImageContent(content) {
        // 提取图片URL或生成提示
        const imageUrls = [];
        const urlMatches = content.match(/!\[([^\]]*)\]\(([^)]+)\)/g);
        
        if (urlMatches) {
            urlMatches.forEach(match => {
                const urlMatch = match.match(/!\[([^\]]*)\]\(([^)]+)\)/);
                if (urlMatch) {
                    imageUrls.push({ alt: urlMatch[1], url: urlMatch[2] });
                }
            });
        }
        
        // 渲染图片
        let html = '<div class="image-output-container">';
        html += '<div class="image-output-header">';
        html += '<span class="image-output-label"><i class="fas fa-image"></i> 图片</span>';
        html += '</div>';
        html += '<div class="image-gallery">';
        
        if (imageUrls.length > 0) {
            imageUrls.forEach(img => {
                html += `
                    <div class="image-item">
                        <img src="${img.url}" alt="${escapeHtml(img.alt)}" loading="lazy">
                        <div class="image-caption">${escapeHtml(img.alt)}</div>
                    </div>
                `;
            });
        } else {
            // 显示图片生成提示
            html += `<div class="image-prompt">${renderMarkdown(content)}</div>`;
        }
        
        html += '</div></div>';
        return html;
    }

    // 渲染表格内容
    function renderTableContent(content) {
        // content 已是 renderMarkdown 的产物（含 <strong>/<br> 等），直接使用，避免二次渲染破坏格式
        let html = content;

        // 包装表格
        html = `<div class="table-output-container">
            <div class="table-output-header">
                <span class="table-output-label"><i class="fas fa-table"></i> 表格</span>
            </div>
            <div class="table-wrapper">${html}</div>
        </div>`;

        return html;
    }

    // 渲染H5内容
    function renderH5Content(content) {
        let htmlContent = content;
        const isFullHtml = /<!DOCTYPE\s+html[\s\S]*<\/html>\s*$/i.test(content.trim());
        if (content.includes('<!DOCTYPE html>') || content.includes('<html')) {
            htmlContent = content;
        } else {
            htmlContent = renderMarkdown(content);
        }

        // 完整 HTML 文档存入临时存储，供下载/预览使用（避免 innerHTML 解析后丢失结构或乱码）
        let dataH5Id = '';
        if (isFullHtml) {
            const h5Id = 'h5_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            if (!window._tempH5Content) window._tempH5Content = {};
            window._tempH5Content[h5Id] = htmlContent;
            dataH5Id = ` data-h5-id="${h5Id}"`;
        }

        return `<div class="h5-output-container"${dataH5Id}>
            <div class="h5-output-header">
                <span class="h5-output-label"><i class="fas fa-mobile-alt"></i> H5 网页</span>
                <div class="h5-output-actions">
                    <button class="btn-icon h5-preview-btn" title="预览">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon h5-download-btn" title="下载HTML">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </div>
            <div class="h5-preview-frame">
                <div class="h5-preview-content">${htmlContent}</div>
            </div>
        </div>`;
    }

    // 渲染PDF内容
    function renderPDFContent(content) {
        // 提取PDF内容（通常是Markdown格式）
        const pdfContent = content.replace(/^(PDF|pdf|【PDF】)\s*/im, '').trim();

        // 生成唯一ID用于存储PDF内容
        const pdfId = 'pdf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // 将PDF内容存储到临时存储中
        if (!window._tempPDFContent) window._tempPDFContent = {};
        window._tempPDFContent[pdfId] = pdfContent;
        
        return `<div class="pdf-output-container">
            <div class="pdf-output-header">
                <span class="pdf-output-label"><i class="fas fa-file-pdf"></i> PDF 文档</span>
                <div class="pdf-output-actions">
                    <button class="btn-icon pdf-download-btn" data-pdf-id="${pdfId}" title="下载PDF">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </div>
            <div class="pdf-preview">
                <div class="pdf-page">
                    ${renderMarkdown(pdfContent)}
                </div>
            </div>
        </div>`;
    }

    // 渲染DOC内容
    function renderDOCContent(content) {
        // 提取文档内容
        const docContent = content.replace(/^(Word|DOC|文档|【DOC】)\s*/im, '').trim();

        // 生成唯一ID用于存储DOC内容
        const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // 将DOC内容存储到临时存储中
        if (!window._tempDOCContent) window._tempDOCContent = {};
        window._tempDOCContent[docId] = docContent;
        
        return `<div class="doc-output-container">
            <div class="doc-output-header">
                <span class="doc-output-label"><i class="fas fa-file-word"></i> Word 文档</span>
                <div class="doc-output-actions">
                    <button class="btn-icon doc-download-btn" data-doc-id="${docId}" title="下载DOC">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </div>
            <div class="doc-preview">
                ${renderMarkdown(docContent)}
            </div>
        </div>`;
    }

    // 渲染电子表格内容
    function renderSpreadsheetContent(content) {
        // 提取表格数据
        const tables = extractMarkdownTables(content);

        let html = '<div class="spreadsheet-output-container">';
        html += '<div class="spreadsheet-output-header">';
        html += '<span class="spreadsheet-output-label"><i class="fas fa-file-excel"></i> 电子表格</span>';
        html += '<div class="spreadsheet-output-actions">';
        html += '<button class="btn-icon csv-download-btn" title="下载CSV"><i class="fas fa-download"></i></button>';
        html += '</div>';
        html += '</div>';
        html += '<div class="spreadsheet-preview">';

        if (tables.length > 0) {
            tables.forEach((table, index) => {
                html += `<div class="spreadsheet-sheet" data-sheet="${index}">`;
                html += renderMarkdown(table);
                html += '</div>';
            });
        } else {
            html += '<div class="spreadsheet-sheet">';
            html += renderMarkdown(content);
            html += '</div>';
        }

        html += '</div></div>';
        return html;
    }

    // 提取Markdown表格
    function extractMarkdownTables(content) {
        const tableRegex = /(\|.+\|\n\|[-:| ]+\|\n(?:\|.+(?:\n|$))+)/g;
        const tables = [];
        let match;
        while ((match = tableRegex.exec(content)) !== null) {
            tables.push(match[0]);
        }
        return tables;
    }

    // 复制代码
    function copyCode(btn) {
        const codeBlock = btn.closest('.code-output-container').querySelector('code');
        if (codeBlock) {
            navigator.clipboard.writeText(codeBlock.textContent).then(() => {
                showToast('代码已复制', 'success');
            }).catch(() => {
                showToast('复制失败', 'error');
            });
        }
    }

    // ==================== 多模态输出操作 ====================
    function previewH5(btn) {
        const container = btn.closest('.h5-output-container');
        const h5Id = container?.getAttribute('data-h5-id');
        let content = h5Id ? (window._tempH5Content?.[h5Id] || '') : (container?.querySelector('.h5-preview-content')?.innerHTML || '');
        if (!content) {
            showToast?.('预览内容为空', 'error');
            return;
        }
        const isFullDoc = /<!DOCTYPE\s+html[\s\S]*<\/html>\s*$/i.test(content.trim());
        const htmlToWrite = isFullDoc ? content : buildH5Wrapper(content, 'H5 预览');
        const previewWindow = window.open('', '_blank');
        if (!previewWindow) {
            showToast?.('弹窗被拦截，请允许站点弹窗后重试', 'warning');
            return;
        }
        previewWindow.document.write(htmlToWrite);
        previewWindow.document.close();
    }

    function downloadH5(btn) {
        const container = btn.closest('.h5-output-container');
        const h5Id = container?.getAttribute('data-h5-id');
        let content = h5Id ? (window._tempH5Content?.[h5Id] || '') : (container?.querySelector('.h5-preview-content')?.innerHTML || '');
        if (!content) {
            showToast?.('下载内容为空', 'error');
            return;
        }
        const isFullDoc = /<!DOCTYPE\s+html[\s\S]*<\/html>\s*$/i.test(content.trim());
        const htmlContent = isFullDoc ? content : buildH5Wrapper(content, 'AI Agent Pro 导出');
        const blob = new Blob(['\uFEFF' + htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-agent-export-${Date.now()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('HTML文件已下载', 'success');
    }

    /** 构建 H5 包装页（含 UTF-8 声明、中文字体，避免乱码） */
    function buildH5Wrapper(bodyContent, title) {
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <style>
        body { font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', -apple-system, sans-serif; padding: 20px; max-width: 900px; margin: 0 auto; line-height: 1.6; }
        img { max-width: 100%; height: auto; }
        pre { background: #f4f4f4; padding: 15px; border-radius: 8px; overflow-x: auto; }
        code { font-family: 'Consolas', 'Monaco', monospace; background: #f4f4f4; padding: 2px 6px; border-radius: 4px; }
        table { border-collapse: collapse; width: 100%; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f5f5f5; }
        h1, h2, h3, h4 { color: #333; }
        blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 16px; color: #666; }
    </style>
</head>
<body>${bodyContent}</body>
</html>`;
    }

    function downloadAsPDF(contentOrId) {
        let content = contentOrId;
        
        // 如果传入的是ID，从临时存储中获取内容
        if (typeof contentOrId === 'string' && contentOrId.startsWith('pdf_')) {
            content = window._tempPDFContent?.[contentOrId] || '';
            if (!content) {
                // 如果临时存储中没有，尝试从DOM中获取
                const container = document.querySelector(`[data-pdf-id="${contentOrId}"]`)?.closest('.pdf-output-container');
                if (container) {
                    const pdfPage = container.querySelector('.pdf-page');
                    if (pdfPage) {
                        content = pdfPage.innerText || pdfPage.textContent || '';
                    }
                }
            }
        }
        
        if (!content) {
            showToast('PDF内容为空', 'error');
            return;
        }
        
        // 由于浏览器无法直接生成PDF，我们生成一个HTML文件，用户可以使用浏览器的打印功能保存为PDF
        const htmlContent = '\uFEFF' + `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>PDF 文档</title>
    <style>
        body { font-family: 'SimSun', 'Songti SC', serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.8; }
        @media print { body { padding: 0; } }
        h1 { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
        pre { background: #f9f9f9; padding: 15px; border: 1px solid #ddd; }
        code { font-family: 'Consolas', monospace; }
    </style>
</head>
<body>${escapeHtml(content)}</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const previewWindow = window.open(url, '_blank');

        showToast('请在打开的页面中使用 Ctrl+P 保存为PDF', 'info');
    }

    function downloadAsDOC(contentOrId) {
        let content = contentOrId;
        
        // 如果传入的是ID，从临时存储中获取内容
        if (typeof contentOrId === 'string' && contentOrId.startsWith('doc_')) {
            content = window._tempDOCContent?.[contentOrId] || '';
            if (!content) {
                // 如果临时存储中没有，尝试从DOM中获取
                const container = document.querySelector(`[data-doc-id="${contentOrId}"]`)?.closest('.doc-output-container');
                if (container) {
                    const docPreview = container.querySelector('.doc-preview');
                    if (docPreview) {
                        content = docPreview.innerText || docPreview.textContent || '';
                    }
                }
            }
        }
        
        if (!content) {
            showToast('文档内容为空', 'error');
            return;
        }
        
        // 生成一个HTML文件，可以被Word打开
        const htmlContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
    <meta charset="utf-8">
    <title>Word 文档</title>
    <style>
        body { font-family: 'SimSun', 'Songti SC', serif; font-size: 12pt; line-height: 1.5; }
        h1 { font-size: 18pt; font-weight: bold; }
        h2 { font-size: 16pt; font-weight: bold; }
        h3 { font-size: 14pt; font-weight: bold; }
        pre { background: #f5f5f5; padding: 10px; border: 1px solid #ccc; }
        code { font-family: 'Courier New', monospace; background: #f5f5f5; }
    </style>
</head>
<body>${escapeHtml(content)}</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-agent-export-${Date.now()}.doc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Word文档已下载', 'success');

        showToast('Word文档已下载', 'success');
    }

    function downloadAsCSV(btn) {
        const container = btn.closest('.spreadsheet-output-container');
        const tables = container.querySelectorAll('table');

        if (tables.length === 0) {
            showToast('没有找到表格数据', 'error');
            return;
        }

        // 将第一个表格转换为CSV
        const table = tables[0];
        let csv = '';

        table.querySelectorAll('tr').forEach(row => {
            const cells = row.querySelectorAll('th, td');
            const rowData = Array.from(cells).map(cell => `"${cell.textContent.replace(/"/g, '""')}"`).join(',');
            csv += rowData + '\n';
        });

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-agent-data-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('CSV文件已下载', 'success');
    }

    // ==================== 消息操作 ====================
    function copyMessage(messageId) {
        if (!messageId) {
            showToast('消息ID无效', 'error');
            return;
        }
        
        // 尝试从AppState.messages中查找
        let msg = (window.AppState.messages || []).find(m => m.id === messageId);
        
        // 如果找不到，尝试从DOM元素中获取消息内容（降级方案）
        if (!msg) {
            const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
            if (messageEl) {
                const messageBody = messageEl.querySelector('.message-body');
                if (messageBody) {
                    // 从DOM中提取文本内容
                    const textToCopy = messageBody.innerText || messageBody.textContent || '';
                    if (textToCopy.trim()) {
                        // 使用降级方案复制
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                            navigator.clipboard.writeText(textToCopy).then(() => {
                                showToast('已复制到剪贴板', 'success');
                            }).catch(() => {
                                fallbackCopyText(textToCopy);
                            });
                        } else {
                            fallbackCopyText(textToCopy);
                        }
                        return;
                    }
                }
            }
            showToast('消息不存在', 'error');
            window.Logger?.warn('复制消息失败，消息ID:', messageId, '可用消息:', window.AppState.messages?.map(m => m.id));
            return;
        }

        const textToCopy = msg.content || '';

        // 优先使用现代剪贴板API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                showToast('已复制到剪贴板', 'success');
            }).catch((err) => {
                window.Logger?.warn('剪贴板API失败，尝试fallback方法:', err);
                // 降级到传统方法
                fallbackCopyText(textToCopy);
            });
        } else {
            // 使用传统方法
            fallbackCopyText(textToCopy);
        }
    }

    // 降级复制方法
    function fallbackCopyText(text) {
        try {
            // 创建临时textarea元素
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-999999px';
            textarea.style.top = '-999999px';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textarea);
            
            if (successful) {
                showToast('已复制到剪贴板', 'success');
            } else {
                showToast('复制失败，请手动选择文本复制', 'error');
            }
        } catch (err) {
            window.Logger?.error('复制失败:', err);
            showToast('复制失败，请手动选择文本复制', 'error');
        }
    }

    function openMessage(messageId) {
        const msg = findMessageById(messageId);
        if (!msg) {
            showToast('消息不存在或无法加载', 'error');
            return;
        }
        const htmlContent = formatAsHTML(msg);
        const win = window.open('', '_blank');
        if (!win) {
            showToast('弹窗被拦截，请允许站点弹窗后重试', 'warning');
            return;
        }
        win.document.write(htmlContent);
        win.document.close();
    }

    function findMessageById(messageId) {
        let msg = (window.AppState?.messages || []).find(m => m.id === messageId);
        if (!msg && (window.AppState?.chats || []).length > 0) {
            for (const chat of window.AppState.chats) {
                msg = (chat.messages || []).find(m => m.id === messageId);
                if (msg) break;
            }
        }
        return msg;
    }

    function downloadMessage(messageId) {
        if (!messageId) {
            showToast('消息ID无效', 'error');
            return;
        }
        const msg = findMessageById(messageId);
        if (!msg) {
            showToast('消息不存在或无法加载', 'error');
            return;
        }
        showDownloadFormatDialog(msg);
    }

    function showDownloadFormatDialog(msg) {
        const dialog = document.createElement('div');
        dialog.className = 'modal active';
        dialog.id = 'download-format-dialog';
        
        const timestamp = new Date(msg.timestamp).toISOString().slice(0, 19).replace(/:/g, '-');
        
        dialog.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3><i class="fas fa-download"></i> 导出消息</h3>
                    <button class="modal-close" onclick="AIAgentUI.closeModal('download-format-dialog')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 1rem;">
                        选择导出格式：
                    </p>
                    <div class="download-format-options">
                        <button class="download-format-btn" data-format="markdown">
                            <i class="fas fa-file-alt"></i>
                            <span>Markdown</span>
                            <small>.md</small>
                        </button>
                        <button class="download-format-btn" data-format="html">
                            <i class="fas fa-file-code"></i>
                            <span>HTML</span>
                            <small>.html</small>
                        </button>
                        <button class="download-format-btn" data-format="txt">
                            <i class="fas fa-file-word"></i>
                            <span>纯文本</span>
                            <small>.txt</small>
                        </button>
                        <button class="download-format-btn" data-format="json">
                            <i class="fas fa-file-code"></i>
                            <span>JSON</span>
                            <small>.json</small>
                        </button>
                        <button class="download-format-btn" data-format="image">
                            <i class="fas fa-image"></i>
                            <span>图片</span>
                            <small>.png</small>
                        </button>
                        <button class="download-format-btn" data-format="pdf">
                            <i class="fas fa-file-pdf"></i>
                            <span>PDF</span>
                            <small>.pdf</small>
                        </button>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="AIAgentUI.closeModal('download-format-dialog')">取消</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // 绑定格式选择事件
        dialog.querySelectorAll('.download-format-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const format = btn.dataset.format;
                downloadMessageByFormat(msg, format);
                closeModal('download-format-dialog');
            });
        });
    }

    function downloadMessageByFormat(msg, format) {
        const timestamp = new Date(msg.timestamp).toISOString().slice(0, 19).replace(/:/g, '-');
        let content, filename, mimeType;

        switch (format) {
            case 'markdown':
                filename = `message-${msg.role}-${timestamp}.md`;
                mimeType = 'text/markdown;charset=utf-8';
                content = formatAsMarkdown(msg);
                break;
            case 'html':
                filename = `message-${msg.role}-${timestamp}.html`;
                mimeType = 'text/html;charset=utf-8';
                content = formatAsHTML(msg);
                break;
            case 'txt':
                filename = `message-${msg.role}-${timestamp}.txt`;
                mimeType = 'text/plain;charset=utf-8';
                content = formatAsText(msg);
                break;
            case 'json':
                filename = `message-${msg.role}-${timestamp}.json`;
                mimeType = 'application/json;charset=utf-8';
                content = formatAsJSON(msg);
                break;
            case 'image':
                downloadAsImage(msg);
                return;
            case 'pdf':
                downloadAsPDF(msg);
                return;
            default:
                filename = `message-${msg.role}-${timestamp}.md`;
                mimeType = 'text/markdown;charset=utf-8';
                content = formatAsMarkdown(msg);
        }

        try {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast(`已导出为 ${format.toUpperCase()}`, 'success');
        } catch (err) {
            window.Logger?.error?.('下载失败:', err);
            showToast('下载失败，请重试', 'error');
        }
    }

    function formatAsMarkdown(msg) {
        let content = '';
        if (msg.thinking) {
            content += `## 思考过程\n\n${msg.thinking}\n\n---\n\n`;
        }
        content += `## ${msg.role === 'user' ? '用户' : 'AI'}\n\n${msg.content}`;
        return content;
    }

    function formatAsHTML(msg) {
        const thinkingSection = msg.thinking ? `
            <div class="thinking-section">
                <h3>思考过程</h3>
                <pre>${escapeHtml(msg.thinking)}</pre>
            </div>
            <hr>
        ` : '';
        
        return '\uFEFF' + `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Agent Pro - 消息记录</title>
    <style>
        body { font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', -apple-system, sans-serif; max-width: 900px; margin: 40px auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { border-bottom: 1px solid #eee; padding-bottom: 16px; margin-bottom: 24px; }
        .header h1 { margin: 0; font-size: 1.5rem; }
        .header time { color: #999; font-size: 0.875rem; }
        .thinking-section { background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
        .thinking-section h3 { margin-top: 0; color: #666; font-size: 1rem; }
        .thinking-section pre { white-space: pre-wrap; word-wrap: break-word; font-family: monospace; font-size: 0.875rem; color: #555; }
        .message-content { line-height: 1.8; }
        .message-content pre { background: #f4f4f4; padding: 16px; border-radius: 8px; overflow-x: auto; }
        .message-content code { font-family: 'Consolas', 'Monaco', monospace; }
        hr { border: none; border-top: 1px solid #eee; margin: 24px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${msg.role === 'user' ? '用户消息' : 'AI回复'}</h1>
            <time>${new Date(msg.timestamp).toLocaleString('zh-CN')}</time>
        </div>
        ${thinkingSection}
        <div class="message-content">
            ${renderContentByFormat(renderMarkdown(msg.content), msg.outputFormat || detectOutputFormat(msg.content))}
        </div>
    </div>
</body>
</html>`;
    }

    function formatAsText(msg) {
        let content = '';
        content += `角色: ${msg.role === 'user' ? '用户' : 'AI'}\n`;
        content += `时间: ${new Date(msg.timestamp).toLocaleString('zh-CN')}\n`;
        content += `===================\n\n`;
        if (msg.thinking) {
            content += `[思考过程]\n${msg.thinking}\n\n`;
            content += `===================\n\n`;
        }
        content += `${msg.content}`;
        return content;
    }

    function formatAsJSON(msg) {
        return JSON.stringify({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            thinking: msg.thinking || null,
            timestamp: msg.timestamp,
            outputFormat: msg.outputFormat || 'markdown',
            attachments: msg.attachments || []
        }, null, 2);
    }

    // 下载为图片
    function downloadAsImage(msg) {
        const messageEl = document.querySelector(`[data-message-id="${msg.id}"]`);
        if (!messageEl) {
            showToast('无法找到消息元素', 'error');
            return;
        }
        
        // 使用html2canvas或类似库
        // 这里使用简单的文本转图片方式
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 设置画布尺寸
        canvas.width = 800;
        canvas.height = 600;
        
        // 绘制背景
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制标题
        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText('AI Agent Pro', 20, 40);
        
        // 绘制时间
        ctx.fillStyle = '#888';
        ctx.font = '12px sans-serif';
        ctx.fillText(new Date(msg.timestamp).toLocaleString('zh-CN'), 20, 65);
        
        // 绘制分隔线
        ctx.strokeStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(20, 80);
        ctx.lineTo(780, 80);
        ctx.stroke();
        
        // 绘制内容
        ctx.fillStyle = '#fff';
        ctx.font = '14px sans-serif';
        const lines = msg.content.split('\n');
        let y = 110;
        const maxWidth = 760;
        
        for (const line of lines.slice(0, 30)) {
            if (y > 580) break;
            const words = line || ' ';
            ctx.fillText(words.substring(0, 100), 20, y);
            y += 22;
        }
        
        canvas.toBlob(blob => {
            if (!blob) {
                showToast('生成图片失败', 'error');
                return;
            }
            try {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `message-${msg.role}-${new Date(msg.timestamp).toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast('已导出为图片', 'success');
            } catch (e) {
                showToast('下载失败', 'error');
            }
        }, 'image/png');
    }

    // 下载为PDF（通过打印对话框另存为PDF）
    function downloadAsPDF(msg) {
        const htmlContent = formatAsHTML(msg);
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showToast('弹窗被阻止，请允许弹窗后重试', 'error');
            return;
        }
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
            showToast('请使用浏览器的"另存为PDF"功能', 'info');
        }, 500);
    }

    function speakMessage(messageId) {
        const msg = (window.AppState.messages || []).find(m => m.id === messageId);
        if (!msg) return;

        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(msg.content);
            utterance.lang = 'zh-CN';
            utterance.rate = 1;
            window.speechSynthesis.speak(utterance);
        } else {
            showToast('您的浏览器不支持语音播放', 'error');
        }
    }

    function regenerateMessage(messageId) {
        const messages = window.AppState.messages || [];
        const index = messages.findIndex(m => m.id === messageId);
        if (index === -1) return;

        window.AppState.messages = messages.slice(0, index);

        renderMessages();
        window.AIAgentEvents?.updateCurrentChat?.();
        window.AIAgentApp?.saveState?.();
        window.AIAgentEvents?.sendMessage?.();
    }

    function editMessage(messageId) {
        const msg = (window.AppState.messages || []).find(m => m.id === messageId);
        if (!msg) return;

        const newContent = prompt('编辑消息:', msg.content);
        if (newContent === null) return;

        msg.content = newContent;
        msg.edited = true;
        msg.timestamp = Date.now();

        renderMessages();
        window.AIAgentEvents?.updateCurrentChat?.();
        window.AIAgentApp?.saveState?.();
    }

    function deleteMessage(messageId) {
        if (!confirm('确定要删除这条消息吗？')) return;

        window.AppState.messages = (window.AppState.messages || []).filter(m => m.id !== messageId);

        if ((window.AppState.messages || []).length === 0) {
            showWelcomeScreen();
        } else {
            renderMessages();
        }

        window.AIAgentEvents?.updateCurrentChat?.();
        window.AIAgentApp?.saveState?.();
    }

    // ==================== 欢迎页面 ====================
    function showWelcomeScreen() {
        const welcomeScreen = document.getElementById('welcome-screen');
        const messagesList = document.getElementById('messages-list');
        
        if (welcomeScreen) welcomeScreen.style.display = 'flex';
        if (messagesList) messagesList.style.display = 'none';
    }

    // ==================== 模型选择器 ====================
    function renderModelSelector() {
        const container = document.getElementById('model-selector-options');
        if (!container) return;

        container.innerHTML = '';

        const models = window.AppState.models || {};
        Object.values(models).forEach(model => {
            const item = document.createElement('div');
            item.className = 'model-item';
            item.style.cssText = 'padding: 12px 14px; border-radius: var(--radius-lg); border: 1px solid var(--border); background: var(--bg-card); margin-bottom: 8px; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: all var(--transition-fast);';

            const isSelected = window.AppState.currentModel === model.id;
            if (isSelected) {
                item.style.borderColor = 'var(--primary)';
                item.style.background = 'linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(184, 41, 247, 0.1))';
            }

            item.innerHTML = `
                <div style="width: 36px; height: 36px; border-radius: var(--radius-md); background: linear-gradient(135deg, var(--primary), var(--secondary)); display: flex; align-items: center; justify-content: center; font-size: 14px; color: white;">
                    <i class="fas fa-brain"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 13px;">${escapeHtml(model.name)}</div>
                    <div style="font-size: 11px; color: var(--text-tertiary);">${escapeHtml(model.description || '')}</div>
                </div>
                ${isSelected ? '<i class="fas fa-check-circle" style="color: var(--primary);"></i>' : ''}
            `;

            item.addEventListener('click', () => {
                window.AppState.currentModel = model.id;
                updateCurrentModelDisplay();
                renderModelSelector();
                closeModal('model-modal');
                showToast(`已切换到 ${model.name}`, 'success');
                window.AIAgentApp?.saveState?.();
            });

            container.appendChild(item);
        });
    }

    function updateCurrentModelDisplay() {
        const display = document.getElementById('current-model');
        if (!display) return;

        const model = (window.AppState.models || {})[window.AppState.currentModel];
        display.textContent = model ? model.name : 'Auto';
    }

    // ==================== 模型设置 ====================
    function renderModelSettings() {
        const container = document.getElementById('models-list');
        if (!container) return;

        container.innerHTML = '';

        const models = window.AppState.models || {};
        const modelList = Object.values(models);

        if (modelList.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 32px; color: var(--text-tertiary);">
                    <i class="fas fa-brain" style="font-size: 40px; margin-bottom: 12px; opacity: 0.3;"></i>
                    <p>暂无模型配置</p>
                </div>
            `;
            return;
        }

        modelList.forEach(model => {
            const hasKey = window.AIAgentApp?.hasValidAPIKey?.(model.id) || false;

            const item = document.createElement('div');
            item.className = 'model-item';

            item.innerHTML = `
                <div class="model-info">
                    <div class="model-icon">
                        <i class="fas fa-brain"></i>
                    </div>
                    <div class="model-details">
                        <h5>${escapeHtml(model.name)}</h5>
                        <p>${escapeHtml(model.provider || 'Unknown')} · ${escapeHtml(model.description || '')}</p>
                    </div>
                </div>
                <div class="model-status">
                    <span class="status-badge ${hasKey ? 'configured' : 'unconfigured'}">
                        <i class="fas ${hasKey ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                        ${hasKey ? '已配置' : '未配置'}
                    </span>
                    <button class="model-config-btn" data-model="${model.id}" title="配置">
                        <i class="fas fa-cog"></i>
                    </button>
                </div>
            `;

            const configBtn = item.querySelector('.model-config-btn');
            configBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showModelConfigDialog(model.id);
            });

            container.appendChild(item);
        });
    }

    function showModelConfigDialog(modelId) {
        const model = (window.AppState.models || {})[modelId];
        if (!model) return;

        const currentKey = window.AIAgentApp?.getAPIKey?.(modelId) || '';
        const maskedKey = currentKey ? '*'.repeat(currentKey.length - 4) + currentKey.slice(-4) : '';

        const dialog = document.createElement('div');
        dialog.className = 'modal active';
        dialog.id = 'model-config-dialog';
        dialog.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>配置 ${escapeHtml(model.name)}</h3>
                    <button class="modal-close" onclick="AIAgentUI.closeModal('model-config-dialog')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>API Key</label>
                        <input type="password" id="config-api-key" value="${currentKey}" placeholder="输入API Key">
                        ${maskedKey ? `<small>当前: ${maskedKey}</small>` : ''}
                    </div>
                    <div class="form-group">
                        <label>API URL (可选)</label>
                        <input type="text" id="config-api-url" value="${model.url || ''}" placeholder="${model.url || '使用默认URL'}">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="AIAgentUI.closeModal('model-config-dialog')">取消</button>
                    <button class="btn-primary" id="save-model-config">保存</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) closeModal('model-config-dialog');
        });

        dialog.querySelector('#save-model-config').addEventListener('click', () => {
            const apiKey = dialog.querySelector('#config-api-key').value.trim();
            const apiUrl = dialog.querySelector('#config-api-url').value.trim();

            if (apiKey) {
                window.AIAgentApp?.setAPIKey?.(modelId, apiKey);
            }

            if (apiUrl) {
                model.url = apiUrl;
            }

            window.AIAgentApp?.saveState?.();
            renderModelSettings();
            closeModal('model-config-dialog');
            showToast('配置已保存', 'success');
        });
    }

    // ==================== 资源管理 ====================
    function renderResources(type) {
        const container = document.getElementById(`${type}-list`);
        if (!container) return;

        container.innerHTML = '';

        const items = (window.AppState.resources || {})[type] || [];

        if (items.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 32px; color: var(--text-tertiary);">
                    <i class="fas fa-inbox" style="font-size: 40px; margin-bottom: 12px; opacity: 0.3;"></i>
                    <p>暂无${getResourceTypeName(type)}</p>
                </div>
            `;
            return;
        }

        items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'resource-item';

            el.innerHTML = `
                <div class="resource-info">
                    <div class="resource-name">${escapeHtml(item.name)}</div>
                    <div class="resource-desc">${escapeHtml(item.description || '')}</div>
                </div>
                <div class="resource-actions">
                    <button class="resource-btn" title="查看" onclick="AIAgentUI.showResourceDetail('${type}', '${item.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="resource-btn" title="编辑" onclick="AIAgentUI.editResource('${type}', '${item.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="resource-btn" title="删除" onclick="AIAgentUI.deleteResource('${type}', '${item.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            container.appendChild(el);
        });
    }

    function getResourceTypeName(type) {
        const names = {
            rag: '知识库',
            skills: '技能',
            mcp: 'MCP服务',
            rules: '规则'
        };
        return names[type] || type;
    }

    // ==================== SKILL.md 范式支持 ====================
    const parseSkillMD = window.AIAgentUIUtils?.parseSkillMD || function(content) {
        const skill = {
            name: '',
            description: '',
            version: '1.0.0',
            author: '',
            tags: [],
            prompt: '',
            examples: [],
            parameters: {}
        };

        const titleMatch = content.match(/^#\s+(.+)$/m);
        if (titleMatch) skill.name = titleMatch[1].trim();

        const metaMatch = content.match(/```yaml\n([\s\S]*?)```/);
        if (metaMatch) {
            const metaLines = metaMatch[1].split('\n');
            metaLines.forEach(line => {
                const [key, ...valueParts] = line.split(':');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join(':').trim();
                    if (key.trim() === 'tags') {
                        skill.tags = value.split(',').map(t => t.trim());
                    } else if (key.trim() in skill) {
                        skill[key.trim()] = value;
                    }
                }
            });
        }

        const descMatch = content.match(/##\s*描述\s*\n+([\s\S]*?)(?=\n##|$)/);
        if (descMatch) skill.description = descMatch[1].trim();

        const promptMatch = content.match(/##\s*提示词\s*\n+```\n?([\s\S]*?)```/);
        if (promptMatch) skill.prompt = promptMatch[1].trim();

        const examplesMatch = content.match(/##\s*示例\s*\n+([\s\S]*?)(?=\n##|$)/);
        if (examplesMatch) {
            const exampleBlocks = examplesMatch[1].split(/###\s+/).filter(Boolean);
            skill.examples = exampleBlocks.map(block => {
                const lines = block.split('\n');
                const title = lines[0].trim();
                const content = lines.slice(1).join('\n').trim();
                return { title, content };
            });
        }

        return skill;
    };

    const generateSkillMD = window.AIAgentUIUtils?.generateSkillMD || function(skill) {
        return `# ${skill.name || '未命名技能'}

\`\`\`yaml
name: ${skill.name || ''}
description: ${skill.description || ''}
version: ${skill.version || '1.0.0'}
author: ${skill.author || ''}
tags: ${(skill.tags || []).join(', ')}
\`\`\`

## 描述

${skill.description || '暂无描述'}

## 提示词

\`\`\`
${skill.prompt || ''}
\`\`\`

## 示例

${(skill.examples || []).map((ex, i) => `### 示例 ${i + 1}: ${ex.title}

${ex.content}`).join('\n\n')}

## 使用说明

1. 在对话中引用此技能
2. AI助手将根据提示词执行相应任务
3. 可以结合其他技能使用
`;
    };

    function showResourceDetail(type, itemId) {
        const items = (window.AppState.resources || {})[type] || [];
        const item = items.find(i => i.id === itemId);
        if (!item) return;

        const dialog = document.createElement('div');
        dialog.className = 'modal active';
        dialog.id = 'resource-detail-dialog';

        let contentHtml = '';
        if (type === 'skills' && item.skillMD) {
            contentHtml = `
                <div class="form-group">
                    <label>SKILL.md</label>
                    <pre style="background: var(--bg-primary); padding: 12px; border-radius: var(--radius-md); font-size: 11px; overflow-x: auto; max-height: 250px;">${escapeHtml(item.skillMD)}</pre>
                </div>
            `;
        } else if (type === 'rag') {
            // RAG类型显示外部数据源
            const externalSources = item.externalSources || [];
            contentHtml = `
                <div class="form-group">
                    <label>描述</label>
                    <p style="color: var(--text-secondary); font-size: 13px;">${escapeHtml(item.description || '无')}</p>
                </div>
                <div class="form-group">
                    <label>分类</label>
                    <p style="color: var(--text-secondary); font-size: 13px;">${escapeHtml(item.category || '未分类')}</p>
                </div>
                <div class="form-group">
                    <label>外部数据源 (${externalSources.length})</label>
                    <div class="external-sources-list">
                        ${externalSources.length > 0 ? externalSources.map((src, idx) => `
                            <div class="external-source-item">
                                <div class="external-source-header">
                                    <span class="external-source-num">${idx + 1}</span>
                                    <span class="external-source-name">${escapeHtml(src.name)}</span>
                                    <span class="external-source-type">${src.type || 'website'}</span>
                                </div>
                                <div class="external-source-url">
                                    <a href="${src.url}" target="_blank" rel="noopener">${src.url}</a>
                                </div>
                                ${src.description ? `<div class="external-source-desc">${escapeHtml(src.description)}</div>` : ''}
                            </div>
                        `).join('') : '<p style="color: var(--text-tertiary); font-size: 12px;">暂无外部数据源</p>'}
                    </div>
                </div>
                ${item.defaultContent ? `
                <div class="form-group">
                    <label>默认知识内容</label>
                    <pre style="background: var(--bg-primary); padding: 12px; border-radius: var(--radius-md); font-size: 11px; overflow-x: auto; max-height: 200px;">${escapeHtml(item.defaultContent)}</pre>
                </div>
                ` : ''}
            `;
        } else {
            contentHtml = `
                <div class="form-group">
                    <label>描述</label>
                    <p style="color: var(--text-secondary); font-size: 13px;">${escapeHtml(item.description || '无')}</p>
                </div>
                ${item.prompt ? `
                <div class="form-group">
                    <label>提示词</label>
                    <pre style="background: var(--bg-primary); padding: 12px; border-radius: var(--radius-md); font-size: 11px; overflow-x: auto;">${escapeHtml(item.prompt)}</pre>
                </div>
                ` : ''}
                ${item.content ? `
                <div class="form-group">
                    <label>内容</label>
                    <pre style="background: var(--bg-primary); padding: 12px; border-radius: var(--radius-md); font-size: 11px; overflow-x: auto;">${escapeHtml(item.content)}</pre>
                </div>
                ` : ''}
            `;
        }

        dialog.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${escapeHtml(item.name)}</h3>
                    <button class="modal-close" onclick="AIAgentUI.closeModal('resource-detail-dialog')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${contentHtml}
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="AIAgentUI.closeModal('resource-detail-dialog')">关闭</button>
                    <button class="btn-primary" onclick="AIAgentUI.closeModal('resource-detail-dialog'); AIAgentUI.editResource('${type}', '${itemId}')">编辑</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);
    }

    function editResource(type, itemId) {
        closeModal('resource-detail-dialog');

        const items = (window.AppState.resources || {})[type] || [];
        const item = items.find(i => i.id === itemId);
        if (!item) return;

        const dialog = document.createElement('div');
        dialog.className = 'modal active';
        dialog.id = 'edit-resource-dialog';

        let formHtml = '';
        if (type === 'skills') {
            const skillMD = item.skillMD || generateSkillMD(item);
            formHtml = `
                <div class="form-group">
                    <label>SKILL.md 内容</label>
                    <textarea id="edit-skill-md" rows="12" style="font-family: monospace; font-size: 11px;">${escapeHtml(skillMD)}</textarea>
                    <small>支持标准SKILL.md格式</small>
                </div>
            `;
        } else if (type === 'rag') {
            // RAG类型编辑表单（含外部数据源管理）
            const externalSources = item.externalSources || [];
            formHtml = `
                <div class="form-group">
                    <label>名称</label>
                    <input type="text" id="edit-resource-name" value="${escapeHtml(item.name)}">
                </div>
                <div class="form-group">
                    <label>描述</label>
                    <input type="text" id="edit-resource-desc" value="${escapeHtml(item.description || '')}">
                </div>
                <div class="form-group">
                    <label>分类</label>
                    <input type="text" id="edit-resource-category" value="${escapeHtml(item.category || '')}">
                </div>
                <div class="form-group">
                    <label>外部数据源管理</label>
                    <div id="external-sources-editor" class="external-sources-editor">
                        ${externalSources.map((src, idx) => `
                            <div class="external-source-edit-item" data-index="${idx}">
                                <input type="text" class="ext-src-name" placeholder="名称" value="${escapeHtml(src.name)}" style="flex: 1;">
                                <input type="text" class="ext-src-url" placeholder="URL" value="${escapeHtml(src.url)}" style="flex: 2;">
                                <button class="btn-icon btn-remove-ext-src" title="删除">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                    <button class="btn-secondary btn-add-ext-src" style="margin-top: 8px; width: 100%;">
                        <i class="fas fa-plus"></i> 添加外部数据源
                    </button>
                </div>
                <div class="form-group">
                    <label>默认知识内容</label>
                    <textarea id="edit-resource-default-content" rows="6" placeholder="输入默认知识内容...">${escapeHtml(item.defaultContent || '')}</textarea>
                </div>
            `;
        } else {
            formHtml = `
                <div class="form-group">
                    <label>名称</label>
                    <input type="text" id="edit-resource-name" value="${escapeHtml(item.name)}">
                </div>
                <div class="form-group">
                    <label>描述</label>
                    <input type="text" id="edit-resource-desc" value="${escapeHtml(item.description || '')}">
                </div>
                ${type === 'skills' ? `
                <div class="form-group">
                    <label>提示词</label>
                    <textarea id="edit-resource-prompt" rows="4">${escapeHtml(item.prompt || '')}</textarea>
                </div>
                ` : ''}
                ${type === 'mcp' ? `
                <div class="form-group">
                    <label>服务URL</label>
                    <input type="text" id="edit-resource-url" value="${escapeHtml(item.url || '')}">
                </div>
                ` : ''}
                ${type === 'rules' ? `
                <div class="form-group">
                    <label>规则内容</label>
                    <textarea id="edit-resource-content" rows="4">${escapeHtml(item.content || '')}</textarea>
                </div>
                ` : ''}
            `;
        }

        dialog.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>编辑${getResourceTypeName(type)}</h3>
                    <button class="modal-close" onclick="AIAgentUI.closeModal('edit-resource-dialog')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${formHtml}
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="AIAgentUI.closeModal('edit-resource-dialog')">取消</button>
                    <button class="btn-primary" id="update-resource">保存</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // RAG类型：绑定外部数据源管理事件
        if (type === 'rag') {
            const editor = dialog.querySelector('#external-sources-editor');
            
            // 添加外部数据源
            dialog.querySelector('.btn-add-ext-src').addEventListener('click', () => {
                const newItem = document.createElement('div');
                newItem.className = 'external-source-edit-item';
                newItem.innerHTML = `
                    <input type="text" class="ext-src-name" placeholder="名称" style="flex: 1;">
                    <input type="text" class="ext-src-url" placeholder="URL" style="flex: 2;">
                    <button class="btn-icon btn-remove-ext-src" title="删除">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
                editor.appendChild(newItem);
                bindRemoveExtSrcEvent(newItem);
            });

            // 绑定删除事件
            function bindRemoveExtSrcEvent(element) {
                element.querySelector('.btn-remove-ext-src').addEventListener('click', () => {
                    element.remove();
                });
            }
            dialog.querySelectorAll('.external-source-edit-item').forEach(bindRemoveExtSrcEvent);
        }

        dialog.querySelector('#update-resource').addEventListener('click', () => {
            if (type === 'skills' && item.skillMD !== undefined) {
                const skillMD = dialog.querySelector('#edit-skill-md').value.trim();
                item.skillMD = skillMD;
                const skill = parseSkillMD(skillMD);
                item.name = skill.name || item.name;
                item.description = skill.description || item.description;
                item.prompt = skill.prompt || item.prompt;
            } else if (type === 'rag') {
                item.name = dialog.querySelector('#edit-resource-name').value.trim();
                item.description = dialog.querySelector('#edit-resource-desc')?.value.trim() || '';
                item.category = dialog.querySelector('#edit-resource-category')?.value.trim() || '其他';
                item.defaultContent = dialog.querySelector('#edit-resource-default-content')?.value.trim() || '';
                
                // 收集外部数据源
                const externalSources = [];
                dialog.querySelectorAll('.external-source-edit-item').forEach(el => {
                    const name = el.querySelector('.ext-src-name').value.trim();
                    const url = el.querySelector('.ext-src-url').value.trim();
                    if (name && url) {
                        externalSources.push({ name, url, type: 'website' });
                    }
                });
                item.externalSources = externalSources;
            } else {
                item.name = dialog.querySelector('#edit-resource-name').value.trim();
                item.description = dialog.querySelector('#edit-resource-desc')?.value.trim() || '';

                if (type === 'skills') {
                    item.prompt = dialog.querySelector('#edit-resource-prompt')?.value.trim() || '';
                } else if (type === 'mcp') {
                    item.url = dialog.querySelector('#edit-resource-url')?.value.trim() || '';
                } else if (type === 'rules') {
                    item.content = dialog.querySelector('#edit-resource-content')?.value.trim() || '';
                }
            }

            window.AIAgentApp?.saveState?.();
            renderResources(type);
            closeModal('edit-resource-dialog');
            showToast(`${getResourceTypeName(type)}已更新`, 'success');
        });
    }

    function deleteResource(type, itemId) {
        if (!confirm('确定要删除这个资源吗？')) return;

        if (!window.AppState.resources) window.AppState.resources = {};
        window.AppState.resources[type] = (window.AppState.resources[type] || []).filter(i => i.id !== itemId);
        
        window.AIAgentApp?.saveState?.();
        renderResources(type);
        showToast('资源已删除', 'success');
    }

    // ==================== Sub Agent ====================
    function renderSubAgentList() {
        const container = document.getElementById('subagent-list');
        if (!container) return;

        container.innerHTML = '';

        const agents = window.AppState.subAgents || {};
        Object.values(agents).forEach(agent => {
            const item = document.createElement('div');
            item.className = 'subagent-item' + (agent.id === window.AppState.currentSubAgent ? ' active' : '');
            item.dataset.agentId = agent.id;

            // 计算资源数量
            const skillCount = agent.skills?.length || 0;
            const mcpCount = agent.mcp?.length || 0;
            const ragCount = agent.rag?.length || 0;

            item.innerHTML = `
                <div class="subagent-icon">
                    <i class="fas ${agent.icon || 'fa-robot'}"></i>
                </div>
                <div class="subagent-info">
                    <div class="subagent-name">${escapeHtml(agent.name)}</div>
                    <div class="subagent-desc">${escapeHtml(agent.description || '')}</div>
                    <div class="subagent-meta">
                        ${skillCount > 0 ? `<span class="subagent-meta-tag"><i class="fas fa-magic"></i> ${skillCount}</span>` : ''}
                        ${mcpCount > 0 ? `<span class="subagent-meta-tag"><i class="fas fa-plug"></i> ${mcpCount}</span>` : ''}
                        ${ragCount > 0 ? `<span class="subagent-meta-tag"><i class="fas fa-database"></i> ${ragCount}</span>` : ''}
                    </div>
                </div>
                <div class="subagent-actions">
                    <button class="resource-btn" title="查看详情" onclick="event.stopPropagation(); AIAgentUI.showSubAgentDetail('${agent.id}')">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </div>
            `;

            item.addEventListener('click', () => {
                window.AIAgentEvents?.selectSubAgent?.(agent.id);
                closeModal('subagent-modal');
            });

            container.appendChild(item);
        });
    }

    function renderSubAgentsSettings() {
        const container = document.getElementById('subagents-list');
        if (!container) return;

        container.innerHTML = '';

        const agents = window.AppState.subAgents || {};
        Object.values(agents).forEach(agent => {
            const item = document.createElement('div');
            item.className = 'subagent-item';

            const skillCount = agent.skills?.length || 0;
            const mcpCount = agent.mcp?.length || 0;
            const ragCount = agent.rag?.length || 0;

            item.innerHTML = `
                <div class="subagent-icon">
                    <i class="fas ${agent.icon || 'fa-robot'}"></i>
                </div>
                <div class="subagent-info">
                    <div class="subagent-name">${escapeHtml(agent.name)}</div>
                    <div class="subagent-desc">${escapeHtml(agent.description || '')}</div>
                    <div class="subagent-meta">
                        ${skillCount > 0 ? `<span class="subagent-meta-tag"><i class="fas fa-magic"></i> ${skillCount}</span>` : ''}
                        ${mcpCount > 0 ? `<span class="subagent-meta-tag"><i class="fas fa-plug"></i> ${mcpCount}</span>` : ''}
                        ${ragCount > 0 ? `<span class="subagent-meta-tag"><i class="fas fa-database"></i> ${ragCount}</span>` : ''}
                    </div>
                </div>
                <div class="subagent-actions">
                    <button class="resource-btn" title="编辑" onclick="AIAgentUI.editSubAgent('${agent.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${agent.custom ? `
                    <button class="resource-btn" title="删除" onclick="AIAgentUI.deleteSubAgent('${agent.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                    ` : ''}
                </div>
            `;

            container.appendChild(item);
        });
    }

    function showSubAgentDetail(agentId) {
        const agent = (window.AppState.subAgents || {})[agentId];
        if (!agent) return;

        const dialog = document.createElement('div');
        dialog.className = 'modal active';
        dialog.id = 'subagent-detail-dialog';

        const skills = (agent.skills || []).map(id => {
            const skill = (window.AppState.resources?.skills || []).find(s => s.id === id);
            return skill ? skill.name : id;
        }).join(', ') || '无';

        const mcps = (agent.mcp || []).map(id => {
            const mcp = (window.AppState.resources?.mcp || []).find(m => m.id === id);
            return mcp ? mcp.name : id;
        }).join(', ') || '无';

        const rags = (agent.rag || []).map(id => {
            const rag = (window.AppState.resources?.rag || []).find(r => r.id === id);
            return rag ? rag.name : id;
        }).join(', ') || '无';

        dialog.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${escapeHtml(agent.name)}</h3>
                    <button class="modal-close" onclick="AIAgentUI.closeModal('subagent-detail-dialog')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 16px; padding: 14px; background: var(--bg-tertiary); border-radius: var(--radius-lg);">
                        <div style="width: 50px; height: 50px; border-radius: var(--radius-lg); background: linear-gradient(135deg, var(--primary), var(--secondary)); display: flex; align-items: center; justify-content: center; font-size: 20px; color: white;">
                            <i class="fas ${agent.icon || 'fa-robot'}"></i>
                        </div>
                        <div>
                            <h4 style="font-size: 16px; font-weight: 600; margin-bottom: 3px;">${escapeHtml(agent.name)}</h4>
                            <p style="color: var(--text-tertiary); font-size: 13px;">${escapeHtml(agent.description || '')}</p>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>能力</label>
                        <p style="color: var(--text-secondary); font-size: 13px;">${(agent.capabilities || []).join(', ')}</p>
                    </div>
                    
                    <div class="form-group">
                        <label>使用的 Skills</label>
                        <p style="color: var(--text-secondary); font-size: 13px;">${skills}</p>
                    </div>
                    
                    <div class="form-group">
                        <label>使用的 MCP</label>
                        <p style="color: var(--text-secondary); font-size: 13px;">${mcps}</p>
                    </div>
                    
                    <div class="form-group">
                        <label>使用的 RAG</label>
                        <p style="color: var(--text-secondary); font-size: 13px;">${rags}</p>
                    </div>
                    
                    <div class="form-group">
                        <label>系统提示词</label>
                        <pre style="background: var(--bg-primary); padding: 12px; border-radius: var(--radius-md); font-size: 12px; overflow-x: auto; white-space: pre-wrap;">${escapeHtml(agent.systemPrompt || '无')}</pre>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="AIAgentUI.closeModal('subagent-detail-dialog')">关闭</button>
                    <button class="btn-primary" onclick="AIAgentUI.closeModal('subagent-detail-dialog'); AIAgentEvents.selectSubAgent('${agent.id}'); AIAgentUI.closeModal('subagent-modal');">选择此助手</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);
    }

    function editSubAgent(agentId) {
        const agent = (window.AppState.subAgents || {})[agentId];
        if (!agent) return;

        // 获取可用资源
        const resources = window.AppState.resources || {};
        const skills = resources.skills || [];
        const rules = resources.rules || [];
        const mcp = resources.mcp || [];
        const rag = resources.rag || [];
        
        // 获取已选中的资源
        const selectedSkills = new Set(agent.skills || []);
        const selectedRules = new Set(agent.rules || []);
        const selectedMCP = new Set(agent.mcp || []);
        const selectedRAG = new Set(agent.rag || []);

        const dialog = document.createElement('div');
        dialog.className = 'modal active';
        dialog.id = 'edit-subagent-dialog';

        // 计算已选数量
        const stats = {
            skills: selectedSkills.size,
            rules: selectedRules.size,
            mcp: selectedMCP.size,
            rag: selectedRAG.size
        };

        dialog.innerHTML = `
            <div class="modal-content" style="max-width: 650px;">
                <div class="modal-header">
                    <h3><i class="fas fa-user-astronaut"></i> 编辑助手</h3>
                    <button class="modal-close" onclick="AIAgentUI.closeModal('edit-subagent-dialog')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>名称</label>
                        <input type="text" id="edit-subagent-name" value="${escapeHtml(agent.name)}" placeholder="输入助手名称...">
                    </div>
                    <div class="form-group">
                        <label>描述</label>
                        <input type="text" id="edit-subagent-desc" value="${escapeHtml(agent.description || '')}" placeholder="输入助手描述...">
                    </div>
                    ${agentId === 'work_secretary' ? `
                    <div class="form-group">
                        <label>服务对象</label>
                        <input type="text" id="edit-subagent-service-target" value="${escapeHtml(agent.serviceTarget || '')}" placeholder="AI Agent Pro（占位符，可填老板、项目名等任意内容）">
                        <small class="form-hint">根据填入内容的相关性筛选信息，无关内容可忽略</small>
                    </div>
                    <div class="form-group">
                        <label>忽略信息描述</label>
                        <input type="text" id="edit-subagent-ignore-info" value="${escapeHtml(agent.ignoreInfoDesc || '')}" placeholder="例如：八卦、娱乐新闻、与工作无关的闲聊">
                        <small class="form-hint">填写要忽略的信息类型或描述，用于过滤无关内容</small>
                    </div>
                    ` : ''}
                    <div class="form-group">
                        <label>关联助手（Workflow 链）</label>
                        <div class="delegate-agent-cards-grid" id="edit-subagent-delegate-to">
                            ${Object.entries(window.AppState?.subAgents || {}).filter(([id]) => id !== agentId).map(([id, a]) => {
                                const selected = (agent.delegateTo || []).includes(id);
                                const icon = a.icon || 'fa-user';
                                return `
                                <div class="delegate-agent-card ${selected ? 'selected' : ''}" data-agent-id="${id}" title="${escapeHtml(a.description || a.name || '')}">
                                    <div class="delegate-agent-card-icon"><i class="fas ${icon}"></i></div>
                                    <div class="delegate-agent-card-name">${escapeHtml(a.name || id)}</div>
                                </div>`;
                            }).join('')}
                        </div>
                        <small class="form-hint">选择后，发送消息将自动按 Workflow 链执行：${escapeHtml(agent.name || '当前助手')}(分析调度) → 所选助手 → ${escapeHtml(agent.name || '当前助手')}(整合输出)</small>
                    </div>
                    <div class="form-group">
                        <label>系统提示词</label>
                        <textarea id="edit-subagent-prompt" rows="3" placeholder="输入系统提示词...">${escapeHtml(agent.systemPrompt || '')}</textarea>
                    </div>
                    
                    <!-- 资源统计栏 -->
                    <div class="resource-stats-bar">
                        <div class="resource-stat skills">
                            <i class="fas fa-magic"></i>
                            <span>Skills: <span class="resource-stat-value" id="stat-skills">${stats.skills}</span></span>
                        </div>
                        <div class="resource-stat rules">
                            <i class="fas fa-list-check"></i>
                            <span>Rules: <span class="resource-stat-value" id="stat-rules">${stats.rules}</span></span>
                        </div>
                        <div class="resource-stat mcp">
                            <i class="fas fa-plug"></i>
                            <span>MCP: <span class="resource-stat-value" id="stat-mcp">${stats.mcp}</span></span>
                        </div>
                        <div class="resource-stat rag">
                            <i class="fas fa-database"></i>
                            <span>RAG: <span class="resource-stat-value" id="stat-rag">${stats.rag}</span></span>
                        </div>
                    </div>
                    
                    <!-- 资源选择器 -->
                    <div class="form-group">
                        <label>关联资源</label>
                        <div class="resource-selector">
                            ${renderResourceTypeGroup('skills', 'Skills', 'fa-magic', skills, selectedSkills)}
                            ${renderResourceTypeGroup('rules', 'Rules', 'fa-list-check', rules, selectedRules)}
                            ${renderResourceTypeGroup('mcp', 'MCP', 'fa-plug', mcp, selectedMCP)}
                            ${renderResourceTypeGroup('rag', 'RAG知识库', 'fa-database', rag, selectedRAG)}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="AIAgentUI.closeModal('edit-subagent-dialog')">取消</button>
                    <button class="btn-primary" id="save-subagent-edit">
                        <i class="fas fa-save"></i> 保存
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // 绑定资源卡片点击事件
        bindResourceCardEvents(dialog, 'skills', selectedSkills);
        bindResourceCardEvents(dialog, 'rules', selectedRules);
        bindResourceCardEvents(dialog, 'mcp', selectedMCP);
        bindResourceCardEvents(dialog, 'rag', selectedRAG);

        // 绑定全选按钮事件
        bindSelectAllEvents(dialog, 'skills', skills, selectedSkills);
        bindSelectAllEvents(dialog, 'rules', rules, selectedRules);
        bindSelectAllEvents(dialog, 'mcp', mcp, selectedMCP);
        bindSelectAllEvents(dialog, 'rag', rag, selectedRAG);

        // 绑定类型头部展开/收起事件
        bindTypeHeaderEvents(dialog);

        // 绑定关联助手卡片点击事件
        const delegateGrid = dialog.querySelector('#edit-subagent-delegate-to');
        if (delegateGrid) {
            delegateGrid.querySelectorAll('.delegate-agent-card').forEach(card => {
                card.addEventListener('click', () => {
                    card.classList.toggle('selected');
                });
            });
        }

        dialog.querySelector('#save-subagent-edit').addEventListener('click', () => {
            agent.name = dialog.querySelector('#edit-subagent-name').value.trim();
            agent.description = dialog.querySelector('#edit-subagent-desc').value.trim();
            agent.systemPrompt = dialog.querySelector('#edit-subagent-prompt').value.trim();
            if (agentId === 'work_secretary') {
                const st = dialog.querySelector('#edit-subagent-service-target');
                agent.serviceTarget = st?.value?.trim() || '';
                const ign = dialog.querySelector('#edit-subagent-ignore-info');
                agent.ignoreInfoDesc = ign?.value?.trim() || '';
            }
            const delegateEl = dialog.querySelector('#edit-subagent-delegate-to');
            if (delegateEl) {
                agent.delegateTo = Array.from(delegateEl.querySelectorAll('.delegate-agent-card.selected')).map(c => c.dataset.agentId);
            }
            
            // 收集选中的资源
            agent.skills = Array.from(selectedSkills);
            agent.rules = Array.from(selectedRules);
            agent.mcp = Array.from(selectedMCP);
            agent.rag = Array.from(selectedRAG);

            window.AIAgentApp?.saveState?.();
            renderSubAgentsSettings();
            closeModal('edit-subagent-dialog');
            showToast('助手已更新', 'success');
        });
    }

    // 渲染资源类型分组
    function renderResourceTypeGroup(type, name, icon, items, selectedSet) {
        if (items.length === 0) {
            return '';
        }

        const selectedCount = items.filter(item => selectedSet.has(item.id)).length;
        const allSelected = selectedCount === items.length && items.length > 0;

        return `
            <div class="resource-type-group" data-type="${type}">
                <div class="resource-type-header">
                    <div class="resource-type-title">
                        <div class="resource-type-icon ${type}">
                            <i class="fas ${icon}"></i>
                        </div>
                        <div class="resource-type-info">
                            <span class="resource-type-name">${name}</span>
                            <span class="resource-type-count">${selectedCount}/${items.length} 已选</span>
                        </div>
                    </div>
                    <div class="resource-type-actions">
                        <button class="btn-select-all" data-type="${type}" data-action="${allSelected ? 'deselect' : 'select'}">
                            ${allSelected ? '取消全选' : '全选'}
                        </button>
                        <div class="resource-type-toggle">
                            <i class="fas fa-chevron-down"></i>
                        </div>
                    </div>
                </div>
                <div class="resource-cards-grid">
                    ${items.map(item => `
                        <div class="resource-card ${selectedSet.has(item.id) ? 'selected' : ''}" 
                             data-resource-id="${item.id}" 
                             data-resource-type="${type}"
                             title="${escapeHtml(item.description || item.name)}">
                            <div class="resource-card-icon ${type.slice(0, -1)}">
                                <i class="fas ${getResourceIcon(type)}"></i>
                            </div>
                            <div class="resource-card-content">
                                <div class="resource-card-name">${escapeHtml(item.name)}</div>
                                <div class="resource-card-desc">${escapeHtml(item.description || '')}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // 获取资源类型图标
    function getResourceIcon(type) {
        const icons = {
            skills: 'fa-magic',
            rules: 'fa-list-check',
            mcp: 'fa-plug',
            rag: 'fa-database'
        };
        return icons[type] || 'fa-cube';
    }

    // 绑定资源卡片事件
    function bindResourceCardEvents(dialog, type, selectedSet) {
        const cards = dialog.querySelectorAll(`.resource-card[data-resource-type="${type}"]`);
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.resourceId;
                if (selectedSet.has(id)) {
                    selectedSet.delete(id);
                    card.classList.remove('selected');
                } else {
                    selectedSet.add(id);
                    card.classList.add('selected');
                }
                updateResourceStats(dialog, type, selectedSet);
                updateTypeHeaderCount(dialog, type, selectedSet);
            });
        });
    }

    // 绑定全选按钮事件
    function bindSelectAllEvents(dialog, type, items, selectedSet) {
        const btn = dialog.querySelector(`.btn-select-all[data-type="${type}"]`);
        if (!btn) return;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            const cards = dialog.querySelectorAll(`.resource-card[data-resource-type="${type}"]`);
            
            if (action === 'select') {
                items.forEach(item => selectedSet.add(item.id));
                cards.forEach(card => card.classList.add('selected'));
                btn.dataset.action = 'deselect';
                btn.textContent = '取消全选';
            } else {
                items.forEach(item => selectedSet.delete(item.id));
                cards.forEach(card => card.classList.remove('selected'));
                btn.dataset.action = 'select';
                btn.textContent = '全选';
            }
            updateResourceStats(dialog, type, selectedSet);
            updateTypeHeaderCount(dialog, type, selectedSet);
        });
    }

    // 绑定类型头部展开/收起事件
    function bindTypeHeaderEvents(dialog) {
        const headers = dialog.querySelectorAll('.resource-type-header');
        headers.forEach(header => {
            header.addEventListener('click', (e) => {
                // 如果点击的是全选按钮，不触发展开/收起
                if (e.target.closest('.btn-select-all')) return;
                header.classList.toggle('collapsed');
            });
        });
    }

    // 更新资源统计
    function updateResourceStats(dialog, type, selectedSet) {
        const statEl = dialog.querySelector(`#stat-${type}`);
        if (statEl) {
            statEl.textContent = selectedSet.size;
        }
    }

    // 更新类型头部计数
    function updateTypeHeaderCount(dialog, type, selectedSet) {
        const group = dialog.querySelector(`.resource-type-group[data-type="${type}"]`);
        if (!group) return;

        const countEl = group.querySelector('.resource-type-count');
        const cards = group.querySelectorAll('.resource-card');
        const total = cards.length;
        const selected = selectedSet.size;

        if (countEl) {
            countEl.textContent = `${selected}/${total} 已选`;
        }

        // 更新全选按钮状态
        const btn = group.querySelector('.btn-select-all');
        if (btn) {
            if (selected === total && total > 0) {
                btn.dataset.action = 'deselect';
                btn.textContent = '取消全选';
            } else {
                btn.dataset.action = 'select';
                btn.textContent = '全选';
            }
        }
    }

    function deleteSubAgent(agentId) {
        if (!confirm('确定要删除这个自定义助手吗？')) return;

        window.AIAgentApp?.deleteCustomSubAgent?.(agentId);
        renderSubAgentsSettings();
        showToast('助手已删除', 'success');
    }

    // ==================== 任务列表 ====================
    function renderTasks() {
        const container = document.getElementById('tasks-list');
        if (!container) return;

        container.innerHTML = '';

        const tasks = window.AppState.tasks || [];

        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="task-empty">
                    <i class="fas fa-clipboard-check"></i>
                    <p>暂无任务</p>
                    <button class="btn-primary" onclick="AIAgentUI.showCreateTaskDialog()">
                        <i class="fas fa-plus"></i> 创建任务
                    </button>
                </div>
            `;
            return;
        }

        const pendingTasks = tasks.filter(t => !t.completed);
        const completedTasks = tasks.filter(t => t.completed);

        container.innerHTML = `
            <div class="task-section">
                <h4 class="task-section-title">进行中 (${pendingTasks.length})</h4>
                ${pendingTasks.map(task => renderTaskItem(task)).join('')}
            </div>
            ${completedTasks.length > 0 ? `
            <div class="task-section">
                <h4 class="task-section-title">已完成 (${completedTasks.length})</h4>
                ${completedTasks.map(task => renderTaskItem(task)).join('')}
            </div>
            ` : ''}
        `;
    }

    function renderTaskItem(task) {
        const priorityColors = {
            high: 'var(--error-color)',
            medium: 'var(--warning-color)',
            low: 'var(--success-color)'
        };

        return `
            <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                <div class="task-checkbox" onclick="AIAgentUI.toggleTaskItem('${task.id}')">
                    <i class="fas ${task.completed ? 'fa-check-square' : 'fa-square'}"></i>
                </div>
                <div class="task-content">
                    <div class="task-title">${escapeHtml(task.title)}</div>
                    ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ''}
                    <div class="task-meta">
                        ${task.priority ? `<span class="task-priority" style="color: ${priorityColors[task.priority] || priorityColors.medium}">${task.priority}</span>` : ''}
                        ${task.dueDate ? `<span class="task-due"><i class="fas fa-clock"></i> ${formatTime(task.dueDate)}</span>` : ''}
                    </div>
                </div>
                <div class="task-actions">
                    <button class="btn-icon" onclick="AIAgentUI.deleteTask('${task.id}')" title="删除">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    function toggleTaskItem(taskId) {
        const tasks = window.AppState.tasks || [];
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            task.completedAt = task.completed ? Date.now() : null;
            window.AIAgentApp?.saveState?.();
            renderTasks();
            showToast(task.completed ? '任务已完成' : '任务已恢复', 'success');
        }
    }

    function deleteTask(taskId) {
        if (!confirm('确定要删除这个任务吗？')) return;
        window.AppState.tasks = (window.AppState.tasks || []).filter(t => t.id !== taskId);
        window.AIAgentApp?.saveState?.();
        renderTasks();
        showToast('任务已删除', 'success');
    }

    function showCreateTaskDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'modal active';
        dialog.id = 'create-task-dialog';
        dialog.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-plus"></i> 创建任务</h3>
                    <button class="modal-close" onclick="AIAgentUI.closeModal('create-task-dialog')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>任务标题 <span class="required">*</span></label>
                        <input type="text" id="task-title" placeholder="输入任务标题...">
                    </div>
                    <div class="form-group">
                        <label>描述</label>
                        <textarea id="task-desc" rows="3" placeholder="任务描述（可选）"></textarea>
                    </div>
                    <div class="form-group">
                        <label>优先级</label>
                        <select id="task-priority">
                            <option value="low">低</option>
                            <option value="medium" selected>中</option>
                            <option value="high">高</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>截止日期</label>
                        <input type="datetime-local" id="task-due">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="AIAgentUI.closeModal('create-task-dialog')">取消</button>
                    <button class="btn-primary" id="save-task-btn">创建</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        dialog.querySelector('#save-task-btn').addEventListener('click', () => {
            const title = dialog.querySelector('#task-title').value.trim();
            const description = dialog.querySelector('#task-desc').value.trim();
            const priority = dialog.querySelector('#task-priority').value;
            const dueDate = dialog.querySelector('#task-due').value;

            if (!title) {
                showToast('请输入任务标题', 'error');
                return;
            }

            const newTask = {
                id: 'task_' + Date.now(),
                title,
                description,
                priority,
                dueDate: dueDate ? new Date(dueDate).getTime() : null,
                completed: false,
                createdAt: Date.now()
            };

            if (!window.AppState.tasks) window.AppState.tasks = [];
            window.AppState.tasks.push(newTask);
            window.AIAgentApp?.saveState?.();

            closeModal('create-task-dialog');
            renderTasks();
            showToast('任务已创建', 'success');
        });
    }

    // ==================== 计划列表 ====================
    function renderPlans() {
        const container = document.getElementById('plans-list');
        if (!container) return;

        container.innerHTML = '';

        // 使用PlanManager获取计划
        const plans = window.PlanManager?.getAllPlans?.() || window.AppState.plans || [];

        if (plans.length === 0) {
            container.innerHTML = `
                <div class="plan-empty">
                    <i class="fas fa-calendar-alt"></i>
                    <p>暂无计划</p>
                    <button class="btn-primary" onclick="AIAgentUI.showCreatePlanDialog()">
                        <i class="fas fa-plus"></i> 创建计划
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="plan-list">
                ${plans.map(plan => renderPlanCard(plan)).join('')}
            </div>
        `;
    }

    function toggleTask(planId, taskId) {
        const plan = (window.AppState.plans || []).find(p => p.id === planId);
        if (!plan) return;

        const task = (plan.tasks || []).find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            window.AIAgentApp?.saveState?.();
            renderPlans();
        }
    }

    // ==================== 思考过程展开/收起 ====================
    function toggleThinking(messageId) {
        const section = document.querySelector(`.thinking-section[data-message-id="${messageId}"]`);
        if (!section) {
            window.Logger?.warn(`未找到思考过程区域，messageId: ${messageId}`);
            return;
        }

        const content = section.querySelector('.thinking-content');
        const preview = section.querySelector('.thinking-preview');
        const full = section.querySelector('.thinking-full');
        const icon = section.querySelector('.thinking-toggle-icon');
        
        // 安全检查：如果元素不存在，使用降级方案
        if (!content) {
            window.Logger?.warn(`思考内容元素不存在，messageId: ${messageId}`);
            return;
        }
        
        const isCollapsed = content.classList.contains('collapsed');
        
        if (isCollapsed) {
            content.classList.remove('collapsed');
            content.classList.add('expanded');
            if (preview) preview.style.display = 'none';
            if (full) full.style.display = 'block';
            if (icon) icon.style.transform = 'rotate(180deg)';
        } else {
            content.classList.add('collapsed');
            content.classList.remove('expanded');
            if (preview) preview.style.display = 'block';
            if (full) full.style.display = 'none';
            if (icon) icon.style.transform = 'rotate(0deg)';
        }
    }

    // ==================== 计划模式UI ====================
    function renderPlanManager() {
        const container = document.getElementById('plan-manager');
        if (!container) return;

        const plans = window.PlanManager?.getAllPlans?.() || [];
        
        if (plans.length === 0) {
            container.innerHTML = `
                <div class="plan-empty">
                    <i class="fas fa-clipboard-list"></i>
                    <p>暂无计划</p>
                    <button class="btn-primary" onclick="AIAgentUI.showCreatePlanDialog()">
                        <i class="fas fa-plus"></i> 创建计划
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="plan-list">
                ${plans.map(plan => renderPlanCard(plan)).join('')}
            </div>
            <button class="fab-btn" onclick="AIAgentUI.showCreatePlanDialog()">
                <i class="fas fa-plus"></i>
            </button>
        `;
    }

    function renderPlanCard(plan) {
        const progress = plan.metadata?.progress || 0;
        const statusColors = {
            draft: 'var(--text-tertiary)',
            active: 'var(--primary)',
            completed: 'var(--success)',
            cancelled: 'var(--error)'
        };
        const statusLabels = {
            draft: '草稿',
            active: '进行中',
            completed: '已完成',
            cancelled: '已取消'
        };

        return `
            <div class="plan-card" data-plan-id="${plan.id}">
                <div class="plan-card-header">
                    <div class="plan-card-title">
                        <i class="fas fa-tasks" style="color: ${statusColors[plan.status]}"></i>
                        <span>${escapeHtml(plan.title)}</span>
                    </div>
                    <span class="plan-card-status" style="color: ${statusColors[plan.status]}">
                        ${statusLabels[plan.status]}
                    </span>
                </div>
                <div class="plan-card-desc">${escapeHtml(plan.description || '')}</div>
                <div class="plan-card-progress">
                    <div class="plan-progress-bar">
                        <div class="plan-progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <span class="plan-progress-text">${progress}% (${plan.metadata?.completedCount || 0}/${plan.metadata?.totalCount || 0})</span>
                </div>
                <div class="plan-card-todos">
                    ${(plan.todos || []).slice(0, 3).map(todo => `
                        <div class="plan-todo-item ${todo.status}">
                            <i class="fas ${todo.status === 'completed' ? 'fa-check-circle' : todo.status === 'in_progress' ? 'fa-spinner fa-spin' : 'fa-circle'}"></i>
                            <span>${escapeHtml(todo.title)}</span>
                        </div>
                    `).join('')}
                    ${(plan.todos || []).length > 3 ? `<div class="plan-todo-more">还有 ${plan.todos.length - 3} 个任务</div>` : ''}
                </div>
                <div class="plan-card-actions">
                    <button class="btn-sm" onclick="AIAgentUI.showPlanDetail('${plan.id}')">
                        <i class="fas fa-eye"></i> 查看
                    </button>
                    ${plan.status === 'draft' ? `
                    <button class="btn-sm btn-primary" onclick="AIAgentUI.activatePlan('${plan.id}')">
                        <i class="fas fa-play"></i> 开始
                    </button>
                    ` : plan.status === 'active' ? `
                    <button class="btn-sm btn-primary" onclick="AIAgentUI.continuePlan('${plan.id}')">
                        <i class="fas fa-forward"></i> 继续
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    function showCreatePlanDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'modal active';
        dialog.id = 'create-plan-dialog';
        dialog.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-clipboard-list"></i> 创建新计划</h3>
                    <button class="modal-close" onclick="AIAgentUI.closeModal('create-plan-dialog')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>计划标题</label>
                        <input type="text" id="plan-title" placeholder="输入计划标题...">
                    </div>
                    <div class="form-group">
                        <label>任务描述</label>
                        <textarea id="plan-description" rows="4" placeholder="详细描述你的任务目标..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>任务类型</label>
                        <select id="plan-task-type">
                            <option value="general">通用任务</option>
                            <option value="research">研究调研</option>
                            <option value="writing">写作创作</option>
                            <option value="coding">编程开发</option>
                            <option value="planning">计划制定</option>
                            <option value="analysis">数据分析</option>
                        </select>
                    </div>
                    <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                        <div class="form-group">
                            <label>截止时间</label>
                            <input type="text" id="plan-deadline" placeholder="如：2025-03-15 或 下周">
                        </div>
                        <div class="form-group">
                            <label>人力资源</label>
                            <input type="text" id="plan-human-resources" placeholder="如：2人、1人兼职">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>资源配置</label>
                        <div class="resource-toggles">
                            <label class="toggle-item">
                                <input type="checkbox" id="plan-enable-skills" checked>
                                <span>使用 Skills</span>
                            </label>
                            <label class="toggle-item">
                                <input type="checkbox" id="plan-enable-rules" checked>
                                <span>使用 Rules</span>
                            </label>
                            <label class="toggle-item">
                                <input type="checkbox" id="plan-enable-mcp" checked>
                                <span>使用 MCP 工具</span>
                            </label>
                            <label class="toggle-item">
                                <input type="checkbox" id="plan-enable-rag" checked>
                                <span>使用 RAG 知识库</span>
                            </label>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="AIAgentUI.closeModal('create-plan-dialog')">取消</button>
                    <button class="btn-primary" id="create-plan-btn">
                        <i class="fas fa-magic"></i> AI生成计划
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        dialog.querySelector('#create-plan-btn').addEventListener('click', async () => {
            const title = dialog.querySelector('#plan-title').value.trim();
            const description = dialog.querySelector('#plan-description').value.trim();
            const taskType = dialog.querySelector('#plan-task-type').value;
            
            if (!title) {
                showToast('请输入计划标题', 'error');
                return;
            }

            const options = {
                taskType,
                enableSkills: dialog.querySelector('#plan-enable-skills').checked,
                enableRules: dialog.querySelector('#plan-enable-rules').checked,
                enableMCP: dialog.querySelector('#plan-enable-mcp').checked,
                enableRAG: dialog.querySelector('#plan-enable-rag').checked,
                deadline: dialog.querySelector('#plan-deadline')?.value?.trim() || null,
                humanResources: dialog.querySelector('#plan-human-resources')?.value?.trim() || null
            };

            closeModal('create-plan-dialog');
            showToast('正在生成计划...', 'info');

            try {
                const plan = await window.PlanManager.createPlan(title, description, options);
                
                const analysisPrompt = window.PlanManager.buildAnalysisPrompt(title, description, 
                    window.AIAgentApp.getSubAgentResources(window.AIAgentApp.getCurrentSubAgent().id),
                    { deadline: options.deadline, humanResources: options.humanResources, subAgents: window.AIAgentApp.getSubAgentList() });
                
                const result = await window.LLMService.invokeIntelligentAgent(
                    [{ role: 'user', content: analysisPrompt }],
                    { modelId: 'auto', outputFormat: 'markdown' }
                );

                const parsed = window.PlanManager.parsePlanFullOutput(result.content, plan);
                if (parsed.todos.length > 0) {
                    plan.todos = parsed.todos;
                }
                if (parsed.roadmap) plan.roadmap = parsed.roadmap;
                if (parsed.milestones?.length) plan.milestones = parsed.milestones;
                if (parsed.riskMatrix) plan.riskMatrix = parsed.riskMatrix;
                if (parsed.resourceConstraints?.length) plan.resourceConstraints = parsed.resourceConstraints;
                if (parsed.dependencyGraph) plan.dependencyGraph = parsed.dependencyGraph;
                window.PlanManager.updatePlan(plan.id, plan);

                renderPlanManager();
                showToast(`计划创建成功，包含 ${plan.todos.length} 个任务`, 'success');
                showPlanDetail(plan.id);
            } catch (error) {
                window.ErrorHandler?.handle(error, {
                    type: window.ErrorType?.API,
                    showToast: true,
                    logError: true
                });
            }
        });
    }

    function showPlanDetail(planId) {
        const plan = window.PlanManager?.getPlan?.(planId);
        if (!plan) return;

        const dialog = document.createElement('div');
        dialog.className = 'modal active';
        dialog.id = 'plan-detail-dialog';

        const progress = plan.metadata?.progress || 0;
        
        dialog.innerHTML = `
            <div class="modal-content plan-detail-modal">
                <div class="modal-header">
                    <h3>${escapeHtml(plan.title)}</h3>
                    <button class="modal-close" onclick="AIAgentUI.closeModal('plan-detail-dialog')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="plan-detail-progress">
                        <div class="plan-progress-bar">
                            <div class="plan-progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <span>${progress}% 完成</span>
                    </div>
                    <div class="plan-detail-desc">${escapeHtml(plan.description || '')}</div>
                    ${(plan.deadline || plan.humanResources) ? `<div class="plan-detail-meta"><span>${plan.deadline ? '截止: ' + escapeHtml(plan.deadline) : ''}</span>${plan.humanResources ? '<span>人力: ' + escapeHtml(plan.humanResources) + '</span>' : ''}</div>` : ''}
                    ${plan.roadmap ? `<div class="plan-roadmap-section"><h4><i class="fas fa-route"></i> 路线图</h4><div class="plan-roadmap-preview">${(plan.roadmap.phases || []).map(p => `<div class="phase-item"><strong>${escapeHtml(p.name || p.阶段 || '')}</strong> ${escapeHtml((p.start || '') + ' ~ ' + (p.end || ''))}</div>`).join('') || escapeHtml(plan.roadmap.title || '')}</div></div>` : ''}
                    ${(plan.milestones || []).length ? `<div class="plan-milestones-section"><h4><i class="fas fa-flag-checkered"></i> 里程碑</h4><ul class="plan-milestones-list">${plan.milestones.map(m => `<li><span class="ms-name">${escapeHtml(typeof m === 'string' ? m : (m.name || m.title || ''))}</span>${typeof m === 'object' && m.date ? `<span class="ms-date">${escapeHtml(m.date)}</span>` : ''}</li>`).join('')}</ul></div>` : ''}
                    ${plan.riskMatrix && (plan.riskMatrix.high?.length || plan.riskMatrix.medium?.length || plan.riskMatrix.low?.length) ? `<div class="plan-risk-section"><h4><i class="fas fa-exclamation-triangle"></i> 风险矩阵</h4><div class="plan-risk-preview"><span class="risk-high">高: ${(plan.riskMatrix.high || []).length}项</span><span class="risk-medium">中: ${(plan.riskMatrix.medium || []).length}项</span><span class="risk-low">低: ${(plan.riskMatrix.low || []).length}项</span></div></div>` : ''}
                    ${(plan.resourceConstraints || []).length ? `<div class="plan-constraints-section"><h4><i class="fas fa-exclamation-circle"></i> 资源约束</h4><ul>${plan.resourceConstraints.map(c => `<li>${escapeHtml(typeof c === 'string' ? c : (c.type || '') + ': ' + (c.description || c.desc || ''))}</li>`).join('')}</ul></div>` : ''}
                    <div class="plan-todo-list">
                        <h4>任务列表 (${plan.todos?.length || 0})</h4>
                        ${(plan.todos || []).map((todo, index) => `
                            <div class="plan-todo-detail ${todo.status}" data-todo-id="${todo.id}">
                                <div class="todo-number">${index + 1}</div>
                                <div class="todo-content">
                                    <div class="todo-title">${escapeHtml(todo.title)}</div>
                                    <div class="todo-desc">${escapeHtml(todo.description || '')}</div>
                                    <div class="todo-meta">
                                        <span class="todo-priority ${todo.priority || 'P1'}">${todo.priority || 'P1'}</span>
                                        ${todo.category ? `<span class="todo-category">${escapeHtml(todo.category)}</span>` : ''}
                                        ${todo.subAgentId ? `<span class="todo-agent" title="绑定助手">${escapeHtml(todo.subAgentId)}</span>` : ''}
                                        ${todo.estimatedTime ? `<span><i class="fas fa-clock"></i> ${todo.estimatedTime}min</span>` : ''}
                                    </div>
                                </div>
                                <div class="todo-actions">
                                    ${todo.status === 'pending' ? `
                                    <button class="btn-icon" onclick="AIAgentUI.executeTodo('${plan.id}', '${todo.id}')" title="执行">
                                        <i class="fas fa-play"></i>
                                    </button>
                                    ` : todo.status === 'in_progress' ? `
                                    <button class="btn-icon" disabled><i class="fas fa-spinner fa-spin"></i></button>
                                    ` : todo.status === 'completed' ? `
                                    <button class="btn-icon" disabled><i class="fas fa-check"></i></button>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="AIAgentUI.exportPlanAs('${plan.id}', 'md')" title="导出为Markdown"><i class="fas fa-file-alt"></i> MD</button>
                    <button class="btn-secondary" onclick="AIAgentUI.exportPlanAs('${plan.id}', 'html')" title="导出为HTML"><i class="fas fa-file-code"></i> HTML</button>
                    <button class="btn-secondary" onclick="AIAgentUI.closeModal('plan-detail-dialog')">关闭</button>
                    ${plan.status === 'active' ? `
                    <button class="btn-primary" onclick="AIAgentUI.continuePlan('${plan.id}')">
                        <i class="fas fa-forward"></i> 继续执行
                    </button>
                    ` : plan.status === 'draft' ? `
                    <button class="btn-primary" onclick="AIAgentUI.activatePlan('${plan.id}')">
                        <i class="fas fa-play"></i> 开始执行
                    </button>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(dialog);
    }

    async function executeTodo(planId, todoId) {
        showToast('正在执行任务...', 'info');
        try {
            await window.PlanManager.executeTodo(planId, todoId, window.AppState.messages || []);
            showToast('任务执行完成', 'success');
            showPlanDetail(planId);
            renderPlanManager();
        } catch (error) {
            window.ErrorHandler?.handle(error, {
                type: window.ErrorType?.API,
                showToast: true,
                logError: true
            });
        }
    }

    async function activatePlan(planId) {
        window.PlanManager.updatePlan(planId, { status: 'active' });
        showToast('计划已激活', 'success');
        renderPlanManager();
        showPlanDetail(planId);
    }

    async function continuePlan(planId) {
        const plan = window.PlanManager.getPlan(planId);
        if (!plan) return;

        const pendingTodos = plan.todos.filter(t => t.status === 'pending');
        if (pendingTodos.length === 0) {
            showToast('所有任务已完成', 'success');
            return;
        }

        showToast(`继续执行计划，还有 ${pendingTodos.length} 个任务`, 'info');
        
        // 执行下一个待办
        const nextTodo = pendingTodos[0];
        await executeTodo(planId, nextTodo.id);
    }

    function exportPlanAs(planId, format) {
        const plan = window.PlanManager?.getPlan?.(planId);
        if (!plan) { showToast('计划不存在', 'error'); return; }
        const safe = (s) => (s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        if (format === 'md') {
            let md = `# ${plan.title}\n\n${plan.description || ''}\n\n`;
            if (plan.deadline) md += `**截止时间**: ${plan.deadline}\n`;
            if (plan.humanResources) md += `**人力资源**: ${plan.humanResources}\n\n`;
            if (plan.roadmap?.phases?.length) {
                md += `## 路线图\n\n`;
                plan.roadmap.phases.forEach(p => { md += `- **${p.name || ''}**: ${p.start || ''} ~ ${p.end || ''}\n`; });
                md += '\n';
            }
            if (plan.milestones?.length) {
                md += `## 里程碑\n\n`;
                plan.milestones.forEach(m => { const n = typeof m === 'string' ? m : (m.name || m.title || ''); const d = typeof m === 'object' ? m.date : ''; md += `- ${n}${d ? ' (' + d + ')' : ''}\n`; });
                md += '\n';
            }
            if (plan.riskMatrix && (plan.riskMatrix.high?.length || plan.riskMatrix.medium?.length || plan.riskMatrix.low?.length)) {
                md += `## 风险矩阵\n\n`;
                if (plan.riskMatrix.high?.length) md += `### 高风险\n${plan.riskMatrix.high.map(i => `- ${i}`).join('\n')}\n\n`;
                if (plan.riskMatrix.medium?.length) md += `### 中风险\n${plan.riskMatrix.medium.map(i => `- ${i}`).join('\n')}\n\n`;
                if (plan.riskMatrix.low?.length) md += `### 低风险\n${plan.riskMatrix.low.map(i => `- ${i}`).join('\n')}\n\n`;
            }
            if (plan.resourceConstraints?.length) {
                md += `## 资源约束\n\n`;
                plan.resourceConstraints.forEach(c => { md += `- ${typeof c === 'string' ? c : (c.type || '') + ': ' + (c.description || c.desc || '')}\n`; });
                md += '\n';
            }
            md += `## 任务列表\n\n| # | 任务 | 分类 | 优先级 | 依赖 | 状态 |\n|---|------|------|--------|------|------|\n`;
            (plan.todos || []).forEach((t, i) => { md += `| ${i + 1} | ${t.title} | ${t.category || '-'} | ${t.priority || '-'} | ${(t.dependencies || []).join(', ') || '-'} | ${t.status || 'pending'} |\n`; });
            const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `计划-${plan.title}-${Date.now()}.md`; a.click(); URL.revokeObjectURL(a.href);
        } else if (format === 'html') {
            let html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>${safe(plan.title)}</title><style>body{font-family:sans-serif;max-width:800px;margin:2rem auto;padding:1rem;} table{border-collapse:collapse;width:100%;} th,td{border:1px solid #333;padding:8px;} .risk-high{color:#f87171;} .risk-medium{color:#fbbf24;} .risk-low{color:#34d399;}</style></head><body><h1>${safe(plan.title)}</h1><p>${safe(plan.description)}</p>`;
            if (plan.deadline) html += `<p><strong>截止时间</strong>: ${safe(plan.deadline)}</p>`;
            if (plan.humanResources) html += `<p><strong>人力资源</strong>: ${safe(plan.humanResources)}</p>`;
            if (plan.roadmap?.phases?.length) { html += '<h2>路线图</h2><ul>'; plan.roadmap.phases.forEach(p => { html += `<li><strong>${safe(p.name)}</strong>: ${safe(p.start)} ~ ${safe(p.end)}</li>`; }); html += '</ul>'; }
            if (plan.milestones?.length) { html += '<h2>里程碑</h2><ul>'; plan.milestones.forEach(m => { const n = typeof m === 'string' ? m : (m.name || m.title || ''); html += `<li>${safe(n)}</li>`; }); html += '</ul>'; }
            if (plan.riskMatrix?.high?.length || plan.riskMatrix?.medium?.length || plan.riskMatrix?.low?.length) {
                html += '<h2>风险矩阵</h2><p class="risk-high">高风险: ' + (plan.riskMatrix.high || []).join('; ') + '</p><p class="risk-medium">中风险: ' + (plan.riskMatrix.medium || []).join('; ') + '</p><p class="risk-low">低风险: ' + (plan.riskMatrix.low || []).join('; ') + '</p>';
            }
            html += '<h2>任务列表</h2><table><thead><tr><th>#</th><th>任务</th><th>分类</th><th>优先级</th><th>依赖</th><th>状态</th></tr></thead><tbody>';
            (plan.todos || []).forEach((t, i) => { html += `<tr><td>${i + 1}</td><td>${safe(t.title)}</td><td>${safe(t.category)}</td><td>${safe(t.priority)}</td><td>${(t.dependencies || []).join(', ')}</td><td>${safe(t.status)}</td></tr>`; });
            html += '</tbody></table></body></html>';
            const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `计划-${plan.title}-${Date.now()}.html`; a.click(); URL.revokeObjectURL(a.href);
        }
        showToast(`已导出为${format.toUpperCase()}`, 'success');
    }

    // ==================== 模态框管理 ====================
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeModal(modalId) {
        if (modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('active');
                setTimeout(() => {
                    if (!modal.classList.contains('active') && 
                        modalId !== 'settings-modal' && 
                        modalId !== 'model-modal' && 
                        modalId !== 'subagent-modal' && 
                        modalId !== 'tools-modal' &&
                        modalId !== 'plan-modal' &&
                        modalId !== 'task-modal' &&
                        modalId !== 'workflow-modal') {
                        modal.remove();
                    }
                }, 300);
            }
        } else {
            document.querySelectorAll('.modal').forEach(m => {
                m.classList.remove('active');
            });
        }
        document.body.style.overflow = '';
    }

    function closeAllModals() {
        closeModal();
    }

    // ==================== 工具函数 ====================
    // 优先使用工具模块中的函数，如果未加载则使用本地实现
    const formatTime = window.AIAgentUIUtils?.formatTime || function(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
        if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
        if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';

        return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    };

    const escapeHtml = window.AIAgentUIUtils?.escapeHtml || function(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    const scrollToBottom = window.AIAgentUIUtils?.scrollToBottom || function() {
        const container = document.getElementById('messages-container');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    };

    const showToast = window.AIAgentUIUtils?.showToast || function(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // 安全修复：使用textContent避免XSS攻击
        const icon = document.createElement('i');
        icon.className = `fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}`;
        
        const span = document.createElement('span');
        span.textContent = message; // 使用textContent自动转义
        
        toast.appendChild(icon);
        toast.appendChild(span);
        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    const previewImage = window.AIAgentUIUtils?.previewImage || function(src) {
        const container = document.getElementById('preview-image');
        if (container) {
            const img = container.querySelector('img');
            if (img) img.src = src;
            openModal('preview-image');
        }
    };

    function closeImagePreview() {
        closeModal('preview-image');
    }

    function previewFileAttachment(messageId, attachmentIndex) {
        const msg = (window.AppState?.messages || []).find(m => m.id === messageId);
        const att = msg?.attachments?.[attachmentIndex];
        if (!att?.content) return;
        const titleEl = document.getElementById('preview-file-title');
        const contentEl = document.getElementById('preview-file-content');
        if (titleEl) titleEl.innerHTML = `<i class="fas fa-file"></i> ${escapeHtml(att.name || '文件预览')}`;
        if (contentEl) contentEl.textContent = att.content;
        openModal('preview-file');
    }

    // ==================== 设置事件绑定 ====================
    function initSettingsEvents() {
        // 主题设置
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', () => {
                const theme = option.dataset.theme;
                document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
                option.classList.add('active');
                window.AIAgentApp?.applyTheme?.(theme);
            });
        });

        // 语言设置
        const langSelect = document.getElementById('setting-language');
        if (langSelect) {
            langSelect.addEventListener('change', (e) => {
                window.AIAgentApp?.applyLanguage?.(e.target.value);
            });
        }

        // 字体大小设置
        const fontSizeSelect = document.getElementById('setting-font-size');
        if (fontSizeSelect) {
            fontSizeSelect.addEventListener('change', (e) => {
                window.AIAgentApp?.applyFontSize?.(e.target.value);
            });
        }

        // 快捷键设置
        const shortcutSelect = document.getElementById('setting-shortcut');
        if (shortcutSelect) {
            shortcutSelect.addEventListener('change', (e) => {
                window.AIAgentApp?.applyShortcut?.(e.target.value);
            });
        }
    }

    // 初始化设置事件与图表工具栏
    function initUIEvents() {
        initSettingsEvents();
        if (typeof initDiagramToolbarEvents === 'function') initDiagramToolbarEvents();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUIEvents);
    } else {
        initUIEvents();
    }

    // ==================== 暴露到全局 ====================
    window.AIAgentUI = {
        renderChatHistory,
        renderMessages,
        createMessageElement,
        createStreamMessageElement,
        streamMessageUpdate,
        finalizeStreamMessage,
        showWelcomeScreen,
        renderModelSelector,
        updateCurrentModelDisplay,
        renderModelSettings,
        showModelConfigDialog,
        renderResources,
        showResourceDetail,
        editResource,
        deleteResource,
        renderSubAgentList,
        renderSubAgentsSettings,
        showSubAgentDetail,
        editSubAgent,
        deleteSubAgent,
        // 任务管理
        renderTasks,
        toggleTaskItem,
        deleteTask,
        showCreateTaskDialog,
        // 计划管理
        renderPlans,
        toggleTask,
        // 思考过程
        toggleThinking,
        // 搜索状态
        showSearchStatus,
        showSearchTodoSteps,
        hideSearchStatus,
        // Workflow 步骤进展
        showWorkflowStepProgress,
        hideWorkflowStepProgress,
        // 计划模式
        renderPlanManager,
        renderPlanCard,
        showCreatePlanDialog,
        showPlanDetail,
        exportPlanAs,
        executeTodo,
        activatePlan,
        continuePlan,
        openModal,
        closeModal,
        closeAllModals,
        closeImagePreview,
        copyMessage,
        openMessage,
        downloadMessage,
        speakMessage,
        regenerateMessage,
        editMessage,
        deleteMessage,
        renderMarkdown,
        previewImage,
        previewFileAttachment,
        showToast,
        scrollToBottom,
        formatTime,
        escapeHtml,
        parseSkillMD,
        generateSkillMD,
        // 多模态输出操作
        copyCode,
        previewH5,
        downloadH5,
        downloadAsPDF,
        downloadAsDOC,
        downloadAsCSV,
        // 输出格式相关
        detectOutputFormat,
        renderContentByFormat
    };
})();
