import { z } from 'zod';

const nicknameSchema = z.string().min(1, '昵称不能为空').max(20, '昵称最多 20 个字符');
const avatarSchema = z.string().min(1).max(8, '头像取值异常');

export const createFamilySchema = z.object({
  name: z.string().min(1, '家庭名称不能为空').max(30, '家庭名称最多 30 个字符'),
  passphrase: z.string().min(6, '家庭口令至少 6 位').max(32, '家庭口令最多 32 位'),
  nickname: nicknameSchema.optional(),
  avatar: avatarSchema.optional(),
});

export const joinFamilySchema = z.object({
  passphrase: z.string().min(1, '请输入家庭口令').max(32),
  nickname: nicknameSchema.optional(),
  avatar: avatarSchema.optional(),
});

export const updateProfileSchema = z
  .object({
    nickname: nicknameSchema.optional(),
    avatar: avatarSchema.optional(),
  })
  .refine((value) => value.nickname !== undefined || value.avatar !== undefined, {
    message: '昵称或头像至少填写一项',
  });

export const familyIdParamSchema = z.object({
  id: z.string().min(1),
});
