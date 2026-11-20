# 组件约定

## 基本形态

- 函数组件 + 默认导出；props 显式声明 `interface`。
- 展示与数据分离：组件接收数据与回调，业务请求由页面/hook 发起。
- UI 库统一用 `antd-mobile`（v5）；不混用其他移动端组件库。

## 样式

- 内联样式颜色使用语义变量（`var(--color-primary)` 等），禁止散落硬编码色值。
- 尺寸用 `postcss-px-to-viewport` 自动转 vw（已排除 `node_modules`）；需要固定的加 `.ignore-vw`。
- 安全区：底部固定栏 `padding-bottom: var(--safe-bottom)`；页面容器预留底部 TabBar 高度。

## 交互

- 异步按钮统一 `disabled={busy}` 防重复提交；失败用 `Toast.show({ content: (e as Error).message })`。
- 破坏性操作先用 `Dialog.confirm` 二次确认。
- 列表为空用 `Empty`，避免空白页。

## 反例

- 在组件里直接 `fetch` 或直接 import `request`（应走 `services/api.ts`）。
- 用 `document` 操作 DOM、用 `window.alert` 提示。
- 组件内部保存与服务端重复的业务规则（如餐次判定应调 `utils/meal.ts`）。
