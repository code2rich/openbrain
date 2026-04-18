/**
 * dream-runner.ts — 梦境引擎
 *
 * 自主后台进程，分析并改进知识库。类似人脑睡眠时的记忆巩固。
 * 运行在 Docker API 容器内，通过 Claude CLI 执行 5 个阶段。
 *
 * 用法：
 *   npx tsx dream-runner.ts --manual   # 手动触发
 *   npx tsx dream-runner.ts --cron     # 定时触发（仅 2:00-5:00 执行）
 */

import { readdir, stat, readFile, writeFile, mkdir, cp, rm } from 'fs/promises'
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'fs'
import { join, extname } from 'path'
import { spawn } from 'child_process'
import { execSync } from 'child_process'

// === 配置 ===

const WIKI_DIR = process.env.WIKI_DIR || '/wiki-content'
const RAW_DIR = process.env.RAW_DIR || '/raw-content'
const DATA_DIR = process.env.DATA_DIR || join(import.meta.dirname ?? '.', '../../data')
const DREAM_DATA_DIR = join(DATA_DIR, 'dream')
const LOCK_FILE = '/tmp/dream.lock'
const SNAPSHOT_DIR = '/tmp/dream-snapshot'
const DREAM_LOG_PATH = join(WIKI_DIR, 'dream-log.md')

const DREAM_TIMEOUT = parseInt(process.env.DREAM_TIMEOUT || '1800000')    // 30 分钟
const CLAUDE_TIMEOUT = parseInt(process.env.CLAUDE_TIMEOUT || '600000')   // 10 分钟
const PHASE_DELAY = parseInt(process.env.DREAM_PHASE_DELAY || '30000')    // 阶段间 30 秒

const MAX_EDITS = 20

// === 梦境类型 ===

interface DreamTypeInfo {
  id: string
  name: string
  funcName: string
  funcRef: string
  phases: number[]
  description: string
}

const DREAM_TYPE_MAP: { hourRange: [number, number]; type: DreamTypeInfo }[] = [
  { hourRange: [0, 5],   type: { id: 'deep-dream',      name: '深度梦', funcName: '全梦', funcRef: '正梦', phases: [1,2,3,4,5], description: '深夜全流程' }},
  { hourRange: [5, 9],   type: { id: 'dawn-dream',      name: '晨曦梦', funcName: '正梦', funcRef: '正梦', phases: [1,5],       description: '清晨健康检查' }},
  { hourRange: [9, 12],  type: { id: 'daydream',        name: '白日梦', funcName: '正梦', funcRef: '正梦', phases: [1,5],       description: '上午快速诊断' }},
  { hourRange: [12, 14], type: { id: 'afternoon-dream', name: '午后梦', funcName: '思梦', funcRef: '思梦', phases: [1,2,5],     description: '午后关联发现' }},
  { hourRange: [14, 18], type: { id: 'sunset-dream',    name: '夕照梦', funcName: '喜梦', funcRef: '喜梦', phases: [1,4,5],     description: '下午知识发现' }},
  { hourRange: [18, 22], type: { id: 'night-dream',     name: '夜梦',   funcName: '寤梦', funcRef: '寤梦', phases: [1,3,5],     description: '晚间修复整理' }},
  { hourRange: [22, 24], type: { id: 'midnight-dream',  name: '幽梦',   funcName: '全梦', funcRef: '正梦', phases: [1,2,3,4,5], description: '深夜全流程' }},
]

function getDreamType(hour?: number): DreamTypeInfo {
  const h = hour ?? new Date().getHours()
  for (const entry of DREAM_TYPE_MAP) {
    if (h >= entry.hourRange[0] && h < entry.hourRange[1]) return entry.type
  }
  return DREAM_TYPE_MAP[0].type
}

// === 状态管理 ===

interface DreamState {
  id: string
  status: 'running' | 'completed' | 'failed' | 'rolled_back'
  startedAt: string
  completedAt?: string
  phases: {
    name: string
    status: 'pending' | 'running' | 'completed' | 'skipped'
    startedAt?: string
    completedAt?: string
    summary?: string
  }[]
  patchFile?: string
  editCount: number
  error?: string
  dreamType?: { id: string; name: string; funcName: string; funcRef: string }
}

let dreamState: DreamState
let currentDreamType: DreamTypeInfo

function loadDreamConfig(): { apiKey?: string; baseURL?: string; model?: string } {
  try {
    const configPath = join(DATA_DIR, 'config.json')
    if (existsSync(configPath)) return JSON.parse(readFileSync(configPath, 'utf-8'))
  } catch { /* ignore */ }
  return {}
}

function saveState() {
  mkdirSync(DREAM_DATA_DIR, { recursive: true })
  writeFileSync(join(DREAM_DATA_DIR, 'status.json'), JSON.stringify(dreamState, null, 2), 'utf-8')
}

// === 锁文件 ===

function acquireLock(): boolean {
  if (existsSync(LOCK_FILE)) {
    const lockContent = readFileSync(LOCK_FILE, 'utf-8')
    const lockData = JSON.parse(lockContent)
    // 检查是否是过期锁（超过 DREAM_TIMEOUT）
    const elapsed = Date.now() - new Date(lockData.startedAt).getTime()
    if (elapsed < DREAM_TIMEOUT) return false
    // 过期锁，清理
    try { execSync(`rm -f ${LOCK_FILE}`) } catch { /* ignore */ }
  }
  writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }), 'utf-8')
  return true
}

function releaseLock() {
  try { execSync(`rm -f ${LOCK_FILE}`) } catch { /* ignore */ }
}

// === 快照与 Diff ===

async function createSnapshot(): Promise<void> {
  if (existsSync(SNAPSHOT_DIR)) {
    await rm(SNAPSHOT_DIR, { recursive: true })
  }
  await cp(WIKI_DIR, SNAPSHOT_DIR, { recursive: true })
}

async function generateDiff(): Promise<string> {
  try {
    const diff = execSync(
      `diff -ru --exclude='dream-log.md' --exclude='.raw-coverage' ${SNAPSHOT_DIR} ${WIKI_DIR} 2>/dev/null || true`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    )
    return diff
  } catch (err: any) {
    return `[diff 生成失败: ${err.message}]`
  }
}

async function rollback(): Promise<void> {
  if (!existsSync(SNAPSHOT_DIR)) throw new Error('快照不存在，无法回滚')
  await cp(SNAPSHOT_DIR, WIKI_DIR, { recursive: true })
}

async function savePatch(diff: string): Promise<string> {
  const today = new Date().toISOString().split('T')[0]
  const patchFile = join(DREAM_DATA_DIR, `${today}.patch`)
  mkdirSync(DREAM_DATA_DIR, { recursive: true })
  await writeFile(patchFile, diff, 'utf-8')
  return patchFile
}

// === Claude CLI 调用 ===

// 检测 claude 命令：优先用原生二进制，不可用时回退到 node wrapper
function getClaudeCommand(): { cmd: string; args: string[] } {
  const wrapperPath = '/usr/local/lib/node_modules/@anthropic-ai/claude-code/cli-wrapper.cjs'
  if (existsSync(wrapperPath)) {
    return { cmd: 'node', args: [wrapperPath] }
  }
  return { cmd: 'claude', args: [] }
}

interface ClaudeOptions {
  prompt: string
  cwd?: string
  tools?: string
  onProgress?: (msg: string) => void
}

function spawnClaude(options: ClaudeOptions): Promise<string> {
  const config = loadDreamConfig()
  const spawnEnv: Record<string, string> = { ...process.env as Record<string, string> }
  if (config.apiKey) spawnEnv.ANTHROPIC_API_KEY = config.apiKey
  if (config.baseURL) spawnEnv.ANTHROPIC_BASE_URL = config.baseURL

  const claudeArgs = ['--print', '--output-format', 'text']
  if (config.model) claudeArgs.push('--model', config.model)
  claudeArgs.push('--dangerously-skip-permissions')
  claudeArgs.push('--add-dir', '/app')
  claudeArgs.push('--add-dir', WIKI_DIR)
  claudeArgs.push('--add-dir', RAW_DIR)
  if (options.tools) {
    claudeArgs.push('--allowedTools', options.tools)
  }

  const { cmd, args: cmdPrefix } = getClaudeCommand()

  return new Promise<string>((resolve, reject) => {
    const child = spawn(cmd, [...cmdPrefix, ...claudeArgs], {
      cwd: options.cwd || '/app',
      env: { ...spawnEnv, HOME: process.env.HOME || '/home/node' },
      timeout: CLAUDE_TIMEOUT,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    child.stdin.write(options.prompt)
    child.stdin.end()

    child.stdout.on('data', (data) => {
      const text = data.toString()
      stdout += text
      if (options.onProgress) {
        const lines = text.split('\n').filter((l: string) => l.trim())
        for (const line of lines) {
          options.onProgress!(line.slice(0, 200))
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
      reject(err)
    })
  })
}

// === 阶段 Prompt 构建 ===

const COMMON_HEADER = `你是知识库的「梦境守护者」。现在是人类休息的时候，你进入知识库进行潜意识整理。

知识库路径：${WIKI_DIR}
Raw 资料路径：${RAW_DIR}

知识库规则（遵守 CLAUDE.md）：
- 00-raw/ 只读，永不修改
- 99-wiki/ 是你负责的领域
- 每个页面必须符合 frontmatter 规范
- 如无必要，勿增实体

`

function phase1_diagnosis_Prompt(): string {
  return COMMON_HEADER + `## 阶段 1：诊断

请读取以下文件，全面诊断知识库健康状况：

1. ${WIKI_DIR}/index.md — 页面目录
2. ${WIKI_DIR}/.raw-coverage — raw 文件覆盖率
3. ${WIKI_DIR}/ 下所有 .md 页面（01-entities/、02-topics/、03-comparisons/）

检查项目：
1. 孤立页面（无双链、无 used_in、无 related）
2. 时效性（stale_score = (today - updated) / review_cycle >= 1.0）
3. 缺少 scenes 的页面
4. 缺少 insights 的页面
5. 知识未使用（无 used_in）
6. 跨页面矛盾：同一概念在不同页面描述不一致
7. 过时知识：source raw 有更新版本但页面未反映
8. 知识空白：.raw-coverage 中有 pending 状态的 raw 文件

请将完整的诊断报告写入 ${WIKI_DIR}/dream-log.md，格式如下：

---
title: 梦境日志
type: log
created: ${new Date().toISOString().split('T')[0]}
---

# ${currentDreamType?.name || '梦境'} · ${currentDreamType?.funcRef || ''} — ${new Date().toISOString().split('T')[0]}

> ${currentDreamType?.description || ''} · ${new Date().toISOString().slice(11, 16)} 开始

## 阶段 1：诊断

### 检查结果

[在这里详细列出每项检查的发现]

### 问题汇总

| 问题类型 | 数量 | 严重程度 |
|---------|------|---------|
| ...     | ...  | ...     |

### 诊断摘要

[一段话总结当前知识库健康状况]`
}

function phase2_synthesis_Prompt(): string {
  return COMMON_HEADER + `## 阶段 2：综合

请读取 ${WIKI_DIR}/dream-log.md 中阶段 1 的诊断结果，然后：

1. 对比所有页面的 tags 和 keywords，找出有交集但无双链的页面对（语义相关但未连接）
2. 找出内容高度重叠的页面（合并候选）
3. 找出内容过长、可能需要拆分的页面

将分析结果追加到 ${WIKI_DIR}/dream-log.md 的「阶段 2：综合」章节。

格式：

## 阶段 2：综合

### 隐藏连接

| 页面 A | 页面 B | 共同主题 | 建议连接方式 |
|--------|--------|---------|------------|
| ...    | ...    | ...     | ...        |

### 合并候选

| 页面 | 原因 |
|------|------|
| ...  | ...  |

### 拆分候选

| 页面 | 建议拆分为 |
|------|-----------|
| ...  | ...       |`
}

function phase3_fix_Prompt(): string {
  return COMMON_HEADER + `## 阶段 3：修复

请读取 ${WIKI_DIR}/dream-log.md 中已有的分析结果，执行安全的自动修复。

**允许的操作（仅限以下）：**
1. 添加缺失的双链 [[slug]]（仅阶段 2 中高置信度的连接建议）
2. 更新 frontmatter 的 updated 日期（仅当时效性检查标记为 stale 但内容仍有效的页面）
3. 为缺少 scenes 的页面推断并添加 scenes（从页面内容推断使用场景）
4. 修复 index.md 中缺失的页面条目
5. 修复 log.md 中缺失的记录

**严格禁止：**
- 不删除任何页面
- 不修改 00-raw/ 中的任何内容
- 不修改 insights 字段（这是个人洞察，人类专属）
- 不改变页面的语义内容
- 不创建新页面
- 最多执行 ${MAX_EDITS} 次编辑

**对每个修改**，在 dream-log.md 的「阶段 3：修复」章节记录：

## 阶段 3：修复

### 修改记录

| # | 文件 | 修改内容 | 原因 |
|---|------|---------|------|
| 1 | ...  | ...     | ...  |

### 修改统计

- 总修改次数：N
- 涉及文件数：N`
}

function phase4_discovery_Prompt(): string {
  return COMMON_HEADER + `## 阶段 4：发现

请读取 ${WIKI_DIR}/.raw-coverage，分析知识覆盖率：

1. 找出 status 为 pending 的 raw 文件（有素材但未提炼）
2. 找出同一主题下积累了 3+ 篇 raw 但缺少对应 wiki 页面的领域
3. 对比 index.md 中的「知识空白」表，看是否有素材可以填补
4. 交叉引用已有页面的 keywords，发现新的主题聚类

将分析结果追加到 ${WIKI_DIR}/dream-log.md 的「阶段 4：发现」章节。

格式：

## 阶段 4：发现

### 待处理素材

| Raw 文件 | 主题 | 建议页面类型 |
|----------|------|------------|
| ...      | ...  | ...        |

### 知识空白分析

| 空白领域 | 可用素材数 | 建议操作 |
|----------|-----------|---------|
| ...      | ...       | ...     |

### 新主题发现

| 潜在主题 | 来源 | 优先级 |
|----------|------|--------|
| ...      | ...  | ...    |`
}

function phase5_finalize_Prompt(): string {
  return COMMON_HEADER + `## 阶段 5：记录

请读取 ${WIKI_DIR}/dream-log.md，完成最终整理：

1. 在 dream-log.md 顶部添加一个「梦境摘要」section：
   - 梦境开始/结束时间
   - 各阶段执行状态
   - 诊断发现的问题数
   - 实际修复的数量
   - 需要人工关注的事项列表

2. 更新 ${WIKI_DIR}/log.md，在当天日期下追加：

### 梦境 (Dream)
- [dream·${currentDreamType?.name || '梦境'}] YYYY-MM-DD HH:MM — ${currentDreamType?.funcRef || ''}（${currentDreamType?.funcName || ''}），诊断 N 个问题，修复 M 个，K 项待人工处理

只做以上两件事，不要修改其他文件。`
}

// === 阶段执行器 ===

interface PhaseDef {
  name: string
  prompt: () => string
  tools: string
}

const PHASES: PhaseDef[] = [
  { name: '诊断', prompt: phase1_diagnosis_Prompt, tools: 'Read Glob Grep' },
  { name: '综合', prompt: phase2_synthesis_Prompt, tools: 'Read Glob Grep' },
  { name: '修复', prompt: phase3_fix_Prompt, tools: 'Read Edit Write Glob Grep' },
  { name: '发现', prompt: phase4_discovery_Prompt, tools: 'Read Glob Grep' },
  { name: '记录', prompt: phase5_finalize_Prompt, tools: 'Read Edit Write' },
]

async function runPhase(
  phaseIdx: number,
  onProgress: (msg: string) => void
): Promise<string> {
  const phase = PHASES[phaseIdx]
  const statePhase = dreamState.phases[phaseIdx]

  statePhase.status = 'running'
  statePhase.startedAt = new Date().toISOString()
  saveState()

  onProgress(`\n🌙 阶段 ${phaseIdx + 1}/${PHASES.length}：${phase.name}`)

  try {
    const result = await spawnClaude({
      prompt: phase.prompt(),
      tools: phase.tools,
      onProgress: (msg) => onProgress(`  ${msg}`),
    })

    statePhase.status = 'completed'
    statePhase.completedAt = new Date().toISOString()
    statePhase.summary = result.slice(0, 500).trim()
    saveState()

    onProgress(`  ✅ 阶段 ${phaseIdx + 1} 完成`)
    return result
  } catch (err: any) {
    statePhase.status = 'failed'
    statePhase.completedAt = new Date().toISOString()
    statePhase.summary = err.message
    saveState()
    throw err
  }
}

// === 主流程 ===

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function runDream(
  onProgress?: (msg: string) => void
): Promise<DreamState> {
  const progress = onProgress || ((msg: string) => console.log(msg))

  // 检查锁
  if (!acquireLock()) {
    throw new Error('另一个梦境正在运行')
  }

  // 确定梦境类型
  currentDreamType = getDreamType()

  // 初始化状态
  dreamState = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    status: 'running',
    startedAt: new Date().toISOString(),
    phases: PHASES.map(p => ({
      name: p.name,
      status: 'pending' as const,
    })),
    editCount: 0,
    dreamType: {
      id: currentDreamType.id,
      name: currentDreamType.name,
      funcName: currentDreamType.funcName,
      funcRef: currentDreamType.funcRef,
    },
  }
  saveState()

  // 总超时定时器
  const timeoutId = setTimeout(() => {
    progress('⏰ 梦境超时，正在优雅停止...')
    releaseLock()
    process.exit(1)
  }, DREAM_TIMEOUT)

  try {
    progress(`🌙 ${currentDreamType.name} · ${currentDreamType.funcRef}（${currentDreamType.description}）`)
    progress(`   ID: ${dreamState.id}`)

    // Step 1: 创建快照
    progress('📸 创建知识库快照...')
    await createSnapshot()
    progress('  ✅ 快照创建完成')

    // Step 2: 按梦境类型执行阶段
    const activePhases = currentDreamType.phases
    for (let i = 0; i < PHASES.length; i++) {
      const phaseNum = i + 1

      // 跳过当前梦境类型不需要的阶段
      if (!activePhases.includes(phaseNum)) {
        dreamState.phases[i].status = 'skipped'
        saveState()
        progress(`  ⏭️ 阶段 ${phaseNum}：${PHASES[i].name}（${currentDreamType.name}跳过）`)
        continue
      }

      // 阶段间延迟
      if (i > 0) {
        progress(`⏳ 阶段间休息 ${PHASE_DELAY / 1000} 秒...`)
        await sleep(PHASE_DELAY)
      }

      await runPhase(i, progress)

      // 阶段 3 完成后统计编辑次数
      if (i === 2) {
        const diff = await generateDiff()
        const editLines = diff.split('\n').filter(l => l.startsWith('<') || l.startsWith('>')).length
        dreamState.editCount = Math.floor(editLines / 2)
        progress(`  📊 估计编辑次数: ${dreamState.editCount}`)
      }
    }

    // Step 3: 生成 diff
    progress('\n📊 生成变更差异...')
    const diff = await generateDiff()
    const patchFile = await savePatch(diff)
    dreamState.patchFile = patchFile
    dreamState.status = 'completed'
    dreamState.completedAt = new Date().toISOString()

    const diffLines = diff.split('\n').filter(l => l.startsWith('+') || l.startsWith('-')).length
    progress(`  ✅ diff 已保存 (${diffLines} 行变更)`)

    saveState()
    progress(`\n🌙 ${currentDreamType.name}完成！查看 dream-log.md 了解详情。`)

    return dreamState
  } catch (err: any) {
    progress(`\n❌ 梦境失败: ${err.message}`)
    dreamState.status = 'failed'
    dreamState.error = err.message
    dreamState.completedAt = new Date().toISOString()
    saveState()
    throw err
  } finally {
    clearTimeout(timeoutId)
    releaseLock()
  }
}

// === 回滚 ===

export async function rollbackDream(): Promise<void> {
  await rollback()
  if (dreamState) {
    dreamState.status = 'rolled_back'
    dreamState.completedAt = new Date().toISOString()
    saveState()
  }
}

// === 获取状态 ===

export function getDreamState(): DreamState | null {
  return dreamState || null
}

export function loadPersistedState(): DreamState | null {
  try {
    const statePath = join(DREAM_DATA_DIR, 'status.json')
    if (existsSync(statePath)) {
      const state: DreamState = JSON.parse(readFileSync(statePath, 'utf-8'))
      // 过期检测：running 状态超过 DREAM_TIMEOUT 视为僵尸进程
      if (state.status === 'running' && state.startedAt) {
        const elapsed = Date.now() - new Date(state.startedAt).getTime()
        if (elapsed > DREAM_TIMEOUT) {
          state.status = 'failed'
          state.error = '梦境超时未完成（进程可能异常退出）'
          state.completedAt = new Date().toISOString()
          writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8')
          releaseLock()
        }
      }
      return state
    }
  } catch { /* ignore */ }
  return null
}

// === CLI 入口 ===

const args = process.argv.slice(2)
if (args.includes('--manual') || args.includes('--cron')) {
  const isCron = args.includes('--cron')

  if (isCron) {
    const hour = new Date().getHours()
    if (hour < 2 || hour >= 5) {
      console.log('⏰ 不在定时梦境时间窗口（2:00-5:00），跳过')
      process.exit(0)
    }
  }

  const dt = getDreamType()
  console.log(`🌙 梦境类型：${dt.name}（${dt.funcRef}·${dt.funcName}）— ${dt.description}`)

  runDream((msg) => console.log(`[${new Date().toISOString()}] ${msg}`))
    .then((state) => {
      console.log(`\n梦境完成，状态: ${state.status}`)
      process.exit(0)
    })
    .catch((err) => {
      console.error(`\n梦境失败: ${err.message}`)
      process.exit(1)
    })
}
