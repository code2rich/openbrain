<template>
  <div class="output-chat">
    <div class="chat-header">
      <span class="chat-title">{{ session.title }}</span>
      <span class="chat-status">{{ session.status === 'active' ? '进行中' : '已保存' }}</span>
    </div>

    <div class="chat-messages" ref="messagesBody">
      <template v-for="(msg, idx) in session.messages" :key="msg.id">
        <!-- User message -->
        <div v-if="msg.role === 'user'" class="msg msg-user">
          <div class="msg-bubble user-bubble">{{ msg.content }}</div>
        </div>

        <!-- Assistant message -->
        <div v-else class="msg msg-assistant">
          <div class="msg-bubble assistant-bubble">
            <!-- Streaming: show partial text -->
            <template v-if="streaming === msg.id">
              <div class="streaming-text" v-html="renderMarkdown(msg.content)"></div>
              <span class="typing-indicator">
                <span></span><span></span><span></span>
              </span>
            </template>
            <!-- Complete: show full content -->
            <template v-else>
              <div v-html="renderMarkdown(msg.content)"></div>
            </template>
          </div>
        </div>
      </template>

      <div v-if="session.messages.length === 0" class="chat-empty">
        <p>开始对话，描述你想要输出的内容</p>
        <p class="hint">例如："帮我写一篇关于知识管理方法演变的综述"</p>
      </div>
    </div>

    <div class="chat-input">
      <textarea
        ref="inputEl"
        v-model="inputText"
        placeholder="输入消息，描述你想要的输出内容..."
        rows="2"
        @keydown.meta.enter="handleSend"
        @keydown.ctrl.enter="handleSend"
        @input="autoResize"
      ></textarea>
      <button
        class="send-btn"
        @click="handleSend"
        :disabled="!inputText.trim() || !!streaming"
      >
        {{ streaming ? '...' : '发送' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

interface ChatMsg {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface Session {
  id: string
  title: string
  status: string
  messages: ChatMsg[]
}

const props = defineProps<{
  session: Session
  streaming: string | null
}>()

const emit = defineEmits<{
  send: [content: string]
}>()

const inputText = ref('')
const messagesBody = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLTextAreaElement | null>(null)

function handleSend() {
  const text = inputText.value.trim()
  if (!text || props.streaming) return
  emit('send', text)
  inputText.value = ''
  if (inputEl.value) {
    inputEl.value.style.height = 'auto'
  }
}

function autoResize() {
  if (inputEl.value) {
    inputEl.value.style.height = 'auto'
    inputEl.value.style.height = Math.min(inputEl.value.scrollHeight, 120) + 'px'
  }
}

function renderMarkdown(text: string) {
  if (!text) return ''
  // Simple markdown rendering for chat display
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (_, slug, display) => {
      return `<a href="/wiki/${slug}.html" class="wiki-link">${display || slug}</a>`
    })
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>')
}

// Auto-scroll on new messages
watch(
  () => props.session.messages.length,
  () => {
    nextTick(() => {
      if (messagesBody.value) {
        messagesBody.value.scrollTop = messagesBody.value.scrollHeight
      }
    })
  }
)

// Also scroll when streaming content changes
watch(
  () => {
    const last = props.session.messages[props.session.messages.length - 1]
    return last?.role === 'assistant' ? last.content.length : 0
  },
  () => {
    nextTick(() => {
      if (messagesBody.value) {
        messagesBody.value.scrollTop = messagesBody.value.scrollHeight
      }
    })
  }
)
</script>

<style scoped>
.output-chat {
  display: flex;
  flex-direction: column;
  flex: 1;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.chat-title {
  font-weight: 600;
  font-size: 0.95rem;
}

.chat-status {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.msg {
  display: flex;
}

.msg-user {
  justify-content: flex-end;
}

.msg-assistant {
  justify-content: flex-start;
}

.msg-bubble {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.9rem;
  line-height: 1.6;
  word-wrap: break-word;
}

.user-bubble {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-text-1);
  border-bottom-right-radius: 4px;
}

.assistant-bubble {
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-1);
  border-bottom-left-radius: 4px;
}

.assistant-bubble :deep(h3) {
  font-size: 1rem;
  margin: 12px 0 6px;
}

.assistant-bubble :deep(h4) {
  font-size: 0.9rem;
  margin: 8px 0 4px;
}

.assistant-bubble :deep(li) {
  margin-left: 16px;
}

.assistant-bubble :deep(code) {
  background: var(--vp-c-default-soft);
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 0.85em;
}

.assistant-bubble :deep(.wiki-link) {
  color: var(--vp-c-brand);
  text-decoration: none;
}

.assistant-bubble :deep(.wiki-link:hover) {
  text-decoration: underline;
}

.typing-indicator {
  display: inline-flex;
  gap: 4px;
  padding: 4px 0;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--vp-c-text-3);
  animation: bounce 1.2s infinite;
}

.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-6px); }
}

.chat-empty {
  text-align: center;
  color: var(--vp-c-text-2);
  padding: 40px 0;
}

.chat-empty .hint {
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
  margin-top: 8px;
}

.chat-input {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.chat-input textarea {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 0.9rem;
  resize: none;
  font-family: inherit;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  line-height: 1.5;
}

.chat-input textarea:focus {
  outline: none;
  border-color: var(--vp-c-brand);
}

.send-btn {
  padding: 8px 20px;
  background: var(--vp-button-brand-bg);
  color: var(--vp-button-brand-text);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  white-space: nowrap;
  transition: background 0.2s;
}

.send-btn:hover:not(:disabled) {
  background: var(--vp-button-brand-hover-bg);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
