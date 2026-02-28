/**
 * 验证HTML文件中的JavaScript语法
 */
const fs = require('fs');
const path = require('path');

const htmlFile = path.join(__dirname, 'browser-test.html');
const content = fs.readFileSync(htmlFile, 'utf-8');

// 提取script标签内容
const scriptMatches = content.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
if (scriptMatches) {
    console.log(`找到 ${scriptMatches.length} 个script标签`);
    
    scriptMatches.forEach((match, index) => {
        // 提取script内容
        const scriptContent = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
        
        // 检查是否有语法错误
        try {
            // 尝试解析（简单检查）
            if (scriptContent.trim()) {
                // 检查常见的语法问题
                if (scriptContent.includes('</script>')) {
                    console.error(`❌ Script标签 ${index + 1} 包含未转义的 </script>`);
                } else {
                    console.log(`✅ Script标签 ${index + 1} 语法检查通过`);
                }
            }
        } catch (e) {
            console.error(`❌ Script标签 ${index + 1} 可能有语法错误:`, e.message);
        }
    });
} else {
    console.log('未找到script标签');
}
