# AI Agent Pro 部署文档

**版本**: v8.2.1  
**日期**: 2026-03-01

---

## 📋 目录

1. [项目概述](#1-项目概述)
2. [环境要求](#2-环境要求)
3. [本地部署](#3-本地部署)
4. [生产环境部署](#4-生产环境部署)
5. [配置说明](#5-配置说明)
6. [故障排查](#6-故障排查)

---

## 1. 项目概述

AI Agent Pro 是一个**纯前端应用**，基于 HTML/CSS/JavaScript 构建，无需后端服务器即可运行。

### 项目特点

- ✅ **纯静态文件**：所有文件都是静态资源，可直接部署
- ✅ **无需后端**：数据存储在浏览器本地（LocalStorage）
- ✅ **跨平台**：支持任何静态托管服务
- ✅ **PWA支持**：可安装为桌面/移动应用
- ✅ **离线使用**：支持离线模式（需先加载）

### 技术栈

- **前端**: 原生JavaScript (ES6+)
- **样式**: CSS3 + CSS Variables
- **存储**: LocalStorage
- **依赖**: CDN加载（Font Awesome、Chart.js、Mermaid等）

---

## 2. 环境要求

### 2.1 Web服务器

支持任何静态文件托管服务：

| 服务器 | 版本要求 | 说明 |
|--------|---------|------|
| Python HTTP Server | Python 3.x | 开发环境 |
| Node.js http-server | 最新版 | 开发环境 |
| Nginx | 1.18+ | 生产环境 |
| Apache | 2.4+ | 生产环境 |
| Caddy | 2.0+ | 生产环境 |

### 2.2 浏览器要求

| 浏览器 | 最低版本 | 说明 |
|--------|---------|------|
| Chrome | 90+ | 推荐 |
| Firefox | 88+ | 支持 |
| Safari | 14+ | 支持 |
| Edge | 90+ | 支持 |
| 移动浏览器 | 最新版 | iOS Safari、Chrome Mobile |

### 2.3 网络要求

- **必需**: 访问外部CDN（Font Awesome、Chart.js等）
- **可选**: 访问AI API（DeepSeek、GLM、Kimi等）
- **可选**: 访问Jina AI API（文档解析）

### 2.4 存储空间

- **浏览器LocalStorage**: 约5-10MB（取决于文档数量）
- **服务器存储**: 无需（纯静态文件）

---

## 3. 本地部署

### 3.1 方式一：使用启动脚本（推荐）

```bash
# 1. 进入项目目录
cd AI-Agent-pro

# 2. 添加执行权限
chmod +x start-server.sh

# 3. 启动服务器
./start-server.sh
```

**默认端口**: 8080  
**访问地址**: http://localhost:8080

### 3.2 方式二：使用Python

```bash
# Python 3.x
cd AI-Agent-pro
python3 -m http.server 8080

# 或指定端口
python3 -m http.server 3000
```

**访问地址**: http://localhost:8080

### 3.3 方式三：使用Node.js

```bash
# 安装http-server（全局）
npm install -g http-server

# 启动服务器
cd AI-Agent-pro
http-server -p 8080

# 或使用npx（无需安装）
npx http-server -p 8080
```

**访问地址**: http://localhost:8080

### 3.4 方式四：使用PHP

```bash
cd AI-Agent-pro
php -S localhost:8080
```

**访问地址**: http://localhost:8080

---

## 4. 生产环境部署

### 4.1 GitHub Pages

**步骤**：

1. Fork或克隆项目到GitHub仓库
2. 进入仓库设置 → Pages
3. 选择分支（main/master）
4. 选择目录（/root）
5. 保存设置
6. 等待部署完成（约1-2分钟）

**访问地址**: `https://yourusername.github.io/ai-agent-pro`

**优点**：
- 免费
- 自动HTTPS
- 自动部署（push后自动更新）

**部署脚本**（项目根目录）：
- `./deploy.sh [--auto] [--force]`：常规推送（支持 SSH/HTTPS）
- `GITHUB_TOKEN=xxx ./DEPLOY_NOW.sh`：使用 Token 推送（解决 SSH 认证问题）

### 4.2 Vercel部署

**步骤**：

```bash
# 1. 安装Vercel CLI
npm i -g vercel

# 2. 登录Vercel
vercel login

# 3. 部署项目
cd AI-Agent-pro
vercel

# 4. 按提示操作
# - 项目名称
# - 是否覆盖现有项目
```

**访问地址**: `https://your-project.vercel.app`

**优点**：
- 免费额度充足
- 自动HTTPS
- 全球CDN加速
- 自动部署

### 4.3 Netlify部署

**方式一：拖拽部署**

1. 登录 [Netlify](https://www.netlify.com/)
2. 进入Dashboard
3. 拖拽项目文件夹到部署区域
4. 等待部署完成

**方式二：Git连接**

1. 登录Netlify
2. 点击"New site from Git"
3. 连接GitHub/GitLab/Bitbucket
4. 选择仓库
5. 配置构建设置（无需构建，直接部署）
6. 部署

**访问地址**: `https://your-project.netlify.app`

**优点**：
- 免费额度充足
- 自动HTTPS
- 全球CDN加速
- 表单处理支持

### 4.4 Cloudflare Pages

**步骤**：

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入Pages
3. 点击"Create a project"
4. 连接Git仓库
5. 配置构建设置：
   - Build command: （留空）
   - Build output directory: `/`
6. 部署

**访问地址**: `https://your-project.pages.dev`

**优点**：
- 免费额度充足
- 全球CDN加速
- 自动HTTPS
- 边缘计算支持

### 4.5 自建服务器（Nginx）

**步骤**：

1. **安装Nginx**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install nginx
   
   # CentOS/RHEL
   sudo yum install nginx
   ```

2. **配置Nginx**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       root /var/www/ai-agent-pro;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       # 静态资源缓存
       location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
       
       # Gzip压缩
       gzip on;
       gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
   }
   ```

3. **部署文件**
   ```bash
   # 复制项目文件到服务器
   sudo cp -r AI-Agent-pro/* /var/www/ai-agent-pro/
   
   # 设置权限
   sudo chown -R www-data:www-data /var/www/ai-agent-pro
   ```

4. **启动Nginx**
   ```bash
   sudo systemctl start nginx
   sudo systemctl enable nginx
   ```

5. **配置HTTPS（Let's Encrypt）**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

**访问地址**: `https://your-domain.com`

### 4.6 Docker部署

**Dockerfile**：

```dockerfile
FROM nginx:alpine

# 复制项目文件
COPY . /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 启动Nginx
CMD ["nginx", "-g", "daemon off;"]
```

**构建和运行**：

```bash
# 构建镜像
docker build -t ai-agent-pro .

# 运行容器
docker run -d -p 8080:80 --name ai-agent-pro ai-agent-pro
```

**访问地址**: http://localhost:8080

---

## 5. 配置说明

### 5.1 API密钥配置

**配置位置**: 设置 → 模型

**支持的模型**：
- DeepSeek Chat / R1
- GLM-4-Plus / GLM-4-Flash
- Kimi
- 通义千问
- GPT-4o
- Claude 3

**配置步骤**：
1. 进入设置页面
2. 点击"模型"标签
3. 选择要配置的模型
4. 输入API密钥
5. 保存配置

**安全提示**：
- API密钥存储在浏览器本地
- 不会上传到服务器
- 建议定期更换密钥

### 5.2 Jina AI配置（文档解析）

**配置位置**: 设置 → Jina AI

**用途**：
- PDF文档解析
- Word文档解析
- PPT文档解析
- Excel文档解析
- 图片OCR
- 网页内容抓取

**配置步骤**：
1. 进入设置页面
2. 点击"Jina AI"标签
3. 输入Jina AI API密钥（可选）
4. 启用Jina AI解析
5. 测试连接

**获取密钥**: https://jina.ai/

**注意**：
- 未配置密钥时，使用降级方案（仅显示文件基本信息）
- 配置密钥后，可完整解析文档内容

### 5.3 主题配置

**配置位置**: 设置 → 通用

**选项**：
- 深色主题（默认）
- 浅色主题
- 自动（跟随系统）

### 5.4 语言配置

**配置位置**: 设置 → 通用

**选项**：
- 简体中文
- English

---

## 6. 故障排查

### 6.1 常见问题

#### 问题1：页面空白

**可能原因**：
- JavaScript文件加载失败
- CDN资源无法访问
- 浏览器兼容性问题

**解决方案**：
1. 检查浏览器控制台错误
2. 检查网络连接
3. 尝试使用其他浏览器
4. 清除浏览器缓存

#### 问题2：API调用失败

**可能原因**：
- API密钥未配置或无效
- 网络连接问题
- API服务不可用

**解决方案**：
1. 检查API密钥配置
2. 检查网络连接
3. 查看浏览器控制台错误信息
4. 尝试其他模型

#### 问题3：文档解析失败

**可能原因**：
- Jina AI API密钥未配置
- 文件格式不支持
- 文件过大

**解决方案**：
1. 配置Jina AI API密钥
2. 检查文件格式是否支持
3. 尝试较小的文件
4. 查看浏览器控制台错误信息

#### 问题4：数据丢失

**可能原因**：
- 清除浏览器数据
- LocalStorage空间不足
- 浏览器隐私模式

**解决方案**：
1. 定期导出数据备份
2. 检查LocalStorage空间
3. 避免使用隐私模式
4. 使用数据导入功能恢复

### 6.2 性能优化

#### 优化建议

1. **启用Gzip压缩**
   ```nginx
   gzip on;
   gzip_types text/plain text/css application/json application/javascript;
   ```

2. **静态资源缓存**
   ```nginx
   location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

3. **CDN加速**
   - 使用CDN托管静态资源
   - 减少服务器负载

4. **浏览器缓存**
   - 设置合适的Cache-Control头
   - 使用Service Worker（PWA）

### 6.3 日志和调试

#### 开发模式

**启用日志**：
- 打开浏览器控制台
- 查看Console输出
- 查看Network请求

**日志级别**：
- `Logger.debug()` - 调试信息（仅开发环境）
- `Logger.info()` - 一般信息
- `Logger.warn()` - 警告信息
- `Logger.error()` - 错误信息

#### 生产模式

**禁用调试日志**：
- 生产环境自动禁用debug日志
- 仅显示error和warn级别日志

---

## 7. 更新和维护

### 7.1 更新项目

**Git方式**：
```bash
git pull origin main
```

**手动更新**：
1. 下载最新版本
2. 备份现有数据（导出）
3. 替换项目文件
4. 清除浏览器缓存
5. 重新加载页面

### 7.2 数据备份

**导出数据**：
1. 进入设置 → 数据
2. 点击"导出数据"
3. 保存JSON文件

**导入数据**：
1. 进入设置 → 数据
2. 点击"导入数据"
3. 选择JSON文件
4. 确认导入

### 7.3 版本兼容性

**数据迁移**：
- 自动检测版本差异
- 自动迁移数据格式
- 保留向后兼容性

---

## 8. 安全建议

### 8.1 API密钥安全

- ✅ 不要将API密钥提交到Git仓库
- ✅ 定期更换API密钥
- ✅ 使用环境变量存储（如需要）
- ✅ 限制API密钥权限

### 8.2 数据安全

- ✅ 定期备份数据
- ✅ 使用HTTPS部署
- ✅ 避免在公共网络使用
- ✅ 清除敏感数据

### 8.3 网络安全

- ✅ 使用HTTPS
- ✅ 配置CSP（Content Security Policy）
- ✅ 启用HSTS
- ✅ 定期更新依赖

---

## 附录

### A. 部署检查清单

- [ ] 项目文件完整
- [ ] 服务器配置正确
- [ ] HTTPS配置完成
- [ ] API密钥配置完成
- [ ] 浏览器兼容性测试
- [ ] 功能测试通过
- [ ] 性能测试通过
- [ ] 数据备份完成

### B. 常用命令

```bash
# Python服务器
python3 -m http.server 8080

# Node.js服务器
npx http-server -p 8080

# PHP服务器
php -S localhost:8080

# Nginx重启
sudo systemctl restart nginx

# Nginx检查配置
sudo nginx -t
```

---

**文档版本**: v8.2.0  
**最后更新**: 2026-03-01  
**维护者**: AI Agent Pro Team
