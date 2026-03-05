/**
 * AI Agent Pro v8.3.2 - 计划模式模块
 * TODO制定与执行跟踪
 * 强化：MECE分类、优先级、原子化、依赖关系、SubAgent绑定、Roadmap、里程碑、风险矩阵、资源约束、智能规划
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
            const saved = localStorage.getItem('ai_agent_plans_v7');
            if (saved) {
                try {
                    this.plans = JSON.parse(saved);
                } catch (e) {
                    try {
                        const v6 = localStorage.getItem('ai_agent_plans_v6');
                        this.plans = v6 ? JSON.parse(v6) : [];
                    } catch (_) {
                        this.plans = [];
                    }
                }
            } else {
                this.plans = [];
            }
        },

        savePlans() {
            localStorage.setItem('ai_agent_plans_v7', JSON.stringify(this.plans));
        },

        // ==================== 创建计划 ====================
        async createPlan(title, description, options = {}) {
            const {
                taskType = 'general',
                enableSkills = true,
                enableRules = true,
                enableMCP = true,
                enableRAG = true,
                deadline = null,
                humanResources = null
            } = options;

            const planId = 'plan_' + Date.now();
            
            // 获取当前Sub Agent资源及可用SubAgent列表
            const subAgent = window.AIAgentApp.getCurrentSubAgent();
            const resources = window.AIAgentApp.getSubAgentResources(subAgent.id);
            const subAgentList = window.AIAgentApp?.getSubAgentList?.() || [];
            const subAgents = subAgentList.length ? subAgentList : Object.values(window.AppState?.subAgents || {}).map(a => ({ id: a.id, name: a.name || a.id }));

            // 构建任务分析提示词（强化版）
            const analysisPrompt = this.buildAnalysisPrompt(title, description, resources, {
                deadline,
                humanResources,
                subAgents
            });

            const plan = {
                id: planId,
                title,
                description,
                status: 'draft',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                todos: [],
                roadmap: null,
                milestones: [],
                riskMatrix: { high: [], medium: [], low: [] },
                resourceConstraints: [],
                dependencyGraph: null,
                deadline: deadline || null,
                humanResources: humanResources || null,
                resources: {
                    subAgent: subAgent.id,
                    skills: (resources?.skills || []).map(s => s.id),
                    rules: (resources?.rules || []).map(r => r.id),
                    mcp: (resources?.mcp || []).map(m => m.id),
                    rag: (resources?.rag || []).map(r => r.id)
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

        buildAnalysisPrompt(title, description, resources, context = {}) {
            resources = resources || { skills: [], rules: [], mcp: [], rag: [] };
            const { deadline, humanResources, subAgents = [] } = context;

            let prompt = `# 任务与计划智能分析

请基于以下输入，按 **MECE 原则** 对任务进行分类、原子化分解，并输出完整计划。

## 输入
- **任务标题**: ${title}
- **任务描述**: ${description}
`;
            if (deadline) prompt += `- **截止时间**: ${deadline}\n`;
            if (humanResources) prompt += `- **人力资源**: ${humanResources}\n`;

            prompt += `\n## 要求

### 1. 任务 MECE 原则
- **相互独立**：任务之间无重叠、无交叉
- **完全穷尽**：覆盖目标全部范围，无遗漏
- **原子化**：每个任务为可独立执行的原子单元（单一职责、可验收）

### 2. 分类与分级
- **分类**：按业务域/模块分类（如：需求、设计、开发、测试、部署）
- **优先级**：P0(紧急重要)、P1(重要不紧急)、P2(紧急不重要)、P3(可延后)
- **难度**：easy/medium/hard（影响时间估算）

### 3. 依赖关系
- 明确任务间 FS(完成-开始)、SS(开始-开始) 等依赖
- 识别关键路径

### 4. SubAgent 强绑定
- 根据任务类型，为每个任务指定最合适的 SubAgent（subAgentId）
- 可用 SubAgent 列表：${subAgents.map(a => `${a.id}(${a.name})`).join(', ') || 'task, plan, general'}

### 5. 智能规划
- 根据 **任务难度**、**人力资源**、**任务数量**、**deadline** 进行时间和计划智能规划
- 识别资源约束（人力、时间、工具）
- 识别时间点（自然语言如"下周"、"Q2"需转为具体日期或相对天数）
`;

            if (resources.skills?.length > 0) {
                prompt += `\n## 可用技能\n`;
                resources.skills.forEach(s => { prompt += `- ${s.name}: ${s.description}\n`; });
            }
            if (resources.rules?.length > 0) {
                prompt += `\n## 适用规则\n`;
                resources.rules.forEach(r => { prompt += `- ${r.name}: ${r.description}\n`; });
            }
            if (resources.mcp?.length > 0) {
                prompt += `\n## 可用工具\n`;
                resources.mcp.forEach(m => { prompt += `- ${m.name}: ${m.description}\n`; });
            }
            if (resources.rag?.length > 0) {
                prompt += `\n## 知识库\n`;
                resources.rag.forEach(r => { prompt += `- ${r.name}: ${r.description}\n`; });
            }

            prompt += `

## 输出格式（必须全部输出）

### 1. 任务分类表（Markdown 表格）
使用 \`\`\`task-classification-table 代码块，输出分类分级表格：

\`\`\`task-classification-table
| 任务ID | 任务标题 | 分类 | 优先级 | 难度 | 预计工时(分钟) | 绑定SubAgent | 依赖 |
|--------|----------|------|--------|------|----------------|--------------|------|
| todo_1 | xxx | 需求 | P0 | medium | 60 | task | - |
| todo_2 | xxx | 设计 | P1 | hard | 120 | plan | todo_1 |
\`\`\`

### 2. TODO 列表（JSON）
\`\`\`json
[
  {
    "id": "todo_1",
    "title": "任务标题",
    "description": "详细描述",
    "category": "分类名",
    "priority": "P0|P1|P2|P3",
    "difficulty": "easy|medium|hard",
    "estimatedTime": 60,
    "dependencies": [],
    "subAgentId": "task",
    "resources": [],
    "targetDate": "YYYY-MM-DD 或 相对天数"
  }
]
\`\`\`

### 3. Roadmap（里程碑 + 时间线）
\`\`\`roadmap
{
  "title": "项目路线图",
  "phases": [
    { "name": "阶段1", "start": "2025-03-01", "end": "2025-03-15", "milestones": ["里程碑1", "里程碑2"] }
  ],
  "milestones": [
    { "name": "里程碑1", "date": "2025-03-10", "description": "描述" }
  ]
}
\`\`\`

### 4. 依赖关系图
\`\`\`dependency-graph
{
  "nodes": [{"id": "todo_1", "label": "任务1"}],
  "edges": [{"from": "todo_1", "to": "todo_2", "label": "FS"}]
}
\`\`\`

### 5. 风险矩阵
\`\`\`risk-matrix
{
  "high": ["高风险项1"],
  "medium": ["中风险项1"],
  "low": ["低风险项1"]
}
\`\`\`

### 6. 资源约束
\`\`\`resource-constraints
{
  "constraints": [
    { "type": "人力", "description": "仅1人可参与", "impact": "高" },
    { "type": "时间", "description": "deadline紧张", "impact": "中" }
  ]
}
\`\`\`
`;

            return prompt;
        },

        // ==================== 解析AI生成的完整计划输出 ====================
        parsePlanFullOutput(aiResponse, plan) {
            const result = { todos: [], roadmap: null, milestones: [], riskMatrix: null, resourceConstraints: [], dependencyGraph: null };
            try {
                // 1. 解析 TODO JSON
                const jsonMatch = aiResponse.match(/```json\n?([\s\S]*?)\n?```/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[1]);
                    const arr = Array.isArray(parsed) ? parsed : (parsed.todos || parsed.items || []);
                    result.todos = arr.map((todo, index) => ({
                        ...todo,
                        id: todo.id || `todo_${Date.now()}_${index}`,
                        category: todo.category || todo.分类 || '',
                        priority: todo.priority || 'P1',
                        difficulty: todo.difficulty || 'medium',
                        subAgentId: todo.subAgentId || todo.subAgent || plan?.resources?.subAgent || 'task',
                        status: 'pending',
                        createdAt: Date.now(),
                        completedAt: null,
                        result: null
                    }));
                }

                // 2. 解析 roadmap
                const roadmapMatch = aiResponse.match(/```roadmap\n([\s\S]*?)```/);
                if (roadmapMatch) {
                    try {
                        result.roadmap = JSON.parse(roadmapMatch[1].replace(/[\u201C\u201D]/g, '"'));
                        result.milestones = result.roadmap.milestones || result.roadmap.phases?.flatMap(p => (p.milestones || []).map(m => typeof m === 'string' ? { name: m } : m)) || [];
                    } catch (_) { /* ignore */ }
                }

                // 3. 解析 risk-matrix
                const riskMatch = aiResponse.match(/```risk-matrix\n([\s\S]*?)```/);
                if (riskMatch) {
                    try {
                        const raw = riskMatch[1].trim();
                        if (raw.startsWith('{')) {
                            result.riskMatrix = JSON.parse(raw.replace(/[\u201C\u201D]/g, '"'));
                        }
                    } catch (_) { /* ignore */ }
                }

                // 4. 解析 resource-constraints
                const rcMatch = aiResponse.match(/```resource-constraints\n([\s\S]*?)```/);
                if (rcMatch) {
                    try {
                        const rc = JSON.parse(rcMatch[1].replace(/[\u201C\u201D]/g, '"'));
                        result.resourceConstraints = rc.constraints || rc.资源约束 || [];
                    } catch (_) { /* ignore */ }
                }

                // 5. 解析 dependency-graph
                const depMatch = aiResponse.match(/```dependency-graph\n([\s\S]*?)```/);
                if (depMatch) {
                    try {
                        result.dependencyGraph = JSON.parse(depMatch[1].replace(/[\u201C\u201D]/g, '"'));
                    } catch (_) { /* ignore */ }
                }
            } catch (e) {
                window.Logger?.error('解析计划输出失败:', e);
            }
            return result;
        },

        parseTodoList(aiResponse) {
            const parsed = this.parsePlanFullOutput(aiResponse, null);
            return parsed.todos;
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

            // 调用智能Agent执行（优先使用任务绑定的 SubAgent）
            const subAgentId = todo.subAgentId || plan.resources.subAgent;
            const result = await window.LLMService.invokeIntelligentAgent(
                [...messages, { role: 'user', content: executionPrompt }],
                {
                    subAgentId,
                    modelId: 'auto',
                    enableWebSearch: (plan.resources?.mcp || []).includes('mcp_web_search'),
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
