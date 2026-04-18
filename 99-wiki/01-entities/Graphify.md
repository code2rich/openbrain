---
title: Graphify
description: 代码库即知识图谱，tree-sitter AST + Claude 语义双通道架构的 AI 长期记忆工具
type: entity
knowledge_type: periodic
review_cycle: 90
created: 2026-04-18
updated: 2026-04-18
last_reviewed: 2026-04-18
tags: [knowledge-graph, code-analysis, tree-sitter, Claude, AI-tools]
keywords: [Graphify, 知识图谱, AST, tree-sitter, 代码分析, 社区检测, Leiden, token压缩, MCP]
scenes:
  - 接手新代码库时，快速了解核心节点和模块关系
  - 维护论文+笔记+代码混合知识库，发现隐性关联
  - 大项目日常导航，让 AI 助手搜索前先看图谱摘要
  - 评估代码库分析工具选型时
related: [[llm-wiki]], [[mcp-ecosystem]], [[claude-code-architecture]], [[personal-knowledge-system]], [[CodeFlow]]
sources:
  - 00-raw/01-Clippers/graphify：代码库即知识图谱，AI 助手的长期记忆层.md
  - 00-raw/01-Clippers/graphify：代码库即知识图谱，AI 助手的长期记忆层 1.md
  - 00-raw/01-Clippers/Graphify-让Karpathy方法构建的知识库实现71.5倍效率提升.md
  - 00-raw/01-Clippers/Graphify-让AI读懂你的代码，并且迭代优化，形成复利.md
used_in: []
insights:
  - date: 2026-04-18
    summary: Graphify 的 AST+LLM 双通道设计是务实工程取舍——代码走确定性提取不花 token，只有文档图片才调 LLM，混合语料场景性价比最高
---

# Graphify

作者 wsleepybear，2026 年 4 月发布。把代码库、论文、截图等混合语料编译为可查询的知识图谱。作为 Claude Code 的 skill.md 技能插件运行——本质是一份配置文件，Claude Code 读取后按定义的管线流程逐步执行。

## 核心架构：双通道提取

| 通道 | 处理对象 | 技术 | LLM 依赖 |
|------|---------|------|----------|
| 确定性提取 | 代码文件（20 种语言） | tree-sitter AST 遍历 | 零 API 调用 |
| 语义提取 | 文档、论文、PDF、截图 | Claude 子代理并行处理 | 需要 API 调用 |

提取结果合并进 NetworkX 图，用 Leiden 算法做社区检测。聚类基于图拓扑结构，**不需要向量嵌入**。

## 三种输出

| 输出 | 格式 | 用途 |
|------|------|------|
| `graph.html` | 可交互可视化 | 点击节点、搜索、按社区筛选 |
| `GRAPH_REPORT.md` | 纯文本报告 | 核心节点、意外关联、建议问题 |
| `graph.json` | 持久化数据 | 后续查询不重读原始文件 |

## 诚实审计机制

每条边标注来源和置信度：

| 标记 | 含义 | 置信度 |
|------|------|--------|
| `EXTRACTED` | 从源码/文件直接发现 | 1.0 |
| `INFERRED` | LLM 推理，合理但不保证 | 0-1 分数 |
| `AMBIGUOUS` | 需人工审查 | 待定 |

代码-代码边标记 `EXTRACTED`，跨文件语义关联标记 `INFERRED/0.7`，不混为一谈。

## 超边（Hyperedges）

表达 3 个以上节点的群组关系，普通两两边无法表达：

- 一组类共同实现一个协议
- 认证链路中的一组函数
- 论文某节中多个概念共同组成一个想法

超边使图谱能表示多对多关系，而非仅一对一/一对多。

## 性能

- **Token 压缩**：52 个文件（代码+论文+图片）实测 **71.5x** 减少
- 首次 run 花 token 建图，后续查询只读压缩图谱
- SHA256 缓存 + `--update` 增量更新，只处理变更文件
- 6 个文件的小项目压缩比接近 1:1，52+ 文件的混合语料才是发力区间

## 平台集成

支持 9 个 AI 编程助手，每个用原生拦截机制：

| 平台 | 集成方式 |
|------|---------|
| Claude Code | CLAUDE.md 规则 + settings.json PreToolUse hook |
| Codex | Bash PreToolUse hook |
| OpenCode | `tool.execute.before` 插件 |
| Cursor | `.cursor/rules` + `alwaysApply` |
| Gemini CLI | BeforeTool hook |
| OpenClaw, Factory Droid, Trae 等 | 各自原生机制 |

Claude Code 安装后，每次 Glob/Grep 前自动提示先读 `GRAPH_REPORT.md`。

## 实用功能

### 命令行查询（不需要 AI 助手）

```bash
graphify query "auth flow" --dfs          # 深度优先追踪
graphify path "DigestAuth" "Response"     # 最短路径
graphify explain "SwinTransformer"        # 概念解释
```

`query` 支持 BFS（广度优先，了解上下文）和 DFS（深度优先，追踪路径），`--budget` 限制输出 token。

### MCP 服务器

```bash
python -m graphify.serve graphify-out/graph.json
```

暴露 7 个工具：`query_graph`、`get_node`、`get_neighbors`、`get_community`、`god_nodes`、`graph_stats`、`shortest_path`。

### 其他

- **watch 模式**：代码改动即时触发 AST 重建（无 LLM 消耗），文档改动提示手动 `--update`
- **Obsidian vault 导出**（`--obsidian`）：为每个社区生成 Markdown + index.md
- **外部资源添加**：`graphify add <url>` 直接将论文、推文等加入图谱，`--author`/`--contributor` 标注来源
- **Git hooks**：post-commit / post-checkout 自动重建图谱
- **Neo4j**：导出 Cypher 脚本或直推运行实例

## 适用场景

| 角色 | 场景 |
|------|------|
| 个人开发者 | 维护 /raw 文件夹（论文+笔记+截图）、快速理解新接手的代码库、准备技术分享材料 |
| 企业团队 | 新成员 onboarding、架构审查与依赖分析、识别 God Nodes（高度耦合模块）、发现跨模块隐式依赖 |
| 研究学者 | 构建论文知识图谱、跨论文发现隐藏关联、提取设计动机、生成研究综述素材 |

## 源码结构与管线设计

6 个独立模块，每个模块单一职责：

```
graphify/
  ├── skill.md      # 技能插件定义（Claude Code 读取执行）
  ├── extract.py    # 双通道提取（AST + 语义）
  ├── build.py      # 图构建 + 节点去重
  ├── cluster.py    # Leiden 社区检测
  ├── analyze.py    # 上帝节点分析、惊人连接
  ├── report.py     # GRAPH_REPORT 生成
  └── export.py     # 多格式导出（HTML、JSON、Obsidian）
```

**无副作用设计**：模块间通过 Python 字典和 NetworkX 图通信，无共享状态。所有输出只写入 `graphify-out/`，不污染源代码目录。可选择性执行管线阶段（如 `--cluster-only` 从已有 graph.json 只跑社区检测）。

### LLM 子代理提示词

语义提取阶段，Claude Code 并行调度子代理处理每个文件块，子代理收到的提示词结构：

```
你是 graphify 的提取子代理。
读取以下文件，提取知识图谱片段。
只输出 JSON，不要其他内容。

关系分类：
- EXTRACTED：直接能从源码看到的
- INFERRED：合理推断的
- AMBIGUOUS：不确定的，标出来

图片要描述内容：
- UI 截图：布局、设计决策、关键元素
- 图表：指标、趋势、数据来源
- 架构图：组件和连接关系
```

### 反馈回路

`/graphify query` 的问答结果自动保存到 `graphify-out/memory/`。下次 `--update` 时，历史 Q&A 被当作图谱节点提取。用得越多图谱越精准——每次问答都在校准 AI 对代码库的理解。

## 超越代码的应用

Graphify 的核心逻辑（提取关系→建图→基于图查询）不限于代码：

- **文献知识图谱**：读完 200 篇论文，发现跨论文隐性关联
- **产品概念图谱**：梳理需求文档，提取核心概念和依赖
- **技术债务图谱**：可视化债务模块间的耦合关系

## 与传统 RAG 的对比

| 维度 | 传统 RAG | Graphify |
|------|---------|----------|
| 核心结构 | 向量数据库 + 文本块 | 知识图谱 + 社区结构 |
| 相似性 | Embedding 余弦相似度 | 图拓扑边密度（Leiden） |
| 关系表达 | 隐式（向量接近） | 显式（带类型和置信度） |
| 多跳推理 | 困难（需多次检索） | 自然（图遍历） |
| 可解释性 | 低（黑盒） | 高（显式边 + 源位置） |
| 外部依赖 | 向量数据库服务 | 纯本地（NetworkX） |
| 代码隐私 | 可能需上传 | AST 完全本地处理 |

## 注意事项

- 语义提取依赖 LLM API 调用，首次 run 有成本，文档/图片越多越贵
- PyPI 包名 `graphifyy`（双 y）
- 社区检测质量依赖边密度，文件 < 10 效果有限
- 迭代极快（0.3.14→0.3.24 两天 11 个版本），API 可能有变动

## 与 LLM-Wiki 的互补关系

| 维度 | Graphify | LLM-Wiki |
|------|----------|----------|
| 侧重点 | 图结构（节点-边-社区） | 文档结构（实体-主题-对比） |
| 擅长 | 代码库分析、多跳推理 | 知识管理、长期积累 |
| 输出 | 图谱 + 报告 | 结构化 Wiki 页面 |
| 互补用法 | Graphify 做初步图谱发现 | LLM-Wiki 做深度知识提炼 |
