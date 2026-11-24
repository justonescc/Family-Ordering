import type { Meal } from '../types';

/**
 * 上海时区（Asia/Shanghai，固定 UTC+8，无夏令时）工具。
 * 移植自 H5 frontend/src/utils/meal.ts，但不用 Intl.DateTimeFormat：
 * 小程序 JS 环境（iOS JavaScriptCore / Android V8）的 ICU 数据不完整，
 * 统一用 UTC + 8h 偏移计算，结果等价且跨端一致。
 * 禁止 new Date('YYYY-MM-DD') 之类的本地时区解析（与 H5 同一条红线）。
 */

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;

interface ShanghaiParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/** 取上海时区的年月日时分 */
function getShanghaiParts(date: Date = new Date()): ShanghaiParts {
  const shifted = new Date(date.getTime() + SHANGHAI_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

/** 上海时区的日历日（YYYY-MM-DD） */
export function getShanghaiDateStr(date: Date = new Date()): string {
  const { year, month, day } = getShanghaiParts(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** 上海时区的当天分钟数（0-1439） */
export function getShanghaiMinutes(date: Date = new Date()): number {
  const { hour, minute } = getShanghaiParts(date);
  return hour * 60 + minute;
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

/** 从启用餐次中解析当前餐次；重叠取 sort 最小；无命中返回 null。meals 容忍 undefined（启动瞬态防御） */
export function resolveCurrentMeal(meals: Meal[] | undefined | null, date: Date = new Date()): Meal | null {
  const minutes = getShanghaiMinutes(date);
  const hits = (meals ?? []).filter((meal) => {
    if (!meal.enabled) return false;
    const start = parseHHmm(meal.startTime);
    const end = parseHHmm(meal.endTime);
    if (start === null || end === null) return false;
    return isInWindow(minutes, start, end);
  });
  hits.sort((a, b) => a.sort - b.sort);
  return hits[0] ?? null;
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** YYYY-MM-DD → 「11月23日 周日」（对齐 H5 点菜页头日期文案） */
export function getDateLabel(dateStr: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return dateStr;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${month}月${day}日 ${WEEKDAYS[weekday]}`;
}
