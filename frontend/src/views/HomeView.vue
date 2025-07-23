<template>
  <div class="home-container">
    <div class="hero-section">
      <h1>AI 内容生成平台</h1>
      <p>使用先进的AI技术生成文本转语音、图像和视频内容</p>
    </div>

    <div class="features-grid">
      <div class="feature-card" @click="$router.push('/tts')">
        <div class="feature-icon">🎙️</div>
        <h3>文本转语音</h3>
        <p>将文本转换为自然流畅的语音，支持多种声音和多讲者模式</p>
        <ul>
          <li>支持多种语音选择</li>
          <li>多讲者对话模式</li>
          <li>高质量音频输出</li>
        </ul>
      </div>

      <div class="feature-card" @click="$router.push('/imagen')">
        <div class="feature-icon">🎨</div>
        <h3>图像生成</h3>
        <p>使用Imagen 3.0模型生成高质量图像，支持多种风格和参数</p>
        <ul>
          <li>多种宽高比支持</li>
          <li>批量生成选项</li>
          <li>人物生成控制</li>
        </ul>
      </div>

      <div class="feature-card" @click="$router.push('/veo')">
        <div class="feature-icon">🎬</div>
        <h3>视频生成</h3>
        <p>使用Veo 3.0模型创建动态视频内容，支持自定义时长和比例</p>
        <ul>
          <li>自定义视频时长</li>
          <li>多种宽高比支持</li>
          <li>实时状态跟踪</li>
        </ul>
      </div>

      <div class="feature-card" @click="$router.push('/workflow')">
        <div class="feature-icon">⚙️</div>
        <h3>工作流配置</h3>
        <p>创建复杂的AI工作流，组合多种AI服务实现自动化内容生成</p>
        <ul>
          <li>可视化工作流设计</li>
          <li>并行/顺序执行</li>
          <li>模板快速开始</li>
        </ul>
      </div>
    </div>

    <div class="quick-start">
      <h2>快速开始</h2>
      <div class="quick-links">
        <router-link to="/tts" class="quick-link">
          <span>🎙️</span>
          <div>
            <h4>文本转语音</h4>
            <p>立即开始语音生成</p>
          </div>
        </router-link>
        
        <router-link to="/imagen" class="quick-link">
          <span>🎨</span>
          <div>
            <h4>图像生成</h4>
            <p>创建精美图像</p>
          </div>
        </router-link>
        
        <router-link to="/veo" class="quick-link">
          <span>🎬</span>
          <div>
            <h4>视频生成</h4>
            <p>制作动态视频</p>
          </div>
        </router-link>
        
        <router-link to="/workflow" class="quick-link">
          <span>⚙️</span>
          <div>
            <h4>工作流</h4>
            <p>高级自动化</p>
          </div>
        </router-link>
      </div>
    </div>

    <div class="api-info">
      <h2>API文档</h2>
      <p>查看完整的API文档和交互式测试界面</p>
      <a href="http://localhost:3000/api-docs" target="_blank" class="api-link">
        访问 Swagger API 文档
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
// 组件逻辑可以在这里添加
</script>

<style scoped>
.home-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem 5%;
  width: 100%;
  box-sizing: border-box;
}

.hero-section {
  text-align: center;
  margin-bottom: 3rem;
}

.hero-section h1 {
  font-size: 2.5rem;
  color: #2c3e50;
  margin-bottom: 1rem;
}

.hero-section p {
  font-size: 1.2rem;
  color: #6c757d;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.feature-card {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.1);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.feature-card h3 {
  color: #2c3e50;
  margin-bottom: 1rem;
}

.feature-card p {
  color: #6c757d;
  margin-bottom: 1rem;
}

.feature-card ul {
  text-align: left;
  color: #495057;
  font-size: 0.9rem;
}

.feature-card ul li {
  margin-bottom: 0.5rem;
}

.quick-start {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
}

.quick-start h2 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 2rem;
}

.quick-links {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.quick-link {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s ease;
}

.quick-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.quick-link span {
  font-size: 2rem;
}

.quick-link h4 {
  color: #2c3e50;
  margin-bottom: 0.25rem;
}

.quick-link p {
  color: #6c757d;
  margin: 0;
  font-size: 0.9rem;
}

.api-info {
  text-align: center;
  background: #e3f2fd;
  border-radius: 12px;
  padding: 2rem;
}

.api-info h2 {
  color: #1976d2;
  margin-bottom: 1rem;
}

.api-info p {
  color: #424242;
  margin-bottom: 1rem;
}

.api-link {
  display: inline-block;
  padding: 0.75rem 2rem;
  background: #1976d2;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.api-link:hover {
  background: #1565c0;
}

@media (max-width: 768px) {
  .home-container {
    padding: 1rem;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
  }
  
  .quick-links {
    grid-template-columns: 1fr;
  }
}
</style>
