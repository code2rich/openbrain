# Obsidian Context

## Description
Search the Obsidian vault for relevant notes and inject them into context. Use when the user asks about topics that might be documented in the vault, or at the start of a session to understand current state.

## Trigger
- User asks about a topic that might exist in the vault
- User says "check vault", "search notes", "look up"
- Start of a new session when vault context is needed

## Instructions

1. When the user asks about a topic, search the vault using Grep and Glob tools to find relevant notes.
2. Search strategies:
   - Search by keywords in filenames using Glob: `**/{keyword}*.md`
   - Search by content using Grep: `pattern: {keyword}` in the vault root
   - Search by tags: `pattern: #{keyword}` or in frontmatter `tags:.*{keyword}`
   - Search by frontmatter fields: `pattern: (title|source|tags):.*{keyword}`
3. Read the most relevant notes and summarize the key information for the user.
4. When presenting results, use wikilink format: `[[note-title]]` to reference notes.

## Vault Structure Reference
The vault uses these top-level directories:
- `数据工程与治理/` — Data lineage, quality, warehouse, ETL
- `AI与机器学习/` — LLM, RAG, Agent, Prompt Engineering
- `软件工程/` — Architecture, languages, DevOps
- `产品与业务/` — Product design, growth
- `效率工具与方法论/` — Tools, workflows, thinking models
- `行业观察/` — Industry trends
- `阅读笔记/` — Reading notes
- `认识自己/` — Self-reflection
- `观察世界/` — Worldview, social observation
- `恒生WorkLife/` — Work-related content
- `待处理/` — Inbox for AI processing

## Notes
- Prefer reading notes over guessing
- When multiple notes match, present a brief list and ask which to focus on
- Respect the vault's YAML frontmatter conventions (title/source/date/saved/url/tags)
