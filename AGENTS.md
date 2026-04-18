# AGENTS.md — OpenBrain

本文件是 OpenBrain 的代理入口规范，面向任意 AI 代理（不绑定某个厂商）。
目标：用最短规则保证行为正确；细则下沉到 `00-ai-repo/`。

## 1) 作用范围

- 适用于仓库根目录及其子目录。
- 本文件只保留：硬约束、工作流骨架、规则索引。
- 详细规范请读取下方「规则索引」中的文件。

## 2) 不可违反的硬约束

1. **`00-raw/` 只读**：禁止修改、删除、重命名原始资料。
2. **`99-wiki/` 持续进化**：允许新增/更新结构化知识，但必须可追溯到来源。
3. **`100-output/` 按需产出**：查询产物先输出，必要时再归档回 wiki。
4. **数据溯源**：Wiki 页面必须在 frontmatter 中维护 `sources`。
5. **前置约束**：`wikiapp` 不直接改 `99-wiki`；不要手动编辑 `.vitepress/generated/`。
6. **交互要求**：中文优先；需求不清时先澄清；避免无请求的扩展改动。
7. **简洁原则**：如无必要，勿增实体；避免过早抽象。

## 3) 页面类型路由（摄入时先判断）

- **Entity**（`99-wiki/01-entities/`）：回答“谁/什么？”
- **Topic**（`99-wiki/02-topics/`）：回答“怎么回事？”
- **Comparison**（`99-wiki/03-comparisons/`）：回答“选哪个？”
- 不确定时默认 Topic。

## 4) 标准工作流

1. **Ingest**：读取 `00-raw/` 新资料 → 产出/更新 wiki 页面 → 更新索引与日志。
2. **Query**：从 `99-wiki/index.md` 定位相关页面 → 组合回答。
3. **Filing**：将高价值查询结果沉淀为页面（避免一次性答案）。
4. **Lint**：定期检查矛盾、孤立页面、知识空白、时效性与洞察覆盖率。

## 5) 规则索引（细节下沉）

- 仓库保护与分层：`00-ai-repo/01_claude/rules/vault-protection.md`
- frontmatter 规范：`00-ai-repo/01_claude/rules/wiki-frontmatter.md`
- 语言与输出风格：`00-ai-repo/01_claude/rules/language-and-style.md`
- 代码与工程约束：`00-ai-repo/01_claude/rules/code-conventions.md`
- 安全策略：`00-ai-repo/01_claude/rules/security-policy.md`
- 发布流程：`00-ai-repo/01_claude/rules/release-process.md`

## 6) 维护约定

- 保持本文件精简（建议 < 120 行）。
- 新增长规则时，写入 `00-ai-repo/01_claude/rules/*.md`，这里只保留索引。
- 当本文件与 `CLAUDE.md` 冲突时，以更严格的约束为准。
