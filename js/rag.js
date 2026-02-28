/**
 * AI Agent Pro v6.0.0 - RAG文档解析与向量化模块
 * 支持PDF、DOC、网页、文本的解析和语义检索
 */

(function() {
    'use strict';

    const RAGManager = {
        documents: [],
        vectors: new Map(), // 文档ID -> 向量列表
        
        // ==================== 初始化 ====================
        init() {
            this.loadDocuments();
            this.loadVectors();
        },

        loadDocuments() {
            const saved = localStorage.getItem('ai_agent_rag_docs_v6');
            if (saved) {
                try {
                    this.documents = JSON.parse(saved);
                } catch (e) {
                    console.error('加载RAG文档失败:', e);
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
                    console.error('加载向量数据失败:', e);
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
                if (file.type === 'text/plain' || file.type === 'text/markdown') {
                    content = await this.readTextFile(file);
                } else if (file.type === 'application/pdf') {
                    content = await this.parsePDF(file);
                } else if (file.type.includes('word') || file.type.includes('document')) {
                    content = await this.parseDOC(file);
                } else if (file.type === 'text/html' || file.name.endsWith('.html')) {
                    content = await this.parseHTML(file);
                } else {
                    throw new Error('不支持的文件类型: ' + file.type);
                }

                // 分块处理
                docInfo.chunks = this.chunkContent(content, chunkSize, overlap);
                docInfo.metadata = this.extractMetadata(content);
                docInfo.status = 'parsed';

                // 生成向量
                await this.generateVectors(docId, docInfo.chunks);

            } catch (error) {
                console.error('文档解析失败:', error);
                docInfo.status = 'error';
                docInfo.error = error.message;
            }

            this.documents.push(docInfo);
            this.saveDocuments();
            
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

        // 解析PDF（简化版，实际项目需要PDF.js等库）
        async parsePDF(file) {
            // 返回文件基本信息，实际解析需要PDF.js
            return `[PDF文档: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(2)} KB\n\n(注意：PDF解析需要后端服务或PDF.js库支持)`;
        },

        // 解析DOC（简化版）
        async parseDOC(file) {
            return `[Word文档: ${file.name}]\n文件大小: ${(file.size / 1024).toFixed(2)} KB\n\n(注意：DOC解析需要后端服务支持)`;
        },

        // 解析HTML
        async parseHTML(file) {
            const html = await this.readTextFile(file);
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // 移除脚本和样式
            doc.querySelectorAll('script, style, nav, footer, header').forEach(el => el.remove());
            
            // 提取正文
            const mainContent = doc.querySelector('main, article, .content, #content') || doc.body;
            return mainContent.textContent.trim();
        },

        // 解析网页URL
        async parseURL(url) {
            try {
                // 使用fetch获取网页内容（需要CORS支持）
                const response = await fetch(`https://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}`);
                if (!response.ok) throw new Error('获取网页失败');
                
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
                console.error('URL解析失败:', error);
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

        // ==================== 向量生成（简化版） ====================
        async generateVectors(docId, chunks) {
            // 简化的向量生成：使用词袋模型
            // 实际项目应该调用Embedding API（如OpenAI、智谱等）
            const vectors = chunks.map(chunk => ({
                chunkId: chunk.id,
                vector: this.simpleEmbedding(chunk.text),
                text: chunk.text
            }));
            
            this.vectors.set(docId, vectors);
            this.saveVectors();
        },

        // 简化的词袋嵌入
        simpleEmbedding(text) {
            // 创建一个简单的哈希向量
            const vector = new Array(128).fill(0);
            const words = text.toLowerCase().split(/\s+/);
            
            words.forEach((word, i) => {
                for (let j = 0; j < word.length; j++) {
                    const charCode = word.charCodeAt(j);
                    vector[charCode % 128] += 1;
                }
            });
            
            // 归一化
            const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
            return magnitude > 0 ? vector.map(v => v / magnitude) : vector;
        },

        // ==================== 语义检索 ====================
        async search(query, options = {}) {
            const {
                topK = 5,
                docIds = null, // 指定文档ID列表，null表示搜索所有
                minScore = 0.5
            } = options;

            const queryVector = this.simpleEmbedding(query);
            const results = [];

            const targetDocIds = docIds || Array.from(this.vectors.keys());

            for (const docId of targetDocIds) {
                const docVectors = this.vectors.get(docId);
                if (!docVectors) continue;

                const doc = this.documents.find(d => d.id === docId);
                if (!doc) continue;

                for (const item of docVectors) {
                    const score = this.cosineSimilarity(queryVector, item.vector);
                    if (score >= minScore) {
                        results.push({
                            docId,
                            docName: doc.name,
                            chunkId: item.chunkId,
                            text: item.text,
                            score
                        });
                    }
                }
            }

            // 按相似度排序
            results.sort((a, b) => b.score - a.score);
            
            return results.slice(0, topK);
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

        // ==================== 构建RAG上下文 ====================
        async buildRAGContext(query, ragConfigs) {
            const contexts = [];
            
            for (const config of ragConfigs) {
                if (config.type === 'document') {
                    // 搜索上传的文档
                    const docResults = await this.search(query, {
                        topK: 3,
                        minScore: 0.3
                    });
                    
                    if (docResults.length > 0) {
                        contexts.push({
                            source: config.name,
                            type: 'document',
                            content: docResults.map(r => r.text).join('\n\n')
                        });
                    }
                } else if (config.type === 'web') {
                    // 网页知识库（简化版）
                    contexts.push({
                        source: config.name,
                        type: 'web',
                        content: `[网页知识库: ${config.name}]`
                    });
                }
            }
            
            return contexts;
        },

        // ==================== 文档管理 ====================
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
                    console.error('加载外部数据源失败:', e);
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
                    // 使用jina.ai摘要服务获取网页内容
                    const response = await fetch(`https://r.jina.ai/http://${source.url.replace(/^https?:\/\//, '')}`);
                    if (!response.ok) throw new Error('获取网页失败');
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
                console.error('同步外部数据源失败:', error);
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
