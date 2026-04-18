<template>
  <div class="log-page">
    <div class="log-header">
      <h1>操作日志</h1>
      <p class="subtitle">知识库操作时间线 — 按日期浏览摄入、梦境、查询、归档、维护记录</p>
    </div>

    <!-- 统计概览 -->
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-value">{{ logData.length }}</span>
        <span class="stat-label">活跃天数</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ totalItems }}</span>
        <span class="stat-label">操作记录</span>
      </div>
      <div class="stat-item" v-for="t in typeStats" :key="t.type">
        <span class="stat-value" :style="{ color: typeColors[t.type] }">{{ t.count }}</span>
        <span class="stat-label">{{ t.label }}</span>
      </div>
    </div>

    <!-- 类型筛选 -->
    <div class="filter-bar">
      <button
        :class="['filter-btn', { active: !activeType }]"
        @click="activeType = null"
      >全部</button>
      <button
        v-for="t in typeStats"
        :key="t.type"
        :class="['filter-btn', { active: activeType === t.type }]"
        :style="activeType === t.type ? { background: typeColors[t.type], color: '#fff' } : {}"
        @click="activeType = t.type"
      >{{ t.label }}</button>
    </div>

    <div class="log-body">
      <!-- 日期列表 -->
      <div class="date-list">
        <div
          v-for="entry in filteredData"
          :key="entry.date"
          :class="['date-item', { active: selectedDate === entry.date }]"
          @click="selectedDate = entry.date"
        >
          <span class="date-label">{{ entry.date.slice(5) }}</span>
          <span class="date-count">{{ countItems(entry) }}</span>
        </div>
      </div>

      <!-- 日志内容 -->
      <div class="log-content">
        <template v-if="currentEntry">
          <div class="date-header">{{ currentEntry.date }}</div>

          <div v-for="section in filteredSections" :key="section.label" class="section-block">
            <div class="section-header">
              <span class="type-badge" :style="{ background: typeColors[section.type] }">
                {{ section.label }}
              </span>
            </div>
            <ul class="item-list">
              <li v-for="(item, idx) in section.items" :key="idx" v-html="renderItem(item)"></li>
            </ul>
          </div>

          <div v-if="filteredSections.length === 0" class="empty-msg">
            当前筛选条件下无记录
          </div>
        </template>
        <div v-else class="empty-msg">选择左侧日期查看日志</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import logData from '../../generated/log-data'
import slugMap from '../../generated/slug-map'

interface LogSection {
  type: string
  label: string
  items: string[]
}

interface LogEntry {
  date: string
  sections: LogSection[]
}

const typeColors: Record<string, string> = {
  ingest: '#4caf50',
  dream: '#6366f1',
  query: '#2196f3',
  filing: '#ff9800',
  lint: '#9c27b0',
  init: '#607d8b',
  other: '#795548',
}

const typeLabels: Record<string, string> = {
  ingest: '摄入',
  dream: '梦境',
  query: '查询',
  filing: '归档',
  lint: '维护',
  init: '初始化',
  other: '其他',
}

const activeType = ref<string | null>(null)
const selectedDate = ref<string>((logData as LogEntry[])[0]?.date || '')

const filteredData = computed(() => {
  if (!activeType.value) return logData as LogEntry[]
  return (logData as LogEntry[]).filter(e =>
    e.sections.some(s => s.type === activeType.value)
  )
})

const currentEntry = computed(() => {
  return (logData as LogEntry[]).find(e => e.date === selectedDate.value)
})

const filteredSections = computed(() => {
  if (!currentEntry.value) return []
  if (!activeType.value) return currentEntry.value.sections
  return currentEntry.value.sections.filter(s => s.type === activeType.value)
})

const totalItems = computed(() => {
  return (logData as LogEntry[]).reduce((n, e) =>
    n + e.sections.reduce((m, s) => m + s.items.length, 0), 0
  )
})

const typeStats = computed(() => {
  const counts: Record<string, number> = {}
  for (const entry of logData as LogEntry[]) {
    for (const s of entry.sections) {
      counts[s.type] = (counts[s.type] || 0) + s.items.length
    }
  }
  return Object.entries(counts)
    .map(([type, count]) => ({ type, count, label: typeLabels[type] || type }))
    .sort((a, b) => b.count - a.count)
})

function countItems(entry: LogEntry) {
  if (!activeType.value) {
    return entry.sections.reduce((n, s) => n + s.items.length, 0)
  }
  return entry.sections
    .filter(s => s.type === activeType.value)
    .reduce((n, s) => n + s.items.length, 0)
}

function renderItem(item: string) {
  // Convert [[slug]] and [[slug|display]] into clickable links
  return item.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_match, slug: string, display?: string) => {
      const url = (slugMap as Record<string, string>)[slug]
      const text = display || slug
      if (url) {
        return `<a href="${url}" class="wiki-link">${text}</a>`
      }
      return `<span class="wiki-link wiki-link-broken">${text}</span>`
    }
  )
}
</script>

<style scoped>
.log-page {
  width: 100%;
}

.log-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.log-header h1 {
  font-size: 1.5rem;
  font-weight: 300;
  letter-spacing: -0.3px;
  margin-bottom: 0.3rem;
}

.subtitle {
  color: var(--vp-c-text-3);
  font-size: 0.82rem;
}

/* Stats */
.stats-bar {
  display: flex;
  gap: 1.25rem;
  justify-content: center;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.stat-item {
  text-align: center;
  min-width: 50px;
}

.stat-value {
  display: block;
  font-size: 1.25rem;
  font-weight: 300;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.5px;
}

.stat-label {
  display: block;
  font-size: 0.68rem;
  color: var(--vp-c-text-3);
  margin-top: 1px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

/* Filter */
.filter-bar {
  display: flex;
  gap: 0.35rem;
  justify-content: center;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  background: transparent;
  color: var(--vp-c-text-3);
  cursor: pointer;
  font-size: 0.78rem;
  transition: all 0.15s;
}

.filter-btn:hover {
  border-color: var(--vp-c-text-2);
  color: var(--vp-c-text-1);
}

.filter-btn.active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-1);
  color: #fff;
}

/* Body layout */
.log-body {
  display: flex;
  gap: 1.25rem;
  min-height: 500px;
}

/* Date list */
.date-list {
  width: 120px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.date-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.35rem 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-text-3);
  transition: all 0.1s;
}

.date-item:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.date-item.active {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-weight: 500;
}

.date-count {
  font-size: 0.65rem;
  background: var(--vp-c-bg-soft);
  padding: 1px 5px;
  border-radius: 8px;
  color: var(--vp-c-text-3);
}

.date-item.active .date-count {
  background: var(--vp-c-brand-1);
  color: #fff;
}

/* Content area */
.log-content {
  flex: 1;
  min-width: 0;
  border-left: 1px solid var(--vp-c-divider);
  padding-left: 1.25rem;
}

.date-header {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--vp-c-text-1);
}

.section-block {
  margin-bottom: 1rem;
}

.section-header {
  margin-bottom: 0.3rem;
}

.type-badge {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 4px;
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.item-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.item-list li {
  padding: 0.25rem 0;
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  line-height: 1.45;
  border-bottom: 1px solid var(--vp-c-divider);
}

.item-list li:last-child {
  border-bottom: none;
}

.wiki-link {
  color: var(--vp-c-brand-1);
  font-weight: 450;
  text-decoration: none;
}

.wiki-link:hover {
  text-decoration: underline;
}

.wiki-link-broken {
  color: var(--vp-c-text-3);
  text-decoration: line-through;
  opacity: 0.5;
}

.empty-msg {
  text-align: center;
  color: var(--vp-c-text-3);
  padding: 2.5rem;
  font-size: 0.85rem;
}

@media (max-width: 768px) {
  .log-body {
    flex-direction: column;
  }

  .date-list {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 4px;
  }

  .log-content {
    border-left: none;
    padding-left: 0;
    border-top: 1px solid var(--vp-c-divider);
    padding-top: 0.75rem;
  }
}
</style>
