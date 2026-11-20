import { z } from 'zod';

const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, '时间格式应为 HH:mm（如 09:30）');

export const mealTimeRefine = (value: {
  startTime?: string;
  endTime?: string;
}): boolean => {
  if (!value.startTime || !value.endTime) return true;
  return value.startTime !== value.endTime;
};

export const createMealSchema = z
  .object({
    name: z.string().min(1, '餐次名不能为空').max(20, '餐次名最多 20 个字符'),
    startTime: hhmm,
    endTime: hhmm,
    sort: z.number().int().min(0).max(999).optional(),
  })
  .refine(mealTimeRefine, { message: '起止时间不能相同' });

export const updateMealSchema = z
  .object({
    name: z.string().min(1).max(20).optional(),
    startTime: hhmm.optional(),
    endTime: hhmm.optional(),
    sort: z.number().int().min(0).max(999).optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.startTime !== undefined ||
      value.endTime !== undefined ||
      value.sort !== undefined,
    { message: '至少填写一项' },
  )
  .refine(mealTimeRefine, { message: '起止时间不能相同' });
