#!/usr/bin/env bash
# 开发联调服务一键启动：本地后端(:3000) + ngrok 固定域名隧道
# 用法：npm run serve（Ctrl+C 一并停止）
# 前提：ngrok 已安装且 authtoken 已配置（cpolar 时代的 ~/.cpolar 配置互不影响）
set -uo pipefail
cd "$(dirname "$0")/.."

DOMAIN="chewer-reward-outtakes.ngrok-free.dev"

if lsof -nP -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "ℹ️  :3000 已有后端在跑，跳过后端启动"
else
  echo "▶ 启动后端 :3000 …"
  npm run dev:backend &
fi

if ! command -v ngrok >/dev/null 2>&1; then
  echo "❌ 未安装 ngrok：brew install ngrok，然后 ngrok config add-authtoken <token>"
  exit 1
fi

echo "▶ 启动隧道 $DOMAIN → :3000 …"
ngrok http --domain="$DOMAIN" 3000 &
NGROK_PID=$!

sleep 3
echo ""
echo "✅ 联调服务已就绪："
echo "   本地后端  http://localhost:3000"
echo "   公网隧道  https://$DOMAIN"
echo "   更新小程序包：cd miniprogram && npm run deploy"
echo "   （Ctrl+C 停止隧道；后端随终端一并退出）"
wait $NGROK_PID
