<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { mediaService, type MediaDetail } from '../api/services/media.service'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()

const media = ref<MediaDetail | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const id = computed(() => route.params.id as string)

const fetchMedia = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await mediaService.getMediaDetail(id.value)
    media.value = res.data
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || err.message || t('errors.loadMediaFailed')
  } finally {
    loading.value = false
  }
}

const canDeleteMedia = (item: MediaDetail) => {
  if (!authStore.user) return false
  if (authStore.user.role === 'ADMIN') return true
  if (item.createdByUserId === authStore.user.id) return true
  if (!authStore.user.memberId) return false
  return item.personTags && item.personTags.length === 1 && item.personTags[0].id === authStore.user.memberId
}

const handleDelete = async () => {
  if (!media.value) return
  if (confirm(t('confirm.deleteMedia'))) {
    try {
      await mediaService.deleteMedia(media.value.id)
      router.push('/media')
    } catch (err: any) {
      alert(err.response?.data?.error?.message || t('errors.deleteMediaFailed'))
    }
  }
}

onMounted(fetchMedia)
watch(id, fetchMedia)
</script>

<template>
  <main class="editorial-container animate-fade-in">
    <div class="editorial-header">
      <div class="label-micro delay-1 animate-slide-up">
        <RouterLink to="/media" class="back-link">&larr; {{ t('app.menu.media') }}</RouterLink>
      </div>
    </div>

    <div v-if="loading" class="loading-state delay-2 animate-slide-up">
      <div class="spinner"></div>
      <span>{{ t('common.loading') }}</span>
    </div>

    <div v-else-if="error" class="error-state delay-2 animate-slide-up">
      <p>{{ error }}</p>
    </div>

    <div v-else-if="media" class="media-detail delay-2 animate-slide-up">
      <div class="media-wrapper">
        <img
          v-if="media.type === 'PHOTO'"
          :src="mediaService.getMediaFileUrl(media.id)"
          class="media-main"
          :alt="$t('media.alt')"
        />
        <video
          v-else-if="media.type === 'VIDEO'"
          :src="mediaService.getMediaFileUrl(media.id)"
          class="media-main"
          controls
          autoplay
        ></video>
      </div>

      <div class="media-info">
        <div class="media-type">{{ media.type === 'PHOTO' ? $t('media.type.photo') : $t('media.type.video') }}</div>
        <p v-if="media.takenAt" class="info-row">
          <span class="info-label">{{ $t('media.timeLabel') }}</span>
          <span>{{ new Date(media.takenAt).toLocaleString() }}</span>
        </p>
        <p v-if="media.year" class="info-row">
          <span class="info-label">{{ $t('media.yearLabel') }}</span>
          <span>{{ media.year }}</span>
        </p>
        <p v-if="media.personTags && media.personTags.length > 0" class="info-row">
          <span class="info-label">{{ $t('media.membersLabel') }}</span>
          <span>{{ media.personTags.map(p => p.displayName).join(', ') }}</span>
        </p>
        <div class="media-actions">
          <button v-if="canDeleteMedia(media)" class="minimal-btn" @click="handleDelete">{{ $t('common.delete') }}</button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.back-link {
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.3s ease;
}
.back-link:hover {
  color: var(--text-h);
}

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

.media-detail {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem 0 4rem;
}

.media-wrapper {
  border: 1px solid var(--border);
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.media-main {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  display: block;
}

.media-info {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}

.media-type {
  font-family: var(--mono);
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 1rem;
}

.info-row {
  display: flex;
  gap: 1rem;
  margin: 0 0 0.75rem 0;
  font-family: var(--sans);
  font-size: 0.95rem;
  color: var(--text);
}

.info-label {
  color: var(--text-muted);
  min-width: 80px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.8rem;
}

.media-actions {
  margin-top: 1.5rem;
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
</style>
