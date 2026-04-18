---
title: Wiki Log
description: 知识库操作日志，记录摄入、查询、归档、维护的时间线
type: log
created: 2026-04-13
---

# Wiki 操作日志

记录知识库的所有操作，包括摄入、查询、归档和维护。

## 格式

```
## YYYY-MM-DD

### 摄入 (Ingest)
- [file] 描述

### 查询 (Query)
- [query] 问题描述 → 结果摘要

### 归档 (Filing)
- [file] 从查询结果归档的新页面

### 维护 (Lint)
- 发现的问题及处理
```

---

## 2026-04-13

### 初始化
- [system] 知识库采用 Karpathy LLM-Wiki 架构重建

### 摄入 (Ingest)
- [file] Document Skills：让 AI 秒变「文档专家」— 创建 [[document-skills]] 主题页面
- [file] 告别 RAG！Karpathy 用 Obsidian + AI 打造「会自我进化」的知识库 — 创建 [[llm-wiki]] 主题页面和 [[andrej-karpathy]] 实体页面
- [file] 很多人做 AI 知识库都想错了 — 创建 [[rag-vs-llm-wiki]] 对比分析页面
- [file] 把喜欢的公众号文章，OpenClaw一键变成自己的知识库 — 创建 [[wechat-capture-workflow]] 主题页面
- [file] A Git helper tool that breaks large merges into parallelizable tasks — 创建 [[mergetopus]] 主题页面
- [file] Agent-driven development in Copilot Applied Science — 创建 [[agent-driven-development]] 主题页面

### 摄入 (Ingest) — 03-Manual 批量处理

- [dir] K-AI与机器学习（24篇） — 提取 AI Agent 综述、MCP 生态、AIGC 趋势知识
- [dir] K-AICoding/claudecode（45章） — 提炼 Claude Code 源码架构精华
- [dir] K-数据工程与治理（2篇） — 提取数据血缘方法论
- [dir] K-读书笔记（4篇） — 提取读书方法论
- [dir] K-学习笔记（5篇） — 提取 Claude Code 培训大纲和团队管理方法论
- [dir] K-个人知识库构建（1篇） — 提取 Obsidian+Claude Code 知识库架构
- [dir] 90-附件/tech-doc（7篇） — 提取 KYP CodeReview 项目知识和 AI 编程方法论
- [dir] P-个人成长与述职（5篇） — 提取 AIGC 编码提效和管理方法论
- [skip] K-密钥（2篇） — 跳过，含敏感凭证
- [skip] 部分含 API Key/Token 的文件 — 跳过，含敏感凭证

### 归档 (Filing)

- [file] 创建 [[kyp-codereview]] 实体页面 — KYP CodeReview 智能代码检视平台
- [file] 创建 [[anthropic-managed-agents]] 实体页面 — Anthropic Harness 编排引擎
- [file] 创建 [[ai-coding-methodology]] 主题页面 — VibeCoding + Spec-Driven 混合开发
- [file] 创建 [[claude-code-training]] 主题页面 — Claude Code 研发实战培训
- [file] 创建 [[claude-code-architecture]] 主题页面 — Claude Code 源码架构 45 章精华
- [file] 创建 [[ai-agent-overview]] 主题页面 — AI Agent 技术综述
- [file] 创建 [[mcp-ecosystem]] 主题页面 — MCP 生态系统
- [file] 创建 [[aigc-trends-2026]] 主题页面 — AIGC 趋势与组织级落地
- [file] 创建 [[data-lineage]] 主题页面 — 数据血缘方法论
- [file] 创建 [[team-management]] 主题页面 — 团队管理方法论
- [file] 创建 [[reading-methodology]] 主题页面 — 读书方法论
- [file] 创建 [[personal-knowledge-system]] 主题页面 — 个人知识库构建
- [file] 更新 [[index]] — 新增 2 实体 + 10 主题页面索引
- [file] 创建 [[auto-ingest-pipeline]] 主题页面 — 自动摄入流水线设计文档
- [pending] Z-资产配置3.0（87篇） — 分析中，预计创建 1-2 个主题页面
- [file] 创建 [[asset-allocation-platform]] 主题页面 — 资产配置平台 3.0 业务知识百科（7 大子系统、1312 功能点）

### 归档 (Filing) — 进化设计

- [file] 更新 [[personal-knowledge-system]] — 增加「进化反思」章节，记录六大缺失功能
- [file] 创建 [[wiki-evolution-design]] — 六大缺失功能的完整设计方案（P0×2 + P1×2 + P2×2）
- [file] 更新 [[index]] — 新增 wiki-evolution-design 页面索引

## 2026-04-15

### 摄入 (Ingest)
- [file] 06-Thoughts/2026-04-13.md — 三个思考碎片已吸收至 [[wiki-evolution-design]] 和 [[personal-knowledge-system]]，无需新建页面
- [file] MarkItDown 文档转 Markdown — 补充至 [[personal-knowledge-system]]「文档预处理工具」章节
- [file] Graphify 知识图谱工具 — 补充至 [[llm-wiki]]「生态工具」章节，含核心技术、关键数据、与本 Wiki 的关系分析
- [file] MemPalace AI 记忆系统 — 补充至 [[personal-knowledge-system]]「AI 记忆工具」章节，含与 LLM-Wiki 互补关系分析
- [file] AI 重构 PM 工作流 — 补充至 [[aigc-trends-2026]]「AI 辅助产品工作」章节，6 环节工具链+核心前提
- [file] Claude Code 两个生态工具 — 补充至 [[claude-code-architecture]]「生态工具」章节，含 5 大实践技巧和 claude-mem 架构
- [file] Multica Managed Agents 平台 — 补充至 [[ai-agent-overview]]「Managed Agents 平台」子章节，含与 Anthropic 方案对比
- [file] vault2wiki 实战案例 — 补充至 [[llm-wiki]]「实战案例」章节，含架构对比和 4 条实践洞察
- [file] Obsidian 插件推荐 — 补充至 [[personal-knowledge-system]]「Obsidian 插件推荐」章节，7 个插件含优先级
- [file] caoz AI 编程实战教训 — 补充至 [[ai-coding-methodology]]「VibeCoding 实战教训」章节，记忆管理/可维护性/测试/占坑
- [file] Routa 多 Agent 协作工程化（Phodal） — 补充至 [[agent-driven-development]]「多 Agent 协作工程化」章节，Harness 三件套 + Kanban 协议 + 泳道专家
- [file] ex-brain LLM Wiki 升级版 — 补充至 [[llm-wiki]]「实战案例」章节，Compiled Truth 机制 + seekdb 混合检索 + 对本 Wiki 的启发

### 归档 (Filing) — FIS/财富规划专题拆分

从 [[asset-allocation-platform]] 拆分出 23 个独立页面，提升知识颗粒度：

- [file] 创建 [[asset-allocation-platform-fis]] — 基金投顾子系统完整分析
- [file] 创建 [[asset-allocation-platform-3.0-business-tree]] — 业务功能树五层结构
- [file] 创建 [[wealth-planning-subsystem]] — 财富规划子系统总览
- [file] 创建 [[wealth-planning-diagnosis]] — 诊断分析模块
- [file] 创建 [[wealth-planning-reports]] — 报表模块
- [file] 创建 [[wealth-planning-market-settings]] — 市场设置模块
- [file] 创建 [[wealth-planning-product-management]] — 产品管理模块
- [file] 创建 [[wealth-planning-portfolio-management]] — 组合管理模块
- [file] 创建 [[wealth-planning-customer-management]] — 客户管理模块
- [file] 创建 [[wealth-planning-investment-planning]] — 投资规划模块
- [file] 创建 [[wealth-planning-configuration]] — 规划配置模块
- [file] 创建 [[wealth-planning-pre-risk-control]] — 事前风控模块
- [file] 创建 [[wealth-competition]] — 资配大赛模块
- [file] 创建 [[fund-investment-advisory-data-index]] — 效能与需求数据索引
- [file] 创建 [[fund-investment-advisory-menu-tree]] — 菜单功能树
- [file] 创建 [[fund-investment-advisory-customized-strategy]] — 定制组合策略
- [file] 创建 [[fund-investment-advisory-external-strategy]] — 外部组合策略
- [file] 创建 [[fund-investment-advisory-product-management]] — 产品管理
- [file] 创建 [[fund-investment-advisory-proprietary-strategy-management]] — 自有策略管理
- [file] 创建 [[fund-investment-advisory-proprietary-strategy-announcements]] — 公告与定期报告
- [file] 创建 [[fund-investment-advisory-risk-monitoring]] — 风险监控
- [file] 创建 [[fund-investment-advisory-workshop]] — 投顾工作坊
- [file] 创建 [[fund-investment-advisory-portfolio-analysis]] — 组合策略分析
- [file] 更新 [[index]] — 补录 23 个新页面索引 + 财富管理场景

### 维护 (Lint) — 健康检查

- [lint] 删除重复文件 `wiki-evolution-design 2.md`
- [lint] 补录 log.md 中 FIS/财富规划 23 个页面创建记录
- [lint] 同步 `.raw-coverage` 中 Thoughts/2026-04-13.md 状态为 done
- [lint] 补全 21 个早期页面 `used_in` + `insights` frontmatter
- [file] 创建 [[asset-allocation-platform-elasticsearch]] — ES 全景分析：3 子系统、8 索引、4 业务场景、代码路径索引
- [file] 更新 [[asset-allocation-platform]] — 添加 ES 架构双链引用

### 摄入 (Ingest) — SyncDown 文件处理

- [file] 100% AI出码的探索之旅 — 更新 [[kyp-codereview]]（开发时间线+实战经验+踩坑记录）
- [file] KYP CodeReview 全景复盘 — 更新 [[claude-code-training]]（7部分课程结构+SMART原则+十大陷阱+课后作业）、[[ai-coding-methodology]]（CDD范式+语言/架构/存储选型）
- [file] AI编码需求规范文档模板 — 更新 [[ai-coding-methodology]]（需求模板结构参考）
- [skip] RSS Dashboard 插件 — 插件介绍文章，内容较浅
- [skip] code-review 单次结果 — 单次审查记录
- [skip] xiaoneng SKILL — 内部小工具配置
- [skip] 广州银行产品池需求 — 一次性项目需求
- [skip] 产品研究模块 API 文档 — 512KB 过大
- [skip] 缺陷分析周报 — 时效性数据

### 维护 (Lint)
- [lint] 2026-04-16 — 发现问题：24个未使用页面

### 维护 (Lint)
- [lint] 2026-04-16 — 发现问题：40个未使用页面

## 2026-04-17

### 摄入 (Ingest)
- [file] 00-upload/Barra模型内部说明文档.docx — 创建 [[barra-risk-model]] 主题页面（Barra CNE5 十大风格因子 + Fama-French 五因子归因）

## 2026-04-18

### 梦境 (Dream)
- [dream·午后梦] 2026-04-18 13:31 — 思梦，诊断 13 类问题，修复 0 个，10 项待人工处理

### 摄入 (Ingest)
- [skip] 00-upload/test-final.md — 测试文件，无实质内容，跳过
- [file] 01-Clippers/graphify：代码库即知识图谱，AI 助手的长期记忆层.md — 创建 [[Graphify]] 实体页面，更新 [[llm-wiki]] 生态工具段落指向实体页双链
- [file] 01-Clippers/个人可视化知识图谱构建器和案例展示.md — 创建 [[knowledge-graph-visualization]] 主题页面（知识蒸馏→增量合并→ECharts 力导向图），更新 [[index]] 场景索引
- [file] 01-Clippers/用 Markdown 搭知识库，但资料全是 PDF 和 Word，这个工具帮我统一了格式.md — 创建 [[MarkItDown]] 实体页面（微软开源文档转 Markdown 工具，107k stars，MCP 集成），更新 [[index]] 实体表 + 场景索引
- [file] 01-Clippers/codeflow 黑科技 — 创建 [[CodeFlow]] 实体页面（单 HTML 浏览器端代码架构分析工具，Tree-sitter WASM + D3.js，爆炸半径分析），更新 [[index]] 实体表 + 场景索引
- [file] 01-Clippers/Graphify-让Karpathy方法构建的知识库实现71.5倍效率提升.md — 更新 [[Graphify]] 实体页面，补充超边机制、按角色适用场景、外部资源添加、RAG 对比表
- [file] 01-Clippers/14.9K+ star 96.6%准确率的AI记忆系统，GitHub爆火的秘密.md — 创建 [[MemPalace]] 实体页面（宫殿记忆法四层架构、96.6% LongMemEval 准确率、ChromaDB 本地存储、MCP 集成），更新 [[personal-knowledge-system]] 双链，更新 [[index]] 实体表 + 场景索引
- [file] 01-Clippers/LLM Wiki 实践：用 Obsidian + 大模型打造个人知识库.md — 更新 [[llm-wiki]] 实战案例章节，补充毛剑「左移原则」实践（obsidian-backlinks/obsidian-wiki/Openclaw Heartbeat 工具链 + 精选双链 + 问答库独立存储）
- [file] 01-Clippers/让Claude Code效率翻倍：GitHub上最火的两个Claude Code工具（97K star）.md — 创建 [[ClaudeCodeBestPractice]]（43K star，69 个实战技巧）、[[ClaudeMem]]（54K star，跨 session 记忆插件）实体页面，更新 [[claude-code-architecture]] 生态工具双链、[[index]] 实体表和场景索引
- [file] 01-Clippers/AI 原生到底是什么？钉钉悟空、飞书 Aily：用 AI 重做一遍！.md — 创建 [[ai-native]] 主题页面（AI 原生三层定义 + AI 增强 vs 原生对比 + GEO/CLI/Spec-Kit/Code Banana 案例 + 团队改造框架），更新 [[index]] 主题表和场景索引
- [file] 01-Clippers/Hermes Agent 高级玩法：微信扫码即用 + LLM Wiki 知识库，打造你的数据飞轮.md — 创建 [[HermesAgent]] 实体页面（微信 iLink 集成 + LLM Wiki 开箱即用 + 多 Wiki 管理），更新 [[llm-wiki]] 生态工具章节，更新 [[index]] 实体表和场景索引
- [file] 01-Clippers/你的下一批员工，不是人类：Multica 开源 Managed Agents 平台.md — 创建 [[Multica]] 实体页面（7.2K star，厂商中立 Managed Agents 平台，Agent 即队友+可复用技能+多工作区），更新 [[ai-agent-overview]] 双链指向实体页，更新 [[index]] 实体表
- [file] 01-Clippers/在飞书操控你的 Claude Code，这个 GitHub 开源 SKill 好用。.md — 创建 [[ClaudeToImSkill]] 实体页面（飞书 IM 远程控制 Claude Code，桥接模式+长链接+同类方案对比），更新 [[index]] 实体表 + 场景索引
- [file] 01-Clippers/Claude Code 源码泄漏：一鲸落，万物生.md — 更新 [[claude-code-architecture]]（v2.1.88 源码泄漏全景：Harness Engineering 60/40 法则、系统提示词动态拼接+双层缓存、四层安全审查管线+YOLO 分类器、双引擎记忆系统、MCP token 四层优化、KAIROS/ULTRAPLAN/Coordinator Mode 未发布功能），更新 [[index]] 页面描述
- [file] 01-Clippers/别再把 Obsidian、Wiki、RAG、知识中台混为一谈了.md — 创建 [[knowledge-system-paradigms]] 对比页面（四范式能力矩阵+主链/补偿链架构+判断框架），更新 [[rag-vs-llm-wiki]]、[[llm-wiki]]、[[personal-knowledge-system]] 双链，更新 [[index]] 对比表+场景索引
- [file] 01-Clippers/9830条记忆之后，我把AI助手系统重建了.md — 创建 [[ai-memory-governance]] 主题页面（9830 条记忆教训：有效治理 > 堆砌存储，MemOS 踩坑→纯文本治理方案），更新 [[llm-wiki]] 实战案例、[[personal-knowledge-system]] 双链，更新 [[index]] 主题表+场景索引
- [dup] 01-Clippers/graphify：代码库即知识图谱，AI 助手的长期记忆层 1.md — 重复剪藏，内容与已处理的同名文章一致，[[Graphify]] 实体页已完整覆盖，仅补充 source 记录
- [file] 01-Clippers/AI漫福音：即梦Seedance 2.0最强替代-LibTV，效果酷毙了！.md — 创建 [[LibTV]] 实体页面（LiblibAI 一站式 AI 视频创作平台，节点式画布+Seedance 2.0+Agent Skill），更新 [[index]] 实体表+场景索引
- [file] 01-Clippers/两天时间，我搭建出了Karpathy式的知识库.md — 更新 [[llm-wiki]] vault2wiki 实战案例章节，补充三大设计原则、工程实现细节（自动编译管线、门控策略、Glossary 噪声处理、灾难恢复、模型降级）、新增第 5 条洞察
- [file] 01-Clippers/这几款 Obsidian 插件，能把你的知识库真正用起来.md — 创建 [[obsidian-ecosystem]] 主题页面（7 款插件详细配置+优先级+与本 Wiki 的关系），更新 [[personal-knowledge-system]] 双链指向新页面，更新 [[index]] 主题表+场景索引，移除知识空白中的已填补项
- [file] 01-Clippers/agtop：AI 编程助手监控神器！ — 创建 [[Agtop]] 实体页面（终端 TUI 仪表盘，实时监控 Claude Code/Codex 会话花费、Token、CPU），更新 [[index]] 实体表 + Claude Code 架构研究场景
- [file] 01-Clippers/AI编程，还需要学习么.md — 更新 [[ai-coding-methodology]]（新增清晰表达力前提、本地模型章节、自用开发趋势洞察，补充 caoz 文章来源）
- [file] 01-Clippers/Routa 桌面版发布：内建 Harness 工程的 AI Coding 研发协作工作台.md — 创建 [[Routa]] 实体页面（桌面版发布、Kanban 任务协议、7 泳道专家、DoD 双层定义、质量门禁），更新 [[agent-driven-development]] 精简为双链指向实体页，更新 [[index]] 实体表 + 场景索引
- [file] 01-Clippers/Graphify-让AI读懂你的代码，并且迭代优化，形成复利.md — 更新 [[Graphify]] 实体页面，补充 skill.md 插件机制、6 模块源码结构、无副作用设计、LLM 子代理提示词模板、反馈回路机制、超越代码的应用场景
- [file] 01-Clippers/手搓属于你的 LLM Wiki｜基于 seekdb，我做了一个升级版.md — 创建 [[ExBrain]] 实体页面（Compiled Truth 四大机制 + MCP Server + 命令结构 + 与本 Wiki 对比）、[[SeekDB]] 实体页面（AI 原生混合搜索数据库、嵌入式 1C2G、内置 AI 函数），更新 [[llm-wiki]] 实战案例指向实体页双链，更新 [[index]] 实体表 + 场景索引
