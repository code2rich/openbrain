# 文件预览系统设计

## 架构总览

```
┌─────────────────────────────────────────────────────────┐
│  Vue 前端 (FileBrowser.vue)                             │
│                                                         │
│  点击文件 → GET /api/preview?path=xxx                   │
│       ↓                                                 │
│  根据 type 字段选择渲染方式：                            │
│    pdf  → <iframe :src="url">                           │
│    html → <div v-html="content">                        │
│    image → <img :src="content">                         │
│    text → <pre>{{ content }}</pre>                      │
│    binary → <p>不支持提示</p>                            │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  Fastify API (ingest-api.ts, 端口 3456)                 │
│                                                         │
│  GET /api/preview?path=xxx   → 判断类型，返回结构化数据  │
│  GET /api/raw?path=xxx       → 返回原始二进制文件        │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  文件系统 (00-raw/)                                     │
│  路径校验：fullPath.startsWith(RAW_DIR) 防路径穿越       │
└─────────────────────────────────────────────────────────┘
```

## 两个 API 端点

### GET /api/preview

根据文件扩展名判断类型，返回结构化的预览数据：

```ts
// 返回格式
{ type: 'text' | 'image' | 'pdf' | 'html' | 'binary', content?: string, url?: string, message?: string }
```

### GET /api/raw

直接返回原始二进制文件，带正确的 Content-Type。用于 PDF iframe 嵌入。

## 文件类型支持矩阵

| 类型 | 扩展名 | 预览方式 | 后端处理 | 前端渲染 |
|------|--------|---------|---------|---------|
| 文本 | `.md .txt .json .yml .yaml .csv .log .html .xml .sh .py .js .ts .css .toml .go .rs .java .c .cpp .sql` 等 30+ 种 | 直接读 UTF-8 | `content.toString('utf-8')` | `<pre>` 标签 |
| 图片 | `.png .jpg .jpeg .gif .webp` | Base64 内联 | `data:image/xxx;base64,...` | `<img>` 标签 |
| PDF | `.pdf` | iframe 嵌入 | 返回 raw URL | `<iframe>` 浏览器原生渲染 |
| Word | `.docx` | mammoth.js 转 HTML | `mammoth.convertToHtml()` | `<div v-html>` |
| Word | `.doc` | 不支持 | 返回 binary + 提示信息 | 显示提示文字 |
| PPT | `.pptx` | JSZip 解压提取文本 | 解析 `ppt/slides/slideN.xml` 中的 `<a:t>` 标签 | `<pre>` 标签 |
| PPT | `.ppt` | 不支持 | 返回 binary + 提示信息 | 显示提示文字 |
| 其他 | 任意 | 不支持 | 返回 binary | 显示提示文字 |

## 关键技术选型

| 依赖 | 用途 | 选择理由 |
|------|------|---------|
| `mammoth` | .docx → HTML | 纯 JS，无 native 依赖，~200KB，社区标准方案 |
| `jszip` | .pptx 文本提取 | 解压 ZIP 读取 XML，轻量可靠 |
| 浏览器原生 PDF 渲染 | .pdf 预览 | 零依赖，所有现代浏览器内置支持 |

## 前端渲染逻辑 (FileBrowser.vue)

```
previewFile.type === 'pdf'   → <iframe :src="previewFile.url" class="pdf-frame">
previewFile.type === 'html'  → <div v-html="previewFile.content" class="html-preview">
previewFile.type === 'image' → <img :src="previewFile.content">
previewFile.type === 'text'  → <pre>{{ previewFile.content }}</pre>
else                         → <p>{{ previewFile.message || '不支持预览此文件类型' }}</p>
```

URL 拼接规则：后端返回相对路径 `/api/raw?path=xxx`，前端拼接 `API_BASE`（`http://localhost:3456`）为完整 URL。

## 踩过的坑

### Content-Disposition 中文文件名导致 500

**问题**：PDF raw 端点设置 `Content-Disposition: inline; filename="中文文件名.pdf"`，HTTP header 不允许非 ASCII 字符，Fastify 抛出 `ERR_INVALID_CHAR`。

**修复**：对文件名做 `encodeURIComponent()` 编码。

```ts
// 错误写法
reply.header('Content-Disposition', `inline; filename="${filePath.split('/').pop()}"`)

// 正确写法
const safeName = encodeURIComponent(filePath.split('/').pop() || 'document.pdf')
reply.header('Content-Disposition', `inline; filename="${safeName}"`)
```

## 上传入口支持的文件类型 (FileUploader.vue)

```
.md .txt .pdf .doc .docx .pptx .ppt .xlsx .xls .csv
.json .yaml .yml .html .epub .rtf .log
```

## 文件图标映射 (FileGroup.vue)

| 扩展名 | 图标 | 扩展名 | 图标 |
|--------|------|--------|------|
| md | 📄 | pptx/ppt | 📊 |
| txt | 📝 | xlsx/xls | 📈 |
| pdf | 📕 | csv | 📋 |
| doc/docx | 📘 | json | 🔧 |
| png/jpg/gif/webp | 🖼 | yaml/yml | ⚙️ |
| html | 🌐 | 其他 | 📄 |

## 涉及文件清单

| 文件 | 职责 |
|------|------|
| `wikiapp/scripts/ingest-api.ts` | 后端 API：raw 端点 + preview 类型判断 |
| `wikiapp/.vitepress/theme/components/FileBrowser.vue` | 前端预览模态框，按 type 分支渲染 |
| `wikiapp/.vitepress/theme/components/FileUploader.vue` | 上传验证，validTypes 白名单 |
| `wikiapp/.vitepress/theme/components/FileGroup.vue` | 文件列表图标映射 |
| `wikiapp/package.json` | 依赖：mammoth、jszip |
