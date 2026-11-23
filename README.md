# 家庭点菜程序

多家庭共用的点菜 H5：家人在各自手机上浏览菜单、点菜，按家庭自定义的餐次实时汇总总单给做饭的人。

> ## ⚠️ 仓库归属（重要）
>
> **本项目是个人/家庭项目，只允许提交到作者个人的 GitHub 仓库，禁止推送到公司代码仓库。**
>
> | | 地址 |
> | --- | --- |
> | ✅ 唯一允许的远端 | `https://github.com/justonescc/Family-Ordering.git`（个人 GitHub） |
> | ❌ 禁止 | 公司云效 Codeup / 任何公司 Git 仓库 |
>
> 配套约束：
> - 不走公司工作项流程（无云效需求/任务/缺陷关联）
> - 提交信息使用普通 `feat:` / `fix:` / `docs:` / `chore:` 前缀，不关联公司工作项编号
> - 不涉及公司 CI（Jenkins / 云效 Flow）、公司部署环境与公司凭证
> - 仓库内不得出现公司内部信息、凭证或敏感资料

## 技术栈

- 后端：Express 5 + TypeScript + Prisma + PostgreSQL
- 前端：React 19 + antd-mobile（Vite）
- 测试：Vitest
- 部署：Docker Compose（本机/单机）

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 准备环境变量
cp backend/.env.example backend/.env

# 3. 启动 PostgreSQL
docker compose up -d postgres

# 4. 初始化数据库
npm run prisma:migrate
npm run db:seed

# 5. 启动开发服务（另开终端）
npm run dev:backend
npm run dev:frontend
```

前端默认 http://localhost:5173 ，后端 http://localhost:3000 。

## 全栈一键

```bash
docker compose up --build
```

服务起来后访问 http://localhost:3000（后端托管前端构建产物）。

## 本地 CI 门禁

```bash
npm run ci:local
```

## 规划文档

- 产品需求：`.trellis/tasks/11-20-family-ordering-mvp/prd.md`
- 技术设计：`.trellis/tasks/11-20-family-ordering-mvp/design.md`
- 执行计划：`.trellis/tasks/11-20-family-ordering-mvp/implement.md`
