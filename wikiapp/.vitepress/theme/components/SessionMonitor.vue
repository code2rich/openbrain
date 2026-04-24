<template>
  <div class="session-monitor">
    <!-- Left: Session List -->
    <div class="session-list">
      <div class="list-header">
        <h3>Claude Code 会话</h3>
        <div class="list-filters">
          <button :class="['filter-btn', { active: filter === 'all' }]" @click="filter = 'all'">
            全部 ({{ allSessions.length }})
          </button>
          <button :class="['filter-btn', { active: filter === 'task' }]" @click="filter = 'task'">
            摄入任务 ({{ taskSessionCount }})
          </button>
          <button :class="['filter-btn', { active: filter === 'cli' }]" @click="filter = 'cli'">
            CLI ({{ cliSessionCount }})
          </button>
        </div>
      </div>
      <div class="list-body">
        <div
          v-for="s in filteredSessions"
          :key="s.id"
          :class="['session-card', { selected: selectedId === s.id, active: s.isActive }]"
          @click="selectSession(s)"
        >
          <div class="card-header">
            <span v-if="s.isActive" class="pulse-dot"></span>
            <span class="card-source">{{ s.source === 'task' ? '摄入' : 'CLI' }}</span>
            <span class="card-time">{{ formatTime(s.lastActivity) }}</span>
          </div>
          <div class="card-preview">
            <template v-if="s.source === 'task'">{{ s.filePath || s.preview }}</template>
            <template v-else>{{ s.preview || '(无预览)' }}</template>
          </div>
          <div class="card-meta">{{ s.messageCount }}条消息 · {{ s.toolCallCount }}次工具</div>
        </div>
        <div v-if="filteredSessions.length === 0" class="empty-state">暂无会话记录</div>
      </div>
    </div>

    <!-- Right: Session Detail -->
    <div class="session-detail">
      <template v-if="currentSession">
        <div class="detail-header">
          <div class="detail-title">
            <span v-if="currentSession.isActive" class="pulse-dot"></span>
            <span class="detail-source-badge">{{ currentSession.source === 'task' ? '摄入任务' : 'CLI 会话' }}</span>
            <span>{{ detailTitle }}</span>
          </div>
          <div class="detail-meta">{{ formatTime(currentSession.timestamp) }}</div>
        </div>
        <div class="detail-body" ref="detailBody">
          <template v-for="(msg, idx) in messages" :key="idx">
            <!-- User message -->
            <div v-if="msg.type === 'user'" class="msg msg-user">
              <div class="msg-role">User</div>
              <div class="msg-content user-bubble">
                <template v-if="typeof msg.content === 'string'">{{ msg.content }}</template>
                <template v-else>
                  <template v-for="(block, bi) in msg.content" :key="bi">
                    <div v-if="block.type === 'tool_result'" class="inline-tool-result">
                      <span class="result-label">Tool Result</span>
                      <span :class="['result-status', { error: block.is_error }]">
                        {{ block.is_error ? 'Error' : 'OK' }}
                      </span>
                      <pre class="result-preview">{{ String(block.content || '').slice(0, 500) }}</pre>
                    </div>
                    <div v-else>{{ block.text || JSON.stringify(block).slice(0, 200) }}</div>
                  </template>
                </template>
              </div>
              <div class="msg-time">{{ formatTimeShort(msg.timestamp) }}</div>
            </div>

            <!-- Assistant message -->
            <div v-else-if="msg.type === 'assistant'" class="msg msg-assistant">
              <div class="msg-role">Claude</div>
              <div class="msg-content">
                <template v-if="Array.isArray(msg.content)">
                  <template v-for="(block, bi) in msg.content" :key="bi">
                    <!-- Thinking -->
                    <div v-if="block.type === 'thinking'" class="block-thinking">
                      <div class="thinking-toggle" @click="toggle(`${idx}-${bi}`)">
                        <span class="toggle-icon">{{ isExpanded(`${idx}-${bi}`) ? '▾' : '▸' }}</span>
                        思考 ({{ (block.thinking || block.text || '').length }}字)
                      </div>
                      <div v-if="isExpanded(`${idx}-${bi}`)" class="thinking-body">
                        {{ block.thinking || block.text }}
                      </div>
                    </div>
                    <!-- Text -->
                    <div v-else-if="block.type === 'text'" class="block-text">{{ block.text }}</div>
                    <!-- Tool use -->
                    <div v-else-if="block.type === 'tool_use'" class="block-tool">
                      <div class="tool-header" @click="toggle(`tool-${idx}-${bi}`)">
                        <span class="tool-icon">{{ toolIcon(block.name) }}</span>
                        <span class="tool-name">{{ block.name }}</span>
                        <span class="tool-summary">{{ toolSummary(block) }}</span>
                        <span class="toggle-icon">{{ isExpanded(`tool-${idx}-${bi}`) ? '▾' : '▸' }}</span>
                      </div>
                      <div v-if="isExpanded(`tool-${idx}-${bi}`)" class="tool-detail">
                        <div class="tool-section">
                          <div class="tool-label">输入</div>
                          <pre>{{ formatJSON(block.input) }}</pre>
                        </div>
                      </div>
                    </div>
                  </template>
                </template>
                <div v-else class="block-text">{{ msg.content }}</div>
              </div>
              <div class="msg-time">{{ formatTimeShort(msg.timestamp) }}</div>
            </div>
          </template>
          <div v-if="isLoading" class="loading-indicator">加载中...</div>
        </div>
      </template>
      <div v-else class="empty-state detail-empty">选择左侧会话查看详情</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { getApiBase } from '../utils/api'

const API_BASE = getApiBase()

interface SessionInfo {
  id: string
  source: 'jsonl' | 'task'
  project: string
  preview: string
  timestamp: string
  lastActivity: string
  messageCount: number
  toolCallCount: number
  isActive: boolean
  size: number
  filePath?: string
}

const allSessions = ref<SessionInfo[]>([])
const selectedId = ref<string | null>(null)
const messages = ref<any[]>([])
const filter = ref<'all' | 'task' | 'cli'>('all')
const isLoading = ref(false)
const detailBody = ref<HTMLElement | null>(null)
const expandedSet = ref(new Set<string>())
let listPollTimer: number | null = null

const taskSessionCount = computed(() => allSessions.value.filter(s => s.source === 'task').length)
const cliSessionCount = computed(() => allSessions.value.filter(s => s.source === 'jsonl').length)
const filteredSessions = computed(() => {
  if (filter.value === 'task') return allSessions.value.filter(s => s.source === 'task')
  if (filter.value === 'cli') return allSessions.value.filter(s => s.source === 'jsonl')
  return allSessions.value
})
const currentSession = computed(() =>
  selectedId.value ? allSessions.value.find(s => s.id === selectedId.value) : null
)
const detailTitle = computed(() => {
  const s = currentSession.value
  if (!s) return ''
  if (s.source === 'task') return s.filePath?.split('/').pop() || s.preview?.slice(0, 40)
  return s.preview?.slice(0, 60) || s.id.slice(0, 12)
})

function isExpanded(key: string) { return expandedSet.value.has(key) }
function toggle(key: string) {
  const s = new Set(expandedSet.value)
  s.has(key) ? s.delete(key) : s.add(key)
  expandedSet.value = s
}

function toolIcon(name: string) {
  const icons: Record<string, string> = {
    Bash: '⌨', Read: '📄', Write: '✏', Edit: '📝', Glob: '🔍', Grep: '🔎',
    Agent: '🤖', WebSearch: '🌐', LSP: '🔧',
  }
  return icons[name] || '🔧'
}
function toolSummary(block: any) {
  const i = block.input || {}
  if (block.name === 'Bash') return (i.command || '').slice(0, 80)
  if (['Read', 'Write', 'Edit'].includes(block.name)) return i.file_path?.split('/').pop() || ''
  if (['Grep', 'Glob'].includes(block.name)) return (i.pattern || '').slice(0, 60)
  if (block.name === 'Agent') return i.description || ''
  return ''
}
function formatJSON(obj: any) {
  if (!obj) return ''
  try { return JSON.stringify(obj, null, 2) } catch { return String(obj) }
}
function formatTime(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function formatTimeShort(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

async function loadSessions() {
  const merged: SessionInfo[] = []
  try {
    // Load JSONL sessions (host CLI)
    const [jsonlRes, tasksRes] = await Promise.all([
      fetch(`${API_BASE}/api/sessions`).catch(() => null),
      fetch(`${API_BASE}/api/tasks`).catch(() => null),
    ])
    if (jsonlRes?.ok) {
      const data = await jsonlRes.json()
      for (const s of data.sessions || []) {
        merged.push({ ...s, source: 'jsonl' })
      }
    }
    // Load task sessions (container API processing)
    if (tasksRes?.ok) {
      const data = await tasksRes.json()
      for (const t of data) {
        const sm = t.sessionMessages || []
        if (sm.length > 0 || t.status === 'processing') {
          merged.push({
            id: `task-${t.id}`,
            source: 'task',
            project: '',
            preview: t.filePath?.split('/').pop() || '',
            timestamp: t.createdAt,
            lastActivity: t.completedAt || t.createdAt,
            messageCount: sm.length,
            toolCallCount: sm.reduce((c: number, m: any) => {
              if (m.type === 'assistant' && Array.isArray(m.content)) {
                return c + m.content.filter((b: any) => b.type === 'tool_use').length
              }
              return c
            }, 0),
            isActive: t.status === 'processing',
            size: 0,
            filePath: t.filePath,
          })
        }
      }
    }
  } catch (e) {
    console.error('Failed to load sessions:', e)
  }
  merged.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
  allSessions.value = merged
}

async function selectSession(s: SessionInfo) {
  selectedId.value = s.id
  isLoading.value = true
  messages.value = []
  expandedSet.value = new Set()

  try {
    if (s.source === 'jsonl') {
      const res = await fetch(`${API_BASE}/api/sessions/${s.id}`)
      const data = await res.json()
      messages.value = data.messages || []
    } else {
      // Task session - fetch task detail
      const taskId = s.id.replace('task-', '')
      const res = await fetch(`${API_BASE}/api/process/${taskId}`)
      const data = await res.json()
      // Build session from task data
      if (data.prompt) {
        messages.value.push({ type: 'user', timestamp: data.createdAt, content: data.prompt.slice(0, 2000) })
      }
      if (data.sessionMessages?.length) {
        // Merge tool_result from user messages into preceding tool_use
        const taskMsgs = data.sessionMessages
        for (const msg of taskMsgs) {
          if (msg.type === 'user' && Array.isArray(msg.content)) {
            const results = msg.content.filter((b: any) => b.type === 'tool_result')
            if (results.length > 0) {
              // Attach results to the previous assistant message's tool_use blocks
              const prevAssistant = [...messages.value].reverse().find(m => m.type === 'assistant')
              if (prevAssistant?.content) {
                for (const r of results) {
                  const toolBlock = prevAssistant.content.find((b: any) => b.toolUseId === r.tool_use_id || b.id === r.tool_use_id)
                  if (toolBlock) toolBlock.result = r
                }
              }
            }
          }
          messages.value.push(msg)
        }
      }
      if (data.wikiContent) {
        messages.value.push({
          type: 'assistant',
          timestamp: data.completedAt || new Date().toISOString(),
          content: [{ type: 'text', text: `[Wiki 页面已生成]\n\n${data.wikiContent.slice(0, 1000)}` }],
        })
      }
    }
  } catch (e) {
    console.error('Failed to load session detail:', e)
  } finally {
    isLoading.value = false
  }
  await nextTick()
  scrollToBottom()
}

function scrollToBottom() {
  if (detailBody.value) detailBody.value.scrollTop = detailBody.value.scrollHeight
}

onMounted(() => {
  loadSessions()
  listPollTimer = window.setInterval(loadSessions, 5000)
})
onUnmounted(() => {
  if (listPollTimer) clearInterval(listPollTimer)
})
</script>

<style scoped>
.session-monitor {
  display: flex;
  height: calc(100vh - 180px);
  min-height: 500px;
  gap: 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  background: var(--vp-c-bg);
}
.session-list {
  width: 280px;
  min-width: 280px;
  border-right: 1px solid var(--vp-c-divider);
  display: flex;
  flex-direction: column;
}
.list-header { padding: 12px 14px; border-bottom: 1px solid var(--vp-c-divider); }
.list-header h3 { margin: 0 0 8px 0; font-size: 14px; color: var(--vp-c-text-1); }
.list-filters { display: flex; gap: 6px; }
.filter-btn {
  padding: 3px 8px; font-size: 11px; border: 1px solid var(--vp-c-divider);
  border-radius: 10px; background: transparent; color: var(--vp-c-text-2); cursor: pointer;
}
.filter-btn.active { background: var(--vp-c-brand-1); color: #fff; border-color: var(--vp-c-brand-1); }
.list-body { flex: 1; overflow-y: auto; }

.session-card {
  padding: 8px 14px; border-bottom: 1px solid var(--vp-c-divider);
  cursor: pointer; transition: background 0.15s;
}
.session-card:hover { background: var(--vp-c-bg-soft); }
.session-card.selected { background: var(--vp-c-bg-soft-mute); border-left: 3px solid var(--vp-c-brand-1); }
.card-header { display: flex; align-items: center; gap: 5px; margin-bottom: 3px; }
.card-source {
  font-size: 10px; padding: 1px 5px; border-radius: 3px;
  background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); font-weight: 600;
}
.card-time { font-size: 11px; color: var(--vp-c-text-3); }
.pulse-dot {
  width: 7px; height: 7px; border-radius: 50%; background: #22c55e;
  animation: pulse 2s infinite; flex-shrink: 0;
}
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.card-preview {
  font-size: 12px; color: var(--vp-c-text-1);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;
}
.card-meta { font-size: 10px; color: var(--vp-c-text-3); }

.session-detail { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.detail-header {
  padding: 10px 16px; border-bottom: 1px solid var(--vp-c-divider);
  display: flex; justify-content: space-between; align-items: center;
}
.detail-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 600; color: var(--vp-c-text-1);
  overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
}
.detail-source-badge {
  font-size: 10px; padding: 2px 6px; border-radius: 3px; flex-shrink: 0;
  background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); font-weight: 600;
}
.detail-meta { font-size: 11px; color: var(--vp-c-text-3); flex-shrink: 0; }
.detail-body { flex: 1; overflow-y: auto; padding: 14px 16px; }

.msg { margin-bottom: 14px; }
.msg-role { font-size: 11px; font-weight: 600; color: var(--vp-c-text-2); margin-bottom: 3px; }
.msg-user .msg-content {
  background: var(--vp-c-bg-soft); padding: 8px 12px; border-radius: 8px;
  font-size: 12px; white-space: pre-wrap; word-break: break-word;
}
.msg-assistant .msg-content { padding-left: 4px; }

.inline-tool-result {
  margin-top: 6px; padding: 6px 8px; border: 1px dashed var(--vp-c-divider); border-radius: 4px;
}
.result-label { font-size: 10px; font-weight: 600; color: var(--vp-c-text-3); }
.result-status { font-size: 10px; margin-left: 6px; color: var(--vp-c-green-1); }
.result-status.error { color: var(--vp-c-red-1); }
.result-preview {
  margin: 4px 0 0; padding: 4px; font-size: 10px;
  white-space: pre-wrap; max-height: 100px; overflow-y: auto;
  font-family: var(--vp-font-family-mono);
}

.block-text {
  font-size: 12px; white-space: pre-wrap; word-break: break-word;
  margin-bottom: 6px; color: var(--vp-c-text-1);
}
.block-thinking {
  margin-bottom: 6px; border: 1px solid var(--vp-c-divider); border-radius: 5px; overflow: hidden;
}
.thinking-toggle {
  padding: 5px 8px; font-size: 11px; color: var(--vp-c-text-2);
  cursor: pointer; background: var(--vp-c-bg-soft);
  display: flex; align-items: center; gap: 4px;
}
.thinking-body {
  padding: 8px; font-size: 11px; color: var(--vp-c-text-2); font-style: italic;
  white-space: pre-wrap; max-height: 250px; overflow-y: auto;
}
.block-tool {
  margin-bottom: 6px; border: 1px solid var(--vp-c-divider); border-radius: 5px; overflow: hidden;
}
.tool-header {
  padding: 5px 8px; background: var(--vp-c-bg-soft);
  display: flex; align-items: center; gap: 5px; cursor: pointer; font-size: 11px;
}
.tool-icon { font-size: 13px; }
.tool-name { font-weight: 600; color: var(--vp-c-brand-1); }
.tool-summary {
  flex: 1; color: var(--vp-c-text-2); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
}
.toggle-icon { color: var(--vp-c-text-3); font-size: 10px; }
.tool-detail { border-top: 1px solid var(--vp-c-divider); }
.tool-section { }
.tool-label { font-size: 10px; font-weight: 600; color: var(--vp-c-text-3); padding: 5px 8px 2px; }
.tool-section pre {
  margin: 0; padding: 6px 8px; font-size: 10px;
  white-space: pre-wrap; word-break: break-all; max-height: 180px; overflow-y: auto;
  background: var(--vp-c-bg-soft); font-family: var(--vp-font-family-mono);
}
.msg-time { font-size: 10px; color: var(--vp-c-text-3); margin-top: 2px; }

.empty-state {
  display: flex; align-items: center; justify-content: center;
  height: 100%; color: var(--vp-c-text-3); font-size: 13px;
}
.detail-empty { min-height: 300px; }
.loading-indicator { text-align: center; padding: 16px; color: var(--vp-c-text-3); }
</style>
