import type { Category, Dish, Family, FamilyMember, Meal, OrderItem, User } from '@prisma/client';
import type {
  CategoryDTO,
  DishDTO,
  FamilyDTO,
  MemberDTO,
  MealDTO,
  MyFamilyDTO,
  OrderItemDTO,
  UserDTO,
} from '../types/api';

export function toUserDTO(user: Pick<User, 'id' | 'username'>): UserDTO {
  return { id: user.id, username: user.username };
}

export function toFamilyDTO(family: Pick<Family, 'id' | 'name'>): FamilyDTO {
  return { id: family.id, name: family.name };
}

export function toMemberDTO(member: FamilyMember): MemberDTO {
  return {
    id: member.id,
    familyId: member.familyId,
    userId: member.userId,
    nickname: member.nickname,
    avatar: member.avatar,
    role: member.role,
  };
}

export function toMyFamilyDTO(family: Pick<Family, 'id' | 'name'>, member: FamilyMember): MyFamilyDTO {
  return {
    id: family.id,
    name: family.name,
    role: member.role,
    nickname: member.nickname,
    avatar: member.avatar,
  };
}

export function toCategoryDTO(category: Category): CategoryDTO {
  return { id: category.id, familyId: category.familyId, name: category.name, sort: category.sort };
}

export function toDishDTO(dish: Dish): DishDTO {
  return {
    id: dish.id,
    familyId: dish.familyId,
    categoryId: dish.categoryId,
    name: dish.name,
    description: dish.description,
    enabled: dish.enabled,
  };
}

export function toMealDTO(meal: Meal): MealDTO {
  return {
    id: meal.id,
    name: meal.name,
    startTime: meal.startTime,
    endTime: meal.endTime,
    sort: meal.sort,
    enabled: meal.enabled,
  };
}

export function toOrderItemDTO(item: OrderItem): OrderItemDTO {
  return {
    id: item.id,
    dishId: item.dishId,
    dishName: item.dishName,
    qty: item.qty,
    struck: item.struck,
  };
}
