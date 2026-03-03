/**
 * A2A 风格自主调度 - 单元测试
 * 测试 buildAgentCards、formatAgentCardsForPrompt、parseScheduleFromOutput
 */
(function() {
    'use strict';

    const tests = [];
    let passed = 0;
    let failed = 0;

    function assert(cond, msg) {
        if (cond) {
            passed++;
            console.log('  ✅', msg);
            return true;
        }
        failed++;
        console.error('  ❌', msg);
        return false;
    }

    function runTests() {
        const logs = [];
        const origLog = console.log;
        const origErr = console.error;
        console.log = (...args) => { logs.push(args.join(' ')); origLog.apply(console, args); };
        console.error = (...args) => { logs.push('❌ ' + args.join(' ')); origErr.apply(console, args); };

        console.log('\n=== A2A 自主调度单元测试 ===\n');

        // 需要 AppState 和 LLMService
        if (!window.AppState || !window.LLMService) {
            console.error('需要先加载应用（AppState、LLMService）');
            return { passed: 0, failed: 1, logs };
        }

        // 模拟 subAgents
        const originalSubAgents = window.AppState.subAgents;
        window.AppState.subAgents = {
            work_secretary: { id: 'work_secretary', name: '工作秘书', description: '研发项目管理', capabilities: ['PMP', 'WBS'] },
            super_decision: { id: 'super_decision', name: '超级决策', description: '深度决策分析', capabilities: ['决策'] },
            plan: { id: 'plan', name: '计划大师', description: '项目计划', capabilities: ['计划'] },
            task: { id: 'task', name: '任务助手', description: '任务管理', capabilities: ['任务'] }
        };

        try {
            // 1. buildAgentCards
            console.log('1. buildAgentCards');
            const cards = window.LLMService.buildAgentCards('work_secretary', ['super_decision', 'plan', 'task']);
            assert(Array.isArray(cards), '返回数组');
            assert(cards.length === 3, '3 个 AgentCard');
            assert(cards[0].id === 'super_decision', '第一个 id 正确');
            assert(cards[0].name === '超级决策', 'name 正确');

            // 2. formatAgentCardsForPrompt
            console.log('\n2. formatAgentCardsForPrompt');
            const prompt = window.LLMService.formatAgentCardsForPrompt(cards);
            assert(typeof prompt === 'string', '返回字符串');
            assert(prompt.includes('super_decision'), '包含 agent id');
            assert(prompt.includes('```schedule'), '包含 schedule 格式说明');

            // 3. parseScheduleFromOutput - 有效
            console.log('\n3. parseScheduleFromOutput - 有效 JSON');
            const output1 = `分析完成。\n\n\`\`\`schedule\n{"schedule":[{"agentId":"plan","instruction":"制定计划"},{"agentId":"task","instruction":"拆解TODO"}]}\n\`\`\``;
            const parsed1 = window.LLMService.parseScheduleFromOutput(output1, ['super_decision', 'plan', 'task']);
            assert(parsed1 !== null, '解析成功');
            assert(parsed1.length === 2, '2 个步骤');
            assert(parsed1[0].agentId === 'plan', '第一个 agentId');
            assert(parsed1[0].instruction === '制定计划', 'instruction 正确');

            // 4. parseScheduleFromOutput - json 块
            console.log('\n4. parseScheduleFromOutput - json 块');
            const output2 = `\`\`\`json\n{"schedule":[{"agentId":"task","instruction":""}]}\n\`\`\``;
            const parsed2 = window.LLMService.parseScheduleFromOutput(output2, ['plan', 'task']);
            assert(parsed2 !== null, 'json 块解析成功');
            assert(parsed2[0].agentId === 'task', 'agentId 正确');

            // 5. parseScheduleFromOutput - 无效 agentId
            console.log('\n5. parseScheduleFromOutput - agentId 不在白名单');
            const output3 = `\`\`\`schedule\n{"schedule":[{"agentId":"unknown","instruction":"x"}]}\n\`\`\``;
            const parsed3 = window.LLMService.parseScheduleFromOutput(output3, ['plan', 'task']);
            assert(parsed3 === null, '无效 agentId 返回 null');

            // 6. parseScheduleFromOutput - 无块
            console.log('\n6. parseScheduleFromOutput - 无代码块');
            const parsed4 = window.LLMService.parseScheduleFromOutput('纯文本无JSON', ['plan']);
            assert(parsed4 === null, '无块返回 null');

            // 7. parseScheduleFromOutput - 空 schedule
            console.log('\n7. parseScheduleFromOutput - 空 schedule');
            const output5 = `\`\`\`schedule\n{"schedule":[]}\n\`\`\``;
            const parsed5 = window.LLMService.parseScheduleFromOutput(output5, ['plan']);
            assert(parsed5 === null, '空 schedule 返回 null');

        } finally {
            window.AppState.subAgents = originalSubAgents;
        }

        console.log('\n=== 结果 ===');
        console.log(`通过: ${passed}, 失败: ${failed}`);
        console.log = origLog;
        console.error = origErr;
        return { passed, failed, logs };
    }

    window.testA2AOrchestration = runTests;
})();
