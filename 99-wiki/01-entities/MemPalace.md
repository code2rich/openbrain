---
title: MemPalace
description: AI 对话记忆持久化系统，宫殿记忆法四层架构，96.6% LongMemEval 准确率，完全本地运行
type: entity
knowledge_type: periodic
review_cycle: 90
created: 2026-04-18
updated: 2026-04-18
last_reviewed: 2026-04-18
tags: [ai-memory, mcp, local-first, knowledge-management]
keywords: [MemPalace, 宫殿记忆法, AI记忆, ChromaDB, LongMemEval, MCP协议]
scenes:
  - 想让 AI 记住半年前的调试决策和架构讨论
  - 需要跨 session 保持 AI 对项目上下文的理解
  - 评估 AI 记忆持久化方案，对比 RAG 和摘要压缩
related:
  - "[[personal-knowledge-system]]"
  - "[[llm-wiki]]"
  - "[[mcp-ecosystem]]"
  - "[[rag-vs-llm-wiki]]"
sources:
  - 00-raw/01-Clippers/14.9K+ star 96.6%准确率的AI记忆系统，GitHub爆火的秘密.md
used_in: []
insights:
  - date: 2026-04-18
    summary: MemPalace 和 LLM-Wiki 互补——Wiki 管理「编译后的知识」，MemPalace 管理「原始思考过程」。但 MemPalace 的建筑结构（Wing/Room/Closet/Drawer）思路和 LLM-Wiki 的三层分离（raw/wiki/output）有异曲同工之妙，核心都是「结构即导航」。
---

# MemPalace

AI 对话记忆持久化系统。核心理念：**存储一切，让语义搜索找到它**。

灵感来自古希腊「宫殿记忆法」——把想法放进虚拟建筑的每个房间，走一遍就能找到。

- **GitHub**: https://github.com/milla-jovovich/mempalace
- **Stars**: 14.9K+
- **协议**: MCP 集成，支持 Claude / ChatGPT / Cursor

## 核心架构

### 四层建筑结构

```
Wing（项目/人物）
  └── Room（主题：auth、billing、deploy）
        └── Closet（摘要 → 指向原文）
              └── Drawer（原始文件）
```

同 Wing 内的 Room 用 Hall 连接，跨 Wing 的 Room 用 Tunnel 打通——AI 搜索时直接知道去哪找，不用遍历所有关键词。

### 记忆分层

| 层级 | 内容 | Token 数 | 加载时机 |
|------|------|---------|---------|
| L0 | AI 是谁 | ~50 | 始终 |
| L1 | 团队/项目/偏好 | ~120 | 始终 |
| L2 | 最近会话/当前项目 | - | 按需 |
| L3 | 语义深度搜索 | - | 按需 |

## 关键数据

| 指标 | 数值 |
|------|------|
| LongMemEval 准确率 (R@5) | 96.6% |
| 测试题 | 500 道 |
| 基准运行时间 (M2 Ultra) | 5 分钟 |
| AAAK 压缩方言准确率 | 84.2% |
| 年成本 | $0（完全本地） |
| 对比：LLM 摘要年成本 | ~$507 |

## 技术要点

- **存储策略**: 原文存入 ChromaDB，不做摘要（96.6% 准确率的来源）
- **AAAK**: 实验性压缩方言，用于上下文加载，但会降低准确率
- **本地优先**: 零云 API 调用，数据不离开本机
- **MCP 集成**: `claude mcp add mempalace -- python -m mempalace.mcp_server`

## 使用方式

```bash
pip install mempalace
mempalace init ~/projects/myapp
mempalace mine ~/projects/myapp                    # 代码和文档
mempalace mine ~/chats/ --mode convos              # 对话记录
mempalace mine ~/chats/ --mode convos --extract general  # 自动分类
mempalace search "why did we switch to GraphQL"
```

本地模型（Llama、Mistral）通过 wake-up 命令加载上下文：

```bash
mempalace wake-up > context.txt
```

## 适用人群

- **独立开发者**: 记住半年前为什么选了 PostgreSQL 而不是 MySQL
- **AI 编程用户**: 让 Claude/Copilot 记住项目上下文，不用每次从头解释
- **团队协作**: 多人共享项目记忆，新成员 5 分钟了解历史决策

## 与 LLM-Wiki 的关系

| 维度 | MemPalace | LLM-Wiki |
|------|-----------|----------|
| 管理对象 | AI 对话历史 | 外部知识资料 |
| 知识状态 | 原始思考过程 | 编译后的结构化知识 |
| 组织方式 | 建筑结构（Wing/Room） | 三层分离（raw/wiki/output） |
| 共同点 | 结构即导航，不让 AI 判断「什么重要」 | 结构即导航，AI 完全拥有 wiki 层 |

两者互补：Wiki 是「编译后的知识」，MemPalace 是「原始思考过程」的留存。
