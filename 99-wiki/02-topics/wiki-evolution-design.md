---
title: Wiki 进化设计
description: 六大缺失功能的详细设计方案：场景召回、消耗闭环、时效感知、空白可视化、思考捕获、暗线发现
type: topic
created: 2026-04-13
updated: 2026-04-13
tags:
  - wiki
  - 知识管理
  - 架构设计
  - 进化
related: '[[personal-knowledge-system]], [[llm-wiki]], [[auto-ingest-pipeline]]'
---
## 知识空白

以下领域有 raw 素材但尚未提炼为 wiki 页面：

| 领域 | raw 数量 | 最近更新 | 建议 |
|------|---------|---------|------|
| 资产配置 3.0 | 87篇 | 2026-04-13 | 待补充细节 |
| 密钥管理 | 2篇 | - | 跳过（含敏感凭证） |

_数据来源：`.raw-coverage` 自动生成_

#### 3. Lint 增强

在现有 Lint 流程中新增检查项：

- **覆盖率扫描**：对比 raw 文件列表与 `.raw-coverage`，列出 `pending` 状态的文件
- **领域聚合**：按 raw 子目录或 tag 聚合 pending 文件，识别"有素材没提炼"的领域
- **建议生成**：对 pending 文件超过 5 篇的领域，建议创建新 topic 页面

#### 4. Ingest 流程适配

`ingest.sh` 处理完新文件后，自动更新 `.raw-coverage`（在现有 `.ingested` 基础上扩展）。

### 影响范围

| 变更 | 文件 | 说明 |
|------|------|------|
| 新增 | `.raw-coverage` | raw 覆盖率追踪文件 |
| 修改 | `index.md` | 新增 `## 知识空白` 区域 |
| 修改 | `CLAUDE.md` | Lint 流程增加覆盖率检查 |
| 修改 | `scripts/ingest.sh` | 处理后更新 `.raw-coverage` |

---

## P0-2：个人思考捕获

**问题**：只有外部资料→AI 提炼，缺少"我的观点"的记录入口。没有自己观点的知识库只是剪报夹。

### 设计方案

#### 1. 新增 Thoughts 目录

```
00-raw/06-Thoughts/           # 个人思考碎片
    └── 2026-04-13.md         # 按日期组织，一天一个文件
```

为什么放在 `00-raw/` 而不是单独建目录？
- 符合现有架构：`00-raw/` 是"不可变真相层"，个人思考也是一种 raw
- Ingest 流程无需改动：Thoughts 文件会被自动摄入
- 命名对齐：`06-` 延续数字前缀

#### 2. 思考文件模板

```markdown
---
type: thought
date: 2026-04-13
tags: [标签]
---

# 思考 2026-04-13

## 碎片

- 关于 Agent 编排：我认为 Harness 的三层虚拟化太重了，实际项目用两层就够了
- 关于知识管理：wiki 最大的价值不是存东西，而是让你"找得到"+"用得上"

## 待整理

- [ ] Agent 编排层次的问题，值得写一篇对比
```

设计要点：
- **碎片格式自由**：一句话、一段话、一个 bullet 都行，降低输入门槛
- **待整理区**：标记值得展开的思考，下次 Ingest 时 AI 可以将其提炼为独立 wiki 页面
- **按日期归档**：不需要给每个思考单独建文件，一天一个即可

#### 3. Wiki 页面区分「来源观点」与「个人洞察」

在 wiki 页面中，用明确的分区区分两类知识：

```markdown
# AI Agent 技术综述

## 核心概念
（AI 从 raw 提炼的结构化知识）

## 个人洞察

- **编排层次的选择**：对于中型项目（5-20 个 Agent），两层编排（规划+执行）比三层更实际。
  三层虚拟化（Anthropic Harness）适合大型平台，但引入了不必要的复杂度。
  — *2026-04-13*

- **MCP 的真正价值**：不在于协议本身，在于它让 Agent 能"发现"工具。
  Tool Search 比 Tool Call 更有颠覆性。
  — *2026-04-13*
```

#### 4. Frontmatter 扩展

```yaml
insights:
  - date: 2026-04-13
    summary: 两层编排比三层更实用
    source: [[06-Thoughts/2026-04-13]]
```

### 影响范围

| 变更 | 文件 | 说明 |
|------|------|------|
| 新增 | `00-raw/06-Thoughts/` | 思考目录 |
| 新增 | `90-附件/template-thought.md` | 思考文件模板（可选） |
| 修改 | `CLAUDE.md` | frontmatter 规范增加 `insights` 字段 |
| 修改 | wiki 页面 | 各页面增加 `## 个人洞察` 区块 |

---

## P1-1：场景化召回

**问题**：index.md 是静态的名称索引，缺少"我记得看过…但找不到"的语义入口。

### 设计方案

#### 1. Frontmatter 增加 `keywords` 和 `scenes`

```yaml
keywords: [Agent, 编排, Harness, 三层架构, 虚拟化]
scenes:
  - 当我在评估 Agent 编排方案
  - 当我想了解 Anthropic 的 Agent 基础设施
  - 当我需要设计多层 Agent 系统架构
```

- `keywords`：AI 提取的搜索关键词（比 tags 更细粒度）
- `scenes`：用户会在什么场景下需要这个知识（自然语言，3-5 条）

#### 2. index.md 新增「按场景查找」

```markdown
## 按场景查找

| 场景 | 相关页面 |
|------|---------|
| 评估 Agent 编排方案 | [[anthropic-managed-agents]], [[ai-agent-overview]] |
| 给团队推 AI 编码 | [[ai-coding-methodology]], [[claude-code-training]] |
| 选知识管理方案 | [[rag-vs-llm-wiki]], [[llm-wiki]], [[personal-knowledge-system]] |
| 了解 MCP 生态 | [[mcp-ecosystem]], [[ai-agent-overview]] |
| 搭建数据血缘系统 | 待建立 |
| 读书方法与知识内化 | [[reading-methodology]], [[llm-wiki]] |
```

#### 3. Ingest 流程适配

新建 wiki 页面时，AI 自动：
1. 从内容提取 5-10 个 `keywords`
2. 模拟用户视角生成 3-5 条 `scenes`
3. 更新 index.md 的「按场景查找」区域

#### 4. Query 流程增强

查询时，AI 先扫描「按场景查找」区域做模糊匹配，再结合全文搜索，提升召回率。

### 影响范围

| 变更 | 文件 | 说明 |
|------|------|------|
| 修改 | `CLAUDE.md` | frontmatter 规范增加 `keywords`、`scenes` |
| 修改 | `index.md` | 新增 `## 按场景查找` 区域 |
| 修改 | 所有 wiki 页面 | 补充 `keywords` 和 `scenes` 字段（可由 Lint 批量补充） |

---

## P1-2：时效性感知

**问题**：快消知识（趋势、工具评测）没有过期机制，过时知识比没有知识更危险。

### 设计方案

#### 1. 知识三分法

| 类型 | `knowledge_type` | `review_cycle` | 示例 |
|------|-----------------|----------------|------|
| 恒久知识 | `permanent` | `null`（永不过期） | 方法论、原理、经典论文 |
| 周期知识 | `periodic` | `90`（天） | 工具评测、框架对比、行业趋势 |
| 临时知识 | `ephemeral` | `30`（天） | 版本特性、bug workaround、价格信息 |

#### 2. Frontmatter 扩展

```yaml
knowledge_type: periodic    # permanent | periodic | ephemeral
review_cycle: 90            # 天数，permanent 为 null
last_reviewed: 2026-04-13   # 上次人工审阅日期
```

#### 3. 时效性判断规则

```
stale_score = (today - updated) / review_cycle

stale_score < 0.7  → ✅ 新鲜
0.7 ≤ stale_score < 1.0  → ⚠️ 即将过时
stale_score ≥ 1.0  → 🔴 需要审阅
```

#### 4. Lint 增强

在 Lint 流程中新增：

- **过期扫描**：列出所有 `stale_score ≥ 0.7` 的页面
- **审阅提醒**：对 `stale_score ≥ 1.0` 的页面，在 log.md 中记录提醒
- **自动降级**：对长期未审阅的 periodic 知识，在页面头部插入过时警告：

```markdown
> ⚠️ **时效性提醒**：此页面已 120 天未更新（建议 90 天审阅一次）。
> 如有新资料请重新摄入，或标记 `last_reviewed` 确认内容仍然准确。
```

#### 5. Wikiapp 展示增强（远期）

在 wikiapp 中对过时页面显示时效标签（视觉提示）。

### 影响范围

| 变更 | 文件 | 说明 |
|------|------|------|
| 修改 | `CLAUDE.md` | frontmatter 增加 `knowledge_type`、`review_cycle`、`last_reviewed` |
| 修改 | 所有 wiki 页面 | 补充分类字段（可由 Lint 批量补充分类） |
| 修改 | `CLAUDE.md` | Lint 流程增加时效性检查 |

---

## P2-1：消耗闭环

**问题**：知识没有被使用的记录，100-output 为空，知识存了但从没产出。

### 设计方案

#### 1. Frontmatter 增加 `used_in`

```yaml
used_in:
  - output: [[article-agent-architecture-2026.04]]
    date: 2026-04-15
    context: 撰写 Agent 架构文章时引用了编排模式部分
  - output: 工作汇报-2026Q2
    date: 2026-04-20
    context: 团队 AI 编码提效汇报中引用了 AIGC 趋势数据
```

设计要点：
- `output` 可以是 `100-output/` 中的文件，也可以是外部场景（工作汇报、会议讨论）
- `context` 记录用了这个知识的哪个部分，方便日后回顾

#### 2. 知识活跃度指标

```
活跃度 = last_used 距今天数
未使用天数 = created 至今从未 used_in
```

Lint 时生成活跃度报告：

```markdown
## 知识活跃度报告

| 页面 | 状态 | 未使用天数 | 建议 |
|------|------|-----------|------|
| [[claude-code-architecture]] | 活跃 | 3天前用过 | - |
| [[reading-methodology]] | 闲置 | 20天 | 考虑是否仍有价值 |
| [[mergetopus]] | 从未使用 | 30天 | 工具类知识，用不到可降级 |
```

#### 3. Output 文件规范

在 `100-output/` 中创建文件时，frontmatter 标注引用来源：

```yaml
---
title: Agent 架构选型指南
type: output
created: 2026-04-15
sources:
  - [[anthropic-managed-agents]]
  - [[ai-agent-overview]]
  - [[ai-coding-methodology]]
---
```

这样 `used_in` 和 `sources` 形成双向追踪。

### 影响范围

| 变更 | 文件 | 说明 |
|------|------|------|
| 修改 | `CLAUDE.md` | frontmatter 增加 `used_in`；output 规范增加 `sources` |
| 修改 | `CLAUDE.md` | Lint 增加活跃度报告 |
| 新增 | `100-output/` | 使用时创建产出文件（非现在） |

---

## P2-2：暗线发现

**问题**：只能发现"我知道我知道的"，缺少"我不知道这两件事有关系"的意外发现。

### 设计方案

#### 1. 暗线发现机制

在 Lint 流程中增加「暗线扫描」步骤：

```
输入：所有 wiki 页面的 (title, tags, keywords, content摘要)
处理：
  1. 计算页面间的 tag/keyword 重叠度
  2. 对重叠度 > 阈值 但无 [[双链]] 的页面对，标记为"潜在暗线"
  3. AI 审查候选暗线，过滤掉"标签碰巧相同但语义无关"的假阳性
输出：暗线发现报告 → 写入 log.md
```

#### 2. 暗线评分

```
暗线分 = tag_overlap * 0.3 + keyword_overlap * 0.3 + 场景相似度 * 0.4

tag_overlap = 共同 tags 数 / max(tags_A, tags_B)
keyword_overlap = 共同 keywords 数 / max(keywords_A, keywords_B)
场景相似度 = AI 语义判断（0/1）
```

阈值：暗线分 > 0.4 且无直接 `related` 链接 → 列入候选。

#### 3. 发现报告格式

在 log.md 中记录：

```markdown
### 暗线发现 (Hidden Links)

- [[ai-agent-overview]] ↔ （待发现）
  关联：Agent 编排模式可应用于业务平台的智能化改造
  建议：在相关平台页面增加 Agent 应用章节

- [[team-management]] ↔ [[ai-coding-methodology]]
  关联：AIGC 编码提效是团队管理的新抓手
  建议：在 team-management 增加 AI 时代的团队管理章节
```

#### 4. 用户决策

暗线发现后，用户可以选择：
- **采纳**：AI 自动添加 `related` 链接
- **深化**：创建新的 comparison 页面或补充现有页面
- **忽略**：记录为"已忽略"，后续不再提示

### 影响范围

| 变更 | 文件 | 说明 |
|------|------|------|
| 修改 | `CLAUDE.md` | Lint 流程增加暗线扫描步骤 |
| 修改 | `log.md` | 记录暗线发现 |

---

## 实施路线

```
Phase 1（P0 — 本周）：
  ├── 知识空白可视化：创建 .raw-coverage + index.md 空白区域
  └── 个人思考捕获：创建 00-raw/06-Thoughts/ + 模板

Phase 2（P1 — 下周）：
  ├── 场景化召回：补全 keywords/scenes + index.md 场景索引
  └── 时效性感知：补全 knowledge_type + Lint 过期扫描

Phase 3（P2 — 后续）：
  ├── 消耗闭环：定义 used_in 规范 + 活跃度报告
  └── 暗线发现：暗线扫描 + 发现报告
```

每个 Phase 结束后做一次完整 Lint，验证所有功能正常。

---

## Frontmatter 最终规范（合并所有扩展）

```yaml
---
title: 页面标题
description: 一句话描述
type: entity | topic | comparison | output
knowledge_type: permanent | periodic | ephemeral  # 新增
review_cycle: 90                                   # 新增，天数
created: YYYY-MM-DD
updated: YYYY-MM-DD
last_reviewed: YYYY-MM-DD                          # 新增
tags: [tag1, tag2]
keywords: [关键词1, 关键词2]                        # 新增
scenes:                                            # 新增
  - 使用场景1
  - 使用场景2
related: "[[相关页面]]"
used_in:                                           # 新增
  - output: 产出引用
    date: YYYY-MM-DD
insights:                                          # 新增
  - date: YYYY-MM-DD
    summary: 个人洞察摘要
---
```

## CLAUDE.md Lint 流程增强

```
现有 Lint 检查：
  ✓ 页面间矛盾检测
  ✓ 新资料推翻旧观点
  ✓ 缺少页面的概念
  ✓ 孤立页面检测

新增 Lint 检查：
  ✓ 知识空白扫描（raw 覆盖率）
  ✓ 时效性检查（stale_score）
  ✓ 活跃度报告（used_in 统计）
  ✓ 暗线发现（潜在关联检测）
  ✓ 场景索引完整性（pages 缺 scenes 的提醒）
  ✓ 个人洞察覆盖率（没有 insights 的页面提醒补充）
