import type { Meal } from '../types';

export const SHANGHAI_TZ = 'Asia/Shanghai';

/** 上海时区的日历日（YYYY-MM-DD） */
export function getShanghaiDateStr(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SHANGHAI_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }
  return `${map.year}-${map.month}-${map.day}`;
}

export function getShanghaiMinutes(date: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SHANGHAI_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }
  let hour = Number(map.hour);
  if (hour === 24) hour = 0;
  return hour * 60 + Number(map.minute);
}

/** 解析 HH:mm 为分钟数；非法返回 null */
export function parseHHmm(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** 判断分钟数是否落在时间窗内；支持跨午夜（start > end） */
export function isInWindow(minutes: number, start: number, end: number): boolean {
  if (start === end) return false;
  if (start < end) return minutes >= start && minutes < end;
  return minutes >= start || minutes < end;
}

/** 从启用餐次中解析当前餐次；重叠取 sort 最小；无命中返回 null */
export function resolveCurrentMeal(meals: Meal[], date: Date = new Date()): Meal | null {
  const minutes = getShanghaiMinutes(date);
  const hits = meals.filter((meal) => {
    if (!meal.enabled) return false;
    const start = parseHHmm(meal.startTime);
    const end = parseHHmm(meal.endTime);
    if (start === null || end === null) return false;
    return isInWindow(minutes, start, end);
  });
  hits.sort((a, b) => a.sort - b.sort);
  return hits[0] ?? null;
}
