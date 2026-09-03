<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { membersService, type MemberDetail, type MemberStats } from '../api/services/members.service'
import { mediaService, type Media } from '../api/services/media.service'
import { worksService, type Work } from '../api/services/works.service'
import { matchesService, type Match } from '../api/services/matches.service'
import { chroniclesService } from '../api/services/chronicles.service'
import { useAuthStore } from '../stores/auth'
import { useFamiliesStore } from '../stores/families'
import EmptyState from '../components/base/EmptyState.vue'
import WorksGridModule from '@/components/works/WorksGridModule.vue'
import WorksCollectionModule, { type WorksTypeFilter } from '@/components/works/WorksCollectionModule.vue'
import WorkReader from '@/components/works/WorkReader.vue'
import MatchesList from '@/components/matches/MatchesList.vue'
import ChroniclesList from '@/components/chronicles/ChroniclesList.vue'
import PersonTabs from '@/components/people/PersonTabs.vue'
import WorkEditModal from '@/components/works/WorkEditModal.vue'
import MatchEditModal from '@/components/matches/MatchEditModal.vue'
import ChronicleEditModal from '@/components/chronicles/ChronicleEditModal.vue'
import MonthGroupHeading from '@/components/base/MonthGroupHeading.vue'
import MediaEditModal from '@/components/media/MediaEditModal.vue'
import MemberEditModal from '@/components/members/MemberEditModal.vue'

const props = defineProps<{
  id: string | number
}>()

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const familiesStore = useFamiliesStore()

const id = computed(() => String(route.params.id ?? ''))
const person = ref<MemberDetail | null>(null)
const stats = ref<MemberStats | null>(null)
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
const editingMedia = ref<Media | null>(null)
const selectedWork = ref<Work | null>(null)
const editingWork = ref<Work | null>(null)
const editingMatch = ref<Match | null>(null)
const editingChronicle = ref<any>(null)
const editingMember = ref<MemberDetail | null>(null)
const readerLoading = ref(false)

const handleUpdatedMedia = (updated: Media) => {
  const index = mediaList.value.findIndex(m => m.id === updated.id)
  if (index !== -1) {
    mediaList.value[index] = { ...mediaList.value[index], ...updated }
  }
  if (selectedMedia.value?.id === updated.id) {
    selectedMedia.value = { ...selectedMedia.value, ...updated }
  }
}

const handleUpdatedWork = (updated: Work) => {
  const index = worksList.value.findIndex(w => w.id === updated.id)
  if (index !== -1) {
    worksList.value[index] = { ...worksList.value[index], ...updated }
  }
  if (selectedWork.value?.id === updated.id) {
    selectedWork.value = { ...selectedWork.value, ...updated }
  }
}

const handleUpdatedMatch = (updated: Match) => {
  const index = matchesList.value.findIndex(m => m.id === updated.id)
  if (index !== -1) {
    matchesList.value[index] = { ...matchesList.value[index], ...updated }
  }
}

const handleUpdatedChronicle = (updated: any) => {
  const index = chroniclesList.value.findIndex(c => c.id === updated.id)
  if (index !== -1) {
    chroniclesList.value[index] = { ...chroniclesList.value[index], ...updated }
  }
}

// Admin edits may include baseline abilities: copy them too so the radar refreshes in place.
const handleUpdatedMember = (updated: MemberDetail) => {
  if (person.value) {
    person.value.displayName = updated.displayName
    person.value.team = updated.team
    person.value.familyId = updated.familyId
    person.value.isCaptain = updated.isCaptain
    for (const key of ABILITY_KEYS) {
      if (updated[key] !== undefined) person.value[key] = updated[key]
    }
  }
}

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
    alert(err.response?.data?.error?.message || t('errors.uploadAvatarFailed'))
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
  if (confirm(t('person.confirmDeleteMedia'))) {
    try {
      await mediaService.deleteMedia(mediaId)
      mediaList.value = mediaList.value.filter(m => m.id !== mediaId)
      if (person.value && (person.value.mediaCount ?? 0) > 0) {
        person.value.mediaCount = (person.value.mediaCount ?? 0) - 1
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || t('errors.deleteMediaFailed'))
    }
  }
}

const handleDeleteWork = async (work: Work) => {
  if (confirm(t('person.confirmDeleteWork'))) {
    try {
      await worksService.deleteWork(work.id)
      worksList.value = worksList.value.filter(w => w.id !== work.id)
      if (selectedWork.value?.id === work.id) selectedWork.value = null
      if (person.value && (person.value.worksCount ?? 0) > 0) {
        person.value.worksCount = (person.value.worksCount ?? 0) - 1
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || t('errors.deleteWorkFailed'))
    }
  }
}

const handleDeleteMatch = async (match: Match) => {
  if (confirm(t('person.confirmDeleteMatch'))) {
    try {
      await matchesService.deleteMatch(match.id)
      matchesList.value = matchesList.value.filter(m => m.id !== match.id)
      if (person.value && (person.value.matchesCount ?? 0) > 0) {
        person.value.matchesCount = (person.value.matchesCount ?? 0) - 1
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || t('errors.deleteMatchFailed'))
    }
  }
}

const handleDeleteChronicle = async (chronicle: any) => {
  if (confirm(t('person.confirmDeleteChronicle'))) {
    try {
      await chroniclesService.deleteChronicle(chronicle.id)
      chroniclesList.value = chroniclesList.value.filter(c => c.id !== chronicle.id)
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

const loadPerson = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await membersService.getMemberDetail(id.value)
    person.value = res.data

    // Career stats feed the bar under the card; a stats failure must not blank the page.
    membersService.getMemberStats(id.value)
      .then(r => { stats.value = r.data })
      .catch(() => { stats.value = null })

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
    error.value = err.message || t('errors.loadPersonFailed')
  } finally {
    loading.value = false
  }
}

/* ============ FIFA-style player card: abilities radar ============ */
// Field names mirror the API exactly (GET /members/:id): 0-99, default 60.
const ABILITY_KEYS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'stamina'] as const
type AbilityKey = typeof ABILITY_KEYS[number]

const abilityValue = (key: AbilityKey): number => {
  const raw = person.value?.[key]
  const v = typeof raw === 'number' && !isNaN(raw) ? raw : 60
  return Math.min(99, Math.max(0, v))
}

const overallRating = computed(() =>
  Math.round(ABILITY_KEYS.reduce((sum, k) => sum + abilityValue(k), 0) / ABILITY_KEYS.length)
)

const RADAR_SIZE = 220
const RADAR_CENTER = RADAR_SIZE / 2
const RADAR_RADIUS = 78
const RADAR_LABEL_RADIUS = 100

const radarPointAt = (index: number, radius: number) => {
  const angle = (-90 + index * 60) * Math.PI / 180
  return {
    x: RADAR_CENTER + radius * Math.cos(angle),
    y: RADAR_CENTER + radius * Math.sin(angle)
  }
}

const radarGridRings = [0.25, 0.5, 0.75, 1].map(f =>
  ABILITY_KEYS.map((_, i) => radarPointAt(i, RADAR_RADIUS * f))
    .map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')
)

const radarAxes = ABILITY_KEYS.map((_, i) => radarPointAt(i, RADAR_RADIUS))

const radarValuePoints = computed(() =>
  ABILITY_KEYS.map((k, i) => radarPointAt(i, RADAR_RADIUS * abilityValue(k) / 99))
    .map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')
)

const radarValueDots = computed(() =>
  ABILITY_KEYS.map((k, i) => radarPointAt(i, RADAR_RADIUS * abilityValue(k) / 99))
)

const radarLabels = ABILITY_KEYS.map((k, i) => ({ key: k, ...radarPointAt(i, RADAR_LABEL_RADIUS) }))

const winRatePercent = computed(() => Math.round((stats.value?.winRate ?? 0) * 100))

const personInitial = computed(() => (person.value?.displayName?.charAt(0) || '?').toUpperCase())

/* ============ Pseudo-3D tilt (transform only, pointer-fine devices) ============ */
const cardScene = ref<HTMLElement | null>(null)
const tiltX = ref(0)
const tiltY = ref(0)
// Live mouse-follow only on hover-capable fine pointers with motion allowed;
// touch devices get a static micro-tilt from CSS instead.
const tiltEnabled = ref(false)

const onCardPointerMove = (e: PointerEvent) => {
  if (!tiltEnabled.value || !cardScene.value) return
  const rect = cardScene.value.getBoundingClientRect()
  const px = (e.clientX - rect.left) / rect.width - 0.5
  const py = (e.clientY - rect.top) / rect.height - 0.5
  tiltY.value = px * 10
  tiltX.value = -py * 8
}

const resetTilt = () => {
  tiltX.value = 0
  tiltY.value = 0
}

const cardTransform = computed(() =>
  tiltEnabled.value
    ? `rotateX(${tiltX.value.toFixed(2)}deg) rotateY(${tiltY.value.toFixed(2)}deg)`
    : undefined
)

const groupedMedia = computed(() => {
  const groups: Record<string, Media[]> = {}
  for (const m of mediaList.value) {
    const d = m.takenAt ? new Date(m.takenAt) : null
    let key = t('common.unknownDate')
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
    // Silent: reader will show empty state
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
  familiesStore.fetchFamilies()
  loadPerson()
  window.addEventListener('keydown', handleKeydown)
  tiltEnabled.value =
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    window.matchMedia('(prefers-reduced-motion: no-preference)').matches
})

watch(id, () => {
  activeTab.value = 'chronicles'
  stats.value = null
  loadPerson()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <main class="arena-theme person-page">
    <!-- Ambient pitch glow: pure CSS, transform/opacity only -->
    <div class="pp-fx" aria-hidden="true">
      <div class="fx-mow"></div>
      <div class="fx-glow fx-glow--green"></div>
      <div class="fx-glow fx-glow--gold"></div>
    </div>

    <div class="pp-container">
      <header class="pp-topbar rise d1">
        <button class="pp-back" type="button" :aria-label="t('common.close')" @click="goBack">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <span class="pp-kicker">{{ $t('person.playerCard') }}</span>
      </header>

      <div v-if="loading" class="pp-status">{{ $t('common.loading') }}</div>
      <EmptyState v-else-if="error" :title="error" :description="$t('person.loadErrorDescription')" />
      <EmptyState v-else-if="!person" :title="$t('person.notFoundTitle')" :description="$t('person.notFoundDescription')" />
      <template v-else>
        <!-- ===== Pseudo-3D player card ===== -->
        <section
          ref="cardScene"
          class="card-scene rise d2"
          @pointermove="onCardPointerMove"
          @pointerleave="resetTilt"
        >
          <div class="player-card" :class="{ 'is-live': tiltEnabled }" :style="cardTransform ? { transform: cardTransform } : undefined">
            <div class="pc-frame" aria-hidden="true"></div>
            <div class="pc-sheen" aria-hidden="true"></div>

            <div class="pc-head">
              <div class="pc-ovr">
                <span class="pc-ovr-num">{{ overallRating }}</span>
                <span class="pc-ovr-label">{{ $t('person.overall') }}</span>
              </div>
              <div class="pc-side">
                <span v-if="person.team" class="pc-team" :class="person.team.toLowerCase()">
                  {{ person.team === 'RED' ? $t('people.red') : $t('people.blue') }}
                </span>
                <span v-if="person.isCaptain" class="pc-captain" :title="$t('people.captain')">👑 {{ $t('people.captain') }}</span>
              </div>
            </div>

            <div class="pc-avatar" :class="{ 'has-img': !!person.avatarUrl }">
              <img
                v-if="person.avatarUrl"
                :src="person.avatarUrl"
                class="pc-avatar-img"
                :alt="person.displayName"
                @error="(e) => { (e.target as HTMLImageElement).style.display = 'none'; person!.avatarUrl = null }"
              />
              <span v-else class="pc-initial">{{ personInitial }}</span>

              <label v-if="canEdit" class="pc-avatar-edit">
                {{ $t('person.changeAvatar') }}
                <input type="file" @change="onAvatarChange" accept="image/*" style="display: none" />
              </label>
            </div>

            <h2 class="pc-name">{{ person.displayName }}</h2>
            <div class="pc-tags">
              <span v-if="person.familyId" class="pc-tag">
                {{ familiesStore.familyById[person.familyId] || $t('people.family') }}
              </span>
            </div>

            <!-- Hand-rolled SVG hexagon radar: no chart library -->
            <svg
              class="pc-radar"
              :viewBox="`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`"
              role="img"
              :aria-label="$t('people.stats')"
            >
              <polygon
                v-for="(ring, i) in radarGridRings"
                :key="`ring-${i}`"
                :points="ring"
                class="radar-ring"
              />
              <line
                v-for="(axis, i) in radarAxes"
                :key="`axis-${i}`"
                :x1="RADAR_CENTER"
                :y1="RADAR_CENTER"
                :x2="axis.x"
                :y2="axis.y"
                class="radar-axis"
              />
              <polygon :points="radarValuePoints" class="radar-value" />
              <circle
                v-for="(dot, i) in radarValueDots"
                :key="`dot-${i}`"
                :cx="dot.x"
                :cy="dot.y"
                r="2.4"
                class="radar-dot"
              />
              <text
                v-for="label in radarLabels"
                :key="`label-${label.key}`"
                :x="label.x"
                :y="label.y"
                class="radar-label"
                text-anchor="middle"
                dominant-baseline="middle"
              >{{ $t(`person.abilities.${label.key}`) }}</text>
            </svg>

            <button v-if="canEdit" class="pc-edit-btn" type="button" @click="editingMember = person">
              {{ $t('person.editProfile') }}
            </button>
          </div>
        </section>

        <!-- ===== Career stats strip (GET /members/:id/stats) ===== -->
        <section v-if="stats" class="stats-bar rise d3" :aria-label="$t('person.stats.title')">
          <p class="stats-title">{{ $t('person.stats.title') }}</p>
          <div class="stats-grid">
            <div class="stat-cell">
              <span class="stat-num">{{ stats.appearances }}</span>
              <span class="stat-label">{{ $t('person.stats.appearances') }}</span>
            </div>
            <div class="stat-cell">
              <span class="stat-num">{{ stats.wins }}</span>
              <span class="stat-label">{{ $t('person.stats.wins') }}</span>
            </div>
            <div class="stat-cell">
              <span class="stat-num stat-num--green">{{ winRatePercent }}%</span>
              <span class="stat-label">{{ $t('person.stats.winRate') }}</span>
            </div>
            <div class="stat-cell">
              <span class="stat-num stat-num--gold">{{ stats.mvpCount }}</span>
              <span class="stat-label">{{ $t('person.stats.mvp') }}</span>
            </div>
          </div>
        </section>

        <!-- ===== Dynamic Archive Section ===== -->
        <PersonTabs
          class="rise d4"
          v-model:active-tab="activeTab"
          :chronicles-count="chroniclesList.length"
          :media-count="person.mediaCount || 0"
          :works-count="person.worksCount || 0"
          :matches-count="person.matchesCount || 0"
        />

        <div class="archive-content rise d4">
          <div v-if="activeTab === 'chronicles'">
            <ChroniclesList
              :chronicles="chroniclesList"
              :can-delete="canDeleteChronicle"
              @delete="handleDeleteChronicle"
              @edit="editingChronicle = $event"
              @select-work="openWorkReader"
            />
          </div>

          <!-- Media Tab -->
          <div v-else-if="activeTab === 'media'">
            <div v-if="groupedMedia.length === 0" class="empty-archive">
              <p class="empty-text">{{ $t('person.noMedia') }}</p>
            </div>
            <div v-else>
              <div v-for="group in groupedMedia" :key="group.label" class="media-month-group">
                <MonthGroupHeading :label="group.label" />
                <div class="media-gallery">
                  <div v-for="item in group.items" :key="item.id" class="media-frame" @click="selectedMedia = item">
                    <img :src="mediaService.getMediaFileUrl(item.id)" :alt="$t('media.alt')" class="media-img" v-if="item.type === 'PHOTO'" loading="lazy" />
                    <video :src="mediaService.getMediaFileUrl(item.id)" class="media-video" v-else-if="item.type === 'VIDEO'" controls preload="metadata" playsinline muted></video>

                    <div v-if="canDeleteMedia(item)" class="media-actions">
                      <button
                        class="edit-media-btn"
                        @click.stop="editingMedia = item"
                        :title="$t('common.edit')"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      </button>
                      <button
                        class="delete-media-btn"
                        @click.stop="handleDeleteMedia(item.id)"
                        :title="$t('common.delete')"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                      </button>
                    </div>
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
              @edit="editingWork = $event"
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
              @edit="editingMatch = $event"
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
    </div>
  </main>

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

  <MemberEditModal
    :member="editingMember"
    @close="editingMember = null"
    @updated="handleUpdatedMember"
  />

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
          playsinline
          muted
          @dblclick="selectedMedia = null"
        ></video>
        <div class="lightbox-hint">{{ $t('media.lightboxHint') }}</div>
        <RouterLink
          v-if="selectedMedia"
          :to="`/media/${selectedMedia.id}`"
          class="lightbox-link"
          :title="$t('media.openDetailPage')"
          @click.stop
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        </RouterLink>
        <div class="lightbox-info" v-if="selectedMedia">
          <p v-if="selectedMedia.takenAt">{{ $t('media.timeLabel') }}: {{ new Date(selectedMedia.takenAt).toLocaleString() }}</p>
          <p v-if="selectedMedia.personTags && selectedMedia.personTags.length > 0">
            {{ $t('media.membersLabel') }}: {{ selectedMedia.personTags.map((p: any) => p.displayName).join(', ') }}
          </p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ============ Page-level arena tokens (never :root) ============ */
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
     (PersonTabs, lists, empty states, dropdowns) read dark here */
  --bg: #05080a;
  --surface: #0a120d;
  --surface-hover: rgba(255, 255, 255, 0.06);
  --text-h: var(--arena-text);
  --text: rgba(238, 243, 238, 0.82);
  --text-muted: var(--arena-muted);
  --border: var(--arena-line);
  --border-strong: rgba(255, 255, 255, 0.22);

  position: relative;
  overflow: hidden;
  min-height: 100dvh;
  color: var(--arena-text);
  background:
    radial-gradient(1100px 520px at 85% -10%, rgba(232, 199, 102, 0.07), transparent 60%),
    radial-gradient(1000px 720px at 8% 112%, rgba(31, 122, 72, 0.2), transparent 65%),
    linear-gradient(180deg, #05080a 0%, #08130e 52%, #05080a 100%);
}

/* ============ Ambient FX (transform/opacity only) ============ */
.pp-fx {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.fx-mow {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.022) 0 90px,
    rgba(255, 255, 255, 0) 90px 180px
  );
}

.fx-glow {
  position: absolute;
  border-radius: 50%;
  will-change: transform;
}

.fx-glow--green {
  width: 62vmax;
  height: 62vmax;
  top: -24vmax;
  left: -18vmax;
  background: radial-gradient(closest-side, rgba(46, 180, 100, 0.18), transparent 70%);
  animation: drift-green 26s ease-in-out infinite alternate;
}

.fx-glow--gold {
  width: 48vmax;
  height: 48vmax;
  right: -16vmax;
  bottom: -18vmax;
  background: radial-gradient(closest-side, rgba(232, 199, 102, 0.1), transparent 70%);
  animation: drift-gold 32s ease-in-out infinite alternate;
}

@keyframes drift-green {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(9vmax, 6vmax, 0); }
}

@keyframes drift-gold {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(-7vmax, -5vmax, 0); }
}

/* ============ Layout ============ */
.pp-container {
  position: relative;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
  padding-left: calc(16px + var(--safe-left));
  padding-right: calc(16px + var(--safe-right));
  padding-bottom: calc(3rem + var(--safe-bottom));
  box-sizing: border-box;
  overflow-x: hidden;
}

.pp-topbar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-top: calc(1rem + var(--safe-top));
  padding-bottom: 1.25rem;
}

.pp-back {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--arena-line);
  border-radius: 50%;
  cursor: pointer;
  color: var(--arena-text);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.pp-back:active {
  transform: scale(0.94);
  background: rgba(255, 255, 255, 0.12);
}

.pp-kicker {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  font-family: var(--sans);
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--arena-green);
}

.pp-kicker::before {
  content: '';
  width: 26px;
  height: 1px;
  background: linear-gradient(90deg, var(--arena-green), transparent);
  flex-shrink: 0;
}

.pp-status {
  text-align: center;
  padding: 32px;
  color: var(--arena-muted);
}

/* ============ Pseudo-3D player card ============ */
.card-scene {
  perspective: 1200px;
  margin-bottom: 1.5rem;
}

.player-card {
  position: relative;
  max-width: 360px;
  margin: 0 auto;
  padding: 1.4rem 1.4rem 1.6rem;
  box-sizing: border-box;
  border-radius: 18px;
  border: 1px solid rgba(232, 199, 102, 0.5);
  background:
    radial-gradient(420px 200px at 85% -8%, rgba(232, 199, 102, 0.14), transparent 60%),
    radial-gradient(360px 260px at 8% 108%, rgba(61, 220, 132, 0.12), transparent 65%),
    linear-gradient(165deg, #0c1a12 0%, #08130e 45%, #05080a 100%);
  box-shadow:
    0 18px 48px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  transform-style: preserve-3d;
  will-change: transform;
}

.player-card.is-live {
  transition: transform 0.18s ease-out;
}

/* Touch devices (no hover): static micro-tilt instead of mouse follow */
@media (hover: none) {
  .player-card:not(.is-live) {
    transform: rotateX(2deg) rotateY(-3deg);
  }
}

/* Inner gold hairline frame (layered card face) */
.pc-frame {
  position: absolute;
  inset: 8px;
  border: 1px solid rgba(232, 199, 102, 0.28);
  border-radius: 12px;
  pointer-events: none;
}

/* Moving sheen across the foil face, gated by reduced-motion below */
.pc-sheen {
  position: absolute;
  inset: 0;
  border-radius: 18px;
  overflow: hidden;
  pointer-events: none;
}

.pc-sheen::after {
  content: '';
  position: absolute;
  top: -20%;
  bottom: -20%;
  left: 0;
  width: 40%;
  background: linear-gradient(
    100deg,
    transparent,
    rgba(255, 255, 255, 0.05) 45%,
    rgba(255, 255, 255, 0.09) 50%,
    rgba(255, 255, 255, 0.05) 55%,
    transparent
  );
  transform: translateX(-140%) skewX(-10deg);
}

.pc-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.pc-ovr {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
}

.pc-ovr-num {
  font-family: var(--font-display);
  font-size: 2.6rem;
  letter-spacing: 0.02em;
  color: var(--arena-gold);
  text-shadow: 0 2px 14px rgba(232, 199, 102, 0.3);
}

.pc-ovr-label {
  margin-top: 2px;
  font-family: var(--sans);
  font-size: 0.58rem;
  font-weight: 500;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--arena-muted);
}

.pc-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.pc-team {
  font-family: var(--font-display);
  font-size: 0.85rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid var(--arena-line);
}

.pc-team.red {
  color: #ff8f8a;
  border-color: rgba(255, 143, 138, 0.45);
  background: rgba(255, 143, 138, 0.08);
}

.pc-team.blue {
  color: #7cc4ff;
  border-color: rgba(124, 196, 255, 0.45);
  background: rgba(124, 196, 255, 0.08);
}

.pc-captain {
  font-family: var(--sans);
  font-size: 0.62rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--arena-gold);
}

.pc-avatar {
  width: 128px;
  height: 128px;
  margin: 0.9rem auto 0;
  border-radius: 50%;
  border: 2px solid rgba(232, 199, 102, 0.65);
  background: linear-gradient(160deg, var(--arena-green-deep) 0%, #0a2316 70%);
  box-shadow:
    0 8px 28px rgba(0, 0, 0, 0.5),
    0 0 24px rgba(61, 220, 132, 0.18),
    inset 0 0 0 4px rgba(5, 8, 10, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.pc-avatar.has-img {
  background: transparent;
}

.pc-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pc-initial {
  font-family: var(--font-display);
  font-size: 3.2rem;
  color: var(--arena-text);
  text-shadow: 0 2px 12px rgba(61, 220, 132, 0.35);
}

.pc-avatar-edit {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(5, 8, 10, 0.78);
  color: #fff;
  font-size: 0.7rem;
  text-align: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.pc-avatar:hover .pc-avatar-edit,
.pc-avatar:focus-within .pc-avatar-edit {
  opacity: 1;
}

/* Coarse pointers have no hover: keep the edit affordance reachable */
@media (hover: none) {
  .pc-avatar-edit {
    opacity: 1;
  }
}

.pc-name {
  margin: 0.9rem 0 0;
  font-family: var(--font-display);
  font-weight: 400;
  font-size: 1.9rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-align: center;
  color: var(--arena-text);
}

.pc-tags {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 0.55rem;
}

.pc-tag {
  font-family: var(--sans);
  font-size: 0.72rem;
  padding: 4px 12px;
  border-radius: 999px;
  color: var(--arena-muted);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--arena-line);
}

/* ============ Hand-rolled SVG radar ============ */
.pc-radar {
  display: block;
  width: min(78vw, 250px);
  height: auto;
  margin: 1rem auto 0;
}

.radar-ring {
  fill: none;
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 1;
}

.radar-axis {
  stroke: rgba(255, 255, 255, 0.07);
  stroke-width: 1;
}

.radar-value {
  fill: rgba(61, 220, 132, 0.22);
  stroke: var(--arena-green);
  stroke-width: 1.6;
  stroke-linejoin: round;
}

.radar-dot {
  fill: var(--arena-gold);
}

.radar-label {
  font-family: var(--sans);
  font-size: 9.5px;
  letter-spacing: 0.12em;
  fill: var(--arena-muted);
  text-transform: uppercase;
}

.pc-edit-btn {
  display: block;
  margin: 1.1rem auto 0;
  min-height: 44px;
  padding: 0.5rem 1.4rem;
  background: transparent;
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  color: var(--arena-muted);
  font-family: var(--sans);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, transform 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.pc-edit-btn:active {
  transform: scale(0.96);
  border-color: var(--arena-green);
  color: var(--arena-green);
}

/* ============ Career stats strip ============ */
.stats-bar {
  max-width: 480px;
  margin: 0 auto 1.75rem;
  padding: 0.95rem 1.1rem 1.05rem;
  border-radius: 14px;
  border: 1px solid var(--arena-line);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.015));
  box-sizing: border-box;
}

.stats-title {
  margin: 0 0 0.7rem;
  font-family: var(--sans);
  font-size: 0.62rem;
  font-weight: 500;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--arena-faint);
  text-align: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.stat-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-width: 0;
}

.stat-num {
  font-family: var(--font-display);
  font-size: 1.5rem;
  line-height: 1;
  color: var(--arena-text);
}

.stat-num--green {
  color: var(--arena-green);
}

.stat-num--gold {
  color: var(--arena-gold);
}

.stat-label {
  font-family: var(--sans);
  font-size: 0.6rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--arena-muted);
  text-align: center;
}

/* ============ Archive area ============ */
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

.media-actions {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 10;
}

.media-frame:hover .media-actions,
.media-frame:focus-within .media-actions {
  opacity: 1;
}

@media (hover: none) {
  .media-actions {
    opacity: 1;
  }
}

.edit-media-btn,
.delete-media-btn {
  background: rgba(5, 8, 10, 0.72);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  transition: transform 0.2s ease, background 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.edit-media-btn:hover {
  background: rgba(31, 122, 72, 0.9);
  transform: scale(1.1);
}

.delete-media-btn:hover {
  background: rgba(153, 27, 27, 0.9);
  transform: scale(1.1);
}

@media (hover: hover) and (pointer: fine) {
  .edit-media-btn,
  .delete-media-btn {
    width: 32px;
    height: 32px;
    border-radius: 6px;
  }
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

.lightbox-link {
  position: absolute;
  top: 2rem;
  right: 2rem;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(0, 0, 0, 0.5);
  width: 44px;
  height: 44px;
  box-sizing: border-box;
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

/* ============ Entrance & motion gating ============ */
@media (prefers-reduced-motion: no-preference) {
  .rise {
    animation: rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .d1 { animation-delay: 0.05s; }
  .d2 { animation-delay: 0.14s; }
  .d3 { animation-delay: 0.24s; }
  .d4 { animation-delay: 0.32s; }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(18px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  .pc-sheen::after {
    animation: sheen 7s linear infinite;
  }

  @keyframes sheen {
    from { transform: translateX(-140%) skewX(-10deg); }
    to { transform: translateX(380%) skewX(-10deg); }
  }
}

@media (prefers-reduced-motion: reduce) {
  .fx-glow {
    animation: none;
  }
}
</style>
