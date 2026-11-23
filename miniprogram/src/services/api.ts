import { request } from '../utils/request';
import type {
  AuthPayload,
  Family,
  FamilyMember,
  Meal,
  MenuCategoryNode,
  OrderItem,
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

  summary: (input: { mealId: string; date: string }) =>
    request<SummaryGroup[]>(`/orders/summary?mealId=${input.mealId}&date=${input.date}`),

  setStruck: (itemId: string, struck: boolean) =>
    request<OrderItem>(`/orders/items/${itemId}/struck`, { method: 'PATCH', body: { struck } }),

  // ---- 成员（阶段 3+ 使用） ----
  updateMemberRole: (memberId: string, role: Role) =>
    request<FamilyMember>(`/families/me/members/${memberId}/role`, {
      method: 'PATCH',
      body: { role },
    }),
};
