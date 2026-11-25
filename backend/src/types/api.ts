export type Role = 'ADMIN' | 'MEMBER';

export interface UserDTO {
  id: string;
  username: string;
}

export interface FamilyDTO {
  id: string;
  name: string;
}

export interface MemberDTO {
  id: string;
  familyId: string;
  userId: string;
  nickname: string;
  avatar: string;
  role: Role;
}

/** 我的家庭列表项：附带本人在该家庭的角色/昵称 */
export interface MyFamilyDTO extends FamilyDTO {
  role: Role;
  nickname: string;
  avatar: string;
}

export interface AuthPayloadDTO {
  token: string;
  user: UserDTO;
  family: FamilyDTO | null;
  member: MemberDTO | null;
  families: MyFamilyDTO[];
}

export interface CategoryDTO {
  id: string;
  familyId: string;
  name: string;
  sort: number;
}

export interface DishDTO {
  id: string;
  familyId: string;
  categoryId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  enabled: boolean;
}

export interface MenuCategoryNodeDTO {
  category: CategoryDTO;
  dishes: DishDTO[];
}

export interface MealDTO {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  sort: number;
  enabled: boolean;
}

export interface OrderItemDTO {
  id: string;
  dishId: string | null;
  dishName: string;
  qty: number;
  struck: boolean;
}

export interface SummaryMemberDTO {
  itemId: string;
  memberId: string;
  nickname: string;
  avatar: string;
  qty: number;
}

export interface SummaryGroupDTO {
  dishName: string;
  qty: number;
  struck: boolean;
  members: SummaryMemberDTO[];
}

/** 总单成员点菜状态（GET /orders/summary-members）：ordered = 该成员在此餐次单有点菜项 */
export interface MemberOrderStatusDTO {
  memberId: string;
  nickname: string;
  avatar: string;
  ordered: boolean;
}
