---
title: Mcp
description: mcp
type: entity
knowledge_type: permanent
review_cycle: null
created: 2026-04-16
updated: 2026-04-16
tags:
  - protocol
  - ai-architecture
  - integration
keywords:
  - Model Context Protocol
  - mcp
  - 数据连接
  - AI 接口
scenes:
  - 构建知识库问答系统
  - 开发 AI 智能体
  - 外部数据源集成
related:
  - ai-agent-overview
  - llm
  - api
sources: []
insights: []
---

# MCP (Model Context Protocol)

## 简介
MCP 是 **Model Context Protocol**（模型上下文协议）的缩写。它是一种开放标准，旨在连接 AI 应用（如 LLM 应用、Agent）与数据源（如文件系统、数据库、API 工具）。通过 MCP，开发者可以构建能够实时访问和查询外部知识上下文的 AI 智能体，从而突破模型预训练知识的局限性，实现更精准的问答和任务执行能力。

## 关键信息

### 核心定义
- **全称**：Model Context Protocol
- **主要用途**：为 AI 智能体提供标准化的外部数据访问接口。

### 核心价值
1. **标准化连接**：提供统一的协议，减少针对不同数据源开发定制适配器的成本。
2. **动态上下文**：允许 AI 模型在运行时动态拉取相关信息，增强回答的准确性和时效性。
3. **解耦架构**：将数据获取逻辑与模型推理逻辑分离，便于系统的扩展和维护。

### 典型应用场景
- **RAG（检索增强生成）系统**：作为检索层，从知识库中提取相关文档片段。
- **工具调用**：连接 Agent 与外部工具（如搜索引擎、计算器），实现任务自动化。
- **企业知识集成**：将企业内部数据库或文档系统与 AI 助手对接。

## 相关页面
- [[ai-agent-overview]]：概述了 MCP 在 AI 智能体架构中的应用位置。
