# 状态管理

## 方案

- 全局状态：`zustand` + `persist` 中间件（仅 auth 需要持久化）。
- 服务端状态：组件本地 `useState` + `useEffect`/轮询拉取，不引入额外请求库。
- URL 状态：路由参数（页面路径），不额外同步。

## 全局 store（`stores/auth.ts`）

持久化键 `family-auth`，字段：

| 字段 | 含义 |
| --- | --- |
| `token` | 当前会话 JWT（含家庭上下文） |
| `user` | 全局账号 `{id, username}` |
| `family` / `member` | 当前家庭与成员档案（角色） |
| `families` | 我加入的家庭列表（含各自角色） |
| `lastFamilyId` | 上次使用的家庭 |

方法：`setSession`（写入并持久化）、`setCurrentFamily`（切换家庭）、`setFamilies`、`logout`。

## 约定

- **只有 auth 进 store**；菜单/点菜等临时数据留在组件里，切换 Tab 允许重新拉取。
- 切换家庭后必须换发 token（`setCurrentFamily` 传新 token），权限即时生效。
- `utils/request.ts` 直接从 `localStorage` 读 token，避免与 store 循环依赖。
- 读取 store 用选择器：`useAuthStore((s) => s.token)`，避免整对象订阅导致多余渲染。

## 常见错误

- 把后端返回直接整对象存 store 且不更新类型（应对齐 `types/`）。
- 在 store 里写业务请求逻辑。
- 持久化敏感信息（密码、口令）——只存 token 与展示用资料。
