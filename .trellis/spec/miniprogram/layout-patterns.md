# 小程序布局契约（双栏点菜页）

适用于 `pages/menu/` 及同类「左分类 + 右列表 + 底部固定栏」页面。

## 1. 页面骨架

```
View.menu-page                 // flex column, height 100vh, padding-bottom 避让原生 tabbar + safe area
├─ View.menu-top               // 固定，不滚动（标题/日期/餐次/搜索）
├─ View.menu-body              // flex:1; min-height:0; flex row
│   ├─ View.cat-nav-wrap       // 固定宽 168rpx; flex column
│   │   ├─ ScrollView.cat-nav  // flex:1; min-height:0（分类项）
│   │   └─ View.cat-custom     // flex-shrink:0（底部固定「＋ 自定义菜」）
│   └─ ScrollView.dish-scroll  // flex:1; enableFlex; usingSticky; onScroll
│       ├─ View.dish-group × N
│       │   ├─ View.dish-group-title  // position: sticky; top: 0; z-index: 1; background: $color-bg
│       │   └─ View.dish-card × N
│       └─ View.scroll-pad     // 防底部栏遮挡
└─ View.cart-bar               // 固定高度 + safe-area padding，整条可点
```

左右栏必须各自独立滚动：`menu-body` 用 `flex:1; min-height:0`，子 `ScrollView` 才能正确算高。

## 2. tabbar 与安全区（tab 页铁律）

tab 页底部固定栏高于原生 tabbar，必须双重预留：

```scss
.menu-page {
  padding-bottom: calc(100rpx + env(safe-area-inset-bottom));
}
.cart-bar {
  height: calc(100rpx + env(safe-area-inset-bottom));
}
```

- 常量口径：750 设计稿，`100rpx` ≈ 原生 tabbar 高度。
- 全面屏靠 `env(safe-area-inset-bottom)` 补 home indicator。
- 若目视出现多余空隙/被遮挡，先用真机核对，不要直接删 safe-area。

## 3. 滚动联动（恒定行高估算）

左栏点击 → 右栏滚动；右栏滚动 → 左栏高亮跟随。**估算精确的前提是右栏每个卡片行高恒定**：缩略图固定、描述单行截断、内边距固定。

```tsx
// rpx 常量，必须与 index.scss 的实际渲染尺寸一致
const GROUP_TITLE_RPX = 64;   // 分组标题
const DISH_ROW_RPX = 169;     // 缩略图 120 + padding 24×2 + 分割线 1
const GROUP_GAP_RPX = 16;

const [windowWidth] = useState(() => Taro.getSystemInfoSync().windowWidth || 375);
const px = (rpx: number) => (rpx / 750) * windowWidth;

const groupOffsets = useMemo(() => {
  const map = new Map<string, number>();
  let acc = 0;
  for (const node of filtered) {
    map.set(node.category.id, acc);
    acc += px(GROUP_TITLE_RPX) + node.dishes.length * px(DISH_ROW_RPX) + px(GROUP_GAP_RPX);
  }
  return map;
}, [filtered]);

function onListScroll(e) {
  const top = e.detail.scrollTop;
  let current = filtered[0]?.category.id ?? '';
  for (const node of filtered) {
    if (top + px(120) >= (groupOffsets.get(node.category.id) ?? 0)) current = node.category.id;
  }
  if (current && current !== activeCatId) setActiveCatId(current);
}
```

- 不引入 `IntersectionObserver`：恒定行高下估算已精确，复杂度更低。
- **改动卡片尺寸必须同步更新 rpx 常量**，否则高亮漂移。

### Don't: 渲染期取窗口宽度

```tsx
// Bad：渲染期同步原生调用，且每次渲染都变
const windowWidth = Taro.getSystemInfoSync().windowWidth || 375;
```

**Why**：违反渲染 purity，且触发额外原生调用。
**Instead**：见上方 `useState(() => ...)`。

## 4. scroll-into-view 重复点击同一项

`scroll-into-view` 值不变则不触发。重复点击同一分类时，用递增序号生成临时 id，下一帧切回稳定 id：

```tsx
const scrollSeq = useRef(0);
function onCatClick(catId: string) {
  setActiveCatId(catId);
  scrollSeq.current += 1;
  setIntoView(`cat-${catId}-${scrollSeq.current}`);
  requestAnimationFrame(() => setIntoView(`cat-${catId}`));
}
```

禁止用 `Date.now()` / `Math.random()` 生成 id（渲染/事件里 impure）。

## 5. 分组标题吸顶

- `ScrollView` 需同时设 `enableFlex` + `usingSticky`（**仅 weapp 支持**）。
- 标题 `position: sticky; top: 0; z-index: 1; background: $color-bg`（不透明背景才能遮盖下方内容）。
- 低版本基础库不支持时退化为普通标题，可接受，不阻塞功能。

## 6. 底部栏与已选弹层

- 底部栏：购物车图标（含总数角标）+「已选 N 份 / 还没有选菜」，整条 `onClick` 切换弹层；**不放主按钮**（与 tabbar「我的单」重复）。
- 弹层 mask 用独立 `View.pop-mask-bg`，避免父级 `opacity` 连带把面板变透明。
- 面板内 `onClick={(e) => e.stopPropagation()}`，mask 点击关闭。

## 7. 批量写操作（清空/逐项置 0）

逐项调用可能**部分成功**：用最后一次返回的全量数据覆盖本地；失败分支必须重新拉全量，否则本地与服务端不一致。

```tsx
async function clearCart() {
  // ...二次确认...
  try {
    let last = orders;
    for (const item of orders) {
      const input = item.dishId ? { dishId: item.dishId } : { dishName: item.dishName };
      last = await api.upsertMyOrder({ mealId, date: session.date, ...input, qty: 0 });
    }
    setOrders(last);
  } catch (err) {
    Taro.showToast({ title: (err as Error).message || '清空失败', icon: 'none' });
    void loadOrders(); // 部分成功时兜底对账
  }
}
```

## 8. 数量边界

- 单菜数量收敛到 `0..99`：`Math.max(0, Math.min(99, current + delta))`，并在无变化时短路（`if (next === current) return`），避免空请求。
- 底部栏总数 = `orders.reduce((s, i) => s + i.qty, 0)`，含自定义菜（自定义菜无 `dishId`，不计入分类角标）。
