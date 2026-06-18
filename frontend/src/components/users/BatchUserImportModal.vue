<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Papa from 'papaparse'
import { usersService } from '../../api/services/users.service'

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
  { key: 'email', label: '邮箱', type: 'text' },
  { key: 'password', label: '密码', type: 'password' },
  { key: 'role', label: '角色', type: 'select', options: ['MEMBER', 'ADMIN'] },
  { key: 'memberName', label: '队员姓名', type: 'text' },
  { key: 'team', label: '队伍', type: 'select', options: ['', 'RED', 'BLUE'] },
  { key: 'familyName', label: '家庭', type: 'text' }
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
  { email: 'zhangsan@example.com', password: 'Diyou2024', role: 'MEMBER', memberName: '张三', team: 'RED', familyName: '张家' },
  { email: 'lisi@example.com', password: 'Diyou2024', role: 'MEMBER', memberName: '李四', team: 'BLUE', familyName: '李家' }
])

const loading = ref(false)
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

const validRows = computed(() => rows.value.filter((r) => r.email.trim() && r.password.trim()))

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

  const readFile = (): Promise<string | ArrayBuffer> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result ?? '')
      reader.onerror = reject
      if (file.name.match(/\.(xlsx|xls)$/i)) {
        reader.readAsArrayBuffer(file)
      } else {
        reader.readAsText(file)
      }
    })

  try {
    const data = await readFile()
    const ext = file.name.split('.').pop()?.toLowerCase()
    let parsed: string[][] = []

    if (ext === 'xlsx' || ext === 'xls') {
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      parsed = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1, defval: '' })
    } else {
      const text = typeof data === 'string' ? data : new TextDecoder().decode(data as ArrayBuffer)
      const delimiter = ext === 'tsv' || text.includes('\t') ? '\t' : ','
      const parseResult = Papa.parse<string[]>(text, { delimiter, skipEmptyLines: true })
      parsed = parseResult.data
    }

    const imported = mapRowsFromArrays(parsed)
    if (imported.length) {
      rows.value = imported
      result.value = null
    } else {
      alert('未能从文件中识别到有效数据，请检查表头是否包含“邮箱”等列。')
    }
  } catch (err: any) {
    alert('文件解析失败：' + (err.message || '未知错误'))
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
            reason: err.response?.data?.error?.message || err.message || '导入失败'
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
          <h2 class="modal-title">批量导入用户</h2>
          <button type="button" class="close-btn" @click="handleClose">&times;</button>
        </div>

        <div class="modal-body">
          <p class="hint">
            在下方表格中直接编辑，或上传 CSV / Excel 文件自动填充。若队员不存在会自动创建，家庭不存在也会自动创建。
          </p>

          <div class="toolbar">
            <label class="file-btn">
              <input
                ref="fileInput"
                type="file"
                accept=".csv,.tsv,.xlsx,.xls"
                @change="handleFileUpload"
              />
              上传表格文件
            </label>
            <button type="button" class="action-btn" @click="addRow">+ 增加一行</button>
          </div>

          <div class="table-wrap">
            <table class="batch-table">
              <thead>
                <tr>
                  <th v-for="col in COLUMNS" :key="col.key" :class="'col-' + col.key">
                    {{ col.label }}
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
                        {{ opt === '' ? '—' : opt }}
                      </option>
                    </select>
                    <input
                      v-else
                      v-model="row[col.key]"
                      :type="col.type"
                      class="cell-input"
                      :placeholder="col.label"
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
            已识别 <strong>{{ validRows.length }}</strong> 行有效数据
          </div>

          <div v-if="result" class="result" :class="{ ok: result.success, fail: !result.success }">
            <div class="result-title">
              {{ result.success ? '导入成功' : '导入完成，部分失败' }}
            </div>
            <div class="result-stats">
              总计 {{ result.summary.total }} 行｜成功 {{ result.summary.created }} 个账号｜
              新建 {{ result.summary.createdMembers }} 名队员｜新建 {{ result.summary.createdFamilies }} 个家庭
            </div>
            <ul v-if="result.summary.failed.length" class="result-failures">
              <li v-for="f in result.summary.failed" :key="f.row + f.email">
                第 {{ f.row }} 行<span v-if="f.email">（{{ f.email }}）</span>：{{ f.reason }}
              </li>
            </ul>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="editorial-btn secondary" @click="handleClose">取消</button>
          <button type="button" class="editorial-btn" :disabled="!validRows.length || loading" @click="handleSubmit">
            <span v-if="loading">导入中...</span>
            <span v-else>开始导入</span>
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

.file-btn:hover {
  background: var(--text-h);
  color: var(--surface);
}

.file-btn input[type='file'] {
  display: none;
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
