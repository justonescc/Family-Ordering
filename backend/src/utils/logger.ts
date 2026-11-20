import { env } from '../config/env';

type Level = 'debug' | 'info' | 'warn' | 'error';

function emit(level: Level, message: string, meta?: unknown): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta === undefined ? {} : { meta }),
  };
  if (env.isProd) {
    // 生产输出结构化 JSON，便于日志收集
    console[level === 'debug' ? 'log' : level](JSON.stringify(entry));
  } else {
    const fn = level === 'debug' ? 'log' : level;
    console[fn](`[${entry.ts}] ${level.toUpperCase()} ${message}`, meta ?? '');
  }
}

export const logger = {
  debug: (message: string, meta?: unknown) => {
    if (!env.isProd) emit('debug', message, meta);
  },
  info: (message: string, meta?: unknown) => emit('info', message, meta),
  warn: (message: string, meta?: unknown) => emit('warn', message, meta),
  error: (message: string, meta?: unknown) => emit('error', message, meta),
};
