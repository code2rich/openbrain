#!/usr/bin/env bash
# sync-downloads.sh — 每晚 24:00 将 ~/Downloads 中的文档类文件同步至 00-raw/05-SyncDown/
# 由 launchd 每天凌晨 0:00 触发
set -euo pipefail

# ============================
# 配置区 — 按需修改
# ============================
VAULT_ROOT="${VAULT_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
DOWNLOADS="${DOWNLOADS:-$HOME/Downloads}"
SYNC_DIR="$VAULT_ROOT/00-raw/05-SyncDown"

# 要同步的文件扩展名（小写，不加点号）
EXTENSIONS=(
    # 文档
    pdf doc docx odt rtf epub mobi txt md
    # 表格
    xls xlsx ods csv
    # 演示
    ppt pptx odp
    # 数据
    # json xml html htm
    # 图片
    # png jpg jpeg gif svg webp
    # 压缩包
    # zip rar 7z
)
# ============================

TODAY=$(date +%Y-%m-%d)
LOCK_FILE="/tmp/obsidian-sync-downloads.lock"

# 防止并发执行
if [ -f "$LOCK_FILE" ]; then
    echo "[$(date)] Another sync-downloads is running. Exiting."
    exit 0
fi
trap "rm -f $LOCK_FILE" EXIT
touch "$LOCK_FILE"

# 创建当日目录
TARGET_DIR="$SYNC_DIR/$TODAY"
mkdir -p "$TARGET_DIR"

# 构建 find 参数
find_args=()
for ext in "${EXTENSIONS[@]}"; do
    find_args+=(-o -iname "*.${ext}")
done
find_args=("${find_args[@]:1}") # 去掉第一个 -o

# 查找并移动文件（递归所有层级）
moved=0
while IFS= read -r -d '' file; do
    filename=$(basename "$file")
    # 跳过隐藏文件和隐藏目录下的文件
    [[ "$file" =~ /\. ]] && continue
    # 保持相对目录结构
    rel_dir=$(dirname "${file#$DOWNLOADS/}")
    [ "$rel_dir" = "." ] && rel_dir=""
    dest_dir="$TARGET_DIR"
    [ -n "$rel_dir" ] && dest_dir="$TARGET_DIR/$rel_dir"
    mkdir -p "$dest_dir"
    dest="$dest_dir/$filename"
    # 处理同名文件
    if [ -f "$dest" ]; then
        base="${filename%.*}"
        ext="${filename##*.}"
        dest="$dest_dir/${base}_$(date +%H%M%S).${ext}"
    fi
    mv "$file" "$dest"
    echo "  moved: ${file#$DOWNLOADS/}"
    ((moved++))
done < <(find "$DOWNLOADS" -type f \( "${find_args[@]}" \) -print0 2>/dev/null)

# 清理空目录（递归删除，跳过 Downloads 根目录）
while IFS= read -r -d '' dir; do
    rmdir "$dir" 2>/dev/null && echo "  cleaned empty dir: ${dir#$DOWNLOADS/}" || true
done < <(find "$DOWNLOADS" -mindepth 1 -type d -empty -print0 2>/dev/null | sort -rz)

if [ "$moved" -eq 0 ]; then
    echo "[$(date)] No document files found in Downloads."
    exit 0
fi

echo "[$(date)] Moved $moved files to $TARGET_DIR."

# 自动提交并推送
cd "$VAULT_ROOT"
git add -A
git diff --cached --quiet || git commit -m "sync: $(date '+%Y-%m-%d') 从 Downloads 同步 $moved 个文件"
git push
echo "[$(date)] Git push complete."
