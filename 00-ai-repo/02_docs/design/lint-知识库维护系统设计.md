# 知识库维护系统设计

## 功能概述

保持知识库健康度的三大维护能力：健康检查（Lint）、实体发现与生成、知识消耗追踪。三者构成「发现问题 → 补全知识 → 追踪使用」的维护闭环。

## 健康检查（Lint）

**脚本**：`wiki-lint.ts`　**UI**：`LintRunner.vue`　**API**：`POST /api/lint/run`

### 检查项

| 检查 | 检测逻辑 | 告警条件 |
|------|---------|---------|
| 孤立页面 | 无入链（`related` + `[[wiki-links]]`）、无出链、无反向链接 | 完全没有连接 |
| Frontmatter 完整性 | 检查 `scenes` 和 `insights` 字段 | 字段为空或不存在 |
| 过时页面 | `stale_score = (today - updated) / review_cycle` | score >= 1.0 |
| 知识未使用 | 检查 `used_in` 字段 | 从未被任何产出引用 |
| 暗线发现（深度模式） | LLM 分析无双向链接的页面对 | 语义相关但无连接 |

### 过时判定规则

```
stale_score = (今天日期 - updated) / review_cycle

< 0.7  → 新鲜（无需处理）
0.7~1.0 → 即将过时（预警）
≥ 1.0  → 需要审阅
```

基于知识时效分类：

| 类型 | review_cycle | 判定 |
|------|-------------|------|
| permanent | null（永不审阅） | 跳过 |
| periodic | 90 天 | 按上述公式 |
| ephemeral | 30 天 | 按上述公式 |

### 暗线发现

深度模式下，使用 LLM 分析语义相关但无双向链接的页面对：

```
输入：两个页面的 title + description + tags
输出：是否相关 + 原因 + 置信度（high/medium/low）

LLM 供应商支持：
  - Anthropic（默认）
  - DeepSeek（api.deepseek.com）
  - 任意 OpenAI 兼容 API（MiniMax、智谱等）
```

结果保存到 `.vitepress/generated/hidden-connections.json`，供图谱页面使用。

### 输出

- 控制台输出：每个检查项的统计和详情
- `99-wiki/log.md`：追加维护日志
- LintRunner UI：展示检查结果，支持按类型筛选

### API 端点

```
POST /api/lint/run     { deep?: boolean }  → 触发检查
GET  /api/lint/status                      → 获取上次运行时间
```

Lint 脚本通过 `spawn(tsx, [wiki-lint.ts])` 异步执行，API 解析 stdout 提取结构化结果。

## 实体发现与生成

**脚本**：`extract-entities.ts`　**UI**：`EntityExtractor.vue`　**API**：`/api/entities/*`

### 发现流程

```
扫描 99-wiki 所有页面
  │
  ├─ 提取 [[wiki-links]] 中引用的 slug
  ├─ 提取 tags 字段中的标签
  ├─ 提取 keywords 字段中的关键词
  │
  ▼
过滤已存在的页面（与 99-wiki/*.md 文件名比对）
过滤已知主题前缀（ai-, llm-, agent- 等 20+ 个前缀）
过滤过长 slug（>40 字符或 >4 段）
过滤中文过多的 slug（>6 个汉字）
  │
  ▼
按提及频率排序 → 候选实体列表
```

### 生成流程

```
用户选择候选实体 → POST /api/entities/generate
  │
  ├─ 构造 prompt（实体名 + 来源页面 + 上下文片段）
  ├─ 调用 LLM 生成实体页面
  ├─ 如果输出缺少 frontmatter，自动补全
  └─ 写入 99-wiki/01-entities/{PascalCase}.md
```

### 候选缓存

- 结果缓存 5 分钟（`ENTITY_CACHE_TTL`）
- 新实体生成后清空缓存

### 强候选判定

提及次数 >= 2 或出现在 >= 2 个不同页面中。

## 知识消耗追踪（used_in）

**脚本**：`update-used-in.ts`

### 追踪逻辑

```
扫描 100-output/ 目录中的产出文档
  │
  ├─ 提取所有 [[wiki-links]]
  ├─ 匹配已有的 wiki 页面 slug
  │
  ▼
向被引用的 wiki 页面追加 used_in 记录

used_in 条目格式：
  - output: 产出文件名
    date: YYYY-MM-DD
```

### 设计理念

**未使用的知识是负债**——存储成本持续产生，却从未产出价值。`used_in` 追踪建立「知识消耗」闭环，帮助识别高价值知识和冷知识。

### 运行方式

```bash
# 实际写入
tsx scripts/update-used-in.ts

# 预览模式（不写入）
tsx scripts/update-used-in.ts --dry-run
```

去重规则：相同 `output + date` 组合不重复追加。

## 涉及文件

| 文件 | 职责 |
|------|------|
| `wikiapp/scripts/wiki-lint.ts` | 健康检查脚本 |
| `wikiapp/.vitepress/theme/components/LintRunner.vue` | Lint 运行 UI |
| `wikiapp/scripts/extract-entities.ts` | 实体提取脚本（CLI 版） |
| `wikiapp/.vitepress/theme/components/EntityExtractor.vue` | 实体发现 UI |
| `wikiapp/scripts/update-used-in.ts` | 知识消耗追踪脚本 |
| `wikiapp/scripts/ingest-api.ts` | API 端点（lint + entities） |
