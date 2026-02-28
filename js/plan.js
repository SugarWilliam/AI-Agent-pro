/**
 * AI Agent Pro v8.0.0 - 计划模式模块
 * TODO制定与执行跟踪
 */

(function() {
    'use strict';

    const PlanManager = {
        plans: [],
        currentPlanId: null,

        // ==================== 初始化 ====================
        init() {
            this.loadPlans();
        },

        loadPlans() {
            const saved = localStorage.getItem('ai_agent_plans_v6');
            if (saved) {
                try {
                    this.plans = JSON.parse(saved);
                } catch (e) {
                    window.Logger?.error('加载计划失败:', e);
                    this.plans = [];
                }
            }
        },

        savePlans() {
            localStorage.setItem('ai_agent_plans_v6', JSON.stringify(this.plans));
        },

        // ==================== 创建计划 ====================
        async createPlan(title, description, options = {}) {
            const {
                taskType = 'general',
                enableSkills = true,
                enableRules = true,
                enableMCP = true,
                enableRAG = true
            } = options;

            const planId = 'plan_' + Date.now();
            
            // 获取当前Sub Agent资源
            const subAgent = window.AIAgentApp.getCurrentSubAgent();
            const resources = window.AIAgentApp.getSubAgentResources(subAgent.id);

            // 构建任务分析提示词
            const analysisPrompt = this.buildAnalysisPrompt(title, description, resources);

            // 调用LLM分析任务并生成TODO
            const plan = {
                id: planId,
                title,
                description,
                status: 'draft', // draft, active, completed, cancelled
                createdAt: Date.now(),
                updatedAt: Date.now(),
                todos: [],
                resources: {
                    subAgent: subAgent.id,
                    skills: resources.skills.map(s => s.id),
                    rules: resources.rules.map(r => r.id),
                    mcp: resources.mcp.map(m => m.id),
                    rag: resources.rag.map(r => r.id)
                },
                metadata: {
                    taskType,
                    progress: 0,
                    completedCount: 0,
                    totalCount: 0
                }
            };

            this.plans.unshift(plan);
            this.currentPlanId = planId;
            this.savePlans();

            return plan;
        },

        buildAnalysisPrompt(title, description, resources) {
            let prompt = `请分析以下任务，并制定详细的执行计划（TODO List）：\n\n`;
            prompt += `任务标题: ${title}\n`;
            prompt += `任务描述: ${description}\n\n`;

            if (resources.skills.length > 0) {
                prompt += `可用技能:\n`;
                resources.skills.forEach(s => {
                    prompt += `- ${s.name}: ${s.description}\n`;
                });
                prompt += `\n`;
            }

            if (resources.rules.length > 0) {
                prompt += `适用规则:\n`;
                resources.rules.forEach(r => {
                    prompt += `- ${r.name}: ${r.description}\n`;
                });
                prompt += `\n`;
            }

            if (resources.mcp.length > 0) {
                prompt += `可用工具:\n`;
                resources.mcp.forEach(m => {
                    prompt += `- ${m.name}: ${m.description}\n`;
                });
                prompt += `\n`;
            }

            if (resources.rag.length > 0) {
                prompt += `知识库:\n`;
                resources.rag.forEach(r => {
                    prompt += `- ${r.name}: ${r.description}\n`;
                });
                prompt += `\n`;
            }

            prompt += `\n请按以下格式输出TODO列表（JSON格式）:\n`;
            prompt += `\`\`\`json
[
  {
    "id": "todo_1",
    "title": "任务标题",
    "description": "详细描述",
    "priority": "high|medium|low",
    "estimatedTime": "预计耗时（分钟）",
    "dependencies": ["依赖的todo id"],
    "resources": ["需要调用的skill/mcp/rag id"]
  }
]
\`\`\``;

            return prompt;
        },

        // ==================== 解析AI生成的TODO ====================
        parseTodoList(aiResponse) {
            try {
                // 提取JSON代码块
                const jsonMatch = aiResponse.match(/```json\n?([\s\S]*?)\n?```/);
                if (jsonMatch) {
                    const todos = JSON.parse(jsonMatch[1]);
                    return todos.map((todo, index) => ({
                        ...todo,
                        id: todo.id || `todo_${Date.now()}_${index}`,
                        status: 'pending', // pending, in_progress, completed, cancelled
                        createdAt: Date.now(),
                        completedAt: null,
                        result: null
                    }));
                }
            } catch (e) {
                window.Logger?.error('解析TODO列表失败:', e);
            }
            return [];
        },

        // ==================== 更新计划 ====================
        updatePlan(planId, updates) {
            const plan = this.plans.find(p => p.id === planId);
            if (!plan) return null;

            Object.assign(plan, updates, { updatedAt: Date.now() });
            this.updatePlanProgress(plan);
            this.savePlans();
            return plan;
        },

        updatePlanProgress(plan) {
            const total = plan.todos.length;
            const completed = plan.todos.filter(t => t.status === 'completed').length;
            plan.metadata.totalCount = total;
            plan.metadata.completedCount = completed;
            plan.metadata.progress = total > 0 ? Math.round((completed / total) * 100) : 0;

            // 自动更新计划状态
            if (completed === total && total > 0) {
                plan.status = 'completed';
            } else if (completed > 0) {
                plan.status = 'active';
            }
        },

        // ==================== TODO操作 ====================
        addTodo(planId, todo) {
            const plan = this.plans.find(p => p.id === planId);
            if (!plan) return null;

            const newTodo = {
                id: `todo_${Date.now()}`,
                status: 'pending',
                createdAt: Date.now(),
                completedAt: null,
                result: null,
                ...todo
            };

            plan.todos.push(newTodo);
            this.updatePlanProgress(plan);
            this.savePlans();
            return newTodo;
        },

        updateTodo(planId, todoId, updates) {
            const plan = this.plans.find(p => p.id === planId);
            if (!plan) return null;

            const todo = plan.todos.find(t => t.id === todoId);
            if (!todo) return null;

            Object.assign(todo, updates);
            
            if (updates.status === 'completed' && !todo.completedAt) {
                todo.completedAt = Date.now();
            }

            this.updatePlanProgress(plan);
            this.savePlans();
            return todo;
        },

        deleteTodo(planId, todoId) {
            const plan = this.plans.find(p => p.id === planId);
            if (!plan) return false;

            plan.todos = plan.todos.filter(t => t.id !== todoId);
            this.updatePlanProgress(plan);
            this.savePlans();
            return true;
        },

        // ==================== 执行TODO ====================
        async executeTodo(planId, todoId, messages = []) {
            const plan = this.plans.find(p => p.id === planId);
            if (!plan) throw new Error('计划不存在');

            const todo = plan.todos.find(t => t.id === todoId);
            if (!todo) throw new Error('TODO不存在');

            // 更新状态为执行中
            this.updateTodo(planId, todoId, { status: 'in_progress' });

            // 构建执行提示词
            const executionPrompt = this.buildExecutionPrompt(todo, plan);

            // 调用智能Agent执行
            const result = await window.LLMService.invokeIntelligentAgent(
                [...messages, { role: 'user', content: executionPrompt }],
                {
                    modelId: plan.resources.subAgent,
                    enableWebSearch: plan.resources.mcp.includes('mcp_web_search'),
                    outputFormat: 'markdown'
                }
            );

            // 更新TODO结果
            this.updateTodo(planId, todoId, {
                status: 'completed',
                result: result.content
            });

            return result;
        },

        buildExecutionPrompt(todo, plan) {
            let prompt = `执行任务: ${todo.title}\n\n`;
            prompt += `描述: ${todo.description}\n`;
            
            if (todo.resources && todo.resources.length > 0) {
                prompt += `\n需要调用的资源: ${todo.resources.join(', ')}\n`;
            }

            prompt += `\n请完成上述任务，并提供详细的执行结果。`;
            return prompt;
        },

        // ==================== 批量执行 ====================
        async executePlan(planId, onProgress = null) {
            const plan = this.plans.find(p => p.id === planId);
            if (!plan) throw new Error('计划不存在');

            const pendingTodos = plan.todos.filter(t => t.status === 'pending');
            
            for (let i = 0; i < pendingTodos.length; i++) {
                const todo = pendingTodos[i];
                
                if (onProgress) {
                    onProgress({
                        current: i + 1,
                        total: pendingTodos.length,
                        todo: todo,
                        message: `正在执行: ${todo.title}`
                    });
                }

                await this.executeTodo(planId, todo.id);
            }

            return plan;
        },

        // ==================== 删除计划 ====================
        deletePlan(planId) {
            this.plans = this.plans.filter(p => p.id !== planId);
            if (this.currentPlanId === planId) {
                this.currentPlanId = null;
            }
            this.savePlans();
        },

        // ==================== 获取计划 ====================
        getPlan(planId) {
            return this.plans.find(p => p.id === planId);
        },

        getAllPlans() {
            return [...this.plans].sort((a, b) => b.updatedAt - a.updatedAt);
        },

        getActivePlans() {
            return this.plans.filter(p => p.status === 'active').sort((a, b) => b.updatedAt - a.updatedAt);
        },

        // ==================== AI辅助完善计划 ====================
        async refinePlan(planId, feedback) {
            const plan = this.plans.find(p => p.id === planId);
            if (!plan) throw new Error('计划不存在');

            const currentTodosJson = JSON.stringify(plan.todos, null, 2);
            
            const refinePrompt = `请根据以下反馈完善计划:\n\n`;
            refinePrompt += `反馈: ${feedback}\n\n`;
            refinePrompt += `当前TODO列表:\n\`\`\`json\n${currentTodosJson}\n\`\`\`\n\n`;
            refinePrompt += `请输出更新后的TODO列表（JSON格式），可以添加、修改或删除任务。`;

            const result = await window.LLMService.invokeIntelligentAgent(
                [{ role: 'user', content: refinePrompt }],
                { modelId: 'auto', outputFormat: 'markdown' }
            );

            const newTodos = this.parseTodoList(result.content);
            if (newTodos.length > 0) {
                plan.todos = newTodos;
                this.updatePlanProgress(plan);
                this.savePlans();
            }

            return plan;
        }
    };

    // 暴露到全局
    window.PlanManager = PlanManager;
})();
