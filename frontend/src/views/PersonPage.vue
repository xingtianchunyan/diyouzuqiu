<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { membersService, type MemberDetail } from '../api/services/members.service'
import { mediaService, type Media } from '../api/services/media.service'
import { worksService, type Work } from '../api/services/works.service'
import { matchesService, type Match } from '../api/services/matches.service'
import { chroniclesService } from '../api/services/chronicles.service'
import { useAuthStore } from '../stores/auth'
import EmptyState from '../components/base/EmptyState.vue'
import WorksGridModule from '@/components/works/WorksGridModule.vue'
import WorksCollectionModule, { type WorksTypeFilter } from '@/components/works/WorksCollectionModule.vue'
import WorkReader from '@/components/works/WorkReader.vue'
import MatchesList from '@/components/matches/MatchesList.vue'
import ChroniclesList from '@/components/chronicles/ChroniclesList.vue'
import PersonTabs from '@/components/people/PersonTabs.vue'
import MonthGroupHeading from '@/components/base/MonthGroupHeading.vue'

const props = defineProps<{
  id: string | number
}>()

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()

const id = computed(() => String(route.params.id ?? ''))
const person = ref<MemberDetail | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const activeTab = ref<'chronicles' | 'media' | 'works' | 'matches'>('chronicles')
const mediaList = ref<Media[]>([])
const worksList = ref<Work[]>([])
const worksTabType = ref<WorksTypeFilter>('ALL')
const worksSearchQuery = ref('')

const filteredWorksList = computed(() => {
  let list = worksList.value
  if (worksTabType.value !== 'ALL') {
    list = list.filter(w => w.type === worksTabType.value)
  }
  if (worksSearchQuery.value) {
    const q = worksSearchQuery.value.toLowerCase()
    list = list.filter(w => w.title.toLowerCase().includes(q) || (w.content && w.content.toLowerCase().includes(q)))
  }
  return list
})
const matchesList = ref<Match[]>([])
const chroniclesList = ref<any[]>([])

const selectedMedia = ref<Media | null>(null)
const selectedWork = ref<Work | null>(null)
const readerLoading = ref(false)

const canEdit = computed(() => {
  if (!authStore.user) return false
  return authStore.user.role === 'ADMIN' || authStore.user.memberId === id.value
})

const onAvatarChange = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const res = await membersService.uploadAvatar(id.value, file)
    if (person.value) {
      person.value.avatarUrl = res.data.avatarUrl
    }
  } catch (err: any) {
    alert(err.response?.data?.error?.message || 'Failed to upload avatar')
  }
}

const canDeleteMedia = (item: Media) => {
  if (!authStore.user) return false
  if (authStore.user.role === 'ADMIN') return true
  if (item.createdByUserId === authStore.user.id) return true
  
  if (!authStore.user.memberId) return false
  // Can only delete if this is the only tagged person and it's me
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
  if (confirm('确认删除这张照片吗？此操作不可恢复。')) {
    try {
      await mediaService.deleteMedia(mediaId)
      mediaList.value = mediaList.value.filter(m => m.id !== mediaId)
      if (person.value && (person.value.mediaCount ?? 0) > 0) {
        person.value.mediaCount = (person.value.mediaCount ?? 0) - 1
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete media')
    }
  }
}

const handleDeleteWork = async (work: Work) => {
  if (confirm('确认删除该作品吗？此操作不可恢复。')) {
    try {
      await worksService.deleteWork(work.id)
      worksList.value = worksList.value.filter(w => w.id !== work.id)
      if (selectedWork.value?.id === work.id) selectedWork.value = null
      if (person.value && (person.value.worksCount ?? 0) > 0) {
        person.value.worksCount = (person.value.worksCount ?? 0) - 1
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete work')
    }
  }
}

const handleDeleteMatch = async (match: Match) => {
  if (confirm('确认删除该比赛记录吗？此操作不可恢复。')) {
    try {
      await matchesService.deleteMatch(match.id)
      matchesList.value = matchesList.value.filter(m => m.id !== match.id)
      if (person.value && (person.value.matchesCount ?? 0) > 0) {
        person.value.matchesCount = (person.value.matchesCount ?? 0) - 1
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete match')
    }
  }
}

const handleDeleteChronicle = async (chronicle: any) => {
  if (confirm('确认删除该纪事吗？此操作不可恢复。')) {
    try {
      await chroniclesService.deleteChronicle(chronicle.id)
      chroniclesList.value = chroniclesList.value.filter(c => c.id !== chronicle.id)
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete chronicle')
    }
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && selectedMedia.value) {
    selectedMedia.value = null
  }
}

const loadPerson = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await membersService.getMemberDetail(id.value)
    person.value = res.data

    const [chroniclesRes, mediaRes, worksRes, matchesRes] = await Promise.all([
      chroniclesService.getChronicles({ memberId: id.value }),
      mediaService.getMediaList({ personId: id.value }),
      worksService.getWorks({ authorId: id.value }),
      matchesService.getMatches({ memberId: id.value })
    ])
    chroniclesList.value = chroniclesRes.data as any[]
    mediaList.value = mediaRes.data
    worksList.value = worksRes.data
    matchesList.value = matchesRes.data
  } catch (err: any) {
    error.value = err.message || 'Failed to load person details'
  } finally {
    loading.value = false
  }
}

const groupedMedia = computed(() => {
  const groups: Record<string, Media[]> = {}
  for (const m of mediaList.value) {
    const d = m.takenAt ? new Date(m.takenAt) : null
    let key = 'Unknown Date'
    if (d && !isNaN(d.getTime())) {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    } else if (m.year) {
      key = `${m.year}-01`
    }
    if (!groups[key]) groups[key] = []
    groups[key].push(m)
  }
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0])).map(([label, items]) => ({ label, items }))
})



const openWorkReader = async (workId: string) => {
  try {
    readerLoading.value = true
    const res = await worksService.getWorkDetail(workId)
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

const goBack = () => {
  router.back()
}

onMounted(async () => {
  loadPerson()
  window.addEventListener('keydown', handleKeydown)
})

watch(id, () => {
  activeTab.value = 'chronicles'
  loadPerson()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <main class="page">
    <div class="header">
      <button class="back-btn" @click="goBack">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      </button>
      <h1 class="page-title">{{ person?.displayName || 'Loading...' }}</h1>
    </div>

    <div v-if="loading" class="loading">Loading...</div>
    <EmptyState v-else-if="error" :title="error" :description="'Unable to load person details'" />
    <EmptyState v-else-if="!person" title="Person Not Found" description="The requested person could not be found." />
    <template v-else>
      <!-- Fixed Header Section -->
      <div class="profile-header">
        <div class="avatar-large" :class="{ 'has-img': !!person.avatarUrl }">
            <img 
              v-if="person.avatarUrl" 
              :src="person.avatarUrl" 
              class="avatar-img" 
              @error="(e) => { (e.target as HTMLImageElement).style.display = 'none'; person!.avatarUrl = null }"
            />
            <span v-else>{{ person.displayName.charAt(0).toUpperCase() }}</span>
            
            <label v-if="canEdit" class="edit-avatar-btn">
              修改头像
              <input type="file" @change="onAvatarChange" accept="image/*" style="display: none" />
            </label>
          </div>
          <div class="profile-info">
            <h2>
              {{ person.displayName }}
              <span v-if="person.isCaptain" class="captain-badge" title="队长">👑</span>
            </h2>
            <div class="tags">
              <span v-if="person.team" class="tag" :class="person.team.toLowerCase()">
                {{ person.team === 'RED' ? t('people.red') : t('people.blue') }}
              </span>
            </div>
          </div>
        </div>

      <!-- Dynamic Archive Section -->
      <PersonTabs 
        v-model:active-tab="activeTab"
          :chronicles-count="chroniclesList.length"
          :media-count="person.mediaCount || 0"
          :works-count="person.worksCount || 0"
          :matches-count="person.matchesCount || 0"
        />

        <div class="archive-content">
          <div v-if="activeTab === 'chronicles'">
            <ChroniclesList 
              :chronicles="chroniclesList" 
              :can-delete="canDeleteChronicle"
              @delete="handleDeleteChronicle"
              @select-work="openWorkReader" 
            />
          </div>

          <!-- Media Tab -->
          <div v-else-if="activeTab === 'media'">
            <div v-if="groupedMedia.length === 0" class="empty-archive">
              <p class="empty-text">No media records found.</p>
            </div>
            <div v-else>
              <div v-for="group in groupedMedia" :key="group.label" class="media-month-group">
                <MonthGroupHeading :label="group.label" />
                <div class="media-gallery">
                  <div v-for="item in group.items" :key="item.id" class="media-frame" @click="selectedMedia = item">
                    <img :src="`/api/v1/media/${item.id}/file`" alt="Media" class="media-img" v-if="item.type === 'PHOTO'" loading="lazy" />
                    <video :src="`/api/v1/media/${item.id}/file`" class="media-video" v-else-if="item.type === 'VIDEO'" controls preload="metadata"></video>

                    <button
                      v-if="canDeleteMedia(item)"
                      class="delete-media-btn"
                      @click.stop="handleDeleteMedia(item.id)"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Works Tab -->
          <div v-else-if="activeTab === 'works'">
            <WorksCollectionModule
              class="person-works-filter"
              v-model:type="worksTabType"
              v-model:query="worksSearchQuery"
            />
            <div class="divider-y"></div>
            <WorksGridModule 
              :works="filteredWorksList" 
              group-by="month" 
              :can-delete="canDeleteWork"
              @delete="handleDeleteWork"
              @select="openWorkReader" 
            />
          </div>

          <!-- Matches Tab -->
          <div v-else-if="activeTab === 'matches'">
            <MatchesList 
              :matchesList="matchesList" 
              groupBy="month" 
              :highlightMvpId="id" 
              :can-delete="canDeleteMatch"
              @delete="handleDeleteMatch"
            />
          </div>
        </div>
    </template>

    <WorkReader 
      :work="selectedWork" 
      :loading="readerLoading" 
      :can-delete="canDeleteWork"
      @delete="handleDeleteWork"
      @close="closeWorkReader" 
    />
  </main>

  <!-- Lightbox -->
  <Transition name="fade">
    <div v-if="selectedMedia" class="lightbox" @click="selectedMedia = null">
      <div class="lightbox-content" @click.stop>
        <img
          v-if="selectedMedia.type === 'PHOTO'"
          :src="`/api/v1/media/${selectedMedia.id}/file`"
          class="lightbox-media"
          @dblclick="selectedMedia = null"
        />
        <video
          v-else-if="selectedMedia.type === 'VIDEO'"
          :src="`/api/v1/media/${selectedMedia.id}/file`"
          class="lightbox-media"
          controls
          autoplay
          @dblclick="selectedMedia = null"
        ></video>
        <div class="lightbox-hint">✌️ 双指缩放，双击关闭</div>
        <div class="lightbox-info" v-if="selectedMedia">
          <p v-if="selectedMedia.takenAt">{{ t('upload.media') }} Time: {{ new Date(selectedMedia.takenAt).toLocaleString() }}</p>
          <p v-if="selectedMedia.personTags && selectedMedia.personTags.length > 0">
            Members: {{ selectedMedia.personTags.map((p: any) => p.displayName).join(', ') }}
          </p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.page {
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
  padding: 16px;
  box-sizing: border-box;
  overflow-x: hidden;
}
.header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}
.back-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text);
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;
}
.back-btn:hover {
  background: var(--surface);
}
.page-title {
  font-size: 24px;
  font-weight: bold;
  margin: 0;
}
.loading, .error {
  text-align: center;
  padding: 32px;
  color: var(--text-muted);
}
.error {
  color: var(--danger);
}
.archive-content {
  width: 100%;
  overflow-x: hidden;
  margin-top: 24px;
}
.person-works-filter {
  margin-bottom: 1.5rem;
}
.divider-y {
  height: 1px;
  background: var(--border);
  margin-bottom: 2rem;
  width: 100%;
}
.profile-header {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 32px;
}
.avatar-large {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: var(--brand-2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  font-weight: bold;
  position: relative;
  overflow: hidden;
}
.avatar-large.has-img {
  background: transparent;
  padding: 0;
}
.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.edit-avatar-btn {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0,0,0,0.6);
  color: #fff;
  font-size: 0.7rem;
  text-align: center;
  padding: 4px 0;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.3s ease;
}
.avatar-large:hover .edit-avatar-btn {
  opacity: 1;
}
.captain-badge {
  font-size: 1.5rem;
  margin-left: 0.5rem;
  vertical-align: middle;
}
.profile-info h2 {
  margin: 0 0 12px 0;
  font-size: 28px;
}
.tags {
  display: flex;
  gap: 12px;
}
.tag {
  font-size: 14px;
  padding: 4px 12px;
  border-radius: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
}
.tag.red {
  color: #e53e3e;
  border-color: #fc8181;
  background: #fff5f5;
}
.tag.blue {
  color: #3182ce;
  border-color: #63b3ed;
  background: #ebf8ff;
}
.tag.family {
  color: var(--text-muted);
}

.archive-section {
  margin-top: 2rem;
}
.section-heading {
  font-size: 1rem;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.5rem;
}
.media-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 2px;
}
.media-frame {
  aspect-ratio: 1;
  background: var(--surface-hover);
  overflow: hidden;
  position: relative;
  cursor: pointer;
  border: 1px solid #000;
}
.media-img, .media-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}
.media-frame:hover .media-img,
.media-frame:hover .media-video {
  transform: scale(1.03);
}

.delete-media-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(229, 57, 53, 0.9);
  color: white;
  border: none;
  border-radius: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease, transform 0.2s ease;
  z-index: 10;
}
.delete-media-btn:hover {
  transform: scale(1.1);
}
.media-frame:hover .delete-media-btn {
  opacity: 1;
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
  margin: 0;
}


</style>
