import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info(`家庭点菜 API 已启动: http://localhost:${env.port}`);
});

function shutdown(signal: string): void {
  logger.info(`收到 ${signal}，正在关闭服务`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
