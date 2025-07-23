# Veo视频生成功能Debug计划

## 问题描述
用户报告Veo视频生成完成后，在生成结果预览视频位置没有正确关联到服务器上的backend/videos下的视频，显示0:00，并且点击下载也是错误的下载一个500k左右的文件无法播放。

## 已检查的文件
1. backend/src/services/veo.service.ts - 包含视频下载逻辑
2. backend/src/routes/ai.routes.ts - 包含视频状态检查路由
3. frontend/src/views/VeoView.vue - 前端视图组件
4. frontend/src/services/aiService.ts - 前端服务

## 需要添加的Debug Log

### 1. backend/src/services/veo.service.ts
在downloadVideo方法中添加更多日志：
- 下载开始和结束的详细信息
- 下载URL的完整信息
- 下载文件的完整路径
- 文件大小和内容类型检查

### 2. backend/src/routes/ai.routes.ts
在视频状态检查路由中添加更多日志：
- 文件路径生成的详细信息
- 返回给前端的videoUrl详细信息
- 静态文件服务路径检查

### 3. frontend/src/views/VeoView.vue
在前端组件中添加更多日志：
- 接收到的videoUrl信息
- 视频播放和下载过程的日志

### 4. frontend/src/services/aiService.ts
在前端服务中添加更多日志：
- 请求和响应的详细信息
- 下载过程的日志

## 实施步骤
1. 切换到代码模式
2. 修改backend/src/services/veo.service.ts文件
3. 修改backend/src/routes/ai.routes.ts文件
4. 修改frontend/src/views/VeoView.vue文件
5. 修改frontend/src/services/aiService.ts文件