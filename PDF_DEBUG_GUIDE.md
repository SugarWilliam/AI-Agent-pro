# PDF解析调试指南

## 🔍 问题排查步骤

如果PDF解析仍然失败，请按照以下步骤排查：

### 步骤1: 检查浏览器控制台

1. **打开浏览器开发者工具**
   - 按 `F12` 或 `Ctrl+Shift+I` (Windows/Linux)
   - 或 `Cmd+Option+I` (Mac)

2. **切换到 Console（控制台）标签**

3. **上传PDF文件**
   - 点击附件按钮
   - 选择PDF文件

4. **查看日志输出**
   应该看到类似以下的日志：
   ```
   Jina AI检查: enabled=true, hasKey=true
   开始解析PDF: xxx.pdf, API Key: 已配置(jina_8253cbd55ea0...)
   发送请求到 https://r.jina.ai/, 文件大小: 141696 bytes, 方法: POST binary
   收到响应: status=200, ok=true
   PDF解析成功: xxx.pdf, 内容长度: 1234 字符
   ```

### 步骤2: 检查网络请求

1. **切换到 Network（网络）标签**

2. **上传PDF文件**

3. **查找对 `r.jina.ai` 的请求**
   - 点击该请求
   - 查看 **Request Headers**（请求头）：
     - `Authorization: Bearer jina_...` 应该存在
     - `Content-Type: application/pdf` 应该存在
   - 查看 **Response**（响应）：
     - Status Code 应该是 `200`
     - Response Body 应该包含PDF的文本内容

### 步骤3: 手动测试Jina AI配置

在浏览器控制台执行以下代码：

```javascript
// 检查Jina AI配置
console.log('=== Jina AI 配置检查 ===');
console.log('API Key:', window.AIAgentApp?.getJinaAIKey?.());
console.log('Has Key:', window.AIAgentApp?.hasJinaAIKey?.());
console.log('Enabled:', window.AIAgentApp?.isJinaAIEnabled?.());
console.log('Jina AI Available:', window.RAGManager?.isJinaAIAvailable?.());
```

**预期输出**：
```
=== Jina AI 配置检查 ===
API Key: jina_8253cbd55ea0431ebf213f62e9719da3aIGR-0_4MAlgqwTVIDyKwTPUrEZQ
Has Key: true
Enabled: true
Jina AI Available: true
```

### 步骤4: 手动测试PDF解析

在浏览器控制台执行以下代码：

```javascript
// 选择一个PDF文件（需要先上传）
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = '.pdf';
fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    console.log('=== 开始测试PDF解析 ===');
    console.log('文件名:', file.name);
    console.log('文件大小:', file.size, 'bytes');
    
    try {
        const content = await window.RAGManager?.parsePDF?.(file);
        console.log('解析结果长度:', content?.length);
        console.log('解析结果预览:', content?.substring(0, 200));
    } catch (error) {
        console.error('解析失败:', error);
    }
};
fileInput.click();
```

### 步骤5: 检查常见错误

#### 错误1: `Jina AI未配置或已禁用`

**原因**: API密钥未配置或已禁用

**解决方法**:
1. 打开设置页面
2. 找到"Jina AI"配置
3. 确保API密钥已填写
4. 确保"启用Jina AI"开关已打开

#### 错误2: `401 Unauthorized` 或 `403 Forbidden`

**原因**: API密钥无效或已过期

**解决方法**:
1. 检查API密钥是否正确
2. 访问 https://jina.ai/ 检查API密钥状态
3. 如果密钥无效，获取新的API密钥

#### 错误3: `413 Request Entity Too Large`

**原因**: PDF文件太大

**解决方法**:
1. 代码已自动尝试Base64编码方式
2. 如果仍然失败，尝试压缩PDF文件
3. 或使用较小的PDF文件测试

#### 错误4: `429 Too Many Requests`

**原因**: API请求频率限制

**解决方法**:
1. 等待几分钟后重试
2. 检查API密钥的配额限制
3. 考虑升级API套餐

#### 错误5: `CORS错误` 或 `网络错误`

**原因**: 网络连接问题或CORS限制

**解决方法**:
1. 检查网络连接
2. 检查防火墙设置
3. 尝试使用VPN或代理

### 步骤6: 验证API密钥格式

API密钥应该以 `jina_` 开头，格式如下：
```
jina_8253cbd55ea0431ebf213f62e9719da3aIGR-0_4MAlgqwTVIDyKwTPUrEZQ
```

在控制台检查：
```javascript
const key = window.AIAgentApp?.getJinaAIKey?.();
console.log('API Key格式检查:');
console.log('  - 长度:', key?.length);
console.log('  - 以jina_开头:', key?.startsWith('jina_'));
console.log('  - 前20字符:', key?.substring(0, 20));
```

## 🐛 常见问题

### Q1: 为什么上传PDF后，AI回复说"无法直接解析PDF"？

**A**: 这说明PDF解析失败了，返回了占位符文本。请检查：
1. 浏览器控制台的错误日志
2. 网络请求是否成功
3. API密钥是否正确配置

### Q2: 解析成功了，但内容很短或为空？

**A**: 可能的原因：
1. PDF是扫描版（图片），需要OCR功能
2. PDF内容本身就是空的
3. Jina AI解析返回了错误信息

**解决方法**: 检查控制台日志中的"内容长度"，如果小于50字符，可能是解析失败。

### Q3: 解析很慢，需要等待很久？

**A**: 这是正常的，因为：
1. PDF文件需要上传到Jina AI服务器
2. 服务器需要解析PDF内容
3. 大文件需要更长时间

**解决方法**: 耐心等待，通常5-30秒内会完成。

## 📝 调试信息收集

如果问题仍然存在，请收集以下信息：

1. **浏览器控制台日志**（Console标签的所有输出）
2. **网络请求详情**（Network标签中对`r.jina.ai`的请求）
3. **PDF文件信息**（文件名、大小）
4. **API密钥前20字符**（用于验证格式，不要完整显示）

将这些信息提供给开发者，可以帮助快速定位问题。

---

**最后更新**: 2026-03-01  
**版本**: v8.0.0
