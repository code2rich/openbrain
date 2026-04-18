# Wiki 页面 Frontmatter 规则

## 禁止嵌套 Frontmatter

Wiki 页面（99-wiki/）必须只有一层 `---` 包裹的 YAML frontmatter。

### 错误模式（绝对禁止）

```markdown
---
title: xxx
tags: []
---

```yaml       ← 禁止：代码块包裹第二层 frontmatter
---
type: entity
tags:
  - foo
related:
  - [[bar]]
---

正文内容...
```

```markdown       ← 禁止：同样的问题
---
type: entity
---
```

无论 ``` 后面跟 `yaml`、`markdown`、`yml` 还是空，都不允许包含第二层 `---` frontmatter。

### 正确格式

```markdown
---
title: xxx
description: xxx
type: entity
tags:
  - foo
related:
  - "[[bar]]"
---

正文内容...
```

## 修复时的排查原则

发现一个文件有某类 pattern 错误时，必须**按模式排查全量**，而非只修当前文件：

1. `grep -rn 'pattern' 99-wiki/` — 搜全量，不搜单个文件
2. 穷举 pattern 变体：搜 ` ```markdown ` 时，同时搜 ` ```yaml `、` ```yml `、` ``` `
3. 修完后再次 grep 确认零残留

**反面教材**：只搜 `^```markdown` 修复了 10 个文件，漏了 `^```yaml` 的 7 个文件，导致用户同一问题反馈两次。

## related 字段中的 wiki-link

`related` 字段的 `[[page]]` 语法与 YAML 冲突，必须加引号：

```yaml
# 正确
related:
  - "[[asset-allocation]]"
  - "[[portfolio-management]]"

# 错误 — YAML 解析会崩
related:
  - [[asset-allocation]]
```

## 摄入 API 的 Prompt 检查

`ingest-api.ts` 中调用 LLM 的 prompt 必须明确指示：
- 输出的 markdown 文件只有一层 frontmatter
- 不要用代码块包裹 frontmatter
- related 字段中的 `[[]]` 必须加引号
