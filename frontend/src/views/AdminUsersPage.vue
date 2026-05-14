<template>
  <main class="editorial-container animate-fade-in">
    <div class="editorial-header">
      <div class="label-micro delay-1 animate-slide-up">ADMIN</div>
      <h1 class="editorial-title delay-2 animate-slide-up">账号管理</h1>
      <div class="subtitle-row delay-3 animate-slide-up">
        <p class="editorial-subtitle">管理所有登录用户及其关联的队员身份</p>
        <button class="action-btn" @click="openModal()">
          + 添加用户
        </button>
      </div>
    </div>

    <div class="content-wrapper delay-4 animate-slide-up" v-if="!loading">
      <table class="users-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>角色</th>
            <th>关联队员</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>{{ u.email }}</td>
            <td>{{ u.role }}</td>
            <td>{{ u.member?.displayName || '未绑定' }}</td>
            <td>
              <button class="btn-text" @click="openModal(u)">编辑</button>
              <button class="btn-text danger" @click="handleDelete(u.id)" v-if="u.id !== authStore.user?.id">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <div class="modal-overlay" v-if="showModal" @click.self="closeModal">
      <div class="modal-content">
        <h2>{{ editingUser ? '编辑用户' : '新增用户' }}</h2>
        <form @submit.prevent="handleSubmit" class="editorial-form">
          <div class="form-group">
            <label class="form-label">EMAIL</label>
            <input v-model="form.email" type="email" class="form-input" required />
          </div>
          <div class="form-group">
            <label class="form-label">PASSWORD</label>
            <input v-model="form.password" type="text" class="form-input" :placeholder="editingUser ? '留空表示不修改' : '必填'" :required="!editingUser" />
          </div>
          <div class="form-group">
            <label class="form-label">ROLE</label>
            <select v-model="form.role" class="form-input">
              <option value="MEMBER">MEMBER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">绑定队员</label>
            <select v-model="form.memberId" class="form-input">
              <option value="">-- 不绑定 --</option>
              <option v-for="m in members" :key="m.id" :value="m.id">{{ m.displayName }}</option>
            </select>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn-text" @click="closeModal">取消</button>
            <button type="submit" class="editorial-btn">保存</button>
          </div>
        </form>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usersService, type User } from '../api/services/users.service'
import { membersService, type Member } from '../api/services/members.service'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const loading = ref(true)
const users = ref<User[]>([])
const members = ref<Member[]>([])

const showModal = ref(false)
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
    console.error(err)
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
    alert(err.response?.data?.error?.message || 'Error saving user')
  }
}

const handleDelete = async (id: string) => {
  if (confirm('确认删除此用户？')) {
    try {
      await usersService.deleteUser(id)
      loadData()
    } catch (err: any) {
      alert('Error deleting user')
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
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(4px);
}
.modal-content {
  background: var(--surface);
  padding: 2rem;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}
.modal-content h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  font-weight: 400;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}
</style>
