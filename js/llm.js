/**
 * AI Agent Pro v8.2.0 - LLM服务
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
            
            // 6. 初始化RAG上下文（提前声明，以便搜索时可以添加内容）
            let ragContext = '';
            
            // 7. 调用MCP工具 - 增强网络搜索功能
            let mcpResults = [];
            let searchThinking = '';
            const lastMessage = messages[messages.length - 1]?.content || '';
            
            // 如果启用网络搜索且subagent支持，自动进行搜索和网页爬取
            const hasWebSearchMCP = resources.mcp && resources.mcp.some(m => m && m.id === 'mcp_web_search');
            window.Logger?.info(`🔍 网络搜索检查: enableWebSearch=${enableWebSearch}, hasWebSearchMCP=${hasWebSearchMCP}, 当前SubAgent: ${subAgent?.id || 'unknown'}`);
            
            // 显示搜索状态到chat界面
            if (enableWebSearch && hasWebSearchMCP) {
                window.AIAgentUI?.showSearchStatus?.('正在检查搜索条件...');
            }
            
            if (enableWebSearch && hasWebSearchMCP) {
                try {
                    // 提取搜索关键词（从用户消息中提取）
                    window.AIAgentUI?.showSearchStatus?.('正在提取搜索关键词...');
                    const searchQuery = this.extractSearchQuery(lastMessage);
                    window.Logger?.info(`🔑 提取搜索关键词: ${searchQuery || '未提取到关键词'}`);
                    
                    // 如果没有提取到关键词，但启用了网络搜索，尝试使用整个消息作为搜索关键词
                    const finalSearchQuery = searchQuery || (lastMessage.trim().length > 0 ? lastMessage.trim().substring(0, 100) : null);
                    
                    if (finalSearchQuery && finalSearchQuery.trim().length > 0) {
                        // 执行网络搜索
                        window.AIAgentUI?.showSearchStatus?.(`正在搜索: ${finalSearchQuery.substring(0, 30)}...`);
                        window.Logger?.info(`🔍 开始执行网络搜索: ${finalSearchQuery}`);
                        const searchResults = await this.performWebSearch(finalSearchQuery);
                        window.Logger?.info(`✅ 网络搜索完成，返回${searchResults.length}个结果`);
                        
                        // 检查是否是错误提示结果
                        const isErrorResult = searchResults.length === 1 && 
                            (searchResults[0].title.includes('搜索服务暂时不可用') || 
                             searchResults[0].title.includes('搜索失败'));
                        
                        if (searchResults.length > 0 && !isErrorResult) {
                            window.AIAgentUI?.showSearchStatus?.(`找到 ${searchResults.length} 个搜索结果（来自${new Set(searchResults.map(r => r.source)).size}个搜索源），正在并行爬取网页内容...`);
                            mcpResults.push({ type: 'search', data: searchResults });
                            
                            // 并行爬取前5个搜索结果的内容（增加数量以利用多源信息）
                            const crawlPromises = [];
                            const maxCrawl = Math.min(5, searchResults.length);
                            
                            for (let i = 0; i < maxCrawl; i++) {
                                crawlPromises.push(
                                    (async () => {
                                        try {
                                            window.AIAgentUI?.showSearchStatus?.(`正在爬取第 ${i + 1}/${maxCrawl} 个结果: ${searchResults[i].title.substring(0, 20)}... (${searchResults[i].source || '未知来源'})`);
                                            const pageContent = await this.fetchWebPage(searchResults[i].url);
                                            if (pageContent && pageContent.content) {
                                                return {
                                                    title: searchResults[i].title,
                                                    url: searchResults[i].url,
                                                    source: searchResults[i].source || '未知',
                                                    content: pageContent.content.substring(0, 2000) // 限制内容长度
                                                };
                                            }
                                        } catch (err) {
                                            window.Logger?.warn(`爬取网页失败 [${searchResults[i].source}]:`, searchResults[i].url, err);
                                            return null;
                                        }
                                    })()
                                );
                            }
                            
                            // 等待所有爬取完成
                            const crawlResults = await Promise.allSettled(crawlPromises);
                            const crawledContents = crawlResults
                                .filter(r => r.status === 'fulfilled' && r.value !== null)
                                .map(r => r.value);
                            
                            if (crawledContents.length > 0) {
                                window.AIAgentUI?.showSearchStatus?.(`✅ 搜索完成，已获取 ${crawledContents.length} 个网页内容`);
                            } else {
                                window.AIAgentUI?.showSearchStatus?.('⚠️ 搜索完成，但未能爬取网页内容');
                            }
                            
                            // 将搜索结果和爬取内容格式化为思考过程（多源格式）
                            searchThinking = '\n\n🔍 网络搜索结果（多源并行搜索）：\n';
                            
                            // 按来源分组显示
                            const resultsBySource = {};
                            searchResults.forEach(result => {
                                const source = result.source || '未知来源';
                                if (!resultsBySource[source]) {
                                    resultsBySource[source] = [];
                                }
                                resultsBySource[source].push(result);
                            });
                            
                            Object.entries(resultsBySource).forEach(([source, results]) => {
                                searchThinking += `\n【${source}】(${results.length}个结果)\n`;
                                results.forEach((result, index) => {
                                    searchThinking += `  ${index + 1}. ${result.title}\n     ${result.url}\n     ${result.snippet || ''}\n`;
                                });
                            });
                            
                            // 添加爬取的网页内容
                            if (crawledContents.length > 0) {
                                searchThinking += '\n\n📄 网页内容摘要（多源验证）：\n';
                                crawledContents.forEach((item, index) => {
                                    searchThinking += `\n【${index + 1}】${item.title} [来源: ${item.source || '未知'}] (${item.url})\n${item.content}\n`;
                                });
                                
                                // 将爬取的内容添加到RAG上下文中（重要：确保搜索结果被使用）
                                ragContext += '\n\n【网络搜索结果 - 实时信息（多源并行搜索）】\n';
                                ragContext += `搜索时间: ${new Date().toLocaleString('zh-CN')}\n`;
                                ragContext += `搜索关键词: ${finalSearchQuery}\n`;
                                ragContext += `搜索源数量: ${Object.keys(resultsBySource).length}个\n`;
                                ragContext += `结果总数: ${searchResults.length}个\n`;
                                ragContext += `已爬取网页: ${crawledContents.length}个\n\n`;
                                
                                // 按来源分组添加到上下文
                                Object.entries(resultsBySource).forEach(([source, results]) => {
                                    ragContext += `【${source}搜索结果】\n`;
                                    results.forEach(result => {
                                        ragContext += `- ${result.title} (${result.url})\n  ${result.snippet || ''}\n`;
                                    });
                                    ragContext += '\n';
                                });
                                
                                // 添加爬取的网页内容
                                ragContext += '【网页详细内容】\n';
                                crawledContents.forEach(item => {
                                    ragContext += `【${item.title}】[来源: ${item.source || '未知'}] (${item.url})\n${item.content}\n\n`;
                                });
                                
                                ragContext += '⚠️ 重要提示：\n';
                                ragContext += '1. 请优先使用上述实时搜索结果中的最新信息回答问题\n';
                                ragContext += '2. 多个搜索源的结果可以互相印证，提高信息准确性\n';
                                ragContext += '3. 如果不同来源的信息有冲突，请标注并说明\n';
                                ragContext += '4. 不要依赖训练数据中的旧信息\n';
                                
                                window.Logger?.info(`✅ 多源搜索结果已添加到RAG上下文，内容长度: ${ragContext.length} 字符，来源数: ${Object.keys(resultsBySource).length}`);
                            }
                        } else {
                            window.AIAgentUI?.showSearchStatus?.('⚠️ 搜索未返回有效结果');
                            window.Logger?.warn(`搜索未返回有效结果，结果数量: ${searchResults.length}, 是否错误: ${isErrorResult}`);
                        }
                    } else {
                        window.AIAgentUI?.showSearchStatus?.('⚠️ 无法提取搜索关键词，跳过网络搜索');
                        window.Logger?.warn(`无法提取搜索关键词，跳过网络搜索。原始消息: ${lastMessage.substring(0, 50)}`);
                    }
                } catch (error) {
                    window.Logger?.error('网络搜索失败:', error);
                    window.AIAgentUI?.showSearchStatus?.('❌ 网络搜索失败: ' + error.message);
                    // 搜索失败不影响主流程
                }
            } else {
                if (enableWebSearch && !hasWebSearchMCP) {
                    window.AIAgentUI?.showSearchStatus?.('⚠️ 网络搜索已启用，但当前SubAgent未绑定MCP资源');
                    window.Logger?.warn(`网络搜索已启用但SubAgent未绑定MCP资源。当前SubAgent: ${subAgent?.id || 'unknown'}, MCP资源: ${JSON.stringify(resources.mcp || [])}`);
                } else if (!enableWebSearch) {
                    window.Logger?.info(`网络搜索未启用。webSearchEnabled=${window.AppState?.settings?.webSearchEnabled}`);
                }
            }

            // 隐藏搜索状态（搜索完成）
            window.AIAgentUI?.hideSearchStatus?.();
            
            // 8. 查询RAG知识库（如果搜索结果已添加到ragContext，这里会追加）
            if (resources.rag && resources.rag.length > 0) {
                const ragKnowledge = await this.queryRAG(messages[messages.length - 1]?.content, resources.rag);
                if (ragKnowledge) {
                    // 如果已有搜索结果，追加RAG知识库内容
                    if (ragContext) {
                        ragContext += '\n\n【知识库参考】\n' + ragKnowledge;
                    } else {
                        ragContext = ragKnowledge;
                    }
                }
            }

            // 9. 构建完整提示词
            window.Logger?.info(`📝 构建系统提示词: ragContext长度=${ragContext?.length || 0}, mcpResults数量=${mcpResults.length}`);
            const systemPrompt = this.buildEnhancedSystemPrompt({
                subAgent,
                skillPrompts,
                rulesPrompt,
                mcpResults,
                ragContext,
                outputFormat
            });

            // 10. 调用LLM
            window.Logger?.info(`🤖 调用LLM: 模型=${actualModelId}, 系统提示词长度=${systemPrompt.length}`);
            const result = await this.callLLM({
                messages,
                systemPrompt,
                modelId: actualModelId,
                onStream,
                outputFormat,
                taskAnalysis
            });

            // 11. 如果有搜索结果，添加到思考过程中
            if (searchThinking) {
                result.thinking = (result.thinking || '') + searchThinking;
                window.Logger?.info(`✅ 搜索结果已添加到思考过程，长度=${searchThinking.length}`);
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
            
            // 优先显示网络搜索结果（实时信息）
            if (ragContext && ragContext.includes('【网络搜索结果')) {
                prompt += `【重要：实时搜索结果】\n`;
                prompt += ragContext.split('【知识库参考】')[0] + '\n\n';
                window.Logger?.info(`✅ 已将实时搜索结果添加到系统提示词`);
            }
            
            if (mcpResults.length > 0) {
                prompt += `【工具结果】\n`;
                mcpResults.forEach(result => {
                    if (result.type === 'search') {
                        prompt += this.formatSearchResults(result.data) + '\n';
                    }
                });
            }
            
            // 添加RAG知识库内容（如果存在且不是搜索结果）
            if (ragContext) {
                if (ragContext.includes('【知识库参考】')) {
                    // 如果包含知识库参考，提取并添加
                    const knowledgePart = ragContext.split('【知识库参考】')[1];
                    if (knowledgePart) {
                        prompt += `【知识库参考】\n${knowledgePart}\n\n`;
                    }
                } else if (!ragContext.includes('【网络搜索结果')) {
                    // 如果没有搜索结果，直接添加RAG内容
                    prompt += `【知识库参考】\n${ragContext}\n\n`;
                }
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
            // 创建AbortController用于中断请求
            const controller = new AbortController();
            this.currentController = controller;
            
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
                }),
                signal: controller.signal
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`DeepSeek API错误: ${response.status} - ${error}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let content = '';
            let thinking = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    // 检查是否被中断
                    if (controller.signal.aborted) {
                        window.Logger?.info('请求已被用户中断');
                        break;
                    }

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
            } catch (error) {
                if (error.name === 'AbortError' || controller.signal.aborted) {
                    window.Logger?.info('请求被中断');
                    // 清理controller引用
                    if (this.currentController === controller) {
                        this.currentController = null;
                    }
                    throw new Error('请求已被用户中断');
                }
                throw error;
            } finally {
                // 清理controller引用
                if (this.currentController === controller) {
                    this.currentController = null;
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
        async performWebSearch(query, retryCount = 0) {
            const MAX_RETRIES = 2;
            try {
                window.Logger?.info(`开始网络搜索: ${query}${retryCount > 0 ? ` (重试 ${retryCount}/${MAX_RETRIES})` : ''}`);
                
                // 验证配置
                const webSearchEnabled = window.AppState?.settings?.webSearchEnabled;
                const currentSubAgent = window.AIAgentApp?.getCurrentSubAgent();
                const resources = window.AIAgentApp?.getSubAgentResources(currentSubAgent?.id);
                const hasWebSearchMCP = resources?.mcp?.some(m => m?.id === 'mcp_web_search');
                window.Logger?.debug(`搜索配置检查: webSearchEnabled=${webSearchEnabled}, hasWebSearchMCP=${hasWebSearchMCP}, subAgent=${currentSubAgent?.id}`);
                
                // 并行搜索：同时使用多个搜索源
                const allResults = await this.performParallelWebSearch(query, retryCount);
                if (allResults && allResults.length > 0) {
                    window.Logger?.info(`并行搜索完成，共获得${allResults.length}个结果`);
                    return allResults.slice(0, 10); // 返回前10个结果
                }
                
                // 如果并行搜索失败，使用原来的串行方法作为降级方案
                window.Logger?.warn('并行搜索失败，使用串行搜索作为降级方案');
                
                // 降级方案：串行搜索（如果并行搜索失败）
                // 方法1: 使用DuckDuckGo Instant Answer API（无需API密钥）
                let ddgTimeoutMs = 15000 + (retryCount * 5000); // 首次15秒，每次重试增加5秒
                try {
                    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), ddgTimeoutMs);
                    
                    const ddgResponse = await fetch(ddgUrl, {
                        signal: controller.signal,
                        headers: {
                            'Accept': 'application/json',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
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
                        window.Logger?.warn(`DuckDuckGo API请求超时（${ddgTimeoutMs}ms），尝试备用方法`);
                    } else {
                        window.Logger?.warn('DuckDuckGo搜索失败，尝试备用方法', ddgError.message);
                    }
                }
                
                // 方法2: 使用Jina AI Reader API搜索（如果配置了API密钥，优先使用）
                const jinaApiKey = window.AIAgentApp?.getJinaAIKey?.() || '';
                let jinaTimeoutMs = 20000 + (retryCount * 5000); // 增加超时时间到20秒
                if (jinaApiKey) {
                    // 定义多个搜索源（按优先级）
                    const searchSources = [
                        {
                            name: 'DuckDuckGo',
                            url: `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
                            priority: 1
                        },
                        {
                            name: 'Bing',
                            url: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
                            priority: 2
                        },
                        {
                            name: '百度',
                            url: `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`,
                            priority: 3
                        },
                        {
                            name: '今日头条',
                            url: `https://www.toutiao.com/search/?keyword=${encodeURIComponent(query)}`,
                            priority: 4
                        }
                    ];
                    
                    // 尝试每个搜索源
                    for (const source of searchSources) {
                        try {
                            window.Logger?.info(`尝试使用Jina AI搜索 ${source.name}`);
                            const searchHeaders = {
                                'X-Return-Format': 'text',
                                'Authorization': `Bearer ${jinaApiKey}`,
                                'Accept': 'text/plain'
                            };
                            
                            const jinaSearchUrl = `https://r.jina.ai/${source.url}`;
                            
                            const controller = new AbortController();
                            const timeoutId = setTimeout(() => controller.abort(), jinaTimeoutMs);
                            
                            const jinaResponse = await fetch(jinaSearchUrl, {
                                headers: searchHeaders,
                                signal: controller.signal
                            });
                            clearTimeout(timeoutId);
                        
                            if (jinaResponse.ok) {
                                const content = await jinaResponse.text();
                                
                                // 根据搜索源选择解析方法
                                let results = [];
                                if (source.name === 'DuckDuckGo') {
                                    results = this.parseDuckDuckGoResults(content) || this.parseBingSearchResults(content);
                                } else if (source.name === 'Bing') {
                                    results = this.parseBingSearchResults(content) || this.parseDuckDuckGoResults(content);
                                } else if (source.name === '百度') {
                                    results = this.parseBaiduSearchResults(content);
                                } else if (source.name === '今日头条') {
                                    results = this.parseToutiaoSearchResults(content);
                                }
                                
                                // 如果HTML解析失败，尝试从纯文本中提取搜索结果
                                if (!results || results.length === 0) {
                                    results = this.parseTextSearchResults(content, query);
                                }
                                
                                if (results && results.length > 0) {
                                    window.Logger?.info(`Jina AI搜索 ${source.name} 返回${results.length}个结果`);
                                    return results.slice(0, 5);
                                }
                                
                                // 如果所有解析方法都失败，尝试将内容作为单个结果返回（但提取关键信息）
                                if (content && content.length > 50) {
                                    window.Logger?.info(`Jina AI ${source.name} 返回了内容，但无法解析为结构化结果，使用智能提取`);
                                    const extractedResult = this.extractSearchResultFromText(content, query, source.url);
                                    if (extractedResult) {
                                        return [extractedResult];
                                    }
                                    // 最后降级：返回原始内容片段
                                    return [{
                                        title: query,
                                        url: source.url,
                                        snippet: content.substring(0, 1000)
                                    }];
                                }
                            } else {
                                window.Logger?.warn(`Jina AI搜索 ${source.name} 返回错误状态: ${jinaResponse.status}`);
                            }
                        } catch (jinaError) {
                            if (jinaError.name === 'AbortError') {
                                window.Logger?.warn(`Jina AI搜索 ${source.name} 请求超时（${jinaTimeoutMs}ms），尝试下一个搜索源`);
                            } else {
                                window.Logger?.warn(`Jina AI搜索 ${source.name} 失败: ${jinaError.message}，尝试下一个搜索源`);
                            }
                            // 继续尝试下一个搜索源
                            continue;
                        }
                    }
                }
                
                // 方法3: 使用DuckDuckGo HTML搜索作为备用方案
                let htmlTimeoutMs = 15000 + (retryCount * 5000); // 增加超时时间到15秒
                try {
                    const htmlSearchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), htmlTimeoutMs);
                    
                    const htmlResponse = await fetch(htmlSearchUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
                        },
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    
                    if (htmlResponse.ok) {
                        const html = await htmlResponse.text();
                        const results = this.parseDuckDuckGoResults(html);
                        if (results && results.length > 0) {
                            window.Logger?.info(`DuckDuckGo HTML搜索返回${results.length}个结果`);
                            return results.slice(0, 5);
                        }
                    } else {
                        window.Logger?.warn(`DuckDuckGo HTML搜索返回错误状态: ${htmlResponse.status}`);
                    }
                } catch (htmlError) {
                    if (htmlError.name === 'AbortError') {
                        window.Logger?.warn(`DuckDuckGo HTML搜索请求超时（${htmlTimeoutMs}ms）`);
                    } else {
                        window.Logger?.warn('DuckDuckGo HTML搜索失败', htmlError.message);
                    }
                }
                
                // 方法4: 尝试使用Jina AI直接搜索（如果配置了密钥，且前面的方法都失败）
                if (jinaApiKey && retryCount === 0) {
                    try {
                        window.Logger?.info('尝试使用Jina AI直接搜索（备用方法）');
                        // 直接使用Jina AI搜索API（如果支持）
                        const directSearchUrl = `https://r.jina.ai/https://www.google.com/search?q=${encodeURIComponent(query)}`;
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 25000);
                        
                        const directResponse = await fetch(directSearchUrl, {
                            headers: {
                                'X-Return-Format': 'text',
                                'Authorization': `Bearer ${jinaApiKey}`,
                                'Accept': 'text/plain'
                            },
                            signal: controller.signal
                        });
                        clearTimeout(timeoutId);
                        
                        if (directResponse.ok) {
                            const content = await directResponse.text();
                            if (content && content.length > 100) {
                                window.Logger?.info('Jina AI直接搜索返回内容');
                                return [{
                                    title: query,
                                    url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
                                    snippet: content.substring(0, 1000)
                                }];
                            }
                        }
                    } catch (directError) {
                        window.Logger?.warn('Jina AI直接搜索失败', directError.message);
                    }
                }
                
                // 方法5: 重试机制（如果还没达到最大重试次数）
                if (retryCount < MAX_RETRIES) {
                    window.Logger?.info(`搜索失败，准备重试 (${retryCount + 1}/${MAX_RETRIES})...`);
                    // 等待一段时间后重试（递增等待时间）
                    const waitTime = 2000 * (retryCount + 1);
                    window.AIAgentUI?.showSearchStatus?.(`搜索超时，${waitTime/1000}秒后重试...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    return await this.performWebSearch(query, retryCount + 1);
                }
                
                // 方法6: 如果所有方法都失败，返回提示信息并提供手动搜索链接
                window.Logger?.warn('所有搜索方法都失败，可能是网络连接问题');
                window.AIAgentUI?.showToast?.('网络搜索超时，请检查网络连接或稍后重试', 'warning');
                
                // 提供手动搜索链接作为降级方案
                const searchLinks = [
                    {
                        title: 'Google搜索',
                        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
                        snippet: '点击此链接手动搜索'
                    },
                    {
                        title: 'DuckDuckGo搜索',
                        url: `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
                        snippet: '点击此链接手动搜索'
                    }
                ];
                
                return [{
                    title: '搜索服务暂时不可用',
                    url: '',
                    snippet: `网络搜索功能暂时无法使用，可能是网络连接问题或搜索服务不可访问。\n\n建议：\n1. 检查网络连接\n2. 确认防火墙设置\n3. 尝试使用代理\n4. 稍后重试\n\n您也可以手动搜索：\n- [Google搜索](https://www.google.com/search?q=${encodeURIComponent(query)})\n- [DuckDuckGo搜索](https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)})`
                }, ...searchLinks];
            } catch (error) {
                window.Logger?.error('网络搜索异常', error);
                window.ErrorHandler?.handle(error, {
                    type: window.ErrorType?.NETWORK,
                    showToast: false,
                    logError: true
                });
                
                // 如果是重试次数未达到上限，尝试重试
                if (retryCount < MAX_RETRIES) {
                    window.Logger?.info(`搜索异常，准备重试 (${retryCount + 1}/${MAX_RETRIES})...`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                    return await this.performWebSearch(query, retryCount + 1);
                }
                
                return [{
                    title: '搜索失败',
                    url: '',
                    snippet: `搜索失败: ${error.message}。请检查网络连接或稍后重试。`
                }];
            }
        },
        
        // ==================== 并行网络搜索 ====================
        async performParallelWebSearch(query, retryCount = 0) {
            const jinaApiKey = window.AIAgentApp?.getJinaAIKey?.() || '';
            const timeoutMs = 20000 + (retryCount * 5000);
            
            // 定义所有搜索源（同时执行）
            const searchSources = [
                {
                    name: 'DuckDuckGo API',
                    type: 'api',
                    url: `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
                    parser: (data) => {
                        if (data.AbstractText) {
                            return [{
                                title: data.Heading || query,
                                url: data.AbstractURL || '',
                                snippet: data.AbstractText,
                                source: 'DuckDuckGo API'
                            }];
                        }
                        if (data.RelatedTopics && data.RelatedTopics.length > 0) {
                            return data.RelatedTopics.slice(0, 5).map(topic => ({
                                title: topic.Text?.split(' - ')[0] || query,
                                url: topic.FirstURL || '',
                                snippet: topic.Text || '',
                                source: 'DuckDuckGo API'
                            }));
                        }
                        return [];
                    }
                },
                {
                    name: 'DuckDuckGo HTML',
                    type: 'html',
                    url: `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
                    parser: (html) => this.parseDuckDuckGoResults(html).map(r => ({...r, source: 'DuckDuckGo HTML'}))
                }
            ];
            
            // 如果配置了Jina AI，添加更多搜索源
            if (jinaApiKey) {
                searchSources.push(
                    {
                        name: 'Bing',
                        type: 'jina',
                        url: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
                        jinaUrl: `https://r.jina.ai/https://www.bing.com/search?q=${encodeURIComponent(query)}`,
                        parser: (content) => {
                            let results = this.parseBingSearchResults(content) || this.parseDuckDuckGoResults(content);
                            if (!results || results.length === 0) {
                                results = this.parseTextSearchResults(content, query);
                            }
                            return (results || []).map(r => ({...r, source: 'Bing'}));
                        }
                    },
                    {
                        name: '百度',
                        type: 'jina',
                        url: `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`,
                        jinaUrl: `https://r.jina.ai/https://www.baidu.com/s?wd=${encodeURIComponent(query)}`,
                        parser: (content) => {
                            let results = this.parseBaiduSearchResults(content);
                            if (!results || results.length === 0) {
                                results = this.parseTextSearchResults(content, query);
                            }
                            return (results || []).map(r => ({...r, source: '百度'}));
                        }
                    },
                    {
                        name: '今日头条',
                        type: 'jina',
                        url: `https://www.toutiao.com/search/?keyword=${encodeURIComponent(query)}`,
                        jinaUrl: `https://r.jina.ai/https://www.toutiao.com/search/?keyword=${encodeURIComponent(query)}`,
                        parser: (content) => {
                            let results = this.parseToutiaoSearchResults(content);
                            if (!results || results.length === 0) {
                                results = this.parseTextSearchResults(content, query);
                            }
                            return (results || []).map(r => ({...r, source: '今日头条'}));
                        }
                    },
                    {
                        name: '抖音',
                        type: 'jina',
                        url: `https://www.douyin.com/search/${encodeURIComponent(query)}`,
                        jinaUrl: `https://r.jina.ai/https://www.douyin.com/search/${encodeURIComponent(query)}`,
                        parser: (content) => {
                            let results = this.parseDouyinSearchResults(content);
                            if (!results || results.length === 0) {
                                results = this.parseTextSearchResults(content, query);
                            }
                            return (results || []).map(r => ({...r, source: '抖音'}));
                        }
                    },
                    {
                        name: '小红书',
                        type: 'jina',
                        url: `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(query)}`,
                        jinaUrl: `https://r.jina.ai/https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(query)}`,
                        parser: (content) => {
                            let results = this.parseXiaohongshuSearchResults(content);
                            if (!results || results.length === 0) {
                                results = this.parseTextSearchResults(content, query);
                            }
                            return (results || []).map(r => ({...r, source: '小红书'}));
                        }
                    },
                    {
                        name: 'CNN',
                        type: 'jina',
                        url: `https://www.cnn.com/search?q=${encodeURIComponent(query)}`,
                        jinaUrl: `https://r.jina.ai/https://www.cnn.com/search?q=${encodeURIComponent(query)}`,
                        parser: (content) => {
                            let results = this.parseCNNSearchResults(content);
                            if (!results || results.length === 0) {
                                results = this.parseTextSearchResults(content, query);
                            }
                            return (results || []).map(r => ({...r, source: 'CNN'}));
                        }
                    },
                    {
                        name: 'BBC',
                        type: 'jina',
                        url: `https://www.bbc.com/search?q=${encodeURIComponent(query)}`,
                        jinaUrl: `https://r.jina.ai/https://www.bbc.com/search?q=${encodeURIComponent(query)}`,
                        parser: (content) => {
                            let results = this.parseBBCSearchResults(content);
                            if (!results || results.length === 0) {
                                results = this.parseTextSearchResults(content, query);
                            }
                            return (results || []).map(r => ({...r, source: 'BBC'}));
                        }
                    }
                );
            }
            
            // 并行执行所有搜索
            window.Logger?.info(`开始并行搜索，共${searchSources.length}个搜索源`);
            const searchPromises = searchSources.map(source => 
                this.searchSingleSource(source, query, timeoutMs, jinaApiKey)
                    .then(results => {
                        window.Logger?.info(`${source.name}: 返回${results?.length || 0}个结果`);
                        return results || [];
                    })
                    .catch(error => {
                        // 超时或错误时，有多少算多少，不强制要求
                        if (error.message.includes('超时') || error.message.includes('timeout')) {
                            window.Logger?.info(`${source.name}: 搜索超时，已返回${0}个结果（符合预期）`);
                        } else {
                            window.Logger?.warn(`${source.name}: 搜索失败 - ${error.message}`);
                        }
                        return [];
                    })
            );
            
            // 等待所有搜索完成（使用 allSettled 确保即使部分失败也继续）
            const searchResults = await Promise.allSettled(searchPromises);
            
            // 合并所有结果
            const allResults = [];
            searchResults.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value && result.value.length > 0) {
                    allResults.push(...result.value);
                }
            });
            
            // 去重和排序
            const uniqueResults = this.deduplicateSearchResults(allResults);
            const sortedResults = this.sortSearchResults(uniqueResults, query);
            
            window.Logger?.info(`并行搜索完成: 原始结果${allResults.length}个，去重后${sortedResults.length}个`);
            return sortedResults;
        },
        
        // 单个搜索源搜索
        async searchSingleSource(source, query, timeoutMs, jinaApiKey) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
            
            try {
                let response;
                
                if (source.type === 'jina' && jinaApiKey) {
                    // 使用Jina AI解析
                    response = await fetch(source.jinaUrl, {
                        headers: {
                            'X-Return-Format': 'text',
                            'Authorization': `Bearer ${jinaApiKey}`,
                            'Accept': 'text/plain'
                        },
                        signal: controller.signal
                    });
                } else if (source.type === 'api') {
                    // API调用
                    response = await fetch(source.url, {
                        headers: {
                            'Accept': 'application/json',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        },
                        signal: controller.signal
                    });
                } else {
                    // HTML直接访问
                    response = await fetch(source.url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
                        },
                        signal: controller.signal
                    });
                }
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                // 解析结果
                const MIN_RESULTS_PER_SOURCE = 5;
                
                if (source.type === 'api') {
                    const data = await response.json();
                    let results = source.parser(data) || [];
                    
                    // 确保至少返回5个结果（如果API返回了结果）
                    if (results.length > 0 && results.length < MIN_RESULTS_PER_SOURCE) {
                        window.Logger?.debug(`${source.name}: API返回${results.length}个结果，尝试扩展`);
                        
                        // 如果API返回的是结构化数据，尝试从响应中提取更多信息
                        if (data && typeof data === 'object') {
                            // 尝试从RelatedTopics、Results等字段提取更多结果
                            if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
                                const existingUrls = new Set();
                                results.forEach(r => {
                                    if (r && r.url && typeof r.url === 'string') {
                                        existingUrls.add(r.url);
                                    }
                                });
                                
                                for (const topic of data.RelatedTopics) {
                                    if (results.length >= MIN_RESULTS_PER_SOURCE) break;
                                    if (topic.FirstURL && !existingUrls.has(topic.FirstURL)) {
                                        results.push({
                                            title: topic.Text?.split(' - ')[0] || query,
                                            url: topic.FirstURL,
                                            snippet: topic.Text || '',
                                            source: source.name
                                        });
                                        existingUrls.add(topic.FirstURL);
                                    }
                                }
                            }
                            
                            // 如果仍然不够，尝试将响应转换为文本并解析
                            if (results.length < MIN_RESULTS_PER_SOURCE) {
                                try {
                                    const contentStr = JSON.stringify(data);
                                    const textResults = this.parseTextSearchResults(contentStr, query);
                                    if (textResults && textResults.length > 0) {
                                        const existingUrls = new Set();
                                        results.forEach(r => {
                                            if (r && r.url && typeof r.url === 'string') {
                                                existingUrls.add(r.url);
                                            }
                                        });
                                        
                                        for (const textResult of textResults) {
                                            if (results.length >= MIN_RESULTS_PER_SOURCE) break;
                                            if (textResult && textResult.url && 
                                                typeof textResult.url === 'string' && 
                                                !existingUrls.has(textResult.url)) {
                                                results.push({...textResult, source: source.name});
                                                existingUrls.add(textResult.url);
                                            }
                                        }
                                    }
                                } catch (e) {
                                    window.Logger?.warn(`${source.name}: API结果扩展失败`, e);
                                }
                            }
                        }
                    }
                    
                    // 为所有结果添加source标记
                    results = results.map(r => ({...r, source: source.name}));
                    
                    return results;
                } else {
                    const content = await response.text();
                    let results = source.parser(content) || [];
                    
                    // 检查内容质量（判断是否为登录页、错误页等）
                    const isLowQualityContent = this.isLowQualitySearchContent(content);
                    
                    // 如果解析失败或结果太少，尝试智能提取
                    if (results.length < MIN_RESULTS_PER_SOURCE) {
                        window.Logger?.debug(`${source.name}: 解析得到${results.length}个结果，尝试智能提取更多结果`);
                        
                        // 调试：记录内容长度和前500字符
                        if (content && content.length > 0) {
                            window.Logger?.debug(`${source.name}: 内容长度=${content.length}, 前500字符=${content.substring(0, 500)}`);
                            
                            // 统计URL数量
                            const urlMatches = content.match(/https?:\/\/[^\s\)]+/gi);
                            const urlCount = urlMatches ? urlMatches.length : 0;
                            window.Logger?.debug(`${source.name}: 内容中发现${urlCount}个URL`);
                            
                            // 如果内容质量低（登录页、错误页），降低要求
                            if (isLowQualityContent) {
                                window.Logger?.info(`${source.name}: 检测到低质量内容（可能是登录页或错误页），降低结果要求`);
                            }
                        }
                        
                        // 构建现有URL集合（只包含有效的URL）
                        const existingUrls = new Set();
                        results.forEach(r => {
                            if (r && r.url && typeof r.url === 'string' && r.url.startsWith('http')) {
                                existingUrls.add(r.url);
                            }
                        });
                        
                        // 尝试使用parseTextSearchResults提取更多结果
                        const textResults = this.parseTextSearchResults(content, query);
                        window.Logger?.debug(`${source.name}: parseTextSearchResults提取到${textResults ? textResults.length : 0}个结果`);
                        if (textResults && textResults.length > 0) {
                            for (const textResult of textResults) {
                                // 检查URL是否存在且有效
                                if (textResult && textResult.url && typeof textResult.url === 'string' && 
                                    textResult.url.startsWith('http') && !existingUrls.has(textResult.url) && 
                                    results.length < 15) {
                                    results.push(textResult);
                                    existingUrls.add(textResult.url);
                                }
                            }
                        }
                        
                        // 如果仍然不够，使用extractSearchResultFromText
                        if (results.length < MIN_RESULTS_PER_SOURCE) {
                            const extracted = this.extractSearchResultFromText(content, query, source.url);
                            window.Logger?.debug(`${source.name}: extractSearchResultFromText提取到${extracted ? extracted.length : 0}个结果`);
                            if (extracted && extracted.length > 0) {
                                for (const extResult of extracted) {
                                    // 检查URL是否存在且有效
                                    if (extResult && extResult.url && typeof extResult.url === 'string' && 
                                        extResult.url.startsWith('http') && !existingUrls.has(extResult.url) && 
                                        results.length < 15) {
                                        results.push(extResult);
                                        existingUrls.add(extResult.url);
                                    }
                                }
                            }
                        }
                        
                        // 如果仍然不够，尝试更激进的URL提取
                        if (results.length < MIN_RESULTS_PER_SOURCE && !isLowQualityContent) {
                            window.Logger?.debug(`${source.name}: 尝试激进URL提取`);
                            const aggressiveResults = this.extractUrlsAggressively(content, query, source.url, existingUrls);
                            if (aggressiveResults && aggressiveResults.length > 0) {
                                aggressiveResults.forEach(r => {
                                    if (results.length < 15 && r.url && !existingUrls.has(r.url)) {
                                        results.push(r);
                                        existingUrls.add(r.url);
                                    }
                                });
                                window.Logger?.debug(`${source.name}: 激进提取得到${aggressiveResults.length}个结果`);
                            }
                        }
                        
                        // 如果仍然不够且fallbackUrl可用，添加fallback结果（仅在内容质量正常时）
                        if (results.length < MIN_RESULTS_PER_SOURCE && source.url && 
                            source.url.startsWith('http') && !existingUrls.has(source.url) && !isLowQualityContent) {
                            const fallbackResult = {
                                title: query,
                                url: source.url,
                                snippet: content.substring(0, 300).trim() || '搜索结果页面'
                            };
                            results.push(fallbackResult);
                            existingUrls.add(source.url);
                        }
                    }
                    
                    // 为所有结果添加source标记
                    results = results.map(r => ({...r, source: source.name}));
                    
                    // 记录最终结果数量（根据内容质量调整日志级别）
                    if (results.length >= MIN_RESULTS_PER_SOURCE) {
                        window.Logger?.debug(`${source.name}: 最终返回${results.length}个结果（满足最少5个要求）`);
                    } else if (isLowQualityContent) {
                        // 低质量内容（登录页、错误页）是预期情况，使用info而非warn
                        window.Logger?.info(`${source.name}: 返回${results.length}个结果（内容为登录页或错误页，符合预期）`);
                    } else {
                        // 正常内容但结果不足，记录警告
                        window.Logger?.warn(`${source.name}: 仅返回${results.length}个结果（少于5个，可能内容不足）`);
                    }
                    
                    return results;
                }
            } catch (error) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    throw new Error('请求超时');
                }
                throw error;
            }
        },
        
        // 去重搜索结果
        deduplicateSearchResults(results) {
            const seen = new Set();
            const unique = [];
            
            for (const result of results) {
                // 使用URL作为唯一标识（标准化URL）
                const normalizedUrl = this.normalizeUrl(result.url);
                const key = `${normalizedUrl}|${result.title?.substring(0, 50)}`;
                
                if (!seen.has(key) && result.url && result.title) {
                    seen.add(key);
                    unique.push(result);
                }
            }
            
            return unique;
        },
        
        // 标准化URL（移除参数、协议等）
        normalizeUrl(url) {
            if (!url) return '';
            try {
                const urlObj = new URL(url);
                return `${urlObj.hostname}${urlObj.pathname}`.toLowerCase();
            } catch {
                return url.toLowerCase();
            }
        },
        
        // 排序搜索结果（按相关性和来源优先级）
        sortSearchResults(results, query) {
            const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
            const sourcePriority = {
                'DuckDuckGo API': 1,
                'Bing': 2,
                '百度': 3,
                'CNN': 4,
                'BBC': 5,
                'DuckDuckGo HTML': 6,
                '今日头条': 7,
                '抖音': 8,
                '小红书': 9
            };
            
            return results.sort((a, b) => {
                // 计算相关性分数
                const scoreA = this.calculateRelevanceScore(a, queryWords, sourcePriority);
                const scoreB = this.calculateRelevanceScore(b, queryWords, sourcePriority);
                
                return scoreB - scoreA; // 降序
            });
        },
        
        // 计算相关性分数
        calculateRelevanceScore(result, queryWords, sourcePriority) {
            let score = 0;
            
            // 来源优先级
            const sourceScore = sourcePriority[result.source] || 10;
            score += (11 - sourceScore) * 10; // 优先级越高分数越高
            
            // 标题匹配
            const titleLower = (result.title || '').toLowerCase();
            queryWords.forEach(word => {
                if (titleLower.includes(word)) {
                    score += 5;
                }
            });
            
            // 摘要匹配
            const snippetLower = (result.snippet || '').toLowerCase();
            queryWords.forEach(word => {
                if (snippetLower.includes(word)) {
                    score += 2;
                }
            });
            
            // URL质量（优先.com, .org等）
            if (result.url) {
                if (result.url.includes('.com') || result.url.includes('.org')) {
                    score += 1;
                }
            }
            
            return score;
        },

        parseBingSearchResults(content) {
            const results = [];
            const MIN_RESULTS = 5;
            
            try {
                // 使用正则表达式解析Bing搜索结果
                // Bing搜索结果通常在特定的HTML结构中
                const titleRegex = /<h2[^>]*><a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a><\/h2>/gi;
                const snippetRegex = /<p[^>]*class="[^"]*b_caption[^"]*"[^>]*>(.*?)<\/p>/gi;
                
                const titles = [];
                let match;
                while ((match = titleRegex.exec(content)) !== null && titles.length < 15) {
                    const url = match[1];
                    const title = this.stripHtmlTags(match[2]);
                    if (title && url && !url.startsWith('javascript:')) {
                        titles.push({ title, url });
                    }
                }
                
                const snippets = [];
                while ((match = snippetRegex.exec(content)) !== null && snippets.length < 15) {
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
                
                // 如果结果不够，尝试其他选择器
                if (results.length < MIN_RESULTS) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(content, 'text/html');
                    
                    // 尝试其他Bing搜索结果选择器
                    const altSelectors = [
                        'li.b_algo',
                        '.b_algo',
                        '[data-bm]',
                        '.b_title a',
                        'h2 a'
                    ];
                    
                    for (const selector of altSelectors) {
                        if (results.length >= MIN_RESULTS) break;
                        
                        const elements = doc.querySelectorAll(selector);
                        for (const element of elements) {
                            if (results.length >= 15) break;
                            
                            const link = element.tagName === 'A' ? element : element.querySelector('a');
                            if (link) {
                                const url = link.getAttribute('href') || '';
                                const title = link.textContent.trim() || element.textContent.trim();
                                
                                if (title && url && !url.startsWith('javascript:') && 
                                    !results.some(r => r && r.url && r.url === url)) {
                                    // 查找摘要
                                    const parent = element.closest('li, .b_algo, [data-bm]');
                                    const snippetEl = parent?.querySelector('.b_caption, p, .b_descript');
                                    const snippet = snippetEl ? snippetEl.textContent.trim() : '';
                                    
                                    results.push({
                                        title: title.substring(0, 200),
                                        url: url,
                                        snippet: snippet.substring(0, 300)
                                    });
                                }
                            }
                        }
                    }
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
        
        // 从纯文本中解析搜索结果（Jina AI返回的文本格式）
        parseTextSearchResults(text, query) {
            const results = [];
            const MIN_RESULTS = 5; // 最少返回5个结果
            try {
                // 尝试匹配类似搜索结果的文本模式
                // 模式1: 标题 - URL格式
                const titleUrlPattern = /(.+?)\s*[-–—]\s*(https?:\/\/[^\s]+)/gi;
                let match;
                while ((match = titleUrlPattern.exec(text)) !== null && results.length < 15) {
                    const title = match[1].trim();
                    const url = match[2].trim();
                    if (title.length > 5 && url.startsWith('http')) {
                        // 检查是否已存在相同URL
                        if (results.some(r => r.url === url)) continue;
                        
                        // 查找该URL后面的内容作为摘要
                        const searchStart = (match.index !== undefined) ? match.index : 0;
                        const urlIndex = text.indexOf(url, searchStart);
                        const snippetStart = urlIndex + url.length;
                        const snippet = text.substring(snippetStart, snippetStart + 200).trim();
                        
                        results.push({
                            title: title,
                            url: url,
                            snippet: snippet || ''
                        });
                    }
                }
                
                // 模式2: 查找包含URL的行（更积极的提取）
                if (results.length < MIN_RESULTS) {
                    const lines = text.split('\n');
                    let currentTitle = '';
                    let urlCount = 0;
                    for (let i = 0; i < lines.length && results.length < 15; i++) {
                        const line = lines[i].trim();
                        const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
                        if (urlMatch) {
                            const url = urlMatch[1];
                            // 使用前一行作为标题，当前行作为摘要
                            const title = i > 0 && lines[i - 1].trim().length > 5 
                                ? lines[i - 1].trim() 
                                : (currentTitle || query);
                            const snippet = line.replace(url, '').trim();
                            
                            if (title.length > 3 && url.startsWith('http')) {
                                // 检查是否已存在相同URL（只检查有URL的结果）
                                const exists = results.some(r => r && r.url && r.url === url);
                                if (!exists) {
                                    results.push({
                                        title: title.substring(0, 100),
                                        url: url,
                                        snippet: snippet.substring(0, 200)
                                    });
                                    urlCount++;
                                }
                            }
                            currentTitle = ''; // 重置当前标题
                        } else if (line.length > 10 && !currentTitle) {
                            currentTitle = line;
                        }
                    }
                }
                
                // 模式3: 如果还不够，尝试从段落中提取（更宽松的匹配）
                if (results.length < MIN_RESULTS) {
                    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 20);
                    const queryWords = query.split(/\s+/).filter(w => w.length > 1);
                    
                    for (const para of paragraphs) {
                        if (results.length >= 15) break;
                        
                        const urlMatch = para.match(/(https?:\/\/[^\s]+)/);
                        if (urlMatch) {
                            const url = urlMatch[1];
                            // 检查是否已存在（只检查有URL的结果）
                            if (results.some(r => r && r.url && r.url === url)) continue;
                            
                            // 提取标题（包含查询关键词的句子）
                            let title = query;
                            const sentences = para.split(/[。！？\n]/);
                            for (const sentence of sentences) {
                                if (queryWords.some(word => sentence.includes(word)) && sentence.length > 10) {
                                    title = sentence.trim().substring(0, 100);
                                    break;
                                }
                            }
                            if (title === query && sentences[0]) {
                                title = sentences[0].trim().substring(0, 100);
                            }
                            
                            const snippet = para.replace(url, '').trim().substring(0, 200);
                            
                            results.push({
                                title: title,
                                url: url,
                                snippet: snippet
                            });
                        }
                    }
                }
                
                // 模式4: 如果仍然不够，尝试从HTML链接中提取（即使文本格式也可能包含HTML）
                if (results.length < MIN_RESULTS) {
                    const linkPattern = /<a[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>(.*?)<\/a>/gi;
                    let linkMatch;
                    while ((linkMatch = linkPattern.exec(text)) !== null && results.length < 15) {
                        const url = linkMatch[1];
                        const linkText = this.stripHtmlTags(linkMatch[2]);
                        
                        // 检查是否已存在（只检查有URL的结果）
                        if (results.some(r => r && r.url && r.url === url)) continue;
                        
                        if (linkText.length > 5 && url.startsWith('http')) {
                            // 查找链接周围的文本作为摘要
                            const linkIndex = linkMatch.index;
                            const beforeText = text.substring(Math.max(0, linkIndex - 100), linkIndex);
                            const afterText = text.substring(linkIndex + linkMatch[0].length, linkIndex + linkMatch[0].length + 100);
                            const snippet = (beforeText + ' ' + afterText).trim().substring(0, 200);
                            
                            results.push({
                                title: linkText.substring(0, 100),
                                url: url,
                                snippet: snippet
                            });
                        }
                    }
                }
            } catch (error) {
                window.Logger?.warn('解析文本搜索结果失败', error);
            }
            
            // 确保至少返回5个结果（如果可能）
            return results.length >= MIN_RESULTS ? results.slice(0, 15) : results;
        },
        
        // 激进URL提取（当常规方法失败时使用）
        extractUrlsAggressively(text, query, fallbackUrl, existingUrls) {
            const results = [];
            const MIN_RESULTS = 5;
            
            try {
                if (!text || text.length < 50) return results;
                
                // 提取所有可能的URL（更宽松的模式）
                const urlPatterns = [
                    /https?:\/\/[^\s\)\]\}]+/gi,  // 标准URL
                    /www\.[^\s\)\]\}]+\.[a-z]{2,}/gi,  // www.xxx.com格式
                    /[a-z0-9-]+\.(com|org|net|edu|gov|cn|io|co|uk|de|fr|jp|kr)[^\s\)\]\}]*/gi  // 域名格式
                ];
                
                const allUrls = new Set();
                urlPatterns.forEach(pattern => {
                    let match;
                    while ((match = pattern.exec(text)) !== null && allUrls.size < 30) {
                        let url = match[0].trim();
                        // 清理URL
                        url = url.replace(/[.,;:!?]+$/, '');
                        url = url.replace(/[)\]}]$/, '');
                        
                        // 标准化URL
                        if (!url.startsWith('http')) {
                            if (url.startsWith('www.')) {
                                url = 'https://' + url;
                            } else if (url.includes('.')) {
                                url = 'https://' + url;
                            } else {
                                continue;
                            }
                        }
                        
                        if (url.startsWith('http') && url.length > 10 && url.length < 200) {
                            allUrls.add(url);
                        }
                    }
                });
                
                // 为每个URL创建结果
                const queryWords = query.split(/\s+/).filter(w => w.length > 1);
                const lines = text.split('\n').filter(l => l.trim().length > 5);
                
                for (const url of Array.from(allUrls).slice(0, 15)) {
                    if (results.length >= MIN_RESULTS) break;
                    if (existingUrls && existingUrls.has(url)) continue;
                    
                    // 查找URL周围的文本
                    const urlIndex = text.indexOf(url);
                    if (urlIndex === -1) continue;
                    
                    // 提取上下文（前后各200字符）
                    const start = Math.max(0, urlIndex - 200);
                    const end = Math.min(text.length, urlIndex + url.length + 200);
                    const context = text.substring(start, end);
                    
                    // 提取标题
                    let title = query;
                    const contextLines = context.split('\n').filter(l => l.trim().length > 5);
                    
                    // 查找包含查询关键词的行
                    for (const line of contextLines) {
                        if (queryWords.some(word => line.toLowerCase().includes(word.toLowerCase())) && 
                            line.length > 10 && line.length < 150) {
                            title = line.trim().substring(0, 100);
                            break;
                        }
                    }
                    
                    // 如果没找到，使用URL前的文本
                    if (title === query && contextLines.length > 0) {
                        const beforeUrl = text.substring(Math.max(0, urlIndex - 100), urlIndex);
                        const beforeLines = beforeUrl.split('\n').filter(l => l.trim().length > 5);
                        if (beforeLines.length > 0) {
                            title = beforeLines[beforeLines.length - 1].trim().substring(0, 100);
                        }
                    }
                    
                    // 提取摘要
                    const snippet = context.replace(url, '').trim().substring(0, 200);
                    
                    results.push({
                        title: title || query,
                        url: url,
                        snippet: snippet || ''
                    });
                }
            } catch (error) {
                window.Logger?.warn('激进URL提取失败', error);
            }
            
            return results;
        },
        
        // 从文本中智能提取多个搜索结果（至少5个）
        extractSearchResultFromText(text, query, fallbackUrl) {
            const MIN_RESULTS = 5;
            const results = [];
            
            try {
                // 首先尝试使用parseTextSearchResults提取
                const parsedResults = this.parseTextSearchResults(text, query);
                if (parsedResults && parsedResults.length > 0) {
                    results.push(...parsedResults);
                }
                
                // 如果还不够，尝试更积极的提取策略
                if (results.length < MIN_RESULTS) {
                    // 提取所有URL（使用多种模式）
                    const urlPatterns = [
                        /(https?:\/\/[^\s\)\]\}]+)/gi,  // 标准URL
                        /(www\.[^\s\)\]\}]+\.[a-z]{2,})/gi,  // www.xxx.com
                        /([a-z0-9-]+\.(com|org|net|edu|gov|cn|io|co|uk|de|fr|jp|kr)[^\s\)\]\}]*)/gi  // 域名
                    ];
                    
                    const urls = [];
                    urlPatterns.forEach(pattern => {
                        let urlMatch;
                        while ((urlMatch = pattern.exec(text)) !== null && urls.length < 30) {
                            let url = urlMatch[1].replace(/[.,;:!?]+$/, ''); // 移除末尾标点
                            url = url.replace(/[)\]}]$/, '');
                            
                            // 标准化URL
                            if (!url.startsWith('http')) {
                                if (url.startsWith('www.')) {
                                    url = 'https://' + url;
                                } else if (url.includes('.')) {
                                    url = 'https://' + url;
                                } else {
                                    continue;
                                }
                            }
                            
                            if (url.startsWith('http') && url.length > 10 && url.length < 200 && !urls.includes(url)) {
                                urls.push(url);
                            }
                        }
                    });
                    
                    // 为每个URL创建结果
                    const queryWords = query.split(/\s+/).filter(w => w.length > 1);
                    for (const url of urls.slice(0, 15)) {
                        if (results.length >= 15) break;
                        
                        // 检查是否已存在（只检查有URL的结果）
                        if (results.some(r => r && r.url && r.url === url)) continue;
                        
                        // 查找URL在文本中的所有出现位置，使用第一个有效位置
                        let urlIndex = -1;
                        let searchStart = 0;
                        while (searchStart < text.length) {
                            const index = text.indexOf(url, searchStart);
                            if (index === -1) break;
                            
                            // 检查URL前后是否有有效字符（不是URL的一部分）
                            const beforeChar = index > 0 ? text[index - 1] : ' ';
                            const afterChar = index + url.length < text.length ? text[index + url.length] : ' ';
                            
                            // URL前后应该是空格、标点或换行，而不是字母数字
                            if (!/[a-zA-Z0-9]/.test(beforeChar) && !/[a-zA-Z0-9]/.test(afterChar)) {
                                urlIndex = index;
                                break;
                            }
                            
                            searchStart = index + 1;
                        }
                        
                        if (urlIndex === -1) continue;
                        
                        // 提取标题（URL前的文本或包含查询关键词的句子）
                        let title = query;
                        const beforeText = text.substring(Math.max(0, urlIndex - 200), urlIndex);
                        const afterText = text.substring(urlIndex + url.length, urlIndex + url.length + 200);
                        
                        // 尝试从前后文本中提取标题
                        const context = (beforeText + ' ' + afterText).trim();
                        const sentences = context.split(/[。！？\n]/);
                        
                        for (const sentence of sentences) {
                            if (queryWords.some(word => sentence.includes(word)) && sentence.length > 10) {
                                title = sentence.trim().substring(0, 100);
                                break;
                            }
                        }
                        
                        if (title === query && sentences.length > 0) {
                            title = sentences[0].trim().substring(0, 100) || query;
                        }
                        
                        // 提取摘要（URL前后的文本）
                        const snippet = context.substring(0, 200).trim();
                        
                        results.push({
                            title: title,
                            url: url,
                            snippet: snippet || ''
                        });
                    }
                }
                
                // 如果仍然不够，使用fallbackUrl补充结果
                if (results.length < MIN_RESULTS && fallbackUrl && fallbackUrl.startsWith('http')) {
                    // 检查fallbackUrl是否已存在
                    const fallbackExists = results.some(r => r && r.url && r.url === fallbackUrl);
                    if (!fallbackExists) {
                        const lines = text.split('\n').filter(l => l.trim().length > 5);
                        const queryWords = query.split(/\s+/).filter(w => w.length > 1);
                        
                        let title = query;
                        for (const line of lines.slice(0, 5)) {
                            if (queryWords.some(word => line.includes(word)) && line.length > 10) {
                                title = line.trim().substring(0, 100);
                                break;
                            }
                        }
                        if (title === query && lines[0]) {
                            title = lines[0].trim().substring(0, 100);
                        }
                        
                        results.push({
                            title: title,
                            url: fallbackUrl,
                            snippet: text.substring(0, 500).trim()
                        });
                    }
                }
                
                // 返回至少5个结果（如果可能）
                return results.length >= MIN_RESULTS ? results.slice(0, 15) : results;
            } catch (error) {
                window.Logger?.warn('提取搜索结果失败', error);
                // 即使出错也返回一个基本结果
                if (fallbackUrl) {
                    return [{
                        title: query,
                        url: fallbackUrl,
                        snippet: text.substring(0, 500).trim()
                    }];
                }
                return [];
            }
        },

        // 解析百度搜索结果
        parseBaiduSearchResults(html) {
            const results = [];
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                // 百度搜索结果选择器
                const resultElements = doc.querySelectorAll('.result, .c-container, [data-log]');
                
                resultElements.forEach((element, index) => {
                    if (index >= 10) return;
                    
                    const titleElement = element.querySelector('h3 a, .t a, a[href*="baidu.com/link"]');
                    const snippetElement = element.querySelector('.c-abstract, .c-span9, .content-right_8Zs40');
                    
                    if (titleElement) {
                        const title = titleElement.textContent.trim();
                        const url = titleElement.getAttribute('href') || '';
                        const snippet = snippetElement ? snippetElement.textContent.trim() : '';
                        
                        if (title && url) {
                            results.push({
                                title: title,
                                url: url.startsWith('http') ? url : `https://www.baidu.com${url}`,
                                snippet: snippet.substring(0, 200)
                            });
                        }
                    }
                });
                
                // 如果DOM解析失败，尝试正则表达式
                if (results.length === 0) {
                    const titleRegex = /<h3[^>]*><a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a><\/h3>/gi;
                    let match;
                    while ((match = titleRegex.exec(html)) !== null && results.length < 10) {
                        const url = match[1];
                        const title = this.stripHtmlTags(match[2]);
                        if (title && url) {
                            results.push({
                                title: title,
                                url: url.startsWith('http') ? url : `https://www.baidu.com${url}`,
                                snippet: ''
                            });
                        }
                    }
                }
            } catch (error) {
                window.Logger?.warn('解析百度搜索结果失败', error);
            }
            return results;
        },
        
        // 解析今日头条搜索结果
        parseToutiaoSearchResults(html) {
            const results = [];
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                // 今日头条搜索结果选择器
                const resultElements = doc.querySelectorAll('.article-item, .feed-item, [data-item-id]');
                
                resultElements.forEach((element, index) => {
                    if (index >= 10) return;
                    
                    const titleElement = element.querySelector('a[href*="toutiao.com"]');
                    const snippetElement = element.querySelector('.abstract, .feed-desc, .summary');
                    
                    if (titleElement) {
                        const title = titleElement.textContent.trim();
                        const url = titleElement.getAttribute('href') || '';
                        const snippet = snippetElement ? snippetElement.textContent.trim() : '';
                        
                        if (title && url) {
                            results.push({
                                title: title,
                                url: url.startsWith('http') ? url : `https://www.toutiao.com${url}`,
                                snippet: snippet.substring(0, 200)
                            });
                        }
                    }
                });
                
                // 如果DOM解析失败，尝试正则表达式
                if (results.length === 0) {
                    const titleRegex = /<a[^>]*href="([^"]*toutiao[^"]*)"[^>]*>(.*?)<\/a>/gi;
                    let match;
                    while ((match = titleRegex.exec(html)) !== null && results.length < 10) {
                        const url = match[1];
                        const title = this.stripHtmlTags(match[2]);
                        if (title && url && title.length > 5) {
                            results.push({
                                title: title,
                                url: url.startsWith('http') ? url : `https://www.toutiao.com${url}`,
                                snippet: ''
                            });
                        }
                    }
                }
            } catch (error) {
                window.Logger?.warn('解析今日头条搜索结果失败', error);
            }
            return results;
        },

        // 解析抖音搜索结果
        parseDouyinSearchResults(html) {
            const results = [];
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                // 抖音搜索结果选择器（抖音页面结构可能变化，使用多种选择器）
                const resultElements = doc.querySelectorAll('[data-e2e="search-result"], .video-item, [class*="video"], [class*="search-item"]');
                
                resultElements.forEach((element, index) => {
                    if (index >= 10) return;
                    
                    const titleElement = element.querySelector('a[href*="douyin.com"], .title, [class*="title"]');
                    const linkElement = element.querySelector('a[href*="douyin.com"]');
                    
                    if (titleElement || linkElement) {
                        const title = titleElement ? titleElement.textContent.trim() : (linkElement ? linkElement.textContent.trim() : '');
                        const url = linkElement ? linkElement.getAttribute('href') : '';
                        
                        if (title && url) {
                            results.push({
                                title: title.substring(0, 100),
                                url: url.startsWith('http') ? url : `https://www.douyin.com${url}`,
                                snippet: ''
                            });
                        }
                    }
                });
                
                // 如果DOM解析失败，尝试正则表达式
                if (results.length === 0) {
                    const titleRegex = /<a[^>]*href="([^"]*douyin[^"]*)"[^>]*>(.*?)<\/a>/gi;
                    let match;
                    while ((match = titleRegex.exec(html)) !== null && results.length < 10) {
                        const url = match[1];
                        const title = this.stripHtmlTags(match[2]);
                        if (title && url && title.length > 5) {
                            results.push({
                                title: title.substring(0, 100),
                                url: url.startsWith('http') ? url : `https://www.douyin.com${url}`,
                                snippet: ''
                            });
                        }
                    }
                }
            } catch (error) {
                window.Logger?.warn('解析抖音搜索结果失败', error);
            }
            return results;
        },
        
        // 解析小红书搜索结果
        parseXiaohongshuSearchResults(html) {
            const results = [];
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                // 小红书搜索结果选择器
                const resultElements = doc.querySelectorAll('[data-v-], .note-item, [class*="note"], [class*="search-item"]');
                
                resultElements.forEach((element, index) => {
                    if (index >= 10) return;
                    
                    const titleElement = element.querySelector('a[href*="xiaohongshu.com"], .title, [class*="title"]');
                    const linkElement = element.querySelector('a[href*="xiaohongshu.com"]');
                    const descElement = element.querySelector('.desc, [class*="desc"], [class*="summary"]');
                    
                    if (titleElement || linkElement) {
                        const title = titleElement ? titleElement.textContent.trim() : (linkElement ? linkElement.textContent.trim() : '');
                        const url = linkElement ? linkElement.getAttribute('href') : '';
                        const snippet = descElement ? descElement.textContent.trim() : '';
                        
                        if (title && url) {
                            results.push({
                                title: title.substring(0, 100),
                                url: url.startsWith('http') ? url : `https://www.xiaohongshu.com${url}`,
                                snippet: snippet.substring(0, 200)
                            });
                        }
                    }
                });
                
                // 如果DOM解析失败，尝试正则表达式
                if (results.length === 0) {
                    const titleRegex = /<a[^>]*href="([^"]*xiaohongshu[^"]*)"[^>]*>(.*?)<\/a>/gi;
                    let match;
                    while ((match = titleRegex.exec(html)) !== null && results.length < 10) {
                        const url = match[1];
                        const title = this.stripHtmlTags(match[2]);
                        if (title && url && title.length > 5) {
                            results.push({
                                title: title.substring(0, 100),
                                url: url.startsWith('http') ? url : `https://www.xiaohongshu.com${url}`,
                                snippet: ''
                            });
                        }
                    }
                }
            } catch (error) {
                window.Logger?.warn('解析小红书搜索结果失败', error);
            }
            return results;
        },
        
        // 解析CNN搜索结果
        parseCNNSearchResults(html) {
            const results = [];
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                // CNN搜索结果选择器
                const resultElements = doc.querySelectorAll('.cnn-search__result, [class*="search-result"], .search-result-item, article');
                
                resultElements.forEach((element, index) => {
                    if (index >= 10) return;
                    
                    const titleElement = element.querySelector('h3 a, h2 a, .cnn-search__result-headline a, [class*="headline"] a');
                    const snippetElement = element.querySelector('.cnn-search__result-body, [class*="snippet"], [class*="summary"], p');
                    
                    if (titleElement) {
                        const title = titleElement.textContent.trim();
                        const url = titleElement.getAttribute('href') || '';
                        const snippet = snippetElement ? snippetElement.textContent.trim() : '';
                        
                        if (title && url) {
                            results.push({
                                title: title,
                                url: url.startsWith('http') ? url : `https://www.cnn.com${url}`,
                                snippet: snippet.substring(0, 200)
                            });
                        }
                    }
                });
                
                // 如果DOM解析失败，尝试正则表达式
                if (results.length === 0) {
                    const titleRegex = /<h[23][^>]*><a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a><\/h[23]>/gi;
                    let match;
                    while ((match = titleRegex.exec(html)) !== null && results.length < 10) {
                        const url = match[1];
                        const title = this.stripHtmlTags(match[2]);
                        if (title && url && title.length > 5 && url.includes('cnn.com')) {
                            results.push({
                                title: title,
                                url: url.startsWith('http') ? url : `https://www.cnn.com${url}`,
                                snippet: ''
                            });
                        }
                    }
                }
            } catch (error) {
                window.Logger?.warn('解析CNN搜索结果失败', error);
            }
            return results;
        },
        
        // 解析BBC搜索结果
        parseBBCSearchResults(html) {
            const results = [];
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                // BBC搜索结果选择器
                const resultElements = doc.querySelectorAll('.ssrcss-1f3bvyz-Stack, [data-testid="search-result"], .search-result, article');
                
                resultElements.forEach((element, index) => {
                    if (index >= 10) return;
                    
                    const titleElement = element.querySelector('h2 a, h3 a, [class*="title"] a, a[href*="bbc.com"]');
                    const snippetElement = element.querySelector('[class*="summary"], [class*="snippet"], p');
                    
                    if (titleElement) {
                        const title = titleElement.textContent.trim();
                        const url = titleElement.getAttribute('href') || '';
                        const snippet = snippetElement ? snippetElement.textContent.trim() : '';
                        
                        if (title && url) {
                            results.push({
                                title: title,
                                url: url.startsWith('http') ? url : `https://www.bbc.com${url}`,
                                snippet: snippet.substring(0, 200)
                            });
                        }
                    }
                });
                
                // 如果DOM解析失败，尝试正则表达式
                if (results.length === 0) {
                    const titleRegex = /<h[23][^>]*><a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a><\/h[23]>/gi;
                    let match;
                    while ((match = titleRegex.exec(html)) !== null && results.length < 10) {
                        const url = match[1];
                        const title = this.stripHtmlTags(match[2]);
                        if (title && url && title.length > 5 && url.includes('bbc.com')) {
                            results.push({
                                title: title,
                                url: url.startsWith('http') ? url : `https://www.bbc.com${url}`,
                                snippet: ''
                            });
                        }
                    }
                }
            } catch (error) {
                window.Logger?.warn('解析BBC搜索结果失败', error);
            }
            return results;
        },

        stripHtmlTags(html) {
            return html.replace(/<[^>]*>/g, '').trim();
        },
        
        // 检查是否为低质量搜索内容（登录页、错误页等）
        isLowQualitySearchContent(content) {
            if (!content || content.length < 100) return true;
            
            const lowerContent = content.toLowerCase();
            
            // 检查登录相关关键词
            const loginKeywords = [
                '登录', 'login', 'sign in', 'sign up', 'register', '注册',
                '扫码', '扫码登录', '手机号登录', '获取验证码',
                '用户协议', '隐私政策', 'cookie', 'cookies'
            ];
            
            // 检查错误页关键词
            const errorKeywords = [
                'no results', 'no results found', 'sorry there are no results',
                '没有找到', '未找到', '无结果', '暂无结果',
                '404', '403', '500', 'error', '错误'
            ];
            
            // 检查是否主要是导航/页脚内容
            const navKeywords = [
                'skip to content', 'home', 'news', 'sport', 'business',
                '首页', '设置', '更多', '更多功能'
            ];
            
            // 统计关键词出现次数
            let loginCount = 0;
            let errorCount = 0;
            let navCount = 0;
            
            loginKeywords.forEach(keyword => {
                if (lowerContent.includes(keyword)) loginCount++;
            });
            
            errorKeywords.forEach(keyword => {
                if (lowerContent.includes(keyword)) errorCount++;
            });
            
            navKeywords.forEach(keyword => {
                if (lowerContent.includes(keyword)) navCount++;
            });
            
            // 如果登录关键词出现3次以上，可能是登录页
            if (loginCount >= 3) return true;
            
            // 如果错误关键词出现，可能是错误页
            if (errorCount >= 1) return true;
            
            // 如果主要是导航内容且内容很短，可能是导航页
            if (navCount >= 5 && content.length < 2000) return true;
            
            // 检查URL数量（如果内容很长但没有URL，可能是错误页）
            const urlMatches = content.match(/https?:\/\/[^\s\)]+/gi);
            const urlCount = urlMatches ? urlMatches.length : 0;
            if (content.length > 1000 && urlCount === 0) return true;
            
            return false;
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
            
            // 放宽搜索触发条件：如果消息包含问号、疑问词或搜索关键词，都触发搜索
            // 如果消息很短（少于50字符），也更容易触发搜索
            const questionWords = ['什么', '如何', '为什么', '哪里', '哪个', '谁', '多少', '什么时候', '几点', '怎么', '怎样', '何时', '哪些'];
            const hasQuestionWord = questionWords.some(word => message.includes(word));
            const isShortMessage = message.length < 50;
            
            if (!hasSearchIntent && !hasQuestionMark && !hasQuestionWord && !isShortQuestion && !isShortMessage) {
                window.Logger?.debug(`消息不满足搜索条件: 长度=${message.length}, 关键词=${hasSearchIntent}, 问号=${hasQuestionMark}, 疑问词=${hasQuestionWord}`);
                return null;
            }
            
            window.Logger?.debug(`消息满足搜索条件: 长度=${message.length}, 关键词=${hasSearchIntent}, 问号=${hasQuestionMark}, 疑问词=${hasQuestionWord}, 短消息=${isShortMessage}`);
            
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
            
            // 限制长度（但至少保留2个字符）
            if (query.length < 2) {
                // 如果清理后太短，使用原始消息（移除搜索指令词）
                query = message.replace(/^(请|帮|能|可以|要|想|给|告诉)?(搜索|查找|查询|搜一下|找一下)?/gi, '').trim();
            }
            
            // 如果还是太短，直接使用原始消息（最多100字符）
            if (query.length < 2) {
                query = message.trim();
            }
            
            if (query.length > 100) {
                query = query.substring(0, 100);
            }
            
            window.Logger?.debug(`提取的搜索关键词: "${query}" (长度: ${query.length})`);
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
                    const fetchHeaders = {
                        'Content-Type': 'application/json',
                        'X-Return-Format': 'text',
                        'Authorization': `Bearer ${jinaApiKey}`
                    };
                    // 方法1: POST + url 参数（推荐，避免 CORS/URL 编码问题）

                    let response;
                    try {
                        response = await fetch('https://r.jina.ai/', {
                            method: 'POST',
                            headers: fetchHeaders,
                            body: JSON.stringify({ url: cleanUrl })
                        });
                        if (response.ok) {
                            const content = await response.text();
                            window.Logger?.info(`网页爬取成功(POST): ${cleanUrl}, 内容长度: ${content.length}`);
                            return {
                                url: cleanUrl,
                                title: this.extractTitle(content) || cleanUrl,
                                content: content.substring(0, 5000)
                            };
                        }
                        window.Logger?.warn(`Jina 爬取失败(POST): ${response.status}`);
                    } catch (postErr) {
                        window.Logger?.warn('Jina POST 爬取异常', postErr);
                    }
                    // 方法2: GET + 前缀（Jina 官方格式）
                    try {
                        const encodedUrl = encodeURIComponent(cleanUrl);
                        const jinaUrl = `https://r.jina.ai/${encodedUrl}`;
                        window.Logger?.debug(`尝试 GET: ${jinaUrl}`);
                        response = await fetch(jinaUrl, {
                            headers: { 'X-Return-Format': 'text', 'Authorization': `Bearer ${jinaApiKey}` }
                        });
                        if (response.ok) {
                            const content = await response.text();
                            window.Logger?.info(`网页爬取成功(GET): ${cleanUrl}, 内容长度: ${content.length}`);
                            return {
                                url: cleanUrl,
                                title: this.extractTitle(content) || cleanUrl,
                                content: content.substring(0, 5000)
                            };
                        }
                        window.Logger?.warn(`Jina 爬取失败(GET): ${response.status}`);
                    } catch (getErr) {
                        window.Logger?.warn('Jina GET 爬取异常', getErr);
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
