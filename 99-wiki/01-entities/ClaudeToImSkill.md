---
title: Claude-to-IM-skill
description: 通过飞书等 IM 远程控制本地 Claude Code 的开源 Skill，支持桥接模式和长链接
type: entity
knowledge_type: periodic
review_cycle: 90
created: 2026-04-18
updated: 2026-04-18
last_reviewed: 2026-04-18
tags: [claude-code, skill, feishu, remote-access, open-source]
keywords: [Claude-to-IM, 飞书控制ClaudeCode, 远程ClaudeCode, IM桥接]
scenes:
  - 想在手机上远程控制电脑上的 Claude Code
  - 希望通过飞书机器人与 Claude Code 交互，不影响本地终端会话
  - 评估 Claude Code 远程访问方案时对比选型
related: "[[ClaudeCodeBestPractice]], [[claude-code-architecture]], [[personal-knowledge-system]]"
sources:
  - 00-raw/01-Clippers/在飞书操控你的 Claude Code，这个 GitHub 开源 SKill 好用。.md
insights:
  - date: 2026-04-18
    summary: 作者认为 Claude Code 在长任务处理、稳定性、速度和交付体验上优于 OpenClaw，因此主力电脑保留 Claude Code + 飞书远程控制方案而非全部迁移到 OpenClaw
---

# Claude-to-IM-skill

GitHub 开源 Skill，通过飞书等 IM 平台远程控制本地 Claude Code，不与本地终端会话冲突。

## 基本信息

- **开源地址**：https://github.com/op7418/Claude-to-IM-skill
- **类型**：Claude Code Skill
- **支持平台**：飞书（可扩展其他 IM）
- **作者**：op7418

## 核心功能

1. **飞书机器人桥接** — 在飞书创建应用机器人，通过桥接模式连接本地 Claude Code
2. **长链接通信** — 建立长链接实现实时消息推送和接收
3. **非侵入式** — 与本地 Claude Code 终端会话互不干扰，可同时运行
4. **通过 `/claude-to-im` 管理** — Skill 内置管理命令，控制 IM 通信

## 安装流程

1. 将安装命令发给 Claude Code：`帮我安装这个 Skill，我想在飞书中使用 Claude Code`
2. 在飞书开放平台创建应用机器人
3. 配置权限（消息与群组、云文档、多维表格、日历等）
4. 配置事件与回调（先建立桥接，再开启长链接和消息接收事件）
5. 发布应用版本
6. 在 Claude Code 中输入 AppID、AppSecret 等配置信息

## 同类方案对比

| 方案 | 特点 | 限制 |
|------|------|------|
| **Claude-to-IM-skill** | 飞书 IM 集成，Skill 形式安装 | 需配置飞书开放平台 |
| **Happy** | 移动端 APP，支持实时语音，15K star | 需下载 APP，用 `happy` 替代 `claude` 命令启动 |
| **tmux + Tailscale** | SSH 远程接入 tmux 会话，1:1 还原环境 | 需要组网配置，技术门槛较高 |
| **Claude Code Remote Control** | 官方远程模式 | 仅限 Max/Pro 套餐用户 |

## 相关页面

- [[ClaudeCodeBestPractice]] — Claude Code 实战技巧
- [[claude-code-architecture]] — Claude Code 架构设计
- [[personal-knowledge-system]] — 个人知识库系统（含飞书集成）
