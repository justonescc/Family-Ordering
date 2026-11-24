# 小程序菜品/分类管理 · 执行计划

## 阶段 1 · 数据层

- [x] `services/api.ts` 补齐封装：分类 CRUD+排序、菜品 CRUD+排序（dataURL 直传 imageUrl 字段）
- [x] `types/index.ts` 复用既有 Category/Dish 类型（无需新增字段）

验证：typecheck 通过。

## 阶段 2 · 管理页面

- [x] `pages/admin/index`：分类卡 + 分类分组菜品卡 + 新增/编辑/删除/排序/停启用
- [x] 表单弹层（菜品：分类 Picker/名称/描述/图片；分类：名称）
- [x] 「我的」页 ADMIN 入口 + admin 页守卫（requireAdminSession，非 ADMIN 弹回菜单页）

验证：typecheck + 构建通过。

## 阶段 3 · 图片与打磨

- [x] 图片：chooseImage(压缩) → base64 → 超限二次 compressImage → dataURL（适配后端 300K 限制）
- [x] 删除确认、排序交互、loading/禁用态

验证：构建通过；验收标准 3–9 待真机走查。

## 阶段 4 · 部署

- [x] `npm run deploy`（固定域名构建+CLI 上传）→ 上传成功，体验版自动接管

## DoD

- [ ] prd.md 验收标准 1–9（真机/模拟器走查，清单见下）
- [x] `npm run ci:local` 全绿（H5 无回归）
- [ ] 管理员手机体验版实测增删改查全流程

## 真机验收清单（对应 PRD 验收标准 1–9）

1. ADMIN「我的」见「菜品管理」入口；MEMBER 不可见
2. 非 ADMIN 直访 pages/admin/index 被弹回菜单页
3. 新增分类 → 菜单页出现空分组
4. 新增菜品（含/不含图片）→ 菜单页可见
5. 编辑菜品 → 菜单页即时反映
6. 删除菜品 → 菜单页消失、总单历史不受影响
7. 删除非空分类 → 被后端拒绝并提示
8. 上移/下移 → 菜单页顺序同步
9. 写操作后列表即时刷新
