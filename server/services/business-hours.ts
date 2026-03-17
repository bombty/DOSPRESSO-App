import { db } from "../db";
import { slaBusinessHours } from "@shared/schema";

export interface BusinessHoursConfig {
  startHour: number;
  endHour: number;
  workDays: number[];
  timezone: string;
}

const DEFAULT_CONFIG: BusinessHoursConfig = {
  startHour: 8,
  endHour: 18,
  workDays: [1, 2, 3, 4, 5],
  timezone: 'Europe/Istanbul',
};

export async function getBusinessHoursConfig(): Promise<BusinessHoursConfig> {
  try {
    const [row] = await db.select().from(slaBusinessHours).limit(1);
    if (!row) return DEFAULT_CONFIG;
    return {
      startHour: row.startHour,
      endHour: row.endHour,
      workDays: row.workDays,
      timezone: row.timezone,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function toTimezone(date: Date, timezone: string): { year: number; month: number; day: number; hour: number; minute: number; dayOfWeek: number } {
  const str = date.toLocaleString('en-US', { timeZone: timezone, hour12: false });
  const parts = str.split(', ');
  const [monthStr, dayStr, yearStr] = parts[0].split('/');
  const [hourStr, minuteStr] = parts[1].split(':');
  const d = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  return {
    year: parseInt(yearStr),
    month: parseInt(monthStr),
    day: parseInt(dayStr),
    hour: parseInt(hourStr) % 24,
    minute: parseInt(minuteStr),
    dayOfWeek: d.getDay(),
  };
}

function createDateInTimezone(year: number, month: number, day: number, hour: number, minute: number, timezone: string): Date {
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00`;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });

  const target = new Date(dateStr + 'Z');
  const tzParts = toTimezone(target, timezone);
  const diffMs = (tzParts.hour * 60 + tzParts.minute) - (hour * 60 + minute);
  target.setTime(target.getTime() - diffMs * 60 * 1000);

  const verify = toTimezone(target, timezone);
  if (verify.hour !== hour || verify.day !== day) {
    const adjust = ((hour - verify.hour) * 60 + (minute - verify.minute)) * 60 * 1000;
    target.setTime(target.getTime() + adjust);
  }

  return target;
}

export function addBusinessHours(startDate: Date, hours: number, config: BusinessHoursConfig): Date {
  const { startHour, endHour, workDays, timezone } = config;
  const businessDayMinutes = (endHour - startHour) * 60;
  let remainingMinutes = hours * 60;

  let tz = toTimezone(startDate, timezone);
  let { year, month, day, hour, minute, dayOfWeek } = tz;

  const jsToIso = (d: number) => d === 0 ? 7 : d;
  let isoDay = jsToIso(dayOfWeek);

  if (!workDays.includes(isoDay) || hour >= endHour) {
    ({ year, month, day, hour, minute, isoDay } = advanceToNextBusinessDay(year, month, day, isoDay, startHour, 0, workDays));
  } else if (hour < startHour) {
    hour = startHour;
    minute = 0;
  }

  while (remainingMinutes > 0) {
    const minutesLeftToday = (endHour * 60) - (hour * 60 + minute);

    if (remainingMinutes <= minutesLeftToday) {
      minute += remainingMinutes;
      hour += Math.floor(minute / 60);
      minute = minute % 60;
      remainingMinutes = 0;
    } else {
      remainingMinutes -= minutesLeftToday;
      ({ year, month, day, hour, minute, isoDay } = advanceToNextBusinessDay(year, month, day, isoDay, startHour, 0, workDays));
    }
  }

  return createDateInTimezone(year, month, day, hour, minute, timezone);
}

function advanceToNextBusinessDay(
  year: number, month: number, day: number, isoDay: number,
  startHour: number, startMinute: number, workDays: number[]
): { year: number; month: number; day: number; hour: number; minute: number; isoDay: number } {
  for (let i = 0; i < 400; i++) {
    const nextDate = new Date(year, month - 1, day + 1);
    year = nextDate.getFullYear();
    month = nextDate.getMonth() + 1;
    day = nextDate.getDate();
    isoDay = isoDay % 7 + 1;
    if (isoDay > 7) isoDay = 1;

    const jsDow = nextDate.getDay();
    isoDay = jsDow === 0 ? 7 : jsDow;

    if (workDays.includes(isoDay)) {
      return { year, month, day, hour: startHour, minute: startMinute, isoDay };
    }
  }
  return { year, month, day, hour: startHour, minute: startMinute, isoDay };
}

export function getRemainingBusinessHours(deadline: Date, now: Date, config: BusinessHoursConfig): number {
  const { startHour, endHour, workDays, timezone } = config;

  if (deadline.getTime() <= now.getTime()) return 0;

  let totalMinutes = 0;
  let tz = toTimezone(now, timezone);
  let { year, month, day, hour, minute, dayOfWeek } = tz;
  const jsToIso = (d: number) => d === 0 ? 7 : d;
  let isoDay = jsToIso(dayOfWeek);

  const deadlineTz = toTimezone(deadline, timezone);

  if (!workDays.includes(isoDay)) {
    const next = advanceToNextBusinessDay(year, month, day, isoDay, startHour, 0, workDays);
    year = next.year; month = next.month; day = next.day;
    hour = next.hour; minute = next.minute; isoDay = next.isoDay;
  } else if (hour < startHour) {
    hour = startHour;
    minute = 0;
  } else if (hour >= endHour) {
    const next = advanceToNextBusinessDay(year, month, day, isoDay, startHour, 0, workDays);
    year = next.year; month = next.month; day = next.day;
    hour = next.hour; minute = next.minute; isoDay = next.isoDay;
  }

  for (let safety = 0; safety < 500; safety++) {
    if (year === deadlineTz.year && month === deadlineTz.month && day === deadlineTz.day) {
      const endMin = Math.min(deadlineTz.hour * 60 + deadlineTz.minute, endHour * 60);
      const startMin = hour * 60 + minute;
      if (endMin > startMin) {
        totalMinutes += endMin - startMin;
      }
      break;
    }

    if (year > deadlineTz.year || (year === deadlineTz.year && month > deadlineTz.month) ||
        (year === deadlineTz.year && month === deadlineTz.month && day > deadlineTz.day)) {
      break;
    }

    const minutesLeftToday = (endHour * 60) - (hour * 60 + minute);
    if (minutesLeftToday > 0) totalMinutes += minutesLeftToday;

    const next = advanceToNextBusinessDay(year, month, day, isoDay, startHour, 0, workDays);
    year = next.year; month = next.month; day = next.day;
    hour = next.hour; minute = next.minute; isoDay = next.isoDay;
  }

  return Math.max(0, totalMinutes / 60);
}

export function getElapsedBusinessHours(start: Date, end: Date, config: BusinessHoursConfig): number {
  if (end.getTime() <= start.getTime()) return 0;
  return getRemainingBusinessHours(end, start, config);
}

export function isWithinBusinessHours(date: Date, config: BusinessHoursConfig): boolean {
  const tz = toTimezone(date, config.timezone);
  const jsToIso = (d: number) => d === 0 ? 7 : d;
  const isoDay = jsToIso(tz.dayOfWeek);
  if (!config.workDays.includes(isoDay)) return false;
  if (tz.hour < config.startHour || tz.hour >= config.endHour) return false;
  return true;
}
