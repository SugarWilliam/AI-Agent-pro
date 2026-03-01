/**
 * AI Agent Pro v8.0.1 - LLM服务
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

            // 2. 智能选择模型
            const actualModelId = modelId === 'auto' 
                ? window.AIAgentApp.autoSelectModel(messages, taskAnalysis.type)
                : modelId;
            
            // 3. 获取Sub Agent资源
            const subAgent = window.AIAgentApp.getCurrentSubAgent();
            const resources = window.AIAgentApp.getSubAgentResources(subAgent.id);
            
            // 4. 调用相关Skills
            const skillPrompts = this.buildSkillPrompts(resources.skills, taskAnalysis);
            
            // 5. 应用Rules
            const rulesPrompt = this.buildRulesPrompt(resources.rules);
            
            // 6. 调用MCP工具 - 增强网络搜索功能
            let mcpResults = [];
            let searchThinking = '';
            const lastMessage = messages[messages.length - 1]?.content || '';
            
            // 如果启用网络搜索且subagent支持，自动进行搜索和网页爬取
            const hasWebSearchMCP = resources.mcp && resources.mcp.some(m => m && m.id === 'mcp_web_search');
            window.Logger?.debug(`网络搜索检查: enableWebSearch=${enableWebSearch}, hasWebSearchMCP=${hasWebSearchMCP}`);
            
            if (enableWebSearch && hasWebSearchMCP) {
                try {
                    // 提取搜索关键词（从用户消息中提取）
                    const searchQuery = this.extractSearchQuery(lastMessage);
                    window.Logger?.debug(`提取搜索关键词: ${searchQuery || '未提取到关键词'}`);
                    
                    if (searchQuery) {
                        // 执行网络搜索
                        window.Logger?.info(`开始执行网络搜索: ${searchQuery}`);
                        const searchResults = await this.performWebSearch(searchQuery);
                        window.Logger?.info(`网络搜索完成，返回${searchResults.length}个结果`);
                        
                        // 检查是否是错误提示结果
                        const isErrorResult = searchResults.length === 1 && 
                            (searchResults[0].title.includes('搜索服务暂时不可用') || 
                             searchResults[0].title.includes('搜索失败'));
                        
                        if (searchResults.length > 0 && !isErrorResult) {
                            mcpResults.push({ type: 'search', data: searchResults });
                            
                            // 自动爬取前3个搜索结果的内容
                            const crawledContents = [];
                            for (let i = 0; i < Math.min(3, searchResults.length); i++) {
                                try {
                                    const pageContent = await this.fetchWebPage(searchResults[i].url);
                                    if (pageContent && pageContent.content) {
                                        crawledContents.push({
                                            title: searchResults[i].title,
                                            url: searchResults[i].url,
                                            content: pageContent.content.substring(0, 2000) // 限制内容长度
                                        });
                                    }
                                } catch (err) {
                                    window.Logger?.warn('爬取网页失败:', searchResults[i].url, err);
                                }
                            }
                            
                            // 将搜索结果和爬取内容格式化为思考过程
                            searchThinking = '\n\n🔍 网络搜索结果：\n';
                            searchResults.forEach((result, index) => {
                                searchThinking += `\n${index + 1}. ${result.title}\n   ${result.url}\n   ${result.snippet || ''}\n`;
                            });
                            
                            // 添加爬取的网页内容
                            if (crawledContents.length > 0) {
                                searchThinking += '\n\n📄 网页内容摘要：\n';
                                crawledContents.forEach((item, index) => {
                                    searchThinking += `\n【${index + 1}】${item.title} (${item.url})\n${item.content}\n`;
                                });
                                
                                // 将爬取的内容添加到RAG上下文中
                                if (!ragContext) ragContext = '';
                                ragContext += '\n\n【网络搜索结果】\n';
                                crawledContents.forEach(item => {
                                    ragContext += `\n${item.title}:\n${item.content}\n`;
                                });
                            }
                        }
                    }
                } catch (error) {
                    window.Logger?.error('网络搜索失败:', error);
                    // 搜索失败不影响主流程
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
            const result = await this.callLLM({
                messages,
                systemPrompt,
                modelId: actualModelId,
                onStream,
                outputFormat,
                taskAnalysis
            });

            // 10. 如果有搜索结果，添加到思考过程中
            if (searchThinking) {
                result.thinking = (result.thinking || '') + searchThinking;
            }

            return result;
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

        // 查询RAG知识库（优化版，使用真正的向量搜索）
        async queryRAG(query, ragList) {
            if (!query || !ragList || ragList.length === 0) {
                return '';
            }

            try {
                // 使用RAGManager的queryRAGKnowledgeBase方法
                if (window.RAGManager && typeof window.RAGManager.queryRAGKnowledgeBase === 'function') {
                    const context = await window.RAGManager.queryRAGKnowledgeBase(query, ragList);
                    window.Logger?.debug(`RAG查询结果长度: ${context.length} 字符`);
                    return context;
                } else {
                    // 降级方案：使用buildRAGContext
                    if (window.RAGManager && typeof window.RAGManager.buildRAGContext === 'function') {
                        const contexts = await window.RAGManager.buildRAGContext(query, ragList);
                        return contexts.map(c => `【${c.source}】\n${c.content}`).join('\n\n');
                    } else {
                        window.Logger?.warn('RAGManager未初始化，无法查询RAG知识库');
                        return '';
                    }
                }
            } catch (error) {
                window.Logger?.error('RAG查询失败:', error);
                // 返回空字符串，不影响主流程
                return '';
            }
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
                        } catch (e) {
                            window.Logger?.error('解析流数据失败:', e);
                        }
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
                        } catch (e) {
                            window.Logger?.error('解析 GLM 流数据失败:', e);
                        }
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
                        } catch (e) {
                            window.Logger?.error('解析 Kimi 流数据失败:', e);
                        }
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
                        } catch (e) {
                            window.Logger?.error('解析 Qwen 流数据失败:', e);
                        }
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
                        } catch (e) {
                            window.Logger?.error('解析 OpenAI 流数据失败:', e);
                        }
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
                        } catch (e) {
                            window.Logger?.error('解析自定义模型流数据失败:', e);
                        }
                    }
                }
            }

            return { content, thinking: '' };
        },

        // ==================== 网络搜索 ====================
        async performWebSearch(query) {
            try {
                window.Logger?.info(`开始网络搜索: ${query}`);
                
                // 方法1: 使用DuckDuckGo Instant Answer API（无需API密钥）
                try {
                    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
                    
                    const ddgResponse = await fetch(ddgUrl, {
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    
                    if (ddgResponse.ok) {
                        const ddgData = await ddgResponse.json();
                        
                        // 如果DuckDuckGo有即时答案，使用它
                        if (ddgData.AbstractText) {
                            window.Logger?.info('DuckDuckGo返回即时答案');
                            return [{
                                title: ddgData.Heading || query,
                                url: ddgData.AbstractURL || '',
                                snippet: ddgData.AbstractText
                            }];
                        }
                        
                        // 如果有相关主题，使用它们
                        if (ddgData.RelatedTopics && ddgData.RelatedTopics.length > 0) {
                            window.Logger?.info(`DuckDuckGo返回${ddgData.RelatedTopics.length}个相关主题`);
                            return ddgData.RelatedTopics.slice(0, 5).map(topic => ({
                                title: topic.Text?.split(' - ')[0] || query,
                                url: topic.FirstURL || '',
                                snippet: topic.Text || ''
                            }));
                        }
                    }
                } catch (ddgError) {
                    if (ddgError.name === 'AbortError') {
                        window.Logger?.warn('DuckDuckGo API请求超时，尝试备用方法');
                    } else {
                        window.Logger?.warn('DuckDuckGo搜索失败，尝试备用方法', ddgError);
                    }
                }
                
                // 方法2: 使用Jina AI Reader API搜索（如果配置了API密钥，优先使用）
                const jinaApiKey = window.AIAgentApp?.getJinaAIKey?.() || '';
                if (jinaApiKey) {
                    try {
                        window.Logger?.info('尝试使用Jina AI进行搜索');
                        const searchHeaders = {
                            'X-Return-Format': 'text',
                            'Authorization': `Bearer ${jinaApiKey}`
                        };
                        
                        // 使用Bing搜索（更可靠）
                        const bingSearchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
                        const jinaSearchUrl = `https://r.jina.ai/${bingSearchUrl}`;
                        
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
                        
                        const jinaResponse = await fetch(jinaSearchUrl, {
                            headers: searchHeaders,
                            signal: controller.signal
                        });
                        clearTimeout(timeoutId);
                        
                        if (jinaResponse.ok) {
                            const content = await jinaResponse.text();
                            const results = this.parseBingSearchResults(content);
                            if (results.length > 0) {
                                window.Logger?.info(`Jina AI搜索返回${results.length}个结果`);
                                return results.slice(0, 5);
                            }
                        }
                    } catch (jinaError) {
                        if (jinaError.name === 'AbortError') {
                            window.Logger?.warn('Jina AI搜索请求超时');
                        } else {
                            window.Logger?.warn('Jina AI搜索失败', jinaError);
                        }
                    }
                }
                
                // 方法3: 使用DuckDuckGo HTML搜索作为备用方案
                try {
                    const htmlSearchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
                    
                    const htmlResponse = await fetch(htmlSearchUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        },
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    
                    if (htmlResponse.ok) {
                        const html = await htmlResponse.text();
                        const results = this.parseDuckDuckGoResults(html);
                        if (results.length > 0) {
                            window.Logger?.info(`DuckDuckGo HTML搜索返回${results.length}个结果`);
                            return results.slice(0, 5);
                        }
                    }
                } catch (htmlError) {
                    if (htmlError.name === 'AbortError') {
                        window.Logger?.warn('DuckDuckGo HTML搜索请求超时');
                    } else {
                        window.Logger?.warn('DuckDuckGo HTML搜索失败', htmlError);
                    }
                }
                
                // 方法4: 如果所有方法都失败，返回提示信息
                window.Logger?.warn('所有搜索方法都失败，可能是网络连接问题');
                return [{
                    title: '搜索服务暂时不可用',
                    url: '',
                    snippet: '网络搜索功能暂时无法使用，可能是网络连接问题或搜索服务不可访问。请检查网络连接或稍后重试。'
                }];
            } catch (error) {
                window.Logger?.error('网络搜索异常', error);
                window.ErrorHandler?.handle(error, {
                    type: window.ErrorType?.NETWORK,
                    showToast: false,
                    logError: true
                });
                return [{
                    title: '搜索失败',
                    url: '',
                    snippet: `搜索失败: ${error.message}。请检查网络连接。`
                }];
            }
        },

        parseBingSearchResults(content) {
            const results = [];
            
            try {
                // 使用正则表达式解析Bing搜索结果
                // Bing搜索结果通常在特定的HTML结构中
                const titleRegex = /<h2[^>]*><a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a><\/h2>/gi;
                const snippetRegex = /<p[^>]*class="[^"]*b_caption[^"]*"[^>]*>(.*?)<\/p>/gi;
                
                const titles = [];
                let match;
                while ((match = titleRegex.exec(content)) !== null && titles.length < 10) {
                    const url = match[1];
                    const title = this.stripHtmlTags(match[2]);
                    if (title && url && !url.startsWith('javascript:')) {
                        titles.push({ title, url });
                    }
                }
                
                const snippets = [];
                while ((match = snippetRegex.exec(content)) !== null && snippets.length < 10) {
                    snippets.push(this.stripHtmlTags(match[1]));
                }
                
                // 组合结果
                for (let i = 0; i < titles.length; i++) {
                    results.push({
                        title: titles[i].title,
                        url: titles[i].url,
                        snippet: snippets[i] || ''
                    });
                }
            } catch (error) {
                window.Logger?.warn('解析Bing搜索结果失败', error);
            }
            
            return results;
        },
        
        parseDuckDuckGoResults(html) {
            const results = [];
            
            try {
                // 创建临时DOM解析器
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                // 查找搜索结果容器
                const resultElements = doc.querySelectorAll('.result, .web-result, [class*="result"]');
                
                resultElements.forEach((element, index) => {
                    if (index >= 10) return; // 限制最多10个结果
                    
                    // 提取标题和链接
                    const titleElement = element.querySelector('a.result__a, a[class*="result__a"], h2 a, .result__title a');
                    const snippetElement = element.querySelector('.result__snippet, .result__body, [class*="snippet"]');
                    
                    if (titleElement) {
                        const title = titleElement.textContent.trim();
                        const url = titleElement.getAttribute('href') || '';
                        
                        // 清理URL（移除DuckDuckGo重定向）
                        let cleanUrl = url;
                        if (url.startsWith('/l/?uddg=')) {
                            try {
                                const decoded = decodeURIComponent(url.split('uddg=')[1].split('&')[0]);
                                cleanUrl = decoded;
                            } catch (e) {
                                // 如果解码失败，使用原始URL
                            }
                        }
                        
                        const snippet = snippetElement ? snippetElement.textContent.trim() : '';
                        
                        if (title && cleanUrl) {
                            results.push({
                                title: title,
                                url: cleanUrl,
                                snippet: snippet
                            });
                        }
                    }
                });
                
                // 如果DOM解析失败，尝试正则表达式解析
                if (results.length === 0) {
                    const titleRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi;
                    const snippetRegex = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>(.*?)<\/a>/gi;
                    
                    let match;
                    while ((match = titleRegex.exec(html)) !== null && results.length < 10) {
                        let url = match[1];
                        // 清理DuckDuckGo重定向URL
                        if (url.startsWith('/l/?uddg=')) {
                            try {
                                url = decodeURIComponent(url.split('uddg=')[1].split('&')[0]);
                            } catch (e) {}
                        }
                        
                        const title = this.stripHtmlTags(match[2]);
                        if (title && url) {
                            results.push({
                                title: title,
                                url: url,
                                snippet: ''
                            });
                        }
                    }
                }
            } catch (error) {
                window.Logger?.warn('解析搜索结果失败', error);
            }
            
            return results;
        },
        
        parseGoogleSearchResults(html) {
            // 保留此方法以兼容旧代码
            return this.parseDuckDuckGoResults(html);
        },

        stripHtmlTags(html) {
            return html.replace(/<[^>]*>/g, '').trim();
        },

        // 提取搜索关键词
        extractSearchQuery(message) {
            if (!message || typeof message !== 'string') return null;
            
            // 检测URL（如果有URL，直接返回用于爬取）
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const urls = message.match(urlRegex);
            if (urls && urls.length > 0) {
                return urls[0]; // 如果有URL，直接返回URL用于爬取
            }
            
            // 检测是否需要搜索的关键词（更宽松的匹配）
            const searchKeywords = [
                '搜索', '查找', '查询', '搜一下', '找一下',
                '最新', '现在', '当前', '实时', '今天', '最近', '2024', '2025',
                '什么', '如何', '为什么', '哪里', '哪个', '谁',
                '新闻', '资讯', '消息', '动态', '更新',
                '价格', '多少钱', '多少', '什么时候', '几点'
            ];
            const hasSearchIntent = searchKeywords.some(keyword => message.includes(keyword));
            
            // 如果消息包含问号，更可能是搜索意图
            const hasQuestionMark = message.includes('?') || message.includes('？');
            
            // 如果消息很短（少于20字符）且包含问号，可能是搜索
            const isShortQuestion = message.length < 20 && hasQuestionMark;
            
            // 如果没有明确的搜索意图，返回null（不自动搜索）
            if (!hasSearchIntent && !hasQuestionMark && !isShortQuestion) {
                return null;
            }
            
            // 提取关键词：移除常见停用词和搜索指令词
            const stopWords = ['的', '了', '在', '是', '我', '你', '他', '她', '它', '我们', '你们', '他们', '请', '帮', '能', '可以', '要', '想', '给', '告诉', '搜索', '查找', '查询', '搜一下', '找一下'];
            let query = message;
            
            // 移除搜索指令词
            stopWords.forEach(word => {
                query = query.replace(new RegExp(word, 'gi'), ' ');
            });
            
            // 移除问号
            query = query.replace(/[?？]/g, ' ').trim();
            
            // 清理多余空格
            query = query.replace(/\s+/g, ' ').trim();
            
            // 限制长度（但至少保留3个字符）
            if (query.length < 3) {
                // 如果清理后太短，使用原始消息（移除搜索指令词）
                query = message.replace(/^(请|帮|能|可以|要|想|给|告诉)?(搜索|查找|查询|搜一下|找一下)?/gi, '').trim();
            }
            
            if (query.length > 100) {
                query = query.substring(0, 100);
            }
            
            return query || null;
        },

        async fetchWebPage(url) {
            try {
                window.Logger?.info(`开始爬取网页: ${url}`);
                
                // 清理URL（移除DuckDuckGo重定向等）
                let cleanUrl = url;
                if (url.startsWith('/l/?uddg=')) {
                    try {
                        cleanUrl = decodeURIComponent(url.split('uddg=')[1].split('&')[0]);
                    } catch (e) {
                        window.Logger?.warn('URL解码失败，使用原始URL', e);
                    }
                }
                
                // 确保URL有协议
                if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
                    cleanUrl = 'https://' + cleanUrl;
                }
                
                // 使用 Jina AI 抓取网页内容（如果配置了API密钥）
                const jinaApiKey = window.AIAgentApp?.getJinaAIKey?.() || '';
                if (jinaApiKey) {
                    try {
                        const fetchHeaders = {
                            'X-Return-Format': 'text',
                            'Authorization': `Bearer ${jinaApiKey}`
                        };
                        
                        // Jina AI Reader API格式：https://r.jina.ai/{url}
                        const jinaUrl = `https://r.jina.ai/${cleanUrl}`;
                        window.Logger?.debug(`使用Jina AI爬取: ${jinaUrl}`);
                        
                        const response = await fetch(jinaUrl, {
                            headers: fetchHeaders
                        });
                        
                        if (response.ok) {
                            const content = await response.text();
                            window.Logger?.info(`网页爬取成功: ${cleanUrl}, 内容长度: ${content.length}`);
                            
                            return {
                                url: cleanUrl,
                                title: this.extractTitle(content) || cleanUrl,
                                content: content.substring(0, 5000) // 限制内容长度
                            };
                        } else {
                            window.Logger?.warn(`Jina AI爬取失败: ${response.status}`);
                        }
                    } catch (jinaError) {
                        window.Logger?.warn('Jina AI爬取异常', jinaError);
                    }
                }
                
                // 如果Jina AI不可用或失败，返回基本信息
                window.Logger?.warn(`网页爬取失败: ${cleanUrl}`);
                return {
                    url: cleanUrl,
                    title: cleanUrl,
                    content: `[无法获取网页内容，请手动访问: ${cleanUrl}]`
                };
            } catch (error) {
                window.Logger?.error('网页爬取异常', error);
                window.ErrorHandler?.handle(error, {
                    type: window.ErrorType?.NETWORK,
                    showToast: false,
                    logError: true
                });
                return {
                    url: url,
                    title: url,
                    content: `[网页爬取失败: ${error.message}]`
                };
            }
        },

        extractTitle(html) {
            const titleMatch = html.match(/<title>(.*?)<\/title>/i);
            return titleMatch ? titleMatch[1].trim() : '未知标题';
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
})();
