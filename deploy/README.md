# 部署指南

家庭点菜程序采用「单应用容器 + PostgreSQL」结构：后端容器同时托管前端构建产物，一个域名即可对外服务。

```
浏览器（含微信内置浏览器）
      │ HTTPS
   Caddy / Nginx（反代 + 自动证书）
      │
  后端容器（Express，托管前端 dist）
      │
   PostgreSQL 容器（Docker 卷持久化）
```

---

## 一、本机运行（开发/试用）

```bash
# 1. 安装依赖（Node 24）
npm install

# 2. 启动 PostgreSQL（Docker）
docker compose up -d postgres

# 3. 配置环境变量
cp backend/.env.example backend/.env   # 修改 DATABASE_URL / FAMILY_JWT_SECRET

# 4. 建表 + 种子数据
npm run prisma:migrate
npm run db:seed

# 5. 启动后端（另开终端启动前端热更新）
npm run dev:backend        # http://localhost:3000
npm run dev:frontend       # http://localhost:5173 （开发用，代理 /api）
```

演示账号：`dad` / `mom` / `kid`，密码 `demo1234`；示例家庭口令 `family123`。

---

## 二、全栈一键（本机或服务器）

```bash
# 在项目根目录，配置好 .env 后
docker compose up -d --build
```

访问 http://localhost:3000 。镜像构建会把前端构建产物打进后端容器。

生产环境**必须**设置 `FAMILY_JWT_SECRET`（随机长字符串）：

```bash
# 生成一个随机密钥
openssl rand -hex 32
```

`.env`（项目根目录，仅服务器本地，不入库）：

```bash
FAMILY_JWT_SECRET=<随机长字符串>
CORS_ORIGIN=https://food.example.com
```

> `docker-compose.yml` 通过 `${FAMILY_JWT_SECRET:-dev-secret-change-me}` 读取；未设置时会用弱默认值，**仅限本机试用**。

---

## 三、上线到云服务器（HTTPS + 域名）

微信内置浏览器与长期稳定访问建议使用域名 + HTTPS。

### 1. 服务器准备

- 一台有公网 IP 的轻量云服务器（2C2G 起）
- 安装 Docker 与 Docker Compose
- 一个已备案域名（如 `food.example.com`），解析到服务器 IP

### 2. 反向代理（Caddy，自动申请证书）

`deploy/caddy/Caddyfile`：

```
food.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

```bash
cp deploy/caddy/Caddyfile /etc/caddy/Caddyfile
systemctl reload caddy
```

Caddy 会自动申请并续期 Let's Encrypt 证书。若服务器在路由器/NAT 后，也可用 Cloudflare Tunnel 之类内网穿透替代。

### 3. 启动服务

```bash
# 上传项目（git clone 或 scp）
cd Family-Ordering
# 写入 .env（见上）
docker compose up -d --build
docker compose logs -f backend
```

首次启动容器内会自动执行 `prisma migrate deploy` 建表；执行一次种子：

```bash
docker compose exec backend npx prisma db seed
```

### 4. 验证

```bash
curl https://food.example.com/api/v1/healthz
# {"code":0,"message":"ok","data":{"status":"up","service":"family-ordering"}}
```

---

## 四、备份与恢复

数据全部在 PostgreSQL 里，定期 `pg_dump` 即可。

```bash
# 备份（默认输出到 ./backups）
bash deploy/scripts/backup.sh

# 加入 crontab，每天凌晨 3 点备份
# 0 3 * * * cd /path/to/Family-Ordering && /usr/bin/bash deploy/scripts/backup.sh /data/backups
```

恢复：

```bash
gunzip -c backups/family_ordering-20261120-030000.sql.gz | \
  docker compose exec -T postgres psql -U family -d family_ordering
```

---

## 五、升级与回滚

```bash
# 升级：拉取代码后重建
git pull
docker compose up -d --build

# 回滚：切到上一个提交再重建
git checkout <上一个 commit>
docker compose up -d --build
```

数据库变更通过 Prisma 迁移施加，**只向前**；回滚代码不会回滚数据结构，必要时先恢复备份。

---

## 六、安全注意事项

- `.env`、`backups/`、`data/` 已在 `.gitignore` 中，不入库、不外传
- 生产务必设置强 `FAMILY_JWT_SECRET`，并谨慎保管家庭口令（口令即家庭准入）
- `CORS_ORIGIN` 生产填实际前端域名
- 建议给服务器配置防火墙，仅放行 80/443
