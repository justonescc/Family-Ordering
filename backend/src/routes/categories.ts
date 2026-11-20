import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate, requireFamily } from '../middleware/auth';
import { requireAdmin } from '../middleware/requireAdmin';
import { parsedParams, validateRequest } from '../middleware/validate';
import { createCategorySchema, idParamSchema, updateCategorySchema } from '../schemas/menu';
import { createSuccessResponse } from '../utils/response';
import * as menuService from '../services/menuService';

export const categoriesRouter = Router();

categoriesRouter.use(authenticate, requireAdmin);

categoriesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const auth = requireFamily(req);
    const categories = await menuService.listCategories(auth.familyId);
    res.json(createSuccessResponse(categories));
  }),
);

categoriesRouter.post(
  '/',
  validateRequest(createCategorySchema),
  asyncHandler(async (req, res) => {
    const auth = requireFamily(req);
    const category = await menuService.createCategory(auth.familyId, req.body);
    res.status(201).json(createSuccessResponse(category));
  }),
);

categoriesRouter.put(
  '/:id',
  validateRequest(idParamSchema, 'params'),
  validateRequest(updateCategorySchema),
  asyncHandler(async (req, res) => {
    const auth = requireFamily(req);
    const { id } = parsedParams<{ id: string }>(req);
    const category = await menuService.updateCategory(auth.familyId, id, req.body);
    res.json(createSuccessResponse(category));
  }),
);

categoriesRouter.delete(
  '/:id',
  validateRequest(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const auth = requireFamily(req);
    const { id } = parsedParams<{ id: string }>(req);
    await menuService.deleteCategory(auth.familyId, id);
    res.json(createSuccessResponse(null));
  }),
);
