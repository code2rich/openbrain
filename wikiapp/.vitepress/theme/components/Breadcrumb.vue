<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vitepress'

const route = useRoute()

const CATEGORY_LABELS: Record<string, string> = {
  '01-entities': '实体页面',
  '02-topics': '主题综述',
  '03-comparisons': '对比分析',
}

const crumbs = computed(() => {
  const path = route.path
  if (!path.startsWith('/wiki/')) return null

  const parts = path.replace(/\.html$/, '').split('/').filter(Boolean)
  // parts: ['wiki', '01-entities', 'slug']
  if (parts.length < 3) return null

  const dirName = parts[1]
  return [
    { label: '首页', href: '/' },
    { label: CATEGORY_LABELS[dirName] || dirName, href: null },
  ]
})
</script>

<template>
  <nav v-if="crumbs" class="breadcrumb" aria-label="breadcrumb">
    <template v-for="(crumb, i) in crumbs" :key="i">
      <a v-if="crumb.href" :href="crumb.href" class="crumb-link">{{ crumb.label }}</a>
      <span v-else class="crumb-text">{{ crumb.label }}</span>
      <span v-if="i < crumbs.length - 1" class="crumb-sep">/</span>
    </template>
  </nav>
</template>

<style scoped>
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--vp-c-text-2);
  margin-bottom: 16px;
}

.crumb-link {
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

.crumb-link:hover {
  text-decoration: underline;
}

.crumb-sep {
  opacity: 0.4;
}
</style>
