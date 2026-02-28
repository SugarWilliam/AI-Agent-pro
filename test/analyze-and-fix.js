/**
 * 测试报告分析和自动修复工具
 * 根据测试报告自动识别问题并生成修复建议
 */

const fs = require('fs');
const path = require('path');

function analyzeReport(reportPath) {
    try {
        const reportContent = fs.readFileSync(reportPath, 'utf-8');
        const report = JSON.parse(reportContent);
        
        console.log('==========================================');
        console.log('📊 测试报告分析');
        console.log('==========================================');
        console.log('');
        
        const results = report.results || {};
        const tests = report.tests || [];
        const failedTests = tests.filter(t => t.status === 'failed');
        const skippedTests = tests.filter(t => t.status === 'skipped');
        
        // 总体统计
        console.log('📈 总体统计:');
        console.log(`   总测试数: ${results.total || 0}`);
        console.log(`   ✅ 通过: ${results.passed || 0}`);
        console.log(`   ❌ 失败: ${results.failed || 0}`);
        console.log(`   ⏭️  跳过: ${results.skipped || 0}`);
        console.log(`   通过率: ${results.passRate || 0}%`);
        console.log(`   耗时: ${results.duration || 0}秒`);
        console.log('');
        
        // 失败测试分析
        if (failedTests.length > 0) {
            console.log('❌ 失败的测试分析:');
            console.log('');
            
            const failuresByCategory = {};
            const failuresByError = {};
            
            failedTests.forEach(test => {
                const category = test.category || 'unknown';
                if (!failuresByCategory[category]) {
                    failuresByCategory[category] = [];
                }
                failuresByCategory[category].push(test);
                
                const error = test.error || 'Unknown error';
                const errorKey = error.split(':')[0]; // 提取错误类型
                if (!failuresByError[errorKey]) {
                    failuresByError[errorKey] = [];
                }
                failuresByError[errorKey].push(test);
            });
            
            // 按类别显示
            console.log('按类别分组:');
            Object.entries(failuresByCategory).forEach(([category, tests]) => {
                console.log(`   ${category}: ${tests.length}个失败`);
                tests.forEach(test => {
                    console.log(`      - ${test.name}`);
                    if (test.error) {
                        console.log(`        错误: ${test.error.substring(0, 80)}...`);
                    }
                });
            });
            console.log('');
            
            // 按错误类型分组
            console.log('按错误类型分组:');
            Object.entries(failuresByError).forEach(([errorType, tests]) => {
                console.log(`   ${errorType}: ${tests.length}个失败`);
            });
            console.log('');
            
            // 生成修复建议
            console.log('🔧 修复建议:');
            generateFixSuggestions(failedTests);
        } else {
            console.log('✅ 所有测试通过！');
            console.log('');
        }
        
        // 跳过测试分析
        if (skippedTests.length > 0) {
            console.log('⏭️  跳过的测试:');
            skippedTests.forEach(test => {
                console.log(`   - ${test.name}: ${test.details || '无详情'}`);
            });
            console.log('');
        }
        
        // 覆盖率分析
        if (results.coverage) {
            console.log('📊 覆盖率统计:');
            Object.entries(results.coverage).forEach(([category, stats]) => {
                if (typeof stats === 'object' && stats.total) {
                    const percent = ((stats.tested / stats.total) * 100).toFixed(1);
                    const status = percent >= 80 ? '✅' : percent >= 50 ? '⚠️' : '❌';
                    console.log(`   ${status} ${category}: ${percent}% (${stats.tested}/${stats.total})`);
                }
            });
            console.log('');
        }
        
        return {
            total: results.total || 0,
            passed: results.passed || 0,
            failed: results.failed || 0,
            skipped: results.skipped || 0,
            failedTests: failedTests,
            skippedTests: skippedTests
        };
        
    } catch (error) {
        console.error('❌ 分析报告失败:', error.message);
        return null;
    }
}

function generateFixSuggestions(failedTests) {
    const suggestions = new Map();
    
    failedTests.forEach(test => {
        const name = test.name.toLowerCase();
        const error = (test.error || '').toLowerCase();
        const category = test.category || '';
        
        // UI相关
        if (category === 'ui' || name.includes('render') || name.includes('ui')) {
            if (error.includes('null') || error.includes('undefined')) {
                suggestions.set('UI DOM检查', '添加DOM元素存在性检查，使用checkElement等待元素加载');
            }
            if (error.includes('function') || error.includes('not a function')) {
                suggestions.set('UI函数暴露', '检查函数是否正确暴露到window.AIAgentUI');
            }
        }
        
        // 事件相关
        if (category === 'events') {
            if (error.includes('null') || error.includes('undefined')) {
                suggestions.set('事件处理', '确保AppState已初始化，添加空值检查');
            }
            if (error.includes('function')) {
                suggestions.set('事件函数', '检查函数是否正确暴露到window.AIAgentEvents');
            }
        }
        
        // 应用状态相关
        if (category === 'app') {
            if (error.includes('localstorage') || error.includes('storage')) {
                suggestions.set('状态存储', '检查localStorage key是否正确，支持多个版本key');
            }
            if (error.includes('null') || error.includes('undefined')) {
                suggestions.set('状态初始化', '确保AppState在测试前已初始化');
            }
        }
        
        // LLM相关
        if (category === 'llm') {
            if (error.includes('function')) {
                suggestions.set('LLM服务', '检查LLMService是否正确暴露，可能通过不同方式访问');
            }
        }
        
        // RAG相关
        if (category === 'rag') {
            if (error.includes('function')) {
                suggestions.set('RAG服务', '检查RAGManager是否正确暴露');
            }
        }
        
        // 计划相关
        if (category === 'plan') {
            if (error.includes('function')) {
                suggestions.set('计划服务', '检查PlanManager是否正确暴露');
            }
        }
        
        // 通用错误
        if (error.includes('timeout') || error.includes('time')) {
            suggestions.set('超时处理', '增加wait时间或优化异步操作');
        }
        
        if (error.includes('cannot read') || error.includes('null')) {
            suggestions.set('空值检查', '添加可选链操作符(?.)和空值检查');
        }
    });
    
    if (suggestions.size > 0) {
        suggestions.forEach((value, key) => {
            console.log(`   • ${key}: ${value}`);
        });
    } else {
        console.log('   • 查看具体错误信息进行针对性修复');
    }
    console.log('');
}

// 命令行使用
if (require.main === module) {
    const reportPath = process.argv[2];
    if (!reportPath) {
        console.error('用法: node analyze-and-fix.js <报告文件路径>');
        process.exit(1);
    }
    
    const result = analyzeReport(reportPath);
    if (result && result.failed > 0) {
        process.exit(1);
    }
}

module.exports = { analyzeReport, generateFixSuggestions };
