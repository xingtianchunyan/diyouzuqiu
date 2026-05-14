<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { membersService } from '../api/services/members.service'
import { mediaService } from '../api/services/media.service'
import { worksService } from '../api/services/works.service'
import { matchesService } from '../api/services/matches.service'
import { chroniclesService } from '../api/services/chronicles.service'
import { useMembersStore } from '../stores/members'
import { useMediaStore } from '../stores/media'
import { useWorksStore } from '../stores/works'
import { useMatchesStore } from '../stores/matches'
import OrganicDropdown from '../components/base/OrganicDropdown.vue'
import OrganicToggle from '../components/base/OrganicToggle.vue'
import ExifReader from 'exifreader'
import { useRoute } from 'vue-router'
import SmartImport from '../components/SmartImport.vue'
import DailyMaterialsPanel from '../components/DailyMaterialsPanel.vue'

const { t } = useI18n()
const route = useRoute()

const membersStore = useMembersStore()
const mediaStore = useMediaStore()
const worksStore = useWorksStore()
const matchesStore = useMatchesStore()

const currentTab = ref('MEMBER')
const tabs = computed(() => [
  { label: t('upload.member'), value: 'MEMBER' },
  { label: t('upload.media'), value: 'MEDIA' },
  { label: t('upload.work'), value: 'WORK' },
  { label: t('upload.match'), value: 'MATCH' },
  { label: t('upload.chronicle'), value: 'CHRONICLE' }
])

const tabsRef = ref<HTMLDivElement | null>(null)

const scrollTabIntoCenter = (tabValue: string, behavior: ScrollBehavior = 'smooth') => {
  const container = tabsRef.value
  if (!container) return
  const el = container.querySelector(`[data-tab="${tabValue}"]`) as HTMLElement | null
  if (!el) return

  const target = el.offsetLeft + el.offsetWidth / 2 - container.clientWidth / 2
  const max = container.scrollWidth - container.clientWidth
  const left = Math.max(0, Math.min(max, target))
  container.scrollTo({ left, behavior })
}

const setTab = async (tabValue: string) => {
  currentTab.value = tabValue
  await nextTick()
  scrollTabIntoCenter(tabValue)
}

const loading = ref(false)
const message = ref({ type: '', text: '' })

// Member Form
const memberForm = ref({
  displayName: '',
  team: '' as 'RED' | 'BLUE' | ''
})

// Media Form
const mediaForm = ref({
  files: [] as File[],
  takenAt: '',
  year: '' as number | '',
  personTagIds: [] as string[]
})

// Work Form
const workForm = ref({
  type: 'ARTICLE' as 'ARTICLE' | 'POEM',
  title: '',
  authorId: '',
  date: '',
  content: ''
})

// Match Form
const matchForm = ref({
  playedAt: '',
  redScore: 0,
  blueScore: 0,
  mvpMemberId: '' as string,
  participantIds: [] as string[]
})

// Chronicle Form
const chronicleForm = ref({
  title: '',
  happenedAt: '',
  description: '',
  file: null as File | null,
  memberIds: [] as string[],
  photoIds: [] as string[],
  videoIds: [] as string[],
  articleIds: [] as string[],
  poemIds: [] as string[],
  matchIds: [] as string[]
})

// Dropdown Options
const teamOptions = [
  { label: 'None', value: '' },
  { label: 'Red Team', value: 'RED' },
  { label: 'Blue Team', value: 'BLUE' }
]

const typeOptions = [
  { label: 'Article', value: 'ARTICLE' },
  { label: 'Poem', value: 'POEM' }
]

const memberOptions = computed(() => [
  { label: 'Unknown/None', value: '' },
  ...membersStore.members.map(m => ({ label: m.displayName, value: m.id }))
])

const participantOptions = computed(() => [
  ...membersStore.members.map(m => ({ label: `${m.displayName} (${m.team || 'None'})`, value: m.id }))
])

const photoOptions = computed(() => 
  mediaStore.mediaList.filter(m => m.type === 'PHOTO').map(m => ({
    label: m.originalFilename || `Photo ${m.id.substring(0, 8)}`,
    value: m.id
  }))
)

const videoOptions = computed(() => 
  mediaStore.mediaList.filter(m => m.type === 'VIDEO').map(m => ({
    label: m.originalFilename || `Video ${m.id.substring(0, 8)}`,
    value: m.id
  }))
)

const articleOptions = computed(() => 
  worksStore.works.filter(w => w.type === 'ARTICLE').map(w => ({
    label: w.title,
    value: w.id
  }))
)

const poemOptions = computed(() => 
  worksStore.works.filter(w => w.type === 'POEM').map(w => ({
    label: w.title,
    value: w.id
  }))
)

const matchOptions = computed(() => 
  matchesStore.matches.map(m => ({
    label: `${new Date(m.playedAt).toLocaleDateString()} - Red ${m.redScore}:${m.blueScore} Blue`,
    value: m.id
  }))
)

const onFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    mediaForm.value.files = Array.from(target.files)
  } else {
    mediaForm.value.files = []
  }
}

const onChronicleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    chronicleForm.value.file = target.files[0]
  }
}

const loadingMessage = ref('')

const normalizeToYmd = (value: string | undefined | null) => {
  const raw = (value || '').trim()
  if (!raw) return ''
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  if (m) return m[1]
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

const onWorkParsed = (data: { title?: string, content?: string, date?: string, description?: string }) => {
  if (data.title) workForm.value.title = data.title
  if (data.content) workForm.value.content = data.content
  if (data.date) {
    const ymd = normalizeToYmd(data.date)
    if (ymd) workForm.value.date = ymd
  }
}

const handleChronicleSelection = (selection: { photoIds: string[], videoIds: string[], articleIds: string[], poemIds: string[], matchIds: string[] }) => {
  chronicleForm.value.photoIds = selection.photoIds
  chronicleForm.value.videoIds = selection.videoIds
  chronicleForm.value.articleIds = selection.articleIds
  chronicleForm.value.poemIds = selection.poemIds
  chronicleForm.value.matchIds = selection.matchIds
}

const showMessage = (type: 'success' | 'error', text: string) => {
  message.value = { type, text }
  setTimeout(() => { message.value = { type: '', text: '' } }, 5000)
}

const submitMember = async () => {
  try {
    loading.value = true
    if (!memberForm.value.displayName) throw new Error('Display Name is required')
    await membersService.createMember({
      displayName: memberForm.value.displayName,
      team: memberForm.value.team || undefined
    })
    showMessage('success', t('upload.success'))
    memberForm.value = { displayName: '', team: '' }
    membersStore.fetchMembers() // refresh
  } catch (e: any) {
    showMessage('error', e.message || t('upload.error'))
  } finally {
    loading.value = false
  }
}

const submitMedia = async () => {
  try {
    loading.value = true
    if (mediaForm.value.files.length === 0) throw new Error('File(s) are required')

    let successCount = 0
    const totalCount = mediaForm.value.files.length

    for (let i = 0; i < totalCount; i++) {
      const file = mediaForm.value.files[i]
      loadingMessage.value = `Uploading ${i + 1} of ${totalCount}...`

      let finalTakenAt: Date | null = null
      
      if (mediaForm.value.takenAt) {
        finalTakenAt = new Date(mediaForm.value.takenAt)
      } else {
        // Auto-detect from EXIF
        try {
          const tags = await ExifReader.load(file)
          const dateTag = tags['DateTimeOriginal'] || tags['DateTimeDigitized'] || tags['DateTime'] || tags['CreationDate']
          if (dateTag && dateTag.description) {
            const dateStr = dateTag.description.toString()
            const parts = dateStr.split(/[: ]/)
            if (parts.length >= 6) {
              const y = parseInt(parts[0], 10)
              const m = parseInt(parts[1], 10) - 1
              const d = parseInt(parts[2], 10)
              const h = parseInt(parts[3], 10)
              const min = parseInt(parts[4], 10)
              const s = parseInt(parts[5], 10)
              finalTakenAt = new Date(y, m, d, h, min, s)
            }
          }
        } catch (err) {
          console.warn('EXIF parsing failed for', file.name, err)
        }

        // Fallback to file.lastModified
        if (!finalTakenAt || isNaN(finalTakenAt.getTime())) {
          finalTakenAt = new Date(file.lastModified)
        }
      }

      let finalYear = mediaForm.value.year || undefined
      if (!finalYear && finalTakenAt && !isNaN(finalTakenAt.getTime())) {
        finalYear = finalTakenAt.getFullYear()
      }

      const meta = {
        takenAt: finalTakenAt && !isNaN(finalTakenAt.getTime()) ? finalTakenAt.toISOString() : undefined,
        year: finalYear,
        personTagIds: mediaForm.value.personTagIds.length > 0 ? mediaForm.value.personTagIds : undefined
      }

      await mediaService.uploadMedia(file, meta)
      successCount++
    }

    showMessage('success', t('upload.success') + ` (${successCount} files)`)
    mediaForm.value = { files: [], takenAt: '', year: '', personTagIds: [] }
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  } catch (e: any) {
    showMessage('error', e.message || t('upload.error'))
  } finally {
    loading.value = false
    loadingMessage.value = ''
  }
}

const submitWork = async () => {
  try {
    loading.value = true
    if (!workForm.value.title || !workForm.value.content || !workForm.value.date) {
      throw new Error('Title, date and content are required')
    }
    await worksService.createWork({
      type: workForm.value.type,
      title: workForm.value.title,
      content: workForm.value.content,
      authorId: workForm.value.authorId || undefined,
      date: workForm.value.date
    })
    showMessage('success', t('upload.success'))
    workForm.value = { type: 'ARTICLE', title: '', content: '', authorId: '', date: '' }
  } catch (e: any) {
    showMessage('error', e.message || t('upload.error'))
  } finally {
    loading.value = false
  }
}

const submitMatch = async () => {
  try {
    loading.value = true
    if (!matchForm.value.playedAt) throw new Error('Played At is required')
    const participants = matchForm.value.participantIds.map(id => {
      const member = membersStore.members.find(m => m.id === id)
      return { memberId: id, side: member?.team || 'RED' } as any
    })
    await matchesService.createMatch({
      playedAt: new Date(matchForm.value.playedAt).toISOString(),
      redScore: matchForm.value.redScore,
      blueScore: matchForm.value.blueScore,
      mvpMemberId: matchForm.value.mvpMemberId || undefined,
      participantIds: participants
    })
    showMessage('success', t('upload.success'))
    matchForm.value = { playedAt: '', redScore: 0, blueScore: 0, mvpMemberId: '', participantIds: [] }
  } catch (e: any) {
    showMessage('error', e.message || t('upload.error'))
  } finally {
    loading.value = false
  }
}

const submitChronicle = async () => {
  try {
    loading.value = true
    if (!chronicleForm.value.title || !chronicleForm.value.happenedAt) {
      throw new Error('Title and date are required')
    }
    
    let mediaId = undefined
    if (chronicleForm.value.file) {
      const year = new Date(chronicleForm.value.happenedAt).getFullYear()
      const meta = { year }
      const res = await mediaService.uploadMedia(chronicleForm.value.file, meta)
      mediaId = res.data.id
    }
    
    await chroniclesService.createChronicle({
      title: chronicleForm.value.title,
      happenedAt: new Date(chronicleForm.value.happenedAt).toISOString(),
      description: chronicleForm.value.description || undefined,
      mediaId,
      memberIds: chronicleForm.value.memberIds,
      mediaAssetIds: [...chronicleForm.value.photoIds, ...chronicleForm.value.videoIds],
      workIds: [...chronicleForm.value.articleIds, ...chronicleForm.value.poemIds],
      matchIds: chronicleForm.value.matchIds
    })
    
    showMessage('success', t('upload.success'))
    chronicleForm.value = { 
      title: '', happenedAt: '', description: '', file: null, 
      memberIds: [], photoIds: [], videoIds: [], articleIds: [], poemIds: [], matchIds: [] 
    }
    const fileInputs = document.querySelectorAll('input[type="file"]')
    fileInputs.forEach(input => (input as HTMLInputElement).value = '')
  } catch (e: any) {
    showMessage('error', e.message || t('upload.error'))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  const queryTab = route.query.tab as string
  if (queryTab && tabs.value.some(t => t.value === queryTab)) {
    currentTab.value = queryTab
  }
  membersStore.fetchMembers()
  mediaStore.fetchMediaList()
  worksStore.fetchWorks()
  matchesStore.fetchMatches()
})

watch(() => route.query.tab, async (newTab) => {
  if (newTab && typeof newTab === 'string' && tabs.value.some(t => t.value === newTab)) {
    currentTab.value = newTab
    await nextTick()
    scrollTabIntoCenter(currentTab.value)
  }
})

watch(tabs, async () => {
  await nextTick()
  scrollTabIntoCenter(currentTab.value, 'auto')
}, { deep: true })

watch(currentTab, async () => {
  await nextTick()
  scrollTabIntoCenter(currentTab.value)
})
</script>

<template>
  <main class="editorial-container animate-fade-in">
    <div class="editorial-header">
      <div class="label-micro delay-1 animate-slide-up">DATA ENTRY</div>
      <h1 class="editorial-title delay-2 animate-slide-up">{{ t('app.menu.upload') }}</h1>
      <p class="editorial-subtitle delay-3 animate-slide-up">Contribute to the collective archive</p>
    </div>

    <div class="tabs-minimal delay-4 animate-slide-up" ref="tabsRef">
      <button 
        v-for="tab in tabs" 
        :key="tab.value"
        class="tab-btn"
        :data-tab="tab.value"
        :class="{ 'is-active': currentTab === tab.value }"
        @click="setTab(tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="divider-y delay-4 animate-slide-up"></div>

    <div v-if="message.text" :class="['alert', `alert-${message.type}`, 'delay-4', 'animate-slide-up']">
      {{ message.text }}
    </div>

    <div class="form-wrapper delay-4 animate-slide-up">
      <!-- Member Form -->
      <form v-if="currentTab === 'MEMBER'" @submit.prevent="submitMember" class="editorial-form">
        <div class="form-group">
          <label class="form-label">DISPLAY NAME *</label>
          <input v-model="memberForm.displayName" type="text" class="form-input" required />
        </div>
        <div class="form-group">
          <label class="form-label">TEAM</label>
          <OrganicDropdown v-model="memberForm.team" :options="teamOptions" placeholder="None" />
        </div>
        <button type="submit" class="editorial-btn" :disabled="loading">
          <span v-if="loading">{{ loadingMessage || '...' }}</span>
          <span v-else>{{ t('upload.submit') }}</span>
        </button>
      </form>

      <!-- Media Form -->
      <form v-if="currentTab === 'MEDIA'" @submit.prevent="submitMedia" class="editorial-form">
        <div class="form-group">
          <label class="form-label">FILES *</label>
          <input type="file" @change="onFileChange" class="form-file" accept="image/*,video/*" multiple required />
          <small class="help-text">You can select multiple files. Dates and years will be auto-extracted from file EXIF.</small>
        </div>
        <div class="form-group">
          <label class="form-label">TAKEN AT (OVERRIDE)</label>
          <input v-model="mediaForm.takenAt" type="datetime-local" class="form-input" />
          <small class="help-text">Leave blank to use original photo dates.</small>
        </div>
        <div class="form-group">
          <label class="form-label">YEAR (OVERRIDE)</label>
          <input v-model.number="mediaForm.year" type="number" class="form-input" placeholder="YYYY" />
        </div>
        <div class="form-group">
          <label class="form-label">SUBJECT TAGS</label>
          <OrganicDropdown v-model="mediaForm.personTagIds" :options="memberOptions" :multiple="true" placeholder="Select tags..." />
          <small class="help-text">Click to select multiple</small>
        </div>
        <button type="submit" class="editorial-btn" :disabled="loading">
          <span v-if="loading">...</span>
          <span v-else>{{ t('upload.submit') }}</span>
        </button>
      </form>

      <!-- Work Form -->
      <SmartImport v-if="currentTab === 'WORK'" :targetType="currentTab" @parsed="onWorkParsed" />
      <form v-if="currentTab === 'WORK'" @submit.prevent="submitWork" class="editorial-form">
        <div class="form-group">
          <label class="form-label">TYPE *</label>
          <OrganicToggle v-model="workForm.type" :options="typeOptions" />
        </div>
        <div class="form-group">
          <label class="form-label">TITLE *</label>
          <input v-model="workForm.title" type="text" class="form-input" required />
        </div>
        <div class="form-group">
          <label class="form-label">AUTHOR</label>
          <OrganicDropdown v-model="workForm.authorId" :options="memberOptions" placeholder="Unknown" />
        </div>
        <div class="form-group">
          <label class="form-label">DATE (YYYY-MM-DD) *</label>
          <input type="date" v-model="workForm.date" class="form-input" required />
        </div>
        <div class="form-group">
          <label class="form-label">CONTENT *</label>
          <textarea v-model="workForm.content" class="form-textarea" rows="8" required></textarea>
        </div>
        <button type="submit" class="editorial-btn" :disabled="loading">
          <span v-if="loading">...</span>
          <span v-else>{{ t('upload.submit') }}</span>
        </button>
      </form>

      <!-- Match Form -->
      <form v-if="currentTab === 'MATCH'" @submit.prevent="submitMatch" class="editorial-form">
        <div class="form-group">
          <label class="form-label">PLAYED AT *</label>
          <input v-model="matchForm.playedAt" type="datetime-local" class="form-input" required />
        </div>
        <div class="score-row">
          <div class="form-group flex-1">
            <label class="form-label">RED SCORE *</label>
            <input v-model.number="matchForm.redScore" type="number" class="form-input" required min="0" />
          </div>
          <div class="form-group flex-1">
            <label class="form-label">BLUE SCORE *</label>
            <input v-model.number="matchForm.blueScore" type="number" class="form-input" required min="0" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">MVP</label>
          <OrganicDropdown v-model="matchForm.mvpMemberId" :options="memberOptions" placeholder="None" />
        </div>
        <div class="form-group">
          <label class="form-label">PARTICIPANTS</label>
          <OrganicDropdown v-model="matchForm.participantIds" :options="participantOptions" :multiple="true" placeholder="Select participants..." />
          <small class="help-text">Click to select multiple</small>
        </div>
        <button type="submit" class="editorial-btn" :disabled="loading">
          <span v-if="loading">...</span>
          <span v-else>{{ t('upload.submit') }}</span>
        </button>
      </form>

      <!-- Chronicle Form -->
      <form v-if="currentTab === 'CHRONICLE'" @submit.prevent="submitChronicle" class="editorial-form">
        <div class="form-group">
          <label class="form-label">TITLE *</label>
          <input v-model="chronicleForm.title" type="text" class="form-input" required />
        </div>
        <div class="form-group">
          <label class="form-label">HAPPENED AT *</label>
          <input v-model="chronicleForm.happenedAt" type="date" class="form-input" required />
        </div>
        <div class="form-group">
          <label class="form-label">DESCRIPTION</label>
          <textarea v-model="chronicleForm.description" class="form-textarea" rows="4"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">MEDIA (IMAGE/VIDEO)</label>
          <input type="file" @change="onChronicleFileChange" class="form-file" accept="image/*,video/*" />
        </div>

        <DailyMaterialsPanel 
          v-if="chronicleForm.happenedAt" 
          :date="chronicleForm.happenedAt" 
          @update:selection="handleChronicleSelection" 
        />

        <div class="divider-y"></div>
        <p class="editorial-subtitle">ASSOCIATIONS</p>

        <div class="form-group">
          <label class="form-label">ASSOCIATED MEMBERS</label>
          <OrganicDropdown v-model="chronicleForm.memberIds" :options="memberOptions" :multiple="true" placeholder="Select members..." />
        </div>

        <div class="form-group">
          <label class="form-label">ASSOCIATED PHOTOS</label>
          <OrganicDropdown v-model="chronicleForm.photoIds" :options="photoOptions" :multiple="true" placeholder="Select photos..." />
        </div>

        <div class="form-group">
          <label class="form-label">ASSOCIATED VIDEOS</label>
          <OrganicDropdown v-model="chronicleForm.videoIds" :options="videoOptions" :multiple="true" placeholder="Select videos..." />
        </div>

        <div class="form-group">
          <label class="form-label">ASSOCIATED ARTICLES</label>
          <OrganicDropdown v-model="chronicleForm.articleIds" :options="articleOptions" :multiple="true" placeholder="Select articles..." />
        </div>

        <div class="form-group">
          <label class="form-label">ASSOCIATED POEMS</label>
          <OrganicDropdown v-model="chronicleForm.poemIds" :options="poemOptions" :multiple="true" placeholder="Select poems..." />
        </div>

        <div class="form-group">
          <label class="form-label">ASSOCIATED MATCHES</label>
          <OrganicDropdown v-model="chronicleForm.matchIds" :options="matchOptions" :multiple="true" placeholder="Select matches..." />
        </div>

        <button type="submit" class="editorial-btn" :disabled="loading">
          <span v-if="loading">...</span>
          <span v-else>{{ t('upload.submit') }}</span>
        </button>
      </form>
    </div>
  </main>
</template>

<style scoped>
.editorial-container {
  max-width: 600px;
}

.tabs-minimal {
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
  overflow-x: auto;
  scrollbar-width: none;
  scroll-snap-type: x mandatory;
  scroll-padding: 0 50%;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}
.tabs-minimal::-webkit-scrollbar {
  display: none;
}

.tab-btn {
  background: transparent;
  border: none;
  padding: 0;
  padding-bottom: 0.25rem;
  font-family: var(--sans);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--text-muted);
  cursor: pointer;
  position: relative;
  transition: color 0.3s ease;
  white-space: nowrap;
  scroll-snap-align: center;
}

.tab-btn::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 1px;
  background: var(--text-h);
  transform: scaleX(0);
  transform-origin: right;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.tab-btn:hover {
  color: var(--text-h);
}

.tab-btn.is-active {
  color: var(--text-h);
  font-weight: 500;
}

.tab-btn.is-active::after {
  transform: scaleX(1);
  transform-origin: left;
}

.form-wrapper {
  margin-top: 3rem;
  position: relative;
  z-index: 50;
}

.editorial-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.score-row {
  display: flex;
  gap: 2rem;
}

.flex-1 {
  flex: 1;
}

.form-label {
  font-family: var(--sans);
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--text-muted);
}

.form-input, .form-select, .form-textarea {
  width: 100%;
  box-sizing: border-box;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border-strong);
  border-radius: 0;
  font-family: var(--sans);
  font-size: 1.1rem;
  color: var(--text-h);
  padding: 0.5rem 0;
  outline: none;
  transition: border-color 0.3s ease;
}

.form-input:focus, .form-select:focus, .form-textarea:focus {
  border-color: var(--brand);
}

.form-select {
  appearance: none;
  cursor: pointer;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2318181b%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right center;
  background-size: 0.65rem auto;
  padding-right: 1.5rem;
}

.form-select.multi-select {
  background-image: none;
  padding-right: 0;
  min-height: 120px;
}

.form-textarea {
  resize: vertical;
  line-height: 1.6;
}

.form-file {
  font-family: var(--sans);
  font-size: 0.9rem;
  color: var(--text-h);
  padding: 0.5rem 0;
}

.form-file::file-selector-button {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-h);
  padding: 0.5rem 1rem;
  margin-right: 1rem;
  font-family: var(--sans);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 40px;
}

.form-file::file-selector-button:hover {
  background: var(--text-h);
  color: var(--surface);
}

.help-text {
  font-family: var(--mono);
  font-size: 0.65rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}

.editorial-btn {
  margin-top: 2rem;
  width: 100%;
  background: transparent;
  color: var(--text-h);
  border: 1px solid var(--text-h);
  border-radius: 0;
  padding: 1.25rem;
  font-family: var(--sans);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.editorial-btn:hover:not(:disabled) {
  background: var(--text-h);
  color: var(--surface);
}

.editorial-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.alert {
  padding: 1rem 1.5rem;
  font-family: var(--sans);
  font-size: 0.85rem;
  border-left: 2px solid transparent;
  background: var(--surface-hover);
  margin-bottom: 2rem;
}

.alert-success {
  border-color: #166534;
  color: #166534;
}

.alert-error {
  border-color: var(--error);
  color: var(--error);
}
</style>
