# 错误处理

## 错误类型

- `AppError`（`utils/errors.ts`）：业务错误，携带 `code`、`http status`、`details`。
- `errors` 对象：预置工厂（`errors.dishNotFound()`、`errors.forbidden()`…），**禁止在业务代码里就地 new AppError**（新增错误先加到 `errors`）。
- `ZodError`：请求校验失败，由 `errorHandler` 统一转 400。

## 错误码分段

| 段 | 含义 |
| --- | --- |
| 1xxx | 账号 / 家庭 |
| 2xxx | 菜单（分类/菜品） |
| 3xxx | 餐次 |
| 4xxx | 点菜 |
| 9xxx | 系统（9000 内部、9001 404、9002 未登录、9003 无权限、9004 校验、9005 限流） |

## 传播方式

- 路由处理器用 `asyncHandler` 包裹，异常自动进 `errorHandler`。
- service 内直接 `throw errors.xxx()`。
- 中间件（`requireAdmin` 等）用 `next(error)` 传递。
- 同步中间件抛出的异常 Express 5 也会转发给 `errorHandler`。

## 统一响应

```ts
// 成功
{ code: 0, message: 'ok', data }
// 失败
{ code: 1002, message: '用户名或密码错误' }        // HTTP 401
{ code: 9004, message: '请求参数不合法', details } // HTTP 400
```

## 日志

- `logger.error('未处理的错误', { method, path, error })` 仅对非 AppError 触发。
- 生产环境输出 JSON 单行，开发环境输出可读格式。

## 常见错误

- 直接 `res.status(500).send()`：绕过统一响应，前端拿不到错误码。
- 把 Prisma 异常直接抛给前端：信息泄露且无错误码。
- 在路由里写业务校验：应下沉到 service 或 schema。
