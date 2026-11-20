import { prisma } from '../config/prisma';
import type { AuthPayloadDTO, MyFamilyDTO } from '../types/api';
import { errors } from '../utils/errors';
import { toFamilyDTO, toMemberDTO, toMyFamilyDTO } from '../utils/dto';
import { hashPassword, verifyPassword } from '../utils/password';
import { passphraseKey } from '../utils/passphrase';
import { signToken } from '../utils/jwt';

interface Actor {
  userId: string;
  username: string;
}

export async function listMyFamilies(userId: string): Promise<MyFamilyDTO[]> {
  const memberships = await prisma.familyMember.findMany({
    where: { userId },
    include: { family: true },
    orderBy: { createdAt: 'asc' },
  });
  return memberships.map((m) => toMyFamilyDTO(m.family, m));
}

export async function createFamily(
  actor: Actor,
  input: { name: string; passphrase: string; nickname?: string; avatar?: string },
): Promise<AuthPayloadDTO> {
  const key = passphraseKey(input.passphrase);
  const existing = await prisma.family.findUnique({ where: { passphraseKey: key } });
  if (existing) {
    throw errors.familyPassphraseTaken();
  }

  const nickname = input.nickname?.trim() || actor.username;
  const avatar = input.avatar || '😊';

  const family = await prisma.family.create({
    data: {
      name: input.name.trim(),
      passphraseKey: key,
      passphraseHash: await hashPassword(input.passphrase),
      members: {
        create: { userId: actor.userId, nickname, avatar, role: 'ADMIN' },
      },
    },
    include: { members: true },
  });

  const member = family.members[0];
  if (!member) {
    throw errors.internal();
  }

  const token = signToken({
    userId: actor.userId,
    familyId: family.id,
    memberId: member.id,
    role: member.role,
  });

  const families = await listMyFamilies(actor.userId);

  return {
    token,
    user: { id: actor.userId, username: actor.username },
    family: toFamilyDTO(family),
    member: toMemberDTO(member),
    families,
  };
}

export async function joinFamily(
  actor: Actor,
  input: { passphrase: string; nickname?: string; avatar?: string },
): Promise<AuthPayloadDTO> {
  const family = await prisma.family.findUnique({
    where: { passphraseKey: passphraseKey(input.passphrase) },
  });
  if (!family) {
    throw errors.familyNotFound();
  }
  const matched = await verifyPassword(input.passphrase, family.passphraseHash);
  if (!matched) {
    throw errors.passphraseWrong();
  }

  const nickname = input.nickname?.trim() || actor.username;
  const avatar = input.avatar || '😊';

  const member = await prisma.familyMember.upsert({
    where: { familyId_userId: { familyId: family.id, userId: actor.userId } },
    create: { familyId: family.id, userId: actor.userId, nickname, avatar, role: 'MEMBER' },
    update: {},
  });

  const token = signToken({
    userId: actor.userId,
    familyId: family.id,
    memberId: member.id,
    role: member.role,
  });

  const families = await listMyFamilies(actor.userId);

  return {
    token,
    user: { id: actor.userId, username: actor.username },
    family: toFamilyDTO(family),
    member: toMemberDTO(member),
    families,
  };
}

export async function enterFamily(userId: string, familyId: string): Promise<AuthPayloadDTO> {
  const member = await prisma.familyMember.findFirst({
    where: { familyId, userId },
    include: { family: true, user: { select: { username: true } } },
  });
  if (!member) {
    throw errors.familyNotFound();
  }

  const token = signToken({
    userId,
    familyId: member.familyId,
    memberId: member.id,
    role: member.role,
  });

  const families = await listMyFamilies(userId);

  return {
    token,
    user: { id: userId, username: member.user.username },
    family: toFamilyDTO(member.family),
    member: toMemberDTO(member),
    families,
  };
}

export async function updateMyProfile(
  userId: string,
  familyId: string,
  input: { nickname?: string; avatar?: string },
) {
  const member = await prisma.familyMember.findFirst({
    where: { familyId, userId },
  });
  if (!member) {
    throw errors.unauthorized();
  }

  const nickname = input.nickname?.trim() || member.nickname;
  const avatar = input.avatar ?? member.avatar;

  const updated = await prisma.familyMember.update({
    where: { id: member.id },
    data: { nickname, avatar },
  });

  return toMemberDTO(updated);
}
