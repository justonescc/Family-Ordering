import { z } from 'zod';

const usernameSchema = z
  .string()
  .min(2, '用户名至少 2 个字符')
  .max(20, '用户名最多 20 个字符')
  .regex(/^[\w一-龥-]+$/, '用户名仅支持中英文、数字、下划线');

const passwordSchema = z.string().min(6, '密码至少 6 位').max(64, '密码最多 64 位');

export const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
});
