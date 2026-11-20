import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate, requireFamily } from '../middleware/auth';
import { requireAdmin } from '../middleware/requireAdmin';
import { parsedParams, validateRequest } from '../middleware/validate';
import { createDishSchema, idParamSchema, updateDishSchema } from '../schemas/menu';
import { createSuccessResponse } from '../utils/response';
import * as menuService from '../services/menuService';

export const dishesRouter = Router();

dishesRouter.use(authenticate, requireAdmin);

dishesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const auth = requireFamily(req);
    const menu = await menuService.getAdminMenu(auth.familyId);
    res.json(createSuccessResponse(menu));
  }),
);

dishesRouter.post(
  '/',
  validateRequest(createDishSchema),
  asyncHandler(async (req, res) => {
    const auth = requireFamily(req);
    const dish = await menuService.createDish(auth.familyId, req.body);
    res.status(201).json(createSuccessResponse(dish));
  }),
);

dishesRouter.put(
  '/:id',
  validateRequest(idParamSchema, 'params'),
  validateRequest(updateDishSchema),
  asyncHandler(async (req, res) => {
    const auth = requireFamily(req);
    const { id } = parsedParams<{ id: string }>(req);
    const dish = await menuService.updateDish(auth.familyId, id, req.body);
    res.json(createSuccessResponse(dish));
  }),
);

dishesRouter.delete(
  '/:id',
  validateRequest(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const auth = requireFamily(req);
    const { id } = parsedParams<{ id: string }>(req);
    await menuService.deleteDish(auth.familyId, id);
    res.json(createSuccessResponse(null));
  }),
);
