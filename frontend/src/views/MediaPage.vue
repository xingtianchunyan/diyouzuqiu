<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { mediaService, type Media } from '../api/services/media.service'
import { membersService } from '../api/services/members.service'
import BaseEmptyState from '../components/base/EmptyState.vue'
import OrganicDropdown from '../components/base/OrganicDropdown.vue'
import MediaGallery from '../components/media/MediaGallery.vue'
import MediaLightbox from '../components/media/MediaLightbox.vue'
import MediaEditModal from '../components/media/MediaEditModal.vue'
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
const editingMedia = ref<Media | null>(null)

const handleUpdatedMedia = (updated: Media) => {
  const index = mediaList.value.findIndex(m => m.id === updated.id)
  if (index !== -1) {
    mediaList.value[index] = { ...mediaList.value[index], ...updated }
  }
  if (selectedMedia.value?.id === updated.id) {
    selectedMedia.value = { ...selectedMedia.value, ...updated }
  }
}

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
  { label: t('media.type.photos'), value: 'PHOTO' },
  { label: t('media.type.videos'), value: 'VIDEO' }
])

const fetchPersons = async () => {
  try {
    const res = await membersService.getMembers()
    persons.value = res.data.map(m => ({ id: m.id, name: m.displayName }))
  } catch (error) {
    // Silent: person filter will be empty
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
    error.value = err.response?.data?.error?.message || err.message || t('errors.loadMediaFailed')
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
  if (confirm(t('confirm.deleteMedia'))) {
    try {
      await mediaService.deleteMedia(mediaId)
      mediaList.value = mediaList.value.filter(m => m.id !== mediaId)
      selectedMedia.value = null
    } catch (err: any) {
      alert(err.response?.data?.error?.message || t('errors.deleteMediaFailed'))
    }
  }
}
</script>

<template>
  <main class="arena-theme media-page">
    <div class="editorial-container animate-fade-in">
    <div class="editorial-header">
      <div class="label-micro delay-1 animate-slide-up">
        {{ t('media.archive') }}
      </div>
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
        <label class="label-micro">{{ t('media.filters.type') }}</label>
        <OrganicDropdown v-model="filterType" :options="typeOptions" :placeholder="t('app.all')" />
      </div>
      
      <div class="filter-group">
        <label class="label-micro">{{ t('media.filters.year') }}</label>
        <OrganicDropdown v-model="filterYear" :options="yearOptions" :placeholder="t('app.all')" />
      </div>

      <div class="filter-group">
        <label class="label-micro">{{ t('media.filters.subject') }}</label>
        <OrganicDropdown v-model="filterPerson" :options="personOptions" :placeholder="t('app.all')" />
      </div>
    </div>

    <div class="divider-y delay-4 animate-slide-up"></div>

    <div v-if="loading" class="loading-state delay-4 animate-slide-up">
      <div class="spinner"></div>
      <span>{{ t('media.loading') }}</span>
    </div>

    <BaseEmptyState
      v-else-if="error"
      :title="error"
      :description="t('media.loadErrorDescription')"
      class="delay-4 animate-slide-up"
    />

    <MediaGallery
      v-else-if="mediaList.length > 0"
      :media-list="mediaList"
      group-by="month"
      :can-delete="canDeleteMedia"
      @select="selectedMedia = $event"
      @delete="handleDeleteMedia"
      @edit="editingMedia = $event"
    />

    <div v-else class="empty-archive delay-4 animate-slide-up">
      <p class="empty-text">{{ t('media.noRecords') }}</p>
      <button class="minimal-btn" @click="router.push('/upload')">{{ t('history.contribute') }}</button>
    </div>
    </div>
  </main>

  <MediaLightbox
    :media="selectedMedia"
    :list="mediaList"
    @close="selectedMedia = null"
    @navigate="selectedMedia = $event"
  />

  <MediaEditModal
    :media="editingMedia"
    @close="editingMedia = null"
    @updated="handleUpdatedMedia"
  />
</template>

<style scoped>
/* ===== Page-level arena theme (scoped, never :root) ===== */
.arena-theme {
  --font-display: 'Anton', 'Inter', system-ui, sans-serif;
  --arena-text: #eef3ee;
  --arena-muted: rgba(238, 243, 238, 0.55);
  --arena-faint: rgba(238, 243, 238, 0.32);
  --arena-line: rgba(255, 255, 255, 0.09);
  --arena-green: #3ddc84;
  --arena-green-deep: #1f7a48;
  --arena-gold: #e8c766;

  /* Re-tone inherited editorial tokens so shared children
     (OrganicDropdown, headings, empty states) read dark here */
  --bg: #05080a;
  --surface: #0a120d;
  --surface-hover: rgba(255, 255, 255, 0.06);
  --text-h: var(--arena-text);
  --text: rgba(238, 243, 238, 0.82);
  --text-muted: var(--arena-muted);
  --border: var(--arena-line);
  --border-strong: rgba(255, 255, 255, 0.22);

  min-height: 100dvh;
  color: var(--arena-text);
  background:
    radial-gradient(1100px 520px at 85% -10%, rgba(232, 199, 102, 0.07), transparent 60%),
    radial-gradient(1000px 720px at 8% 112%, rgba(31, 122, 72, 0.2), transparent 65%),
    linear-gradient(180deg, #05080a 0%, #08130e 52%, #05080a 100%);
}

.media-page .editorial-container {
  padding-top: calc(4rem + var(--safe-top));
  padding-bottom: calc(4rem + var(--safe-bottom));
}

.media-page .label-micro {
  color: var(--arena-green);
  letter-spacing: 0.22em;
}

.media-page .editorial-title {
  font-family: var(--font-display);
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: var(--arena-text);
}

.media-page .editorial-subtitle {
  color: var(--arena-muted);
}

.media-page .action-btn {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  padding: 0 1.1rem;
  border-radius: 999px;
  border: 1px solid rgba(232, 199, 102, 0.55);
  color: var(--arena-gold);
  background: rgba(232, 199, 102, 0.08);
  -webkit-tap-highlight-color: transparent;
}

@media (hover: hover) {
  .media-page .action-btn:hover {
    color: #14210f;
    background: var(--arena-gold);
    text-decoration: none;
  }
}

.media-page .action-btn:active {
  transform: scale(0.96);
}

.media-page .divider-y {
  background-color: var(--arena-line);
}

.media-page .minimal-btn {
  border-color: rgba(255, 255, 255, 0.28);
  color: var(--arena-text);
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}

@media (hover: hover) {
  .media-page .minimal-btn:hover {
    background: var(--arena-text);
    color: #05080a;
  }
}

.media-page .empty-text {
  font-family: var(--sans);
  color: var(--arena-muted);
}

.media-page .loading-state {
  color: var(--arena-muted);
}

.media-page .spinner {
  border-color: var(--arena-line);
  border-top-color: var(--arena-green);
}

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
