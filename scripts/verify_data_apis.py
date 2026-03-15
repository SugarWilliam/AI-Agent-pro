#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据 API 基础连通性校验脚本

用于对量化幻方助手接入的免费数据源做最小调用测试，便于在 RAG/文档中注明
「已于某日做过基础连通性验证」。本脚本不依赖项目前端，可单独运行。

用法:
  pip install akshare requests  # 可选: tushare
  export TUSHARE_TOKEN="your_token"  # 仅当需验证 Tushare Pro 时
  python scripts/verify_data_apis.py

输出:
  打印各源校验结果，并写入 scripts/verify_data_apis_result.txt（含日期与逐项结果）。
"""

import os
import sys
from datetime import datetime

RESULT_PATH = os.path.join(os.path.dirname(__file__), "verify_data_apis_result.txt")


def _log(msg: str, results: list) -> None:
    print(msg)
    results.append(msg)


def verify_akshare(results: list) -> bool:
    """AkShare：最小调用（A 股代码列表或单日行情），无需 token。"""
    try:
        import akshare as ak
    except ImportError:
        _log("[FAIL] AkShare: 未安装 (pip install akshare)", results)
        return False
    try:
        # 最小调用：获取 A 股代码名称（接口轻量、稳定）
        df = ak.stock_info_a_code_name()
        if df is not None and not df.empty:
            _log("[OK] AkShare: 连通正常 (stock_info_a_code_name 返回 %d 条)" % len(df), results)
            return True
        _log("[WARN] AkShare: 返回为空", results)
        return False
    except Exception as e:
        _log("[FAIL] AkShare: %s" % (e.__class__.__name__ + ": " + str(e)), results)
        return False


def verify_tushare(results: list) -> bool:
    """Tushare Pro：需环境变量 TUSHARE_TOKEN，最小调用（如 trade_cal）。"""
    token = os.environ.get("TUSHARE_TOKEN", "").strip()
    if not token:
        _log("[SKIP] Tushare Pro: 未设置 TUSHARE_TOKEN，跳过", results)
        return False
    try:
        import tushare as ts
        pro = ts.pro_api(token)
        # 最小调用：交易日历，数据量小
        df = pro.trade_cal(exchange="SSE", start_date="20240101", end_date="20240105")
        if df is not None and not df.empty:
            _log("[OK] Tushare Pro: 连通正常 (trade_cal 返回 %d 条)" % len(df), results)
            return True
        _log("[WARN] Tushare Pro: 返回为空", results)
        return False
    except ImportError:
        _log("[FAIL] Tushare Pro: 未安装 (pip install tushare)", results)
        return False
    except Exception as e:
        _log("[FAIL] Tushare Pro: %s" % (e.__class__.__name__ + ": " + str(e)), results)
        return False


def verify_national_data(results: list) -> bool:
    """国家数据 data.stats.gov.cn：HTTP 可达性。"""
    try:
        import urllib.request
        req = urllib.request.Request(
            "https://data.stats.gov.cn/",
            headers={"User-Agent": "AI-Agent-Pro-Verify/1.0"}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status == 200:
                _log("[OK] 国家数据 (data.stats.gov.cn): HTTP 200 可达", results)
                return True
            _log("[WARN] 国家数据: HTTP %s" % resp.status, results)
            return False
    except Exception as e:
        _log("[FAIL] 国家数据: %s" % (e.__class__.__name__ + ": " + str(e)), results)
        return False


def verify_creditchina(results: list) -> bool:
    """信用中国：HTTP 可达性。"""
    try:
        import urllib.request
        req = urllib.request.Request(
            "https://www.creditchina.gov.cn/",
            headers={"User-Agent": "AI-Agent-Pro-Verify/1.0"}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status == 200:
                _log("[OK] 信用中国 (creditchina.gov.cn): HTTP 200 可达", results)
                return True
            _log("[WARN] 信用中国: HTTP %s" % resp.status, results)
            return False
    except Exception as e:
        _log("[FAIL] 信用中国: %s" % (e.__class__.__name__ + ": " + str(e)), results)
        return False


def main():
    when = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    results = [
        "",
        "======== 数据 API 基础连通性校验 ========",
        "校验时间: %s" % when,
        "",
    ]

    ok = 0
    ok += verify_akshare(results)
    results.append("")
    ok += verify_tushare(results)
    results.append("")
    ok += verify_national_data(results)
    results.append("")
    ok += verify_creditchina(results)

    results.append("")
    results.append("----------------------------------------")
    results.append("汇总: %d/4 项通过（Tushare 未配置 token 时最多 3 项）" % ok)
    results.append("")
    results.append("说明: 通过项可视为该日做过基础连通性验证；失败可能为网络、依赖或服务方变更。")
    results.append("")

    text = "\n".join(results)
    try:
        with open(RESULT_PATH, "w", encoding="utf-8") as f:
            f.write(text)
        print("\n结果已写入: %s" % RESULT_PATH)
    except Exception as e:
        print("\n写入结果文件失败: %s" % e, file=sys.stderr)

    return 0 if ok >= 1 else 1


if __name__ == "__main__":
    sys.exit(main())
