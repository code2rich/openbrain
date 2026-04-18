/**
 * extract-entities.ts — 实体提取脚本
 *
 * 扫描所有 wiki 页面，统计被频繁提及但缺少实体页的对象，
 * 输出"建议创建的实体页"清单（按提及频率排序）。
 *
 * 运行方式：
 *   npx tsx scripts/extract-entities.ts              # 仅输出建议清单
 *   npx tsx scripts/extract-entities.ts --generate    # 自动为 top N 高频实体生成页面（需 API Key）
 *   npx tsx scripts/extract-entities.ts --top=10      # 只处理前 10 个
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const WIKI_DIR = process.env.WIKI_DIR || path.resolve(__dirname, '../../../99-wiki')
const ENTITY_DIR = path.join(WIKI_DIR, '01-entities')

// 已有的所有 wiki 页面 slug（用于排除已有页面）
const EXISTING_PAGES = new Set<string>()

// 已知的主题/对比页面 slug 前缀（这些不是实体）
const TOPIC_PREFIXES = [
  'asset-allocation-', 'wealth-planning-', 'fund-investment-',
  'ai-', 'llm-', 'mcp-', 'rag-', 'claude-code-',
  'personal-', 'auto-', 'wechat-', 'xhs-',
  'team-', 'data-', 'document-', 'reading-',
  'agent-', 'wiki-', 'aigc-',
]

interface EntityCandidate {
  slug: string
  count: number
  sources: string[]
  context: string[]
}

function collectExistingPages(): void {
  const categories = ['01-entities', '02-topics', '03-comparisons']
  for (const cat of categories) {
    const catDir = path.join(WIKI_DIR, cat)
    if (!fs.existsSync(catDir)) continue
    for (const file of fs.readdirSync(catDir).filter(f => f.endsWith('.md'))) {
      EXISTING_PAGES.add(file.replace(/\.md$/, '').toLowerCase())
    }
  }
}

function getExistingEntitySlugs(): Set<string> {
  const slugs = new Set<string>()
  if (!fs.existsSync(ENTITY_DIR)) return slugs
  for (const file of fs.readdirSync(ENTITY_DIR).filter(f => f.endsWith('.md'))) {
    slugs.add(file.replace(/\.md$/, '').toLowerCase())
  }
  return slugs
}

function isEntityCandidate(slug: string): boolean {
  const lower = slug.toLowerCase()

  // 排除已有的 wiki 页面（它们已经是实体/主题/对比了）
  if (EXISTING_PAGES.has(lower)) return false

  // 排除过长的 slug
  if (slug.length > 40) return false

  // 排除纯中文长 slug（通常是主题名）
  const chineseChars = (slug.match(/[\u4e00-\u9fa5]/g) || []).length
  if (chineseChars > 6) return false

  // 排除包含太多连字符的复合 slug（通常是主题路径）
  if (lower.split('-').length > 4) return false

  // 排除已知的主题前缀
  for (const prefix of TOPIC_PREFIXES) {
    if (lower.startsWith(prefix)) return false
  }

  return true
}

function getAllRawContent(): { slug: string; raw: string }[] {
  const pages: { slug: string; raw: string }[] = []
  const categories = ['01-entities', '02-topics', '03-comparisons']

  for (const cat of categories) {
    const catDir = path.join(WIKI_DIR, cat)
    if (!fs.existsSync(catDir)) continue

    for (const file of fs.readdirSync(catDir).filter(f => f.endsWith('.md'))) {
      const filePath = path.join(catDir, file)
      const raw = fs.readFileSync(filePath, 'utf-8')
      pages.push({ slug: file.replace(/\.md$/, ''), raw })
    }
  }

  return pages
}

function extractCandidates(pages: { slug: string; raw: string }[]): Map<string, EntityCandidate> {
  const candidates = new Map<string, EntityCandidate>()

  for (const page of pages) {
    // 提取所有 [[wiki-link]]
    const wikiLinks = page.raw.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)
    for (const match of wikiLinks) {
      const linkedSlug = match[1].trim()
      if (!isEntityCandidate(linkedSlug)) continue

      const key = linkedSlug.toLowerCase()
      if (!candidates.has(key)) {
        candidates.set(key, { slug: linkedSlug, count: 0, sources: [], context: [] })
      }

      const candidate = candidates.get(key)!
      candidate.count++
      if (!candidate.sources.includes(page.slug)) {
        candidate.sources.push(page.slug)
      }

      const linkIndex = page.raw.indexOf(match[0])
      if (linkIndex !== -1) {
        const start = Math.max(0, linkIndex - 40)
        const end = Math.min(page.raw.length, linkIndex + match[0].length + 40)
        const ctx = page.raw.slice(start, end).replace(/\n/g, ' ').trim()
        if (candidate.context.length < 3) {
          candidate.context.push(ctx)
        }
      }
    }

    // 从 tags: [...] 行提取
    const tagsMatch = page.raw.match(/^tags:\s*\[(.+)\]$/m)
    if (tagsMatch) {
      const tags = tagsMatch[1].split(',').map(t => t.trim().replace(/['"]/g, ''))
      for (const tag of tags) {
        const slug = tag.replace(/\s+/g, '-').toLowerCase()
        if (!isEntityCandidate(slug)) continue

        const key = slug
        if (!candidates.has(key)) {
          candidates.set(key, { slug, count: 0, sources: [page.slug], context: [`tag: ${tag}`] })
        }
        candidates.get(key)!.count += 0.5
      }
    }

    // 从 keywords: [...] 行提取
    const kwMatch = page.raw.match(/^keywords:\s*\[(.+)\]$/m)
    if (kwMatch) {
      const kws = kwMatch[1].split(',').map(t => t.trim().replace(/['"]/g, ''))
      for (const kw of kws) {
        const slug = kw.replace(/\s+/g, '-').toLowerCase()
        if (!isEntityCandidate(slug)) continue

        const key = slug
        if (!candidates.has(key)) {
          candidates.set(key, { slug, count: 0, sources: [page.slug], context: [`keyword: ${kw}`] })
        }
        candidates.get(key)!.count += 0.5
      }
    }
  }

  return candidates
}

async function main() {
  const args = process.argv.slice(2)
  const shouldGenerate = args.includes('--generate')
  const topN = parseInt(args.find(a => a.startsWith('--top='))?.split('=')[1] || '20', 10)

  console.log('========================================')
  console.log('  实体提取分析')
  console.log('========================================\n')

  // 1. 收集已有页面
  collectExistingPages()

  // 2. 读取所有 wiki 页面原始内容
  const pages = getAllRawContent()
  console.log(`📄 扫描了 ${pages.length} 个 wiki 页面`)

  const existingEntities = getExistingEntitySlugs()
  console.log(`📋 已有 ${existingEntities.size} 个实体页\n`)

  // 3. 提取候选实体
  const candidates = extractCandidates(pages)

  // 4. 过滤掉已有实体页的
  const newCandidates = Array.from(candidates.values())
    .filter(c => !existingEntities.has(c.slug.toLowerCase()))
    .sort((a, b) => b.count - a.count)

  // 5. 输出结果
  if (newCandidates.length === 0) {
    console.log('✅ 没有发现需要创建的新实体页。')
    return
  }

  console.log(`🔍 发现 ${newCandidates.length} 个候选实体（按提及频率排序）：\n`)

  const top = newCandidates.slice(0, topN)
  for (let i = 0; i < top.length; i++) {
    const c = top[i]
    console.log(`  ${i + 1}. ${c.slug} (提及 ${c.count} 次，来自 ${c.sources.length} 个页面)`)
    if (c.context.length > 0) {
      console.log(`     上下文: "${c.context[0]}"`)
    }
    console.log(`     来源: ${c.sources.slice(0, 5).join(', ')}${c.sources.length > 5 ? ` ...等${c.sources.length}个` : ''}`)
    console.log()
  }

  const strong = newCandidates.filter(c => c.count >= 2)
  console.log('========================================')
  console.log(`  建议：优先创建提及 ≥ 2 次的实体页`)
  console.log(`  共 ${strong.length} 个高置信候选`)
  console.log('========================================\n')

  // 6. 可选：自动生成
  if (shouldGenerate) {
    const toGenerate = strong.slice(0, topN)
    if (toGenerate.length === 0) {
      console.log('没有提及 ≥ 2 次的候选实体，跳过自动生成。')
      return
    }

    console.log(`🤖 准备自动生成 ${toGenerate.length} 个实体页...\n`)

    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error('❌ 需要设置 ANTHROPIC_API_KEY 环境变量才能自动生成。')
      process.exit(1)
    }

    const client = new Anthropic({ apiKey })
    const today = new Date().toISOString().split('T')[0]

    if (!fs.existsSync(ENTITY_DIR)) {
      fs.mkdirSync(ENTITY_DIR, { recursive: true })
    }

    for (const candidate of toGenerate) {
      const pascalSlug = candidate.slug
        .split('-')
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join('')

      const filePath = path.join(ENTITY_DIR, pascalSlug + '.md')
      if (fs.existsSync(filePath)) {
        console.log(`  ⏭  ${pascalSlug} 已存在，跳过`)
        continue
      }

      console.log(`  📝 生成: ${pascalSlug}...`)

      const prompt = `你是知识库管理员。根据以下信息生成一个实体 wiki 页面。

实体名称: ${candidate.slug}
提及次数: ${candidate.count}
出现在以下页面中: ${candidate.sources.join(', ')}
上下文片段:
${candidate.context.map(c => `- "${c}"`).join('\n')}

请生成一个实体页面，格式要求：
1. 完整的 YAML frontmatter
2. type: entity
3. 合理的 tags, keywords, scenes, related
4. related 中引用上面列出的相关页面（用 [[slug]] 格式）
5. 页面内容包含：简介、关键信息、相关页面

只输出 wiki 页面内容，不要额外解释。`

      try {
        const response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
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
insights: []
---

${content}`
        }

        fs.writeFileSync(filePath, content, 'utf-8')
        console.log(`  ✅ 已保存: 01-entities/${pascalSlug}.md`)
      } catch (err: any) {
        console.error(`  ❌ 生成 ${pascalSlug} 失败: ${err.message}`)
      }

      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    console.log('\n========================================')
    console.log('  实体页面生成完成')
    console.log('  请运行 npm run generate 更新站点配置')
    console.log('========================================')
  }
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
