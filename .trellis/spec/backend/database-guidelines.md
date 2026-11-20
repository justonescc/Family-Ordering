# 数据库约定（Prisma + PostgreSQL）

## 模型约定

- 主键 `cuid()`；时间字段 `createdAt` / `updatedAt` 显式声明。
- **多租户**：业务表必须有 `familyId`；查询一律带 `familyId` 过滤。
- 唯一约束用复合形式表达业务规则：
  - `Family.passphraseKey`（SHA-256）唯一 —— bcrypt 加盐无法直接查找，故用索引键查询、bcrypt 校验。
  - `FamilyMember @@unique([familyId, userId])`、`@@unique([familyId, nickname])`
  - `Dish @@unique([familyId, categoryId, name])`
  - `MealOrder @@unique([familyId, mealDate, mealId])`
  - `OrderItem @@unique([mealOrderId, memberId, dishName])`
- 外键策略：家庭内级联 `Cascade`；历史数据 `Restrict`（`MealOrder.mealId`）；快照引用 `SetNull`（`OrderItem.dishId`）。

## 迁移

- `npm run prisma:migrate`（开发）/ `prisma migrate deploy`（生产容器启动）。
- 迁移文件**提交后不复改**；修错走新迁移。
- 已有数据的非空列变更需 `--create-only` 后手工补默认值或回填。

## 查询约定

- `mealDate` 为 `@db.Date`，写入用 `dateStrToDate('YYYY-MM-DD')`（UTC 零点），禁止 `new Date('YYYY-MM-DD')` 之外的时区假设。
- 餐次单「惰性创建」：`prisma.mealOrder.upsert({ where: { familyId_mealDate_mealId: {...} } })`。
- 聚合（总单）在 service 内用 `Map` 按 `dishName` 归组，避免 N+1。

## 幂等

- 点菜 upsert 以 `(mealOrderId, memberId, dishName)` 为幂等键；`qty=0` 表示删除。
- 加入家庭用 `familyId_userId` upsert，重复加入不报错。

## 时区红线

所有「今天」「当前餐次」判定走 `utils/shanghai.ts`（Asia/Shanghai）。禁止 `toISOString().split('T')`、`new Date('YYYY-MM-DD')` 作为日期依据。
