---
title: Hermes Agent
description: 实现 Karpathy LLM Wiki 工作流的 Agent 工具，支持微信原生集成和多 Wiki 管理
type: entity
knowledge_type: periodic
review_cycle: 90
created: 2026-04-18
updated: 2026-04-18
last_reviewed: 2026-04-18
tags: [agent, knowledge-management, wechat, llm-wiki, karpathy]
keywords: [Hermes, Hermes Agent, 微信集成, LLM Wiki, iLink Bot, 知识库工具]
scenes:
  - 当我想通过微信直接使用 AI Agent 时
  - 当我在评估 LLM Wiki 的现成工具实现时
  - 当我需要一个支持多 Wiki 管理和合并的知识库工具时
related: [[llm-wiki]], [[andrej-karpathy]], [[personal-knowledge-system]], [[Graphify]]
sources:
  - 00-raw/01-Clippers/Hermes Agent 高级玩法：微信扫码即用 + LLM Wiki 知识库，打造你的数据飞轮.md
used_in: []
insights:
  - date: 2026-04-18
    summary: Hermes 是目前少数将 LLM Wiki 从「方法论」变成「开箱即用工具」的实现，微信集成降低了使用门槛
---

# Hermes Agent

Hermes Agent 是实现 Karpathy [[llm-wiki]] 工作流的 Agent 工具，核心特色是**微信原生集成**和**开箱即用的 LLM Wiki 管理**。

## 两大核心功能

### 1. 微信原生集成

通过腾讯 iLink Bot API 实现个人微信直连，无需公网端点或 Webhook，HTTP 长轮询即可。

**设置流程**（3 步）：

```bash
hermes gateway setup    # 选择 Weixin，扫码登录
# 配置 ~/.hermes/.env 中的 WEIXIN_ACCOUNT_ID
hermes gateway          # 启动网关
```

**支持能力**：

| 能力 | 说明 |
|------|------|
| 消息类型 | 私聊/群聊、图片/视频/文件/语音 |
| 加密传输 | AES-128-ECB CDN 媒体传输 |
| 格式适配 | Markdown 自动转微信可读（标题/表格/代码块） |
| 消息管理 | 智能分块（4000 字符）、去重（5 分钟窗口）、重试退避 |
| 访问控制 | open / allowlist / disabled / pairing 四种策略 |

### 2. LLM Wiki 知识库

完整实现 Karpathy 三层架构：

```
my-research/
├── raw/          # Layer 1: 不可变原始来源
├── wiki/         # Layer 2: Agent 生成的 Wiki
├── outputs/      # Layer 3: 日期化报告
├── CLAUDE.md     # Schema 配置
```

**三种核心操作**：

| 操作 | 说明 |
|------|------|
| Ingest（摄入） | 新来源丢进 raw/，Agent 自动提取知识、级联更新 10-15 个 Wiki 页 |
| Query（查询） | Agent 搜索 index.md，综合回答并附 `[[wiki-link]]`，好的回答反向写入 Wiki |
| Lint（维护） | 检查矛盾、过时声明、孤页、缺失交叉引用 |

**多 Wiki 管理**：支持创建多个 Wiki 无缝切换，可合并相关 Wiki（实测合并两个 Wiki 得到 27 页知识库）。

## RAG vs LLM Wiki（Hermes 视角）

| 维度 | RAG | LLM Wiki |
|------|-----|----------|
| 数据规模 | 数百万文档 | ~100 文档，~40 万字 |
| 架构复杂度 | 向量数据库 + embedding + chunking + rerank | 纯 markdown + index.md |
| 知识沉淀 | 无（每次从头检索） | 有（编译后持续更新） |
| 可审计性 | 黑盒向量，难以追溯 | 每条声明可追溯到 .md 文件 |
| 维护成本 | 需要专业 infra | Agent 自动维护 |
| 适用场景 | 企业级海量数据 | 个人/团队研究项目 |

## 关键数据

- Karpathy 的 Wiki 已达约 **100 篇文章、40 万字**——比大多数博士论文还长
- Karpathy 推文 16 小时内 **1600 万次浏览**
- 来源：[Hermes Wiki 教程](https://www.aivi.fyi/llms/hermes-wiki)

## 与本 Wiki 的关系

本 Wiki 采用相同的三层架构（00-raw / 99-wiki / 100-output），但使用 Claude Code 对话式处理而非 Hermes Agent。Hermes 的价值在于：

- **微信入口**：降低非技术用户的使用门槛
- **多 Wiki 管理**：支持按研究主题创建独立 Wiki 并合并
- **Obsidian 可视化**：Wiki 目录可直接用 Obsidian Graph 视图查看交叉引用网络
