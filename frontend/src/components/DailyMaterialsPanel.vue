<template>
  <div class="daily-materials-panel" v-if="hasMaterials">
    <div class="panel-header">
      <h4>当日已存在资料 ({{ date }})</h4>
      <p class="panel-desc">勾选下方卡片即可自动关联到本次大事记，无需再次上传。</p>
    </div>

    <div class="materials-grid">
      <!-- Media Assets -->
      <label class="material-card media-card" v-for="media in data.mediaAssets" :key="media.id">
        <input 
          type="checkbox" 
          :value="media.id" 
          :checked="media.type === 'PHOTO' ? selectedPhotos.includes(media.id) : selectedVideos.includes(media.id)"
          @change="(e) => {
            const arr = media.type === 'PHOTO' ? selectedPhotos : selectedVideos
            if ((e.target as HTMLInputElement).checked) arr.push(media.id)
            else {
              const idx = arr.indexOf(media.id)
              if (idx > -1) arr.splice(idx, 1)
            }
          }" 
          class="card-checkbox" 
        />
        <div class="card-content">
          <img v-if="media.type === 'PHOTO'" :src="`/api/v1/media/${media.id}/file`" class="card-img" />
          <video v-else-if="media.type === 'VIDEO'" :src="`/api/v1/media/${media.id}/file`" class="card-img" preload="metadata"></video>
          <div class="card-meta">
            <span class="tag">{{ media.type === 'PHOTO' ? '照片' : '视频' }}</span>
            <span class="filename" :title="media.originalFilename">{{ media.originalFilename || '未命名' }}</span>
          </div>
        </div>
      </label>

      <!-- Works -->
      <label class="material-card work-card" v-for="work in data.works" :key="work.id">
        <input 
          type="checkbox" 
          :value="work.id" 
          :checked="work.type === 'ARTICLE' ? selectedArticles.includes(work.id) : selectedPoems.includes(work.id)"
          @change="(e) => {
            const arr = work.type === 'ARTICLE' ? selectedArticles : selectedPoems
            if ((e.target as HTMLInputElement).checked) arr.push(work.id)
            else {
              const idx = arr.indexOf(work.id)
              if (idx > -1) arr.splice(idx, 1)
            }
          }" 
          class="card-checkbox" 
        />
        <div class="card-content text-card">
          <div class="card-meta">
            <span class="tag">{{ work.type === 'ARTICLE' ? '文章' : '诗集' }}</span>
          </div>
          <h5 class="title">{{ work.title }}</h5>
        </div>
      </label>

      <!-- Matches -->
      <label class="material-card match-card" v-for="match in data.matches" :key="match.id">
        <input type="checkbox" :value="match.id" v-model="selectedMatches" class="card-checkbox" />
        <div class="card-content text-card">
          <div class="card-meta">
            <span class="tag">比赛记录</span>
          </div>
          <h5 class="title">{{ match.title }}</h5>
          <div class="score">{{ match.redScore }} : {{ match.blueScore }}</div>
        </div>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { chroniclesService } from '../api/services/chronicles.service'

const props = defineProps<{
  date: string
}>()

const emit = defineEmits<{
  (e: 'update:selection', selection: {
    photoIds: string[]
    videoIds: string[]
    articleIds: string[]
    poemIds: string[]
    matchIds: string[]
  }): void
}>()

const data = ref<{
  mediaAssets: any[]
  works: any[]
  matches: any[]
}>({ mediaAssets: [], works: [], matches: [] })

const loading = ref(false)

const selectedPhotos = ref<string[]>([])
const selectedVideos = ref<string[]>([])
const selectedArticles = ref<string[]>([])
const selectedPoems = ref<string[]>([])
const selectedMatches = ref<string[]>([])

const hasMaterials = computed(() => {
  return data.value.mediaAssets.length > 0 || data.value.works.length > 0 || data.value.matches.length > 0
})

let timeout: any // debounce timer
watch(() => props.date, (newDate) => {
  if (!newDate) {
    data.value = { mediaAssets: [], works: [], matches: [] }
    return
  }
  
  clearTimeout(timeout)
  timeout = setTimeout(async () => {
    loading.value = true
    try {
      const res = await chroniclesService.getDailyMaterials(newDate)
      data.value = res.data
      
      // Clear selections that are no longer valid
      selectedPhotos.value = selectedPhotos.value.filter(id => res.data.mediaAssets.some(m => m.id === id && m.type === 'PHOTO'))
      selectedVideos.value = selectedVideos.value.filter(id => res.data.mediaAssets.some(m => m.id === id && m.type === 'VIDEO'))
      selectedArticles.value = selectedArticles.value.filter(id => res.data.works.some(w => w.id === id && w.type === 'ARTICLE'))
      selectedPoems.value = selectedPoems.value.filter(id => res.data.works.some(w => w.id === id && w.type === 'POEM'))
      selectedMatches.value = selectedMatches.value.filter(id => res.data.matches.some(m => m.id === id))
    } catch (err) {
      console.error(err)
    } finally {
      loading.value = false
    }
  }, 500) // 500ms debounce
}, { immediate: true })

watch([selectedPhotos, selectedVideos, selectedArticles, selectedPoems, selectedMatches], () => {
  emit('update:selection', {
    photoIds: selectedPhotos.value,
    videoIds: selectedVideos.value,
    articleIds: selectedArticles.value,
    poemIds: selectedPoems.value,
    matchIds: selectedMatches.value
  })
}, { deep: true })
</script>

<style scoped>
.daily-materials-panel {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}
.panel-header h4 {
  margin: 0 0 0.25rem 0;
  color: var(--text-h);
  font-weight: 500;
}
.panel-desc {
  margin: 0 0 1rem 0;
  font-size: 0.85rem;
  color: var(--text-muted);
}
.materials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 1rem;
}
.material-card {
  position: relative;
  display: block;
  cursor: pointer;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border);
  transition: border-color 0.2s ease, transform 0.2s ease;
  background: var(--surface-hover);
}
.material-card:hover {
  transform: translateY(-2px);
  border-color: var(--text-muted);
}
.card-checkbox {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
  width: 18px;
  height: 18px;
  cursor: pointer;
}
.material-card:has(input:checked) {
  border-color: var(--text);
  box-shadow: 0 0 0 1px var(--text);
}
.card-content {
  height: 140px;
  display: flex;
  flex-direction: column;
}
.card-img {
  width: 100%;
  height: 100px;
  object-fit: cover;
  background: var(--surface);
}
.card-meta {
  padding: 0.5rem;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--surface-hover);
}
.tag {
  background: var(--surface);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--text-muted);
  font-size: 0.65rem;
  white-space: nowrap;
}
.filename {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text);
}
.text-card {
  padding: 0.5rem;
  justify-content: flex-start;
}
.text-card .title {
  margin: 0.5rem 0 0 0;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-h);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.score {
  margin-top: auto;
  font-size: 1.2rem;
  font-family: var(--serif);
  text-align: center;
  color: var(--brand);
}
</style>