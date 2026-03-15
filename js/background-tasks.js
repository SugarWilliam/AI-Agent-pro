/**
 * AI Agent Pro - 后台任务管理模块
 * 支持 SubAgent 对话、Workflow、Plan TODO 在后台运行，不阻塞 UI
 */
(function() {
    'use strict';

    const BackgroundTaskManager = {
        tasks: [],
        _id: 0,

        /** 生成任务 ID */
        _nextId() {
            return 'bg_' + (++this._id) + '_' + Date.now();
        },

        /** 添加任务 */
        add(task) {
            task.id = task.id || this._nextId();
            task.status = 'running';
            task.startedAt = Date.now();
            this.tasks.push(task);
            this._persist();
            this._notifyChange();
            return task.id;
        },

        /** 完成任务 */
        complete(taskId, result) {
            const t = this.tasks.find(x => x.id === taskId);
            if (t) {
                t.status = 'completed';
                t.completedAt = Date.now();
                t.result = result;
                this._persist();
                this._notifyChange();
            }
        },

        /** 任务失败 */
        fail(taskId, error) {
            const t = this.tasks.find(x => x.id === taskId);
            if (t) {
                t.status = 'failed';
                t.completedAt = Date.now();
                t.error = error?.message || String(error);
                this._persist();
                this._notifyChange();
            }
        },

        /** 取消任务 */
        cancel(taskId) {
            const t = this.tasks.find(x => x.id === taskId);
            if (t && t.status === 'running' && t.abortController) {
                try { t.abortController.abort(); } catch (_) {}
                t.status = 'cancelled';
                t.completedAt = Date.now();
                this._persist();
                this._notifyChange();
            }
        },

        /** 移除任务（从列表移除） */
        remove(taskId) {
            this.tasks = this.tasks.filter(x => x.id !== taskId);
            this._persist();
            this._notifyChange();
        },

        /** 获取运行中任务 */
        getRunning() {
            return this.tasks.filter(t => t.status === 'running');
        },

        /** 获取最近任务（含已完成，用于 UI） */
        getRecent(limit = 10) {
            return [...this.tasks].reverse().slice(0, limit);
        },

        _persist() {
            try {
                const data = this.tasks.filter(t => t.status === 'running').map(t => ({
                    id: t.id,
                    type: t.type,
                    label: t.label,
                    chatId: t.chatId,
                    startedAt: t.startedAt
                }));
                localStorage.setItem('ai_agent_bg_tasks', JSON.stringify(data));
            } catch (_) {}
        },

        _notifyChange() {
            window.dispatchEvent(new CustomEvent('background-tasks-changed', { detail: { tasks: this.tasks } }));
            this._updateIndicator();
        },

        _updateIndicator() {
            const running = this.getRunning();
            const el = document.getElementById('background-tasks-indicator');
            if (!el) return;
            const countEl = el.querySelector('.background-tasks-count');
            if (running.length > 0) {
                el.style.display = 'flex';
                if (countEl) countEl.textContent = running.length;
            } else {
                el.style.display = 'none';
            }
        },

        /**
         * 在后台执行 SubAgent/Workflow 对话
         * @param {Object} opts - { chatId, messages, messageContent, workflowChainSteps, wfOpts, subAgentId, enableWebSearch, isWorkflow }
         */
        async runChatTask(opts) {
            const {
                chatId,
                messages,
                messageContent,
                workflowChainSteps = [],
                wfOpts = {},
                subAgentId,
                enableWebSearch,
                isWorkflow
            } = opts;

            const abortController = new AbortController();
            const taskId = this.add({
                type: 'chat',
                label: workflowChainSteps.length > 0 ? 'Workflow' : (window.AppState?.subAgents?.[subAgentId]?.name || subAgentId || '对话'),
                chatId,
                abortController
            });

            const placeholderId = 'msg_placeholder_' + taskId;
            const chat = (window.AppState?.chats || []).find(c => c.id === chatId);
            if (chat) {
                chat.messages = [...(chat.messages || []), {
                    id: placeholderId,
                    role: 'assistant',
                    content: '⏳ 后台处理中...',
                    timestamp: Date.now(),
                    _placeholder: true,
                    _taskId: taskId
                }];
                chat.updatedAt = Date.now();
                if (window.AppState?.currentChatId === chatId) {
                    window.AppState.messages = [...chat.messages];
                    window.AIAgentUI?.renderMessages?.();
                }
                window.AIAgentApp?.saveState?.();
            }

            try {
                let response;
                if (workflowChainSteps.length > 0) {
                    response = await window.LLMService?.runWorkflowChain?.(
                        workflowChainSteps,
                        messageContent,
                        messages,
                        window.AppState?.currentModel,
                        null, // 后台不流式
                        wfOpts
                    );
                } else {
                    response = await window.LLMService?.sendMessage?.(
                        messages,
                        window.AppState?.currentModel,
                        enableWebSearch,
                        null, // 后台不流式
                        isWorkflow,
                        { subAgentId }
                    );
                    if (subAgentId === 'creative' && response?.content && window.AIAgentUI?.stripCreativeStepMarker) {
                        response = { ...response, content: window.AIAgentUI.stripCreativeStepMarker(response.content) };
                    }
                }

                const aiMessage = {
                    id: 'msg_' + Date.now(),
                    role: 'assistant',
                    content: response?.content || '',
                    thinking: response?.thinking || '',
                    timestamp: Date.now()
                };

                if (chat) {
                    chat.messages = (chat.messages || []).map(m =>
                        m._placeholder && m._taskId === taskId ? aiMessage : m
                    );
                    chat.updatedAt = Date.now();
                    if (window.AppState?.currentChatId === chatId) {
                        window.AppState.messages = [...chat.messages];
                        window.AIAgentUI?.renderMessages?.();
                    }
                    window.AIAgentApp?.saveState?.();
                }

                this.complete(taskId, { aiMessage });
                window.AIAgentUI?.showToast?.('后台任务已完成', 'success');
                window.AIAgentUI?.renderChatHistory?.();
            } catch (err) {
                if (err?.name === 'AbortError' || err?.message?.includes('取消')) {
                    this.cancel(taskId);
                    if (chat) {
                        chat.messages = (chat.messages || []).filter(m => !(m._placeholder && m._taskId === taskId));
                        window.AIAgentApp?.saveState?.();
                    }
                    return;
                }
                this.fail(taskId, err);
                if (chat) {
                    const errMsg = {
                        id: 'msg_' + Date.now(),
                        role: 'assistant',
                        content: '后台任务失败: ' + (err?.message || '未知错误'),
                        timestamp: Date.now()
                    };
                    chat.messages = (chat.messages || []).map(m =>
                        m._placeholder && m._taskId === taskId ? errMsg : m
                    );
                    window.AIAgentApp?.saveState?.();
                }
                window.AIAgentUI?.showToast?.('后台任务失败: ' + (err?.message || '未知错误'), 'error');
            }
        },

        /**
         * 在后台执行 Plan TODO
         */
        async runPlanTodoTask(planId, todoId, messages) {
            const plan = window.PlanManager?.plans?.find(p => p.id === planId);
            const todo = plan?.todos?.find(t => t.id === todoId);
            if (!plan || !todo) {
                window.AIAgentUI?.showToast?.('计划或任务不存在', 'error');
                return;
            }

            const abortController = new AbortController();
            const taskId = this.add({
                type: 'plan_todo',
                label: todo.title || 'Plan TODO',
                planId,
                todoId,
                abortController
            });

            try {
                window.PlanManager.updateTodo(planId, todoId, { status: 'in_progress' });
                const result = await window.PlanManager.executeTodo(planId, todoId, messages);
                this.complete(taskId, result);
                window.AIAgentUI?.showToast?.('Plan TODO 已完成: ' + (todo.title || ''), 'success');
                window.dispatchEvent(new CustomEvent('plan-todo-completed', { detail: { planId, todoId } }));
            } catch (err) {
                if (err?.name === 'AbortError') {
                    this.cancel(taskId);
                    window.PlanManager.updateTodo(planId, todoId, { status: 'pending' });
                    return;
                }
                this.fail(taskId, err);
                window.PlanManager.updateTodo(planId, todoId, { status: 'pending' });
                window.AIAgentUI?.showToast?.('Plan TODO 失败: ' + (err?.message || ''), 'error');
            }
            this._notifyChange();
        }
    };

    window.BackgroundTaskManager = BackgroundTaskManager;
})();
