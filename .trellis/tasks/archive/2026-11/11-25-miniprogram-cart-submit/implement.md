# 执行计划：小程序点菜购物车式提交

## 前置

- [ ] 确认工作区干净（`git status`），基于最新 `develop-1.0` 实施。
- [ ] 红线：现有接口契约（`PUT /orders/my` 等）一字不改；H5（`frontend/`）零改动。

## 实施清单（按顺序）

### 1. 后端

- [ ] `schemas/order.ts`：新增 `submitOrderSchema`（mealId/date + items 1..100，item 为 `{dishId}` 或 `{dishName(trim 非空)}` + `qty 0..99`，同数组同名归并）。
- [ ] `services/orderService.ts`：抽 `upsertOne(tx, order, memberId, input)` 私有函数；新增 `submitMyOrders`（`prisma.$transaction` 整体回滚）与 `getSummaryMembers`（findFirst 餐次单，不惰性创建；启用成员全集 × distinct 已点 memberId）。
- [ ] `routes/orders.ts`：新增 `POST /submit`（validateRequest(submitOrderSchema)）与 `GET /summary-members`（复用 myOrdersQuerySchema）。
- [ ] `tests/`：submit 正常/qty=0 删除/部分非法整体回滚/items>100 拒绝；summary-members 有单已点未点/无单全 false。
- [ ] 验证：`cd backend && npm run test` 全绿（含既有用例）+ `npm run lint`。

### 2. 小程序

- [ ] `types/index.ts`：`OrderSubmitInput` / `MemberOrderStatus`。
- [ ] `services/api.ts`：`submitOrders` / `summaryMembers`。
- [ ] `stores/cart.ts`（新）：轻量 store + `Taro.setStorageSync('family-cart')` 持久化（try/catch + 版本号）；`useCart / setQty / resetFromBaseline / getDirtyItems / submitCart / clearUncommitted`；切家庭清空。
- [ ] `pages/menu/index.tsx`：步进器/自定义菜改 draft；`loadOrders` 成功后 `resetFromBaseline`；底部栏加提交按钮（三态 + stopPropagation）；已选弹层「清空」改 `clearUncommitted`；渲染期禁 impure、样式走 tokens。
- [ ] `pages/mine/index.tsx`：步进器改共享 draft + 未提交变更提交按钮。
- [ ] `pages/summary/index.tsx`：并行拉 `summaryMembers`，顶部成员状态行（已点 N 人 / 未点名单 / 全员已点 ✓）。
- [ ] 样式：新类名补进对应 `index.scss`，只用 `styles/tokens.scss` 变量；点击目标 ≥88rpx。
- [ ] 验证：`cd miniprogram && npm run typecheck` + `npm run build:weapp` 全绿；无 `console.log`、无渲染期 impure。

### 3. 收尾

- [ ] 真机/开发者工具走查：断网点菜、提交后总单出现、杀 app 重进 draft 保留、我的单与点菜页共享、总单成员状态行。
- [ ] `scripts/local-ci.sh` 全绿（backend+frontend 门禁，确认 H5 未被误改）。

## 风险文件 / 回滚点

- `miniprogram/src/pages/menu/index.tsx`（交互模型重构，改动最大）
- `backend/src/services/orderService.ts`（抽函数，注意不改变 `upsertMyOrder` 行为）
- 回滚：两端独立 revert；无数据库迁移。

## 完成前检查

- [ ] PRD 验收标准逐条可勾选。
- [ ] 既有接口集成测试零改动全绿（契约冻结证明）。
- [ ] 提交拆分建议：`feat(backend)` 批量提交与成员状态端点 → `feat(miniprogram)` 购物车式点菜。
