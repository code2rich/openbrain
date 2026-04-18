#!/bin/bash
# sync-config.sh — 增量同步 00-ai-repo/01_claude 配置到 .claude 目录
#
# 使用方式:
#   cd 00-ai-repo/03_scripts && ./sync-config.sh
#   或从项目根: bash 00-ai-repo/03_scripts/sync-config.sh
#
# 原则: 增量同步，只添加/更新，不删除 .claude 中已有的文件

set -euo pipefail

# ── 路径解析（基于脚本位置，相对路径推算） ──
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$SCRIPT_DIR/../01_claude"        # 源: 00-ai-repo/01_claude/
DST="$SCRIPT_DIR/../../.claude"        # 目标: .claude/
ROOT="$SCRIPT_DIR/../.."               # 项目根

echo "═══ sync-config.sh ═══"
echo "源: $SRC"
echo "目标: $DST"
echo ""

# ── 同步映射 ──
# skills/ → .claude/skills/  (增量，保留已有技能)
# agent/  → .claude/agents/  (增量)
# rules/  → .claude/rules/   (增量)
# teams/  → .claude/teams/   (增量)

sync_dir() {
    local src_sub="$1"
    local dst_sub="$2"
    local src_path="$SRC/$src_sub"
    local dst_path="$DST/$dst_sub"

    if [ ! -d "$src_path" ] || [ -z "$(ls -A "$src_path" 2>/dev/null)" ]; then
        echo "⊘ $src_sub/ — 为空，跳过"
        return
    fi

    mkdir -p "$dst_path"
    # --update: 只更新目标中不存在或更旧的文件
    # 不使用 --delete: 保留目标中源没有的文件
    rsync -av --update "$src_path/" "$dst_path/"
    echo "✓ $src_sub/ → .claude/$dst_sub/"
}

sync_dir "skills" "skills"
sync_dir "agent"  "agents"
sync_dir "rules"  "rules"
sync_dir "teams"  "teams"

# ── CLAUDE.md 主配置同步（需确认） ──
if [ -f "$SRC/CLAUDE.md" ]; then
    # 检查内容是否有实质差异
    if ! diff -q "$SRC/CLAUDE.md" "$ROOT/CLAUDE.md" > /dev/null 2>&1; then
        echo ""
        echo "⚠ CLAUDE.md 有变更，需要确认覆盖项目根配置:"
        echo "  diff $SRC/CLAUDE.md $ROOT/CLAUDE.md"
        echo ""
        read -p "确认覆盖项目根 CLAUDE.md? [y/N] " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cp "$SRC/CLAUDE.md" "$ROOT/CLAUDE.md"
            echo "✓ CLAUDE.md → 项目根"
        else
            echo "⊘ CLAUDE.md — 跳过"
        fi
    else
        echo "✓ CLAUDE.md — 无变更"
    fi
fi

echo ""
echo "═══ 同步完成 ═══"
