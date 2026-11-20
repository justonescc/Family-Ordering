import { prisma } from '../config/prisma';
import type { MealDTO } from '../types/api';
import { errors } from '../utils/errors';
import { toMealDTO } from '../utils/dto';

async function findOwnedMeal(familyId: string, id: string) {
  const meal = await prisma.meal.findFirst({ where: { id, familyId } });
  if (!meal) {
    throw errors.mealNotFound();
  }
  return meal;
}

/** 名称唯一性仅在「启用中」的餐次间校验（停用后可复用同名） */
async function assertNameAvailable(familyId: string, name: string, excludeId?: string): Promise<void> {
  const duplicate = await prisma.meal.findFirst({
    where: { familyId, name, enabled: true, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  if (duplicate) {
    throw errors.mealDuplicate();
  }
}

export async function listMeals(familyId: string, includeDisabled = true): Promise<MealDTO[]> {
  const meals = await prisma.meal.findMany({
    where: { familyId, ...(includeDisabled ? {} : { enabled: true }) },
    orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
  });
  return meals.map(toMealDTO);
}

export async function createMeal(
  familyId: string,
  input: { name: string; startTime: string; endTime: string; sort?: number },
): Promise<MealDTO> {
  const name = input.name.trim();
  await assertNameAvailable(familyId, name);

  const max = await prisma.meal.aggregate({ where: { familyId }, _max: { sort: true } });
  const meal = await prisma.meal.create({
    data: {
      familyId,
      name,
      startTime: input.startTime,
      endTime: input.endTime,
      sort: input.sort ?? (max._max.sort ?? 0) + 1,
    },
  });
  return toMealDTO(meal);
}

export async function updateMeal(
  familyId: string,
  id: string,
  input: { name?: string; startTime?: string; endTime?: string; sort?: number },
): Promise<MealDTO> {
  const meal = await findOwnedMeal(familyId, id);

  const name = input.name?.trim() ?? meal.name;
  if (name !== meal.name) {
    await assertNameAvailable(familyId, name, id);
  }

  const startTime = input.startTime ?? meal.startTime;
  const endTime = input.endTime ?? meal.endTime;
  if (startTime === endTime) {
    throw errors.mealTimeInvalid();
  }

  const updated = await prisma.meal.update({
    where: { id },
    data: { name, startTime, endTime, sort: input.sort ?? meal.sort },
  });
  return toMealDTO(updated);
}

/** 停用（软删）：历史 meal_orders 通过 RESTRICT 保留 */
export async function deleteMeal(familyId: string, id: string): Promise<void> {
  await findOwnedMeal(familyId, id);
  await prisma.meal.update({ where: { id }, data: { enabled: false } });
}
