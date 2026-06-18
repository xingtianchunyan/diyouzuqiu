<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink, RouterView, useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAppStore } from './stores/app'
import { useAuthStore } from './stores/auth'
import SoccerFX from './components/SoccerFX.vue'
import OrganicDropdown from './components/base/OrganicDropdown.vue'

const app = useAppStore()
const authStore = useAuthStore()
const { t, locale } = useI18n()
const router = useRouter()
const route = useRoute()

onMounted(async () => {
  if (authStore.isAuthenticated) {
    try {
      await authStore.fetchCurrentUser()
    } catch (err) {
      // Silent: auth guard will redirect if needed
    }
  }
})

function toggleLocale() {
  app.toggleLocale()
  locale.value = app.locale
}

const mobileNavOptions = computed(() => {
  const opts = [
    { label: t('app.menu.history'), value: '/history' },
    { label: t('app.menu.media'), value: '/media' },
    { label: t('app.menu.works'), value: '/works' },
    { label: t('app.menu.people'), value: '/people' },
    { label: t('app.menu.upload'), value: '/upload' },
    { label: t('app.menu.planner'), value: '/planner' },
  ]
  if (authStore.user?.role === 'ADMIN') {
    opts.push({ label: t('app.admin.accountManagement'), value: '/admin/users' })
    opts.push({ label: t('app.admin.knowledgeBase'), value: '/knowledge' })
  }
  return opts
})

const currentPath = computed(() => {
  const path = route.path
  if (path.startsWith('/history')) return '/history'
  if (path.startsWith('/media')) return '/media'
  if (path.startsWith('/works')) return '/works'
  if (path.startsWith('/people')) return '/people'
  if (path.startsWith('/upload')) return '/upload'
  if (path.startsWith('/planner')) return '/planner'
  if (path.startsWith('/admin/users')) return '/admin/users'
  if (path.startsWith('/knowledge')) return '/knowledge'
  return ''
})

const handleMobileNav = (val: string) => {
  if (val) {
    router.push(val)
  }
}
</script>

<template>
  <div class="app-layout">
    <SoccerFX />
    <header class="app-header animate-fade-in">
      <div class="header-inner">
        <RouterLink to="/" class="brand">
          <span class="brand-text">DIYOU</span>
          <span class="brand-year">est. 2013</span>
        </RouterLink>

        <nav class="main-nav">
          <RouterLink class="nav-item" to="/history">{{ t('app.menu.history') }}</RouterLink>
          <RouterLink class="nav-item" to="/media">{{ t('app.menu.media') }}</RouterLink>
          <RouterLink class="nav-item" to="/works">{{ t('app.menu.works') }}</RouterLink>
          <RouterLink class="nav-item" to="/people">{{ t('app.menu.people') }}</RouterLink>
          <RouterLink class="nav-item" to="/upload">{{ t('app.menu.upload') }}</RouterLink>
          <RouterLink class="nav-item" to="/planner">{{ t('app.menu.planner') }}</RouterLink>
          <RouterLink v-if="authStore.user?.role === 'ADMIN'" class="nav-item" to="/admin/users">{{ t('app.admin.accountManagement') }}</RouterLink>
          <RouterLink v-if="authStore.user?.role === 'ADMIN'" class="nav-item" to="/knowledge">{{ t('app.admin.knowledgeBase') }}</RouterLink>
        </nav>

        <div class="header-actions">
          <div class="mobile-nav-wrapper">
            <OrganicDropdown
              :options="mobileNavOptions"
              :model-value="currentPath"
              @update:model-value="handleMobileNav"
              :placeholder="t('app.menu.history')"
            />
          </div>
          <button class="lang-toggle" type="button" @click="toggleLocale">
            {{ app.locale === 'zh-CN' ? t('app.langToggle.en') : t('app.langToggle.zh') }}
          </button>
        </div>
      </div>
    </header>

    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100svh;
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(253, 252, 249, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-decoration: none;
}

.brand-text {
  font-family: var(--serif);
  font-size: 1.4rem;
  font-weight: 500;
  color: var(--text-h);
  letter-spacing: 0.05em;
  line-height: 1;
}

.brand-year {
  font-family: var(--sans);
  font-size: 0.55rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--brand);
}

.main-nav {
  display: flex;
  gap: 2.5rem;
  align-items: center;
}

.nav-item {
  font-family: var(--sans);
  font-size: 0.85rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 400;
  position: relative;
  padding: 0.5rem 0;
}

.nav-item::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 1px;
  background-color: var(--text-h);
  transform: scaleX(0);
  transform-origin: right;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.nav-item:hover {
  color: var(--text-h);
}

.nav-item:hover::after {
  transform: scaleX(1);
  transform-origin: left;
}

.nav-item.router-link-active {
  color: var(--text-h);
}

.nav-item.router-link-active::after {
  transform: scaleX(1);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.mobile-nav-wrapper {
  display: none;
  width: 120px;
}

.lang-toggle {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text);
  font-family: var(--sans);
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  padding: 6px 12px;
  border-radius: 40px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.lang-toggle:hover {
  background: var(--text-h);
  color: var(--surface);
  border-color: var(--text-h);
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

@media (max-width: 900px) {
  .main-nav {
    display: none;
  }
  .mobile-nav-wrapper {
    display: block;
  }
}
</style>
