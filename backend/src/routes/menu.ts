import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate, requireFamily } from '../middleware/auth';
import { createSuccessResponse } from '../utils/response';
import * as menuService from '../services/menuService';

export const menuRouter = Router();

menuRouter.use(authenticate);

menuRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const auth = requireFamily(req);
    const menu = await menuService.getMenu(auth.familyId);
    res.json(createSuccessResponse(menu));
  }),
);
