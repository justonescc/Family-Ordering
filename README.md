# 家庭点菜程序

多家庭共用的点菜 H5：家人在各自手机上浏览菜单、点菜，按家庭自定义的餐次实时汇总总单给做饭的人。

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
