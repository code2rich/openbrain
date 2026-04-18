<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  nodeId: string
  nodes: any[]
  pages: any[]
  backlinks: Record<string, { slug: string; title: string }[]>
}>()

const emit = defineEmits<{ close: []; navigate: [slug: string]; focus: [id: string] }>()

const node = computed(() => props.nodes.find(n => n.id === props.nodeId))
const page = computed(() => (props.pages as any[]).find(p => p.slug === props.nodeId))
const backlinkList = computed(() => props.backlinks[props.nodeId] || [])

const typeLabel: Record<string, string> = { '01-entities': '实体', '02-topics': '主题', '03-comparisons': '对比' }
const typeColor: Record<string, string> = { '01-entities': '#3b82f6', '02-topics': '#22c55e', '03-comparisons': '#f59e0b' }

const connectedNodes = computed(() => {
  if (!node.value) return []
  const links = [] as any[]
  for (const n of props.nodes) {
    // Check if this node links to/from selected
    const related = (props.pages as any[]).find(p => p.slug === n.id)?.related || []
    if (related.includes(props.nodeId) || n.id === props.nodeId) {
      // just collect neighbours from the node's related list
    }
  }
  // Simpler: use backlinks + page's own related
  const result: { slug: string; label: string; group: string; direction: string }[] = []
  const seen = new Set<string>()

  // Outgoing: from page's related
  if (page.value?.related) {
    for (const slug of page.value.related) {
      if (seen.has(slug) || slug === props.nodeId) continue
      seen.add(slug)
      const n = props.nodes.find(n => n.id === slug)
      result.push({ slug, label: n?.label || slug, group: n?.group || '', direction: 'out' })
    }
  }
  // Incoming: from backlinks
  for (const bl of backlinkList.value) {
    if (seen.has(bl.slug)) continue
    seen.add(bl.slug)
    const n = props.nodes.find(n => n.id === bl.slug)
    result.push({ slug: bl.slug, label: n?.label || bl.slug, group: n?.group || '', direction: 'in' })
  }
  return result
})
</script>

<template>
  <Transition name="slide">
    <div class="detail-panel" v-if="node">
      <div class="detail-header">
        <div class="detail-title-row">
          <span class="type-badge" :style="{ background: typeColor[node.group] || '#888' }">
            {{ typeLabel[node.group] || node.group }}
          </span>
          <h3>{{ node.label }}</h3>
        </div>
        <button class="close-btn" @click="emit('close')" title="关闭">✕</button>
      </div>

      <div class="detail-body">
        <p v-if="node.description" class="detail-desc">{{ node.description }}</p>

        <div v-if="page?.tags?.length" class="detail-section">
          <h4>标签</h4>
          <div class="tag-list">
            <span v-for="tag in page.tags" :key="tag" class="tag-pill">{{ tag }}</span>
          </div>
        </div>

        <div v-if="connectedNodes.length" class="detail-section">
          <h4>关联 ({{ connectedNodes.length }})</h4>
          <ul class="link-list">
            <li v-for="cn in connectedNodes" :key="cn.slug" @click="emit('focus', cn.slug)">
              <span class="link-dot" :style="{ background: typeColor[cn.group] || '#888' }"></span>
              {{ cn.label }}
            </li>
          </ul>
        </div>

        <div v-if="page?.sources?.length" class="detail-section">
          <h4>来源</h4>
          <ul class="source-list">
            <li v-for="s in page.sources" :key="s">{{ s }}</li>
          </ul>
        </div>
      </div>

      <div class="detail-footer">
        <button class="open-btn" @click="emit('navigate', nodeId)">打开完整页面 →</button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.detail-panel {
  width: 300px;
  height: 100%;
  background: var(--vp-c-bg);
  border-left: 1px solid var(--vp-c-divider);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.detail-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.detail-title-row h3 {
  margin: 0;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.type-badge {
  padding: 2px 8px;
  border-radius: 4px;
  color: white;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.close-btn {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 16px;
  color: var(--vp-c-text-3);
  padding: 4px;
  flex-shrink: 0;
}

.detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.detail-desc {
  color: var(--vp-c-text-2);
  font-size: 13px;
  margin: 0 0 16px;
  line-height: 1.5;
}

.detail-section {
  margin-bottom: 16px;
}

.detail-section h4 {
  font-size: 12px;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 8px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag-pill {
  padding: 2px 8px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  font-size: 11px;
  color: var(--vp-c-text-2);
}

.link-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.link-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 13px;
  cursor: pointer;
  color: var(--vp-c-text-1);
}

.link-list li:hover { color: var(--vp-c-brand-1); }

.link-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.source-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.source-list li {
  font-size: 11px;
  color: var(--vp-c-text-3);
  padding: 2px 0;
  font-family: monospace;
}

.detail-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--vp-c-divider);
}

.open-btn {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-brand-1);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}

.open-btn:hover { background: var(--vp-c-brand-1); color: white; }

.slide-enter-active, .slide-leave-active { transition: transform 0.25s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(100%); }
</style>
