# 知识图谱与站点导航设计

## 功能概述

知识库的可视化呈现与导航体系。包括知识图谱、首页仪表盘、标签索引、分类列表、面包屑、页面底栏（反向链接 + 来源溯源）。

## 知识图谱

**组件**：`Graph.vue` + D3.js

### 数据来源

`generate-sidebar.ts` 生成两份数据：

- `graph-data.ts`：基础版，节点 + 边
- `graph-data-echarts.ts`：增强版，含节点权重（基于 `used_in` 引用次数）和边权重

### 图谱构建规则

```
节点：99-wiki 中每个 .md 文件
边来源（两种）：
  1. frontmatter 的 related 字段
  2. 正文中内联的 [[wiki-link]] 引用

节点颜色：
  蓝色 = 01-entities（实体）
  绿色 = 02-topics（主题）
  琥珀色 = 03-comparisons（对比）
```

### 交互设计

- **力导向布局**：D3 force simulation（charge + link + center + collision）
- **拖拽**：节点可拖拽重新定位
- **缩放平移**：`d3.zoom` 支持滚轮缩放和拖拽平移
- **点击导航**：点击节点跳转到对应 wiki 页面（VitePress SPA 路由）
- **响应式**：ResizeObserver 监听容器尺寸变化，自动重新居中

### 节点权重计算

```
weight = used_in 引用次数（被多少产出文档引用）
→ 节点半径与 weight 成正比，反映知识的实际消耗频率
```

## 首页仪表盘

**组件**：`WikiHome.vue` + `RandomPage.vue`

### 页面结构

```
┌─────────────────────────────────────────────┐
│  Hero 区域                                   │
│  标语："把知识编译为可复用的结构化资产"        │
│  [随机漫游] 按钮                              │
├─────────────────────────────────────────────┤
│  理念区域（3 张卡片）                         │
│  理解 > 信息 │ AI 知识管理员 │ 个人洞察 > 来源 │
├─────────────────────────────────────────────┤
│  工作流可视化                                 │
│  摄入 → 查询 → 归档 → 维护                   │
├─────────────────────────────────────────────┤
│  统计面板                                     │
│  总页面 │ 实体 │ 主题 │ 对比 │ 标签           │
├─────────────────────────────────────────────┤
│  标签云（Top 20）→ 点击跳转 /tags#tagId       │
├─────────────────────────────────────────────┤
│  最近更新（8 篇）→ 分类徽章 + 标题 + 描述     │
├─────────────────────────────────────────────┤
│  导航卡片                                     │
│  实体页 │ 主题页 │ 对比页 │ 知识图谱           │
└─────────────────────────────────────────────┘
```

**随机漫游**：`RandomPage.vue` 从 generated pages 列表中随机选一页，直接 SPA 跳转。

## 标签索引

**组件**：`TagFilter.vue`

- 页面路由：`/tags.html`
- 展示所有标签，按使用频率降序排列
- 点击标签过滤页面列表
- 支持 URL hash 恢复：`/tags.html#some_tag`（从首页标签云直接跳转）
- 每条结果显示分类徽章 + 页面标题 + 描述

## 分类列表

**组件**：`CategoryList.vue`

- 自动生成于每个分类的 `index.md`：`/wiki/01-entities/`、`/wiki/02-topics/`、`/wiki/03-comparisons/`
- 检测当前 URL 路径确定分类
- 页面按拼音排序（`localeCompare('zh-CN')`）
- 每页显示为卡片：标题 + 日期 + 描述 + 最多 4 个标签

## 面包屑

**组件**：`Breadcrumb.vue`

- 仅在 `/wiki/*` 页面显示
- 路径：`首页 / {分类名称}`
- 使用 VitePress `useData()` 获取当前路由

## 页面底栏

**组件**：`PageFooter.vue`

### 信息区块

```
┌──────────────────────────────────────────────────┐
│  元数据行：预计阅读时间 │ 创建日期 │ 更新日期      │
├──────────────────────────────────────────────────┤
│  标签行：[tag1] [tag2] [tag3] → 点击跳转标签页    │
├──────────────────────────────────────────────────┤
│  相关页面行：[[相关页1]] [[相关页2]]              │
├──────────────────────────────────────────────────┤
│  来源溯源行：📄 source1.md 📕 source2.pdf        │
│  （点击可弹出源文件预览模态框）                    │
├──────────────────────────────────────────────────┤
│  反向链接行：哪些页面引用了当前页面               │
├──────────────────────────────────────────────────┤
│  前后导航：← 上一页 │ 下一页 →                    │
└──────────────────────────────────────────────────┘
```

### 来源溯源

`generate-sidebar.ts` 构建 `sources.ts`：扫描 `99-wiki/log.md` 中的摄入记录，建立 `slug → [raw files]` 映射。

PageFooter 渲染来源列表，点击来源文件时：
1. 检测 API 是否可达（`localhost:3456`）
2. 调用 `/api/preview?path=xxx` 获取预览数据
3. 使用 Teleport 渲染预览模态框（复用文件预览系统的 PDF/HTML/文本渲染逻辑）

### 反向链接

`generate-sidebar.ts` 构建 `backlinks.ts`：扫描所有页面的 `[[wiki-links]]` 和 `related` 字段，生成反向引用图 `targetSlug → [sourceSlugs]`。

### 前后导航

`generate-sidebar.ts` 构建 `prev-next.ts`：每个分类内的页面按字母排序，生成 prev/next 映射。

## 涉及文件

| 文件 | 职责 |
|------|------|
| `wikiapp/.vitepress/theme/components/Graph.vue` | D3 知识图谱 |
| `wikiapp/.vitepress/theme/components/WikiHome.vue` | 首页仪表盘 |
| `wikiapp/.vitepress/theme/components/RandomPage.vue` | 随机漫游 |
| `wikiapp/.vitepress/theme/components/TagFilter.vue` | 标签索引 |
| `wikiapp/.vitepress/theme/components/CategoryList.vue` | 分类列表 |
| `wikiapp/.vitepress/theme/components/Breadcrumb.vue` | 面包屑导航 |
| `wikiapp/.vitepress/theme/components/PageFooter.vue` | 页面底栏 |
| `wikiapp/scripts/generate-sidebar.ts` | 生成图谱/标签/反向链接等数据 |
