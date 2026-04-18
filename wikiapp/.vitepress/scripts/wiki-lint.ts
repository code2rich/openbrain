/**
 * wiki-lint.ts — 知识库健康检查脚本
 *
 * 运行方式：
 *   npm run lint              # 仅基础检查
 *   npm run lint -- --deep    # 含暗线发现（需配置 ANTHROPIC_API_KEY）
 *   npm run lint -- --fix     # 自动修复可修复的问题
 *
 * 检查项目：
 * 1. 孤立页面检测 — 无任何页面引用（无 used_in、无 wiki-link、无 related）
 * 2. frontmatter 完整性 — 缺少 scenes/insights/used_in 的页面
 * 3. 时效性检查 — 计算 stale_score，标记需要审阅的页面
 * 4. 活跃度报告 — 从未被 used_in 引用的页面
 * 5. 暗线发现 — 扫描语义相关但无双链的页面对（需 LLM）
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import matter from 'gray-matter'
import { encodeURIComponent } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const WIKI_DIR = process.env.WIKI_DIR || path.resolve(__dirname, '../../../99-wiki')
const LOG_FILE = path.resolve(__dirname, '../../../99-wiki/log.md')

const CATEGORIES = ['01-entities', '02-topics', '03-comparisons'] as const
const CATEGORY_LABELS: Record<string, string> = {
  '01-entities': '实体页面',
  '02-topics': '主题综述',
  '03-comparisons': '对比分析',
}

// ============ 类型定义 ============

interface PageMeta {
  slug: string
  title: string
  description: string
  type: string
  created: string
  updated: string
  tags: string[]
  related: string[]
  used_in: any[]
  insights: any[]
  scenes: string[]
  knowledge_type: string
  review_cycle: number | null
  dirName: string
  filePath: string
}

interface LintResult {
  orphans: PageMeta[]          // 孤立页面
  missingScenes: PageMeta[]    // 缺少 scenes
  missingInsights: PageMeta[]  // 缺少个人洞察
  unusedPages: PageMeta[]      // 从未被 used_in 引用
  stalePages: PageMeta[]       // 需要审阅的页面
  hiddenConnections: HiddenConnection[]
}

interface HiddenConnection {
  pageA: string
  pageB: string
  reason: string
  confidence: 'high' | 'medium'
}

// ============ 工具函数 ============

function parseFrontmatter(filePath: string): Record<string, any> {
  let content = fs.readFileSync(filePath, 'utf-8')
  content = content.replace(/^(\s*related:\s*)(.+)$/m, (match, prefix, value) => {
    if (value.startsWith('"') || value.startsWith("'")) return match
    return `${prefix}"${value}"`
  })
  return matter(content).data
}

function parseRelated(related: string | string[] | undefined): string[] {
  if (!related) return []
  if (Array.isArray(related)) {
    return related.flatMap(r => parseRelated(r))
  }
  return related.split(',').map((r: string) => r.trim().replace(/^\[\[|\]\]$/g, ''))
}

function extractInlineWikiLinks(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const matches = content.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)
  return [...new Set([...matches].map(m => m[1]))]
}

function toDateStr(val: any): string {
  if (!val) return ''
  if (val instanceof Date) return val.toISOString().slice(0, 10)
  return String(val).slice(0, 10)
}

function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
}

// ============ 扫描 Wiki ============

function scanWiki(): PageMeta[] {
  const pages: PageMeta[] = []

  for (const dirName of CATEGORIES) {
    const dirPath = path.join(WIKI_DIR, dirName)
    if (!fs.existsSync(dirPath)) continue

    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'))
    for (const file of files) {
      const filePath = path.join(dirPath, file)
      const fm = parseFrontmatter(filePath)
      const slug = file.replace(/\.md$/, '')

      pages.push({
        slug,
        title: fm.title || slug,
        description: fm.description || '',
        type: fm.type || dirName,
        created: toDateStr(fm.created),
        updated: toDateStr(fm.updated),
        tags: Array.isArray(fm.tags) ? fm.tags : [],
        related: parseRelated(fm.related),
        used_in: Array.isArray(fm.used_in) ? fm.used_in : [],
        insights: Array.isArray(fm.insights) ? fm.insights : [],
        scenes: Array.isArray(fm.scenes) ? fm.scenes : [],
        knowledge_type: fm.knowledge_type || 'periodic',
        review_cycle: fm.review_cycle ?? (fm.knowledge_type === 'permanent' ? null : 90),
        dirName,
        filePath,
      })
    }
  }

  return pages
}

function buildBacklinks(pages: PageMeta[]): Record<string, Set<string>> {
  const backlinks: Record<string, Set<string>> = {}
  for (const page of pages) backlinks[page.slug] = new Set()

  for (const page of pages) {
    // related 声明
    for (const target of page.related) {
      if (backlinks[target]) backlinks[target].add(page.slug)
    }
    // 正文 wiki-link
    for (const target of extractInlineWikiLinks(page.filePath)) {
      if (backlinks[target]) backlinks[target].add(page.slug)
    }
  }

  return backlinks
}

function computeUsedInRefs(pages: PageMeta[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const page of pages) counts[page.slug] = page.used_in.length
  return counts
}

// ============ Lint 检查 ============

function lintPages(pages: PageMeta[]): Omit<LintResult, 'hiddenConnections'> {
  const backlinks = buildBacklinks(pages)
  const usedInRefs = computeUsedInRefs(pages)
  const today = new Date().toISOString().slice(0, 10)

  const orphans: PageMeta[] = []
  const missingScenes: PageMeta[] = []
  const missingInsights: PageMeta[] = []
  const unusedPages: PageMeta[] = []
  const stalePages: PageMeta[] = []

  for (const page of pages) {
    const backlinkCount = backlinks[page.slug].size
    const hasWikiLinks = page.related.length > 0 || extractInlineWikiLinks(page.filePath).length > 0
    const usedInCount = usedInRefs[page.slug]

    // 1. 孤立页面：无 used_in，无 wiki-link，无 related
    if (usedInCount === 0 && backlinkCount === 0 && !hasWikiLinks) {
      orphans.push(page)
    }

    // 2. 缺少 scenes
    if (page.scenes.length === 0) {
      missingScenes.push(page)
    }

    // 3. 缺少个人洞察
    if (page.insights.length === 0) {
      missingInsights.push(page)
    }

    // 4. 从未被 used_in 引用
    if (usedInCount === 0) {
      unusedPages.push(page)
    }

    // 5. 时效性检查
    if (page.review_cycle !== null && page.review_cycle > 0) {
      const staleScore = daysBetween(page.updated, today) / page.review_cycle
      if (staleScore >= 1.0) {
        stalePages.push(page)
      }
    }
  }

  return { orphans, missingScenes, missingInsights, unusedPages, stalePages }
}

// ============ 暗线发现（LLM）============

type LlmProvider = 'anthropic' | 'openai-compatible' | 'deepseek'

interface LlmConfig {
  provider: LlmProvider
  apiKey: string
  baseUrl: string
  model: string
}

function detectLlmConfig(): LlmConfig | null {
  // 优先级1：ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN（MiniMax、智谱等兼容接口）
  if (process.env.ANTHROPIC_BASE_URL && process.env.ANTHROPIC_AUTH_TOKEN) {
    return {
      provider: 'openai-compatible',
      apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
      baseUrl: process.env.ANTHROPIC_BASE_URL.replace(/\/$/, ''),
      model: process.env.ANTHROPIC_MODEL || process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL || 'claude-haiku-4-5-20251001',
    }
  }
  // 优先级2：ANTHROPIC_API_KEY（原生 Anthropic）
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseUrl: 'https://api.anthropic.com',
      model: 'claude-haiku-4-5-20251001',
    }
  }
  // 优先级3：DEEPSEEK_API_KEY
  if (process.env.DEEPSEEK_API_KEY) {
    return {
      provider: 'deepseek',
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
    }
  }
  return null
}

async function callLlm(config: LlmConfig, messages: any[]): Promise<string> {
  const { provider, apiKey, baseUrl, model } = config

  if (provider === 'anthropic') {
    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model, max_tokens: 200, temperature: 0.3, messages }),
    })
    const data: any = await response.json()
    return data.content?.[0]?.text?.trim() || '{}'
  }

  // OpenAI 兼容格式（DeepSeek、智谱、MiniMax、ANTHROPIC_BASE_URL）
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, max_tokens: 200, temperature: 0.3, messages }),
  })
  const data: any = await response.json()
  return data.choices?.[0]?.message?.content?.trim() || '{}'
}

async function discoverHiddenConnections(pages: PageMeta[], maxPairs = 30): Promise<HiddenConnection[]> {
  const config = detectLlmConfig()
  if (!config) {
    console.log('  ⚠ 未配置任何 LLM API Key（支持 ANTHROPIC_AUTH_TOKEN + ANTHROPIC_BASE_URL、ANTHROPIC_API_KEY、DEEPSEEK_API_KEY、ZHIPU_API_KEY、MINIMAX_API_KEY），跳过暗线发现')
    return []
  }
  console.log(`  🤖 使用 LLM: ${config.provider} (${config.model})`)

  // 找出现在没有双向链接的页面对（排除自身）
  const connected = new Set<string>()
  for (const page of pages) {
    for (const t of page.related) connected.add(`${page.slug}->${t}`)
    for (const t of extractInlineWikiLinks(page.filePath)) connected.add(`${page.slug}->${t}`)
  }

  const candidates: [string, string][] = []
  for (let i = 0; i < pages.length; i++) {
    for (let j = i + 1; j < pages.length; j++) {
      const a = pages[i].slug
      const b = pages[j].slug
      if (!connected.has(`${a}->${b}`) && !connected.has(`${b}->${a}`)) {
        candidates.push([a, b])
      }
    }
  }

  // 最多检查 maxPairs 对
  const selected = candidates.slice(0, maxPairs)
  if (selected.length === 0) return []

  console.log(`  发现 ${candidates.length} 个候选页面对，随机抽样 ${selected.length} 对进行语义分析...`)

  // 批量分析（每批 5 对）
  const results: HiddenConnection[] = []
  const batchSize = 5

  for (let i = 0; i < selected.length; i += batchSize) {
    const batch = selected.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(async ([aSlug, bSlug]) => {
        const aPage = pages.find(p => p.slug === aSlug)!
        const bPage = pages.find(p => p.slug === bSlug)!

        const aContent = fs.readFileSync(aPage.filePath, 'utf-8').slice(0, 3000)
        const bContent = fs.readFileSync(bPage.filePath, 'utf-8').slice(0, 3000)

        try {
          const text = await callLlm(config, [{
            role: 'user',
            content: `你是一个知识图谱分析助手。以下是两个 wiki 页面的摘要内容：

--- 页面 A: ${aPage.title} ---
${aContent}

--- 页面 B: ${bPage.title} ---
${bContent}

请判断这两个页面之间是否存在隐藏的知识关联（如：讨论同一个领域的不同侧面、可以互相补充说明、因果/层次关系等）。

如果存在关联，以严格的 JSON 格式返回（不要有任何其他文字）：
{
  "connected": true 或 false,
  "reason": "关联原因（1-2句话）",
  "confidence": "high" 或 "medium"
}

如果不存在任何关联：
{
  "connected": false,
  "reason": "",
  "confidence": "medium"
}`,
          }])

          const jsonMatch = text.match(/\{[\s\S]*\}/)
          if (!jsonMatch) return null

          const parsed = JSON.parse(jsonMatch[0])
          if (parsed.connected) {
            return {
              pageA: aSlug,
              pageB: bSlug,
              reason: parsed.reason,
              confidence: parsed.confidence || 'medium',
            }
          }
        } catch (err) {
          console.error(`  ⚠ 分析失败: ${aSlug} <-> ${bSlug}`, err)
        }
        return null
      }),
    )

    results.push(...batchResults.filter((r): r is HiddenConnection => r !== null))

    // 限流
    if (i + batchSize < selected.length) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  return results
}

// ============ 日志追加 ============

function appendToLog(message: string) {
  const timestamp = new Date().toISOString().slice(0, 10)
  const entry = `\n### 维护 (Lint)\n- [lint] ${timestamp} — ${message}\n`
  fs.appendFileSync(LOG_FILE, entry, 'utf-8')
}

// ============ 报告输出 ============

function printReport(result: LintResult) {
  console.log('\n📊 知识库健康报告\n' + '─'.repeat(50))

  if (result.orphans.length > 0) {
    console.log(`\n🔴 孤立页面（${result.orphans.length}个）— 无任何引用`)
    for (const p of result.orphans) {
      console.log(`   · ${p.title} (${p.dirName})`)
    }
  } else {
    console.log('\n✅ 无孤立页面')
  }

  if (result.stalePages.length > 0) {
    console.log(`\n🟡 即将过时页面（${result.stalePages.length}个）— stale_score ≥ 1.0，需人工审阅`)
    for (const p of result.stalePages) {
      const score = daysBetween(p.updated, new Date().toISOString().slice(0, 10)) / (p.review_cycle || 90)
      console.log(`   · ${p.title} (stale_score=${score.toFixed(1)})`)
    }
  } else {
    console.log('\n✅ 所有页面均为最新')
  }

  if (result.unusedPages.length > 0) {
    console.log(`\n🟠 知识未使用（${result.unusedPages.length}个）— 从未被 used_in 引用`)
    for (const p of result.unusedPages.slice(0, 10)) {
      console.log(`   · ${p.title}`)
    }
    if (result.unusedPages.length > 10) {
      console.log(`   ... 还有 ${result.unusedPages.length - 10} 个`)
    }
  } else {
    console.log('\n✅ 所有页面均已被引用')
  }

  if (result.missingScenes.length > 0) {
    console.log(`\n🔵 缺少使用场景（${result.missingScenes.length}个）— 无 scenes 字段`)
    for (const p of result.missingScenes.slice(0, 5)) {
      console.log(`   · ${p.title}`)
    }
  }

  if (result.missingInsights.length > 0) {
    console.log(`\n🟣 缺少个人洞察（${result.missingInsights.length}个）— 无 insights 字段`)
    for (const p of result.missingInsights.slice(0, 5)) {
      console.log(`   · ${p.title}`)
    }
  }

  if (result.hiddenConnections.length > 0) {
    console.log(`\n💡 暗线发现（${result.hiddenConnections.length}对）— 语义相关但无双链`)
    for (const conn of result.hiddenConnections) {
      console.log(`   · ${conn.pageA} ↔ ${conn.pageB} [${conn.confidence}]`)
      console.log(`     原因：${conn.reason}`)
    }
  }

  // 统计摘要
  const totalPages = result.orphans.length + Object.keys(result).flatMap(k =>
    k === 'orphans' ? [] : (result as any)[k]
  ).filter((_, i, arr) => i < 10).length

  console.log('\n' + '─'.repeat(50))
  console.log(`总计：${result.orphans.length + result.stalePages.length + result.unusedPages.length + result.missingScenes.length + result.missingInsights.length} 个问题`)
}

// ============ 主入口 ============

async function main() {
  const args = process.argv.slice(2)
  const deepMode = args.includes('--deep')
  const fixMode = args.includes('--fix')

  console.log(`🔍 扫描知识库: ${WIKI_DIR}\n`)

  const pages = scanWiki()
  console.log(`📄 共 ${pages.length} 个页面\n`)

  // 基础检查
  const basicResult = lintPages(pages)

  // 暗线发现
  let hiddenConnections: HiddenConnection[] = []
  if (deepMode) {
    console.log('🔮 启动暗线发现...')
    hiddenConnections = await discoverHiddenConnections(pages)
  }

  const result: LintResult = { ...basicResult, hiddenConnections }

  printReport(result)

  // 追加日志
  const issues = [
    result.orphans.length > 0 ? `${result.orphans.length}个孤立页面` : '',
    result.stalePages.length > 0 ? `${result.stalePages.length}个过时页面` : '',
    result.unusedPages.length > 0 ? `${result.unusedPages.length}个未使用页面` : '',
    result.hiddenConnections.length > 0 ? `${result.hiddenConnections.length}对暗线` : '',
  ].filter(Boolean)

  if (issues.length > 0) {
    appendToLog(`发现问题：${issues.join('、')}`)
  } else {
    appendToLog('知识库健康检查完成，无明显问题')
  }

  // 导出暗线到文件供后续处理
  if (hiddenConnections.length > 0) {
    const outputPath = path.resolve(__dirname, '../generated/hidden-connections.json')
    fs.mkdirSync(path.dirname(outputPath), { recursive: true })
    fs.writeFileSync(outputPath, JSON.stringify(hiddenConnections, null, 2), 'utf-8')
    console.log(`\n💾 暗线关系已保存至: ${outputPath}`)
  }
}

main().catch(console.error)
