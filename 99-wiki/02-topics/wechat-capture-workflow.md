---
title: 公众号文章自动化抓取工作流
description: OpenClaw + Playwright + jieba 实现公众号文章自动下载、分类、生成索引
type: topic
created: 2026-04-13
updated: 2026-04-13
tags: [wechat, automation, knowledge-management, openclaw, playwright]
related: [[llm-wiki]], [[obsidian-vault-ops]]
used_in: []
insights:
  - date: 2026-04-15
    summary: OpenClaw + jieba 的组合证明本地工具链完全可以替代云端服务
keywords: [公众号抓取, OpenClaw, Playwright, jieba, 自动化, 知识库, WeChat, 分类]
scenes:
  - 当我想批量采集公众号文章到本地知识库时
  - 当我在设计文章自动分类和索引方案时
  - 当我想对比 Web Clipper 和脚本抓取两种知识采集方式时
  - 当我需要搭建公众号内容的离线存档系统时
knowledge_type: periodic
review_cycle: 90
---

# 公众号文章自动化抓取工作流

用 OpenClaw + 自建脚本工具，把零散的公众号内容沉淀成可检索、可分类的本地知识库。

## 核心痛点

- 收藏夹越堆越多，真要用时找不到
- 文章被删、链接失效，无法回溯
- 做主题调研时，只能一个个手动复制粘贴

## 解决方案架构

```
公众号链接 → Playwright 抓取 → jieba 关键词分类 → 本地知识库
```

### 技术栈

| 工具 | 用途 |
|------|------|
| Playwright | 自动化浏览器，抓取正文和图片 |
| jieba | 中文分词，关键词统计分类 |
| OpenClaw | AI 助手框架，声明工具供 AI 调用 |

### 分类逻辑

预设 4 个主题类别 + 1 个「未分类」：
- 战略与框架
- 实践与案例
- 工具与方法
- 组织与文化

每篇文章按关键词命中数自动归类，得分太低进「未分类」。

## 知识库目录结构

```
WeChat_Articles_Knowledge_Base/
├── README.md              # 全库索引（分类 | 编号 | 标题 | 摘要 | 关键词）
├── des_wx_url_list.txt    # 原文链接列表
├── _images/               # 文章配图
├── 01-战略与框架/
├── 02-实践与案例/
├── 03-工具与方法/
├── 04-组织与文化/
└── 05-未分类/
```

每篇文章保存为：
- `.html` — 完整正文 + 本地图片引用，离线可看
- `.txt` — 纯文本，方便 AI 读取做摘要/RAG

## AI 配合方式

在 OpenClaw 的 `TOOLS.md` 声明工具：

```bash
# 传入 URL 或 -f urls.txt 批量下载
./run_playwright.sh "https://mp.weixin.qq.com/s/xxxxx"
```

AI 收到公众号链接时自动调用，完成后读取 README 告知保存位置。

## 与当前 Vault 的对比

| 方案 | 自动化程度 | 分类方式 | 输出格式 |
|------|-----------|----------|----------|
| 本文方案 | 高（脚本自动跑） | jieba 关键词 | HTML + TXT |
| 当前 Vault | 中（Obsidian Clipper 手动剪藏） | 固定目录 | Markdown |

## 关键心得

> 「以前收藏文章多半是『先存着再说』，结果很少回头看。有了工具后，会刻意把同一主题的文章攒一批，一次性下载、分类，再让 AI 做综述或提炼要点。知识不再是散落的链接，而是结构化的本地资产。」

**把信息变成知识，从「能存」到「能用」，这才是知识库的意义。**

## 来源

- [把喜欢的公众号文章，OpenClaw一键变成自己的知识库](https://mp.weixin.qq.com/s/I6AksgeZi14axiBfimFlQA) by 小智
