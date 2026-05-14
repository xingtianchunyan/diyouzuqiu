<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useMembersStore } from '../stores/members'
import OrganicDropdown from '../components/base/OrganicDropdown.vue'

const { t } = useI18n()
const router = useRouter()
const membersStore = useMembersStore()

const selectedTeam = ref<string>('ALL')

const teamOptions = computed(() => [
  { label: t('people.all'), value: 'ALL' },
  { label: t('people.red'), value: 'RED' },
  { label: t('people.blue'), value: 'BLUE' }
])

const loadMembers = () => {
  const params: any = {}
  if (selectedTeam.value && selectedTeam.value !== 'ALL') {
    params.team = selectedTeam.value
  }
  membersStore.fetchMembers(params)
}

const onFilterChange = () => {
  loadMembers()
}

const goToPerson = (id: string) => {
  router.push({ name: 'person', params: { id } })
}

onMounted(() => {
  loadMembers()
})
</script>

<template>
  <main class="editorial-container animate-fade-in">
    <div class="editorial-header">
      <div class="label-micro delay-1 animate-slide-up">ROSTER</div>
      <h1 class="editorial-title delay-2 animate-slide-up">{{ t('app.menu.people') }}</h1>
      <div class="subtitle-row delay-3 animate-slide-up">
        <p class="editorial-subtitle">{{ t('home.nav.peopleDesc') }}</p>
        <button class="action-btn" @click="router.push('/upload?tab=MEMBER')">
          + {{ t('app.menu.upload') }}
        </button>
      </div>
    </div>

    <div class="filters-row delay-4 animate-slide-up">
      <div class="filter-group">
        <label class="label-micro">TEAM</label>
        <OrganicDropdown v-model="selectedTeam" :options="teamOptions" @change="onFilterChange" />
      </div>
    </div>

    <div class="divider-y delay-4 animate-slide-up"></div>

    <div v-if="membersStore.loading" class="loading-state delay-4 animate-slide-up">
      <div class="spinner"></div>
      <span>Loading roster...</span>
    </div>

    <div v-else-if="membersStore.error" class="error-state delay-4 animate-slide-up">
      <p>{{ membersStore.error }}</p>
    </div>

    <div v-else-if="membersStore.members.length === 0" class="empty-archive delay-4 animate-slide-up">
      <p class="empty-text">No members found matching your criteria.</p>
    </div>

    <div v-else class="members-grid delay-4 animate-slide-up">
      <div 
        v-for="member in membersStore.members" 
        :key="member.id" 
        class="member-card"
        @click="goToPerson(member.id)"
      >
        <div class="avatar">
          <img 
            v-if="member.avatarUrl" 
            :src="member.avatarUrl" 
            class="avatar-img" 
            @error="(e) => { (e.target as HTMLImageElement).style.display = 'none'; member.avatarUrl = null }"
          />
          <span v-else class="avatar-initial">{{ member.displayName.charAt(0).toUpperCase() }}</span>
        </div>
        <div class="member-info">
          <h3 class="member-name">
            {{ member.displayName }}
            <span v-if="member.isCaptain" class="captain-badge" title="队长">👑</span>
          </h3>
          <div class="member-tags">
            <span v-if="member.team" class="tag" :class="member.team.toLowerCase()">
              {{ member.team === 'RED' ? t('people.red') : t('people.blue') }}
            </span>
          </div>
        </div>
      </div>
    </div>
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

/* Members Grid */
.members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2rem;
  padding-top: 1rem;
}

.member-card {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  border: 1px solid var(--border);
  background: transparent;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.member-card:hover {
  background: var(--surface);
  border-color: var(--border-strong);
  transform: translateY(-2px);
}

.avatar {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-strong);
  background: var(--bg);
  border-radius: 0; /* Square for brutalist/editorial look */
  transition: all 0.4s ease;
}

.member-card:hover .avatar {
  background: var(--text-h);
  color: var(--surface);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.captain-badge {
  font-size: 1.2rem;
  margin-left: 0.5rem;
  vertical-align: middle;
}

.avatar-initial {
  font-family: var(--serif);
  font-size: 1.5rem;
  color: inherit;
}

.member-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.member-name {
  margin: 0;
  font-family: var(--serif);
  font-size: 1.5rem;
  font-weight: 400;
  color: var(--text-h);
  transition: color 0.4s ease;
}

.member-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.tag {
  font-family: var(--mono);
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
}

.tag.red {
  color: var(--brand);
}

.tag.blue {
  color: #2b5c8a;
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
