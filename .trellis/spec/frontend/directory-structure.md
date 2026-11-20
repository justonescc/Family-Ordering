# 前端目录结构

```
frontend/src/
├── components/      # 可复用 UI 块：MenuTab / MyOrdersTab / SummaryTab / MeTab / MealSwitcher
├── hooks/           # useMeals（拉取餐次）、usePolling（轮询）
├── pages/           # 路由页面：Login / Families / Order；admin/ 子页（AdminMenu/AdminMeals/AdminMembers）
├── services/        # api.ts —— 唯一 API 出口
├── stores/          # zustand：auth（persist → localStorage: family-auth）
├── styles/          # global.css（设计变量、安全区、reset）
├── types/           # 与后端 DTO 对齐的类型
├── utils/           # request.ts（fetch 封装）、meal.ts（上海时区/餐次判定）
├── App.tsx          # 路由表
└── main.tsx         # 入口
```

## 分层约定

- **pages**：路由与页面骨架（Tab 布局、数据编排）。
- **components**：受控展示组件， props 传入数据与回调，不直接发请求（`SummaryTab` 例外：自带轮询）。
- **services**：所有 `fetch` 必须经 `services/api.ts`；组件内禁止直接 `fetch`/axios。
- **hooks**：可复用的有状态逻辑（数据拉取、轮询），页面不写重复的加载代码。

## 新增页面

1. `pages/`（或 `pages/admin/`）建文件
2. `App.tsx` 加路由；需要登录的用 `token && family` 守卫重定向
3. 需要后端数据时调用 `services/api.ts`（缺接口就先在 api.ts 补）

## 命名

- 组件文件 `PascalCase.tsx`，导出同名默认组件
- hook `useXxx.ts`，返回值语义化
- 页面文件 `PascalCase.tsx`
