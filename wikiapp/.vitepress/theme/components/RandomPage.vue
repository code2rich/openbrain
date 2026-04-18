<script setup lang="ts">
import pagesData from '../../generated/pages'
import { useRouter } from 'vitepress'

const router = useRouter()
const pages = pagesData as { slug: string; dirName: string }[]

function goRandom() {
  const page = pages[Math.floor(Math.random() * pages.length)]
  router.go(`/wiki/${page.dirName}/${page.slug}.html`)
}
</script>

<template>
  <button class="random-btn" @click="goRandom" title="随机跳转">dice</button>
</template>

<style scoped>
.random-btn {
  padding: 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-3);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.random-btn:hover {
  border-color: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}
</style>
