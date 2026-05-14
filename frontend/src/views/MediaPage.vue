<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { mediaService, type Media } from '../api/services/media.service'
import { membersService } from '../api/services/members.service'
import BaseEmptyState from '../components/base/EmptyState.vue'
import OrganicDropdown from '../components/base/OrganicDropdown.vue'
import MediaGallery from '../components/media/MediaGallery.vue'
import MediaLightbox from '../components/media/MediaLightbox.vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const mediaList = ref<Media[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const filterType = ref<'PHOTO' | 'VIDEO' | ''>('')
const filterYear = ref<number | ''>('')
const filterPerson = ref<string | ''>('')

const currentYear = new Date().getFullYear()
const years = Array.from({ length: Math.max(2026, currentYear) - 2015 + 1 }, (_, i) => Math.max(2026, currentYear) - i)

const selectedMedia = ref<Media | null>(null)

const yearOptions = computed(() => {
  return [
    { label: t('app.all'), value: '' },
    ...years.map(y => ({ label: String(y), value: y }))
  ]
})

const persons = ref<{ id: string, name: string }[]>([])
const personOptions = computed(() => {
  return [
    { label: t('app.all'), value: '' },
    ...persons.value.map(p => ({ label: p.name, value: p.id }))
  ]
})

const typeOptions = computed(() => [
  { label: t('app.all'), value: '' },
  { label: 'Photos', value: 'PHOTO' },
  { label: 'Videos', value: 'VIDEO' }
])

const fetchPersons = async () => {
  try {
    const res = await membersService.getMembers()
    persons.value = res.data.map(m => ({ id: m.id, name: m.displayName }))
  } catch (error) {
    console.error('Failed to fetch persons', error)
  }
}

const fetchMedia = async () => {
  loading.value = true
  error.value = null
  try {
    const params: any = {}
    if (filterType.value) params.type = filterType.value
    if (filterYear.value) params.year = filterYear.value
    if (filterPerson.value) params.personId = filterPerson.value

    const res = await mediaService.getMediaList(params)
    mediaList.value = res.data
  } catch (err: any) {
    console.error('Failed to fetch media', err)
    error.value = err.message || 'Failed to load media'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (route.query.year) {
    filterYear.value = parseInt(route.query.year as string)
  }
  fetchPersons()
  fetchMedia()
})

watch([filterType, filterYear, filterPerson], () => {
  fetchMedia()
})

const canDeleteMedia = (item: Media): boolean => {
  if (!authStore.user) return false
  if (authStore.user.role === 'ADMIN') return true
  if (item.createdByUserId === authStore.user.id) return true
  if (!authStore.user.memberId) return false
  return item.personTags && item.personTags.length === 1 && item.personTags[0].id === authStore.user.memberId ? true : false
}

const handleDeleteMedia = async (mediaId: string) => {
  if (confirm('确认删除这张照片吗？此操作不可恢复。')) {
    try {
      await mediaService.deleteMedia(mediaId)
      mediaList.value = mediaList.value.filter(m => m.id !== mediaId)
      selectedMedia.value = null
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete media')
    }
  }
}
</script>

<template>
  <main class="editorial-container animate-fade-in">
    <div class="editorial-header">
      <div class="label-micro delay-1 animate-slide-up">ARCHIVE</div>
      <h1 class="editorial-title delay-2 animate-slide-up">{{ t('app.menu.media') }}</h1>
      <div class="subtitle-row delay-3 animate-slide-up">
        <p class="editorial-subtitle">{{ t('home.nav.mediaDesc') }}</p>
        <button class="action-btn" @click="router.push('/upload?tab=MEDIA')">
          + {{ t('app.menu.upload') }}
        </button>
      </div>
    </div>

    <div class="filters-row delay-4 animate-slide-up">
      <div class="filter-group">
        <label class="label-micro">TYPE</label>
        <OrganicDropdown v-model="filterType" :options="typeOptions" :placeholder="t('app.all')" />
      </div>
      
      <div class="filter-group">
        <label class="label-micro">YEAR</label>
        <OrganicDropdown v-model="filterYear" :options="yearOptions" :placeholder="t('app.all')" />
      </div>

      <div class="filter-group">
        <label class="label-micro">SUBJECT</label>
        <OrganicDropdown v-model="filterPerson" :options="personOptions" :placeholder="t('app.all')" />
      </div>
    </div>

    <div class="divider-y delay-4 animate-slide-up"></div>

    <div v-if="loading" class="loading-state delay-4 animate-slide-up">
      <div class="spinner"></div>
      <span>Retrieving archives...</span>
    </div>

    <BaseEmptyState
      v-else-if="error"
      :title="error"
      description="Unable to load media at this time."
      class="delay-4 animate-slide-up"
    />

    <MediaGallery
      v-else-if="mediaList.length > 0"
      :media-list="mediaList"
      group-by="month"
      :can-delete="canDeleteMedia"
      @select="selectedMedia = $event"
      @delete="handleDeleteMedia"
    />

    <div v-else class="empty-archive delay-4 animate-slide-up">
      <p class="empty-text">No records found matching your criteria.</p>
      <button class="minimal-btn" @click="router.push('/upload')">CONTRIBUTE TO ARCHIVE</button>
    </div>
  </main>

  <MediaLightbox
    :media="selectedMedia"
    @close="selectedMedia = null"
  />
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

.minimal-select {
  appearance: none;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border-strong);
  border-radius: 0;
  font-family: var(--serif);
  font-size: 1.25rem;
  color: var(--text-h);
  padding: 0.25rem 2rem 0.25rem 0;
  cursor: pointer;
  outline: none;
  transition: border-color 0.3s ease;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2318181b%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 0.65rem auto;
}

.minimal-select:focus {
  border-color: var(--brand);
}

/* Empty State */
.empty-archive {
  padding: 4rem 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1.5rem;
}

.empty-text {
  font-family: var(--serif);
  font-size: 1.5rem;
  color: var(--text-muted);
}

.minimal-btn {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-h);
  padding: 8px 20px;
  font-size: 0.75rem;
  font-family: var(--sans);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 40px;
}

.minimal-btn:hover {
  background: var(--text-h);
  color: var(--surface);
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
</style>
