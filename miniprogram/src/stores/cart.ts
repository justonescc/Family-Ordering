import { useSyncExternalStore } from 'react';
import Taro from '@tarojs/taro';

import { api } from '../services/api';
import type { OrderItem, OrderSubmitItem } from '../types';

/**
 * 点菜购物车：统一 draft 模型（先选后提交，与 stores/meal.ts 同款轻量 store）。
 * - baseline：服务端真相（该成员本餐次 OrderItem[]，页面拉 myOrders 后 resetFromBaseline 写入）
 * - draft：本地购物车，键 = dishId ?? `c:${dishName}`，qty 可为 0（表示待删除的已提交项）
 * 页面显示/角标只读 draft；+/− 仅改 draft（零请求）；提交 = diff 批量 POST /orders/submit。
 * 持久化到 Taro storage（key: family-cart，带结构版本号，异常即丢弃本地 draft）；
 * 键按 familyId:mealId:date 隔离，切换家庭/退出登录时 resetCart() 清空。
 */

const CART_STORAGE_KEY = 'family-cart';
const STORAGE_VERSION = 1;

/** draft 单项：菜库菜带 dishId，自定义菜 dishId 为空（与 OrderItem 快照口径一致） */
export interface CartDraftEntry {
  dishId: string | null;
  dishName: string;
  qty: number;
}

export interface CartEntry {
  baseline: OrderItem[];
  draft: Record<string, CartDraftEntry>;
}

interface CartStorage {
  version: number;
  carts: Record<string, CartEntry>;
}

/** 共享空条目：引用稳定，供 useSyncExternalStore 做 Object.is 比较 */
const EMPTY_ENTRY: CartEntry = { baseline: [], draft: {} };

function emptyStorage(): CartStorage {
  return { version: STORAGE_VERSION, carts: {} };
}

/** 启动时恢复持久化购物车；版本不符 / 结构异常即整包丢弃（基线由服务端兜底） */
function readStorage(): CartStorage {
  try {
    const raw = Taro.getStorageSync(CART_STORAGE_KEY);
    if (!raw) return emptyStorage();
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const carts = (parsed as CartStorage | null)?.carts;
    if (
      !parsed ||
      parsed.version !== STORAGE_VERSION ||
      typeof carts !== 'object' ||
      carts === null ||
      Array.isArray(carts)
    ) {
      return emptyStorage();
    }
    const next: Record<string, CartEntry> = {};
    for (const [key, entry] of Object.entries(carts as Record<string, unknown>)) {
      const candidate = entry as Partial<CartEntry> | null;
      if (!candidate || !Array.isArray(candidate.baseline) || typeof candidate.draft !== 'object' || candidate.draft === null) {
        continue;
      }
      next[key] = { baseline: candidate.baseline, draft: candidate.draft };
    }
    return { version: STORAGE_VERSION, carts: next };
  } catch {
    return emptyStorage();
  }
}

let state: CartStorage = readStorage();

const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function commit(carts: Record<string, CartEntry>): void {
  state = { version: STORAGE_VERSION, carts };
  try {
    Taro.setStorageSync(CART_STORAGE_KEY, state);
  } catch {
    // storage 写入失败不阻断内存态使用
  }
  emit();
}

export function subscribeCart(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCartEntry(key: string | null): CartEntry {
  if (!key) return EMPTY_ENTRY;
  return state.carts[key] ?? EMPTY_ENTRY;
}

/** 页面内响应式读取购物车条目（键缺省时返回共享空对象，引用稳定） */
export function useCart(key: string | null): CartEntry {
  return useSyncExternalStore(subscribeCart, () => getCartEntry(key), () => getCartEntry(key));
}

/** 购物车键：家庭 × 餐次 × 日期 */
export function buildCartKey(
  familyId: string | null | undefined,
  mealId: string,
  date: string,
): string {
  return `${familyId ?? ''}:${mealId}:${date}`;
}

/** draft 键：菜库菜用 dishId，自定义菜用 `c:${dishName}` */
function draftKeyOf(dishId: string | null | undefined, dishName: string): string {
  return dishId ? dishId : `c:${dishName}`;
}

/** 基线 → draft 投影（qty 取服务端值，天然无差异） */
function projectBaseline(baseline: OrderItem[]): Record<string, CartDraftEntry> {
  const draft: Record<string, CartDraftEntry> = {};
  for (const item of baseline) {
    draft[draftKeyOf(item.dishId, item.dishName)] = {
      dishId: item.dishId ?? null,
      dishName: item.dishName,
      qty: item.qty,
    };
  }
  return draft;
}

/**
 * 拉到服务端全量后刷新基线；本地同键未提交增量优先（杀 app / 换页不丢已选）。
 */
export function resetFromBaseline(key: string | null, orders: OrderItem[]): void {
  if (!key) return;
  const entry = state.carts[key];
  const draft = { ...projectBaseline(orders), ...(entry?.draft ?? {}) };
  commit({ ...state.carts, [key]: { baseline: orders, draft } });
}

/** 改 draft 数量（0..99 收敛）；零网络请求，同步持久化 */
export function setQty(
  key: string | null,
  dish: { dishId?: string | null; dishName: string },
  qty: number,
): void {
  if (!key) return;
  const entry = state.carts[key] ?? EMPTY_ENTRY;
  const draft = { ...entry.draft };
  draft[draftKeyOf(dish.dishId, dish.dishName)] = {
    dishId: dish.dishId ?? null,
    dishName: dish.dishName,
    qty: Math.max(0, Math.min(99, Math.round(qty))),
  };
  commit({ ...state.carts, [key]: { baseline: entry.baseline, draft } });
}

/** 读取某菜在 draft 中的当前数量 */
export function cartQtyOf(
  entry: CartEntry,
  dish: { dishId?: string | null; dishName: string },
): number {
  return entry.draft[draftKeyOf(dish.dishId, dish.dishName)]?.qty ?? 0;
}

/** 底部栏/角标总份数：draft 全部键求和（含自定义菜） */
export function cartTotalCount(entry: CartEntry): number {
  let total = 0;
  for (const draftEntry of Object.values(entry.draft)) {
    total += draftEntry.qty;
  }
  return total;
}

/** draft 与基线的差异项（qty 取 draft 值，0 表示删除），供批量提交使用 */
export function getDirtyItems(entry: CartEntry): OrderSubmitItem[] {
  const baselineQty = new Map<string, number>();
  for (const item of entry.baseline) {
    baselineQty.set(draftKeyOf(item.dishId, item.dishName), item.qty);
  }
  const items: OrderSubmitItem[] = [];
  for (const [key, draftEntry] of Object.entries(entry.draft)) {
    if (draftEntry.qty !== (baselineQty.get(key) ?? 0)) {
      items.push({
        dishId: draftEntry.dishId ?? undefined,
        dishName: draftEntry.dishName,
        qty: draftEntry.qty,
      });
    }
  }
  // 基线里有但 draft 丢失的键（防御性兜底）：视为待删除
  for (const item of entry.baseline) {
    const key = draftKeyOf(item.dishId, item.dishName);
    if (!(key in entry.draft)) {
      items.push({ dishId: item.dishId ?? undefined, dishName: item.dishName, qty: 0 });
    }
  }
  return items;
}

/**
 * 批量提交未提交变更：成功后用服务端返回的全量刷新基线（提交中再点的 + 会作为
 * 新增量保留在 draft 上，不被覆盖丢失）。
 */
export async function submitCart(
  key: string | null,
  mealId: string,
  date: string,
): Promise<OrderItem[]> {
  if (!key) throw new Error('请先选择餐次');
  const entry = getCartEntry(key);
  const items = getDirtyItems(entry);
  if (items.length === 0) {
    return entry.baseline;
  }
  const next = await api.submitOrders({ mealId, date, items });
  if (!Array.isArray(next)) throw new Error('提交结果数据异常');
  resetFromBaseline(key, next);
  return next;
}

/** 「清空已选」：仅撤销未提交的改动（draft 回滚到基线），不发生网络请求 */
export function clearUncommitted(key: string | null): void {
  if (!key) return;
  const entry = state.carts[key];
  if (!entry) return;
  commit({
    ...state.carts,
    [key]: { baseline: entry.baseline, draft: projectBaseline(entry.baseline) },
  });
}

/** 切换家庭 / 退出登录时清空全部购物车（避免串家庭、串账号） */
export function resetCart(): void {
  commit({});
}
