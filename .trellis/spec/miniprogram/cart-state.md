# 购物车状态契约（stores/cart.ts）

> 来源任务：11-25-miniprogram-cart-submit。点菜「先选后提交」的统一 draft 模型。

## 统一数据模型

规则只有一条：**任何修改都先进本地 draft，提交才落库**（含提交后的再修改）。

```
baseline : OrderItemDTO[]              // 服务端真相（myOrders 初始化）
draft    : Record<key, {dishId?, dishName, qty}>   // 键 = dishId ?? `c:${dishName}`
dirty    = draft 与 baseline 的差异     // 唯一写库路径 submitCart(dirty)
```

- 页面步进器只读 draft，`setQty` 纯本地 + storage 同步，**零网络请求**（断网可点）。
- `loadOrders` 成功后 `resetFromBaseline`：本地持久化 draft 优先（未提交增量不丢）。
- 「清空已选」= `clearUncommitted`（draft 回滚 baseline，零请求）；连已提交一起删 = 清空后提交一次全 0。

## 持久化

- 键控 `familyId:mealId:date`（`buildCartKey`）；整 state 经 `Taro.setStorageSync('family-cart')`。
- 读取带**结构版本号 + try/catch + 字段校验**，异常整包丢弃——storage 结构演进不留炸弹。

## 会话切换挂钩点（Common Mistake 教训）

`resetCart()` 必须在**所有**建立/切换/退出家庭会话的入口调用，漏一处 = 旧家庭 draft 以「未提交增量」复活：

- `pages/login/index.tsx`（进入/创建/加入家庭）← check 阶段才补上的漏网点
- `pages/families/index.tsx`（进入家庭 / 加入家庭）
- `pages/me/index.tsx`（退出登录）

**新增家庭会话入口时，grep `resetMealSession` 对齐挂钩点**——cart 与 meal session 生命周期完全一致。

## Wrong vs Correct

```tsx
// Wrong：步进器直接调 API（即时写库）——购物车模式下总单会跳过「提交」被改
await api.upsertMyOrder({ mealId, date, dishId: dish.id, qty: next });

// Correct：只改 draft，提交按钮统一走 submitCart
setQty(cartKey, { dishId: dish.id, dishName: dish.name }, next);
```

## 提交按钮三态（menu 与 mine 页口径一致）

| 状态 | 文案 | 可点 |
| --- | --- | --- |
| dirty=0 | 暂无变更 | 否（置灰） |
| dirty>0 | 提交点菜（N） | 是 |
| busy | 提交中 | 否（守卫防重复，两页都有） |
