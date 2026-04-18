<template>
  <div class="lint-runner">
    <div class="lint-toolbar">
      <div class="lint-info">
        <span v-if="lastRun" class="last-run">
          上次检查: {{ formatTime(lastRun) }}
        </span>
        <span v-else class="last-run never">从未运行过</span>
      </div>
      <div class="lint-actions">
        <label class="deep-toggle">
          <input type="checkbox" v-model="deepMode" />
          <span>深度扫描（暗线发现）</span>
        </label>
        <button
          class="run-btn"
          :disabled="running"
          @click="runLint"
        >
          <span v-if="running" class="spinner"></span>
          {{ running ? '检查中...' : '触发检查' }}
        </button>
      </div>
    </div>

    <div v-if="running" class="lint-loading">
      <div class="loading-spinner"></div>
      <p>正在扫描知识库...</p>
    </div>

    <div v-else-if="result" class="lint-result">
      <div class="result-header" :class="result.success ? 'success' : 'error'">
        {{ result.success ? '检查完成' : '检查异常' }}
      </div>

      <div v-if="result.result" class="result-body">
        <div v-if="result.result.orphans.length > 0" class="issue-section orphans">
          <h4>孤立页面 ({{ result.result.orphans.length }})</h4>
          <ul>
            <li v-for="item in result.result.orphans" :key="item">{{ item }}</li>
          </ul>
        </div>

        <div v-if="result.result.stalePages.length > 0" class="issue-section stale">
          <h4>即将过时 ({{ result.result.stalePages.length }})</h4>
          <ul>
            <li v-for="item in result.result.stalePages" :key="item">{{ item }}</li>
          </ul>
        </div>

        <div v-if="result.result.unusedPages.length > 0" class="issue-section unused">
          <h4>知识未使用 ({{ result.result.unusedPages.length }})</h4>
          <ul>
            <li v-for="item in result.result.unusedPages.slice(0, 20)" :key="item">{{ item }}</li>
          </ul>
          <p v-if="result.result.unusedPages.length > 20" class="more">
            ... 还有 {{ result.result.unusedPages.length - 20 }} 个
          </p>
        </div>

        <div v-if="result.result.missingScenes.length > 0" class="issue-section scenes">
          <h4>缺少使用场景 ({{ result.result.missingScenes.length }})</h4>
          <ul>
            <li v-for="item in result.result.missingScenes" :key="item">{{ item }}</li>
          </ul>
        </div>

        <div v-if="result.result.missingInsights.length > 0" class="issue-section insights">
          <h4>缺少个人洞察 ({{ result.result.missingInsights.length }})</h4>
          <ul>
            <li v-for="item in result.result.missingInsights" :key="item">{{ item }}</li>
          </ul>
        </div>

        <div v-if="result.result.hiddenConnections && result.result.hiddenConnections.length > 0" class="issue-section connections">
          <h4>暗线发现 ({{ result.result.hiddenConnections.length }})</h4>
          <ul>
            <li v-for="(conn, idx) in result.result.hiddenConnections" :key="idx">
              <strong>{{ conn.pageA }}</strong> ↔ <strong>{{ conn.pageB }}</strong>
              <span class="confidence">[{{ conn.confidence }}]</span>
              <p class="conn-reason">{{ conn.reason }}</p>
            </li>
          </ul>
        </div>

        <div v-if="!hasIssues" class="no-issues">
          知识库健康，无明显问题
        </div>
      </div>

      <details v-if="result.output" class="raw-output">
        <summary>原始输出</summary>
        <pre>{{ result.output }}</pre>
      </details>
    </div>

    <div v-else class="lint-empty">
      <p>点击「触发检查」开始扫描知识库健康状况</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

import { getApiBase } from '../utils/api'
const API_BASE = getApiBase()

interface LintResult {
  orphans: string[]
  stalePages: string[]
  unusedPages: string[]
  missingScenes: string[]
  missingInsights: string[]
  hiddenConnections: { pageA: string; pageB: string; reason: string; confidence: string }[]
  summary: string
}

const lastRun = ref<string | null>(null)
const running = ref(false)
const deepMode = ref(false)
const result = ref<{
  success: boolean
  lastRun: string
  output: string
  error?: string
  result?: LintResult
} | null>(null)

const hasIssues = computed(() => {
  if (!result.value?.result) return false
  const r = result.value.result
  return r.orphans.length + r.stalePages.length + r.unusedPages.length +
    r.missingScenes.length + r.missingInsights.length +
    (r.hiddenConnections?.length || 0) > 0
})

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  } catch {
    return iso
  }
}

async function fetchStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/lint/status`)
    const data = await res.json()
    lastRun.value = data.lastRun
  } catch { /* ignore */ }
}

async function runLint() {
  running.value = true
  result.value = null
  try {
    const res = await fetch(`${API_BASE}/api/lint/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deep: deepMode.value }),
    })
    result.value = await res.json()
    lastRun.value = result.value.lastRun
  } catch (err: any) {
    result.value = {
      success: false,
      lastRun: new Date().toISOString(),
      output: '',
      error: err.message,
      result: undefined,
    }
  } finally {
    running.value = false
  }
}

onMounted(fetchStatus)
</script>

<style scoped>
.lint-runner {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.lint-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
}

.last-run {
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
}

.last-run.never {
  font-style: italic;
}

.lint-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.deep-toggle {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
  cursor: pointer;
}

.deep-toggle input {
  cursor: pointer;
}

.run-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.9rem;
  background: var(--vp-c-brand-1);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.8rem;
  cursor: pointer;
  font-weight: 500;
}

.run-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.lint-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2.5rem;
  color: var(--vp-c-text-3);
  font-size: 0.85rem;
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 2px solid var(--vp-c-divider);
  border-top-color: var(--vp-c-brand-1);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.lint-result {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  overflow: hidden;
}

.result-header {
  padding: 0.6rem 0.75rem;
  font-weight: 500;
  font-size: 0.82rem;
  letter-spacing: 0.01em;
}

.result-header.success {
  background: rgba(34, 197, 94, 0.06);
  color: #16a34a;
}

.result-header.error {
  background: rgba(239, 68, 68, 0.06);
  color: #dc2626;
}

.result-body {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  max-height: 480px;
  overflow-y: auto;
}

.issue-section h4 {
  margin: 0 0 0.3rem;
  font-size: 0.82rem;
  font-weight: 500;
}

.issue-section ul {
  margin: 0;
  padding-left: 1rem;
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
}

.issue-section li {
  margin-bottom: 0.15rem;
}

.confidence {
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
  margin-left: 0.2rem;
}

.conn-reason {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  margin: 0.15rem 0 0.4rem;
}

.more {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  font-style: italic;
  margin: 0.2rem 0 0;
}

.no-issues {
  text-align: center;
  padding: 1.25rem;
  color: #16a34a;
  font-size: 0.85rem;
}

.raw-output {
  border-top: 1px solid var(--vp-c-divider);
  font-size: 0.75rem;
}

.raw-output summary {
  padding: 0.4rem 0.75rem;
  cursor: pointer;
  color: var(--vp-c-text-3);
  font-size: 0.75rem;
}

.raw-output pre {
  margin: 0;
  padding: 0.75rem;
  overflow-x: auto;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 0.7rem;
  font-family: 'SF Mono', 'Fira Code', monospace;
  max-height: 180px;
  overflow-y: auto;
}

.lint-empty {
  text-align: center;
  padding: 2.5rem;
  color: var(--vp-c-text-3);
  font-size: 0.85rem;
}
</style>
