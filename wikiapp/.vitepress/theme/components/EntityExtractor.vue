<template>
  <div class="entity-extractor">
    <div class="entity-toolbar">
      <div class="entity-info">
        <span v-if="candidates.length > 0" class="scan-result">
          发现 {{ candidates.length }} 个候选实体，{{ strongCandidates.length }} 个高置信
        </span>
        <span v-else-if="scanned" class="scan-result">没有发现新的候选实体</span>
        <span v-else class="scan-result never">点击「扫描」开始发现缺失的实体页</span>
      </div>
      <div class="entity-actions">
        <button class="scan-btn" :disabled="scanning" @click="scan">
          <span v-if="scanning" class="spinner"></span>
          {{ scanning ? '扫描中...' : '扫描' }}
        </button>
        <button
          v-if="strongCandidates.length > 0"
          class="generate-btn"
          :disabled="generating || selectedSlugs.length === 0"
          @click="generate"
        >
          <span v-if="generating" class="spinner"></span>
          {{ generating ? '生成中...' : `生成选中 (${selectedSlugs.length})` }}
        </button>
      </div>
    </div>

    <div v-if="scanning" class="entity-loading">
      <div class="loading-spinner"></div>
      <p>正在扫描所有 wiki 页面...</p>
    </div>

    <div v-else-if="candidates.length > 0" class="entity-list">
      <div class="select-all">
        <label class="checkbox-label">
          <input type="checkbox" :checked="allStrongSelected" @change="toggleAll" />
          <span>全选高置信候选（{{ strongCandidates.length }} 个，提及 ≥ 2 次）</span>
        </label>
      </div>

      <div
        v-for="c in candidates"
        :key="c.slug"
        :class="['entity-card', { strong: c.count >= 2, selected: selectedSlugs.includes(c.slug) }]"
        @click="toggleSelect(c.slug)"
      >
        <div class="card-header">
          <label class="checkbox-label" @click.stop>
            <input type="checkbox" :value="c.slug" v-model="selectedSlugs" />
          </label>
          <span class="card-slug">{{ c.slug }}</span>
          <span class="card-badge" :class="c.count >= 2 ? 'strong' : 'weak'">
            {{ c.count }} 次
          </span>
        </div>
        <div class="card-body">
          <span class="card-sources">
            来源: {{ c.sources.slice(0, 3).join(', ') }}{{ c.sources.length > 3 ? ` +${c.sources.length - 3}` : '' }}
          </span>
          <span v-if="c.context.length > 0" class="card-context">
            {{ c.context[0] }}
          </span>
        </div>
      </div>
    </div>

    <div v-if="generateResults.length > 0" class="generate-results">
      <h4>生成结果</h4>
      <ul>
        <li v-for="r in generateResults" :key="r.slug" :class="r.success ? 'ok' : 'fail'">
          {{ r.success ? '✅' : '❌' }} {{ r.slug }}
          <span v-if="r.error" class="error-msg">{{ r.error }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

import { getApiBase } from '../utils/api'
const API_BASE = getApiBase()

interface Candidate {
  slug: string
  count: number
  sources: string[]
  context: string[]
}

const candidates = ref<Candidate[]>([])
const selectedSlugs = ref<string[]>([])
const scanning = ref(false)
const generating = ref(false)
const scanned = ref(false)
const generateResults = ref<{ slug: string; success: boolean; error?: string }[]>([])

const strongCandidates = computed(() => candidates.value.filter(c => c.count >= 2))
const allStrongSelected = computed(() =>
  strongCandidates.value.length > 0 &&
  strongCandidates.value.every(c => selectedSlugs.value.includes(c.slug))
)

async function scan() {
  scanning.value = true
  candidates.value = []
  selectedSlugs.value = []
  generateResults.value = []
  try {
    const res = await fetch(`${API_BASE}/api/entities/candidates`)
    const data = await res.json()
    candidates.value = data.candidates || []
    scanned.value = true
  } catch (err) {
    console.error('扫描失败:', err)
  } finally {
    scanning.value = false
  }
}

function toggleSelect(slug: string) {
  const idx = selectedSlugs.value.indexOf(slug)
  if (idx === -1) selectedSlugs.value.push(slug)
  else selectedSlugs.value.splice(idx, 1)
}

function toggleAll() {
  if (allStrongSelected.value) {
    selectedSlugs.value = selectedSlugs.value.filter(s => !strongCandidates.value.find(c => c.slug === s))
  } else {
    const set = new Set(selectedSlugs.value)
    for (const c of strongCandidates.value) set.add(c.slug)
    selectedSlugs.value = Array.from(set)
  }
}

async function generate() {
  if (selectedSlugs.value.length === 0) return
  generating.value = true
  generateResults.value = []
  try {
    const res = await fetch(`${API_BASE}/api/entities/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slugs: selectedSlugs.value }),
    })
    const data = await res.json()
    generateResults.value = data.results || []

    // 从候选列表移除已生成的
    const successSlugs = new Set(generateResults.value.filter(r => r.success).map(r => r.slug.toLowerCase()))
    candidates.value = candidates.value.filter(c => !successSlugs.has(c.slug.toLowerCase()))
    selectedSlugs.value = []
  } catch (err: any) {
    generateResults.value = [{ slug: 'unknown', success: false, error: err.message }]
  } finally {
    generating.value = false
  }
}
</script>

<style scoped>
.entity-extractor {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.entity-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
}

.entity-info { display: flex; align-items: center; gap: 0.5rem; }

.scan-result { font-size: 0.85rem; color: var(--vp-c-text-2); }
.scan-result.never { color: var(--vp-c-text-3); font-style: italic; }

.entity-actions { display: flex; align-items: center; gap: 0.75rem; }

.scan-btn, .generate-btn {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.5rem 1.2rem; border: none; border-radius: 6px;
  font-size: 0.9rem; cursor: pointer; transition: opacity 0.2s;
}

.scan-btn { background: var(--vp-c-brand-1); color: white; }
.generate-btn { background: var(--vp-c-green-1); color: white; }
.scan-btn:hover:not(:disabled), .generate-btn:hover:not(:disabled) { opacity: 0.85; }
.scan-btn:disabled, .generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.entity-loading {
  display: flex; flex-direction: column; align-items: center;
  gap: 1rem; padding: 3rem; color: var(--vp-c-text-2);
}

.loading-spinner {
  width: 36px; height: 36px;
  border: 3px solid var(--vp-c-divider);
  border-top-color: var(--vp-c-brand-1);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.select-all {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--vp-c-divider);
  margin-bottom: 0.5rem;
}

.checkbox-label {
  display: inline-flex; align-items: center; gap: 0.4rem;
  font-size: 0.85rem; color: var(--vp-c-text-2); cursor: pointer;
}

.checkbox-label input { cursor: pointer; }

.entity-list {
  display: flex; flex-direction: column; gap: 0.5rem;
  max-height: 500px; overflow-y: auto;
}

.entity-card {
  display: flex; flex-direction: column; gap: 0.3rem;
  padding: 0.75rem 1rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.entity-card:hover { border-color: var(--vp-c-brand-1); }
.entity-card.selected { border-color: var(--vp-c-brand-1); background: rgba(var(--vp-c-brand-1-rgb), 0.05); }
.entity-card.strong .card-badge.strong { background: rgba(32, 201, 151, 0.15); color: #20c997; }

.card-header {
  display: flex; align-items: center; gap: 0.5rem;
}

.card-slug { font-weight: 600; font-size: 0.9rem; flex: 1; }

.card-badge {
  padding: 0.15rem 0.5rem; border-radius: 4px;
  font-size: 0.75rem; font-weight: 500;
}

.card-badge.strong { background: rgba(32, 201, 151, 0.15); color: #20c997; }
.card-badge.weak { background: var(--vp-c-bg-soft); color: var(--vp-c-text-3); }

.card-body { display: flex; flex-direction: column; gap: 0.2rem; padding-left: 1.6rem; }

.card-sources { font-size: 0.8rem; color: var(--vp-c-text-2); }
.card-context { font-size: 0.75rem; color: var(--vp-c-text-3); font-style: italic; }

.generate-results {
  padding: 1rem; background: var(--vp-c-bg-soft);
  border-radius: 8px; border: 1px solid var(--vp-c-divider);
}

.generate-results h4 { margin: 0 0 0.5rem; font-size: 0.9rem; }
.generate-results ul { list-style: none; padding: 0; margin: 0; font-size: 0.85rem; }
.generate-results li { padding: 0.2rem 0; }
.generate-results li.fail { color: var(--vp-c-red-1); }
.generate-results li.ok { color: var(--vp-c-green-1); }
.error-msg { font-size: 0.8rem; color: var(--vp-c-text-3); margin-left: 0.5rem; }
</style>
