<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vitepress'

const props = defineProps<{ wikiPath: string }>()

import { getApiBase } from '../utils/api'
const API_BASE = getApiBase()
const apiAvailable = ref(false)
const expanded = ref(false)
const submitting = ref(false)
const suggestion = ref('')
const feedbacks = ref<any[]>([])
const expandedFeedback = ref<string | null>(null)
const feedbackDetail = ref<any>(null)
let pollTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  try {
    await fetch(`${API_BASE}/api/files`, { method: 'HEAD', signal: AbortSignal.timeout(2000) })
    apiAvailable.value = true
    loadFeedbacks()
  } catch {
    apiAvailable.value = false
  }
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

watch(() => props.wikiPath, () => {
  if (apiAvailable.value) loadFeedbacks()
})

const feedbackCount = computed(() => feedbacks.value.length)
const hasActive = computed(() => feedbacks.value.some(f => f.status === 'queued' || f.status === 'processing'))

async function loadFeedbacks() {
  if (!props.wikiPath) return
  try {
    const res = await fetch(`${API_BASE}/api/feedback?page=${encodeURIComponent(props.wikiPath)}`)
    feedbacks.value = await res.json()

    // Auto-poll when active tasks exist
    if (hasActive.value && !pollTimer) {
      pollTimer = setInterval(loadFeedbacks, 3000)
    } else if (!hasActive.value && pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  } catch { /* ignore */ }
}

async function submitFeedback() {
  if (!suggestion.value.trim()) return
  submitting.value = true
  try {
    const res = await fetch(`${API_BASE}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wikiPath: props.wikiPath, suggestion: suggestion.value.trim() }),
    })
    const data = await res.json()
    if (data.feedbackId) {
      suggestion.value = ''
      await loadFeedbacks()
      // Auto-expand the new feedback
      expandedFeedback.value = data.feedbackId
      expanded.value = true
    }
  } catch { /* ignore */ }
  submitting.value = false
}

async function toggleDetail(id: string) {
  if (expandedFeedback.value === id) {
    expandedFeedback.value = null
    feedbackDetail.value = null
    return
  }
  expandedFeedback.value = id
  try {
    const res = await fetch(`${API_BASE}/api/feedback/${id}`)
    feedbackDetail.value = await res.json()
  } catch {
    feedbackDetail.value = null
  }
}

async function retryFeedback(id: string) {
  try {
    const res = await fetch(`${API_BASE}/api/feedback/${id}/retry`, { method: 'POST' })
    const data = await res.json()
    if (data.feedbackId) {
      expandedFeedback.value = data.feedbackId
      await loadFeedbacks()
    }
  } catch { /* ignore */ }
}

async function deleteFeedback(id: string) {
  try {
    await fetch(`${API_BASE}/api/feedback/${id}`, { method: 'DELETE' })
    if (expandedFeedback.value === id) {
      expandedFeedback.value = null
      feedbackDetail.value = null
    }
    await loadFeedbacks()
  } catch { /* ignore */ }
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    queued: '排队中',
    processing: '处理中',
    completed: '已完成',
    failed: '失败',
  }
  return map[status] || status
}

function statusClass(status: string) {
  return `status-${status}`
}

function formatTime(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

const diffLines = computed(() => {
  if (!feedbackDetail.value?.diff) return []
  return feedbackDetail.value.diff.split('\n')
})
</script>

<template>
  <div v-if="apiAvailable && wikiPath" class="page-feedback">
    <div class="feedback-header" @click="expanded = !expanded">
      <span class="feedback-title">页面反馈</span>
      <span v-if="feedbackCount" class="feedback-count">{{ feedbackCount }}</span>
      <span class="feedback-arrow" :class="{ 'arrow-open': expanded }">&#9662;</span>
    </div>

    <div v-if="expanded" class="feedback-body">
      <!-- Submit area -->
      <div class="submit-area">
        <textarea
          v-model="suggestion"
          class="suggestion-input"
          placeholder="描述你希望对这个页面做的修改..."
          rows="2"
          @keydown.ctrl.enter="submitFeedback"
          @keydown.meta.enter="submitFeedback"
        />
        <button
          class="submit-btn"
          :disabled="!suggestion.trim() || submitting"
          @click="submitFeedback"
        >
          {{ submitting ? '提交中...' : '提交建议' }}
        </button>
      </div>

      <!-- Feedback list -->
      <div v-if="feedbacks.length" class="feedback-list">
        <div v-for="fb in feedbacks" :key="fb.id" class="feedback-item" :class="statusClass(fb.status)">
          <div class="feedback-summary" @click="toggleDetail(fb.id)">
            <span class="feedback-status-dot" :class="statusClass(fb.status)"></span>
            <span class="feedback-suggestion-text">{{ fb.suggestion.slice(0, 60) }}{{ fb.suggestion.length > 60 ? '...' : '' }}</span>
            <span class="feedback-time">{{ formatTime(fb.createdAt) }}</span>
            <span class="feedback-status-badge" :class="statusClass(fb.status)">{{ statusLabel(fb.status) }}</span>
            <span class="expand-arrow" :class="{ 'arrow-open': expandedFeedback === fb.id }">&#9662;</span>
          </div>

          <!-- Detail panel -->
          <div v-if="expandedFeedback === fb.id && feedbackDetail" class="feedback-detail">
            <div class="detail-section">
              <div class="detail-label">建议内容</div>
              <div class="detail-text">{{ feedbackDetail.suggestion }}</div>
            </div>

            <div v-if="feedbackDetail.result" class="detail-section">
              <div class="detail-label">处理结果</div>
              <div class="detail-text">{{ feedbackDetail.result }}</div>
            </div>

            <div v-if="feedbackDetail.error" class="detail-section">
              <div class="detail-label">错误信息</div>
              <div class="detail-text error-text">{{ feedbackDetail.error }}</div>
            </div>

            <div v-if="feedbackDetail.status === 'processing' && feedbackDetail.progress?.length" class="detail-section">
              <div class="detail-label">处理进度</div>
              <div class="progress-log">
                <div v-for="(p, i) in feedbackDetail.progress.slice(-5)" :key="i" class="progress-line">{{ p }}</div>
              </div>
            </div>

            <div v-if="feedbackDetail.diff" class="detail-section">
              <div class="detail-label">变更对比</div>
              <div class="diff-view">
                <div v-for="(line, i) in diffLines" :key="i" class="diff-line" :class="{
                  'diff-add': line.startsWith('+ '),
                  'diff-del': line.startsWith('- '),
                  'diff-ctx': line.startsWith('  '),
                }">{{ line }}</div>
              </div>
            </div>

            <div class="detail-actions">
              <button v-if="fb.status === 'failed'" class="action-btn retry-btn" @click.stop="retryFeedback(fb.id)">重试</button>
              <button class="action-btn delete-btn" @click.stop="deleteFeedback(fb.id)">删除</button>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="no-feedback">暂无反馈记录</div>
    </div>
  </div>
</template>

<style scoped>
.page-feedback {
  margin-top: 24px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
}

.feedback-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  cursor: pointer;
  background: var(--vp-c-default-soft);
  transition: background 0.2s;
}

.feedback-header:hover {
  background: var(--vp-c-default-2);
}

.feedback-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--vp-c-text-1);
}

.feedback-count {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 8px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.feedback-arrow {
  margin-left: auto;
  font-size: 12px;
  color: var(--vp-c-text-3);
  transition: transform 0.2s;
}

.feedback-arrow.arrow-open,
.expand-arrow.arrow-open {
  transform: rotate(180deg);
}

.feedback-body {
  padding: 16px;
}

/* Submit area */
.submit-area {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.suggestion-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  resize: vertical;
  min-height: 36px;
}

.suggestion-input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}

.submit-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  background: var(--vp-c-brand-1);
  color: #fff;
  white-space: nowrap;
  transition: opacity 0.2s;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submit-btn:not(:disabled):hover {
  opacity: 0.9;
}

/* Feedback list */
.feedback-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.feedback-item {
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  overflow: hidden;
}

.feedback-item.status-processing {
  border-left: 3px solid #f59e0b;
}

.feedback-item.status-completed {
  border-left: 3px solid #10b981;
}

.feedback-item.status-failed {
  border-left: 3px solid #ef4444;
}

.feedback-item.status-queued {
  border-left: 3px solid #6b7280;
}

.feedback-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.15s;
}

.feedback-summary:hover {
  background: var(--vp-c-default-soft);
}

.feedback-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.feedback-status-dot.status-queued { background: #6b7280; }
.feedback-status-dot.status-processing { background: #f59e0b; animation: pulse 1.5s infinite; }
.feedback-status-dot.status-completed { background: #10b981; }
.feedback-status-dot.status-failed { background: #ef4444; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.feedback-suggestion-text {
  flex: 1;
  color: var(--vp-c-text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feedback-time {
  font-size: 11px;
  color: var(--vp-c-text-3);
  flex-shrink: 0;
}

.feedback-status-badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.feedback-status-badge.status-queued { background: var(--vp-c-default-soft); color: var(--vp-c-text-2); }
.feedback-status-badge.status-processing { background: #fef3c7; color: #92400e; }
.feedback-status-badge.status-completed { background: #d1fae5; color: #065f46; }
.feedback-status-badge.status-failed { background: #fee2e2; color: #991b1b; }

.expand-arrow {
  font-size: 10px;
  color: var(--vp-c-text-3);
  transition: transform 0.2s;
  flex-shrink: 0;
}

/* Detail panel */
.feedback-detail {
  padding: 12px;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.detail-section {
  margin-bottom: 12px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  margin-bottom: 4px;
}

.detail-text {
  font-size: 13px;
  color: var(--vp-c-text-1);
  line-height: 1.6;
}

.error-text {
  color: #ef4444;
}

.progress-log {
  font-size: 12px;
  font-family: monospace;
  color: var(--vp-c-text-2);
  max-height: 120px;
  overflow-y: auto;
}

.progress-line {
  padding: 1px 0;
}

/* Diff view */
.diff-view {
  font-size: 12px;
  font-family: monospace;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 8px;
  max-height: 300px;
  overflow-y: auto;
  line-height: 1.5;
}

.diff-line {
  white-space: pre-wrap;
  word-break: break-all;
}

.diff-add {
  color: #10b981;
  background: rgba(16, 185, 129, 0.08);
}

.diff-del {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
  text-decoration: line-through;
}

.diff-ctx {
  color: var(--vp-c-text-3);
}

/* Actions */
.detail-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.action-btn {
  padding: 4px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  transition: all 0.15s;
}

.action-btn:hover {
  border-color: var(--vp-c-brand-1);
}

.retry-btn {
  color: var(--vp-c-brand-1);
}

.delete-btn {
  color: var(--vp-c-text-3);
}

.no-feedback {
  text-align: center;
  font-size: 13px;
  color: var(--vp-c-text-3);
  padding: 12px;
}

@media (max-width: 640px) {
  .submit-area {
    flex-direction: column;
  }
  .submit-btn {
    width: 100%;
  }
}
</style>
