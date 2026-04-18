# 知识库构建流水线设计

## 功能概述

将 `99-wiki/` 中的 Obsidian Markdown 文件编译为 VitePress 静态站点的完整流水线。包括数据扫描、frontmatter 预处理、配置生成、Markdown 插件、Docker 构建部署。

## 构建流程

```
99-wiki/*.md
    │
    ▼
generate-sidebar.ts
    │  扫描三个分类目录
    │  解析 YAML frontmatter
    │  提取 [[wiki-links]]
    │  复制预处理文件到 .wiki-preprocessed/
    ├─────────────────────────────────────┐
    │                                     │
    ▼                                     ▼
.witepress/generated/              .wiki-preprocessed/
  sidebar.ts                         01-entities/*.md
  pages.ts                           02-topics/*.md
  tags.ts                            03-comparisons/*.md
  graph-data.ts
  graph-data-echarts.ts
  slug-map.ts
  backlinks.ts
  prev-next.ts
  sources.ts
    │
    ▼
VitePress Build
    │  markdown-it 渲染
    │  wiki-link 插件转换 [[slug]] → <a href>
    │  Vue SFC 编译
    │  静态资源打包
    ▼
.vitepress/dist/  →  Docker serve (port 8080)
```

## generate-sidebar.ts

### 职责

扫描 `99-wiki/` 目录，生成 VitePress 站点所需的全部配置数据。

### 生成文件清单

| 输出文件 | 数据结构 | 用途 |
|---------|---------|------|
| `sidebar.ts` | `SidebarConfig` | VitePress 侧边栏导航树 |
| `pages.ts` | `PageMeta[]` | 全部页面元数据（slug, title, tags, dates, description, category） |
| `tags.ts` | `Record<string, string[]>` | 标签 → 页面 slug 索引（按频率排序） |
| `graph-data.ts` | `{ nodes, links }` | D3 基础图谱数据 |
| `graph-data-echarts.ts` | `{ nodes, links }` | 增强图谱数据（含 weight 字段） |
| `slug-map.ts` | `Record<string, string>` | slug → HTML 路径映射（wiki-link 解析用） |
| `backlinks.ts` | `Record<string, string[]>` | 反向引用图（谁链接了我） |
| `prev-next.ts` | `Record<string, {prev, next}>` | 分类内前后页导航 |
| `sources.ts` | `Record<string, string[]>` | slug → 来源 raw 文件映射 |

### Frontmatter 预处理

99-wiki 的 frontmatter 使用 Obsidian 语法 `related: [[a]], [[b]]`，与标准 YAML 不兼容。预处理步骤：

```ts
// 将 related: [[slug1]], [[slug2]] 转为合法 YAML
line.replace(/^(\s*related:\s*)\[+(.*?)\]/, '$1["$2"]')
// 将 [[slug]] 转为 "slug"
content.replace(/\[\[([^\]|]+)\]\]/g, '"$1"')
```

### Wiki-Link 提取

```ts
// 从正文中提取所有 [[wiki-links]]
for (const match of raw.matchAll(/\[\[([^\]|]+?)(?:\|[^\]]+)?\]\]/g)) {
  links.add(match[1].trim())
}
```

提取的链接用于构建图谱边和反向链接。

## wiki-link 插件

**文件**：`.vitepress/plugins/wiki-link.ts`

自定义 markdown-it inline 规则，将 Obsidian 风格的双链转换为标准 HTML 链接。

```
[[slug]]        → <a href="/wiki/{category}/{slug}.html" class="wiki-link">slug</a>
[[slug|显示名]]  → <a href="/wiki/{category}/{slug}.html" class="wiki-link">显示名</a>
[[不存在页]]     → <a href="#" class="wiki-link broken">不存在页</a>
```

**slug 解析**：查询 `slug-map.ts`，找到 slug 对应的 HTML 路径。未找到则标记为 `broken`，前端用红色虚线样式提示。

## VitePress 配置

**文件**：`.vitepress/config.ts`

| 配置项 | 值 |
|--------|-----|
| 站点标题 | OpenBrain |
| 语言 | zh-CN |
| Sitemap | `SITE_URL` 环境变量配置 |
| 搜索 | 本地搜索（VitePress 内置） |
| 导航栏 | 首页 / 实体 / 主题 / 对比 / 图谱 / 标签 / 摄入 |
| 侧边栏 | 按分类自动生成 |
| 页脚 | OpenBrain · 开开脑子 |
| 排除 | CLAUDE.md |

## 自定义主题

**文件**：`.vitepress/theme/Layout.vue`

覆盖 VitePress 默认 Layout：

- `/wiki/*` 页面：注入 `<Breadcrumb />` 和 `<PageFooter />`
- `/ingest` 页面：完全替换为 `<IngestPage />`
- 注册全局组件：WikiHome, Graph, TagFilter, RandomPage, CategoryList

## Docker 构建

### Dockerfile

```
基础镜像：docker.1ms.run/node:20-alpine（国内镜像加速）
npm 源：npmmirror.com
构建步骤：npm install → entrypoint script
暴露端口：80
```

### docker-compose.yml

```yaml
volumes:
  - ../99-wiki:/app/99-wiki      # 读写（构建时预处理）
  - ../00-raw:/app/00-raw:ro     # 只读（来源溯源）
ports:
  - "8080:80"
```

### build.sh（Docker 入口）

```bash
tsx scripts/generate-sidebar.ts   # 扫描 wiki → 生成配置
npx vitepress build               # VitePress 静态构建
npx serve .vitepress/dist -l 80   # 静态文件服务
```

**架构决策**：Docker 容器只负责构建和 serve 静态站点。摄入 API（端口 3456）运行在宿主机，因为需要 `claude` CLI 和完整 workspace 访问权限。

## 涉及文件

| 文件 | 职责 |
|------|------|
| `wikiapp/scripts/generate-sidebar.ts` | 数据扫描与配置生成 |
| `wikiapp/.vitepress/plugins/wiki-link.ts` | Markdown 双链插件 |
| `wikiapp/.vitepress/config.ts` | VitePress 站点配置 |
| `wikiapp/.vitepress/theme/Layout.vue` | 自定义主题布局 |
| `wikiapp/.vitepress/theme/index.ts` | 主题注册入口 |
| `wikiapp/Dockerfile` | Docker 镜像定义 |
| `wikiapp/docker-compose.yml` | Docker Compose 编排 |
| `wikiapp/scripts/build.sh` | Docker 入口脚本 |
