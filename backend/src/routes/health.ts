import { Router } from 'express';
import { createSuccessResponse } from '../utils/response';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json(createSuccessResponse({ status: 'up', service: 'family-ordering' }));
});
