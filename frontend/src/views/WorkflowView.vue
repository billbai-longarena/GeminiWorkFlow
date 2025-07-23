<template>
  <div class="workflow-container">
    <h1>工作流配置</h1>
    
    <div class="form-section">
      <div class="form-group">
        <label>工作流名称:</label>
        <input v-model="workflow.name" type="text" placeholder="输入工作流名称" />
      </div>

      <div class="form-group">
        <label>描述:</label>
        <textarea 
          v-model="workflow.description" 
          placeholder="输入工作流描述..."
          rows="3"
        ></textarea>
      </div>

      <div class="form-group">
        <label>
          <input type="checkbox" v-model="workflow.parallel" />
          并行执行
        </label>
      </div>

      <div class="steps-section">
        <h3>工作流步骤</h3>
        
        <div v-for="(step, index) in workflow.steps" :key="index" class="step-card">
          <div class="step-header">
            <h4>步骤 {{ index + 1 }}</h4>
            <button @click="removeStep(index)" class="remove-btn">删除</button>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>步骤ID:</label>
              <input v-model="step.id" type="text" placeholder="唯一标识符" />
            </div>

            <div class="form-group">
              <label>类型:</label>
              <select v-model="step.type">
                <option value="tts">文本转语音</option>
                <option value="imagen">图像生成</option>
                <option value="veo">视频生成</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>配置:</label>
            <textarea 
              v-model="step.configText" 
              placeholder="输入JSON格式的配置..."
              rows="4"
            ></textarea>
          </div>

          <div class="form-group">
            <label>输出键:</label>
            <input v-model="step.outputKey" type="text" placeholder="输出变量名" />
          </div>

          <div class="form-group">
            <label>依赖步骤:</label>
            <input 
              v-model="step.dependsOnText" 
              type="text" 
              placeholder="依赖的步骤ID，用逗号分隔"
            />
          </div>
        </div>

        <button @click="addStep" class="add-btn">添加步骤</button>
      </div>

      <button 
        @click="executeWorkflow" 
        :disabled="loading || !workflow.name.trim() || workflow.steps.length === 0"
        class="execute-btn"
      >
        {{ loading ? '执行中...' : '执行工作流' }}
      </button>
    </div>

    <div v-if="executionId" class="status-section">
      <h3>执行状态</h3>
      <p><strong>执行ID:</strong> {{ executionId }}</p>
      <button @click="checkWorkflowStatus" :disabled="checkingStatus" class="check-btn">
        {{ checkingStatus ? '检查中...' : '刷新状态' }}
      </button>
      
      <div v-if="workflowStatus" class="status-details">
        <h4>状态详情</h4>
        <pre>{{ JSON.stringify(workflowStatus, null, 2) }}</pre>
      </div>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div class="templates-section">
      <h3>示例模板</h3>
      <div class="template-grid">
        <div 
          v-for="template in templates" 
          :key="template.id" 
          class="template-card"
          @click="loadTemplate(template)"
        >
          <h4>{{ template.name }}</h4>
          <p>{{ template.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { aiService } from '@/services/aiService'

interface WorkflowStep {
  id: string
  type: 'tts' | 'imagen' | 'veo'
  config: any
  dependsOn?: string[]
  outputKey?: string
  configText?: string
  dependsOnText?: string
}

interface Workflow {
  id: string
  name: string
  description?: string
  steps: WorkflowStep[]
  parallel?: boolean
}

const workflow = ref<Workflow>({
  id: 'custom_workflow',
  name: '',
  description: '',
  steps: [],
  parallel: false
})

const loading = ref(false)
const executionId = ref('')
const workflowStatus = ref<any>(null)
const error = ref('')
const checkingStatus = ref(false)
const templates = ref<any[]>([])

onMounted(async () => {
  try {
    templates.value = await aiService.getWorkflowTemplates()
  } catch (err) {
    error.value = '获取模板失败'
    console.error(err)
  }
})

const addStep = () => {
  workflow.value.steps.push({
    id: `step_${Date.now()}`,
    type: 'tts',
    config: {},
    configText: '',
    dependsOnText: ''
  })
}

const removeStep = (index: number) => {
  workflow.value.steps.splice(index, 1)
}

const loadTemplate = (template: any) => {
  workflow.value = {
    ...template,
    steps: template.steps.map((step: any) => ({
      ...step,
      configText: JSON.stringify(step.config, null, 2),
      dependsOnText: step.dependsOn?.join(', ') || ''
    }))
  }
}

const executeWorkflow = async () => {
  if (!workflow.value.name.trim() || workflow.value.steps.length === 0) return
  
  // 解析配置和依赖
  const processedSteps = workflow.value.steps.map(step => {
    try {
      const config = step.configText ? JSON.parse(step.configText) : step.config
      const dependsOn = step.dependsOnText 
        ? step.dependsOnText.split(',').map((s: string) => s.trim()).filter(Boolean)
        : undefined
      
      return {
        id: step.id,
        type: step.type,
        config,
        dependsOn,
        outputKey: step.outputKey
      }
    } catch (err) {
      throw new Error(`步骤 ${step.id} 的配置格式错误: ${err}`)
    }
  })

  loading.value = true
  error.value = ''
  executionId.value = ''
  workflowStatus.value = null

  try {
    const response = await aiService.executeWorkflow({
      ...workflow.value,
      steps: processedSteps
    })
    
    executionId.value = response.executionId
    await checkWorkflowStatus()
  } catch (err: any) {
    error.value = err.response?.data?.error || '执行失败'
  } finally {
    loading.value = false
  }
}

const checkWorkflowStatus = async () => {
  if (!executionId.value) return
  
  checkingStatus.value = true
  try {
    workflowStatus.value = await aiService.getWorkflowStatus(executionId.value)
  } catch (err: any) {
    error.value = err.response?.data?.error || '检查状态失败'
  } finally {
    checkingStatus.value = false
  }
}
</script>

<style scoped>
.workflow-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
}

h1, h3, h4 {
  color: #2c3e50;
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

input, textarea, select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

textarea {
  resize: vertical;
  min-height: 80px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.steps-section {
  margin-top: 2rem;
}

.step-card {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.add-btn, .remove-btn, .execute-btn, .check-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.add-btn {
  background: #007bff;
  color: white;
}

.remove-btn {
  background: #dc3545;
  color: white;
}

.execute-btn {
  background: #28a745;
  color: white;
  padding: 0.75rem 2rem;
  font-size: 1rem;
}

.execute-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.check-btn {
  background: #ffc107;
  color: #212529;
}

.status-section {
  background: #e9ecef;
  padding: 2rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.status-details {
  margin-top: 1rem;
}

.status-details pre {
  background: white;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
}

.templates-section {
  margin-top: 2rem;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.template-card {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1.5rem;
  cursor: pointer;
  transition: box-shadow 0.3s;
}

.template-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.template-card h4 {
  margin-bottom: 0.5rem;
  color: #007bff;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
}
</style>