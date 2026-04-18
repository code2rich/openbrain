import { defineConfig } from 'vitepress'
import sidebarData from './generated/sidebar'
import slugMap from './generated/slug-map'
import { wikiLinkPlugin } from './plugins/wiki-link'

const sidebar = sidebarData as Record<string, { text: string; items: { text: string; link: string }[] }>

export default defineConfig({
  title: 'OpenBrain',
  description: '今天的探索，明天的基础设施',
  lang: 'zh-CN',

  outDir: '.vitepress/dist',
  cacheDir: '.vitepress/cache',

  srcExclude: ['CLAUDE.md'],

  ignoreDeadLinks: true,

  sitemap: {
    hostname: process.env.SITE_URL || 'https://wiki.code2rich.com',
  },

  head: [
    ['meta', { name: 'viewport', content: 'width=device-width, initial-scale: 1' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'OpenBrain' }],
    ['meta', { property: 'og:description', content: '今天的探索，明天的基础设施' }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['link', { rel: 'icon', href: '/favicon.ico' }],
  ],

  lastUpdated: true,

  themeConfig: {
    nav: [
      { text: '输入', link: '/ingest' },
      { text: 'OpenBrain', link: '/' },
      { text: '输出', link: '/output' },
    ],

    sidebar: {
      '/wiki/01-entities/': sidebar['/wiki/01-entities/'] || { text: '实体页面', items: [] },
      '/wiki/02-topics/': sidebar['/wiki/02-topics/'] || { text: '主题综述', items: [] },
      '/wiki/03-comparisons/': sidebar['/wiki/03-comparisons/'] || { text: '对比分析', items: [] },
    },

    search: {
      provider: 'local',
    },

    footer: {
      message: 'OpenBrain · 开开脑子',
    },
  },

  markdown: {
    config(md) {
      md.use(wikiLinkPlugin, { slugMap })
    },
  },
})
