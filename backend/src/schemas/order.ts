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

export const struckSchema = z.object({
  struck: z.boolean(),
});
