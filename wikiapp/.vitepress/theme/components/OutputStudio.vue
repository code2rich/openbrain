<template>
  <div class="output-studio">
    <div class="output-header">
      <div class="header-left">
        <h1>知识输出</h1>
        <p class="subtitle">从知识库中创作内容</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="previewOutput" :disabled="!hasAssistantMessage">
          预览
        </button>
        <button class="btn btn-primary" @click="saveOutput" :disabled="!hasAssistantMessage || saving">
          {{ saving ? '保存中...' : '保存到 100-output' }}
        </button>
      </div>
    </div>

    <div class="output-body">
      <!-- Left: Sessions + References -->
      <div class="output-sidebar">
        <div class="sidebar-section">
          <div class="section-header">
            <h3>会话</h3>
            <button class="btn-icon" @click="showNewSession = true" title="新建会话">+</button>
          </div>
          <div class="session-list">
            <div
              v-for="s in sessionList"
              :key="s.id"
              :class="['session-card', { active: activeSessionId === s.id }]"
              @click="selectSession(s.id)"
            >
              <div class="card-title">{{ s.title }}</div>
              <div class="card-meta">
                <span :class="['status-dot', s.status]"></span>
                {{ s.messageCount }}条 · {{ formatTime(s.updatedAt) }}
              </div>
            </div>
            <div v-if="sessionList.length === 0" class="empty-hint">暂无会话</div>
          </div>
        </div>

        <div class="sidebar-section refs-section">
          <div class="section-header">
            <h3>引用来源</h3>
            <span class="ref-count">{{ activeSession?.referencedWikis?.length || 0 }}</span>
          </div>
          <div class="ref-list">
            <a
              v-for="ref in activeSession?.referencedWikis || []"
              :key="ref.slug"
              :href="`/wiki/${ref.path.replace('.md', '.html')}`"
              class="ref-item"
              target="_blank"
            >
              <span class="ref-icon">{{ ref.source === 'tool_use' ? '📄' : '🔗' }}</span>
              <span class="ref-slug">{{ ref.slug }}</span>
            </a>
            <div v-if="!activeSession?.referencedWikis?.length" class="empty-hint">
              对话中引用的 wiki 页面将显示在这里
            </div>
          </div>
        </div>

        <div class="sidebar-section">
          <div class="section-header">
            <h3>输出模板</h3>
            <button class="btn-icon" @click="showNewTemplate = true" title="新建模板">+</button>
          </div>
          <TemplateManager
            :templates="templates"
            @create="createTemplate"
            @update="updateTemplate"
            @delete="deleteTemplate"
          />
        </div>
      </div>

      <!-- Right: Chat -->
      <div class="output-main">
        <OutputChat
          v-if="activeSession"
          :session="activeSession"
          :streaming="streamingMsgId"
          @send="sendMessage"
        />
        <div v-else class="main-empty">
          <div class="empty-icon">📝</div>
          <p>选择左侧会话，或创建新的输出任务</p>
          <button class="btn btn-primary" @click="showNewSession = true">新建会话</button>
        </div>
      </div>
    </div>

    <!-- New Session Dialog -->
    <div v-if="showNewSession" class="modal-overlay" @click.self="showNewSession = false">
      <div class="modal">
        <h3>新建输出会话</h3>
        <div class="form-group">
          <label>标题</label>
          <input v-model="newSessionTitle" placeholder="如：AI Agent 综述" @keyup.enter="createSession" />
        </div>
        <div class="form-group">
          <label>输出模板（可选）</label>
          <select v-model="newSessionTemplate">
            <option value="">自由对话</option>
            <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showNewSession = false">取消</button>
          <button class="btn btn-primary" @click="createSession" :disabled="!newSessionTitle.trim()">
            创建
          </button>
        </div>
      </div>
    </div>

    <!-- Preview Dialog -->
    <OutputPreview
      v-if="showPreview"
      :content="previewContent"
      :references="activeSession?.referencedWikis || []"
      @close="showPreview = false"
      @save="saveOutput"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import OutputChat from './OutputChat.vue'
import OutputPreview from './OutputPreview.vue'
import TemplateManager from './TemplateManager.vue'
import { getApiBase } from '../utils/api'

const API_BASE = getApiBase()

interface SessionSummary {
  id: string
  title: string
  templateId: string | null
  status: string
  messageCount: number
  savedOutputPath: string | null
  createdAt: string
  updatedAt: string
}

interface ChatMsg {
  id: string
  role: 'user' | 'assistant'
  content: string
  referencedFiles?: string[]
  timestamp: string
}

interface WikiRef {
  slug: string
  path: string
  referencedAt: string
  source: 'tool_use' | 'wiki_link'
}

interface FullSession {
  id: string
  title: string
  templateId: string | null
  status: string
  messages: ChatMsg[]
  referencedWikis: WikiRef[]
  savedOutputPath: string | null
  createdAt: string
  updatedAt: string
}

interface Template {
  id: string
  name: string
  description: string
  systemPrompt: string
  outputFormat: string
  createdAt: string
  updatedAt: string
}

const sessionList = ref<SessionSummary[]>([])
const activeSessionId = ref<string | null>(null)
const activeSession = ref<FullSession | null>(null)
const templates = ref<Template[]>([])
const streamingMsgId = ref<string | null>(null)
const saving = ref(false)
const showNewSession = ref(false)
const showNewTemplate = ref(false)
const showPreview = ref(false)
const previewContent = ref('')
const newSessionTitle = ref('')
const newSessionTemplate = ref('')

const hasAssistantMessage = computed(() =>
  activeSession.value?.messages?.some(m => m.role === 'assistant')
)

let evtSource: EventSource | null = null

async function loadSessions() {
  try {
    const res = await fetch(`${API_BASE}/api/output/sessions`)
    const data = await res.json()
    sessionList.value = data.sessions || []
  } catch { /* ignore */ }
}

async function loadTemplates() {
  try {
    const res = await fetch(`${API_BASE}/api/output/templates`)
    const data = await res.json()
    templates.value = data.templates || []
  } catch { /* ignore */ }
}

async function selectSession(id: string) {
  activeSessionId.value = id
  try {
    const res = await fetch(`${API_BASE}/api/output/sessions/${id}`)
    activeSession.value = await res.json()
  } catch { /* ignore */ }
}

async function createSession() {
  if (!newSessionTitle.value.trim()) return
  try {
    const res = await fetch(`${API_BASE}/api/output/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newSessionTitle.value.trim(),
        templateId: newSessionTemplate.value || undefined,
      }),
    })
    const data = await res.json()
    showNewSession.value = false
    newSessionTitle.value = ''
    newSessionTemplate.value = ''
    await loadSessions()
    await selectSession(data.id)
  } catch { /* ignore */ }
}

async function sendMessage(content: string) {
  if (!activeSessionId.value || !content.trim()) return

  // Optimistic: append user message
  const userMsg: ChatMsg = {
    id: 'msg-local-' + Date.now(),
    role: 'user',
    content,
    timestamp: new Date().toISOString(),
  }
  activeSession.value!.messages.push(userMsg)

  // Placeholder for assistant streaming
  const assistantMsg: ChatMsg = {
    id: 'msg-streaming',
    role: 'assistant',
    content: '',
    timestamp: new Date().toISOString(),
  }
  activeSession.value!.messages.push(assistantMsg)
  streamingMsgId.value = assistantMsg.id

  // Connect SSE before POST
  if (evtSource) evtSource.close()
  evtSource = new EventSource(`${API_BASE}/api/output/sessions/${activeSessionId.value}/stream`)

  evtSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'text' && streamingMsgId.value) {
        assistantMsg.content += data.text || ''
      } else if (data.type === 'tool_use') {
        // tool_use events can be tracked here if needed
      } else if (data.type === 'done') {
        streamingMsgId.value = null
        evtSource?.close()
        evtSource = null
        // Reload full session from server
        selectSession(activeSessionId.value!)
        loadSessions()
      } else if (data.type === 'error') {
        assistantMsg.content += `\n\n⚠ 错误: ${data.text}`
        streamingMsgId.value = null
        evtSource?.close()
        evtSource = null
      }
    } catch { /* ignore */ }
  }

  evtSource.onerror = () => {
    evtSource?.close()
    evtSource = null
    if (streamingMsgId.value) {
      streamingMsgId.value = null
    }
  }

  // POST the message
  try {
    await fetch(`${API_BASE}/api/output/sessions/${activeSessionId.value}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
  } catch {
    streamingMsgId.value = null
    evtSource?.close()
    evtSource = null
  }
}

async function previewOutput() {
  if (!activeSessionId.value) return
  try {
    const res = await fetch(`${API_BASE}/api/output/sessions/${activeSessionId.value}/preview`)
    const data = await res.json()
    previewContent.value = data.content
    showPreview.value = true
  } catch { /* ignore */ }
}

async function saveOutput() {
  if (!activeSessionId.value) return
  saving.value = true
  try {
    const res = await fetch(`${API_BASE}/api/output/sessions/${activeSessionId.value}/save`, {
      method: 'POST',
    })
    const data = await res.json()
    alert(`已保存到 100-output/${data.path}`)
    showPreview.value = false
    await loadSessions()
    await selectSession(activeSessionId.value)
  } catch (err: any) {
    alert(`保存失败: ${err.message}`)
  } finally {
    saving.value = false
  }
}

async function createTemplate(t: Partial<Template>) {
  try {
    await fetch(`${API_BASE}/api/output/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(t),
    })
    await loadTemplates()
    showNewTemplate.value = false
  } catch { /* ignore */ }
}

async function updateTemplate(id: string, t: Partial<Template>) {
  try {
    await fetch(`${API_BASE}/api/output/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(t),
    })
    await loadTemplates()
  } catch { /* ignore */ }
}

async function deleteTemplate(id: string) {
  try {
    await fetch(`${API_BASE}/api/output/templates/${id}`, { method: 'DELETE' })
    await loadTemplates()
  } catch { /* ignore */ }
}

function formatTime(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
}

onMounted(() => {
  loadSessions()
  loadTemplates()
})
</script>

<style scoped>
.output-studio {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
  min-height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
}

.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  border-bottom: 1px solid var(--vp-c-divider);
}

.header-left h1 {
  font-size: 1.5rem;
  margin: 0;
  font-weight: 600;
}

.subtitle {
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  margin: 4px 0 0;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--vp-button-brand-bg);
  color: var(--vp-button-brand-text);
}

.btn-primary:hover:not(:disabled) {
  background: var(--vp-button-brand-hover-bg);
}

.btn-secondary {
  background: var(--vp-button-alt-bg);
  color: var(--vp-button-alt-text);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--vp-button-alt-hover-bg);
}

.btn-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: transparent;
  cursor: pointer;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--vp-c-text-2);
}

.btn-icon:hover {
  background: var(--vp-c-default-soft);
}

.output-body {
  display: flex;
  flex: 1;
  gap: 16px;
  padding: 16px 0;
  min-height: 0;
}

.output-sidebar {
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.sidebar-section {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.section-header h3 {
  font-size: 0.85rem;
  margin: 0;
  color: var(--vp-c-text-2);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ref-count {
  font-size: 0.75rem;
  background: var(--vp-button-brand-bg);
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
}

.session-list {
  max-height: 200px;
  overflow-y: auto;
}

.session-card {
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  margin-bottom: 2px;
}

.session-card:hover {
  background: var(--vp-c-default-soft);
}

.session-card.active {
  background: var(--vp-c-brand-soft);
}

.card-title {
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-meta {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.status-dot.active { background: #4caf50; }
.status-dot.saved { background: var(--vp-c-text-3); }

.ref-list {
  max-height: 200px;
  overflow-y: auto;
}

.ref-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 4px;
  text-decoration: none;
  color: var(--vp-c-text-1);
  font-size: 0.8rem;
  transition: background 0.15s;
}

.ref-item:hover {
  background: var(--vp-c-default-soft);
}

.ref-icon { font-size: 0.75rem; }
.ref-slug { font-family: monospace; }

.refs-section {
  flex: 1;
  min-height: 100px;
}

.output-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.main-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--vp-c-text-2);
}

.empty-icon { font-size: 3rem; }
.empty-hint {
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
  text-align: center;
  padding: 8px 0;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--vp-c-bg);
  border-radius: 12px;
  padding: 24px;
  width: 420px;
  max-width: 90vw;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.modal h3 {
  margin: 0 0 16px;
  font-size: 1.1rem;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 4px;
  color: var(--vp-c-text-2);
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  font-size: 0.9rem;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  box-sizing: border-box;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}
</style>
