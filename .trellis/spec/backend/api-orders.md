# 订单 API 契约（购物车式提交）

> 来源任务：11-25-miniprogram-cart-submit。命中 mandatory trigger（新增 API 签名），按 code-spec 深度记录。

## 1. Scope / Trigger

点菜改为「先选后提交」购物车式：新增 2 个端点；**现有订单端点契约冻结**（`PUT /orders/my`、`GET /orders/my`、`GET /orders/summary`、`PATCH /orders/items/:id/struck`），任何改动都会打挂独立发包的小程序老版本。

### Design Decision: 扩展走新端点，不改既有响应结构

**Context**：总单需要成员已点/未点状态；批量提交需要一次性写多菜。
**Options**：① 改 `GET /orders/summary` 响应结构包一层；② 新增 `GET /orders/summary-members`。
**Decision**：②。小程序独立发版，后端先上线即 break 老包与 H5；新端点对老包不可见即无影响，发布顺序无要求。
**Rule**：给已被两端消费的接口加能力时，默认新端点；改结构必须两端同版本发布且论证无窗口期。

## 2. Signatures

```
POST /api/v1/orders/submit          # 批量提交购物车（事务，整体回滚）
GET  /api/v1/orders/summary-members # 成员已点/未点状态（只读，不建单）
```

均挂 `authenticate` + `requireFamily`；service 层所有查询带 `familyId`。

## 3. Contracts

```jsonc
// POST /orders/submit 请求（submitOrderSchema）
{ "mealId": "cm…", "date": "YYYY-MM-DD",
  "items": [ { "dishId": "cm…", "qty": 2 }          // 菜库菜
           | { "dishName": "番茄炒蛋", "qty": 1 }    // 自定义菜（trim 非空）
           ], }                                     // 1 ≤ items.length ≤ 100，qty 0..99

// 响应 data = OrderItemDTO[]（该成员本餐次全量，与 GET /orders/my 同构）
// qty=0 → 删除该项；同数组同名 dishName 归并以最后一次为准

// GET /orders/summary-members?mealId&date 响应
data = [{ memberId, nickname, avatar, ordered }]    // ordered = 此餐次单有该成员 items
```

## 4. Validation & Error Matrix

| 条件 | 错误 |
| --- | --- |
| items 空 / >100、qty 越界、dishName trim 空 | 4xxx qtyInvalid |
| mealId 不属于本家庭 | 3xxx mealNotFound |
| dishId 不存在/不属于本家庭 | 2xxx dishNotFound |
| 未选家庭上下文 | requireFamily 既有行为 |

## 5. Good/Base/Bad Cases

- Good：3 项混合（菜库菜 + 自定义菜 + qty:0 删除）一次提交，返回全量含最终态。
- Base：items 只有 1 项 qty:1；无餐次单时 summary-members 全部 `ordered:false`。
- Bad：第 2 项 dishId 非法 → 整体回滚，第 1 项不落库（测试 `order-submit.test.ts` 断言）。

## 6. Tests Required

`backend/tests/api/order-submit.test.ts`：批量落库返回全量 / qty=0 删除 / 同名归并 / 部分非法回滚（断言第 1 项未落库）/ items>100 拒绝 / 跨家庭 mealId 拒绝 ×2 / 已点未点名单 / 无单全 false 且 `prisma.mealOrder.count===0`（不惰性建单）/ qty 全删后视为未点。
**契约冻结的实证标准**：既有测试文件零改动全绿。

## 7. Wrong vs Correct

```ts
// Wrong：复用 getOrCreateMealOrder 惰性建单查「状态」——无单也会建出空壳，语义污染
const order = await getOrCreateMealOrder(familyId, mealId, date);

// Correct：只读查询用 findFirst，查不到即「无单」（全 false）
const order = await prisma.mealOrder.findFirst({ where: { familyId, mealDate, mealId } });
```

> Note：`submitMyOrders` 的建单壳在事务外，回滚会留下空 MealOrder 壳——所有读路径把空壳当无单处理，与 `PUT /my` qty=0 既有行为一致，可接受；勿在此壳上挂状态字段。
