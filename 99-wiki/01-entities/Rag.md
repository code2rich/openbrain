---
title: Rag
description: rag
type: entity
knowledge_type: permanent
review_cycle: null
created: 2026-04-16
updated: 2026-04-16
tags:
  - llm
  - nlp
  - knowledge-retrieval
  - generation
keywords:
  - 检索增强生成
  - Retrieval Augmented Generation
  - 知识库问答
  - 大模型外挂知识库
scenes:
  - 企业知识库构建
  - 智能客服系统
  - 文档问答助手
related:
  - llm-wiki
  - rag-vs-llm-wiki
sources: []
insights: []
---

# RAG (检索增强生成)

## 简介
**RAG** (Retrieval-Augmented Generation) 是一种结合了信息检索与生成式人工智能的技术架构。它旨在解决大型语言模型 (LLM) 存在的**知识时效性不足**、**幻觉问题** 以及**专业知识领域缺乏** 等局限性。通过在生成阶段引入外部知识库，RAG 能够显著提高回答的准确性和可信度。

## 关键信息
*   **核心原理**：
    1.  **索引**: 将私有数据分割并向量化存储到向量数据库中。
    2.  **检索**: 根据用户问题查询向量数据库，获取相关的上下文片段。
    3.  **生成**: 将检索到的上下文与用户问题组合，输入 LLM 生成最终回答。
*   **优势**：
    *   无需重新训练模型即可引入新知识。
    *   减少模型“一本正经胡说八道”的情况。
    *   数据来源可追溯，透明度更高。
*   **应用场景**：企业内部文档搜索、基于特定行业数据的问答系统、辅助阅读长文本。

## 相关页面
*   [[llm-wiki]]: 了解大型语言模型的基础知识。
*   [[rag-vs-llm-wiki]]: 对比纯 LLM 方案与 RAG 方案的差异。
