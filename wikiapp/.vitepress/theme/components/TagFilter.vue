<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import pagesData from '../../generated/pages'
import tagsData from '../../generated/tags'

const pages = pagesData as any[]
const tagsIndex = tagsData as Record<string, any[]>

const activeTag = ref<string | null>(null)

const sortedTags = computed(() =>
  Object.entries(tagsIndex).sort(([, a], [, b]) => b.length - a.length)
)

const filteredPages = computed(() => {
  if (!activeTag.value) return pages
  const slugs = new Set(tagsIndex[activeTag.value]?.map(i => i.slug) || [])
  return pages.filter(p => slugs.has(p.slug))
})

function tagId(tag: string) {
  return tag.replace(/[^a-zA-Z0-9\u4e00-\u9fff-]/g, '_')
}

function toggleTag(tag: string) {
  activeTag.value = activeTag.value === tag ? null : tag
}

function pageUrl(page: any) {
  return `/wiki/${page.dirName}/${page.slug}.html`
}

// 从 URL hash 恢复选中状态（从首页标签云跳转过来）
onMounted(() => {
  const hash = location.hash.slice(1)
  if (hash) {
    // 反查 tagId 对应的原始 tag
    for (const [tag] of sortedTags.value) {
      if (tagId(tag) === hash) {
        activeTag.value = tag
        break
      }
    }
  }
})
</script>

<template>
  <div class="tag-page">
    <h1>标签索引</h1>
    <p class="desc">共 {{ sortedTags.length }} 个标签，{{ pages.length }} 个页面</p>

    <div class="tag-cloud">
      <button
        v-for="[tag, items] in sortedTags"
        :key="tag"
        :id="tagId(tag)"
        class="tag-item"
        :class="{ active: activeTag === tag }"
        @click="toggleTag(tag)"
      >
        {{ tag }} <span class="tag-count">{{ items.length }}</span>
      </button>
    </div>

    <div v-if="activeTag" class="filter-info">
      <span>筛选：{{ activeTag }} ({{ filteredPages.length }} 个页面)</span>
      <button class="clear-btn" @click="activeTag = null">清除筛选</button>
    </div>

    <div class="page-list">
      <a v-for="page in filteredPages" :key="page.slug" :href="pageUrl(page)" class="page-item">
        <span class="page-dir">{{ page.dirName.replace(/^\d+-/, '') }}</span>
        <span class="page-title">{{ page.title }}</span>
        <span v-if="page.description" class="page-desc">{{ page.description }}</span>
      </a>
    </div>
  </div>
</template>

<style scoped>
.tag-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}

.tag-page h1 {
  font-size: 28px;
  font-weight: 700;
}

.desc {
  color: var(--vp-c-text-2);
  margin-top: 4px;
}

.filter-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding: 12px;
  background: var(--vp-c-bg-soft);
  border-radius: 6px;
  font-size: 14px;
}

.clear-btn {
  padding: 4px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  cursor: pointer;
  background: var(--vp-c-bg);
  font-size: 13px;
}

.page-list {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.page-item {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  text-decoration: none;
  transition: border-color 0.2s;
}

.page-item:hover {
  border-color: var(--vp-c-brand-1);
}

.page-dir {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--vp-c-default-soft);
  white-space: nowrap;
}

.page-title {
  font-weight: 600;
  color: var(--vp-c-text-1);
  white-space: nowrap;
}

.page-desc {
  font-size: 14px;
  color: var(--vp-c-text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
