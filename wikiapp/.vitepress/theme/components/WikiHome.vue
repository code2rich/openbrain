<script setup lang="ts">
import { computed } from 'vue'
import pagesData from '../../generated/pages'
import tagsData from '../../generated/tags'

const pages = pagesData as any[]
const tagsIndex = tagsData as Record<string, any[]>

const stats = computed(() => ({
  total: pages.length,
  entities: pages.filter(p => p.dirName === '01-entities').length,
  topics: pages.filter(p => p.dirName === '02-topics').length,
  comparisons: pages.filter(p => p.dirName === '03-comparisons').length,
  tags: Object.keys(tagsIndex).length,
}))

const entries = [
  {
    title: '输入',
    subtitle: 'Ingest',
    desc: '上传文件，AI 编译为结构化知识',
    href: '/ingest',
    letter: 'IN',
  },
  {
    title: '知识库',
    subtitle: 'Wiki',
    desc: `${stats.value.total} 页面 · ${stats.value.tags} 标签`,
    href: '/wiki/01-entities/',
    letter: 'W',
  },
  {
    title: '输出',
    subtitle: 'Output',
    desc: '规划中...',
    href: '#',
    letter: 'OUT',
    disabled: true,
  },
]
</script>

<template>
  <div class="wiki-home">
    <div class="hero">
      <h1>OpenBrain</h1>
      <p class="hero-subtitle">今天的探索，明天的基础设施</p>
    </div>

    <div class="entry-cards">
      <a
        v-for="item in entries"
        :key="item.title"
        :href="item.disabled ? undefined : item.href"
        :class="['entry-card', { disabled: item.disabled }]"
      >
        <div class="card-letter">{{ item.letter }}</div>
        <div class="card-body">
          <div class="card-title">{{ item.title }}</div>
          <div class="card-subtitle">{{ item.subtitle }}</div>
        </div>
        <div class="card-desc">{{ item.desc }}</div>
      </a>
    </div>

    <div class="arrow-flow">
      <span class="flow-label">输入</span>
      <span class="flow-arrow"></span>
      <span class="flow-label">编译</span>
      <span class="flow-arrow"></span>
      <span class="flow-label">输出</span>
    </div>

    <div class="footer-stats">
      <span>{{ stats.entities }} 实体</span>
      <span class="dot"></span>
      <span>{{ stats.topics }} 主题</span>
      <span class="dot"></span>
      <span>{{ stats.comparisons }} 对比</span>
      <span class="dot"></span>
      <span>{{ stats.total }} 页面</span>
    </div>
  </div>
</template>

<style scoped>
.wiki-home {
  max-width: 720px;
  margin: 0 auto;
  padding: 48px 24px 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Hero */
.hero {
  text-align: center;
  margin-bottom: 48px;
}

.hero h1 {
  font-size: 56px;
  font-weight: 200;
  letter-spacing: -1.5px;
  margin: 0 0 8px;
}

.hero-subtitle {
  font-size: 15px;
  color: var(--vp-c-text-3);
  margin: 0;
  font-weight: 400;
}

/* Entry cards */
.entry-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  width: 100%;
  margin-bottom: 36px;
}

.entry-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 20px 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  text-decoration: none;
  transition: all 0.2s;
  gap: 12px;
}

.entry-card:not(.disabled):hover {
  border-color: var(--vp-c-brand-soft);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transform: translateY(-1px);
}

.entry-card.disabled {
  opacity: 0.4;
  cursor: default;
}

.card-letter {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-3);
  letter-spacing: 0.02em;
}

.card-body {
  text-align: center;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.card-subtitle {
  font-size: 12px;
  color: var(--vp-c-text-3);
  margin-top: 2px;
  letter-spacing: 0.04em;
}

.card-desc {
  font-size: 12px;
  color: var(--vp-c-text-3);
  text-align: center;
}

/* Arrow flow */
.arrow-flow {
  display: flex;
  align-items: center;
  gap: 0;
  margin-bottom: 36px;
}

.flow-label {
  font-size: 11px;
  color: var(--vp-c-text-3);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.flow-arrow {
  width: 32px;
  height: 1px;
  background: var(--vp-c-divider);
  margin: 0 8px;
  position: relative;
}

.flow-arrow::after {
  content: '';
  position: absolute;
  right: -1px;
  top: -3px;
  width: 6px;
  height: 6px;
  border-right: 1px solid var(--vp-c-divider);
  border-top: 1px solid var(--vp-c-divider);
  transform: rotate(45deg);
}

/* Footer stats */
.footer-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--vp-c-divider);
}

@media (max-width: 640px) {
  .hero h1 {
    font-size: 40px;
  }

  .entry-cards {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .entry-card {
    flex-direction: row;
    padding: 16px 20px;
    align-items: center;
    gap: 12px;
  }

  .card-body {
    text-align: left;
  }

  .card-desc {
    margin-left: auto;
    text-align: right;
  }

  .footer-stats {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
