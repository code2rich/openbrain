---
title: CodeFlow
description: 单 HTML 文件的浏览器端代码架构分析工具，Tree-sitter WASM 解析 + D3.js 可视化，支持爆炸半径分析和安全扫描
type: entity
knowledge_type: periodic
review_cycle: 90
created: 2026-04-18
updated: 2026-04-18
last_reviewed: 2026-04-18
tags: [developer-tools, code-analysis, visualization, open-source]
keywords: [codeflow, 代码分析, 依赖图, 爆炸半径, tree-sitter, 静态分析, blast-radius]
scenes:
  - 接手新项目时快速理解代码架构
  - 重构前评估代码变更的影响范围（爆炸半径）
  - Code Review 时理解文件间依赖关系
  - 安全审计检测硬编码密钥和注入漏洞
  - 学习优秀开源项目架构
related: "[[Graphify]], [[knowledge-graph-visualization]], [[llm-wiki]]"
sources:
  - "00-raw/01-Clippers/codeflow  github上最被低估的黑科技，仅用一个html文件，浏览器直接\"透视\"整个项目架构，自动计算代码变更的爆炸半径！.md"
insights:
  - date: 2026-04-18
    summary: CodeFlow 和 Graphify 定位互补——CodeFlow 偏向「项目级代码架构分析」和变更影响评估，Graphify 偏向「知识图谱化」和 AI 长期记忆。两者都用 tree-sitter 但目的不同。
---

## 基本信息

| 属性 | 值 |
|------|-----|
| 项目名 | CodeFlow |
| 仓库 | `braedonsaunders/codeflow` |
| 在线工具 | `codeflow-five.vercel.app` |
| 定位 | 浏览器端代码架构分析工具 |
| 特色 | 单个 HTML 文件，零安装，100% 客户端运行 |
| 许可证 | 开源 |

## 核心功能

### 1. 交互式依赖图

文件间连接关系的力导向图，支持拖拽、缩放、点击高亮依赖项。支持四种可视化模式：文件夹、层级、变更频率、爆炸半径。

### 2. 爆炸半径分析（Blast Radius）

选择任何文件，精确显示修改该文件会影响多少下游文件。适用场景：重构前评估风险、Code Review 理解影响范围、技术债务评估。

### 3. 代码所有权

基于 Git 历史记录，显示每个文件的主要贡献者。用于快速找到模块负责人、分配 Code Review 任务。

### 4. 安全扫描

自动检测：硬编码密钥/API Key、SQL 注入、危险 eval()、调试语句。

### 5. 模式检测

自动识别设计模式（单例、工厂、观察者）和反模式（上帝对象、高耦合）。

### 6. 健康评分

A-F 等级评分，基于死代码比例、循环依赖、耦合度、安全问题。

### 7. 活动热力图

按提交频率着色，识别核心模块和维护热点。

### 8. PR 影响分析

粘贴 PR 链接，计算变更的爆炸半径。

### 9. 本地文件分析

拖拽文件/文件夹，完全离线处理，隐私优先。

### 10. 导出报告

支持导出完整分析数据（JSON），含健康评分、函数统计、安全问题、重复代码检测等。

## 技术架构

```
数据获取层 (GitHub API)
    ↓
语法解析层 (Tree-sitter WASM)
    ↓
逻辑处理层 (JavaScript)
    ├── Extract: 遍历语法树，提取函数/类定义
    └── Connect: 跨文件搜索调用关系（Call Detection）
    ↓
可视化层 (D3.js + React)
```

关键技术决策：

- **Tree-sitter WASM**：加载编译为 WASM 的语言语法规则（如 `tree-sitter-python.wasm`），实现与 VS Code 同款的精确语法解析，能理解作用域、装饰器、async/await
- **CST 精确调用检测**：通过检查 `node.parent.type` 区分函数定义和函数调用，排除注释/字符串中的同名误报
- **WASM 降级兜底**：网络异常时用正则 `stripPythonNonCode` 回退
- **Batching & Yielding**：大项目分块处理，每块之间 `setTimeout(0)` 交还主线程控制权，防止 UI 冻结
- **零依赖安装**：React 18、D3.js 7、Babel 均通过 CDN 加载

## 支持语言

30+ 种语言，包括 JS/TS、Python、Java、Go、Rust、C/C++、C#、Swift、Kotlin、Ruby、PHP、Vue、Svelte 等。

## 使用限制

| 方式 | GitHub API 速率 |
|------|----------------|
| 无 Token | 60 次/小时 |
| Personal Access Token | 5000 次/小时 |
| GitHub App | 5000 次/小时/安装 |

大型仓库（如 kubernetes）分析可能需要几分钟。

## 与相关工具对比

| 维度 | CodeFlow | [[Graphify]] |
|------|----------|-------------|
| 核心目的 | 代码架构可视化 + 变更影响评估 | 代码库知识图谱 + AI 长期记忆 |
| 解析引擎 | Tree-sitter WASM | Tree-sitter + Claude 语义分析 |
| 运行方式 | 浏览器单 HTML | Node.js CLI |
| 输出 | 交互式依赖图 + 健康报告 | 结构化知识图谱 |
| 目标用户 | 开发者理解项目 | AI Agent 理解项目 |
