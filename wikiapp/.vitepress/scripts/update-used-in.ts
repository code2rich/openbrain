/**
 * update-used-in.ts — 知识消耗追踪
 *
 * 扫描 100-output/ 目录下的输出文件，自动识别其中引用的 wiki 页面，
 * 并将引用记录追加到对应 wiki 页面的 used_in frontmatter 字段。
 *
 * 运行方式：
 *   npm run used-in -- --dry-run   # 预览，不实际修改
 *   npm run used-in                # 执行修改
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import matter from 'gray-matter'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ROOT_DIR = path.resolve(__dirname, '../../..')
const OUTPUT_DIR = path.join(ROOT_DIR, '100-output')
const WIKI_DIR = path.join(ROOT_DIR, '99-wiki')
const CATEGORIES = ['01-entities', '02-topics', '03-comparisons'] as const

interface UsedInEntry {
  output: string
  date: string
  summary: string
}

// 从输出文件名提取标题和日期
function parseOutputMeta(filename: string): { title: string; date: string } {
  // 格式：article-标题-YYYY.MM.DD.md 或 report-标题-YYYY.MM.DD.md
  const match = filename.match(/^(?:article|report|note|memo)-(.+)-(\d{4}\.\d{2}\.\d{2})\.md$/i)
  if (match) {
    return { title: match[1], date: match[2].replace(/\./g, '-') }
  }
  return { title: filename.replace(/\.md$/, ''), date: new Date().toISOString().slice(0, 10) }
}

// 从正文提取所有 wiki 引用 [[slug]] 或 [[slug|display]]
function extractWikiLinks(content: string): string[] {
  const matches = content.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)
  return [...new Set([...matches].map(m => m[1]))]
}

// 获取所有 wiki slug
function getWikiSlugs(): Set<string> {
  const slugs = new Set<string>()
  for (const dirName of CATEGORIES) {
    const dirPath = path.join(WIKI_DIR, dirName)
    if (!fs.existsSync(dirPath)) continue
    for (const file of fs.readdirSync(dirPath).filter(f => f.endsWith('.md'))) {
      slugs.add(file.replace(/\.md$/, ''))
    }
  }
  return slugs
}

function readFrontmatter(filePath: string): { data: Record<string, any>; content: string } {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const result = matter(raw)
  return { data: result.data, content: result.content }
}

function writeFrontmatter(filePath: string, data: Record<string, any>, content: string) {
  const fm = Object.entries(data)
    .map(([k, v]) => {
      const indent = '  '
      if (Array.isArray(v)) {
        if (v.length === 0) return `${indent}${k}: []`
        const items = v.map(item => {
          if (typeof item === 'object') {
            return `\n${indent}${indent}- date: ${item.date}\n${indent}${indent}  summary: ${item.summary}`
          }
          return `${indent}${indent}- "${item}"`
        }).join('\n')
        return `${indent}${k}:\n${items}`
      }
      return `${indent}${k}: ${typeof v === 'string' ? `"${v}"` : v}`
    }).join('\n')

  const fileContent = `---\n${fm}\n---\n\n${content}`
  fs.writeFileSync(filePath, fileContent, 'utf-8')
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  console.log(dryRun ? '🔍 [Dry Run] 预览模式，不会实际修改文件\n' : '✏️  执行模式，将修改文件\n')

  if (!fs.existsSync(OUTPUT_DIR)) {
    console.log('⚠️  100-output/ 目录不存在，跳过')
    return
  }

  const wikiSlugs = getWikiSlugs()
  console.log(`📚 共 ${wikiSlugs.size} 个 wiki 页面\n`)

  // 收集所有引用：outputFile → [slug]
  const refs = new Map<string, string[]>()
  const outputFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.md'))

  for (const file of outputFiles) {
    const filePath = path.join(OUTPUT_DIR, file)
    const content = fs.readFileSync(filePath, 'utf-8')
    const links = extractWikiLinks(content).filter(slug => wikiSlugs.has(slug))
    if (links.length > 0) {
      refs.set(file, links)
    }
  }

  console.log(`📄 扫描 ${outputFiles.length} 个输出文件，发现 ${refs.size} 个有 wiki 引用\n`)

  if (refs.size === 0) {
    console.log('✅ 没有发现任何 wiki 引用')
    return
  }

  // 统计每个 wiki 页面被多少输出引用
  const slugRefCount = new Map<string, { count: number; outputs: UsedInEntry[] }>()
  for (const [outputFile, slugs] of refs) {
    const { title, date } = parseOutputMeta(outputFile)
    for (const slug of slugs) {
      if (!slugRefCount.has(slug)) slugRefCount.set(slug, { count: 0, outputs: [] })
      const entry: UsedInEntry = { output: title, date, summary: '' }
      slugRefCount.get(slug)!.outputs.push(entry)
      slugRefCount.get(slug)!.count++
    }
  }

  // 更新每个 wiki 页面的 used_in
  let modified = 0
  for (const [slug, { outputs }] of slugRefCount) {
    // 找到文件路径
    let filePath: string | null = null
    for (const dirName of CATEGORIES) {
      const p = path.join(WIKI_DIR, dirName, `${slug}.md`)
      if (fs.existsSync(p)) { filePath = p; break }
    }
    if (!filePath) continue

    const { data, content } = readFrontmatter(filePath)
    const usedIn: UsedInEntry[] = Array.isArray(data.used_in) ? data.used_in : []

    // 追加新的引用（去重：按 output+date 判断）
    let added = 0
    for (const entry of outputs) {
      const exists = usedIn.some(u => u.output === entry.output && u.date === entry.date)
      if (!exists) {
        usedIn.push(entry)
        added++
      }
    }

    if (added > 0) {
      data.used_in = usedIn
      if (dryRun) {
        console.log(`  📝 [Dry Run] 将更新: ${slug} (+${added}条引用)`)
      } else {
        writeFrontmatter(filePath, data, content)
        console.log(`  ✅ 更新: ${slug} (+${added}条引用)`)
      }
      modified++
    }
  }

  console.log(`\n${dryRun ? '🔍 [Dry Run] ' : '✅ '}完成，共影响 ${modified} 个 wiki 页面`)
  if (dryRun) {
    console.log('\n💡 去掉 --dry-run 参数以实际执行修改')
  }
}

main().catch(console.error)
