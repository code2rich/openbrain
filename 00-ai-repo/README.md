# 00-ai-repo — AI 配置和技能文件仓库

独立维护的 AI 配置中心，管理 Claude Code 的配置、规则、技能、智能体和团队定义。

> **定位说明**：`00-ai-repo/` 是本项目的 Claude Code 增强配置集。它不是核心功能，而是可选的 AI 能力扩展。你可以根据自己的需求选用其中的 skills 和 rules，也可以完全忽略这个目录。

## 目录结构

```
00-ai-repo/
├── 01_claude/                  # Claude 配置文件
│   ├── CLAUDE.md               # 配置中心索引 + Skills 清单
│   ├── agent/                  # 自定义智能体 → .claude/agents/
│   ├── rules/                  # 行为规则 → .claude/rules/
│   │   ├── language-and-style.md   # 语言与交互规则
│   │   ├── vault-protection.md     # Vault 保护规则
│   │   └── code-conventions.md     # 代码与工程规则
│   ├── skills/                 # 自定义技能 → .claude/skills/
│   └── teams/                  # 自定义团队 → .claude/teams/
├── 02_docs/                    # 输出文档（按任务单组织）
└── 03_scripts/                 # 自定义脚本工具
    └── sync-config.sh          # 增量同步脚本
```

## 配置层级

```
全局 ~/.claude/CLAUDE.md        # 用户级通用偏好（4 条规则）
  ↓
项目根 CLAUDE.md                # 项目级知识库架构（9 条核心规则）
  ↓
wikiapp/CLAUDE.md               # 子项目级（wikiapp 组件约束）
  ↓
.claude/rules/                  # 详细行为规则（从本目录同步）
```

## 同步机制

```bash
cd 00-ai-repo/03_scripts && ./sync-config.sh
```

增量同步 `01_claude/` → `.claude/`，不删除已有内容，CLAUDE.md 覆盖需手动确认。

## 命名规范

- 配置文件：`CLAUDE.{scope}.md`，scope 用点号分隔层级
- 规则文件：`kebab-case.md`，按主题命名
- 智能体/技能目录：使用 `kebab-case` 命名
- 文档按任务单编号组织，日期格式 `YYYY-MM-DD`
