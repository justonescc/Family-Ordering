import { describe, expect, it } from 'vitest';
import { getShanghaiDateStr, getShanghaiMinutes, isInWindow, parseHHmm, resolveCurrentMeal } from './meal';
import type { Meal } from '../types';

describe('前端餐次工具', () => {
  it('上海日历日', () => {
    expect(getShanghaiDateStr(new Date('2026-11-20T17:30:00Z'))).toBe('2026-11-21');
    expect(getShanghaiDateStr(new Date('2026-11-20T04:00:00Z'))).toBe('2026-11-20');
  });

  it('上海分钟数', () => {
    expect(getShanghaiMinutes(new Date('2026-11-20T04:00:00Z'))).toBe(720);
  });

  it('解析与窗口判定', () => {
    expect(parseHHmm('21:00')).toBe(1260);
    expect(parseHHmm('9:30')).toBeNull();
    expect(isInWindow(1300, 1260, 60)).toBe(true);
    expect(isInWindow(600, 1260, 60)).toBe(false);
  });

  it('当前餐次解析', () => {
    const meals: Meal[] = [
      { id: 'a', name: '午餐', startTime: '11:00', endTime: '14:59', sort: 1, enabled: true },
      { id: 'b', name: '夜宵', startTime: '21:00', endTime: '01:00', sort: 2, enabled: true },
      { id: 'c', name: '全天', startTime: '00:00', endTime: '23:59', sort: 0, enabled: false },
    ];
    expect(resolveCurrentMeal(meals, new Date('2026-11-20T04:00:00Z'))?.id).toBe('a');
    expect(resolveCurrentMeal(meals, new Date('2026-11-20T14:00:00Z'))?.id).toBe('b');
    expect(resolveCurrentMeal(meals, new Date('2026-11-20T08:00:00Z'))).toBeNull();
  });
});
