import { prisma } from '../config/prisma';
import type { MemberDTO } from '../types/api';
import { errors } from '../utils/errors';
import { toMemberDTO } from '../utils/dto';

export async function listMembers(familyId: string): Promise<MemberDTO[]> {
  const members = await prisma.familyMember.findMany({
    where: { familyId },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  });
  return members.map(toMemberDTO);
}

export async function updateMemberRole(
  familyId: string,
  targetMemberId: string,
  role: 'ADMIN' | 'MEMBER',
): Promise<MemberDTO> {
  const target = await prisma.familyMember.findFirst({
    where: { id: targetMemberId, familyId },
  });
  if (!target) {
    throw errors.forbidden();
  }

  if (target.role === role) {
    return toMemberDTO(target);
  }

  // 防止把家庭里最后一个管理员降级，导致无人可维护菜单
  if (target.role === 'ADMIN' && role === 'MEMBER') {
    const adminCount = await prisma.familyMember.count({
      where: { familyId, role: 'ADMIN' },
    });
    if (adminCount <= 1) {
      throw errors.lastAdmin();
    }
  }

  const updated = await prisma.familyMember.update({
    where: { id: target.id },
    data: { role },
  });
  return toMemberDTO(updated);
}
