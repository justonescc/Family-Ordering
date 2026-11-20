import { describe, expect, it } from 'vitest';
import {
  getShanghaiDateStr,
  getShanghaiParts,
  isInWindow,
  parseHHmm,
  resolveCurrentMeal,
} from '../../src/utils/shanghai';

describe('上海时区工具', () => {
  it('按上海时区取日历日（UTC 2026-11-20 17:30 = 上海 11-21 01:30）', () => {
    const date = new Date('2026-11-20T17:30:00Z');
    expect(getShanghaiDateStr(date)).toBe('2026-11-21');
    expect(getShanghaiParts(date).minutes).toBe(90);
  });

  it('上海正午对应 UTC 04:00', () => {
    const date = new Date('2026-11-20T04:00:00Z');
    expect(getShanghaiDateStr(date)).toBe('2026-11-20');
    expect(getShanghaiParts(date).minutes).toBe(720);
  });

  it('解析 HH:mm', () => {
    expect(parseHHmm('09:30')).toBe(570);
    expect(parseHHmm('00:00')).toBe(0);
    expect(parseHHmm('23:59')).toBe(1439);
    expect(parseHHmm('24:00')).toBeNull();
    expect(parseHHmm('9:3')).toBeNull();
  });

  it('常规时间窗为 [start, end)', () => {
    expect(isInWindow(600, 570, 720)).toBe(true);
    expect(isInWindow(570, 570, 720)).toBe(true);
    expect(isInWindow(720, 570, 720)).toBe(false);
    expect(isInWindow(569, 570, 720)).toBe(false);
  });

  it('跨午夜时间窗（21:00 - 01:00）', () => {
    expect(isInWindow(1260, 1260, 60)).toBe(true); // 21:00
    expect(isInWindow(1439, 1260, 60)).toBe(true); // 23:59
    expect(isInWindow(0, 1260, 60)).toBe(true); // 00:00
    expect(isInWindow(59, 1260, 60)).toBe(true); // 00:59
    expect(isInWindow(60, 1260, 60)).toBe(false); // 01:00
    expect(isInWindow(600, 1260, 60)).toBe(false); // 10:00
  });

  it('零长度窗口不生效', () => {
    expect(isInWindow(600, 600, 600)).toBe(false);
  });

  it('resolveCurrentMeal：命中窗口，重叠时取 sort 最小', () => {
    const meals = [
      { id: 'a', name: '午餐', startTime: '11:00', endTime: '14:59', sort: 1, enabled: true },
      { id: 'b', name: '夜宵', startTime: '21:00', endTime: '01:00', sort: 2, enabled: true },
      { id: 'c', name: '停用', startTime: '00:00', endTime: '23:59', sort: 0, enabled: false },
    ];
    // 上海 12:00 = UTC 04:00
    expect(resolveCurrentMeal(meals, new Date('2026-11-20T04:00:00Z'))?.id).toBe('a');
    // 上海 22:00 = UTC 14:00
    expect(resolveCurrentMeal(meals, new Date('2026-11-20T14:00:00Z'))?.id).toBe('b');
    // 上海 16:00 无命中
    expect(resolveCurrentMeal(meals, new Date('2026-11-20T08:00:00Z'))).toBeNull();
  });
});
