---
title: Claude Code 源码架构
description: 基于 v2.1.88 源码泄漏和 45 章精华的 Claude Code 架构全景分析，涵盖 Harness Engineering、安全审查、记忆系统、上下文管理
type: topic
knowledge_type: periodic
review_cycle: 90
created: 2026-04-13
updated: 2026-04-18
last_reviewed: 2026-04-18
tags: [Claude-Code, AI-Agent, 架构设计, 源码分析, TypeScript, Harness-Engineering]
keywords: [Claude Code, 源码架构, SubAgent, 工具调用, Agent编排, 权限沙箱, 上下文管理, 流式处理, YOLO分类器, Harness Engineering, MCP token优化, 记忆系统]
scenes:
  - 当我在研究 Claude Code 的内部架构设计时
  - 当我想借鉴 Claude Code 的 Agent 循环和工具系统设计时
  - 当我需要理解上下文管理和 200K token 窗口的分配策略时
  - 当我在设计自己的 Agent 安全架构（权限、沙箱、审计）时
  - 当我想了解 Harness Engineering 的实践方法时
  - 当我需要优化 MCP 工具的 token 消耗时
related: [[claude-code-training]], [[ai-agent-overview]], [[ClaudeCodeBestPractice]], [[ClaudeMem]]
sources:
  - 00-raw/01-Clippers/Claude Code 源码泄漏：一鲸落，万物生.md
used_in: []
insights:
  - date: 2026-04-15
    summary: Claude Code 最值得借鉴的是上下文预算管理和精确字符串替换，这两个设计解决了 Agent 开发的核心痛点
  - date: 2026-04-18
    summary: Harness Engineering 的 60/40 法则揭示了 AI 产品的核心——模型能力是基础，但工程化 harness 才决定用户体验的上限。源码泄漏让起跑线重置，但踩过坑的 know-how 才是真正壁垒
---

# Claude Code 源码架构

## Harness Engineering：60% 模型 + 40% 工程

Anthropic 自己在源码提示词中写道：*"Claude Code 的成功不仅仅取决于模型质量。大约 60% 的用户体验来自模型本身，40% 来自你构建的 harness。"*

| 维度 | 模型能力（60%） | 工程管理（40%） |
|------|----------------|----------------|
| 职责 | 理解意图、生成代码、推理规划 | 系统提示词、工具权限、记忆管理、安全审查、上下文优化、错误恢复 |
| 特点 | 投入巨大、成果不可控 | 可控可迭代、真正的 know-how |

AI 模型如同一匹野马——能力强悍但幻觉和发散性不可控。Harness 就是缰绳和马鞍，将"不可控"变为"稳定可靠交付"。Claude Code 源码是 Harness Engineering 的活教材。

## 四层架构

```
终端 UI 层（React/Ink）
    ↓
Agent 引擎层（核心循环）
    ↓
服务层（认证/状态/配置）
    ↓
基础设施层（文件系统/沙箱/网络）
```

## Agent 核心循环（心脏）

```
while(true) {
  接收消息 → 调用 LLM → 解析响应 → 执行工具 → 注入结果 → 再次调用
}
```

用 AsyncGenerator 实现，支持流式输出和背压控制。

## 系统提示词动态拼接

提示词不是一整块字符串，而是由**模块化、可缓存的章节**在运行时组合为 `string[]` 数组。

### 静态部分

全球用户共享同一份缓存，包括：你是 Claude Code、不要编造数据、不要随意删文件、优先用专用工具、不要过度工程等。每一条都是踩坑后总结。

### 动态部分

根据项目配置（`.claude.md`）、用户偏好、MCP 工具、Git 仓库状态动态加载。每个用户甚至每个项目不同，让回答贴合具体场景。

### 双层缓存机制

| 层级 | 机制 |
|------|------|
| API 层 | 静态章节使用 `cacheScope: 'global'` 跨组织缓存 |
| 应用层 | 章节计算结果缓存到 `/clear` 或 `/compact` 命令 |

**Dynamic Boundary**：静态部分全球共享缓存 → 动态部分每用户独立加载。这条分界线同时解决了成本和定制化问题。

## 安全架构（四层纵深防御）

7 种权限模式，核心是 `auto` 模式（ML 分类器自动审批）。Shift+Tab 循环：`default → plan → acceptEdits → auto* → default`。

### 四层安全审查管线（permissions.ts）

每层可提前终止，按顺序执行：

**Layer 1：规则强制拒绝（alwaysDenyRules）**
- 检查黑名单规则（如 `Bash(*)`、`Agent(*)`）
- 命中即拒绝，流程终止，优先级最高

**Layer 2：规则强制询问（alwaysAskRules）**
- 命中则强制弹窗，无论当前模式
- **bypass-immune 设计**：敏感文件（`.gitconfig`、`.bashrc`、`.mcp.json`、`.claude.json`、`ssh/id_*`）即使在 `bypassPermissions` 模式下也必须询问用户

**Layer 3：Tool 自检权限（checkPermissions()）**
- 每个工具有独立权限逻辑（路径、命令、风险等级）
- 返回 `allow` / `ask` / `deny`

**Layer 4：模式路由决策（PermissionMode）**
- `dontAsk` → 全部拒绝（即"yolo"，反直觉但语义正确）
- `auto` → ML 分类器自动裁决
- `bypass` → 跳过剩余检查（但 Layer 1-2 已拦截真正危险操作）
- `default` → 弹出用户确认

> **关键洞察**：`bypassPermissions` 看似无所不能，实际只跳过了第四层的"询问"。前三层的规则拦截、敏感文件保护早已执行完毕。

### YOLO 分类器（Layer 4 核心）

独立 AI 分类器，有自己独立的系统提示词，与主 AI 上下文完全隔离。判断分三级：

| 判定 | 行为 |
|------|------|
| Allow | 安全，直接放行 |
| Soft Deny | 降级为需用户确认 |
| Hard Deny | 直接拦截，不可覆盖 |

**成本递增的快速路径**：
1. `acceptEdits` 条件检查（工作目录内安全编辑，无 AI 调用）
2. 安全工具白名单（只读工具，跳过分类器）
3. 触发 ML 分类器 API 调用

**拒绝追踪（Denial Tracking）**：连续拒绝 3 次或累计拒绝 20 次，从"自动拒绝"降级为"弹用户确认"。无头模式下直接抛出 `AbortError` 终止。

## 上下文管理（核心稀缺资源）

- 总窗口 200K token，有效可用约 167K
- 自动压缩在 85% 阈值触发
- 模块化组装：静态缓存层 + 动态注入层
- 跨会话记忆：工作记忆 / 项目记忆（CLAUDE.md）/ 用户记忆

### 结构化九段式压缩

压缩不是截断，而是用模板提取关键信息：

1. 核心请求 → 2. 关键概念 → 3. 文件与代码 → 4. 错误与恢复 → 5. 解决过程 → 6. 所有用户消息 → 7. 待办任务 → 8. 当前工作 → 9. 下一步指南

## 记忆系统：只记偏好，不记代码

代码会变化，记忆里存代码位置会在重构后变成误导。记忆只存人的判断与偏好，代码内容永远实时读取。

### 双引擎架构

**引擎一：实时提取（extractMemories）** — 每轮对话结束时运行

触发条件（三者同时满足）：AI 完成完整回答 + 满足 N 轮阈值 + 主 agent 本轮未直接写入记忆。启动 forked agent，继承父对话的 prompt cache，最多 5 轮（read → write）。提取四类：用户偏好、行为反馈、项目信息、外部资源引用。

**引擎二：autoDream 梦境整合** — 后台周期性整合

三门触发（成本递增）：时间门（≥24h）→ 会话门（≥5 新 session）→ 锁门（排他锁）。四阶段：

| 阶段 | 工作内容 |
|------|---------|
| Phase 1 — Orient | ls 记忆目录，读 MEMORY.md，浏览防重复 |
| Phase 2 — Gather | 优先读日志 → 漂移记忆 → 搜索 transcript |
| Phase 3 — Consolidate | 合并入已有文件，相对→绝对日期，删除被推翻的旧事实 |
| Phase 4 — Prune | 更新 MEMORY.md 索引，维持 <200 行 + ~25KB |

两个引擎共用权限沙箱：读操作无限制，Bash 仅只读，写操作仅限 memoryDir 内。

## MCP Token 四层优化

MCP 工具定义每个消耗几千 token，有实实在在的成本。源码做了四层优化：

| 层 | 机制 | 效果 |
|----|------|------|
| 懒加载 + ToolSearchTool | 默认 `defer_loading: true`，按需发现加载 | 未使用的 MCP 工具零 token 成本 |
| Tool Schema 缓存 | session 首次渲染锁定 schema 字节 | 防缓存抖动，保护 ~11K token 工具块 |
| MCP 指令 Delta 系统 | 用持久化 attachment 宣告变更，非重建注入 | system prompt 保持静态，cache 不被打断 |
| Deferred Token 追踪 | 区分 `isLoaded` / `isDeferred` 计量 | 未使用工具的"幽灵成本"不影响压缩决策 |

ToolSearchTool 三档模式：`tst`（始终懒加载）、`tst-auto`（超 10% 才懒加载）、`standard`（全预加载）。

## 搜索策略：不用 RAG，只用 Grep

没有 embedding、没有向量数据库。上下文窗口足够大（1M token），grep 正则精确无误匹配，本地搜索毫秒级响应。核心哲学：**与其把检索做复杂，不如让 AI 用自主能力决定怎么搜**。

## 工具系统

- **统一接口**：所有能力遵循同一 Tool 接口
- **精确字符串替换**：优于行号编辑，锚定内容而非位置
- **Shell 安全链**：AST 解析 → 权限控制 → 自动分类 → 沙箱隔离

## 多 Agent 协作

- **Swarm 架构**：Team Lead + Teammate 协调者模式
- **Git Worktree**：物理空间隔离
- **后台任务**：Agent 从"对话式工具"进化为"自动化平台"

### Coordinator Mode（源码中未发布）

并行管理多个工作智能体：`研究阶段 (Workers 并行) → 合成阶段 (Coordinator) → 实现阶段 → 验证阶段`

核心原则：*"Parallelism is your superpower. Workers are async. Launch independent workers concurrently whenever possible."*

## 隐藏功能（Feature Flags 中未发布）

| 功能 | 描述 |
|------|------|
| KAIROS | 永远在线的 Claude，日志系统 + 15 秒 Tick 提示 + Brief 模式 |
| ULTRAPLAN | 复杂规划卸载到远程 CCR 会话，Opus 4.6，最多 30 分钟思考 |
| Penguin Mode | 快速响应模式，通过 API Beta Headers 启用 |
| Buddy | Tamagotchi 风格终端宠物，确定性扭蛋系统，Legendary 1%，Shiny 0.01% |

## 七大架构模式总结

1. Agent 循环
2. 工具注册表
3. 权限中间件
4. 上下文预算
5. 多 Agent 委派
6. 流式处理
7. 渐进降级

## 生态工具

| 工具 | Star | 核心功能 | 技术栈 |
|------|------|---------|--------|
| [[ClaudeCodeBestPractice]] | ⭐43k | 69 个实战技巧集（Subagent、Hook、模型切换、CLAUDE.md 编写等） | 文档 |
| [[ClaudeMem]] | ⭐54k | 跨 session 上下文记忆，自动记录工具使用和代码改动 | 5 个 Lifecycle Hooks + SQLite + Chroma + MCP |

### 5 个最有价值的实践技巧

1. **不要 micromanage** — 给方向不给步骤，Claude 比你更懂代码结构
2. **用 Subagent 解决复杂问题** — main context >50% 时 `say "use subagents"` 分出去
3. **用 /model 切换模型** — Opus 做 plan/分析，Sonnet 写代码/执行
4. **用 Hook 自动格式化** — PostToolUse hook 处理最后 10% 的格式化
5. **每天读 changelog** — Claude Code 更新快，新功能藏在小版本里

### claude-mem 架构

`代码编写 → Hooks 自动记录 → SQLite 存储 → Chroma 语义索引 → 新 session 自动加载`

安装：`npx claude-mem install`。支持 `<private>` 标签过滤敏感内容，提供 Web UI（localhost:37777）可视化查看记忆。
