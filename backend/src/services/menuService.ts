import { prisma } from '../config/prisma';
import type { CategoryDTO, DishDTO, MenuCategoryNodeDTO } from '../types/api';
import { errors } from '../utils/errors';
import { toCategoryDTO, toDishDTO } from '../utils/dto';

/** 菜单树：只包含已上架菜品（给点菜页用） */
export async function getMenu(familyId: string): Promise<MenuCategoryNodeDTO[]> {
  const categories = await prisma.category.findMany({
    where: { familyId },
    orderBy: [{ sort: 'asc' }, { id: 'asc' }],
  });
  const dishes = await prisma.dish.findMany({
    where: { familyId, enabled: true },
    orderBy: [{ sort: 'asc' }, { id: 'asc' }],
  });

  const byCategory = new Map<string, DishDTO[]>();
  for (const dish of dishes) {
    const list = byCategory.get(dish.categoryId) ?? [];
    list.push(toDishDTO(dish));
    byCategory.set(dish.categoryId, list);
  }

  return categories.map((category) => ({
    category: toCategoryDTO(category),
    dishes: byCategory.get(category.id) ?? [],
  }));
}

export async function listCategories(familyId: string): Promise<CategoryDTO[]> {
  const categories = await prisma.category.findMany({
    where: { familyId },
    orderBy: [{ sort: 'asc' }, { id: 'asc' }],
  });
  return categories.map(toCategoryDTO);
}

export async function createCategory(
  familyId: string,
  input: { name: string; sort?: number },
): Promise<CategoryDTO> {
  const name = input.name.trim();
  const duplicate = await prisma.category.findFirst({ where: { familyId, name } });
  if (duplicate) {
    throw errors.categoryDuplicate();
  }
  const max = await prisma.category.aggregate({ where: { familyId }, _max: { sort: true } });
  const category = await prisma.category.create({
    data: { familyId, name, sort: input.sort ?? (max._max.sort ?? 0) + 1 },
  });
  return toCategoryDTO(category);
}

export async function updateCategory(
  familyId: string,
  id: string,
  input: { name?: string; sort?: number },
): Promise<CategoryDTO> {
  const category = await prisma.category.findFirst({ where: { id, familyId } });
  if (!category) {
    throw errors.categoryNotFound();
  }

  const name = input.name?.trim() ?? category.name;
  if (name !== category.name) {
    const duplicate = await prisma.category.findFirst({ where: { familyId, name } });
    if (duplicate) {
      throw errors.categoryDuplicate();
    }
  }

  const updated = await prisma.category.update({
    where: { id },
    data: { name, sort: input.sort ?? category.sort },
  });
  return toCategoryDTO(updated);
}

export async function deleteCategory(familyId: string, id: string): Promise<void> {
  const category = await prisma.category.findFirst({ where: { id, familyId } });
  if (!category) {
    throw errors.categoryNotFound();
  }
  const dishCount = await prisma.dish.count({ where: { familyId, categoryId: id } });
  if (dishCount > 0) {
    throw errors.categoryHasDishes();
  }
  await prisma.category.delete({ where: { id } });
}

export async function createDish(
  familyId: string,
  input: { categoryId: string; name: string; description?: string; imageUrl?: string },
): Promise<DishDTO> {
  const category = await prisma.category.findFirst({ where: { id: input.categoryId, familyId } });
  if (!category) {
    throw errors.categoryNotFound();
  }

  const name = input.name.trim();
  const duplicate = await prisma.dish.findFirst({ where: { familyId, categoryId: category.id, name } });
  if (duplicate) {
    throw errors.dishDuplicate();
  }

  const max = await prisma.dish.aggregate({
    where: { familyId, categoryId: category.id },
    _max: { sort: true },
  });
  const dish = await prisma.dish.create({
    data: {
      familyId,
      categoryId: category.id,
      name,
      description: input.description?.trim() || null,
      imageUrl: input.imageUrl?.trim() || null,
      sort: (max._max.sort ?? -1) + 1,
    },
  });
  return toDishDTO(dish);
}

export async function updateDish(
  familyId: string,
  id: string,
  input: {
    categoryId?: string;
    name?: string;
    description?: string | null;
    imageUrl?: string | null;
    enabled?: boolean;
  },
): Promise<DishDTO> {
  const dish = await prisma.dish.findFirst({ where: { id, familyId } });
  if (!dish) {
    throw errors.dishNotFound();
  }

  const categoryId = input.categoryId ?? dish.categoryId;
  if (input.categoryId && input.categoryId !== dish.categoryId) {
    const category = await prisma.category.findFirst({ where: { id: input.categoryId, familyId } });
    if (!category) {
      throw errors.categoryNotFound();
    }
  }

  const name = input.name?.trim() ?? dish.name;
  const duplicate = await prisma.dish.findFirst({ where: { familyId, categoryId, name } });
  if (duplicate && duplicate.id !== id) {
    throw errors.dishDuplicate();
  }

  const updated = await prisma.dish.update({
    where: { id },
    data: {
      categoryId,
      name,
      description:
        input.description === undefined ? dish.description : input.description?.trim() || null,
      imageUrl: input.imageUrl === undefined ? dish.imageUrl : input.imageUrl?.trim() || null,
      enabled: input.enabled ?? dish.enabled,
    },
  });
  return toDishDTO(updated);
}

export async function deleteDish(familyId: string, id: string): Promise<void> {
  const dish = await prisma.dish.findFirst({ where: { id, familyId } });
  if (!dish) {
    throw errors.dishNotFound();
  }
  // 历史点菜记录通过 dishId SetNull 保留 dish_name 快照，删除菜库不影响历史单
  await prisma.dish.delete({ where: { id } });
}

/** 按给定 id 顺序重排菜品（须同一分类内） */
export async function reorderDishes(familyId: string, ids: string[]): Promise<void> {
  const dishes = await prisma.dish.findMany({
    where: { familyId, id: { in: ids } },
    select: { id: true, categoryId: true },
  });
  if (dishes.length !== ids.length) throw errors.dishNotFound();
  if (new Set(dishes.map((d) => d.categoryId)).size > 1) throw errors.dishReorderInvalid();
  await prisma.$transaction(
    ids.map((id, sort) => prisma.dish.update({ where: { id }, data: { sort } })),
  );
}

/** 按给定 id 顺序重排分类 */
export async function reorderCategories(familyId: string, ids: string[]): Promise<void> {
  const categories = await prisma.category.findMany({
    where: { familyId, id: { in: ids } },
    select: { id: true },
  });
  if (categories.length !== ids.length) throw errors.categoryNotFound();
  await prisma.$transaction(
    ids.map((id, sort) => prisma.category.update({ where: { id }, data: { sort } })),
  );
}

/** 管理页：全量菜品（含已下架），按分类分组 */
export async function getAdminMenu(familyId: string): Promise<MenuCategoryNodeDTO[]> {
  const categories = await prisma.category.findMany({
    where: { familyId },
    orderBy: [{ sort: 'asc' }, { id: 'asc' }],
  });
  const dishes = await prisma.dish.findMany({
    where: { familyId },
    orderBy: [{ sort: 'asc' }, { id: 'asc' }],
  });

  const byCategory = new Map<string, DishDTO[]>();
  for (const dish of dishes) {
    const list = byCategory.get(dish.categoryId) ?? [];
    list.push(toDishDTO(dish));
    byCategory.set(dish.categoryId, list);
  }

  return categories.map((category) => ({
    category: toCategoryDTO(category),
    dishes: byCategory.get(category.id) ?? [],
  }));
}
