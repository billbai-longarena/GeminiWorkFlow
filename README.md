# AI 内容生成服务

这是一个基于 TypeScript 的 AI 内容生成服务，支持文本转语音(TTS)、图像生成(Imagen)和视频生成(Veo3)，并提供复杂工作流配置功能。

## 🚀 功能特性

- **文本转语音(TTS)**: 使用 Gemini 2.5 TTS 模型，支持单讲者和多讲者语音
- **图像生成(Imagen)**: 使用 Imagen 3.0 模型，支持多种宽高比和人物生成选项
- **视频生成(Veo3)**: 使用 Veo 3.0 模型，支持自定义宽高比和时长
- **工作流配置**: 支持创建复杂的 AI 工作流，可并行或顺序执行多个任务
- **RESTful API**: 提供完整的 REST API 接口，易于集成
- **Swagger文档**: 完整的API文档和交互式测试界面

## 📁 项目结构

```
onlineCourseGenerator/
├── backend/                    # TypeScript 后端服务
│   ├── src/
│   │   ├── types/             # 类型定义
│   │   ├── services/          # AI 服务实现
│   │   ├── routes/            # API 路由
│   │   ├── config/            # 配置文件（包括Swagger）
│   │   └── app.ts             # 主应用文件
│   ├── audio/                 # 生成的音频文件
│   ├── images/                # 生成的图像文件
│   └── videos/                # 生成的视频文件
├── frontend/                  # Vue.js 前端应用
└── server.js                  # 原始 Node.js 服务（已弃用）
```

## ⚡ 快速开始

### 环境要求
- Node.js 16+
- TypeScript
- FFmpeg（用于音频格式转换）

### 安装依赖
```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 环境配置
创建 `backend/.env` 文件：
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
PROXY_URL=http://localhost:6152  # 可选：代理服务器
```

### 启动服务
```bash
# 启动后端服务
cd backend
npm run dev

# 启动前端服务（新终端）
cd frontend
npm run dev
```

服务启动后：
- 后端 API: http://localhost:3000
- 前端应用: http://localhost:5173
- 健康检查: http://localhost:3000/health
- API文档: http://localhost:3000/api-docs

## 📖 API 使用指南

### Swagger API文档
项目已集成完整的Swagger文档，提供以下功能：

- **交互式API测试**: 直接在浏览器中测试所有API端点
- **请求/响应示例**: 每个端点都包含详细的请求和响应示例
- **参数验证**: 实时验证请求参数格式和类型
- **错误处理**: 详细的错误码和错误信息说明

访问地址: http://localhost:3000/api-docs

### 1. 文本转语音(TTS)

#### 单讲者语音
```bash
curl -X POST http://localhost:3000/api/ai/tts \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, this is a test of the text-to-speech system.",
    "voice": "Kore"
    
  }'
```

#### 多讲者语音
```bash
curl -X POST http://localhost:3000/api/ai/tts \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Joe: How is it going today Jane? Jane: Not too bad, how about you?",
    "speakers": [
      {"name": "Joe", "voice": "Kore"},
      {"name": "Jane", "voice": "Puck"}
    ]
  }'
```

#### 获取可用声音列表
```bash
curl http://localhost:3000/api/ai/tts/voices
```

### 2. 图像生成(Imagen)

#### 基本图像生成
```bash
curl -X POST http://localhost:3000/api/ai/imagen \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A beautiful sunset over a mountain lake",
    "aspectRatio": "16:9",
    "sampleCount": 1
  }'
```

#### 获取配置选项
```bash
curl http://localhost:3000/api/ai/imagen/options
```

### 3. 视频生成(Veo3)

#### 启动视频生成
```bash
curl -X POST http://localhost:3000/api/ai/veo \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A cat playing with a ball of yarn",
    "aspectRatio": "16:9",
    "durationSeconds": 5
  }'
```

#### 检查视频状态
```bash
curl http://localhost:3000/api/ai/veo/status/operation-name-here
```

### 4. 工作流配置

#### 获取示例工作流
```bash
curl http://localhost:3000/api/ai/workflow/templates
```

#### 执行工作流
```bash
curl -X POST http://localhost:3000/api/ai/workflow \
  -H "Content-Type: application/json" \
  -d '{
    "id": "custom_workflow",
    "name": "教学视频制作",
    "description": "生成教学图像并添加语音讲解",
    "steps": [
      {
        "id": "generate_screenshot",
        "type": "imagen",
        "config": {
          "prompt": "A clean programming code screenshot with syntax highlighting",
          "aspectRatio": "16:9"
        },
        "outputKey": "screenshot"
      },
      {
        "id": "create_narration",
        "type": "tts",
        "config": {
          "text": "Welcome to our programming tutorial. Today we will learn about TypeScript interfaces.",
          "voice": "Kore"
        },
        "dependsOn": ["generate_screenshot"],
        "outputKey": "narration"
      }
    ]
  }'
```

## 📚 Swagger API文档详解

### 文档结构
Swagger文档分为以下几个主要部分：

1. **TTS (文本转语音)**
   - POST /api/ai/tts - 文本转语音
   - GET /api/ai/tts/voices - 获取可用语音列表

2. **Imagen (图像生成)**
   - POST /api/ai/imagen - 图像生成
   - GET /api/ai/imagen/options - 获取配置选项

3. **Veo (视频生成)**
   - POST /api/ai/veo - 视频生成
   - GET /api/ai/veo/status/{operationName} - 检查视频状态
   - GET /api/ai/veo/options - 获取配置选项

4. **Workflow (工作流)**
   - POST /api/ai/workflow - 执行工作流
   - GET /api/ai/workflow/templates - 获取示例工作流
   - GET /api/ai/workflow - 获取所有工作流执行
   - GET /api/ai/workflow/{executionId} - 获取工作流执行状态

### 使用Swagger UI
1. 打开浏览器访问 http://localhost:3000/api-docs
2. 点击"Try it out"按钮测试API
3. 填写请求参数
4. 点击"Execute"发送请求
5. 查看响应结果

### 响应格式
所有API响应都遵循统一的格式：
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "message": "Success message"
}
```

错误响应格式：
```json
{
  "success": false,
  "error": "Error description",
  "message": "Additional error details"
}
```

## 🔧 前端集成示例

### Vue.js 集成
```javascript
// services/aiService.js
import axios from 'axios'

const API_BASE = 'http://localhost:3000/api/ai'

export const aiService = {
  async generateTTS(text, voice = 'Kore') {
    const response = await axios.post(`${API_BASE}/tts`, { text, voice })
    return response.data.data
  },

  async generateImage(prompt, options = {}) {
    const response = await axios.post(`${API_BASE}/imagen`, { prompt, ...options })
    return response.data.data
  },

  async generateVideo(prompt, options = {}) {
    const response = await axios.post(`${API_BASE}/veo`, { prompt, ...options })
    return response.data.data
  },

  async executeWorkflow(workflowConfig) {
    const response = await axios.post(`${API_BASE}/workflow`, workflowConfig)
    return response.data.data
  }
}
```

### React Hook 示例
```javascript
// hooks/useAIService.js
import { useState, useCallback } from 'react'
import axios from 'axios'

export const useAIService = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const generateContent = useCallback(async (type, config) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await axios.post(
        `http://localhost:3000/api/ai/${type}`, 
        config
      )
      return response.data.data
    } catch (err) {
      setError(err.response?.data?.error || 'Unknown error')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { generateContent, loading, error }
}
```

## 🎯 实际应用场景

### 1. 在线教育内容制作
```javascript
const courseContentWorkflow = {
  id: 'course_content',
  name: '课程视频制作',
  steps: [
    {
      id: 'generate_slide',
      type: 'imagen',
      config: {
        prompt: 'Modern programming course slide with clean design',
        aspectRatio: '16:9'
      }
    },
    {
      id: 'create_voiceover',
      type: 'tts',
      config: {
        text: 'Welcome to TypeScript fundamentals. In this lesson...',
        voice: 'Kore'
      }
    }
  ]
}
```

### 2. 多语言内容本地化
```javascript
const localizationWorkflow = {
  id: 'localization',
  name: '多语言本地化',
  parallel: true,
  steps: [
    {
      id: 'english_audio',
      type: 'tts',
      config: { text: 'Hello World', voice: 'Puck' }
    },
    {
      id: 'chinese_audio',
      type: 'tts',
      config: { text: '你好世界', voice: 'Kore' }
    }
  ]
}
```

### 3. 批量营销内容生成
```javascript
const marketingCampaign = {
  id: 'marketing_batch',
  name: '营销内容批量生成',
  parallel: true,
  steps: [
    {
      id: 'product_image',
      type: 'imagen',
      config: { prompt: 'Modern smartphone product shot', aspectRatio: '1:1' }
    },
    {
      id: 'promo_video',
      type: 'veo',
      config: { prompt: 'Product showcase animation', durationSeconds: 3 }
    }
  ]
}
```

## 📊 性能优化建议

1. **批量处理**：使用并行工作流处理多个任务
2. **缓存策略**：前端缓存已生成的内容
3. **错误重试**：实现指数退避重试机制
4. **进度跟踪**：实时显示生成进度

## 🔒 安全建议

1. **API密钥保护**：在生产环境中使用环境变量
2. **速率限制**：实现前端请求节流
3. **文件验证**：验证上传的文件类型和大小
4. **访问控制**：实现用户认证和授权

## 🐛 故障排除

### 常见问题
1. **API Key 错误**：确保 `GEMINI_API_KEY` 已正确设置
2. **网络连接**：检查是否能访问 Google AI API
3. **文件权限**：确保有写入 `audio/`, `images/`, `videos/` 目录的权限
4. **FFmpeg 未安装**：音频格式转换需要 FFmpeg

### Swagger文档问题
1. **文档无法访问**：确保服务已启动并访问 http://localhost:3000/api-docs
2. **API测试失败**：检查请求参数格式是否正确
3. **跨域问题**：确保前端和后端端口配置正确

### 调试工具
```bash
# 查看实时日志
tail -f backend/nodemon.log

# 测试单个API端点
curl -X POST http://localhost:3000/api/ai/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"test","voice":"Kore"}'

# 检查Swagger文档
curl http://localhost:3000/api-docs/
```

## 📈 扩展开发

### 添加新的AI服务
1. 在 `src/types/ai.types.ts` 中添加类型定义
2. 在 `src/services/` 中创建服务类
3. 在 `src/routes/ai.routes.ts` 中添加路由
4. 更新工作流服务以支持新服务
5. 在Swagger类型定义中添加新的API文档

### 贡献指南
欢迎提交 Issue 和 Pull Request 来改进这个项目！

## 📄 许可证
MIT License