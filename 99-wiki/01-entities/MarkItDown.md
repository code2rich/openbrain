---
title: MarkItDown
description: 微软开源的文档转 Markdown 工具，107k stars，支持 PDF/Word/Excel/PPT/图片/音频等格式，提供 MCP 集成
type: entity
knowledge_type: periodic
review_cycle: 90
created: 2026-04-18
updated: 2026-04-18
last_reviewed: 2026-04-18
tags: [tool, markdown, document-conversion, microsoft, mcp]
keywords: [markitdown, 文档转换, PDF转Markdown, Word转Markdown, MCP, 微软开源]
scenes:
  - 搭建知识库时需要将 PDF/Word 等格式的原始文档统一转为 Markdown
  - Agent 需要实时读取非 Markdown 格式文件内容
  - 批量处理知识库中的异构文档
related: "[[personal-knowledge-system]], [[llm-wiki]], [[auto-ingest-pipeline]], [[mcp-ecosystem]]"
sources:
  - 00-raw/01-Clippers/用 Markdown 搭知识库，但资料全是 PDF 和 Word，这个工具帮我统一了格式.md
insights:
  - date: 2026-04-18
    summary: MarkItDown 的 MCP 集成是关键差异化能力，让 Agent 可以实时读取文件而不需要预转换，对 LLM-Wiki 摄入管线有直接价值
---

# MarkItDown

微软开源的文档格式转换工具，GitHub 107k stars。将 PDF、Word、Excel、PPT 等多种格式一键转为 Markdown。

## 支持的格式

| 类别 | 格式 |
|------|------|
| 文档 | PDF、Word (.docx)、PowerPoint (.pptx)、Excel (.xlsx) |
| 图片 | EXIF 元数据 + OCR（接 LLM） |
| 音频 | 语音转文字 |
| 数据 | HTML、CSV、JSON、XML |
| 其他 | ZIP（自动遍历）、YouTube（提取字幕）、EPub 电子书 |

## 为什么转 Markdown

Markdown 接近纯文本但保留结构（标题、列表、表格），主流 LLM 训练时大量接触 Markdown，理解和处理效果优于原始二进制流，Token 消耗也更少。

## 安装

```bash
# 全部格式
pip install 'markitdown[all]'

# 按需安装
pip install 'markitdown[pdf,docx,pptx]'
```

## 使用方式

### 命令行

```bash
markitdown 报告.pdf -o 报告.md
cat 报告.pdf | markitdown
```

### Python API

```python
from markitdown import MarkItDown

md = MarkItDown()
result = md.convert("文档.docx")
print(result.text_content)
```

### 批量处理

```python
from markitdown import MarkItDown
from pathlib import Path

md = MarkItDown()
source_dir = Path("./原始文档")
output_dir = Path("./知识库")
output_dir.mkdir(exist_ok=True)

for file in source_dir.glob("**/*"):
    if file.suffix in [".pdf", ".docx", ".pptx", ".xlsx"]:
        result = md.convert(str(file))
        out_path = output_dir / (file.stem + ".md")
        out_path.write_text(result.text_content, encoding="utf-8")
```

### 图片 OCR（接视觉模型）

```python
from markitdown import MarkItDown
from openai import OpenAI

md = MarkItDown(llm_client=OpenAI(), llm_model="gpt-4o")
result = md.convert("扫描件.pdf")
```

### MCP 集成

提供 MCP 服务器，可集成到 Claude Desktop 等 AI 工具中，让 Agent 实时读取文件内容，无需预转换。

## 与本 Wiki 的关系

- **摄入管线**：[[auto-ingest-pipeline]] 可用 MarkItDown 预处理 `00-raw/` 中的非 Markdown 文件
- **知识库构建**：[[personal-knowledge-system]] 的文档预处理环节
- **MCP 生态**：[[mcp-ecosystem]] 中的实用 MCP 服务器之一

## 关键数据

- GitHub: microsoft/markitdown
- Stars: 107k (截至 2026-04)
- 开源协议: MIT
