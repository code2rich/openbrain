---
title: 自动摄入流水线设计
description: 每日凌晨 2:00 自动将 00-raw 新增内容处理至 99-wiki，含 git 自动提交推送
type: topic
created: 2026-04-13
updated: 2026-04-13
tags: [automation, pipeline, obsidian, launchd]
related: [[llm-wiki]]
used_in: []
insights:
  - date: 2026-04-15
    summary: 自动摄入流水线的关键设计决策是让 AI 判断哪些 raw 值得提炼，而非全部处理
keywords: [自动摄入, ingest, launchd, 自动化流水线, Claude CLI, Git自动提交, Obsidian]
scenes:
  - 当我想了解知识库自动摄入流水线的架构设计时
  - 当我需要手动触发或调试 ingest 脚本时
  - 当我想为知识库添加定时自动化任务时
  - 当我需要排查摄入流水线的运行故障时
knowledge_type: permanent
review_cycle: null
---

# 自动摄入流水线

## 架构

```
每天 02:00 launchd 触发
        │
        ▼
   ingest.sh ──→ 对比 00-raw/ vs .ingested → 新增文件列表
        │
        ▼
   claude -p "按 CLAUDE.md Ingest 流程处理"
        │
        ▼
   直接写入 99-wiki/ (entities / topics / comparisons)
   更新 index.md + log.md
        │
        ▼
   标记已处理 → 更新 .ingested
        │
        ▼
   git add -A → commit → push
```

## 文件清单

| 文件 | 作用 |
|------|------|
| `scripts/ingest.sh` | 核心脚本 |
| `scripts/com.obsidian.wiki-ingest.plist` | launchd 配置 |
| `.ingested` | 已处理文件追踪（相对路径，一行一条） |

## 关键设计决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 调度器 | macOS launchd | 原生、可靠、开机自启 |
| 触发时间 | 凌晨 2:00 | 避免干扰白天使用 |
| 草稿暂存 | 无，直接写入 wiki | 简化流程，通过 log.md 审核追踪 |
| 已处理追踪 | `.ingested` 文件（git 管理） | 简单可靠，可追溯 |
| 失败处理 | claude 失败则不更新 `.ingested`，次日自动重试 | 保证原子性 |
| 成本控制 | 不限制 | 用户确认无需控制 |
| 质量把控 | 通过 log.md 每日审核，人工修正 | 半自动模式 |

## ingest.sh 工作流

1. **防并发**：`/tmp/obsidian-ingest.lock` 锁文件
2. **检测新文件**：`find 00-raw/ -name "*.md"` 与 `.ingested` 做差集
3. **AI 处理**：`claude -p` 非交互模式，仅允许 `Read Edit Write Glob Grep` 五个工具
4. **标记已处理**：成功完成后追加到 `.ingested`
5. **Git 闭环**：`git add -A` → `git commit` → `git push`

## 日常操作

```bash
# 手动触发
bash scripts/ingest.sh

# 查看运行日志
cat /tmp/obsidian-ingest.log

# 查看错误日志
cat /tmp/obsidian-ingest.err

# 停止定时任务
launchctl unload ~/Library/LaunchAgents/com.obsidian.wiki-ingest.plist

# 恢复定时任务
launchctl load ~/Library/LaunchAgents/com.obsidian.wiki-ingest.plist

# 强制重处理某文件
# 从 .ingested 中删除对应行，下次运行时会重新处理
```
