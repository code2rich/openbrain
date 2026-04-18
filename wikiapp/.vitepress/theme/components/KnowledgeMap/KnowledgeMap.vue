<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vitepress'
import graphData from '../../../generated/graph-data'
import pagesData from '../../../generated/pages'
import backlinksData from '../../../generated/backlinks'
import MapDetailPanel from './MapDetailPanel.vue'
import MapSidebar from './MapSidebar.vue'
import MapMinimap from './MapMinimap.vue'
import MapControls from './MapControls.vue'

const router = useRouter()
const containerRef = ref<HTMLDivElement>()

const typeColor: Record<string, string> = {
  '01-entities': '#3b82f6',
  '02-topics': '#22c55e',
  '03-comparisons': '#f59e0b',
}

// Reactive state
const selectedNodeId = ref<string | null>(null)
const searchQuery = ref('')
const activeTag = ref<string | null>(null)
const typeFilters = reactive<Record<string, boolean>>({
  '01-entities': true,
  '02-topics': true,
  '03-comparisons': true,
})
const clusterFilters = reactive<Record<string, boolean>>({})
const sidebarOpen = ref(true)
const currentTransform = ref<any>(null)

// D3 refs (assigned in onMounted)
let d3: any = null
let simulation: any = null
let svg: any = null
let g: any = null
let nodeGroups: any = null
let linkElements: any = null
let zoomBehavior: any = null
let resizeObserver: ResizeObserver | null = null

// Cluster definitions
const clusters = (graphData as any).clusters as { id: string; label: string; color: string; cx: number; cy: number }[]
for (const c of clusters) clusterFilters[c.id] = true

function isNodeVisible(node: any): boolean {
  if (!typeFilters[node.group]) return false
  if (!clusterFilters[node.cluster]) return false
  if (activeTag.value && !(node.tags || []).includes(activeTag.value)) return false
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    const match = node.label?.toLowerCase().includes(q)
      || node.description?.toLowerCase().includes(q)
      || node.tags?.some((t: string) => t.toLowerCase().includes(q))
    if (!match) return false
  }
  return true
}

function nodeWidth(weight: number): number {
  return Math.min(90 + (weight || 1) * 4, 160)
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

// ── Visibility update (called on filter/search/select changes) ──
function applyVisibility() {
  if (!nodeGroups || !linkElements || !d3) return

  const selId = selectedNodeId.value
  const connectedIds = new Set<string>()

  if (selId) {
    const links = (graphData as any).links
    for (const link of links) {
      const s = typeof link.source === 'object' ? link.source.id : link.source
      const t = typeof link.target === 'object' ? link.target.id : link.target
      if (s === selId) connectedIds.add(t)
      if (t === selId) connectedIds.add(s)
    }
    connectedIds.add(selId)
  }

  nodeGroups.each(function (d: any) {
    const el = this as SVGGElement
    const visible = isNodeVisible(d)
    const isSelected = d.id === selId
    const isConnected = connectedIds.has(d.id)

    if (selId && !isConnected) el.style.opacity = '0.12'
    else if (!visible) el.style.opacity = '0.06'
    else el.style.opacity = '1'

    const card = el.querySelector('.card-bg')
    if (card) {
      if (isSelected) {
        card.setAttribute('stroke-width', '3')
        card.setAttribute('filter', 'drop-shadow(0 2px 8px rgba(0,0,0,0.18))')
      } else {
        card.setAttribute('stroke-width', '1.5')
        card.removeAttribute('filter')
      }
    }
  })

  linkElements.each(function (d: any) {
    const el = this as SVGLineElement
    if (selId) {
      const s = d.source?.id || d.source
      const t = d.target?.id || d.target
      const on = s === selId || t === selId
      el.setAttribute('stroke-opacity', on ? '0.7' : '0.04')
      el.setAttribute('stroke', on ? 'var(--vp-c-brand-1)' : 'var(--vp-c-divider)')
    } else {
      el.setAttribute('stroke-opacity', '0.35')
      el.setAttribute('stroke', 'var(--vp-c-divider)')
    }
  })
}

// ── Main mount: D3 setup ──
onMounted(async () => {
  if (!containerRef.value) return
  d3 = await import('d3')

  const container = containerRef.value
  const width = container.clientWidth
  const height = container.clientHeight

  const rawNodes = (graphData as any).nodes as any[]
  const links = JSON.parse(JSON.stringify((graphData as any).links))
  const clusterDefs = clusters
  const clusterMap = new Map(clusterDefs.map(c => [c.id, c]))

  // SVG
  svg = d3.select(container).append('svg').attr('width', '100%').attr('height', '100%')
  g = svg.append('g')

  // Cluster bubbles
  g.append('g').attr('class', 'cluster-bubbles')
    .selectAll('rect')
    .data(clusterDefs)
    .join('rect')
    .attr('rx', 16).attr('ry', 16)
    .attr('fill', (d: any) => d.color).attr('fill-opacity', 0.05)
    .attr('stroke', (d: any) => d.color).attr('stroke-opacity', 0.12).attr('stroke-width', 1.5)
    .attr('visibility', 'hidden')

  // Cluster labels
  g.append('g').attr('class', 'cluster-labels')
    .selectAll('text')
    .data(clusterDefs)
    .join('text')
    .text((d: any) => d.label)
    .attr('fill', (d: any) => d.color).attr('fill-opacity', 0.45)
    .attr('font-size', 13).attr('font-weight', 600)
    .attr('visibility', 'hidden')

  // Links
  linkElements = g.append('g').attr('class', 'links')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('stroke', 'var(--vp-c-divider)').attr('stroke-opacity', 0.35)

  // Nodes
  nodeGroups = g.append('g').attr('class', 'nodes')
    .selectAll('g')
    .data(rawNodes)
    .join('g')
    .attr('cursor', 'pointer')
    .call(d3.drag<SVGGElement, any>()
      .on('start', (ev: any, d: any) => { if (!ev.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
      .on('drag', (ev: any, d: any) => { d.fx = ev.x; d.fy = ev.y })
      .on('end', (ev: any, d: any) => { if (!ev.active) simulation.alphaTarget(0); d.fx = null; d.fy = null })
    )

  // Render each node as card
  nodeGroups.each(function (d: any) {
    const el = d3.select(this)
    const w = nodeWidth(d.weight)
    const h = 34
    const color = typeColor[d.group] || '#888'

    el.append('rect').attr('class', 'card-bg')
      .attr('rx', 6).attr('ry', 6)
      .attr('width', w).attr('height', h)
      .attr('x', -w / 2).attr('y', -h / 2)
      .attr('fill', 'var(--vp-c-bg-soft)')
      .attr('stroke', color).attr('stroke-width', 1.5)

    el.append('rect')
      .attr('x', -w / 2).attr('y', -h / 2)
      .attr('width', 3.5).attr('height', h)
      .attr('rx', 1.5).attr('fill', color)

    el.append('text')
      .text(truncate(d.label, 10))
      .attr('text-anchor', 'middle').attr('dy', 5)
      .attr('font-size', 12).attr('font-weight', 500)
      .attr('fill', 'var(--vp-c-text-1)')
  })

  // Events
  nodeGroups.on('click', (ev: MouseEvent, d: any) => { ev.stopPropagation(); selectedNodeId.value = d.id })
  nodeGroups.on('dblclick', (_ev: MouseEvent, d: any) => { router.go(`/wiki/${d.group}/${d.id}.html`) })
  svg.on('click', () => { selectedNodeId.value = null })

  // Force simulation
  simulation = d3.forceSimulation(rawNodes)
    .force('link', d3.forceLink(links).id((d: any) => d.id)
      .distance((d: any) => (d.source?.cluster ?? (d.source as any).cluster) === (d.target?.cluster ?? (d.target as any).cluster) ? 70 : 160)
      .strength(0.4))
    .force('charge', d3.forceManyBody().strength(-140))
    .force('clusterX', d3.forceX((d: any) => (clusterMap.get(d.cluster)?.cx || 0) + width / 2).strength(0.12))
    .force('clusterY', d3.forceY((d: any) => (clusterMap.get(d.cluster)?.cy || 0) + height / 2).strength(0.12))
    .force('collision', d3.forceCollide().radius((d: any) => nodeWidth(d.weight) / 2 + 10))
    .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))

  simulation.on('tick', () => {
    linkElements
      .attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y)

    nodeGroups.attr('transform', (d: any) => `translate(${d.x},${d.y})`)

    // Cluster bubbles
    g.select('.cluster-bubbles').selectAll('rect').each(function (cd: any) {
      const members = rawNodes.filter((n: any) => n.cluster === cd.id && n.x != null)
      const sel = d3.select(this)
      if (!members.length) { sel.attr('visibility', 'hidden'); return }
      sel.attr('visibility', 'visible')
      const pad = 35
      const xs = members.map((n: any) => n.x)
      const ys = members.map((n: any) => n.y)
      const minX = Math.min(...xs) - 65 - pad, minY = Math.min(...ys) - 22 - pad
      const maxX = Math.max(...xs) + 65 + pad, maxY = Math.max(...ys) + 22 + pad
      sel.attr('x', minX).attr('y', minY).attr('width', maxX - minX).attr('height', maxY - minY)
    })

    g.select('.cluster-labels').selectAll('text').each(function (cd: any) {
      const members = rawNodes.filter((n: any) => n.cluster === cd.id && n.x != null)
      const sel = d3.select(this)
      if (!members.length) { sel.attr('visibility', 'hidden'); return }
      sel.attr('visibility', 'visible')
      const xs = members.map((n: any) => n.x)
      const minY = Math.min(...members.map((n: any) => n.y))
      sel.attr('x', Math.min(...xs)).attr('y', minY - 30)
    })
  })

  // Zoom
  zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.15, 4])
    .on('zoom', (ev: any) => { g.attr('transform', ev.transform); currentTransform.value = ev.transform })

  svg.call(zoomBehavior)

  // Auto-fit after simulation settles
  setTimeout(() => {
    const bounds = (g.node() as SVGGElement).getBBox()
    if (!bounds.width) return
    const s = Math.min(width / (bounds.width + 100), height / (bounds.height + 100)) * 0.85
    const cs = Math.max(0.15, Math.min(s, 1.5))
    const tx = width / 2 - (bounds.x + bounds.width / 2) * cs
    const ty = height / 2 - (bounds.y + bounds.height / 2) * cs
    svg.transition().duration(600).call(zoomBehavior.transform, d3.zoomIdentity.translate(tx, ty).scale(cs))
  }, 2000)

  // Responsive
  resizeObserver = new ResizeObserver(() => {
    const w = container.clientWidth, h = container.clientHeight
    simulation.force('center', d3.forceCenter(w / 2, h / 2))
    simulation.force('clusterX', d3.forceX((d: any) => (clusterMap.get(d.cluster)?.cx || 0) + w / 2).strength(0.12))
    simulation.force('clusterY', d3.forceY((d: any) => (clusterMap.get(d.cluster)?.cy || 0) + h / 2).strength(0.12))
    simulation.alpha(0.3).restart()
  })
  resizeObserver.observe(container)
})

onUnmounted(() => { resizeObserver?.disconnect(); simulation?.stop() })

// Watch state changes → update visibility
watch([selectedNodeId, searchQuery, typeFilters, clusterFilters, activeTag], () => nextTick(applyVisibility), { deep: true })

// ── Public methods ──
function focusNode(id: string) {
  const target = ((graphData as any).nodes as any[]).find(n => n.id === id)
  if (!target || !zoomBehavior || !svg || !d3) return
  const w = containerRef.value!.clientWidth, h = containerRef.value!.clientHeight
  const s = 1.3
  svg.transition().duration(500).call(zoomBehavior.transform, d3.zoomIdentity.translate(w / 2 - (target.x || 0) * s, h / 2 - (target.y || 0) * s).scale(s))
  selectedNodeId.value = id
}

function fitAll() {
  if (!zoomBehavior || !svg || !g || !d3) return
  const bounds = (g.node() as SVGGElement).getBBox()
  if (!bounds.width) return
  const w = containerRef.value!.clientWidth, h = containerRef.value!.clientHeight
  const s = Math.min(w / (bounds.width + 100), h / (bounds.height + 100)) * 0.85
  const cs = Math.max(0.15, Math.min(s, 1.5))
  svg.transition().duration(500).call(zoomBehavior.transform, d3.zoomIdentity.translate(w / 2 - (bounds.x + bounds.width / 2) * cs, h / 2 - (bounds.y + bounds.height / 2) * cs).scale(cs))
}

function resetView() {
  if (!zoomBehavior || !svg || !d3) return
  svg.transition().duration(500).call(zoomBehavior.transform, d3.zoomIdentity)
}

function zoomIn() { if (zoomBehavior && svg && d3) svg.transition().duration(300).call(zoomBehavior.scaleBy, 1.3) }
function zoomOut() { if (zoomBehavior && svg && d3) svg.transition().duration(300).call(zoomBehavior.scaleBy, 0.7) }

function navigateTo(slug: string) {
  const node = ((graphData as any).nodes as any[]).find(n => n.id === slug)
  if (node) router.go(`/wiki/${node.group}/${slug}.html`)
}
</script>

<template>
  <div class="kmap-page">
    <MapSidebar
      v-if="sidebarOpen"
      :nodes="(graphData as any).nodes"
      :clusters="clusters"
      :pages="pagesData"
      v-model:search="searchQuery"
      :type-filters="typeFilters"
      :cluster-filters="clusterFilters"
      :active-tag="activeTag"
      :selected-id="selectedNodeId"
      @select="focusNode"
      @toggle-sidebar="sidebarOpen = !sidebarOpen"
      @update:active-tag="activeTag = $event"
    />
    <button v-else class="sidebar-toggle" @click="sidebarOpen = true" title="展开侧栏">☰</button>

    <div class="kmap-canvas-wrapper">
      <div ref="containerRef" class="kmap-canvas"></div>
      <MapControls @zoom-in="zoomIn" @zoom-out="zoomOut" @fit-all="fitAll" @reset="resetView" />
      <MapMinimap
        v-if="currentTransform"
        :nodes="(graphData as any).nodes"
        :transform="currentTransform"
        :container-width="containerRef?.clientWidth || 800"
        :container-height="containerRef?.clientHeight || 600"
      />
    </div>

    <MapDetailPanel
      v-if="selectedNodeId"
      :node-id="selectedNodeId"
      :nodes="(graphData as any).nodes"
      :pages="pagesData"
      :backlinks="backlinksData"
      @close="selectedNodeId = null"
      @navigate="navigateTo"
      @focus="focusNode"
    />
  </div>
</template>

<style scoped>
.kmap-page { display: flex; width: 100%; height: calc(100vh - var(--vp-nav-height, 56px)); overflow: hidden; position: relative; }
.kmap-canvas-wrapper { flex: 1; position: relative; overflow: hidden; }
.kmap-canvas { width: 100%; height: 100%; background: var(--vp-c-bg); }
.sidebar-toggle {
  position: absolute; left: 8px; top: 8px; z-index: 10;
  width: 36px; height: 36px; border: 1px solid var(--vp-c-divider); border-radius: 6px;
  background: var(--vp-c-bg); cursor: pointer; font-size: 18px;
  display: flex; align-items: center; justify-content: center; color: var(--vp-c-text-2);
}
</style>
