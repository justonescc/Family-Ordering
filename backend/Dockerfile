# ---------- 前端构建 ----------
FROM node:24-alpine AS frontend-build
WORKDIR /build
COPY frontend/package.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ---------- 后端构建 ----------
FROM node:24-alpine AS backend-build
WORKDIR /build
COPY backend/package.json ./
RUN npm install --no-audit --no-fund
COPY backend/ ./
RUN npm run build

# ---------- 运行 ----------
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=backend-build /build/node_modules ./node_modules
COPY --from=backend-build /build/dist ./dist
COPY --from=frontend-build /build/dist ./public
COPY backend/prisma ./prisma
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
