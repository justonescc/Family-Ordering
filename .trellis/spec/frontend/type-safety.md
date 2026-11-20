# 类型安全

- `frontend/src/types/index.ts` 与后端 `backend/src/types/api.ts` 的 DTO **逐字段对齐**；后端改 DTO 必须同步前端。
- 组件 props 显式声明 interface；API 返回值用 DTO 类型标注。
- 不使用 `any`；确实需要兜底时用 `unknown` +  narrowing。

## 请求层

```ts
// utils/request.ts：统一封装，返回 data（已解包）
export async function request<T>(path, options): Promise<T>
export class ApiError extends Error { code, status, details }
```

- 调用方拿到的就是 `data`，不是整个响应体。
- 错误统一 `throw new ApiError(...)`，UI 层 `Toast.show({ content: (e as Error).message })`。

## 枚举

- 角色用字面量联合 `type Role = 'ADMIN' | 'MEMBER'`（与 Prisma enum 对齐），不用数字枚举。
