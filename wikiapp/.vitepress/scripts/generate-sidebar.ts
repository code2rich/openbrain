import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import matter from 'gray-matter'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const WIKI_DIR = process.env.WIKI_DIR || path.resolve(__dirname, '../../../99-wiki')
const OUTPUT_DIR = path.resolve(__dirname, '../generated')

// All paths are prefixed with /wiki/ since content is symlinked as wiki/ → 99-wiki/
const CONTENT_PREFIX = '/wiki'

interface PageMeta {
  slug: string
  title: string
  description: string
  type: string
  created: string
  updated: string
  tags: string[]
  related: string[]
  dirName: string
  sources: string[]
}

interface ClusterDef {
  id: string
  label: string
  color: string
  cx: number
  cy: number
}

interface GraphNode {
  id: string
  label: string
  group: string
  cluster: string
  clusterLabel: string
  weight: number
  tags: string[]
  description: string
}

interface GraphData {
  nodes: GraphNode[]
  links: { source: string; target: string }[]
  clusters: ClusterDef[]
}

// ECharts 力导向图增强版数据结构
interface EChartsGraphNode {
  id: string
  label: string
  category: string
  weight: number         // used_in 引用次数（权重越大节点越大）
  description: string
  dirName: string
}

interface EChartsGraphEdge {
  source: string
  target: string
  weight: number         // 关系出现次数
}

interface EChartsGraphData {
  nodes: EChartsGraphNode[]
  edges: EChartsGraphEdge[]
  categories: { name: string; color: string }[]
}

const CATEGORIES = ['01-entities', '02-topics', '03-comparisons'] as const
const CATEGORY_LABELS: Record<string, string> = {
  '01-entities': '实体页面',
  '02-topics': '主题综述',
  '03-comparisons': '对比分析',
}

function parseFrontmatter(filePath: string): Record<string, any> {
  let content = fs.readFileSync(filePath, 'utf-8')
  // Quote the `related` field value to handle [[wiki-link]] syntax that conflicts with YAML
  // Note: use ' *' not '\s*' after colon — \s matches \n which breaks multi-line arrays
  content = content.replace(/^(\s*related: *)(.+)$/m, (match, prefix, value) => {
    if (value.startsWith('"') || value.startsWith("'")) return match
    return `${prefix}"${value}"`
  })
  const { data } = matter(content)
  return data
}

function parseRelated(related: string | string[] | undefined): string[] {
  if (!related) return []
  if (Array.isArray(related)) {
    return related.flatMap(r => parseRelated(r))
  }
  return related.split(',').map((r: string) => r.trim().replace(/^\[\[|\]\]$/g, ''))
}

// YAML parses date strings like 2026-04-13 into Date objects — force back to string
function toDateStr(val: any): string {
  if (!val) return ''
  if (val instanceof Date) return val.toISOString().slice(0, 10)
  return String(val).slice(0, 10)
}

function extractInlineWikiLinks(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const matches = content.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)
  return [...new Set([...matches].map(m => m[1]))]
}

function scanWiki(): PageMeta[] {
  const pages: PageMeta[] = []

  for (const dirName of CATEGORIES) {
    const dirPath = path.join(WIKI_DIR, dirName)
    if (!fs.existsSync(dirPath)) continue

    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'))
    for (const file of files) {
      const filePath = path.join(dirPath, file)
      let fm: Record<string, any>
      try {
        fm = parseFrontmatter(filePath)
      } catch (e) {
        console.warn(`⚠️ Skipping ${file}: ${(e as Error).message}`)
        continue
      }
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
        dirName,
        sources: Array.isArray(fm.sources) ? fm.sources : [],
      })
    }
  }

  return pages
}

function generateSidebar(pages: PageMeta[]) {
  const sidebar: Record<string, { text: string; items: { text: string; link: string }[] }> = {}

  for (const dirName of CATEGORIES) {
    const categoryPages = pages.filter(p => p.dirName === dirName)

    const items = categoryPages
      .sort((a, b) => a.title.localeCompare(b.title, 'zh'))
      .map(p => ({
        text: p.title,
        link: `${CONTENT_PREFIX}/${dirName}/${p.slug}`,
      }))

    sidebar[`${CONTENT_PREFIX}/${dirName}/`] = {
      text: CATEGORY_LABELS[dirName],
      items,
    }
  }

  return sidebar
}

function generateTagsIndex(pages: PageMeta[]) {
  const tagMap: Record<string, { slug: string; title: string; dirName: string }[]> = {}
  for (const page of pages) {
    for (const tag of page.tags) {
      if (!tagMap[tag]) tagMap[tag] = []
      tagMap[tag].push({ slug: page.slug, title: page.title, dirName: page.dirName })
    }
  }
  // Sort tags by frequency
  const sorted: typeof tagMap = {}
  for (const tag of Object.keys(tagMap).sort((a, b) => tagMap[b].length - tagMap[a].length)) {
    sorted[tag] = tagMap[tag]
  }
  return sorted
}

// ── Cluster computation ──────────────────────────────────────────

const CLUSTER_RULES: { id: string; label: string; color: string; match: (p: PageMeta) => boolean }[] = [
  {
    id: 'fund-advisory', label: '基金投顾', color: '#3b82f6',
    match: p => p.slug.startsWith('基金投顾-') || ['FundInvestmentAdvisory', 'Mot'].includes(p.slug),
  },
  {
    id: 'wealth-planning', label: '财富规划', color: '#22c55e',
    match: p => p.slug.startsWith('财富规划-') || ['WealthPlanning'].includes(p.slug),
  },
  {
    id: 'asset-platform', label: '资配平台', color: '#f59e0b',
    match: p => p.slug.startsWith('资配平台-') || ['WealthManagement', 'AssetAllocation', '恒生电子', 'Kyp', '产品管理'].includes(p.slug),
  },
  {
    id: 'ai-dev', label: 'AI 研发', color: '#8b5cf6',
    match: p => /^(ai-|claude-|agent-|mcp-|aigc-)/.test(p.slug) ||
      ['ClaudeCode', 'Mcp', 'Rag', 'Ai编程', 'anthropic-managed-agents', 'kyp-codereview',
        'document-skills', 'barra-risk-model'].includes(p.slug),
  },
  {
    id: 'knowledge-mgmt', label: '知识管理', color: '#ec4899',
    match: p => /^(llm-|wiki-|personal-|auto-|wechat-)/.test(p.slug) ||
      ['Obsidian', '知识管理', '双链', '自动化', 'andrej-karpathy', 'OpenClaw', 'mergetopus', 'data-lineage'].includes(p.slug),
  },
  {
    id: 'methodology', label: '方法论', color: '#6366f1',
    match: p => ['team-management', 'reading-methodology'].includes(p.slug),
  },
]

function computeCluster(page: PageMeta): { id: string; label: string } {
  for (const rule of CLUSTER_RULES) {
    if (rule.match(page)) return { id: rule.id, label: rule.label }
  }
  // Fallback: tag-based
  const tags = new Set(page.tags.map(t => t.toLowerCase()))
  if (tags.has('ai编程') || tags.has('claude-code')) return { id: 'ai-dev', label: 'AI 研发' }
  if (tags.has('基金投顾')) return { id: 'fund-advisory', label: '基金投顾' }
  if (tags.has('财富规划')) return { id: 'wealth-planning', label: '财富规划' }
  return { id: 'other', label: '其他' }
}

function computeClusterCenters(clusterIds: string[]): Map<string, { cx: number; cy: number }> {
  const unique = [...new Set(clusterIds)]
  const count = unique.length
  const RADIUS = 280
  const map = new Map<string, { cx: number; cy: number }>()
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2
    map.set(unique[i], { cx: RADIUS * Math.cos(angle), cy: RADIUS * Math.sin(angle) })
  }
  return map
}

function generateGraphData(pages: PageMeta[]): GraphData {
  const nodes: GraphNode[] = pages.map(p => {
    const cluster = computeCluster(p)
    return {
      id: p.slug,
      label: p.title,
      group: p.dirName,
      cluster: cluster.id,
      clusterLabel: cluster.label,
      weight: 0,
      tags: p.tags,
      description: p.description,
    }
  })

  const linkSet = new Set<string>()
  const links: GraphData['links'] = []
  const weightMap: Record<string, number> = {}

  for (const page of pages) {
    const allTargets = new Set([...page.related])

    // inline wiki-links
    const filePath = path.join(WIKI_DIR, page.dirName, `${page.slug}.md`)
    if (fs.existsSync(filePath)) {
      for (const target of extractInlineWikiLinks(filePath)) {
        allTargets.add(target)
      }
    }

    for (const target of allTargets) {
      const key = `${page.slug}->${target}`
      if (!linkSet.has(key) && pages.some(p => p.slug === target)) {
        linkSet.add(key)
        links.push({ source: page.slug, target })
        weightMap[page.slug] = (weightMap[page.slug] || 0) + 1
        weightMap[target] = (weightMap[target] || 0) + 1
      }
    }
  }

  // Apply weights
  for (const node of nodes) {
    node.weight = weightMap[node.id] || 1
  }

  // Build clusters array
  const clusterIds = [...new Set(nodes.map(n => n.cluster))]
  const centers = computeClusterCenters(clusterIds)
  const clusterMap = new Map(CLUSTER_RULES.map(r => [r.id, r]))
  const clusters: ClusterDef[] = clusterIds.map(id => {
    const rule = clusterMap.get(id) || { id, label: '其他', color: '#94a3b8' }
    const center = centers.get(id) || { cx: 0, cy: 0 }
    return { id, label: rule.label, color: rule.color, cx: center.cx, cy: center.cy }
  })

  return { nodes, links, clusters }
}

// 增强版图谱数据：带权重、分类颜色，支持 ECharts 力导向图直接使用
const CATEGORY_COLORS: Record<string, string> = {
  '01-entities': '#5B8FF9',    // 蓝 — 实体页面
  '02-topics': '#5AD8A6',      // 青绿 — 主题综述
  '03-comparisons': '#F6BD16', // 琥珀 — 对比分析
}

function generateEChartsGraphData(pages: PageMeta[], backlinks: ReturnType<typeof generateBacklinks>): EChartsGraphData {
  const categories = Object.entries(CATEGORY_LABELS).map(([key, label]) => ({
    name: label,
    color: CATEGORY_COLORS[key],
  }))

  // 计算节点权重：used_in 引用次数
  const usedInCount: Record<string, number> = {}
  for (const page of pages) {
    const fm = parseFrontmatter(path.join(WIKI_DIR, page.dirName, `${page.slug}.md`))
    const usedIn: any[] = Array.isArray(fm.used_in) ? fm.used_in : []
    usedInCount[page.slug] = usedIn.length
  }

  const nodes: EChartsGraphNode[] = pages.map(p => {
    const fm = parseFrontmatter(path.join(WIKI_DIR, p.dirName, `${p.slug}.md`))
    return {
      id: p.slug,
      label: p.title,
      category: CATEGORY_LABELS[p.dirName] || p.dirName,
      weight: Math.max(usedInCount[p.slug] || 0, 1), // 最少为 1，保证最小可见
      description: fm.description || '',
      dirName: p.dirName,
    }
  })

  // 计算边权重（source->target 关系出现次数）
  const edgeWeight: Record<string, number> = {}
  for (const page of pages) {
    const allTargets = new Set([...page.related])
    const filePath = path.join(WIKI_DIR, page.dirName, `${page.slug}.md`)
    if (fs.existsSync(filePath)) {
      for (const target of extractInlineWikiLinks(filePath)) {
        allTargets.add(target)
      }
    }
    for (const target of allTargets) {
      if (pages.some(p => p.slug === target) && target !== page.slug) {
        const key = `${page.slug}->${target}`
        edgeWeight[key] = (edgeWeight[key] || 0) + 1
      }
    }
  }

  const edges: EChartsGraphEdge[] = Object.entries(edgeWeight).map(([key, weight]) => {
    const [source, target] = key.split('->')
    return { source, target, weight }
  })

  return { nodes, edges, categories }
}

function generateSlugMap(pages: PageMeta[]) {
  const map: Record<string, string> = {}
  for (const page of pages) {
    map[page.slug] = `${CONTENT_PREFIX}/${page.dirName}/${page.slug}.html`
  }
  return map
}

function generateBacklinks(pages: PageMeta[]) {
  const backlinks: Record<string, { slug: string; title: string; dirName: string }[]> = {}
  // Initialize
  for (const page of pages) {
    backlinks[page.slug] = []
  }
  // Build reverse map
  for (const page of pages) {
    const allTargets = new Set([...page.related])
    const filePath = path.join(WIKI_DIR, page.dirName, `${page.slug}.md`)
    if (fs.existsSync(filePath)) {
      for (const target of extractInlineWikiLinks(filePath)) {
        allTargets.add(target)
      }
    }
    for (const target of allTargets) {
      if (backlinks[target] && target !== page.slug) {
        backlinks[target].push({ slug: page.slug, title: page.title, dirName: page.dirName })
      }
    }
  }
  // Deduplicate
  for (const key of Object.keys(backlinks)) {
    const seen = new Set<string>()
    backlinks[key] = backlinks[key].filter(b => {
      if (seen.has(b.slug)) return false
      seen.add(b.slug)
      return true
    })
  }
  return backlinks
}

function generatePrevNext(pages: PageMeta[]) {
  const prevNext: Record<string, { prev?: { slug: string; title: string }; next?: { slug: string; title: string } }> = {}
  for (const dirName of CATEGORIES) {
    const categoryPages = pages
      .filter(p => p.dirName === dirName)
      .sort((a, b) => a.title.localeCompare(b.title, 'zh'))
    for (let i = 0; i < categoryPages.length; i++) {
      const entry: typeof prevNext[string] = {}
      if (i > 0) entry.prev = { slug: categoryPages[i - 1].slug, title: categoryPages[i - 1].title }
      if (i < categoryPages.length - 1) entry.next = { slug: categoryPages[i + 1].slug, title: categoryPages[i + 1].title }
      prevNext[categoryPages[i].slug] = entry
    }
  }
  return prevNext
}

function main() {
  console.log(`Scanning wiki at: ${WIKI_DIR}`)

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  // Step 1: Preprocess wiki files directly into wiki/ (fix YAML frontmatter with [[wiki-links]])
  const wikiDir = path.resolve(__dirname, '../../wiki')
  console.log('Preprocessing wiki content...')
  fs.rmSync(wikiDir, { recursive: true, force: true })
  fs.mkdirSync(wikiDir, { recursive: true })

  for (const dirName of CATEGORIES) {
    const srcDir = path.join(WIKI_DIR, dirName)
    if (!fs.existsSync(srcDir)) continue
    const destDir = path.join(wikiDir, dirName)
    fs.mkdirSync(destDir, { recursive: true })

    for (const file of fs.readdirSync(srcDir).filter(f => f.endsWith('.md'))) {
      try {
        let content = fs.readFileSync(path.join(srcDir, file), 'utf-8')
        // Quote the `related` field to avoid YAML parsing errors with [[...]]
        content = content.replace(/^(\s*related: *)(.+)$/m, (_match, prefix: string, value: string) => {
          if (value.startsWith('"') || value.startsWith("'")) return _match
          return `${prefix}"${value}"`
        })
        // Validate frontmatter is parseable
        matter(content)
        fs.writeFileSync(path.join(destDir, file), content)
      } catch (e) {
        console.warn(`⚠️ Skipping ${file} (invalid YAML): ${(e as Error).message}`)
      }
    }

    // Generate category index page
    const indexContent = `---\nlayout: page\ntitle: ${CATEGORY_LABELS[dirName]}\n---\n\n<CategoryList />\n`
    fs.writeFileSync(path.join(destDir, 'index.md'), indexContent)
  }
  console.log(`Preprocessed files written to ${wikiDir}`)

  // Step 2: Scan and generate data (from original wiki for metadata)
  const pages = scanWiki()
  console.log(`Found ${pages.length} pages`)

  const sidebar = generateSidebar(pages)
  const tagsIndex = generateTagsIndex(pages)
  const graphData = generateGraphData(pages)
  const slugMap = generateSlugMap(pages)
  const backlinks = generateBacklinks(pages)
  const prevNext = generatePrevNext(pages)
  const echartsGraphData = generateEChartsGraphData(pages, backlinks)

  const write = (name: string, varName: string, data: any) => {
    fs.writeFileSync(
      path.join(OUTPUT_DIR, name),
      `// Auto-generated — do not edit manually\nexport default ${JSON.stringify(data, null, 2)}\n`
    )
  }

  write('sidebar.ts', 'sidebar', sidebar)
  write('pages.ts', 'pages', pages)
  write('sources.ts', 'sourcesMap', Object.fromEntries(
    pages.filter(p => p.sources.length > 0).map(p => [p.slug, p.sources])
  ))
  write('tags.ts', 'tagsIndex', tagsIndex)
  write('graph-data.ts', 'graphData', graphData)
  write('slug-map.ts', 'slugMap', slugMap)
  write('backlinks.ts', 'backlinks', backlinks)
  write('prev-next.ts', 'prevNext', prevNext)
  write('graph-data-echarts.ts', 'graphData', echartsGraphData)

  // ======== Parse log.md ========
  interface LogSection {
    type: string
    label: string
    items: string[]
  }

  interface LogEntry {
    date: string
    sections: LogSection[]
  }

  const logPath = path.join(WIKI_DIR, 'log.md')
  let logEntries: LogEntry[] = []

  if (fs.existsSync(logPath)) {
    const logContent = fs.readFileSync(logPath, 'utf-8')
    const lines = logContent.split('\n')

    let currentDate = ''
    let currentSections: LogSection[] = []
    let currentSection: LogSection | null = null

    const typeMap: Record<string, string> = {
      '摄入': 'ingest',
      '梦境': 'dream',
      '查询': 'query',
      '归档': 'filing',
      '维护': 'lint',
      '初始化': 'init',
    }

    const flushSection = () => {
      if (currentSection && currentSection.items.length > 0) {
        currentSections.push(currentSection)
      }
      currentSection = null
    }

    const flushDate = () => {
      flushSection()
      if (currentDate && currentSections.length > 0) {
        logEntries.push({ date: currentDate, sections: currentSections })
      }
      currentSections = []
    }

    for (const line of lines) {
      // Date header: ## YYYY-MM-DD
      const dateMatch = line.match(/^## (\d{4}-\d{2}-\d{2})/)
      if (dateMatch) {
        flushDate()
        currentDate = dateMatch[1]
        continue
      }

      // Section header: ### 摄入 (Ingest) / ### 归档 (Filing) — ...
      const sectionMatch = line.match(/^###\s+(.+)/)
      if (sectionMatch && currentDate) {
        flushSection()
        const label = sectionMatch[1].trim()
        const type = Object.entries(typeMap).find(([k]) => label.includes(k))?.[1] || 'other'
        currentSection = { type, label, items: [] }
        continue
      }

      // Item line: - [tag] content
      if (currentSection && line.match(/^\s*-\s+\[/)) {
        currentSection.items.push(line.replace(/^\s*-\s+/, '').trim())
      }
      // Description line (non-empty, non-header)
      else if (currentSection && line.trim() && !line.startsWith('#') && !line.startsWith('---') && !line.startsWith('```')) {
        // Only add substantive lines (not format descriptions at top)
        if (currentDate) {
          currentSection.items.push(line.trim())
        }
      }
    }
    flushDate()

    // Sort by date descending
    logEntries.sort((a, b) => b.date.localeCompare(a.date))
  }

  write('log-data.ts', 'logData', logEntries)
  console.log(`  log: ${logEntries.length} dates`)

  console.log('Generated:')
  console.log(`  sidebar: ${Object.values(sidebar).reduce((n, s) => n + s.items.length, 0)} items`)
  console.log(`  tags: ${Object.keys(tagsIndex).length} unique tags`)
  console.log(`  graph: ${graphData.nodes.length} nodes, ${graphData.links.length} links`)
  console.log(`  graph-echarts: ${echartsGraphData.nodes.length} nodes, ${echartsGraphData.edges.length} edges`)
}

main()
