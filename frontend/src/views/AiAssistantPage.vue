<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import ChatPanel from '../components/knowledge/ChatPanel.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isAdmin = computed(() => authStore.user?.role === 'ADMIN')

const tabs = [
  { id: 'chat', label: t('aiAssistant.tabs.chat'), icon: '💬' },
  { id: 'planner', label: t('aiAssistant.tabs.planner'), icon: '📋' },
  ...(isAdmin.value ? [{ id: 'knowledge', label: t('aiAssistant.tabs.knowledge'), icon: '📚' }] : [])
]

const activeTab = ref<string>((route.query.tab as string) || 'chat')

function selectTab(id: string) {
  if (id === 'knowledge') {
    router.push('/knowledge')
    return
  }
  activeTab.value = id
  router.replace({ query: { ...route.query, tab: id } })
}

watch(() => route.query.tab, (val) => {
  if (val && tabs.some(t => t.id === val)) {
    activeTab.value = val as string
  }
})
</script>

<template>
  <main class="editorial-container animate-fade-in">
    <div class="editorial-header">
      <div class="label-micro delay-1 animate-slide-up">{{ t('aiAssistant.kicker') }}</div>
      <h1 class="editorial-title delay-2 animate-slide-up">{{ t('aiAssistant.title') }}</h1>
      <p class="editorial-subtitle delay-3 animate-slide-up">{{ t('aiAssistant.subtitle') }}</p>
    </div>

    <div class="divider-y delay-4 animate-slide-up"></div>

    <div class="ai-tabs delay-4 animate-slide-up">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="ai-tab"
        :class="{ active: activeTab === tab.id }"
        @click="selectTab(tab.id)"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <div class="ai-content delay-4 animate-slide-up">
      <ChatPanel
        v-if="activeTab === 'chat'"
        context="knowledge"
        :show-header="false"
        :show-save-to-knowledge="isAdmin"
        @plan="$router.push('/knowledge')"
      />

      <div v-else-if="activeTab === 'planner'" class="planner-tab">
        <ChatPanel
          context="planner"
          :show-header="false"
          :show-upload="true"
          :show-save-to-knowledge="true"
          :enable-history-cache="true"
          storage-key="planner_chat_history"
        />
        <div class="planner-link-row">
          <router-link to="/planner" class="editorial-btn secondary">
            {{ t('aiAssistant.openFullPlanner') }}
          </router-link>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.ai-tabs {
  display: flex;
  justify-content: center;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid var(--border);
}

.ai-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  min-width: 100px;
  padding: 0.85rem 1.25rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text-muted);
  font-family: var(--sans);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ai-tab:hover {
  border-color: var(--text-h);
  color: var(--text-h);
}

.ai-tab.active {
  background: var(--text-h);
  border-color: var(--text-h);
  color: var(--bg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.tab-icon {
  font-size: 1.5rem;
  line-height: 1;
}

.tab-label {
  font-size: 0.8rem;
  font-weight: 500;
}

.ai-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 60vh;
}

.ai-content :deep(.chat-panel) {
  max-height: none;
}

.planner-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.planner-link-row {
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--border);
  text-align: center;
}

@media (max-width: 480px) {
  .ai-tabs {
    gap: 0.5rem;
  }

  .ai-tab {
    min-width: 80px;
    padding: 0.65rem 0.75rem;
  }

  .tab-icon {
    font-size: 1.25rem;
  }

  .tab-label {
    font-size: 0.7rem;
  }
}
</style>
