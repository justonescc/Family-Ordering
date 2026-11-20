import type { Role } from '@prisma/client';

/** 已认证用户（可能尚未选择家庭，如刚注册/登录） */
export interface AuthContext {
  userId: string;
  username: string;
  familyId: string | null;
  memberId: string | null;
  role: Role | null;
}

/** 已进入某个家庭的上下文 */
export interface FamilyAuthContext {
  userId: string;
  username: string;
  familyId: string;
  memberId: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export {};
