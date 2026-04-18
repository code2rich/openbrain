import Fastify from 'fastify'
import fastifyMultipart from '@fastify/multipart'
import fastifyCors from '@fastify/cors'
import { readdir, stat, readFile, writeFile, mkdir, rename } from 'fs/promises'
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, statSync } from 'fs'
import { join, extname } from 'path'
import { spawn } from 'child_process'  // still used by lint API
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import Anthropic from '@anthropic-ai/sdk'
import mammoth from 'mammoth'
import JSZip from 'jszip'
import { registerOutputRoutes } from './output-api'

const RAW_DIR = process.env.RAW_DIR || join(process.cwd(), '..', '..', '00-raw')
const WIKI_DIR = process.env.WIKI_DIR || join(process.cwd(), '..', '..', '99-wiki')

const RAW_SUBDIRS = ['00-upload', '01-Clippers', '02-RSS', '03-Manual', '04-OpenClaw', '05-SyncDown', '06-Thoughts']

// 动态管理 Anthropic 客户端，支持页面配置供应商/URL/模型/Key
interface LLMConfig {
  provider: 'anthropic' | 'openrouter' | 'custom'
  apiKey: string
  baseURL: string    // 自定义 endpoint，留空则用默认
  model: string      // 模型名称
}

const DEFAULT_CONFIGS: Record<string, Partial<LLMConfig>> = {
  anthropic: { baseURL: '', model: 'claude-sonnet-4-20250514' },
  openrouter: { baseURL: 'https://openrouter.ai/api/v1', model: 'anthropic/claude-sonnet-4-20250514' },
  deepseek: { baseURL: 'https://api.deepseek.com', model: 'deepseek-chat' },
  zhipu: { baseURL: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-plus' },
  minimax: { baseURL: 'https://api.minimax.chat/v1', model: 'MiniMax-Text-01' },
  siliconflow: { baseURL: 'https://api.siliconflow.cn/v1', model: 'deepseek-ai/DeepSeek-V3' },
  custom: { baseURL: '', model: '' },
}

let anthropicClient: Anthropic | null = null
const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../data')
const CONFIG_FILE = join(DATA_DIR, 'config.json')

function loadConfig(): Partial<LLMConfig> {
  try {
    if (existsSync(CONFIG_FILE)) return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'))
  } catch { /* ignore */ }
  return {}
}

function saveConfig(config: Partial<LLMConfig>) {
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
}

function buildClientOptions(config: Partial<LLMConfig>): { apiKey: string; baseURL?: string } {
  const key = config.apiKey || process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('未配置 API Key，请在「设置」中填写')
  const opts: { apiKey: string; baseURL?: string } = { apiKey: key }
  if (config.baseURL) opts.baseURL = config.baseURL
  return opts
}

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const config = loadConfig()
    anthropicClient = new Anthropic(buildClientOptions(config))
  }
  return anthropicClient
}

function getModel(): string {
  const config = loadConfig()
  return config.model || DEFAULT_CONFIGS[config.provider || 'anthropic']?.model || 'claude-sonnet-4-20250514'
}

// 初始化：如果已有配置则预热客户端
const _initConfig = loadConfig()
if (_initConfig.apiKey || process.env.ANTHROPIC_API_KEY) {
  try { anthropicClient = new Anthropic(buildClientOptions(_initConfig)) } catch { /* ignore */ }
}

interface ProcessTask {
  id: string
  filePath: string
  targetCategory: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  result?: string
  error?: string
  progress?: string[]  // 分析过程中的输出
  wikiContent?: string // 生成的 wiki 页面内容
  wikiPath?: string    // 保存的 wiki 文件路径
  prompt?: string      // 发送给 Claude 的完整 prompt
  claudeOutput?: string // Claude CLI 的完整原始输出
  sessionMessages?: any[] // 结构化会话消息（来自 stream-json）
  createdAt: string    // 任务创建时间
  completedAt?: string // 任务完成时间
}

const tasks = new Map<string, ProcessTask>()
const taskStreams = new Map<string, (progress: string) => void>()

// 任务持久化
const TASKS_FILE = join(DATA_DIR, 'tasks.json')

function loadTasksFromDisk() {
  try {
    if (existsSync(TASKS_FILE)) {
      const data = JSON.parse(readFileSync(TASKS_FILE, 'utf-8'))
      for (const task of data) {
        // 启动时将 processing 状态的任务重置为 failed（进程重启导致执行中断）
        if (task.status === 'processing') {
          task.status = 'failed'
          task.error = '服务重启，任务中断'
          task.completedAt = new Date().toISOString()
        }
        tasks.set(task.id, task)
      }
      if (data.some((t: ProcessTask) => t.status === 'failed' && t.error === '服务重启，任务中断')) {
        saveTasksToDisk()
      }
    }
  } catch { /* ignore */ }
}

function saveTasksToDisk() {
  try {
    const arr = Array.from(tasks.values()).slice(-100)  // 保留最近 100 条
    writeFileSync(TASKS_FILE, JSON.stringify(arr, null, 2), 'utf-8')
  } catch { /* ignore */ }
}

const fastify = Fastify({ logger: true })

await fastify.register(fastifyCors, {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
})

await fastify.register(fastifyMultipart, {
  limits: { fileSize: 100 * 1024 * 1024 }
})

fastify.get('/api/files', async (request, reply) => {
  const { dir } = request.query as { dir?: string }

  if (!dir) {
    const files: Record<string, any[]> = {}
    for (const subdir of RAW_SUBDIRS) {
      try {
        const entries = await readdir(join(RAW_DIR, subdir))
        files[subdir] = await Promise.all(
          entries
            .filter(f => !f.startsWith('.'))
            .map(async (name) => {
              const fullPath = join(RAW_DIR, subdir, name)
              const st = await stat(fullPath)
              return {
                name,
                path: `${subdir}/${name}`,
                size: st.size,
                modified: st.mtime.toISOString(),
                isDir: st.isDirectory()
              }
            })
        )
      } catch {
        files[subdir] = []
      }
    }
    return files
  }

  // 支持深层路径：dir 可以是 "01-Clippers" 或 "01-Clippers/subdir/deeper"
  // 安全校验：路径必须在 RAW_DIR 下，且以已知子目录开头
  const topDir = dir.split('/')[0]
  if (!RAW_SUBDIRS.includes(topDir)) {
    reply.code(400)
    return { error: '无效的目录' }
  }
  const resolvedPath = join(RAW_DIR, dir)
  if (!resolvedPath.startsWith(RAW_DIR)) {
    reply.code(400)
    return { error: '路径越界' }
  }

  const entries = await readdir(resolvedPath)
  const files = await Promise.all(
    entries
      .filter(f => !f.startsWith('.'))
      .map(async (name) => {
        const fullPath = join(resolvedPath, name)
        const st = await stat(fullPath)
        return {
          name,
          path: `${dir}/${name}`,
          size: st.size,
          modified: st.mtime.toISOString(),
          isDir: st.isDirectory()
        }
      })
  )
  return files
})

fastify.get('/api/raw', async (request, reply) => {
  const { path: filePath } = request.query as { path: string }
  const fullPath = join(RAW_DIR, filePath)

  if (!fullPath.startsWith(RAW_DIR)) {
    reply.code(400)
    return { error: '路径越界' }
  }

  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  }

  try {
    const content = await readFile(fullPath)
    const ext = extname(filePath).toLowerCase()
    const mimeType = mimeTypes[ext] || 'application/octet-stream'
    reply.header('Content-Type', mimeType)
    reply.header('Content-Length', content.length)
    if (ext === '.pdf') {
      const safeName = encodeURIComponent(filePath.split('/').pop() || 'document.pdf')
      reply.header('Content-Disposition', `inline; filename="${safeName}"`)
    }
    return reply.send(content)
  } catch {
    reply.code(404)
    return { error: '文件不存在' }
  }
})

fastify.get('/api/preview', async (request, reply) => {
  const { path: filePath } = request.query as { path: string }
  const fullPath = join(RAW_DIR, filePath)

  try {
    const content = await readFile(fullPath)
    const ext = extname(filePath).toLowerCase()

    // 文本类型
    const textExts = ['.md', '.txt', '.json', '.yml', '.yaml', '.csv', '.log',
      '.html', '.htm', '.xml', '.sh', '.bat', '.py', '.js', '.ts', '.css',
      '.toml', '.ini', '.conf', '.env', '.rs', '.go', '.java', '.c', '.cpp',
      '.h', '.mdx', '.jsx', '.tsx', '.vue', '.svelte', '.scss', '.less',
      '.sql', '.graphql', '.proto']
    if (textExts.includes(ext)) {
      return { type: 'text', content: content.toString('utf-8') }
    }

    // 图片
    if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) {
      return { type: 'image', content: `data:image/${ext.slice(1)};base64,${content.toString('base64')}` }
    }

    // PDF — 返回 raw 文件 URL，前端用 iframe 渲染
    if (ext === '.pdf') {
      return { type: 'pdf', url: `/api/raw?path=${encodeURIComponent(filePath)}` }
    }

    // Word (.docx) — mammoth 转 HTML
    if (ext === '.docx') {
      const result = await mammoth.convertToHtml({ buffer: content })
      return { type: 'html', content: result.value }
    }

    if (ext === '.doc') {
      return { type: 'binary', content: null, message: '仅支持 .docx 格式预览，.doc 是旧格式' }
    }

    // PPT (.pptx) — 解压 ZIP 提取幻灯片文本
    if (ext === '.pptx') {
      const zip = await JSZip.loadAsync(content)
      const slideTexts: string[] = []
      let slideNum = 1
      while (true) {
        const slideFile = zip.file(`ppt/slides/slide${slideNum}.xml`)
        if (!slideFile) break
        const xml = await slideFile.async('string')
        const texts = [...xml.matchAll(/<a:t[^>]*>(.*?)<\/a:t>/g)].map(m => m[1])
        if (texts.length > 0) {
          slideTexts.push(`--- 幻灯片 ${slideNum} ---\n${texts.join('\n')}`)
        }
        slideNum++
      }
      return { type: 'text', content: slideTexts.length > 0 ? slideTexts.join('\n\n') : '(PPT 文件无文本内容)' }
    }

    if (ext === '.ppt') {
      return { type: 'binary', content: null, message: '仅支持 .pptx 格式预览，.ppt 是旧格式' }
    }

    // Excel (.xlsx) — 解压 ZIP 提取 sharedStrings + sheet 数据为表格文本
    if (ext === '.xlsx') {
      const zip = await JSZip.loadAsync(content)

      // 读取共享字符串表
      const sharedStringsFile = zip.file('xl/sharedStrings.xml')
      let sharedStrings: string[] = []
      if (sharedStringsFile) {
        const ssXml = await sharedStringsFile.async('string')
        sharedStrings = [...ssXml.matchAll(/<t[^>]*>(.*?)<\/t>/gs)].map(m => m[1])
      }

      // 逐个 sheet 提取
      const sheets: string[] = []
      let sheetIdx = 1
      while (true) {
        const sheetFile = zip.file(`xl/worksheets/sheet${sheetIdx}.xml`)
        if (!sheetFile) break
        const sheetXml = await sheetFile.async('string')

        // 提取所有行
        const rows: string[][] = []
        const rowMatches = sheetXml.matchAll(/<row[^>]*>(.*?)<\/row>/gs)
        for (const rowMatch of rowMatches) {
          const cells: string[] = []
          const cellMatches = rowMatch[1].matchAll(/<c[^>]*(?:t="s")?[^>]*>(?:<v>(.*?)<\/v>)?<\/c>/gs)
          for (const cellMatch of cellMatches) {
            const value = cellMatch[1]
            if (value !== undefined && value !== null) {
              // 判断是否为共享字符串引用（t="s"）或内联字符串
              const cellAttrs = cellMatch[0].match(/<c[^>]*t="s"[^>]*>/)
              if (cellAttrs) {
                const idx = parseInt(value, 10)
                cells.push(idx < sharedStrings.length ? sharedStrings[idx] : value)
              } else {
                cells.push(value)
              }
            } else {
              cells.push('')
            }
          }
          if (cells.length > 0) rows.push(cells)
        }

        if (rows.length > 0) {
          // 格式化为表格
          const maxCols = Math.max(...rows.map(r => r.length))
          const lines = rows.map(r => r.map(c => c.padEnd(20)).join('| ')).join('\n')
          sheets.push(`--- Sheet ${sheetIdx} (${rows.length} 行) ---\n${lines}`)
        }
        sheetIdx++
      }

      return { type: 'text', content: sheets.length > 0 ? sheets.join('\n\n') : '(Excel 文件无数据)' }
    }

    if (ext === '.xls') {
      return { type: 'binary', content: null, message: '仅支持 .xlsx 格式预览，.xls 是旧格式' }
    }

    return { type: 'binary', content: null, message: '不支持预览此文件类型' }
  } catch (err) {
    reply.code(404)
    return { error: '文件不存在' }
  }
})

fastify.post('/api/upload', async (request, reply) => {
  const data = await request.file()

  if (!data) {
    reply.code(400)
    return { error: '没有文件' }
  }

  const targetDir = (request.query as any).targetDir || '01-Clippers'

  if (!RAW_SUBDIRS.includes(targetDir)) {
    reply.code(400)
    return { error: '无效的目标目录' }
  }

  const fileName = data.filename
  const buffer = await data.toBuffer()
  const targetPath = join(RAW_DIR, targetDir, fileName)

  await mkdir(join(RAW_DIR, targetDir), { recursive: true })
  await writeFile(targetPath, buffer)

  return { success: true, path: `${targetDir}/${fileName}` }
})

fastify.post('/api/process', async (request, reply) => {
  const body = await request.body as {
    filePath: string
    targetCategory?: string  // 可选，不传则 AI 自动判断
  }

  if (!body.filePath) {
    reply.code(400)
    return { error: '缺少 filePath' }
  }

  const taskId = Date.now().toString(36) + Math.random().toString(36).slice(2)
  const task: ProcessTask = { id: taskId, filePath: body.filePath, targetCategory: body.targetCategory || '', status: 'queued' }
  tasks.set(taskId, task)
  saveTasksToDisk()

  processFile(task)

  return { taskId, status: 'queued' }
})

// SSE 流式进度端点
fastify.get('/api/process/:taskId/stream', async (request, reply) => {
  const { taskId } = request.params as { taskId: string }

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  const sendProgress = (progress: string) => {
    reply.raw.write(`data: ${JSON.stringify({ progress })}\n\n`)
  }

  taskStreams.set(taskId, sendProgress)

  // 定期发送心跳
  const heartbeat = setInterval(() => {
    reply.raw.write(`: heartbeat\n\n`)
  }, 30000)

  request.raw.on('close', () => {
    clearInterval(heartbeat)
    taskStreams.delete(taskId)
  })
})

async function processFile(task: ProcessTask) {
  task.status = 'processing'
  task.progress = []
  task.createdAt = new Date().toISOString()
  saveTasksToDisk()

  const sendProgress = (msg: string) => {
    task.progress?.push(msg)
    const stream = taskStreams.get(task.id)
    if (stream) stream(msg)
  }

  try {
    const fullPath = join(RAW_DIR, task.filePath)
    const title = task.filePath.split('/').pop()?.replace(/\.[^.]+$/, '') || 'Untitled'
    const today = new Date().toISOString().split('T')[0]

    sendProgress(`📂 读取文件: ${task.filePath}`)

    // 预处理文件：提取文本内容（API 层负责格式转换，claude 只需处理文本）
    const ext = extname(task.filePath).toLowerCase()
    let fileContent = ''
    try {
      const buffer = await readFile(fullPath)
      const textExts = ['.md', '.txt', '.json', '.yml', '.yaml', '.csv', '.log',
        '.html', '.htm', '.xml', '.sh', '.bat', '.py', '.js', '.ts', '.css',
        '.toml', '.ini', '.conf', '.env', '.rs', '.go', '.java', '.c', '.cpp',
        '.h', '.mdx', '.jsx', '.tsx', '.vue', '.svelte', '.scss', '.less',
        '.sql', '.graphql', '.proto']
      if (textExts.includes(ext)) {
        fileContent = buffer.toString('utf-8')
      } else if (ext === '.docx') {
        const result = await mammoth.convertToHtml({ buffer })
        // 简单 HTML → 纯文本：去标签
        fileContent = result.value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        sendProgress(`📄 docx → 文本 (${fileContent.length} 字符)`)
      } else if (ext === '.pdf') {
        // PDF 需要额外工具，暂跳过
        fileContent = `[PDF 文件，共 ${buffer.length} 字节，需要专用工具提取]`
      } else {
        fileContent = `[二进制文件: ${ext}，共 ${buffer.length} 字节]`
      }
    } catch (err: any) {
      sendProgress(`⚠️ 文件读取失败: ${err.message}`)
      fileContent = `[无法读取文件: ${err.message}]`
    }

    // 截断过长内容（避免 prompt 过长）
    const MAX_CONTENT = 50000
    if (fileContent.length > MAX_CONTENT) {
      fileContent = fileContent.slice(0, MAX_CONTENT) + '\n\n[... 内容过长，已截断 ...]'
      sendProgress(`✂️ 内容截断至 ${MAX_CONTENT} 字符`)
    }

    sendProgress(`✅ 文件内容已提取 (${fileContent.length} 字符)`)

    // 构建 claude CLI 的 prompt（包含文件内容）
    const categoryHint = task.targetCategory
      ? `\n目标分类: ${task.targetCategory}（用户已指定）`
      : '\n请根据内容自动判断最适合的分类：01-entities（实体页）、02-topics（主题页）、03-comparisons（对比页）。不确定时默认 02-topics。'

    const prompt = `你是知识库管理员。请分析以下内容并生成 wiki 页面。

## 源文件

路径: ${task.filePath}
${categoryHint}

## 文件内容

${fileContent}

## 页面类型判断标准

- **实体 (01-entities/)**：围绕一个具体的人/公司/产品/工具/概念。文件名格式 PascalCase.md
- **主题 (02-topics/)**：覆盖一个知识领域/方法论/业务模块。文件名格式 kebab-case.md
- **对比 (03-comparisons/)**：讨论两个或多个方案的优劣取舍。文件名格式 a-vs-b.md

## 要求

1. 根据上述文件内容，判断页面类型，生成合适的英文文件名
2. 生成完整的 wiki 页面，包含规范 frontmatter
3. 在输出的第一行用 JSON 注释标注分类和文件名: <!-- {"category": "01-entities", "filename": "SomeName.md"} -->

## frontmatter 模板

---
title: 页面标题
description: 一句话描述
type: entity | topic | comparison
knowledge_type: periodic
review_cycle: 90
created: ${today}
updated: ${today}
tags: []
keywords: []
scenes: []
related: []
sources:
  - ${task.filePath}
insights: []
---

只输出 wiki 页面的完整 markdown 内容，不要输出其他解释。`

    // 存储 prompt 以便查看会话过程
    task.prompt = prompt
    saveTasksToDisk()

    // 通过 claude CLI 调用（支持 skills、tool use、CLAUDE.md）
    const config = loadConfig()
    const spawnEnv: Record<string, string> = { ...process.env as Record<string, string> }
    if (config.apiKey) spawnEnv.ANTHROPIC_API_KEY = config.apiKey
    if (config.baseURL) spawnEnv.ANTHROPIC_BASE_URL = config.baseURL

    // 构建 claude CLI 参数
    const claudeArgs = ['--print', '--output-format', 'stream-json', '--verbose']
    if (config.model) {
      claudeArgs.push('--model', config.model)
    }
    // 容器内跳过权限检查（沙箱环境，无安全风险）
    claudeArgs.push('--dangerously-skip-permissions')
    // 让 claude 发现 /app/CLAUDE.md（vault 知识库规则）
    claudeArgs.push('--add-dir', '/app')
    // 让 claude 能访问 wiki 和 raw 目录（用于读取 index.md 和源文件）
    claudeArgs.push('--add-dir', WIKI_DIR)
    claudeArgs.push('--add-dir', RAW_DIR)

    sendProgress(`🤖 调用 claude CLI (model: ${config.model || 'default'})...`)

    const result = await new Promise<string>((resolve, reject) => {
      const child = spawn('claude', claudeArgs, {
        cwd: '/app',
        env: { ...spawnEnv, HOME: process.env.HOME || '/home/node' },
        timeout: 600000,  // 10 分钟超时（大文件 + skills 加载需要时间）
        stdio: ['pipe', 'pipe', 'pipe'],  // stdin 可写，用于传入 prompt
      })

      let stdout = ''
      let stderr = ''
      task.sessionMessages = []

      // 通过 stdin 传入 prompt（避免命令行参数长度限制和编码问题）
      child.stdin.write(prompt)
      child.stdin.end()

      child.stdout.on('data', (data) => {
        const text = data.toString()
        stdout += text
        const lines = text.split('\n').filter((l: string) => l.trim())
        for (const line of lines) {
          try {
            const event = JSON.parse(line)
            // stream-json 格式：提取结构化消息
            if (event.type === 'assistant' && event.message?.content) {
              const content = Array.isArray(event.message.content) ? event.message.content : []
              // 累积到 sessionMessages（合并同一轮的 delta）
              const lastMsg = task.sessionMessages![task.sessionMessages!.length - 1]
              if (lastMsg && lastMsg.type === 'assistant' && !lastMsg.final) {
                lastMsg.content = content
              } else {
                task.sessionMessages!.push({
                  type: 'assistant',
                  timestamp: event.timestamp || new Date().toISOString(),
                  content,
                })
              }
              // 标记包含 tool_use 的消息为 final（下一轮会开始新消息）
              if (content.some((b: any) => b.type === 'tool_use')) {
                if (lastMsg && lastMsg.type === 'assistant') lastMsg.final = true
              }
              // 发送文本进度（兼容 ProcessQueue）
              for (const block of content) {
                if (block.type === 'text' && block.text) {
                  sendProgress(`  ${block.text.slice(0, 200)}`)
                } else if (block.type === 'tool_use') {
                  sendProgress(`  [Tool: ${block.name}]`)
                }
              }
            } else if (event.type === 'user' && event.message?.content) {
              const content = event.message.content
              if (Array.isArray(content) && content.some((b: any) => b.type === 'tool_result')) {
                task.sessionMessages!.push({
                  type: 'user',
                  timestamp: event.timestamp || new Date().toISOString(),
                  content,
                })
              }
            } else if (event.type === 'result') {
              // 最终结果
              if (event.result) {
                sendProgress(`  ${String(event.result).slice(0, 200)}`)
              }
            }
          } catch {
            // 非 JSON 行，当作文本进度
            sendProgress(`  ${line.slice(0, 200)}`)
          }
        }
      })

      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout)
        } else {
          reject(new Error(stderr || `claude CLI 退出，代码: ${code}`))
        }
      })

      child.on('error', (err) => {
        if (err.message.includes('ENOENT')) {
          reject(new Error('claude CLI 未找到。请确认已安装: npm install -g @anthropic-ai/claude-code'))
        } else {
          reject(err)
        }
      })
    })

    // 从 stream-json stdout 中提取最终 result 文本
    let finalResult = ''
    for (const line of result.split('\n')) {
      if (!line.trim()) continue
      try {
        const event = JSON.parse(line)
        if (event.type === 'result' && event.result) {
          finalResult = String(event.result)
        }
      } catch { /* non-JSON line, skip */ }
    }
    // 如果没找到 result 事件，降级用原始 stdout（兼容 text 模式）
    const wikiOutput = finalResult || result

    sendProgress(`✅ claude CLI 分析完成`)
    sendProgress(`📄 输出长度: ${wikiOutput.length} 字符`)

    // 存储完整输出以便查看会话过程
    task.claudeOutput = wikiOutput
    saveTasksToDisk()

    // 提取 wiki 内容并保存
    let wikiContent = wikiOutput

    // 从输出中提取分类和文件名（AI 在第一行用 JSON 注释标注）
    let category = task.targetCategory
    let wikiFileName = title + '.md'
    const metaMatch = wikiContent.match(/<!--\s*(\{[^}]+\})\s*-->/)
    if (metaMatch) {
      try {
        const meta = JSON.parse(metaMatch[1])
        if (meta.category) category = meta.category
        if (meta.filename) wikiFileName = meta.filename
        // 移除元数据注释行
        wikiContent = wikiContent.replace(/<!--\s*\{[^}]+\}\s*-->\s*\n?/, '')
      } catch { /* ignore parse error */ }
    }

    // 如果没有指定分类，默认 02-topics
    if (!category) category = '02-topics'

    // 剥掉 LLM 可能包裹的代码块（```markdown / ```yaml / ```）
    wikiContent = wikiContent.replace(/^```(?:markdown|yaml|yml|md)?\s*\n/i, '')
    wikiContent = wikiContent.replace(/\n```\s*$/m, '')

    // 移除 LLM 在 frontmatter 后追加的尾部分类说明
    wikiContent = wikiContent.replace(/\n---\n\n\*\*分类判断.*$/s, '')

    // 提取 frontmatter 部分
    if (!wikiContent.startsWith('---')) {
      const match = wikiContent.match(/---[\s\S]*?---[\s\S]*$/)
      if (match) wikiContent = match[0]
    }

    // 写入 wiki 文件
    const wikiDir = join(WIKI_DIR, category)
    const wikiPath = join(wikiDir, wikiFileName)
    await mkdir(wikiDir, { recursive: true })
    await writeFile(wikiPath, wikiContent, 'utf-8')

    sendProgress(`💾 已保存: ${category}/${wikiFileName}`)

    // === 后处理闭环：log.md + index.md + .raw-coverage ===
    const wikiSlug = wikiFileName.replace(/\.md$/, '')

    try {
      // 1. 更新 log.md
      const logPath = join(WIKI_DIR, 'log.md')
      let logContent = ''
      try { logContent = await readFile(logPath, 'utf-8') } catch { /* ignore */ }
      const todayEntry = `## ${today}`
      const ingestEntry = `- [file] ${task.filePath} — 创建 [[${wikiSlug}]] ${category === '01-entities' ? '实体' : category === '03-comparisons' ? '对比分析' : '主题'}页面`
      if (logContent.includes(todayEntry)) {
        logContent = logContent.replace(todayEntry, `${todayEntry}\n\n### 摄入 (Ingest)\n${ingestEntry}`)
      } else {
        logContent += `\n\n${todayEntry}\n\n### 摄入 (Ingest)\n${ingestEntry}\n`
      }
      await writeFile(logPath, logContent, 'utf-8')
      sendProgress(`📝 已更新 log.md`)
    } catch (err: any) {
      sendProgress(`⚠️ log.md 更新失败: ${err.message}`)
    }

    try {
      // 2. 更新 index.md — 在对应类型的表格中添加新页面行
      const indexPath = join(WIKI_DIR, 'index.md')
      let indexContent = ''
      try { indexContent = await readFile(indexPath, 'utf-8') } catch { /* ignore */ }

      // 提取页面 description（从 frontmatter）
      const descMatch = wikiContent.match(/^---[\s\S]*?description:\s*(.+?)\s*$/m)
      const description = descMatch ? descMatch[1] : wikiSlug

      const sectionMap: Record<string, { header: string; slug: string }> = {
        '01-entities': { header: '## 实体页面 (entities/)', slug: '实体页面' },
        '02-topics': { header: '## 主题综述 (topics/)', slug: '主题综述' },
        '03-comparisons': { header: '## 对比分析 (comparisons/)', slug: '对比分析' },
      }
      const section = sectionMap[category]
      if (section && indexContent.includes(section.header) && !indexContent.includes(`[[${wikiSlug}]]`)) {
        const newLine = `| [[${wikiSlug}]] | ${description} |`
        const headerIdx = indexContent.indexOf(section.header)
        // 找到该 section 的表格第一行数据（跳过 header 行和分隔行）
        const afterHeader = indexContent.indexOf('\n', headerIdx) + 1
        const tableStart = indexContent.indexOf('\n', afterHeader) + 1 // skip | 页面 |
        // 在该 section 的表格末尾（下一个 ## 之前）追加
        const nextSectionIdx = indexContent.indexOf('\n## ', tableStart)
        const insertPos = nextSectionIdx > 0 ? nextSectionIdx : indexContent.lastIndexOf('|', indexContent.length - 1)
        // 找到该 section 表格最后一行
        const lastPipeInSection = nextSectionIdx > 0
          ? indexContent.lastIndexOf('|', nextSectionIdx - 1)
          : indexContent.lastIndexOf('|')
        const lastLineEnd = indexContent.indexOf('\n', lastPipeInSection)
        indexContent = indexContent.slice(0, lastLineEnd + 1) + newLine + '\n' + indexContent.slice(lastLineEnd + 1)
        await writeFile(indexPath, indexContent, 'utf-8')
        sendProgress(`📝 已更新 index.md`)
      }
    } catch (err: any) {
      sendProgress(`⚠️ index.md 更新失败: ${err.message}`)
    }

    try {
      // 3. 更新 .raw-coverage
      const coveragePath = join(WIKI_DIR, '.raw-coverage')
      let coverageContent = ''
      try { coverageContent = await readFile(coveragePath, 'utf-8') } catch { /* ignore */ }
      const coverageLine = `${task.filePath} | done | [[${wikiSlug}]] | ${today}`
      if (!coverageContent.includes(task.filePath)) {
        // 在统计行之前插入
        const statsIdx = coverageContent.indexOf('\n# 统计')
        if (statsIdx > 0) {
          coverageContent = coverageContent.slice(0, statsIdx) + coverageLine + '\n' + coverageContent.slice(statsIdx)
        } else {
          coverageContent += coverageLine + '\n'
        }
        await writeFile(coveragePath, coverageContent, 'utf-8')
        sendProgress(`📝 已更新 .raw-coverage`)
      }
    } catch (err: any) {
      sendProgress(`⚠️ .raw-coverage 更新失败: ${err.message}`)
    }

    task.status = 'completed'
    task.result = `已生成: ${category}/${wikiFileName}`
    task.wikiContent = wikiContent
    task.wikiPath = `${category}/${wikiFileName}`
    task.completedAt = new Date().toISOString()
    saveTasksToDisk()
  } catch (err: any) {
    sendProgress(`❌ 错误: ${err.message}`)
    task.status = 'failed'
    task.error = err.message || '未知错误'
    task.completedAt = new Date().toISOString()
    saveTasksToDisk()
  }
}

fastify.get('/api/process/:taskId', async (request, reply) => {
  const { taskId } = request.params as { taskId: string }
  const task = tasks.get(taskId)

  if (!task) {
    reply.code(404)
    return { error: '任务不存在' }
  }

  return task
})

fastify.get('/api/tasks', async () => {
  return Array.from(tasks.values()).slice(-20).reverse()
})

// 删除任务（用于清理卡住的任务）
fastify.delete('/api/process/:taskId', async (request, reply) => {
  const { taskId } = request.params as { taskId: string }
  const task = tasks.get(taskId)

  if (!task) {
    reply.code(404)
    return { error: '任务不存在' }
  }

  // 清理 SSE stream
  taskStreams.delete(taskId)
  tasks.delete(taskId)
  saveTasksToDisk()

  return { success: true, deleted: taskId }
})

// 重试失败的任务：用相同参数创建新任务
fastify.post('/api/process/:taskId/retry', async (request, reply) => {
  const { taskId } = request.params as { taskId: string }
  const oldTask = tasks.get(taskId)

  if (!oldTask) {
    reply.code(404)
    return { error: '任务不存在' }
  }

  const newId = Date.now().toString(36) + Math.random().toString(36).slice(2)
  const newTask: ProcessTask = {
    id: newId,
    filePath: oldTask.filePath,
    targetCategory: oldTask.targetCategory,
    status: 'queued',
  }
  tasks.set(newId, newTask)
  saveTasksToDisk()

  processFile(newTask)

  return { taskId: newId, status: 'queued' }
})

// ============ Config API ============

fastify.get('/api/config', async () => {
  const config = loadConfig()
  const provider = config.provider || 'anthropic'
  const defaults = DEFAULT_CONFIGS[provider] || {}
  return {
    provider,
    baseURL: config.baseURL || defaults.baseURL || '',
    model: config.model || defaults.model || '',
    hasApiKey: !!(config.apiKey || process.env.ANTHROPIC_API_KEY),
    apiKeyHint: config.apiKey
      ? config.apiKey.slice(0, 8) + '...' + config.apiKey.slice(-4)
      : (process.env.ANTHROPIC_API_KEY ? '(from env)' : null),
  }
})

fastify.post('/api/config', async (request, reply) => {
  const body = request.body as Partial<LLMConfig>
  const config = loadConfig()

  // 合并配置
  if (body.provider) config.provider = body.provider
  if (body.baseURL !== undefined) config.baseURL = body.baseURL
  if (body.model) config.model = body.model
  if (body.apiKey) config.apiKey = body.apiKey

  // 如果切换了 provider，应用默认值
  if (body.provider && DEFAULT_CONFIGS[body.provider]) {
    const defaults = DEFAULT_CONFIGS[body.provider]
    if (!body.baseURL && defaults.baseURL) config.baseURL = defaults.baseURL
    if (!body.model && defaults.model) config.model = defaults.model
  }

  saveConfig(config)

  // 重建客户端
  try {
    anthropicClient = new Anthropic(buildClientOptions(config))
  } catch (e: any) {
    reply.code(400)
    return { error: e.message }
  }

  const key = config.apiKey || ''
  return {
    success: true,
    provider: config.provider,
    baseURL: config.baseURL || '',
    model: config.model || '',
    apiKeyHint: key ? key.slice(0, 8) + '...' + key.slice(-4) : null,
  }
})

// 测试连接：用当前配置通过 SDK 发一个简单请求
fastify.post('/api/config/test', async (request, reply) => {
  const body = (request.body as Partial<LLMConfig>) || {}
  const savedConfig = loadConfig()

  const apiKey = body.apiKey || savedConfig.apiKey || process.env.ANTHROPIC_API_KEY
  const baseURL = body.baseURL !== undefined ? body.baseURL : savedConfig.baseURL
  const model = body.model || savedConfig.model || DEFAULT_CONFIGS[body.provider || savedConfig.provider || 'anthropic']?.model

  if (!apiKey) {
    reply.code(400)
    return { ok: false, error: '未配置 API Key' }
  }

  try {
    const testClient = new Anthropic(buildClientOptions({ apiKey, baseURL }))
    const response = await testClient.messages.create({
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: 64,
      messages: [{ role: 'user', content: '回复"连接成功"四个字，不要输出其他内容。' }],
    })

    const text = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('')

    return { ok: true, reply: text.trim(), model: model || 'default' }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
})

// ============ Entity Extraction API ============

interface EntityCandidate {
  slug: string
  count: number
  sources: string[]
  context: string[]
}

const ENTITY_CANDIDATES_CACHE = { data: null as EntityCandidate[] | null, time: 0 }
const ENTITY_CACHE_TTL = 5 * 60 * 1000

const TOPIC_PREFIXES = [
  'asset-allocation-', 'wealth-planning-', 'fund-investment-',
  'ai-', 'llm-', 'mcp-', 'rag-', 'claude-code-',
  'personal-', 'auto-', 'wechat-', 'xhs-',
  'team-', 'data-', 'document-', 'reading-',
  'agent-', 'wiki-', 'aigc-',
]

function isEntityCandidate(slug: string, existingPages: Set<string>): boolean {
  const lower = slug.toLowerCase()
  if (existingPages.has(lower)) return false
  if (slug.length > 40) return false
  const chineseChars = (slug.match(/[\u4e00-\u9fa5]/g) || []).length
  if (chineseChars > 6) return false
  if (lower.split('-').length > 4) return false
  for (const prefix of TOPIC_PREFIXES) {
    if (lower.startsWith(prefix)) return false
  }
  return true
}

function scanEntityCandidates(): EntityCandidate[] {
  const candidates = new Map<string, EntityCandidate>()
  const existingPages = new Set<string>()
  const entitySlugs = new Set<string>()
  const categories = ['01-entities', '02-topics', '03-comparisons']

  for (const cat of categories) {
    const catDir = join(WIKI_DIR, cat)
    try {
      for (const file of readdirSync(catDir).filter(f => f.endsWith('.md'))) {
        existingPages.add(file.replace(/\.md$/, '').toLowerCase())
        if (cat === '01-entities') entitySlugs.add(file.replace(/\.md$/, '').toLowerCase())
      }
    } catch { /* ignore */ }
  }

  for (const cat of categories) {
    const catDir = join(WIKI_DIR, cat)
    try {
      for (const file of readdirSync(catDir).filter(f => f.endsWith('.md'))) {
        const pageSlug = file.replace(/\.md$/, '')
        const raw = readFileSync(join(catDir, file), 'utf-8')

        for (const match of raw.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
          const linked = match[1].trim()
          if (!isEntityCandidate(linked, existingPages)) continue
          const key = linked.toLowerCase()
          if (!candidates.has(key)) candidates.set(key, { slug: linked, count: 0, sources: [], context: [] })
          const c = candidates.get(key)!
          c.count++
          if (!c.sources.includes(pageSlug)) c.sources.push(pageSlug)
          const idx = raw.indexOf(match[0])
          if (idx !== -1 && c.context.length < 2) {
            c.context.push(raw.slice(Math.max(0, idx - 30), Math.min(raw.length, idx + match[0].length + 30)).replace(/\n/g, ' ').trim())
          }
        }

        for (const field of ['tags', 'keywords']) {
          const m = raw.match(new RegExp(`^${field}:\\s*\\[(.+)\\]$`, 'm'))
          if (m) {
            for (const t of m[1].split(',')) {
              const slug = t.trim().replace(/['"]/g, '').replace(/\s+/g, '-').toLowerCase()
              if (!isEntityCandidate(slug, existingPages)) continue
              if (!candidates.has(slug)) candidates.set(slug, { slug, count: 0, sources: [pageSlug], context: [`${field}: ${t.trim()}`] })
              candidates.get(slug)!.count += 0.5
            }
          }
        }
      }
    } catch { /* ignore */ }
  }

  return Array.from(candidates.values())
    .filter(c => !entitySlugs.has(c.slug.toLowerCase()))
    .sort((a, b) => b.count - a.count)
}

fastify.get('/api/entities/candidates', async () => {
  const now = Date.now()
  if (ENTITY_CANDIDATES_CACHE.data && now - ENTITY_CANDIDATES_CACHE.time < ENTITY_CACHE_TTL) {
    return { candidates: ENTITY_CANDIDATES_CACHE.data, cached: true }
  }
  const candidates = scanEntityCandidates()
  ENTITY_CANDIDATES_CACHE.data = candidates
  ENTITY_CANDIDATES_CACHE.time = now
  return { candidates, cached: false }
})

fastify.post('/api/entities/generate', async (request) => {
  const { slugs } = request.body as { slugs: string[] }
  if (!slugs || !Array.isArray(slugs) || slugs.length === 0) {
    return { error: '请选择要生成的实体' }
  }

  const candidates = ENTITY_CANDIDATES_CACHE.data || scanEntityCandidates()
  const candidateMap = new Map(candidates.map(c => [c.slug.toLowerCase(), c]))
  const today = new Date().toISOString().split('T')[0]
  const results: { slug: string; success: boolean; error?: string }[] = []

  for (const slug of slugs) {
    const candidate = candidateMap.get(slug.toLowerCase())
    if (!candidate) { results.push({ slug, success: false, error: '未找到候选信息' }); continue }

    const pascalSlug = slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
    const entityDir = join(WIKI_DIR, '01-entities')
    const filePath = join(entityDir, pascalSlug + '.md')

    try {
      const { mkdirSync } = await import('fs')
      mkdirSync(entityDir, { recursive: true })

      const prompt = `你是知识库管理员。根据以下信息生成一个实体 wiki 页面。

实体名称: ${candidate.slug}
出现在以下页面中: ${candidate.sources.join(', ')}
上下文片段:
${candidate.context.map(c => `- "${c}"`).join('\n')}

请生成一个实体页面，格式要求：
1. 完整的 YAML frontmatter（type: entity）
2. 合理的 tags, keywords, scenes, related（用 [[slug]] 格式）
3. 页面内容包含：简介、关键信息、相关页面
只输出 wiki 页面内容。`

      const response = await getAnthropicClient().messages.create({
        model: getModel(),
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      })

      let content = ''
      for (const block of response.content) {
        if (block.type === 'text') content += block.text
      }

      if (!content.startsWith('---')) {
        content = `---
title: ${pascalSlug}
description: ${candidate.slug}
type: entity
knowledge_type: permanent
review_cycle: null
created: ${today}
updated: ${today}
tags: []
keywords: []
scenes: []
related: []
sources: []
insights: []
---

${content}`
      }

      writeFileSync(filePath, content, 'utf-8')
      results.push({ slug: pascalSlug, success: true })
    } catch (err: any) {
      results.push({ slug, success: false, error: err.message })
    }
  }

  ENTITY_CANDIDATES_CACHE.data = null
  return { results }
})

// ============ Lint API ============

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const LINT_LAST_RUN_FILE = join(__dirname, '../.lint-last-run.json')

interface LintResult {
  orphans: string[]
  stalePages: string[]
  unusedPages: string[]
  missingScenes: string[]
  missingInsights: string[]
  hiddenConnections: { pageA: string; pageB: string; reason: string; confidence: string }[]
  summary: string
}

function getLastRunTime(): string | null {
  try {
    if (existsSync(LINT_LAST_RUN_FILE)) {
      const data = JSON.parse(readFileSync(LINT_LAST_RUN_FILE, 'utf-8'))
      return data.lastRun || null
    }
  } catch { /* ignore */ }
  return null
}

function setLastRunTime(time: string) { 
  try {
    writeFileSync(LINT_LAST_RUN_FILE, JSON.stringify({ lastRun: time }, null, 2), 'utf-8')
  } catch { /* ignore */ }
}

fastify.get('/api/lint/status', async () => {
  return { lastRun: getLastRunTime() }
})

fastify.post('/api/lint/run', async (request) => {
  const args = (request.body || {}) as { deep?: boolean }
  const isDeep = args.deep === true

  const runTime = new Date().toISOString()
  setLastRunTime(runTime)

  const scriptPath = join(__dirname, 'wiki-lint.ts')
  const tsxPath = join(__dirname, '../../node_modules/.bin/tsx')

  return new Promise((resolve, reject) => {
    const lintArgs = [scriptPath]
    if (isDeep) lintArgs.push('--deep')

    const child = spawn(tsxPath, lintArgs, {
      cwd: join(__dirname, '../..'),
      env: {
        ...process.env, // 保留所有现有环境变量（ANTHROPIC_BASE_URL、ANTHROPIC_AUTH_TOKEN、ANTHROPIC_API_KEY 等）
      }
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (data) => { stdout += data.toString() })
    child.stderr.on('data', (data) => { stderr += data.toString() })

    child.on('close', (code) => {
      // 解析输出中的问题数量
      const result: LintResult = {
        orphans: [],
        stalePages: [],
        unusedPages: [],
        missingScenes: [],
        missingInsights: [],
        hiddenConnections: [],
        summary: '',
      }

      const lines = stdout.split('\n')
      for (const line of lines) {
        if (line.includes('孤立页面') && line.includes('个')) {
          const m = line.match(/孤立页面.*?(\d+)个/)
          if (m && m[1] !== '0') {
            const orphanLines = lines.slice(lines.indexOf(line) + 1, lines.indexOf(line) + 1 + parseInt(m[1]))
            result.orphans = orphanLines.filter(l => l.includes('·')).map(l => l.replace(/^\s+·\s*/, '').trim())
          }
        }
        if (line.includes('过时页面') && line.includes('个')) {
          const m = line.match(/过时页面.*?(\d+)个/)
          if (m && m[1] !== '0') {
            const staleLines = lines.slice(lines.indexOf(line) + 1, lines.indexOf(line) + 1 + parseInt(m[1]))
            result.stalePages = staleLines.filter(l => l.includes('·')).map(l => l.replace(/^\s+·\s*/, '').trim())
          }
        }
        if (line.includes('知识未使用') && line.includes('个')) {
          const m = line.match(/知识未使用.*?(\d+)个/)
          if (m && m[1] !== '0') {
            const unusedLines = lines.slice(lines.indexOf(line) + 1, lines.indexOf(line) + 1 + parseInt(m[1]))
            result.unusedPages = unusedLines.filter(l => l.includes('·')).map(l => l.replace(/^\s+·\s*/, '').trim())
          }
        }
        if (line.includes('缺少使用场景') && line.includes('个')) {
          const m = line.match(/缺少使用场景.*?(\d+)个/)
          if (m && m[1] !== '0') {
            const missLines = lines.slice(lines.indexOf(line) + 1, lines.indexOf(line) + 1 + parseInt(m[1]))
            result.missingScenes = missLines.filter(l => l.includes('·')).map(l => l.replace(/^\s+·\s*/, '').trim())
          }
        }
        if (line.includes('缺少个人洞察') && line.includes('个')) {
          const m = line.match(/缺少个人洞察.*?(\d+)个/)
          if (m && m[1] !== '0') {
            const missLines = lines.slice(lines.indexOf(line) + 1, lines.indexOf(line) + 1 + parseInt(m[1]))
            result.missingInsights = missLines.filter(l => l.includes('·')).map(l => l.replace(/^\s+·\s*/, '').trim())
          }
        }
        if (line.includes('暗线发现') && line.includes('对')) {
          const m = line.match(/暗线发现.*?(\d+)对/)
          if (m && m[1] !== '0') {
            const connStart = lines.indexOf(line) + 1
            let connEnd = connStart
            while (connEnd < lines.length && lines[connEnd].includes('↔')) connEnd++
            for (let i = connStart; i < connEnd; i++) {
              const cm = lines[i].match(/·\s+(\S+)\s+↔\s+(\S+)\s+\[(\w+)\]/)
              const rm = lines[i + 1]?.match(/原因：(.+)/)
              if (cm) {
                result.hiddenConnections.push({
                  pageA: cm[1],
                  pageB: cm[2],
                  confidence: cm[3],
                  reason: rm ? rm[1] : '',
                })
                i++
              }
            }
          }
        }
        if (line.includes('总计')) {
          const m = line.match(/总计[：:]\s*(\d+)\s*个问题/)
          if (m) result.summary = `${m[1]} 个问题待处理`
        }
      }

      if (code === 0 && !result.summary) {
        result.summary = '知识库健康，无明显问题'
      }

      resolve({
        success: code === 0,
        lastRun: runTime,
        output: stdout.slice(-3000),
        error: code !== 0 ? stderr.slice(-1000) : undefined,
        result,
      })
    })

    child.on('error', reject)
  })
})

// ============ Feedback API ============

interface FeedbackTask {
  id: string
  wikiPath: string
  suggestion: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  result?: string
  error?: string
  progress?: string[]
  claudeOutput?: string
  prompt?: string
  diff?: string
  createdAt: string
  completedAt?: string
}

const feedbacks = new Map<string, FeedbackTask>()
const feedbackStreams = new Map<string, (msg: string) => void>()
const FEEDBACK_FILE = join(DATA_DIR, 'feedback.json')

function loadFeedbacksFromDisk() {
  try {
    if (existsSync(FEEDBACK_FILE)) {
      const data = JSON.parse(readFileSync(FEEDBACK_FILE, 'utf-8'))
      for (const fb of data) {
        if (fb.status === 'processing') {
          fb.status = 'failed'
          fb.error = '服务重启，反馈处理中断'
          fb.completedAt = new Date().toISOString()
        }
        feedbacks.set(fb.id, fb)
      }
      saveFeedbacksToDisk()
    }
  } catch { /* ignore */ }
}

function saveFeedbacksToDisk() {
  try {
    const arr = Array.from(feedbacks.values()).slice(-200)
    writeFileSync(FEEDBACK_FILE, JSON.stringify(arr, null, 2), 'utf-8')
  } catch { /* ignore */ }
}

function computeDiff(before: string, after: string): string {
  const beforeLines = before.split('\n')
  const afterLines = after.split('\n')
  const lines: string[] = []

  // Simple LCS-based diff
  let i = 0, j = 0
  while (i < beforeLines.length || j < afterLines.length) {
    if (i < beforeLines.length && j < afterLines.length && beforeLines[i] === afterLines[j]) {
      lines.push('  ' + beforeLines[i])
      i++; j++
    } else {
      // Look ahead for match
      let bi = -1, bj = -1
      for (let a = i; a < Math.min(i + 10, beforeLines.length); a++) {
        for (let b = j; b < Math.min(j + 10, afterLines.length); b++) {
          if (beforeLines[a] === afterLines[b]) { bi = a; bj = b; break }
        }
        if (bi >= 0) break
      }
      if (bi >= 0 && bj >= 0) {
        while (i < bi) { lines.push('- ' + beforeLines[i]); i++ }
        while (j < bj) { lines.push('+ ' + afterLines[j]); j++ }
      } else {
        if (i < beforeLines.length) { lines.push('- ' + beforeLines[i]); i++ }
        if (j < afterLines.length) { lines.push('+ ' + afterLines[j]); j++ }
      }
    }
  }
  return lines.join('\n')
}

function validateWikiPath(wikiPath: string): boolean {
  return /^(01-entities|02-topics|03-comparisons)\/[^/]+\.md$/.test(wikiPath)
}

async function processFeedback(task: FeedbackTask) {
  task.status = 'processing'
  task.progress = []
  saveFeedbacksToDisk()

  const sendProgress = (msg: string) => {
    task.progress?.push(msg)
    const stream = feedbackStreams.get(task.id)
    if (stream) stream(msg)
  }

  try {
    const fullPath = join(WIKI_DIR, task.wikiPath)
    const today = new Date().toISOString().split('T')[0]

    sendProgress(`📖 读取页面: ${task.wikiPath}`)
    const originalContent = await readFile(fullPath, 'utf-8')

    // Truncate if too long
    let pageContent = originalContent
    const MAX_CONTENT = 50000
    if (pageContent.length > MAX_CONTENT) {
      pageContent = pageContent.slice(0, MAX_CONTENT) + '\n\n[... 内容过长，已截断 ...]'
      sendProgress(`✂️ 内容截断至 ${MAX_CONTENT} 字符`)
    }

    const prompt = `你是知识库管理员。用户对这个 wiki 页面提出了修改建议，请根据建议修改页面内容。

## 当前页面

文件路径: ${task.wikiPath}

${pageContent}

## 用户的修改建议

${task.suggestion}

## 要求

1. 根据用户的建议修改页面内容
2. 保持 YAML frontmatter 格式不变，但更新 updated 日期为 ${today}，并根据需要更新 tags、related、insights
3. 保持 wiki-links [[slug]] 格式
4. 如果建议合理，直接采纳；如果建议不合适，做出适当调整并在内容中体现
5. 只输出修改后的完整页面 markdown 内容（包含 frontmatter），不要输出其他解释`

    task.prompt = prompt
    saveFeedbacksToDisk()

    // Spawn Claude CLI (same pattern as processFile)
    const config = loadConfig()
    const spawnEnv: Record<string, string> = { ...process.env as Record<string, string> }
    if (config.apiKey) spawnEnv.ANTHROPIC_API_KEY = config.apiKey
    if (config.baseURL) spawnEnv.ANTHROPIC_BASE_URL = config.baseURL

    const claudeArgs = ['--print', '--output-format', 'text']
    if (config.model) claudeArgs.push('--model', config.model)
    claudeArgs.push('--dangerously-skip-permissions')
    claudeArgs.push('--add-dir', '/app')
    claudeArgs.push('--add-dir', WIKI_DIR)
    claudeArgs.push('--add-dir', RAW_DIR)

    sendProgress(`🤖 调用 Claude CLI (model: ${config.model || 'default'})...`)

    const result = await new Promise<string>((resolve, reject) => {
      const child = spawn('claude', claudeArgs, {
        cwd: '/app',
        env: { ...spawnEnv, HOME: process.env.HOME || '/home/node' },
        timeout: 600000,
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      let stdout = ''
      let stderr = ''

      child.stdin.write(prompt)
      child.stdin.end()

      child.stdout.on('data', (data) => {
        const text = data.toString()
        stdout += text
        const lines = text.split('\n').filter((l: string) => l.trim())
        for (const line of lines) {
          sendProgress(`  ${line.slice(0, 200)}`)
        }
      })

      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout)
        } else {
          reject(new Error(stderr || `Claude CLI 退出，代码: ${code}`))
        }
      })

      child.on('error', (err) => {
        if (err.message.includes('ENOENT')) {
          reject(new Error('Claude CLI 未找到。请确认已安装: npm install -g @anthropic-ai/claude-code'))
        } else {
          reject(err)
        }
      })
    })

    sendProgress(`✅ Claude CLI 完成，输出 ${result.length} 字符`)

    // Validate output has frontmatter
    if (!result.trim().startsWith('---')) {
      throw new Error('Claude 输出格式异常：缺少 frontmatter')
    }

    task.claudeOutput = result

    // Compute diff
    task.diff = computeDiff(originalContent, result)
    const changeCount = (task.diff.match(/^- /gm) || []).length + (task.diff.match(/^\+ /gm) || []).length
    sendProgress(`📊 变更 ${changeCount} 行`)

    // Write updated content
    await writeFile(fullPath, result, 'utf-8')
    sendProgress(`💾 已更新: ${task.wikiPath}`)

    // Append to log.md
    try {
      const logPath = join(WIKI_DIR, 'log.md')
      let logContent = ''
      try { logContent = await readFile(logPath, 'utf-8') } catch { /* ignore */ }
      const logEntry = `\n- [feedback] ${today} — ${task.wikiPath} — ${task.suggestion.slice(0, 80)}${task.suggestion.length > 80 ? '...' : ''}`
      logContent += logEntry
      await writeFile(logPath, logContent, 'utf-8')
    } catch { /* ignore log append failure */ }

    task.status = 'completed'
    task.result = `已更新页面，变更 ${changeCount} 行`
    task.completedAt = new Date().toISOString()
    saveFeedbacksToDisk()
  } catch (err: any) {
    sendProgress(`❌ 错误: ${err.message}`)
    task.status = 'failed'
    task.error = err.message || '未知错误'
    task.completedAt = new Date().toISOString()
    saveFeedbacksToDisk()
  } finally {
    feedbackStreams.delete(task.id)
  }
}

// POST /api/feedback — Submit feedback
fastify.post('/api/feedback', async (request, reply) => {
  const { wikiPath, suggestion } = request.body as { wikiPath: string; suggestion: string }

  if (!wikiPath || !suggestion) {
    reply.code(400)
    return { error: '缺少 wikiPath 或 suggestion' }
  }

  if (!validateWikiPath(wikiPath)) {
    reply.code(400)
    return { error: '无效的 wikiPath' }
  }

  // Check file exists
  const fullPath = join(WIKI_DIR, wikiPath)
  if (!existsSync(fullPath)) {
    reply.code(404)
    return { error: '页面不存在' }
  }

  // Check if already processing for this page
  const isProcessing = Array.from(feedbacks.values()).some(
    fb => fb.wikiPath === wikiPath && fb.status === 'processing'
  )

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2)
  const task: FeedbackTask = {
    id,
    wikiPath,
    suggestion,
    status: isProcessing ? 'queued' : 'queued',
    createdAt: new Date().toISOString(),
  }
  feedbacks.set(id, task)
  saveFeedbacksToDisk()

  if (!isProcessing) {
    processFeedback(task)
  }

  return { feedbackId: id, status: task.status }
})

// GET /api/feedback?page= — List feedbacks for a page
fastify.get('/api/feedback', async (request) => {
  const { page } = request.query as { page?: string }
  let list = Array.from(feedbacks.values())

  if (page) {
    list = list.filter(fb => fb.wikiPath === page)
  }

  return list.slice(-20).reverse().map(fb => ({
    id: fb.id,
    wikiPath: fb.wikiPath,
    suggestion: fb.suggestion,
    status: fb.status,
    result: fb.result,
    error: fb.error,
    createdAt: fb.createdAt,
    completedAt: fb.completedAt,
  }))
})

// GET /api/feedback/:id — Get feedback detail
fastify.get('/api/feedback/:id', async (request, reply) => {
  const { id } = request.params as { id: string }
  const fb = feedbacks.get(id)
  if (!fb) {
    reply.code(404)
    return { error: '反馈不存在' }
  }
  return fb
})

// GET /api/feedback/:id/stream — SSE for live progress
fastify.get('/api/feedback/:id/stream', async (request, reply) => {
  const { id } = request.params as { id: string }
  const fb = feedbacks.get(id)
  if (!fb) {
    reply.code(404)
    return { error: '反馈不存在' }
  }

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  const send = (msg: string) => {
    reply.raw.write(`data: ${JSON.stringify(msg)}\n\n`)
  }

  feedbackStreams.set(id, send)

  // Send existing progress
  if (fb.progress) {
    for (const p of fb.progress) send(p)
  }

  // If already completed/failed, send final event
  if (fb.status === 'completed' || fb.status === 'failed') {
    reply.raw.write(`event: done\ndata: ${JSON.stringify(fb.status)}\n\n`)
    reply.raw.end()
    feedbackStreams.delete(id)
  }

  request.raw.on('close', () => {
    feedbackStreams.delete(id)
  })
})

// POST /api/feedback/:id/retry — Retry failed feedback
fastify.post('/api/feedback/:id/retry', async (request, reply) => {
  const { id } = request.params as { id: string }
  const old = feedbacks.get(id)
  if (!old) {
    reply.code(404)
    return { error: '反馈不存在' }
  }

  const newId = Date.now().toString(36) + Math.random().toString(36).slice(2)
  const task: FeedbackTask = {
    id: newId,
    wikiPath: old.wikiPath,
    suggestion: old.suggestion,
    status: 'queued',
    createdAt: new Date().toISOString(),
  }
  feedbacks.set(newId, task)
  saveFeedbacksToDisk()

  processFeedback(task)

  return { feedbackId: newId, status: 'queued' }
})

// DELETE /api/feedback/:id — Delete feedback
fastify.delete('/api/feedback/:id', async (request, reply) => {
  const { id } = request.params as { id: string }
  const fb = feedbacks.get(id)
  if (!fb) {
    reply.code(404)
    return { error: '反馈不存在' }
  }

  feedbackStreams.delete(id)
  feedbacks.delete(id)
  saveFeedbacksToDisk()

  return { success: true, deleted: id }
})

// ── Session Monitor API ──────────────────────────────────────────────
const SESSION_DIRS = [
  process.env.CLAUDE_SESSIONS_HOST,  // 宿主机 sessions（只读）
  join(process.env.HOME || '/home/node', '.claude/projects'),  // 容器内 sessions（读写）
].filter(Boolean) as string[]

interface SessionInfo {
  id: string
  project: string
  preview: string
  timestamp: string
  lastActivity: string
  messageCount: number
  toolCallCount: number
  isActive: boolean
  size: number
}

function findSessionFile(sessionId: string): string | null {
  for (const dir of SESSION_DIRS) {
    try {
      const projectDirs = readdirSync(dir)
      for (const projDir of projectDirs) {
        const fullPath = join(dir, projDir, `${sessionId}.jsonl`)
        if (existsSync(fullPath)) return fullPath
      }
    } catch { /* skip inaccessible dirs */ }
  }
  return null
}

function parseSessionMeta(filePath: string): SessionInfo | null {
  try {
    const fileStat = statSync(filePath)
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n').filter(l => l.trim())
    let sessionId = ''
    let preview = ''
    let timestamp = ''
    let messageCount = 0
    let toolCallCount = 0
    const projectMatch = filePath.match(/projects\/([^/]+)\//)

    for (const line of lines) {
      try {
        const obj = JSON.parse(line)
        if (obj.type === 'permission-mode' && obj.sessionId) sessionId = obj.sessionId
        if (obj.type === 'user' && !preview) {
          const msg = obj.message?.content
          if (typeof msg === 'string') preview = msg.slice(0, 120)
          else if (Array.isArray(msg)) {
            const textBlock = msg.find((b: any) => b.type === 'text')
            if (textBlock?.text) preview = textBlock.text.slice(0, 120)
          }
        }
        if (obj.type === 'user' || obj.type === 'assistant') {
          messageCount++
          if (obj.timestamp && !timestamp) timestamp = obj.timestamp
        }
        if (obj.type === 'assistant' && Array.isArray(obj.message?.content)) {
          toolCallCount += obj.message.content.filter((b: any) => b.type === 'tool_use').length
        }
      } catch { /* skip bad lines */ }
    }

    return {
      id: sessionId || filePath.split('/').pop()?.replace('.jsonl', '') || '',
      project: projectMatch?.[1] || '',
      preview,
      timestamp,
      lastActivity: fileStat.mtime.toISOString(),
      messageCount,
      toolCallCount,
      isActive: Date.now() - fileStat.mtimeMs < 30000,
      size: fileStat.size,
    }
  } catch {
    return null
  }
}

function parseSessionContent(filePath: string, fromLine = 0) {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter(l => l.trim())
  const messages: any[] = []
  const toolResultMap = new Map<string, any>()

  for (let i = fromLine; i < lines.length; i++) {
    try {
      const obj = JSON.parse(lines[i])
      if (obj.type === 'user') {
        const msgContent = obj.message?.content
        if (Array.isArray(msgContent)) {
          for (const block of msgContent) {
            if (block.type === 'tool_result') {
              toolResultMap.set(block.tool_use_id, {
                content: typeof block.content === 'string'
                  ? block.content.slice(0, 5000)
                  : JSON.stringify(block.content).slice(0, 5000),
                isError: block.is_error || false,
              })
            }
          }
          const textBlocks = msgContent.filter((b: any) => b.type !== 'tool_result')
          if (textBlocks.length > 0) {
            messages.push({
              type: 'user',
              timestamp: obj.timestamp,
              content: textBlocks.length === 1 && textBlocks[0].type === 'text'
                ? textBlocks[0].text
                : textBlocks,
            })
          }
        } else if (typeof msgContent === 'string') {
          messages.push({ type: 'user', timestamp: obj.timestamp, content: msgContent })
        }
      } else if (obj.type === 'assistant') {
        const blocks = Array.isArray(obj.message?.content) ? obj.message.content : []
        const processed = blocks.map((block: any) => {
          if (block.type === 'tool_use') {
            const result = toolResultMap.get(block.id)
            return {
              type: 'tool_use',
              toolUseId: block.id,
              name: block.name,
              input: block.input,
              result: result || null,
            }
          }
          if (block.type === 'thinking') {
            return { type: 'thinking', text: (block.thinking || '').slice(0, 3000) }
          }
          if (block.type === 'text') {
            return { type: 'text', text: block.text }
          }
          return block
        })
        messages.push({ type: 'assistant', timestamp: obj.timestamp, content: processed })
      }
    } catch { /* skip */ }
  }

  return { messages, totalLines: lines.length }
}

// GET /api/sessions
fastify.get('/api/sessions', async () => {
  const sessions: SessionInfo[] = []
  for (const dir of SESSION_DIRS) {
    try {
      const projectDirs = readdirSync(dir)
      for (const projDir of projectDirs) {
        const projPath = join(dir, projDir)
        try {
          const stat = statSync(projPath)
          if (!stat.isDirectory()) continue
        } catch { continue }
        let files: string[]
        try { files = readdirSync(projPath) } catch { continue }
        for (const file of files) {
          if (!file.endsWith('.jsonl')) continue
          const info = parseSessionMeta(join(projPath, file))
          if (info) sessions.push(info)
        }
      }
    } catch { /* skip */ }
  }
  sessions.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
  return { sessions }
})

// GET /api/sessions/:id
fastify.get('/api/sessions/:id', async (request, reply) => {
  const { id } = request.params as { id: string }
  const fromLine = parseInt((request.query as any).fromLine || '0')
  const filePath = findSessionFile(id)
  if (!filePath) {
    reply.code(404)
    return { error: '会话不存在' }
  }
  const { messages, totalLines } = parseSessionContent(filePath, fromLine)
  return { id, messages, totalLines }
})

// GET /api/sessions/:id/stream — SSE real-time session streaming
fastify.get('/api/sessions/:id/stream', async (request, reply) => {
  const { id } = request.params as { id: string }
  const filePath = findSessionFile(id)
  if (!filePath) {
    reply.code(404)
    return { error: '会话不存在' }
  }

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  // Send existing messages
  const { messages, totalLines } = parseSessionContent(filePath)
  for (const msg of messages) {
    reply.raw.write(`data: ${JSON.stringify({ type: 'message', message: msg })}\n\n`)
  }
  reply.raw.write(`data: ${JSON.stringify({ type: 'synced', totalLines })}\n\n`)

  // Poll for new lines
  let lastLineCount = totalLines
  const pollInterval = setInterval(() => {
    try {
      const content = readFileSync(filePath, 'utf-8')
      const lines = content.split('\n').filter(l => l.trim())
      if (lines.length > lastLineCount) {
        const { messages: newMsgs } = parseSessionContent(filePath, lastLineCount)
        for (const msg of newMsgs) {
          reply.raw.write(`data: ${JSON.stringify({ type: 'message', message: msg })}\n\n`)
        }
        lastLineCount = lines.length
      }
    } catch { /* file might be temporarily unavailable */ }
  }, 1000)

  const heartbeat = setInterval(() => {
    reply.raw.write(': heartbeat\n\n')
  }, 30000)

  request.raw.on('close', () => {
    clearInterval(pollInterval)
    clearInterval(heartbeat)
  })
})

// 启动时加载历史任务
loadTasksFromDisk()
loadFeedbacksFromDisk()

// === Dream API ===

import { runDream, rollbackDream, loadPersistedState, getDreamState } from './dream-runner.ts'

const dreamStreams = new Map<string, (msg: string) => void>()

// POST /api/dream/start — 手动触发梦境
fastify.post('/api/dream/start', async (request, reply) => {
  // 检查是否已在运行
  const current = getDreamState() || loadPersistedState()
  if (current && current.status === 'running') {
    reply.code(409)
    return { error: '梦境正在运行中' }
  }

  const dreamId = Date.now().toString(36) + Math.random().toString(36).slice(2)

  // 异步启动梦境
  runDream((msg) => {
    const stream = dreamStreams.get(dreamId)
    if (stream) stream(msg)
  })
    .then((state) => {
      dreamStreams.delete(dreamId)
    })
    .catch((err) => {
      dreamStreams.delete(dreamId)
    })

  return { dreamId, status: 'running' }
})

// GET /api/dream/status — 当前梦境状态
fastify.get('/api/dream/status', async () => {
  const state = getDreamState() || loadPersistedState()
  return state || { status: 'idle' }
})

// GET /api/dream/stream — SSE 实时进度
fastify.get('/api/dream/stream', async (request, reply) => {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  const dreamId = 'live'

  const sendProgress = (progress: string) => {
    reply.raw.write(`data: ${JSON.stringify({ progress })}\n\n`)
  }

  dreamStreams.set(dreamId, sendProgress)

  const heartbeat = setInterval(() => {
    reply.raw.write(`: heartbeat\n\n`)
  }, 30000)

  request.raw.on('close', () => {
    clearInterval(heartbeat)
    dreamStreams.delete(dreamId)
  })
})

// GET /api/dream/diff — 获取最近一次 diff
fastify.get('/api/dream/diff', async (request, reply) => {
  const state = loadPersistedState()
  if (!state || !state.patchFile) {
    reply.code(404)
    return { error: '无梦境记录' }
  }

  try {
    const diff = await readFile(state.patchFile, 'utf-8')
    return { diff, date: state.startedAt, editCount: state.editCount }
  } catch {
    reply.code(404)
    return { error: 'diff 文件不存在' }
  }
})

// POST /api/dream/merge — 接受梦境修改（diff 已在 wiki 中，无需额外操作）
fastify.post('/api/dream/merge', async () => {
  const state = loadPersistedState()
  if (!state) {
    return { error: '无梦境记录' }
  }
  // 梦境修改已直接写入 /wiki-content（即 99-wiki）
  // "接受" = 确认保留这些修改，不做任何额外操作
  return { ok: true, message: '梦境修改已保留' }
})

// POST /api/dream/revert — 回滚梦境修改
fastify.post('/api/dream/revert', async () => {
  try {
    await rollbackDream()
    return { ok: true, message: '梦境修改已回滚' }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
})

// ============ Status API ============

fastify.get('/api/status', async () => {
  const categories = ['01-entities', '02-topics', '03-comparisons']
  const wiki: Record<string, number> = {}
  let totalWiki = 0
  for (const cat of categories) {
    const catDir = join(WIKI_DIR, cat)
    try {
      const files = readdirSync(catDir).filter(f => f.endsWith('.md'))
      wiki[cat] = files.length
      totalWiki += files.length
    } catch {
      wiki[cat] = 0
    }
  }

  // Raw coverage
  const coveragePath = join(WIKI_DIR, '.raw-coverage')
  let rawProcessed = 0
  let rawTotal = 0
  try {
    const cov = readFileSync(coveragePath, 'utf-8')
    rawProcessed = (cov.match(/ \| done \| /g) || []).length
    for (const subdir of RAW_SUBDIRS) {
      try { rawTotal += readdirSync(join(RAW_DIR, subdir)).filter(f => f.endsWith('.md')).length } catch { /* skip */ }
    }
  } catch { /* skip */ }
  const unprocessed = Math.max(0, rawTotal - rawProcessed)

  // Last activity timestamps
  let lastIngest: string | null = null
  try {
    const log = readFileSync(join(WIKI_DIR, 'log.md'), 'utf-8')
    const m = log.match(/^## (20\d{2}-\d{2}-\d{2})/m)
    if (m) lastIngest = m[1]
  } catch { /* skip */ }

  let lastLint: string | null = null
  try {
    lastLint = JSON.parse(readFileSync(LINT_LAST_RUN_FILE, 'utf-8')).lastRun || null
  } catch { /* skip */ }

  let lastDream: string | null = null
  let dreamStatus = 'idle'
  const dreamState = getDreamState() || loadPersistedState()
  if (dreamState) {
    lastDream = dreamState.startedAt || null
    dreamStatus = dreamState.status || 'idle'
  }

  return {
    raw: { total: rawTotal, processed: rawProcessed, unprocessed },
    wiki: { total: totalWiki, ...wiki },
    lastIngest,
    lastLint,
    lastDream,
    dreamStatus,
  }
})

// 注册 Output Studio API
registerOutputRoutes(fastify, {
  dataDir: DATA_DIR,
  wikiDir: WIKI_DIR,
  outputDir: process.env.OUTPUT_DIR || join(process.cwd(), '..', '..', '100-output'),
  loadConfig,
})

fastify.listen({ port: 3456, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  console.log(`Ingest API running at ${address}`)
})
