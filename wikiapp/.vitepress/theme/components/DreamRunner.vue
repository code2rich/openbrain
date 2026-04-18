<template>
  <div class="dream-runner">
    <div class="dream-toolbar">
      <div class="dream-info">
        <span v-if="lastDream" class="last-run">
          {{ lastDream.dreamType?.name || '梦境' }}: {{ formatTime(lastDream) }}
          <span :class="['status-badge', lastDream.status]">{{ statusLabel(lastDream.status) }}</span>
          <span v-if="lastDream.dreamType" class="dream-func">{{ lastDream.dreamType.funcRef }}·{{ lastDream.dreamType.funcName }}</span>
        </span>
        <span v-else class="last-run never">尚未进入梦境</span>
      </div>
      <div class="dream-actions">
        <button
          class="run-btn"
          :disabled="running"
          @click="startDream"
        >
          <span v-if="running" class="spinner"></span>
          {{ running ? '梦境中...' : '入梦' }}
        </button>
      </div>
    </div>

    <!-- 阶段进度 -->
    <div v-if="running || phases.length > 0" class="phase-progress">
      <div
        v-for="(phase, idx) in phases"
        :key="idx"
        :class="['phase-step', phase.status]"
      >
        <div class="phase-circle">{{ idx + 1 }}</div>
        <div class="phase-label">{{ phase.name }}</div>
      </div>
    </div>

    <!-- 实时日志 -->
    <div v-if="logs.length > 0" class="dream-logs">
      <div class="logs-header">
        <span>梦境日志</span>
        <button class="clear-btn" @click="logs = []" v-if="!running">清除</button>
      </div>
      <div class="logs-body" ref="logsBody">
        <div v-for="(log, idx) in logs" :key="idx" class="log-line">{{ log }}</div>
      </div>
    </div>

    <!-- 完成后操作 -->
    <div v-if="lastDream && lastDream.status === 'completed' && !running" class="dream-result">
      <div class="result-summary">
        <span>诊断 {{ lastDream.phases?.[0]?.summary?.slice(0, 80) || '?' }} 个问题</span>
        <span>修复 {{ lastDream.editCount || 0 }} 处</span>
      </div>

      <!-- Diff 查看 -->
      <details v-if="diffText" class="diff-section" open>
        <summary>变更差异 ({{ diffText.split('\n').length }} 行)</summary>
        <pre class="diff-content">{{ diffText }}</pre>
      </details>

      <div class="result-actions">
        <button class="accept-btn" @click="acceptDream" :disabled="acting">
          {{ acting ? '...' : '接受修改' }}
        </button>
        <button class="revert-btn" @click="revertDream" :disabled="acting">
          {{ acting ? '...' : '回滚' }}
        </button>
      </div>
    </div>

    <div v-if="!running && logs.length === 0 && !lastDream" class="dream-empty">
      <p>梦境是知识库的潜意识整理过程。</p>
      <p>它会诊断问题、发现隐藏关联、自动修复结构性缺陷，并在完成后生成变更报告供你审批。</p>
      <ul>
        <li>阶段 1：诊断 — 全面扫描知识库健康状态</li>
        <li>阶段 2：综合 — 发现隐藏的知识连接</li>
        <li>阶段 3：修复 — 自动修复结构性问题</li>
        <li>阶段 4：发现 — 分析知识空白与缺失页面</li>
        <li>阶段 5：记录 — 编写梦境日志</li>
      </ul>
      <p class="hint">每日凌晨 2:30 自动执行（深度梦），也可随时手动触发——系统根据当前时间自动选择梦境类型。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { getApiBase } from '../utils/api'
const API_BASE = getApiBase()

interface PhaseInfo {
  name: string
  status: 'pending' | 'running' | 'completed' | 'skipped' | 'failed'
}

interface DreamInfo {
  id: string
  status: string
  startedAt: string
  completedAt?: string
  phases: PhaseInfo[]
  editCount: number
  error?: string
  dreamType?: { id: string; name: string; funcName: string; funcRef: string }
}

const running = ref(false)
const acting = ref(false)
const logs = ref<string[]>([])
const phases = ref<PhaseInfo[]>([])
const lastDream = ref<DreamInfo | null>(null)
const diffText = ref<string | null>(null)
const logsBody = ref<HTMLElement | null>(null)

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${mm}-${dd} ${hh}:${mi}`
  } catch { return iso }
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    running: '运行中', completed: '已完成', failed: '失败', rolled_back: '已回滚', idle: '空闲'
  }
  return map[s] || s
}

async function fetchStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/dream/status`)
    const data = await res.json()
    if (data.status && data.status !== 'idle') {
      // 前端兜底：running 超过 30 分钟视为失败
      if (data.status === 'running' && data.startedAt) {
        const elapsed = Date.now() - new Date(data.startedAt).getTime()
        if (elapsed > 30 * 60 * 1000) {
          data.status = 'failed'
          data.error = '梦境超时未完成'
        }
      }
      lastDream.value = data
    }
  } catch { /* ignore */ }
}

async function startDream() {
  running.value = true
  logs.value = []
  phases.value = [
    { name: '诊断', status: 'pending' },
    { name: '综合', status: 'pending' },
    { name: '修复', status: 'pending' },
    { name: '发现', status: 'pending' },
    { name: '记录', status: 'pending' },
  ]

  try {
    const res = await fetch(`${API_BASE}/api/dream/start`, { method: 'POST' })
    if (!res.ok) {
      const err = await res.json()
      logs.value.push(`❌ ${err.error || '启动失败'}`)
      running.value = false
      return
    }
  } catch (err: any) {
    logs.value.push(`❌ 网络错误: ${err.message}`)
    running.value = false
    return
  }

  // SSE 实时进度
  try {
    const evtSource = new EventSource(`${API_BASE}/api/dream/stream`)
    let currentPhase = -1

    evtSource.onmessage = (event) => {
      try {
        const { progress } = JSON.parse(event.data)

        // 检测阶段切换
        const phaseMatch = progress.match(/🌙 阶段 (\d+)\/5：(.+)/)
        if (phaseMatch) {
          const phaseIdx = parseInt(phaseMatch[1]) - 1
          // 标记前面的阶段完成
          for (let i = 0; i <= phaseIdx; i++) {
            if (i < phaseIdx) phases.value[i].status = 'completed'
            else phases.value[i].status = 'running'
          }
        }

        // 检测完成
        if (progress.includes('梦境完成')) {
          phases.value.forEach(p => p.status = 'completed')
          running.value = false
          evtSource.close()
          fetchStatus()
          fetchDiff()
        }

        // 检测失败
        if (progress.includes('梦境失败')) {
          running.value = false
          evtSource.close()
          fetchStatus()
        }

        logs.value.push(progress)
        nextTick(() => {
          if (logsBody.value) {
            logsBody.value.scrollTop = logsBody.value.scrollHeight
          }
        })
      } catch { /* ignore parse error */ }
    }

    evtSource.onerror = () => {
      evtSource.close()
      // 如果还在运行，轮询状态
      if (running.value) pollStatus()
    }
  } catch { /* ignore */ }
}

async function pollStatus() {
  const interval = setInterval(async () => {
    if (!running.value) { clearInterval(interval); return }
    try {
      const res = await fetch(`${API_BASE}/api/dream/status`)
      const data = await res.json()
      if (data.status === 'completed' || data.status === 'failed') {
        running.value = false
        lastDream.value = data
        clearInterval(interval)
        if (data.status === 'completed') fetchDiff()
      }
    } catch { /* ignore */ }
  }, 5000)
}

async function fetchDiff() {
  try {
    const res = await fetch(`${API_BASE}/api/dream/diff`)
    if (res.ok) {
      const data = await res.json()
      diffText.value = data.diff || null
    }
  } catch { /* ignore */ }
}

async function acceptDream() {
  acting.value = true
  try {
    const res = await fetch(`${API_BASE}/api/dream/merge`, { method: 'POST' })
    const data = await res.json()
    if (res.ok && data.ok !== false) {
      logs.value.push('✅ 梦境修改已接受')
      lastDream.value = null
      diffText.value = null
    } else {
      logs.value.push(`❌ ${data.error || '接受失败'}`)
    }
  } catch (err: any) {
    logs.value.push(`❌ ${err.message}`)
  } finally {
    acting.value = false
  }
}

async function revertDream() {
  if (!confirm('确定回滚梦境的所有修改？')) return
  acting.value = true
  try {
    const res = await fetch(`${API_BASE}/api/dream/revert`, { method: 'POST' })
    const data = await res.json()
    if (data.ok) {
      logs.value.push('✅ 梦境修改已回滚')
      diffText.value = null
    } else {
      logs.value.push(`❌ ${data.error}`)
    }
  } catch (err: any) {
    logs.value.push(`❌ ${err.message}`)
  } finally {
    acting.value = false
  }
}

onMounted(fetchStatus)
</script>

<style scoped>
.dream-runner {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dream-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
}

.dream-info { display: flex; align-items: center; gap: 0.5rem; }

.last-run { font-size: 0.85rem; color: var(--vp-c-text-2); }
.last-run.never { color: var(--vp-c-text-3); font-style: italic; }

.status-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}
.status-badge.completed { background: #e8f5e9; color: #2e7d32; }
.status-badge.failed { background: #fbe9e7; color: #c62828; }
.status-badge.rolled_back { background: #fff3e0; color: #e65100; }
.status-badge.running { background: #e3f2fd; color: #1565c0; }

.dream-func {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 400;
  background: #f3e5f5;
  color: #7b1fa2;
  margin-left: 6px;
}

.run-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1.2rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  transition: opacity 0.2s;
}
.run-btn:hover:not(:disabled) { opacity: 0.9; }
.run-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.phase-progress {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
}

.phase-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
}

.phase-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  border: 2px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
}

.phase-step.running .phase-circle {
  border-color: #6366f1;
  color: #6366f1;
  animation: pulse 1.5s ease-in-out infinite;
}
.phase-step.completed .phase-circle {
  border-color: #22c55e;
  background: #22c55e;
  color: white;
}
.phase-step.failed .phase-circle {
  border-color: #ef4444;
  background: #ef4444;
  color: white;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
}

.phase-label {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
}

.dream-logs {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
}

.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: var(--vp-c-bg-soft);
  font-size: 0.85rem;
  font-weight: 600;
}

.clear-btn {
  background: none;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 0.75rem;
  cursor: pointer;
  color: var(--vp-c-text-2);
}

.logs-body {
  max-height: 300px;
  overflow-y: auto;
  padding: 0.5rem;
  font-family: monospace;
  font-size: 0.8rem;
  line-height: 1.5;
  background: var(--vp-c-bg);
}

.log-line {
  padding: 1px 0;
  color: var(--vp-c-text-2);
  white-space: pre-wrap;
  word-break: break-all;
}

.dream-result {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.result-summary {
  display: flex;
  gap: 1.5rem;
  padding: 0.75rem 1rem;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  font-size: 0.85rem;
}

.diff-section {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
}

.diff-section summary {
  padding: 0.5rem 0.75rem;
  background: var(--vp-c-bg-soft);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
}

.diff-content {
  max-height: 400px;
  overflow-y: auto;
  padding: 0.5rem;
  font-family: monospace;
  font-size: 0.75rem;
  line-height: 1.4;
  background: var(--vp-c-bg);
  white-space: pre-wrap;
}

.result-actions {
  display: flex;
  gap: 0.75rem;
}

.accept-btn, .revert-btn {
  flex: 1;
  padding: 0.6rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}
.accept-btn {
  background: #22c55e;
  color: white;
}
.revert-btn {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
}
.accept-btn:hover:not(:disabled), .revert-btn:hover:not(:disabled) { opacity: 0.85; }
.accept-btn:disabled, .revert-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.dream-empty {
  padding: 2rem;
  text-align: center;
  color: var(--vp-c-text-2);
  line-height: 1.8;
}

.dream-empty ul {
  text-align: left;
  display: inline-block;
  margin: 1rem 0;
}

.dream-empty .hint {
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
  font-style: italic;
}
</style>
