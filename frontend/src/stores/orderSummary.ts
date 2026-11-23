import { create } from 'zustand';

interface OrderSummaryState {
  /** 当前餐次已点份数 */
  count: number;
  /** 对应餐次标识（mealId|date），避免不同餐次串数据 */
  mealKey: string;
  setCount: (mealKey: string, count: number) => void;
}

/** 跨 Tab 共享「已点份数」，用于点菜页常驻摘要条 */
export const useOrderSummary = create<OrderSummaryState>((set) => ({
  count: 0,
  mealKey: '',
  setCount: (mealKey, count) =>
    set((s) => (s.mealKey === mealKey && s.count === count ? s : { mealKey, count })),
}));
