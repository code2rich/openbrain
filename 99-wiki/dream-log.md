---
title: 梦境日志
type: log
created: 2026-04-18
---

# 午后梦 · 思梦 — 2026-04-18

## 梦境摘要

| 项目 | 详情 |
|------|------|
| 梦境名称 | 午后梦 · 思梦 |
| 开始时间 | 2026-04-18 13:31 |
| 结束时间 | 2026-04-18 |
| 阶段 1 诊断 | ✅ 完成（11 项检查） |
| 阶段 2 综合 | ✅ 完成（20 对隐藏连接 + 合并/拆分建议） |
| 阶段 3 修复 | ⏸ 未执行 |
| 阶段 4 验证 | ⏸ 未执行 |
| 阶段 5 记录 | ✅ 进行中 |

**诊断发现 13 类问题**：index 滞后（19 页）、孤立页面（6 页）、洞察缺失（22 页）、used_in 未启动（83/83）、跨页矛盾（3 处）、覆盖率虚假完成（27 条）、frontmatter 格式错误（5 页）、悬空链接（5 页）、sources 缺失（40 页）等。

**实际修复：0**（仅完成诊断与综合，未进入修复阶段）

**需要人工关注的事项**：

1. **合并 6 个空壳实体页** → Mot、WealthPlanning、FundInvestmentAdvisory、WealthManagement、Kyp、ClaudeCode 合并至对应主题页
2. **拆分 2 个巨型页面** → 基金投顾-总览（640 行）、资配平台-业务功能树（609 行）
3. **补全 33 个主题页 sources 字段**（违反规则 10 数据溯源）
4. **修复 5 个 related 格式错误 + 5 个悬空链接**
5. **启动知识消耗闭环**（used_in 全库为空）
6. **补充 22 个实体页个人洞察**
7. **修正 27 条虚假完成的 raw-coverage 记录**
8. **5 月中旬前审阅** `aigc-trends-2026`
9. **处理 openclaw.md 二进制残留**
10. **确认 3 处跨页面矛盾**最终表述

---

> 午后关联发现 · 13:31 开始

## 阶段 1：诊断

### 检查 1：index.md 完整性

知识库共 **83 个页面**（34 实体 + 47 主题 + 2 对比），index.md 仅收录 **64 个**，缺失 **19 个页面**。

**缺失的实体页（17 个）：**

| 页面 | 严重程度 | 说明 |
|------|---------|------|
| ClaudeCode | 高 | 核心工具实体，无索引 |
| Rag | 中 | RAG 概念实体 |
| Mcp | 中 | MCP 协议实体 |
| Obsidian | 中 | Obsidian 工具实体 |
| Kyp | 低 | KYP 平台缩写实体 |
| 双链 | 低 | 概念实体 |
| 知识管理 | 低 | 通用概念实体 |
| OpenClaw | 中 | 工具实体，有独立页但未索引 |
| 恒生电子 | 低 | 公司实体 |
| 自动化 | 低 | 概念实体 |
| Ai编程 | 中 | AI 编程概念实体 |
| WealthPlanning | 低 | 财富规划概念实体 |
| 产品管理 | 低 | 概念实体 |
| AssetAllocation | 低 | 资产配置概念实体 |
| Mot | 低 | MOT 概念实体 |
| FundInvestmentAdvisory | 低 | 基金投顾概念实体 |
| WealthManagement | 低 | 财富管理概念实体 |

**缺失的主题页（1 个）：**
- `asset-allocation-product-center-3` — 浙商银行产品中心需求规格说明书

**异常文件（1 个）：**
- `02-topics/openclaw.md` — 非 markdown 内容，是二进制 docx 文件的残留输出

### 检查 2：孤立页面

以「无双链入 + 无 related + 无 used_in + 未出现在 index.md」为标准：

| 页面 | related | 被引用 | 孤立程度 |
|------|---------|--------|---------|
| OpenClaw | `[]`（空） | 无其他页面引用 | 完全孤立 |
| Mot | 基金投顾-总览 | 仅被 1 页引用 | 近孤立 |
| 恒生电子 | kyp-codereview | 仅被 1 页引用 | 近孤立 |
| WealthPlanning | 资产配置等 | 无其他页面引用 | 近孤立 |
| Kyp | kyp-codereview | 仅被 KYP 相关页引用 | 近孤立 |
| AssetAllocation | 资配平台-ES | 仅被 1 页引用 | 近孤立 |

**OpenClaw.md 完全孤立**：related 为空，无其他页面双链引用，不在 index.md 中。

### 检查 3：时效性（stale_score）

知识库初始化于 2026-04-13，仅 **5 天历史**。

**periodic 页面（review_cycle: 90）**：全部新鲜，最高 stale_score = 5/90 ≈ 0.056

**ephemeral 页面（review_cycle: 30）：**
- `aigc-trends-2026`：stale_score = 3/30 = 0.1 → 新鲜

**结论：无过时页面。** 但 `aigc-trends-2026` 作为临时知识（30 天周期），需在 2026-05-15 前审阅。

### 检查 4：缺少 scenes 的页面

**所有 83 个知识页面均包含 scenes 字段**，最少 1 条，最多 5 条。无缺失。

scenes 条目偏少的页面（仅 1 条）：
- Obsidian（1 条）、WealthPlanning（1 条）、Mot（1 条）

### 检查 5：缺少 insights 的页面

**实体页面（22/34 缺少个人洞察）：**

| 缺少 insights 的页面 | 类型 |
|---------------------|------|
| ClaudeCode | permanent |
| Rag | permanent |
| Mcp | permanent |
| Obsidian | permanent |
| Kyp | permanent |
| 双链 | permanent |
| 知识管理 | permanent |
| OpenClaw | periodic |
| 恒生电子 | permanent |
| 自动化 | permanent |
| Ai编程 | permanent |
| WealthPlanning | permanent |
| 产品管理 | permanent |
| AssetAllocation | permanent |
| Mot | permanent |
| FundInvestmentAdvisory | permanent |
| WealthManagement | permanent |
| Multica | periodic |
| Agtop | periodic |

**主题页面**：大部分有 1-2 条 insights，覆盖率较好。

**对比页面**：2/2 均有 insights。

**个人洞察覆盖率**：~35%（34 实体中 12 有洞察，其余 22 为空壳）

### 检查 6：知识未使用（used_in）

**全库 used_in 状态：0% 有实际消耗记录。**

- 有 `used_in: []`（空数组）的页面：约 55 个
- 完全缺失 `used_in` 字段的页面：约 26 个
- 有实际 `used_in` 条目的页面：**0 个**

知识消耗闭环完全未启动。所有知识都是「负债」——存储成本持续产生，从未产出价值。

### 检查 7：跨页面矛盾

发现以下潜在矛盾点：

**矛盾 1：RAG 定位不一致**
- `rag-vs-llm-wiki.md`：insight 说 "RAG 适合广度查询，LLM-Wiki 适合深度积累——互补而非替代"
- `knowledge-system-paradigms.md`：将 RAG 定位为「实时检索」范式，与 LLM-Wiki 并列为四种范式之一
- `Rag.md` 实体页：需确认是否与前两者一致

**矛盾 2：知识管理工具归类差异**
- `knowledge-system-paradigms.md`：Obsidian 归为「个人 Wiki」范式
- `personal-knowledge-system.md`：Obsidian 作为整个系统的编辑器层
- 两处定位不同，前者强调「结构化笔记」，后者强调「本地编辑器」

**矛盾 3：资配平台页面分裂**
- `资配平台-总览.md` vs `基金投顾-总览.md` vs `财富规划-总览.md`：三个「总览」层级关系不清晰
- `基金投顾-产品管理.md`（topic）vs `产品管理.md`（entity）：产品管理在两个层级被独立描述
- 概念边界模糊，可能导致重复维护

### 检查 8：覆盖率差异

**.raw-coverage 统计：**
- 总文件：206+
- 已处理：189+
- 待处理：0
- 跳过：17
- 覆盖率：91.7%

**但发现「虚假完成」问题**：27 条记录标记为 `done` 但无关联 wiki 页面（关联列为 `-`）：

| 分类 | 数量 | 典型文件 |
|------|------|---------|
| 原始批处理遗留 | ~10 | AI提升研发工作效率、事项一~八、钉钉机器人等 |
| 2026-04-18 新增 | ~17 | graphify、knowledge-graph、AI编程、Routa 等剪藏文章 |

这些 raw 文件被标记为已处理，但知识未被提炼到任何 wiki 页面。实际有效覆盖率可能低于 91.7%。

**重复 raw 文件：**
- `终于有人把数据血缘搞清楚了.md` vs `终于有人把数据血缘搞清楚了！.md`（仅差感叹号）→ 均指向 [[data-lineage]]
- `graphify：代码库即知识图谱...md` 与 `graphify：代码库即知识图谱...1.md` → 同一文章重复

### 检查 9：related 字段格式问题（新增）

5 个页面的 `related` 字段中 wiki-links 格式错误——第二个链接缺少 `[[` 前缀，导致 YAML 解析异常：

| 页面 | 错误格式 | 应改为 |
|------|---------|--------|
| 财富规划-市场设置 | `[[财富规划-总览], [财富规划-投资规划]]` | `"[[财富规划-总览]]", "[[财富规划-投资规划]]"` |
| 基金投顾-菜单功能树 | `[[基金投顾-总览], [基金投顾-数据索引]]` | `"[[基金投顾-总览]]", "[[基金投顾-数据索引]]"` |
| 财富规划-事前风控 | `[[财富规划-总览], [基金投顾-总览]]` | `"[[财富规划-总览]]", "[[基金投顾-总览]]"` |
| 基金投顾-外部策略 | `[[基金投顾-定制策略], [基金投顾-策略公告与报告]]` | `"[[基金投顾-定制策略]]", "[[基金投顾-策略公告与报告]]"` |
| 基金投顾-策略公告与报告 | `[[基金投顾-自有策略管理], [基金投顾-风险监控]]` | `"[[基金投顾-自有策略管理]]", "[[基金投顾-风险监控]]"` |

另发现 `基金投顾-投顾工作坊.md` 的 related 包含自引用 `[[基金投顾-投顾工作坊]]`，应移除。

### 检查 10：悬空链接（新增）

5 个页面的 `related` 字段引用了不存在的 wiki 页面：

| 页面 | 悬空引用 | 说明 |
|------|---------|------|
| mergetopus | `[[git-workflow]]` | 页面不存在，可能是计划中未创建 |
| wechat-capture-workflow | `[[obsidian-vault-ops]]` | 页面不存在，可能是技能名称误用 |
| agent-driven-development | `[[coding-agents]]` | 页面不存在 |
| agent-driven-development | `[[prompt-engineering]]` | 页面不存在，已在 index.md 知识空白中标记为 P1 |
| document-skills | `[[agent-skills]]` | 页面不存在，可能是技能名称误用 |

### 检查 11：sources 字段缺失（新增）

数据溯源字段严重缺失。仅 43/83 页面有 `sources` 字段，**40 个页面无法追溯原始资料**：

| 分类 | 有 sources | 缺失 sources | 缺失率 |
|------|-----------|-------------|--------|
| 实体页面 | 32 | 2 | 6% |
| 主题页面 | 10 | 33 | **77%** |
| 对比页面 | 1 | 1 | 50% |

**主题页面缺失最严重**：33 个主题页面无 `sources` 字段。这违反了 CLAUDE.md 规则 10「每个 wiki 页面必须通过 sources 字段记录来源 raw 文件路径」。

缺失 sources 的主题页面包括：资配平台-总览、资配平台-业务功能树、资配平台-Elasticsearch架构、基金投顾-总览及所有子页面、财富规划-总览及所有子页面、llm-wiki、ai-agent-overview、claude-code-training、claude-code-architecture、data-lineage、mergetopus、reading-methodology、team-management、wechat-capture-workflow、document-skills、auto-ingest-pipeline、aigc-trends-2026、mcp-ecosystem 等。

### 问题汇总

| 问题类型 | 数量 | 严重程度 |
|---------|------|---------|
| index.md 缺失页面 | 19 | 中 |
| 完全孤立页面 | 1 (OpenClaw) | 中 |
| 近孤立页面 | 5 | 低 |
| 过时知识 | 0 | - |
| 缺少 insights | 22 | 高 |
| used_in 未启动 | 83/83 (100%) | 高 |
| 跨页面矛盾 | 3 处 | 中 |
| 覆盖率虚假完成 | 27 条 | 中 |
| 结构异常文件 | 1 (openclaw.md) | 低 |
| 重复 raw 文件 | 2 组 | 低 |
| **related 格式错误** | **5** | **中** |
| **悬空链接** | **5 页 → 6 个不存在的页面** | **中** |
| **sources 字段缺失** | **40 页 (48%)** | **高** |

### 诊断摘要

知识库处于「快速增长期」（5 天，83 页），覆盖面广但结构松散。五大核心问题：

1. **index.md 严重滞后** — 19 个页面未被索引，占总量 23%
2. **知识消耗闭环未启动** — 100% 的知识页面无 used_in 记录，所有知识都是「负债」
3. **个人洞察覆盖率仅 35%** — 22 个实体页缺乏用户自己的判断和反思
4. **数据溯源大面积缺失** — 48% 的页面无 sources 字段，主题页面缺失率 77%
5. **frontmatter 格式问题** — 5 个页面 related 字段格式错误，5 个页面含悬空链接

时效性无问题（库龄太短），但需要在 5 月中旬前审阅 `aigc-trends-2026`。27 条 raw 文件标记为已处理但未关联 wiki 页面，实际有效率需要修正。

## 阶段 2：综合

> 关联发现 · 基于 tags/keywords 交叉对比 + 内容结构分析

### 隐藏连接

语义相关但缺少双链的页面对。按重要性排序：

| 页面 A | 页面 B | 共同主题 | 建议连接方式 |
|--------|--------|---------|------------|
| ClaudeCode (entity) | claude-code-architecture (topic) | 同一工具——实体页定义工具，架构页深入源码，却互不引用 | 双向 related |
| ExBrain (entity) | Graphify (entity) | 同属 LLM-Wiki 生态工具，关键词重叠，均链 llm-wiki 但互不相链 | 双向 related |
| ExBrain (entity) | knowledge-graph-visualization (topic) | 知识图谱 + 可视化，互补性强 | related: ExBrain → 可视化页 |
| Routa (entity) | Multica (entity) | 关键词"多Agent协作"完全重叠，共享 3 个 related 页面但不互链 | 双向 related |
| wechat-capture-workflow (topic) | OpenClaw (entity) | tags 含 openclaw 但工作流页不链实体，实体 related 为空 | 双向 related |
| Obsidian (entity) | obsidian-ecosystem (topic) | 同一工具——实体是简介，主题是插件生态，互不引用 | 双向 related |
| Rag (entity) | knowledge-system-paradigms (comparison) | RAG 概念定义 vs RAG 范式分析 | Rag → knowledge-system-paradigms |
| SeekDB (entity) | Rag (entity) | SeekDB 是 RAG 的技术实现层 | SeekDB → Rag |
| 知识管理 (entity) | personal-knowledge-system (topic) | 通用概念 vs 具体实践 | 知识管理 → personal-knowledge-system |
| 知识管理 (entity) | wiki-evolution-design (topic) | tags 均含"知识管理" | 双向 related |
| WealthPlanning (entity) | 财富规划-总览 (topic) | 同一概念，互不引用 | 实体 → 总览 |
| FundInvestmentAdvisory (entity) | 基金投顾-总览 (topic) | 同一概念，互不引用 | 实体 → 总览 |
| WealthManagement (entity) | 财富规划-总览 (topic) | 财富管理是更广概念，财富规划是其子集 | 实体 → 财富规划-总览 |
| AssetAllocation (entity) | 资配平台-总览 (topic) | 实体定义概念，主题描述平台 | 实体 → 资配平台-总览 |
| 恒生电子 (entity) | 资配平台-总览 (topic) | 恒生是平台开发商，总览 tags 含"恒生电子"但不链实体 | 总览 → 恒生电子 |
| Mot (entity) | 基金投顾-风险监控 (topic) | MOT 是风险监控核心概念 | 实体 → 风险监控 |
| 产品管理 (entity) | 财富规划-产品管理 (topic) | 实体遗漏了财富规划-产品管理的链接 | 实体 related 补充 |
| MarkItDown (entity) | document-skills (topic) | 文档转换 vs 文档处理技能，互补 | 双向 related |
| reading-methodology (topic) | 知识管理 (entity) | 关键词重叠（知识内化/知识管理） | reading-methodology → 知识管理 |
| 自动化 (entity) | auto-ingest-pipeline (topic) | 通用概念 vs 具体自动化实现 | 实体 → auto-ingest-pipeline |

**统计**：83 个页面中发现 **20 对隐藏连接**。最严重的断裂在「金融实体页 ↔ 金融主题页」和「工具实体页 ↔ 工具主题页」两大类。

### 合并候选

内容高度重叠或实体页过于单薄，可被主题页吸收的页面：

| 页面 | 原因 | 建议 |
|------|------|------|
| **Mot.md** (entity) | 内容仅为 MOT 的模糊定义，基金投顾-总览已完整覆盖 | **合并入** 基金投顾-总览.md |
| **WealthPlanning.md** (entity) | 泛泛定义"财富规划"，财富规划-总览已有完整业务描述 | **合并入** 财富规划-总览.md |
| **FundInvestmentAdvisory.md** (entity) | 基金投顾概念（买方投顾、全权委托），可被总览吸收 | **合并入** 基金投顾-总览.md |
| **WealthManagement.md** (entity) | 与 WealthPlanning 高度重叠 | **合并入** 资配平台-总览.md |
| **Kyp.md** (entity) | 仅描述"kyp 是标签/元数据"，无实质内容 | **合并入** 恒生电子.md |
| **ClaudeCode.md** (entity) | 工具简介与 claude-code-architecture.md 高度互补 | **合并入** claude-code-architecture.md |
| **AssetAllocation.md** (entity) | 定义 SAA/TAA 概念，有独特知识价值 | **保留**但补充 related |
| **Rag.md** (entity) | 定义 RAG 三步流程，视角独特 | **保留**但补充 related |

**合并可减少 6 个页面**（83 → 77）。

### 拆分候选

内容过长、应按自然结构拆分的页面：

| 页面 | 行数 | 建议 |
|------|------|------|
| **基金投顾-总览.md** | 640 | **强烈建议拆分**：总览保留概述，策略详情引用已有子页，数据库表独立 |
| **资配平台-业务功能树.md** | 609 | **建议拆分**：总览保留统计，九大模块明细独立 |
| **wiki-evolution-design.md** | 442 | **建议拆分**：总览保留设计理念，P0-P2 各独立为规格页 |

### 综合摘要

知识库的隐藏连接主要集中在三类断裂：

1. **实体-主题断桥**（最严重）：金融领域 6 个实体页与对应主题页完全不相链。工具领域同样（ClaudeCode vs claude-code-architecture、Obsidian vs obsidian-ecosystem）
2. **生态工具孤岛**：LLM-Wiki 生态工具（ExBrain/Graphify/SeekDB/HermesAgent）之间链路稀疏
3. **巨型页面**：基金投顾-总览（640 行）和资配平台-业务功能树（609 行）承载过多内容

**推荐优先行动**：
1. 修复 5 个 related 字段格式错误 + 移除悬空链接
2. 补全 33 个主题页面的 sources 字段（数据溯源）
3. 补全实体-主题双链（20 对连接）
4. 合并 6 个空壳实体页
5. 拆分 2 个 600+ 行巨型页面
