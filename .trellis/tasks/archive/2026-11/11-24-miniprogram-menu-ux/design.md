# 设计：小程序点菜页体验优化

## 1. 边界

- 只改 `miniprogram/src/pages/menu/index.tsx` 与 `index.scss`；通用件不够用时小改 `app.scss` / `MealSwitcher.tsx`。
- 后端零改动，复用现有 `api.getMenu` / `api.myOrders` / `api.upsertMyOrder`。
- 不改 H5（`frontend/`），两端独立演进。

## 2. 页面结构（目标 DOM 层级）

```
View.menu-page                     // flex column, height 100vh, 底部预留 tabbar + safe area
├─ View.menu-top                   // 固定，不滚动
│   ├─ View.page-header.menu-header
│   ├─ MealSwitcher
│   ├─ View.muted.menu-tip         // 仅不在餐次时段时
│   └─ View.search-bar
├─ View.menu-body                  // flex:1, min-height:0, flex row
│   ├─ View.cat-nav-wrap           // 固定宽度, flex column
│   │   ├─ ScrollView.cat-nav      // flex:1, 分类项列表（可滚动）
│   │   └─ View.cat-custom         // 固定底部「＋ 自定义菜」
│   └─ ScrollView.dish-scroll      // flex:1, enableFlex, usingSticky, onScroll
│       ├─ View.dish-group × N
│       │   ├─ View.dish-group-title   // position: sticky; top: 0
│       │   └─ View.dish-card × N
│       └─ View.scroll-pad
└─ View.cart-bar                   // 固定高度, 整条可点
    ├─ View.cart-icon-wrap        // 🛒 + 角标
    └─ View.cart-summary          // 「已选 N 份 / 还没有选菜」
```

弹层（mask + panel）挂在 `menu-page` 内，`cartOpen` / `customOpen` 两个状态控制。

## 3. 数据流与状态

- 数据源不变：`menu`（`MenuCategoryNode[]`）、`orders`（`OrderItem[]`）。
- 派生量不变：`qtyByDish`、`filtered`、`catCount`、`totalCount`、`groupOffsets`。
- 新增状态：
  - `customOpen: boolean`（自定义菜输入弹层显隐）
  - 弹层内清空：`save({ dishId, qty: 0 })` 逐项删除，或循环调用；以现有 `upsertMyOrder` 为准，清空 = 对当前所有 `dishId` 项各调一次 `qty: 0`（自定义菜无 dishId，需单独 `dishName` 调 `qty: 0`）。
- `save()` 返回全量 `orders`，一次写入即同步步进器 / 角标 / 总数 / 弹层，无需额外事件。

## 4. 关键交互设计

### 4.1 滚动联动（保留估算，改为恒定行高）
- 卡片行高恒定是估算准确的前提：缩略图固定 120rpx、描述单行截断、内边距固定 → `DISH_ROW_PX` 固定。
- 分组标题高度固定（64rpx）→ `GROUP_TITLE_PX` 固定。
- 常量按 750 设计稿换算：`px()` 已存在，常量改用 rpx 更直观（`GROUP_TITLE_RPX` / `DISH_ROW_RPX` / `GROUP_GAP_RPX`），在 `groupOffsets` 里用 `px()` 转成 px 与 `scrollTop` 比较。
- 不引入 `IntersectionObserver`：估算在恒定行高下精确，复杂度更低；长描述已用单行截断规避漂移。

### 4.2 分组标题吸顶
- `dish-scroll` 加 `enableFlex` + `usingSticky`；`dish-group-title` 设 `position: sticky; top: 0; z-index: 1`，背景 $color-bg 保证遮盖下方内容。
- 兼容性：`usingSticky` 仅 weapp 支持；低版本基础库不支持时退化为普通标题（不吸顶），不影响功能。

### 4.3 左栏
- 宽 168rpx；未选中：$color-text-secondary；选中：背景 $color-surface + 左侧 6rpx 品牌色竖条 + 文字 $color-primary 加粗。
- 角标：$color-primary 圆点白字，数量 > 0 才显示。
- 自定义项固定在分类列表之外（`cat-nav-wrap` 底部），样式与分类项区分（虚线上分隔 + 品牌色文字）。

### 4.4 菜品卡片
- 行：`padding: 24rpx 0`，底部 1rpx $color-divider；缩略图 120rpx 圆角 $radius-sm。
- 信息区 `flex:1; min-width:0`；名称 $font-md 加粗；描述 $font-sm 单行截断。
- 操作区：步进器（`qty-btn` / `qty-num`），与 `app.scss` 通用件一致。

### 4.5 底部栏
- 高度 100rpx + `padding-bottom: env(safe-area-inset-bottom)`；白底 + 顶部 1rpx 分割线 / $shadow-sm。
- 左侧购物车圆形容器（$color-primary-weak 底 + 🛒），总数角标（$color-primary 圆点）。
- 中间文案：有选 → 「已选 N 份」（N 用 tabular-nums）；无选 → 「还没有选菜」灰色。
- 整条 `onClick` 切换 `cartOpen`；无选时点击也允许展开（弹层内可看空态 + 自定义入口）。

### 4.6 已选弹层
- mask 半透明；panel 底部弹出，圆角 $radius-lg 顶部，最大高度约 70vh，内部 `ScrollView`。
- 头部：「我点的菜」+「清空」+「✕」。
- 行：名称 + ×数量 + 步进器（有 dishId）/ 「自定义」标记（无 dishId）。
- 底部保留自定义菜输入行（`custom-row`）。
- 清空：二次确认（`Taro.showModal`）后逐项置 0。

### 4.7 自定义菜弹层
- 点击左栏「＋ 自定义菜」→ 小弹层（居中或底部），含 `Input` + 「加入」。
- 复用 `addCustom()`：加入成功后清空输入并打开已选弹层（与现状一致）。

## 5. 样式与 token

- 全部用 `styles/tokens.scss` 变量（$color-* / $radius-* / $space-* / $font-* / $shadow-*），禁止硬编码色值。
- 新增样式全部放 `pages/menu/index.scss`（页面私有），不污染 `app.scss`；仅当通用件缺失时才考虑上提。
- 尺寸用 rpx（750 设计稿）。

## 6. 兼容 / 风险

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| tabbar 高度按 100rpx + safe area 估算不准 | 底部栏被遮挡或留白过多 | 用 `env(safe-area-inset-bottom)`；开发者工具 + 真机验证，必要时改用 `Taro.getWindowInfo()` 计算 |
| `usingSticky` 低版本不支持 | 分组标题不吸顶 | 可接受退化，不阻塞功能 |
| 卡片行高估算漂移 | 左栏高亮错位 | 恒定行高 + 描述单行截断；长名称/长描述不撑高 |
| 清空逻辑逐项请求多次 | 慢/部分失败 | 逐项串行执行并统一回写最后结果；失败 toast |
| 工作区已有未提交 tsx 改动 | 误覆盖丢失 | 实施前确认 `git diff`，改动基于现有内容，不 `checkout` 该文件 |

## 7. 回滚

- 改动集中在 2 个文件，`git checkout -- miniprogram/src/pages/menu/index.tsx miniprogram/src/pages/menu/index.scss` 可整体回退（会丢失工作区原有双栏改动，回滚前需与用户确认）。
