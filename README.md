# AI Agent Pro

<div align="center">

![Version](https://img.shields.io/badge/version-8.2.1-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Web-lightgrey.svg)

**基于多模态AI的智能助手应用，支持多种大语言模型，提供对话、任务管理、计划制定等智能服务**

[功能特性](#-核心特性) • [快速开始](#-快速开始) • [文档](#-文档) • [部署](#-部署)

</div>

---

## 📋 目录

- [核心特性](#-核心特性)
- [快速开始](#-快速开始)
- [项目结构](#-项目结构)
- [技术栈](#-技术栈)
- [功能模块](#-功能模块)
- [部署](#-部署)
- [文档](#-文档)
- [贡献](#-贡献)
- [许可证](#-许可证)

---

## ✨ 核心特性

### 🤖 多模型支持
- **DeepSeek**: Chat、R1（深度推理）
- **GLM**: GLM-4-Plus、GLM-4-Flash
- **Kimi**: 长文本处理
- **通义千问**: 阿里云模型
- **GPT-4o**: OpenAI最新模型
- **Claude 3**: Anthropic模型
- **Auto模式**: 根据任务自动选择最佳模型

### 🧠 智能SubAgent系统
- **20+内置助手**: 通用助手、代码助手、写作助手、数据分析助手、学习导师、翻译专家、超级决策等
- **可配置资源**: 为每个助手关联Skills、Rules、MCP、RAG资源
- **自定义助手**: 支持创建和配置自定义SubAgent

### 📚 RAG知识库增强
- **多格式支持**: PDF、DOC、PPT、Excel、CSV、HTML、Markdown、图片、URL
- **智能向量化**: TF-IDF + 语义哈希算法（256维向量）
- **语义检索**: 余弦相似度搜索，支持多源融合
- **20+内置知识库**: 金融、哲学、文学、技术、社科等专业领域

### 🎯 任务与计划管理
- **任务管理**: 创建、跟踪、完成待办任务
- **计划制定**: AI辅助生成项目计划和TODO列表
- **进度跟踪**: 可视化进度和完成状态

### 🎨 多模态输入输出
- **输入支持**: 文本、图片、文档、URL
- **输出格式**: Markdown、HTML、表格、PDF、PPT、H5网页
- **流式响应**: 实时显示AI生成内容

### 🔧 丰富的资源系统
- **Skills（技能）**: 20+专业能力模板
- **Rules（规则）**: 8个行为规范
- **MCP服务**: 文件系统、网络搜索、计算器等
- **RAG知识库**: 检索增强生成

---

## 🚀 快速开始

### 环境要求

- **Web服务器**: 任何支持静态文件的Web服务器（Python、Node.js、Nginx等）
- **浏览器**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **网络**: 需要访问外部AI API（可选，可配置）

### 本地运行

#### 方式一：使用启动脚本（推荐）

```bash
cd AI-Agent-pro
chmod +x start-server.sh
./start-server.sh
```

#### 方式二：使用Python

```bash
cd AI-Agent-pro
python3 -m http.server 8080
```

#### 方式三：使用Node.js

```bash
cd AI-Agent-pro
npx http-server -p 8080
```

### 访问应用

打开浏览器访问: **http://localhost:8080**

---

## 📁 项目结构

```
AI-Agent-pro/
├── index.html              # 主页面
├── README.md               # 项目说明
├── .gitignore              # Git忽略文件
├── start-server.sh         # 启动脚本
├── run-tests.sh            # 测试脚本
│
├── css/                    # 样式文件
│   └── style-new.css      # 主样式文件（4184行）
│
├── js/                     # JavaScript模块
│   ├── app.js             # 应用状态管理（2586行）
│   ├── ui.js              # UI渲染模块（3553行）
│   ├── events.js          # 事件处理（2138行）
│   ├── llm.js             # LLM服务（967行）
│   ├── rag.js             # RAG知识库（1352行）
│   ├── plan.js            # 计划管理（357行）
│   ├── sync.js            # 数据同步（249行）
│   │
│   ├── utils/             # 工具模块
│   │   ├── logger.js     # 日志系统
│   │   ├── error-handler.js  # 错误处理
│   │   └── event-manager.js  # 事件管理
│   │
│   └── ui/                # UI工具
│       └── ui-utils.js    # UI工具函数
│
├── docs/                   # 文档目录
│   ├── AI-Agent-Pro-Design.html      # 设计文档
│   ├── AI-Agent-Pro-Guide.html      # 部署指南
│   ├── AI-Agent-Pro-Features.html   # 功能说明书(H5)
│   └── archive/           # 归档文档
│
└── test/                   # 测试文件
    ├── comprehensive-test.html      # 综合测试套件
    └── browser-test.html            # 浏览器测试
```

---

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| **前端框架** | 原生JavaScript (ES6+) |
| **样式** | CSS3 + CSS Variables |
| **UI组件** | Font Awesome Icons |
| **图表** | Chart.js |
| **流程图** | Mermaid |
| **代码高亮** | Highlight.js |
| **存储** | LocalStorage |
| **文档解析** | Jina AI Reader API |

---

## 📖 功能模块

### 1. 对话系统
- 多轮对话上下文保持
- 消息复制、下载、删除、编辑
- 语音播放
- 重新生成回复
- 思考过程显示

### 2. 模型管理
- 模型选择和切换
- API Key配置
- 自定义模型添加
- 智能模型选择（Auto模式）

### 3. SubAgent系统
- 助手选择和切换
- 资源配置（Skills、Rules、MCP、RAG）
- 自定义助手创建
- 助手能力展示

### 4. RAG知识库
- 文档上传和解析
- 向量化和存储
- 语义检索
- 外部数据源管理
- 多格式支持（PDF、DOC、PPT、Excel、图片、URL）

### 5. 任务管理
- 任务创建和编辑
- 优先级设置
- 完成状态跟踪
- 任务列表管理

### 6. 计划管理
- AI辅助计划生成
- TODO列表自动创建
- 计划执行跟踪
- 进度可视化

### 7. 设置系统
- 主题切换（深色/浅色）
- 语言设置
- 模型配置
- 资源管理
- 数据导入导出

---

## 🚀 部署

### GitHub Pages部署

1. Fork本项目
2. 在仓库设置中启用GitHub Pages
3. 选择`main`分支和`/root`目录
4. 访问 `https://yourusername.github.io/ai-agent-pro`

### Vercel部署

```bash
npm i -g vercel
cd AI-Agent-pro
vercel
```

### Netlify部署

1. 登录Netlify
2. 拖拽项目文件夹到Netlify
3. 自动部署完成

### 其他静态托管

支持任何静态文件托管服务：
- Cloudflare Pages
- AWS S3 + CloudFront
- Azure Static Web Apps
- 自建Nginx服务器

---

## 📚 文档

- [设计文档](docs/DESIGN.md) - 详细的设计思想、架构、算法
- [部署文档](docs/DEPLOYMENT.md) - 部署说明和配置
- [功能说明书](docs/AI-Agent-Pro-Features.html) - 功能使用指南（H5格式）
- [HTML版设计文档](docs/AI-Agent-Pro-Design.html) - 在线查看
- [HTML版部署指南](docs/AI-Agent-Pro-Guide.html) - 在线查看

---

## 🔧 配置

### API密钥配置

1. 进入设置 → 模型
2. 选择要配置的模型
3. 输入API密钥
4. 保存配置

### Jina AI配置（文档解析）

1. 进入设置 → Jina AI
2. 输入Jina AI API密钥（可选，用于PDF/DOC/PPT/Excel/图片/URL解析）
3. 启用Jina AI解析
4. 测试连接

---

## 🧪 测试

### 运行测试套件

```bash
# 启动服务器
./start-server.sh

# 访问测试页面
http://localhost:8080/test/comprehensive-test.html
```

### 测试覆盖

- ✅ 168个测试用例
- ✅ UI功能测试
- ✅ RAG功能测试
- ✅ SubAgent测试
- ✅ 性能测试

---

## 🎯 核心算法

### RAG向量化算法

**TF-IDF + 语义哈希（256维向量）**

```javascript
// 1. 字符级特征提取
// 2. 词级特征提取（中英文分词）
// 3. TF-IDF权重计算
// 4. 向量归一化
```

### 语义检索算法

**余弦相似度搜索**

```javascript
// 1. 生成查询向量
// 2. 并行搜索所有文档
// 3. 计算余弦相似度
// 4. 排序并返回Top-K结果
```

### 文档分块策略

- 按句子分割（中英文标点）
- 重叠窗口：50字符
- 块大小：500字符（可配置）

---

## 📊 性能优化

- ✅ 搜索结果缓存（LRU策略，最大100条）
- ✅ 批量向量生成（10个chunks/批）
- ✅ 并行查询多个RAG知识库
- ✅ 防抖保存（500ms延迟）
- ✅ 事件委托机制
- ✅ 异步I/O操作

---

## 🔒 安全性

- ✅ XSS防护（escapeHtml函数）
- ✅ 用户输入验证
- ✅ 错误处理机制
- ✅ 日志系统（开发/生产环境自动切换）

**注意**: 生产环境建议移除硬编码的API密钥，使用用户配置。

---

## 🤝 贡献

欢迎提交Issue和Pull Request！

### 开发规范

- 使用ES6+语法
- 遵循单一职责原则
- 添加适当的注释
- 保持代码风格一致

---

## 📝 更新日志

### v8.2.1 (2026-03-01)
- ✅ 项目整理，清理冗余文档（FEATURES.md、AI-Agent-Pro-Features.md、历史版本更新文档）
- ✅ 功能说明书合并为 H5 格式
- ✅ 状态持久化优化（刷新/关闭前同步保存）
- ✅ 统一版本号至 8.2.1

### v8.2.0 (2026-03-01)
- ✅ 深度评审与代码优化
- ✅ 文件附件解析状态改为小字显示，移除遮挡输入框的 Toast
- ✅ 附件进度圈改为完整 360° 百分比显示
- ✅ 图片解析增强（Tesseract 降级、多 CDN、容错）
- ✅ PDF 解析多方法降级（pdf/file/二进制）
- ✅ 网页爬取改用 POST+url，支持 URL 编码
- ✅ 合并冗余部署脚本，归档 SSH 文档
- ✅ 深度评审与优化

### v8.1.0 (2026-03-01)
- ✅ 更新功能说明书
- ✅ 优化菜单文档链接
- ✅ 完善文档系统

### v8.0.1 (2026-03-01)
- ✅ 修复消息操作按钮点击问题
- ✅ 支持多文件选择和上传
- ✅ 改进PDF和下载按钮功能
- ✅ 优化RAG向量化算法
- ✅ 增强Jina AI API支持
- ✅ 完善文档系统
- ✅ 修复发送按钮中断功能
- ✅ 优化搜索源结果提取（每个源至少5条）
- ✅ 添加内容质量检测
- ✅ 更新所有文档版本号到v8.0.1
- ✅ 清理和归档冗余文档

### v7.9.0
- ✅ 重构SubAgent资源管理UI
- ✅ 优化资源选择交互
- ✅ 启动页动画优化

---

## 📄 许可证

MIT License

---

## 🙏 致谢

- [Font Awesome](https://fontawesome.com/) - 图标库
- [Chart.js](https://www.chartjs.org/) - 图表库
- [Mermaid](https://mermaid.js.org/) - 流程图
- [Highlight.js](https://highlightjs.org/) - 代码高亮
- [Jina AI](https://jina.ai/) - 文档解析API

---

<div align="center">

**Made with ❤️ by AI Agent Pro Team**

[⭐ Star this repo](https://github.com/yourusername/ai-agent-pro) • [📖 Read the docs](docs/) • [🐛 Report Bug](https://github.com/yourusername/ai-agent-pro/issues) • [📥 Download Source](https://github.com/yourusername/ai-agent-pro/archive/refs/heads/main.zip)

</div>
