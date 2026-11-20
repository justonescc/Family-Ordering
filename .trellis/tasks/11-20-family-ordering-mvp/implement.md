# 执行计划 — 家庭点菜程序 MVP（v3）

> 前置：`prd.md`（v3）与 `design.md`（v3）评审通过并经用户批准后方可 `task.py start`。
> v3 变更：钉钉式多租户（user 与 family_member 分离、一人多家庭切换）、admin/member 角色权限、微信推送整体移出。

## 阶段清单（按序执行）

### A. 仓库骨架

- [ ] A1 顶层：`backend/`、`frontend/`、`scripts/`、`deploy/`；根 `package.json`（workspaces + `ci:local`）、`.gitignore`、`.nvmrc`（Node 24）、backend `.env.example`
- [ ] A2 backend 脚手架：tsconfig、ESLint 9、Vitest、Express 入口 + `/healthz`、统一响应/错误处理骨架、全局轻量限流
- [ ] A3 frontend 脚手架：Vite + React 19 + antd-mobile、目录分层、`utils/request.ts`（带 token / 401 踢回登录 / 403 提示）、px-to-viewport、安全区适配
- [ ] A4 `docker-compose.yml`（postgres + backend；前端 dev 期独立 vite server）

### B. 数据层（多租户模型）

- [ ] B1 Prisma schema：users / families / family_members(role) / meals / categories / dishes / meal_orders / order_items，唯一约束 + RESTRICT 外键 + migrate
- [ ] B2 seed：示例家庭（admin+member 成员、默认午/晚餐次、4 分类约 24 道菜）+ 演示账号
- [ ] B3 时区与餐次工具：`getShanghaiDateStr()`、`resolveCurrentMeal(familyMeals, now)`（跨午夜窗）+ 单测

### C. 后端 API

- [ ] C1 auth：register/login（用户名+密码 bcrypt）→ token（无家庭态）
- [ ] C2 families：创建（首成员 ADMIN）/ 口令加入（MEMBER）/ 我的家庭列表 / `:id/enter` 切换换发 token；authMiddleware + familyScope + requireAdmin
- [ ] C3 menu：GET /menu（家庭内分类+菜品树）
- [ ] C4 菜单维护（admin）：categories / dishes CRUD、unique(family,cate,name)、上下架；分类被引用禁删
- [ ] C5 餐次配置（admin）：meals CRUD（软删）、HH:mm 时间窗校验（允许跨午夜）；GET meals 全员
- [ ] C6 成员（admin 列表 + 角色调整；本人改昵称头像 PATCH /families/me/me）
- [ ] C7 orders：GET/PUT /orders/my（qty=0 删、幂等 upsert、餐次单惰性创建）；GET /orders/summary（归组/求和/点菜人/struck）；PATCH struck
- [ ] C8 集成测试：注册登录、创建/加入/切换、**一人两家庭隔离与越权拒绝**、**member 调管理接口 403 与角色变更生效**、upsert 幂等、聚合、跨午夜判定、菜单约束、下架 vs 历史单

### D. 前端页面

- [ ] D1 `/login` 登录注册 + `/families`（创建/口令加入/选择已有家庭）；家庭切换入口
- [ ] D2 `/order`-菜单 Tab：分类展示、卡片加减份数、自定义菜名入口
- [ ] D3 `/order`-我的单 Tab：本人当前餐次列表、改份数、删菜；非点菜时段提示+手选餐次
- [ ] D4 `/order`-总单 Tab：聚合展示 + 10s 轮询 + 划掉置灰；餐次自动判定与顶栏切换
- [ ] D5 `/order`-我的 Tab：当前家庭信息、切换家庭、昵称头像修改；admin 可见「管理」子页（菜品/分类/餐次/成员角色）
- [ ] D6 前端测试：餐次判定纯函数（跨午夜）、auth/家庭切换 store、request 封装

### E. 收尾

- [ ] E1 `scripts/local-ci.sh` 全绿（prisma check/migrate + backend lint/test + frontend lint/test/build）
- [ ] E2 `deploy/`：本机运行说明 + 上云迁移文档（Caddy/Nginx HTTPS 示例、env 配置、compose 单机起法）+ pg_dump 定时备份脚本；GitHub 私有仓库 remote 与推送（`.env`/数据确认不入库）
- [ ] E3 真机验收：多账号多家庭全流程；**微信内置浏览器真机回归**
- [ ] E4 CLAUDE.md 项目速览（架构一句话、目录、启动/CI 命令、红线）
- [ ] E5 spec 回填：以真实实现更新 `.trellis/spec/backend|frontend`（超节奏单开任务）

## 验证命令

```bash
docker compose up -d postgres
npm run ci:local          # E1 全量门禁
# 分段：cd backend && npm run lint && npm test
#       cd frontend && npm run lint && npm test && npm run build
```

## 风险文件与回滚点

- 每阶段独立 commit（按 wl-devops git 规范提交信息），出问题 revert 上一阶段提交。
- `prisma/migrations` 提交后不改历史，修错走新迁移；MVP 期允许 `prisma migrate reset`。
- 多家庭隔离与角色权限为安全红线：C8 对应测试不过不允许进入 D 阶段。

## start 前检查

- [x] implement.jsonl / check.jsonl 已填真实 spec/research 条目
- [ ] 用户已明确批准 v3 最终规划摘要（本轮待批）
