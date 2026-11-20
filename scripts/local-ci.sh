#!/usr/bin/env bash
#
# 本地 CI 门禁：提交前必须全绿。
# 用法：npm run ci:local
#
set -euo pipefail

cd "$(dirname "$0")/.."

step() {
  echo ""
  echo "==> $*"
}

step "1/6 Prisma 校验与客户端生成"
npm run -w backend prisma:generate

step "2/6 后端 lint"
npm run -w backend lint

step "3/6 后端构建"
npm run -w backend build

step "4/6 后端集成测试（使用 family_ordering_test 库）"
npm run -w backend test

step "5/6 前端 lint"
npm run -w frontend lint

step "6/6 前端测试与构建"
npm run -w frontend test
npm run -w frontend build

echo ""
echo "✅ 本地 CI 全部通过"
