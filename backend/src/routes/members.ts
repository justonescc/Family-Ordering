import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate, requireFamily } from '../middleware/auth';
import { requireAdmin } from '../middleware/requireAdmin';
import { parsedParams, validateRequest } from '../middleware/validate';
import { idParamSchema } from '../schemas/menu';
import { roleSchema } from '../schemas/member';
import { createSuccessResponse } from '../utils/response';
import * as memberService from '../services/memberService';

export const membersRouter = Router();

membersRouter.use(authenticate, requireAdmin);

membersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const auth = requireFamily(req);
    const members = await memberService.listMembers(auth.familyId);
    res.json(createSuccessResponse(members));
  }),
);

membersRouter.patch(
  '/:id/role',
  validateRequest(idParamSchema, 'params'),
  validateRequest(roleSchema),
  asyncHandler(async (req, res) => {
    const auth = requireFamily(req);
    const { id } = parsedParams<{ id: string }>(req);
    const member = await memberService.updateMemberRole(auth.familyId, id, req.body.role);
    res.json(createSuccessResponse(member));
  }),
);
