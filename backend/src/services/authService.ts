import { prisma } from '../config/prisma';
import type { AuthPayloadDTO } from '../types/api';
import { errors } from '../utils/errors';
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
