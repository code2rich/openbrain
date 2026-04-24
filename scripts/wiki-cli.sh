#!/usr/bin/env bash
# wiki-cli.sh — Wiki 系统统一 CLI 入口
# 将 Claude Code CLI 作为系统级工具，提供 ingest/lint/query/maintain/dream/status 子命令
set -euo pipefail

VAULT_ROOT="${VAULT_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
RAW_DIR="$VAULT_ROOT/00-raw"
WIKI_DIR="$VAULT_ROOT/99-wiki"
API_PORT="${API_PORT:-3457}"
# 从 .env 加载配置（如果存在）
[ -f "$VAULT_ROOT/.env" ] && source <(grep -v '^#' "$VAULT_ROOT/.env" | grep '=' | sed 's/^/export /')
LOG_FILE="/tmp/wiki-cli.log"
TODAY=$(date +%Y-%m-%d)

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

# ── status：知识库状态概览 ──────────────────────────────────────
cmd_status() {
  # 统计 wiki 页面
  local entities=0 topics=0 comparisons=0
  [ -d "$WIKI_DIR/01-entities" ] && entities=$(find "$WIKI_DIR/01-entities" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
  [ -d "$WIKI_DIR/02-topics" ] && topics=$(find "$WIKI_DIR/02-topics" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
  [ -d "$WIKI_DIR/03-comparisons" ] && comparisons=$(find "$WIKI_DIR/03-comparisons" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')

  # 统计 raw 文件
  local raw_total=0
  [ -d "$RAW_DIR" ] && raw_total=$(find "$RAW_DIR" -name "*.md" -not -name ".*" 2>/dev/null | wc -l | tr -d ' ')

  # 统计覆盖率
  local processed=0 unprocessed=0
  if [ -f "$WIKI_DIR/.raw-coverage" ]; then
    processed=$(grep -c " | done |" "$WIKI_DIR/.raw-coverage" 2>/dev/null || echo 0)
  fi
  unprocessed=$((raw_total - processed))
  [ $unprocessed -lt 0 ] && unprocessed=0

  # 最后活动时间
  local last_ingest="never" last_dream="never" last_lint="never"
  if [ -f "$WIKI_DIR/log.md" ]; then
    last_ingest=$(grep -o '^## 20[0-9][0-9]-[0-9][0-9]-[0-9][0-9]' "$WIKI_DIR/log.md" | tail -1 | sed 's/^## //' || echo "never")
  fi
  if [ -f "$VAULT_ROOT/wikiapp/.vitepress/scripts/.lint-last-run.json" ]; then
    last_lint=$(python3 -c "import json; print(json.load(open('$VAULT_ROOT/wikiapp/.vitepress/scripts/.lint-last-run.json')).get('lastRun','never'))" 2>/dev/null || echo "never")
  fi
  if [ -f "$VAULT_ROOT/wikiapp/data/dream-state.json" ]; then
    last_dream=$(python3 -c "import json; d=json.load(open('$VAULT_ROOT/wikiapp/data/dream-state.json')); print(d.get('startedAt','never'))" 2>/dev/null || echo "never")
  fi

  echo "┌─────────────────────────────────────────────────┐"
  echo "│            📊 Wiki 知识库状态概览               │"
  echo "├──────────────────┬──────────────────────────────┤"
  echo "│ 📁 Raw 文件      │ 总计 $raw_total · 未处理 $unprocessed"
  echo "│ 📝 Wiki 页面     │ 实体 $entities · 主题 $topics · 对比 $comparisons"
  echo "│ 📥 最近摄入      │ $last_ingest"
  echo "│ 🔍 最近 Lint     │ $last_lint"
  echo "│ 💭 最近 Dream    │ $last_dream"
  echo "├──────────────────┴──────────────────────────────┤"
  echo "│ 🕐 调度状态                                      │"
  local ingest_loaded="未安装" lint_loaded="未安装"
  local launchctl_out
  launchctl_out=$(launchctl list 2>/dev/null)
  echo "$launchctl_out" | grep -q "com.obsidian.wiki-ingest" && ingest_loaded="✅ 已安装"
  echo "$launchctl_out" | grep -q "com.obsidian.wiki-lint" && lint_loaded="✅ 已安装"
  echo "│   摄入调度 (02:00)  $ingest_loaded"
  echo "│   Lint 调度 (周日)  $lint_loaded"
  echo "└─────────────────────────────────────────────────┘"
}

# ── ingest：知识摄入 ────────────────────────────────────────────
cmd_ingest() {
  if [ "${1:-}" = "--dry-run" ]; then
    log "DRY RUN: 检查未处理的 raw 文件..."
    local count=0
    while IFS= read -r -d '' file; do
      rel_path="${file#$VAULT_ROOT/}"
      if ! grep -qF "$rel_path" "$WIKI_DIR/.raw-coverage" 2>/dev/null; then
        echo "  📄 $rel_path"
        count=$((count + 1))
      fi
    done < <(find "$RAW_DIR" -name "*.md" -print0)
    log "共 $count 个文件待处理"
    return
  fi
  log "启动摄入管线..."
  cd "$VAULT_ROOT"
  bash scripts/ingest.sh
}

# ── lint：知识库健康检查 ────────────────────────────────────────
cmd_lint() {
  log "启动知识库健康检查..."
  local api_url="http://localhost:${API_PORT}/api/lint/run"
  local response
  response=$(curl -s -X POST "$api_url" -H 'Content-Type: application/json' -d '{}' 2>/dev/null || echo '{"error":"API 未响应"}')
  if echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('summary','API 返回异常'))" 2>/dev/null; then
    log "Lint 完成"
  else
    log "Lint API 调用失败，尝试本地脚本..."
    cd "$VAULT_ROOT/wikiapp" && npx tsx .vitepress/scripts/wiki-lint.ts 2>&1 | tail -20
  fi
}

# ── query：知识查询 ─────────────────────────────────────────────
cmd_query() {
  local question="${1:-}"
  if [ -z "$question" ]; then
    echo "用法: wiki query \"你的问题\""
    exit 1
  fi

  local prompt="你是知识库管理员。请查阅 99-wiki/index.md 找到相关页面，阅读后回答以下问题。

## 问题
$question

## 要求
1. 先读 99-wiki/index.md 找到相关页面
2. 阅读相关页面的完整内容
3. 给出结构化的答案
4. 如果发现了有价值的新洞察，建议保存为新 wiki 页面"

  log "查询: $question"
  cd "$VAULT_ROOT"
  claude -p "$prompt" \
    --allowedTools "Read Glob Grep" \
    --output-format text
}

# ── maintain：知识库维护 ────────────────────────────────────────
cmd_maintain() {
  local prompt="你是知识库管理员。请执行以下维护任务：

1. 读取 99-wiki/.raw-coverage，检查 stale_score（计算公式：(今天 - updated) / review_cycle）
   - 标记 stale_score >= 1.0 的页面为「需要审阅」
2. 扫描 99-wiki/ 所有页面，找出没有入链的孤立页面
3. 检查缺少 scenes 或 insights 的页面
4. 更新 99-wiki/log.md 记录本次维护

今天日期: $TODAY
不要修改 00-raw/ 中的任何文件。"

  log "启动知识库维护..."
  cd "$VAULT_ROOT"
  claude -p "$prompt" \
    --allowedTools "Read Edit Write Glob Grep" \
    --output-format text
}

# ── dream：触发 Dream 模式 ──────────────────────────────────────
cmd_dream() {
  log "触发 Dream 模式..."
  local api_url="http://localhost:${API_PORT}/api/dream/start"
  local response
  response=$(curl -s -X POST "$api_url" 2>/dev/null || echo '{"error":"API 未响应"}')
  echo "$response" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if 'error' in d: print(f'❌ {d[\"error\"]}')
else: print(f'✅ Dream 启动: {d.get(\"dreamId\",\"?\")} 状态: {d.get(\"status\",\"?\")}')
" 2>/dev/null || echo "$response"
}

# ── 主路由 ─────────────────────────────────────────────────────
usage() {
  echo "用法: wiki <command> [options]"
  echo ""
  echo "命令:"
  echo "  status              知识库状态概览"
  echo "  ingest [--dry-run]  处理新 raw 文件"
  echo "  lint                知识库健康检查"
  echo "  query \"问题\"        知识查询"
  echo "  maintain            知识库维护（过期/孤立/暗线）"
  echo "  dream               触发 Dream 模式"
}

case "${1:-}" in
  status)   shift; cmd_status "$@" ;;
  ingest)   shift; cmd_ingest "$@" ;;
  lint)     shift; cmd_lint "$@" ;;
  query)    shift; cmd_query "$@" ;;
  maintain) shift; cmd_maintain "$@" ;;
  dream)    shift; cmd_dream "$@" ;;
  -h|--help|help) usage ;;
  *) echo "未知命令: ${1:-}"; usage; exit 1 ;;
esac
