/**
 * AI Agent Pro v6.0.0 - 应用状态管理
 * 多模态AI Agent - 支持输入输出多模态
 */

(function() {
    'use strict';

    const VERSION = '7.9.0';
    const STORAGE_KEY = 'ai_agent_state_v6';
    const CUSTOM_MODELS_KEY = 'ai_agent_custom_models_v6';
    const CUSTOM_SUBAGENTS_KEY = 'ai_agent_custom_subagents_v6';
    const SYNC_CONFIG_KEY = 'ai_agent_sync_config_v6';
    const RAG_VECTORS_KEY = 'ai_agent_rag_vectors_v6';

    // ==================== 防抖和保存优化 ====================
    let saveTimeout = null;
    const SAVE_DELAY = 500; // 500ms 防抖延迟

    function debouncedSave() {
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }
        saveTimeout = setTimeout(() => {
            saveState();
        }, SAVE_DELAY);
    }

    function immediateSave() {
        if (saveTimeout) {
            clearTimeout(saveTimeout);
            saveTimeout = null;
        }
        saveState();
    }

    // ==================== 默认API Keys ====================
    const DEFAULT_API_KEYS = {
        'glm-4-plus': '052dd25c55a54c3f8a4e087230b7e43c.V3pCoVwBQsxhKqVe',
        'glm-4-flash': '052dd25c55a54c3f8a4e087230b7e43c.V3pCoVwBQsxhKqVe',
        'deepseek-chat': 'sk-a135315b7bf248c1978dabca70819936',
        'deepseek-reasoner': 'sk-a135315b7bf248c1978dabca70819936',
        'qwen-max': 'sk-9eeb995cf93d441aa74869af1f2decd0'
    };

    // ==================== 内置模型配置 ====================
    const BUILTIN_MODELS = {
        'auto': {
            id: 'auto',
            name: 'Auto',
            description: '根据任务自动选择最佳模型',
            provider: 'system',
            url: '',
            apiKey: '',
            maxTokens: 4096,
            temperature: 0.7,
            isBuiltin: true,
            outputFormats: ['markdown', 'text']
        },
        'deepseek-chat': {
            id: 'deepseek-chat',
            name: 'DeepSeek Chat',
            description: '通用对话，性价比高',
            provider: 'deepseek',
            url: 'https://api.deepseek.com/chat/completions',
            apiKey: DEFAULT_API_KEYS['deepseek-chat'],
            maxTokens: 8192,
            temperature: 0.7,
            isBuiltin: true,
            outputFormats: ['markdown', 'text', 'json']
        },
        'deepseek-reasoner': {
            id: 'deepseek-reasoner',
            name: 'DeepSeek R1',
            description: '深度推理，复杂问题',
            provider: 'deepseek',
            url: 'https://api.deepseek.com/chat/completions',
            apiKey: DEFAULT_API_KEYS['deepseek-reasoner'],
            maxTokens: 8192,
            temperature: 0.7,
            reasoning: true,
            isBuiltin: true,
            outputFormats: ['markdown', 'text', 'json']
        },
        'glm-4-plus': {
            id: 'glm-4-plus',
            name: 'GLM-4-Plus',
            description: '旗舰模型，全能表现',
            provider: 'glm',
            url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
            apiKey: DEFAULT_API_KEYS['glm-4-plus'],
            maxTokens: 4096,
            temperature: 0.7,
            isBuiltin: true,
            outputFormats: ['markdown', 'text', 'json', 'image']
        },
        'glm-4-flash': {
            id: 'glm-4-flash',
            name: 'GLM-4-Flash',
            description: '轻量快速，日常任务',
            provider: 'glm',
            url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
            apiKey: DEFAULT_API_KEYS['glm-4-flash'],
            maxTokens: 4096,
            temperature: 0.7,
            isBuiltin: true,
            outputFormats: ['markdown', 'text']
        },
        'kimi-latest': {
            id: 'kimi-latest',
            name: 'Kimi',
            description: 'Moonshot AI',
            provider: 'kimi',
            url: 'https://api.moonshot.cn/v1/chat/completions',
            apiKey: '',
            maxTokens: 4096,
            temperature: 0.7,
            isBuiltin: true,
            outputFormats: ['markdown', 'text', 'json']
        },
        'qwen-max': {
            id: 'qwen-max',
            name: '通义千问',
            description: '阿里云',
            provider: 'qwen',
            url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
            apiKey: DEFAULT_API_KEYS['qwen-max'],
            maxTokens: 4096,
            temperature: 0.7,
            isBuiltin: true,
            outputFormats: ['markdown', 'text', 'json']
        },
        'gpt-4o': {
            id: 'gpt-4o',
            name: 'GPT-4o',
            description: 'OpenAI',
            provider: 'openai',
            url: 'https://api.openai.com/v1/chat/completions',
            apiKey: '',
            maxTokens: 4096,
            temperature: 0.7,
            isBuiltin: true,
            outputFormats: ['markdown', 'text', 'json', 'image']
        },
        'claude-3-sonnet': {
            id: 'claude-3-sonnet',
            name: 'Claude 3',
            description: 'Anthropic',
            provider: 'anthropic',
            url: 'https://api.anthropic.com/v1/messages',
            apiKey: '',
            maxTokens: 4096,
            temperature: 0.7,
            isBuiltin: true,
            outputFormats: ['markdown', 'text', 'json']
        }
    };

    // ==================== 12个内置Skills ====================
    const BUILTIN_SKILLS = [
        {
            id: 'skill_writer',
            name: '专业写作',
            description: '帮助撰写各类文章、报告、邮件等',
            enabled: true,
            skillMD: generateSkillMD('专业写作', '帮助撰写各类文章、报告、邮件等', `你是一位专业写作助手，擅长撰写各类文章、报告、邮件等。请用专业、流畅的语言帮助用户完成写作任务。注意文章结构清晰，逻辑严谨。输出格式默认为Markdown。`, ['writing', 'content']),
            prompt: '你是一位专业写作助手，擅长撰写各类文章、报告、邮件等。请用专业、流畅的语言帮助用户完成写作任务。输出格式默认为Markdown。',
            outputFormat: 'markdown'
        },
        {
            id: 'skill_translator',
            name: '翻译专家',
            description: '多语言翻译服务，支持文档翻译',
            enabled: true,
            skillMD: generateSkillMD('翻译专家', '多语言翻译服务', `你是一位专业翻译，提供准确、流畅的多语言翻译服务。请保持原文的语气和风格，确保译文自然地道。支持文档、网页、图片中的文字翻译。`, ['translation', 'language']),
            prompt: '你是一位专业翻译，提供准确、流畅的多语言翻译服务。请保持原文的语气和风格，确保译文自然地道。',
            outputFormat: 'markdown'
        },
        {
            id: 'skill_coder',
            name: '代码助手',
            description: '编程辅助、代码审查、调试优化',
            enabled: true,
            skillMD: generateSkillMD('代码助手', '编程辅助、代码审查、调试优化', `你是一位资深程序员，擅长代码审查、调试、优化。请给出具体、可执行的代码示例和详细解释，并遵循最佳实践。输出代码块需标注语言类型。`, ['code', 'programming']),
            prompt: '你是一位资深程序员，擅长代码审查、调试、优化。请给出具体、可执行的代码示例和详细解释，并遵循最佳实践。',
            outputFormat: 'markdown'
        },
        {
            id: 'skill_analyst',
            name: '数据分析师',
            description: '数据分析、可视化建议、报表生成',
            enabled: true,
            skillMD: generateSkillMD('数据分析师', '数据分析、可视化建议、报表生成', `你是一位数据分析师，擅长数据分析和可视化建议。请提供清晰的数据洞察和 actionable 的建议。支持生成电子表格、图表分析。`, ['data', 'analysis']),
            prompt: '你是一位数据分析师，擅长数据分析和可视化建议。请提供清晰的数据洞察和 actionable 的建议。',
            outputFormat: 'markdown'
        },
        {
            id: 'skill_teacher',
            name: '学习导师',
            description: '教育辅导、知识讲解、学习计划制定',
            enabled: true,
            skillMD: generateSkillMD('学习导师', '教育辅导、知识讲解', `你是一位耐心的学习导师，善于解释复杂概念。请用通俗易懂的方式讲解知识点，并提供学习建议。支持生成学习计划、知识图谱。`, ['education', 'learning']),
            prompt: '你是一位耐心的学习导师，善于解释复杂概念。请用通俗易懂的方式讲解知识点，并提供学习建议。',
            outputFormat: 'markdown'
        },
        {
            id: 'skill_brainstorm',
            name: '头脑风暴',
            description: '创意激发、想法生成、思维导图',
            enabled: true,
            skillMD: generateSkillMD('头脑风暴', '创意激发、想法生成', `你是一位创意激发专家，擅长头脑风暴和想法生成。请提供多样化、创新性的想法和建议。支持生成思维导图结构。`, ['creative', 'brainstorm']),
            prompt: '你是一位创意激发专家，擅长头脑风暴和想法生成。请提供多样化、创新性的想法和建议。',
            outputFormat: 'markdown'
        },
        {
            id: 'skill_reviewer',
            name: '内容审校',
            description: '文本审校、语法检查、风格优化',
            enabled: true,
            skillMD: generateSkillMD('内容审校', '文本审校、语法检查', `你是一位专业编辑，擅长文本审校和语法检查。请仔细检查文本中的错误，并提供改进建议。`, ['review', 'grammar']),
            prompt: '你是一位专业编辑，擅长文本审校和语法检查。请仔细检查文本中的错误，并提供改进建议。',
            outputFormat: 'markdown'
        },
        {
            id: 'skill_summarizer',
            name: '摘要生成',
            description: '长文摘要、要点提取、文档总结',
            enabled: true,
            skillMD: generateSkillMD('摘要生成', '长文摘要、要点提取', `你是一位摘要专家，擅长从长文中提取关键信息和要点。请生成简洁、准确的摘要。支持PDF、DOC文档摘要。`, ['summary', 'extract']),
            prompt: '你是一位摘要专家，擅长从长文中提取关键信息和要点。请生成简洁、准确的摘要。',
            outputFormat: 'markdown'
        },
        {
            id: 'skill_presenter',
            name: '演示文稿',
            description: 'PPT制作、演讲稿撰写、演示设计',
            enabled: true,
            skillMD: generateSkillMD('演示文稿', 'PPT制作、演讲稿撰写', `你是一位演示文稿专家，擅长制作PPT和撰写演讲稿。请提供结构清晰、视觉美观的演示内容。支持Markdown转PPT格式。`, ['presentation', 'ppt']),
            prompt: '你是一位演示文稿专家，擅长制作PPT和撰写演讲稿。请提供结构清晰、视觉美观的演示内容。',
            outputFormat: 'markdown'
        },
        {
            id: 'skill_planner',
            name: '计划制定',
            description: '项目规划、时间管理、目标设定',
            enabled: true,
            skillMD: generateSkillMD('计划制定', '项目规划、时间管理', `你是一位计划制定专家，擅长项目规划和时间管理。请帮助用户制定详细可行的计划，设定SMART目标。`, ['planning', 'management']),
            prompt: '你是一位计划制定专家，擅长项目规划和时间管理。请帮助用户制定详细可行的计划，设定SMART目标。',
            outputFormat: 'markdown'
        },
        {
            id: 'skill_researcher',
            name: '研究助手',
            description: '文献检索、资料收集、研究报告',
            enabled: true,
            skillMD: generateSkillMD('研究助手', '文献检索、资料收集', `你是一位研究助手，擅长文献检索和资料收集。请帮助用户整理研究资料，生成研究报告。支持网页、PDF资料分析。`, ['research', 'academic']),
            prompt: '你是一位研究助手，擅长文献检索和资料收集。请帮助用户整理研究资料，生成研究报告。',
            outputFormat: 'markdown'
        },
        {
            id: 'skill_designer',
            name: '设计顾问',
            description: 'UI/UX建议、视觉设计、原型设计',
            enabled: true,
            skillMD: generateSkillMD('设计顾问', 'UI/UX建议、视觉设计', `你是一位设计顾问，擅长UI/UX设计和视觉建议。请提供专业的设计意见和原型建议。`, ['design', 'ui', 'ux']),
            prompt: '你是一位设计顾问，擅长UI/UX设计和视觉建议。请提供专业的设计意见和原型建议。',
            outputFormat: 'markdown'
        },
        {
            id: 'skill_pyramid',
            name: '金字塔方法',
            description: '金字塔原理分析、结构化思维、逻辑表达',
            enabled: true,
            skillMD: generateSkillMD('金字塔方法', '金字塔原理分析、结构化思维', `你是一位金字塔原理专家，擅长结构化思维和逻辑表达。请帮助用户将复杂信息组织成清晰的层次结构，先结论后论据，确保逻辑严密。`, ['pyramid', 'structure', 'logic']),
            prompt: '你是一位金字塔原理专家，擅长结构化思维和逻辑表达。请帮助用户将复杂信息组织成清晰的层次结构，先结论后论据，确保逻辑严密。使用金字塔结构展示分析结果。',
            outputFormat: 'markdown'
        },
        {
            id: 'skill_mece',
            name: 'MECE原则',
            description: 'MECE分析、相互独立完全穷尽、问题分解',
            enabled: true,
            skillMD: generateSkillMD('MECE原则', 'MECE分析、问题分解', `你是一位MECE分析专家，擅长将复杂问题分解为相互独立、完全穷尽(Mutually Exclusive, Collectively Exhaustive)的子问题。请确保分析框架无遗漏、无重叠。`, ['mece', 'analysis', 'framework']),
            prompt: '你是一位MECE分析专家，擅长将复杂问题分解为相互独立、完全穷尽的子问题。请确保分析框架无遗漏、无重叠，使用MECE原则进行结构化分析。',
            outputFormat: 'markdown'
        },
        {
            id: 'skill_swot',
            name: 'SWOT分析',
            description: 'SWOT分析、优势劣势机会威胁评估',
            enabled: true,
            skillMD: generateSkillMD('SWOT分析', 'SWOT分析、战略评估', `你是一位SWOT分析专家，擅长评估优势(Strengths)、劣势(Weaknesses)、机会(Opportunities)、威胁(Threats)。请提供全面的战略分析和 actionable 的建议。`, ['swot', 'strategy', 'analysis']),
            prompt: '你是一位SWOT分析专家，擅长评估优势、劣势、机会、威胁。请提供全面的战略分析和 actionable 的建议，使用SWOT矩阵展示分析结果。',
            outputFormat: 'markdown'
        },
        {
            id: 'skill_smart',
            name: 'SMART方法',
            description: 'SMART目标设定、具体可衡量可达成相关有时限',
            enabled: true,
            skillMD: generateSkillMD('SMART方法', 'SMART目标设定', `你是一位SMART目标设定专家，擅长制定具体(Specific)、可衡量(Measurable)、可达成(Achievable)、相关(Relevant)、有时限(Time-bound)的目标。请帮助用户设定清晰可行的目标。`, ['smart', 'goals', 'planning']),
            prompt: '你是一位SMART目标设定专家，擅长制定具体、可衡量、可达成、相关、有时限的目标。请帮助用户设定清晰可行的目标，使用SMART框架展示目标设定。',
            outputFormat: 'markdown'
        },
        {
            id: 'skill_data_cleaning',
            name: '数据分层清洗',
            description: '数据分层、数据清洗、数据质量管理',
            enabled: true,
            skillMD: generateSkillMD('数据分层清洗', '数据分层、数据清洗', `你是一位数据质量管理专家，擅长数据分层和数据清洗。请帮助用户识别数据质量问题，提供数据清洗方案，确保数据准确性和一致性。`, ['data', 'cleaning', 'quality']),
            prompt: '你是一位数据质量管理专家，擅长数据分层和数据清洗。请帮助用户识别数据质量问题，提供数据清洗方案，确保数据准确性和一致性。',
            outputFormat: 'markdown'
        },
        {
            id: 'skill_advanced_analytics',
            name: '高级数据分析',
            description: '微积分、概率分析、矩阵运算、卷积、统计分析',
            enabled: true,
            skillMD: generateSkillMD('高级数据分析', '微积分、概率分析、矩阵运算、卷积、统计分析', `你是一位高级数据分析师，精通微积分、概率论、矩阵运算、卷积和统计分析。请使用数学方法解决复杂的数据问题，提供严谨的数学推导和可视化结果。`, ['calculus', 'probability', 'matrix', 'statistics']),
            prompt: `你是一位高级数据分析师，精通以下数学方法：
1. 微积分：导数、积分、微分方程
2. 概率分析：概率分布、期望值、方差、贝叶斯推断
3. 矩阵运算：矩阵乘法、特征值分解、线性回归
4. 卷积：信号处理、图像处理
5. 统计分析：假设检验、回归分析、时间序列

请使用适当的数学方法解决问题，提供详细的推导过程和计算结果。支持使用LaTeX格式展示数学公式，使用chart代码块展示可视化结果。`,
            outputFormat: 'markdown'
        },
        {
            id: 'skill_decision_expert',
            name: '决策专家',
            description: '决策分析、决策矩阵、决策链、风险评估',
            enabled: true,
            skillMD: generateSkillMD('决策专家', '决策分析、决策矩阵、决策链', `你是一位决策分析专家，擅长使用决策矩阵、决策树、决策链等方法进行系统性决策分析。请帮助用户评估不同方案的优劣，提供科学的决策建议。`, ['decision', 'matrix', 'analysis']),
            prompt: `你是一位决策分析专家，擅长使用以下方法进行决策分析：
1. 决策矩阵：多维度评估不同方案
2. 决策链：展示决策流程和关键节点
3. 概率分析：评估风险和不确定性
4. 成本效益分析：量化决策影响
5. Mermaid流程图：可视化决策流程

请使用decision-matrix代码块展示决策矩阵，使用decision-chain代码块展示决策链，使用probability代码块展示概率分布，使用mermaid代码块展示决策流程图。`,
            outputFormat: 'markdown'
        },
        {
            id: 'skill_first_principles',
            name: '第一性原理思维',
            description: '第一性原理、本质思考、底层逻辑分析',
            enabled: true,
            skillMD: generateSkillMD('第一性原理思维', '第一性原理、本质思考', `你是一位第一性原理思维专家，擅长透过表象看本质，从最基本的真理出发进行逻辑推理。请帮助用户打破传统思维定式，找到问题的根本原因和创新解决方案。`, ['first-principles', 'thinking', 'innovation']),
            prompt: `你是一位第一性原理思维专家，擅长透过表象看本质。

核心方法：
1. 质疑假设：挑战所有现有假设和传统做法
2. 分解到底：将问题分解到最基本、不可再分的事实
3. 重新构建：从基础事实出发，逻辑推导出解决方案
4. 验证本质：确保每一步推理都基于可验证的事实

请帮助用户：
- 识别问题中的隐含假设
- 找到问题的根本原因（使用5Why分析法）
- 提出突破性的创新方案
- 使用系统思维分析问题的各个层面

输出格式：
- 当前假设分析
- 基础事实识别
- 逻辑推理过程
- 创新解决方案
- 实施建议`,
            outputFormat: 'markdown'
        },
        {
            id: 'skill_iceberg_model',
            name: '冰山模型分析',
            description: '冰山模型、深层结构、系统思考',
            enabled: true,
            skillMD: generateSkillMD('冰山模型分析', '冰山模型、系统思考', `你是一位系统思考专家，擅长使用冰山模型分析问题的各个层次。请帮助用户从事件层深入到模式层、结构层和心智模型层，找到系统性解决方案。`, ['iceberg', 'systems-thinking', 'analysis']),
            prompt: `你是一位系统思考专家，擅长使用冰山模型分析问题的各个层次。

冰山模型四层次：
1. 事件层（水面之上）：可见的问题和症状
2. 模式层（水面之下）：重复出现的行为模式
3. 结构层（深层）：系统结构和关系
4. 心智模型层（最深层）：信念、假设、价值观

分析方法：
- 识别当前处于哪个层次
- 追溯问题的深层原因
- 分析系统反馈回路
- 找到杠杆点进行干预

输出格式：
- 事件描述
- 模式识别
- 结构分析
- 心智模型探索
- 系统性解决方案
- 杠杆点建议`,
            outputFormat: 'markdown'
        },
        {
            id: 'skill_cognitive_psychology',
            name: '认知心理学应用',
            description: '认知偏差识别、决策优化、思维模式分析',
            enabled: true,
            skillMD: generateSkillMD('认知心理学应用', '认知偏差、决策优化', `你是一位认知心理学专家，擅长识别认知偏差、优化决策过程。请帮助用户了解自己的思维模式，避免常见的心理陷阱，做出更理性的决策。`, ['cognitive', 'psychology', 'bias']),
            prompt: `你是一位认知心理学专家，擅长识别认知偏差和优化决策。

核心能力：
1. 认知偏差识别：
   - 确认偏误、锚定效应、可得性启发
   - 损失厌恶、禀赋效应、幸存者偏差
   - 群体思维、权威服从、从众心理

2. 决策优化：
   - 前景理论应用
   - 概率思维训练
   - 反事实思考

3. 思维模式分析：
   - 快思考vs慢思考
   - 直觉vs理性
   - 心智模型识别

请帮助用户：
- 识别决策中的认知偏差
- 提供去偏策略
- 优化决策流程
- 建立更理性的思维习惯`,
            outputFormat: 'markdown'
        },
        {
            id: 'skill_mermaid_visualization',
            name: 'Mermaid可视化',
            description: '流程图、时序图、甘特图、思维导图可视化',
            enabled: true,
            skillMD: generateSkillMD('Mermaid可视化', '流程图、时序图、思维导图', `你是一位可视化专家，擅长使用Mermaid语法创建各种图表。请帮助用户将复杂信息转化为直观的可视化图形。`, ['mermaid', 'visualization', 'diagram']),
            prompt: `你是一位Mermaid可视化专家，擅长创建各种图表。

支持的图表类型：
1. 流程图 (flowchart)：决策流程、业务流程
2. 时序图 (sequenceDiagram)：系统交互、API调用
3. 甘特图 (gantt)：项目进度、时间规划
4. 思维导图 (mindmap)：概念关系、知识组织
5. 类图 (classDiagram)：系统设计、架构图
6. 状态图 (stateDiagram)：状态转换、生命周期

输出格式：
使用 \\\`\\\`\\\`mermaid 代码块输出图表

示例：
\\\`\\\`\\\`mermaid
flowchart TD
    A[开始] --> B{判断}
    B -->|是| C[处理]
    B -->|否| D[结束]
    C --> D
\\\`\\\`\\\`

请根据用户需求选择合适的图表类型，提供清晰、专业的可视化方案。`,
            outputFormat: 'markdown'
        }
    ];

    // 生成Skill MD模板
    function generateSkillMD(name, description, prompt, tags = []) {
        return `# ${name}

\`\`\`yaml
name: ${name}
description: ${description}
version: 1.0.0
author: AI Agent Pro
tags: ${tags.join(', ')}
\`\`\`

## 描述

${description}

## 提示词

\`\`\`
${prompt}
\`\`\`

## 使用说明

1. 在对话中引用此技能
2. AI助手将根据提示词执行相应任务
3. 可以结合其他技能使用
`;
    }

    // ==================== 8个内置Rules ====================
    const BUILTIN_RULES = [
        {
            id: 'rule_format',
            name: '格式规范',
            description: '输出格式要求，默认Markdown',
            enabled: true,
            content: '使用Markdown格式输出，代码块标注语言类型，标题层级清晰。支持多模态输出时优先使用Markdown格式。',
            priority: 1
        },
        {
            id: 'rule_tone',
            name: '语气风格',
            description: '回复语气要求',
            enabled: true,
            content: '保持专业、友好、简洁的语气，避免过于生硬或随意。根据任务类型调整语气风格。',
            priority: 2
        },
        {
            id: 'rule_safety',
            name: '安全准则',
            description: '内容安全要求',
            enabled: true,
            content: '不生成有害、违法、不当内容，尊重用户隐私。对敏感内容进行适当过滤。',
            priority: 3
        },
        {
            id: 'rule_accuracy',
            name: '准确性',
            description: '信息准确要求',
            enabled: true,
            content: '确保提供的信息准确可靠，不确定时明确说明。引用来源时注明出处。',
            priority: 4
        },
        {
            id: 'rule_examples',
            name: '示例要求',
            description: '提供示例',
            enabled: true,
            content: '适当提供具体示例帮助理解，示例应具有代表性。复杂概念配合示例说明。',
            priority: 5
        },
        {
            id: 'rule_structure',
            name: '结构清晰',
            description: '内容结构要求',
            enabled: true,
            content: '内容结构清晰，使用列表、段落等方式组织信息。长篇内容使用目录结构。',
            priority: 6
        },
        {
            id: 'rule_multimodal',
            name: '多模态支持',
            description: '多模态输入输出处理',
            enabled: true,
            content: '支持图片、PDF、DOC、网页、链接等多模态输入。输出支持Markdown、表格、代码块等格式。',
            priority: 7
        },
        {
            id: 'rule_context',
            name: '上下文保持',
            description: '对话上下文管理',
            enabled: true,
            content: '保持对话上下文连贯，理解用户意图。多轮对话中保持主题一致性。',
            priority: 8
        }
    ];

    // ==================== 6个内置MCP ====================
    const BUILTIN_MCP = [
        {
            id: 'mcp_filesystem',
            name: '文件系统',
            description: '本地文件操作、文档读取',
            enabled: true,
            url: 'builtin://filesystem',
            type: 'builtin',
            protocol: 'mcp://1.0',
            capabilities: ['read_file', 'write_file', 'list_directory'],
            supportedFormats: ['txt', 'md', 'json', 'csv']
        },
        {
            id: 'mcp_web_search',
            name: '网络搜索',
            description: '网页搜索、信息获取',
            enabled: true,
            url: 'builtin://websearch',
            type: 'builtin',
            protocol: 'mcp://1.0',
            capabilities: ['search', 'fetch_page'],
            supportedFormats: ['url', 'html']
        },
        {
            id: 'mcp_calculator',
            name: '计算器',
            description: '数学计算、公式求解',
            enabled: true,
            url: 'builtin://calculator',
            type: 'builtin',
            protocol: 'mcp://1.0',
            capabilities: ['calculate', 'solve_equation'],
            supportedFormats: ['expression']
        },
        {
            id: 'mcp_translator',
            name: '翻译服务',
            description: '多语言翻译、OCR识别',
            enabled: true,
            url: 'builtin://translator',
            type: 'builtin',
            protocol: 'mcp://1.0',
            capabilities: ['translate', 'ocr'],
            supportedFormats: ['text', 'image']
        },
        {
            id: 'mcp_document_parser',
            name: '文档解析',
            description: 'PDF、DOC文档解析提取',
            enabled: true,
            url: 'builtin://document-parser',
            type: 'builtin',
            protocol: 'mcp://1.0',
            capabilities: ['parse_pdf', 'parse_doc', 'extract_text'],
            supportedFormats: ['pdf', 'doc', 'docx', 'txt']
        },
        {
            id: 'mcp_image_analysis',
            name: '图像分析',
            description: '图片识别、OCR、图像理解',
            enabled: true,
            url: 'builtin://image-analysis',
            type: 'builtin',
            protocol: 'mcp://1.0',
            capabilities: ['analyze_image', 'ocr', 'describe_image'],
            supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
        }
    ];

    // ==================== 8个内置RAG知识库（含外部数据链接）====================
    const BUILTIN_RAG = [
        {
            id: 'rag_finance',
            name: '金融知识库',
            description: '金融、投资、经济学知识',
            enabled: true,
            category: '金融',
            documents: [],
            protocol: 'rag://1.0',
            supportedTypes: ['pdf', 'doc', 'docx', 'txt', 'md', 'html', 'url'],
            vectorized: false,
            documentCount: 0,
            externalSources: [
                { name: 'Investopedia', url: 'https://www.investopedia.com/', type: 'website', description: '投资理财百科全书' },
                { name: '中国人民银行', url: 'http://www.pbc.gov.cn/', type: 'website', description: '中国货币政策、金融数据' },
                { name: '东方财富网', url: 'https://www.eastmoney.com/', type: 'website', description: '股票、基金、财经资讯' },
                { name: '经济学人', url: 'https://www.economist.com/', type: 'website', description: '全球经济分析' }
            ],
            defaultContent: `金融基础知识：
1. 货币与银行：货币供应量M0/M1/M2，央行货币政策，利率决定机制
2. 投资理论：现代投资组合理论(MPT)，资本资产定价模型(CAPM)，有效市场假说
3. 金融市场：股票市场、债券市场、外汇市场、衍生品市场
4. 风险管理：VaR模型，风险分散，对冲策略
5. 财务报表分析：资产负债表、利润表、现金流量表` 
        },
        {
            id: 'rag_philosophy',
            name: '哲学知识库',
            description: '东西方哲学、伦理学、逻辑学',
            enabled: true,
            category: '哲学',
            documents: [],
            protocol: 'rag://1.0',
            supportedTypes: ['pdf', 'doc', 'docx', 'txt', 'md', 'html', 'url'],
            vectorized: false,
            documentCount: 0,
            externalSources: [
                { name: '斯坦福哲学百科全书', url: 'https://plato.stanford.edu/', type: 'website', description: '权威哲学词条' },
                { name: '中国哲学书电子化计划', url: 'https://ctext.org/zh', type: 'website', description: '中国古代哲学典籍' },
                { name: 'Internet Encyclopedia of Philosophy', url: 'https://iep.utm.edu/', type: 'website', description: '西方哲学百科' }
            ],
            defaultContent: `哲学核心概念：
1. 形而上学：存在论、本体论、因果关系、自由意志
2. 认识论：经验主义、理性主义、怀疑论、康德批判哲学
3. 伦理学：功利主义、义务论、德性伦理学、应用伦理学
4. 逻辑学：命题逻辑、谓词逻辑、归纳推理、谬误分析
5. 中国哲学：儒家、道家、佛家、宋明理学`
        },
        {
            id: 'rag_literature',
            name: '文学知识库',
            description: '中外文学、诗词、名著',
            enabled: true,
            category: '文学',
            documents: [],
            protocol: 'rag://1.0',
            supportedTypes: ['pdf', 'doc', 'docx', 'txt', 'md', 'html', 'url'],
            vectorized: false,
            documentCount: 0,
            externalSources: [
                { name: '古诗文网', url: 'https://www.gushiwen.cn/', type: 'website', description: '中国古诗文' },
                { name: 'Project Gutenberg', url: 'https://www.gutenberg.org/', type: 'website', description: '免费电子书籍' },
                { name: '中国作家网', url: 'http://www.chinawriter.com.cn/', type: 'website', description: '当代文学资讯' }
            ],
            defaultContent: `文学知识体系：
1. 中国古代文学：诗经、楚辞、唐诗、宋词、元曲、明清小说
2. 中国现当代文学：鲁迅、茅盾、巴金、老舍、莫言
3. 外国文学：古希腊罗马、文艺复兴、浪漫主义、现实主义、现代主义
4. 文学理论：叙事学、文体学、符号学、接受美学
5. 诗词格律：平仄、对仗、押韵、词牌、曲牌`
        },
        {
            id: 'rag_linux',
            name: '嵌入式Linux',
            description: 'Linux系统、嵌入式开发、驱动编程',
            enabled: true,
            category: '技术',
            documents: [],
            protocol: 'rag://1.0',
            supportedTypes: ['pdf', 'doc', 'docx', 'txt', 'md', 'html', 'url'],
            vectorized: false,
            documentCount: 0,
            externalSources: [
                { name: 'Linux内核文档', url: 'https://www.kernel.org/doc/html/latest/', type: 'website', description: '官方内核文档' },
                { name: 'Arch Wiki', url: 'https://wiki.archlinux.org/', type: 'website', description: 'Linux系统配置指南' },
                { name: 'Linux中国', url: 'https://linux.cn/', type: 'website', description: '中文Linux社区' },
                { name: 'ELinux Wiki', url: 'https://elinux.org/', type: 'website', description: '嵌入式Linux' }
            ],
            defaultContent: `Linux与嵌入式开发：
1. Linux内核：进程管理、内存管理、文件系统、设备驱动
2. Shell编程：Bash脚本、命令行工具、管道与重定向
3. 嵌入式系统：ARM架构、交叉编译、Bootloader、根文件系统
4. 驱动开发：字符设备、块设备、网络设备、设备树
5. 系统调试：GDB、printk、strace、perf`
        },
        {
            id: 'rag_ai',
            name: 'AI知识库',
            description: '人工智能、机器学习、深度学习',
            enabled: true,
            category: 'AI',
            documents: [],
            protocol: 'rag://1.0',
            supportedTypes: ['pdf', 'doc', 'docx', 'txt', 'md', 'html', 'url'],
            vectorized: false,
            documentCount: 0,
            externalSources: [
                { name: 'arXiv AI', url: 'https://arxiv.org/list/cs.AI/recent', type: 'website', description: 'AI最新论文' },
                { name: 'Papers with Code', url: 'https://paperswithcode.com/', type: 'website', description: '论文与代码' },
                { name: 'Hugging Face', url: 'https://huggingface.co/', type: 'website', description: '模型与数据集' },
                { name: 'Distill.pub', url: 'https://distill.pub/', type: 'website', description: '可视化AI解释' }
            ],
            defaultContent: `人工智能核心知识：
1. 机器学习基础：监督学习、无监督学习、强化学习、迁移学习
2. 深度学习：神经网络、CNN、RNN、Transformer、注意力机制
3. 自然语言处理：词向量、语言模型、序列标注、机器翻译
4. 计算机视觉：图像分类、目标检测、图像分割、生成模型
5. AI伦理与安全：公平性、可解释性、隐私保护、AI安全`
        },
        {
            id: 'rag_photography',
            name: '摄影技术',
            description: '摄影技巧、后期处理、器材知识',
            enabled: true,
            category: '摄影',
            documents: [],
            protocol: 'rag://1.0',
            supportedTypes: ['pdf', 'doc', 'docx', 'txt', 'md', 'html', 'url', 'image'],
            vectorized: false,
            documentCount: 0,
            externalSources: [
                { name: 'DPReview', url: 'https://www.dpreview.com/', type: 'website', description: '相机评测' },
                { name: '500px', url: 'https://500px.com/', type: 'website', description: '摄影作品社区' },
                { name: 'Adobe Lightroom教程', url: 'https://helpx.adobe.com/lightroom/tutorials.html', type: 'website', description: '后期处理教程' }
            ],
            defaultContent: `摄影技术知识：
1. 曝光三要素：光圈、快门速度、ISO感光度
2. 构图法则：三分法、黄金分割、引导线、对称构图
3. 光线运用：自然光、人造光、逆光、侧光、柔光
4. 摄影类型：人像、风景、微距、街拍、纪实
5. 后期处理：RAW处理、色彩校正、曝光调整、锐化降噪`
        },
        {
            id: 'rag_geography',
            name: '地理知识库',
            description: '地理、地质、气候、环境',
            enabled: true,
            category: '地理',
            documents: [],
            protocol: 'rag://1.0',
            supportedTypes: ['pdf', 'doc', 'docx', 'txt', 'md', 'html', 'url'],
            vectorized: false,
            documentCount: 0,
            externalSources: [
                { name: '国家地理', url: 'https://www.nationalgeographic.com/', type: 'website', description: '地理科普' },
                { name: 'NASA Earth', url: 'https://earthobservatory.nasa.gov/', type: 'website', description: '地球观测' },
                { name: '中国气象局', url: 'http://www.cma.gov.cn/', type: 'website', description: '气象数据' }
            ],
            defaultContent: `地理科学知识：
1. 自然地理：地貌、气候、水文、土壤、生物
2. 人文地理：人口、城市、经济、文化、政治
3. 地质学：岩石、矿物、构造、地震、火山
4. 气象学：大气环流、天气系统、气候变化
5. 地图学：投影、比例尺、GIS、遥感`
        },
        {
            id: 'rag_social',
            name: '社科知识库',
            description: '社会学、心理学、政治学、历史学',
            enabled: true,
            category: '社科',
            documents: [],
            protocol: 'rag://1.0',
            supportedTypes: ['pdf', 'doc', 'docx', 'txt', 'md', 'html', 'url'],
            vectorized: false,
            documentCount: 0,
            externalSources: [
                { name: '中国社会科学网', url: 'http://www.cssn.cn/', type: 'website', description: '中国社科研究' },
                { name: 'APA心理学', url: 'https://www.apa.org/', type: 'website', description: '美国心理学会' },
                { name: 'JSTOR', url: 'https://www.jstor.org/', type: 'website', description: '学术期刊' }
            ],
            defaultContent: `社会科学知识：
1. 社会学：社会结构、社会化、社会分层、社会变迁
2. 心理学：认知、发展、社会、临床、人格心理学
3. 政治学：政治制度、国际关系、公共政策、政治思想
4. 历史学：中国历史、世界历史、史学理论、史料分析
5. 经济学：微观经济学、宏观经济学、发展经济学`
        },
        {
            id: 'rag_first_principles',
            name: '第一性原理',
            description: '第一性原理思维、本质思考、底层逻辑',
            enabled: true,
            category: '思维方法',
            documents: [],
            protocol: 'rag://1.0',
            supportedTypes: ['pdf', 'doc', 'docx', 'txt', 'md', 'html', 'url'],
            vectorized: false,
            documentCount: 0,
            externalSources: [
                { name: 'First Principles Thinking', url: 'https://fs.blog/first-principles/', type: 'website', description: '第一性原理思维' },
                { name: 'Elon Musk on First Principles', url: 'https://www.youtube.com/watch?v=NV3sBlRgzTI', type: 'video', description: '马斯克谈第一性原理' }
            ],
            defaultContent: `第一性原理思维：
1. 定义：从最基本的真理出发，通过逻辑推理得出结论，而非类比或传统思维
2. 核心步骤：
   - 识别和质疑现有假设
   - 分解问题到最基本的事实
   - 从基础事实重新构建解决方案
3. 应用场景：创新设计、问题解决、战略规划
4. 经典案例：
   - SpaceX降低火箭成本
   - Tesla电池成本优化
   - 亚马逊的飞轮效应
5. 与类比思维的区别：从"是什么"出发，而非"像什么"
6. 实践方法：苏格拉底式提问、5Why分析法、系统思维`
        },
        {
            id: 'rag_iceberg_model',
            name: '冰山模型',
            description: '冰山模型、深层结构、系统思考',
            enabled: true,
            category: '思维方法',
            documents: [],
            protocol: 'rag://1.0',
            supportedTypes: ['pdf', 'doc', 'docx', 'txt', 'md', 'html', 'url'],
            vectorized: false,
            documentCount: 0,
            externalSources: [
                { name: 'Iceberg Model Systems Thinking', url: 'https://thesystemsthinker.com/', type: 'website', description: '系统思考冰山模型' },
                { name: 'MIT Sloan Systems Thinking', url: 'https://sloanreview.mit.edu/topic/systems-thinking/', type: 'website', description: 'MIT系统思考' }
            ],
            defaultContent: `冰山模型与系统思考：
1. 冰山模型层次：
   - 事件层（水面之上10%）：可见的问题和症状
   - 模式层（水面之下）：重复出现的行为模式
   - 结构层（深层）：系统结构和关系
   - 心智模型层（最深层）：信念、假设、价值观
2. 应用框架：
   - 事件反应：应对当下问题
   - 趋势预测：识别模式趋势
   - 系统设计：改变结构
   - 心智转变：改变思维方式
3. 杠杆点：在深层结构层面干预，产生系统性改变
4. 与第一性原理结合：透过表象看本质，找到根本原因
5. 实践工具：因果回路图、系统基模、存量流量图`
        },
        {
            id: 'rag_psychology',
            name: '心理学知识库',
            description: '人类心理学、认知心理学、社会心理学、临床心理学',
            enabled: true,
            category: '心理学',
            documents: [],
            protocol: 'rag://1.0',
            supportedTypes: ['pdf', 'doc', 'docx', 'txt', 'md', 'html', 'url'],
            vectorized: false,
            documentCount: 0,
            externalSources: [
                { name: 'APA心理学', url: 'https://www.apa.org/', type: 'website', description: '美国心理学会' },
                { name: 'Psychology Today', url: 'https://www.psychologytoday.com/', type: 'website', description: '心理学今日' },
                { name: 'Verywell Mind', url: 'https://www.verywellmind.com/', type: 'website', description: '心理健康资源' }
            ],
            defaultContent: `心理学知识体系：
1. 认知心理学：
   - 感知、注意、记忆、学习、思维
   - 认知偏差：确认偏误、锚定效应、可得性启发
   - 决策心理学：前景理论、损失厌恶
2. 社会心理学：
   - 态度、从众、服从、群体行为
   - 人际关系、沟通、冲突解决
   - 社会影响：说服、态度改变
3. 发展心理学：
   - 皮亚杰认知发展阶段
   - 埃里克森心理社会发展
   - 毕生发展：童年、青少年、成年、老年
4. 人格心理学：
   - 大五人格模型
   - MBTI类型理论
   - 依恋理论
5. 临床心理学：
   - 心理障碍分类
   - 认知行为疗法
   - 正念与冥想`
        },
        {
            id: 'rag_neuroscience',
            name: '脑科学与神经科学',
            description: '脑科学、神经科学、认知神经科学',
            enabled: true,
            category: '科学',
            documents: [],
            protocol: 'rag://1.0',
            supportedTypes: ['pdf', 'doc', 'docx', 'txt', 'md', 'html', 'url'],
            vectorized: false,
            documentCount: 0,
            externalSources: [
                { name: 'Neuroscience News', url: 'https://neurosciencenews.com/', type: 'website', description: '神经科学新闻' },
                { name: 'BrainFacts', url: 'https://www.brainfacts.org/', type: 'website', description: '大脑科学科普' },
                { name: 'Nature Neuroscience', url: 'https://www.nature.com/neuro/', type: 'website', description: '自然神经科学' }
            ],
            defaultContent: `脑科学与神经科学知识：
1. 大脑结构：
   - 大脑皮层：额叶、顶叶、颞叶、枕叶
   - 边缘系统：海马体、杏仁核、下丘脑
   - 脑干和小脑
2. 神经元与神经递质：
   - 神经元结构：树突、轴突、突触
   - 神经递质：多巴胺、血清素、去甲肾上腺素、GABA
   - 神经可塑性：突触可塑性、神经发生
3. 认知神经科学：
   - 注意力网络
   - 工作记忆系统
   - 语言处理：布洛卡区、韦尼克区
   - 情绪调节：前额叶-杏仁核连接
4. 脑成像技术：
   - fMRI功能磁共振
   - EEG脑电图
   - PET正电子发射断层扫描
5. 应用：
   - 学习与记忆优化
   - 情绪管理
   - 决策与风险评估`
        },
        {
            id: 'rag_logic',
            name: '逻辑学知识库',
            description: '形式逻辑、非形式逻辑、批判性思维、逻辑谬误',
            enabled: true,
            category: '逻辑学',
            documents: [],
            protocol: 'rag://1.0',
            supportedTypes: ['pdf', 'doc', 'docx', 'txt', 'md', 'html', 'url'],
            vectorized: false,
            documentCount: 0,
            externalSources: [
                { name: 'Stanford Encyclopedia of Philosophy - Logic', url: 'https://plato.stanford.edu/entries/logic/', type: 'website', description: '斯坦福哲学百科全书-逻辑学' }
            ],
            defaultContent: `逻辑学知识体系：
1. 形式逻辑：
   - 命题逻辑：命题、联结词、真值表、推理规则
   - 谓词逻辑：量词、谓词、关系、论证有效性
   - 演绎推理：三段论、假言推理、选言推理
   - 归纳推理：完全归纳、不完全归纳、统计推理
2. 非形式逻辑：
   - 论证结构：前提、结论、隐含假设
   - 论证评估：相关性、充分性、可接受性
   - 论证类型：类比论证、因果论证、权威论证
3. 逻辑谬误：
   - 形式谬误：肯定后件、否定前件、四词项错误
   - 非形式谬误：人身攻击、诉诸情感、稻草人、滑坡谬误
   - 认知偏差：确认偏误、锚定效应、幸存者偏差
4. 批判性思维：
   - 问题识别：明确问题、界定范围
   - 信息评估：来源可靠性、证据充分性
   - 推理分析：逻辑有效性、假设检验
   - 决策制定：方案比较、风险评估`
        },
        {
            id: 'rag_temporal_logic',
            name: '时间逻辑知识库',
            description: '时间逻辑、时序推理、因果关系、趋势分析',
            enabled: true,
            category: '时间逻辑',
            documents: [],
            protocol: 'rag://1.0',
            supportedTypes: ['pdf', 'doc', 'docx', 'txt', 'md', 'html', 'url'],
            vectorized: false,
            documentCount: 0,
            externalSources: [],
            defaultContent: `时间逻辑与推理知识体系：
1. 时间逻辑基础：
   - 时间维度：过去、现在、未来的关系
   - 时态逻辑：必然、可能、始终、最终
   - 时间顺序：先后关系、同时性、持续时间
2. 时序推理：
   - 因果时序：原因先于结果、因果链分析
   - 趋势推断：线性趋势、周期性、拐点识别
   - 预测方法：外推法、回归分析、时间序列
3. 因果关系：
   - 因果类型：充分原因、必要原因、充分必要条件
   - 因果推断：穆勒五法、实验设计、反事实分析
   - 因果谬误：后此谬误、混淆因果、共同原因
4. 时间价值：
   - 机会成本：时间的机会成本、沉没成本
   - 时间偏好：折现率、延迟满足、即时满足
   - 时机选择：最佳时机、窗口期、临界点`
        },
        {
            id: 'rag_common_sense',
            name: '常识知识库',
            description: '日常常识、社会常识、科学常识、文化常识',
            enabled: true,
            category: '常识',
            documents: [],
            protocol: 'rag://1.0',
            supportedTypes: ['pdf', 'doc', 'docx', 'txt', 'md', 'html', 'url'],
            vectorized: false,
            documentCount: 0,
            externalSources: [],
            defaultContent: `常识知识体系：
1. 日常常识：
   - 生活常识：健康、饮食、安全、理财
   - 社交常识：礼仪、沟通、合作、冲突处理
   - 职场常识：职业道德、团队协作、时间管理
2. 社会常识：
   - 社会结构：家庭、组织、社区、国家
   - 社会规范：法律、道德、习俗、文化
   - 社会变迁：技术发展、人口变化、环境变化
3. 科学常识：
   - 自然科学：物理、化学、生物、地理基础
   - 数学常识：数量关系、概率统计、逻辑推理
   - 技术常识：信息技术、工程技术、医疗技术
4. 文化常识：
   - 历史文化：中外历史、文化传统、文化遗产
   - 艺术常识：文学、音乐、美术、戏剧
   - 哲学思想：东西方哲学、伦理道德、价值观`
        },
        {
            id: 'rag_history',
            name: '历史知识库',
            description: '中国历史、世界历史、历史规律、历史案例',
            enabled: true,
            category: '历史',
            documents: [],
            protocol: 'rag://1.0',
            supportedTypes: ['pdf', 'doc', 'docx', 'txt', 'md', 'html', 'url'],
            vectorized: false,
            documentCount: 0,
            externalSources: [],
            defaultContent: `历史知识体系：
1. 中国历史：
   - 古代史：夏商周、秦汉、三国两晋南北朝、隋唐、宋元明清
   - 近代史：鸦片战争、洋务运动、辛亥革命、抗日战争、新中国成立
   - 现代史：改革开放、经济发展、科技进步
   - 历史规律：王朝周期、治乱循环、变革动力
2. 世界历史：
   - 古代文明：古埃及、古希腊、古罗马、古印度
   - 中世纪：欧洲封建、伊斯兰文明、蒙古帝国
   - 近现代：文艺复兴、工业革命、两次世界大战、冷战
   - 当代：全球化、信息化、多极化
3. 历史规律：
   - 周期律：经济周期、政治周期、技术周期
   - 因果关系：历史事件的因果链
   - 类比推理：历史案例的借鉴意义
   - 趋势分析：历史发展趋势
4. 历史案例库：
   - 成功案例：改革成功、创新突破、危机处理
   - 失败教训：决策失误、战略错误、执行失败
   - 经典决策：历史名臣的决策智慧`
        }
    ];

    // ==================== 内置Sub Agents ====================
    const BUILTIN_SUB_AGENTS = {
        general: {
            id: 'general',
            name: '通用助手',
            description: '全能型助手，适合日常对话和通用任务',
            icon: 'fa-user',
            systemPrompt: `你是一位全能型AI助手，可以帮助用户解决各种问题。

【核心能力框架】

一、逻辑严密性（基于逻辑学知识库）
1. 形式逻辑验证：
   - 检查论证的有效性（演绎推理）
   - 评估归纳推理的可靠性
   - 识别逻辑谬误
2. 论证结构分析：
   - 明确前提和结论
   - 识别隐含假设
   - 评估证据充分性

二、脑科学辅助（基于脑科学知识库）
1. 认知负荷管理：
   - 信息分块呈现
   - 避免认知过载
   - 使用记忆辅助技巧
2. 注意力引导：
   - 重点突出
   - 结构化呈现
   - 视觉层次清晰

三、输出规范
1. 专业、准确、有用的回答
2. 友好、耐心的态度
3. 清晰简洁的语言表达
4. 默认输出格式为Markdown

请根据用户的需求，提供高质量的回复。`,
            capabilities: ['日常对话', '问答咨询', '通用建议', '信息查询', '逻辑分析', '认知优化'],
            modelPreference: ['auto', 'deepseek-chat', 'glm-4-flash'],
            skills: ['skill_writer', 'skill_translator', 'skill_summarizer'],
            rules: ['rule_format', 'rule_tone', 'rule_safety', 'rule_multimodal'],
            mcp: ['mcp_web_search'],
            rag: ['rag_general', 'rag_logic', 'rag_neuroscience'],
            color: '#3b82f6'
        },
        creative: {
            id: 'creative',
            name: '创意大师',
            description: '擅长创意写作、头脑风暴和内容创作',
            icon: 'fa-palette',
            systemPrompt: `你是一位创意大师，擅长创意写作、头脑风暴和内容创作。

【核心能力框架】

一、创意思维方法（基于脑科学知识库）
1. 联想思维：
   - 跨领域联想
   - 类比推理
   - 隐喻创造
2. 发散思维：
   - 多角度思考
   - 逆向思维
   - 组合创新
3. 收敛思维：
   - 筛选最佳方案
   - 优化整合
   - 精炼表达

二、逻辑严密性（基于逻辑学知识库）
1. 创意与逻辑的平衡：
   - 创意需要逻辑支撑
   - 避免逻辑矛盾
   - 确保内在一致性
2. 论证结构：
   - 创意观点的合理性
   - 情感与理性的结合
   - 说服力的构建

三、创作能力
1. 创意文章撰写
2. 故事创作与叙事
3. 诗歌与文学表达
4. 头脑风暴与想法生成
5. 文案优化与提升

四、输出规范
1. 发挥想象力，给出独特创意
2. 保持逻辑自洽
3. 考虑受众认知特点
4. 提供多种方案供选择`,
            capabilities: ['创意写作', '头脑风暴', '文案优化', '故事创作', '诗歌创作', '联想思维', '发散思维'],
            modelPreference: ['deepseek-reasoner', 'glm-4-plus', 'gpt-4o'],
            skills: ['skill_writer', 'skill_brainstorm', 'skill_designer'],
            rules: ['rule_format', 'rule_tone', 'rule_examples', 'rule_multimodal'],
            mcp: ['mcp_web_search'],
            rag: ['rag_literature', 'rag_logic', 'rag_neuroscience'],
            color: '#8b5cf6'
        },
        code: {
            id: 'code',
            name: '编程专家',
            description: '代码审查、调试、优化和技术咨询',
            icon: 'fa-code',
            systemPrompt: `你是一位资深编程专家，精通多种编程语言和技术栈。

【核心能力框架】

一、逻辑思维（基于逻辑学知识库）
1. 代码逻辑验证：
   - 条件逻辑正确性
   - 循环不变式检查
   - 边界条件分析
2. 算法逻辑：
   - 正确性证明思路
   - 复杂度分析
   - 最优性论证
3. 系统设计逻辑：
   - 架构合理性
   - 模块依赖关系
   - 接口契约

二、认知优化（基于脑科学知识库）
1. 代码可读性：
   - 命名规范
   - 代码组织
   - 注释策略
2. 认知负荷管理：
   - 函数复杂度控制
   - 抽象层次清晰
   - 避免魔法数字

三、技术能力
1. 代码审查与问题发现
2. 调试与错误排查
3. 性能分析与优化
4. 算法设计与实现
5. 技术方案咨询

四、输出规范
1. 给出具体、可执行的代码示例
2. 提供详细的技术解释
3. 遵循最佳实践
4. 考虑可维护性和扩展性`,
            capabilities: ['代码审查', '调试排错', '性能优化', '技术咨询', '算法设计', '逻辑验证', '代码可读性'],
            modelPreference: ['deepseek-reasoner', 'gpt-4o', 'claude-3-sonnet'],
            skills: ['skill_coder', 'skill_analyst'],
            rules: ['rule_format', 'rule_accuracy', 'rule_examples', 'rule_structure'],
            mcp: ['mcp_web_search', 'mcp_filesystem'],
            rag: ['rag_linux', 'rag_ai', 'rag_logic', 'rag_neuroscience'],
            color: '#10b981'
        },
        task: {
            id: 'task',
            name: '任务助手',
            description: '任务管理、待办事项、进度跟踪',
            icon: 'fa-tasks',
            systemPrompt: `你是一位任务管理专家，擅长帮助用户管理任务、制定计划、跟踪进度。

【核心能力框架】

一、逻辑思维（基于逻辑学知识库）
1. 任务分解逻辑：
   - MECE原则（相互独立，完全穷尽）
   - 依赖关系分析
   - 前置条件识别
2. 优先级逻辑：
   - 紧急重要矩阵
   - 价值与成本权衡
   - 风险与收益分析

二、认知优化（基于脑科学知识库）
1. 注意力管理：
   - 单任务专注
   - 避免上下文切换
   - 番茄工作法
2. 记忆辅助：
   - 清单化
   - 可视化进度
   - 定期回顾

三、任务管理能力
1. 复杂任务分解
2. 优先级设置
3. 时间安排
4. 进度跟踪
5. 执行建议

四、输出规范
1. 清晰的任务结构
2. 可执行的步骤
3. 合理的优先级
4. 可视化的进度追踪`,
            capabilities: ['任务管理', '待办事项', '进度跟踪', '优先级排序', 'MECE分解', '时间管理'],
            modelPreference: ['deepseek-chat', 'glm-4-flash'],
            skills: ['skill_planner', 'skill_writer'],
            rules: ['rule_format', 'rule_structure'],
            mcp: ['mcp_web_search'],
            rag: ['rag_logic', 'rag_neuroscience'],
            color: '#f59e0b'
        },
        plan: {
            id: 'plan',
            name: '计划大师',
            description: '项目规划、时间管理、目标设定',
            icon: 'fa-calendar-alt',
            systemPrompt: `你是一位计划制定专家，擅长项目规划、时间管理和目标设定。

【核心能力框架】

一、逻辑思维（基于逻辑学知识库）
1. 目标分解逻辑：
   - 金字塔原理（目标→策略→行动）
   - 因果关系链
   - 必要与充分条件
2. 计划验证：
   - 可行性分析
   - 资源约束检查
   - 风险评估逻辑

二、认知优化（基于脑科学知识库）
1. SMART目标设定：
   - Specific（具体）
   - Measurable（可衡量）
   - Achievable（可实现）
   - Relevant（相关）
   - Time-bound（有时限）
2. 执行心理：
   - 启动效应
   - 习惯养成
   - 正向反馈

三、计划能力
1. 项目规划
2. 时间管理
3. 目标设定
4. 里程碑安排
5. TODO生成与跟踪
6. 执行策略制定

四、输出规范
1. 详细可行的计划
2. SMART目标
3. 清晰的里程碑
4. 可执行的行动步骤
5. 可视化的进度追踪`,
            capabilities: ['项目规划', '时间管理', '目标设定', '里程碑安排', 'TODO生成', '金字塔原理', 'SMART目标'],
            modelPreference: ['deepseek-chat', 'glm-4-plus'],
            skills: ['skill_planner', 'skill_writer'],
            rules: ['rule_format', 'rule_structure'],
            mcp: ['mcp_web_search'],
            rag: ['rag_logic', 'rag_neuroscience'],
            color: '#ec4899'
        },
        super_decision: {
            id: 'super_decision',
            name: '超级决策',
            description: '深度决策分析、认知偏差识别、风险评估、决策矩阵渲染、Mermaid可视化',
            icon: 'fa-chess-king',
            systemPrompt: `你是超级决策专家，深度融合决策分析与认知心理学，帮助用户做出更精准、更完备的决策。

【核心能力框架】

一、认知层分析（深度结合认知分析）
1. 认知偏差识别与纠正：
   - 确认偏误：检查是否只寻找支持证据
   - 锚定效应：评估初始信息对判断的影响
   - 可得性启发：判断信息是否被过度放大
   - 损失厌恶：分析风险偏好的合理性
   - 群体思维：检查从众心理的影响

2. 思维模式诊断：
   - 系统1（快思考）vs 系统2（慢思考）
   - 直觉vs理性分析
   - 心智模型识别

3. 决策质量评估：
   - 信息充分性检查
   - 逻辑一致性验证
   - 情绪干扰识别

二、决策层分析
1. 决策矩阵：多维度评估不同方案
   - 使用 decision-matrix JSON格式 代码块展示

2. 决策链：展示决策流程和关键节点
   - 使用 decision-chain JSON格式 代码块展示

3. 概率分布：评估风险和不确定性
   - 使用 probability JSON格式 代码块展示

4. Mermaid流程图：可视化决策流程
   - 使用 mermaid 代码块展示

三、分析方法论
1. 第一性原理：从本质思考问题，打破传统假设
2. 冰山模型：系统思考深层原因（事件→模式→结构→心智模型）
3. SWOT分析：评估优势劣势机会威胁
4. 成本效益分析：量化决策影响
5. 前景理论：理解损失厌恶和风险偏好

四、逻辑严密性（基于逻辑学知识库）
1. 形式逻辑验证：
   - 检查论证的有效性（演绎推理）
   - 评估归纳推理的可靠性
   - 识别逻辑谬误（人身攻击、稻草人、滑坡谬误等）
2. 论证结构分析：
   - 明确前提和结论
   - 识别隐含假设
   - 评估证据充分性

五、时间逻辑（基于时间逻辑知识库）
1. 因果时序分析：
   - 确保原因先于结果
   - 分析因果链的完整性
   - 避免后此谬误（post hoc）
2. 趋势与预测：
   - 识别历史趋势
   - 评估预测合理性
   - 考虑时间窗口和时机

六、常识验证（基于常识知识库）
1. 日常常识检查：
   - 生活常识合理性
   - 社会规范符合度
   - 科学常识准确性
2. 现实可行性：
   - 方案的可操作性
   - 资源约束考虑
   - 风险现实性评估

七、历史借鉴（基于历史知识库）
1. 历史案例分析：
   - 寻找相似历史情境
   - 分析历史决策结果
   - 提取可借鉴的经验教训
2. 历史规律应用：
   - 周期律分析
   - 因果关系借鉴
   - 趋势类比推理

八、输出规范
1. 【逻辑验证】论证有效性检查
2. 【时序分析】因果关系和时间合理性
3. 【常识检查】方案的现实可行性
4. 【历史借鉴】相关历史案例和经验
5. 【认知偏差】可能的认知陷阱提醒
6. 【最终建议】综合以上分析的决策建议

请确保决策建议既科学严谨，又充分考虑人的认知特点，帮助用户做出最优决策。`,
            capabilities: ['超级决策', '认知偏差识别', '思维模式分析', '风险评估', '方案对比', '决策矩阵', '决策链', '概率分析', 'Mermaid可视化', '第一性原理', '系统思考', '前景理论', '数据分析', '建议生成'],
            modelPreference: ['deepseek-reasoner', 'glm-4-plus', 'gpt-4o'],
            skills: ['skill_analyst', 'skill_researcher', 'skill_planner', 'skill_swot', 'skill_decision_expert', 'skill_first_principles', 'skill_iceberg_model', 'skill_mermaid_visualization', 'skill_cognitive_psychology', 'skill_pyramid_method', 'skill_mece', 'skill_data_cleaning', 'skill_advanced_analytics'],
            rules: ['rule_format', 'rule_accuracy', 'rule_examples', 'rule_structure'],
            mcp: ['mcp_web_search', 'mcp_calculator'],
            rag: ['rag_finance', 'rag_social', 'rag_first_principles', 'rag_iceberg_model', 'rag_psychology', 'rag_neuroscience', 'rag_logic', 'rag_temporal_logic', 'rag_common_sense', 'rag_history'],
            color: '#8b5cf6'
        },
        cognitive: {
            id: 'cognitive',
            name: '认知分析',
            description: '认知偏差识别、思维模式分析、决策优化、心理学应用',
            icon: 'fa-brain',
            systemPrompt: `你是一位认知分析专家，擅长识别认知偏差、分析思维模式、优化决策过程。

核心能力：
1. 认知偏差识别：
   - 确认偏误、锚定效应、可得性启发
   - 损失厌恶、禀赋效应、幸存者偏差
   - 群体思维、权威服从、从众心理

2. 思维模式分析：
   - 快思考vs慢思考（系统1vs系统2）
   - 直觉vs理性决策
   - 心智模型识别

3. 决策优化：
   - 前景理论应用
   - 概率思维训练
   - 反事实思考

4. 心理学应用：
   - 认知心理学原理
   - 脑科学insights
   - 行为经济学

5. 可视化分析：
   - 使用Mermaid创建思维导图
   - 决策流程图
   - 认知模型图

请帮助用户了解自己的思维模式，识别认知陷阱，做出更理性的决策。`,
            capabilities: ['认知偏差识别', '思维模式分析', '决策优化', '心理学应用', '脑科学insights', 'Mermaid可视化', '行为经济学', '建议生成'],
            modelPreference: ['deepseek-reasoner', 'glm-4-plus', 'gpt-4o'],
            skills: ['skill_cognitive_psychology', 'skill_first_principles', 'skill_iceberg_model', 'skill_mermaid_visualization', 'skill_analyst', 'skill_researcher'],
            rules: ['rule_format', 'rule_accuracy', 'rule_examples', 'rule_structure'],
            mcp: ['mcp_web_search', 'mcp_calculator'],
            rag: ['rag_psychology', 'rag_neuroscience', 'rag_first_principles', 'rag_iceberg_model', 'rag_social'],
            color: '#14b8a6'
        }
    };

    // ==================== 应用状态 ====================
    const AppState = {
        version: VERSION,
        currentChatId: null,
        currentMode: 'chat',
        currentModel: 'auto',
        currentSubAgent: 'general',
        currentOutputFormat: 'markdown',
        messages: [],
        attachments: [],
        isRecording: false,
        recognition: null,
        user: null,
        chats: [],
        plans: [],
        tasks: [],
        todos: [],
        models: {},
        settings: {
            theme: 'dark',
            language: 'zh',
            autoVoice: false,
            sendShortcut: 'enter',
            webSearchEnabled: true,
            autoSave: true,
            fontSize: 'medium',
            showThinking: true,
            defaultOutputFormat: 'markdown',
            enableMultimodalInput: true,
            enableMultimodalOutput: true
        },
        resources: {
            rag: [],
            skills: [],
            mcp: [],
            rules: []
        },
        subAgents: {},
        customSubAgents: {},
        syncConfig: {
            serverUrl: '',
            apiKey: '',
            interval: 30,
            enabled: false,
            lastSync: null
        },
        ragVectors: {}
    };

    // ==================== 初始化 ====================
    function init() {
        updateSplashProgress(10, '正在加载模型...');
        initModels();
        
        updateSplashProgress(30, '正在加载资源...');
        initResources();
        
        updateSplashProgress(50, '正在加载助手...');
        initSubAgents();
        
        updateSplashProgress(70, '正在恢复状态...');
        loadState();
        
        updateSplashProgress(85, '正在加载配置...');
        loadSyncConfig();
        loadRagVectors();
        
        updateSplashProgress(100, '加载完成');
        
        // 延迟隐藏启动页 - 确保动画持续2-3秒
        setTimeout(() => {
            hideSplash();
        }, 2500);
    }
    
    // 更新启动页进度
    function updateSplashProgress(percent, text) {
        const loadingBar = document.getElementById('splash-loading-bar');
        const loadingText = document.getElementById('splash-loading-text');
        if (loadingBar) {
            loadingBar.style.width = percent + '%';
        }
        if (loadingText) {
            loadingText.textContent = text;
        }
    }
    
    // 隐藏启动页
    function hideSplash() {
        const splash = document.getElementById('splash');
        if (splash) {
            splash.classList.add('hidden');
            setTimeout(() => {
                splash.style.display = 'none';
            }, 500);
        }
    }

    function initModels() {
        AppState.models = JSON.parse(JSON.stringify(BUILTIN_MODELS));
        const saved = localStorage.getItem(CUSTOM_MODELS_KEY);
        if (saved) {
            try {
                const customModels = JSON.parse(saved);
                Object.assign(AppState.models, customModels);
            } catch (e) {
                console.error('加载自定义模型失败:', e);
            }
        }
    }

    function initResources() {
        AppState.resources.rag = JSON.parse(JSON.stringify(BUILTIN_RAG));
        AppState.resources.skills = JSON.parse(JSON.stringify(BUILTIN_SKILLS));
        AppState.resources.mcp = JSON.parse(JSON.stringify(BUILTIN_MCP));
        AppState.resources.rules = JSON.parse(JSON.stringify(BUILTIN_RULES));
    }

    function initSubAgents() {
        AppState.subAgents = JSON.parse(JSON.stringify(BUILTIN_SUB_AGENTS));
        const saved = localStorage.getItem(CUSTOM_SUBAGENTS_KEY);
        if (saved) {
            try {
                AppState.customSubAgents = JSON.parse(saved);
                Object.assign(AppState.subAgents, AppState.customSubAgents);
            } catch (e) {
                console.error('加载自定义Sub Agent失败:', e);
            }
        }
    }

    function loadState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const state = JSON.parse(saved);
                if (state.chats) AppState.chats = state.chats;
                if (state.plans) AppState.plans = state.plans;
                if (state.tasks) AppState.tasks = state.tasks;
                if (state.todos) AppState.todos = state.todos;
                if (state.currentChatId) AppState.currentChatId = state.currentChatId;
                if (state.currentMode) AppState.currentMode = state.currentMode;
                if (state.currentModel) AppState.currentModel = state.currentModel;
                if (state.currentSubAgent) AppState.currentSubAgent = state.currentSubAgent;
                if (state.currentOutputFormat) AppState.currentOutputFormat = state.currentOutputFormat;
                if (state.settings) AppState.settings = { ...AppState.settings, ...state.settings };
                if (state.user) AppState.user = state.user;
            }
        } catch (error) {
            console.error('加载状态失败:', error);
        }
    }

    function saveState() {
        try {
            const state = {
                chats: AppState.chats,
                plans: AppState.plans,
                tasks: AppState.tasks,
                todos: AppState.todos,
                currentChatId: AppState.currentChatId,
                currentMode: AppState.currentMode,
                currentModel: AppState.currentModel,
                currentSubAgent: AppState.currentSubAgent,
                currentOutputFormat: AppState.currentOutputFormat,
                settings: AppState.settings,
                user: AppState.user,
                savedAt: Date.now(),
                version: AppState.version
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            console.error('保存状态失败:', error);
            // 如果存储失败，尝试清理旧数据
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    const oldState = JSON.parse(saved);
                    // 只保存必要的数据
                    const minimalState = {
                        chats: oldState.chats || [],
                        currentChatId: oldState.currentChatId,
                        settings: oldState.settings || AppState.settings,
                        savedAt: Date.now(),
                        version: AppState.version
                    };
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(minimalState));
                }
            } catch (retryError) {
                console.error('重试保存失败:', retryError);
            }
        }
    }

    function loadSyncConfig() {
        try {
            const saved = localStorage.getItem(SYNC_CONFIG_KEY);
            if (saved) {
                AppState.syncConfig = { ...AppState.syncConfig, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.error('加载同步配置失败:', e);
        }
    }

    function saveSyncConfig() {
        try {
            localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(AppState.syncConfig));
        } catch (e) {
            console.error('保存同步配置失败:', e);
        }
    }

    function loadRagVectors() {
        try {
            const saved = localStorage.getItem(RAG_VECTORS_KEY);
            if (saved) {
                AppState.ragVectors = JSON.parse(saved);
            }
        } catch (e) {
            console.error('加载RAG向量失败:', e);
        }
    }

    function saveRagVectors() {
        try {
            localStorage.setItem(RAG_VECTORS_KEY, JSON.stringify(AppState.ragVectors));
        } catch (e) {
            console.error('保存RAG向量失败:', e);
        }
    }

    // ==================== 模型管理 ====================
    function saveCustomModels() {
        const customModels = {};
        Object.keys(AppState.models).forEach(id => {
            if (!AppState.models[id].isBuiltin) {
                customModels[id] = AppState.models[id];
            }
        });
        localStorage.setItem(CUSTOM_MODELS_KEY, JSON.stringify(customModels));
    }

    function addCustomModel(modelConfig) {
        const id = 'custom_' + Date.now();
        AppState.models[id] = {
            ...modelConfig,
            id: id,
            isBuiltin: false
        };
        saveCustomModels();
        return id;
    }

    function deleteCustomModel(modelId) {
        if (AppState.models[modelId] && !AppState.models[modelId].isBuiltin) {
            delete AppState.models[modelId];
            saveCustomModels();
            return true;
        }
        return false;
    }

    function setAPIKey(modelId, apiKey) {
        if (AppState.models[modelId]) {
            AppState.models[modelId].apiKey = apiKey;
            if (!AppState.models[modelId].isBuiltin) {
                saveCustomModels();
            }
            return true;
        }
        return false;
    }

    function getAPIKey(modelId) {
        return AppState.models[modelId]?.apiKey || '';
    }

    function hasValidAPIKey(modelId) {
        const model = AppState.models[modelId];
        if (!model) return false;
        if (modelId === 'auto') return true;
        return !!(model.apiKey && model.apiKey.trim().length > 0);
    }

    // ==================== 智能调用引擎 ====================
    function getCurrentSubAgent() {
        return AppState.subAgents[AppState.currentSubAgent] || AppState.subAgents.general;
    }

    function getCurrentModel() {
        return AppState.models[AppState.currentModel] || AppState.models.auto;
    }

    function autoSelectModel(messages, taskType = 'general') {
        const lastMessage = messages[messages.length - 1];
        if (!lastMessage) return 'deepseek-chat';
        
        const content = lastMessage.content.toLowerCase();
        const subAgent = getCurrentSubAgent();
        
        // 优先使用Sub Agent偏好的模型
        if (subAgent.modelPreference) {
            for (const modelId of subAgent.modelPreference) {
                if (modelId === 'auto') continue;
                if (hasValidAPIKey(modelId)) return modelId;
            }
        }
        
        // 根据任务类型选择
        if (taskType === 'code' || content.includes('代码') || content.includes('编程') || content.includes('bug')) {
            if (hasValidAPIKey('deepseek-reasoner')) return 'deepseek-reasoner';
        }
        
        if (taskType === 'creative' || content.includes('创意') || content.includes('写作')) {
            if (hasValidAPIKey('glm-4-plus')) return 'glm-4-plus';
        }
        
        if (taskType === 'analysis' || content.includes('分析') || content.includes('决策')) {
            if (hasValidAPIKey('deepseek-reasoner')) return 'deepseek-reasoner';
        }
        
        // 默认
        if (hasValidAPIKey('deepseek-chat')) return 'deepseek-chat';
        if (hasValidAPIKey('glm-4-flash')) return 'glm-4-flash';
        
        // 返回第一个有API Key的模型
        for (const [id, model] of Object.entries(AppState.models)) {
            if (id !== 'auto' && hasValidAPIKey(id)) return id;
        }
        
        return 'deepseek-chat';
    }

    // 智能选择输出格式
    function autoSelectOutputFormat(content, requestType) {
        if (requestType === 'table' || content.includes('表格') || content.includes('数据')) {
            return 'spreadsheet';
        }
        if (requestType === 'presentation' || content.includes('PPT') || content.includes('演示')) {
            return 'ppt';
        }
        if (requestType === 'document' || content.includes('PDF') || content.includes('文档')) {
            return 'pdf';
        }
        if (requestType === 'web' || content.includes('网页') || content.includes('H5')) {
            return 'h5';
        }
        if (requestType === 'image' || content.includes('图片') || content.includes('图像')) {
            return 'image';
        }
        return 'markdown';
    }

    // 获取启用的资源
    function getEnabledResources() {
        return {
            rag: AppState.resources.rag.filter(r => r.enabled),
            skills: AppState.resources.skills.filter(s => s.enabled),
            mcp: AppState.resources.mcp.filter(m => m.enabled),
            rules: AppState.resources.rules.filter(r => r.enabled)
        };
    }

    // 获取Sub Agent引用的资源
    function getSubAgentResources(subAgentId) {
        const subAgent = AppState.subAgents[subAgentId];
        if (!subAgent) return null;
        
        return {
            skills: AppState.resources.skills.filter(s => subAgent.skills?.includes(s.id) && s.enabled),
            rules: AppState.resources.rules.filter(r => subAgent.rules?.includes(r.id) && r.enabled),
            mcp: AppState.resources.mcp.filter(m => subAgent.mcp?.includes(m.id) && m.enabled),
            rag: AppState.resources.rag.filter(r => subAgent.rag?.includes(r.id) && r.enabled)
        };
    }

    // 构建系统提示词
    function buildSystemPrompt() {
        const subAgent = getCurrentSubAgent();
        const resources = getSubAgentResources(subAgent.id);
        
        let prompt = `你是「${subAgent.name}」，${subAgent.description}\n\n`;
        prompt += subAgent.systemPrompt + '\n\n';
        
        // 添加Rules（按优先级排序）
        if (resources.rules && resources.rules.length > 0) {
            const sortedRules = [...resources.rules].sort((a, b) => (a.priority || 0) - (b.priority || 0));
            prompt += '【规则】\n';
            sortedRules.forEach(rule => {
                prompt += `- ${rule.content}\n`;
            });
            prompt += '\n';
        }
        
        // 添加Skills
        if (resources.skills && resources.skills.length > 0) {
            prompt += '【技能】\n';
            resources.skills.forEach(skill => {
                if (skill.prompt) {
                    prompt += `- ${skill.name}: ${skill.prompt}\n`;
                }
            });
            prompt += '\n';
        }
        
        // 添加RAG
        if (resources.rag && resources.rag.length > 0) {
            prompt += '【知识库】\n';
            resources.rag.forEach(rag => {
                prompt += `- ${rag.name}: ${rag.description}\n`;
            });
            prompt += '\n';
        }
        
        // 添加MCP
        if (resources.mcp && resources.mcp.length > 0) {
            prompt += '【可用工具】\n';
            resources.mcp.forEach(mcp => {
                prompt += `- ${mcp.name}: ${mcp.description}\n`;
            });
            prompt += '\n';
        }
        
        // 输出格式要求
        prompt += '【输出格式】\n';
        prompt += '默认使用Markdown格式输出。支持代码块、表格、列表等Markdown语法。\n';
        prompt += '代码块必须标注语言类型，如 ```python、```javascript 等。\n';
        
        return prompt;
    }

    // ==================== Sub Agent管理 ====================
    function addCustomSubAgent(config) {
        const id = 'custom_agent_' + Date.now();
        AppState.customSubAgents[id] = {
            ...config,
            id: id,
            isCustom: true,
            icon: config.icon || 'fa-robot',
            color: config.color || '#3b82f6'
        };
        AppState.subAgents[id] = AppState.customSubAgents[id];
        localStorage.setItem(CUSTOM_SUBAGENTS_KEY, JSON.stringify(AppState.customSubAgents));
        return id;
    }

    function deleteCustomSubAgent(id) {
        if (AppState.customSubAgents[id]) {
            delete AppState.customSubAgents[id];
            delete AppState.subAgents[id];
            localStorage.setItem(CUSTOM_SUBAGENTS_KEY, JSON.stringify(AppState.customSubAgents));
            return true;
        }
        return false;
    }

    function updateSubAgentResources(agentId, resources) {
        const agent = AppState.subAgents[agentId];
        if (!agent) return false;
        
        if (resources.skills) agent.skills = resources.skills;
        if (resources.rules) agent.rules = resources.rules;
        if (resources.mcp) agent.mcp = resources.mcp;
        if (resources.rag) agent.rag = resources.rag;
        
        if (agent.isCustom) {
            AppState.customSubAgents[agentId] = agent;
            localStorage.setItem(CUSTOM_SUBAGENTS_KEY, JSON.stringify(AppState.customSubAgents));
        }
        
        return true;
    }

    // ==================== RAG向量管理 ====================
    function addRagDocument(ragId, document) {
        const rag = AppState.resources.rag.find(r => r.id === ragId);
        if (!rag) return false;
        
        if (!rag.documents) rag.documents = [];
        rag.documents.push({
            ...document,
            id: 'doc_' + Date.now(),
            addedAt: Date.now(),
            vectorized: false
        });
        
        rag.documentCount = rag.documents.length;
        saveState();
        return true;
    }

    function removeRagDocument(ragId, docId) {
        const rag = AppState.resources.rag.find(r => r.id === ragId);
        if (!rag || !rag.documents) return false;
        
        rag.documents = rag.documents.filter(d => d.id !== docId);
        rag.documentCount = rag.documents.length;
        
        // 删除对应的向量
        if (AppState.ragVectors[ragId]) {
            delete AppState.ragVectors[ragId][docId];
            saveRagVectors();
        }
        
        saveState();
        return true;
    }

    function saveDocumentVectors(ragId, docId, vectors) {
        if (!AppState.ragVectors[ragId]) {
            AppState.ragVectors[ragId] = {};
        }
        AppState.ragVectors[ragId][docId] = vectors;
        saveRagVectors();
        
        // 更新文档状态
        const rag = AppState.resources.rag.find(r => r.id === ragId);
        if (rag && rag.documents) {
            const doc = rag.documents.find(d => d.id === docId);
            if (doc) {
                doc.vectorized = true;
                saveState();
            }
        }
    }

    // ==================== 数据管理 ====================
    function exportData() {
        const data = {
            version: VERSION,
            exportTime: new Date().toISOString(),
            state: {
                chats: AppState.chats,
                plans: AppState.plans,
                tasks: AppState.tasks,
                todos: AppState.todos,
                settings: AppState.settings,
                customSubAgents: AppState.customSubAgents
            }
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai_agent_backup_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        return true;
    }

    function importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.state) {
                if (data.state.chats) AppState.chats = data.state.chats;
                if (data.state.plans) AppState.plans = data.state.plans;
                if (data.state.tasks) AppState.tasks = data.state.tasks;
                if (data.state.todos) AppState.todos = data.state.todos;
                if (data.state.settings) AppState.settings = { ...AppState.settings, ...data.state.settings };
                if (data.state.customSubAgents) {
                    AppState.customSubAgents = data.state.customSubAgents;
                    Object.assign(AppState.subAgents, data.state.customSubAgents);
                    localStorage.setItem(CUSTOM_SUBAGENTS_KEY, JSON.stringify(data.state.customSubAgents));
                }
                saveState();
                return { success: true };
            }
            return { success: false, error: '数据格式错误' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ==================== 主题和语言 ====================
    function applyTheme(theme) {
        AppState.settings.theme = theme;
        const body = document.body;
        body.classList.remove('theme-dark', 'theme-light');
        
        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            body.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
        } else {
            body.classList.add(`theme-${theme}`);
        }
        
        // 更新主题选项UI
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.toggle('active', option.dataset.theme === theme);
        });
        
        debouncedSave();
    }

    function applyLanguage(lang) {
        AppState.settings.language = lang;
        document.documentElement.lang = lang === 'zh' || lang === 'zh-CN' ? 'zh-CN' : 'en';
        debouncedSave();
        
        // 更新语言选择器
        const langSelect = document.getElementById('setting-language');
        if (langSelect) {
            langSelect.value = lang;
        }
    }

    function applyFontSize(size) {
        AppState.settings.fontSize = size;
        const body = document.body;
        body.classList.remove('font-small', 'font-medium', 'font-large');
        body.classList.add(`font-${size}`);
        debouncedSave();
        
        // 更新字体大小选择器
        const fontSelect = document.getElementById('setting-font-size');
        if (fontSelect) {
            fontSelect.value = size;
        }
    }

    function applyShortcut(shortcut) {
        AppState.settings.sendShortcut = shortcut;
        debouncedSave();
        
        // 更新快捷键选择器
        const shortcutSelect = document.getElementById('setting-shortcut');
        if (shortcutSelect) {
            shortcutSelect.value = shortcut;
        }
    }

    function switchSubAgent(agentId) {
        if (AppState.subAgents[agentId]) {
            AppState.currentSubAgent = agentId;
            debouncedSave();
            return true;
        }
        return false;
    }

    // ==================== 初始化执行 ====================
    init();
    applyTheme(AppState.settings.theme);
    applyLanguage(AppState.settings.language);
    applyFontSize(AppState.settings.fontSize);
    applyShortcut(AppState.settings.sendShortcut);

    // ==================== 暴露到全局 ====================
    window.AppState = AppState;
    window.AIAgentApp = {
        VERSION,
        BUILTIN_MODELS,
        BUILTIN_SKILLS,
        BUILTIN_RULES,
        BUILTIN_MCP,
        BUILTIN_RAG,
        BUILTIN_SUB_AGENTS,
        DEFAULT_API_KEYS,
        saveState,
        saveSyncConfig,
        saveRagVectors,
        saveCustomModels,
        addCustomModel,
        deleteCustomModel,
        setAPIKey,
        getAPIKey,
        hasValidAPIKey,
        getCurrentSubAgent,
        getCurrentModel,
        autoSelectModel,
        autoSelectOutputFormat,
        getEnabledResources,
        getSubAgentResources,
        buildSystemPrompt,
        addCustomSubAgent,
        deleteCustomSubAgent,
        updateSubAgentResources,
        addRagDocument,
        removeRagDocument,
        saveDocumentVectors,
        exportData,
        importData,
        applyTheme,
        applyLanguage,
        applyFontSize,
        applyShortcut,
        switchSubAgent
    };
})();
