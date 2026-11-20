# 执行计划 — 家庭点菜程序 MVP（v3 · 执行结果）

> 状态：A–E 基本完成，仅剩 E3 真机验收待人工执行。
> 关键产物：后端 API（多租户/权限/点菜/总单）、前端四页 + 管理页、本地 CI 门禁、部署文档、Trellis 规范回填。

## 阶段清单

### A. 仓库骨架 ✅

- [x] A1 顶层目录、根 package.json（workspaces + ci:local）、.gitignore、.nvmrc（24）、backend/.env.example
- [x] A2 backend 脚手架（ESLint 9 / Vitest / Express 入口 / healthz / 统一响应与错误处理 / 限流）
- [x] A3 frontend 脚手架（Vite + React 19 + antd-mobile、目录分层、request.ts、px-to-viewport、安全区）
- [x] A4 docker-compose.yml（postgres + backend）

### B. 数据层 ✅

- [x] B1 Prisma schema：users / families / family_members(role) / meals / categories / dishes / meal_orders / order_items + migrate
- [x] B2 seed：示例家庭（admin+member、默认午/晚餐次、4 分类 22 道菜）+ 演示账号
- [x] B3 时区与餐次工具（`getShanghaiDateStr` / `resolveCurrentMeal`，含跨午夜）+ 单测

### C. 后端 API ✅

- [x] C1 auth：register/login + JWT
- [x] C2 families：创建(首成员 ADMIN) / 口令加入(MEMBER) / 我的家庭 / enter 切换换发 token；authenticate + requireFamily + requireAdmin
- [x] C3 menu：GET /menu（家庭内分类+已上架菜品树）
- [x] C4 菜单维护(admin)：categories / dishes CRUD、唯一约束、上下架；分类被引用禁删
- [x] C5 餐次配置(admin)：meals CRUD（停用=软删）、HH:mm 校验（允许跨午夜）
- [x] C6 成员(admin 列表 + 角色调整；本人改昵称头像)
- [x] C7 orders：GET/PUT /orders/my、GET /orders/summary（归组/求和/点菜人/struck）、PATCH struck
- [x] C8 集成测试 38 例：注册登录、创建/加入/切换、一人两家庭隔离与越权拒绝、member 管理接口 403、角色变更、upsert 幂等、聚合、跨午夜、菜单约束

### D. 前端页面 ✅

- [x] D1 `/login` 登录注册（登录后自动进入唯一家庭）
- [x] D2 `/order`-菜单 Tab：分类展示、卡片加减、自定义菜名入口
- [x] D3 `/order`-我的单 Tab：改份数/删菜/时段提示
- [x] D4 `/order`-总单 Tab：聚合展示 + 10s 轮询 + 按组划掉；餐次自动判定 + 手动切换
- [x] D5 `/order`-我的 Tab：家庭信息、切换家庭、昵称头像；admin 管理入口（菜品/分类、餐次、成员角色）
- [x] D6 前端测试：餐次判定纯函数（跨午夜）

### E. 收尾

- [x] E1 `scripts/local-ci.sh` 全绿（prisma generate + 后端 lint/build/test + 前端 lint/test/build）
- [x] E2 `deploy/`：本机运行 + 上云迁移文档（Caddy HTTPS、env、compose）+ pg_dump 备份脚本
- [ ] E3 真机验收：两台手机/微信内置浏览器走验收标准（**待人工执行**，详见下方清单）
- [x] E4 CLAUDE.md 项目速览
- [x] E5 spec 回填：`.trellis/spec/backend|frontend` 全部由模板替换为真实规范

## 验证命令

```bash
docker compose up -d postgres   # 本机 PostgreSQL
npm run ci:local                # 全量门禁（提交前必须全绿）
```

## 环境备注（本机实际落地）

- Node 24（nvm 已装并设为默认）；`.nvmrc` = 24
- 数据库：本机 PostgreSQL 16（Homebrew，`brew services start postgresql@16`），角色 `family`，库 `family_ordering` / `family_ordering_test`
- Docker Desktop 在本机无法启动，故本地用 Homebrew PostgreSQL；`docker-compose.yml` 仍用于上云
- npm 11 需在 `package.json` 的 `allowScripts` 放行 prisma / esbuild / fsevents 安装脚本
- 依赖统一：vite 8（前后端一致）、Prisma 6（7 需 prisma.config.ts + 驱动适配器，MVP 不采用）、React 19 单一版本（`overrides` 锁定）

## E3 真机验收清单（人工）

- [ ] 手机浏览器：注册 → 创建家庭 → 加菜 → 点菜 → 总单 10s 内出现
- [ ] 第二台设备凭口令加入，总单合并计数并标注点菜人
- [ ] 微信内置浏览器打开同一地址，走通全流程（安全区/键盘/点击无异常）
- [ ] admin 下架菜品后菜单页消失、历史总单仍显示
- [ ] 新增「夜宵 21:00–01:00」后，处于该时段自动判定为夜宵
