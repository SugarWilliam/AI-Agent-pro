/**
 * AI Agent Pro 简化测试执行器
 * 不依赖Puppeteer，直接检查测试页面和生成报告
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const TEST_URL = 'http://localhost:8000/test/comprehensive-test.html';
const OUTPUT_DIR = path.join(__dirname, 'test-results');

function checkServer() {
    return new Promise((resolve, reject) => {
        const url = new URL(TEST_URL);
        const req = http.get({
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            timeout: 5000
        }, (res) => {
            resolve(res.statusCode === 200);
        });
        
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });
    });
}

async function main() {
    console.log('==========================================');
    console.log('AI Agent Pro 全面测试套件 - 环境检查');
    console.log('==========================================');
    console.log('');

    // 检查服务器
    console.log('🔍 检查服务器状态...');
    const serverOk = await checkServer();
    
    if (serverOk) {
        console.log('✅ 服务器运行正常');
        console.log(`   测试页面: ${TEST_URL}`);
    } else {
        console.log('❌ 服务器未运行或无法访问');
        console.log('   请先启动服务器: python3 -m http.server 8000');
        process.exit(1);
    }

    // 检查测试文件
    console.log('');
    console.log('🔍 检查测试文件...');
    const testFiles = [
        'comprehensive-test.html',
        'auto-run-tests.js',
        'start-comprehensive-test.sh'
    ];

    testFiles.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            console.log(`   ✅ ${file} (${(stats.size / 1024).toFixed(1)}KB)`);
        } else {
            console.log(`   ❌ ${file} 不存在`);
        }
    });

    // 检查Node.js版本
    console.log('');
    console.log('🔍 检查Node.js环境...');
    const nodeVersion = process.version;
    console.log(`   Node.js版本: ${nodeVersion}`);
    
    if (parseInt(nodeVersion.split('.')[0].substring(1)) < 14) {
        console.log('   ⚠️  建议使用Node.js 14+以获得更好的性能');
    }

    // 检查Puppeteer
    console.log('');
    console.log('🔍 检查测试依赖...');
    try {
        require.resolve('puppeteer');
        console.log('   ✅ Puppeteer已安装');
        console.log('');
        console.log('🚀 可以运行自动化测试:');
        console.log('   node auto-run-tests.js');
    } catch (e) {
        console.log('   ⚠️  Puppeteer未安装');
        console.log('   安装命令: npm install puppeteer');
        console.log('');
        console.log('📝 替代方案: 使用浏览器手动测试');
        console.log(`   1. 打开浏览器访问: ${TEST_URL}`);
        console.log('   2. 点击 "🚀 运行所有测试 (100%覆盖)" 按钮');
        console.log('   3. 等待测试完成');
        console.log('   4. 点击 "📊 导出报告" 导出测试报告');
    }

    // 生成测试指南
    console.log('');
    console.log('==========================================');
    console.log('📋 测试执行指南');
    console.log('==========================================');
    console.log('');
    console.log('方法1: 浏览器手动测试（推荐）');
    console.log(`   1. 打开浏览器访问: ${TEST_URL}`);
    console.log('   2. 点击 "🚀 运行所有测试 (100%覆盖)"');
    console.log('   3. 等待测试完成（约2-5分钟）');
    console.log('   4. 查看测试结果和覆盖率');
    console.log('   5. 点击 "📊 导出报告" 导出JSON报告');
    console.log('');
    console.log('方法2: 自动化测试（需要Puppeteer）');
    console.log('   1. 安装依赖: npm install puppeteer');
    console.log('   2. 运行测试: node auto-run-tests.js');
    console.log('   3. 查看报告: test-results/test-report-*.json');
    console.log('');
    console.log('==========================================');

    // 创建测试结果目录
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        console.log(`✅ 创建测试结果目录: ${OUTPUT_DIR}`);
    }
}

main().catch(error => {
    console.error('❌ 执行失败:', error.message);
    process.exit(1);
});
