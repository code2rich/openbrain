# Security Policy

## Reporting a Vulnerability

**请不要在公开的 GitHub Issue 中报告安全漏洞。**

如果你发现了安全漏洞，请通过以下方式报告：

- **GitHub Security Advisories**（推荐）：在仓库的 Security tab 中提交
- **邮件**：通过你的 GitHub 个人主页找到联系方式

## 响应时间

| 阶段 | 目标时间 |
|------|---------|
| 确认收到报告 | 48 小时 |
| 初步评估 | 7 天 |
| 发布修复 | 30 天 |

## 已知安全注意事项

- **API Key 管理**：LLM API Key 通过 `wikiapp/data/config.json` 存储，该文件已在 `.gitignore` 中排除。请勿将含有真实 Key 的配置文件提交到版本控制。
- **文件上传**：摄入 API（端口 3456）默认监听 localhost，不对外暴露。生产部署时请确保网络隔离。
- **Docker 权限**：API 容器以 root 用户运行（用于 crond），建议在不需要定时任务时改为非 root 用户。

## 安全最佳实践

1. 定期轮换 API Key
2. 使用环境变量而非硬编码配置
3. 保持依赖更新（`npm audit`）
4. Docker 镜像定期重建以获取安全补丁
