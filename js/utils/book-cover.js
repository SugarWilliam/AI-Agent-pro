/**
 * AI Agent Pro - 默认图书封面生成
 * 用于 epub/PDF 电子书导出
 * 支持参考封面：将 参考封面.jpg 置于项目根目录，系统会加载并在其上叠加书名、作者
 * 【硬性约束】使用参考封面时，必须在打包输出时修改封面中的书名和作者，不得直接使用原图
 */
(function() {
    'use strict';

    const REFERENCE_COVER_PATH = '参考封面.jpg';

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

        /** 在参考封面上叠加书名、作者（必须执行，不得跳过），返回 PNG Blob */
        async overlayOnReferenceCover(refImg, title, subtitle, width = 600, height = 800) {
            return new Promise((resolve) => {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(refImg, 0, 0, width, height);
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(0, height * 0.32, width, height * 0.4);
                const t = (title || '电子书').slice(0, 20);
                const sub = (subtitle || '').slice(0, 30);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 40px "Noto Serif SC", "SimSun", "Microsoft YaHei", serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(t, width / 2, height * 0.45);
                ctx.font = '16px sans-serif';
                ctx.fillStyle = '#e2e8f0';
                ctx.fillText(sub, width / 2, height * 0.55);
                canvas.toBlob(b => resolve(b), 'image/jpeg', 0.92);
            });
        },

        /** 获取默认封面 PNG Blob。优先加载 参考封面.jpg，【必须】在其上叠加真实书名、作者后输出；若无参考封面则使用 SVG 生成 */
        async getDefaultCoverBlob(title, subtitle) {
            const t = title || '电子书';
            const s = subtitle || '';
            try {
                const resp = await fetch(REFERENCE_COVER_PATH);
                if (resp.ok) {
                    const blob = await resp.blob();
                    const img = new Image();
                    await new Promise((resolve, reject) => {
                        img.onload = () => resolve();
                        img.onerror = () => reject(new Error('参考封面加载失败'));
                        img.src = URL.createObjectURL(blob);
                    });
                    const result = await this.overlayOnReferenceCover(img, t, s);
                    URL.revokeObjectURL(img.src);
                    return result;
                }
            } catch (_) { /* 无参考封面，使用 SVG */ }
            const svg = this.svg(t, s);
            return this.toPngBlob(svg);
        }
    };

    window.BookCover = DEFAULT_COVER;
})();
