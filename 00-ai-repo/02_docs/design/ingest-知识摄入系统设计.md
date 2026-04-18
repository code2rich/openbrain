# 知识摄入系统设计

## 功能概述

将外部知识资料摄入到知识库的核心流程。用户通过 Web 界面上传文件、浏览预览、一键触发 AI 加工，将 raw 文件转化为结构化 wiki 页面。

## 架构

```
┌──────────────────────────────────────────────────────────────┐
│  IngestPage.vue (/ingest)                                    │
│  ┌─────────┬──────────┬──────────┬─────────┬──────┬──────┐  │
│  │ 上传    │ 浏览     │ 加工队列 │ 实体发现 │ Lint │ 设置 │  │
│  └────┬────┴────┬─────┴────┬─────┴────┬────┴──┬───┴──┬──┘  │
└───────┼────────┼──────────┼──────────┼───────┼──────┼─────┘
        │        │          │          │       │      │
        ▼        ▼          ▼          ▼       ▼      ▼
┌──────────────────────────────────────────────────────────────┐
│  Fastify API (ingest-api.ts, 端口 3456, 宿主机进程)          │
│                                                              │
│  POST /api/upload        — 上传文件到 00-raw                 │
│  GET  /api/files         — 列出 00-raw 文件                  │
│  GET  /api/raw           — 返回原始二进制文件                 │
│  GET  /api/preview       — 文件预览（文本/图片/PDF/Word/PPT）│
│  POST /api/process       — 提交 AI 加工任务                  │
│  GET  /api/process/:id/stream — SSE 实时进度                 │
│  GET  /api/tasks         — 查看加工队列                      │
│  GET  /api/config        — 查看 LLM 配置                    │
│  POST /api/config        — 保存 LLM 配置                    │
│  POST /api/config/test   — 测试 LLM 连接                    │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ claude CLI   │
                    │ (Claude Code)│
                    └─────────────┘
```

**关键设计决策**：API 运行在宿主机而非 Docker 容器，因为需要调用 `claude` CLI 进行 AI 加工，且需要访问完整的 workspace 上下文。

## 核心流程

### 1. 文件上传

**组件**：`FileUploader.vue`

```
用户拖拽/选择文件 → 客户端白名单校验 → FormData POST → 写入 00-raw/{targetDir}/
```

- 支持 17 种文件格式：`.md .txt .pdf .doc .docx .pptx .ppt .xlsx .xls .csv .json .yaml .yml .html .epub .rtf .log`
- 7 个目标目录可选：`00-upload, 01-Clippers, 02-RSS, 03-Manual, 04-OpenClaw, 05-SyncDown, 06-Thoughts`
- 上传大小限制：100MB
- 多文件批量上传

### 2. 文件浏览

**组件**：`FileBrowser.vue` + `FileGroup.vue`

- 目录筛选下拉框，支持深层目录导航（面包屑）
- 文件卡片显示：类型图标 + 文件名 + 大小 + 一键加工按钮
- 文件图标映射：`.pdf→📕 .docx→📘 .pptx→📊 .xlsx→📈 .csv→📋 .json→🔧 .yaml→⚙️` 等

### 3. AI 加工

**组件**：`ProcessQueue.vue`

```
用户点击"一键加工" → POST /api/process → 创建异步任务 → spawn claude CLI
  → SSE 实时推送进度 → AI 分析文件 → 生成 wiki 页面 → 写入 99-wiki/{category}/
```

**claude CLI Prompt 结构**：

1. 角色定义：知识库管理员
2. 页面类型判断标准：实体 / 主题 / 对比
3. 任务要求：读取源文件 → 判断类型 → 读取 index.md → 生成 frontmatter → 写入文件
4. frontmatter 模板（含日期、分类、标签等字段）

**任务管理**：
- 任务持久化到 `.ingest-tasks.json`，重启后恢复
- 保留最近 100 条任务
- 状态流转：`queued → processing → completed | failed`
- SSE 端点推送实时进度，3 秒间隔轮询队列列表

### 4. LLM 配置

**组件**：`IngestPage.vue` 设置 Tab

支持多个 LLM 供应商（通过 `claude` CLI 的环境变量传递）：

| 供应商 | Base URL | 默认模型 |
|--------|----------|---------|
| Anthropic | (原生) | claude-sonnet-4-20250514 |
| OpenRouter | openrouter.ai/api/v1 | anthropic/claude-sonnet-4-20250514 |
| DeepSeek | api.deepseek.com/v1 | deepseek-chat |
| 智谱 GLM | open.bigmodel.cn/api/paas/v4 | glm-4-plus |
| MiniMax | api.minimax.chat/v1 | MiniMax-Text-01 |
| SiliconFlow | api.siliconflow.cn/v1 | deepseek-ai/DeepSeek-V3 |
| 自定义 | 用户填写 | 用户填写 |

配置保存到 `.ingest-config.json`，切换供应商时自动填充默认 base URL 和模型。提供"测试连接"功能验证 API Key 和网络可达性。

## 安全设计

- **路径穿越防护**：`join(RAW_DIR, filePath)` 后校验 `fullPath.startsWith(RAW_DIR)`
- **目录白名单**：上传目标目录必须在 `RAW_SUBDIRS` 列表中
- **文件大小限制**：100MB（`@fastify/multipart` 配置）
- **CORS 全开放**：因 API 和前端分属不同端口，需 `@fastify/cors` 全开放
- **API Key 不回传**：配置查询只返回 key 前后各 4 位 + 掩码

## 涉及文件

| 文件 | 职责 |
|------|------|
| `wikiapp/scripts/ingest-api.ts` | 全部 API 端点 |
| `wikiapp/.vitepress/theme/components/IngestPage.vue` | 摄入页面（6 个 Tab 容器） |
| `wikiapp/.vitepress/theme/components/FileUploader.vue` | 文件上传组件 |
| `wikiapp/.vitepress/theme/components/FileBrowser.vue` | 文件浏览 + 预览组件 |
| `wikiapp/.vitepress/theme/components/FileGroup.vue` | 文件卡片列表组件 |
| `wikiapp/.vitepress/theme/components/ProcessQueue.vue` | 加工队列组件 |
