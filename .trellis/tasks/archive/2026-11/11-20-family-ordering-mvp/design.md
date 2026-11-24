# 技术设计 — 家庭点菜程序 MVP（v3 · 钉钉式多租户 + 角色权限）

## 1. 总体架构

单仓双包（对齐参考项目结构，Trellis spec 模板按 backend/frontend 分层可直接适配）：

```
Family-Ordering/
├── backend/                 # Express 5 + TypeScript + Prisma 7 + PostgreSQL
│   ├── src/
│   │   ├── config/          # env 读取、常量
│   │   ├── middleware/      # auth（JWT）、familyScope（租户注入）、requireAdmin、错误处理、限流、日志
│   │   ├── routes/          # 薄路由：auth / families / session / menu / meals / dishes / categories / members / orders
│   │   ├── schemas/         # Zod 请求校验 + 统一响应
│   │   ├── services/        # 业务逻辑（厚）：auth / family / mealTime / order / summary / menu
│   │   └── utils/           # shanghai 时间工具、错误类
│   ├── prisma/              # schema + seed（示例家庭 + 演示账号）
│   └── tests/               # Vitest + supertest 集成测试
├── frontend/                # React 19 + antd-mobile 5 + Vite（H5，兼容微信 webview）
│   └── src/{pages,components,services,stores,hooks,types,utils}
├── docker-compose.yml       # postgres + backend（含前端静态托管）
└── deploy/                  # 公网部署文档 + 反代示例
```

- 前端构建产物由后端静态托管（单域名部署，微信内直接访问最简）。
- 轮询而非 WebSocket：MVP 实时性 ≤10s，总单聚合接口轻量。

## 2. 数据模型（PostgreSQL / Prisma）

```
users            全局账号：id, username(unique), password_hash, created_at
families         家庭（租户）：id, name, passphrase_hash(全局唯一), created_at
family_members   家庭成员档案：id, family_id→, user_id→users, nickname, avatar(emoji),
                 role(ADMIN|MEMBER), created_at
                 unique(family_id, user_id) —— 一个 user 可属多个家庭（钉钉式）
meals            餐次配置：id, family_id→, name, start_time(HH:mm), end_time(HH:mm),
                 sort, enabled；允许 end<start（跨午夜）
categories       菜品分类：id, family_id→, name, sort
dishes           菜品：id, family_id→, category_id→, name, description, enabled,
                 unique(family_id, category_id, name)
meal_orders      餐次单：id, family_id→, meal_date(Date), meal_id→meals,
                 unique(family_id, meal_date, meal_id) —— 惰性创建
order_items      点菜项：id, meal_order_id→, member_id→family_members,
                 dish_id?(nullable), dish_name(快照), qty, struck,
                 unique(meal_order_id, member_id, dish_name)
```

关键点：

- **人与租户分离**（对齐钉钉模型）：`users` 是全局的人，`family_members` 是人在家庭内的档案（昵称/头像/角色按家庭各自独立）。order_items.member_id 指向 family_members（而非 users），总单点菜人显示家庭内昵称。
- **多租户铁律**：业务表挂 `family_id`；JWT 载 `{ userId, familyId, memberId, role }`（切换家庭换发 token）；`familyScope` 中间件把 familyId 注入请求上下文，service 层所有查询强制 familyId 过滤；资源路由一律 `/families/me/...` 域内，杜绝裸 id 越权。
- **权限**：`requireAdmin` 中间件校验 role=ADMIN，挂菜单/分类/餐次/成员管理路由；角色变更后换发 token 使权限即时生效。
- `dish_name` 快照：菜库改名不影响历史单；自定义菜 `dish_id` 为空；总单按 `dish_name` 归组。
- 餐次软删（enabled=false）；`meal_orders.meal_id` RESTRICT 保历史。
- 总单聚合：items → dish_name 归组 → qty 求和 → 点菜人列表 + struck 规则（组内全部 struck 整体置灰，service 单点定义）。
- 餐次单惰性创建，无定时任务。

## 3. API 契约（/api/v1，统一 createSuccessResponse / createErrorResponse）

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | /auth/register | 公开 | `{ username, password }` → 创建全局账号并登录 |
| POST | /auth/login | 公开 | `{ username, password }` → `{ token, user, families[], lastFamilyId }`（无家庭时 families 空） |
| POST | /families | 登录 | `{ name, passphrase, nickname?, avatar? }` 创建家庭+成员档案(role=ADMIN) → 换发含家庭的 token |
| POST | /families/join | 登录 | `{ passphrase, nickname?, avatar? }` 凭口令加入 → 成员档案(role=MEMBER) → 换发 token |
| GET  | /families | 登录 | 我加入的家庭列表（含我的角色/昵称） |
| POST | /families/:id/enter | 登录 | 切换当前家庭 → 换发 token |
| GET  | /menu | 家庭内 | 当前家庭分类+菜品树（enabled=true） |
| POST/PUT/DELETE | /families/me/categories(/:id) | **admin** | 分类增改删（被引用禁删） |
| POST/PUT/DELETE | /families/me/dishes(/:id) | **admin** | 菜品增改删；PUT 支持 `{enabled}` 上下架 |
| GET  | /families/me/meals | 家庭内 | 餐次列表（点菜页取 enabled，管理页取全部） |
| POST/PUT/DELETE | /families/me/meals(/:id) | **admin** | 餐次增改删（删=enabled:false） |
| GET  | /families/me/members | **admin** | 成员列表（昵称/头像/角色） |
| PATCH | /families/me/members/:id/role | **admin** | `{ role }` 调整角色 |
| PATCH | /families/me/me | 家庭内 | 改自己在本家庭的昵称/头像 |
| GET  | /orders/my?mealId=&date=today | 家庭内 | 本人当前餐次点菜项 |
| PUT  | /orders/my | 家庭内 | `{ mealId, dishId?, dishName?, qty }` 幂等 upsert（qty=0 删） |
| GET  | /orders/summary?mealId=&date= | 家庭内 | 总单聚合 |
| PATCH | /orders/items/:id/struck | 家庭内 | `{ struck }` 划掉/取消 |

- 认证：JWT（`FAMILY_JWT_SECRET`），bcrypt 存密码与家庭口令。
- 校验：全走 Zod；错误码分段（1xxx 账号/家庭 / 2xxx 菜单 / 3xxx 餐次 / 4xxx 点菜 / 9xxx 系统）。
- 限流：全局轻量 + `/auth/*`、`/families/join` 单独收紧（爆破面）。
- 时区：`meal_date` 与餐次判定统一 `Asia/Shanghai`；当前餐次 = enabled 餐次中时间窗含当前时刻者（跨午夜按 `start≤t<end∨次日end`）；多窗重叠取 sort 最前；无命中返回非点菜时段。

## 4. 前端设计

- 页面：
  - `/login`：登录/注册（用户名+密码）；注册后或无家庭时进 `/families`（创建家庭 / 口令加入 / 选择已有家庭）。
  - `/order`：底部 Tab——**菜单 / 我的单 / 总单 / 我的**。
  - 「我的」页：当前家庭与切换家庭入口、本家庭昵称/头像修改、管理入口（仅 admin 显示：菜品/分类/餐次/成员角色）、退出登录。
- admin 管理功能聚合在「我的」页进入的子页（移动端层级清晰，不与点菜主流程混排）。
- 状态：Zustand persist（localStorage 键 `family-auth`：token+user+当前家庭+家庭列表）；总单 Tab 激活时 10s 轮询。
- 铁律沿用参考项目：API 只走 `services/`（`utils/request.ts` 统一带 token/401 踢回登录/403 提示无权限）；渲染期禁 impure 调用。
- **微信 webview 适配**：viewport-fit=cover + 安全区 env()；touch-action 去 300ms 延迟；antd-mobile 键盘处理 + 真机回归。
- 移动适配：`postcss-px-to-viewport`；BrowserRouter（自家域名，微信内可打开可收藏）。

## 5. 安全与配置

- env 仅启动必需：`DATABASE_URL`、`FAMILY_JWT_SECRET`、`PORT`。
- 密码/口令策略：密码 ≥6 位 bcrypt；家庭口令 ≥6 位全局唯一（唯一索引兜底）。
- 公网暴露面：HTTPS 反代终结（Caddy/Nginx 示例进 deploy/）；无支付面；admin 路由服务端校验（前端隐藏仅是体验，不作为安全边界）。
- 敏感文件：`.env*` 不入库，仅 `.env.example`。

## 6. 测试策略

- 后端 Vitest + supertest 集成测试（测试库隔离）：
  - 账号注册/登录；创建/加入/切换家庭；**一人两家庭数据隔离与越权拒绝**
  - **权限：member 调菜单/餐次/成员管理接口 403；角色变更后 token 换发生效**
  - 点菜 upsert 幂等、总单聚合（同名合并/自定义菜/划掉规则）
  - 餐次：默认预置、跨午夜判定、增删改生效、软删保历史
  - 菜单 CRUD 约束、下架 vs 历史单
- 前端 Vitest：餐次时间窗判定纯函数（含跨午夜）、auth/家庭切换 store、request 封装。
- 本地 CI `scripts/local-ci.sh`：prisma 校验/迁移 → 后端 lint+test → 前端 lint+test+build（Trellis 收尾门禁）。

## 7. 权衡与回滚

- **用户名+密码 vs 手机号/微信登录**：选前者。零外部依赖零成本，且不被微信主体资质卡住（网页授权需认证服务号）；代价是无自助找回（运维重置脚本兜底，家人场景可接受）。二期接微信绑定时新增 `user_identities(user_id, provider, openid)` 表，不动现有模型。
- **token 内嵌 familyId+role（切换家庭换发） vs 纯 userId 运行时查**：选前者。每次请求少一次成员关系查询，权限即时生效；代价是切家庭要换 token（一次请求）。
- **管理功能子页 vs 第四个 Tab**：选子页（「我的」页进入）。底部 Tab 保留点菜主流程三页，家人 90% 时间不碰管理。
- **轮询 vs 推送**：选轮询（二期「开饭提醒」时一并演进）。
- 回滚：全新仓库，git revert + `prisma migrate reset`（MVP 期允许）。

## 8. 兼容与后续

- 二期微信绑定登录：新增 `user_identities(user_id, provider, openid)` 表 + 绑定/授权流程，现有 `users`/`family_members` 不动；绑定后微信内静默授权一键登录，用户名密码保留兜底。
- 二期移除成员/退出家庭：`family_members` 加 status 软删即可。
- 历史/爱吃榜基于 `meal_orders/order_items` 统计，无需迁移。
