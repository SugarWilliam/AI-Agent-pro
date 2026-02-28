#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试报告分析和处理工具
支持Windows和Linux路径
"""

import json
import sys
import os
from pathlib import Path

def analyze_report(report_path):
    """分析测试报告"""
    try:
        # 尝试多种路径
        # 处理Windows路径转换
        win_path = report_path.replace('C:', '').replace('\\', '/')
        paths = [
            report_path,
            f"/mnt/c{win_path}",
            f"/home/pyc/ai-agent-pro-source/AI-Agent-pro/test/test-results/{os.path.basename(report_path)}"
        ]
        
        report = None
        used_path = None
        
        for path in paths:
            try:
                if os.path.exists(path):
                    with open(path, 'r', encoding='utf-8') as f:
                        report = json.load(f)
                        used_path = path
                        print(f"✅ 成功读取报告: {path}\n")
                        break
            except Exception as e:
                continue
        
        if not report:
            print("❌ 无法读取测试报告文件")
            print("请确认文件路径是否正确，或提供报告内容")
            return None
        
        # 分析报告
        print("=" * 60)
        print("📊 测试报告分析")
        print("=" * 60)
        print()
        
        results = report.get('results', {})
        tests = report.get('tests', [])
        
        # 总体统计
        print("📈 总体统计:")
        print(f"   总测试数: {results.get('total', 0)}")
        print(f"   ✅ 通过: {results.get('passed', 0)}")
        print(f"   ❌ 失败: {results.get('failed', 0)}")
        print(f"   ⏭️  跳过: {results.get('skipped', 0)}")
        print(f"   通过率: {results.get('passRate', 0)}%")
        print(f"   耗时: {results.get('duration', 0)}秒")
        print()
        
        # 失败的测试
        failed_tests = [t for t in tests if t.get('status') == 'failed']
        if failed_tests:
            print("❌ 失败的测试:")
            print()
            
            # 按类别分组
            failures_by_category = {}
            for test in failed_tests:
                category = test.get('category', 'unknown')
                if category not in failures_by_category:
                    failures_by_category[category] = []
                failures_by_category[category].append(test)
            
            for category, category_tests in failures_by_category.items():
                print(f"   {category.upper()} ({len(category_tests)}个失败):")
                for test in category_tests:
                    print(f"      - {test.get('name', 'Unknown')}")
                    if test.get('error'):
                        error_msg = test.get('error', '')
                        if len(error_msg) > 80:
                            error_msg = error_msg[:80] + '...'
                        print(f"        错误: {error_msg}")
                print()
            
            # 生成修复建议
            print("🔧 修复建议:")
            generate_fix_suggestions(failed_tests)
        else:
            print("✅ 所有测试通过！")
            print()
        
        # 跳过的测试
        skipped_tests = [t for t in tests if t.get('status') == 'skipped']
        if skipped_tests:
            print(f"⏭️  跳过的测试 ({len(skipped_tests)}个):")
            for test in skipped_tests[:10]:  # 只显示前10个
                print(f"   - {test.get('name', 'Unknown')}: {test.get('details', '无详情')}")
            if len(skipped_tests) > 10:
                print(f"   ... 还有 {len(skipped_tests) - 10} 个跳过的测试")
            print()
        
        # 覆盖率
        coverage = results.get('coverage', {})
        if coverage:
            print("📊 覆盖率统计:")
            for category, stats in coverage.items():
                if isinstance(stats, dict) and 'total' in stats:
                    percent = (stats.get('tested', 0) / stats.get('total', 1)) * 100
                    status = '✅' if percent >= 80 else '⚠️' if percent >= 50 else '❌'
                    print(f"   {status} {category}: {percent:.1f}% ({stats.get('tested', 0)}/{stats.get('total', 0)})")
                elif isinstance(stats, str):
                    print(f"   {category}: {stats}")
            print()
        
        # 保存分析结果
        output_dir = Path(__file__).parent / 'test-results'
        output_dir.mkdir(exist_ok=True)
        analysis_file = output_dir / f"analysis-{os.path.basename(report_path)}"
        
        analysis = {
            'report_path': used_path,
            'summary': {
                'total': results.get('total', 0),
                'passed': results.get('passed', 0),
                'failed': results.get('failed', 0),
                'skipped': results.get('skipped', 0),
                'pass_rate': results.get('passRate', 0)
            },
            'failed_tests': failed_tests,
            'skipped_tests': skipped_tests,
            'coverage': coverage
        }
        
        with open(analysis_file, 'w', encoding='utf-8') as f:
            json.dump(analysis, f, indent=2, ensure_ascii=False)
        
        print(f"✅ 分析结果已保存: {analysis_file}")
        print()
        
        return analysis
        
    except Exception as e:
        print(f"❌ 分析失败: {e}")
        import traceback
        traceback.print_exc()
        return None

def generate_fix_suggestions(failed_tests):
    """生成修复建议"""
    suggestions = {}
    
    for test in failed_tests:
        name = test.get('name', '').lower()
        error = (test.get('error') or '').lower()
        category = test.get('category', '')
        
        # UI相关
        if category == 'ui' or 'render' in name or 'ui' in name:
            if 'null' in error or 'undefined' in error:
                suggestions['UI DOM检查'] = '添加DOM元素存在性检查，使用checkElement等待元素加载'
            if 'function' in error or 'not a function' in error:
                suggestions['UI函数暴露'] = '检查函数是否正确暴露到window.AIAgentUI'
        
        # 事件相关
        if category == 'events':
            if 'null' in error or 'undefined' in error:
                suggestions['事件处理'] = '确保AppState已初始化，添加空值检查'
            if 'function' in error:
                suggestions['事件函数'] = '检查函数是否正确暴露到window.AIAgentEvents'
        
        # 应用状态相关
        if category == 'app':
            if 'localstorage' in error or 'storage' in error:
                suggestions['状态存储'] = '检查localStorage key是否正确，支持多个版本key'
            if 'null' in error or 'undefined' in error:
                suggestions['状态初始化'] = '确保AppState在测试前已初始化'
        
        # 通用
        if 'timeout' in error or 'time' in error:
            suggestions['超时处理'] = '增加wait时间或优化异步操作'
        
        if 'cannot read' in error or 'null' in error:
            suggestions['空值检查'] = '添加可选链操作符(?.)和空值检查'
    
    if suggestions:
        for key, value in suggestions.items():
            print(f"   • {key}: {value}")
    else:
        print("   • 查看具体错误信息进行针对性修复")
    print()

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("用法: python3 process-report.py <报告文件路径>")
        print()
        print("示例:")
        print("  python3 process-report.py comprehensive-test-report-1772301344508.json")
        print("  python3 process-report.py /path/to/report.json")
        sys.exit(1)
    
    report_path = sys.argv[1]
    result = analyze_report(report_path)
    
    if result and result['summary']['failed'] > 0:
        sys.exit(1)
