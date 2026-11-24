# 小程序化改造 · 执行计划

> 前置决策：Taro（React）+ 国内云/备案 + MVP（微信登录 + 点菜/我的单/总单）。
> 管理页与云存储为二期，不在本计划。

## 阶段 0 · 准备（零成本即可开发）

- [x] 注册小程序（个人主体，免费）拿正式 AppID（2026-11-24：「灶伴厨房」`wxe56a0ec94ec81441`）
- [ ] 内网穿透工具账号（cpolar / 花生壳免费版，联调时用）
- 服务器/域名/备案：**全部推迟到上线阶段（阶段 5 云托管）**，不阻塞开发

验证：测试号后台可登录。

## 阶段 1 · 后端上云与微信登录

- [x] 配置外部化：`WECHAT_APPID / WECHAT_SECRET` 加入 `.env.example`（2026-11-23）
- [x] 迁移：`users` 表加 `openid`（nullable + unique 索引）
- [x] 新增 `POST /auth/wechat`：code → `code2session` → 查/建用户 → 签发 JWT（入家庭复用现有 `/families` 接口）
- [x] 集成测试 5 例（mock jscode2session）：未配置 1007 / 拒绝 1008 / 幂等 / 缺参
- [ ] Dockerfile（后端）与 Compose：已并入阶段 5 云托管（云托管直接跑容器，无需自建 Compose）

验证：

```bash
npm run ci:local                     # 全绿（含 wechat.test.ts 5 例）
# 无凭据时调 /auth/wechat 返回 1007；假凭据返回 1008（微信侧拒绝）
```

回滚点：迁移可 down（删列）；新增路由删除即回退。

## 阶段 2 · Taro 骨架

- [x] `miniprogram/` 初始化 Taro 4.3.3（React + TS，独立 lockfile）
- [x] `utils/request.ts`：Taro.request 封装（baseURL、token 注入、401 重登）
- [x] `stores/auth.ts`：token / user / family / member 持久化（Taro.setStorageSync，key `family-auth`）
- [x] 登录页：`Taro.login()` → `/auth/wechat` → 无家庭则引导「家庭名 + 口令 + 昵称」/ 进入已有家庭
- [x] app.config：TabBar 四项（菜单/我的单/总单/我的），图标脚本生成（`npm run icons`）
- [x] `npm run build:weapp` 编译通过，主包约 476KB
- [x] 开发者工具可登录（2026-11-24 模拟器走通微信登录；真机预览并入阶段 4）

验证：`cd miniprogram && npm run build:weapp` 编译通过；typecheck 通过。

## 阶段 3 · 点菜主流程

- [x] `pages/menu`：餐次胶囊 + 搜索 + 分类分组列表 + 数量步进（±）（2026-11-23）
- [x] `pages/mine`：我的单列表 + 数量调整 + 删除（2026-11-23）
- [x] `pages/summary`：总单分组 + 划掉/恢复 + 进度 + `Taro.setClipboardData` 复制清单（2026-11-23）
- [x] 总单轮询：`onShow` 启动 10s / `onHide` 清除（2026-11-23）
- [x] 样式：token 翻译为 SCSS（暖橙/米白/圆角/阴影），暗色二期（2026-11-23）

验证：三 Tab 与 H5 功能逐项对齐；主包体积 ≤ 2MB（`Taro build --type weapp` 后核对）。

## 阶段 4 · 开发期联调（内网穿透）

- [x] 微信凭据已配齐（2026-11-24：正式小程序「灶伴厨房」AppID/Secret 经管理员扫码生成）
- [x] 工程侧就绪（2026-11-23 夜）：后端 `:3000` 运行中、本地 postgres `:5432`、`dist/` 已重建为干净 Taro 产物、登录页 `pages/login/index` 可渲染。
- [ ] cpolar 隧道暴露本地后端 `:3000`（https）
- [ ] 家人加为体验成员，扫码「预览」进开发版（手机开调试，免域名校验）
- [x] 走通：登录 → 点菜 → 总单划掉/复制（2026-11-24 模拟器验证；期间修复 `/auth/wechat` 参数错配——route 传 string、service 期望 `{code}`，`undefined` 被序列化为 `"undefined"` 发给微信，该缺陷自阶段 1 起潜伏，mock 测试未覆盖上游参数）

验证：家人真机走完一轮核心流程。

## 阶段 5 · 上线（微信云托管）

- [ ] Prisma `provider` 切 `mysql`，云托管环境建 TDSQL-C，跑迁移
- [ ] 容器化部署到微信云托管，配置环境变量（含 WECHAT_APPID/SECRET）
- [ ] 小程序改用 `wx.cloud.callContainer`（或云托管 HTTP 访问域名）
- [ ] 上传体验版 → 家人验证 → 提交审核 → 正式版

验证：正式版可搜索到并正常使用；回滚 = 回退镜像版本。

## 完成定义（DoD）

- [ ] prd.md 验收标准全部勾选
- [ ] `npm run ci:local` 全绿；H5 回归无影响
- [ ] 体验版通过家人验收

## 里程碑

| 阶段 | 交付 | 预估 |
|------|------|------|
| 1 | 后端可上云 + 微信登录接口 | 1–2 天 |
| 2 | Taro 可登录 | 1–2 天 |
| 3 | 三 Tab 主流程 | 3–4 天 |
| 4 | 体验版/发布 | 0.5–1 天（备案并行） |
