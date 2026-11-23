import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { validateRequest } from '../middleware/validate';
import { authLimiter } from '../middleware/rateLimit';
import { loginSchema, registerSchema, wechatLoginSchema } from '../schemas/auth';
import { createSuccessResponse } from '../utils/response';
import * as authService from '../services/authService';

export const authRouter = Router();

authRouter.post(
  '/register',
  authLimiter,
  validateRequest(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body.username, req.body.password);
    res.status(201).json(createSuccessResponse(result));
  }),
);

authRouter.post(
  '/login',
  authLimiter,
  validateRequest(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body.username, req.body.password);
    res.json(createSuccessResponse(result));
  }),
);

authRouter.post(
  '/wechat',
  authLimiter,
  validateRequest(wechatLoginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.wechatLogin(req.body.code);
    res.json(createSuccessResponse(result));
  }),
);
