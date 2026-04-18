/**
 * Output Studio API — 输出工作室
 * 基于 wiki 知识的多轮 AI 辅助内容创作
 */
import { FastifyInstance } from 'fastify'
import { readFile, writeFile, mkdir, readdir } from 'fs/promises'
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { spawn } from 'child_process'

// === 数据结构 ===

interface OutputTemplate {
  id: string
  name: string
  description: string
  systemPrompt: string
  outputFormat: string
  createdAt: string
  updatedAt: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  referencedFiles?: string[]
  timestamp: string
}

interface WikiReference {
  slug: string
  path: string
  referencedAt: string
  source: 'tool_use' | 'wiki_link'
}

interface OutputSession {
  id: string
  title: string
  templateId: string | null
  status: 'active' | 'saved'
  messages: ChatMessage[]
  referencedWikis: WikiReference[]
  savedOutputPath: string | null
  createdAt: string
  updatedAt: string
}

// === 持久化 ===

const sessions = new Map<string, OutputSession>()
const chatStreams = new Map<string, (event: SSEEvent) => void>()
const templates = new Map<string, OutputTemplate>()

interface SSEEvent {
  type: 'text' | 'tool_use' | 'thinking' | 'done' | 'error'
  text?: string
  name?: string
  input?: Record<string, any>
  messageId?: string
}

let DATA_DIR: string
let SESSIONS_DIR: string
let TEMPLATES_FILE: string
let WIKI_DIR: string
let OUTPUT_DIR: string

function loadSessionsFromDisk() {
  try {
    if (!existsSync(SESSIONS_DIR)) return
    const files = readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'))
    for (const file of files) {
      try {
        const data = JSON.parse(readFileSync(join(SESSIONS_DIR, file), 'utf-8'))
        sessions.set(data.id, data)
      } catch { /* ignore corrupt files */ }
    }
  } catch { /* ignore */ }
}

function saveSessionToDisk(session: OutputSession) {
  try {
    writeFileSync(
      join(SESSIONS_DIR, `${session.id}.json`),
      JSON.stringify(session, null, 2),
      'utf-8'
    )
  } catch { /* ignore */ }
}

function deleteSessionFromDisk(id: string) {
  try {
    const path = join(SESSIONS_DIR, `${id}.json`)
    if (existsSync(path)) unlinkSync(path)
  } catch { /* ignore */ }
}

function loadTemplatesFromDisk() {
  try {
    if (existsSync(TEMPLATES_FILE)) {
      const data = JSON.parse(readFileSync(TEMPLATES_FILE, 'utf-8'))
      if (Array.isArray(data)) {
        for (const t of data) templates.set(t.id, t)
      }
    }
  } catch { /* ignore */ }
}

function saveTemplatesToDisk() {
  try {
    writeFileSync(
      TEMPLATES_FILE,
      JSON.stringify(Array.from(templates.values()), null, 2),
      'utf-8'
    )
  } catch { /* ignore */ }
}

// === Wiki 页面索引 ===

interface PageEntry {
  slug: string
  title: string
  description: string
  dirName: string
  tags: string[]
}

let cachedPageIndex: PageEntry[] | null = null
let pageIndexTimestamp = 0

function getPageIndex(): PageEntry[] {
  const now = Date.now()
  if (cachedPageIndex && now - pageIndexTimestamp < 60000) return cachedPageIndex

  try {
    const pagesPath = join(__dirname, '../generated/pages.ts')
    if (!existsSync(pagesPath)) return cachedPageIndex || []
    const content = readFileSync(pagesPath, 'utf-8')
    const jsonMatch = content.match(/export default (\[[\s\S]*\])/)
    if (!jsonMatch) return cachedPageIndex || []
    cachedPageIndex = JSON.parse(jsonMatch[1])
    pageIndexTimestamp = now
    return cachedPageIndex!
  } catch {
    return cachedPageIndex || []
  }
}

function buildPageIndexText(): string {
  const pages = getPageIndex()
  if (pages.length === 0) return '（知识库页面索引不可用）'

  const byDir: Record<string, PageEntry[]> = {}
  for (const p of pages) {
    const dir = p.dirName || 'unknown'
    if (!byDir[dir]) byDir[dir] = []
    byDir[dir].push(p)
  }

  const dirLabels: Record<string, string> = {
    '01-entities': '实体页面',
    '02-topics': '主题综述',
    '03-comparisons': '对比分析',
  }

  const lines: string[] = []
  for (const [dir, entries] of Object.entries(byDir)) {
    lines.push(`\n### ${dirLabels[dir] || dir}`)
    lines.push('| Slug | 标题 | 描述 |')
    lines.push('|------|------|------|')
    for (const e of entries) {
      const desc = (e.description || '').slice(0, 50).replace(/\|/g, '｜')
      lines.push(`| ${e.slug} | ${e.title} | ${desc} |`)
    }
  }
  return lines.join('\n')
}

// === Prompt 构造 ===

function buildSystemPrompt(template: OutputTemplate | null): string {
  let prompt = `你是 OpenBrain 知识库的「输出助手」。基于 99-wiki 中的结构化知识创作内容。

## 核心规则

1. 使用 Read/Grep/Glob 搜索 99-wiki/ 获取素材
2. 引用知识时使用 [[slug]] 格式标注来源
3. 段末标注来源：「根据 [[ai-agent-overview]] 的分析...」
4. 用户要求修改时，在已有内容基础上迭代，不要从零开始
5. 回答应完整可用，不是大纲或要点
6. 如果 wiki 中没有相关信息，明确告知用户

## 可用 Wiki 页面索引

${buildPageIndexText()}

## 引用规范

- 引用 wiki 页面时使用 [[slug]] 格式，例如 [[llm-wiki]]、[[ai-agent-overview]]
- 引用多个来源时使用：「综合 [[llm-wiki]] 和 [[rag-vs-llm-wiki]] 的对比...」
- 在回答末尾用「## 引用来源」列出所有引用的 wiki 页面`

  if (template) {
    prompt += `

## 用户自定义输出要求

${template.systemPrompt || ''}

## 输出格式

${template.outputFormat || ''}`
  } else {
    prompt += `\

## 输出格式

按照用户在对话中的要求来决定输出格式和风格。如果用户没有明确指定，默认输出 Markdown 格式的完整内容。`
  }

  return prompt
}

function buildConversationPrompt(session: OutputSession): string {
  const template = session.templateId ? templates.get(session.templateId) : null
  const lines: string[] = []

  lines.push(buildSystemPrompt(template))
  lines.push('\n## 对话历史\n')

  // 限制对话轮数，避免上下文溢出
  const maxTurns = 6
  const msgs = session.messages.slice(-(maxTurns * 2))

  if (msgs.length < session.messages.length) {
    lines.push('（前面的对话历史已省略，以下是最近的部分）\n')
  }

  for (const msg of msgs) {
    if (msg.role === 'user') {
      lines.push(`### 用户\n${msg.content}\n`)
    } else {
      lines.push(`### 助手\n${msg.content}\n`)
    }
  }

  return lines.join('\n')
}

// === 引用提取 ===

function extractToolUseReferences(
  toolName: string,
  toolInput: Record<string, any>,
  existingRefs: WikiReference[],
  timestamp: string
): WikiReference[] {
  if (toolName !== 'Read' && toolName !== 'Grep' && toolName !== 'Glob') return []

  const newRefs: WikiReference[] = []
  const filePath = toolInput?.file_path || toolInput?.path || toolInput?.pattern || ''

  // 匹配 wiki 路径模式
  const wikiMatch = filePath.match(
    /(?:wiki-content|99-wiki)\/((01-entities|02-topics|03-comparisons)\/(.+?))(?:\.md)?$/
  )
  if (wikiMatch) {
    const ref: WikiReference = {
      slug: wikiMatch[3],
      path: wikiMatch[1] + '.md',
      referencedAt: timestamp,
      source: 'tool_use',
    }
    if (!existingRefs.some(r => r.slug === ref.slug)) {
      newRefs.push(ref)
    }
  }
  return newRefs
}

function extractWikiLinkReferences(
  text: string,
  existingRefs: WikiReference[],
  timestamp: string
): WikiReference[] {
  const newRefs: WikiReference[] = []
  const pages = getPageIndex()
  const knownSlugs = new Set(pages.map(p => p.slug))

  const linkPattern = /\[\[([^\]|]+?)(?:\|[^\]]+)?\]\]/g
  let match
  while ((match = linkPattern.exec(text)) !== null) {
    const slug = match[1].trim()
    if (knownSlugs.has(slug) && !existingRefs.some(r => r.slug === slug)) {
      const page = pages.find(p => p.slug === slug)
      newRefs.push({
        slug,
        path: `${page?.dirName || '02-topics'}/${slug}.md`,
        referencedAt: timestamp,
        source: 'wiki_link',
      })
    }
  }
  return newRefs
}

// === 输出保存 ===

function slugify(text: string): string {
  return text
    .replace(/[^\w\u4e00-\u9fa5]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'output'
}

async function saveOutput(session: OutputSession): Promise<{ path: string; size: number }> {
  // 取最后一条 assistant 消息
  const lastAssistant = [...session.messages].reverse().find(m => m.role === 'assistant')
  if (!lastAssistant) throw new Error('没有可保存的内容')

  const today = new Date().toISOString().split('T')[0]
  const sources = session.referencedWikis.map(ref => `  - "[[${ref.slug}]]"`)
  const templateName = session.templateId ? templates.get(session.templateId)?.name : null

  const frontmatter = [
    '---',
    `title: "${session.title}"`,
    `type: output`,
    `created: ${today}`,
    `updated: ${today}`,
    `tags: []`,
    ...(templateName ? [`template: "${templateName}"`] : []),
    `sources:`,
    ...(sources.length > 0 ? sources : ['  - (无引用)']),
    `session_id: ${session.id}`,
    '---',
    '',
  ].join('\n')

  const filename = `output-${slugify(session.title)}-${today.replace(/-/g, '.')}.md`
  const fullPath = join(OUTPUT_DIR, filename)

  const content = frontmatter + lastAssistant.content
  await writeFile(fullPath, content, 'utf-8')

  session.savedOutputPath = filename
  session.status = 'saved'
  session.updatedAt = new Date().toISOString()
  saveSessionToDisk(session)

  return { path: filename, size: content.length }
}

// === API 注册 ===

export function registerOutputRoutes(
  fastify: FastifyInstance,
  opts: {
    dataDir: string
    wikiDir: string
    outputDir: string
    loadConfig: () => any
  }
) {
  DATA_DIR = opts.dataDir
  WIKI_DIR = opts.wikiDir
  OUTPUT_DIR = opts.outputDir
  SESSIONS_DIR = join(DATA_DIR, 'output-sessions')
  TEMPLATES_FILE = join(DATA_DIR, 'output-templates.json')

  // 确保目录存在
  if (!existsSync(SESSIONS_DIR)) mkdirSync(SESSIONS_DIR, { recursive: true })
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true })

  // 从磁盘加载
  loadSessionsFromDisk()
  loadTemplatesFromDisk()

  // --- Wiki 页面索引 ---
  fastify.get('/api/output/pages', async () => {
    return { pages: getPageIndex() }
  })

  // === 模板管理 ===

  fastify.get('/api/output/templates', async () => {
    return { templates: Array.from(templates.values()) }
  })

  fastify.post('/api/output/templates', async (request) => {
    const body = request.body as {
      name: string
      description?: string
      systemPrompt?: string
      outputFormat?: string
    }
    if (!body.name) throw new Error('模板名称不能为空')

    const now = new Date().toISOString()
    const template: OutputTemplate = {
      id: 'tpl-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: body.name,
      description: body.description || '',
      systemPrompt: body.systemPrompt || '',
      outputFormat: body.outputFormat || '',
      createdAt: now,
      updatedAt: now,
    }
    templates.set(template.id, template)
    saveTemplatesToDisk()
    return template
  })

  fastify.put('/api/output/templates/:id', async (request) => {
    const { id } = request.params as { id: string }
    const body = request.body as Partial<OutputTemplate>
    const template = templates.get(id)
    if (!template) throw new Error('模板不存在')

    if (body.name !== undefined) template.name = body.name
    if (body.description !== undefined) template.description = body.description
    if (body.systemPrompt !== undefined) template.systemPrompt = body.systemPrompt
    if (body.outputFormat !== undefined) template.outputFormat = body.outputFormat
    template.updatedAt = new Date().toISOString()
    saveTemplatesToDisk()
    return template
  })

  fastify.delete('/api/output/templates/:id', async (request) => {
    const { id } = request.params as { id: string }
    if (!templates.delete(id)) throw new Error('模板不存在')
    saveTemplatesToDisk()
    return { ok: true }
  })

  // === 会话管理 ===

  fastify.post('/api/output/sessions', async (request) => {
    const body = request.body as { title: string; templateId?: string }
    if (!body.title) throw new Error('会话标题不能为空')

    const now = new Date().toISOString()
    const session: OutputSession = {
      id: 'out-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: body.title,
      templateId: body.templateId || null,
      status: 'active',
      messages: [],
      referencedWikis: [],
      savedOutputPath: null,
      createdAt: now,
      updatedAt: now,
    }
    sessions.set(session.id, session)
    saveSessionToDisk(session)
    return { id: session.id, status: session.status }
  })

  fastify.get('/api/output/sessions', async () => {
    const list = Array.from(sessions.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map(s => ({
        id: s.id,
        title: s.title,
        templateId: s.templateId,
        status: s.status,
        messageCount: s.messages.length,
        savedOutputPath: s.savedOutputPath,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }))
    return { sessions: list }
  })

  fastify.get('/api/output/sessions/:id', async (request) => {
    const { id } = request.params as { id: string }
    const session = sessions.get(id)
    if (!session) throw new Error('会话不存在')
    return session
  })

  fastify.delete('/api/output/sessions/:id', async (request) => {
    const { id } = request.params as { id: string }
    if (!sessions.delete(id)) throw new Error('会话不存在')
    deleteSessionFromDisk(id)
    return { ok: true }
  })

  // === SSE 流 ===

  fastify.get('/api/output/sessions/:id/stream', async (request, reply) => {
    const { id } = request.params as { id: string }
    const session = sessions.get(id)
    if (!session) throw new Error('会话不存在')

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    const sendEvent = (event: SSEEvent) => {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`)
    }

    chatStreams.set(id, sendEvent)

    const heartbeat = setInterval(() => {
      reply.raw.write(': heartbeat\n\n')
    }, 30000)

    request.raw.on('close', () => {
      clearInterval(heartbeat)
      chatStreams.delete(id)
    })
  })

  // === 核心聊天 ===

  fastify.post('/api/output/sessions/:id/chat', async (request) => {
    const { id } = request.params as { id: string }
    const body = request.body as { content: string }
    if (!body.content?.trim()) throw new Error('消息不能为空')

    const session = sessions.get(id)
    if (!session) throw new Error('会话不存在')
    if (session.status !== 'active') throw new Error('会话已归档')

    const now = new Date().toISOString()

    // 追加用户消息
    session.messages.push({
      id: 'msg-' + Date.now().toString(36),
      role: 'user',
      content: body.content,
      timestamp: now,
    })
    session.updatedAt = now
    saveSessionToDisk(session)

    // 构造 prompt
    const prompt = buildConversationPrompt(session)
    const assistantMsgId = 'msg-' + (Date.now() + 1).toString(36)

    // 异步处理 Claude CLI
    processChat(session, prompt, assistantMsgId)

    return { messageId: assistantMsgId, status: 'streaming' }
  })

  // === 保存输出 ===

  fastify.post('/api/output/sessions/:id/save', async (request) => {
    const { id } = request.params as { id: string }
    const session = sessions.get(id)
    if (!session) throw new Error('会话不存在')

    const result = await saveOutput(session)
    return result
  })

  // === 预览输出 ===

  fastify.get('/api/output/sessions/:id/preview', async (request) => {
    const { id } = request.params as { id: string }
    const session = sessions.get(id)
    if (!session) throw new Error('会话不存在')

    const lastAssistant = [...session.messages].reverse().find(m => m.role === 'assistant')
    if (!lastAssistant) throw new Error('没有可预览的内容')

    return {
      content: lastAssistant.content,
      title: session.title,
      references: session.referencedWikis,
    }
  })

  // === Claude CLI 处理（闭包，捕获 opts.loadConfig） ===

  function processChat(session: OutputSession, prompt: string, assistantMsgId: string) {
    const sendEvent = chatStreams.get(session.id)

    try {
      const config = opts.loadConfig()
      const spawnEnv: Record<string, string> = { ...process.env as Record<string, string> }
      if (config.apiKey) spawnEnv.ANTHROPIC_API_KEY = config.apiKey
      if (config.baseURL) spawnEnv.ANTHROPIC_BASE_URL = config.baseURL

      const claudeArgs = [
        '--print',
        '--output-format', 'stream-json',
      ]
      if (config.model) claudeArgs.push('--model', config.model)
      claudeArgs.push('--dangerously-skip-permissions')
      claudeArgs.push('--add-dir', '/app')
      claudeArgs.push('--add-dir', WIKI_DIR)

      const child = spawn('claude', claudeArgs, {
        cwd: '/app',
        env: { ...spawnEnv, HOME: process.env.HOME || '/home/node' },
        timeout: 600000,
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      child.stdin.write(prompt)
      child.stdin.end()

      let fullText = ''
      const newRefs: WikiReference[] = []
      const timestamp = new Date().toISOString()

      child.stdout.on('data', (data) => {
        const text = data.toString()
        const lines = text.split('\n').filter(l => l.trim())

        for (const line of lines) {
          try {
            const event = JSON.parse(line)

            if (event.type === 'assistant' && event.message?.content) {
              const content = Array.isArray(event.message.content) ? event.message.content : []
              for (const block of content) {
                if (block.type === 'text' && block.text) {
                  fullText += block.text
                  sendEvent?.({
                    type: 'text',
                    text: block.text,
                    messageId: assistantMsgId,
                  })
                } else if (block.type === 'tool_use') {
                  const refs = extractToolUseReferences(
                    block.name,
                    block.input || {},
                    [...session.referencedWikis, ...newRefs],
                    timestamp
                  )
                  newRefs.push(...refs)

                  sendEvent?.({
                    type: 'tool_use',
                    name: block.name,
                    input: block.input,
                    messageId: assistantMsgId,
                  })
                } else if (block.type === 'thinking' && block.thinking) {
                  sendEvent?.({
                    type: 'thinking',
                    text: block.thinking,
                    messageId: assistantMsgId,
                  })
                }
              }
            }
          } catch {
            // 非 JSON 行忽略
          }
        }
      })

      child.stderr.on('data', () => { /* ignore stderr */ })

      child.on('close', (code) => {
        if (code !== 0 && code !== null) {
          sendEvent?.({ type: 'error', text: `Claude CLI 退出，代码: ${code}` })
        }

        const linkRefs = extractWikiLinkReferences(
          fullText,
          [...session.referencedWikis, ...newRefs],
          timestamp
        )

        session.referencedWikis.push(...newRefs, ...linkRefs)

        session.messages.push({
          id: assistantMsgId,
          role: 'assistant',
          content: fullText,
          referencedFiles: newRefs.map(r => r.path),
          timestamp: new Date().toISOString(),
        })
        session.updatedAt = new Date().toISOString()
        saveSessionToDisk(session)

        sendEvent?.({ type: 'done', messageId: assistantMsgId })
      })

      child.on('error', (err) => {
        const msg = err.message.includes('ENOENT')
          ? 'Claude CLI 未安装'
          : err.message
        sendEvent?.({ type: 'error', text: msg })
      })
    } catch (err: any) {
      sendEvent?.({ type: 'error', text: err.message || '未知错误' })
    }
  }
}
