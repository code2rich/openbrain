---
title: Agent-Driven Development
description: 用 coding agents 构建 agents 的开发方法论，GitHub Copilot 团队的实践总结
type: topic
created: 2026-04-13
updated: 2026-04-18
tags: [ai-agents, github-copilot, development-methodology, automation]
related: [[coding-agents]], [[prompt-engineering]]
used_in: []
insights:
  - date: 2026-04-15
    summary: 用 Agent 开发 Agent 是正反馈循环，工具和产品互相增强
keywords: [Agent-Driven Development, Copilot CLI, coding agent, 自动化, Agent编排, CI/CD, GitHub Copilot]
scenes:
  - 当我想用 AI Agent 自动化重复性开发工作时
  - 当我在评估 Agent 驱动的开发方法论时
  - 当我需要给团队推广 AI 编码最佳实践时
  - 当我想了解如何用 Copilot 构建自动化工具链时
knowledge_type: permanent
review_cycle: null
---

# Agent-Driven Development

用 coding agents 构建 agents 来自动化部分工作的开发方法论。

## 核心问题

分析 coding agent 在 benchmark 上的表现涉及大量轨迹文件（`.json` 格式，每任务数百行，数百任务 × 每日多次 = 数十万行代码）。人工分析不可行，需要自动化。

## 解决方案

构建 `eval-agents` 工具链，用 GitHub Copilot CLI 自动化分析工作：
- **Coding agent**: Copilot CLI
- **Model**: Claude Opus 4.6
- **IDE**: VSCode
- **Accelerant**: Copilot SDK

## 三大核心策略

### 1. Prompting Strategies

对 agent 要像对工程师一样：

| 做法 | 说明 |
|------|------|
| 详细引导 | 不要 terse problem statement，要 verbose |
| 过度解释假设 | Guide its thinking, over-explain assumptions |
| 先规划后执行 | 用 `/plan` 模式先讨论，再切换 agent 模式 |

示例 prompt：
```
/plan I've recently observed Copilot happily updating tests to fit its new paradigms even though those tests shouldn't be updated. How can I create a reserved test space that Copilot can't touch or must reserve to protect against regressions?
```

### 2. Architectural Strategies

**重构 + 文档 + 测试比新功能更重要**。让 Copilot 容易导航，就像对新工程师一样。

- 重构文件名和目录结构
- 文档化新功能和模式
- 清理 dead code
- 编写测试用例

### 3. Iteration Strategies

从「trust but verify」进化到「**blame process, not agents**」：

- 把 agent 当作初级工程师
- 建立 guardrails 防止灾难性错误
- 出了问题 blame process，不 blame agent
- 添加新 guardrails 防止重复犯错

## 开发循环

```
1. /plan 规划新功能
   - 迭代直到完善
   - 确保包含测试
   - 确保文档在代码实现前完成

2. /autopilot 实现功能

3. Copilot Code Review
   request review → address comments → re-request → 直到无新评论

4. Human review 最终审核
```

## 自动化维护任务

定期让 Copilot 自动运行：

```bash
/plan Review the code for any missing tests, any tests that may be broken, and dead code
/plan Review the code for any duplication or opportunities for abstraction
/plan Review the documentation and code to identify any documentation gaps. Be sure to update the copilot-instructions.md
```

## 成果数据

> 5 人团队，3 天：
> - +11 个新 agents
> - +4 个新 skills
> - +28,858 / -2,884 行代码
> - 345 个文件

## 关键认知

**「让你成为优秀工程师和优秀队友的技能，同样让你成为优秀的 Copilot 构建者。技术是新的，原则不是。」**

类比初级工程师：
- 好好引导，给清晰上下文
- 建立 guardrails 防止灾难性错误
- 出了问题 blame process，不 blame agent

## CI/CD 原则

- **严格类型系统** — 确保 agent 符合接口
- **健壮的 linter** — 强制实现规范
- **集成/端到端/契约测试** — 用 agent assistance 降低构建成本

## 来源

- [Agent-driven development in Copilot Applied Science](https://github.blog/ai-and-ml/github-copilot/agent-driven-development-in-copilot-applied-science/) by Tyler McGoffin

## 多 Agent 协作工程化

Routa（Phodal）提出了比"更多 Agent 并行"更根本的问题：**单个 Coding Agent 已不是瓶颈，多 Agent 在同一工程体系里协同才是。** 核心公式：`Harness 工程 + Coding Agent + Kanban = AI 自动化研发工作台`。近 50 万行代码，几乎 100% AI 生成。
