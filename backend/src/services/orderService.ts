import { prisma } from '../config/prisma';
import type { OrderItemDTO, SummaryGroupDTO } from '../types/api';
import { errors } from '../utils/errors';
import { toOrderItemDTO } from '../utils/dto';
import { dateStrToDate } from '../utils/shanghai';

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

export async function upsertMyOrder(
  familyId: string,
  memberId: string,
  input: { mealId: string; date: string; dishId?: string; dishName?: string; qty: number },
): Promise<OrderItemDTO[]> {
  if (input.qty < 0 || input.qty > 99) {
    throw errors.qtyInvalid();
  }

  const order = await getOrCreateMealOrder(familyId, input.mealId, input.date);

  let dishIdToSave: string | null = null;
  let dishName: string;

  if (input.dishId) {
    const dish = await prisma.dish.findFirst({ where: { id: input.dishId, familyId } });
    if (!dish) {
      throw errors.dishNotFound();
    }
    dishIdToSave = dish.id;
    dishName = dish.name;
  } else {
    dishName = (input.dishName ?? '').trim();
  }

  if (!dishName) {
    throw errors.qtyInvalid();
  }

  if (input.qty === 0) {
    await prisma.orderItem.deleteMany({
      where: { mealOrderId: order.id, memberId, dishName },
    });
  } else {
    await prisma.orderItem.upsert({
      where: {
        mealOrderId_memberId_dishName: { mealOrderId: order.id, memberId, dishName },
      },
      create: { mealOrderId: order.id, memberId, dishId: dishIdToSave, dishName, qty: input.qty },
      update: { qty: input.qty, dishId: dishIdToSave },
    });
  }

  return getMyOrders(familyId, memberId, input.mealId, input.date);
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
