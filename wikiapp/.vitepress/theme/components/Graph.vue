<script setup lang="ts">
import { ref, onMounted, onUnmounted, shallowRef } from 'vue'
import { useRouter } from 'vitepress'
import graphData from '../../generated/graph-data-echarts'

const containerRef = ref<HTMLDivElement>()
const router = useRouter()
const chartInstance = shallowRef<any>(null)

const categoryColors: Record<string, string> = {
  '01-entities': '#3b82f6',
  '02-topics': '#22c55e',
  '03-comparisons': '#f59e0b',
}

const categoryLabels: Record<string, string> = {
  '01-entities': '实体',
  '02-topics': '主题',
  '03-comparisons': '对比',
}

let resizeObserver: ResizeObserver | null = null

onMounted(async () => {
  if (!containerRef.value) return
  const echarts = await import('echarts')

  const chart = echarts.init(containerRef.value)
  chartInstance.value = chart

  const { nodes: rawNodes, links: rawLinks } = graphData as any

  const categories = Object.keys(categoryLabels).map((key, i) => ({
    name: categoryLabels[key],
    itemStyle: { color: categoryColors[key] },
  }))

  const nodes = rawNodes.map((n: any) => ({
    id: n.id,
    name: n.label,
    category: Object.keys(categoryLabels).indexOf(n.dirName),
    symbolSize: Math.max(12, Math.min(40, (n.weight || 1) * 8 + 8)),
    itemStyle: { color: categoryColors[n.dirName] || '#888' },
    label: { show: true, fontSize: 11, color: '#999' },
    value: n.description || '',
  }))

  const links = rawLinks.map((l: any) => ({
    source: l.source,
    target: l.target,
    lineStyle: { opacity: 0.2, width: 0.8 },
  }))

  const isDark = document.documentElement.classList.contains('dark')

  chart.setOption({
    tooltip: {
      trigger: 'item',
      backgroundColor: isDark ? '#1e1e1e' : '#fff',
      borderColor: isDark ? '#333' : '#e5e5e5',
      textStyle: { color: isDark ? '#ccc' : '#333', fontSize: 13 },
      formatter: (params: any) => {
        if (params.dataType === 'node') {
          return `<strong>${params.name}</strong><br/><span style="color:#999;font-size:12px">${params.data.value || ''}</span>`
        }
        return `${params.data.source} → ${params.data.target}`
      },
    },
    legend: {
      data: categories.map(c => c.name),
      bottom: 16,
      textStyle: { color: isDark ? '#888' : '#666', fontSize: 12 },
      itemWidth: 12,
      itemHeight: 12,
      itemGap: 20,
    },
    series: [{
      type: 'graph',
      layout: 'force',
      animation: true,
      animationDuration: 800,
      data: nodes,
      links: links,
      categories: categories,
      roam: true,
      draggable: true,
      force: {
        repulsion: 180,
        gravity: 0.08,
        edgeLength: [60, 140],
        friction: 0.6,
      },
      label: {
        position: 'right',
        fontSize: 11,
        color: isDark ? '#888' : '#666',
      },
      lineStyle: {
        color: isDark ? '#333' : '#ddd',
        width: 0.8,
        curveness: 0.1,
      },
      emphasis: {
        focus: 'adjacency',
        label: { fontSize: 13, fontWeight: 'bold' },
        lineStyle: { width: 2, opacity: 0.6 },
      },
      blur: {
        itemStyle: { opacity: 0.2 },
        lineStyle: { opacity: 0.05 },
      },
    }],
  })

  chart.on('click', (params: any) => {
    if (params.dataType === 'node') {
      const node = rawNodes.find((n: any) => n.id === params.data.id)
      if (node) {
        router.go(`/wiki/${node.dirName}/${node.id}.html`)
      }
    }
  })

  resizeObserver = new ResizeObserver(() => chart.resize())
  resizeObserver.observe(containerRef.value)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  chartInstance.value?.dispose()
})
</script>

<template>
  <div class="graph-page">
    <div class="graph-header">
      <h1>知识图谱</h1>
      <p class="desc">页面之间的关联。点击节点跳转，滚轮缩放，拖拽平移。</p>
    </div>
    <div ref="containerRef" class="graph-container"></div>
  </div>
</template>

<style scoped>
.graph-page {
  max-width: 100%;
  padding: 24px;
  box-sizing: border-box;
}

.graph-header {
  margin-bottom: 16px;
}

.graph-header h1 {
  font-size: 1.5rem;
  font-weight: 300;
  letter-spacing: -0.3px;
  margin: 0 0 0.2rem;
}

.desc {
  color: var(--vp-c-text-3);
  font-size: 0.82rem;
  margin: 0;
}

.graph-container {
  width: 100%;
  height: calc(100vh - 200px);
  min-height: 400px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
  background: var(--vp-c-bg);
}
</style>
