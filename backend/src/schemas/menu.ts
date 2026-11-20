import { z } from 'zod';

export const idParamSchema = z.object({ id: z.string().min(1) });

export const createCategorySchema = z.object({
  name: z.string().min(1, '分类名不能为空').max(20, '分类名最多 20 个字符'),
  sort: z.number().int().min(0).max(999).optional(),
});

export const updateCategorySchema = z
  .object({
    name: z.string().min(1).max(20).optional(),
    sort: z.number().int().min(0).max(999).optional(),
  })
  .refine((value) => value.name !== undefined || value.sort !== undefined, {
    message: '名称或排序至少填写一项',
  });

export const createDishSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1, '菜名不能为空').max(30, '菜名最多 30 个字符'),
  description: z.string().max(100, '简介最多 100 个字符').optional(),
});

export const updateDishSchema = z
  .object({
    categoryId: z.string().min(1).optional(),
    name: z.string().min(1).max(30).optional(),
    description: z.string().max(100).nullable().optional(),
    enabled: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.categoryId !== undefined ||
      value.name !== undefined ||
      value.description !== undefined ||
      value.enabled !== undefined,
    { message: '至少填写一项' },
  );
