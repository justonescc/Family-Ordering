import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import type { MemberOrderStatusDTO, OrderItemDTO, SummaryGroupDTO } from '../types/api';
import { errors } from '../utils/errors';
import { toOrderItemDTO } from '../utils/dto';
import { dateStrToDate } from '../utils/shanghai';

/** 单项写入入参：dishId（菜库菜）或 dishName（自定义菜）二选一 */
interface UpsertOrderItemInput {
  dishId?: string;
  dishName?: string;
  qty: number;
}

async function getOrCreateMealOrder(familyId: string, mealId: string, dateStr: string) {
  const meal = await prisma.meal.findFirst({ where: { id: mealId, familyId } });
  if (!meal) {
    throw errors.mealNotFound();
  }
  const mealDate = dateStrToDate(dateStr);
  return prisma.mealOrder.upsert({
    where: { familyId_mealDate_mealId: { familyId, mealDate, mealId: meal.id } },
    create: { familyId, mealDate, mealId: meal.id },
    update: {},
  });
}

export async function getMyOrders(
  familyId: string,
  memberId: string,
  mealId: string,
  dateStr: string,
): Promise<OrderItemDTO[]> {
  const order = await getOrCreateMealOrder(familyId, mealId, dateStr);
  const items = await prisma.orderItem.findMany({
    where: { mealOrderId: order.id, memberId },
    orderBy: [{ createdAt: 'asc' }],
  });
  return items.map(toOrderItemDTO);
}

/**
 * 解析单项的落库身份：菜库菜按 id 查本家庭菜品并取名称快照，自定义菜取 trim 后名称。
 */
async function resolveDishRef(
  db: Prisma.TransactionClient,
  familyId: string,
  input: UpsertOrderItemInput,
): Promise<{ dishId: string | null; dishName: string }> {
  if (input.dishId) {
    const dish = await db.dish.findFirst({ where: { id: input.dishId, familyId } });
    if (!dish) {
      throw errors.dishNotFound();
    }
    return { dishId: dish.id, dishName: dish.name };
  }
  return { dishId: null, dishName: (input.dishName ?? '').trim() };
}

/**
 * 单项写入（qty=0 删除）。db 可为主连接或事务客户端，供 upsertMyOrder / submitMyOrders 共用。
 * 校验顺序与原 upsertMyOrder 主体一致：qty → 菜品归属 → 菜名非空。
 */
async function upsertOne(
  db: Prisma.TransactionClient,
  familyId: string,
  order: { id: string },
  memberId: string,
  input: UpsertOrderItemInput,
): Promise<void> {
  if (input.qty < 0 || input.qty > 99) {
    throw errors.qtyInvalid();
  }

  const { dishId, dishName } = await resolveDishRef(db, familyId, input);
  if (!dishName) {
    throw errors.qtyInvalid();
  }

  if (input.qty === 0) {
    await db.orderItem.deleteMany({
      where: { mealOrderId: order.id, memberId, dishName },
    });
  } else {
    await db.orderItem.upsert({
      where: {
        mealOrderId_memberId_dishName: { mealOrderId: order.id, memberId, dishName },
      },
      create: { mealOrderId: order.id, memberId, dishId, dishName, qty: input.qty },
      update: { qty: input.qty, dishId },
    });
  }
}

export async function upsertMyOrder(
  familyId: string,
  memberId: string,
  input: { mealId: string; date: string; dishId?: string; dishName?: string; qty: number },
): Promise<OrderItemDTO[]> {
  if (input.qty < 0 || input.qty > 99) {
    throw errors.qtyInvalid();
  }

  const order = await getOrCreateMealOrder(familyId, input.mealId, input.date);
  await upsertOne(prisma, familyId, order, memberId, input);

  return getMyOrders(familyId, memberId, input.mealId, input.date);
}

/**
 * 批量提交点菜（购物车式下单）：事务内逐项 upsert，任一项失败整体回滚。
 * 同名项归并（菜库菜解析出名称后与自定义同名菜视为同一行），以最后一次为准。
 */
export async function submitMyOrders(
  familyId: string,
  memberId: string,
  input: { mealId: string; date: string; items: UpsertOrderItemInput[] },
): Promise<OrderItemDTO[]> {
  // schema 已拦截，这里保持与单项接口同口径的兜底校验（先于建单）
  for (const item of input.items) {
    if (item.qty < 0 || item.qty > 99) {
      throw errors.qtyInvalid();
    }
  }

  const order = await getOrCreateMealOrder(familyId, input.mealId, input.date);

  await prisma.$transaction(async (tx) => {
    const byName = new Map<string, UpsertOrderItemInput>();
    for (const item of input.items) {
      const resolved = await resolveDishRef(tx, familyId, item);
      byName.set(resolved.dishName, {
        dishId: resolved.dishId ?? undefined,
        dishName: resolved.dishName,
        qty: item.qty,
      });
    }
    for (const item of byName.values()) {
      await upsertOne(tx, familyId, order, memberId, item);
    }
  });

  return getMyOrders(familyId, memberId, input.mealId, input.date);
}

/**
 * 总单成员点菜状态：全集 = 家庭成员（与 members 列表同口径），
 * ordered = 该成员在本餐次单存在点菜项。只读查询：餐次单不存在时不惰性创建，全部视为未点。
 */
export async function getSummaryMembers(
  familyId: string,
  mealId: string,
  dateStr: string,
): Promise<MemberOrderStatusDTO[]> {
  const meal = await prisma.meal.findFirst({ where: { id: mealId, familyId } });
  if (!meal) {
    throw errors.mealNotFound();
  }

  const mealDate = dateStrToDate(dateStr);
  const order = await prisma.mealOrder.findFirst({
    where: { familyId, mealDate, mealId: meal.id },
  });

  const members = await prisma.familyMember.findMany({
    where: { familyId },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, nickname: true, avatar: true },
  });

  const orderedMemberIds = new Set<string>();
  if (order) {
    const items = await prisma.orderItem.findMany({
      where: { mealOrderId: order.id },
      select: { memberId: true },
      distinct: ['memberId'],
    });
    for (const item of items) {
      orderedMemberIds.add(item.memberId);
    }
  }

  return members.map((member) => ({
    memberId: member.id,
    nickname: member.nickname,
    avatar: member.avatar,
    ordered: orderedMemberIds.has(member.id),
  }));
}

export async function getSummary(
  familyId: string,
  mealId: string,
  dateStr: string,
): Promise<SummaryGroupDTO[]> {
  const order = await getOrCreateMealOrder(familyId, mealId, dateStr);
  const items = await prisma.orderItem.findMany({
    where: { mealOrderId: order.id },
    include: { member: { select: { id: true, nickname: true, avatar: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const groups = new Map<string, SummaryGroupDTO>();
  for (const item of items) {
    let group = groups.get(item.dishName);
    if (!group) {
      group = { dishName: item.dishName, qty: 0, struck: true, members: [] };
      groups.set(item.dishName, group);
    }
    group.qty += item.qty;
    // 组内全部被划掉才算划掉
    if (!item.struck) {
      group.struck = false;
    }
    group.members.push({
      itemId: item.id,
      memberId: item.member.id,
      nickname: item.member.nickname,
      avatar: item.member.avatar,
      qty: item.qty,
    });
  }

  return [...groups.values()];
}

export async function setStruck(
  familyId: string,
  itemId: string,
  struck: boolean,
): Promise<OrderItemDTO> {
  const item = await prisma.orderItem.findFirst({
    where: { id: itemId },
    include: { mealOrder: true },
  });
  if (!item || item.mealOrder.familyId !== familyId) {
    throw errors.orderItemNotFound();
  }
  const updated = await prisma.orderItem.update({
    where: { id: item.id },
    data: { struck },
  });
  return toOrderItemDTO(updated);
}
