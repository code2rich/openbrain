<template>
  <div class="template-manager">
    <div class="template-list">
      <div
        v-for="t in templates"
        :key="t.id"
        :class="['template-item', { editing: editingId === t.id }]"
      >
        <template v-if="editingId === t.id">
          <div class="edit-form">
            <input v-model="editForm.name" placeholder="模板名称" class="edit-input" />
            <textarea
              v-model="editForm.systemPrompt"
              placeholder="自定义系统提示词（如：你是技术自媒体作者，面向程序员读者）"
              rows="3"
              class="edit-textarea"
            ></textarea>
            <textarea
              v-model="editForm.outputFormat"
              placeholder="输出格式要求（如：1500-2000字，包含引言、3个核心观点、总结）"
              rows="2"
              class="edit-textarea"
            ></textarea>
            <div class="edit-actions">
              <button class="btn-small btn-save" @click="saveTemplate(t.id)">保存</button>
              <button class="btn-small btn-cancel" @click="editingId = null">取消</button>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="template-info" @click="startEdit(t)">
            <div class="template-name">{{ t.name }}</div>
            <div class="template-desc" v-if="t.description">{{ t.description }}</div>
          </div>
          <button class="btn-delete" @click.stop="$emit('delete', t.id)" title="删除">✕</button>
        </template>
      </div>
    </div>

    <!-- New template inline form -->
    <div v-if="showCreate" class="template-item create-form">
      <input v-model="newForm.name" placeholder="模板名称" class="edit-input" />
      <textarea
        v-model="newForm.systemPrompt"
        placeholder="自定义系统提示词"
        rows="3"
        class="edit-textarea"
      ></textarea>
      <textarea
        v-model="newForm.outputFormat"
        placeholder="输出格式要求"
        rows="2"
        class="edit-textarea"
      ></textarea>
      <div class="edit-actions">
        <button class="btn-small btn-save" @click="handleCreate" :disabled="!newForm.name.trim()">
          创建
        </button>
        <button class="btn-small btn-cancel" @click="showCreate = false">取消</button>
      </div>
    </div>
    <button v-else class="btn-create" @click="showCreate = true">+ 新建模板</button>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

interface Template {
  id: string
  name: string
  description: string
  systemPrompt: string
  outputFormat: string
  createdAt: string
  updatedAt: string
}

defineProps<{
  templates: Template[]
}>()

const emit = defineEmits<{
  create: [template: Partial<Template>]
  update: [id: string, template: Partial<Template>]
  delete: [id: string]
}>()

const editingId = ref<string | null>(null)
const showCreate = ref(false)
const editForm = reactive({ name: '', systemPrompt: '', outputFormat: '' })
const newForm = reactive({ name: '', systemPrompt: '', outputFormat: '' })

function startEdit(t: Template) {
  editingId.value = t.id
  editForm.name = t.name
  editForm.systemPrompt = t.systemPrompt
  editForm.outputFormat = t.outputFormat
}

function saveTemplate(id: string) {
  emit('update', id, {
    name: editForm.name,
    systemPrompt: editForm.systemPrompt,
    outputFormat: editForm.outputFormat,
  })
  editingId.value = null
}

function handleCreate() {
  if (!newForm.name.trim()) return
  emit('create', {
    name: newForm.name.trim(),
    description: '',
    systemPrompt: newForm.systemPrompt,
    outputFormat: newForm.outputFormat,
  })
  newForm.name = ''
  newForm.systemPrompt = ''
  newForm.outputFormat = ''
  showCreate.value = false
}
</script>

<style scoped>
.template-manager {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.template-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.template-item {
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.template-item.editing {
  flex-direction: column;
}

.template-info {
  flex: 1;
  cursor: pointer;
  min-width: 0;
}

.template-info:hover .template-name {
  color: var(--vp-c-brand);
}

.template-name {
  font-size: 0.85rem;
  font-weight: 500;
}

.template-desc {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  margin-top: 2px;
}

.btn-delete {
  background: none;
  border: none;
  color: var(--vp-c-text-3);
  cursor: pointer;
  padding: 2px;
  font-size: 0.8rem;
}

.btn-delete:hover { color: #e53935; }

.edit-form,
.create-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.edit-input,
.edit-textarea {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  font-size: 0.8rem;
  font-family: inherit;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  box-sizing: border-box;
  resize: vertical;
}

.edit-actions {
  display: flex;
  gap: 6px;
}

.btn-small {
  padding: 4px 10px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
}

.btn-save {
  background: var(--vp-button-brand-bg);
  color: var(--vp-button-brand-text);
}

.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-cancel {
  background: var(--vp-button-alt-bg);
  color: var(--vp-button-alt-text);
}

.btn-create {
  width: 100%;
  padding: 6px;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 6px;
  background: none;
  color: var(--vp-c-text-3);
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.btn-create:hover {
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
}
</style>
