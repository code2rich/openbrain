# 开源贡献指南规则

## 代码变更

- 所有变更通过 Pull Request 提交，主分支不允许直接 push
- PR 标题使用 Conventional Commits 格式：`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`
- 每个 PR 只做一件事，避免混合多个不相关的变更
- 提交前确保 `npm run build` 在 wikiapp/ 中通过

## 安全

- 绝不提交 API Key、密码、Token 等敏感信息
- 检查代码中是否有硬编码的本地路径（`/Users/`, `C:\`, `/home/`）
- 使用环境变量或配置文件管理运行时参数
- 新增依赖前评估其许可证兼容性（项目使用 MIT）

## 文档

- 新增功能必须同步更新 README.md 和相关文档
- 代码注释只解释「为什么」，不解释「是什么」
- 保持 CLAUDE.md 中架构描述与实际代码一致

## 兼容性

- 脚本必须使用 `#!/usr/bin/env bash` shebang
- 路径使用环境变量或相对路径，不硬编码绝对路径
- Docker 相关变更必须同时更新 Dockerfile 和 docker-compose.yml
- Node.js 最低版本要求：20.x
