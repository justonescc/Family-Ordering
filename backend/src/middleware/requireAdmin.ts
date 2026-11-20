import type { NextFunction, Request, Response } from 'express';
import { errors } from '../utils/errors';

/** 仅管理员可访问（菜单/分类/餐次/成员管理） */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth || !req.auth.familyId) {
    next(errors.unauthorized());
    return;
  }
  if (req.auth.role !== 'ADMIN') {
    next(errors.forbidden());
    return;
  }
  next();
}
