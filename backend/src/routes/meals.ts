import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate, requireFamily } from '../middleware/auth';
import { requireAdmin } from '../middleware/requireAdmin';
import { parsedParams, validateRequest } from '../middleware/validate';
import { createMealSchema, updateMealSchema } from '../schemas/meal';
import { idParamSchema } from '../schemas/menu';
import { createSuccessResponse } from '../utils/response';
import * as mealService from '../services/mealService';

export const mealsRouter = Router();

mealsRouter.use(authenticate);

mealsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const auth = requireFamily(req);
    const meals = await mealService.listMeals(auth.familyId);
    res.json(createSuccessResponse(meals));
  }),
);

mealsRouter.post(
  '/',
  requireAdmin,
  validateRequest(createMealSchema),
  asyncHandler(async (req, res) => {
    const auth = requireFamily(req);
    const meal = await mealService.createMeal(auth.familyId, req.body);
    res.status(201).json(createSuccessResponse(meal));
  }),
);

mealsRouter.put(
  '/:id',
  requireAdmin,
  validateRequest(idParamSchema, 'params'),
  validateRequest(updateMealSchema),
  asyncHandler(async (req, res) => {
    const auth = requireFamily(req);
    const { id } = parsedParams<{ id: string }>(req);
    const meal = await mealService.updateMeal(auth.familyId, id, req.body);
    res.json(createSuccessResponse(meal));
  }),
);

mealsRouter.delete(
  '/:id',
  requireAdmin,
  validateRequest(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const auth = requireFamily(req);
    const { id } = parsedParams<{ id: string }>(req);
    await mealService.deleteMeal(auth.familyId, id);
    res.json(createSuccessResponse(null));
  }),
);
