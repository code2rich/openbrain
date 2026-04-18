---
title: ExBrain
description: 基于 seekdb 的 LLM Wiki 升级版，引入 Compiled Truth 机制的个人知识管理工具
type: entity
knowledge_type: periodic
review_cycle: 90
created: 2026-04-18
updated: 2026-04-18
last_reviewed: 2026-04-18
tags: [knowledge-management, llm-wiki, seekdb, cli-tool, mcp]
keywords: [ex-brain, ebrain, Compiled Truth, 知识编译, seekdb, 混合检索, 时间线, 实体关联]
scenes:
  - 当我想了解 LLM Wiki 的工程化实现方案时
  - 当我需要评估"知识编译"机制的可行性时
  - 当我考虑给知识库添加混合检索能力时
related: [[llm-wiki]], [[HermesAgent]], [[personal-knowledge-system]], [[knowledge-system-paradigms]]
sources:
  - 00-raw/01-Clippers/手搓属于你的 LLM Wiki｜基于 seekdb，我做了一个升级版.md
used_in: []
insights:
  - date: 2026-04-18
    summary: ex-brain 的 Compiled Truth 分类处理（状态/事实/事件）比本 Wiki 的 permanent/periodic/ephemeral 更贴近"更新策略"维度，值得借鉴——不是按知识本身的时效分类，而是按信息到达时的"更新行为"分类
---

# ExBrain

ex-brain 是克军（OceanBase 前端工程师）开发的个人知识管理工具，在 Karpathy LLM-Wiki 基础上引入了 **Compiled Truth（编译后的真相）** 核心机制。

- 作者：克军（OceanBase 前端工程师）
- 发布时间：2026-04-09
- 安装：`bun install -g ex-brain`（npm 地址：https://www.npmjs.com/package/ex-brain）
- 底层数据库：SeekDB

## 核心理念

知识库应该像人脑一样——每次写入新信息都自动"更新"认知，而非越记越多、越看越累。

现有工具的局限：
- **传统笔记**（Notion、Obsidian）：功能强大但不"消化"知识，三个月后笔记原封不动
- **AI 笔记**（Mem、Granola）：有 AI 整理但不可控，AI 怎么理解、归类、提取，用户无法控制

## 四大核心机制

### 1. 智能编译（Compiled Truth）

核心命令：`ebrain compile <slug> <信息> --source <来源> --date <日期>`

编译流程：
1. LLM 分析信息类型（状态变化 / 事件 / 事实更正）
2. 按类型选择处理策略：
   - **状态类**（融资阶段、CEO）→ 直接更新，旧值归入 History
   - **事实类**（成立年份、行业）→ 追加，不删旧
   - **事件类** → 同时记录到时间线
3. 输出结构化"当前真相"

编译后页面示例：
```
## Status
- Funding Stage: Series A (Source: meeting_notes, 2024-05-20)
- Valuation: ~$50M
## History
- 之前是 Seed（到 2024-05-20 为止）
## Facts
- A 轮领投方是 Sequoia
- 2020 年成立的
```

### 2. 时间线自动抽取

命令：`ebrain timeline extract <slug>`

- 从 Compiled Truth 和历史记录中自动提取结构化事件
- 支持多种日期格式（ISO、中文、英文、相对日期）
- 与编译机制深度集成：每次 compile 自动提取事件到时间线

### 3. 自动关联实体

- 利用 LLM 自动识别文本中的实体关系（founder_of、invested_in、CEO_of 等）
- 发现新实体时自动创建关联页面
- 知识网络在使用过程中自然生长

### 4. 混合检索（基于 seekdb）

- 底层使用 SeekDB 的混合搜索（向量 + 全文 + 标量过滤）
- 一条 SQL 同时利用向量相似度和 BM25 关键词匹配
- 多维度评分：语义匹配 85% + 新鲜度 10% + 类型权重 5%
- 支持 RRF（Reciprocal Rank Fusion）重排序和大模型 Rerank

## 技术架构

### 数据结构

| 表/集合 | 用途 |
|---------|------|
| pages | 存储知识页面（slug、标题、compiled_truth） |
| links | 存储实体间关联关系 |
| timeline_entries | 存储时间线事件 |
| ebrain_pages | 向量嵌入集合（语义检索） |

关系表和向量集合在同一套 seekdb 数据库中，ACID 事务保证一致性。

### MCP Server

内置 MCP Server，Claude 可直接读写知识库：
```json
{
  "mcpServers": {
    "ebrain": {
      "command": "ebrain",
      "args": ["serve"]
    }
  }
}
```

### 命令结构

采用 `resource verb` 模式，命令可预测：
- `ebrain put <slug> --content <内容>` — 写入页面
- `ebrain compile <slug> <信息>` — 编译知识
- `ebrain search <关键词>` — 精确搜索
- `ebrain query <问题>` — 语义查询
- `ebrain timeline list <slug>` — 查看时间线
- `ebrain serve` — 启动 MCP 服务

## 设计原则

| 原则 | 说明 |
|------|------|
| 本地优先 | 数据存储在本地 seekdb 文件，无需联网 |
| 完全可编程 | 所有操作可通过命令行执行，支持管道和 JSON 输出 |
| 幂等操作 | 重复执行 `put` 不产生副作用 |
| 命令统一 | `resource verb` 命名模式，降低学习成本 |

## 未来探索方向

- **冲突处理**：新旧信息矛盾时标记冲突，由用户确认
- **信息衰减**：长期未更新的信息可信度降低，标注"上次更新"提醒
- **关联传播**：一处更新，关联页面收到提醒但不自动修改
- **批量编译**：分批处理+增量合并，平衡效率与质量

## 与本 Wiki 的对比

| 维度 | 本 Wiki | ex-brain |
|------|---------|----------|
| 编译模式 | 手动（对话式 AI 处理） | `ebrain compile` 命令触发 |
| 知识更新策略 | AI 判断更新整页 | 按信息类型自动处理（状态→替换、事实→追加、事件→时间线） |
| 检索方式 | Obsidian 全文搜索 | seekdb 混合检索（向量+BM25） |
| 实体关联 | 手动 `[[双链]]` | LLM 自动识别关系并创建页面 |
| 时效性 | stale_score 人工审阅 | 信息衰减机制（设计方向） |
| 数据存储 | Markdown 文件 | seekdb 数据库文件 |
