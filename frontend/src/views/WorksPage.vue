<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useWorksStore } from '../stores/works'
import { worksService, type Work } from '../api/services/works.service'
import WorksCollectionModule, { type WorksTypeFilter } from '@/components/works/WorksCollectionModule.vue'
import WorksGridModule from '@/components/works/WorksGridModule.vue'
import WorkReader from '@/components/works/WorkReader.vue'
import OrganicDropdown from '@/components/base/OrganicDropdown.vue'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const worksStore = useWorksStore()

const currentTab = ref<WorksTypeFilter>('ALL')
const searchQuery = ref('')
const filterYear = ref<number | ''>('')
const selectedWork = ref<Work | null>(null)
const readerLoading = ref(false)

const currentYear = new Date().getFullYear()
const years = Array.from({ length: Math.max(2026, currentYear) - 2015 + 1 }, (_, i) => Math.max(2026, currentYear) - i)

const yearOptions = computed(() => {
  return [
    { label: t('app.all'), value: '' },
    ...years.map(y => ({ label: String(y), value: y }))
  ]
})

const canDeleteWork = (work: Work) => {
  if (!authStore.user) return false
  if (authStore.user.role === 'ADMIN') return true
  if (work.createdByUserId === authStore.user.id) return true
  if (authStore.user.memberId && work.authorMemberId === authStore.user.memberId) return true
  return false
}

const handleDeleteWork = async (work: Work) => {
  if (confirm('确认删除该作品吗？此操作不可恢复。')) {
    try {
      await worksService.deleteWork(work.id)
      worksStore.works = worksStore.works.filter(w => w.id !== work.id)
      if (selectedWork.value?.id === work.id) selectedWork.value = null
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete work')
    }
  }
}

const loadWorks = () => {
  const params: any = {}
  if (currentTab.value !== 'ALL') {
    params.type = currentTab.value
  }
  if (searchQuery.value) {
    params.q = searchQuery.value
  }
  if (filterYear.value) {
    params.year = filterYear.value
  }
  worksStore.fetchWorks(params)
}

const onSearch = () => {
  loadWorks()
}

watch(filterYear, () => {
  onSearch()
})

const openWorkReader = async (id: string) => {
  try {
    readerLoading.value = true
    const res = await worksService.getWorkDetail(id)
    selectedWork.value = res.data
  } catch (e) {
    console.error('Failed to load work detail', e)
  } finally {
    readerLoading.value = false
  }
}

const closeWorkReader = () => {
  selectedWork.value = null
}

onMounted(() => {
  if (route.query.year) {
    filterYear.value = parseInt(route.query.year as string)
  }
  loadWorks()
})
</script>

<template>
  <main class="editorial-container animate-fade-in">
    <div class="editorial-header">
      <div class="label-micro delay-1 animate-slide-up">LIBRARY</div>
      <h1 class="editorial-title delay-2 animate-slide-up">{{ t('app.menu.works') }}</h1>
      <div class="subtitle-row delay-3 animate-slide-up">
        <p class="editorial-subtitle">{{ t('home.nav.worksDesc') }}</p>
        <button class="action-btn" @click="router.push('/upload?tab=WORK')">
          + {{ t('app.menu.upload') }}
        </button>
      </div>
    </div>

    <div class="filters-row delay-4 animate-slide-up">
      <div class="filter-group">
        <label class="label-micro">YEAR</label>
        <OrganicDropdown v-model="filterYear" :options="yearOptions" :placeholder="t('app.all')" />
      </div>
    </div>

    <WorksCollectionModule
      class="delay-4 animate-slide-up"
      v-model:type="currentTab"
      v-model:query="searchQuery"
      @submit="onSearch"
    />

    <div class="divider-y delay-4 animate-slide-up"></div>

    <div v-if="worksStore.loading" class="loading-state delay-4 animate-slide-up">
      <div class="spinner"></div>
      <span>Loading publications...</span>
    </div>

    <div v-else-if="worksStore.error" class="error-state delay-4 animate-slide-up">
      <p>{{ worksStore.error }}</p>
    </div>

    <div v-else class="delay-4 animate-slide-up">
      <WorksGridModule 
        :works="worksStore.works" 
        group-by="month" 
        :can-delete="canDeleteWork"
        @delete="handleDeleteWork"
        @select="openWorkReader" 
      />
    </div>

    <WorkReader 
      :work="selectedWork" 
      :loading="readerLoading" 
      :can-delete="canDeleteWork"
      @delete="handleDeleteWork"
      @close="closeWorkReader" 
    />
  </main>
</template>

<style scoped>
.filters-row {
  display: flex;
  flex-wrap: wrap;
  gap: 3rem;
  margin-bottom: 2rem;
  position: relative;
  z-index: 50;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Loading */
.loading-state {
  padding: 4rem 0;
  display: flex;
  align-items: center;
  gap: 1rem;
  color: var(--text-muted);
  font-family: var(--mono);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 1px solid var(--border-strong);
  border-top-color: var(--text-h);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state {
  color: var(--error);
  font-family: var(--sans);
  padding: 2rem 0;
}

</style>
