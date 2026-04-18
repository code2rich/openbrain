---
title: Document Skills
description: 让 AI 统一格式、规范复用的文档类技能包
type: topic
created: 2026-04-13
updated: 2026-04-13
tags: [ai-tools, document, agent-skills, claude-code]
related: [[agent-skills]], [[llm-wiki]]
used_in: []
insights:
  - date: 2026-04-15
    summary: 文档技能包的本质是可复用的 Prompt 模板，与 Claude Code 的 Skills 生态一脉相承
keywords: [Document Skills, Claude Code, 技能包, 文档处理, PDF, DOCX, XLSX, agent-skills]
scenes:
  - 当我想让 AI 按统一规范处理各种文档格式时
  - 当我在评估 Claude Code 的 Skills 生态时
  - 当我需要让团队共享文档处理规范时
  - 当我想了解如何创建自定义 AI 技能包时
knowledge_type: periodic
review_cycle: 90
---

# Document Skills

让 AI「怎么写文档」变成可复用、可版本管理的能力。

## 核心问题

写文档最烦的两件事：
1. **格式不统一** — 今天一个样明天另一个样
2. **规范说不清** — 团队有模板但每次都对 AI 讲不完整

## 解决方案

把「怎么写好文档」打包成技能包，AI 每次都用同一套规范执行。

| 能力 | 说明 |
|------|------|
| 格式统一 | 章节结构、标题层级、表格和代码块规范写死在技能包里 |
| 规范可沉淀 | 团队的文档规范、示例模板写进 SKILL.md 和 references/ |
| 可移植 | 基于 Agent Skills 开放标准，不锁死在某个产品 |
| 版本可控 | 技能放 Git，谁改了什么、什么时候改的一清二楚 |
| 按需加载 | 详细说明放在 references/，AI 用到再读，不占上下文 |

## 与普通 AI 写文档的区别

| 对比项 | 普通 AI 写文档 | Document Skills |
|--------|----------------|-----------------|
| 规范与模板 | 每次都要口头说明 | 技能里已写好，一次配置长期生效 |
| 一致性 | 容易风格不一 | 同一技能下输出风格统一 |
| 可复用 | 难以在团队/项目间复用 | 可放进仓库或从 GitHub 安装 |
| 触发方式 | 只能主动说「写文档」 | 可自动识别，也可用 `/` 手动唤起 |

## 技能模块

Claude Code 的 document-skills 包含：

| 模块 | 用途 |
|------|------|
| `pdf` | 读取处理 PDF |
| `docx` | Word 文档 |
| `pptx` | PowerPoint 幻灯片 |
| `xlsx` | Excel 表格 |
| `doc-coauthoring` | 文档协作 |
| `skill-creator` | 创建新技能 |

## 使用方式

```javascript
/document-skills:pdf    // 读取 PDF
/document-skills:xlsx  // 处理 Excel
```

或直接用自然语言描述需求，Claude 会自动判断调用哪个模块。

## 安装

```bash
claude plugins install document-skills
```

## 来源

- 文章：[Document Skills：让 AI 秒变「文档专家」](https://mp.weixin.qq.com/s/wLd8BZVA55xBBCiLBd2zNg) by 不姜就
