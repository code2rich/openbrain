<template>
  <div class="process-queue">
    <div class="queue-header">
      <h3>摄入任务</h3>
      <button @click="loadTasks">刷新</button>
    </div>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else-if="tasks.length > 0" class="task-list">
      <div
        v-for="task in tasks"
        :key="task.id"
        :class="['task-item', task.status]"
      >
        <div class="task-summary" @click="toggleExpand(task.id)">
          <div class="task-status">
            <span class="status-icon"></span>
          </div>
          <div class="task-info">
            <span class="task-path">{{ task.filePath }}</span>
            <span class="task-meta">
              {{ task.targetCategory || '自动判断' }}
              <template v-if="task.createdAt"> · {{ formatTime(task.createdAt) }}</template>
            </span>
          </div>
          <span :class="['task-badge', task.status]">{{ statusLabel(task.status) }}</span>
          <button
            v-if="task.status === 'failed'"
            class="task-retry"
            title="重试"
            @click.stop="retryTask(task)"
          >↻</button>
          <button
            v-if="task.status === 'completed' || task.status === 'processing' || task.status === 'failed' || task.status === 'queued'"
            class="task-delete"
            title="删除任务"
            @click.stop="deleteTask(task)"
          >&times;</button>
          <span class="expand-icon">{{ expanded.has(task.id) ? '▼' : '▶' }}</span>
        </div>

        <!-- 展开详情 -->
        <div v-if="expanded.has(task.id)" class="task-detail">
          <!-- 处理结果 -->
          <div v-if="task.result" class="detail-section">
            <div class="detail-label">处理结果</div>
            <div class="detail-result">{{ task.result }}</div>
          </div>

          <div v-if="task.error" class="detail-section">
            <div class="detail-label error">错误信息</div>
            <div class="detail-error">{{ task.error }}</div>
          </div>

          <!-- 生成的 wiki 内容 -->
          <div v-if="task.wikiContent" class="detail-section">
            <div class="detail-label">
              Wiki 内容
              <span v-if="task.wikiPath" class="wiki-path">{{ task.wikiPath }}</span>
            </div>
            <pre class="wiki-content">{{ task.wikiContent }}</pre>
          </div>

          <!-- 会话过程：Claude Code 对话 -->
          <div v-if="task.prompt || task.claudeOutput" class="detail-section">
            <div class="detail-label conversation-label">会话过程</div>

            <!-- Prompt 输入 -->
            <div v-if="task.prompt" class="conversation-block">
              <div class="conv-header" @click="toggleSection('prompt_' + task.id)">
                <span class="conv-role">系统提示 (Prompt)</span>
                <span class="conv-toggle">{{ openedSections.has('prompt_' + task.id) ? '收起' : '展开' }}</span>
              </div>
              <pre v-if="openedSections.has('prompt_' + task.id)" class="conv-body prompt-body">{{ task.prompt }}</pre>
            </div>

            <!-- Claude 输出 -->
            <div v-if="task.claudeOutput" class="conversation-block">
              <div class="conv-header" @click="toggleSection('output_' + task.id)">
                <span class="conv-role">Claude 输出</span>
                <span class="conv-toggle">{{ openedSections.has('output_' + task.id) ? '收起' : '展开' }}</span>
              </div>
              <pre v-if="openedSections.has('output_' + task.id)" class="conv-body output-body">{{ task.claudeOutput }}</pre>
            </div>
          </div>

          <!-- 处理过程日志 -->
          <div v-if="task.progress && task.progress.length" class="detail-section">
            <div class="detail-label">处理过程 ({{ task.progress.length }} 步)</div>
            <div class="progress-log">
              <div
                v-for="(msg, idx) in task.progress"
                :key="idx"
                class="progress-line"
              >{{ msg }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty">暂无摄入任务</div>

    <div class="queue-tip">
      <p>💡 提示：从「浏览文件」中选择文件，点击 ⚡ 按钮即可发起摄入任务</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

import { getApiBase } from '../utils/api'
const API_BASE = getApiBase()
const loading = ref(false)
const tasks = ref<any[]>([])
const expanded = ref(new Set<string>())
const openedSections = ref(new Set<string>())

let pollInterval: number
const eventSources = new Map<string, EventSource>()

onMounted(() => {
  loadTasks()
  pollInterval = window.setInterval(loadTasks, 3000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
  eventSources.forEach((es) => es.close())
})

function toggleExpand(id: string) {
  const next = new Set(expanded.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
    // 展开时获取完整详情（含 prompt + claudeOutput）
    fetchTaskDetail(id)
  }
  expanded.value = next
}

function toggleSection(key: string) {
  const next = new Set(openedSections.value)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }
  openedSections.value = next
}

function fetchTaskDetail(id: string) {
  const task = tasks.value.find(t => t.id === id)
  if (!task) return
  // 已经有对话数据就不重复拉取
  if (task.prompt !== undefined) return

  fetch(`${API_BASE}/api/process/${id}`)
    .then(r => r.json())
    .then(detail => {
      const idx = tasks.value.findIndex(t => t.id === id)
      if (idx !== -1) {
        // 合并详情到列表中的 task
        tasks.value[idx] = { ...tasks.value[idx], ...detail }
      }
    })
    .catch(err => console.error('fetchTaskDetail error:', err))
}

function loadTasks() {
  fetch(`${API_BASE}/api/tasks`)
    .then(r => r.json())
    .then(data => {
      // 保留已展开任务的详情数据
      for (const t of data) {
        const existing = tasks.value.find(old => old.id === t.id)
        if (existing && existing.prompt !== undefined) {
          t.prompt = existing.prompt
          t.claudeOutput = existing.claudeOutput
        }
      }
      tasks.value = data
      // 为正在处理的任务建立 SSE 连接
      data.forEach((task: any) => {
        if (task.status === 'processing' && !eventSources.has(task.id)) {
          connectSSE(task.id)
        }
      })
    })
    .catch(err => console.error(err))
}

function connectSSE(taskId: string) {
  const es = new EventSource(`${API_BASE}/api/process/${taskId}/stream`)

  es.onmessage = (event) => {
    try {
      const { progress } = JSON.parse(event.data)
      const task = tasks.value.find(t => t.id === taskId)
      if (task && progress) {
        if (!task.progress) task.progress = []
        task.progress.push(progress)
      }
    } catch (e) {
      console.error('SSE parse error:', e)
    }
  }

  es.onerror = () => {
    es.close()
    eventSources.delete(taskId)
    // SSE 断开后刷新一次以拿到最终结果
    loadTasks()
  }

  eventSources.set(taskId, es)
}

function deleteTask(task: any) {
  if (!confirm(`确认删除任务「${task.filePath}」？`)) return
  fetch(`${API_BASE}/api/process/${task.id}`, { method: 'DELETE' })
    .then(r => r.json())
    .then(() => loadTasks())
    .catch(err => console.error(err))
}

function retryTask(task: any) {
  fetch(`${API_BASE}/api/process/${task.id}/retry`, { method: 'POST' })
    .then(r => r.json())
    .then(data => {
      if (data.taskId) {
        // 关闭旧任务展开，刷新列表
        expanded.value = new Set()
        loadTasks()
      }
    })
    .catch(err => console.error(err))
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    queued: '排队中',
    processing: '处理中',
    completed: '已完成',
    failed: '失败',
  }
  return map[status] || status
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  } catch {
    return ''
  }
}
</script>

<style scoped>
.process-queue {
  min-height: 400px;
}

.queue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.queue-header h3 {
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-3);
  margin: 0;
}

.queue-header button {
  padding: 0.35rem 0.75rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}

.loading, .empty {
  text-align: center;
  padding: 3rem;
  color: var(--vp-c-text-3);
  font-size: 0.9rem;
}

.task-list {
  display: flex;
  flex-direction: column;
}

.task-item {
  border-bottom: 1px solid var(--vp-c-divider);
}

.task-item:last-child {
  border-bottom: none;
}

.task-summary {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.25rem;
  cursor: pointer;
  transition: background 0.1s;
}

.task-summary:hover {
  background: var(--vp-c-bg-soft);
  margin: 0 -8px;
  padding: 0.6rem 8px;
  border-radius: 6px;
}

.status-icon {
  font-size: 0.65rem;
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.task-item.queued .status-icon { background: #f59e0b; }
.task-item.processing .status-icon { background: var(--vp-c-brand-1); animation: pulse 1.5s ease infinite; }
.task-item.completed .status-icon { background: var(--vp-c-green-1); }
.task-item.failed .status-icon { background: var(--vp-c-red-1); }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.task-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.task-path {
  font-size: 0.85rem;
  word-break: break-all;
  line-height: 1.4;
}

.task-meta {
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
}

.task-badge {
  padding: 0.1rem 0.5rem;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 500;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}

.task-badge.queued { background: rgba(245, 158, 11, 0.08); color: #d97706; }
.task-badge.processing { background: rgba(59, 130, 246, 0.08); color: #3b82f6; }
.task-badge.completed { background: rgba(34, 197, 94, 0.08); color: #16a34a; }
.task-badge.failed { background: rgba(239, 68, 68, 0.08); color: #dc2626; }

.expand-icon {
  font-size: 0.6rem;
  color: var(--vp-c-text-3);
  flex-shrink: 0;
}

.task-delete {
  background: none;
  border: none;
  font-size: 0.9rem;
  color: var(--vp-c-text-3);
  cursor: pointer;
  padding: 0 0.2rem;
  line-height: 1;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.1s;
}

.task-summary:hover .task-delete {
  opacity: 1;
}

.task-delete:hover {
  color: var(--vp-c-red-1);
}

.task-retry {
  background: none;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  font-size: 0.75rem;
  color: var(--vp-c-brand-1);
  cursor: pointer;
  padding: 0.05rem 0.35rem;
  line-height: 1;
  flex-shrink: 0;
  transition: all 0.15s;
  opacity: 0;
}

.task-summary:hover .task-retry {
  opacity: 1;
}

.task-retry:hover {
  background: var(--vp-c-brand-1);
  color: white;
  border-color: var(--vp-c-brand-1);
}

/* Detail */
.task-detail {
  padding: 0.75rem 0 0.75rem 1.25rem;
  border-left: 1px solid var(--vp-c-divider);
  margin-left: 3px;
}

.detail-section {
  margin-bottom: 0.75rem;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.3rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.detail-label.error {
  color: var(--vp-c-red-1);
}

.wiki-path {
  font-weight: 400;
  color: var(--vp-c-brand-1);
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.7rem;
}

.detail-result {
  font-size: 0.8rem;
  color: var(--vp-c-green-1);
}

.detail-error {
  font-size: 0.8rem;
  color: var(--vp-c-red-1);
}

.wiki-content {
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  padding: 0.75rem;
  font-size: 0.75rem;
  line-height: 1.5;
  max-height: 400px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: 'SF Mono', 'Fira Code', monospace;
}

/* Conversation */
.conversation-label {
  color: var(--vp-c-brand-1);
}

.conversation-block {
  margin-bottom: 0.4rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
}

.conversation-block:last-child {
  margin-bottom: 0;
}

.conv-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4rem 0.6rem;
  cursor: pointer;
  background: var(--vp-c-bg-soft);
  transition: background 0.15s;
  font-size: 0.75rem;
}

.conv-header:hover {
  background: var(--vp-c-bg);
}

.conv-role {
  font-weight: 500;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.72rem;
}

.conv-toggle {
  font-size: 0.68rem;
  color: var(--vp-c-text-3);
}

.conv-body {
  margin: 0;
  padding: 0.6rem;
  font-size: 0.72rem;
  line-height: 1.55;
  max-height: 500px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: 'SF Mono', 'Fira Code', monospace;
}

.prompt-body {
  background: #1a1a2e;
  color: #a5d6ff;
}

.output-body {
  background: #0d2818;
  color: #7ee787;
}

.progress-log {
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  padding: 0.4rem 0.6rem;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.72rem;
  max-height: 160px;
  overflow-y: auto;
}

.progress-line {
  padding: 0.08rem 0;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--vp-c-text-3);
}

.queue-tip {
  margin-top: 1.5rem;
  padding: 0.75rem;
  border-radius: 8px;
  color: var(--vp-c-text-3);
  font-size: 0.8rem;
  border: 1px dashed var(--vp-c-divider);
}

@media (max-width: 640px) {
  .task-summary {
    gap: 0.4rem;
    padding: 0.5rem 0.15rem;
  }
  .task-badge {
    display: none;
  }
  .task-delete,
  .task-retry {
    opacity: 1;
  }
}
</style>
