<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { useRoute } from 'vitepress'
import Breadcrumb from './components/Breadcrumb.vue'
import PageFooter from './components/PageFooter.vue'
import IngestPage from './components/IngestPage.vue'
import OutputStudio from './components/OutputStudio.vue'

const { Layout } = DefaultTheme
const route = useRoute()

function isWikiPage() {
  return route.path.startsWith('/wiki/')
}

function isIngestPage() {
  return route.path === '/ingest'
}

function isOutputPage() {
  return route.path === '/output'
}
</script>

<template>
  <IngestPage v-if="isIngestPage()" />
  <OutputStudio v-else-if="isOutputPage()" />
  <Layout v-else>
    <template #doc-before>
      <Breadcrumb v-if="isWikiPage()" />
    </template>
    <template #doc-footer-before>
      <PageFooter v-if="isWikiPage()" />
    </template>
  </Layout>
</template>
