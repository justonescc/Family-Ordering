# 家庭点菜程序

多家庭共用的点菜 H5：家人在各自手机上浏览菜单、点菜，按家庭自定义餐次实时汇总总单给做饭的人。

> ⚠️ **仓库归属红线**：本项目仅允许推送到个人 GitHub（`github.com/justonescc/Family-Ordering`），
> **禁止推送到公司代码仓库（云效 Codeup 等）**，不走公司工作项/CI/部署流程。详见 README。

## 技术栈

- 后端：Express 5 + TypeScript + Prisma 6 + PostgreSQL
- 前端：React 19 + antd-mobile 5 + Vite（兼容微信内置浏览器）
- 测试：Vitest（后端集成测试 + 前端单元测试）
- 部署：Docker Compose（后端容器托管前端构建产物）+ Caddy/Nginx

## 目录结构

```
backend/
├── prisma/          # schema、迁移、seed
├── src/
│   ├── config/      # env、prisma client
│   ├── middleware/  # authenticate、requireAdmin、validate、rateLimit、errorHandler
│   ├── routes/      # 薄路由（auth/families/menu/meals/dishes/categories/members/orders）
│   ├── schemas/     # Zod 请求校验
│   ├── services/    # 业务逻辑（厚）
│   ├── types/       # DTO 与 Express 类型扩展
│   └── utils/       # 错误码、统一响应、上海时区、jwt、password、dto
└── tests/           # 集成测试（supertest，串行）
frontend/
├── src/
│   ├── components/  # MenuTab / MyOrdersTab / SummaryTab / MeTab / MealSwitcher
│   ├── hooks/       # useMeals、usePolling
│   ├── pages/       # Login、Families、Order、admin/{AdminMenu,AdminMeals,AdminMembers}
│   ├── services/    # api.ts（唯一 API 出口）
│   ├── stores/      # zustand（auth，persist 到 localStorage: family-auth）
│   ├── types/       # 与后端 DTO 对齐
│   └── utils/       # request.ts、meal.ts
scripts/local-ci.sh  # 本地 CI 门禁
deploy/              # 部署文档、Caddyfile、备份脚本
```

## 常用命令

```bash
npm install
docker compose up -d postgres
cp backend/.env.example backend/.env
npm run prisma:migrate && npm run db:seed

npm run dev:backend    # API :3000
npm run dev:frontend   # H5 :5173（代理 /api）

npm run ci:local       # 提交前全量门禁（必须全绿）
docker compose up -d --build   # 全栈
```

## 架构要点（红线）

1. **多租户隔离**：业务表统一挂 `family_id`；JWT 载荷含 `{userId, familyId, memberId, role}`；
   `authenticate` 校验成员档案，`requireFamily` 取家庭上下文，管理路由再挂 `requireAdmin`。
   service 层所有查询必须带 `familyId`。
2. **认证分两段**：`authenticate` 允许「已登录未选家庭」状态（注册/登录后）；家庭内接口才要求家庭上下文。
3. **点菜快照**：`order_items.dish_name` 存快照，自定义菜 `dish_id` 为空；删菜不影响历史单。
4. **时区**：日期与餐次判定统一走 `utils/shanghai.ts`（Asia/Shanghai）。
   禁止 `new Date('YYYY-MM-DD')`、`toISOString().split('T')`。
5. **餐次单惰性创建**：`(familyId, mealDate, mealId)` 唯一，首个点菜请求时 upsert。
6. **餐次软删**：`meals.enabled=false`；名称唯一性只在启用中校验。
7. **API 契约**：成功 `{code:0,message:'ok',data}`；失败 `{code,message,details?}`。
   错误码分段：1xxx 账号/家庭、2xxx 菜单、3xxx 餐次、4xxx 点菜、9xxx 系统。
8. **前端铁律**：API 只走 `services/api.ts`（`utils/request.ts` 统一带 token）；
   组件内禁止直接 fetch。渲染期禁止 impure 调用（`Date.now()` 等）。
9. **校验回写**：`req.query` / `req.params` 在 Express 5 是只读 getter，
   经 Zod 解析的数据挂到 `parsedQuery` / `parsedParams`，不可直接赋值。
10. **密钥**：`FAMILY_JWT_SECRET`、家庭口令、`.env` 不进仓库；口令经 bcrypt + SHA-256 索引键存储。

## 规划文档

- `.trellis/tasks/11-20-family-ordering-mvp/prd.md`（需求）
- `.trellis/tasks/11-20-family-ordering-mvp/design.md`（设计）
- `.trellis/tasks/11-20-family-ordering-mvp/implement.md`（执行计划）
