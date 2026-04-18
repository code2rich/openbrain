---
title: Claude Mem
description: GitHub 54K star 的 Claude Code 跨 session 记忆插件，自动记录上下文并语义检索
type: entity
knowledge_type: periodic
review_cycle: 90
created: 2026-04-18
updated: 2026-04-18
last_reviewed: 2026-04-18
tags: [claude-code, memory, developer-tools, open-source, mcp]
keywords: [claude-mem, thedotmack, 跨session记忆, SQLite, Chroma, 上下文保持, MCP]
scenes:
  - Claude Code 跨 session 需要保持项目上下文
  - 需要搜索历史对话和代码改动
  - 团队成员需要共享 Claude Code 使用经验
  - 评估 Claude Code 生态工具选型
related: "[[ClaudeCodeBestPractice]], [[MemPalace]], [[claude-code-architecture]], [[personal-knowledge-system]]"
sources:
  - "00-raw/01-Clippers/让Claude Code效率翻倍：GitHub上最火的两个Claude Code工具（97K star）.md"
insights:
  - date: 2026-04-18
    summary: claude-mem 和 MemPalace 都做 AI 记忆持久化，但定位不同——claude-mem 专注 Claude Code 编码场景的上下文保持，MemPalace 更偏通用对话记忆。claude-mem 的 `<private>` 标签机制是实用性亮点，解决了开发场景中的密钥泄露风险。
---

## 基本信息

| 属性 | 值 |
|------|-----|
| 项目名 | claude-mem |
| 仓库 | `thedotmack/claude-mem` |
| Star | 54K |
| 作者 | Alex Newman / @thedotmack |
| 定位 | Claude Code 跨 session 上下文记忆插件 |
| 特色 | 自动记录工具使用和代码改动，语义检索 |
| 安装 | `npx claude-mem install`（一行命令） |
| 许可证 | 开源 |

## 解决的核心问题

Claude Code 每次开新 session 都是白纸——不记得项目背景、踩过的坑、之前的设计决策。claude-mem 让 AI 记住跨 session 的上下文。

## 核心功能

### 1. 自动记忆

- 记录用过的工具
- 记录代码改动
- 生成语义摘要
- 新 session 自动加载历史上下文

### 2. 搜索历史

```
# 向 Claude 提问
"上次我们解决的那个认证 bug，现在进展如何？"
```

搜索所有历史记录并给出答案。

### 3. 隐私控制

```xml
<private>API_KEY=xxx</private>
```

用 `<private>` 标签标记敏感内容，不进入记忆系统。

### 4. Web UI

`http://localhost:37777` 可视化查看所有记忆记录。

## 技术架构

```
代码编写 → 5 个 Lifecycle Hooks 自动记录
    ↓
SQLite 本地存储
    ↓
Chroma 向量数据库语义索引
    ↓
新 session 自动加载（MCP 协议集成）
```

关键组件：
- **5 个 Lifecycle Hooks** — 拦截 Claude Code 生命周期事件
- **SQLite** — 结构化本地存储
- **Chroma** — 向量语义搜索
- **MCP 协议** — 与 Claude Code 集成
- **OpenClaw Gateway** — 支持

## 与相关工具对比

| 维度 | ClaudeMem | [[MemPalace]] |
|------|-----------|---------------|
| 定位 | Claude Code 编码场景上下文保持 | 通用 AI 对话记忆持久化 |
| 记忆方法 | Lifecycle Hooks 自动记录 | 宫殿记忆法四层架构 |
| 存储 | SQLite + Chroma | ChromaDB |
| 安装 | `npx claude-mem install` | MCP 集成 |
| 准确率 | — | 96.6% (LongMemEval) |
| 特色 | `<private>` 隐私标签 + Web UI | 记忆衰减 + 多轮检索 |

## 与 [[ClaudeCodeBestPractice]] 配合

best-practice 教「怎么用 Claude Code」，claude-mem 让「用过的经验被记住」。组合使用：用技巧写代码 → 用 claude-mem 记住上下文 → 下次 session Claude 记得一切。
