# 执行计划：小程序点菜页体验优化

## 前置

- [ ] 确认 `git diff -- miniprogram/src/pages/menu/index.tsx` 存在工作区双栏改动，实施期间不 `git checkout` 该文件，避免丢失。
- [ ] 明确改动只落在 `miniprogram/src/pages/menu/`（必要时 `app.scss`），不碰后端与 H5。

## 实施清单（按顺序）

### 1. `pages/menu/index.tsx`

- [ ] 新增状态 `customOpen`（自定义菜输入弹层显隐）。
- [ ] `groupOffsets` 常量改为 rpx 口径（`GROUP_TITLE_RPX` / `DISH_ROW_RPX` / `GROUP_GAP_RPX`），比较时用 `px()` 换算；按 F3 恒定行高（缩略图 120rpx + padding 24rpx×2 ≈ 168rpx；标题 64rpx）设定数值。
- [ ] 左栏改造：外层 `View.cat-nav-wrap`（固定宽 + flex column）包裹 `ScrollView.cat-nav`（flex:1）与底部固定 `View.cat-custom`「＋ 自定义菜」，点击置 `customOpen=true`。
- [ ] 右栏 `ScrollView.dish-scroll` 增加 `enableFlex` `usingSticky`；分组标题加 `dish-group-title`（sticky 样式）。
- [ ] 底部栏 `cart-bar`：去掉 `cart-cta`（「我的单」按钮）与 `openMyOrders`；整条 `cart-bar` 点击切换 `cartOpen`。
- [ ] 已选弹层 `cart-pop` 头部增加「清空」：`Taro.showModal` 二次确认后，对每项按 `dishId ?? dishName` 调 `save({..., qty:0})`，最后以返回的全量 `orders` 覆盖状态。
- [ ] 新增自定义菜输入弹层（`custom-pop`）：`Input` + 「加入」，复用 `addCustom()`；成功后清空输入并打开已选弹层。
- [ ] 清理不再使用的引用（`openMyOrders`、可能的未用 import）。

### 2. `pages/menu/index.scss`

- [ ] 补齐 `menu-page` / `menu-top` / `menu-body` / `cat-nav-wrap` / `cat-nav` / `cat-nav-item(-active)` / `cat-nav-name` / `cat-nav-badge` / `cat-custom`。
- [ ] 补齐 `dish-scroll` / `dish-group` / `dish-group-title`（sticky）/ `dish-card` / `dish-card-img(-empty)` / `dish-card-info` / `dish-card-name` / `dish-card-desc`（单行截断）/ `dish-card-actions` / `scroll-pad`。
- [ ] 补齐 `cart-bar` / `cart-icon-wrap` / `cart-icon` / `cart-badge` / `cart-summary` / `cart-count-text` / `cart-empty-text`（含 safe-area padding）。
- [ ] 补齐 `cart-pop-mask` / `cart-pop` / `cart-pop-head` / `cart-pop-close` / `cart-pop-empty` / `cart-pop-row(-is-struck)` / `cart-pop-info` / `cart-pop-name` / `cart-pop-qty` / `cart-pop-custom`。
- [ ] 补齐 `custom-pop` 相关样式；全部使用 `tokens.scss` 变量，无硬编码色值。
- [ ] `menu-page` 预留原生 tabbar 高度：`padding-bottom: calc(100rpx + env(safe-area-inset-bottom))`（或等效方案）。

### 3. 验证

- [ ] `cd miniprogram && npm run typecheck`
- [ ] `cd miniprogram && npm run build:weapp`
- [ ] 微信开发者工具打开 `dist/`，走查：
  - [ ] 双栏布局 / 各自滚动 / 底部栏吸底不遮内容
  - [ ] 左栏点击 → 右栏滚动；右栏滚动 → 左栏高亮跟随无漂移
  - [ ] 分组标题吸顶
  - [ ] 长名称 / 长描述不撑破卡片
  - [ ] 底部栏总数（含自定义菜）/ 展开弹层 / 清空 / 增减 / 自定义加入
  - [ ] 左栏底部「＋ 自定义菜」弹层加入成功
  - [ ] 搜索态隐藏左栏、结果可加购
  - [ ] 空菜单 / 加载失败 / 搜索无结果三态
- [ ] 真机（iOS + Android 各一）复核 safe area 与吸顶。

## 风险文件 / 回滚点

- 风险文件：`miniprogram/src/pages/menu/index.tsx`（交互与结构）、`index.scss`（布局）。
- 回滚：`git checkout -- miniprogram/src/pages/menu/index.tsx miniprogram/src/pages/menu/index.scss`（注意会一并丢失工作区原有双栏改动，回滚前须确认）。
- 工作区原有未提交改动是本任务起点，禁止覆盖或丢弃。

## 完成前检查

- [ ] PRD 验收标准逐条可勾选。
- [ ] `typecheck` / `build:weapp` 全绿。
- [ ] 无 `console.log`、无硬编码色值、无渲染期 impure 调用。
