<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps<{
  nodes: any[]
  transform: { x: number; y: number; k: number }
  containerWidth: number
  containerHeight: number
}>()

const minimapRef = ref<HTMLCanvasElement>()

const typeColor: Record<string, string> = {
  '01-entities': '#3b82f6',
  '02-topics': '#22c55e',
  '03-comparisons': '#f59e0b',
}

const W = 160, H = 110

function render() {
  const canvas = minimapRef.value
  if (!canvas || !props.nodes?.length) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, W, H)

  // Compute bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const n of props.nodes) {
    if (n.x == null) continue
    minX = Math.min(minX, n.x); minY = Math.min(minY, n.y)
    maxX = Math.max(maxX, n.x); maxY = Math.max(maxY, n.y)
  }
  const pad = 50
  minX -= pad; minY -= pad; maxX += pad; maxY += pad
  const scaleX = W / (maxX - minX || 1)
  const scaleY = H / (maxY - minY || 1)
  const scale = Math.min(scaleX, scaleY)

  const ox = (W - (maxX - minX) * scale) / 2
  const oy = (H - (maxY - minY) * scale) / 2

  const toX = (x: number) => (x - minX) * scale + ox
  const toY = (y: number) => (y - minY) * scale + oy

  // Draw nodes
  for (const n of props.nodes) {
    if (n.x == null) continue
    ctx.fillStyle = typeColor[n.group] || '#888'
    ctx.beginPath()
    ctx.arc(toX(n.x), toY(n.y), 2, 0, Math.PI * 2)
    ctx.fill()
  }

  // Draw viewport rect
  if (props.transform) {
    const { x, y, k } = props.transform
    const vw = props.containerWidth / k
    const vh = props.containerHeight / k
    const vx = -x / k
    const vy = -y / k

    ctx.strokeStyle = 'var(--vp-c-brand-1, #7c3aed)'
    ctx.strokeStyle = '#7c3aed'
    ctx.lineWidth = 1
    ctx.strokeRect(toX(vx), toY(vy), vw * scale, vh * scale)
  }
}

watch(() => [props.transform, props.nodes], render, { deep: true })

let raf: number | null = null
function scheduledRender() {
  if (raf) cancelAnimationFrame(raf)
  raf = requestAnimationFrame(render)
}

onMounted(() => render())
onUnmounted(() => { if (raf) cancelAnimationFrame(raf) })
</script>

<template>
  <div class="minimap">
    <canvas ref="minimapRef" :width="W" :height="H" />
  </div>
</template>

<style scoped>
.minimap {
  position: absolute;
  right: 12px;
  bottom: 44px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  overflow: hidden;
  opacity: 0.85;
}

.minimap:hover { opacity: 1; }
</style>
