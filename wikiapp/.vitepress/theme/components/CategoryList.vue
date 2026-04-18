<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vitepress'
import pagesData from '../../generated/pages'

const route = useRoute()
const pages = pagesData as { slug: string; title: string; description: string; dirName: string; tags: string[]; created: string; updated: string }[]

const CATEGORY_META: Record<string, { label: string; desc: string }> = {
  '01-entities': { label: '实体页面', desc: '人物、公司、产品、概念的专门页面' },
  '02-topics': { label: '主题综述', desc: '某个领域的系统性总结' },
  '03-comparisons': { label: '对比分析', desc: '不同方案、观点的横向比较' },
}

const dirName = computed(() => {
  const match = route.path.match(/wiki\/(\d{2}-\w+)/)
  return match ? match[1] : ''
})

const meta = computed(() => CATEGORY_META[dirName.value] || { label: '', desc: '' })

const categoryPages = computed(() =>
  pages
    .filter(p => p.dirName === dirName.value)
    .sort((a, b) => a.title.localeCompare(b.title, 'zh'))
)
</script>

<template>
  <div class="category-list" v-if="dirName">
    <h1>{{ meta.label }}</h1>
    <p class="desc">{{ meta.desc }} · 共 {{ categoryPages.length }} 篇</p>

    <div class="page-cards">
      <a
        v-for="page in categoryPages"
        :key="page.slug"
        :href="`/wiki/${page.dirName}/${page.slug}.html`"
        class="card"
      >
        <div class="card-header">
          <h3>{{ page.title }}</h3>
          <span class="card-date">{{ page.updated || page.created }}</span>
        </div>
        <p class="card-desc">{{ page.description }}</p>
        <div class="card-tags" v-if="page.tags.length">
          <span v-for="tag in page.tags.slice(0, 4)" :key="tag" class="tag">{{ tag }}</span>
        </div>
      </a>
    </div>
  </div>
</template>

<style scoped>
.category-list {
  max-width: 800px;
  margin: 0 auto;
}

.category-list h1 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
}

.desc {
  color: var(--vp-c-text-2);
  margin-bottom: 24px;
}

.page-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card {
  padding: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  text-decoration: none;
  transition: border-color 0.2s;
  background: var(--vp-c-bg-soft);
}

.card:hover {
  border-color: var(--vp-c-brand-1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
}

.card-header h3 {
  margin: 0;
  font-size: 17px;
  color: var(--vp-c-text-1);
}

.card-date {
  font-size: 12px;
  color: var(--vp-c-text-3);
  white-space: nowrap;
}

.card-desc {
  margin: 0 0 10px;
  font-size: 14px;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--vp-c-default-soft);
}
</style>
