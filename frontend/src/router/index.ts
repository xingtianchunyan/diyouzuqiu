import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../views/HomePage.vue'
import HistoryPage from '../views/HistoryPage.vue'
import YearPage from '../views/YearPage.vue'
import MediaPage from '../views/MediaPage.vue'
import MediaDetailPage from '../views/MediaDetailPage.vue'
import WorksPage from '../views/WorksPage.vue'
import WorkDetailPage from '../views/WorkDetailPage.vue'
import PeoplePage from '../views/PeoplePage.vue'
import PersonPage from '../views/PersonPage.vue'
import UploadPage from '../views/UploadPage.vue'
import PlannerPage from '../views/PlannerPage.vue'
import AiAssistantPage from '../views/AiAssistantPage.vue'
import LoginPage from '../views/LoginPage.vue'
import AdminUsersPage from '../views/AdminUsersPage.vue'
import { useAuthStore } from '../stores/auth'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginPage, meta: { public: true } },
    { path: '/', name: 'home', component: HomePage },
    { path: '/history', name: 'history', component: HistoryPage },
    { path: '/history/:year(\\d{4})', name: 'year', component: YearPage, props: true },
    { path: '/media', name: 'media', component: MediaPage },
    { path: '/media/:id', name: 'media-detail', component: MediaDetailPage, props: true },
    { path: '/works', name: 'works', component: WorksPage },
    { path: '/works/:id', name: 'work-detail', component: WorkDetailPage, props: true },
    { path: '/people', name: 'people', component: PeoplePage },
    { path: '/people/:id', name: 'person', component: PersonPage, props: true },
    { path: '/upload', name: 'upload', component: UploadPage },
    { path: '/ai', name: 'ai-assistant', component: AiAssistantPage, meta: { requiresAuth: true } },
    { path: '/planner', name: 'planner', component: PlannerPage, meta: { requiresAuth: true } },
    { path: '/admin/users', name: 'admin-users', component: AdminUsersPage, meta: { requiresAuth: true, requiresAdmin: true } },
    {
      path: '/knowledge',
      name: 'Knowledge',
      component: () => import('../views/KnowledgePage.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    }
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  await authStore.initialize()
  const isAuthenticated = authStore.isAuthenticated

  if (!isAuthenticated && !to.meta.public) {
    return { name: 'login' }
  }

  if (isAuthenticated && to.name === 'login') {
    return { name: 'home' }
  }

  if (to.meta.requiresAdmin && authStore.user?.role !== 'ADMIN') {
    return { name: 'home' }
  }

  return true
})

