import { useSyncExternalStore } from 'react';
import Taro from '@tarojs/taro';

import type { AuthPayload, Family, FamilyMember, User } from '../types';

/**
 * 认证状态：token / user / family / member / families
 * 持久化到 Taro storage（key: family-auth），与 H5 zustand persist 的 key 对齐。
 * 小程序无 DOM 循环依赖问题，request 层可直接引用本模块。
 */

export interface AuthState {
  token: string | null;
  user: User | null;
  family: Family | null;
  member: FamilyMember | null;
  families: Family[];
}

const AUTH_STORAGE_KEY = 'family-auth';

const INITIAL: AuthState = {
  token: null,
  user: null,
  family: null,
  member: null,
  families: [],
};

function readStorage(): AuthState {
  try {
    const raw = Taro.getStorageSync(AUTH_STORAGE_KEY);
    if (!raw) return INITIAL;
    const parsed =
      typeof raw === 'string' ? (JSON.parse(raw) as Partial<AuthState>) : (raw as Partial<AuthState>);
    return {
      token: parsed.token ?? null,
      user: parsed.user ?? null,
      family: parsed.family ?? null,
      member: parsed.member ?? null,
      families: parsed.families ?? [],
    };
  } catch {
    return INITIAL;
  }
}

let state: AuthState = INITIAL;

/** 启动时从 storage 恢复（模块加载即执行，早于任何页面渲染） */
export function initAuth(): void {
  state = readStorage();
}
initAuth();

const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function persist(next: AuthState): void {
  state = next;
  try {
    Taro.setStorageSync(AUTH_STORAGE_KEY, state);
  } catch {
    // storage 写入失败不阻断登录态使用
  }
  emit();
}

/** 读取当前认证状态（request 层带 token、页面守卫用） */
export function getAuth(): AuthState {
  return state;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 页面内响应式读取认证状态 */
export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, getAuth, getAuth);
}

/** 登录/创建/加入家庭成功后的统一写入 */
export function setSession(payload: AuthPayload): void {
  persist({
    token: payload.token,
    user: payload.user,
    family: payload.family,
    member: payload.member,
    families: payload.families,
  });
}

/** 进入已有家庭（/families/:id/enter 返回新 token） */
export function setCurrentFamily(family: Family, member: FamilyMember, token: string): void {
  const families = state.families.map((f) => f);
  const idx = families.findIndex((f) => f.id === family.id);
  if (idx >= 0) families.splice(idx, 1, { ...families[idx], ...family });
  else families.unshift(family);
  persist({ ...state, token, family, member, families });
}

/** 资料更新后写回成员（PATCH /families/me） */
export function setMember(member: FamilyMember): void {
  persist({ ...state, member });
}

export function setFamilies(families: Family[]): void {
  persist({ ...state, families });
}

/** HTTP 401 时清 token（保留 families 列表便于重新选择） */
export function clearToken(): void {
  persist({ ...state, token: null, user: null, family: null, member: null });
}

/** 退出登录：清空全部登录态 */
export function logout(): void {
  persist(INITIAL);
}
