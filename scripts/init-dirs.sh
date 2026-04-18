#!/usr/bin/env bash
# init-dirs.sh — 初始化 OpenBrain 目录结构
# 用于克隆仓库后创建被 .gitignore 排除的目录

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VAULT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔧 初始化 OpenBrain 目录结构: $VAULT_ROOT"

# 不可变真相层
mkdir -p "$VAULT_ROOT/00-raw/00-upload"
mkdir -p "$VAULT_ROOT/00-raw/01-Clippers"
mkdir -p "$VAULT_ROOT/00-raw/02-RSS"
mkdir -p "$VAULT_ROOT/00-raw/03-Manual"
mkdir -p "$VAULT_ROOT/00-raw/04-OpenClaw"
mkdir -p "$VAULT_ROOT/00-raw/05-SyncDown"
mkdir -p "$VAULT_ROOT/00-raw/06-Thoughts"

# 结构化知识层
mkdir -p "$VAULT_ROOT/99-wiki/01-entities"
mkdir -p "$VAULT_ROOT/99-wiki/02-topics"
mkdir -p "$VAULT_ROOT/99-wiki/03-comparisons"

# 知识输出层
mkdir -p "$VAULT_ROOT/100-output"

# wikiapp 数据目录
mkdir -p "$VAULT_ROOT/wikiapp/data"

# 初始化 wiki 必要文件（如不存在）
if [ ! -f "$VAULT_ROOT/99-wiki/index.md" ]; then
  cat > "$VAULT_ROOT/99-wiki/index.md" << 'INDEXEOF'
---
title: OpenBrain 知识索引
description: 所有 wiki 页面的目录索引
type: index
created: 2026-04-18
updated: 2026-04-18
---

# OpenBrain 知识索引

## 实体页面 (01-entities)

## 主题页面 (02-topics)

## 对比分析 (03-comparisons)

## 场景索引

## 知识空白
INDEXEOF
  echo "  ✅ 创建 99-wiki/index.md"
fi

if [ ! -f "$VAULT_ROOT/99-wiki/log.md" ]; then
  cat > "$VAULT_ROOT/99-wiki/log.md" << 'LOGEOF'
---
title: 操作日志
description: OpenBrain 摄入、查询、归档、维护时间线
type: log
created: 2026-04-18
updated: 2026-04-18
---

# 操作日志

LOGEOF
  echo "  ✅ 创建 99-wiki/log.md"
fi

if [ ! -f "$VAULT_ROOT/99-wiki/.raw-coverage" ]; then
  echo "# raw 覆盖率追踪" > "$VAULT_ROOT/99-wiki/.raw-coverage"
  echo "# 格式: 状态 | raw文件 | 关联wiki页面 | 日期" >> "$VAULT_ROOT/99-wiki/.raw-coverage"
  echo "  ✅ 创建 99-wiki/.raw-coverage"
fi

# 创建 .env（如不存在）
if [ ! -f "$VAULT_ROOT/.env" ]; then
  cp "$VAULT_ROOT/.env.example" "$VAULT_ROOT/.env" 2>/dev/null && echo "  ✅ 从 .env.example 创建 .env" || echo "  ⚠️  .env.example 不存在，跳过"
fi

echo ""
echo "✅ 目录结构初始化完成"
echo ""
echo "目录树:"
echo "  00-raw/          不可变真相层（原始资料）"
echo "  ├── 00-upload/   上传文件"
echo "  ├── 01-Clippers/ 浏览器剪藏"
echo "  ├── 02-RSS/      RSS 订阅"
echo "  ├── 03-Manual/   手动维护"
echo "  ├── 04-OpenClaw/ 公众号抓取"
echo "  ├── 05-SyncDown/ 同步下载"
echo "  └── 06-Thoughts/ 思考碎片"
echo "  99-wiki/         结构化知识层（AI 编译产物）"
echo "  ├── 01-entities/ 实体页面"
echo "  ├── 02-topics/   主题页面"
echo "  └── 03-comparisons/ 对比分析"
echo "  100-output/      知识输出层"
