---
title: Claude Code Best Practice
description: GitHub 43K star 的 Claude Code 实战技巧集合，69 个来自官方团队的实战经验
type: entity
knowledge_type: periodic
review_cycle: 90
created: 2026-04-18
updated: 2026-04-18
last_reviewed: 2026-04-18
tags: [claude-code, developer-tools, best-practices, open-source]
keywords: [claude-code-best-practice, claude code 技巧, shanraisshan, subagent, hook, CLAUDE.md]
scenes:
  - 提升 Claude Code 使用效率时查阅最佳实践
  - 团队推广 Claude Code 时作为培训参考
  - 遇到 Claude Code 使用瓶颈时寻找优化方向
related: "[[ClaudeMem]], [[claude-code-architecture]], [[claude-code-training]], [[ai-coding-methodology]]"
sources:
  - "00-raw/01-Clippers/让Claude Code效率翻倍：GitHub上最火的两个Claude Code工具（97K star）.md"
insights:
  - date: 2026-04-18
    summary: "不要 micromanage"是使用 Claude Code 最重要的原则——给方向不给步骤，与 VibeCoding 理念一脉相承。Subagent 是处理复杂任务的利器，但触发方式不够直觉（需手动 say "use subagents"）。
---

## 基本信息

| 属性 | 值 |
|------|-----|
| 项目名 | claude-code-best-practice |
| 仓库 | `shanraisshan/claude-code-best-practice` |
| Star | 43K |
| 作者 | @shanraisshan |
| 定位 | Claude Code 实战技巧集合 |
| 内容量 | 69 个技巧 |
| 特色 | 整理自官方团队 Boris Cherny、Thariq Latta、Cat Wu 等人的实战经验 |
| 许可证 | 开源 |

## 核心价值

将 Claude Code 官方团队的散落经验系统化为可操作的 69 个技巧，覆盖从基础用法到高级编排的全链路。

## 最有价值的 5 个技巧

### 1. 不要 micromanage

给方向，不给步骤。Claude 比你更懂代码结构。

```
❌ "先写这个函数，然后调用它，然后测试..."
✅ "实现用户登录功能，包括注册、登录、登出"
```

### 2. 用 Subagent 解决复杂问题

Main context 快满时（>50%），用 `say "use subagents"` 把任务分出去。Subagent 在独立 context 工作，结果汇总给 main session。

### 3. 用 /model 切换模型

| 模型 | 适用场景 |
|------|---------|
| Opus | Plan mode、复杂分析 |
| Sonnet | 写代码、执行任务 |

### 4. 用 Hook 自动格式化

配置 PostToolUse hook，Claude 写完代码后自动 format。解决 AI 生成代码最后 10% 的格式化问题。

### 5. 每天读 changelog

Claude Code 更新非常快，新功能常藏在小版本里。

## 技巧覆盖范围

- Commands vs Agents vs Skills 的使用场景
- 如何写好 CLAUDE.md
- MCP 服务器配置
- 多 Agent 协作
- 定时任务
- Chrome 浏览器自动化
- PR Review 自动分析
- 权限管理

## 快速上手

```bash
# 直接读 README 或克隆项目
git clone https://github.com/shanraisshan/claude-code-best-practice
```

## 与相关工具配合

| 搭配工具 | 效果 |
|---------|------|
| [[ClaudeMem]] | best-practice 教「怎么用」，claude-mem 让「怎么记住」 |
| [[claude-code-architecture]] | 从源码层面理解 Claude Code 的设计思想 |
| [[ai-coding-methodology]] | 更宏观的 AI 编码方法论框架 |
