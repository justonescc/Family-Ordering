import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate, requireFamily } from '../middleware/auth';
import { parsedParams, parsedQuery, validateRequest } from '../middleware/validate';
import { myOrdersQuerySchema, struckSchema, upsertOrderSchema } from '../schemas/order';
import { idParamSchema } from '../schemas/menu';
import { createSuccessResponse } from '../utils/response';
import * as orderService from '../services/orderService';

export const ordersRouter = Router();

ordersRouter.use(authenticate);

ordersRouter.get(
  '/my',
  validateRequest(myOrdersQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const auth = requireFamily(req);
    const { mealId, date } = parsedQuery<{ mealId: string; date: string }>(req);
    const items = await orderService.getMyOrders(auth.familyId, auth.memberId, mealId, date);
    res.json(createSuccessResponse(items));
  }),
);

ordersRouter.put(
  '/my',
  validateRequest(upsertOrderSchema),
  asyncHandler(async (req, res) => {
    const auth = requireFamily(req);
    const items = await orderService.upsertMyOrder(auth.familyId, auth.memberId, req.body);
    res.json(createSuccessResponse(items));
  }),
);

ordersRouter.get(
  '/summary',
  validateRequest(myOrdersQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const auth = requireFamily(req);
    const { mealId, date } = parsedQuery<{ mealId: string; date: string }>(req);
    const groups = await orderService.getSummary(auth.familyId, mealId, date);
    res.json(createSuccessResponse(groups));
  }),
);

ordersRouter.patch(
  '/items/:id/struck',
  validateRequest(idParamSchema, 'params'),
  validateRequest(struckSchema),
  asyncHandler(async (req, res) => {
    const auth = requireFamily(req);
    const { id } = parsedParams<{ id: string }>(req);
    const item = await orderService.setStruck(auth.familyId, id, req.body.struck);
    res.json(createSuccessResponse(item));
  }),
);
