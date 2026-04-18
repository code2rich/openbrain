# CLAUDE.md — OpenBrain

OpenBrain 个人知识库，采用 Andrej Karpathy 的 LLM-Wiki 架构。

## 核心理念

### 1. AI 是知识管理员，不是搜索引擎

**不要把 AI 当作"更聪明的搜索引擎"，而要把它当作"永不疲倦的知识管理员"。**

搜索引擎每次都从零开始检索、临时综合。知识管理员在每次交互中完善知识体系——交叉引用已经建立，矛盾已经标记，综合已经完成。Wiki 随着每个来源、每个问题变得更丰富。

### 2. 知识编译，而非知识存储

从「原始文档」到「结构化知识」是一个**编译过程**：

```
raw 文件 → AI 阅读 → 提炼为实体/主题/对比页面 → 交叉引用 → index 索引
```

不是把文件"存起来"，而是把文件"编译"为可复用的知识单元。就像源代码被编译为可执行程序——知识被编译后才能被高效查询和消费。

### 3. 三层分离，各司其职

| 层 | 目录 | 性质 | AI 角色 |
|----|------|------|---------|
| 不可变真相层 | `00-raw/` | 原始资料，只读 | 只读取，永不修改 |
| 结构化知识层 | `99-wiki/` | AI 编译的产物 | 完全拥有，持续进化 |
| 知识输出层 | `100-output/` | 知识的消费产出 | 按需生成 |

**为什么分开？** 原始资料是「原料」，wiki 是「菜谱」，output 是「成品」。原料不可篡改，菜谱持续优化，成品按需产出。混淆层级会导致知识污染。

### 4. 复利效应：今天的探索 = 明天的基础设施

- 每次查询不是一次性消费，好的答案被保存为新页面
- 每次摄入不是简单索引，而是交叉引用的编织
- 知识被使用时记录 `used_in`，形成消耗闭环
- **未使用的知识是负债**——存储成本持续产生，却从未产出价值

### 5. 个人洞察 > 来源观点

Wiki 页面必须区分两类知识：
- **来源观点**：从 raw 文件提炼的外部信息（AI 处理）
- **个人洞察**（`insights`）：用户自己的判断、决策和反思

没有个人洞察的知识库只是剪报夹。个人洞察是这个知识库最不可替代的部分。

### 6. 知识有时效，管理需分层

| 类型 | 时效 | 审阅周期 | 示例 |
|------|------|---------|------|
| 恒久知识 | 永不过期 | 无需审阅 | 方法论、原理、人物介绍 |
| 周期知识 | 需定期审阅 | 90 天 | 工具评测、行业趋势、框架对比 |
| 临时知识 | 短命 | 30 天 | 版本特性、价格信息、workaround |

过时知识比没有知识更危险。周期和临时知识必须设置 `review_cycle`，通过 stale_score 机制自动触发审阅。

### 7. 如无必要，勿增实体

- 不要为小概念创建单独页面
- 页面只做一件事，避免膨胀
- 新的数据源统一放入 `00-raw/`，不新建顶层目录
- 工具和流程的复杂性必须与服务目的匹配

## 系统全貌

```
┌─────────────────────────────────────────────────────────────┐
│                     用户交互层                               │
│  Obsidian 本地编辑 ←→ Claude Code 对话 ←→ wikiapp Web UI    │
└───────┬──────────────────┬──────────────────┬───────────────┘
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────────────┐
│  00-raw/      │  │  99-wiki/     │  │  wikiapp              │
│  不可变真相层  │  │  结构化知识层  │  │  VitePress + D3.js    │
│  (AI 只读)    │  │  (AI 完全拥有) │  │  Docker :8080         │
│               │  │               │  │                       │
│ 01-Clippers/  │  │ 01-entities/  │  │ generate-sidebar.ts   │
│ 02-RSS/       │  │ 02-topics/    │  │ → VitePress build     │
│ 03-Manual/    │  │ 03-comparisons│  │ → serve 静态站点       │
│ 04-OpenClaw/  │  │ index.md      │  │                       │
│ 05-SyncDown/  │  │ log.md        │  │ ingest-api.ts         │
│ 06-Thoughts/  │  │               │  │ :3456 文件上传/加工    │
└───────────────┘  └───────────────┘  └───────────────────────┘
        │                  ▲                  ▲
        │     自动摄入管线  │                  │
        └──→ ingest.sh ───→┘──→ Git ─────────┘
             (launchd 每日 02:00)

┌─────────────────────────────────────────────────────────────┐
│  00-ai-repo/              AI 配置层                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 01_claude/    → 同步到 .claude/                      │    │
│  │   ├── CLAUDE.md (本文件源)                           │    │
│  │   ├── rules/       行为规则                          │    │
│  │   ├── skills/      自定义技能                        │    │
│  │   ├── agent/       自定义智能体                      │    │
│  │   └── teams/       团队定义                          │    │
│  │ 03_scripts/   sync-config.sh 增量同步                │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 关键组件

| 组件 | 职责 | 触发方式 |
|------|------|---------|
| `scripts/ingest.sh` | 检测 raw 新文件 → Claude CLI 处理 → 写入 wiki → Git 闭环 | launchd 定时 / 手动 |
| `wikiapp/` | Web 展示 + 摄入 UI + Lint API | Docker 容器 + 宿主机 API |
| `00-ai-repo/` | AI 配置源文件（CLAUDE.md、rules、skills、agents） | 手动编辑 + sync-config.sh 同步 |
| `.ingested` | 已处理文件追踪（原子性保证） | ingest.sh 自动维护 |
| `99-wiki/log.md` | 操作时间线（摄入/查询/归档/维护） | AI 每次交互更新 |

### 自动化闭环

```
素材进入 00-raw/ → AI 判断页面类型 → 创建/更新 wiki 页面
→ 更新 index.md + log.md → Git 提交推送 → wikiapp 重建展示
```

## 目录结构

```
├── 00-ai-repo/             # AI 配置和技能文件仓库
│   ├── 01_claude/          # Claude Code 配置源（同步到 .claude/）
│   │   ├── CLAUDE.md       # 本文件源（同步到项目根）
│   │   ├── agent/          # 自定义智能体 → .claude/agents/
│   │   ├── rules/          # 行为规则 → .claude/rules/
│   │   ├── skills/         # 自定义技能 → .claude/skills/
│   │   └── teams/          # 团队定义 → .claude/teams/
│   ├── 02_docs/            # 输出文档（按任务单组织）
│   └── 03_scripts/         # 脚本工具
│       └── sync-config.sh  # 增量同步配置到 .claude/
├── 00-raw/                 # 原始资料库（不可变真相层）
│   ├── 01-Clippers/       # 浏览器插件 Obsidian Web Clipper 剪藏的原始文章
│   ├── 02-RSS/            # RSS 订阅源
│   ├── 03-Manual/         # 手动维护的原始资料
│   ├── 04-OpenClaw/       # 公众号文章自动抓取（OpenClaw）
│   ├── 05-SyncDown/       # 同步下载的文件
│   └── 06-Thoughts/       # 个人思考碎片（按日期组织）
├── 99-wiki/                # AI 维护的结构化知识库
│   ├── index.md           # 页面目录（所有页面的索引 + 场景索引 + 知识空白）
│   ├── log.md             # 操作日志（摄入、查询、归档、维护时间线）
│   ├── 01-entities/       # 实体页面（人物、公司、产品、概念）
│   ├── 02-topics/         # 主题综述（某个领域的系统性总结）
│   └── 03-comparisons/    # 对比分析（不同方案、观点的横向比较）
├── 100-output/             # 知识输出（报告、文章、草稿）
├── wikiapp/                # Web 展示系统（VitePress + Docker）
└── scripts/                # 自动化脚本
    ├── ingest.sh           # 每日自动摄入管线
    └── sync-downloads.sh   # 下载文件同步
```

## 页面类型判断标准

摄入 raw 文件时，必须先判断应创建什么类型的页面。判断依据是**文件的核心内容**，而非文件格式或来源。

### 三种类型的本质区别

| 类型 | 回答的问题 | 核心特征 | 文件名格式 |
|------|-----------|---------|-----------|
| **实体** | "谁/什么？" | 有名字、有身份、有履历或特性 | `PascalCase.md` |
| **主题** | "怎么回事？" | 有体系、有多个子话题、需要系统性总结 | `kebab-case.md` |
| **对比** | "选哪个？" | 有对比维度、有适用场景分析、帮未来做决策 | `a-vs-b.md` |

### 判断流程

```
raw 文件的核心内容是什么？
│
├─ 围绕一个具体的人/公司/产品/工具/概念展开
│  → 创建实体页 (01-entities/)
│  例：文章讲 Karpathy 的观点 → andrej-karpathy.md
│  例：文章介绍 Claude Code 工具 → ClaudeCode.md
│
├─ 覆盖一个知识领域/方法论/业务模块
│  → 创建主题页 (02-topics/)
│  例：多篇文章讨论 Agent 架构 → ai-agent-overview.md
│  例：业务系统的整体设计 → asset-allocation-platform.md
│
├─ 讨论两个或多个方案的优劣取舍
│  → 创建对比页 (03-comparisons/)
│  例：RAG vs LLM-Wiki 哪个好 → rag-vs-llm-wiki.md
│  例：Cursor vs Claude Code 怎么选 → cursor-vs-claude-code.md
│
└─ 不确定时 → 默认创建主题页
```

### 一条 raw 可能产出多种页面

一个 raw 文件不一定只产出一个 wiki 页面。常见场景：

- **一篇介绍某工具的文章**：主要建实体页，但如果涉及与其他工具的对比，同时创建/更新对比页
- **一篇综述文章**：主要建主题页，但文中重点提到的人物/公司应创建/更新实体页
- **一篇对比评测**：主要建对比页，同时更新涉及的实体页

**判断原则**：先识别文件的"第一主题"，确定主页面类型，再检查是否需要辅助更新其他类型页面。

### 实体页面的触发信号

当一个名字/概念在 3 个以上不同 raw 文件中出现，但还没有对应的实体页，说明需要创建。

### 主题页面的触发信号

当同一个知识领域积累了 3 篇以上 raw 素材，或者发现自己反复查同一个问题时，创建主题页。

### 对比页面的触发信号

当面临"我该选 A 还是 B"的决策，或者多篇文章在讨论同一个争论时，创建对比页。对比页的核心价值不是罗列特性，而是**帮未来的自己做决策**。

## 四大工作流

### 1. 摄入 (Ingest)

当你添加新资料到 `00-raw/` 时：

1. AI 阅读全文，提取关键信息
2. 在 Wiki 中创建摘要页面
3. 更新 10-15 个相关的实体和主题页面
4. 在 `log.md` 中记录这次摄入

**格式**：
```
### 摄入 (Ingest)
- [file] 文件名 — 来源 — 关键要点
```

### 2. 查询 (Query)

当你需要了解某个复杂问题时：

1. AI 查阅 `99-wiki/index.md` 找到相关页面
2. AI 阅读这些结构化的综合页面
3. AI 生成答案（文档、对比表、图表）
4. **好的答案被保存为新的 Wiki 页面**

**格式**：
```
### 查询 (Query)
- [query] 问题 → 答案摘要
```

### 3. 归档 (Filing)

将查询结果归档回 Wiki。

今天你问的问题、AI 生成的分析、共同发现的洞察——这些成为 Wiki 的新页面。
**今天的探索 = 明天的基础设施。**

**格式**：
```
### 归档 (Filing)
- [file] 从查询归档的新页面 — 简要说明
```

### 4. 维护 (Lint)

定期让 AI 对 Wiki 进行健康检查：

- 不同页面之间有矛盾吗？
- 有被新资料推翻的旧观点吗？
- 有被频繁提及但缺少专门页面的概念吗？
- 有孤立页面（没有入链）吗？
- 有知识空白需要补充吗？
- **知识空白扫描** — 对比 `.raw-coverage`，识别有 raw 素材但未提炼的领域
- **时效性检查** — 计算 stale_score，标记需要审阅的页面
- **活跃度报告** — 统计从未被 `used_in` 引用的页面
- **暗线发现** — 扫描所有页面，找出语义相关但无双链的页面对
- **场景索引完整性** — 检查缺少 `scenes` 的页面
- **个人洞察覆盖率** — 检查缺少 `insights` 的页面，提醒补充

**格式**：
```
### 维护 (Lint)
- [lint] 发现的问题及处理
```

## 命名规范

### Wiki 页面

- 使用英文文件名，便于 AI 处理
- 实体页面：`PascalCase.md`（如 `Claude.md`, `AndrejKarpathy.md`）
- 主题页面：`kebab-case.md`（如 `llm-training-methods.md`）
- 对比分析：`a-vs-b.md`（如 `rag-vs-llm-wiki.md`）

### Raw 文件

- 保持原始来源的命名
- 添加时间戳：`原名_YYYY-MM-DD.md`

### Output 文件

- 格式：`输出类型-描述-日期.md`
- 示例：`article-AI知识库设计-2026.04.13.md`

## frontmatter 规范

所有 Wiki 页面应包含：

```yaml
---
title: 页面标题
description: 一句话描述
type: entity | topic | comparison | output
knowledge_type: permanent | periodic | ephemeral  # 知识时效分类
review_cycle: 90                                   # 审阅周期（天），permanent 为 null
created: YYYY-MM-DD
updated: YYYY-MM-DD
last_reviewed: YYYY-MM-DD                          # 上次人工审阅日期
tags: [tag1, tag2]
keywords: [关键词1, 关键词2]                        # 搜索关键词（比 tags 更细粒度）
scenes:                                            # 使用场景（自然语言）
  - 使用场景1
  - 使用场景2
related: [[相关页面]]
sources:                                           # 数据来源（raw 文件路径，相对于 vault 根目录）
  - 00-raw/01-Clippers/source-article.md
used_in:                                           # 知识消耗记录
  - output: 产出引用
    date: YYYY-MM-DD
insights:                                          # 个人洞察
  - date: YYYY-MM-DD
    summary: 个人洞察摘要
---
```

### 知识时效分类

| 类型 | knowledge_type | review_cycle | 示例 |
|------|---------------|--------------|------|
| 恒久知识 | permanent | null | 方法论、原理、经典论文、人物介绍 |
| 周期知识 | periodic | 90 | 工具评测、框架对比、行业趋势、协议生态 |
| 临时知识 | ephemeral | 30 | 版本特性、bug workaround、价格信息 |

时效判断规则：
- stale_score = (today - updated) / review_cycle
- < 0.7 → 新鲜 | 0.7~1.0 → 即将过时 | ≥ 1.0 → 需要审阅

## 规则

### 知识管理规则

1. **00-raw/ 不可修改** — AI 只读取，不修改原始资料（核心理念 3）
2. **99-wiki 持续进化** — 每次交互都在完善知识体系（核心理念 4）
3. **好的查询结果 → 100-output** — 知识输出后，再归档到 wiki
4. **定期 Lint** — 保持 Wiki 的健康度和一致性
5. **如无必要，勿增实体** — 不要为小概念创建单独页面（核心理念 7）
6. **新增数据源** — 新的原始资料来源统一放入 `00-raw/`，命名采用数字序号前缀
7. **知识三分法** — 恒久/周期/临时知识分别管理，周期知识必须设置 `review_cycle`（核心理念 6）
8. **个人洞察优先** — wiki 页面应区分「来源观点」和「个人洞察」，后者更有价值（核心理念 5）
9. **知识消耗追踪** — 知识被使用时记录 `used_in`，未使用的知识是负债（核心理念 4）
10. **数据溯源** — 每个 wiki 页面必须通过 `sources` 字段记录来源 raw 文件路径，保证知识可追溯

### 交互规则

11. **中文优先** — 所有回复和文档使用中文，代码注释必要时可用英文
12. **主动澄清** — 需求不明确时主动询问，不要猜测
13. **简洁输出** — 不总结已做的事，不添加未经请求的功能/重构/注释
14. **勿增实体** — 三行相似代码好过一个过早抽象

### 工程规则

15. **安全优先** — 不引入 OWASP Top 10 漏洞，发现不安全代码立即修复
16. **边界验证** — 只在系统边界验证（用户输入、外部 API），信任内部代码
17. **Git 规范** — 只在用户要求时 commit，不 force push main，不跳过 hooks

### Vault 保护规则

18. **wikiapp 不修改 99-wiki** — wikiapp 只读取，通过 `.wiki-preprocessed/` 预处理
19. **不手动编辑 generated** — `.vitepress/generated/` 全部自动生成
20. **wiki/ 是 symlink** — 指向 `.wiki-preprocessed/`

## AI 配置管理

### 配置层级

```
全局 ~/.claude/CLAUDE.md          # 用户级通用偏好
  ↓
项目根 CLAUDE.md                  # 本文件（项目级完整配置）
  ↓
.claude/rules/                    # 详细行为规则（从 00-ai-repo 同步）
  ↓
wikiapp/CLAUDE.md                 # 子项目级（wikiapp 组件约束）
```

### 配置同步

AI 配置源文件维护在 `00-ai-repo/01_claude/`，通过 `00-ai-repo/03_scripts/sync-config.sh` 增量同步到 `.claude/`：

| 源 (00-ai-repo/01_claude/) | 目标 | 同步策略 |
|---------------------------|------|---------|
| `CLAUDE.md` | 项目根 | 需手动确认 |
| `rules/*` | `.claude/rules/` | rsync --update 增量 |
| `skills/*` | `.claude/skills/` | rsync --update 增量 |
| `agent/*` | `.claude/agents/` | rsync --update 增量 |
| `teams/*` | `.claude/teams/` | rsync --update 增量 |

### 可用 Skills 参考

项目配置了 62 个技能，按用途分类：

| 分类 | 数量 | 核心技能 |
|------|------|---------|
| Obsidian 管理 | 13 | `/adopt` `/onboard` `/upgrade` `/search` `/check-links` |
| 内容采集处理 | 14 | `defuddle` `document-processor` `wechat-*` `xhs-*` |
| 项目管理 | 6 | `/project` `/prd` `/ralph` `/review` `/pipeline` |
| 研究实验 | 21 | `/ar:setup` `/ar:run` `ln-*` 系列（Epic→Story→Task 全流水线） |
| 日常管理 | 4 | `/daily` `/weekly` `/monthly` `goal-tracking` |
| 工具类 | 22 | `ci-cd-pipeline-builder` `json-canvas` `/push` `document-skills/*` |

详细技能清单见 `00-ai-repo/01_claude/CLAUDE.md`（本文件源）中的 Skills 索引节。
