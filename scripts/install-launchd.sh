#!/usr/bin/env bash
# install-launchd.sh — 生成并安装 macOS launchd 定时任务
# 用法: bash scripts/install-launchd.sh
set -euo pipefail

VAULT_ROOT="${VAULT_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
LAUNCH_AGENTS="$HOME/Library/LaunchAgents"

echo "Vault 路径: $VAULT_ROOT"
echo "LaunchAgents: $LAUNCH_AGENTS"
echo ""

mkdir -p "$LAUNCH_AGENTS"

install_plist() {
  local name="$1" schedule="$2" command="$3"
  local plist="$LAUNCH_AGENTS/$name.plist"

  cat > "$plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$name</string>

    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$VAULT_ROOT/scripts/wiki-cli.sh</string>
        <string>$command</string>
    </array>

    <key>WorkingDirectory</key>
    <string>$VAULT_ROOT</string>

    <key>StartCalendarInterval</key>
    $schedule

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin</string>
        <key>HOME</key>
        <string>$HOME</string>
        <key>VAULT_ROOT</key>
        <string>$VAULT_ROOT</string>
    </dict>

    <key>StandardOutPath</key>
    <string>/tmp/obsidian-$command.log</string>

    <key>StandardErrorPath</key>
    <string>/tmp/obsidian-$command.err</string>
</dict>
</plist>
EOF

  launchctl unload "$plist" 2>/dev/null || true
  launchctl load "$plist"
  echo "  ✅ $name — 已安装"
}

# 每日 02:00 知识摄入
echo "安装定时任务..."
install_plist "com.obsidian.wiki-ingest" \
  "<dict><key>Hour</key><integer>2</integer><key>Minute</key><integer>0</integer></dict>" \
  "ingest"

# 每周日 03:00 知识库维护
install_plist "com.obsidian.wiki-lint" \
  "<dict><key>Weekday</key><integer>0</integer><key>Hour</key><integer>3</integer><key>Minute</key><integer>0</integer></dict>" \
  "lint"

# 每日 00:00 同步 Downloads
install_plist "com.obsidian.sync-downloads" \
  "<dict><key>Hour</key><integer>0</integer><key>Minute</key><integer>0</integer></dict>" \
  "sync-downloads"

echo ""
echo "全部安装完成。使用 'launchctl list | grep com.obsidian' 查看状态。"
