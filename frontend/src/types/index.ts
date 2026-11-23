export type Role = 'ADMIN' | 'MEMBER';

export interface User {
  id: string;
  username: string;
}

export interface Family {
  id: string;
  name: string;
  /** 以下字段仅「我的家庭」列表项返回 */
  role?: Role;
  nickname?: string;
  avatar?: string;
}

export interface FamilyMember {
  id: string;
  familyId: string;
  userId: string;
  nickname: string;
  avatar: string;
  role: Role;
}

export interface Meal {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  sort: number;
  enabled: boolean;
}

export interface Category {
  id: string;
  name: string;
  sort: number;
}

export interface Dish {
  id: string;
  categoryId: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  enabled: boolean;
}

export interface MenuCategoryNode {
  category: Category;
  dishes: Dish[];
}

export interface OrderItem {
  id: string;
  dishId?: string | null;
  dishName: string;
  qty: number;
  struck: boolean;
}

export interface SummaryMember {
  itemId: string;
  memberId: string;
  nickname: string;
  avatar: string;
  qty: number;
}

export interface SummaryGroup {
  dishName: string;
  qty: number;
  struck: boolean;
  members: SummaryMember[];
}

export interface AuthPayload {
  token: string;
  user: User;
  family: Family | null;
  member: FamilyMember | null;
  families: Family[];
}
