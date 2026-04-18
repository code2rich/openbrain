<script setup lang="ts">
defineEmits<{ 'zoom-in': []; 'zoom-out': []; 'fit-all': []; reset: [] }>()
</script>

<template>
  <div class="map-controls">
    <button @click="$emit('zoom-in')" title="放大">+</button>
    <button @click="$emit('zoom-out')" title="缩小">−</button>
    <button @click="$emit('fit-all')" title="适应全部">⊡</button>
    <button @click="$emit('reset')" title="重置">⌂</button>
  </div>
</template>

<style scoped>
.map-controls {
  position: absolute;
  left: 12px;
  bottom: 12px;
  display: flex;
  gap: 4px;
}

.map-controls button {
  width: 32px;
  height: 32px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.map-controls button:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}
</style>
