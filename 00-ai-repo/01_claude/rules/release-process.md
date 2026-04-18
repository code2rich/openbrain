# 发布流程规则

## 版本号

- 遵循 [Semantic Versioning](https://semver.org/)：`MAJOR.MINOR.PATCH`
- MAJOR：不兼容的架构变更
- MINOR：新增功能，向后兼容
- PATCH：Bug 修复

## 发布检查清单

1. 更新 CHANGELOG.md 中的版本记录
2. 确认所有测试通过（`npm run build`）
3. 确认 Docker 镜像构建成功（`docker compose build`）
4. 更新 README.md 中的版本号（如有必要）
5. 创建 Git tag：`git tag v1.2.3`
6. 推送 tag：`git push --tags`
7. 在 GitHub 创建 Release，附带 CHANGELOG 摘要

## Docker 镜像

- 基于 `node:20-alpine`
- 镜像 tagged 与 Git 版本号一致
- 多架构构建（amd64 + arm64）

## 变更日志格式

```
## [1.2.0] - 2026-04-18

### Added
- 新功能描述

### Fixed
- 修复描述

### Changed
- 变更描述
```
