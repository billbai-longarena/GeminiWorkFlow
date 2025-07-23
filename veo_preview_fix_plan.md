# Veo视频预览问题修复方案

## 问题总结

在/veo页面点击预览按钮后，弹出的框无法预览视频文件。

## 根本原因

**前端视频URL构建错误**

在 `frontend/src/views/VeoView.vue` 第221行：

```javascript
const previewVideo = (filename: string) => {
  const videoUrl = `backend/videos/${filename}`;  // ❌ 错误的相对路径
  console.log('Previewing video:', videoUrl);
  selectedVideo.value = videoUrl;
}
```

这会导致浏览器尝试访问 `http://localhost:5173/backend/videos/filename.mp4`，但实际的静态文件服务在 `http://localhost:3000/videos/filename.mp4`。

## 后端配置确认

后端在 `backend/src/app.ts` 中正确配置了静态文件服务：

```javascript
// 第34-36行
const videosPath = path.join(__dirname, '..', 'videos');
console.log(`[Express] Serving static video files from: ${videosPath}`);
app.use('/videos', express.static(videosPath));
```

视频文件通过 `http://localhost:3000/videos/` 路径提供服务。

## 修复方案

### 方案1：使用完整URL（推荐）

修改 `frontend/src/views/VeoView.vue` 第220-224行的 `previewVideo` 函数：

```javascript
const previewVideo = (filename: string) => {
  const videoUrl = `http://localhost:3000/videos/${filename}`;
  console.log('Previewing video:', videoUrl);
  selectedVideo.value = videoUrl;
}
```

### 方案2：配置代理（备选）

如果需要使用相对路径，可以在 `frontend/vite.config.ts` 中配置代理：

```javascript
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      '/videos': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
```

然后使用相对路径：

```javascript
const previewVideo = (filename: string) => {
  const videoUrl = `/videos/${filename}`;
  console.log('Previewing video:', videoUrl);
  selectedVideo.value = videoUrl;
}
```

## 推荐实施步骤

1. **立即修复**：使用方案1，直接修改URL构建逻辑
2. **测试验证**：确保所有视频文件都能正常预览
3. **长期优化**：考虑实施方案2，使用代理配置

## 测试计划

1. 启动后端服务器（端口3000）
2. 启动前端开发服务器（端口5173）
3. 访问 /veo 页面
4. 点击任意视频的"预览"按钮
5. 验证视频能在模态框中正常播放

## 相关文件

- `frontend/src/views/VeoView.vue` - 需要修改的主要文件
- `backend/src/app.ts` - 静态文件服务配置
- `frontend/vite.config.ts` - 可选的代理配置

## 预期结果

修复后，用户点击预览按钮时：
1. 模态框正常弹出
2. 视频文件正确加载
3. 视频可以正常播放
4. 控制台不再出现404错误