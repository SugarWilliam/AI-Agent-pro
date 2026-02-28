/**
 * AI Agent Pro v6.0.0 - LLM服务
 * 多模态输入输出支持
 */

(function() {
    'use strict';

    const LLMService = {
        currentController: null,
        
        // ==================== 多模态输入处理 ====================
        async processMultimodalInput(input) {
            const processed = {
                text: '',
                images: [],
                documents: [],
                urls: []
            };

            if (typeof input === 'string') {
                // 检测URL
                const urlRegex = /(https?:\/\/[^\s]+)/g;
                const urls = input.match(urlRegex) || [];
                processed.urls = urls;
                
                // 检测图片链接
                const imageRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp))/gi;
                processed.images = input.match(imageRegex) || [];
                
                processed.text = input.replace(urlRegex, '[链接]').trim();
            } else if (input.files && input.files.length > 0) {
                // 处理文件上传
                for (const file of input.files) {
                    if (file.type.startsWith('image/')) {
                        const base64 = await this.fileToBase64(file);
                        processed.images.push({ name: file.name, data: base64, type: file.type });
                    } else if (file.type === 'application/pdf' || 
                               file.type.includes('word') ||
                               file.type === 'text/plain' ||
                               file.type === 'text/markdown') {
                        const content = await this.readDocument(file);
                        processed.documents.push({ 
                            name: file.name, 
                            content: content,
                            type: file.type 
                        });
                    }
                }
                processed.text = input.text || '';
            }

            return processed;
        },

        // 文件转Base64
        fileToBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        },

        // 读取文档内容
        async readDocument(file) {
            if (file.type === 'text/plain' || file.type === 'text/markdown') {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsText(file);
                });
            }
            
            // PDF和DOC需要后端支持，这里返回占位符
            if (file.type === 'application/pdf') {
                return `[PDF文档: ${file.name}]\n(需要后端服务解析PDF内容)`;
            }
            
            if (file.type.includes('word')) {
                return `[Word文档: ${file.name}]\n(需要后端服务解析DOC内容)`;
            }
            
            return `[文档: ${file.name}]`;
        },

        // ==================== 智能调用引擎 ====================
        async invokeIntelligentAgent(messages, options = {}) {
            const {
                modelId = 'auto',
                enableWebSearch = false,
                onStream = null,
                outputFormat = 'markdown',
                taskType = 'general'
            } = options;

            // 1. 分析任务类型
            const taskAnalysis = this.analyzeTaskType(messages, taskType);
            console.log('任务分析:', taskAnalysis);

            // 2. 智能选择模型
            const actualModelId = modelId === 'auto' 
                ? window.AIAgentApp.autoSelectModel(messages, taskAnalysis.type)
                : modelId;
            
            console.log('选择模型:', actualModelId);

            // 3. 获取Sub Agent资源
            const subAgent = window.AIAgentApp.getCurrentSubAgent();
            const resources = window.AIAgentApp.getSubAgentResources(subAgent.id);
            
            // 4. 调用相关Skills
            const skillPrompts = this.buildSkillPrompts(resources.skills, taskAnalysis);
            
            // 5. 应用Rules
            const rulesPrompt = this.buildRulesPrompt(resources.rules);
            
            // 6. 调用MCP工具
            let mcpResults = [];
            if (enableWebSearch && resources.mcp.some(m => m.id === 'mcp_web_search')) {
                const searchResults = await this.performWebSearch(messages[messages.length - 1]?.content);
                if (searchResults.length > 0) {
                    mcpResults.push({ type: 'search', data: searchResults });
                }
            }

            // 7. 查询RAG知识库
            let ragContext = '';
            if (resources.rag && resources.rag.length > 0) {
                ragContext = await this.queryRAG(messages[messages.length - 1]?.content, resources.rag);
            }

            // 8. 构建完整提示词
            const systemPrompt = this.buildEnhancedSystemPrompt({
                subAgent,
                skillPrompts,
                rulesPrompt,
                mcpResults,
                ragContext,
                outputFormat
            });

            // 9. 调用LLM
            return await this.callLLM({
                messages,
                systemPrompt,
                modelId: actualModelId,
                onStream,
                outputFormat,
                taskAnalysis
            });
        },

        // 分析任务类型
        analyzeTaskType(messages, defaultType) {
            const lastMessage = messages[messages.length - 1];
            const content = lastMessage?.content?.toLowerCase() || '';
            
            const patterns = {
                code: ['代码', '编程', 'bug', 'debug', '函数', 'class', 'python', 'javascript', 'java'],
                creative: ['创意', '写作', '故事', '诗歌', '文案', '创作'],
                analysis: ['分析', '决策', '对比', '评估', '建议'],
                planning: ['计划', '规划', 'todo', '任务', '时间表'],
                research: ['研究', '调研', '资料', '文献'],
                data: ['数据', '表格', '统计', '图表'],
                presentation: ['ppt', '演示', '演讲', '汇报'],
                translation: ['翻译', '英文', '中文', '日文'],
                summary: ['总结', '摘要', '概括'],
                design: ['设计', 'ui', 'ux', '界面']
            };
            
            for (const [type, keywords] of Object.entries(patterns)) {
                if (keywords.some(k => content.includes(k))) {
                    return { type, confidence: 'high' };
                }
            }
            
            return { type: defaultType || 'general', confidence: 'medium' };
        },

        // 构建Skill提示词
        buildSkillPrompts(skills, taskAnalysis) {
            if (!skills || skills.length === 0) return '';
            
            let prompts = '';
            skills.forEach(skill => {
                if (skill.prompt) {
                    prompts += `## ${skill.name}\n${skill.prompt}\n\n`;
                }
            });
            
            return prompts;
        },

        // 构建Rules提示词
        buildRulesPrompt(rules) {
            if (!rules || rules.length === 0) return '';
            
            const sortedRules = [...rules].sort((a, b) => (a.priority || 0) - (b.priority || 0));
            return sortedRules.map(r => `- ${r.content}`).join('\n');
        },

        // 查询RAG知识库
        async queryRAG(query, ragList) {
            // 简化版RAG查询，实际应该使用向量相似度搜索
            let context = '';
            
            for (const rag of ragList) {
                if (rag.documents && rag.documents.length > 0) {
                    context += `\n【${rag.name}】\n`;
                    // 这里应该进行向量相似度搜索
                    // 暂时返回文档列表
                    context += rag.documents.map(d => `- ${d.name}`).join('\n');
                }
            }
            
            return context;
        },

        // 构建增强系统提示词
        buildEnhancedSystemPrompt({ subAgent, skillPrompts, rulesPrompt, mcpResults, ragContext, outputFormat }) {
            let prompt = `你是「${subAgent.name}」，${subAgent.description}\n\n`;
            prompt += subAgent.systemPrompt + '\n\n';
            
            if (rulesPrompt) {
                prompt += `【规则】\n${rulesPrompt}\n\n`;
            }
            
            if (skillPrompts) {
                prompt += `【技能指引】\n${skillPrompts}\n`;
            }
            
            if (mcpResults.length > 0) {
                prompt += `【工具结果】\n`;
                mcpResults.forEach(result => {
                    if (result.type === 'search') {
                        prompt += this.formatSearchResults(result.data) + '\n';
                    }
                });
            }
            
            if (ragContext) {
                prompt += `【知识库参考】\n${ragContext}\n\n`;
            }
            
            // 输出格式要求
            prompt += `【输出格式要求】\n`;
            prompt += `- 默认使用Markdown格式\n`;
            prompt += `- 代码块必须标注语言类型\n`;
            
            if (outputFormat === 'table') {
                prompt += `- 使用Markdown表格展示数据\n`;
            } else if (outputFormat === 'list') {
                prompt += `- 使用有序或无序列表组织内容\n`;
            }
            
            return prompt;
        },

        // ==================== 核心LLM调用 ====================
        async callLLM({ messages, systemPrompt, modelId, onStream, outputFormat, taskAnalysis }) {
            if (!window.AppState || !window.AppState.models) {
                throw new Error('AppState未初始化');
            }

            const model = window.AppState.models[modelId];
            if (!model) {
                throw new Error('未知的模型: ' + modelId);
            }

            if (!model.apiKey || model.apiKey.trim() === '') {
                throw new Error(`模型 ${model.name} 未配置API Key，请在设置中配置`);
            }

            // 构建消息列表
            const validMessages = messages.filter(msg => msg.role === 'user' || msg.role === 'assistant');
            const formattedMessages = [
                { role: 'system', content: systemPrompt },
                ...validMessages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                }))
            ];

            // 根据provider调用不同API
            switch(model.provider) {
                case 'deepseek':
                    return await this.callDeepSeekStream(formattedMessages, model, onStream);
                case 'glm':
                    return await this.callGLMStream(formattedMessages, model, onStream);
                case 'kimi':
                    return await this.callKimiStream(formattedMessages, model, onStream);
                case 'qwen':
                    return await this.callQwen(formattedMessages, model, onStream);
                case 'openai':
                    return await this.callOpenAIStream(formattedMessages, model, onStream);
                case 'anthropic':
                    return await this.callAnthropic(formattedMessages, model);
                default:
                    return await this.callGenericOpenAI(formattedMessages, model, onStream);
            }
        },

        // ==================== API调用实现 ====================
        async callDeepSeekStream(messages, model, onStream) {
            const response = await fetch(model.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${model.apiKey}`
                },
                body: JSON.stringify({
                    model: model.id.includes('reasoner') ? 'deepseek-reasoner' : 'deepseek-chat',
                    messages: messages,
                    stream: true,
                    temperature: model.temperature || 0.7,
                    max_tokens: model.maxTokens || 8192
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`DeepSeek API错误: ${response.status} - ${error}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let content = '';
            let thinking = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        
                        try {
                            const json = JSON.parse(data);
                            const delta = json.choices?.[0]?.delta;
                            
                            if (delta) {
                                if (delta.reasoning_content) {
                                    thinking += delta.reasoning_content;
                                }
                                if (delta.content) {
                                    content += delta.content;
                                    if (onStream) onStream(content);
                                }
                            }
                        } catch (e) {}
                    }
                }
            }

            return { content, thinking };
        },

        async callGLMStream(messages, model, onStream) {
            const response = await fetch(model.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${model.apiKey}`
                },
                body: JSON.stringify({
                    model: model.id,
                    messages: messages,
                    stream: true,
                    temperature: model.temperature || 0.7,
                    max_tokens: model.maxTokens || 4096
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`GLM API错误: ${response.status} - ${error}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let content = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        
                        try {
                            const json = JSON.parse(data);
                            const delta = json.choices?.[0]?.delta?.content;
                            if (delta) {
                                content += delta;
                                if (onStream) onStream(content);
                            }
                        } catch (e) {}
                    }
                }
            }

            return { content, thinking: '' };
        },

        async callKimiStream(messages, model, onStream) {
            const response = await fetch(model.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${model.apiKey}`
                },
                body: JSON.stringify({
                    model: 'moonshot-v1-8k',
                    messages: messages,
                    stream: true,
                    temperature: model.temperature || 0.7
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Kimi API错误: ${response.status} - ${error}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let content = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        
                        try {
                            const json = JSON.parse(data);
                            const delta = json.choices?.[0]?.delta?.content;
                            if (delta) {
                                content += delta;
                                if (onStream) onStream(content);
                            }
                        } catch (e) {}
                    }
                }
            }

            return { content, thinking: '' };
        },

        async callQwen(messages, model, onStream) {
            // 使用兼容模式API（OpenAI格式）
            // 确保URL正确拼接
            const baseUrl = model.url.replace(/\/$/, '');
            const apiUrl = baseUrl + '/chat/completions';
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${model.apiKey}`
                },
                body: JSON.stringify({
                    model: 'qwen-max',
                    messages: messages,
                    stream: true,
                    temperature: model.temperature || 0.7,
                    max_tokens: model.maxTokens || 4096
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Qwen API错误: ${response.status} - ${error}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let content = '';
            let thinking = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        
                        try {
                            const json = JSON.parse(data);
                            const delta = json.choices?.[0]?.delta;
                            
                            if (delta) {
                                if (delta.reasoning_content) {
                                    thinking += delta.reasoning_content;
                                }
                                if (delta.content) {
                                    content += delta.content;
                                    if (onStream) onStream(content);
                                }
                            }
                        } catch (e) {}
                    }
                }
            }

            return { content, thinking };
        },

        async callOpenAIStream(messages, model, onStream) {
            const response = await fetch(model.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${model.apiKey}`
                },
                body: JSON.stringify({
                    model: model.id,
                    messages: messages,
                    stream: true,
                    temperature: model.temperature || 0.7,
                    max_tokens: model.maxTokens || 4096
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`OpenAI API错误: ${response.status} - ${error}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let content = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        
                        try {
                            const json = JSON.parse(data);
                            const delta = json.choices?.[0]?.delta?.content;
                            if (delta) {
                                content += delta;
                                if (onStream) onStream(content);
                            }
                        } catch (e) {}
                    }
                }
            }

            return { content, thinking: '' };
        },

        async callAnthropic(messages, model) {
            const systemMsg = messages.find(m => m.role === 'system');
            const otherMsgs = messages.filter(m => m.role !== 'system');

            const response = await fetch(model.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': model.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-3-sonnet-20240229',
                    max_tokens: model.maxTokens || 4096,
                    temperature: model.temperature || 0.7,
                    system: systemMsg?.content,
                    messages: otherMsgs
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Anthropic API错误: ${response.status} - ${error}`);
            }

            const data = await response.json();
            return { content: data.content?.[0]?.text || '', thinking: '' };
        },

        async callGenericOpenAI(messages, model, onStream) {
            const response = await fetch(model.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${model.apiKey}`
                },
                body: JSON.stringify({
                    model: model.id,
                    messages: messages,
                    stream: true,
                    temperature: model.temperature || 0.7,
                    max_tokens: model.maxTokens || 4096
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`API错误: ${response.status} - ${error}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let content = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        
                        try {
                            const json = JSON.parse(data);
                            const delta = json.choices?.[0]?.delta?.content;
                            if (delta) {
                                content += delta;
                                if (onStream) onStream(content);
                            }
                        } catch (e) {}
                    }
                }
            }

            return { content, thinking: '' };
        },

        // ==================== 网络搜索 ====================
        async performWebSearch(query) {
            // 模拟搜索结果
            return [];
        },

        formatSearchResults(results) {
            if (!results || results.length === 0) return '';
            
            let formatted = '【搜索结果】\n';
            results.forEach((result, i) => {
                formatted += `${i + 1}. [${result.title}](${result.url})\n${result.snippet}\n\n`;
            });
            return formatted;
        },

        // ==================== 多模态输出处理 ====================
        async processMultimodalOutput(content, format) {
            switch(format) {
                case 'markdown':
                    return { type: 'markdown', content };
                case 'html':
                    return { type: 'html', content: this.markdownToHTML(content) };
                case 'table':
                    return { type: 'table', content: this.extractTables(content) };
                case 'pdf':
                    return { type: 'pdf', content: '(PDF生成需要后端支持)' };
                case 'ppt':
                    return { type: 'ppt', content: this.extractSlides(content) };
                case 'h5':
                    return { type: 'h5', content: this.markdownToH5(content) };
                case 'spreadsheet':
                    return { type: 'spreadsheet', content: this.extractTables(content) };
                default:
                    return { type: 'markdown', content };
            }
        },

        markdownToHTML(markdown) {
            // 简化的Markdown转HTML
            let html = markdown
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                .replace(/\n/g, '<br>');
            return html;
        },

        markdownToH5(markdown) {
            // 生成H5页面结构
            return {
                title: '生成的H5页面',
                content: this.markdownToHTML(markdown),
                style: 'mobile-responsive'
            };
        },

        extractTables(content) {
            // 提取Markdown表格
            const tableRegex = /\|(.+)\|\n\|[-:| ]+\|\n((?:\|.+\|\n?)+)/g;
            const tables = [];
            let match;
            while ((match = tableRegex.exec(content)) !== null) {
                tables.push(match[0]);
            }
            return tables;
        },

        extractSlides(content) {
            // 提取PPT幻灯片结构
            const slides = content.split(/#{2,3} /).filter(s => s.trim()).map((slide, i) => ({
                id: i + 1,
                title: slide.split('\n')[0],
                content: slide.split('\n').slice(1).join('\n')
            }));
            return slides;
        },

        // ==================== 简化版sendMessage（兼容旧接口）====================
        async sendMessage(messages, modelId, enableWebSearch = false, onStream = null) {
            // 使用智能调用引擎发送消息
            return await this.invokeIntelligentAgent(messages, {
                modelId: modelId || 'auto',
                enableWebSearch,
                onStream,
                outputFormat: 'markdown',
                taskType: 'general'
            });
        }
    };

    // 暴露到全局
    window.LLMService = LLMService;
    console.log('AI Agent Pro v6.0.0 LLM服务已加载');
})();
