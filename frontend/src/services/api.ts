import { request } from '../utils/request';
import type {
  AuthPayload,
  Category,
  Dish,
  Family,
  FamilyMember,
  MenuCategoryNode,
  Meal,
  OrderItem,
  Role,
  SummaryGroup,
} from '../types';

/**
 * 铁律：前端所有 API 调用必须经过 services 层，组件内禁止直接 fetch。
 * 路径统一为 /api/v1 域内，资源一律挂在 /families/me 下，避免跨家庭越权。
 */
export const api = {
  // ---- 账号 ----
  register: (username: string, password: string) =>
    request<AuthPayload>('/auth/register', { method: 'POST', body: { username, password } }),

  login: (username: string, password: string) =>
    request<AuthPayload>('/auth/login', { method: 'POST', body: { username, password } }),

  // ---- 家庭 ----
  listFamilies: () => request<Family[]>('/families'),

  createFamily: (input: { name: string; passphrase: string; nickname?: string; avatar?: string }) =>
    request<AuthPayload>('/families', { method: 'POST', body: input }),

  joinFamily: (input: { passphrase: string; nickname?: string; avatar?: string }) =>
    request<AuthPayload>('/families/join', { method: 'POST', body: input }),

  enterFamily: (familyId: string) =>
    request<AuthPayload>(`/families/${familyId}/enter`, { method: 'POST' }),

  updateMyProfile: (input: { nickname?: string; avatar?: string }) =>
    request<FamilyMember>('/families/me', { method: 'PATCH', body: input }),

  // ---- 菜单 ----
  getMenu: () => request<MenuCategoryNode[]>('/menu'),

  listCategories: () => request<Category[]>('/families/me/categories'),

  createCategory: (input: { name: string; sort?: number }) =>
    request<Category>('/families/me/categories', { method: 'POST', body: input }),

  updateCategory: (id: string, input: { name?: string; sort?: number }) =>
    request<Category>(`/families/me/categories/${id}`, { method: 'PUT', body: input }),

  deleteCategory: (id: string) =>
    request<null>(`/families/me/categories/${id}`, { method: 'DELETE' }),

  /** 管理页：全量菜品树（含已下架） */
  adminMenu: () => request<MenuCategoryNode[]>('/families/me/dishes'),

  createDish: (input: { categoryId: string; name: string; description?: string; imageUrl?: string }) =>
    request<Dish>('/families/me/dishes', { method: 'POST', body: input }),

  updateDish: (
    id: string,
    input: { categoryId?: string; name?: string; description?: string; imageUrl?: string | null; enabled?: boolean },
  ) =>
    request<Dish>(`/families/me/dishes/${id}`, { method: 'PUT', body: input }),

  deleteDish: (id: string) => request<null>(`/families/me/dishes/${id}`, { method: 'DELETE' }),

  // ---- 餐次 ----
  listMeals: () => request<Meal[]>('/families/me/meals'),

  createMeal: (input: { name: string; startTime: string; endTime: string; sort?: number }) =>
    request<Meal>('/families/me/meals', { method: 'POST', body: input }),

  updateMeal: (id: string, input: { name?: string; startTime?: string; endTime?: string; sort?: number }) =>
    request<Meal>(`/families/me/meals/${id}`, { method: 'PUT', body: input }),

  deleteMeal: (id: string) => request<null>(`/families/me/meals/${id}`, { method: 'DELETE' }),

  // ---- 成员（admin） ----
  listMembers: () => request<FamilyMember[]>('/families/me/members'),

  updateMemberRole: (memberId: string, role: Role) =>
    request<FamilyMember>(`/families/me/members/${memberId}/role`, {
      method: 'PATCH',
      body: { role },
    }),

  // ---- 点菜 ----
  myOrders: (input: { mealId: string; date: string }) =>
    request<OrderItem[]>(`/orders/my?mealId=${input.mealId}&date=${input.date}`),

  upsertMyOrder: (input: {
    mealId: string;
    date: string;
    dishId?: string;
    dishName?: string;
    qty: number;
  }) =>
    request<OrderItem[]>('/orders/my', { method: 'PUT', body: input }),

  summary: (input: { mealId: string; date: string }) =>
    request<SummaryGroup[]>(`/orders/summary?mealId=${input.mealId}&date=${input.date}`),

  setStruck: (itemId: string, struck: boolean) =>
    request<OrderItem>(`/orders/items/${itemId}/struck`, { method: 'PATCH', body: { struck } }),
};
