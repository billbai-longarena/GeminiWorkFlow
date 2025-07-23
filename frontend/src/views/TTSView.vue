<template>
  <div class="tts-container">
    <h1>文本转语音 (TTS)</h1>
    
    <div class="form-section">
      <div class="form-group">
        <label>文本内容:</label>
        <textarea 
          v-model="text" 
          placeholder="请输入要转换为语音的文本..."
          rows="6"
        ></textarea>
      </div>

      <div class="form-group">
        <label>语音类型:</label>
        <select v-model="voice">
          <option v-for="v in voices" :key="v" :value="v">{{ v }}</option>
        </select>
      </div>

      <div class="form-group">
        <label>
          <input type="checkbox" v-model="useMultiSpeaker" />
          使用多讲者模式
        </label>
      </div>

      <div v-if="useMultiSpeaker" class="form-group">
        <label>讲者配置:</label>
        <div v-for="(speaker, index) in speakers" :key="index" class="speaker-config">
          <input 
            v-model="speaker.name" 
            placeholder="讲者名称"
            class="speaker-input"
          />
          <select v-model="speaker.voice">
            <option v-for="v in voices" :key="v" :value="v">{{ v }}</option>
          </select>
          <button @click="removeSpeaker(index)" class="remove-btn">删除</button>
        </div>
        <button @click="addSpeaker" class="add-btn">添加讲者</button>
      </div>

      <button 
        @click="generateTTS" 
        :disabled="loading || !text.trim()"
        class="generate-btn"
      >
        {{ loading ? '生成中...' : '生成语音' }}
      </button>
    </div>

    <div v-if="result" class="result-section">
      <h3>最新生成结果</h3>
      <audio :src="result.audioUrl" controls></audio>
      <button @click="downloadAudio(result.audioUrl, result.filename)" class="download-btn">
        下载音频文件
      </button>
    </div>

    <div class="audio-list-section">
      <h3>已生成音频列表</h3>
      <button @click="loadAudioFiles" class="refresh-btn">刷新列表</button>
      <div v-if="audioFiles.length === 0" class="empty-message">
        <p>暂无音频文件</p>
      </div>
      <ul v-else class="audio-list">
        <li v-for="audio in audioFiles" :key="audio.name" class="audio-item">
          <div class="audio-info">
            <span class="audio-name">{{ audio.name }}</span>
            <span class="audio-details">{{ formatFileSize(audio.size) }} - {{ formatDate(audio.modified) }}</span>
          </div>
          <div class="audio-player">
            <audio :src="getAudioUrl(audio.name)" controls></audio>
          </div>
          <div class="audio-actions">
            <button @click="downloadAudio(getAudioUrl(audio.name), audio.name)" class="download-btn">下载</button>
          </div>
        </li>
      </ul>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { aiService } from '@/services/aiService'
import type { AudioFile } from '@/services/aiService'

const text = ref('')
const voice = ref('Kore')
const voices = ref<string[]>([])
const useMultiSpeaker = ref(false)
const speakers = ref<Array<{ name: string; voice: string }>>([{ name: '', voice: 'Kore' }])
const loading = ref(false)
const result = ref<{ audioUrl: string; filename: string } | null>(null)
const error = ref('')
const audioFiles = ref<AudioFile[]>([])

onMounted(async () => {
  try {
    voices.value = await aiService.getVoices()
    if (voices.value.length > 0) {
      voice.value = voices.value[0]
    }
    await loadAudioFiles()
  } catch (err) {
    error.value = '获取初始数据失败'
    console.error(err)
  }
})

const addSpeaker = () => {
  speakers.value.push({ name: '', voice: 'Kore' })
}

const removeSpeaker = (index: number) => {
  speakers.value.splice(index, 1)
}

const generateTTS = async () => {
  if (!text.value.trim()) return
  
  loading.value = true
  error.value = ''
  result.value = null

  try {
    const request = useMultiSpeaker.value
      ? { text: text.value, speakers: speakers.value.filter(s => s.name.trim()) }
      : { text: text.value, voice: voice.value }

    result.value = await aiService.generateTTS(request)
    await loadAudioFiles() // Refresh list after generation
  } catch (err: any) {
    error.value = err.response?.data?.error || '生成失败'
  } finally {
    loading.value = false
  }
}

const loadAudioFiles = async () => {
  try {
    error.value = ''
    const files = await aiService.getAudioFiles()
    audioFiles.value = files.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
  } catch (err) {
    console.error('加载音频文件失败:', err)
    error.value = '加载音频文件列表失败'
  }
}

const getAudioUrl = (filename: string) => {
  return `http://localhost:3000/audio/${filename}`;
}

const downloadAudio = async (url: string, filename: string) => {
  if (!url) return
  
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
.tts-container {
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
  min-height: 120px;
}

.speaker-config {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  align-items: center;
}

.speaker-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.add-btn, .remove-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.add-btn {
  background: #007bff;
  color: white;
}

.remove-btn {
  background: #dc3545;
  color: white;
}

.generate-btn, .download-btn, .refresh-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
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
  margin-left: 1rem;
}

.refresh-btn {
  background: #007bff;
  color: white;
  margin-bottom: 1rem;
}

.result-section {
  background: #e9ecef;
  padding: 2rem;
  border-radius: 8px;
  text-align: center;
  margin-bottom: 2rem;
}

.result-section audio {
  width: 100%;
  margin-bottom: 1rem;
}

.audio-list-section {
  background: #fff;
  padding: 2rem;
  border-radius: 8px;
  border: 1px solid #eee;
}

.audio-list {
  list-style: none;
  padding: 0;
}

.audio-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #eee;
}

.audio-info {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.audio-name {
  font-weight: bold;
}

.audio-details {
  font-size: 0.9rem;
  color: #6c757d;
}

.audio-player {
  flex-grow: 2;
  margin: 0 1rem;
}

.audio-player audio {
  width: 100%;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
}
</style>