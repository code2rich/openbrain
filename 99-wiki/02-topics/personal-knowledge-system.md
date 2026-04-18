---
title: 个人知识库构建
description: 以 Obsidian 为核心、Claude Code 为调度层的个人知识库自动化系统
type: topic
created: 2026-04-13
updated: 2026-04-15
tags: [知识管理, Obsidian, Claude-Code, 飞书, Git, 自动化]
related: [[llm-wiki]], [[reading-methodology]], [[knowledge-system-paradigms]], [[ai-memory-governance]], [[obsidian-ecosystem]]
used_in: []
insights:
  - date: 2026-04-15
    summary: 知识库最大的敌人不是遗忘，是找不到——场景化召回比存储量更重要
keywords: [个人知识库, Obsidian, Claude Code, 飞书, Git, 自动化, Web Clipper, 知识管理]
scenes:
  - 当我想搭建以 Obsidian 为核心的个人知识管理系统时
  - 当我在评估知识库的自动化脚本方案时
  - 当我需要了解当前知识库的短板和进化方向时
  - 当我想对比不同知识管理工具的集成方案时
knowledge_type: permanent
review_cycle: null
---

# 个人知识库构建

## 四层架构

| 层级 | 工具 | 角色 |
|------|------|------|
| 调度层 | Claude Code | 脑：AI 处理与自动化 |
| 知识层 | Obsidian | 记忆：知识存储与双链 |
| 推送层 | 飞书 | 闹钟：主动通知与提醒 |
| 版本层 | Git | 保险：版本管理与同步 |

## Obsidian 目录设计

数字前缀排序法：

| 目录 | 用途 |
|------|------|
| 00-收件箱 | 快速收集 |
| 10-日记 | 每日记录 |
| 20-任务 | 待办事项 |
| 30-项目 | 项目文档 |
| 40-知识库 | 结构化知识 |
| 50-归档 | 历史归档 |
| 90-模板 | 模板文件 |

## 五个自动化脚本

1. **日记创建**：每日自动生成日记模板
2. **Git 同步**：定时提交推送到远端
3. **飞书通知**：重要事件主动推送
4. **晨间简报**：AI 生成今日建议
5. **晚间提醒**：一句话概括今日收获

## LLM 集成

- 晨间简报 AI 建议
- 晚间一句话概括
- 周日自动周报

## Web Clipper 闭环

一键剪藏 → Git 版本管理 → LLM 处理 → 双链知识网络

## 文档预处理工具

| 工具 | 用途 | 特点 |
|------|------|------|
| [MarkItDown](https://github.com/microsoft/markitdown) (⭐107k) | PDF/Word/PPT/Excel → Markdown | 微软开源，支持 CLI、Python API、批量处理、MCP 集成、LLM OCR |

MarkItDown 适合在 Ingest 流程前做格式统一化，将非 Markdown 的 raw 文件转为 Markdown，便于后续 AI 处理。安装：`pip install 'markitdown[all]'`

## AI 记忆工具

| 工具 | 用途 | 特点 |
|------|------|------|
| [[MemPalace]] (⭐14.9k) | AI 对话记忆持久化 | 宫殿记忆法，Wing→Room→Closet→Drawer 四层结构，96.6% 准确率，ChromaDB 本地存储，MCP 集成 |

[[MemPalace]] 解决的是 LLM-Wiki 之外的另一个问题：**AI 对话记忆**。LLM-Wiki 管理外部知识，MemPalace 管理 AI 与你的对话历史。两者互补——Wiki 是"编译后的知识"，MemPalace 是"原始思考过程"的留存。详见 → [[MemPalace]]

## AI 记忆治理

详见 → [[ai-memory-governance]]

陆离同学从 9830 条 Obsidian 日记记忆中得出的核心教训：记忆系统的关键不是存储量，而是治理结构。纯文本方案（SOUL.md + USER.md + self-improving/）将维护成本从 25-35 分钟/天降到接近 0，印证了 LLM-Wiki 方法论的正确性。

## Obsidian 插件推荐

详见 → [[obsidian-ecosystem]]

核心三件套：Attachment Management（附件秩序）+ Consistent Attachments and Links（链接治理）+ Remotely Save（跨设备同步）。按需加装 Terminal、Eccirian Encrypt、Importer、Open With。

---

## 进化反思（2026-04-13）

### 当前短板

204 篇 raw 只提炼了 23 篇 wiki，100-output 为空。知识库重"存储"轻"使用"——像一个堆满原料但从未出菜的厨房。

### 六大缺失功能

1. **场景化召回**：`index.md` 是静态表，缺少"我记得看过…但找不到"的语义入口
2. **消耗闭环**：知识没有被使用的记录，100-output 为空，没有任何产出
3. **时效性感知**：快消知识（趋势、工具评测）没有过期机制，过时知识比没有知识更危险
4. **知识空白可视化**：不知道哪些 raw 从未被提炼，存在知识"暗物质"
5. **个人思考捕获**：只有外部资料→AI 提炼，缺少"我的观点"的记录入口
6. **暗线发现**：只能发现"我知道我知道的"，缺少"我不知道这两件事有关系"的意外发现

### 优先级排序

| 优先级 | 功能 | 理由 |
|--------|------|------|
| P0 | 知识空白可视化 | 204 篇 raw 只提炼 23 篇，效率太低 |
| P0 | 个人思考捕获 | 没有自己观点的知识库只是剪报夹 |
| P1 | 场景化召回 | 找不到的知识等于没有 |
| P1 | 时效性感知 | 过时知识比没有知识更危险 |
| P2 | 消耗闭环 | 知识用了才有价值 |
| P2 | 暗线发现 | 锦上添花，对深度使用者价值很大 |
