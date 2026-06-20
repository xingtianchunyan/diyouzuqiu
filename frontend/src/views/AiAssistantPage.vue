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

watch(activeTab, (val) => {
  router.replace({ query: { ...route.query, tab: val } })
})

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

    <div class="mode-tabs delay-4 animate-slide-up">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="mode-tab"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        {{ tab.label }}
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

      <div v-else-if="activeTab === 'knowledge'" class="knowledge-entry">
        <div class="knowledge-card">
          <h3>{{ t('aiAssistant.knowledgeTitle') }}</h3>
          <p>{{ t('aiAssistant.knowledgeDesc') }}</p>
          <router-link to="/knowledge" class="editorial-btn">
            {{ t('aiAssistant.openKnowledgeManager') }}
          </router-link>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
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

.knowledge-entry {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.knowledge-card {
  max-width: 480px;
  text-align: center;
  padding: 2rem;
  border: 1px solid var(--border);
  background: var(--surface);
}

.knowledge-card h3 {
  margin: 0 0 0.75rem;
  font-family: var(--font-serif);
  color: var(--text-h);
}

.knowledge-card p {
  margin: 0 0 1.5rem;
  color: var(--text-muted);
  font-size: 0.95rem;
  line-height: 1.6;
}

.tab-icon {
  margin-right: 0.35rem;
}

.mode-tab {
  display: inline-flex;
  align-items: center;
}
</style>
