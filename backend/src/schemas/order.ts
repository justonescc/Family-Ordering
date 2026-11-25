import { z } from 'zod';

export const dateQuerySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD');

export const myOrdersQuerySchema = z.object({
  mealId: z.string().min(1),
  date: dateQuerySchema,
});

export const upsertOrderSchema = z
  .object({
    mealId: z.string().min(1),
    date: dateQuerySchema,
    dishId: z.string().min(1).optional(),
    dishName: z.string().min(1).max(30).optional(),
    qty: z.number().int().min(0, '份数不能为负').max(99, '份数最多 99'),
  })
  .refine((value) => value.dishId !== undefined || (value.dishName?.trim().length ?? 0) > 0, {
    message: 'dishId 与 dishName 至少填写一个',
  });

export const submitOrderItemSchema = z
  .object({
    dishId: z.string().min(1).optional(),
    dishName: z.string().min(1).max(30).optional(),
    qty: z.number().int().min(0, '份数不能为负').max(99, '份数最多 99'),
  })
  .refine((value) => value.dishId !== undefined || (value.dishName?.trim().length ?? 0) > 0, {
    message: 'dishId 与 dishName 至少填写一个',
  });

/** 批量提交点菜（购物车式）：同名项在 service 层归并以最后一次为准 */
export const submitOrderSchema = z.object({
  mealId: z.string().min(1),
  date: dateQuerySchema,
  items: z.array(submitOrderItemSchema).min(1, '至少提交一项').max(100, '单次最多提交 100 项'),
});

export const struckSchema = z.object({
  struck: z.boolean(),
});
