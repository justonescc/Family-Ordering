# 小程序点菜购物车式提交 · PRD

> 父任务：11-23-miniprogram（小程序化改造）
> 定位：点菜从「点一次写一次库」改为「先选后提交」的购物车式下单，并对做饭的人显示「谁还没点」。

## Goal

点菜页对齐主流点餐小程序的下单心智：`+ / −` 只改本地购物车，点「提交点菜」才批量写入总单；总单页显示成员已点/未点状态，做饭的人一眼知道在等谁。

## Background（已确认事实）

- 现状点菜**即时写库**：小程序 `menu` / `mine` 页每点一次调 `PUT /orders/my`（`upsertMyOrder`），无任何提交概念；`orderService.ts:34-78`。
- `OrderItem` 唯一键 `(mealOrderId, memberId, dishName)`，`qty=0` 即删除（`orderService.ts:63-66`）；`MealOrder` 按 `(familyId, mealDate, mealId)` 惰性 upsert。
- 总单 `GET /orders/summary` 返回 `SummaryGroupDTO[]`（按菜聚合 + 成员明细），**无成员覆盖信息**；两端总单页（H5 `SummaryTab.tsx` 10s 轮询划菜、小程序 `pages/summary/index.tsx`）都在用。
- **兼容约束**：小程序是独立发包，若改 `summary` 响应结构，后端先上线即打挂老小程序包与 H5。因此本任务**零 breaking**：新功能全走新端点，现有接口契约一字不动，H5 零改动。
- 小程序 `stores/meal.ts` 是轻量 store（`useSyncExternalStore`，非 zustand）；页面 store 惯例见 `.trellis/spec/miniprogram/`。
- 家庭成员 API 已存在（`routes/members.ts`），可取启用成员全集。

## 关键决策（已定，用户 2026-11-25 确认）

1. **形态 = 购物车式先选后提交**：`+/−` 只改本地 draft，点「提交点菜」批量写库；规则统一为「任何修改都需提交才生效」（含提交后的再修改——再次进 draft、再提交）。
2. **总单显示谁没点**：做饭的人可见「已点 N 人 / 未点：名单」。
3. **端范围 = 只改小程序**；H5 点菜保持即时写（数据层完全兼容），H5 总单不加成员状态行。

## Requirements

### F1 点菜页购物车化
- `+/−`、清空、自定义菜：全部只改本地 draft（无网络请求，立即反馈角标/底部栏）。
- 显示数量 = draft 值；进入页面时以服务端 `myOrders` 初始化 draft 基线。
- 底部栏：`[🛒 已选 N 份] [提交点菜]`；存在未提交变更时提交按钮可点并显示变更提示，无变更时置灰；提交中 busy 防重复。
- 提交成功：toast「已提交，总单已更新」，本地增量清零（基线刷新为服务端返回）。

### F2 批量提交接口（新端点）
- `POST /orders/submit`：body `{ mealId, date, items: [{ dishId? | dishName?, qty }] }`，事务内逐项 upsert（`qty=0` 删除），返回该成员全量 `OrderItemDTO[]`。
- 校验：items 非空且 ≤100、qty 0–99、dishId 属于本家庭、dishName trim 非空；任一项失败整体回滚。

### F3 购物车持久化
- draft 按 `(familyId, mealId, date)` 键控，持久化到本地存储（杀 app 不丢）；提交成功清除对应键；切换家庭清空全部 draft。

### F4 我的单页统一购物车
- `pages/mine` 的步进器同样只改共享 draft（与点菜页同一份），页面内提供提交入口（有未提交变更时显示），两端入口行为一致。

### F5 总单成员状态（新端点）
- `GET /orders/summary-members?mealId&date`：返回 `[{ memberId, nickname, avatar, ordered }]`（ordered = 该成员在此餐次单有 items；未点成员 = 家庭启用成员 − 已点）。
- 小程序总单页顶部新增成员状态行：「已点 2 人 · 未点：王五」。

## Acceptance Criteria

- [ ] 点菜页 `+/−` 无网络请求（断网也可点），角标/底部栏即时更新。
- [ ] 未提交前总单与「我的单」不出现该改动；提交后总单可见。
- [ ] 提交按钮仅在存在未提交变更时可点；提交中防重复；成功后增量清零、按钮回到置灰。
- [ ] 自定义菜可加入购物车并随批量提交落库（dishName 快照、dishId 为空）。
- [ ] 清空购物车仅恢复 draft 到基线（不直接删服务端已提交的项），「清空已选」语义正确。
- [ ] 杀掉小程序重进，未提交的 draft 仍在；提交后重进不再残留。
- [ ] 「我的单」页改动与点菜页共享同一 draft，任一页提交后另一页同步。
- [ ] 总单页显示已点/未点成员；全部已点时未点名单为空不占位。
- [ ] 老接口行为不变：`PUT /orders/my`、`GET /orders/summary`、`GET /orders/my` 契约与现有集成测试全绿。
- [ ] `cd backend && npm run test` 全绿；`cd miniprogram && npm run typecheck`、`npm run build:weapp` 全绿。

## Out of Scope

- 催单/订阅消息通知、提交后锁定、超时自动提交、提交历史/订单状态机。
- 价格、规格、支付（后端无字段）。
- H5 任何改动（点菜与总单）。

## 技术边界

- 后端：仅**新增** `POST /orders/submit`、`GET /orders/summary-members` 两个端点及 service/schema/测试；不改现有端点、不改 Prisma schema（无新字段/迁移）。
- 小程序：新增 `stores/cart.ts`，改 `pages/menu`、`pages/mine`、`pages/summary`、`services/api.ts`、`types`。
- H5：零改动。

## Notes

- 详细设计见 `design.md`，执行清单见 `implement.md`。
