<template>
  <div class="imagen-container">
    <h1>图像生成 (Imagen)</h1>
    
    <div class="form-section">
      <div class="form-group">
        <label>提示词:</label>
        <textarea 
          v-model="prompt" 
          placeholder="请输入图像生成提示词..."
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
          <label>生成数量:</label>
          <select v-model="sampleCount">
            <option v-for="count in [1, 2, 3, 4]" :key="count" :value="count">{{ count }}</option>
          </select>
        </div>

        <div class="form-group">
          <label>人物生成:</label>
          <select v-model="personGeneration">
            <option v-for="option in personOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>

      <button 
        @click="generateImage" 
        :disabled="loading || !prompt.trim()"
        class="generate-btn"
      >
        {{ loading ? '生成中...' : '生成图像' }}
      </button>
    </div>

    <div v-if="loading" class="loading-section">
      <div class="spinner"></div>
      <p>正在生成图像，请稍候...</p>
    </div>

    <div v-if="generatedImage" class="result-section">
      <h3>最新生成结果</h3>
      <div class="image-grid">
        <div class="image-item">
          <img :src="generatedImage.url" :alt="`最新生成的图像`" />
          <button @click="downloadImage(generatedImage.url, generatedImage.filename)" class="download-btn">
            下载图像
          </button>
        </div>
      </div>
    </div>

    <div class="image-list-section">
      <h3>已生成图像列表</h3>
      <button @click="loadImageFiles" class="refresh-btn">刷新列表</button>
      <div v-if="imageFiles.length === 0" class="empty-message">
        <p>暂无图像文件</p>
      </div>
      <ul v-else class="image-list">
        <li v-for="image in imageFiles" :key="image.name" class="image-list-item">
          <img :src="getImageUrl(image.name)" class="thumbnail" @click="previewImage(image.name)" />
          <div class="image-info">
            <span class="image-name">{{ image.name }}</span>
            <span class="image-details">{{ formatFileSize(image.size) }} - {{ formatDate(image.modified) }}</span>
          </div>
          <div class="image-actions">
            <button @click="previewImage(image.name)" class="preview-btn">预览</button>
            <button @click="downloadImage(getImageUrl(image.name), image.name)" class="download-btn">下载</button>
          </div>
        </li>
      </ul>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-if="selectedImage" class="modal-overlay" @click="closePreview">
      <div class="modal-content" @click.stop>
        <img :src="selectedImage" class="preview-image" />
        <button @click="closePreview" class="close-btn">&times;</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { aiService } from '@/services/aiService'
import type { ImageFile } from '@/services/aiService'

const prompt = ref('')
const aspectRatio = ref('16:9')
const sampleCount = ref(1)
const personGeneration = ref('dont_allow')
const aspectRatios = ref<string[]>([])
const personOptions = ref([
  { value: 'dont_allow', label: '不允许人物' },
  { value: 'allow_adult', label: '允许成人' },
  { value: 'allow_all', label: '允许所有人物' }
])
const loading = ref(false)
const generatedImage = ref<{ url: string; filename: string } | null>(null)
const error = ref('')
const imageFiles = ref<ImageFile[]>([])
const selectedImage = ref<string | null>(null)

onMounted(async () => {
  try {
    const options = await aiService.getImagenOptions()
    aspectRatios.value = options.aspectRatios || ['1:1', '16:9', '9:16', '4:3', '3:4']
    await loadImageFiles()
  } catch (err) {
    error.value = '获取配置选项失败'
    console.error(err)
  }
})

const generateImage = async () => {
  if (!prompt.value.trim()) return
  
  loading.value = true
  error.value = ''
  generatedImage.value = null

  try {
    const request = {
      prompt: prompt.value,
      aspectRatio: aspectRatio.value,
      sampleCount: 1, // For now, generate one at a time to simplify display
      personGeneration: personGeneration.value
    }

    const response = await aiService.generateImage(request)
    
    if (response.images && response.images.length > 0) {
      const firstImage = response.images[0];
      generatedImage.value = {
        url: firstImage.url,
        filename: firstImage.filename
      };
      await loadImageFiles(); // Refresh the list
    }
  } catch (err: any) {
    error.value = err.response?.data?.error || '生成失败'
  } finally {
    loading.value = false
  }
}

const loadImageFiles = async () => {
  try {
    error.value = ''
    const files = await aiService.getImageFiles()
    imageFiles.value = files.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
  } catch (err) {
    console.error('加载图像文件失败:', err)
    error.value = '加载图像文件列表失败'
  }
}

const getImageUrl = (filename: string) => {
  return `http://localhost:3000/images/${filename}`;
}

const previewImage = (filename: string) => {
  selectedImage.value = getImageUrl(filename);
}

const closePreview = () => {
  selectedImage.value = null;
}

const downloadImage = async (url: string, filename: string) => {
  try {
    await aiService.downloadFile(url, filename)
  } catch (err) {
    error.value = '下载失败'
  }
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
.imagen-container {
  max-width: 1000px;
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

.generate-btn, .download-btn, .refresh-btn, .preview-btn {
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

.loading-section {
  text-align: center;
  padding: 2rem;
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

.result-section {
  margin-top: 2rem;
  padding: 1rem;
  background: #e9ecef;
  border-radius: 8px;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.image-item {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
}

.image-item img {
  width: 100%;
  height: auto;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.image-list-section {
  margin-top: 2rem;
  background: #fff;
  padding: 2rem;
  border-radius: 8px;
  border: 1px solid #eee;
}

.image-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.image-list-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #eee;
}

.thumbnail {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
  margin-right: 1rem;
  cursor: pointer;
}

.image-info {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.image-name {
  font-weight: bold;
}

.image-details {
  font-size: 0.9rem;
  color: #6c757d;
}

.image-actions {
  display: flex;
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

.preview-image {
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