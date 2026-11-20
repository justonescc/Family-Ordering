#!/usr/bin/env bash
#
# 备份 PostgreSQL 数据（pg_dump → gzip）。
#
# 用法：
#   bash deploy/scripts/backup.sh [输出目录]
#
# 建议在服务器上配合 crontab 每日执行。
#
set -euo pipefail

OUT_DIR="${1:-./backups}"
mkdir -p "$OUT_DIR"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$OUT_DIR/family_ordering-$TIMESTAMP.sql.gz"

if docker compose ps >/dev/null 2>&1; then
  docker compose exec -T postgres pg_dump -U family family_ordering | gzip > "$FILE"
else
  # 本地/非 compose 环境：直接用 psql 客户端
  pg_dump -U family -h localhost family_ordering | gzip > "$FILE"
fi

echo "备份完成: $FILE"
