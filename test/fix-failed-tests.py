#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复失败测试的工具
支持从文件或直接输入JSON内容
"""

import json
import sys
import os
from pathlib import Path

def read_report(report_input):
    """读取测试报告，支持文件路径或JSON字符串"""
    # 尝试作为文件路径
    if os.path.exists(report_input):
        with open(report_input, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    # 尝试作为JSON字符串
    try:
        return json.loads(report_input)
    except:
        pass
    
    # 尝试Windows路径转换
    win_path = report_input.replace('C:', '').replace('\\', '/')
    paths = [
        report_input,
        f"/mnt/c{win_path}",
        f"/home/pyc/ai-agent-pro-source/AI-Agent-pro/test/test-results/{os.path.basename(report_input)}"
    ]
    
    for path in paths:
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
    
    return None

def analyze_failed_tests(report):
    """分析失败的测试"""
    tests = report.get('tests', [])
    failed_tests = [t for t in tests if t.get('status') == 'failed']
    
    print("=" * 60)
    print("📊 失败测试分析")
    print("=" * 60)
    print()
    
    if not failed_tests:
        print("✅ 没有失败的测试！")
        return []
    
    print(f"❌ 发现 {len(failed_tests)} 个失败的测试:\n")
    
    for i, test in enumerate(failed_tests, 1):
        print(f"{i}. {test.get('name', 'Unknown')}")
        print(f"   类别: {test.get('category', 'unknown')}")
        if test.get('error'):
            error_msg = test.get('error', '')
            print(f"   错误: {error_msg[:200]}")
        if test.get('details'):
            print(f"   详情: {test.get('details', '')[:200]}")
        print()
    
    return failed_tests

def generate_fix_code(failed_tests):
    """生成修复代码"""
    fixes = []
    
    for test in failed_tests:
        name = test.get('name', '').lower()
        error = (test.get('error') or '').lower()
        category = test.get('category', '')
        
        fix = {
            'test_name': test.get('name'),
            'category': category,
            'error': test.get('error'),
            'suggestions': []
        }
        
        # UI相关错误
        if category == 'ui' or 'render' in name or 'ui' in name:
            if 'null' in error or 'undefined' in error:
                fix['suggestions'].append({
                    'type': 'DOM检查',
                    'code': '''
// 添加DOM元素存在性检查
const element = document.getElementById('id');
if (!element) {
    window.Logger?.warn('Element not found: id');
    return null; // 或返回默认值
}
'''
                })
            if 'function' in error or 'not a function' in error:
                fix['suggestions'].append({
                    'type': '函数暴露检查',
                    'code': '''
// 检查函数是否存在
if (window.AIAgentUI && typeof window.AIAgentUI.functionName === 'function') {
    window.AIAgentUI.functionName();
} else {
    window.Logger?.warn('Function not exposed: functionName');
    return null;
}
'''
                })
        
        # 事件相关错误
        if category == 'events':
            if 'null' in error or 'undefined' in error:
                fix['suggestions'].append({
                    'type': '状态初始化',
                    'code': '''
// 确保AppState已初始化
if (!window.AppState) {
    throw new Error('AppState未初始化');
}
'''
                })
        
        # 应用状态相关错误
        if category == 'app':
            if 'localstorage' in error or 'storage' in error:
                fix['suggestions'].append({
                    'type': '存储检查',
                    'code': '''
// 检查localStorage支持
try {
    const value = localStorage.getItem('key');
    return value ? JSON.parse(value) : null;
} catch (e) {
    window.Logger?.warn('localStorage error:', e);
    return null;
}
'''
                })
        
        # 通用错误处理
        if 'timeout' in error:
            fix['suggestions'].append({
                'type': '超时处理',
                'code': '''
// 增加等待时间或使用checkElement
const element = await checkElement('#id', 5000);
if (!element) {
    throw new Error('Element not found within timeout');
}
'''
            })
        
        if 'cannot read' in error:
            fix['suggestions'].append({
                'type': '空值检查',
                'code': '''
// 使用可选链操作符
const value = obj?.property?.subProperty;
if (!value) {
    return null; // 或默认值
}
'''
            })
        
        fixes.append(fix)
    
    return fixes

def main():
    if len(sys.argv) < 2:
        print("用法: python3 fix-failed-tests.py <报告文件路径或JSON内容>")
        print()
        print("示例:")
        print("  python3 fix-failed-tests.py comprehensive-test-report-1772303837033.json")
        print("  python3 fix-failed-tests.py '{\"tests\":[...],\"results\":{...}}'")
        print()
        print("或者将文件复制到工作空间:")
        print("  cp /path/to/report.json ./test/test-results/")
        sys.exit(1)
    
    report_input = sys.argv[1]
    report = read_report(report_input)
    
    if not report:
        print("❌ 无法读取测试报告")
        print("请确认文件路径正确，或将文件复制到工作空间")
        sys.exit(1)
    
    failed_tests = analyze_failed_tests(report)
    
    if failed_tests:
        print("=" * 60)
        print("🔧 修复建议")
        print("=" * 60)
        print()
        
        fixes = generate_fix_code(failed_tests)
        
        for fix in fixes:
            print(f"测试: {fix['test_name']}")
            print(f"类别: {fix['category']}")
            if fix['suggestions']:
                for suggestion in fix['suggestions']:
                    print(f"  建议: {suggestion['type']}")
                    print(f"  代码:")
                    print(suggestion['code'])
            else:
                print("  需要查看具体错误信息进行针对性修复")
            print()
        
        # 保存修复建议
        output_dir = Path(__file__).parent / 'test-results'
        output_dir.mkdir(exist_ok=True)
        fix_file = output_dir / f"fix-suggestions-{os.path.basename(report_input)}.json"
        
        with open(fix_file, 'w', encoding='utf-8') as f:
            json.dump({
                'report': report_input,
                'failed_tests': failed_tests,
                'fixes': fixes
            }, f, indent=2, ensure_ascii=False)
        
        print(f"✅ 修复建议已保存: {fix_file}")
        print()
        print("=" * 60)
        print("📝 下一步")
        print("=" * 60)
        print("1. 查看上面的修复建议")
        print("2. 根据建议修改对应的代码文件")
        print("3. 重新运行测试验证修复")
        print()

if __name__ == '__main__':
    main()
