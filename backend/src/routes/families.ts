import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate, requireUser } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { authLimiter } from '../middleware/rateLimit';
import {
  createFamilySchema,
  familyIdParamSchema,
  joinFamilySchema,
  updateProfileSchema,
} from '../schemas/family';
import { createSuccessResponse } from '../utils/response';
import { errors } from '../utils/errors';
import * as familyService from '../services/familyService';

export const familiesRouter = Router();

// 家庭入口只要求「已登录」，不要求已选家庭（创建/加入时还没有家庭上下文）
familiesRouter.use(authenticate);

familiesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const families = await familyService.listMyFamilies(user.userId);
    res.json(createSuccessResponse(families));
  }),
);

familiesRouter.post(
  '/',
  authLimiter,
  validateRequest(createFamilySchema),
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const result = await familyService.createFamily(user, req.body);
    res.status(201).json(createSuccessResponse(result));
  }),
);

familiesRouter.post(
  '/join',
  authLimiter,
  validateRequest(joinFamilySchema),
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const result = await familyService.joinFamily(user, req.body);
    res.status(201).json(createSuccessResponse(result));
  }),
);

familiesRouter.patch(
  '/me',
  validateRequest(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    if (!user.familyId) {
      throw errors.unauthorized();
    }
    const member = await familyService.updateMyProfile(user.userId, user.familyId, req.body);
    res.json(createSuccessResponse(member));
  }),
);

familiesRouter.post(
  '/:id/enter',
  validateRequest(familyIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const { id } = req.params as unknown as { id: string };
    const result = await familyService.enterFamily(user.userId, id);
    res.json(createSuccessResponse(result));
  }),
);
