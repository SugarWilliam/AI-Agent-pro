/**
 * AI Agent Pro - 默认图书封面生成
 * 用于 epub/PDF 电子书导出
 */
(function() {
    'use strict';

    function escapeXml(s) {
        if (!s) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    const DEFAULT_COVER = {
        /** 生成默认封面 SVG 字符串，默认主标题为 AI Agent Pro */
        svg(title = 'AI Agent Pro', subtitle = '唐宋文化 · 电子书') {
            return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
                <defs>
                    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#1a365d"/>
                        <stop offset="50%" style="stop-color:#2c5282"/>
                        <stop offset="100%" style="stop-color:#2d3748"/>
                    </linearGradient>
                    <linearGradient id="accent" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:#ecc94b"/>
                        <stop offset="100%" style="stop-color:#d69e2e"/>
                    </linearGradient>
                    <filter id="shadow">
                        <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/>
                    </filter>
                </defs>
                <rect width="600" height="800" fill="url(#bg)"/>
                <rect x="20" y="20" width="560" height="760" fill="none" stroke="url(#accent)" stroke-width="2" rx="4"/>
                <rect x="80" y="280" width="440" height="4" fill="url(#accent)" opacity="0.8"/>
                <text x="300" y="340" text-anchor="middle" fill="#f7fafc" font-family="'Noto Serif SC','SimSun',serif" font-size="48" font-weight="600">${escapeXml(title)}</text>
                <text x="300" y="400" text-anchor="middle" fill="#cbd5e0" font-family="sans-serif" font-size="18">${escapeXml(subtitle)}</text>
                <rect x="250" y="420" width="100" height="2" fill="url(#accent)" opacity="0.6"/>
                <text x="300" y="480" text-anchor="middle" fill="#a0aec0" font-family="sans-serif" font-size="14">电子书 · 由 AI 生成</text>
            </svg>`;
        },

        /** 将 SVG 转为 PNG Blob（用于 epub 封面） */
        async toPngBlob(svgStr, width = 600, height = 800) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#1a365d';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob(b => {
                        URL.revokeObjectURL(url);
                        resolve(b);
                    }, 'image/jpeg', 0.92);
                };
                img.onerror = () => {
                    URL.revokeObjectURL(url);
                    reject(new Error('封面渲染失败'));
                };
                img.src = url;
            });
        },

        /** 获取默认封面 PNG Blob，无书名时默认显示 AI Agent Pro */
        async getDefaultCoverBlob(title, subtitle) {
            const svg = this.svg(title || 'AI Agent Pro', subtitle || '唐宋文化 · 电子书');
            return this.toPngBlob(svg);
        }
    };

    window.BookCover = DEFAULT_COVER;
})();
