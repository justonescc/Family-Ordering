import { rateLimit } from 'express-rate-limit';
import { createErrorResponse } from '../utils/response';
import { ErrorCode } from '../utils/errors';

/** 全局轻量限流：防扫描与滥用 */
export const globalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: createErrorResponse(ErrorCode.RATE_LIMITED, '请求过于频繁，请稍后再试'),
});

/** 账号/家庭入口限流：口令与登录爆破面 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: createErrorResponse(ErrorCode.RATE_LIMITED, '尝试次数过多，请 15 分钟后再试'),
});
