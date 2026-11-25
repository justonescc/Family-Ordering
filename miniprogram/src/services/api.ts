import { request } from '../utils/request';
import type {
  AuthPayload,
  Category,
  Dish,
  Family,
  FamilyMember,
  Meal,
  MemberOrderStatus,
  MenuCategoryNode,
  OrderItem,
  OrderSubmitInput,
  Role,
  SummaryGroup,
} from '../types';

/**
 * 铁律：所有 API 调用必须经过 services 层，页面组件内禁止直接 Taro.request。
 * 路径与 H5 services/api.ts 对齐，资源一律挂在 /families/me 下，避免跨家庭越权。
 */
export const api = {
  // ---- 账号 ----
  /** 微信登录：wx.login 的 code 换既有结构 JWT（后端 /auth/wechat） */
  wechatLogin: (code: string) =>
    request<AuthPayload>('/auth/wechat', { method: 'POST', body: { code } }),

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

  // ---- 管理端：分类（仅 ADMIN，后端 requireAdmin） ----
  adminCategories: () => request<Category[]>('/families/me/categories'),

  createCategory: (name: string) =>
    request<Category>('/families/me/categories', { method: 'POST', body: { name } }),

  updateCategory: (id: string, input: { name?: string }) =>
    request<Category>(`/families/me/categories/${id}`, { method: 'PUT', body: input }),

  deleteCategory: (id: string) =>
    request<null>(`/families/me/categories/${id}`, { method: 'DELETE' }),

  reorderCategories: (ids: string[]) =>
    request<null>('/families/me/categories/reorder', { method: 'PUT', body: { ids } }),

  // ---- 管理端：菜品 ----
  adminDishes: () => request<MenuCategoryNode[]>('/families/me/dishes'),

  createDish: (input: { categoryId: string; name: string; description?: string; imageUrl?: string }) =>
    request<Dish>('/families/me/dishes', { method: 'POST', body: input }),

  updateDish: (
    id: string,
    input: { categoryId?: string; name?: string; description?: string | null; imageUrl?: string | null; enabled?: boolean },
  ) => request<Dish>(`/families/me/dishes/${id}`, { method: 'PUT', body: input }),

  deleteDish: (id: string) =>
    request<null>(`/families/me/dishes/${id}`, { method: 'DELETE' }),

  reorderDishes: (ids: string[]) =>
    request<null>('/families/me/dishes/reorder', { method: 'PUT', body: { ids } }),

  // ---- 餐次（阶段 3 使用） ----
  listMeals: () => request<Meal[]>('/families/me/meals'),

  // ---- 点菜 ----
  myOrders: (input: { mealId: string; date: string }) =>
    request<OrderItem[]>(`/orders/my?mealId=${input.mealId}&date=${input.date}`),

  upsertMyOrder: (input: {
    mealId: string;
    date: string;
    dishId?: string;
    dishName?: string;
    qty: number;
  }) => request<OrderItem[]>('/orders/my', { method: 'PUT', body: input }),

  /** 批量提交购物车（先选后提交），返回该成员本餐次全量点菜 */
  submitOrders: (input: OrderSubmitInput) =>
    request<OrderItem[]>('/orders/submit', { method: 'POST', body: input }),

  summary: (input: { mealId: string; date: string }) =>
    request<SummaryGroup[]>(`/orders/summary?mealId=${input.mealId}&date=${input.date}`),

  /** 总单成员点菜状态（已点/未点名单） */
  summaryMembers: (input: { mealId: string; date: string }) =>
    request<MemberOrderStatus[]>(`/orders/summary-members?mealId=${input.mealId}&date=${input.date}`),

  setStruck: (itemId: string, struck: boolean) =>
    request<OrderItem>(`/orders/items/${itemId}/struck`, { method: 'PATCH', body: { struck } }),

  // ---- 成员（阶段 3+ 使用） ----
  updateMemberRole: (memberId: string, role: Role) =>
    request<FamilyMember>(`/families/me/members/${memberId}/role`, {
      method: 'PATCH',
      body: { role },
    }),
};
