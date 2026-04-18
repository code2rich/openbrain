<template>
  <div class="file-manager">
    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastMsg" class="toast">{{ toastMsg }}</div>
    </Transition>

    <!-- 工具栏 -->
    <div class="toolbar">
      <select v-model="selectedDir" @change="onDirChange">
        <option value="">全部目录</option>
        <option value="00-upload">00-upload</option>
        <option value="01-Clippers">01-Clippers</option>
        <option value="02-RSS">02-RSS</option>
        <option value="03-Manual">03-Manual</option>
        <option value="04-OpenClaw">04-OpenClaw</option>
        <option value="05-SyncDown">05-SyncDown</option>
        <option value="06-Thoughts">06-Thoughts</option>
      </select>
      <button class="refresh-btn" @click="loadFiles" :disabled="loading">{{ loading ? '...' : '刷新' }}</button>
    </div>

    <!-- 面包屑 -->
    <div v-if="breadcrumb.length > 1" class="breadcrumb">
      <span v-for="(crumb, i) in breadcrumb" :key="i">
        <template v-if="i > 0"> / </template>
        <a v-if="i < breadcrumb.length - 1" @click.prevent="navigateTo(i)">{{ crumb.label }}</a>
        <span v-else class="current">{{ crumb.label }}</span>
      </span>
    </div>

    <!-- 拖拽上传区 -->
    <div
      class="drop-zone"
      :class="{ dragging: isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop.prevent="onDrop"
    >
      <span class="drop-hint">拖拽文件到此处上传到</span>
      <select v-model="uploadDir" class="drop-dir-select">
        <option value="00-upload">00-upload</option>
        <option value="01-Clippers">01-Clippers</option>
        <option value="02-RSS">02-RSS</option>
        <option value="03-Manual">03-Manual</option>
        <option value="04-OpenClaw">04-OpenClaw</option>
        <option value="05-SyncDown">05-SyncDown</option>
        <option value="06-Thoughts">06-Thoughts</option>
      </select>
      <label class="file-btn">选择文件<input type="file" multiple @change="onUploadFileSelect" hidden /></label>
      <span v-if="pendingFiles.length > 0" class="pending-count">{{ pendingFiles.length }} 个待上传</span>
    </div>

    <!-- 待上传文件列表 -->
    <div v-if="pendingFiles.length > 0" class="pending-list">
      <div v-for="file in pendingFiles" :key="file.name" class="pending-item">
        <span class="file-icon-sm">{{ getFileIcon(file.name) }}</span>
        <span class="pending-name">{{ file.name }}</span>
        <span class="pending-size">{{ formatSize(file.size) }}</span>
        <button class="remove-btn" @click="pendingFiles = pendingFiles.filter(f => f !== file)">×</button>
      </div>
      <button class="upload-submit" @click="uploadFiles" :disabled="isUploading">
        {{ isUploading ? '上传中...' : `上传 ${pendingFiles.length} 个文件` }}
      </button>
    </div>

    <!-- 上传消息 -->
    <div v-if="uploadMsg" :class="['message', uploadOk ? 'ok' : 'err']">{{ uploadMsg }}</div>

    <!-- 文件列表 -->
    <!-- Batch action bar -->
    <div v-if="selectedFiles.size > 0" class="batch-bar">
      <span class="batch-count">已选 {{ selectedFiles.size }} 个文件</span>
      <button class="batch-btn" @click="batchProcess">批量加工</button>
      <button class="batch-clear" @click="selectedFiles = new Set()">取消选择</button>
    </div>

    <div v-if="loading && !hasFiles" class="loading">加载中...</div>

    <div v-else-if="hasFiles" class="file-groups">
      <template v-if="currentPath">
        <div class="file-group">
          <h3 class="group-title">{{ currentPath }}</h3>
          <div class="file-grid">
            <div
              v-for="file in currentFiles"
              :key="file.path"
              class="file-card"
              :class="{ 'is-dir': file.isDir, selected: selectedFiles.has(file.path) }"
              @click="file.isDir ? onNavigate(file.path) : onFileSelect(file)"
            >
              <input v-if="!file.isDir" type="checkbox" class="file-check" :checked="selectedFiles.has(file.path)" @click.stop="toggleSelect(file.path)" />
              <span class="file-icon">{{ getFileIcon(file.name, file.isDir) }}</span>
              <div class="file-info">
                <span class="file-name">{{ file.name }}</span>
                <span class="file-meta">{{ file.isDir ? '目录' : formatSize(file.size) }}</span>
              </div>
              <button v-if="!file.isDir" class="process-btn" @click.stop="processFile(file.path)" title="一键加工">⚡</button>
            </div>
          </div>
        </div>
      </template>
      <template v-else>
        <div v-for="(dirFiles, name) in displayFiles" :key="name" class="file-group">
          <h3 class="group-title">{{ getDirLabel(name) }} ({{ dirFiles.length }})</h3>
          <div class="file-grid">
            <div
              v-for="file in dirFiles"
              :key="file.path"
              class="file-card"
              :class="{ 'is-dir': file.isDir, selected: selectedFiles.has(file.path) }"
              @click="file.isDir ? onNavigate(file.path) : onFileSelect(file)"
            >
              <input v-if="!file.isDir" type="checkbox" class="file-check" :checked="selectedFiles.has(file.path)" @click.stop="toggleSelect(file.path)" />
              <span class="file-icon">{{ getFileIcon(file.name, file.isDir) }}</span>
              <div class="file-info">
                <span class="file-name">{{ file.name }}</span>
                <span class="file-meta">{{ file.isDir ? '目录' : formatSize(file.size) }}</span>
              </div>
              <button v-if="!file.isDir" class="process-btn" @click.stop="processFile(file.path)" title="一键加工">⚡</button>
            </div>
          </div>
        </div>
      </template>
    </div>

    <div v-else class="empty">暂无文件</div>

    <!-- 预览弹窗 -->
    <div v-if="previewFile" class="preview-modal" @click.self="previewFile = null">
      <div class="preview-content">
        <div class="preview-header">
          <h3>{{ previewFile.name }}</h3>
          <div class="preview-actions">
            <button @click="processFile(previewFile.path)">一键加工</button>
            <button class="close-btn" @click="previewFile = null">关闭</button>
          </div>
        </div>
        <div class="preview-body">
          <iframe v-if="previewFile.type === 'pdf'" :src="previewFile.url" class="pdf-frame" />
          <div v-else-if="previewFile.type === 'html'" class="html-preview" v-html="previewFile.content" />
          <img v-else-if="previewFile.type === 'image'" :src="previewFile.content" />
          <pre v-else-if="previewFile.type === 'text'">{{ previewFile.content }}</pre>
          <p v-else class="no-preview">{{ previewFile.message || '不支持预览此文件类型' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

import { getApiBase } from '../utils/api'
const API_BASE = getApiBase()

// --- 文件浏览状态 ---
const loading = ref(false)
const files = ref<Record<string, any[]>>({})
const selectedDir = ref('')
const currentPath = ref('')
const deepFiles = ref<any[]>([])
const previewFile = ref<any>(null)
const selectedFiles = ref<Set<string>>(new Set())

const hasFiles = computed(() => {
  if (currentPath.value) return deepFiles.value.length > 0
  return Object.keys(files.value).some(k => files.value[k].length > 0)
})

const currentFiles = computed(() => {
  if (currentPath.value) return deepFiles.value
  return files.value[selectedDir.value] || []
})

const displayFiles = computed(() => {
  if (selectedDir.value) return { [selectedDir.value]: files.value[selectedDir.value] || [] }
  return files.value
})

const breadcrumb = computed(() => {
  if (!currentPath.value) return []
  const parts = currentPath.value.split('/')
  return parts.map((part, i) => ({
    label: part,
    path: parts.slice(0, i + 1).join('/')
  }))
})

// --- 上传状态 ---
const isDragging = ref(false)
const isUploading = ref(false)
const pendingFiles = ref<File[]>([])
const uploadDir = ref('00-upload')
const uploadMsg = ref('')
const uploadOk = ref(false)

// --- 目录标签 ---
const DIR_LABELS: Record<string, string> = {
  '00-upload': '上传文件',
  '01-Clippers': '剪藏文章',
  '02-RSS': 'RSS 订阅',
  '03-Manual': '操作手册',
  '04-OpenClaw': 'OpenClaw',
  '05-SyncDown': '同步下载',
  '06-Thoughts': '个人思考',
}

function getDirLabel(name: string): string {
  return DIR_LABELS[name] || name
}

function getFileIcon(name: string, isDir?: boolean): string {
  if (isDir) return '📁'
  const ext = name.split('.').pop()?.toLowerCase()
  const icons: Record<string, string> = {
    md: '📄', txt: '📝', pdf: '📕', doc: '📘', docx: '📘',
    pptx: '📊', ppt: '📊', xlsx: '📈', xls: '📈', csv: '📋',
    json: '🔧', yaml: '⚙️', yml: '⚙️', html: '🌐', htm: '🌐',
    png: '🖼', jpg: '🖼', jpeg: '🖼', gif: '🖼', webp: '🖼'
  }
  return icons[ext || ''] || '📄'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function isValidFile(file: File): boolean {
  const validExts = ['.md', '.txt', '.pdf', '.doc', '.docx',
    '.pptx', '.ppt', '.xlsx', '.xls', '.csv',
    '.json', '.yaml', '.yml', '.html', '.epub', '.rtf', '.log']
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  return validExts.includes(ext)
}

// --- 文件浏览 ---

function onDirChange() {
  currentPath.value = ''
  loadFiles()
}

function navigateTo(breadcrumbIndex: number) {
  const parts = currentPath.value.split('/')
  if (breadcrumbIndex === 0) {
    currentPath.value = ''
    selectedDir.value = parts[0]
    loadFiles()
    return
  }
  const newPath = parts.slice(0, breadcrumbIndex + 1).join('/')
  currentPath.value = newPath
  loadDeepFiles(newPath)
}

function onNavigate(path: string) {
  currentPath.value = path
  loadDeepFiles(path)
}

function loadFiles() {
  loading.value = true
  const url = selectedDir.value ? `${API_BASE}/api/files?dir=${selectedDir.value}` : `${API_BASE}/api/files`
  fetch(url)
    .then(r => r.json())
    .then(data => {
      if (selectedDir.value) {
        files.value = { [selectedDir.value]: data }
      } else {
        files.value = data
      }
    })
    .catch(err => console.error(err))
    .finally(() => loading.value = false)
}

function loadDeepFiles(path: string) {
  loading.value = true
  fetch(`${API_BASE}/api/files?dir=${encodeURIComponent(path)}`)
    .then(r => r.json())
    .then(data => { deepFiles.value = Array.isArray(data) ? data : [] })
    .catch(err => console.error(err))
    .finally(() => loading.value = false)
}

async function onFileSelect(file: any) {
  try {
    const res = await fetch(`${API_BASE}/api/preview?path=${encodeURIComponent(file.path)}`)
    const data = await res.json()
    if (data.url && !data.url.startsWith('http')) {
      data.url = API_BASE + data.url
    }
    previewFile.value = { ...file, ...data }
  } catch (err) {
    console.error(err)
  }
}

// --- 上传 ---

function onDrop(e: DragEvent) {
  isDragging.value = false
  const dropped = Array.from(e.dataTransfer?.files || [])
  pendingFiles.value = [...pendingFiles.value, ...dropped.filter(isValidFile)]
}

function onUploadFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const selected = Array.from(input.files || [])
  pendingFiles.value = [...pendingFiles.value, ...selected.filter(isValidFile)]
}

async function uploadFiles() {
  if (pendingFiles.value.length === 0) return
  isUploading.value = true
  uploadMsg.value = ''
  try {
    for (const file of pendingFiles.value) {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${API_BASE}/api/upload?targetDir=${uploadDir.value}`, {
        method: 'POST',
        body: formData
      })
      if (!res.ok) throw new Error('上传失败')
    }
    uploadMsg.value = `成功上传 ${pendingFiles.value.length} 个文件`
    uploadOk.value = true
    pendingFiles.value = []
    // 切换到上传目录并刷新
    selectedDir.value = uploadDir.value
    currentPath.value = ''
    loadFiles()
  } catch (err: any) {
    uploadMsg.value = err.message || '上传失败'
    uploadOk.value = false
  } finally {
    isUploading.value = false
  }
}

// --- Toast ---

const toastMsg = ref('')
let toastTimer: number | null = null

function showToast(msg: string) {
  toastMsg.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toastMsg.value = '' }, 3000)
}

// --- 加工 ---

async function processFile(filePath: string) {
  try {
    await fetch(`${API_BASE}/api/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath })
    })
    previewFile.value = null
    showToast('已加入加工队列')
  } catch (err: any) {
    showToast('加工失败: ' + err.message)
  }
}

function toggleSelect(filePath: string) {
  const next = new Set(selectedFiles.value)
  if (next.has(filePath)) next.delete(filePath)
  else next.add(filePath)
  selectedFiles.value = next
}

async function batchProcess() {
  if (selectedFiles.value.size === 0) return
  const count = selectedFiles.value.size
  const paths = [...selectedFiles.value]
  selectedFiles.value = new Set()
  for (const filePath of paths) {
    try {
      await fetch(`${API_BASE}/api/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath })
      })
    } catch { /* continue */ }
  }
  showToast(`${count} 个文件已加入加工队列`)
}

// 初始化加载
loadFiles()
</script>

<style scoped>
.file-manager {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  position: relative;
}

/* Toast */
.toast {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.5rem 1.25rem;
  background: var(--vp-c-brand-1);
  color: white;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 500;
  z-index: 2000;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}

/* Toolbar */
.toolbar {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.toolbar select {
  flex: 1;
  max-width: 260px;
  padding: 0.45rem 0.7rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.82rem;
}

.refresh-btn {
  padding: 0.45rem 0.85rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  cursor: pointer;
  color: var(--vp-c-text-2);
  font-size: 0.82rem;
  transition: all 0.15s;
}

.refresh-btn:hover {
  border-color: var(--vp-c-text-3);
  color: var(--vp-c-text-1);
}

/* Breadcrumb */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.35rem 0.6rem;
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
}

.breadcrumb a {
  color: var(--vp-c-brand-1);
  cursor: pointer;
  text-decoration: none;
}

.breadcrumb a:hover {
  text-decoration: underline;
}

.breadcrumb .current {
  color: var(--vp-c-text-1);
  font-weight: 500;
}

/* Drop zone */
.drop-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 1.25rem 1rem;
  border: 2px dashed var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  transition: all 0.2s;
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
}

.drop-zone.dragging {
  border-color: var(--vp-c-brand-1);
  background: rgba(59, 130, 246, 0.04);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
}

.drop-hint {
  white-space: nowrap;
  font-size: 0.88rem;
}

.drop-dir-select {
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.8rem;
}

.file-btn {
  padding: 0.3rem 0.85rem;
  background: var(--vp-c-brand-1);
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  white-space: nowrap;
  border: none;
  transition: opacity 0.15s;
}

.file-btn:hover {
  opacity: 0.85;
}

.pending-count {
  margin-left: auto;
  color: var(--vp-c-brand-1);
  font-weight: 500;
  font-size: 0.78rem;
}

/* Pending list */
.pending-list {
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  padding: 0.75rem;
  border: 1px solid var(--vp-c-divider);
}

.pending-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0;
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 0.8rem;
}

.pending-item:last-of-type {
  border-bottom: none;
}

.file-icon-sm {
  font-size: 0.9rem;
}

.pending-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pending-size {
  color: var(--vp-c-text-3);
  font-size: 0.72rem;
}

.remove-btn {
  background: none;
  border: none;
  color: var(--vp-c-text-3);
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0 0.15rem;
}

.remove-btn:hover {
  color: var(--vp-c-red-1);
}

.upload-submit {
  width: 100%;
  margin-top: 0.5rem;
  padding: 0.4rem;
  background: var(--vp-c-brand-1);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.82rem;
}

.upload-submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.message {
  padding: 0.5rem;
  border-radius: 8px;
  text-align: center;
  font-size: 0.82rem;
}

.message.ok { background: rgba(34, 197, 94, 0.06); color: var(--vp-c-green-1); }
.message.err { background: rgba(239, 68, 68, 0.06); color: var(--vp-c-red-1); }

/* File list */
.loading, .empty {
  text-align: center;
  padding: 2rem;
  color: var(--vp-c-text-3);
  font-size: 0.85rem;
}

.file-groups {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.file-group {
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  padding: 0.85rem;
  border: 1px solid var(--vp-c-divider);
}

.group-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
  letter-spacing: 0.04em;
  margin-bottom: 0.65rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 6px;
}

.file-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.65rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
  background: var(--vp-c-bg);
}

.file-card.is-dir {
  border: 1px dashed var(--vp-c-divider);
  background: transparent;
}

.file-card.is-dir:hover {
  border-color: var(--vp-c-brand-soft);
  background: var(--vp-c-bg);
}

.file-card:hover {
  border-color: var(--vp-c-divider);
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.file-card.selected {
  background: rgba(59, 130, 246, 0.04);
  border-color: var(--vp-c-brand-soft);
}

.file-check {
  cursor: pointer;
  margin: 0;
  flex-shrink: 0;
}

/* Batch bar */
.batch-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.85rem;
  background: rgba(59, 130, 246, 0.06);
  border: 1px solid var(--vp-c-brand-soft);
  border-radius: 10px;
}

.batch-count {
  font-size: 0.78rem;
  color: var(--vp-c-brand-1);
  font-weight: 500;
}

.batch-btn {
  padding: 0.25rem 0.75rem;
  background: var(--vp-c-brand-1);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.78rem;
  cursor: pointer;
  font-weight: 500;
}

.batch-clear {
  padding: 0.25rem 0.75rem;
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  font-size: 0.78rem;
  cursor: pointer;
  color: var(--vp-c-text-3);
}

.file-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
}

.file-name {
  font-size: 0.78rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta {
  font-size: 0.68rem;
  color: var(--vp-c-text-3);
}

.process-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.15rem;
  opacity: 0;
  transition: opacity 0.1s;
}

.file-card:hover .process-btn {
  opacity: 1;
}

.process-btn:hover {
  transform: scale(1.15);
}

/* Preview modal */
.preview-modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
}

.preview-content {
  background: var(--vp-c-bg);
  border-radius: 14px;
  width: 90%;
  max-width: 900px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.preview-header h3 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 500;
}

.preview-actions {
  display: flex;
  gap: 0.4rem;
}

.preview-actions button {
  padding: 0.35rem 0.75rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
}

.preview-actions button:first-child {
  background: var(--vp-c-brand-1);
  color: white;
}

.close-btn {
  background: var(--vp-c-bg-soft) !important;
  color: var(--vp-c-text-2) !important;
}

.preview-body {
  flex: 1;
  overflow: auto;
  padding: 0.75rem;
}

.preview-body pre {
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 0.82rem;
  line-height: 1.55;
}

.preview-body img {
  max-width: 100%;
  height: auto;
}

.pdf-frame {
  width: 100%;
  height: 75vh;
  border: none;
}

.html-preview {
  line-height: 1.7;
  font-size: 0.9rem;
}

.html-preview :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1rem 0;
}

.html-preview :deep(td),
.html-preview :deep(th) {
  border: 1px solid var(--vp-c-divider);
  padding: 0.4rem;
}

.html-preview :deep(img) {
  max-width: 100%;
}

.no-preview {
  text-align: center;
  color: var(--vp-c-text-3);
  padding: 2.5rem;
  font-size: 0.85rem;
}

@media (max-width: 640px) {
  .drop-zone {
    flex-wrap: wrap;
  }
  .drop-hint {
    width: 100%;
  }
  .toolbar select {
    max-width: 100%;
  }
  .file-grid {
    grid-template-columns: 1fr;
  }
  .preview-content {
    width: 98%;
    max-height: 90vh;
    border-radius: 10px;
  }
}
</style>
