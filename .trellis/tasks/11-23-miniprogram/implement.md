# 小程序化改造 · 执行计划

> 前置决策：Taro（React）+ 国内云/备案 + MVP（微信登录 + 点菜/我的单/总单）。
> 管理页与云存储为二期，不在本计划。

## 阶段 0 · 准备（零成本即可开发）

- [ ] 注册小程序（个人主体，免费）拿正式 AppID；开发期用「测试号」即可
- [ ] 内网穿透工具账号（cpolar / 花生壳免费版，联调时用）
- 服务器/域名/备案：**全部推迟到上线阶段（阶段 5 云托管）**，不阻塞开发

验证：测试号后台可登录。

## 阶段 1 · 后端上云与微信登录

- [ ] 配置外部化核查：`DATABASE_URL / FAMILY_JWT_SECRET / PORT / WECHAT_APPID / WECHAT_SECRET`（新增后三项，`.env.example` 同步）
- [ ] 迁移：`users` 表加 `openid`（nullable + unique 索引）
- [ ] 新增 `POST /auth/wechat`：code → `code2session` → 查/建用户 →（可选）凭口令入家庭 → 签发 JWT
- [ ] Dockerfile（后端）与 Compose（app + postgres + caddy）可一键起在云机
- [ ] Caddy 反代 `:3000` + 自动 HTTPS

验证：

```bash
npm run ci:local                     # 全绿
curl https://api.<domain>/api/v1/healthz
# 用测试号 code 调 /auth/wechat，返回 token
```

回滚点：迁移可 down（删列）；新增路由删除即回退。

## 阶段 2 · Taro 骨架

- [ ] `miniprogram/` 初始化 Taro（React + TS），锁稳定版本
- [ ] `utils/request.ts`：Taro.request 封装（baseURL、token 注入、401 重登）
- [ ] `stores/auth.ts`：token / user / family / member 持久化（Taro.setStorage）
- [ ] 登录页：`Taro.login()` → `/auth/wechat` → 无家庭则引导填「家庭名 + 口令 + 昵称」
- [ ] app.config：TabBar 四项（菜单/我的单/总单/我的），图标精简

验证：开发者工具真机预览可登录并进入空菜单页。

## 阶段 3 · 点菜主流程

- [ ] `pages/menu`：餐次胶囊 + 搜索 + 分类分组列表 + 数量步进（±）
- [ ] `pages/mine`：我的单列表 + 数量调整 + 删除
- [ ] `pages/summary`：总单分组 + 划掉/恢复 + 进度 + `Taro.setClipboardData` 复制清单
- [ ] 总单轮询：`onShow` 启动 10s / `onHide` 清除
- [ ] 样式：token 翻译为 SCSS（暖橙/米白/圆角/阴影），暗色二期

验证：三 Tab 与 H5 功能逐项对齐；主包体积 ≤ 2MB（`Taro build --type weapp` 后核对）。

## 阶段 4 · 开发期联调（内网穿透）

- [ ] cpolar 隧道暴露本地后端 `:3000`（https）
- [ ] 家人加为体验成员，扫码「预览」进开发版（手机开调试，免域名校验）
- [ ] 走通：登录 → 点菜 → 总单划掉/复制

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
