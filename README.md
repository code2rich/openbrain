# OpenBrain

> AI 驱动的个人知识管理系统——基于 Andrej Karpathy 的 LLM-Wiki 架构

OpenBrain 把 AI 当作「永不疲倦的知识管理员」，而非搜索引擎。每次交互都在完善知识体系：交叉引用已建立、矛盾已标记、综合已完成。Wiki 随着每个来源、每个问题变得更丰富。

## 核心理念

- **知识编译，而非知识存储** — 从原始文档到结构化知识是一个编译过程
- **三层分离** — 原始资料（只读）→ 结构化知识（AI 拥有）→ 知识输出（按需生成）
- **复利效应** — 今天的探索 = 明天的基础设施
- **个人洞察 > 来源观点** — 区分外部信息和自己的判断

## 架构

```
┌─────────────────────────────────────────────────────────┐
│                     用户交互层                           │
│  Obsidian 本地编辑 ←→ Claude Code 对话 ←→ wikiapp Web   │
└───────┬──────────────────┬──────────────────────────────┘
        ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────────┐
│  00-raw/      │  │  99-wiki/     │  │  wikiapp          │
│  原始资料      │  │  结构化知识    │  │  VitePress + D3   │
│  (AI 只读)    │  │  (AI 完全拥有) │  │  Docker :8080     │
└───────────────┘  └───────────────┘  └───────────────────┘
```

### 三层分离

| 层 | 目录 | 性质 | AI 角色 |
|----|------|------|---------|
| 不可变真相层 | `00-raw/` | 原始资料，只读 | 只读取，永不修改 |
| 结构化知识层 | `99-wiki/` | AI 编译的产物 | 完全拥有，持续进化 |
| 知识输出层 | `100-output/` | 知识的消费产出 | 按需生成 |

## 快速开始

### 前置条件

- [Node.js](https://nodejs.org/) 20+
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)（用于知识摄入）
- Docker（可选，用于 Web 展示）

### 安装

```bash
git clone https://github.com/your-username/openbrain.git
cd openbrain

# Web 展示系统（推荐 Docker）
cd wikiapp
docker compose up -d --build
```

访问 `http://localhost:8080` 查看 Wiki，`http://localhost:3456` 是摄入 API。

### 配置

```bash
# 复制环境变量模板
cp .env.example .env

# 配置 LLM API Key（在 wikiapp Web UI 的 /ingest 设置页面配置）
# 或手动创建配置文件
cp wikiapp/data/config.example.json wikiapp/data/config.json
# 编辑 config.json 填入你的 API Key
```

## 使用方式

### 命令行

```bash
# 知识库状态概览
bash scripts/wiki-cli.sh status

# 摄入新资料（将 00-raw/ 中的文件处理为结构化知识）
bash scripts/wiki-cli.sh ingest

# 知识查询
bash scripts/wiki-cli.sh query "什么是 LLM-Wiki？"

# 知识库健康检查
bash scripts/wiki-cli.sh lint

# 知识库维护（过期检查、孤立页面、暗线发现）
bash scripts/wiki-cli.sh maintain
```

### 定时任务（macOS）

```bash
# 安装 launchd 定时任务（每日 02:00 摄入，每周日 03:00 Lint）
cp scripts/com.obsidian.wiki-ingest.plist ~/Library/LaunchAgents/
cp scripts/com.obsidian.wiki-lint.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.obsidian.wiki-ingest.plist
launchctl load ~/Library/LaunchAgents/com.obsidian.wiki-lint.plist
```

> 注意：安装前需编辑 plist 文件，将路径改为你的实际 vault 路径。

## 知识类型

| 类型 | 回答的问题 | 目录 | 命名 |
|------|-----------|------|------|
| **实体** | 谁/什么？ | `01-entities/` | `PascalCase.md` |
| **主题** | 怎么回事？ | `02-topics/` | `kebab-case.md` |
| **对比** | 选哪个？ | `03-comparisons/` | `a-vs-b.md` |

## 技术栈

- **知识管理**：Obsidian + Markdown + frontmatter 元数据
- **AI 引擎**：Claude Code CLI + Anthropic SDK
- **Web 展示**：VitePress + Vue 3 + D3.js + ECharts
- **摄入 API**：Fastify + mammoth（文档解析）
- **部署**：Docker Compose（Alpine Linux）

## 项目结构

```
├── 00-raw/                 # 原始资料（不纳入 Git）
├── 99-wiki/                # AI 维护的结构化知识
│   ├── index.md            # 页面索引
│   ├── log.md              # 操作日志
│   ├── 01-entities/        # 实体页面
│   ├── 02-topics/          # 主题综述
│   └── 03-comparisons/     # 对比分析
├── 100-output/             # 知识输出
├── wikiapp/                # Web 展示系统
│   ├── .vitepress/         # VitePress 配置和代码
│   ├── Dockerfile
│   └── docker-compose.yml
├── scripts/                # 自动化脚本
├── 00-ai-repo/             # Claude Code 技能和规则
└── CLAUDE.md               # AI 行为指令
```

## 致谢

- [Andrej Karpathy](https://github.com/karpathy) — LLM-Wiki 方法论的提出者
- [VitePress](https://vitepress.dev/) — 静态站点生成
- [Obsidian](https://obsidian.md/) — 本地知识管理工具

## License

[MIT](LICENSE)
