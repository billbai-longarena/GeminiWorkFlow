# Imagen API 调试指南

## 🚨 当前问题总结

### 主要错误类型
1. **网络连接超时** - 30秒内无响应
2. **代理连接失败** - 代理服务器 `localhost:6152` 无法连接
3. **API限流 (429)** - 请求频率过高
4. **认证错误 (401/403)** - API密钥无效或权限不足

## 🔍 调试工具使用

### 1. 直连测试工具
```bash
cd backend && node test-imagen-direct.js
```
- 绕过代理直接测试API连接
- 显示详细的错误信息和解决建议

### 2. 代理测试工具
```bash
cd backend && node test-imagen-debug.js
```
- 测试带代理的API连接
- 检查代理配置是否正确

## ⚙️ 解决方案

### 网络连接问题
1. **检查网络连接**
   ```bash
   curl -I https://generativelanguage.googleapis.com
   ```

2. **禁用代理测试**
   - 临时注释掉 `.env` 文件中的 `PROXY_URL`
   - 或设置 `PROXY_URL=`（空值）

3. **检查API密钥**
   - 确保在 Google Cloud Console 中启用了 Vertex AI API
   - 确保启用了 Imagen API
   - 检查API密钥是否有足够的配额

### 代理配置修复
如果必须使用代理，请确保：
```bash
# 正确的代理格式
PROXY_URL=http://127.0.0.1:6152
# 或
PROXY_URL=http://localhost:6152
```

### 限流问题处理
1. **降低请求频率**
   - 在前端添加请求间隔
   - 实现指数退避重试机制

2. **检查配额**
   - 登录 Google Cloud Console
   - 查看 Vertex AI API 配额使用情况

## 🧪 测试步骤

1. **测试直连**：
   ```bash
   node test-imagen-direct.js
   ```

2. **检查日志**：
   - 启动后端服务：`npm run dev`
   - 查看控制台输出的详细日志

3. **前端测试**：
   - 打开 http://localhost:5173/imagen
   - 使用简单提示词测试："a red apple"
   - 观察浏览器控制台和终端日志

## 📊 日志分析

### 成功响应示例
```
[ImagenService] Successfully generated 1 images
[ImagenRoute] Request completed successfully in 5234ms
```

### 错误响应示例
```
❌ API限流错误 (429): Resource has been exhausted
💡 解决: 等待60秒后重试
```

### 网络错误示例
```
❌ 网络连接失败 (ETIMEDOUT): 请检查网络连接或代理设置
```

## 🔧 快速修复

### 临时禁用代理
```bash
# 备份当前配置
cp .env .env.backup

# 禁用代理
sed -i '' 's/PROXY_URL=.*/PROXY_URL=/' .env
```

### 验证API密钥
```bash
# 测试API密钥有效性
curl -H "x-goog-api-key: YOUR_API_KEY" \
     "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict"
```

## 📋 检查清单

- [ ] API密钥已配置且有效
- [ ] Vertex AI API 已启用
- [ ] Imagen API 已启用
- [ ] 网络连接正常
- [ ] 代理配置正确（如使用）
- [ ] 配额未用尽
- [ ] 请求频率合理

## 🆘 获取帮助

如果问题仍然存在：
1. 检查 Google Cloud Console 中的错误日志
2. 查看 [Vertex AI 文档](https://cloud.google.com/vertex-ai/docs)
3. 联系 Google Cloud 支持