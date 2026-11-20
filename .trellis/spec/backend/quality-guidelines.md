# 后端质量基线

## 门禁

- `npm run -w backend lint`：ESLint 9 flat config，`--max-warnings 0`。
- `npm run -w backend build`：`prisma generate` + `tsc`（strict、noUncheckedIndexedAccess）。
- `npm run -w backend test`：Vitest + supertest 集成测试。
- 提交前 `npm run ci:local` 全绿。

## 禁止模式

- 路由内直接访问 Prisma（应通过 service）。
- `any` 显式标注（`@typescript-eslint/no-explicit-any` 为 warn，门禁按 0 warning 计）。
- 未使用的变量/导入（`no-unused-vars` error）。
- 在循环里发查询（N+1）；列表查询用 `findMany` + 内存归组。
- 直接修改 `req.query` / `req.params`（Express 5 只读 getter）。

## 类型安全

- DTO 定义集中在 `src/types/api.ts`，与前端 `frontend/src/types` 对齐。
- 从请求取值用 `parsedBody/parsedQuery/parsedParams`，不要断言 `req.query.x as string`。

## 测试要求

- 新增/变更接口必须补集成测试（`tests/api/`）。
- 测试共用 `family_ordering_test` 库，**必须串行**（`fileParallelism: false`），`beforeEach(resetDb)`。
- 安全相关（多租户隔离、角色权限）必须有负向用例。

## 安全

- 密码/家庭口令 bcrypt；家庭口令另存 SHA-256 索引键。
- JWT 载荷不放敏感信息；`FAMILY_JWT_SECRET` 来自环境变量。
- 账号与家庭入口挂 `authLimiter`，全局挂 `globalLimiter`。
