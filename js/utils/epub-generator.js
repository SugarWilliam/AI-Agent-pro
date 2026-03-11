/**
 * AI Agent Pro - EPUB 电子书生成
 * 从消息内容生成 .epub 二进制，含默认封面
 * epub/PDF 导出需通过 MECE 检查 + 上架合规检查（微信读书、Kindle 等）
 */
(function() {
    'use strict';

    /**
     * MECE 检查：内容是否具备出版级结构（相互独立、完全穷尽）
     * 通过条件（满足其一）：
     * 1. 含 content.opf 代码块（元数据与清单）
     * 2. 含 toc.ncx/nav.xhtml 且至少 2 个章节 XHTML
     * 3. 至少 2 个 xhtml/html 章节块（章节划分清晰）
     * 4. 显式标记：MECE检查通过、三审三阅通过
     */
    function passesMeceCheck(content) {
        if (!content || typeof content !== 'string') return false;
        const s = content;
        const hasOpf = /```content\.opf\s*\n[\s\S]*?```/i.test(s);
        const hasToc = /```(?:toc\.ncx|nav\.xhtml)\s*\n[\s\S]*?```/i.test(s);
        const xhtmlBlocks = s.match(/```(?:xhtml|html|chapter-\d+\.xhtml|chat\d+\.xhtml)\s*\n[\s\S]*?```/gi);
        const chapterCount = xhtmlBlocks ? xhtmlBlocks.length : 0;
        const hasMeceMarker = /MECE\s*检查\s*通过|三审三阅\s*通过|编排\s*确认|完整\s*电子档/i.test(s);
        return hasOpf || hasMeceMarker || (hasToc && chapterCount >= 2) || chapterCount >= 2;
    }

    /**
     * 上架合规检查：微信读书、Kindle 等平台要求
     * 通过条件（全部满足）：
     * 1. 显式合规标记：上架合规检查通过、微信读书合规、Kindle合规
     * 2. 版权页/版权声明（版权、作者、出版者或 ISBN）
     * 3. 元数据：书名、作者
     * 4. 无违禁内容（简单黑名单）
     */
    function passesComplianceCheck(content) {
        if (!content || typeof content !== 'string') return false;
        const s = content;
        const hasComplianceMarker = /上架\s*合规\s*检查\s*通过|微信读书\s*合规|Kindle\s*合规|平台\s*合规\s*通过/i.test(s);
        const hasCopyright = /版权|著作权|ISBN|出版者|CIP|版次|印次/i.test(s);
        const hasMetadata = /(?:书名|标题|title)[：:]\s*\S+|dc:title|dc:creator|作者[：:]\s*\S+/i.test(s);
        const prohibited = /违禁|非法出版|侵犯著作权|未获授权|内部发行/i.test(s);
        if (prohibited) return false;
        return hasComplianceMarker && (hasCopyright || hasMetadata);
    }

    /** epub/PDF 导出需同时通过 MECE + 合规检查 */
    function canExportAsEbook(content) {
        return passesMeceCheck(content) && passesComplianceCheck(content);
    }

    function extractCodeBlock(content, lang) {
        const re = new RegExp('```' + (lang || '\\w+') + '\\s*\\n([\\s\\S]*?)```', 'g');
        const matches = [];
        let m;
        while ((m = re.exec(content)) !== null) {
            matches.push({ lang: (m[0].match(/```([\w.-]+)/) || [])[1], body: m[1].trim() });
        }
        return matches;
    }

    /** 提取所有章节类代码块（xhtml、html、chapter-01.xhtml、chat01.xhtml 等），按出现顺序 */
    function extractChapterBlocks(content) {
        const re = /```(?:xhtml|html|chapter-\d+\.xhtml|chat\d+\.xhtml)\s*\n([\s\S]*?)```/gi;
        const matches = [];
        let m;
        while ((m = re.exec(content)) !== null) {
            matches.push({ body: m[1].trim() });
        }
        return matches;
    }

    /** 清洗正文中的 Markdown 格式符号（##、---、** **、* * 等），避免带入正式 XHTML */
    function stripMarkdownFromText(text) {
        if (!text || typeof text !== 'string') return text;
        return text
            .replace(/^#{1,6}\s+/gm, '')
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            .replace(/__([^_]+)__/g, '$1')
            .replace(/\*([^*]+)\*/g, '$1')
            .replace(/_([^_]+)_/g, '$1')
            .replace(/^[-*+]\s+/gm, '')
            .replace(/^\d+\.\s+/gm, '')
            .replace(/^---+$/gm, '')
            .replace(/^___+$/gm, '')
            .replace(/^\*\*\*+$/gm, '')
            .trim();
    }

    /** 手机端友好的章节默认 CSS（字号、行距、字体） */
    const MOBILE_CHAPTER_CSS = 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:17px;line-height:1.75;margin:1em;max-width:100%;-webkit-text-size-adjust:100%}p{margin:1em 0;text-indent:2em}h1,h2,h3{font-weight:600;margin:0.75em 0}';

    function extractTitle(content) {
        const h1 = content.match(/^#\s+(.+)$/m);
        return (h1 && h1[1]) ? h1[1].trim() : 'AI Agent Pro';
    }

    async function generateEpub(content, options = {}) {
        const title = options.title || extractTitle(content);
        const author = options.author || 'AI Agent Pro';
        const coverBlob = options.coverBlob || (window.BookCover ? await window.BookCover.getDefaultCoverBlob(title) : null);

        if (typeof JSZip === 'undefined') {
            throw new Error('请先加载 JSZip 库');
        }

        const zip = new JSZip();

        zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

        const opfId = 'content.opf';
        const chapters = [];
        let blocks = extractChapterBlocks(content);
        if (blocks.length === 0) {
            blocks = extractCodeBlock(content, 'xhtml').concat(extractCodeBlock(content, 'html'));
        }
        if (blocks.length > 0) {
            blocks.forEach((b, i) => {
                const id = `chapter-${String(i + 1).padStart(2, '0')}`;
                const bodyInner = b.body.replace(/<html[^>]*>/i, '').replace(/<\/html>/i, '').replace(/<body[^>]*>/i, '').replace(/<\/body>/i, '');
                const xhtml = b.body.includes('<?xml') ? b.body : `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="zh-CN">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title>
<style>${MOBILE_CHAPTER_CSS}</style></head>
<body>${bodyInner}</body></html>`;
                zip.file(`OEBPS/${id}.xhtml`, xhtml);
                chapters.push({ id, href: `${id}.xhtml` });
            });
        } else {
            const rawBody = stripMarkdownFromText(content.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '</p><p>'));
            const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="zh-CN">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title>
<style>${MOBILE_CHAPTER_CSS} pre{white-space:pre-wrap}</style></head>
<body><h1>${title}</h1><p>${rawBody || '（无内容）'}</p></body></html>`;
            zip.file('OEBPS/chapter-01.xhtml', xhtml);
            chapters.push({ id: 'chapter-01', href: 'chapter-01.xhtml' });
        }

        const opfBlocks = extractCodeBlock(content, 'content.opf');
        let opf;
        if (opfBlocks.length > 0) {
            opf = opfBlocks[0].body;
        } else {
            const items = chapters.map(c => `    <item id="${c.id}" href="${c.href}" media-type="application/xhtml+xml"/>`).join('\n');
            const coverItem = coverBlob ? '\n    <item id="cover" href="cover.jpg" media-type="image/jpeg"/>' : '';
            const coverRef = coverBlob ? '\n    <itemref idref="cover"/>' : '';
            const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => (Math.random()*16|0).toString(16));
            opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${title}</dc:title>
    <dc:creator>${author}</dc:creator>
    <dc:language>zh-CN</dc:language>
    <dc:identifier id="book-id">urn:uuid:${uuid}</dc:identifier>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>${coverItem}
${items}
  </manifest>
  <spine toc="ncx">${coverRef}
${chapters.map(c => `    <itemref idref="${c.id}"/>`).join('\n')}
  </spine>
</package>`;
        }

        zip.file('OEBPS/' + opfId, opf);

        const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head><meta name="dtb:uid" content="book-id"/></head>
  <docTitle><text>${title}</text></docTitle>
  <navMap>
${chapters.map((c, i) => `    <navPoint id="nav-${i+1}" playOrder="${i+1}"><navLabel><text>第${i+1}章</text></navLabel><content src="${c.href}"/></navPoint>`).join('\n')}
  </navMap>
</ncx>`;
        zip.file('OEBPS/toc.ncx', tocNcx);

        zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/${opfId}" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

        if (coverBlob) {
            zip.file('OEBPS/cover.jpg', coverBlob, { binary: true });
        }

        return zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
    }

    window.EpubGenerator = { generateEpub, passesMeceCheck, passesComplianceCheck, canExportAsEbook };
})();
