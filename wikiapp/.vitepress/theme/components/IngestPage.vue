<template>
  <div class="ingest-page">
    <div class="ingest-header">
      <h1>知识摄入</h1>
      <p class="subtitle">上传文件，自动编译为结构化知识</p>
    </div>

    <div class="ingest-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab-btn', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="ingest-content">
      <FileManager v-if="activeTab === 'files'" />
      <ProcessQueue v-else-if="activeTab === 'queue'" />
      <SessionMonitor v-else-if="activeTab === 'sessions'" />
      <LintRunner v-else-if="activeTab === 'lint'" />
      <DreamRunner v-else-if="activeTab === 'dream'" />
      <LogPage v-else-if="activeTab === 'log'" />

      <!-- Settings -->
      <div v-else-if="activeTab === 'settings'" class="settings-panel">
        <div class="setting-item">
          <label>供应商</label>
          <select v-model="form.provider" @change="onProviderChange" class="setting-input">
            <option value="anthropic">Anthropic</option>
            <option value="openrouter">OpenRouter</option>
            <option value="deepseek">DeepSeek</option>
            <option value="zhipu">智谱 (GLM)</option>
            <option value="minimax">MiniMax</option>
            <option value="siliconflow">SiliconFlow</option>
            <option value="custom">自定义</option>
          </select>
        </div>

        <div class="setting-item">
          <label>Base URL</label>
          <input v-model="form.baseURL" type="text" :placeholder="baseURLPlaceholder" class="setting-input mono" />
          <p class="hint">留空使用默认地址</p>
        </div>

        <div class="setting-item">
          <label>模型</label>
          <input v-model="form.model" type="text" :placeholder="modelPlaceholder" class="setting-input mono" />
        </div>

        <div class="setting-item">
          <label>API Key</label>
          <div class="input-row">
            <input v-model="form.apiKey" :type="showKey ? 'text' : 'password'" placeholder="sk-..." class="setting-input mono" />
            <button class="toggle-vis" @click="showKey = !showKey">{{ showKey ? '隐藏' : '显示' }}</button>
          </div>
          <p class="status-text" v-if="loadedConfig.hasApiKey && !form.apiKey">已配置: {{ loadedConfig.apiKeyHint }}</p>
          <p class="status-text warn" v-if="!loadedConfig.hasApiKey && !form.apiKey">未配置 API Key</p>
        </div>

        <div class="setting-actions">
          <button class="save-btn" @click="saveConfig" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
          <button class="test-btn" @click="testConnection" :disabled="testing">{{ testing ? '测试中...' : '测试连接' }}</button>
          <span v-if="saveMsg" :class="['action-msg', saveOk ? 'ok' : 'err']">{{ saveMsg }}</span>
          <span v-if="testResult" :class="['action-msg', testResult.ok ? 'ok' : 'err']">
            {{ testResult.ok ? `连接成功 (${testResult.model}): ${testResult.reply}` : `失败: ${testResult.error}` }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import FileManager from './FileManager.vue'
import ProcessQueue from './ProcessQueue.vue'
import LintRunner from './LintRunner.vue'
import DreamRunner from './DreamRunner.vue'
import SessionMonitor from './SessionMonitor.vue'
import LogPage from './LogPage.vue'

const tabs = [
  { id: 'files', label: '文件' },
  { id: 'queue', label: '任务' },
  { id: 'log', label: '日志' },
  { id: 'sessions', label: '会话' },
  { id: 'lint', label: '健康' },
  { id: 'dream', label: '梦境' },
  { id: 'settings', label: '设置' },
]

const activeTab = ref('files')

// ---- Settings ----
import { getApiBase } from '../utils/api'
const API_BASE = getApiBase()
const showKey = ref(false)
const saving = ref(false)
const saveMsg = ref('')
const saveOk = ref(false)
const testing = ref(false)
const testResult = ref<{ ok: boolean; reply?: string; model?: string; error?: string } | null>(null)

const PROVIDER_DEFAULTS: Record<string, { baseURL: string; model: string }> = {
  anthropic: { baseURL: '', model: 'claude-sonnet-4-20250514' },
  openrouter: { baseURL: 'https://openrouter.ai/api/v1', model: 'anthropic/claude-sonnet-4-20250514' },
  deepseek: { baseURL: 'https://api.deepseek.com', model: 'deepseek-chat' },
  zhipu: { baseURL: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-plus' },
  minimax: { baseURL: 'https://api.minimax.chat/v1', model: 'MiniMax-Text-01' },
  siliconflow: { baseURL: 'https://api.siliconflow.cn/v1', model: 'deepseek-ai/DeepSeek-V3' },
  custom: { baseURL: '', model: '' },
}

const form = ref({
  provider: 'anthropic' as string,
  baseURL: '',
  model: '',
  apiKey: '',
})

const loadedConfig = ref<{ hasApiKey: boolean; apiKeyHint: string | null; provider: string; baseURL: string; model: string }>({
  hasApiKey: false, apiKeyHint: null, provider: 'anthropic', baseURL: '', model: ''
})

const baseURLPlaceholder = computed(() => PROVIDER_DEFAULTS[form.value.provider]?.baseURL || 'https://api.anthropic.com')
const modelPlaceholder = computed(() => PROVIDER_DEFAULTS[form.value.provider]?.model || 'model-name')

function onProviderChange() {
  const d = PROVIDER_DEFAULTS[form.value.provider]
  if (d) {
    if (!form.value.baseURL) form.value.baseURL = d.baseURL
    if (!form.value.model) form.value.model = d.model
  }
}

async function loadConfig() {
  try {
    const r = await fetch(`${API_BASE}/api/config`)
    const data = await r.json()
    loadedConfig.value = data
    form.value.provider = data.provider || 'anthropic'
    form.value.baseURL = data.baseURL || ''
    form.value.model = data.model || ''
    form.value.apiKey = ''
  } catch { /* ignore */ }
}

async function saveConfig() {
  saving.value = true
  saveMsg.value = ''
  const payload: Record<string, string> = { provider: form.value.provider, baseURL: form.value.baseURL, model: form.value.model }
  if (form.value.apiKey) payload.apiKey = form.value.apiKey
  try {
    const r = await fetch(`${API_BASE}/api/config`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await r.json()
    if (r.ok) { saveOk.value = true; saveMsg.value = '保存成功'; form.value.apiKey = ''; loadConfig() }
    else { saveOk.value = false; saveMsg.value = data.error || '保存失败' }
  } catch (e: any) { saveOk.value = false; saveMsg.value = e.message }
  saving.value = false
}

async function testConnection() {
  testing.value = true
  testResult.value = null
  try {
    const r = await fetch(`${API_BASE}/api/config/test`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form.value) })
    testResult.value = await r.json()
  } catch (e: any) { testResult.value = { ok: false, error: e.message } }
  testing.value = false
}

loadConfig()
</script>

<style scoped>
.ingest-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
}

.ingest-page:has(.session-monitor),
.ingest-page:has(.log-page) {
  max-width: 100%;
  padding: 2rem 1rem;
}

.ingest-header {
  text-align: center;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.ingest-header h1 {
  font-size: 1.6rem;
  font-weight: 600;
  letter-spacing: -0.4px;
  margin-bottom: 0.3rem;
}

.subtitle {
  color: var(--vp-c-text-3);
  font-size: 0.88rem;
}

.ingest-tabs {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2px;
  background: var(--vp-c-bg-soft);
  padding: 4px;
  border-radius: 10px;
  margin-bottom: 1.75rem;
  margin-left: auto;
  margin-right: auto;
  border: 1px solid var(--vp-c-divider);
  width: fit-content;
  max-width: 100%;
}

.tab-btn {
  padding: 0.45rem 1.1rem;
  border: none;
  background: transparent;
  color: var(--vp-c-text-3);
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 450;
  border-radius: 7px;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
}

.tab-btn.active {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px var(--vp-c-divider);
  font-weight: 500;
}

.ingest-content {
  min-height: 400px;
}

/* Settings */
.settings-panel {
  max-width: 480px;
}

.setting-item {
  margin-bottom: 1.25rem;
}

.setting-item label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.35rem;
}

.setting-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.85rem;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.setting-input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}

.setting-input.mono {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.8rem;
}

.hint {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}

.input-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.input-row .setting-input {
  flex: 1;
}

.toggle-vis {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  white-space: nowrap;
  font-size: 0.8rem;
}

.setting-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.save-btn {
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: 8px;
  background: var(--vp-c-brand-1);
  color: white;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
}

.save-btn:disabled,
.test-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.test-btn {
  padding: 0.5rem 1.25rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 0.85rem;
}

.status-text {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}

.status-text.warn {
  color: var(--vp-c-orange-1);
}

.action-msg {
  font-size: 0.8rem;
}

.action-msg.ok {
  color: var(--vp-c-green-1);
}

.action-msg.err {
  color: var(--vp-c-red-1);
}

@media (max-width: 640px) {
  .ingest-page {
    padding: 1rem;
  }
  .tab-btn {
    padding: 0.4rem 0.75rem;
    font-size: 0.8rem;
  }
  .settings-panel {
    max-width: 100%;
  }
}
</style>
