# 贡献指南

感谢你对 OpenBrain 的关注！欢迎贡献代码、文档或想法。

## 如何贡献

### 报告问题

- 在 GitHub Issues 中搜索是否已有相关问题
- 新建 Issue，描述问题现象、复现步骤和期望行为
- 附上环境信息（OS、Node.js 版本、Docker 版本）

### 提交代码

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feat/your-feature`
3. 提交变更，遵循 Conventional Commits：
   - `feat:` 新功能
   - `fix:` Bug 修复
   - `docs:` 文档更新
   - `refactor:` 代码重构
   - `chore:` 构建/工具变更
4. 确保本地构建通过：`cd wikiapp && npm run build`
5. 提交 Pull Request，描述变更内容和动机

### 开发环境

```bash
# 克隆仓库
git clone https://github.com/your-username/openbrain.git
cd openbrain

# 安装 wikiapp 依赖
cd wikiapp
npm install

# 启动开发服务器
npm run dev
```

## 代码规范

- TypeScript 代码使用项目现有风格
- Shell 脚本使用 `#!/usr/bin/env bash`，通过 `shellcheck` 检查
- 提交前移除调试代码和 `console.log`
- 不硬编码本地路径，使用环境变量或相对路径

## 安全

- **绝不提交** API Key、密码、Token
- 发现安全漏洞请通过 GitHub Security Advisories 私下报告
- 不要在公开 Issue 中披露安全漏洞

## License

贡献的代码将在 MIT 协议下发布。提交 PR 即表示你同意该协议。
