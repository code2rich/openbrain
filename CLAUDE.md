# CLAUDE.md — OpenBrain（Source）

本文件是项目根 `CLAUDE.md` 的源版本（供 `sync-config.sh` 同步）。  
遵循“入口精简、细则下沉”原则。

## 1) 作用范围

- 适用于仓库根目录及其子目录。
- 本文件只保留：硬约束、执行顺序、规则索引。
- 通用代理约束见项目根 `AGENTS.md`。

## 2) 执行顺序（建议）

1. 先读 `AGENTS.md`（通用代理入口）。
2. 再读相关规则文件（按任务需要）。
3. 最后执行具体任务，避免超范围改动。

## 2.5) 初始化检查

- **首次对话必须检查**：如果 `99-wiki/index.md` 不存在，说明用户未执行 `bash scripts/init-dirs.sh`，必须提示用户先运行该脚本再继续。
- 初始化脚本创建被 `.gitignore` 排除的目录和文件（`00-raw/` 子目录、`99-wiki/index.md`、`99-wiki/log.md`、`.env` 等）。

## 3) 不可违反的硬约束

1. **`00-raw/` 只读**：禁止修改、删除、重命名。
2. **`99-wiki/` 可演进**：允许创建/更新，但必须维护 `sources` 可追溯。
3. **`100-output/` 按需输出**：一次性结果优先输出，高价值内容再沉淀回 wiki。
4. **`wikiapp` 边界**：不直接写 `99-wiki`；不手动编辑 `.vitepress/generated/`。
5. **交互约束**：中文优先；不清楚先澄清；不做未请求扩展改动。
6. **工程约束**：如无必要勿增实体；避免过早抽象。

## 4) 页面类型路由

- Entity：`99-wiki/01-entities/`（谁/什么）
- Topic：`99-wiki/02-topics/`（怎么回事）
- Comparison：`99-wiki/03-comparisons/`（如何选择）
- 不确定时默认 Topic。

## 5) 工作流骨架

1. Ingest：raw → wiki 页面 → 索引/日志更新
2. Query：从 `99-wiki/index.md` 定位并组合回答
3. Filing：把高价值查询结果沉淀回 wiki
4. Lint：检查矛盾、孤立页面、空白、时效与洞察覆盖

## 6) 规则索引

- 通用代理入口：`AGENTS.md`
- 仓库保护与分层：`00-ai-repo/01_claude/rules/vault-protection.md`
- frontmatter 规范：`00-ai-repo/01_claude/rules/wiki-frontmatter.md`
- 语言与风格：`00-ai-repo/01_claude/rules/language-and-style.md`
- 代码与工程：`00-ai-repo/01_claude/rules/code-conventions.md`
- 安全策略：`00-ai-repo/01_claude/rules/security-policy.md`
- 发布流程：`00-ai-repo/01_claude/rules/release-process.md`

## 7) 维护约定

- 保持本文件精简（建议 < 120 行）。
- 新增细则放到 `00-ai-repo/01_claude/rules/*.md`，本文件只保留索引。
