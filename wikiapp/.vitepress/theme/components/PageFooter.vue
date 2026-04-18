<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute, useData } from 'vitepress'
import pagesData from '../../generated/pages'
import backlinksData from '../../generated/backlinks'
import prevNextData from '../../generated/prev-next'
import sourcesData from '../../generated/sources'
import PageFeedback from './PageFeedback.vue'

const route = useRoute()
const { frontmatter } = useData()

const pages = pagesData as { slug: string; title: string; description: string; dirName: string; created: string; updated: string; tags: string[]; related: string[] }[]
const backlinks = backlinksData as Record<string, { slug: string; title: string; dirName: string }[]>
const prevNext = prevNextData as Record<string, { prev?: { slug: string; title: string }; next?: { slug: string; title: string } }>
const sourcesMap = sourcesData as Record<string, string[]>

import { getApiBase } from '../utils/api'
const API_BASE = getApiBase()
const apiAvailable = ref(false)
const previewSource = ref<{ name: string; path: string; type?: string; content?: string; url?: string; message?: string } | null>(null)
const previewLoading = ref(false)

onMounted(async () => {
  try {
    await fetch(`${API_BASE}/api/files`, { method: 'HEAD', signal: AbortSignal.timeout(2000) })
    apiAvailable.value = true
  } catch {
    apiAvailable.value = false
  }
})

function slugFromPath(path: string) {
  const parts = path.replace(/\.html$/, '').split('/')
  return parts[parts.length - 1] || ''
}

function pageUrl(slug: string) {
  const page = pages.find(p => p.slug === slug)
  return page ? `/wiki/${page.dirName}/${slug}.html` : '#'
}

const currentPage = computed(() => {
  const slug = slugFromPath(route.path)
  return pages.find(p => p.slug === slug)
})

const pageBacklinks = computed(() => {
  if (!currentPage.value) return []
  return backlinks[currentPage.value.slug] || []
})

const pagePrevNext = computed(() => {
  if (!currentPage.value) return null
  return prevNext[currentPage.value.slug] || null
})

const pageSources = computed(() => {
  if (!currentPage.value) return []
  return sourcesMap[currentPage.value.slug] || []
})

const readingTime = computed(() => {
  if (!currentPage.value) return null
  const desc = currentPage.value.description || ''
  const minutes = Math.max(1, Math.ceil(desc.length / 200))
  return `约 ${minutes} 分钟`
})

const wikiPathFromRoute = computed(() => {
  const match = route.path.match(/^\/wiki\/([^/]+\/[^/]+)\.html$/)
  return match ? match[1] + '.md' : ''
})

async function openPreview(sourcePath: string) {
  if (!apiAvailable.value) return
  previewLoading.value = true
  previewSource.value = { name: sourcePath.split('/').pop() || sourcePath, path: sourcePath }
  try {
    const res = await fetch(`${API_BASE}/api/preview?path=${encodeURIComponent(sourcePath)}`)
    const data = await res.json()
    if (data.url && !data.url.startsWith('http')) {
      data.url = API_BASE + data.url
    }
    previewSource.value = { ...previewSource.value!, ...data }
  } catch {
    previewSource.value = null
  } finally {
    previewLoading.value = false
  }
}

function closePreview() {
  previewSource.value = null
}
</script>

<template>
  <footer v-if="currentPage" class="page-footer">
    <!-- 阅读时间 + 日期 -->
    <div class="meta-row">
      <span v-if="readingTime" class="meta-item">{{ readingTime }}</span>
      <span v-if="currentPage.created" class="meta-item">创建: {{ currentPage.created }}</span>
      <span v-if="currentPage.updated" class="meta-item">更新: {{ currentPage.updated }}</span>
    </div>

    <!-- Tags -->
    <div v-if="currentPage.tags.length" class="tags-row">
      <span class="row-label">标签:</span>
      <a v-for="tag in currentPage.tags" :key="tag" :href="`/tags.html#${tag.replace(/[^a-zA-Z0-9\u4e00-\u9fff-]/g, '_')}`" class="footer-tag">{{ tag }}</a>
    </div>

    <!-- Related pages -->
    <div v-if="currentPage.related.length" class="related-row">
      <span class="row-label">相关:</span>
      <a v-for="slug in currentPage.related" :key="slug" :href="pageUrl(slug)" class="related-link">{{ pages.find(p => p.slug === slug)?.title || slug }}</a>
    </div>

    <!-- Source files (data provenance) -->
    <div v-if="pageSources.length" class="sources-row">
      <span class="row-label">来源:</span>
      <span
        v-for="src in pageSources"
        :key="src"
        class="source-link"
        :class="{ clickable: apiAvailable }"
        :title="src"
        @click="apiAvailable && openPreview(src)"
      >{{ src.split('/').pop() }}</span>
    </div>

    <!-- Backlinks -->
    <div v-if="pageBacklinks.length" class="backlinks-row">
      <span class="row-label">反向链接 ({{ pageBacklinks.length }}):</span>
      <a v-for="bl in pageBacklinks" :key="bl.slug" :href="pageUrl(bl.slug)" class="related-link">{{ bl.title }}</a>
    </div>

    <!-- Prev / Next -->
    <div v-if="pagePrevNext && (pagePrevNext.prev || pagePrevNext.next)" class="prev-next">
      <a v-if="pagePrevNext.prev" :href="pageUrl(pagePrevNext.prev.slug)" class="pn-link pn-prev">
        <span class="pn-label">上一篇</span>
        <span class="pn-title">{{ pagePrevNext.prev.title }}</span>
      </a>
      <span v-else></span>
      <a v-if="pagePrevNext.next" :href="pageUrl(pagePrevNext.next.slug)" class="pn-link pn-next">
        <span class="pn-label">下一篇</span>
        <span class="pn-title">{{ pagePrevNext.next.title }}</span>
      </a>
    </div>

    <!-- Page Feedback -->
    <PageFeedback :wiki-path="wikiPathFromRoute" />
  </footer>

  <!-- Source preview modal -->
  <Teleport to="body">
    <div v-if="previewSource || previewLoading" class="preview-overlay" @click.self="closePreview">
      <div class="preview-modal">
        <div class="preview-header">
          <h3>{{ previewSource?.name || '加载中...' }}</h3>
          <button class="close-btn" @click="closePreview">&times;</button>
        </div>
        <div class="preview-body">
          <div v-if="previewLoading" class="preview-loading">加载中...</div>
          <template v-else-if="previewSource">
            <iframe v-if="previewSource.type === 'pdf'" :src="previewSource.url" class="pdf-frame" />
            <div v-else-if="previewSource.type === 'html'" class="html-preview" v-html="previewSource.content" />
            <img v-else-if="previewSource.type === 'image'" :src="previewSource.content" class="image-preview" />
            <pre v-else-if="previewSource.type === 'text'" class="text-preview">{{ previewSource.content }}</pre>
            <p v-else class="no-preview">{{ previewSource.message || '不支持预览此文件类型' }}</p>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.page-footer {
  margin-top: 48px;
  padding-top: 20px;
  border-top: 1px solid var(--vp-c-divider);
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.meta-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 10px;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.row-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-right: 6px;
}

.tags-row,
.related-row,
.sources-row,
.backlinks-row {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.footer-tag {
  padding: 1px 7px;
  border-radius: 4px;
  font-size: 11px;
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-2);
  text-decoration: none;
}

.footer-tag:hover {
  background: var(--vp-c-brand-soft);
}

.related-link {
  color: var(--vp-c-brand-1);
  text-decoration: none;
  font-size: 12px;
}

.related-link:hover {
  text-decoration: underline;
}

.source-link {
  padding: 1px 7px;
  border-radius: 4px;
  font-size: 11px;
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-3);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-link.clickable {
  cursor: pointer;
  color: var(--vp-c-brand-1);
}

.source-link.clickable:hover {
  background: var(--vp-c-brand-soft);
}

/* Preview Modal */
.preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.preview-modal {
  background: var(--vp-c-bg);
  border-radius: 14px;
  width: 90vw;
  max-width: 900px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.15);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.preview-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 12px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--vp-c-text-3);
  padding: 0 4px;
  line-height: 1;
}

.close-btn:hover {
  color: var(--vp-c-text-1);
}

.preview-body {
  padding: 16px;
  overflow: auto;
  flex: 1;
}

.preview-loading {
  text-align: center;
  color: var(--vp-c-text-3);
  padding: 32px;
  font-size: 0.85rem;
}

.pdf-frame {
  width: 100%;
  height: 70vh;
  border: none;
}

.html-preview {
  line-height: 1.7;
  font-size: 14px;
}

.html-preview :deep(img) {
  max-width: 100%;
}

.image-preview {
  max-width: 100%;
  max-height: 70vh;
  display: block;
  margin: 0 auto;
}

.text-preview {
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 70vh;
  overflow: auto;
  margin: 0;
  padding: 12px;
  background: var(--vp-c-default-soft);
  border-radius: 8px;
  font-family: 'SF Mono', 'Fira Code', monospace;
}

.no-preview {
  text-align: center;
  color: var(--vp-c-text-3);
  padding: 32px;
  font-size: 0.85rem;
}

.prev-next {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 20px;
}

.pn-link {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  text-decoration: none;
  flex: 1;
  max-width: 45%;
  transition: border-color 0.15s;
}

.pn-link:hover {
  border-color: var(--vp-c-brand-soft);
}

.pn-next {
  text-align: right;
  margin-left: auto;
}

.pn-label {
  font-size: 11px;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.pn-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-brand-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .prev-next {
    flex-direction: column;
  }
  .pn-link {
    max-width: 100%;
  }
  .pn-next {
    text-align: left;
  }
}
</style>
