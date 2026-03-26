#!/usr/bin/env bash
# 快速探测公开端点可达性（基金天天 fundgz）。iFinD/需账号的接口不在此脚本内验证。
set -euo pipefail
REF='Referer: http://fund.eastmoney.com/'
URL='http://fundgz.1234567.com.cn/js/001938.js'
echo "GET $URL"
out=$(curl -sS -m 20 -H "$REF" "$URL" | head -c 500)
echo "$out"
echo ""
if echo "$out" | grep -q 'jsonpgz'; then
  echo "OK: 天天基金 JSONP 有响应"
  exit 0
fi
echo "FAIL: 未识别 jsonpgz"
exit 1
