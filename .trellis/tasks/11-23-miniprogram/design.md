# 小程序化改造 · 技术设计

## 总体架构

```
┌────────────┐   HTTPS(备案域名)   ┌─────────────────┐
│ Taro 小程序 │ ─────────────────▶ │ Express + Prisma │──▶ PostgreSQL(云)
└────────────┘                     │  (Docker 容器)    │
      │ wx.login(code)              └─────────────────┘
      ▼                                    ▲
 微信 code2session API ────────────────────┘（后端调用换 openid）
```

- 后端**原样复用**：API 契约、多租户隔离（`familyId`）、JWT 不变。
- 前端**新建 Taro 工程**（React 语法），与现有 H5 并存，共用后端。

## 目录与工程

```
backend/                 # 不动（仅部署配置外部化）
frontend/                # 保留 H5
miniprogram/             # 新增 Taro 工程（React）
  src/
    pages/{login,menu,mine,summary}/
    services/api.ts      # 对齐现有 services/api.ts 契约
    stores/              # auth（token/openid/family）+ orderSummary
    utils/request.ts     # Taro.request 封装（401→重登）
    app.config.ts        # TabBar: 菜单/我的单/总单/我的
```

包体：主包仅登录+三 Tab，图标用 SVG/PNG 精简；必要时菜单页分包。

## 认证设计（微信登录）

1. 小程序端 `Taro.login()` 取 `code`。
2. 新增后端接口：`POST /api/v1/auth/wechat` `{ code, familyName?, passphrase?, nickname? }`
   - 后端调微信 `code2session` 换 `openid`（配置 `WECHAT_APPID/SECRET`）。
   - 按 `openid` 查/建用户（复用 users 表加 `openid` 唯一索引，迁移）。
   - 有 `passphrase` → 直接创建/加入家庭；无 → 返回未入家庭态（沿用现有「选家庭」流）。
   - 签发现有结构 JWT（`{userId, familyId?, memberId?, role?}`），前端逻辑不变。
3. 现有账号密码登录保留：支持「微信绑定账号」后续合并（二期）。

## API 契约

- 不变：`{code:0,message:'ok',data}`；错误码分段沿用。
- 新增：`POST /auth/wechat`；用户表迁移加 `openid`。
- 小程序请求层：统一 baseURL（环境变量 `TARO_APP_API`）、401 → 清 token 重登。

## 点菜主流程映射（H5 → Taro）

| H5 | Taro | 说明 |
|----|------|------|
| antd-mobile TabBar | 自定义 TabBar（app.config tabBar） | 菜单/我的单/总单/我的 |
| MenuTab 搜索/列表 | View/Input/Image 自绘 | 保留搜索、48px 缩略图、占位 |
| 数量步进 | 自绘圆钮（复用交互） | qty-pop 动效可用 CSS animation |
| SummaryTab 划掉/复制 | Taro.setClipboardData | 复制用小程序剪贴板 |
| Toast | Taro.showToast | 文案沿用 |
| 轮询（10s 总单） | setInterval + onShow/ onHide 控制 | 页面生命周期替代 hooks/usePolling |

样式：全局 token（暖橙/米白/圆角/阴影）翻译为 SCSS 变量 + rpx；深色模式二期。

## 部署设计（C 开发 → A 上线）

**开发期（零成本）**
- 本地跑前后端 + 内网穿透（cpolar/花生壳免费隧道，域名已备案）
- 小程序用**测试号**：开发者工具勾「不校验合法域名」；家人扫码「预览」进开发版（需加体验成员、手机开调试）
- 局限：电脑须开机、1Mbps 带宽、域名随机——仅验证功能，不给全家日常用

**上线期（微信云托管）**
- **微信云托管（CloudBase Run）**：容器直接部署，`wx.cloud.callContainer` 调用，免买服务器、免域名备案
- 数据库：云托管环境配 MySQL（TDSQL-C），上线前 `prisma/schema.prisma` provider 由 `postgresql` 切 `mysql` 并重新迁移（schema 语法基本兼容）
- 配置外部化：`DATABASE_URL / FAMILY_JWT_SECRET / WECHAT_APPID / WECHAT_SECRET / PORT`
- 发布：`预览 → 体验版 → 审核 → 正式版`；回滚 = 回退镜像版本
- 备选：若后续想要独立域名/H5 共存，再上「服务器 + 备案域名 + Caddy」（原方案），非必需

## 兼容与风险

| 风险 | 对策 |
|------|------|
| `code2session` 需 appid/secret | 用测试号先行开发，正式号后替换 |
| 备案周期（1–2 周） | 与开发并行启动 |
| dataURL 图片增大响应体 | MVP 接受；二期迁云存储 |
| Taro 与 React 19 语法差异 | 锁 Taro 稳定版（v3/v4 LTS），组件层不依赖 DOM |
| H5 与小程序并存互不影响 | 仅共享后端与类型契约，前端各自独立 |

## 回滚

- 后端改动仅新增接口与一次可回滚迁移（users.openid，nullable + unique）。
- 小程序独立目录，删除即回退；H5 不受影响。
