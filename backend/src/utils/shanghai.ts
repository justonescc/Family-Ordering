/**
 * 上海时区工具。
 *
 * 红线：禁止 `new Date('YYYY-MM-DD')`、`toISOString().split('T')` 这类
 * 依赖运行时时区的写法（UTC 与 Asia/Shanghai 相差 8 小时，曾导致日期错位）。
 * 所有「今天是哪天」「现在属于哪个餐次」的判断都必须走这里。
 */

export const SHANGHAI_TZ = 'Asia/Shanghai';

export interface ShanghaiParts {
  /** YYYY-MM-DD（上海时区的日历日） */
  dateStr: string;
  /** 当天已过去的分钟数（0-1439） */
  minutes: number;
}

export function getShanghaiParts(date: Date = new Date()): ShanghaiParts {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SHANGHAI_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const map: Record<string, string> = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }

  // 部分环境午夜会格式化为 "24"，归一化为 0
  let hour = Number(map.hour);
  if (hour === 24) hour = 0;

  return {
    dateStr: `${map.year}-${map.month}-${map.day}`,
    minutes: hour * 60 + Number(map.minute),
  };
}

export function getShanghaiDateStr(date: Date = new Date()): string {
  return getShanghaiParts(date).dateStr;
}

/** 把 YYYY-MM-DD 转为 Prisma @db.Date 使用的 UTC 零点 Date */
export function dateStrToDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** 解析 HH:mm 为分钟数；非法返回 null */
export function parseHHmm(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * 判断分钟数是否落在时间窗内。
 * start < end：常规窗口 [start, end)
 * start > end：跨午夜窗口（如 21:00 - 01:00）
 * start === end：零长度窗口，视为不生效
 */
export function isInWindow(minutes: number, start: number, end: number): boolean {
  if (start === end) return false;
  if (start < end) return minutes >= start && minutes < end;
  return minutes >= start || minutes < end;
}

export interface MealWindowLike {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  sort: number;
  enabled: boolean;
}

/**
 * 从家庭已启用的餐次中解析「当前餐次」。
 * 多个时间窗重叠时取 sort 最小者；无命中返回 null（非点菜时段）。
 */
export function resolveCurrentMeal(
  meals: MealWindowLike[],
  date: Date = new Date(),
): MealWindowLike | null {
  const { minutes } = getShanghaiParts(date);

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
