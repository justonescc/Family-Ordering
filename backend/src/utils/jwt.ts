import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export type Role = 'ADMIN' | 'MEMBER';

export interface TokenPayload {
  userId: string;
  familyId: string | null;
  memberId: string | null;
  role: Role | null;
}

export function signToken(payload: TokenPayload): string {
  const options: jwt.SignOptions = {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.jwtSecret, options);
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.jwtSecret) as TokenPayload;
}
