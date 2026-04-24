# CLAUDE.md — wikiapp

99-wiki 知识库的 Web 展示系统，基于 VitePress + D3.js，支持 Docker Compose 部署。

## 架构

```
构建流程：扫描 99-wiki → 预处理 frontmatter → 生成配置 → VitePress 构建 → serve
运行方式：容器启动时构建（非预构建），通过 volume 挂载 99-wiki 实现内容热更新
```

## 关键文件

| 文件 | 职责 |
|------|------|
| `.vitepress/scripts/generate-sidebar.ts` | 扫描 99-wiki，预处理 YAML，生成 sidebar/tags/graph 数据 |
| `.vitepress/scripts/ingest-api.ts` | 摄入 API 服务（文件上传/预览/加工） |
| `.vitepress/scripts/wiki-lint.ts` | 知识库健康检查（矛盾/孤立/时效性/暗线） |
| `.vitepress/scripts/extract-entities.ts` | 从 raw 文件用 LLM 提取实体信息 |
| `.vitepress/scripts/update-used-in.ts` | 知识消耗追踪，更新 `used_in` 字段 |
| `scripts/build.sh` | Docker 入口脚本：generate → vitepress build → serve |
| `.vitepress/config.ts` | VitePress 配置（导航、侧边栏、搜索、wiki-link 插件） |
| `.vitepress/plugins/wiki-link.ts` | Markdown-it 插件，将 `[[slug]]` 转为标准链接 |
| `.vitepress/theme/` | 自定义主题（WikiHome、TagFilter、Graph 组件） |

## 开发命令

```bash
npm run generate     # 仅生成配置（扫描 99-wiki → .vitepress/generated/）
npm run dev          # generate + vitepress dev（本地开发调试）
npm run build        # generate + vitepress build
npm run lint         # 知识库健康检查
docker compose up -d --build  # 一键启动（静态站点 + API）
```

## 核心约束

1. **不要修改 99-wiki 的原始文件** — wikiapp 只读取，预处理后写入 `wiki/` 供 VitePress 使用
2. **不要手动编辑 `.vitepress/generated/`** — 全部由 `generate-sidebar.ts` 自动生成
3. **`wiki/` 是构建产物** — 由 `npm run generate` 从 99-wiki 预处理生成，已加入 .gitignore
4. **frontmatter 预处理** — 99-wiki 的 `related: [[a]], [[b]]` 与 YAML 不兼容，构建时自动加引号
5. **Docker 基础镜像** — 使用 `docker.1ms.run/node:20-alpine`（国内镜像加速），npm 使用 npmmirror.com

## 内容路径映射

```
99-wiki/01-entities/slug.md   → /wiki/01-entities/slug.html
99-wiki/02-topics/slug.md     → /wiki/02-topics/slug.html
99-wiki/03-comparisons/slug.md → /wiki/03-comparisons/slug.html
wikiapp/index.md              → /index.html（自定义首页）
wikiapp/graph.md              → /graph.html（知识图谱）
wikiapp/tags.md               → /tags.html（标签索引）
wikiapp/ingest.md             → /ingest（知识摄入入口）
```

## 摄入功能 (Ingest)

摄入入口提供文件上传、预览和 AI 加工功能。通过 Anthropic SDK 调用 LLM，无需依赖 claude CLI。

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Vue 前端   │ ──► │  Fastify API  │ ──► │   文件系统   │
│  (/ingest)  │     │  (端口 3457)  │     │  00-raw/    │
└─────────────┘     │  Docker 容器  │     └─────────────┘
                    └──────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Anthropic   │
                    │ SDK         │
                    └─────────────┘

Docker 容器 (端口 8080)：
  VitePress 静态站点

Docker 容器 (端口 3457)：
  Fastify API + Anthropic SDK
```

**启动方式（全部通过 Docker Compose）：**
```bash
docker compose up -d --build
```

**注意：** 本地统一使用 `docker compose up -d --build` 启动所有服务。代码变更后需要重新 build 使改动生效。运行时配置数据（LLM 配置、任务队列）通过 `data/` 目录 volume 持久化。

**设置页面：** 在 /ingest 的「设置」tab 配置供应商、API Key、Base URL、模型。配置保存后传递给 `claude` CLI 作为环境变量。

**API 端点：**
- `POST /api/upload` — 上传文件到 00-raw
- `GET /api/files` — 列出 00-raw 文件
- `GET /api/preview` — 预览文件内容
- `POST /api/process` — 触发 Claude Code CLI 加工
- `GET /api/tasks` — 查看加工队列
- `GET /api/config` — 查看当前 LLM 配置
- `POST /api/config` — 保存 LLM 配置（provider, apiKey, baseURL, model）
