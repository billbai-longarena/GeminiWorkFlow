<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app-container">
    <header>
      <nav class="navbar">
        <div class="nav-brand">
          <h1>AI内容生成平台</h1>
        </div>
        <div class="nav-links">
          <RouterLink to="/" class="nav-link">首页</RouterLink>
          <RouterLink to="/tts" class="nav-link">文本转语音</RouterLink>
          <RouterLink to="/imagen" class="nav-link">图像生成</RouterLink>
          <RouterLink to="/veo" class="nav-link">视频生成</RouterLink>
          <RouterLink to="/workflow" class="nav-link">工作流配置</RouterLink>
        </div>
      </nav>
    </header>

    <main>
      <RouterView />
    </main>

    <footer>
      <p>&copy; 2025 AI内容生成平台. 基于 Gemini 2.5, Imagen 3.0, Veo 3.0</p>
    </footer>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.navbar {
  background: #2c3e50;
  color: white;
  padding: 1rem 5%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  width: 100%;
  box-sizing: border-box;
}

.nav-brand h1 {
  margin: 0;
  font-size: 1.5rem;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  flex-wrap: nowrap;
}

.nav-link {
  color: white;
  text-decoration: none;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  transition: background-color 0.3s;
  white-space: nowrap;
  font-size: 0.95rem;
}

.nav-link:hover {
  background-color: rgba(255,255,255,0.1);
}

.nav-link.router-link-active {
  background-color: rgba(255,255,255,0.2);
}

main {
  flex: 1;
  padding: 0;
  width: 100%;
}

footer {
  background: #f8f9fa;
  text-align: center;
  padding: 1rem;
  color: #6c757d;
  border-top: 1px solid #e9ecef;
}

@media (max-width: 768px) {
  .navbar {
    flex-direction: column;
    gap: 1rem;
  }
  
  .nav-links {
    flex-wrap: wrap;
    justify-content: center;
    gap: 1rem;
  }
  
  main {
    padding: 1rem;
  }
}
</style>
