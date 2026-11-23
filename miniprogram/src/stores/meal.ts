import { useSyncExternalStore } from 'react';

import { api } from '../services/api';
import type { Meal } from '../types';
import { getShanghaiDateStr, resolveCurrentMeal } from '../utils/meal';

/**
 * 餐次会话状态：菜单 / 我的单 / 总单三个 Tab 共用当前餐次与日期。
 * - date：上海时区日历日，页面 onShow 时刷新（跨午夜自动切到新一天）
 * - meals：餐次列表（listMeals 拉取；失败保留旧值、下次 onShow 重试）
 * - manualMealId：手动选择的餐次，优先于自动判定
 * 与 stores/auth.ts 同款轻量 store（useSyncExternalStore），不引入 zustand。
 */

export interface MealSessionState {
  /** 餐次列表（含停用，渲染时再过滤 enabled） */
  meals: Meal[];
  /** 当前上海日历日（YYYY-MM-DD） */
  date: string;
  /** 手动选择的餐次 id（null = 跟随自动判定） */
  manualMealId: string | null;
  /** meals 是否已成功拉取过 */
  loaded: boolean;
  /** meals 所属家庭（切换家庭后强制重新拉取） */
  familyId: string | null;
  /** 每次页面 onShow 递增，驱动订阅页重算自动餐次 */
  tick: number;
}

let state: MealSessionState = {
  meals: [],
  date: getShanghaiDateStr(),
  manualMealId: null,
  loaded: false,
  familyId: null,
  tick: 0,
};

const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function update(partial: Partial<MealSessionState>): void {
  state = { ...state, ...partial };
  emit();
}

export function getMealSession(): MealSessionState {
  return state;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 页面内响应式读取餐次会话 */
export function useMealSession(): MealSessionState {
  return useSyncExternalStore(subscribe, getMealSession, getMealSession);
}

/** 当前生效餐次 id：手动选择 > 自动判定（时间窗内 sort 最小）> 首个启用餐次 */
export function resolveCurrentMealId(
  s: Pick<MealSessionState, 'meals' | 'manualMealId'>,
): string | null {
  const auto = resolveCurrentMeal(s.meals);
  return s.manualMealId ?? auto?.id ?? s.meals.find((m) => m.enabled)?.id ?? null;
}

/** 页面 onShow 调用：刷新日期并递增 tick（跨午夜/时段变化后重算自动餐次） */
export function syncMealSession(): void {
  update({ date: getShanghaiDateStr(), tick: state.tick + 1 });
}

/** 手动切换餐次 */
export function selectMeal(mealId: string): void {
  if (state.manualMealId === mealId) return;
  update({ manualMealId: mealId });
}

/**
 * 拉取餐次（同家庭已加载则跳过；失败保留旧值、loaded 仍为 false 下次重试）。
 * 换家庭后强制重新拉取，并清掉旧家庭的手动选择。
 */
export async function ensureMeals(familyId: string | null): Promise<void> {
  if (state.loaded && state.familyId === familyId) return;
  try {
    const meals = await api.listMeals();
    const sameFamily = state.familyId === familyId;
    update({
      meals,
      loaded: true,
      familyId,
      manualMealId: sameFamily ? state.manualMealId : null,
    });
  } catch {
    // 拉取失败时保留旧值，避免页面闪烁；下次 onShow 重试
  }
}

/** 退出登录时清空，避免串家庭数据 */
export function resetMealSession(): void {
  state = {
    meals: [],
    date: getShanghaiDateStr(),
    manualMealId: null,
    loaded: false,
    familyId: null,
    tick: state.tick + 1,
  };
  emit();
}
