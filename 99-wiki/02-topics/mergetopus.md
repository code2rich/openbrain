---
title: mergetopus
description: 将大型 Git 合并拆分为可并行任务的工具
type: topic
created: 2026-04-13
updated: 2026-04-13
tags: [git, developer-tools, collaboration, merge-conflict]
related: [[git-workflow]]
used_in: []
insights:
  - date: 2026-04-15
    summary: 大合并拆分为并行任务本质上是工程化的分治思想
keywords: [mergetopus, Git合并, 冲突解决, 并行合并, kokomeco, 分片, 分支管理, 协作]
scenes:
  - 当我在处理大型 Git 分支合并冲突时
  - 当我需要让多人并行解决同一个合并的冲突文件时
  - 当我想了解如何避免 squash 合并丢失作者信息时
  - 当我在评估团队协作的 Git 工作流优化方案时
knowledge_type: permanent
review_cycle: null
---

# mergetopus

将大型 Git 合并拆分为可并行任务的工具，解决多人协作时大型分支合并的冲突处理瓶颈。

## 核心问题

传统 Git 合并把所有冲突堆在一起，只能一个人串行处理：

```
main:      A---B---C
                   \
feature:            D---E---F
→ 多个文件同时冲突，阻塞所有开发者
```

## 解决方案：分片并行

mergetopus 把一次大型合并拆成可并行的小任务：

```
integration 分支：保存自动合并的部分，冲突文件重置为" ours"
slice1 分支：处理 fileA, fileB 的冲突
slice2 分支：处理 fileC 的冲突
slice3 分支：处理 fileD 的冲突
→ 多个开发者并行解决不同分片
```

## 核心概念

| 概念 | 说明 |
|------|------|
| `integration` | 临时分支，保存合并进度 |
| `slice` | 每个冲突文件/组的临时分支 |
| `kokomeco` | 最终合并快照分支（保留完整作者信息） |

## kokomeco 的意义

普通 squash 会丢失 `git blame` 的作者追踪。kokomeco 是一个真正的 merge commit：

- `git blame` 能正确追溯每一行的原始作者
- 不重写历史，只是创建了一个干净的快照分支

## 工作流

### 1. 发起者拆分合并

```bash
# 从目标分支执行
mergetopus feature/very-large-change
```

创建：
- `_mmm/<target>/<source>/integration`
- `_mmm/<target>/<source>/sliceN`（每个冲突文件一个）

### 2. 各开发者并行解决自己的 slice

```bash
mergetopus resolve _mmm/main/feature/slice1
mergetopus resolve --commit _mmm/main/feature/slice2
```

### 3. 查看进度

```bash
mergetopus status feature/very-large-change
```

### 4. 合并完成后清理

```bash
mergetopus cleanup
```

## 分支命名规范

| 类型 | 格式 | 示例 |
|------|------|------|
| integration | `_mmm/<target>/<source>/integration` | `_mmm/main/feature/integration` |
| slice | `_mmm/<target>/<source>/slice<N>` | `_mmm/main/feature/slice1` |
| kokomeco | `_mmm/<target>/<source>/kokomeco` | `_mmm/main/feature/kokomeco` |

## 适用场景

- 大型代码库的多人协作合并
- 多个 LTS 版本间的合并（如 LTS_v17 → LTS_v42 → main）
- 需要多人并行处理大量冲突文件的大型重构

## 安装

```bash
# Windows
choco install mergetopus.portable

# 或下载 GitHub Releases 的二进制文件到 PATH
```

## 来源

- [GitHub: mwallner/mergetopus](https://github.com/mwallner/mergetopus)
- [Hacker News 讨论](https://news.ycombinator.com/item?id=47748733)
