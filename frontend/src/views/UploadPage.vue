<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { membersService } from '../api/services/members.service'
import { mediaService } from '../api/services/media.service'
import { worksService } from '../api/services/works.service'
import { matchesService } from '../api/services/matches.service'
import { chroniclesService } from '../api/services/chronicles.service'
import { useMembersStore } from '../stores/members'
import { useFamiliesStore } from '../stores/families'
import { useMediaStore } from '../stores/media'
import { useWorksStore } from '../stores/works'
import { useMatchesStore } from '../stores/matches'
import OrganicDropdown from '../components/base/OrganicDropdown.vue'
import OrganicToggle from '../components/base/OrganicToggle.vue'
import ExifReader from 'exifreader'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import SmartImport from '../components/SmartImport.vue'
import DailyMaterialsPanel from '../components/DailyMaterialsPanel.vue'
import MarkdownEditor from '../components/editor/MarkdownEditor.vue'

const { t } = useI18n()
const route = useRoute()
const authStore = useAuthStore()

const membersStore = useMembersStore()
const familiesStore = useFamiliesStore()
const mediaStore = useMediaStore()
const worksStore = useWorksStore()
const matchesStore = useMatchesStore()

const tabs = computed(() => [
  { label: t('upload.tabs.member'), value: 'MEMBER' },
  { label: t('upload.tabs.media'), value: 'MEDIA' },
  { label: t('upload.tabs.work'), value: 'WORK' },
  { label: t('upload.tabs.match'), value: 'MATCH' },
  { label: t('upload.tabs.chronicle'), value: 'CHRONICLE' }
])

const visibleTabs = computed(() => {
  if (authStore.user?.role === 'ADMIN') return tabs.value
  return tabs.value.filter(t => t.value !== 'MEMBER')
})

const defaultTab = computed(() => visibleTabs.value[0]?.value || 'MEDIA')
const currentTab = ref(defaultTab.value)

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
  if (!visibleTabs.value.some(t => t.value === tabValue)) return
  currentTab.value = tabValue
  await nextTick()
  scrollTabIntoCenter(tabValue)
}

const loading = ref(false)
const message = ref({ type: '', text: '' })

// Member Form
const memberForm = ref({
  displayName: '',
  team: '' as 'RED' | 'BLUE' | '',
  familyId: ''
})

const newFamilyLabel = ref('')
const creatingFamily = ref(false)

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
  authorName: '',
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
const todayYmd = new Date().toISOString().slice(0, 10)
const chronicleForm = ref({
  title: '',
  happenedAt: todayYmd,
  description: '',
  file: null as File | null,
  memberIds: [] as string[],
  photoIds: [] as string[],
  videoIds: [] as string[],
  articleIds: [] as string[],
  poemIds: [] as string[],
  matchIds: [] as string[]
})
const showChronicleAdvanced = ref(false)

// Dropdown Options
const teamOptions = computed(() => [
  { label: t('common.team.none'), value: '' },
  { label: t('common.team.red'), value: 'RED' },
  { label: t('common.team.blue'), value: 'BLUE' }
])

const typeOptions = computed(() => [
  { label: t('works.articles'), value: 'ARTICLE' },
  { label: t('works.poems'), value: 'POEM' }
])

const memberOptions = computed(() => [
  { label: t('works.form.unknownAuthor'), value: '' },
  ...membersStore.members.map(m => ({ label: m.displayName, value: m.id }))
])

const familyOptions = computed(() => [
  { label: t('people.form.noFamily'), value: '' },
  ...familiesStore.families.map(f => ({ label: f.label, value: f.id }))
])

const participantOptions = computed(() => [
  ...membersStore.members.map(m => ({
    label: `${m.displayName} (${m.team ? t(`common.team.${m.team.toLowerCase()}`) : t('common.team.none')})`,
    value: m.id
  }))
])

const photoOptions = computed(() =>
  mediaStore.mediaList.filter(m => m.type === 'PHOTO').map(m => ({
    label: m.originalFilename || t('media.fallbackPhoto', { id: m.id.substring(0, 8) }),
    value: m.id
  }))
)

const videoOptions = computed(() =>
  mediaStore.mediaList.filter(m => m.type === 'VIDEO').map(m => ({
    label: m.originalFilename || t('media.fallbackVideo', { id: m.id.substring(0, 8) }),
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
    label: t('matches.optionLabel', {
      date: new Date(m.playedAt).toLocaleDateString(),
      redScore: m.redScore,
      blueScore: m.blueScore
    }),
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
  // ISO / slash / dot date anywhere in the string
  const iso = raw.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`
  }
  // Chinese date: 2024年05月20日
  const cn = raw.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/)
  if (cn) {
    return `${cn[1]}-${cn[2].padStart(2, '0')}-${cn[3].padStart(2, '0')}`
  }
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

const onWorkParsed = (data: { title?: string, content?: string, date?: string, description?: string, author?: string }) => {
  console.log('[SmartImport] parsed:', data)
  if (data.title) workForm.value.title = data.title.trim()
  if (data.content) workForm.value.content = data.content.trim()
  if (data.date) {
    const ymd = normalizeToYmd(data.date)
    console.log('[SmartImport] normalized date:', ymd, 'from', data.date)
    if (ymd) workForm.value.date = ymd
  }
  if (data.author) {
    const name = data.author.trim()
    const matched = membersStore.members.find(m =>
      m.displayName.trim().toLowerCase() === name.toLowerCase()
    )
    if (matched) {
      workForm.value.authorId = matched.id
      workForm.value.authorName = ''
    } else {
      workForm.value.authorId = ''
      workForm.value.authorName = name
    }
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

const createFamily = async () => {
  const label = newFamilyLabel.value.trim()
  if (!label) return
  try {
    creatingFamily.value = true
    const family = await familiesStore.createFamily(label)
    memberForm.value.familyId = family.id
    newFamilyLabel.value = ''
    showMessage('success', t('upload.familyCreated', { label: family.label }))
  } catch (e: any) {
    showMessage('error', e.response?.data?.error?.message || e.message || t('errors.createFamilyFailed'))
  } finally {
    creatingFamily.value = false
  }
}

const submitMember = async () => {
  try {
    loading.value = true
    if (!memberForm.value.displayName) throw new Error(t('errors.displayNameRequired'))
    await membersService.createMember({
      displayName: memberForm.value.displayName,
      team: memberForm.value.team || undefined,
      familyId: memberForm.value.familyId || undefined
    })
    showMessage('success', t('upload.success'))
    memberForm.value = { displayName: '', team: '', familyId: '' }
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
    if (mediaForm.value.files.length === 0) throw new Error(t('errors.mediaFilesRequired'))

    let successCount = 0
    const totalCount = mediaForm.value.files.length

    for (let i = 0; i < totalCount; i++) {
      const file = mediaForm.value.files[i]
      loadingMessage.value = t('upload.uploadingProgress', { n: i + 1, total: totalCount })

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
          // EXIF parsing failed: fall back to file.lastModified
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

    showMessage('success', t('upload.success') + ' ' + t('upload.filesCount', { n: successCount }))
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
      throw new Error(t('errors.workRequiredFields'))
    }
    await worksService.createWork({
      type: workForm.value.type,
      title: workForm.value.title,
      content: workForm.value.content,
      authorId: workForm.value.authorName ? undefined : workForm.value.authorId || undefined,
      authorName: workForm.value.authorName?.trim() || undefined,
      date: workForm.value.date
    })
    showMessage('success', t('upload.success'))
    workForm.value = { type: 'ARTICLE', title: '', content: '', authorId: '', authorName: '', date: '' }
  } catch (e: any) {
    showMessage('error', e.message || t('upload.error'))
  } finally {
    loading.value = false
  }
}

const submitMatch = async () => {
  try {
    loading.value = true
    if (!matchForm.value.playedAt) throw new Error(t('errors.playedAtRequired'))
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
      throw new Error(t('errors.chronicleRequiredFields'))
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
      title: '', happenedAt: new Date().toISOString().slice(0, 10), description: '', file: null, 
      memberIds: [], photoIds: [], videoIds: [], articleIds: [], poemIds: [], matchIds: [] 
    }
    showChronicleAdvanced.value = false
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
  if (queryTab && visibleTabs.value.some(t => t.value === queryTab)) {
    currentTab.value = queryTab
  } else {
    currentTab.value = defaultTab.value
  }
  familiesStore.fetchFamilies()
  membersStore.fetchMembers()
  mediaStore.fetchMediaList()
  worksStore.fetchWorks()
  matchesStore.fetchMatches()
})

watch(() => route.query.tab, async (newTab) => {
  if (newTab && typeof newTab === 'string' && visibleTabs.value.some(t => t.value === newTab)) {
    currentTab.value = newTab
    await nextTick()
    scrollTabIntoCenter(currentTab.value)
  }
})

watch(visibleTabs, async () => {
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
      <div class="label-micro delay-1 animate-slide-up">{{ t('upload.kicker') }}</div>
      <h1 class="editorial-title delay-2 animate-slide-up">{{ t('app.menu.upload') }}</h1>
      <p class="editorial-subtitle delay-3 animate-slide-up">{{ t('upload.subtitle') }}</p>
    </div>

    <div class="tabs-minimal delay-4 animate-slide-up" ref="tabsRef">
      <button 
        v-for="tab in visibleTabs" 
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
          <label class="form-label">{{ t('upload.member.displayName') }}</label>
          <input v-model="memberForm.displayName" type="text" class="form-input" required />
        </div>
        <div class="form-group">
          <label class="form-label">{{ t('upload.member.team') }}</label>
          <OrganicDropdown v-model="memberForm.team" :options="teamOptions" :placeholder="t('common.team.none')" />
        </div>
        <div class="form-group">
          <label class="form-label">{{ t('upload.member.family') }}</label>
          <OrganicDropdown v-model="memberForm.familyId" :options="familyOptions" :placeholder="t('people.form.noFamily')" />
          <div v-if="!memberForm.familyId" class="family-creator">
            <input
              v-model="newFamilyLabel"
              type="text"
              class="form-input"
              :placeholder="t('upload.member.newFamilyPlaceholder')"
              @keydown.enter.prevent="createFamily"
            />
            <button
              type="button"
              class="action-btn"
              :disabled="!newFamilyLabel.trim() || creatingFamily"
              @click="createFamily"
            >
              <span v-if="creatingFamily">...</span>
              <span v-else>{{ t('upload.member.createFamily') }}</span>
            </button>
          </div>
        </div>
        <button type="submit" class="editorial-btn" :disabled="loading">
          <span v-if="loading">{{ loadingMessage || '...' }}</span>
          <span v-else>{{ t('upload.submit') }}</span>
        </button>
      </form>

      <!-- Media Form -->
      <form v-if="currentTab === 'MEDIA'" @submit.prevent="submitMedia" class="editorial-form">
        <div class="form-group">
          <label class="form-label">{{ t('upload.media.files') }}</label>
          <input type="file" @change="onFileChange" class="form-file" accept="image/*,video/*" multiple required />
          <small class="help-text">{{ t('upload.media.help') }}</small>
        </div>
        <div class="form-group">
          <label class="form-label">{{ t('upload.media.takenAt') }}</label>
          <input v-model="mediaForm.takenAt" type="datetime-local" class="form-input" />
          <small class="help-text">{{ t('upload.media.takenAtHelp') }}</small>
        </div>
        <div class="form-group">
          <label class="form-label">{{ t('upload.media.year') }}</label>
          <input v-model.number="mediaForm.year" type="number" class="form-input" :placeholder="t('media.form.yearPlaceholder')" />
        </div>
        <div class="form-group">
          <label class="form-label">{{ t('upload.media.personTags') }}</label>
          <OrganicDropdown v-model="mediaForm.personTagIds" :options="memberOptions" :multiple="true" :placeholder="t('media.form.selectTags')" />
          <small class="help-text">{{ t('upload.media.tagsHelp') }}</small>
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
          <label class="form-label">{{ t('upload.work.type') }}</label>
          <OrganicToggle v-model="workForm.type" :options="typeOptions" />
        </div>
        <div class="form-group">
          <label class="form-label">{{ t('upload.work.title') }}</label>
          <input v-model="workForm.title" type="text" class="form-input" required />
        </div>
        <div class="form-group">
          <label class="form-label">{{ t('upload.work.author') }}</label>
          <OrganicDropdown
            v-model="workForm.authorId"
            :options="memberOptions"
            :placeholder="t('works.form.selectAuthor')"
            @change="workForm.authorName = ''"
          />
          <input
            v-model="workForm.authorName"
            type="text"
            class="form-input author-name-input"
            :placeholder="t('works.form.orNewAuthor')"
            @input="workForm.authorId = ''"
          />
        </div>
        <div class="form-group">
          <label class="form-label">{{ t('upload.work.date') }}</label>
          <input type="date" v-model="workForm.date" class="form-input" required />
        </div>
        <div class="form-group">
          <label class="form-label">{{ t('upload.work.content') }}</label>
          <MarkdownEditor v-model="workForm.content" :placeholder="t('works.form.contentPlaceholder')" />
        </div>
        <button type="submit" class="editorial-btn" :disabled="loading">
          <span v-if="loading">...</span>
          <span v-else>{{ t('upload.submit') }}</span>
        </button>
      </form>

      <!-- Match Form -->
      <form v-if="currentTab === 'MATCH'" @submit.prevent="submitMatch" class="editorial-form">
        <div class="form-group">
          <label class="form-label">{{ t('upload.match.playedAt') }}</label>
          <input v-model="matchForm.playedAt" type="datetime-local" class="form-input" required />
        </div>
        <div class="score-row">
          <div class="form-group flex-1">
            <label class="form-label">{{ t('upload.match.redScore') }}</label>
            <input v-model.number="matchForm.redScore" type="number" class="form-input" required min="0" />
          </div>
          <div class="form-group flex-1">
            <label class="form-label">{{ t('upload.match.blueScore') }}</label>
            <input v-model.number="matchForm.blueScore" type="number" class="form-input" required min="0" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">{{ t('upload.match.mvp') }}</label>
          <OrganicDropdown v-model="matchForm.mvpMemberId" :options="memberOptions" :placeholder="t('common.team.none')" />
        </div>
        <div class="form-group">
          <label class="form-label">{{ t('upload.match.participants') }}</label>
          <OrganicDropdown v-model="matchForm.participantIds" :options="participantOptions" :multiple="true" :placeholder="t('matches.form.selectParticipants')" />
          <small class="help-text">{{ t('upload.match.participantsHelp') }}</small>
        </div>
        <button type="submit" class="editorial-btn" :disabled="loading">
          <span v-if="loading">...</span>
          <span v-else>{{ t('upload.submit') }}</span>
        </button>
      </form>

      <!-- Chronicle Form -->
      <form v-if="currentTab === 'CHRONICLE'" @submit.prevent="submitChronicle" class="editorial-form">
        <div class="form-group">
          <label class="form-label">{{ t('upload.chronicle.title') }}</label>
          <input v-model="chronicleForm.title" type="text" class="form-input" required />
        </div>
        <div class="form-group">
          <label class="form-label">{{ t('upload.chronicle.happenedAt') }}</label>
          <input v-model="chronicleForm.happenedAt" type="date" class="form-input" required />
        </div>
        <div class="form-group">
          <label class="form-label">{{ t('upload.chronicle.description') }}</label>
          <MarkdownEditor v-model="chronicleForm.description" :placeholder="t('chronicles.form.descriptionPlaceholder')" :rows="6" />
        </div>
        <div class="form-group">
          <label class="form-label">{{ t('upload.chronicle.media') }}</label>
          <input type="file" @change="onChronicleFileChange" class="form-file" accept="image/*,video/*" />
        </div>

        <DailyMaterialsPanel 
          v-if="chronicleForm.happenedAt" 
          :date="chronicleForm.happenedAt" 
          @update:selection="handleChronicleSelection" 
        />

        <div class="advanced-section">
          <button type="button" class="advanced-toggle" @click="showChronicleAdvanced = !showChronicleAdvanced">
            {{ showChronicleAdvanced ? t('upload.chronicle.collapseAdvanced') : t('upload.chronicle.expandAdvanced') }}
          </button>
          <div v-if="showChronicleAdvanced" class="advanced-fields">
            <div class="form-group">
              <label class="form-label">{{ t('upload.chronicle.members') }}</label>
              <OrganicDropdown v-model="chronicleForm.memberIds" :options="memberOptions" :multiple="true" :placeholder="t('chronicles.form.selectMembers')" />
            </div>
            <div class="form-group">
              <label class="form-label">{{ t('upload.chronicle.photos') }}</label>
              <OrganicDropdown v-model="chronicleForm.photoIds" :options="photoOptions" :multiple="true" :placeholder="t('chronicles.form.selectPhotos')" />
            </div>
            <div class="form-group">
              <label class="form-label">{{ t('upload.chronicle.videos') }}</label>
              <OrganicDropdown v-model="chronicleForm.videoIds" :options="videoOptions" :multiple="true" :placeholder="t('chronicles.form.selectVideos')" />
            </div>
            <div class="form-group">
              <label class="form-label">{{ t('upload.chronicle.articles') }}</label>
              <OrganicDropdown v-model="chronicleForm.articleIds" :options="articleOptions" :multiple="true" :placeholder="t('chronicles.form.selectArticles')" />
            </div>
            <div class="form-group">
              <label class="form-label">{{ t('upload.chronicle.poems') }}</label>
              <OrganicDropdown v-model="chronicleForm.poemIds" :options="poemOptions" :multiple="true" :placeholder="t('chronicles.form.selectPoems')" />
            </div>
            <div class="form-group">
              <label class="form-label">{{ t('upload.chronicle.matches') }}</label>
              <OrganicDropdown v-model="chronicleForm.matchIds" :options="matchOptions" :multiple="true" :placeholder="t('chronicles.form.selectMatches')" />
            </div>
          </div>
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

.author-name-input {
  margin-top: 0.5rem;
  font-size: 0.95rem;
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

.family-creator {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
  align-items: center;
}

.family-creator .form-input {
  flex: 1;
  margin: 0;
}

.family-creator .action-btn {
  white-space: nowrap;
  padding: 0.6rem 1rem;
  font-size: 0.7rem;
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

.advanced-section {
  margin-top: 2rem;
  border-top: 1px solid var(--border);
  padding-top: 1.5rem;
}

.advanced-toggle {
  background: transparent;
  border: none;
  padding: 0;
  font-family: var(--sans);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.3s ease;
}

.advanced-toggle:hover {
  color: var(--text-h);
}

.advanced-fields {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin-top: 1.5rem;
}
</style>
