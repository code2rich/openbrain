#!/usr/bin/env bash
# ingest.sh — Ingest Pipeline
# 将 00-raw/ 中的新文件逐个处理至 99-wiki/
# 手动触发运行
set -euo pipefail

# ============================
# 配置区 — 按需修改
# ============================
VAULT_ROOT="${VAULT_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
RAW_DIR="$VAULT_ROOT/00-raw"
WIKI_DIR="$VAULT_ROOT/99-wiki"
COVERAGE_DB="$VAULT_ROOT/99-wiki/.raw-coverage"
LOCK_FILE="/tmp/obsidian-ingest.lock"

# 重试配置
MAX_RETRIES=5       # 单文件最大重试次数
BASE_WAIT=60        # 首次重试等待秒数
FILE_PAUSE=10       # 文件间隔秒数（避免限流）
# ============================

TODAY=$(date +%Y-%m-%d)

# 防止并发执行
if [ -f "$LOCK_FILE" ]; then
    echo "[$(date)] Another ingest is running. Exiting."
    exit 0
fi
trap "rm -f $LOCK_FILE" EXIT
touch "$LOCK_FILE"

# 初始化 .raw-coverage
touch "$COVERAGE_DB"

# 查找新增的 raw 文件
new_files=()
while IFS= read -r -d '' file; do
    rel_path="${file#$VAULT_ROOT/}"
    if ! grep -qF "$rel_path" "$COVERAGE_DB" 2>/dev/null; then
        new_files+=("$rel_path")
    fi
done < <(find "$RAW_DIR" -name "*.md" -print0)

# 没有新文件则退出
if [ ${#new_files[@]} -eq 0 ]; then
    echo "[$(date)] No new files to process."
    exit 0
fi

total=${#new_files[@]}
echo "[$(date)] Found $total new files to process."

cd "$VAULT_ROOT"
processed=0
failed=0

# 逐文件处理
for ((i=0; i<total; i++)); do
    rel_path="${new_files[$i]}"
    filename=$(basename "$rel_path")

    echo ""
    echo "=========================================="
    echo "[$(date)] File $((i+1))/$total: $filename"
    echo "=========================================="

    PROMPT="请按照 CLAUDE.md 中定义的 Ingest 工作流和「页面类型判断标准」，处理以下 raw 文件。

## 页面类型判断标准

先阅读 raw 文件内容，再判断应创建什么类型的页面：

- **实体 (01-entities/)**：文件核心围绕一个具体的人/公司/产品/工具/概念。
  特征：有名字、有身份、有履历或特性。
  例：介绍 Karpathy 的文章 → 01-entities/AndrejKarpathy.md

- **主题 (02-topics/)**：文件覆盖一个知识领域、方法论或业务模块。
  特征：有体系、有多个子话题、需要系统性总结。
  例：AI Agent 架构综述 → 02-topics/ai-agent-overview.md

- **对比 (03-comparisons/)**：文件讨论两个或多个方案的优劣取舍。
  特征：有对比维度、有适用场景分析、帮未来做决策。
  例：RAG vs LLM-Wiki 对比 → 03-comparisons/rag-vs-llm-wiki.md

一条 raw 可能产出多种页面。先识别文件的「第一主题」确定主页面类型，
再检查是否需要辅助创建/更新其他类型页面。不确定时默认建主题页。

## 处理要求

1. 读取 raw 文件，按上述标准判断页面类型
2. 阅读 99-wiki/index.md 了解已有页面，与相关页面建立双链
3. 在 99-wiki/ 正确的子目录中创建或更新页面
4. 每个页面必须符合完整的 frontmatter 规范（必须包含 sources 字段记录来源 raw 文件路径）
5. 更新 99-wiki/index.md 目录
6. 更新 99-wiki/log.md，在「${TODAY}」日期下添加摄入记录
7. 不要修改 00-raw/ 中的任何文件

## 新增文件
  - ${VAULT_ROOT}/${rel_path}"

    # 重试执行
    success=false
    for attempt in $(seq 1 $MAX_RETRIES); do
        echo "[$(date)] Attempt $attempt/$MAX_RETRIES..."

        if output=$(claude -p "$PROMPT" \
            --allowedTools "Read Edit Write Glob Grep" \
            --output-format text 2>&1); then
            if echo "$output" | grep -qi "429\|速率限制\|rate.limit\|too many"; then
                echo "[$(date)] Rate limited."
            else
                echo "[$(date)] Succeeded."
                success=true
                break
            fi
        else
            echo "[$(date)] claude exited with error."
        fi

        if [ $attempt -lt $MAX_RETRIES ]; then
            wait_sec=$((BASE_WAIT * (2 ** (attempt - 1))))
            jitter=$((wait_sec * 10 / 100))
            wait_sec=$((wait_sec + RANDOM % (jitter * 2 + 1) - jitter))
            [ $wait_sec -lt 30 ] && wait_sec=30
            echo "[$(date)] Retrying in ${wait_sec}s..."
            sleep $wait_sec
        fi
    done

    if $success; then
        # 立即标记已处理
        echo "$rel_path | done | - | $(date +%Y-%m-%d)" >> "$COVERAGE_DB"
        processed=$((processed + 1))
        echo "[$(date)] Marked as ingested. ($processed/$total)"

        # 每个文件成功后立即提交（断点保护）
        git add -A
        git diff --cached --quiet || git commit -m "vault backup: $(date '+%Y-%m-%d %H:%M:%S')"
        git push 2>/dev/null || true

        # 文件间暂停
        if [ $((i + 1)) -lt $total ]; then
            sleep $FILE_PAUSE
        fi
    else
        failed=$((failed + 1))
        echo "[$(date)] FAILED: $filename. Will retry next run."
    fi
done

echo ""
echo "=========================================="
echo "[$(date)] Ingest complete: $processed/$total processed, $failed failed."
echo "=========================================="
