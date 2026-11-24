# 小程序质量基线

## 门禁

- `cd miniprogram && npm run typecheck`：`tsc --noEmit`。
- `cd miniprogram && npm run build:weapp`：Taro 编译到 `dist/`。
- 提交前两条全绿。`scripts/local-ci.sh` 只门禁 backend + frontend，**不含 miniprogram**，需单独跑。
- 真机/开发者工具目视：布局、吸顶、safe area、软键盘遮挡。

## 禁止模式

- **渲染期 impure / 同步原生调用**：`Taro.getSystemInfoSync()`、`Taro.getWindowInfo()` 等禁止写在组件体或 render 路径上。用 `useState(() => ...)` 惰性初始化一次：

```tsx
// Good：只取一次，渲染期不重复调原生
const [windowWidth] = useState(() => Taro.getSystemInfoSync().windowWidth || 375);

// Bad：每次渲染都调原生同步接口
const windowWidth = Taro.getSystemInfoSync().windowWidth || 375;
```

- 渲染期 `Date.now()` / `Math.random()`：同上，放进 `useState` 初始化器。
- 硬编码色值：一律用 `styles/tokens.scss` 变量（`$color-*` / `$radius-*` / `$space-*` / `$font-*` / `$shadow-*`）。
- 组件内直接 `Taro.request` / `fetch`：API 只走 `services/api.ts`。
- `console.log` 残留。
- 显式 `any`。

## 可访问性 / 移动端

- 点击目标 ≥ 44px → **88rpx** 起步（含关闭、清空等小按钮）。
- 底部固定栏必须处理安全区：`padding-bottom: calc(100rpx + env(safe-area-inset-bottom))`，见 [Layout Patterns](./layout-patterns.md)。
- 输入弹层需考虑软键盘遮挡（真机验证）。

## 测试要求

- 纯逻辑（`utils/meal.ts`、`stores/meal.ts` 等）补单测。
- 纯样式改造可豁免单测，但必须过 typecheck + build:weapp。
