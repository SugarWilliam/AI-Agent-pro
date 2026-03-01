/**
 * AI Agent Pro v8.0.1 - RAG文档解析与向量化模块
 * 支持PDF、DOC、网页、文本的解析和语义检索
 */

(function() {
    'use strict';

    const RAGManager = {
        documents: [],
        vectors: new Map(), // 文档ID -> 向量列表
        searchCache: null, // 搜索结果缓存
        searchCacheMaxSize: 100, // 缓存最大大小
        
        // ==================== 初始化 ====================
        init() {
            this.loadDocuments();
            this.loadVectors();
            this.loadExternalSources();
            
            // 初始化搜索缓存
            this.searchCache = new Map();
            this.searchCacheMaxSize = 100;
            
            window.Logger?.info(`RAGManager初始化完成: ${this.documents.length} 个文档, ${this.vectors.size} 个向量集合`);
        },

        loadDocuments() {
            const saved = localStorage.getItem('ai_agent_rag_docs_v6');
            if (saved) {
                try {
                    this.documents = JSON.parse(saved);
                } catch (e) {
                    window.Logger?.error('加载RAG文档失败:', e);
                    this.documents = [];
                }
            }
        },

        saveDocuments() {
            localStorage.setItem('ai_agent_rag_docs_v6', JSON.stringify(this.documents));
        },

        loadVectors() {
            const saved = localStorage.getItem('ai_agent_rag_vectors_v6');
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    this.vectors = new Map(Object.entries(data));
                } catch (e) {
                    window.Logger?.error('加载向量数据失败:', e);
                    this.vectors = new Map();
                }
            }
        },

        saveVectors() {
            const data = Object.fromEntries(this.vectors);
            localStorage.setItem('ai_agent_rag_vectors_v6', JSON.stringify(data));
        },

        // ==================== 文档解析 ====================
        async parseDocument(file, options = {}) {
            const { chunkSize = 500, overlap = 50 } = options;
            
            const docId = 'doc_' + Date.now();
            const docInfo = {
                id: docId,
                name: file.name,
                type: file.type,
                size: file.size,
                uploadedAt: Date.now(),
                status: 'parsing', // parsing, parsed, error
                chunks: [],
                metadata: {}
            };

            try {
                let content = '';
                
                // 根据文件类型选择解析方式
                const fileExt = file.name.split('.').pop()?.toLowerCase();
                const fileName = file.name.toLowerCase();
                
                // 文本文件
                if (file.type === 'text/plain' || fileExt === 'txt') {
                    content = await this.readTextFile(file);
                }
                // Markdown文件
                else if (file.type === 'text/markdown' || fileExt === 'md' || fileExt === 'markdown') {
                    content = await this.readTextFile(file);
                }
                // PDF文件
                else if (file.type === 'application/pdf' || fileExt === 'pdf') {
                    content = await this.parsePDF(file);
                }
                // Word文档
                else if (file.type.includes('word') || file.type.includes('document') || 
                         fileExt === 'doc' || fileExt === 'docx') {
                    content = await this.parseDOC(file);
                }
                // PowerPoint文档
                else if (file.type.includes('presentation') || file.type.includes('powerpoint') ||
                         fileExt === 'ppt' || fileExt === 'pptx') {
                    content = await this.parsePPT(file);
                }
                // Excel/电子表格
                else if (file.type.includes('sheet') || file.type.includes('excel') ||
                         fileExt === 'xlsx' || fileExt === 'xls') {
                    content = await this.parseExcel(file);
                }
                // CSV文件
                else if (file.type === 'text/csv' || fileExt === 'csv') {
                    content = await this.parseCSV(file);
                }
                // HTML/H5文件
                else if (file.type === 'text/html' || fileExt === 'html' || fileExt === 'htm' || fileExt === 'h5') {
                    content = await this.parseHTML(file);
                }
                // 图片文件
                else if (file.type.startsWith('image/')) {
                    content = await this.parseImage(file);
                }
                // URL（如果传入的是URL字符串）
                else if (typeof file === 'string' && (file.startsWith('http://') || file.startsWith('https://'))) {
                    return await this.parseURL(file);
                }
                else {
                    throw new Error(`不支持的文件类型: ${file.type || '未知'} (${file.name})`);
                }

                // 检查内容是否有效（不是降级方案的占位符）
                const isPlaceholder = content.includes('[PDF文档:') || 
                                     content.includes('[Word文档:') ||
                                     content.includes('[PowerPoint文档:') ||
                                     content.includes('[电子表格:') ||
                                     content.includes('[图片:') ||
                                     content.includes('(注意：') ||
                                     content.includes('文件大小:');
                
                // 如果内容太短或只是占位符，标记为无效但仍然保存
                const isValidContent = !isPlaceholder && content.length > 50;
                
                if (isValidContent) {
                    // 分块处理
                    docInfo.chunks = this.chunkContent(content, chunkSize, overlap);
                    docInfo.metadata = this.extractMetadata(content);
                    docInfo.status = 'parsed';
                    docInfo.vectorized = true;

                    // 生成向量
                    await this.generateVectors(docId, docInfo.chunks);
                    window.Logger?.info(`文档向量化完成: ${file.name}, ${docInfo.chunks.length} 个chunks`);
                } else {
                    // 内容无效，标记但保存基本信息
                    docInfo.chunks = [];
                    docInfo.metadata = { 
                        ...this.extractMetadata(content),
                        isValid: false,
                        reason: isPlaceholder ? 'placeholder' : 'too_short'
                    };
                    docInfo.status = 'parsed';
                    docInfo.vectorized = false;
                    window.Logger?.warn(`文档内容无效，跳过向量化: ${file.name}, 原因: ${isPlaceholder ? '占位符' : '内容太短'}`);
                }

            } catch (error) {
                window.Logger?.error('文档解析失败:', error);
                docInfo.status = 'error';
                docInfo.error = error.message;
            }

            this.documents.push(docInfo);
            this.saveDocuments();
            
            // 记录文档统计
            const stats = this.getDocumentStats();
            window.Logger?.info(`文档解析完成: ${file.name}, 状态: ${docInfo.status}, 向量化: ${docInfo.vectorized ? '是' : '否'}, 总文档数: ${stats.total}, 已解析: ${stats.parsed}`);
            
            return docInfo;
        },

        // 读取文本文件
        readTextFile(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsText(file);
            });
        },

        // 获取Jina AI API密钥
        getJinaAIKey() {
            if (window.AIAgentApp && typeof window.AIAgentApp.getJinaAIKey === 'function') {
                return window.AIAgentApp.getJinaAIKey();
            }
            return '';
        },

        // 检查Jina AI是否可用
        isJinaAIAvailable() {
            if (window.AIAgentApp && typeof window.AIAgentApp.isJinaAIEnabled === 'function') {
                const enabled = window.AIAgentApp.isJinaAIEnabled();
                const hasKey = window.AIAgentApp.hasJinaAIKey();
                window.Logger?.debug(`Jina AI检查: enabled=${enabled}, hasKey=${hasKey}`);
                return enabled && hasKey;
            }
            // 如果没有配置，尝试使用（Jina AI可能支持无密钥的免费使用）
            window.Logger?.debug('Jina AI检查: AIAgentApp未找到，使用默认值true');
            return true;
        },

        // 解析PDF（使用Jina AI Reader API）
        async parsePDF(file) {
            // 检查Jina AI是否可用
            if (!this.isJinaAIAvailable()) {
                const apiKey = this.getJinaAIKey();
                window.Logger?.warn(`Jina AI未配置或已禁用，PDF解析将使用降级方案。API Key: ${apiKey ? '已配置' : '未配置'}`);
                return `[PDF文档: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(2)} KB\n\n(注意：请配置Jina AI API密钥以启用PDF内容解析。获取密钥: https://jina.ai/)`;
            }

            try {
                const apiKey = this.getJinaAIKey();
                window.Logger?.info(`开始解析PDF: ${file.name}, API Key: ${apiKey ? '已配置(' + apiKey.substring(0, 20) + '...)' : '未配置'}`);
                
                // 根据Jina AI官方文档，PDF文件应该使用Base64编码
                // 将文件转换为Base64
                window.Logger?.debug(`转换PDF为Base64，文件大小: ${file.size} bytes`);
                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        // 移除data:application/pdf;base64,前缀，只保留Base64字符串
                        const base64String = reader.result.split(',')[1];
                        resolve(base64String);
                    };
                    reader.onerror = (error) => {
                        window.Logger?.error('Base64转换失败', error);
                        reject(new Error('PDF文件Base64转换失败: ' + error.message));
                    };
                    reader.readAsDataURL(file);
                });
                
                window.Logger?.debug(`Base64转换完成，长度: ${base64.length} 字符`);
                
                // 构建请求头
                const headers = {
                    'Content-Type': 'application/json',
                    'X-Return-Format': 'text'
                };
                
                // 如果配置了API密钥，添加到请求头
                if (apiKey && apiKey.trim().length > 0) {
                    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
                }
                
                // 使用Jina AI Reader API解析PDF（使用Base64方式）
                window.Logger?.debug(`发送请求到 https://r.jina.ai/, Base64长度: ${base64.length} 字符`);
                window.Logger?.debug(`请求头:`, headers);
                window.Logger?.debug(`请求体大小: ${JSON.stringify({ pdf: base64 }).length} 字符`);
                
                const response = await fetch('https://r.jina.ai/', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({ pdf: base64 })
                });
                
                window.Logger?.debug(`收到响应: status=${response.status}, ok=${response.ok}, statusText=${response.statusText}`);
                
                // 记录响应头（用于调试）
                const responseHeaders = {};
                response.headers.forEach((value, key) => {
                    responseHeaders[key] = value;
                });
                window.Logger?.debug(`响应头:`, responseHeaders);
                
                if (response.ok) {
                    const content = await response.text();
                    window.Logger?.info(`PDF解析成功: ${file.name}, 内容长度: ${content.length} 字符`);
                    window.Logger?.debug(`PDF解析内容预览（前500字符）: ${content.substring(0, 500)}`);
                    
                    // 检查返回内容是否真的是PDF内容（而不是错误消息）
                    if (content.length < 50) {
                        window.Logger?.warn(`PDF解析返回内容过短，可能是错误: ${content.substring(0, 100)}`);
                        // 如果内容太短，可能是错误消息，但先返回让上层判断
                    }
                    
                    // 检查是否包含HTML错误页面（Jina AI可能返回HTML错误页面）
                    if (content.trim().startsWith('<!DOCTYPE') || content.trim().startsWith('<html')) {
                        window.Logger?.error(`PDF解析返回HTML错误页面: ${content.substring(0, 200)}`);
                        throw new Error('PDF解析返回错误页面，请检查API密钥和网络连接');
                    }
                    
                    return content;
                } else {
                    const errorText = await response.text().catch(() => '');
                    window.Logger?.error(`PDF解析API错误: status=${response.status}, error=${errorText.substring(0, 200)}`);
                    if (response.status === 401 || response.status === 403) {
                        throw new Error(`Jina AI API密钥无效或已过期。请检查设置中的Jina AI API密钥配置。`);
                    } else if (response.status === 429) {
                        throw new Error(`Jina AI API请求频率限制。请稍后重试。`);
                    } else {
                        throw new Error(`PDF解析失败: ${response.status} ${errorText.substring(0, 100)}`);
                    }
                }
            } catch (error) {
                window.Logger?.error(`PDF解析异常: ${file.name}`, error);
                // 降级方案：返回基本信息
                return `[PDF文档: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(2)} KB\n\n(注意：PDF内容解析失败 - ${error.message})`;
            }
        },

        // 解析DOC/DOCX（使用Jina AI Reader API）
        async parseDOC(file) {
            if (!this.isJinaAIAvailable()) {
                window.Logger?.warn('Jina AI未配置或已禁用，Word文档解析将使用降级方案');
                return `[Word文档: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(2)} KB\n\n(注意：请配置Jina AI API密钥以启用Word文档内容解析。获取密钥: https://jina.ai/)`;
            }

            try {
                const apiKey = this.getJinaAIKey();
                window.Logger?.info(`开始解析Word文档: ${file.name}`);
                
                // 转换为Base64
                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                
                const headers = {
                    'Content-Type': 'application/json',
                    'X-Return-Format': 'text'
                };
                
                if (apiKey && apiKey.trim().length > 0) {
                    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
                }
                
                // Jina AI Reader API可能不支持doc字段，尝试使用file字段或直接POST二进制
                // 方法1: 尝试使用file字段（通用文件上传）
                let response;
                try {
                    window.Logger?.debug(`尝试方法1: 使用file字段`);
                    response = await fetch('https://r.jina.ai/', {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify({ file: base64 })
                    });
                    
                    if (response.ok) {
                        const content = await response.text();
                        window.Logger?.info(`Word文档解析成功: ${file.name}, 内容长度: ${content.length}`);
                        return content;
                    } else if (response.status === 400) {
                        // 如果400错误，尝试方法2
                        window.Logger?.warn(`方法1失败(status=400)，尝试方法2`);
                        throw new Error('Method 1 failed');
                    }
                } catch (method1Error) {
                    // 方法2: 直接POST二进制数据（类似PDF的方式）
                    try {
                        window.Logger?.debug(`尝试方法2: 直接POST二进制数据`);
                        const binaryHeaders = {
                            'Content-Type': file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                            'X-Return-Format': 'text'
                        };
                        
                        if (apiKey && apiKey.trim().length > 0) {
                            binaryHeaders['Authorization'] = `Bearer ${apiKey.trim()}`;
                        }
                        
                        response = await fetch('https://r.jina.ai/', {
                            method: 'POST',
                            headers: binaryHeaders,
                            body: await file.arrayBuffer()
                        });
                        
                        if (response.ok) {
                            const content = await response.text();
                            window.Logger?.info(`Word文档解析成功: ${file.name}, 内容长度: ${content.length}`);
                            return content;
                        }
                    } catch (method2Error) {
                        window.Logger?.warn(`方法2也失败，使用降级方案`);
                    }
                }
                
                // 如果所有方法都失败
                const errorText = await response.text().catch(() => '');
                window.Logger?.error(`Word文档解析失败: status=${response.status}, error=${errorText.substring(0, 200)}`);
                
                if (response.status === 401 || response.status === 403) {
                    throw new Error(`Jina AI API密钥无效或已过期。请检查设置中的Jina AI API密钥配置。`);
                } else if (response.status === 429) {
                    throw new Error(`Jina AI API请求频率限制。请稍后重试。`);
                } else {
                    throw new Error(`Word文档解析失败: ${response.status} ${errorText.substring(0, 100)}`);
                }
            } catch (error) {
                window.Logger?.warn(`Word文档解析失败，使用降级方案: ${error.message}`);
                return `[Word文档: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(2)} KB\n\n(注意：Word文档内容解析失败 - ${error.message})`;
            }
        },

        // 解析PPT/PPTX（使用Jina AI Reader API）
        async parsePPT(file) {
            if (!this.isJinaAIAvailable()) {
                window.Logger?.warn('Jina AI未配置或已禁用，PPT解析将使用降级方案');
                return `[PowerPoint文档: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(2)} KB\n\n(注意：请配置Jina AI API密钥以启用PPT内容解析。获取密钥: https://jina.ai/)`;
            }

            try {
                const apiKey = this.getJinaAIKey();
                window.Logger?.info(`开始解析PPT: ${file.name}`);
                
                // 转换为Base64
                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                
                const headers = {
                    'Content-Type': 'application/json',
                    'X-Return-Format': 'text'
                };
                
                if (apiKey && apiKey.trim().length > 0) {
                    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
                }
                
                // 方法1: 尝试使用file字段（Base64）
                let response;
                try {
                    window.Logger?.debug(`尝试方法1: 使用file字段（Base64）`);
                    response = await fetch('https://r.jina.ai/', {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify({ file: base64 })
                    });
                    
                    if (response.ok) {
                        const content = await response.text();
                        window.Logger?.info(`PPT解析成功: ${file.name}, 内容长度: ${content.length}`);
                        return content;
                    } else if (response.status === 400) {
                        window.Logger?.warn(`方法1失败(status=400)，尝试方法2`);
                        throw new Error('Method 1 failed');
                    }
                } catch (method1Error) {
                    // 方法2: 直接POST二进制数据
                    try {
                        window.Logger?.debug(`尝试方法2: 直接POST二进制数据`);
                        const binaryHeaders = {
                            'Content-Type': file.type || 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                            'X-Return-Format': 'text'
                        };
                        
                        if (apiKey && apiKey.trim().length > 0) {
                            binaryHeaders['Authorization'] = `Bearer ${apiKey.trim()}`;
                        }
                        
                        response = await fetch('https://r.jina.ai/', {
                            method: 'POST',
                            headers: binaryHeaders,
                            body: await file.arrayBuffer()
                        });
                        
                        if (response.ok) {
                            const content = await response.text();
                            window.Logger?.info(`PPT解析成功: ${file.name}, 内容长度: ${content.length}`);
                            return content;
                        }
                    } catch (method2Error) {
                        window.Logger?.warn(`方法2也失败，使用降级方案`);
                    }
                }
                
                // 如果所有方法都失败
                const errorText = await response.text().catch(() => '');
                window.Logger?.error(`PPT解析失败: status=${response.status}, error=${errorText.substring(0, 200)}`);
                
                if (response.status === 401 || response.status === 403) {
                    throw new Error(`Jina AI API密钥无效或已过期。请检查设置中的Jina AI API密钥配置。`);
                } else if (response.status === 429) {
                    throw new Error(`Jina AI API请求频率限制。请稍后重试。`);
                } else {
                    throw new Error(`PPT解析失败: ${response.status} ${errorText.substring(0, 100)}`);
                }
            } catch (error) {
                window.Logger?.warn(`PPT解析失败，使用降级方案: ${error.message}`);
                return `[PowerPoint文档: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(2)} KB\n\n(注意：PPT内容解析失败 - ${error.message})`;
            }
        },

        // 解析Excel/电子表格（使用Jina AI Reader API）
        async parseExcel(file) {
            if (!this.isJinaAIAvailable()) {
                window.Logger?.warn('Jina AI未配置或已禁用，Excel解析将使用降级方案');
                // 降级方案：尝试读取为CSV（如果是简单格式）
                try {
                    const text = await this.readTextFile(file);
                    return text;
                } catch (e) {
                    return `[电子表格: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(2)} KB\n\n(注意：请配置Jina AI API密钥以启用Excel内容解析。获取密钥: https://jina.ai/)`;
                }
            }

            try {
                const apiKey = this.getJinaAIKey();
                window.Logger?.info(`开始解析Excel: ${file.name}`);
                
                // 转换为Base64
                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                
                const headers = {
                    'Content-Type': 'application/json',
                    'X-Return-Format': 'text'
                };
                
                if (apiKey && apiKey.trim().length > 0) {
                    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
                }
                
                // 方法1: 尝试使用file字段（Base64）
                let response;
                try {
                    window.Logger?.debug(`尝试方法1: 使用file字段（Base64）`);
                    response = await fetch('https://r.jina.ai/', {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify({ file: base64 })
                    });
                    
                    if (response.ok) {
                        const content = await response.text();
                        window.Logger?.info(`Excel解析成功: ${file.name}, 内容长度: ${content.length}`);
                        return content;
                    } else if (response.status === 400) {
                        window.Logger?.warn(`方法1失败(status=400)，尝试方法2`);
                        throw new Error('Method 1 failed');
                    }
                } catch (method1Error) {
                    // 方法2: 直接POST二进制数据
                    try {
                        window.Logger?.debug(`尝试方法2: 直接POST二进制数据`);
                        const binaryHeaders = {
                            'Content-Type': file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                            'X-Return-Format': 'text'
                        };
                        
                        if (apiKey && apiKey.trim().length > 0) {
                            binaryHeaders['Authorization'] = `Bearer ${apiKey.trim()}`;
                        }
                        
                        response = await fetch('https://r.jina.ai/', {
                            method: 'POST',
                            headers: binaryHeaders,
                            body: await file.arrayBuffer()
                        });
                        
                        if (response.ok) {
                            const content = await response.text();
                            window.Logger?.info(`Excel解析成功: ${file.name}, 内容长度: ${content.length}`);
                            return content;
                        }
                    } catch (method2Error) {
                        window.Logger?.warn(`方法2也失败，使用降级方案`);
                    }
                }
                
                // 如果所有方法都失败
                const errorText = await response.text().catch(() => '');
                window.Logger?.error(`Excel解析失败: status=${response.status}, error=${errorText.substring(0, 200)}`);
                
                if (response.ok) {
                    const content = await response.text();
                    window.Logger?.info(`Excel解析成功: ${file.name}, 内容长度: ${content.length}`);
                    return content;
                } else {
                    const errorText = await response.text().catch(() => '');
                    if (response.status === 401 || response.status === 403) {
                        throw new Error(`Jina AI API密钥无效或已过期。请检查设置中的Jina AI API密钥配置。`);
                    } else if (response.status === 429) {
                        throw new Error(`Jina AI API请求频率限制。请稍后重试。`);
                    } else {
                        throw new Error(`Excel解析失败: ${response.status} ${errorText.substring(0, 100)}`);
                    }
                }
            } catch (error) {
                window.Logger?.warn(`Excel解析失败，使用降级方案: ${error.message}`);
                // 降级方案：尝试读取为CSV（如果是简单格式）
                try {
                    const text = await this.readTextFile(file);
                    return text;
                } catch (e) {
                    return `[电子表格: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(2)} KB\n\n(注意：Excel内容解析失败 - ${error.message})`;
                }
            }
        },

        // 解析CSV文件
        async parseCSV(file) {
            try {
                const text = await this.readTextFile(file);
                // CSV文件可以直接读取，但可以格式化一下
                const lines = text.split('\n');
                const formattedLines = lines.map((line, index) => {
                    if (index === 0) {
                        return `表头: ${line}`;
                    }
                    return line;
                });
                return formattedLines.join('\n');
            } catch (error) {
                window.Logger?.error('CSV解析失败:', error);
                throw error;
            }
        },

        // 解析图片（使用OCR或图片描述API）
        async parseImage(file) {
            if (!this.isJinaAIAvailable()) {
                window.Logger?.warn('Jina AI未配置或已禁用，图片解析将使用降级方案');
                return `[图片: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(2)} KB\n文件类型: ${file.type}\n\n(注意：请配置Jina AI API密钥以启用图片OCR和描述功能。获取密钥: https://jina.ai/)`;
            }

            try {
                const apiKey = this.getJinaAIKey();
                window.Logger?.info(`开始解析图片: ${file.name}`);
                
                // 转换为Base64
                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                
                const headers = {
                    'Content-Type': 'application/json',
                    'X-Return-Format': 'text'
                };
                
                if (apiKey && apiKey.trim().length > 0) {
                    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
                }
                
                // 方法1: 尝试使用image字段（Base64）
                let response;
                try {
                    window.Logger?.debug(`尝试方法1: 使用image字段（Base64）`);
                    response = await fetch('https://r.jina.ai/', {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify({ image: base64 })
                    });
                    
                    if (response.ok) {
                        const content = await response.text();
                        window.Logger?.info(`图片解析成功: ${file.name}, 内容长度: ${content.length}`);
                        return `[图片: ${file.name}]\n${content}`;
                    } else if (response.status === 400) {
                        // 如果400错误，尝试方法2
                        window.Logger?.warn(`方法1失败(status=400)，尝试方法2`);
                        throw new Error('Method 1 failed');
                    }
                } catch (method1Error) {
                    // 方法2: 直接POST二进制数据
                    try {
                        window.Logger?.debug(`尝试方法2: 直接POST二进制数据`);
                        const binaryHeaders = {
                            'Content-Type': file.type,
                            'X-Return-Format': 'text'
                        };
                        
                        if (apiKey && apiKey.trim().length > 0) {
                            binaryHeaders['Authorization'] = `Bearer ${apiKey.trim()}`;
                        }
                        
                        response = await fetch('https://r.jina.ai/', {
                            method: 'POST',
                            headers: binaryHeaders,
                            body: await file.arrayBuffer()
                        });
                        
                        if (response.ok) {
                            const content = await response.text();
                            window.Logger?.info(`图片解析成功: ${file.name}, 内容长度: ${content.length}`);
                            return `[图片: ${file.name}]\n${content}`;
                        }
                    } catch (method2Error) {
                        window.Logger?.warn(`方法2也失败，使用降级方案`);
                    }
                }
                
                // 如果所有方法都失败
                const errorText = await response.text().catch(() => '');
                window.Logger?.error(`图片解析失败: status=${response.status}, error=${errorText.substring(0, 200)}`);
                
                if (response.status === 401 || response.status === 403) {
                    throw new Error(`Jina AI API密钥无效或已过期。请检查设置中的Jina AI API密钥配置。`);
                } else if (response.status === 429) {
                    throw new Error(`Jina AI API请求频率限制。请稍后重试。`);
                } else {
                    throw new Error(`图片解析失败: ${response.status} ${errorText.substring(0, 100)}`);
                }
            } catch (error) {
                window.Logger?.warn(`图片解析失败，使用降级方案: ${error.message}`);
                // 降级方案：返回图片基本信息
                return `[图片: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(2)} KB\n文件类型: ${file.type}\n\n(注意：图片内容解析失败 - ${error.message})`;
            }
        },

        // 文件转Base64
        fileToBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64 = reader.result.split(',')[1]; // 移除data:type;base64,前缀
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        },

        // 解析HTML/H5
        async parseHTML(file) {
            const html = await this.readTextFile(file);
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // 移除脚本和样式
            doc.querySelectorAll('script, style, nav, footer, header').forEach(el => el.remove());
            
            // 提取正文
            const mainContent = doc.querySelector('main, article, .content, #content') || doc.body;
            
            // 提取标题
            const title = doc.querySelector('title')?.textContent || '';
            
            // 提取meta描述
            const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
            
            // 组合内容
            let content = '';
            if (title) content += `标题: ${title}\n\n`;
            if (metaDesc) content += `描述: ${metaDesc}\n\n`;
            content += mainContent.textContent.trim();
            
            return content;
        },

        // 解析网页URL
        async parseURL(url) {
            if (!this.isJinaAIAvailable()) {
                window.Logger?.warn('Jina AI未配置或已禁用，URL解析将使用降级方案');
                return `[网页: ${url}]\n\n(注意：请配置Jina AI API密钥以启用网页内容解析。获取密钥: https://jina.ai/)`;
            }

            try {
                const apiKey = this.getJinaAIKey();
                const headers = {
                    'X-Return-Format': 'text'
                };
                
                if (apiKey) {
                    headers['Authorization'] = `Bearer ${apiKey}`;
                }
                
                // 使用Jina AI Reader API获取网页内容
                const response = await fetch(`https://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}`, {
                    headers: headers
                });
                
                if (!response.ok) {
                    const errorText = await response.text().catch(() => '');
                    if (response.status === 401 || response.status === 403) {
                        throw new Error(`Jina AI API密钥无效或已过期。请检查设置中的Jina AI API密钥配置。`);
                    } else if (response.status === 429) {
                        throw new Error(`Jina AI API请求频率限制。请稍后重试。`);
                    } else {
                        throw new Error(`获取网页失败: ${response.status} ${errorText.substring(0, 100)}`);
                    }
                }
                
                const content = await response.text();
                
                const docId = 'url_' + Date.now();
                const docInfo = {
                    id: docId,
                    name: new URL(url).hostname,
                    type: 'text/html',
                    url: url,
                    uploadedAt: Date.now(),
                    status: 'parsed',
                    chunks: this.chunkContent(content, 500, 50),
                    metadata: { source: url }
                };

                await this.generateVectors(docId, docInfo.chunks);
                
                this.documents.push(docInfo);
                this.saveDocuments();
                
                return docInfo;
            } catch (error) {
                window.Logger?.error('URL解析失败:', error);
                throw error;
            }
        },

        // ==================== 文本分块 ====================
        chunkContent(content, chunkSize = 500, overlap = 50) {
            const chunks = [];
            const sentences = content.split(/(?<=[。！？.!?])\s+/);
            
            let currentChunk = '';
            let chunkIndex = 0;
            
            for (const sentence of sentences) {
                if (currentChunk.length + sentence.length > chunkSize) {
                    if (currentChunk) {
                        chunks.push({
                            id: `chunk_${chunkIndex++}`,
                            text: currentChunk.trim(),
                            index: chunkIndex - 1
                        });
                        // 保留重叠部分
                        const words = currentChunk.split('');
                        currentChunk = words.slice(-overlap).join('') + sentence;
                    } else {
                        // 单句超过chunkSize，强制分割
                        chunks.push({
                            id: `chunk_${chunkIndex++}`,
                            text: sentence.slice(0, chunkSize),
                            index: chunkIndex - 1
                        });
                        currentChunk = sentence.slice(chunkSize - overlap);
                    }
                } else {
                    currentChunk += sentence;
                }
            }
            
            if (currentChunk.trim()) {
                chunks.push({
                    id: `chunk_${chunkIndex}`,
                    text: currentChunk.trim(),
                    index: chunkIndex
                });
            }
            
            return chunks;
        },

        // ==================== 提取元数据 ====================
        extractMetadata(content) {
            const metadata = {
                wordCount: content.split(/\s+/).length,
                charCount: content.length,
                lineCount: content.split('\n').length,
                language: this.detectLanguage(content),
                keywords: this.extractKeywords(content)
            };
            return metadata;
        },

        detectLanguage(content) {
            // 简单语言检测
            const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
            const totalChars = content.length;
            return chineseChars / totalChars > 0.3 ? 'zh' : 'en';
        },

        extractKeywords(content, count = 10) {
            // 简单的关键词提取（基于词频）
            const words = content.toLowerCase()
                .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
                .split(/\s+/)
                .filter(w => w.length > 1);
            
            const freq = {};
            words.forEach(w => freq[w] = (freq[w] || 0) + 1);
            
            return Object.entries(freq)
                .sort((a, b) => b[1] - a[1])
                .slice(0, count)
                .map(([word]) => word);
        },

        // ==================== 向量生成（优化版） ====================
        async generateVectors(docId, chunks) {
            // 优化的向量生成：使用改进的TF-IDF + 语义哈希
            const vectors = [];
            
            // 批量处理以提高性能
            const batchSize = 10;
            for (let i = 0; i < chunks.length; i += batchSize) {
                const batch = chunks.slice(i, i + batchSize);
                const batchVectors = await Promise.all(
                    batch.map(chunk => this.enhancedEmbedding(chunk.text, chunks))
                );
                
                batch.forEach((chunk, idx) => {
                    vectors.push({
                        chunkId: chunk.id,
                        vector: batchVectors[idx],
                        text: chunk.text,
                        index: chunk.index
                    });
                });
            }
            
            this.vectors.set(docId, vectors);
            this.saveVectors();
            
            window.Logger?.info(`已为文档 ${docId} 生成 ${vectors.length} 个向量`);
        },

        // 优化的嵌入算法：TF-IDF + 语义哈希 + 字符级特征
        enhancedEmbedding(text, allChunks = []) {
            // 使用256维向量以获得更好的语义表示
            const vector = new Array(256).fill(0);
            const textLower = text.toLowerCase();
            
            // 1. 字符级特征（保留更多语义信息）
            for (let i = 0; i < text.length; i++) {
                const charCode = textLower.charCodeAt(i);
                vector[charCode % 256] += 1;
            }
            
            // 2. 词级特征（中文和英文）
            const words = this.tokenize(textLower);
            const wordFreq = {};
            words.forEach(w => {
                if (w.length > 0) {
                    wordFreq[w] = (wordFreq[w] || 0) + 1;
                }
            });
            
            // 3. TF-IDF权重（如果提供了所有chunks）
            if (allChunks.length > 0) {
                const docFreq = {};
                allChunks.forEach(chunk => {
                    const chunkWords = new Set(this.tokenize(chunk.text.toLowerCase()));
                    chunkWords.forEach(w => {
                        docFreq[w] = (docFreq[w] || 0) + 1;
                    });
                });
                
                const totalDocs = allChunks.length;
                words.forEach((word, idx) => {
                    if (word.length > 0) {
                        const tf = wordFreq[word] / words.length;
                        const idf = Math.log(totalDocs / (docFreq[word] || 1));
                        const tfidf = tf * idf;
                        
                        // 将TF-IDF权重映射到向量
                        for (let j = 0; j < word.length; j++) {
                            const charCode = word.charCodeAt(j);
                            vector[charCode % 256] += tfidf;
                        }
                    }
                });
            } else {
                // 没有其他chunks时，使用简单的词频
                words.forEach((word, idx) => {
                    if (word.length > 0) {
                        const weight = wordFreq[word] / words.length;
                        for (let j = 0; j < word.length; j++) {
                            const charCode = word.charCodeAt(j);
                            vector[charCode % 256] += weight;
                        }
                    }
                });
            }
            
            // 4. 归一化
            const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
            return magnitude > 0 ? vector.map(v => v / magnitude) : vector;
        },

        // 分词函数（支持中文和英文）
        tokenize(text) {
            // 中文：按字符分割
            // 英文：按单词分割
            const tokens = [];
            let currentWord = '';
            
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                const charCode = char.charCodeAt(0);
                
                // 中文字符（Unicode范围：0x4E00-0x9FFF）
                if (charCode >= 0x4E00 && charCode <= 0x9FFF) {
                    if (currentWord) {
                        tokens.push(currentWord);
                        currentWord = '';
                    }
                    tokens.push(char);
                }
                // 英文字母或数字
                else if ((charCode >= 65 && charCode <= 90) || 
                         (charCode >= 97 && charCode <= 122) ||
                         (charCode >= 48 && charCode <= 57)) {
                    currentWord += char;
                }
                // 其他字符（标点、空格等）
                else {
                    if (currentWord) {
                        tokens.push(currentWord);
                        currentWord = '';
                    }
                }
            }
            
            if (currentWord) {
                tokens.push(currentWord);
            }
            
            return tokens.filter(t => t.length > 0);
        },

        // ==================== 语义检索（优化版） ====================
        async search(query, options = {}) {
            const {
                topK = 5,
                docIds = null, // 指定文档ID列表，null表示搜索所有
                minScore = 0.3, // 降低阈值以获得更多结果
                useCache = true
            } = options;

            // 查询缓存
            const cacheKey = `search_${query}_${topK}_${minScore}`;
            if (useCache && this.searchCache && this.searchCache.has(cacheKey)) {
                window.Logger?.debug('使用RAG搜索结果缓存');
                return this.searchCache.get(cacheKey);
            }

            const startTime = performance.now();
            
            // 使用优化的embedding算法
            const queryVector = this.enhancedEmbedding(query);
            const results = [];

            // 如果没有指定docIds，搜索所有已向量化的文档
            const targetDocIds = docIds || Array.from(this.vectors.keys());
            
            // 过滤掉没有向量的文档（可能解析失败或内容无效）
            const validDocIds = targetDocIds.filter(docId => {
                const vectors = this.vectors.get(docId);
                return vectors && vectors.length > 0;
            });
            
            if (validDocIds.length === 0) {
                window.Logger?.debug('RAG搜索: 没有有效的向量化文档');
                return [];
            }

            // 并行处理多个文档以提高性能
            const searchPromises = targetDocIds.map(async (docId) => {
                const docVectors = this.vectors.get(docId);
                if (!docVectors) return [];

                const doc = this.documents.find(d => d.id === docId);
                if (!doc) return [];

                const docResults = [];
                
                // 批量计算相似度
                for (const item of docVectors) {
                    const score = this.cosineSimilarity(queryVector, item.vector);
                    if (score >= minScore) {
                        docResults.push({
                            docId,
                            docName: doc.name,
                            chunkId: item.chunkId,
                            text: item.text,
                            score,
                            index: item.index || 0
                        });
                    }
                }
                
                return docResults;
            });

            const allResults = await Promise.all(searchPromises);
            results.push(...allResults.flat());

            // 按相似度排序
            results.sort((a, b) => b.score - a.score);
            
            const finalResults = results.slice(0, topK);
            
            // 缓存结果
            if (useCache) {
                if (!this.searchCache) {
                    this.searchCache = new Map();
                    // 限制缓存大小
                    this.searchCacheMaxSize = 100;
                }
                if (this.searchCache.size >= this.searchCacheMaxSize) {
                    // 删除最旧的缓存项
                    const firstKey = this.searchCache.keys().next().value;
                    this.searchCache.delete(firstKey);
                }
                this.searchCache.set(cacheKey, finalResults);
            }
            
            const endTime = performance.now();
            window.Logger?.info(`RAG搜索完成: ${finalResults.length} 个结果，耗时 ${(endTime - startTime).toFixed(2)}ms`);
            
            return finalResults;
        },

        // query函数（search的别名，用于兼容性）
        async query(query, options = {}) {
            return await this.search(query, options);
        },

        // 余弦相似度
        cosineSimilarity(a, b) {
            let dotProduct = 0;
            let normA = 0;
            let normB = 0;
            
            for (let i = 0; i < a.length; i++) {
                dotProduct += a[i] * b[i];
                normA += a[i] * a[i];
                normB += b[i] * b[i];
            }
            
            return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
        },

        // ==================== 构建RAG上下文（优化版） ====================
        async buildRAGContext(query, ragConfigs) {
            const contexts = [];
            
            // 并行处理多个RAG配置以提高性能
            const contextPromises = ragConfigs.map(async (config) => {
                if (config.type === 'document') {
                    // 搜索上传的文档
                    const docResults = await this.search(query, {
                        topK: 3,
                        minScore: 0.3
                    });
                    
                    if (docResults.length > 0) {
                        return {
                            source: config.name,
                            type: 'document',
                            content: docResults.map(r => r.text).join('\n\n'),
                            results: docResults
                        };
                    }
                } else if (config.type === 'web') {
                    // 网页知识库（简化版）
                    return {
                        source: config.name,
                        type: 'web',
                        content: `[网页知识库: ${config.name}]`
                    };
                }
                return null;
            });
            
            const results = await Promise.all(contextPromises);
            contexts.push(...results.filter(r => r !== null));
            
            return contexts;
        },

        // 查询RAG知识库（用于SubAgent调用）
        async queryRAGKnowledgeBase(query, ragList) {
            if (!ragList || ragList.length === 0) {
                window.Logger?.debug('RAG查询: 无RAG知识库配置');
                return '';
            }

            const startTime = performance.now();
            let context = '';
            const contextParts = [];
            const usageStats = {
                totalRAGs: ragList.length,
                matchedRAGs: 0,
                documentMatches: 0,
                builtinMatches: 0,
                externalMatches: 0,
                totalResults: 0
            };

            // 并行查询所有RAG知识库
            const ragPromises = ragList.map(async (rag) => {
                // 1. 检查是否有上传的文档（优先使用RAGManager.documents中的文档）
                // 首先检查rag.documents中引用的文档ID
                let docIds = [];
                if (rag.documents && rag.documents.length > 0) {
                    docIds = rag.documents.map(d => d.id).filter(id => id);
                }
                
                // 如果没有rag.documents，检查RAGManager.documents中是否有相关文档
                // 这里可以根据ragId或其他标识来匹配，暂时搜索所有文档
                if (docIds.length === 0 && window.RAGManager && window.RAGManager.documents) {
                    // 如果没有指定文档，搜索所有已向量化的文档
                    const allDocIds = Array.from(window.RAGManager.vectors.keys());
                    docIds = allDocIds;
                }
                
                if (docIds.length > 0) {
                    const searchResults = await window.RAGManager?.search(query, {
                        topK: 3,
                        minScore: 0.3,
                        docIds: docIds.length > 0 ? docIds : null
                    });

                    if (searchResults && searchResults.length > 0) {
                        usageStats.matchedRAGs++;
                        usageStats.documentMatches++;
                        usageStats.totalResults += searchResults.length;
                        return {
                            source: rag.name,
                            type: 'document',
                            content: searchResults.map(r => r.text).join('\n\n'),
                            results: searchResults
                        };
                    }
                }

                // 2. 检查是否有defaultContent（内置知识库内容）
                if (rag.defaultContent) {
                    // 对defaultContent进行简单的关键词匹配
                    const queryKeywords = this.extractKeywords(query, 5);
                    const contentKeywords = this.extractKeywords(rag.defaultContent, 20);
                    const matchScore = this.calculateKeywordMatch(queryKeywords, contentKeywords);
                    
                    if (matchScore > 0.2) {
                        usageStats.matchedRAGs++;
                        usageStats.builtinMatches++;
                        usageStats.totalResults++;
                        return {
                            source: rag.name,
                            type: 'builtin',
                            content: rag.defaultContent,
                            matchScore: matchScore
                        };
                    }
                }

                // 3. 检查外部数据源
                if (rag.externalSources && rag.externalSources.length > 0) {
                    const enabledSources = rag.externalSources.filter(s => s.enabled !== false);
                    if (enabledSources.length > 0) {
                        try {
                            const externalResults = await window.RAGManager?.searchExternalSources(query, rag.id, {
                                topK: 2,
                                minScore: 0.3
                            });
                            
                            if (externalResults && externalResults.length > 0) {
                                usageStats.matchedRAGs++;
                                usageStats.externalMatches++;
                                usageStats.totalResults += externalResults.length;
                                return {
                                    source: rag.name,
                                    type: 'external',
                                    content: externalResults.map(r => r.text).join('\n\n'),
                                    results: externalResults
                                };
                            }
                        } catch (error) {
                            window.Logger?.warn(`查询外部数据源失败 (${rag.name}):`, error);
                        }
                    }
                }

                return null;
            });

            const ragResults = await Promise.all(ragPromises);
            
            // 按相关性排序并构建上下文
            ragResults
                .filter(r => r !== null)
                .sort((a, b) => (b.matchScore || 1) - (a.matchScore || 1))
                .forEach(result => {
                    contextParts.push(`\n【${result.source}】\n${result.content}\n`);
                });

            context = contextParts.join('\n');

            const endTime = performance.now();
            const matchedCount = ragResults.filter(r => r !== null).length;
            
            // 记录使用统计
            window.Logger?.info(`RAG查询完成:`, {
                query: query.substring(0, 50) + (query.length > 50 ? '...' : ''),
                totalRAGs: usageStats.totalRAGs,
                matchedRAGs: matchedCount,
                documentMatches: usageStats.documentMatches,
                builtinMatches: usageStats.builtinMatches,
                externalMatches: usageStats.externalMatches,
                totalResults: usageStats.totalResults,
                contextLength: context.length,
                duration: `${(endTime - startTime).toFixed(2)}ms`
            });

            // 更新使用统计（可选：用于分析）
            if (!this.usageStats) {
                this.usageStats = {
                    totalQueries: 0,
                    totalMatches: 0,
                    avgDuration: 0
                };
            }
            this.usageStats.totalQueries++;
            this.usageStats.totalMatches += matchedCount;
            this.usageStats.avgDuration = (this.usageStats.avgDuration * (this.usageStats.totalQueries - 1) + (endTime - startTime)) / this.usageStats.totalQueries;

            return context;
        },

        // 计算关键词匹配度
        calculateKeywordMatch(queryKeywords, contentKeywords) {
            if (!queryKeywords || !contentKeywords || queryKeywords.length === 0) {
                return 0;
            }

            const matched = queryKeywords.filter(k => contentKeywords.includes(k)).length;
            return matched / queryKeywords.length;
        },

        // ==================== 文档管理 ====================
        // 添加文档（简化版，接受文档对象或文件）
        async addDocument(docOrFile) {
            try {
                // 如果传入的是文件对象，使用parseDocument
                if (docOrFile instanceof File || docOrFile instanceof Blob) {
                    return await this.parseDocument(docOrFile);
                }
                
                // 如果传入的是文档对象
                if (docOrFile && typeof docOrFile === 'object') {
                    const docId = docOrFile.id || 'doc_' + Date.now();
                    const docInfo = {
                        id: docId,
                        name: docOrFile.name || '未命名文档',
                        type: docOrFile.type || 'text/plain',
                        content: docOrFile.content || docOrFile.text || '',
                        uploadedAt: docOrFile.uploadedAt || Date.now(),
                        status: 'parsed',
                        chunks: [],
                        metadata: docOrFile.metadata || {}
                    };
                    
                    // 如果有内容，进行分块和向量化
                    if (docInfo.content) {
                        docInfo.chunks = this.chunkContent(docInfo.content, 500, 50);
                        await this.generateVectors(docId, docInfo.chunks);
                    }
                    
                    this.documents.push(docInfo);
                    this.saveDocuments();
                    
                    return docInfo;
                }
                
                throw new Error('无效的文档参数');
            } catch (error) {
                window.Logger?.error('添加文档失败:', error);
                throw error;
            }
        },

        getDocument(docId) {
            return this.documents.find(d => d.id === docId);
        },

        getAllDocuments() {
            return [...this.documents];
        },

        deleteDocument(docId) {
            this.documents = this.documents.filter(d => d.id !== docId);
            this.vectors.delete(docId);
            this.saveDocuments();
            this.saveVectors();
        },

        getDocumentStats() {
            return {
                total: this.documents.length,
                parsed: this.documents.filter(d => d.status === 'parsed').length,
                parsing: this.documents.filter(d => d.status === 'parsing').length,
                error: this.documents.filter(d => d.status === 'error').length,
                totalChunks: this.documents.reduce((sum, d) => sum + (d.chunks?.length || 0), 0)
            };
        },

        // ==================== 外部数据源管理 ====================
        externalSources: [],
        
        // 添加外部数据源
        addExternalSource(source) {
            const newSource = {
                id: 'ext_' + Date.now(),
                name: source.name,
                url: source.url,
                type: source.type || 'website', // website, api, database
                description: source.description || '',
                ragId: source.ragId || null, // 关联的RAG知识库ID
                enabled: true,
                addedAt: Date.now(),
                lastSync: null,
                syncStatus: 'idle' // idle, syncing, success, error
            };
            
            this.externalSources.push(newSource);
            this.saveExternalSources();
            return newSource;
        },
        
        // 删除外部数据源
        removeExternalSource(sourceId) {
            this.externalSources = this.externalSources.filter(s => s.id !== sourceId);
            this.saveExternalSources();
        },
        
        // 获取外部数据源
        getExternalSources(ragId = null) {
            if (ragId) {
                return this.externalSources.filter(s => s.ragId === ragId);
            }
            return [...this.externalSources];
        },
        
        // 保存外部数据源
        saveExternalSources() {
            localStorage.setItem('ai_agent_rag_external_sources_v6', JSON.stringify(this.externalSources));
        },
        
        // 加载外部数据源
        loadExternalSources() {
            const saved = localStorage.getItem('ai_agent_rag_external_sources_v6');
            if (saved) {
                try {
                    this.externalSources = JSON.parse(saved);
                } catch (e) {
                    window.Logger?.error('加载外部数据源失败:', e);
                    this.externalSources = [];
                }
            }
        },
        
        // 同步外部数据源
        async syncExternalSource(sourceId) {
            const source = this.externalSources.find(s => s.id === sourceId);
            if (!source) return null;
            
            source.syncStatus = 'syncing';
            
            try {
                let content = '';
                
                if (source.type === 'website') {
                    // 使用Jina AI Reader API获取网页内容
                    const apiKey = this.getJinaAIKey();
                    const headers = {
                        'X-Return-Format': 'text'
                    };
                    
                    if (apiKey) {
                        headers['Authorization'] = `Bearer ${apiKey}`;
                    }
                    
                    const response = await fetch(`https://r.jina.ai/http://${source.url.replace(/^https?:\/\//, '')}`, {
                        headers: headers
                    });
                    
                    if (!response.ok) {
                        const errorText = await response.text().catch(() => '');
                        if (response.status === 401 || response.status === 403) {
                            throw new Error(`Jina AI API密钥无效或已过期。请检查设置中的Jina AI API密钥配置。`);
                        } else if (response.status === 429) {
                            throw new Error(`Jina AI API请求频率限制。请稍后重试。`);
                        } else {
                            throw new Error(`获取网页失败: ${response.status} ${errorText.substring(0, 100)}`);
                        }
                    }
                    content = await response.text();
                } else if (source.type === 'api') {
                    // API数据源
                    const response = await fetch(source.url);
                    if (!response.ok) throw new Error('API请求失败');
                    const data = await response.json();
                    content = JSON.stringify(data, null, 2);
                }
                
                // 创建文档
                const docId = 'ext_doc_' + sourceId;
                const docInfo = {
                    id: docId,
                    name: source.name,
                    type: 'text/plain',
                    sourceType: 'external',
                    sourceId: sourceId,
                    url: source.url,
                    uploadedAt: Date.now(),
                    status: 'parsed',
                    chunks: this.chunkContent(content, 500, 50),
                    metadata: { 
                        source: source.url,
                        type: source.type,
                        description: source.description
                    }
                };
                
                // 生成向量
                await this.generateVectors(docId, docInfo.chunks);
                
                // 更新或添加文档
                const existingIndex = this.documents.findIndex(d => d.id === docId);
                if (existingIndex >= 0) {
                    this.documents[existingIndex] = docInfo;
                } else {
                    this.documents.push(docInfo);
                }
                this.saveDocuments();
                
                source.syncStatus = 'success';
                source.lastSync = Date.now();
                this.saveExternalSources();
                
                return docInfo;
            } catch (error) {
                window.ErrorHandler?.handle(error, {
                    type: window.ErrorType?.NETWORK,
                    showToast: true,
                    logError: true
                });
                source.syncStatus = 'error';
                source.error = error.message;
                this.saveExternalSources();
                throw error;
            }
        },
        
        // 搜索外部数据源
        async searchExternalSources(query, ragId, options = {}) {
            const { topK = 3, minScore = 0.3 } = options;
            
            // 获取关联的外部数据源
            const sources = this.getExternalSources(ragId);
            const enabledSources = sources.filter(s => s.enabled);
            
            if (enabledSources.length === 0) return [];
            
            const results = [];
            const queryVector = this.simpleEmbedding(query);
            
            for (const source of enabledSources) {
                const docId = 'ext_doc_' + source.id;
                const docVectors = this.vectors.get(docId);
                
                if (!docVectors) {
                    // 如果未同步，尝试同步
                    try {
                        await this.syncExternalSource(source.id);
                    } catch (e) {
                        continue;
                    }
                }
                
                const docVectors2 = this.vectors.get(docId);
                if (!docVectors2) continue;
                
                for (const item of docVectors2) {
                    const score = this.cosineSimilarity(queryVector, item.vector);
                    if (score >= minScore) {
                        results.push({
                            source: source.name,
                            sourceUrl: source.url,
                            type: 'external',
                            text: item.text,
                            score
                        });
                    }
                }
            }
            
            results.sort((a, b) => b.score - a.score);
            return results.slice(0, topK);
        }
    };

    // 暴露到全局
    window.RAGManager = RAGManager;
})();
