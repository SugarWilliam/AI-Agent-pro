/**
 * AI Agent Pro - UI工具函数模块
 * 提供通用的UI工具函数
 */

(function() {
    'use strict';

    // ==================== 工具函数 ====================
    
    /**
     * 格式化时间戳
     * @param {number} timestamp - 时间戳
     * @returns {string} 格式化后的时间字符串
     */
    function formatTime(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
        if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
        if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';

        return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }

    /**
     * HTML转义
     * @param {string} text - 要转义的文本
     * @returns {string} 转义后的HTML
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 滚动到底部
     */
    function scrollToBottom() {
        const container = document.getElementById('messages-container');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    /**
     * 显示Toast提示
     * @param {string} message - 提示消息
     * @param {string} type - 类型: 'info' | 'success' | 'error' | 'warning'
     */
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // 安全修复：使用textContent避免XSS攻击
        const icon = document.createElement('i');
        icon.className = `fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}`;
        
        const span = document.createElement('span');
        span.textContent = message; // 使用textContent自动转义
        
        toast.appendChild(icon);
        toast.appendChild(span);
        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * 预览图片
     * @param {string} src - 图片URL
     */
    function previewImage(src) {
        const img = document.getElementById('preview-image');
        if (img) {
            img.src = src;
            // 调用主UI模块的openModal函数
            if (window.AIAgentUI && window.AIAgentUI.openModal) {
                window.AIAgentUI.openModal('image-preview-modal');
            }
        }
    }

    /**
     * 解析Skill MD格式
     * @param {string} content - Skill MD内容
     * @returns {Object} 解析后的技能对象
     */
    function parseSkillMD(content) {
        const skill = {
            name: '',
            description: '',
            version: '1.0.0',
            author: '',
            tags: [],
            prompt: '',
            examples: [],
            parameters: {}
        };

        const titleMatch = content.match(/^#\s+(.+)$/m);
        if (titleMatch) skill.name = titleMatch[1].trim();

        const metaMatch = content.match(/```yaml\n([\s\S]*?)```/);
        if (metaMatch) {
            const metaLines = metaMatch[1].split('\n');
            metaLines.forEach(line => {
                const [key, ...valueParts] = line.split(':');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join(':').trim();
                    if (key.trim() === 'tags') {
                        skill.tags = value.split(',').map(t => t.trim());
                    } else if (key.trim() in skill) {
                        skill[key.trim()] = value;
                    }
                }
            });
        }

        const descMatch = content.match(/##\s*描述\s*\n+([\s\S]*?)(?=\n##|$)/);
        if (descMatch) skill.description = descMatch[1].trim();

        const promptMatch = content.match(/##\s*提示词\s*\n+```\n?([\s\S]*?)```/);
        if (promptMatch) skill.prompt = promptMatch[1].trim();

        const examplesMatch = content.match(/##\s*示例\s*\n+([\s\S]*?)(?=\n##|$)/);
        if (examplesMatch) {
            const exampleBlocks = examplesMatch[1].split(/###\s+/).filter(Boolean);
            skill.examples = exampleBlocks.map(block => {
                const lines = block.split('\n');
                const title = lines[0].trim();
                const content = lines.slice(1).join('\n').trim();
                return { title, content };
            });
        }

        return skill;
    }

    /**
     * 生成Skill MD格式
     * @param {Object} skill - 技能对象
     * @returns {string} Skill MD格式字符串
     */
    function generateSkillMD(skill) {
        return `# ${skill.name || '未命名技能'}

\`\`\`yaml
name: ${skill.name || ''}
description: ${skill.description || ''}
version: ${skill.version || '1.0.0'}
author: ${skill.author || ''}
tags: ${(skill.tags || []).join(', ')}
\`\`\`

## 描述

${skill.description || '暂无描述'}

## 提示词

\`\`\`
${skill.prompt || ''}
\`\`\`

## 示例

${(skill.examples || []).map((ex, i) => `### 示例 ${i + 1}: ${ex.title}

${ex.content}`).join('\n\n')}

## 使用说明

1. 在对话中引用此技能
2. AI助手将根据提示词执行相应任务
3. 可以结合其他技能使用
`;
    }

    // 导出到全局UI工具对象
    if (!window.AIAgentUIUtils) {
        window.AIAgentUIUtils = {};
    }

    window.AIAgentUIUtils.formatTime = formatTime;
    window.AIAgentUIUtils.escapeHtml = escapeHtml;
    window.AIAgentUIUtils.scrollToBottom = scrollToBottom;
    window.AIAgentUIUtils.showToast = showToast;
    window.AIAgentUIUtils.previewImage = previewImage;
    window.AIAgentUIUtils.parseSkillMD = parseSkillMD;
    window.AIAgentUIUtils.generateSkillMD = generateSkillMD;

    // 同时暴露到主UI对象（向后兼容）
    if (!window.AIAgentUI) {
        window.AIAgentUI = {};
    }
    
    // 如果主UI模块还未加载，先提供这些函数
    window.AIAgentUI.formatTime = formatTime;
    window.AIAgentUI.escapeHtml = escapeHtml;
    window.AIAgentUI.scrollToBottom = scrollToBottom;
    window.AIAgentUI.showToast = showToast;
    window.AIAgentUI.previewImage = previewImage;
    window.AIAgentUI.parseSkillMD = parseSkillMD;
    window.AIAgentUI.generateSkillMD = generateSkillMD;

})();
