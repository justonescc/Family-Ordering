import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import type { AuthContext, FamilyAuthContext } from '../types/express';
import { asyncHandler } from '../utils/asyncHandler';
import { errors } from '../utils/errors';
import { verifyToken } from '../utils/jwt';

/**
 * 认证中间件：校验 JWT。
 * - token 含家庭上下文（familyId/memberId）时，校验成员档案并挂载完整上下文
 * - 否则（注册/登录后未选家庭）只挂载用户上下文
 */
export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw errors.unauthorized();
  }

  let payload;
  try {
    payload = verifyToken(header.slice('Bearer '.length));
  } catch {
    throw errors.unauthorized();
  }

  if (payload.familyId && payload.memberId) {
    const member = await prisma.familyMember.findFirst({
      where: {
        id: payload.memberId,
        familyId: payload.familyId,
        userId: payload.userId,
      },
      include: { user: { select: { username: true } } },
    });
    if (!member) {
      throw errors.unauthorized();
    }
    req.auth = {
      userId: member.userId,
      username: member.user.username,
      familyId: member.familyId,
      memberId: member.id,
      role: member.role,
    };
    next();
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    throw errors.unauthorized();
  }
  req.auth = {
    userId: user.id,
    username: user.username,
    familyId: null,
    memberId: null,
    role: null,
  };
  next();
});

/** 取已认证用户（不要求家庭上下文） */
export function requireUser(req: Request): AuthContext {
  if (!req.auth) {
    throw errors.unauthorized();
  }
  return req.auth;
}

/** 取家庭上下文；未选家庭时抛未登录 */
export function requireFamily(req: Request): FamilyAuthContext {
  const auth = req.auth;
  if (!auth || !auth.familyId || !auth.memberId || !auth.role) {
    throw errors.unauthorized();
  }
  return {
    userId: auth.userId,
    username: auth.username,
    familyId: auth.familyId,
    memberId: auth.memberId,
    role: auth.role,
  };
}

/** 家庭上下文校验中间件（挂在路由上） */
export function familyContextMiddleware(req: Request, _res: Response, next: NextFunction): void {
  try {
    requireFamily(req);
    next();
  } catch (error) {
    next(error);
  }
}
