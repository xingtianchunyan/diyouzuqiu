<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const authStore = useAuthStore()
const router = useRouter()

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

const navItems = [
  { path: '/history', label: 'app.menu.history', desc: 'home.nav.historyDesc' },
  { path: '/media', label: 'app.menu.media', desc: 'home.nav.mediaDesc' },
  { path: '/works', label: 'app.menu.works', desc: 'home.nav.worksDesc' },
  { path: '/people', label: 'app.menu.people', desc: 'home.nav.peopleDesc' },
  { path: '/upload', label: 'app.menu.upload', desc: 'home.nav.uploadDesc' },
  { path: '/planner', label: 'app.menu.planner', desc: 'home.nav.plannerDesc' },
]
</script>

<template>
  <main class="editorial-container animate-fade-in">
    <div class="editorial-header">
      <div class="label-micro delay-1 animate-slide-up">{{ t('home.kicker') }}</div>
      <h1 class="editorial-title delay-2 animate-slide-up">{{ t('home.title') }}</h1>
      <p class="editorial-subtitle delay-3 animate-slide-up">{{ t('home.subtitle') }}</p>

      <div v-if="authStore.user" class="user-action delay-4 animate-slide-up">
        <span class="user-greeting">{{ authStore.user.email }}</span>
        <button class="minimal-btn" @click="handleLogout">
          {{ t('auth.logout') }}
        </button>
      </div>
    </div>

    <div class="divider-y delay-4 animate-slide-up"></div>

    <div class="gallery-grid delay-4 animate-slide-up">
      <RouterLink v-for="(item, index) in navItems" :key="item.path" :to="item.path" class="gallery-item">
        <div class="item-index">0{{ index + 1 }}</div>
        <div class="item-content">
          <h2 class="item-title">{{ t(item.label) }}</h2>
          <p class="item-desc">{{ t(item.desc) }}</p>
        </div>
        <div class="item-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </div>
      </RouterLink>
    </div>
  </main>
</template>

<style scoped>
.user-action {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-greeting {
  font-family: var(--sans);
  font-size: 0.85rem;
  color: var(--text-muted);
}

.minimal-btn {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-h);
  padding: 4px 12px;
  font-size: 0.75rem;
  font-family: var(--sans);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 12px;
}

.minimal-btn:hover {
  background: var(--text-h);
  color: var(--surface);
}

.gallery-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
  border-top: 1px solid var(--border);
}

@media (min-width: 768px) {
  .gallery-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.gallery-item {
  display: flex;
  align-items: flex-start;
  padding: 3rem 2rem;
  border-bottom: 1px solid var(--border);
  border-right: 1px solid transparent;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
  text-decoration: none;
}

.gallery-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--surface);
  z-index: -1;
  transform: translateY(100%);
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.gallery-item:hover::before {
  transform: translateY(0);
}

@media (min-width: 768px) {
  .gallery-item:nth-child(odd) {
    border-right: 1px solid var(--border);
  }
}

.item-index {
  font-family: var(--sans);
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-right: 2rem;
  margin-top: 0.5rem;
}

.item-content {
  flex: 1;
}

.item-title {
  font-family: var(--serif);
  font-size: 2rem;
  font-weight: 400;
  color: var(--text-h);
  margin-bottom: 0.75rem;
  transition: color 0.3s ease;
}

.item-desc {
  font-family: var(--sans);
  font-size: 0.95rem;
  color: var(--text-muted);
  line-height: 1.6;
  max-width: 280px;
}

.item-icon {
  color: var(--border-strong);
  margin-top: 0.5rem;
  transition: all 0.3s ease;
  transform: translateX(-10px);
  opacity: 0;
}

.gallery-item:hover .item-icon {
  color: var(--text-h);
  transform: translateX(0);
  opacity: 1;
}

.gallery-item:hover .item-title {
  color: var(--brand);
}
</style>