#!/usr/bin/env python3
"""
简易 HTTP 服务器 - 解决 ERR_EMPTY_RESPONSE 兼容性问题
绑定 0.0.0.0，支持局域网访问
"""
import http.server
import socketserver
import os

PORT = 8080
DIR = os.path.dirname(os.path.abspath(__file__))

os.chdir(DIR)

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
    print(f"服务器已启动: http://0.0.0.0:{PORT}")
    print(f"本机访问: http://localhost:{PORT}")
    try:
        import socket
        ip = [a for a in socket.gethostbyname_ex(socket.gethostname())[2] if not a.startswith("127.")][:1]
        if ip:
            print(f"局域网访问: http://{ip[0]}:{PORT}")
    except Exception:
        pass
    print("按 Ctrl+C 停止")
    httpd.serve_forever()
