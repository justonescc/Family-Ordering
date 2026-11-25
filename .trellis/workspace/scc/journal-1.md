# Journal - scc (Part 1)

> AI development session journal
> Started: 2026-11-20

---

## 2026-11-24 · 11-24-miniprogram-menu-ux（小程序点菜页体验优化）

- **做了什么**：参考主流点餐小程序，把「点菜」Tab 做成左分类 + 右菜品双栏联动、分组标题吸顶、菜品卡片、底部吸底购物车栏 + 已选弹层；左栏底部新增「＋ 自定义菜」入口。范围 F1–F6，不做菜品大图详情弹层。
- **起点坑**：工作区已有未提交的双栏 tsx 改动，但 `index.scss` 只有 `.dish-thumb`，页面实际处于「无布局」状态——本次补齐全部样式（tokens.scss，0 硬编码色值）。
- **check 修复 4 处**：渲染期 `Taro.getSystemInfoSync()` 改 `useState` 惰性初始化；清空逐项置 0 失败时 `void loadOrders()` 兜底；已选弹层 `+` 收敛到 99 并短路；关闭/清空/自定义关闭按钮点击目标 72→88rpx。
- **门禁**：`npm run typecheck` + `npm run build:weapp` 全绿（`local-ci.sh` 不含 miniprogram）。
- **提交**：`f402500` feat 实现 + `d73c10f` docs 新增 `.trellis/spec/miniprogram/`（质量基线 + 双栏布局契约）。均在 `develop-1.0`，未 push。
- **遗留（真机验证，非阻塞）**：①tabbar + safe area 双重预留是否多余空隙；②`scrollIntoView` 真机时序；③滚动联动阈值 `px(120)`；④自定义输入弹层软键盘遮挡；⑤已选弹层软键盘顶起。



## Session 1: 小程序点菜页体验优化（双栏联动/吸顶/吸底购物车栏）
<!-- trellis-session: v=2 fp=170f86776af663c2 -->

**Date**: 2026-11-25
**Task**: 小程序点菜页体验优化（双栏联动/吸顶/吸底购物车栏）
**Branch**: `develop-1.0`

### Summary

参考主流点餐小程序完成点菜 Tab 精修：左分类+右菜品双栏联动（恒定行高 rpx 估算）、分组标题 usingSticky 吸顶、补齐 index.scss 全部样式（tokens.scss 无硬编码色值）、底部吸底购物车栏+已选弹层（清空/增减）、左栏底部自定义菜入口。check 修复 4 处（渲染期 getSystemInfoSync 惰性化、清空失败兜底重拉、数量收敛 0-99、点击目标 88rpx）。新增 .trellis/spec/miniprogram/ 质量基线与布局契约。typecheck+build:weapp 全绿，已推送个人 GitHub；遗留 5 项真机验证。

### Git Commits

| Hash | Message |
|------|---------|
| `f402500` | feat: 小程序点菜页体验优化（双栏联动/吸顶/吸底购物车栏） |
| `d73c10f` | docs: 新增小程序 spec（质量基线与双栏布局契约） |
| `b2a3e63` | docs: 记录 11-24 小程序点菜页优化 wrap-up |

### Status

[OK] **Completed**


## Session 2: 小程序点菜购物车式提交 + 总单成员状态
<!-- trellis-session: v=2 fp=3f33952b20a410d9 -->

**Date**: 2026-11-25
**Task**: 小程序点菜购物车式提交 + 总单成员状态
**Branch**: `develop-1.0`

### Summary

点菜从即时写库改为购物车式先选后提交：新增 stores/cart（draft+baseline 统一模型、按餐次键控持久化、会话切换清空），点菜页/我的单共享购物车（步进器零请求、提交按钮三态防重复），清空已选改仅撤销未提交；后端新增 POST /orders/submit（事务批量、整体回滚）与 GET /orders/summary-members（已点/未点，只读不建单），现有端点契约冻结（43 既有用例零改动全绿+11 新用例）；总单页新增成员状态行。check 抓到并修复 login 页漏挂 resetCart。spec 沉淀订单 API 契约与购物车状态规范。遗留真机走查：断网点菜/杀 app draft 保留/共享同步/成员状态行/软键盘。

### Git Commits

| Hash | Message |
|------|---------|
| `f037146` | feat: 后端批量提交与成员点单状态端点 |
| `7916ef4` | feat: 小程序点菜改购物车式先选后提交 |
| `c45ec79` | docs: 沉淀订单 API 契约与购物车状态规范 |

### Status

[OK] **Completed**
