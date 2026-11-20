# 前端质量基线

## 门禁

- `npm run -w frontend lint`：ESLint 9 flat config + react-hooks + react-refresh，`--max-warnings 0`。
- `npm run -w frontend build`：`tsc --noEmit` + `vite build`。
- `npm run -w frontend test`：Vitest（jsdom + @testing-library）。
- 提交前 `npm run ci:local` 全绿。

## 禁止模式

- 组件内直接 `fetch` / `axios`（必须走 `services/api.ts`）。
- 显式 `any`（`@typescript-eslint/no-explicit-any` 为 warn，门禁按 0 warning 计）。
- 未使用变量（`noUnusedLocals` / `noUnusedParameters` 已开）。
- 渲染期 impure 调用（`Date.now()`、`Math.random()`）：用 `useState(() => ...)` 取初值。
- 硬编码色值（用 `var(--color-*)`）。
- `console.log` 残留。

## 可访问性 / 移动端

- 点击目标 ≥ 44px；按钮成对出现时注意间距。
- `viewport-fit=cover` + 安全区变量，禁止固定高度撑满整屏。
- 微信内置浏览器：不依赖 `-webkit-overflow-scrolling` 私有行为，输入框聚焦不被键盘遮挡。

## 测试要求

- 纯逻辑（`utils/meal.ts` 等）必须有单测。
- 新增 hook / 关键交互补测试；测试文件与被测文件同目录（`xxx.test.ts`）。
