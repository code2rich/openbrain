# wikiapp

OpenBrain 的 Web 展示系统，基于 VitePress + D3.js，支持 Docker Compose 一键部署。

## 功能

- **知识图谱** — D3.js 力导向图展示 wiki 页面关联关系
- **标签索引** — 按 tag 聚类浏览
- **知识摄入** — Web UI 上传文件、预览、AI 加工为结构化知识
- **知识维护** — Lint API 检查矛盾、孤立页面、时效性

## 快速开始

```bash
# 安装依赖
npm install

# 本地开发
npm run dev

# Docker 部署（推荐）
docker compose up -d --build
```

启动后访问：
- **Wiki 站点**：http://localhost:8080
- **摄入 API**：http://localhost:3457

## 开发命令

```bash
npm run generate    # 扫描 99-wiki 生成侧边栏/标签/图谱数据
npm run dev         # generate + VitePress 开发服务器
npm run build       # generate + VitePress 生产构建
npm run lint        # 知识库健康检查
npm run api         # 启动摄入 API 服务
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `RAW_DIR` | 00-raw 目录路径 | 自动检测（相对路径 `../../00-raw`） |
| `WIKI_DIR` | 99-wiki 目录路径 | 自动检测（相对路径 `../../99-wiki`） |

## 项目结构

```
wikiapp/
├── .vitepress/
│   ├── config.ts              # VitePress 配置
│   ├── plugins/wiki-link.ts   # [[wiki-link]] Markdown 插件
│   ├── scripts/
│   │   ├── generate-sidebar.ts # 扫描 wiki 生成配置
│   │   ├── ingest-api.ts      # Fastify 摄入 API
│   │   ├── wiki-lint.ts       # 知识库健康检查
│   │   └── dream-runner.ts    # Dream 知识巩固模式
│   └── theme/                 # Vue 自定义主题和组件
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## License

[MIT](../LICENSE)
