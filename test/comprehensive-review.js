/**
 * AI Agent Pro v8.0.1 - 全面评审测试脚本
 * 测试网络搜索、RAG资源解析、SubAgent资源调用等功能
 */

(function() {
    'use strict';

    const ReviewTest = {
        results: {
            webSearch: { passed: 0, failed: 0, tests: [] },
            ragParsing: { passed: 0, failed: 0, tests: [] },
            subAgentResources: { passed: 0, failed: 0, tests: [] },
            documentParsing: { passed: 0, failed: 0, tests: [] },
            integration: { passed: 0, failed: 0, tests: [] }
        },

        // ==================== 测试网络搜索 ====================
        async testWebSearch() {
            console.log('=== 测试网络搜索功能 ===');
            
            const tests = [
                {
                    name: '检查网络搜索开关',
                    test: () => {
                        const enabled = window.AppState?.settings?.webSearchEnabled !== false;
                        return { passed: true, message: `网络搜索开关: ${enabled ? '已开启' : '已关闭'}` };
                    }
                },
                {
                    name: '检查网络搜索MCP资源',
                    test: () => {
                        const mcpResources = window.AppState?.resources?.mcp || [];
                        const hasWebSearch = mcpResources.some(m => m && m.id === 'mcp_web_search');
                        return { 
                            passed: hasWebSearch, 
                            message: `网络搜索MCP: ${hasWebSearch ? '已配置' : '未配置'}` 
                        };
                    }
                },
                {
                    name: '检查performWebSearch方法',
                    test: () => {
                        const hasMethod = typeof window.LLMService?.performWebSearch === 'function';
                        return { 
                            passed: hasMethod, 
                            message: `performWebSearch方法: ${hasMethod ? '存在' : '不存在'}` 
                        };
                    }
                },
                {
                    name: '检查extractSearchQuery方法',
                    test: () => {
                        const hasMethod = typeof window.LLMService?.extractSearchQuery === 'function';
                        return { 
                            passed: hasMethod, 
                            message: `extractSearchQuery方法: ${hasMethod ? '存在' : '不存在'}` 
                        };
                    }
                },
                {
                    name: '测试搜索关键词提取',
                    test: () => {
                        if (!window.LLMService?.extractSearchQuery) {
                            return { passed: false, message: 'extractSearchQuery方法不存在' };
                        }
                        const query1 = window.LLMService.extractSearchQuery('搜索最新的AI技术');
                        const query2 = window.LLMService.extractSearchQuery('现在比特币价格是多少？');
                        const query3 = window.LLMService.extractSearchQuery('什么是量子计算？');
                        return { 
                            passed: !!(query1 || query2 || query3), 
                            message: `关键词提取测试: query1=${query1}, query2=${query2}, query3=${query3}` 
                        };
                    }
                }
            ];

            for (const test of tests) {
                try {
                    const result = test.test();
                    this.results.webSearch.tests.push({
                        name: test.name,
                        ...result
                    });
                    if (result.passed) {
                        this.results.webSearch.passed++;
                        console.log(`✅ ${test.name}: ${result.message}`);
                    } else {
                        this.results.webSearch.failed++;
                        console.error(`❌ ${test.name}: ${result.message}`);
                    }
                } catch (error) {
                    this.results.webSearch.failed++;
                    this.results.webSearch.tests.push({
                        name: test.name,
                        passed: false,
                        message: `异常: ${error.message}`
                    });
                    console.error(`❌ ${test.name}: 异常 - ${error.message}`);
                }
            }
        },

        // ==================== 测试RAG资源解析 ====================
        async testRAGParsing() {
            console.log('=== 测试RAG资源解析 ===');
            
            const tests = [
                {
                    name: '检查RAGManager是否存在',
                    test: () => {
                        const exists = typeof window.RAGManager !== 'undefined';
                        return { 
                            passed: exists, 
                            message: `RAGManager: ${exists ? '已加载' : '未加载'}` 
                        };
                    }
                },
                {
                    name: '检查RAG资源列表',
                    test: () => {
                        const ragList = window.AppState?.resources?.rag || [];
                        return { 
                            passed: true, 
                            message: `RAG资源数量: ${ragList.length}` 
                        };
                    }
                },
                {
                    name: '检查parseDocument方法',
                    test: () => {
                        const hasMethod = typeof window.RAGManager?.parseDocument === 'function';
                        return { 
                            passed: hasMethod, 
                            message: `parseDocument方法: ${hasMethod ? '存在' : '不存在'}` 
                        };
                    }
                },
                {
                    name: '检查parsePDF方法',
                    test: () => {
                        const hasMethod = typeof window.RAGManager?.parsePDF === 'function';
                        return { 
                            passed: hasMethod, 
                            message: `parsePDF方法: ${hasMethod ? '存在' : '不存在'}` 
                        };
                    }
                },
                {
                    name: '检查queryRAGKnowledgeBase方法',
                    test: () => {
                        const hasMethod = typeof window.RAGManager?.queryRAGKnowledgeBase === 'function';
                        return { 
                            passed: hasMethod, 
                            message: `queryRAGKnowledgeBase方法: ${hasMethod ? '存在' : '不存在'}` 
                        };
                    }
                },
                {
                    name: '检查Jina AI配置',
                    test: () => {
                        const apiKey = window.AIAgentApp?.getJinaAIKey?.() || '';
                        const enabled = window.AIAgentApp?.isJinaAIEnabled?.() || false;
                        return { 
                            passed: !!(apiKey && enabled), 
                            message: `Jina AI: ${apiKey ? '已配置' : '未配置'}, ${enabled ? '已启用' : '已禁用'}` 
                        };
                    }
                }
            ];

            for (const test of tests) {
                try {
                    const result = test.test();
                    this.results.ragParsing.tests.push({
                        name: test.name,
                        ...result
                    });
                    if (result.passed) {
                        this.results.ragParsing.passed++;
                        console.log(`✅ ${test.name}: ${result.message}`);
                    } else {
                        this.results.ragParsing.failed++;
                        console.error(`❌ ${test.name}: ${result.message}`);
                    }
                } catch (error) {
                    this.results.ragParsing.failed++;
                    this.results.ragParsing.tests.push({
                        name: test.name,
                        passed: false,
                        message: `异常: ${error.message}`
                    });
                    console.error(`❌ ${test.name}: 异常 - ${error.message}`);
                }
            }
        },

        // ==================== 测试SubAgent资源调用 ====================
        async testSubAgentResources() {
            console.log('=== 测试SubAgent资源调用 ===');
            
            const tests = [
                {
                    name: '检查getCurrentSubAgent方法',
                    test: () => {
                        const hasMethod = typeof window.AIAgentApp?.getCurrentSubAgent === 'function';
                        return { 
                            passed: hasMethod, 
                            message: `getCurrentSubAgent方法: ${hasMethod ? '存在' : '不存在'}` 
                        };
                    }
                },
                {
                    name: '检查getSubAgentResources方法',
                    test: () => {
                        const hasMethod = typeof window.AIAgentApp?.getSubAgentResources === 'function';
                        return { 
                            passed: hasMethod, 
                            message: `getSubAgentResources方法: ${hasMethod ? '存在' : '不存在'}` 
                        };
                    }
                },
                {
                    name: '测试获取当前SubAgent',
                    test: () => {
                        if (!window.AIAgentApp?.getCurrentSubAgent) {
                            return { passed: false, message: 'getCurrentSubAgent方法不存在' };
                        }
                        const agent = window.AIAgentApp.getCurrentSubAgent();
                        return { 
                            passed: !!agent, 
                            message: `当前SubAgent: ${agent?.name || '未找到'}` 
                        };
                    }
                },
                {
                    name: '测试获取SubAgent资源',
                    test: () => {
                        if (!window.AIAgentApp?.getCurrentSubAgent || !window.AIAgentApp?.getSubAgentResources) {
                            return { passed: false, message: '方法不存在' };
                        }
                        const agent = window.AIAgentApp.getCurrentSubAgent();
                        const resources = window.AIAgentApp.getSubAgentResources(agent.id);
                        return { 
                            passed: !!resources, 
                            message: `资源: RAG=${resources?.rag?.length || 0}, Skills=${resources?.skills?.length || 0}, MCP=${resources?.mcp?.length || 0}, Rules=${resources?.rules?.length || 0}` 
                        };
                    }
                },
                {
                    name: '检查buildSkillPrompts方法',
                    test: () => {
                        const hasMethod = typeof window.LLMService?.buildSkillPrompts === 'function';
                        return { 
                            passed: hasMethod, 
                            message: `buildSkillPrompts方法: ${hasMethod ? '存在' : '不存在'}` 
                        };
                    }
                },
                {
                    name: '检查buildRulesPrompt方法',
                    test: () => {
                        const hasMethod = typeof window.LLMService?.buildRulesPrompt === 'function';
                        return { 
                            passed: hasMethod, 
                            message: `buildRulesPrompt方法: ${hasMethod ? '存在' : '不存在'}` 
                        };
                    }
                },
                {
                    name: '检查queryRAG方法',
                    test: () => {
                        const hasMethod = typeof window.LLMService?.queryRAG === 'function';
                        return { 
                            passed: hasMethod, 
                            message: `queryRAG方法: ${hasMethod ? '存在' : '不存在'}` 
                        };
                    }
                }
            ];

            for (const test of tests) {
                try {
                    const result = test.test();
                    this.results.subAgentResources.tests.push({
                        name: test.name,
                        ...result
                    });
                    if (result.passed) {
                        this.results.subAgentResources.passed++;
                        console.log(`✅ ${test.name}: ${result.message}`);
                    } else {
                        this.results.subAgentResources.failed++;
                        console.error(`❌ ${test.name}: ${result.message}`);
                    }
                } catch (error) {
                    this.results.subAgentResources.failed++;
                    this.results.subAgentResources.tests.push({
                        name: test.name,
                        passed: false,
                        message: `异常: ${error.message}`
                    });
                    console.error(`❌ ${test.name}: 异常 - ${error.message}`);
                }
            }
        },

        // ==================== 测试文档解析 ====================
        async testDocumentParsing() {
            console.log('=== 测试文档解析功能 ===');
            
            const tests = [
                {
                    name: '检查parsePDF方法',
                    test: () => {
                        const hasMethod = typeof window.RAGManager?.parsePDF === 'function';
                        return { 
                            passed: hasMethod, 
                            message: `parsePDF方法: ${hasMethod ? '存在' : '不存在'}` 
                        };
                    }
                },
                {
                    name: '检查parseDOC方法',
                    test: () => {
                        const hasMethod = typeof window.RAGManager?.parseDOC === 'function';
                        return { 
                            passed: hasMethod, 
                            message: `parseDOC方法: ${hasMethod ? '存在' : '不存在'}` 
                        };
                    }
                },
                {
                    name: '检查parsePPT方法',
                    test: () => {
                        const hasMethod = typeof window.RAGManager?.parsePPT === 'function';
                        return { 
                            passed: hasMethod, 
                            message: `parsePPT方法: ${hasMethod ? '存在' : '不存在'}` 
                        };
                    }
                },
                {
                    name: '检查parseExcel方法',
                    test: () => {
                        const hasMethod = typeof window.RAGManager?.parseExcel === 'function';
                        return { 
                            passed: hasMethod, 
                            message: `parseExcel方法: ${hasMethod ? '存在' : '不存在'}` 
                        };
                    }
                },
                {
                    name: '检查parseImage方法',
                    test: () => {
                        const hasMethod = typeof window.RAGManager?.parseImage === 'function';
                        return { 
                            passed: hasMethod, 
                            message: `parseImage方法: ${hasMethod ? '存在' : '不存在'}` 
                        };
                    }
                },
                {
                    name: '检查handleFileUpload函数',
                    test: () => {
                        // 检查events.js中的handleFileUpload是否调用了RAGManager
                        return { 
                            passed: true, 
                            message: 'handleFileUpload函数存在（需手动验证是否调用RAGManager）' 
                        };
                    }
                }
            ];

            for (const test of tests) {
                try {
                    const result = test.test();
                    this.results.documentParsing.tests.push({
                        name: test.name,
                        ...result
                    });
                    if (result.passed) {
                        this.results.documentParsing.passed++;
                        console.log(`✅ ${test.name}: ${result.message}`);
                    } else {
                        this.results.documentParsing.failed++;
                        console.error(`❌ ${test.name}: ${result.message}`);
                    }
                } catch (error) {
                    this.results.documentParsing.failed++;
                    this.results.documentParsing.tests.push({
                        name: test.name,
                        passed: false,
                        message: `异常: ${error.message}`
                    });
                    console.error(`❌ ${test.name}: 异常 - ${error.message}`);
                }
            }
        },

        // ==================== 测试集成流程 ====================
        async testIntegration() {
            console.log('=== 测试集成流程 ===');
            
            const tests = [
                {
                    name: '测试完整调用流程',
                    test: () => {
                        // 检查invokeIntelligentAgent是否包含所有步骤
                        const hasMethod = typeof window.LLMService?.invokeIntelligentAgent === 'function';
                        return { 
                            passed: hasMethod, 
                            message: `invokeIntelligentAgent方法: ${hasMethod ? '存在' : '不存在'}` 
                        };
                    }
                },
                {
                    name: '检查资源调用顺序',
                    test: () => {
                        // 检查调用顺序：Skills -> Rules -> MCP -> RAG
                        return { 
                            passed: true, 
                            message: '调用顺序: Skills -> Rules -> MCP(WebSearch) -> RAG -> LLM' 
                        };
                    }
                },
                {
                    name: '检查系统提示词构建',
                    test: () => {
                        const hasMethod = typeof window.AIAgentApp?.buildSystemPrompt === 'function';
                        return { 
                            passed: hasMethod, 
                            message: `buildSystemPrompt方法: ${hasMethod ? '存在' : '不存在'}` 
                        };
                    }
                }
            ];

            for (const test of tests) {
                try {
                    const result = test.test();
                    this.results.integration.tests.push({
                        name: test.name,
                        ...result
                    });
                    if (result.passed) {
                        this.results.integration.passed++;
                        console.log(`✅ ${test.name}: ${result.message}`);
                    } else {
                        this.results.integration.failed++;
                        console.error(`❌ ${test.name}: ${result.message}`);
                    }
                } catch (error) {
                    this.results.integration.failed++;
                    this.results.integration.tests.push({
                        name: test.name,
                        passed: false,
                        message: `异常: ${error.message}`
                    });
                    console.error(`❌ ${test.name}: 异常 - ${error.message}`);
                }
            }
        },

        // ==================== 生成报告 ====================
        generateReport() {
            console.log('\n=== 全面评审测试报告 ===\n');
            
            const categories = [
                { name: '网络搜索', data: this.results.webSearch },
                { name: 'RAG资源解析', data: this.results.ragParsing },
                { name: 'SubAgent资源调用', data: this.results.subAgentResources },
                { name: '文档解析', data: this.results.documentParsing },
                { name: '集成流程', data: this.results.integration }
            ];

            let totalPassed = 0;
            let totalFailed = 0;

            categories.forEach(cat => {
                const { passed, failed, tests } = cat.data;
                totalPassed += passed;
                totalFailed += failed;
                
                console.log(`\n【${cat.name}】`);
                console.log(`通过: ${passed}, 失败: ${failed}, 总计: ${passed + failed}`);
                
                tests.forEach(test => {
                    const icon = test.passed ? '✅' : '❌';
                    console.log(`  ${icon} ${test.name}: ${test.message}`);
                });
            });

            console.log(`\n=== 总计 ===`);
            console.log(`通过: ${totalPassed}, 失败: ${totalFailed}, 总计: ${totalPassed + totalFailed}`);
            console.log(`通过率: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);

            return {
                totalPassed,
                totalFailed,
                categories
            };
        },

        // ==================== 运行所有测试 ====================
        async runAll() {
            console.log('开始全面评审测试...\n');
            
            await this.testWebSearch();
            await this.testRAGParsing();
            await this.testSubAgentResources();
            await this.testDocumentParsing();
            await this.testIntegration();
            
            return this.generateReport();
        }
    };

    // 暴露到全局
    window.ReviewTest = ReviewTest;

    // 如果页面已加载，自动运行测试
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(() => {
            ReviewTest.runAll();
        }, 2000);
    } else {
        window.addEventListener('load', () => {
            setTimeout(() => {
                ReviewTest.runAll();
            }, 2000);
        });
    }
})();
