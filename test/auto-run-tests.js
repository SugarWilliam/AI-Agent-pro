/**
 * AI Agent Pro 自动化测试执行器
 * 使用 Puppeteer 自动运行全面测试套件
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const TEST_URL = 'http://localhost:8080/test/comprehensive-test.html';
const OUTPUT_DIR = path.join(__dirname, 'test-results');
const TIMEOUT = 300000; // 5分钟超时

async function runTests() {
    console.log('==========================================');
    console.log('AI Agent Pro 全面测试套件 - 自动化执行');
    console.log('==========================================');
    console.log('');

    // 确保输出目录存在
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    let browser;
    try {
        // 启动浏览器
        console.log('🚀 启动浏览器...');
        browser = await puppeteer.launch({
            headless: false, // 显示浏览器窗口
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: { width: 1920, height: 1080 }
        });

        const page = await browser.newPage();
        
        // 监听控制台输出
        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            if (type === 'error') {
                console.error(`[浏览器错误] ${text}`);
            } else if (type === 'warning') {
                console.warn(`[浏览器警告] ${text}`);
            } else {
                console.log(`[浏览器] ${text}`);
            }
        });

        // 监听页面错误
        page.on('pageerror', error => {
            console.error(`[页面错误] ${error.message}`);
        });

        // 导航到测试页面
        console.log(`📄 加载测试页面: ${TEST_URL}`);
        await page.goto(TEST_URL, { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        });

        // 等待页面加载完成
        console.log('⏳ 等待页面初始化...');
        await page.waitForSelector('#run-all-btn', { timeout: 10000 });
        await page.waitForTimeout(2000);

        // 检查主应用是否加载
        const modulesLoaded = await page.evaluate(() => {
            return {
                Logger: typeof window.Logger !== 'undefined',
                ErrorHandler: typeof window.ErrorHandler !== 'undefined',
                EventManager: typeof window.EventManager !== 'undefined',
                AIAgentUIUtils: typeof window.AIAgentUIUtils !== 'undefined',
                AIAgentApp: typeof window.AIAgentApp !== 'undefined',
                AIAgentUI: typeof window.AIAgentUI !== 'undefined',
                AppState: typeof window.AppState !== 'undefined',
                LLMService: typeof window.LLMService !== 'undefined',
                RAGManager: typeof window.RAGManager !== 'undefined',
                PlanManager: typeof window.PlanManager !== 'undefined'
            };
        });

        console.log('📦 模块加载状态:');
        Object.entries(modulesLoaded).forEach(([name, loaded]) => {
            console.log(`   ${loaded ? '✅' : '❌'} ${name}`);
        });

        const missingModules = Object.entries(modulesLoaded)
            .filter(([name, loaded]) => !loaded)
            .map(([name]) => name);

        if (missingModules.length > 0) {
            console.warn(`⚠️  警告: 以下模块未加载: ${missingModules.join(', ')}`);
        }

        // 点击运行所有测试按钮
        console.log('');
        console.log('🧪 开始运行全面测试...');
        console.log('');

        await page.click('#run-all-btn');

        // 等待测试完成（通过检查测试结果或日志）
        console.log('⏳ 等待测试完成（最多5分钟）...');
        
        const testResults = await page.evaluate(async () => {
            return new Promise((resolve) => {
                // 监听测试完成
                const checkInterval = setInterval(() => {
                    const totalEl = document.getElementById('total');
                    const passedEl = document.getElementById('passed');
                    const failedEl = document.getElementById('failed');
                    const skippedEl = document.getElementById('skipped');
                    const durationEl = document.getElementById('duration');
                    
                    if (totalEl && totalEl.textContent !== '0') {
                        const total = parseInt(totalEl.textContent);
                        const passed = parseInt(passedEl.textContent);
                        const failed = parseInt(failedEl.textContent);
                        const skipped = parseInt(skippedEl.textContent);
                        const duration = durationEl.textContent;
                        
                        // 检查是否所有测试都完成了
                        if (total === passed + failed + skipped) {
                            clearInterval(checkInterval);
                            
                            // 获取详细测试结果
                            const tests = [];
                            document.querySelectorAll('.test-item').forEach(item => {
                                const nameEl = item.querySelector('.test-name');
                                const status = item.classList.contains('passed') ? 'passed' :
                                              item.classList.contains('failed') ? 'failed' : 'skipped';
                                tests.push({
                                    name: nameEl ? nameEl.textContent.trim() : '',
                                    status: status
                                });
                            });
                            
                            // 获取覆盖率
                            const coverage = {};
                            document.querySelectorAll('.coverage-item').forEach(item => {
                                const label = item.querySelector('div').textContent.trim();
                                const percent = item.querySelector('div:nth-child(2)').textContent.trim();
                                coverage[label.toLowerCase()] = percent;
                            });
                            
                            resolve({
                                total,
                                passed,
                                failed,
                                skipped,
                                duration,
                                passRate: total > 0 ? ((passed / total) * 100).toFixed(1) : 0,
                                tests,
                                coverage
                            });
                        }
                    }
                }, 1000);
                
                // 超时保护
                setTimeout(() => {
                    clearInterval(checkInterval);
                    resolve({
                        error: '测试超时',
                        total: 0,
                        passed: 0,
                        failed: 0,
                        skipped: 0
                    });
                }, 300000); // 5分钟超时
            });
        });

        // 等待一下确保结果已更新
        await page.waitForTimeout(2000);

        // 获取测试日志
        const testLog = await page.evaluate(() => {
            const logEl = document.getElementById('log');
            if (!logEl) return '';
            return logEl.textContent;
        });

        // 生成测试报告
        const report = {
            timestamp: new Date().toISOString(),
            url: TEST_URL,
            results: testResults,
            log: testLog,
            modules: modulesLoaded
        };

        // 保存报告
        const reportPath = path.join(OUTPUT_DIR, `test-report-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        // 输出结果
        console.log('');
        console.log('==========================================');
        console.log('📊 测试结果');
        console.log('==========================================');
        console.log(`总测试数: ${testResults.total}`);
        console.log(`✅ 通过: ${testResults.passed}`);
        console.log(`❌ 失败: ${testResults.failed}`);
        console.log(`⏭️  跳过: ${testResults.skipped}`);
        console.log(`通过率: ${testResults.passRate}%`);
        console.log(`耗时: ${testResults.duration}`);
        console.log('');
        
        if (testResults.coverage) {
            console.log('📈 覆盖率统计:');
            Object.entries(testResults.coverage).forEach(([category, percent]) => {
                console.log(`   ${category}: ${percent}`);
            });
            console.log('');
        }

        if (testResults.failed > 0) {
            console.log('❌ 失败的测试:');
            testResults.tests
                .filter(t => t.status === 'failed')
                .forEach(t => console.log(`   - ${t.name}`));
            console.log('');
        }

        console.log(`📄 详细报告已保存: ${reportPath}`);
        console.log('==========================================');

        // 保持浏览器打开一段时间以便查看结果
        console.log('');
        console.log('⏳ 保持浏览器打开30秒以便查看结果...');
        await page.waitForTimeout(30000);

    } catch (error) {
        console.error('❌ 测试执行失败:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// 执行测试
if (require.main === module) {
    runTests().catch(error => {
        console.error('测试执行异常:', error);
        process.exit(1);
    });
}

module.exports = { runTests };
