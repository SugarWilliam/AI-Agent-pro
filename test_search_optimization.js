/**
 * 搜索源优化测试脚本
 * 用于验证每个搜索源是否至少返回5条强相关性信息
 */

// 测试用例
const testCases = [
    {
        name: '测试1: 基本搜索功能',
        query: '美国和伊朗最新2026年局势',
        expectedMinResults: 5,
        description: '验证基本搜索功能是否正常工作'
    },
    {
        name: '测试2: 中文查询',
        query: '2026年人工智能发展趋势',
        expectedMinResults: 5,
        description: '验证中文查询的处理能力'
    },
    {
        name: '测试3: 英文查询',
        query: 'AI technology trends 2026',
        expectedMinResults: 5,
        description: '验证英文查询的处理能力'
    },
    {
        name: '测试4: 短查询',
        query: 'AI',
        expectedMinResults: 5,
        description: '验证短查询的处理能力'
    }
];

// 测试函数
async function runTests() {
    console.log('='.repeat(60));
    console.log('搜索源优化测试开始');
    console.log('='.repeat(60));
    
    if (!window.LLMService || !window.LLMService.performWebSearch) {
        console.error('❌ LLMService.performWebSearch 不可用');
        return;
    }
    
    const results = [];
    
    for (const testCase of testCases) {
        console.log(`\n📋 ${testCase.name}`);
        console.log(`   查询: "${testCase.query}"`);
        console.log(`   描述: ${testCase.description}`);
        
        try {
            const startTime = Date.now();
            const searchResults = await window.LLMService.performWebSearch(testCase.query);
            const duration = Date.now() - startTime;
            
            // 统计结果
            const sourceStats = {};
            const sourceResults = {};
            
            searchResults.forEach(result => {
                const source = result.source || '未知';
                sourceStats[source] = (sourceStats[source] || 0) + 1;
                if (!sourceResults[source]) {
                    sourceResults[source] = [];
                }
                sourceResults[source].push(result);
            });
            
            // 验证每个搜索源的结果数量
            const sourceValidation = {};
            Object.keys(sourceStats).forEach(source => {
                const count = sourceStats[source];
                const isValid = count >= testCase.expectedMinResults;
                sourceValidation[source] = {
                    count,
                    isValid,
                    results: sourceResults[source]
                };
            });
            
            // 输出结果
            console.log(`   ⏱️  耗时: ${duration}ms`);
            console.log(`   📊 总结果数: ${searchResults.length}`);
            console.log(`   📈 搜索源统计:`);
            
            let allValid = true;
            Object.entries(sourceValidation).forEach(([source, data]) => {
                const status = data.isValid ? '✅' : '⚠️';
                console.log(`      ${status} ${source}: ${data.count}个结果`);
                if (!data.isValid) {
                    allValid = false;
                    console.log(`         ⚠️  警告: ${source}仅返回${data.count}个结果，少于预期的${testCase.expectedMinResults}个`);
                }
            });
            
            // 检查去重
            const urlSet = new Set();
            let duplicateCount = 0;
            searchResults.forEach(result => {
                if (result.url) {
                    if (urlSet.has(result.url)) {
                        duplicateCount++;
                    } else {
                        urlSet.add(result.url);
                    }
                }
            });
            
            if (duplicateCount > 0) {
                console.log(`   ⚠️  发现${duplicateCount}个重复结果`);
                allValid = false;
            } else {
                console.log(`   ✅ 去重检查通过`);
            }
            
            // 检查结果质量
            let invalidResults = 0;
            searchResults.forEach(result => {
                if (!result.url || !result.title) {
                    invalidResults++;
                }
            });
            
            if (invalidResults > 0) {
                console.log(`   ⚠️  发现${invalidResults}个无效结果（缺少URL或标题）`);
                allValid = false;
            } else {
                console.log(`   ✅ 结果质量检查通过`);
            }
            
            // 测试结果
            const testResult = {
                name: testCase.name,
                query: testCase.query,
                duration,
                totalResults: searchResults.length,
                sourceStats,
                sourceValidation,
                duplicateCount,
                invalidResults,
                allValid,
                passed: allValid && searchResults.length >= testCase.expectedMinResults
            };
            
            results.push(testResult);
            
            if (testResult.passed) {
                console.log(`   ✅ 测试通过`);
            } else {
                console.log(`   ❌ 测试失败`);
            }
            
        } catch (error) {
            console.error(`   ❌ 测试失败: ${error.message}`);
            console.error(error);
            
            results.push({
                name: testCase.name,
                query: testCase.query,
                error: error.message,
                passed: false
            });
        }
    }
    
    // 输出总结
    console.log('\n' + '='.repeat(60));
    console.log('测试总结');
    console.log('='.repeat(60));
    
    const passedTests = results.filter(r => r.passed).length;
    const totalTests = results.length;
    
    console.log(`总测试数: ${totalTests}`);
    console.log(`通过: ${passedTests}`);
    console.log(`失败: ${totalTests - passedTests}`);
    
    if (passedTests === totalTests) {
        console.log('\n🎉 所有测试通过！');
    } else {
        console.log('\n⚠️  部分测试失败，请检查上述输出');
    }
    
    // 返回结果供进一步分析
    return results;
}

// 导出测试函数
if (typeof window !== 'undefined') {
    window.testSearchOptimization = runTests;
    console.log('✅ 测试脚本已加载，运行 window.testSearchOptimization() 开始测试');
}

// 如果是在Node.js环境中运行
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runTests, testCases };
}
