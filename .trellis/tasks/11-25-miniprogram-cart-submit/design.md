# 设计：小程序点菜购物车式提交

## 1. 边界

- 后端：`schemas/order.ts` + `services/orderService.ts` + `routes/orders.ts` 新增两个端点；`tests/` 新增集成测试。现有端点、Prisma schema 零改动（无迁移）。
- 小程序：新增 `src/stores/cart.ts`；改 `pages/menu/index.tsx`、`pages/mine/index.tsx`、`pages/summary/index.tsx`、`services/api.ts`、`types/index.ts`。
- H5：零改动（数据层完全兼容）。

## 2. 核心数据模型（统一 draft 模型）

规则只有一条：**任何修改都先进本地 draft，提交才落库**。

```
baseline : OrderItemDTO[]        // 服务端真相（进页面时拉 myOrders 初始化）
draft    : Map<key, qty>         // 本地购物车；key = dishId ?? `c:${dishName}`
displayQty = draft.get(key) ?? 0 // 页面所有步进器/角标只读 draft
dirtyKeys = draft 与 baseline 的差异键集合
```

- 进页面：`loadOrders()` 拉服务端 → `draft = fromBaseline(baseline)`；本地若有同键持久化 draft 则覆盖（未提交增量优先）。
- `+/−`：只改 draft（同步内存 + Taro storage persist），零请求。
- 提交：`dirtyKeys` 映射为 items（qty 取 draft 值，0 表示删除）→ `POST /orders/submit` → 返回全量 `OrderItemDTO[]` 即新 baseline → draft 重置为其投影、清持久化键。
- 提交后再点：自然进入新一轮增量，再次提交——无「首提/改单」两种模式。

## 3. API 契约（新增，全部不动现有端点）

### 3.1 `POST /api/v1/orders/submit`

```jsonc
// Request（Zod: submitOrderSchema）
{ "mealId": "cm…", "date": "2026-11-25",
  "items": [ { "dishId": "cm…" }            // 菜库菜
            | { "dishName": "番茄炒蛋" }     // 自定义菜（trim 非空）
            , "qty": 0..99 ] × N }           // 1 ≤ items.length ≤ 100

// Response: data = OrderItemDTO[]（该成员本餐次全量，与 GET /orders/my 同构）
```

- 事务：`prisma.$transaction` 内逐项复用抽取的 `upsertOne()`（qty=0 → `deleteMany`）；任一项抛错整体回滚。
- 校验矩阵：mealId 不属于本家庭 → 3xxx；dishId 不存在/不属于本家庭 → 2xxx dishNotFound；qty 越界 / items 超 100 / dishName 空 → 4xxx qtyInvalid；未选家庭 → 401 语义同现有。
- key 冲突：同一 items 数组内相同 dishName 出现多次 → 以最后一次为准（Zod preprocess 合并或 service 归并）。

### 3.2 `GET /api/v1/orders/summary-members?mealId&date`

```jsonc
// Response: data = Array<{ memberId, nickname, avatar, ordered: boolean }>
```

- 全集 = 家庭启用成员（`familyMember.enabled`，与 members 列表口径一致）；`ordered` = 该成员在本 `(familyId, mealDate, mealId)` 的 `OrderItem` 存在（qty>0 自然成立，qty=0 已删）。
- 复用 `getOrCreateMealOrder` 的只读形态（不创建：无单时全部 `ordered:false`，注意不能像 getSummary 一样惰性建单——这里用 findFirst，查不到返回全 false）。

### 3.3 兼容性

- `PUT /orders/my`、`GET /orders/my`、`GET /orders/summary`、`PATCH items/:id/struck` 契约不变 → 老小程序包、H5 不受影响。
- 新端点对老包不可见即无影响；发布顺序无要求。

## 4. 小程序 `stores/cart.ts`（新增）

- 与 `stores/meal.ts` 同款轻量 store（`useSyncExternalStore` + 模块级 state），不引入 zustand。
- 结构：`Record<cartKey, CartEntry>`，`cartKey = `${familyId}:${mealId}:${date}``，`CartEntry = { baseline: OrderItemDTO[], draft: Record<string, number> }`（`draft` 的键为 `dishId` 或 `c:${dishName}`）。
- 持久化：整 state 经 `Taro.setStorageSync('family-cart', …)` 写入；`getStorageSync` 启动时恢复；切换家庭（`familyId` 变化）清空全部。
- 暴露：`useCart(key)`（读）、`setQty(key, dish, qty)`、`resetFromBaseline(key, orders)`、`getDirtyItems(key)`（diff→items）、`submitCart(key, mealId, date)`（调 API + 落库后重置）、`clearUncommitted(key)`（draft 回滚到 baseline，即「清空已选」语义）。
- `clearCart` 语义修正：原实现逐项 `qty:0` 直接删服务端；现改为 **draft 回滚到 baseline**（只撤销未提交增量）。若要连已提交的一起删：清空后 draft 全 0 → 产生 dirty → 走提交。UI 文案「清空已选」对齐此语义。

## 5. 页面改动

### 5.1 `pages/menu/index.tsx`
- `qtyByDish` 改从 cart draft 取（每菜 `draft[dish.id] ?? 0`）；`change()` 只 `setQty`，去掉 `save()` 网络路径。
- 底部栏右侧新增 `cart-submit` 按钮：`dirtyCount>0 → 「提交点菜（N 处变更）」`可点；`busy` 提交中；否则置灰「已提交 / 暂无变更」。整条栏点击仍展开已选弹层（按钮上 stopPropagation）。
- 已选弹层「清空」改调 `clearUncommitted`（无网络、无 showModal 也可保留确认）。
- 自定义菜 `addCustom()`：`setQty(key, {dishName}, 1)` + 关弹层开已选弹层，去掉即时 `save`。
- `loadOrders()` 成功后调 `resetFromBaseline`（保留已存在的本地增量：合并策略 = 本地持久化 draft 优先，见 §4）。

### 5.2 `pages/mine/index.tsx`
- 步进器数据源改 draft；页面底部/头部有 `dirtyCount>0` 时显示「提交」按钮，复用 `submitCart`。
- 与点菜页共享同一 cartKey，天然双向同步。

### 5.3 `pages/summary/index.tsx`
- `onShow`/餐次变化时并行拉 `api.summary` + `api.summaryMembers`；
- 顶部新增成员状态行：`已点 {orderedCount} 人` + 未点名单（`avatar nickname` 标签，$color-primary-weak 底）；全部已点时只显示「全员已点 ✓」。

### 5.4 `services/api.ts` / `types/index.ts`
- 新增 `submitOrders(input)`、`summaryMembers(query)` 与对应类型（`OrderSubmitInput`、`MemberOrderStatus`）。

## 6. 后端实现要点

- `orderService.ts`：抽 `upsertOne(order, memberId, {dishId?, dishName?, qty})` 私有函数（现 `upsertMyOrder` 主体迁移），`upsertMyOrder` 与 `submitMyOrders` 共用；`submitMyOrders` 用 `prisma.$transaction(async tx => …)`（注意 upsertOne 需接受 tx 客户端参数）。
- `getSummaryMembers`：`prisma.familyMember.findMany({ where: { familyId, enabled: true } })` + `orderItem.findMany({ where: { mealOrderId }, select: { memberId: true }, distinct: ['memberId'] })` → 内存对比组装（成员量级家庭规模，无需 join）。
- 路由挂 `authenticate`（沿用 orders 路由组），`validateRequest(submitOrderSchema)` / `summaryQuerySchema`（复用 myOrdersQuerySchema）。
- 测试（`tests/orders*.test.ts` 补充）：submit 正常落库与返回全量；qty=0 删除；部分项非法整体回滚（构造第 2 项 dishId 不存在，断言第 1 项未落库）；items>100 拒绝；summary-members 已点/未点/无单三种形态。

## 7. 兼容 / 风险

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| 老包 + 新后端 | 无（零 breaking，新端点老包不调用） | 现有接口契约与测试冻结 |
| draft 与服务端并发漂移（家人用老 H5 即时点同一菜） | 提交时 draft 基线过期，覆盖他人改动 | 提交返回全量后立即刷新 baseline；diff 只含用户显式改过的键，不整体覆盖 |
| 批量部分失败 | 脏数据 | 事务整体回滚 + 集成测试覆盖 |
| storage 结构演进 | 旧持久化数据解析失败 | 读取 try/catch + 结构版本号，异常即丢弃本地 draft |
| 「清空已选」语义变化 | 用户误以为已删服务端 | 弹层文案标明「仅撤销未提交的改动」；连已提交一起删需清空后提交一次（qty 全 0） |

## 8. 回滚

- 后端：新端点独立，可整体 revert（无迁移）。
- 小程序：revert 三个页面 + store；本地 storage 残留 `family-cart` 键无副作用（读不到匹配 key 即忽略）。
