---
title: AI Agent 技术综述
description: AI Agent 的核心三角、推理范式、关键协议（MCP/A2A）及 2026 框架对比
type: topic
created: 2026-04-13
updated: 2026-04-15
tags: [AI-Agent, MCP, A2A, ReAct, 多Agent协作, 框架对比]
related: [[mcp-ecosystem]], [[claude-code-architecture]], [[ai-coding-methodology]]
used_in: []
insights:
  - date: 2026-04-15
    summary: Context Engineering 取代 Prompt Engineering 不是口号，而是 Agent 可靠性的基础
keywords: [AI Agent, ReAct, Plan-and-Execute, MCP, A2A, 多Agent协作, 框架对比, 推理范式]
scenes:
  - 当我想系统了解 AI Agent 的核心架构时
  - 当我在对比主流 Agent 框架（Claude Code/LangGraph/CrewAI 等）时
  - 当我需要评估 MCP 与 A2A 两大协议的适用场景时
  - 当我在设计多 Agent 协作方案时
knowledge_type: periodic
review_cycle: 90
---

# AI Agent 技术综述

## Agent 核心三角

```
        推理框架
       /        \
    工具调用 --- 记忆系统
```

1. **推理框架**：ReAct / Plan-and-Execute / Reflexion
2. **工具调用**：Function Calling / MCP
3. **记忆系统**：短期 / 长期 / 工作记忆

## 推理范式对比

| 范式 | 核心思路 | 优势 | 适用场景 |
|------|---------|------|---------|
| ReAct | 思考→行动→观察循环 | 灵活、可解释 | 通用任务 |
| Plan-and-Execute | 先规划后执行 | 结构化、可控 | 复杂多步任务 |
| Reflexion | 自我反思+改进 | 持续优化 | 需要迭代的任务 |

## 两大协议

### MCP（Anthropic）
- 定位：模型-工具连接协议
- 类比：TCP/IP
- 支持：stdio / SSE / WebSocket 传输层

### A2A（Google）
- 定位：Agent-Agent 协作协议
- 类比：HTTP
- 目标：跨平台 Agent 互联互通

## 多 Agent 协作模式

1. **编排者-执行者**：中心化调度，适合流程固定场景
2. **对等协作**：Agent 间直接通信，适合创意探索
3. **层级管理**：Team Lead + Teammate 模式，适合大型项目

## 2026 主流框架

| 框架 | 厂商 | 特点 |
|------|------|------|
| Claude Code | Anthropic | 终端 Agent、异步执行 |
| LangGraph | LangChain | 图编排、状态机 |
| CrewAI | 开源 | 角色扮演、多 Agent |
| AutoGen | 微软 | 多 Agent 对话 |
| OpenAI Agents SDK | OpenAI | 官方 SDK |
| Google ADK | Google | 端到端开发 |

### Managed Agents 平台（新业态）

将 Agent 从"单兵执行器"升级为"团队成员"，具备看板、技能积累、自主执行能力。

| 平台 | Star | 特点 | 技术栈 |
|------|------|------|--------|
| Multica | ⭐7.2k | 开源、厂商中立（Claude/Codex/OpenClaw/OpenCode）、看板+技能+多工作区 | Next.js 16 + Go + PostgreSQL 17 (pgvector) |

与 [[anthropic-managed-agents|Anthropic Managed Agents]] 的区别：Anthropic 方案绑定 Claude 生态，Multica 厂商中立、可自部署（Apache 2.0）。适合 2-10 人小团队让 AI Agent 融入日常工作流。

## 关键趋势

1. **Context Engineering 取代 Prompt Engineering**：上下文管理成为核心竞争力
2. **Agent OS 化**：从单一工具到操作系统级平台
3. **从 Demo 到生产**：关注可靠性、安全、成本控制
