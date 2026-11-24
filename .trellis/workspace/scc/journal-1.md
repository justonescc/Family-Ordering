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

