<template>
  <main class="editorial-container animate-fade-in">
    <div class="editorial-header">
      <div class="label-micro delay-1 animate-slide-up">{{ $t('admin.kicker') }}</div>
      <h1 class="editorial-title delay-2 animate-slide-up">{{ $t('admin.title') }}</h1>
      <div class="subtitle-row delay-3 animate-slide-up">
        <p class="editorial-subtitle">{{ $t('admin.subtitle') }}</p>
        <div class="header-actions">
          <button class="action-btn" @click="openBatchModal">
            {{ $t('admin.batchImport.title') }}
          </button>
          <button class="action-btn" @click="openModal()">
            {{ $t('admin.addUser') }}
          </button>
        </div>
      </div>
    </div>

    <div class="content-wrapper delay-4 animate-slide-up" v-if="!loading">
      <table class="users-table">
        <thead>
          <tr>
            <th>{{ $t('admin.users.email') }}</th>
            <th>{{ $t('admin.users.role') }}</th>
            <th>{{ $t('admin.users.linkedMember') }}</th>
            <th>{{ $t('admin.users.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>{{ u.email }}</td>
            <td>{{ $t('admin.users.roles.' + u.role) }}</td>
            <td>{{ u.member?.displayName || $t('admin.users.unbound') }}</td>
            <td>
              <button class="btn-text" @click="openModal(u)">{{ $t('common.edit') }}</button>
              <button class="btn-text danger" @click="handleDelete(u.id)" v-if="u.id !== authStore.user?.id">{{ $t('common.delete') }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <Transition name="fade">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h2 class="modal-title">{{ editingUser ? $t('admin.users.editUser') : $t('admin.users.newUser') }}</h2>
            <button type="button" class="close-btn" @click="closeModal">&times;</button>
          </div>

          <form @submit.prevent="handleSubmit" class="editorial-form">
            <div class="form-group">
              <label class="form-label">{{ $t('admin.users.email') }}</label>
              <input v-model="form.email" type="email" class="form-input" required />
            </div>
            <div class="form-group">
              <label class="form-label">{{ $t('auth.password') }}</label>
              <input v-model="form.password" type="password" class="form-input" :placeholder="editingUser ? $t('admin.users.passwordPlaceholderEdit') : $t('admin.users.passwordPlaceholderNew')" :required="!editingUser" />
            </div>
            <div class="form-group">
              <label class="form-label">{{ $t('admin.users.role') }}</label>
              <select v-model="form.role" class="form-input">
                <option value="MEMBER">{{ $t('admin.users.roles.MEMBER') }}</option>
                <option value="ADMIN">{{ $t('admin.users.roles.ADMIN') }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">{{ $t('admin.users.linkMember') }}</label>
              <select v-model="form.memberId" class="form-input">
                <option value="">{{ $t('admin.users.noLink') }}</option>
                <option v-for="m in members" :key="m.id" :value="m.id">{{ m.displayName }}</option>
              </select>
            </div>

            <div class="form-actions">
              <button type="button" class="editorial-btn secondary" @click="closeModal">{{ $t('common.cancel') }}</button>
              <button type="submit" class="editorial-btn">{{ $t('common.save') }}</button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <BatchUserImportModal
      :show="showBatchModal"
      @close="closeBatchModal"
      @imported="onBatchImported"
    />
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { usersService, type User } from '../api/services/users.service'
import { membersService, type Member } from '../api/services/members.service'
import { useAuthStore } from '../stores/auth'
import BatchUserImportModal from '../components/users/BatchUserImportModal.vue'

const { t } = useI18n()
const authStore = useAuthStore()
const loading = ref(true)
const users = ref<User[]>([])
const members = ref<Member[]>([])

const showModal = ref(false)
const showBatchModal = ref(false)
const editingUser = ref<User | null>(null)
const form = ref({
  email: '',
  password: '',
  role: 'MEMBER' as 'ADMIN' | 'MEMBER',
  memberId: ''
})

const loadData = async () => {
  loading.value = true
  try {
    const [uRes, mRes] = await Promise.all([
      usersService.getUsers(),
      membersService.getMembers()
    ])
    users.value = uRes.data
    members.value = mRes.data
  } catch (err) {
    // Silent: table will be empty
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

const openModal = (u?: User) => {
  if (u) {
    editingUser.value = u
    form.value = {
      email: u.email,
      password: '',
      role: u.role,
      memberId: u.memberId || ''
    }
  } else {
    editingUser.value = null
    form.value = {
      email: '',
      password: '',
      role: 'MEMBER',
      memberId: ''
    }
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const openBatchModal = () => {
  showBatchModal.value = true
}

const closeBatchModal = () => {
  showBatchModal.value = false
}

const onBatchImported = () => {
  closeBatchModal()
  loadData()
}

const handleSubmit = async () => {
  try {
    const payload: any = {
      email: form.value.email,
      role: form.value.role,
      memberId: form.value.memberId || null
    }
    if (form.value.password) {
      payload.password = form.value.password
    }

    if (editingUser.value) {
      await usersService.updateUser(editingUser.value.id, payload)
    } else {
      await usersService.createUser(payload)
    }
    closeModal()
    loadData()
  } catch (err: any) {
    alert(err.response?.data?.error?.message || t('errors.saveUserFailed'))
  }
}

const handleDelete = async (id: string) => {
  if (confirm(t('confirm.deleteUser'))) {
    try {
      await usersService.deleteUser(id)
      loadData()
    } catch (err: any) {
      alert(t('errors.deleteUserFailed'))
    }
  }
}
</script>

<style scoped>
.users-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 2rem;
  font-size: 0.9rem;
}
.users-table th, .users-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}
.users-table th {
  color: var(--text-muted);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.8rem;
}
.btn-text {
  background: transparent;
  border: none;
  color: var(--text);
  cursor: pointer;
  padding: 0.5rem 1rem;
  font-family: var(--sans);
}
.btn-text:hover {
  text-decoration: underline;
}
.btn-text.danger {
  color: #e53935;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--surface);
  border: 1px solid var(--border-strong);
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 2rem;
  box-shadow: var(--shadow-whisper);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.modal-title {
  margin: 0;
  font-family: var(--serif);
  font-size: 1.75rem;
  font-weight: 400;
  color: var(--text-h);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.75rem;
  line-height: 1;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0;
  transition: color 0.3s ease;
}

.close-btn:hover {
  color: var(--text-h);
}

.editorial-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-family: var(--sans);
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--text-muted);
}

.form-input {
  width: 100%;
  box-sizing: border-box;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border-strong);
  border-radius: 0;
  font-family: var(--sans);
  font-size: 1.1rem;
  color: var(--text-h);
  padding: 0.6rem 0;
  outline: none;
  transition: border-color 0.3s ease;
}

.form-input:focus {
  border-bottom-color: var(--text-h);
}

.form-input::placeholder {
  color: var(--text-muted);
  opacity: 0.6;
}

select.form-input {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0 center;
  padding-right: 1.5rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.editorial-btn {
  flex: 1;
  background: transparent;
  color: var(--text-h);
  border: 1px solid var(--text-h);
  padding: 1rem;
  font-family: var(--sans);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.3s ease;
}

.editorial-btn:hover {
  background: var(--text-h);
  color: var(--surface);
}

.editorial-btn.secondary {
  border-color: var(--border-strong);
  color: var(--text-muted);
}

.editorial-btn.secondary:hover {
  background: var(--border-strong);
  color: var(--text-h);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .modal-content {
    padding: 1.5rem;
  }
  .modal-title {
    font-size: 1.5rem;
  }
}
</style>
