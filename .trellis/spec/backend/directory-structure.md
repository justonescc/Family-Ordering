# 后端目录结构

## 目录布局

```
backend/
├── prisma/
│   ├── schema.prisma        # 数据模型（多租户：业务表挂 family_id）
│   ├── migrations/          # 迁移历史，提交后不复改
│   └── seed.ts              # 示例家庭/账号/菜库
├── src/
│   ├── config/              # env.ts（启动期必需变量）、prisma.ts（客户端单例）
│   ├── middleware/          # authenticate / requireAdmin / validate / rateLimit / errorHandler / notFound
│   ├── routes/              # 薄路由，只做校验编排与响应组装
│   ├── schemas/             # Zod 请求校验（auth/family/menu/meal/order/member）
│   ├── services/            # 厚业务逻辑，唯一访问 Prisma 的地方
│   ├── types/               # api.ts（DTO）、express.d.ts（Request 扩展）
│   ├── app.ts / index.ts    # 应用装配 / 启动
│   └── utils/               # errors、response、jwt、password、passphrase、shanghai、dto、logger、asyncHandler
└── tests/                   # 集成测试（supertest），helpers.ts 提供 app/resetDb/注册建家庭
```

## 分层约定

- **routes 薄**：参数校验（`validateRequest`）→ 中间件链 → 调 service → `createSuccessResponse`。路由内禁止写 SQL/业务规则。
- **services 厚**：所有 Prisma 调用与业务规则都在 service；按业务域拆文件（auth/family/menu/meal/order/member）。
- **禁止**新增 `controllers/`、`models/` 目录（历史遗留写法，Prisma 承担模型层）。

## 新增功能的标准路径

1. `prisma/schema.prisma` 加模型 → `npm run prisma:migrate`
2. `schemas/` 加 Zod 校验
3. `services/` 加业务方法
4. `routes/` 加路由并挂到 `routes/index.ts`
5. `tests/api/` 补集成测试

## 命名约定

- 文件/目录：`kebab-case` 或单词小写（`orderService.ts`、`errorHandler.ts`）
- service 导出函数名：动词开头（`getMenu`、`upsertMyOrder`、`resolveCurrentMeal`）
- 路由文件与 API 前缀一致：`routes/orders.ts` → `/orders`
