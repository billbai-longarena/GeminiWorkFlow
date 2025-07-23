<template>
  <div class="veo-container">
    <h1>视频生成 (Veo)</h1>
    
    <div class="form-section">
      <div class="form-group">
        <label>提示词:</label>
        <textarea 
          v-model="prompt" 
          placeholder="请输入视频生成提示词..."
          rows="4"
        ></textarea>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>宽高比:</label>
          <select v-model="aspectRatio">
            <option v-for="ratio in aspectRatios" :key="ratio" :value="ratio">{{ ratio }}</option>
          </select>
        </div>

        <div class="form-group">
          <label>时长 (秒):</label>
          <select v-model="durationSeconds">
            <option v-for="duration in durationOptions" :key="duration" :value="duration">
              {{ duration }}秒
            </option>
          </select>
        </div>
      </div>

      <button 
        @click="generateVideo" 
        :disabled="loading || !prompt.trim()"
        class="generate-btn"
      >
        {{ loading ? '生成中...' : '开始生成' }}
      </button>
    </div>

    <div v-if="loading" class="loading-section">
      <div class="spinner"></div>
      <p>正在生成视频，请稍候...</p>
      <p class="status-info">视频生成可能需要几分钟时间</p>
    </div>

    <div v-if="operationName" class="status-section">
      <h3>生成状态</h3>
      <div class="status-info">
        <p><strong>操作ID:</strong> {{ operationName }}</p>
        <p><strong>状态:</strong> {{ status }}</p>
        <button @click="checkStatus" :disabled="checkingStatus" class="check-btn">
          {{ checkingStatus ? '检查中...' : '刷新状态' }}
        </button>
      </div>
    </div>

    <!-- 视频文件列表 -->
    <div class="video-list-section">
      <h3>已生成视频列表</h3>
      <button @click="loadVideoFiles" class="refresh-btn">刷新列表</button>
      <div v-if="videoFiles.length === 0" class="empty-message">
        <p>暂无视频文件</p>
      </div>
      <ul v-else class="video-list">
        <li v-for="video in videoFiles" :key="video.name" class="video-item">
          <div class="video-info">
            <span class="video-name">{{ video.name }}</span>
            <span class="video-details">{{ formatFileSize(video.size) }} - {{ formatDate(video.modified) }}</span>
          </div>
          <div class="video-actions">
            <button @click="previewVideo(video.name)" class="preview-btn">预览</button>
            <button @click="downloadVideoFile(video.name)" class="download-btn">下载</button>
          </div>
        </li>
      </ul>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <!-- 视频预览模态框 -->
    <div v-if="selectedVideo" class="modal-overlay" @click="closePreview">
      <div class="modal-content" @click.stop>
        <video :src="selectedVideo" controls autoplay class="preview-video"></video>
        <button @click="closePreview" class="close-btn">&times;</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { aiService } from '@/services/aiService'

interface VideoFile {
  name: string
  size: number
  modified: string
}

const prompt = ref('')
const aspectRatio = ref('16:9')
const durationSeconds = ref(5)
const aspectRatios = ref<string[]>([])
const durationOptions = ref([3, 5, 8])
const loading = ref(false)
const operationName = ref('')
const status = ref('')
const error = ref('')
const checkingStatus = ref(false)
const videoFiles = ref<VideoFile[]>([])
const selectedVideo = ref<string | null>(null)

onMounted(async () => {
  try {
    const options = await aiService.getVeoOptions()
    aspectRatios.value = options.aspectRatios || ['16:9', '9:16', '1:1', '4:3', '3:4']
    await loadVideoFiles()
  } catch (err) {
    error.value = '获取配置选项失败'
    console.error(err)
  }
})

const generateVideo = async () => {
  if (!prompt.value.trim()) return
  
  loading.value = true
  error.value = ''
  operationName.value = ''
  status.value = ''

  try {
    const response = await aiService.generateVideo({
      prompt: prompt.value,
      aspectRatio: aspectRatio.value,
      durationSeconds: durationSeconds.value
    })
    
    operationName.value = response.operationName
    status.value = response.status
    
    startStatusPolling()
  } catch (err: any) {
    error.value = err.response?.data?.error || '生成失败'
  } finally {
    loading.value = false
  }
}

const checkStatus = async () => {
  if (!operationName.value) return
  
  checkingStatus.value = true
  try {
    const statusResponse = await aiService.getVideoStatus(operationName.value)
    status.value = statusResponse.status
    
    if (statusResponse.status === 'completed') {
      await loadVideoFiles()
    } else if (statusResponse.status === 'failed') {
      error.value = '视频生成失败'
    }
  } catch (err: any) {
    error.value = err.response?.data?.error || '检查状态失败'
  } finally {
    checkingStatus.value = false
  }
}

const startStatusPolling = () => {
  const interval = setInterval(async () => {
    if (!operationName.value || status.value === 'completed' || status.value === 'failed') {
      clearInterval(interval)
      return
    }
    
    try {
      const statusResponse = await aiService.getVideoStatus(operationName.value)
      status.value = statusResponse.status
      
      if (statusResponse.status === 'completed') {
        await loadVideoFiles()
        clearInterval(interval)
      } else if (statusResponse.status === 'failed') {
        error.value = '视频生成失败'
        clearInterval(interval)
      }
    } catch (err) {
      console.error('Status check failed:', err)
      clearInterval(interval)
    }
  }, 5000)
}

const loadVideoFiles = async () => {
  try {
    error.value = ''
    const files = await aiService.getVideoFiles()
    videoFiles.value = files.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
  } catch (err) {
    console.error('加载视频文件失败:', err)
    error.value = '加载视频文件列表失败'
  }
}

const downloadVideoFile = async (filename: string) => {
  try {
    error.value = ''
    await aiService.downloadVideoFile(filename)
  } catch (err) {
    console.error('下载视频失败:', err)
    error.value = '下载视频失败'
  }
}

const previewVideo = (filename: string) => {
  const videoUrl = `http://localhost:3000/videos/${filename}`;
  console.log('Previewing video:', videoUrl);
  selectedVideo.value = videoUrl;
}

const closePreview = () => {
  selectedVideo.value = null;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString('zh-CN')
}
</script>

<style scoped>
.veo-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

h1 {
  color: #2c3e50;
  margin-bottom: 2rem;
}

.form-section {
  background: #f8f9fa;
  padding: 2rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

textarea, select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

textarea {
  resize: vertical;
  min-height: 100px;
}

.generate-btn, .check-btn, .download-btn, .refresh-btn, .preview-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.generate-btn {
  background: #28a745;
  color: white;
}

.generate-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.check-btn {
  background: #ffc107;
  color: #212529;
  margin-left: 1rem;
}

.download-btn {
  background: #17a2b8;
  color: white;
  margin-left: 0.5rem;
}

.preview-btn {
  background: #6f42c1;
  color: white;
}

.refresh-btn {
  background: #007bff;
  color: white;
  margin-bottom: 1rem;
}

.download-btn:hover, .refresh-btn:hover, .generate-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.loading-section, .status-section {
  text-align: center;
  padding: 2rem;
  background: #e9ecef;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.status-info {
  margin-top: 1rem;
}

.video-list-section {
  background: #fff;
  padding: 2rem;
  border-radius: 8px;
  border: 1px solid #eee;
}

.video-list-section h3 {
  margin-top: 0;
  margin-bottom: 1.5rem;
}

.empty-message {
  text-align: center;
  color: #6c757d;
  padding: 2rem;
}

.video-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.video-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #eee;
}

.video-actions {
  display: flex;
}

.video-item:last-child {
  border-bottom: none;
}

.video-info {
  display: flex;
  flex-direction: column;
}

.video-name {
  font-weight: bold;
  font-size: 1.1rem;
  color: #343a40;
}

.video-details {
  font-size: 0.9rem;
  color: #6c757d;
  margin-top: 0.25rem;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
}
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  position: relative;
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  max-width: 90vw;
  max-height: 90vh;
}

.preview-video {
  width: 100%;
  max-width: 80vw;
  max-height: 80vh;
  border-radius: 8px;
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 2rem;
  color: #333;
  cursor: pointer;
}
</style>