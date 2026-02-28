/**
 * AI Agent Pro 自动化测试运行器
 * 使用Puppeteer进行端到端测试
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// 测试配置
const config = {
    baseUrl: process.env.BASE_URL || 'http://localhost:8080',
    headless: process.env.HEADLESS !== 'false',
    timeout: 30000,
    slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
    verbose: process.env.VERBOSE === 'true'
};

// 测试结果
const testResults = {
    passed: [],
    failed: [],
    skipped: [],
    startTime: null,
    endTime: null
};

// 工具函数
function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
        info: 'ℹ',
        success: '✅',
        error: '❌',
        warning: '⚠️'
    }[type] || 'ℹ';
    
    if (config.verbose || type !== 'info') {
        console.log(`[${timestamp}] ${prefix} ${message}`);
    }
}

function logTest(name, status, error = null) {
    if (status === 'passed') {
        testResults.passed.push(name);
        log(`测试通过: ${name}`, 'success');
    } else if (status === 'failed') {
        testResults.failed.push({ name, error: error?.message || error });
        log(`测试失败: ${name}`, 'error');
        if (error) {
            log(`  错误: ${error.message || error}`, 'error');
        }
    } else {
        testResults.skipped.push(name);
        log(`测试跳过: ${name}`, 'warning');
    }
}

// 等待函数
async function waitFor(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 测试套件
class TestSuite {
    constructor(page) {
        this.page = page;
    }

    async setup() {
        log('开始测试套件初始化...', 'info');
        await this.page.goto(config.baseUrl, { waitUntil: 'networkidle2' });
        await waitFor(3000); // 等待启动页动画
        log('页面加载完成', 'success');
    }

    async teardown() {
        log('测试套件清理...', 'info');
    }

    // 测试1: 页面加载
    async testPageLoad() {
        try {
            const title = await this.page.title();
            if (title.includes('AI Agent Pro')) {
                logTest('页面加载', 'passed');
                return true;
            } else {
                throw new Error(`页面标题不正确: ${title}`);
            }
        } catch (error) {
            logTest('页面加载', 'failed', error);
            return false;
        }
    }

    // 测试2: 启动页显示
    async testSplashScreen() {
        try {
            await this.page.waitForSelector('#splash', { timeout: 5000 }).catch(() => {});
            const splash = await this.page.$('#splash');
            if (splash) {
                logTest('启动页显示', 'passed');
                await waitFor(3000); // 等待启动页消失
                return true;
            } else {
                logTest('启动页显示', 'skipped');
                return true;
            }
        } catch (error) {
            logTest('启动页显示', 'failed', error);
            return false;
        }
    }

    // 测试3: 侧边栏功能
    async testSidebar() {
        try {
            // 打开侧边栏
            const menuBtn = await this.page.$('#menu-btn');
            if (menuBtn) {
                await menuBtn.click();
                await waitFor(500);
                
                const sidebar = await this.page.$('#sidebar');
                const isVisible = sidebar ? await sidebar.evaluate(el => {
                    return window.getComputedStyle(el).display !== 'none';
                }) : false;
                
                if (isVisible) {
                    logTest('侧边栏打开', 'passed');
                    
                    // 关闭侧边栏
                    const closeBtn = await this.page.$('#close-sidebar');
                    if (closeBtn) {
                        await closeBtn.click();
                        await waitFor(500);
                        logTest('侧边栏关闭', 'passed');
                    }
                    return true;
                } else {
                    throw new Error('侧边栏未显示');
                }
            } else {
                throw new Error('未找到菜单按钮');
            }
        } catch (error) {
            logTest('侧边栏功能', 'failed', error);
            return false;
        }
    }

    // 测试4: 新建对话
    async testNewChat() {
        try {
            // 打开侧边栏
            const menuBtn = await this.page.$('#menu-btn');
            if (menuBtn) {
                await menuBtn.click();
                await waitFor(500);
            }

            const newChatBtn = await this.page.$('#new-chat-btn');
            if (newChatBtn) {
                await newChatBtn.click();
                await waitFor(1000);
                
                // 检查是否显示欢迎页面
                const welcomeScreen = await this.page.$('#welcome-screen');
                const isVisible = welcomeScreen ? await welcomeScreen.evaluate(el => {
                    return window.getComputedStyle(el).display !== 'none';
                }) : false;
                
                if (isVisible) {
                    logTest('新建对话', 'passed');
                    return true;
                } else {
                    throw new Error('欢迎页面未显示');
                }
            } else {
                throw new Error('未找到新建对话按钮');
            }
        } catch (error) {
            logTest('新建对话', 'failed', error);
            return false;
        }
    }

    // 测试5: 输入框功能
    async testInputBox() {
        try {
            const input = await this.page.$('#message-input');
            if (input) {
                await input.click();
                await input.type('测试消息', { delay: 100 });
                await waitFor(500);
                
                const value = await input.evaluate(el => el.value);
                if (value === '测试消息') {
                    logTest('输入框功能', 'passed');
                    
                    // 清空输入
                    await input.click({ clickCount: 3 });
                    await input.press('Backspace');
                    return true;
                } else {
                    throw new Error(`输入值不匹配: ${value}`);
                }
            } else {
                throw new Error('未找到输入框');
            }
        } catch (error) {
            logTest('输入框功能', 'failed', error);
            return false;
        }
    }

    // 测试6: 模式选择器
    async testModeSelector() {
        try {
            const modeOptions = await this.page.$$('.mode-option');
            if (modeOptions.length > 0) {
                // 点击任务模式
                await modeOptions[1].click();
                await waitFor(500);
                
                const activeMode = await modeOptions[1].evaluate(el => el.classList.contains('active'));
                if (activeMode) {
                    logTest('模式选择器', 'passed');
                    
                    // 切回对话模式
                    await modeOptions[0].click();
                    await waitFor(500);
                    return true;
                } else {
                    throw new Error('模式切换失败');
                }
            } else {
                throw new Error('未找到模式选择器');
            }
        } catch (error) {
            logTest('模式选择器', 'failed', error);
            return false;
        }
    }

    // 测试7: 设置模态框
    async testSettingsModal() {
        try {
            // 打开侧边栏
            const menuBtn = await this.page.$('#menu-btn');
            if (menuBtn) {
                await menuBtn.click();
                await waitFor(500);
            }

            const settingsBtn = await this.page.$('#settings-btn');
            if (settingsBtn) {
                await settingsBtn.click();
                await waitFor(1000);
                
                const settingsModal = await this.page.$('#settings-modal');
                const isVisible = settingsModal ? await settingsModal.evaluate(el => {
                    return window.getComputedStyle(el).display !== 'none' && 
                           el.classList.contains('active');
                }) : false;
                
                if (isVisible) {
                    logTest('设置模态框打开', 'passed');
                    
                    // 关闭模态框
                    const closeBtn = await settingsModal.$('.modal-close');
                    if (closeBtn) {
                        await closeBtn.click();
                        await waitFor(500);
                        logTest('设置模态框关闭', 'passed');
                    }
                    return true;
                } else {
                    throw new Error('设置模态框未显示');
                }
            } else {
                throw new Error('未找到设置按钮');
            }
        } catch (error) {
            logTest('设置模态框', 'failed', error);
            return false;
        }
    }

    // 测试8: JavaScript错误检查
    async testJavaScriptErrors() {
        try {
            const errors = [];
            
            // 监听页面错误
            this.page.on('pageerror', error => {
                errors.push(error.message);
            });

            // 监听控制台错误
            this.page.on('console', msg => {
                if (msg.type() === 'error') {
                    errors.push(msg.text());
                }
            });

            // 刷新页面检查错误
            await this.page.reload({ waitUntil: 'networkidle2' });
            await waitFor(3000);

            // 过滤掉预期的错误（如网络请求失败等）
            const criticalErrors = errors.filter(err => {
                const errStr = err.toLowerCase();
                return !errStr.includes('favicon') && 
                       !errStr.includes('net::err') &&
                       !errStr.includes('failed to fetch') &&
                       !errStr.includes('cors');
            });

            if (criticalErrors.length === 0) {
                logTest('JavaScript错误检查', 'passed');
                return true;
            } else {
                throw new Error(`发现 ${criticalErrors.length} 个JavaScript错误: ${criticalErrors.join('; ')}`);
            }
        } catch (error) {
            logTest('JavaScript错误检查', 'failed', error);
            return false;
        }
    }

    // 测试9: 模块加载检查
    async testModuleLoading() {
        try {
            const modules = await this.page.evaluate(() => {
                return {
                    Logger: typeof window.Logger !== 'undefined',
                    ErrorHandler: typeof window.ErrorHandler !== 'undefined',
                    EventManager: typeof window.EventManager !== 'undefined',
                    AIAgentUIUtils: typeof window.AIAgentUIUtils !== 'undefined',
                    AIAgentApp: typeof window.AIAgentApp !== 'undefined',
                    AIAgentUI: typeof window.AIAgentUI !== 'undefined',
                    AppState: typeof window.AppState !== 'undefined'
                };
            });

            const missingModules = Object.entries(modules)
                .filter(([name, loaded]) => !loaded)
                .map(([name]) => name);

            if (missingModules.length === 0) {
                logTest('模块加载检查', 'passed');
                return true;
            } else {
                throw new Error(`未加载的模块: ${missingModules.join(', ')}`);
            }
        } catch (error) {
            logTest('模块加载检查', 'failed', error);
            return false;
        }
    }

    // 测试10: 响应式设计
    async testResponsiveDesign() {
        try {
            const viewports = [
                { width: 1920, height: 1080, name: '桌面' },
                { width: 768, height: 1024, name: '平板' },
                { width: 375, height: 667, name: '手机' }
            ];

            for (const viewport of viewports) {
                await this.page.setViewport({ width: viewport.width, height: viewport.height });
                await waitFor(500);
                
                const bodyVisible = await this.page.evaluate(() => {
                    const body = document.body;
                    return body && window.getComputedStyle(body).display !== 'none';
                });

                if (!bodyVisible) {
                    throw new Error(`${viewport.name}视图下页面不可见`);
                }
            }

            // 恢复默认视图
            await this.page.setViewport({ width: 1920, height: 1080 });
            logTest('响应式设计', 'passed');
            return true;
        } catch (error) {
            logTest('响应式设计', 'failed', error);
            return false;
        }
    }

    // 运行所有测试
    async runAllTests() {
        log('==========================================', 'info');
        log('AI Agent Pro 自动化测试开始', 'info');
        log('==========================================', 'info');
        log(`测试URL: ${config.baseUrl}`, 'info');
        log(`无头模式: ${config.headless}`, 'info');
        log('', 'info');

        testResults.startTime = Date.now();

        try {
            await this.setup();

            const tests = [
                { name: '页面加载', fn: () => this.testPageLoad() },
                { name: '启动页显示', fn: () => this.testSplashScreen() },
                { name: '侧边栏功能', fn: () => this.testSidebar() },
                { name: '新建对话', fn: () => this.testNewChat() },
                { name: '输入框功能', fn: () => this.testInputBox() },
                { name: '模式选择器', fn: () => this.testModeSelector() },
                { name: '设置模态框', fn: () => this.testSettingsModal() },
                { name: 'JavaScript错误检查', fn: () => this.testJavaScriptErrors() },
                { name: '模块加载检查', fn: () => this.testModuleLoading() },
                { name: '响应式设计', fn: () => this.testResponsiveDesign() }
            ];

            for (const test of tests) {
                try {
                    await test.fn();
                } catch (error) {
                    logTest(test.name, 'failed', error);
                }
                await waitFor(500); // 测试间隔
            }

            await this.teardown();
        } catch (error) {
            log(`测试套件执行失败: ${error.message}`, 'error');
        }

        testResults.endTime = Date.now();
        this.printResults();
    }

    // 打印测试结果
    printResults() {
        const duration = ((testResults.endTime - testResults.startTime) / 1000).toFixed(2);
        const total = testResults.passed.length + testResults.failed.length + testResults.skipped.length;
        const passRate = total > 0 ? ((testResults.passed.length / total) * 100).toFixed(1) : 0;

        log('', 'info');
        log('==========================================', 'info');
        log('测试结果汇总', 'info');
        log('==========================================', 'info');
        log(`总测试数: ${total}`, 'info');
        log(`通过: ${testResults.passed.length}`, 'success');
        log(`失败: ${testResults.failed.length}`, testResults.failed.length > 0 ? 'error' : 'info');
        log(`跳过: ${testResults.skipped.length}`, 'warning');
        log(`通过率: ${passRate}%`, passRate >= 80 ? 'success' : 'error');
        log(`耗时: ${duration}秒`, 'info');
        log('==========================================', 'info');

        if (testResults.failed.length > 0) {
            log('', 'info');
            log('失败的测试:', 'error');
            testResults.failed.forEach(({ name, error }) => {
                log(`  - ${name}: ${error}`, 'error');
            });
        }

        // 保存测试报告
        this.saveReport();
    }

    // 保存测试报告
    saveReport() {
        const report = {
            timestamp: new Date().toISOString(),
            config,
            results: {
                total: testResults.passed.length + testResults.failed.length + testResults.skipped.length,
                passed: testResults.passed.length,
                failed: testResults.failed.length,
                skipped: testResults.skipped.length,
                passRate: ((testResults.passed.length / (testResults.passed.length + testResults.failed.length + testResults.skipped.length)) * 100).toFixed(1),
                duration: ((testResults.endTime - testResults.startTime) / 1000).toFixed(2)
            },
            passed: testResults.passed,
            failed: testResults.failed,
            skipped: testResults.skipped
        };

        const reportPath = path.join(__dirname, 'test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        log(`测试报告已保存: ${reportPath}`, 'info');
    }
}

// 主函数
async function main() {
    let browser;
    try {
        log('启动浏览器...', 'info');
        browser = await puppeteer.launch({
            headless: config.headless,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            slowMo: config.slowMo
        });

        const page = await browser.newPage();
        page.setDefaultTimeout(config.timeout);

        const suite = new TestSuite(page);
        await suite.runAllTests();

    } catch (error) {
        log(`测试执行失败: ${error.message}`, 'error');
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
        }
        
        // 根据测试结果退出
        const exitCode = testResults.failed.length > 0 ? 1 : 0;
        process.exit(exitCode);
    }
}

// 运行测试
if (require.main === module) {
    main().catch(error => {
        log(`致命错误: ${error.message}`, 'error');
        process.exit(1);
    });
}

module.exports = { TestSuite, config };
