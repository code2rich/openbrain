<script setup lang="ts">
import { computed } from 'vue'
import tagsIndex from '../../../generated/tags'

const props = defineProps<{
  nodes: any[]
  clusters: { id: string; label: string; color: string }[]
  pages: any[]
  search: string
  typeFilters: Record<string, boolean>
  clusterFilters: Record<string, boolean>
  activeTag: string | null
  selectedId: string | null
}>()

const emit = defineEmits<{
  'update:search': [value: string]
  'update:active-tag': [value: string | null]
  select: [id: string]
  'toggle-sidebar': []
}>()

const typeLabels: Record<string, string> = {
  '01-entities': '实体',
  '02-topics': '主题',
  '03-comparisons': '对比',
}
const typeColors: Record<string, string> = {
  '01-entities': '#3b82f6',
  '02-topics': '#22c55e',
  '03-comparisons': '#f59e0b',
}

// Tags: top 20 by page count
const topTags = computed(() => {
  const entries = Object.entries(tagsIndex as Record<string, any[]>)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 20)
  return entries.map(([tag, pages]) => ({ tag, count: pages.length }))
})

function toggleTag(tag: string) {
  emit('update:active-tag', props.activeTag === tag ? null : tag)
}

const filteredNodes = computed(() => {
  let list = props.nodes as any[]

  // Type + cluster
  list = list.filter(n =>
    props.typeFilters[n.group] && props.clusterFilters[n.cluster]
  )

  // Tag filter
  if (props.activeTag) {
    list = list.filter(n => n.tags?.includes(props.activeTag))
  }

  // Search
  if (props.search) {
    const q = props.search.toLowerCase()
    list = list.filter(n =>
      n.label?.toLowerCase().includes(q) ||
      n.description?.toLowerCase().includes(q) ||
      n.tags?.some((t: string) => t.toLowerCase().includes(q))
    )
  }

  return list.sort((a, b) => (b.weight || 0) - (a.weight || 0))
})
</script>

<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <h3>知识地图</h3>
      <button class="collapse-btn" @click="emit('toggle-sidebar')" title="收起侧栏">◀</button>
    </div>

    <!-- Search -->
    <div class="sidebar-section">
      <input
        class="search-input"
        type="text"
        placeholder="搜索标题、标签..."
        :value="search"
        @input="emit('update:search', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <!-- Type filters -->
    <div class="sidebar-section">
      <h4>类型</h4>
      <label v-for="(label, key) in typeLabels" :key="key" class="filter-item">
        <input type="checkbox" v-model="(typeFilters as any)[key]" />
        <span class="filter-dot" :style="{ background: typeColors[key] }"></span>
        {{ label }}
      </label>
    </div>

    <!-- Cluster filters -->
    <div class="sidebar-section">
      <h4>领域</h4>
      <label v-for="c in clusters" :key="c.id" class="filter-item">
        <input type="checkbox" v-model="(clusterFilters as any)[c.id]" />
        <span class="filter-dot" :style="{ background: c.color }"></span>
        {{ c.label }}
      </label>
    </div>

    <!-- Tag cloud -->
    <div class="sidebar-section">
      <h4>标签 <span v-if="activeTag" class="clear-tag" @click="emit('update:active-tag', null)">✕ 清除</span></h4>
      <div class="tag-cloud">
        <button
          v-for="t in topTags"
          :key="t.tag"
          :class="['tag-btn', { active: activeTag === t.tag }]"
          @click="toggleTag(t.tag)"
        >
          {{ t.tag }} <span class="tag-count">{{ t.count }}</span>
        </button>
      </div>
    </div>

    <!-- Node list -->
    <div class="sidebar-section node-list-section">
      <h4>{{ filteredNodes.length }} 个节点</h4>
      <ul class="node-list">
        <li
          v-for="n in filteredNodes"
          :key="n.id"
          :class="{ active: n.id === selectedId }"
          @click="emit('select', n.id)"
        >
          <span class="node-dot" :style="{ background: typeColors[n.group] || '#888' }"></span>
          <span class="node-label">{{ n.label }}</span>
          <span v-if="n.weight > 2" class="node-weight">{{ n.weight }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  width: 220px;
  height: 100%;
  background: var(--vp-c-bg);
  border-right: 1px solid var(--vp-c-divider);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.sidebar-header h3 { margin: 0; font-size: 15px; }

.collapse-btn {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 12px;
  color: var(--vp-c-text-3);
  padding: 4px;
}

.sidebar-section {
  padding: 10px 14px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.sidebar-section h4 {
  font-size: 11px;
  color: var(--vp-c-text-3);
  letter-spacing: 0.5px;
  margin: 0 0 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.clear-tag {
  font-size: 11px;
  color: var(--vp-c-brand-1);
  cursor: pointer;
  font-weight: 400;
}

.search-input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 13px;
  box-sizing: border-box;
}

.search-input:focus { outline: none; border-color: var(--vp-c-brand-1); }

.filter-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;
  padding: 3px 0;
  color: var(--vp-c-text-2);
}

.filter-item input { accent-color: var(--vp-c-brand-1); }

.filter-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Tag cloud */
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag-btn {
  padding: 2px 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 11px;
  cursor: pointer;
}

.tag-btn:hover { border-color: var(--vp-c-brand-1); color: var(--vp-c-text-1); }

.tag-btn.active {
  background: var(--vp-c-brand-1);
  color: white;
  border-color: var(--vp-c-brand-1);
}

.tag-count {
  font-size: 10px;
  opacity: 0.6;
  margin-left: 2px;
}

/* Node list */
.node-list-section {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-bottom: none;
}

.node-list {
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  flex: 1;
}

.node-list li {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 4px;
  font-size: 12px;
  cursor: pointer;
  border-radius: 4px;
  color: var(--vp-c-text-2);
}

.node-list li:hover { background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); }
.node-list li.active { background: var(--vp-c-brand-1); color: white; }
.node-list li.active .node-dot { background: white !important; }

.node-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.node-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-weight {
  font-size: 10px;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-soft);
  padding: 1px 5px;
  border-radius: 8px;
}

.node-list li.active .node-weight {
  background: rgba(255,255,255,0.2);
  color: white;
}
</style>
