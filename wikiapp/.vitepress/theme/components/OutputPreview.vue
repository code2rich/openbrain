<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="preview-modal">
      <div class="preview-header">
        <h3>输出预览</h3>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="preview-body">
        <div class="preview-content" v-html="renderContent"></div>
      </div>

      <div class="preview-refs" v-if="references.length > 0">
        <h4>引用来源</h4>
        <div class="ref-tags">
          <a
            v-for="ref in references"
            :key="ref.slug"
            :href="`/wiki/${ref.path.replace('.md', '.html')}`"
            class="ref-tag"
            target="_blank"
          >
            {{ ref.slug }}
          </a>
        </div>
      </div>

      <div class="preview-actions">
        <button class="btn btn-secondary" @click="$emit('close')">关闭</button>
        <button class="btn btn-primary" @click="$emit('save')">确认保存</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface WikiRef {
  slug: string
  path: string
  referencedAt: string
  source: 'tool_use' | 'wiki_link'
}

const props = defineProps<{
  content: string
  references: WikiRef[]
}>()

defineEmits<{
  close: []
  save: []
}>()

const renderContent = computed(() => {
  if (!props.content) return '<p style="color:#999">（无内容）</p>'
  // Reuse simple markdown rendering
  return props.content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (_, slug, display) =>
      `<a href="/wiki/${slug}.html" class="wiki-link">${display || slug}</a>`
    )
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.preview-modal {
  background: var(--vp-c-bg);
  border-radius: 12px;
  width: 700px;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.preview-header h3 { margin: 0; }

.close-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: var(--vp-c-text-2);
  padding: 4px;
}

.close-btn:hover { color: var(--vp-c-text-1); }

.preview-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.preview-content {
  font-size: 0.95rem;
  line-height: 1.7;
}

.preview-content :deep(h2) { font-size: 1.3rem; margin: 20px 0 10px; }
.preview-content :deep(h3) { font-size: 1.1rem; margin: 16px 0 8px; }
.preview-content :deep(h4) { font-size: 1rem; margin: 12px 0 6px; }
.preview-content :deep(li) { margin-left: 16px; margin-bottom: 4px; }
.preview-content :deep(code) {
  background: var(--vp-c-default-soft);
  padding: 2px 4px;
  border-radius: 3px;
}
.preview-content :deep(.wiki-link) {
  color: var(--vp-c-brand);
  text-decoration: none;
}
.preview-content :deep(.wiki-link:hover) {
  text-decoration: underline;
}

.preview-refs {
  padding: 12px 20px;
  border-top: 1px solid var(--vp-c-divider);
}

.preview-refs h4 {
  font-size: 0.85rem;
  margin: 0 0 8px;
  color: var(--vp-c-text-2);
}

.ref-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ref-tag {
  padding: 3px 10px;
  border-radius: 12px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand);
  font-size: 0.8rem;
  text-decoration: none;
  font-family: monospace;
}

.ref-tag:hover {
  background: var(--vp-c-brand);
  color: white;
}

.preview-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid var(--vp-c-divider);
}

.btn {
  padding: 8px 20px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-primary {
  background: var(--vp-button-brand-bg);
  color: var(--vp-button-brand-text);
}

.btn-primary:hover { background: var(--vp-button-brand-hover-bg); }

.btn-secondary {
  background: var(--vp-button-alt-bg);
  color: var(--vp-button-alt-text);
}

.btn-secondary:hover { background: var(--vp-button-alt-hover-bg); }
</style>
