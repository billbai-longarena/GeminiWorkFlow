import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/tts',
      name: 'tts',
      component: () => import('../views/TTSView.vue'),
    },
    {
      path: '/imagen',
      name: 'imagen',
      component: () => import('../views/ImagenView.vue'),
    },
    {
      path: '/veo',
      name: 'veo',
      component: () => import('../views/VeoView.vue'),
    },
    {
      path: '/workflow',
      name: 'workflow',
      component: () => import('../views/WorkflowView.vue'),
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue'),
    },
  ],
})

export default router
