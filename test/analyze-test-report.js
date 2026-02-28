/**
 * 测试报告分析工具
 * 分析测试报告并生成修复建议
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
        
        // 总体统计
        const results = report.results || {};
        console.log('📈 总体统计:');
        console.log(`   总测试数: ${results.total || 0}`);
        console.log(`   ✅ 通过: ${results.passed || 0}`);
        console.log(`   ❌ 失败: ${results.failed || 0}`);
        console.log(`   ⏭️  跳过: ${results.skipped || 0}`);
        console.log(`   通过率: ${results.passRate || 0}%`);
        console.log(`   耗时: ${results.duration || 0}秒`);
        console.log('');
        
        // 失败的测试
        const tests = report.tests || [];
        const failedTests = tests.filter(t => t.status === 'failed');
        
        if (failedTests.length > 0) {
            console.log('❌ 失败的测试:');
            failedTests.forEach((test, index) => {
                console.log(`   ${index + 1}. ${test.name}`);
                if (test.error) {
                    console.log(`      错误: ${test.error}`);
                }
                if (test.details) {
                    console.log(`      详情: ${test.details}`);
                }
                console.log('');
            });
        } else {
            console.log('✅ 所有测试通过！');
            console.log('');
        }
        
        // 覆盖率统计
        if (results.coverage) {
            console.log('📊 覆盖率统计:');
            Object.entries(results.coverage).forEach(([category, stats]) => {
                if (typeof stats === 'object' && stats.total) {
                    const percent = ((stats.tested / stats.total) * 100).toFixed(1);
                    console.log(`   ${category}: ${percent}% (${stats.tested}/${stats.total})`);
                } else if (typeof stats === 'string') {
                    console.log(`   ${category}: ${stats}`);
                }
            });
            console.log('');
        }
        
        // 生成修复建议
        if (failedTests.length > 0) {
            console.log('🔧 修复建议:');
            generateFixSuggestions(failedTests);
        }
        
        return {
            total: results.total || 0,
            passed: results.passed || 0,
            failed: results.failed || 0,
            skipped: results.skipped || 0,
            failedTests: failedTests
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
        
        // 根据测试名称和错误信息生成建议
        if (name.includes('render') || name.includes('ui')) {
            suggestions.set('UI渲染', '检查DOM元素是否存在，确保在DOM加载后执行');
        }
        
        if (name.includes('module') || name.includes('load')) {
            suggestions.set('模块加载', '检查脚本加载顺序，确保依赖模块先加载');
        }
        
        if (error.includes('null') || error.includes('undefined')) {
            suggestions.set('空值检查', '添加空值检查，使用可选链操作符(?.)');
        }
        
        if (error.includes('function') || error.includes('not a function')) {
            suggestions.set('函数存在性', '检查函数是否正确定义和暴露到全局作用域');
        }
        
        if (error.includes('timeout') || error.includes('time')) {
            suggestions.set('超时处理', '增加超时时间或优化异步操作');
        }
        
        if (name.includes('xss') || name.includes('security')) {
            suggestions.set('安全测试', '检查escapeHtml函数是否正确实现');
        }
    });
    
    suggestions.forEach((value, key) => {
        console.log(`   • ${key}: ${value}`);
    });
    console.log('');
}

// 命令行使用
if (require.main === module) {
    const reportPath = process.argv[2];
    if (!reportPath) {
        console.error('用法: node analyze-test-report.js <报告文件路径>');
        process.exit(1);
    }
    
    const result = analyzeReport(reportPath);
    if (result && result.failed > 0) {
        process.exit(1);
    }
}

module.exports = { analyzeReport };
