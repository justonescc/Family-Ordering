import { randomBytes } from 'node:crypto';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import type { AuthPayloadDTO } from '../types/api';
import { AppError, errors } from '../utils/errors';
import { toUserDTO } from '../utils/dto';
import { hashPassword, verifyPassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { listMyFamilies } from './familyService';

export async function register(username: string, password: string): Promise<AuthPayloadDTO> {
  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) {
    throw errors.userExists();
  }

  const user = await prisma.user.create({
    data: { username, passwordHash: await hashPassword(password) },
  });

  const token = signToken({ userId: user.id, familyId: null, memberId: null, role: null });
  return {
    token,
    user: toUserDTO(user),
    family: null,
    member: null,
    families: [],
  };
}

export async function login(username: string, password: string): Promise<AuthPayloadDTO> {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    throw errors.invalidCredentials();
  }
  const matched = await verifyPassword(password, user.passwordHash);
  if (!matched) {
    throw errors.invalidCredentials();
  }

  const families = await listMyFamilies(user.id);
  const token = signToken({ userId: user.id, familyId: null, memberId: null, role: null });
  return {
    token,
    user: toUserDTO(user),
    family: null,
    member: null,
    families,
  };
}

/** code 换 openid（微信 jscode2session） */
async function codeToOpenid(code: string): Promise<string> {
  if (!env.wechatAppid || !env.wechatSecret) {
    throw errors.wechatNotConfigured();
  }
  const url =
    'https://api.weixin.qq.com/sns/jscode2session' +
    `?appid=${env.wechatAppid}&secret=${env.wechatSecret}` +
    `&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`;
  try {
    const resp = await fetch(url);
    const data = (await resp.json()) as { openid?: string; errmsg?: string };
    if (!data.openid) {
      throw errors.wechatLoginFailed(data.errmsg);
    }
    return data.openid;
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw errors.wechatLoginFailed();
  }
}

/** 微信小程序登录：openid 查/建用户，签发既有结构 JWT；入家庭复用现有 /families 接口 */
export async function wechatLogin(input: { code: string }): Promise<AuthPayloadDTO> {
  const openid = await codeToOpenid(input.code);
  // 微信用户无密码：随机不可登录口令，仅满足 users 表非空约束
  const passwordHash = await hashPassword(randomBytes(32).toString('hex'));
  const user = await prisma.user.upsert({
    where: { openid },
    update: {},
    create: { username: `wx_${openid}`, passwordHash, openid },
  });

  const families = await listMyFamilies(user.id);
  const token = signToken({ userId: user.id, familyId: null, memberId: null, role: null });
  return {
    token,
    user: toUserDTO(user),
    family: null,
    member: null,
    families,
  };
}
