/**
 * AI Agent Pro v8.0.0 - UI渲染模块
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

        // 渲染附件
        let attachmentsHtml = '';
        if (msg.attachments?.length > 0) {
            attachmentsHtml = '<div class="message-attachments" style="margin-bottom: 8px;">' +
                msg.attachments.map(att => {
                    if (att.type === 'image') {
                        return `<img src="${att.data}" alt="${att.name}" style="max-width: 200px; max-height: 150px; border-radius: var(--radius-md); cursor: pointer;" onclick="AIAgentUI.previewImage('${att.data}')">`;
                    } else {
                        return `<div style="padding: 8px 12px; background: var(--bg-tertiary); border-radius: var(--radius-md); display: flex; align-items: center; gap: 8px; font-size: 13px;"><i class="fas fa-file"></i> ${escapeHtml(att.name)}</div>`;
                    }
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
            contentHtml = escapeHtml(msg.content).replace(/\n/g, '<br>');
        }

        // 左下角操作按钮（复制、下载）- 使用data属性而不是onclick
        const leftActions = `
            <button class="msg-action-btn" data-action="copy" data-message-id="${msg.id}" title="复制">
                <i class="fas fa-copy"></i>
            </button>
            <button class="msg-action-btn" data-action="download" data-message-id="${msg.id}" title="下载">
                <i class="fas fa-download"></i>
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

        scrollToBottom();
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
                thinkingHtml = `
                    <div class="thinking-section" data-message-id="${msgId}">
                        <div class="thinking-header" onclick="AIAgentUI.toggleThinking('${msgId}')">
                            <i class="fas fa-brain"></i>
                            <span>思考过程</span>
                            <i class="fas fa-chevron-down thinking-toggle-icon" style="margin-left: auto; font-size: 10px;"></i>
                        </div>
                        <div class="thinking-content collapsed">${escapeHtml(thinking)}</div>
                    </div>
                `;
            }
            
            // 渲染内容
            const outputFormat = detectOutputFormat(finalContent);
            const contentHtml = renderContentByFormat(renderMarkdown(finalContent), outputFormat);
            
            // 添加操作按钮 - 使用data属性而不是onclick
            const leftActions = `
                <button class="msg-action-btn" data-action="copy" data-message-id="${msgId}" title="复制">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="msg-action-btn" data-action="download" data-message-id="${msgId}" title="下载">
                    <i class="fas fa-download"></i>
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

        scrollToBottom();
        
        // 返回消息ID，供调用者使用
        return msgId;
    }

    // ==================== Markdown渲染 ====================
    function renderMarkdown(text) {
        if (!text) return '';

        // 保存代码块，避免被其他规则处理
        const codeBlocks = [];
        text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            codeBlocks.push(`<pre class="code-block"><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`);
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

        // 图表处理
        // 坐标曲线图
        text = text.replace(/```chart\n([\s\S]*?)```/g, (match, json) => {
            const chartHtml = renderChart(match);
            return chartHtml || match;
        });

        // 决策矩阵
        text = text.replace(/```decision-matrix\n([\s\S]*?)```/g, (match) => {
            const matrixHtml = renderDecisionMatrix(match);
            return matrixHtml || match;
        });

        // 概率分布
        text = text.replace(/```probability\n([\s\S]*?)```/g, (match) => {
            const probHtml = renderProbabilityDistribution(match);
            return probHtml || match;
        });

        // 决策链
        text = text.replace(/```decision-chain\n([\s\S]*?)```/g, (match) => {
            const chainHtml = renderDecisionChain(match);
            return chainHtml || match;
        });

        // Mermaid图表
        text = text.replace(/```mermaid\n([\s\S]*?)```/g, (match) => {
            const mermaidHtml = renderMermaid(match);
            return mermaidHtml || match;
        });

        // 段落和换行处理
        // 将连续换行分隔的文本块包装为段落
        const paragraphs = text.split(/\n\n+/);
        text = paragraphs.map(p => {
            p = p.trim();
            if (!p) return '';
            // 如果已经是块级元素，不包装
            if (p.match(/^<(h[1-6]|ul|ol|pre|blockquote|hr)/)) return p;
            // 将单个换行转为<br>
            p = p.replace(/\n/g, '<br>');
            return `<p>${p}</p>`;
        }).join('\n');

        return text;
    }

    // ==================== Markdown表格渲染 ====================
    function renderMarkdownTable(text) {
        // 匹配Markdown表格格式
        // 格式: | 列1 | 列2 | 列3 |
        //       |-----|-----|-----|
        //       | 内容1 | 内容2 | 内容3 |
        const lines = text.split('\n');
        const result = [];
        let inTable = false;
        let tableLines = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
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
        
        // 表头
        if (headers.length > 0) {
            html += '<thead><tr>';
            headers.forEach(header => {
                html += `<th>${escapeHtml(header)}</th>`;
            });
            html += '</tr></thead>';
        }
        
        // 数据行
        if (rows.length > 0) {
            html += '<tbody>';
            rows.forEach(row => {
                html += '<tr>';
                row.forEach((cell, idx) => {
                    // 如果单元格数量超过表头，仍然显示
                    html += `<td>${escapeHtml(cell)}</td>`;
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
            const chartData = JSON.parse(chartMatch[1]);
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
            
            return `<div class="chart-container" style="height: 300px; margin: 16px 0;"><canvas id="${chartId}"></canvas></div>`;
        } catch (e) {
            window.Logger?.error('Chart render error:', e);
            return null;
        }
    }

    function renderDecisionMatrix(content) {
        // 解析决策矩阵数据
        const matrixMatch = content.match(/```decision-matrix\n([\s\S]*?)```/);
        if (!matrixMatch) return null;
        
        try {
            const matrix = JSON.parse(matrixMatch[1]);
            const { alternatives, criteria, scores } = matrix;
            
            let html = '<div class="decision-matrix-container">';
            html += '<h4><i class="fas fa-th"></i> 决策矩阵</h4>';
            html += '<table class="decision-matrix">';
            
            // 表头
            html += '<thead><tr><th>方案</th>';
            criteria.forEach(c => {
                html += `<th>${escapeHtml(c.name)}<br><small>权重:${c.weight}</small></th>`;
            });
            html += '<th>总分</th></tr></thead>';
            
            // 数据行
            html += '<tbody>';
            alternatives.forEach((alt, idx) => {
                html += `<tr><td><strong>${escapeHtml(alt)}</strong></td>`;
                let total = 0;
                criteria.forEach((c, cidx) => {
                    const score = scores[idx]?.[cidx] || 0;
                    total += score * c.weight;
                    html += `<td>${score}</td>`;
                });
                html += `<td class="total-score">${total.toFixed(2)}</td></tr>`;
            });
            html += '</tbody></table>';
            
            // 推荐方案
            const bestIdx = scores.map((s, i) => ({
                idx: i,
                score: s.reduce((a, b, j) => a + b * criteria[j].weight, 0)
            })).sort((a, b) => b.score - a.score)[0];
            
            if (bestIdx !== undefined) {
                html += `<div class="recommendation"><i class="fas fa-star"></i> 推荐方案: <strong>${escapeHtml(alternatives[bestIdx.idx])}</strong> (得分: ${bestIdx.score.toFixed(2)})</div>`;
            }
            
            html += '</div>';
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
            const dist = JSON.parse(distMatch[1]);
            const chartId = 'prob-chart-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            
            setTimeout(() => {
                const ctx = document.getElementById(chartId);
                if (ctx && typeof Chart !== 'undefined') {
                    new Chart(ctx, {
                        type: dist.type || 'bar',
                        data: {
                            labels: dist.labels,
                            datasets: [{
                                label: dist.label || '概率',
                                data: dist.data,
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
            
            return `<div class="chart-container" style="height: 300px; margin: 16px 0;"><canvas id="${chartId}"></canvas></div>`;
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
            const chain = JSON.parse(chainMatch[1]);
            const { nodes, edges } = chain;
            
            let html = '<div class="decision-chain-container">';
            html += '<h4><i class="fas fa-project-diagram"></i> 决策链</h4>';
            html += '<div class="decision-chain">';
            
            nodes.forEach((node, idx) => {
                const isDecision = node.type === 'decision';
                const isEnd = node.type === 'end';
                const nodeClass = isDecision ? 'decision-node' : (isEnd ? 'end-node' : 'process-node');
                
                html += `<div class="chain-node ${nodeClass}">`;
                html += `<div class="node-content">${escapeHtml(node.label)}</div>`;
                if (node.description) {
                    html += `<div class="node-desc">${escapeHtml(node.description)}</div>`;
                }
                html += '</div>';
                
                // 添加连接线（除了最后一个节点）
                if (idx < nodes.length - 1) {
                    const edge = edges?.find(e => e.from === node.id);
                    if (edge) {
                        html += `<div class="chain-edge"><span class="edge-label">${escapeHtml(edge.label || '是')}</span><i class="fas fa-arrow-down"></i></div>`;
                    } else {
                        html += '<div class="chain-edge"><i class="fas fa-arrow-down"></i></div>';
                    }
                }
            });
            
            html += '</div></div>';
            return html;
        } catch (e) {
            window.Logger?.error('Decision chain render error:', e);
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
                curve: 'basis'
            },
            sequence: {
                useMaxWidth: true,
                diagramMarginX: 50,
                diagramMarginY: 10
            }
        });
        mermaidInitialized = true;
    }
    
    function renderMermaid(content) {
        // 解析Mermaid代码块
        const mermaidMatch = content.match(/```mermaid\n([\s\S]*?)```/);
        if (!mermaidMatch) return null;
        
        try {
            const mermaidCode = mermaidMatch[1].trim();
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
            
            return `<div class="mermaid-container"><div id="${mermaidId}" class="mermaid-wrapper">正在加载图表...</div></div>`;
        } catch (e) {
            window.Logger?.error('Mermaid parse error:', e);
            return null;
        }
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

        // 检测代码
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

        // 检测表格
        if (content.match(/\|.*\|.*\|/)) {
            return 'table';
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
        // 解析Markdown表格
        let html = renderMarkdown(content);

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
        // 提取HTML内容
        let htmlContent = content;
        if (content.includes('<!DOCTYPE html>') || content.includes('<html')) {
            // 已经是HTML，直接展示预览
            htmlContent = content;
        } else {
            // 将Markdown转换为简单的HTML预览
            htmlContent = renderMarkdown(content);
        }

        return `<div class="h5-output-container">
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
        const content = container.querySelector('.h5-preview-content').innerHTML;

        const previewWindow = window.open('', '_blank');
        previewWindow.document.write(`
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>H5 预览</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
                    img { max-width: 100%; height: auto; }
                    pre { background: #f4f4f4; padding: 15px; border-radius: 8px; overflow-x: auto; }
                    code { font-family: 'Consolas', 'Monaco', monospace; }
                    table { border-collapse: collapse; width: 100%; margin: 15px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background: #f5f5f5; }
                </style>
            </head>
            <body>${content}</body>
            </html>
        `);
        previewWindow.document.close();
    }

    function downloadH5(btn) {
        const container = btn.closest('.h5-output-container');
        const content = container.querySelector('.h5-preview-content').innerHTML;

        const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Agent Pro 导出</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
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
<body>${content}</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
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
        const htmlContent = `<!DOCTYPE html>
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

    function downloadMessage(messageId) {
        const msg = (window.AppState.messages || []).find(m => m.id === messageId);
        if (!msg) return;

        // 显示格式选择对话框
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
                    <h3><i class="fas fa-download"></i> 下载消息</h3>
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
                            <span>HTML (H5)</span>
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
        
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Agent Pro - 消息记录</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; background: #f5f5f5; }
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
            ${renderMarkdown(msg.content)}
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
        
        // 下载
        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `message-${msg.role}-${new Date(msg.timestamp).toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('已导出为图片', 'success');
        }, 'image/png');
    }

    // 下载为PDF
    function downloadAsPDF(msg) {
        // 使用简单的HTML转PDF方式
        const htmlContent = formatAsHTML(msg);
        
        // 创建打印窗口
        const printWindow = window.open('', '_blank');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // 延迟打印
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

        dialog.querySelector('#save-subagent-edit').addEventListener('click', () => {
            agent.name = dialog.querySelector('#edit-subagent-name').value.trim();
            agent.description = dialog.querySelector('#edit-subagent-desc').value.trim();
            agent.systemPrompt = dialog.querySelector('#edit-subagent-prompt').value.trim();
            
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
        if (!section) return;
        
        const content = section.querySelector('.thinking-content');
        const preview = section.querySelector('.thinking-preview');
        const full = section.querySelector('.thinking-full');
        const icon = section.querySelector('.thinking-toggle-icon');
        
        const isCollapsed = content.classList.contains('collapsed');
        
        if (isCollapsed) {
            content.classList.remove('collapsed');
            preview.style.display = 'none';
            full.style.display = 'block';
            icon.style.transform = 'rotate(180deg)';
        } else {
            content.classList.add('collapsed');
            preview.style.display = 'block';
            full.style.display = 'none';
            icon.style.transform = 'rotate(0deg)';
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
                enableRAG: dialog.querySelector('#plan-enable-rag').checked
            };

            closeModal('create-plan-dialog');
            showToast('正在生成计划...', 'info');

            try {
                const plan = await window.PlanManager.createPlan(title, description, options);
                
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

                renderPlanManager();
                showToast(`计划创建成功，包含 ${todos.length} 个任务`, 'success');
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
                    <div class="plan-todo-list">
                        <h4>任务列表 (${plan.todos?.length || 0})</h4>
                        ${(plan.todos || []).map((todo, index) => `
                            <div class="plan-todo-detail ${todo.status}" data-todo-id="${todo.id}">
                                <div class="todo-number">${index + 1}</div>
                                <div class="todo-content">
                                    <div class="todo-title">${escapeHtml(todo.title)}</div>
                                    <div class="todo-desc">${escapeHtml(todo.description || '')}</div>
                                    <div class="todo-meta">
                                        <span class="todo-priority ${todo.priority}">${todo.priority}</span>
                                        ${todo.estimatedTime ? `<span><i class="fas fa-clock"></i> ${todo.estimatedTime}</span>` : ''}
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
                        modalId !== 'task-modal') {
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
        const img = document.getElementById('preview-image');
        if (img) {
            img.src = src;
            openModal('image-preview-modal');
        }
    };

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

    // 初始化设置事件
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSettingsEvents);
    } else {
        initSettingsEvents();
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
        // 计划模式
        renderPlanManager,
        renderPlanCard,
        showCreatePlanDialog,
        showPlanDetail,
        executeTodo,
        activatePlan,
        continuePlan,
        openModal,
        closeModal,
        closeAllModals,
        copyMessage,
        downloadMessage,
        speakMessage,
        regenerateMessage,
        editMessage,
        deleteMessage,
        renderMarkdown,
        previewImage,
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
