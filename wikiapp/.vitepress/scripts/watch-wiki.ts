#!/usr/bin/env node
// watch-wiki.ts — 监听 99-wiki 目录变化，自动重新 generate
import { watch } from 'fs'
import { execSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WIKI_DIR = process.env.WIKI_DIR || resolve(__dirname, '../../../99-wiki')
const GENERATE_SCRIPT = resolve(__dirname, 'generate-sidebar.ts')

let debounceTimer: ReturnType<typeof setTimeout> | null = null

console.log(`👀 Watching: ${WIKI_DIR}`)

// 首次运行（允许失败）
try {
  execSync(`npx tsx "${GENERATE_SCRIPT}"`, { stdio: 'inherit', env: { ...process.env, WIKI_DIR } })
} catch (e) {
  console.error('⚠️ Initial generate failed, will retry on file changes')
}

for (const category of ['01-entities', '02-topics', '03-comparisons']) {
  const dir = resolve(WIKI_DIR, category)
  try {
    watch(dir, { recursive: true }, (event, filename) => {
      if (!filename || !filename.endsWith('.md')) return
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        console.log(`\n📝 ${category}/${filename} changed, regenerating...`)
        try {
          execSync(`npx tsx "${GENERATE_SCRIPT}"`, { stdio: 'inherit', env: { ...process.env, WIKI_DIR } })
        } catch (e) {
          console.error('Generate failed:', e)
        }
      }, 1000)
    })
  } catch {
    console.warn(`Directory not found: ${dir}, skipping`)
  }
}

// 保持进程运行
process.on('SIGTERM', () => process.exit(0))
