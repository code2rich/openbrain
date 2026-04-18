---
title: Anthropic Managed Agents
description: Anthropic Harness 编排引擎，三层虚拟化架构的 Agent 基础设施
type: entity
created: 2026-04-13
updated: 2026-04-13
tags: [Anthropic, Claude, AI-Agent, Managed-Agents, Harness]
related: [[ai-agent-overview]], [[claude-code-architecture]]
used_in: []
insights:
  - date: 2026-04-15
    summary: Harness 三层虚拟化架构对大型平台有意义，但中型项目可能过度设计
keywords: [Anthropic, Managed Agents, Harness, 沙箱, Session, Agent编排, 虚拟化架构]
scenes:
  - 当我在评估 Agent 编排方案时
  - 当我需要了解 Anthropic 的 Agent 基础设施产品时
  - 当我想对比不同 Agent 平台的架构设计时
  - 当我在设计生产级 Agent 的安全隔离方案时
knowledge_type: periodic
review_cycle: 90
---

# Anthropic Managed Agents

## 产品定位

Anthropic 从"模型提供商"到"Agent 基础设施提供商"的战略转移。

## 三层虚拟化架构

| 层级 | 组件 | 职责 |
|------|------|------|
| 会话层 | Session | 持久日志、状态恢复 |
| 编排层 | Harness | Agent 编排循环 |
| 执行层 | Sandbox | 安全执行环境 |

三层完全解耦，可独立扩展。

## 核心能力

- 生产级沙箱
- 长时间 Session
- 多 Agent 协调
- 自评估机制
- 治理工具

## 性能数据

- p50 TTFT 下降约 60%
- p95 TTFT 下降超过 90%

## 定价

- 标准 token 费率
- $0.08/小时 Session 活跃时间
