# 家庭点菜 · 微信小程序（Taro）

Taro 4 + React 18 + TypeScript + SCSS，与 `frontend/`（H5）并存、共用后端 API 契约。

## 开发

```bash
npm install          # 独立 npm 工程（不在根 workspaces 内）
npm run dev:weapp    # watch 构建 → 微信开发者工具打开本目录（miniprogramRoot: dist/）
npm run build:weapp  # 生产构建
npm run typecheck    # tsc --noEmit
npm run icons        # 重新生成 tabBar 图标（scripts/gen-tab-icons.mjs，零依赖）
```

- API 地址：`.env` 中 `TARO_APP_API`（默认 `http://localhost:3000/api/v1`）；
  开发者工具勾选「不校验合法域名」即可联调本地/内网穿透后端。
- AppID：`project.config.json` 暂为占位 `touristappid`（测试号/正式号后替换）。

## 结构

```
src/
  pages/{login,menu,mine,summary,me}/   # 登录页非 tab；其余为 tabBar 四项
  services/api.ts     # 唯一 API 出口（对齐 frontend/src/services/api.ts）
  stores/auth.ts      # token/user/family/member/families（Taro storage: family-auth）
  utils/request.ts    # Taro.request 封装（baseURL、token 注入、{code,message,data} 解包、401 重登）
  utils/guard.ts      # tab 页 onShow 登录守卫（未登录 → reLaunch 登录页）
  styles/tokens.scss  # 设计 token（与 H5 global.css 对齐，rpx @750）
  assets/tabbar/      # 81x81 PNG 图标（脚本生成）
```

## 阶段状态

- 阶段 2（当前）：骨架 + 微信登录 + tabBar 四页占位（菜单页只读列表）。
- 阶段 3：点菜主流程（搜索、数量步进、我的单、总单划掉/复制、轮询）。
