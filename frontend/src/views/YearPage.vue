<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { yearsService, type YearAggregation } from '../api/services/years.service'
import { mediaService, type Media } from '../api/services/media.service'
import { worksService, type Work } from '../api/services/works.service'
import { matchesService, type Match } from '../api/services/matches.service'
import { chroniclesService } from '../api/services/chronicles.service'
import MatchesList from '@/components/matches/MatchesList.vue'
import ChroniclesList from '@/components/chronicles/ChroniclesList.vue'
import WorksGridModule from '@/components/works/WorksGridModule.vue'
import WorkReader from '@/components/works/WorkReader.vue'
import MediaGallery from '@/components/media/MediaGallery.vue'
import MediaEditModal from '@/components/media/MediaEditModal.vue'
import WorkEditModal from '@/components/works/WorkEditModal.vue'
import MatchEditModal from '@/components/matches/MatchEditModal.vue'
import ChronicleEditModal from '@/components/chronicles/ChronicleEditModal.vue'

const props = defineProps<{
  year: string | number
}>()

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()

const year = ref(Number(route.params.year))
const loading = ref(false)
const error = ref<string | null>(null)
const data = ref<YearAggregation | null>(null)
const yearListRef = ref<HTMLElement | null>(null)
const selectedMedia = ref<any | null>(null)
const editingMedia = ref<Media | null>(null)
const selectedWork = ref<Work | null>(null)
const editingWork = ref<Work | null>(null)
const editingMatch = ref<Match | null>(null)
const editingChronicle = ref<any>(null)
const readerLoading = ref(false)

const handleUpdatedMedia = (updated: Media) => {
  if (!data.value) return
  const index = data.value.media.findIndex((m: any) => m.id === updated.id)
  if (index !== -1) {
    data.value.media[index] = { ...data.value.media[index], ...updated }
  }
  if (selectedMedia.value?.id === updated.id) {
    selectedMedia.value = { ...selectedMedia.value, ...updated }
  }
}

const handleUpdatedWork = (updated: Work) => {
  if (!data.value) return
  const index = data.value.works.findIndex((w: any) => w.id === updated.id)
  if (index !== -1) {
    data.value.works[index] = { ...data.value.works[index], ...updated }
  }
  if (selectedWork.value?.id === updated.id) {
    selectedWork.value = { ...selectedWork.value, ...updated }
  }
}

const handleUpdatedMatch = (updated: Match) => {
  if (!data.value) return
  const index = data.value.matches.findIndex((m: any) => m.id === updated.id)
  if (index !== -1) {
    data.value.matches[index] = { ...data.value.matches[index], ...updated }
  }
}

const handleUpdatedChronicle = (updated: any) => {
  if (!data.value || !data.value.events) return
  const index = data.value.events.findIndex((c: any) => c.id === updated.id)
  if (index !== -1) {
    data.value.events[index] = { ...data.value.events[index], ...updated }
  }
}

const canDeleteMedia = (item: any) => {
  if (!authStore.user) return false
  if (authStore.user.role === 'ADMIN') return true
  if (item.createdByUserId === authStore.user.id) return true
  if (!authStore.user.memberId) return false
  return item.personTags && item.personTags.length === 1 && item.personTags[0].id === authStore.user.memberId
}

const canDeleteWork = (work: Work) => {
  if (!authStore.user) return false
  if (authStore.user.role === 'ADMIN') return true
  if (work.createdByUserId === authStore.user.id) return true
  if (authStore.user.memberId && work.authorMemberId === authStore.user.memberId) return true
  return false
}

const canDeleteMatch = (match: Match) => {
  if (!authStore.user) return false
  if (authStore.user.role === 'ADMIN') return true
  if (match.createdByUserId === authStore.user.id) return true
  return false
}

const canDeleteChronicle = (chronicle: any) => {
  if (!authStore.user) return false
  if (authStore.user.role === 'ADMIN') return true
  if (chronicle.createdByUserId === authStore.user.id) return true
  if (authStore.user.memberId && chronicle.members && chronicle.members.length === 1 && chronicle.members[0].id === authStore.user.memberId) return true
  return false
}

const handleDeleteMedia = async (mediaId: string) => {
  if (confirm(t('confirm.deleteMedia'))) {
    try {
      await mediaService.deleteMedia(mediaId)
      if (data.value) {
        data.value.media = data.value.media.filter((m: any) => m.id !== mediaId)
      }
      selectedMedia.value = null
    } catch (err: any) {
      alert(err.response?.data?.error?.message || t('errors.deleteMediaFailed'))
    }
  }
}

const handleDeleteWork = async (work: Work) => {
  if (confirm(t('confirm.deleteWork'))) {
    try {
      await worksService.deleteWork(work.id)
      if (data.value) {
        data.value.works = data.value.works.filter(w => w.id !== work.id)
      }
      if (selectedWork.value?.id === work.id) selectedWork.value = null
    } catch (err: any) {
      alert(err.response?.data?.error?.message || t('errors.deleteWorkFailed'))
    }
  }
}

const handleDeleteMatch = async (match: Match) => {
  if (confirm(t('confirm.deleteMatch'))) {
    try {
      await matchesService.deleteMatch(match.id)
      if (data.value) {
        data.value.matches = data.value.matches.filter(m => m.id !== match.id)
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || t('errors.deleteMatchFailed'))
    }
  }
}

const handleDeleteChronicle = async (chronicle: any) => {
  if (confirm(t('confirm.deleteChronicle'))) {
    try {
      await chroniclesService.deleteChronicle(chronicle.id)
      if (data.value && data.value.events) {
        data.value.events = data.value.events.filter(c => c.id !== chronicle.id)
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || t('errors.deleteChronicleFailed'))
    }
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && selectedMedia.value) {
    selectedMedia.value = null
  }
}

const openWorkReader = async (workId: string) => {
  try {
    readerLoading.value = true
    const res = await worksService.getWorkDetail(workId)
    selectedWork.value = res.data
  } catch (e) {
    // Silent: reader will show empty state
  } finally {
    readerLoading.value = false
  }
}

const closeWorkReader = () => {
  selectedWork.value = null
}

// Mouse drag state for horizontal timeline
let isDown = false
let startX = 0
let scrollLeft = 0

const onMouseDown = (e: MouseEvent) => {
  if (!yearListRef.value) return
  isDown = true
  yearListRef.value.classList.add('is-dragging')
  startX = e.pageX - yearListRef.value.offsetLeft
  scrollLeft = yearListRef.value.scrollLeft
}

const onMouseLeave = () => {
  if (!yearListRef.value) return
  isDown = false
  yearListRef.value.classList.remove('is-dragging')
  snapToNearestNode()
}

const onMouseUp = () => {
  if (!yearListRef.value) return
  isDown = false
  yearListRef.value.classList.remove('is-dragging')
  snapToNearestNode()
}

const onMouseMove = (e: MouseEvent) => {
  if (!isDown || !yearListRef.value) return
  e.preventDefault()
  const x = e.pageX - yearListRef.value.offsetLeft
  const walk = (x - startX) * 1.5 // Slightly less aggressive for smooth feel
  yearListRef.value.scrollLeft = scrollLeft - walk
}

// Scroll snapping logic
let scrollTimeout: ReturnType<typeof setTimeout> | null = null

const onScroll = () => {
  if (isDown) return // Do not trigger auto-select while actively dragging
  
  if (scrollTimeout) clearTimeout(scrollTimeout)
  
  // Wait for scrolling to naturally stop (e.g. momentum finishes)
  scrollTimeout = setTimeout(() => {
    snapToNearestNode()
  }, 150)
}

const snapToNearestNode = () => {
  if (!yearListRef.value) return
  
  // Node width is 120px
  const nodeWidth = 120
  const container = yearListRef.value
  
  // scrollLeft represents the amount scrolled. 
  // With our padding logic, the first node is at scrollLeft = 0.
  // We can figure out the index by rounding scrollLeft / nodeWidth.
  const index = Math.round(container.scrollLeft / nodeWidth)
  
  const targetYear = nodes.value[index]?.year
  
  if (targetYear && targetYear !== year.value) {
    handleSelect(targetYear)
  }
}

// Calculate dynamic years
const currentYearObj = new Date().getFullYear()
const startYear = 2015

const nodes = computed(() => {
  const maxYear = Math.max(2026, currentYearObj, year.value)
  return Array.from({ length: maxYear - startYear + 1 }, (_, i) => {
    return { year: maxYear - i }
  })
})

const handleSelect = (y: number) => {
  router.push(`/history/${y}`)
}

const scrollToActiveYear = () => {
  if (!yearListRef.value) return
  const nodeWidth = 120
  const index = nodes.value.findIndex(n => n.year === year.value)
  if (index !== -1) {
    yearListRef.value.scrollTo({
      left: index * nodeWidth,
      behavior: 'smooth'
    })
  }
}

const fetchData = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await yearsService.getYearAggregation(year.value)
    data.value = res.data
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || err.message || t('errors.loadYearDataFailed')
  } finally {
    loading.value = false
    // Allow DOM to update then scroll to center the active year
    setTimeout(scrollToActiveYear, 50)
  }
}

onMounted(() => {
  fetchData()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

watch(() => route.params.year, (newYear) => {
  if (newYear) {
    year.value = Number(newYear)
    fetchData()
  }
})
</script>

<template>
  <main class="editorial-container animate-fade-in">
    <div class="editorial-header">
      <div class="label-micro delay-1 animate-slide-up">
        <RouterLink to="/history" class="back-link">&larr; {{ t('app.menu.history') }} {{ t('history.kicker') }}</RouterLink>
      </div>
      <h1 class="editorial-title delay-2 animate-slide-up">{{ year }}</h1>
      <p class="editorial-subtitle delay-3 animate-slide-up">
        {{ t('history.archiveCollection') }}
      </p>
    </div>

    <div class="wavy-timeline-wrapper delay-4 animate-slide-up">
      <div 
        class="wavy-timeline-scroll"
        ref="yearListRef"
        @mousedown="onMouseDown"
        @mouseleave="onMouseLeave"
        @mouseup="onMouseUp"
        @mousemove="onMouseMove"
        @scroll="onScroll"
      >
        <button 
          v-for="n in nodes" 
          :key="n.year"
          class="wavy-node"
          :class="{ 'is-active': n.year === year }"
          @click="handleSelect(n.year)"
        >
          <span class="wavy-year">{{ n.year }}</span>
        </button>
      </div>
    </div>

    <div class="divider-y delay-4 animate-slide-up"></div>

    <div class="year-layout delay-4 animate-slide-up">
      <section class="year-content">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <span>{{ t('history.loading') }}</span>
        </div>

        <div v-else-if="error" class="error-state">
          <p>{{ error }}</p>
        </div>

        <div v-else-if="data" class="archive-data">
          
          <!-- Events/Chronicles Section -->
          <div class="archive-section" v-if="data.events && data.events.length > 0">
            <h2 class="section-heading">{{ t('history.section.chronicles') }}</h2>
            <ChroniclesList 
              :chronicles="data.events" 
              :can-delete="canDeleteChronicle"
              @delete="handleDeleteChronicle"
              @edit="editingChronicle = $event"
              @select-work="openWorkReader" 
            />
          </div>

          <!-- Media Section -->
          <div class="archive-section" v-if="data.media.length > 0">
            <h2 class="section-heading" @click="router.push(`/media?year=${year}`)" style="cursor: pointer;">01 &mdash; {{ t('app.menu.media') }} <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 10px;">{{ t('history.viewAll') }}</span></h2>
            <MediaGallery 
              :media-list="data.media.slice(0, 10)" 
              group-by="month" 
              :can-delete="canDeleteMedia" 
              @delete="handleDeleteMedia" 
              @select="selectedMedia = $event" 
              @edit="editingMedia = $event"
            />
          </div>

          <!-- Works Section -->
          <div class="archive-section" v-if="data.works.length > 0">
            <h2 class="section-heading" @click="router.push(`/works?year=${year}`)" style="cursor: pointer;">02 &mdash; {{ t('app.menu.works') }} <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 10px;">{{ t('history.viewAll') }}</span></h2>
            <WorksGridModule 
              :works="data.works.slice(0, 3)" 
              group-by="month"
              :can-delete="canDeleteWork"
              @delete="handleDeleteWork"
              @edit="editingWork = $event"
              @select="openWorkReader" 
            />
          </div>

          <!-- Matches Section -->
          <div class="archive-section" v-if="data.matches.length > 0">
            <h2 class="section-heading">03 &mdash; {{ t('person.tabs.matches') }}</h2>
            <MatchesList 
              :matchesList="data.matches" 
              groupBy="month" 
              :can-delete="canDeleteMatch"
              @delete="handleDeleteMatch"
              @edit="editingMatch = $event"
            />
          </div>

          <div v-if="data.media.length === 0 && data.works.length === 0 && data.matches.length === 0 && (!data.events || data.events.length === 0)" class="empty-archive">
            <p class="empty-text">{{ t('history.noRecordsForYear', { year }) }}</p>
            <button class="minimal-btn" @click="router.push('/upload')">{{ t('history.contribute') }}</button>
          </div>

        </div>
      </section>
    </div>
  </main>

  <!-- Lightbox -->
  <Transition name="fade">
    <div v-if="selectedMedia" class="lightbox" @click="selectedMedia = null">
      <div class="lightbox-content" @click.stop>
        <img 
          v-if="selectedMedia.type === 'PHOTO'" 
          :src="mediaService.getMediaFileUrl(selectedMedia.id)" 
          class="lightbox-media" 
          @dblclick="selectedMedia = null"
        />
        <video 
          v-else-if="selectedMedia.type === 'VIDEO'" 
          :src="mediaService.getMediaFileUrl(selectedMedia.id)" 
          class="lightbox-media" 
          controls 
          autoplay
          @dblclick="selectedMedia = null"
        ></video>
        <div class="lightbox-hint">{{ t('media.lightboxHint') }}</div>
        <RouterLink
          v-if="selectedMedia"
          :to="`/media/${selectedMedia.id}`"
          class="lightbox-link"
          :title="t('media.openDetailPage')"
          @click.stop
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        </RouterLink>
        <div class="lightbox-info" v-if="selectedMedia">
          <p v-if="selectedMedia.takenAt">{{ t('media.timeLabel') }}: {{ new Date(selectedMedia.takenAt).toLocaleString() }}</p>
          <p v-if="selectedMedia.personTags && selectedMedia.personTags.length > 0">
            {{ t('media.membersLabel') }}: {{ selectedMedia.personTags.map((p: any) => p.displayName).join(', ') }}
          </p>
        </div>
      </div>
    </div>
  </Transition>

  <WorkReader 
    :work="selectedWork" 
    :loading="readerLoading" 
    :can-delete="canDeleteWork"
    @delete="handleDeleteWork"
    @close="closeWorkReader" 
  />

  <MediaEditModal
    :media="editingMedia"
    @close="editingMedia = null"
    @updated="handleUpdatedMedia"
  />

  <WorkEditModal
    :work="editingWork"
    @close="editingWork = null"
    @updated="handleUpdatedWork"
  />

  <MatchEditModal
    :match="editingMatch"
    @close="editingMatch = null"
    @updated="handleUpdatedMatch"
  />

  <ChronicleEditModal
    :chronicle="editingChronicle"
    @close="editingChronicle = null"
    @updated="handleUpdatedChronicle"
  />
</template>

<style scoped>
.page {
  padding: 16px;
  max-width: 800px;
  margin: 0 auto;
}

.back-link {
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.3s ease;
}
.back-link:hover {
  color: var(--text-h);
}

.wavy-timeline-wrapper {
  margin: 2rem 0 1rem 0;
  width: 100%;
  position: relative;
  /* Use mask-image to fade out the edges */
  mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
  -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
}

@media (max-width: 768px) {
  .wavy-timeline-wrapper {
    margin: 1rem 0 0.5rem 0;
  }
}

.wavy-timeline-scroll {
  display: flex;
  overflow-x: auto;
  scrollbar-width: none;
  cursor: grab;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  
  /* CSS Scroll Snapping */
  scroll-snap-type: x mandatory;
  scroll-padding: 0 calc(50% - 60px);
  padding: 1rem calc(50% - 60px);
  
  background-image: url('data:image/svg+xml;utf8,<svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg"><path d="M0,20 Q30,0 60,20 T120,20" fill="none" stroke="%23d4d4d8" stroke-width="1.5"/></svg>');
  background-repeat: repeat-x;
  background-position: left center;
}

.wavy-timeline-scroll.is-dragging {
  cursor: grabbing;
  scroll-behavior: auto;
  /* Disable snapping while dragging so it feels fluid */
  scroll-snap-type: none;
}

.wavy-timeline-scroll::-webkit-scrollbar {
  display: none;
}

.wavy-node {
  flex: 0 0 120px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  scroll-snap-align: center;
}

.wavy-node:hover {
  transform: translateY(-4px);
}

.wavy-year {
  font-family: var(--serif);
  font-size: 1.5rem;
  color: var(--text-muted);
  transition: all 0.3s ease;
  background: transparent;
  padding: 0 12px;
}

.wavy-node:hover .wavy-year {
  color: var(--text-h);
}

.wavy-node.is-active .wavy-year {
  color: var(--text-h);
  font-size: 2.25rem;
  font-weight: 400;
}

.year-layout {
  display: flex;
  flex-direction: column;
  gap: 3rem;
  padding-top: 1rem;
}

@media (min-width: 768px) {
  .year-layout {
    flex-direction: column;
    gap: 2rem;
  }
}

.year-content {
  flex: 1;
  min-width: 0;
  padding-bottom: 8rem;
}

.archive-section {
  margin-bottom: 6rem;
}

.section-heading {
  font-family: var(--sans);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--text-h);
  border-bottom: 1px solid var(--border);
  padding-bottom: 1rem;
  margin-bottom: 2rem;
}

/* Works List */
.works-list {
  display: flex;
  flex-direction: column;
}

.work-row {
  display: flex;
  flex-direction: column;
  padding: 1.5rem 0;
  border-bottom: 1px solid var(--border);
  gap: 0.5rem;
  transition: background 0.3s ease;
}

.work-row:hover {
  background: var(--surface);
}

@media (min-width: 640px) {
  .work-row {
    flex-direction: row;
    align-items: flex-start;
    gap: 3rem;
    padding: 2rem 1rem;
  }
}

.work-meta {
  width: 100px;
  flex-shrink: 0;
}

.work-type {
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.work-details {
  flex: 1;
}

.work-title {
  font-family: var(--serif);
  font-size: 1.5rem;
  color: var(--text-h);
  margin-bottom: 0.5rem;
  font-weight: 400;
}

.work-author {
  font-family: var(--sans);
  font-size: 0.75rem;
  color: var(--text-muted);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}



/* Empty State */
.empty-archive {
  padding: 2rem 0;
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

.error-state {
  color: var(--error);
  font-family: var(--sans);
  padding: 2rem 0;
}

/* Lightbox styles */
.lightbox {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.95);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.lightbox-content {
  width: 100%;
  height: 100%;
  padding: 4rem 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.lightbox-media {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
  border-radius: 4px;
}

.lightbox-info {
  position: absolute;
  top: 4.5rem;
  left: 1.5rem;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(0, 0, 0, 0.6);
  padding: 1rem 1.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  pointer-events: none;
}
.lightbox-info p {
  margin: 0 0 0.5rem 0;
}
.lightbox-info p:last-child {
  margin: 0;
}

.lightbox-hint {
  position: absolute;
  top: 2rem;
  right: 6rem;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(0, 0, 0, 0.4);
  padding: 0.5rem 1rem;
  border-radius: 40px;
  font-size: 0.85rem;
  pointer-events: none;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  animation: fadeOut 3s forwards;
  animation-delay: 2s;
}

@keyframes fadeOut {
  to {
    opacity: 0;
    visibility: hidden;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.lightbox-link {
  position: absolute;
  top: 2rem;
  right: 2rem;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(0, 0, 0, 0.5);
  padding: 0.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
  z-index: 10;
}

.lightbox-link:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
