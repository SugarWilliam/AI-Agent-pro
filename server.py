#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI Agent Pro 本地服务器
- 静态文件服务
- Jina AI 代理（解决浏览器 CORS 限制）
"""
import json
import os
import urllib.request
import urllib.error
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

PORT = 8080
JINA_BASE = 'https://r.jina.ai'


class JinaProxyHandler(SimpleHTTPRequestHandler):
    """扩展 SimpleHTTPRequestHandler，增加 Jina 代理"""

    def do_POST(self):
        if self.path == '/api/jina-proxy':
            self._handle_jina_proxy()
        else:
            super().do_POST()

    def do_GET(self):
        if self.path.startswith('/api/jina-proxy'):
            self._handle_jina_proxy_get()
        else:
            super().do_GET()

    def _handle_jina_proxy(self):
        """处理 Jina 代理 POST 请求"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length) if content_length else b''
            data = json.loads(body.decode('utf-8')) if body else {}

            jina_url = data.get('jinaUrl') or data.get('url')  # 目标 Jina URL
            api_key = data.get('apiKey', '')
            method = data.get('method', 'POST')
            post_body = data.get('postBody') or data.get('body')

            if not jina_url:
                self._send_json_error(400, '缺少 jinaUrl 或 url 参数')
                return

            # 构建请求
            headers = {
                'Content-Type': 'application/json',
                'X-Return-Format': 'text',
                'User-Agent': 'AI-Agent-Pro/1.0'
            }
            if api_key and str(api_key).strip():
                headers['Authorization'] = f'Bearer {api_key.strip()}'

            req_body = json.dumps(post_body).encode('utf-8') if post_body else None
            req = urllib.request.Request(
                jina_url,
                data=req_body,
                headers=headers,
                method=method
            )

            with urllib.request.urlopen(req, timeout=60) as resp:
                resp_body = resp.read()
                self._send_response(200, resp_body, resp.headers.get('Content-Type', 'text/plain; charset=utf-8'))

        except urllib.error.HTTPError as e:
            err_body = e.read() if e.fp else b''
            self._send_response(e.code, err_body, e.headers.get('Content-Type', 'text/plain'))
        except urllib.error.URLError as e:
            self._send_json_error(502, f'代理请求失败: {e.reason}')
        except json.JSONDecodeError as e:
            self._send_json_error(400, f'无效的 JSON: {e}')
        except Exception as e:
            self._send_json_error(500, str(e))

    def _handle_jina_proxy_get(self):
        """处理 Jina 代理 GET 请求（URL 在 query 中，API Key 在 header）"""
        try:
            parsed = urlparse(self.path)
            qs = parse_qs(parsed.query)
            jina_url = (qs.get('url') or [None])[0]
            api_key = self.headers.get('X-Jina-Api-Key') or (qs.get('apiKey') or [None])[0] or ''

            if not jina_url:
                self._send_json_error(400, '缺少 url 参数')
                return

            headers = {
                'X-Return-Format': 'text',
                'User-Agent': 'AI-Agent-Pro/1.0'
            }
            if api_key and str(api_key).strip():
                headers['Authorization'] = f'Bearer {api_key.strip()}'

            req = urllib.request.Request(jina_url, headers=headers, method='GET')
            with urllib.request.urlopen(req, timeout=60) as resp:
                resp_body = resp.read()
                self._send_response(200, resp_body, resp.headers.get('Content-Type', 'text/plain; charset=utf-8'))

        except urllib.error.HTTPError as e:
            err_body = e.read() if e.fp else b''
            self._send_response(e.code, err_body, e.headers.get('Content-Type', 'text/plain'))
        except urllib.error.URLError as e:
            self._send_json_error(502, f'代理请求失败: {e.reason}')
        except Exception as e:
            self._send_json_error(500, str(e))

    def _send_response(self, code, body, content_type='text/plain; charset=utf-8'):
        self.send_response(code)
        self.send_header('Content-Type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', len(body))
        self.end_headers()
        self.wfile.write(body)

    def _send_json_error(self, code, message):
        body = json.dumps({'error': message}).encode('utf-8')
        self._send_response(code, body, 'application/json; charset=utf-8')

    def log_message(self, format, *args):
        # 减少代理请求的日志刷屏
        if '/api/jina-proxy' in (args[0] if args else ''):
            return
        super().log_message(format, *args)


def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server = HTTPServer(('0.0.0.0', PORT), JinaProxyHandler)
    print('=' * 50)
    print('AI Agent Pro 本地服务器')
    print('=' * 50)
    print(f'本机访问: http://localhost:{PORT}')
    print(f'局域网访问: http://<本机IP>:{PORT}')
    print('Jina 代理: /api/jina-proxy (已启用，解决 CORS)')
    print('按 Ctrl+C 停止')
    print('=' * 50)
    server.serve_forever()


if __name__ == '__main__':
    main()
