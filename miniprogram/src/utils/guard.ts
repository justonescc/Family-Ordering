import Taro from '@tarojs/taro';

import { getAuth } from '../stores/auth';

/**
 * tabBar 页通用守卫：未登录或未进入家庭 → reLaunch 到登录页。
 * 用法：各 tab 页 useDidShow(() => { if (!requireFamilySession()) return; ... })
 */
export function requireFamilySession(): boolean {
  const { token, family } = getAuth();
  if (token && family) return true;
  Taro.reLaunch({ url: '/pages/login/index' });
  return false;
}

/** 非 tabBar 页守卫（如管理页）：仅家庭管理员可通过，否则弹回菜单页 */
export function requireAdminSession(): boolean {
  if (!requireFamilySession()) return false;
  const { member } = getAuth();
  if (member?.role === 'ADMIN') return true;
  Taro.reLaunch({ url: '/pages/menu/index' });
  return false;
}
