<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Timeline from '../components/Timeline.vue'

const { t } = useI18n()
const router = useRouter()

// Generate years from 2015 to current year + 1
const currentYear = new Date().getFullYear()
const startYear = 2015
const baseEndYear = Math.max(2026, currentYear)
const maxFutureYear = 2040

const currentEndYear = ref(baseEndYear)

const nodes = computed(() => {
  return Array.from({ length: currentEndYear.value - startYear + 1 }, (_, i) => {
    const year = currentEndYear.value - i
    return {
      year,
      hasData: true // TODO: determine this from API
    }
  })
})

const addFutureYear = () => {
  if (currentEndYear.value < maxFutureYear) {
    currentEndYear.value++
  }
}

const handleSelect = (year: number) => {
  router.push(`/history/${year}`)
}
</script>

<template>
  <main class="editorial-container animate-fade-in">
    <div class="editorial-header">
      <div class="label-micro delay-1 animate-slide-up">THE TIMELINE</div>
      <h1 class="editorial-title delay-2 animate-slide-up">{{ t('app.menu.history') }}</h1>
      <div class="subtitle-row delay-3 animate-slide-up">
        <p class="editorial-subtitle">{{ t('home.nav.historyDesc') }}</p>
        <div class="header-actions">
          <button 
            v-if="currentEndYear < maxFutureYear" 
            class="action-btn" 
            @click="addFutureYear"
          >
            + 未来
          </button>
          <button class="action-btn" @click="router.push('/upload?tab=CHRONICLE')">
            + {{ t('app.menu.upload') }}
          </button>
        </div>
      </div>
    </div>

    <div class="divider-y delay-4 animate-slide-up"></div>

    <div class="timeline-wrapper delay-4 animate-slide-up">
      <Timeline :nodes="nodes" @select="handleSelect" />
    </div>
  </main>
</template>

<style scoped>
.editorial-container {
  position: relative;
  overflow: visible;
}

.timeline-wrapper {
  padding: 1rem 0;
  position: relative;
}
</style>

