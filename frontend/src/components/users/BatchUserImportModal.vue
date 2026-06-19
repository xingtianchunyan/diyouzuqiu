<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Papa from 'papaparse'
import { usersService } from '../../api/services/users.service'

const { t } = useI18n()

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'imported'): void
}>()

type ImportRow = {
  email: string
  password: string
  role: 'MEMBER' | 'ADMIN'
  memberName: string
  team: '' | 'RED' | 'BLUE'
  familyName: string
}

const COLUMNS: { key: keyof ImportRow; label: string; type: 'text' | 'password' | 'select'; options?: string[] }[] = [
  { key: 'email', label: 'admin.batchImport.columns.email', type: 'text' },
  { key: 'password', label: 'admin.batchImport.columns.password', type: 'password' },
  { key: 'role', label: 'admin.batchImport.columns.role', type: 'select', options: ['MEMBER', 'ADMIN'] },
  { key: 'memberName', label: 'admin.batchImport.columns.memberName', type: 'text' },
  { key: 'team', label: 'admin.batchImport.columns.team', type: 'select', options: ['', 'RED', 'BLUE'] },
  { key: 'familyName', label: 'admin.batchImport.columns.familyName', type: 'text' }
]

const createEmptyRow = (): ImportRow => ({
  email: '',
  password: '',
  role: 'MEMBER',
  memberName: '',
  team: '',
  familyName: ''
})

const rows = ref<ImportRow[]>([
  { email: 'zhangsan@example.com', password: '', role: 'MEMBER', memberName: '张三', team: 'RED', familyName: '张家' },
  { email: 'lisi@example.com', password: '', role: 'MEMBER', memberName: '李四', team: 'BLUE', familyName: '李家' }
])

const loading = ref(false)
const parseLoading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const result = ref<{
  success: boolean
  summary: {
    total: number
    created: number
    createdMembers: number
    createdFamilies: number
    failed: Array<{ row: number; email: string; reason: string }>
  }
  generatedPasswords?: Array<{ email: string; password: string }>
} | null>(null)

const HEADER_MAP: Record<string, keyof ImportRow> = {
  email: 'email',
  邮箱: 'email',
  password: 'password',
  密码: 'password',
  role: 'role',
  角色: 'role',
  membername: 'memberName',
  'member name': 'memberName',
  队员姓名: 'memberName',
  队员: 'memberName',
  team: 'team',
  队伍: 'team',
  球队: 'team',
  family: 'familyName',
  familyname: 'familyName',
  'family name': 'familyName',
  家庭: 'familyName',
  家庭名: 'familyName'
}

function isPasswordValid(password: string): boolean {
  if (!password) return true // empty means auto-generate on the backend
  if (password.length < 8) return false
  return /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password)
}

const invalidRows = computed(() =>
  rows.value
    .map((r, index) => ({ row: r, index }))
    .filter(({ row }) => row.email.trim() && !isPasswordValid(row.password))
)

const validRows = computed(() =>
  rows.value.filter((r) => r.email.trim() && isPasswordValid(r.password))
)

watch(
  () => props.show,
  (show) => {
    if (show) {
      result.value = null
    }
  }
)

const addRow = () => rows.value.push(createEmptyRow())
const removeRow = (index: number) => {
  if (rows.value.length > 1) {
    rows.value.splice(index, 1)
  } else {
    rows.value[0] = createEmptyRow()
  }
}

function mapRowsFromArrays(data: string[][]): ImportRow[] {
  if (data.length < 2) return []
  const headers = data[0].map((h) => h.trim().toLowerCase())
  const indices: Partial<Record<keyof ImportRow, number>> = {}
  headers.forEach((h, i) => {
    const key = HEADER_MAP[h]
    if (key && indices[key] === undefined) indices[key] = i
  })

  return data.slice(1).map((cells) => {
    const get = (key: keyof ImportRow) => {
      const idx = indices[key]
      return idx !== undefined ? cells[idx]?.trim() ?? '' : ''
    }
    const roleRaw = get('role').toUpperCase()
    const teamRaw = get('team').toUpperCase()
    return {
      email: get('email'),
      password: get('password'),
      role: roleRaw === 'ADMIN' ? 'ADMIN' : 'MEMBER',
      memberName: get('memberName'),
      team: teamRaw === 'RED' || teamRaw === 'BLUE' ? teamRaw : '',
      familyName: get('familyName')
    } as ImportRow
  })
}

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const ext = file.name.split('.').pop()?.toLowerCase()

  try {
    parseLoading.value = true
    let parsed: string[][] = []

    if (ext === 'xlsx' || ext === 'xls') {
      const res = await usersService.parseExcel(file)
      parsed = res.data.rows
    } else {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve((e.target?.result as string) ?? '')
        reader.onerror = reject
        reader.readAsText(file)
      })
      const delimiter = ext === 'tsv' || text.includes('\t') ? '\t' : ','
      const parseResult = Papa.parse<string[]>(text, { delimiter, skipEmptyLines: true })
      parsed = parseResult.data
    }

    const imported = mapRowsFromArrays(parsed)
    if (imported.length) {
      rows.value = imported
      result.value = null
    } else {
      alert(t('admin.batchImport.noDataFound'))
    }
  } catch (err: any) {
    const message = err.response?.data?.error?.message || err.message || t('common.unknown')
    alert(t('admin.batchImport.parseFailed') + message)
  } finally {
    parseLoading.value = false
  }

  // Reset input so the same file can be selected again
  if (fileInput.value) fileInput.value.value = ''
}

const handleSubmit = async () => {
  if (!validRows.value.length) return
  loading.value = true
  result.value = null
  try {
    const res = await usersService.batchCreateUsers({ users: validRows.value })
    result.value = res.data
    if (res.data.success) {
      emit('imported')
    }
  } catch (err: any) {
    result.value = {
      success: false,
      summary: {
        total: validRows.value.length,
        created: 0,
        createdMembers: 0,
        createdFamilies: 0,
        failed: [
          {
            row: 0,
            email: '',
            reason: err.response?.data?.error?.message || err.message || t('admin.batchImport.importFailed')
          }
        ]
      }
    }
  } finally {
    loading.value = false
  }
}

const handleClose = () => {
  if (!loading.value) emit('close')
}
</script>

<template>
  <Transition name="fade">
    <div v-if="show" class="modal-overlay" @click.self="handleClose">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">{{ $t('admin.batchImport.title') }}</h2>
          <button type="button" class="close-btn" @click="handleClose">&times;</button>
        </div>

        <div class="modal-body">
          <p class="hint">
            {{ $t('admin.batchImport.description') }}
          </p>

          <div class="toolbar">
            <label class="file-btn" :class="{ disabled: parseLoading }">
              <input
                ref="fileInput"
                type="file"
                accept=".csv,.tsv,.xlsx,.xls"
                :disabled="parseLoading"
                @change="handleFileUpload"
              />
              <span v-if="parseLoading">{{ $t('common.parsing') }}</span>
              <span v-else>{{ $t('admin.batchImport.uploadFile') }}</span>
            </label>
            <button type="button" class="action-btn" @click="addRow">{{ $t('admin.batchImport.addRow') }}</button>
          </div>

          <div class="table-wrap">
            <table class="batch-table">
              <thead>
                <tr>
                  <th v-for="col in COLUMNS" :key="col.key" :class="'col-' + col.key">
                    {{ $t(col.label) }}
                  </th>
                  <th class="col-action"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in rows" :key="index">
                  <td v-for="col in COLUMNS" :key="col.key" :class="'col-' + col.key">
                    <select
                      v-if="col.type === 'select'"
                      v-model="row[col.key]"
                      class="cell-input"
                    >
                      <option v-for="opt in col.options" :key="opt" :value="opt">
                        {{ opt === '' ? '—' : col.key === 'role' ? $t('admin.users.roles.' + opt) : col.key === 'team' ? $t('common.team.' + opt.toLowerCase()) : opt }}
                      </option>
                    </select>
                    <input
                      v-else
                      v-model="row[col.key]"
                      :type="col.type"
                      class="cell-input"
                      :placeholder="$t(col.label)"
                    />
                  </td>
                  <td class="col-action">
                    <button type="button" class="row-remove" @click="removeRow(index)">×</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="preview">
            {{ $t('admin.batchImport.validRows', { n: validRows.length }) }}
          </div>

          <div v-if="invalidRows.length" class="result fail">
            <div class="result-title">{{ $t('admin.batchImport.invalidPasswordsTitle') }}</div>
            <ul class="result-failures">
              <li v-for="item in invalidRows" :key="item.index">
                {{ $t('admin.batchImport.invalidPasswordRow', { row: item.index + 1, email: item.row.email }) }}
              </li>
            </ul>
          </div>

          <div v-if="result" class="result" :class="{ ok: result.success, fail: !result.success }">
            <div class="result-title">
              {{ result.success ? $t('admin.batchImport.success') : $t('admin.batchImport.partialFailure') }}
            </div>
            <div class="result-stats">
              {{ $t('admin.batchImport.stats', result.summary) }}
            </div>

            <div v-if="result.generatedPasswords?.length" class="generated-passwords">
              <div class="result-title">{{ $t('admin.batchImport.generatedPasswordsTitle') }}</div>
              <p class="generated-passwords-hint">{{ $t('admin.batchImport.generatedPasswordsHint') }}</p>
              <ul class="generated-passwords-list">
                <li v-for="item in result.generatedPasswords" :key="item.email">
                  <code>{{ item.email }}</code> — <code class="password">{{ item.password }}</code>
                </li>
              </ul>
            </div>

            <ul v-if="result.summary.failed.length" class="result-failures">
              <li v-for="f in result.summary.failed" :key="f.row + f.email">
                {{ $t('admin.batchImport.failureRow', { row: f.row, email: f.email, reason: f.reason }) }}
              </li>
            </ul>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="editorial-btn secondary" @click="handleClose">{{ $t('common.cancel') }}</button>
          <button type="button" class="editorial-btn" :disabled="!validRows.length || loading || parseLoading" @click="handleSubmit">
            <span v-if="loading">{{ $t('common.importing') }}</span>
            <span v-else>{{ $t('admin.batchImport.start') }}</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
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
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 2rem;
  box-shadow: var(--shadow-whisper);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
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

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.hint {
  font-family: var(--sans);
  font-size: 0.9rem;
  color: var(--text-muted);
  line-height: 1.6;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.file-btn {
  display: inline-block;
  background: transparent;
  border: 1px solid var(--text-h);
  color: var(--text-h);
  font-family: var(--sans);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.file-btn:hover:not(.disabled) {
  background: var(--text-h);
  color: var(--surface);
}

.file-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.file-btn input[type='file'] {
  display: none;
}

.file-btn input[type='file']:disabled {
  cursor: not-allowed;
}

.action-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-family: var(--sans);
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.3s ease;
}

.action-btn:hover {
  color: var(--text-h);
  text-decoration: underline;
  text-underline-offset: 4px;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--border-strong);
}

.batch-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-family: var(--sans);
  font-size: 0.9rem;
}

.batch-table th,
.batch-table td {
  padding: 0.5rem;
  border-bottom: 1px solid var(--border);
  text-align: left;
  vertical-align: middle;
}

.batch-table th {
  background: var(--bg);
  color: var(--text-muted);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.7rem;
}

.batch-table tbody tr:last-child td {
  border-bottom: none;
}

.col-email { width: 22%; }
.col-password { width: 14%; }
.col-role { width: 12%; }
.col-memberName { width: 16%; }
.col-team { width: 12%; }
.col-familyName { width: 16%; }
.col-action { width: 8%; text-align: center; }

.cell-input {
  width: 100%;
  box-sizing: border-box;
  background: transparent;
  border: none;
  border-bottom: 1px solid transparent;
  font-family: var(--sans);
  font-size: 0.9rem;
  color: var(--text-h);
  padding: 0.4rem 0;
  outline: none;
  transition: border-color 0.3s ease;
}

.cell-input:focus {
  border-bottom-color: var(--text-h);
}

.cell-input::placeholder {
  color: var(--text-muted);
  opacity: 0.4;
}

select.cell-input {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0 center;
  padding-right: 1rem;
}

.row-remove {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.25rem;
  cursor: pointer;
  line-height: 1;
}

.row-remove:hover {
  color: var(--error);
}

.preview {
  font-family: var(--sans);
  font-size: 0.85rem;
  color: var(--text-muted);
}

.result {
  border: 1px solid var(--border-strong);
  padding: 1rem;
  background: var(--bg);
}

.result.ok {
  border-left: 3px solid #2e7d32;
}

.result.fail {
  border-left: 3px solid var(--error);
}

.result-title {
  font-family: var(--serif);
  font-size: 1.1rem;
  color: var(--text-h);
  margin-bottom: 0.5rem;
}

.result-stats {
  font-family: var(--sans);
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 0.75rem;
}

.result-failures {
  margin: 0;
  padding-left: 1.2rem;
  font-family: var(--sans);
  font-size: 0.85rem;
  color: var(--error);
  line-height: 1.6;
}

.generated-passwords {
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  background: rgba(22, 101, 52, 0.05);
  border-left: 3px solid var(--success);
}

.generated-passwords-hint {
  font-family: var(--sans);
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0.25rem 0 0.5rem;
}

.generated-passwords-list {
  margin: 0;
  padding-left: 1.2rem;
  font-family: var(--sans);
  font-size: 0.85rem;
  color: var(--text-h);
  line-height: 1.6;
}

.generated-passwords-list code {
  font-family: var(--mono);
  font-size: 0.8rem;
  background: var(--bg);
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
}

.generated-passwords-list code.password {
  color: var(--success);
  font-weight: 600;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
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

.editorial-btn:hover:not(:disabled) {
  background: var(--text-h);
  color: var(--surface);
}

.editorial-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.editorial-btn.secondary {
  border-color: var(--border-strong);
  color: var(--text-muted);
}

.editorial-btn.secondary:hover:not(:disabled) {
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
  .batch-table {
    min-width: 700px;
  }
}
</style>
