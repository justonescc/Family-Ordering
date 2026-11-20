# 车辆定位服务平台（location-tracking-platform）项目分析

> 生成日期：2026-11-19
> 分析对象：`/Users/shichangchun/orderpages/location-test/location-tracking-platform/`（独立 git 仓库，分支 main）
> 分析方式：只读静态分析（配置、目录、源码结构、脚本、文档），未运行测试与构建。

---

## 一、项目概况

**一句话简介**：面向企业车队、物流运营人员与个人车主的车辆定位服务平台，提供实时定位查询、历史轨迹回看、设备绑定、计费与余额充值、开票、管理后台等能力。

**核心业务特征**：

- **双数据源**：金润征信第三方 API（外部接入） + JT/T 808 GPS 设备直连（自建网关）两条数据链路；查询路由可用 `auto` 优先设备数据、无绑定自动降级到第三方数据。
- **双用户端 + 管理端**：PC 端（`frontend/`）、微信内 H5（`h5/`）、管理后台（`pages/admin/`，独立管理员 JWT）。
- **计费与资金**：按设备/等级费率计费、充值入账、退款、账单、发票，资金链路有明确一致性红线。
- **双支付通道**：微信支付（Native / JSAPI / H5）与银商（chinaums），配置式切换。
- **双生产环境**：腾讯云（GitHub Actions + TCR）与阿里云（云效 Flow + ACR），另有阿里云 SIT 环境。

**规模参考**（静态统计）：

| 端 | 源码文件数 | 说明 |
| --- | --- | --- |
| `backend/src` | 159 | Express + TypeScript |
| `frontend/src` | 223 | React 19 + AntD 6 |
| `h5/src` | 78 | React 19 + antd-mobile |
| `gateway/src` | Java 少量类 | Netty + JT808 网关 |
| `.trellis/tasks/archive` | 38 个已归档任务 | 2026-09 ～ 2026-10 |

---

## 二、AI 相关工具 / 技能 / 插件全景

这是本项目最鲜明的工程特色：**同一套 AI 工作流同时适配 4 个 AI CLI 平台**（Claude Code、Codex、ZCode、通用 `.agents/`），并叠加了公司插件、E2E 自动化插件与第三方技能包。

### 2.1 总览表

| 类别 | 名称 | 位置 | 作用 |
| --- | --- | --- | --- |
| 工作流框架 | **Trellis v0.6.17** | `.trellis/` | 任务生命周期（规划 → 执行 → 收尾）、规范库、子代理上下文注入 |
| 技能包 | trellis 技能族（12 个） | `.agents/skills/`、`.claude/skills/`、`.zcode/skills/` | 规划、查规范、质量检查、断点调试、规范回写、多 worker 协作等 |
| 技能包 | **amap-jsapi-skill v1.0.0**（MIT） | `.claude/skills/amap-jsapi-skill/`、`.agents/skills/` | 高德地图 JSAPI v2.0 开发文档与代码示例 |
| 子代理 | trellis-implement / trellis-check / trellis-research | `.claude/agents/`、`.codex/agents/*.toml`、`.zcode/agents/` | 实现、审查、调研三类专职子代理 |
| 命令 | `/trellis:continue`、`/trellis:finish-work` | `.claude/commands/trellis/` | 恢复任务上下文、收尾归档 |
| 钩子 | 3 ～ 4 个 Python 脚本 | `.claude/hooks/`、`.codex/hooks/`、`.zcode/hooks/` | 会话启动注入、每轮工作流面包屑、子代理上下文注入、Shell 会话上下文 |
| Claude 插件 | typescript-lsp、frontend-design、claude-md-management、security-guidance | `.claude/settings.json` → `enabledPlugins` | 官方 marketplace 插件（类型检查/LSP、前端设计、CLAUDE.md 管理、安全提示） |
| E2E 插件 | **wl-e2e**（Playwright 测试体系） | `.claude/playwright-test.config.yaml`、`frontend/tests/e2e/` | 测试计划、联动分析、用例生成与自愈 |
| 设计上下文 | impeccable + PRODUCT.md | `.impeccable.md`、`PRODUCT.md` | 给 AI 设计工具提供品牌、用户、美学约束 |
| 设计产物 | superpowers 计划/规格 | `docs/superpowers/plans/`、`docs/superpowers/specs/` | 微信支付、双通道、H5 门户、开票等设计文档 |
| MCP | 项目级 `.mcp.json` | **未配置** | 项目自身未声明 MCP server（全局会话中可用 context7、yunxiao-mcp、playwright-test 等） |

---

### 2.2 Trellis 工作流系统（核心）

版本记录在 `.trellis/.version`：`0.6.17`。

#### 目录组成

```
.trellis/
├── workflow.md               # 工作流唯一事实源（Phase 1/2/3 + workflow-state 面包屑）
├── config.yaml               # journal 行数上限、channel worker 守卫、跳过关键词
├── agents/
│   ├── implement.md          # channel 运行时用实现代理
│   └── check.md
├── spec/                     # 编码规范库（按包/层组织）
│   ├── backend/  (7 个 md)    # architecture / api-conventions / data-and-prisma / integrations / invoice / testing
│   ├── frontend/ (7 个 md)    # 目录结构 / 组件 / hooks / 状态 / 质量 / 类型
│   ├── deploy/   (1 个 md)    # 双环境差异矩阵、compose 插值坑
│   └── guides/   (3 个 md)    # 跨层思考、代码复用、AI 评审防误报
├── tasks/
│   ├── archive/              # 38 个已归档任务（2026-09 ～ 2026-10）
│   └── active/（当前无活动任务）
├── workspace/                # 开发者会话日志：chenq / Elliot / fanlu
│   ├── index.md
│   └── journal-N.md（单文件上限 2000 行）
└── scripts/
    ├── task.py               # 任务创建/启动/归档/子任务/PR
    ├── get_context.py        # 会话上下文、包清单、阶段步骤详查
    ├── add_session.py        # 会话记录
    ├── init_developer.py     # 开发者身份初始化
    └── hooks/                # 项目级线性同步等
```

#### 工作流三阶段

| 阶段 | 内容 | 关键门禁 |
| --- | --- | --- |
| **Phase 1：Plan** | 需求探索（`trellis-brainstorm`）→ 产出 `prd.md`（复杂任务再加 `design.md`、`implement.md`）→ 配置 `implement.jsonl` / `check.jsonl` → `task.py start` | 任务创建需用户同意；未 `start` 不得实现；jsonl 空清单禁止 start |
| **Phase 2：Execute** | 派发 `trellis-implement` → `trellis-check`（自动修复）→ 最后一次全量检查 | 收尾前必须跑 `npm run ci:local` 全绿 |
| **Phase 3：Finish** | 反复调试走 `trellis-break-loop` → `trellis-update-spec` 规范回写 → 分批提交（分工作提交 / 归档提交 / 日志提交）→ `/trellis:finish-work` | 禁止 `--amend`、禁止自动 push |

#### 任务目录产物

每个任务包含：`task.json`、`prd.md`、可选 `design.md` / `implement.md` / `research/`，以及供子代理注入的 `implement.jsonl` / `check.jsonl`（格式为每行 `{"file": "...", "reason": "..."}`）。

从归档任务命名可以窥见项目演进脉络，例如：

- 安全与稳固：`p0-security-hardening`、`p0-security-round2`、`fix-trust-proxy-hops`
- 工程治理：`batch2-engineering`、`batch3-reliability`、`batch4-backend-perf`、`file-splitting`、`eslint-warning-cleanup`
- 配置治理：`env-config-consolidation`、`wire-dead-config-keys`、`wire-rate-limit-config`、`feature-switch-p0`
- 业务迭代：`price-visibility`、`level-rate-sheet`、`oss-db-storage-fallback`、`agreement-compliance`、`login-page-redesign`

#### 技能族清单（`.agents/skills/` 共 13 项：12 个 trellis 技能 + amap-jsapi-skill）

| 技能 | 用途 |
| --- | --- |
| `trellis-brainstorm` | 需求探索、交互式提问、写 `prd.md` |
| `trellis-before-dev` | 动手前加载对应包 spec |
| `trellis-check` | 规范符合性、lint、类型、测试、跨层一致性 |
| `trellis-update-spec` | 把新知识回写规范库 |
| `trellis-break-loop` | 同一问题反复修复时做根因分类 |
| `trellis-channel` | 多 worker 协作运行时（`idle_timeout 5m`、`max_live_workers 6`） |
| `trellis-session-insight` | 会话洞察 |
| `trellis-spec-bootstrap` | 规范库初始化 |
| `trellis-meta` | 框架元信息 |
| `trellis-continue` / `trellis-finish-work` / `trellis-start` | 任务续接、收尾、启动（仅 `.agents/` 侧） |
| `amap-jsapi-skill` | 高德 JSAPI v2.0 集成（见 2.6） |

#### 子代理上下文注入机制（架构亮点）

- `inject-subagent-context.py`：在 `PreToolUse Task/Agent`（Claude）、`SubagentStart`（Codex）等事件触发时，读取当前任务的 `implement.jsonl` / `check.jsonl`，把规范与研究文件**拼进子代理提示词**，并附带 `prd.md` / `design.md` / `implement.md`。
- 为避免递归派发，注入后会打 `<!-- trellis-hook-injected -->` 标记，子代理见到标记即直接干活，不再派发下一层。
- 子代理类型在 4 个平台各自注册：Claude 用 `.md` frontmatter，Codex 用 `.toml`，ZCode 用 `.md`，通用平台用 `.agents/skills/`。

#### 钩子（Hooks）清单

| 平台 | 事件 | 脚本 | 作用 |
| --- | --- | --- | --- |
| Claude Code | `SessionStart`（startup / clear / compact） | `session-start.py` | 注入 Trellis 结构化上下文，规范化 Windows 路径 |
| Claude Code / Codex / ZCode | `UserPromptSubmit` | `inject-workflow-state.py` | 每轮注入 `<workflow-state>` 面包屑（解析 `workflow.md` 标签块，无硬编码回退） |
| Claude Code / Codex / ZCode | `PreToolUse` / `SubagentStart` | `inject-subagent-context.py` | 按 jsonl 注入任务上下文 |
| ZCode 额外 | `PreToolUse`（Bash） | `inject-shell-session-context.py` | 注入 Shell 会话上下文 |

`UserPromptSubmit` 支持跳过关键词 **`no-trellis`**（在提示中出现时不再注入面包屑）。

#### `.claude/settings.json` 关键设置

- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: "25"`：提前自动压缩，避免长会话溢出
- `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR: "1"`：保持工作目录
- `CODEUP_ORG_ID` / `CODEUP_REPO_ID`：云效 Codeup 仓库标识（供命令使用）
- `enabledPlugins`：4 个官方插件（见 2.3）

---

### 2.3 Claude Code 启用的 Marketplace 插件

来自 `settings.json` 的 `enabledPlugins`，均为 `@claude-plugins-official`：

| 插件 | 作用 |
| --- | --- |
| `typescript-lsp` | TypeScript 语言服务（跳转定义、引用、符号搜索） |
| `frontend-design` | 前端 UI 设计与实现指导 |
| `claude-md-management` | 管理 CLAUDE.md / AGENTS.md 类指令文件 |
| `security-guidance` | 安全编码提示（凭证、注入、认证） |

此外，会话环境中还可见公司插件 **wl-devops**（规范索引 + 工作流技能）、**wl-e2e**（Playwright E2E）与 superpowers 技能集——它们属于用户级/插件市场提供，不完全在仓库内。

---

### 2.4 wl-e2e Playwright 插件配置

配置文件：`.claude/playwright-test.config.yaml`（注释注明由 `/wl-e2e:init` 于 2026-10-26 生成）。

关键配置摘要：

| 项 | 值 |
| --- | --- |
| 项目名 / 语言 / UI 库 | `location-tracking-platform` / `zh` / `antd` |
| 前端根 / 用例目录 | `frontend/` / `frontend/tests/e2e/` |
| 后端代码根 / 模块通配 | `../backend` / `src/services/*`，API 前缀 `/api/v1` |
| 被测环境 | 阿里云 SIT：`https://sitlocation.w-lian.com` |
| 登录方式 | 密码 tab，`aria-label` 定位，`${E2E_USERNAME}` / `${E2E_PASSWORD}`，storageState |
| DB 直查 | 关闭（SIT PostgreSQL 在容器内网，本地不可直连） |

配置中记录的项目专属陷阱（对理解业务也有价值）：

- AntD 6 表单控件 id 由 Form name 派生（如 `pwdLogin_account`）易变，优先用 `aria-label` / `placeholder`
- 用户端 token 存 `localStorage` 键 `auth-storage`（zustand persist，结构 `{state:{token,user},version:0}`）
- 已登录访问 `/login` 会被异步弹回 `/dashboard/location`
- **用户侧文案与 API 字段断言禁止出现「金润 / jinrun」**，对外只用「中交数据 / 设备数据」
- 管理端与用户端 token 体系独立

E2E 用例按业务域组织：`auth`、`admin`、`h5`、`notification`、`agreement`、`recharge-payment`、`location-query` 等，每个域含 `test.plan.md`（测试计划）、`linkage.map.md`（跨模块联动映射，由 `playwright-linkage-miner` 代理从 PRD + 后端 Service 代码中挖掘）与多个 `*.spec.ts`。

仓库内还留有 `frontend/tests/e2e/RUN-REPORT-2026-10-27.md` 全量运行报告（9 模块 40 文件 170 用例：41 通过 / 48 失败 / 38 跳过 / 43 未运行），说明 E2E 曾完整跑过一轮并有正式缺陷盘点。

---

### 2.5 superpowers 产物

`docs/superpowers/` 是 superpowers 技能生成的计划与设计文档目录：

```
docs/superpowers/
├── plans/
│   ├── 2026-08-26-wechat-pay.md
│   ├── 2026-08-27-dual-payment-channel.md
│   ├── 2026-08-31-payment-ui-polish.md
│   └── 2026-09-09-h5-user-portal.md
└── specs/
    ├── 2026-08-26-wechat-pay-design.md
    ├── 2026-09-09-h5-user-portal-design.md
    ├── 2026-09-09-invoicing-design.md
    ├── 2026-09-10-invoice-management-design.md
    └── payment/
```

可见支付双通道、H5 用户门户、开票/发票管理这几个大功能是先经 superpowers 规划，再进入 Trellis 任务实现。

---

### 2.6 amap-jsapi-skill（第三方技能包）

- 版本 1.0.0，MIT 许可，中英混合文档（以中文为主）。
- 覆盖：加载器引入、**强制安全密钥配置**（`window._AMapSecurityConfig`）、地图生命周期、3D 视图、覆盖物绘制、事件、图层、LBS 服务。
- 内部带 `references/` 文档树（含 `security.md` 等），是一个"自带参考资料的技能包"。
- 与项目地图栈直接对应：`@amap/amap-jsapi-loader` + `components/amap/`。

---

### 2.7 设计上下文：impeccable + PRODUCT.md

| 文件 | 内容 |
| --- | --- |
| `PRODUCT.md` | 产品注册名、用户画像（车队管理员 / 物流运营 / 企业车辆部门）、产品目的、品牌人格（Precise · Dependable · Clear）、反参考（消费级地图 App、炫技 SaaS、运营商拟物风）、5 条设计原则、无障碍目标 WCAG 2.1 AA |
| `.impeccable.md` | 设计工具上下文：用户、品牌、**工业实用主义美学**、亮/暗双主题、禁用 AI 常见的紫蓝渐变等 |

这类文件是给 AI 设计/编码助手提供"审美与品牌约束"约定的，用文件而非记忆保证跨会话一致。

---

### 2.8 MCP 现状

- 仓库中**未发现**项目级 `.mcp.json`，也没有 MCP 配置声明。
- 但运行环境（会话级/用户级）可用 context7（第三方库文档）、yunxiao-mcp（云效）、playwright-test（浏览器控制）等 MCP。
- `.agent/skills` 中的技能会自动在需要时使用这些 MCP。

---

## 三、目录结构

### 3.1 顶层结构

```
location-tracking-platform/
├── backend/                 # 后端 API（Express 5 + TypeScript + Prisma 7）
├── frontend/                # PC 端（用户 + 管理后台）+ E2E 用例
├── h5/                      # 微信内 H5 用户端
├── gateway/                 # JT/T 808 网关（Java 8 + Netty）
├── jt808-upstream/          # git submodule：JT/T 808 协议库
├── deploy/                  # 生产部署（compose、启停、备份恢复）
├── .github/workflows/       # ci.yml + deploy.yml
├── scripts/                 # local-ci.sh、check-speed-consistency.mjs
├── docs/                    # PRD、集成指南、superpowers 产物、路线图
├── .trellis/                # Trellis 工作流（spec/tasks/workspace/scripts）
├── .claude/                 # Claude Code 配置（agents/commands/hooks/skills/settings）
├── .codex/                  # Codex 配置（agents/hooks/config.toml）
├── .zcode/                  # ZCode 配置（agents/commands/hooks/skills/config.json）
├── .agents/                 # 通用技能库（跨平台镜像）
├── CLAUDE.md                # Claude Code 项目指令（含架构速览与红线）
├── AGENTS.md                # 通用 AI 指令（Codex 等平台读取）
├── PRODUCT.md               # 产品上下文
├── .impeccable.md           # 设计上下文
├── README.md                # 快速开始
├── .nvmrc                   # Node 24
└── docker-compose.yml       # 本地 PG/Redis
```

### 3.2 后端 `backend/src`

```
src/
├── config/            # logger（Winston）、redis、prisma 相关
├── middleware/        # 认证、限流、日志、错误处理
├── routes/            # 薄路由（含 admin/ 子目录）
│   ├── index.ts       # 路由总装配
│   ├── auth.ts / user.ts / account.ts / accountRefund.ts
│   ├── device.ts / location.ts / admin-device.ts
│   ├── payment.ts / paymentNotify.ts / wechat.ts / invoices.ts / adminInvoices.ts
│   ├── config.ts / captcha.ts / sms.ts / upload.ts / files.ts / amap-proxy.ts
│   └── admin/         # config.ts / levels-rates.ts / logs.ts / users.ts / shared.ts
├── schemas/           # Zod 验证（common.ts 含统一响应与错误码）
├── services/          # 业务逻辑（厚）
│   ├── device/        # streamConsumer、queryRouter、billingService 等
│   ├── jinrun/        # 金润征信接入
│   ├── payment/       # channel 接口 + channels/{wechat,chinaums} + registry + reconcile
│   ├── admin/ / dashboard/ / invoice/ / agreement/
│   ├── cache/ / captcha/ / email/ / sms/ / verification/
│   └── ...
├── types/             # 类型定义
├── utils/             # 工具函数 + 业务错误类 errors.ts
├── controllers/       # 历史遗留空目录，禁止使用
└── models/            # 历史遗留空目录，禁止使用
```

### 3.3 前端 `frontend/src`

```
src/
├── pages/                 # 用户端页面 + admin/ + account-management/ + history-query/
├── components/            # admin / amap / api-docs / auth / common / device / layout / payment / user
├── services/              # API 封装（统一走 utils/request.ts）
├── stores/                # Zustand store（persist）
├── hooks/                 # 自定义 hooks
├── theme/                 # 亮/暗主题 token
├── styles/                # 全局样式
├── types/                 # API 与 AMap 类型
├── utils/                 # request.ts、cssColor.ts 等
└── tests/e2e/             # 见 2.4（位于 frontend/tests/e2e）
```

测试文件就近放在各模块的 `__tests__/` 内（vitest）。

### 3.4 H5 `h5/src`

分层与 PC 端同构（pages / services / stores / hooks / components / utils / types），但独立实现：

- `base=/h5/`，`build.target=es2018`（兼容微信旧内核）
- `HashRouter`
- 会话 token 存 `h5_token`，与 PC 端可同时在线
- 组件中包含 `PlateInput`（车牌键盘）、agreement、payment 等移动端定制

### 3.5 网关 `gateway/src/main/java/com/location/gateway/`

典型类：`GatewayMain`、`DeviceEndpoint`、`GatewayConfig`、`GatewayHandlerInterceptor`、`GatewayHandlerMapping`、`GatewaySessionListener`、`HealthServer`、`RedisProducer`、`redis.DeviceStatusService`，另有 5 个测试类。

### 3.6 文档与部署

- `docs/prd/`：`00-overview`（模块/产品/角色）、`01-foundation`（业务规则、数据字典、权限、术语）、`02-modules`（按业务域 11 个模块）、`03-workflows`（设备数据管道、资金流、查询计费流）
- `docs/integrations/`：jinrun-credit（API 参考 + 集成指南 + 样例）、jt808-device、amap、payment（含银商参数申请）
- `deploy/`：`docker-compose.prod.yml`（腾讯云）、`docker-compose.prod.aliyun.yml`（阿里云）、`start.sh`、`scripts/`（备份恢复）、`README.md`
- `.github/workflows/ci.yml`：后端 lint + 集成测试（PostgreSQL 16 + Redis 7 service 容器，TZ `Asia/Shanghai`）
- `.github/workflows/deploy.yml`：`v*` tag 触发构建与部署

---

## 四、代码结构与架构特色

### 4.1 后端分层：routes → services，无 controller

- **routes 薄**：只做参数校验编排、中间件链、响应组装。
- **services 厚**：全部业务逻辑，按业务域分子目录；超长文件拆分后原路径保留为薄入口并显式 re-export。
- 明确禁止往 `src/controllers/`、`src/models/` 放代码（历史空目录）。

**标准路由链**：

```
认证中间件 → 限流 → validateRequest(zodSchema) → asyncHandler(业务)
```

统一响应 `createSuccessResponse` / `createErrorResponse`，错误码分段管理。

### 4.2 多认证体系

| 中间件 | 场景 |
| --- | --- |
| `authMiddleware` | 用户 JWT |
| `apiKeyAuthMiddleware` | 开放 API Key |
| `compositeAuthMiddleware` | 组合认证 |
| `adminAuthMiddleware` | 管理后台独立 JWT |

**红线**：管理路由必须 `authMiddleware + adminAuthMiddleware` 双挂，只挂 admin 侧会导致 `req.user` 恒为空、无差别 401。

### 4.3 双数据源与数据链路

**设备链路**：

```
JT/T 808 设备
   → gateway（Java Netty，8080/健康口）
   → Redis Stream  jt808:location
   → backend services/device/streamConsumer.ts
   → PostgreSQL（device_location_records 等）
```

**第三方链路**：backend → 金润征信 API → 转换（坐标 ÷600000、WGS84 → GCJ02）→ 落库 / 计费。

**查询路由** `services/device/queryRouter.ts`：`dataSourceMode` 取值 `auto` / `device` / `jinrun`；`auto` 优先设备数据、无绑定降级金润。

**对外文案红线**：用户侧与对外 API 字段值只用「中交数据 / 设备数据」，禁止出现「金润 / jinrun」（仅内部实现与管理后台允许）。

### 4.4 资金与计费红线（工程重点）

- 余额写操作必须 `$transaction` + `SELECT ... FOR UPDATE`。
- 入账统一走 `applyRechargeWithinTx` 原语，按 `applied` 决定台账推进；**禁止**自行复制幂等逻辑（历史上曾三处复制、改漏两处）。
- **锁序固定**：充值行 → users，反向会与 `settleRefund` 死锁。
- 余额变动后必须清看板缓存。
- 状态迁移禁止「先 `findUnique` 检查再 `update`」（TOCTOU），把前置状态折叠进 `updateMany` 的 WHERE 做原子迁移，`count === 0` 时重读并抛精确错误。
- 金额 `Decimal` 序列化为 `.toFixed(2)` 字符串，禁止 number 运算；BigInt 主键转 string。

### 4.5 时区与日期

- 日期解析、取「今天」统一走 `shanghaiDayStartSchema` / `getShanghaiDateStr()`。
- 禁止 `new Date('YYYY-MM-DD')`、`toISOString().split('T')`（UTC 偏差 8 小时，费率生效日曾踩坑）。
- raw SQL `date_trunc` 对 naive TIMESTAMP 必须做 `(col AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Shanghai'` 双跳。

### 4.6 配置治理（env 与 DB 分层）

- **env 只放启动期必需**：`DATABASE_URL`、`REDIS_URL`、`JWT_SECRET`、`PORT`、`TRUST_PROXY(_HOPS)`、`CORS_ORIGIN`、`LOG_LEVEL` 等。
- **业务与凭证配置全部在 DB `system_configs`**（管理后台「系统配置」可热生效）：金润凭证、高德 Key、限流、短信/邮件/OSS/微信/支付凭证、功能开关。
- 文档化例外：`ADMIN_USERNAME` / `ADMIN_PASSWORD` 为首次 seed 建管理员的一次性 bootstrap 凭证。
- `getConfig` 优先级：DB 非空串 > DEFAULTS，env 回退已删除；资金/开关类配置禁止 `getConfigSync`（缓存 miss 会静默回默认值）。

### 4.7 支付通道抽象

- 接口 `services/payment/channel.ts`（`PaymentChannel`）+ 实现 `channels/{wechat,chinaums}/` + 注册表 `registry.ts`。
- 三种支付形态 `clientType`：`native`（PC 扫码）、`jsapi`（微信内公众号）、`h5`（微信外浏览器）。
- 回调常驻且不看 `enabled`（通道切换不影响存量订单）：`POST /notify/wechat`、`POST /notify/chinaums`。
- 查单补偿：`services/payment/reconcile.ts` 由 scheduler 每分钟按 `order.channel` 分发查单/关单。
- 表：`pay_channels`（全局单选 + config JSON）、`pay_orders`（pending / paid / closed 状态机）。
- 管理侧 `GET secret` 打码、`POST enable` 校验凭证齐备 + 事务单选切换。

### 4.8 前端与 H5

- **铁律一**：API 调用一律走 `services/` 层（基于 `utils/request.ts`），组件内禁止直接 axios/fetch。
- **铁律二**：地图可视化只渲染后端数据，前端不发起定位查询；高德 Key 仅用于展示（`VITE_AMAP_KEY`）。
- 地图：`components/amap/` 中 `AmapContainer` 持有 map 实例，子组件经 props 接收。
- **渲染期纯度**：禁 `Date.now()` / `Math.random()` 等 impure 调用（react-compiler 在 CI 报 error），首次定值用 `useState(() => …)`。
- **色值**：内联样式一律用 `--color-*` 语义变量；canvas / WebGL 管线不解析 `var()`，矢量覆盖物与图表颜色统一经 `utils/cssColor.ts` 的 `resolveCssColor()`。
- 图表暗色需 `theme={{ type: 'dark' }}`；AntD 6 废弃 props 不得回退（如 `destroyOnClose` → `destroyOnHidden`）。

### 4.9 Java 网关

- Java 8 + Netty（`netty-bom` 统一 pin 到 4.1.137.Final，修复 SNI/HTTP2 相关 CVE）、Jedis 4.4.8、Log4j 2.26.1、Gson、JUnit 5。
- JT/T 808 协议依赖 `jt808-upstream` submodule（本地 Maven install `org.yzh:jtt808-protocol`）。
- 注意：`jtt808-protocol` 传递解析到 Netty 4.1.90（过旧），因此 pom 做了 BOM 卫生升级。

### 4.10 数据库核心表（按域）

| 域 | 表 |
| --- | --- |
| 用户 | `users`（软删除 `deleted_at`）、`user_levels`、`api_keys` |
| 金润数据 | `location_records`、`consumption_records`、`rates` |
| 设备 | `devices`、`device_bindings`、`device_location_records`、`device_consumption_records`、`device_rates` |
| 资金 | `recharge_records`（幂等键）、`bills` |
| 支付 | `pay_orders`、`pay_channels` |
| 日志 | `api_logs`、`operation_logs`、`alert_records`（P0/P1 异步落库，保留 90 天） |

外键策略：api_keys CASCADE、日志表 SET NULL、账单/充值 RESTRICT。

---

## 五、技术栈与版本

### 后端

| 项 | 版本 / 说明 |
| --- | --- |
| Express | `^5.2.1`（README 写 Express 4，已过时） |
| TypeScript | `^6.0.2`（devDep） |
| Prisma | `^7.5.0` + `@prisma/adapter-pg`（driver adapter 模式），`prisma.config.ts` 用 defineConfig |
| PostgreSQL | 本地 compose 默认；CI 用 16；README 写 15+ |
| Redis | ioredis；Stream 消费 + 在线状态 + 看板缓存 |
| 认证 | jsonwebtoken、bcrypt |
| 校验 | zod `^4.3.6` |
| 日志 | winston（生产写文件，不进 docker stdout） |
| 其他 | ali-oss、阿里云/腾讯云短信 SDK、nodemailer、exceljs、multer、node-cron、uuid、helmet、http-proxy-middleware |
| 测试 | Jest 30 + ts-jest + supertest（`--runInBand`，stack-size 8192） |
| Lint | ESLint 9（`--max-warnings 0`） |

### 前端（PC）

| 项 | 版本 |
| --- | --- |
| React / ReactDOM | 19.2.4 |
| Ant Design | `^6.3.4`（+ pro-components + @ant-design/charts `^2.6.7`） |
| React Router | `^7.18.4` |
| Zustand | `^5.0.12` |
| 高德 | `@amap/amap-jsapi-loader` |
| Vite | `^8.2.2` |
| 测试 | Vitest `^4.1.11`（+ coverage-v8、ui）、happy-dom、jsdom |
| E2E | `@playwright/test` `^1.64.1` |
| 其他 | xlsx、qrcode.react |

### H5

| 项 | 版本 |
| --- | --- |
| React | 19.3.0 |
| antd-mobile | 5.42.3 |
| Zustand | 5.0.15 |
| 车牌键盘 | `vehicle-plate-keyboard` `^0.8.4` |
| 适配 | postcss-px-to-viewport |

### 网关

Java 8 + Netty 4.1.137.Final + Jedis 4.4.8 + JT/T 808 协议库 + Maven。

### 运行时

- `.nvmrc` = `24`，Dockerfile `node:24-alpine`，CLAUDE.md 写 Node 24。
- README 写「Node.js 20 LTS」（**过时**）。

---

## 六、工程化：测试、CI 与部署

### 6.1 测试体系

| 层 | 框架 | 位置 / 特点 |
| --- | --- | --- |
| 后端集成测试 | Jest + supertest | `backend/tests/integration/`；`.env.test` 自动隔离测试库 |
| 后端 mock | 自研 mock server | 金润 `tests/mocks/jinrun-server.ts`；设备 `jt808-device-mock.ts` 直写 Redis Stream |
| 前端单测 | Vitest | `__tests__/` 就近；覆盖率门禁只在 `test:coverage` 生效 |
| H5 单测 | Vitest | 同上 |
| 网关 | JUnit 5 | 5 个测试类 |
| E2E | Playwright | `frontend/tests/e2e/`，按 9 大域组织，置于 SIT 环境 |

### 6.2 本地 CI（`npm run ci:local`）

`scripts/local-ci.sh` 共 12 ～ 13 步，约 10 分钟：

1. 后端 Prisma generate / check / migrate / seed
2. 起金润 Mock（端口 3001）
3. 后端 Jest 覆盖率测试
4. 前端 check → vitest → build
5. H5 check → vitest → build
6. `check-speed-consistency.mjs`：**速度分档跨端一致性**检查
7. 网关 `mvn test`（条件执行，缺 JDK 时跳过）

作为 Trellis 收尾门禁：任务提交前必须全绿（仅纯文档改动可豁免）。

### 6.3 服务器 CI

- `.github/workflows/ci.yml`：PR / push main，`setup-node` 读取 `.nvmrc` 并启用缓存；后端 job 用 `postgres:16` + `redis:7` service 容器，`TZ=Asia/Shanghai`。
- `.github/workflows/deploy.yml`：`v*` tag 触发镜像构建与部署（2026-10-15 起与阿里云 Flow 语义一致）。

### 6.4 双生产部署

| 云 | 流水线 | 编排文件 | 要点 |
| --- | --- | --- | --- |
| 腾讯云 | GitHub Actions + TCR | `docker-compose.prod.yml` | tag 触发；后端容器启动时 `prisma migrate deploy` |
| 阿里云生产 | 云效 Flow + ACR | `docker-compose.prod.aliyun.yml` | 双 tag `v1.4.0-42,latest`；宿主机共享 Redis（不启 redis 容器）；宝塔 nginx 反代回环 8090/3000；postgres 走 DaoCloud 前缀镜像 |
| 阿里云 SIT | 同机 | `server.aliyun.sit.conf`（已 gitignore） | 人工审核 → 生产 |

**新增 env 变量三要素**（踩过坑）：两份 example 文件 + 两份 compose 的 `environment` 透传行 + 服务器 compose 副本。缺透传行则变量**静默不进容器**（`TRUST_PROXY` 曾因此导致全站 429）。

运维要点：Winston 日志写容器内 `logs/combined.log`（需 `docker exec ... cat`）；容器 stdout 有 json-file 轮转 50m×3；backend/gateway 应用日志挂宿主机 `data/{backend,gateway}-logs/`。

---

## 七、整体特色总结

1. **AI 原生工程流程**：项目不只是"用了 AI 编码"，而是搭了一套可复现的 AI 工作流基础设施（Trellis 的 spec / task / hook / 子代理 / 上下文清单），把"规范注入、任务留痕、质量门禁"做成文件而非依赖记忆。
2. **多平台同构**：同一工作流在 Claude Code / Codex / ZCode / 通用 `.agents/` 四套目录中镜像，hooks 脚本逻辑一致、子代理定义按平台格式适配。
3. **规范层层落地**：`.trellis/spec/` 按包/层组织，每个 `index.md` 带"开发前清单 + 质量检查"；且真的有 14 份正文规范文件（后端 6、前端 6、指南 2）外加 4 份索引（含部署索引）。CLAUDE.md / AGENTS.md 只保留速览。
4. **任务全生命周期留痕**：38 个归档任务，每个含 PRD、设计、执行计划、研究材料与规范清单，可直接作为项目决策史。
5. **双数据源 + 双支付通道 + 双生产云**：三个"双轨"设计贯穿整个项目，且都做了抽象（queryRouter、PaymentChannel 接口、双 compose）。
6. **资金安全红线成体系**：行级锁 + 固定锁序 + 幂等原语 + 原子状态迁移 + 缓存失效，且每条都在文档中写明"曾踩过的坑"。
7. **时区与序列化纪律**：UTC 偏差、BigInt、Decimal 三个高频坑都有统一工具与禁令。
8. **配置治理彻底**：env 只留启动必需，业务配置入 DB 热生效，并对"死配置"做过专项清查（`wire-dead-config-keys`）。
9. **测试策略完整**：后端集成 + 三端单测 + 网关单测 + SIT E2E + 自研设备/金润 mock + 跨端速度一致性脚本。
10. **踩坑知识沉淀**：spec 与 CLAUDE.md 中大量"曾实翻车"记录（TRUST_PROXY、邀请礼开关、费率生效日、三处幂等复制），说明这套 AI 工作流确实在持续把经验回写成规范。
11. **前端视觉约束文件化**：PRODUCT.md + .impeccable.md + 设计 token + `resolveCssColor()`，把"外观一致性"变成可检查的约束。
12. **部署堵坑文档化**：compose 子命令必须带 `--env-file`、gateway 8080 健康口仅容器内可达、seccomp unconfined 等，都写进了部署指南。

---

## 八、注意事项与发现的不一致点

### 8.1 文档与实际版本不一致

| 位置 | 文档写 | 实际 |
| --- | --- | --- |
| `README.md` 技术栈 | Express 4 | `backend/package.json` 为 `^5.2.1` |
| `README.md` 前置要求 | Node.js 20 LTS | `.nvmrc` = `24`、Dockerfile `node:24-alpine`、`CLAUDE.md` 写 24 |
| `README.md`「开发状态」 | 仍标"进行中：数据库 Schema 设计、用户认证系统" | 项目已有 38 个归档任务，功能远超此阶段 |
| `.trellis/spec/backend/index.md` 技术栈 | Node.js 20 LTS | 同上，实际 24 |

> 建议：README 作为对外入口应更新版本口径与开发状态，避免误导新接入者。

### 8.2 历史遗留空目录

`backend/src/controllers/`、`backend/src/models/` 为空目录，规范明确禁止使用（分层是 routes → services）。

### 8.3 敏感文件（不要提交、不要外传）

| 文件 | 性质 |
| --- | --- |
| `.env.e2e.local` | E2E 登录账号与密码（`E2E_USERNAME` / `E2E_PASSWORD`）；被 `.gitignore` 的 `.env.*` 规则覆盖 |
| `server.prod.conf`、`server.aliyun.prod.conf`、`server.aliyun.sit.conf` | SSH 连接、部署路径、容器名等服务器敏感配置；`server*.conf` 已 gitignore |
| `.env*` | 各环境变量文件（仅 `.env.example` 入库） |
| `frontend/tests/e2e/.auth/` | Playwright storageState（登录态快照） |

本文档只描述用途，未包含任何凭证值。

### 8.4 对外文案红线

用户侧界面、对外 API 字段与测试断言都禁止出现「金润 / jinrun」，统一使用「中交数据 / 设备数据」。内部实现、管理后台与内部文档不受此限。

### 8.5 MCP 与插件可用性

- 仓库没有 `.mcp.json`，因此 clone 后不会自动获得 context7、云效等 MCP；依赖全局/用户级配置。
- `enabledPlugins` 引用的是 marketplace 插件，新环境需先安装对应 marketplace 才能生效。
- `.codex/config.toml` 明确要求用户级开启 `[features].hooks = true` 才会执行 Codex hooks。

### 8.6 子代理/技能的平台差异

- `.agents/skills/` 有 `trellis-continue` / `trellis-finish-work` / `trellis-start`；`.claude/skills/` 无这三个（改为 `/trellis:continue`、`/trellis:finish-work` 命令）。
- `trellis-implement` / `trellis-research` 是**子代理类型**而非技能；`trellis-check` 两者皆有（代码改动后校验优先用 Agent 形式）。

---

## 九、关键文件索引

| 想看什么 | 去哪看 |
| --- | --- |
| 项目给 AI 的总指令 | `CLAUDE.md`、`AGENTS.md` |
| 工作流规则 | `.trellis/workflow.md` |
| 后端编码规范 | `.trellis/spec/backend/index.md` |
| 前端编码规范 | `.trellis/spec/frontend/index.md` |
| 部署规范 | `.trellis/spec/deploy/index.md` |
| 历史任务与决策 | `.trellis/tasks/archive/` |
| 开发者日志 | `.trellis/workspace/{chenq,Elliot,fanlu}/` |
| 产品需求 | `docs/prd/index.md` |
| 第三方集成文档 | `docs/integrations/README.md` |
| 功能设计文档 | `docs/superpowers/plans/`、`docs/superpowers/specs/` |
| E2E 配置 | `.claude/playwright-test.config.yaml` |
| 本地 CI | `scripts/local-ci.sh` |
| 部署说明 | `deploy/README.md` |
| 设计约束 | `PRODUCT.md`、`.impeccable.md` |
| 优化路线图 | `docs/optimization-roadmap.md` |

---

*本文档由静态分析生成，所有版本号与路径均取自仓库文件；未运行任何测试或构建。*
