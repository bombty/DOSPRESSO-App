import { db } from "../db";
import { pdksRecords, scheduledOffs, leaveRequests, shifts, publicHolidays } from "@shared/schema";
import { eq, and, gte, lte, sql, isNull } from "drizzle-orm";

export interface DayClassification {
  date: string;
  status: 'worked' | 'program_off' | 'kapanish_off' | 'absent' | 'no_shift' | 'unpaid_leave' | 'sick_leave' | 'annual_leave';
  records: { time: string; type: string; source: string | null }[];
  workedMinutes: number;
  overtimeMinutes: number;
  isHoliday: boolean;
  holidayName?: string;
}

export interface PdksMonthSummary {
  userId: string;
  year: number;
  month: number;
  days: DayClassification[];
  workedDays: number;
  offDays: number;
  absentDays: number;
  unpaidLeaveDays: number;
  sickLeaveDays: number;
  annualLeaveDays: number;
  totalOvertimeMinutes: number;
  holidayWorkedDays: number;
}

function timeDiffMinutes(time1: string, time2: string): number {
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);
  return (h2 * 60 + m2) - (h1 * 60 + m1);
}

function calculateWorkedMinutes(records: { time: string; type: string }[]): number {
  const sorted = [...records].sort((a, b) => a.time.localeCompare(b.time));
  let total = 0;

  let i = 0;
  while (i < sorted.length) {
    if (sorted[i].type === 'giris') {
      const exitIdx = sorted.findIndex((r, j) => j > i && r.type === 'cikis');
      if (exitIdx !== -1) {
        const diff = timeDiffMinutes(sorted[i].time, sorted[exitIdx].time);
        if (diff > 0) total += diff;
        i = exitIdx + 1;
      } else {
        break;
      }
    } else {
      i++;
    }
  }

  return total;
}

export function classifyDay(
  dateStr: string,
  dayRecords: { time: string; type: string; source: string | null }[],
  isScheduledOff: boolean,
  leaveType: string | null,
  plannedMinutes?: number, // undefined = vardiya planlanmamış, number = planlanan süre
  holidayInfo?: { isHoliday: boolean; name?: string }
): DayClassification {
  const holiday = holidayInfo ?? { isHoliday: false };
  const base = { date: dateStr, records: dayRecords, workedMinutes: 0, overtimeMinutes: 0, isHoliday: holiday.isHoliday, holidayName: holiday.name };
  const hasPlannedShift = plannedMinutes !== undefined;
  const effectivePlannedMinutes = plannedMinutes ?? 480;

  if (leaveType) {
    if (leaveType === 'unpaid') return { ...base, status: 'unpaid_leave' };
    if (leaveType === 'sick') return { ...base, status: 'sick_leave' };
    if (leaveType === 'annual' || leaveType === 'personal') return { ...base, status: 'annual_leave' };
  }

  if (dayRecords.length === 0) {
    if (isScheduledOff) return { ...base, status: 'program_off' };
    // BUG2 FIX: Vardiya planlanmamışsa "absent" DEĞİL "no_shift"
    // Absent = vardiya planlanmış AMA gelmemiş
    // No_shift = zaten o gün vardiyası yok
    if (!hasPlannedShift) return { ...base, status: 'no_shift' };
    return { ...base, status: 'absent' };
  }

  const allNightStamps = dayRecords.every(r => {
    const hour = parseInt(r.time.split(':')[0]);
    return hour >= 0 && hour < 6;
  });

  if (allNightStamps && dayRecords.length > 0) {
    return { ...base, status: 'kapanish_off' };
  }

  const hasWorkStamp = dayRecords.some(r => {
    const hour = parseInt(r.time.split(':')[0]);
    return hour >= 6;
  });

  if (hasWorkStamp) {
    const workedMinutes = calculateWorkedMinutes(dayRecords);
    if (workedMinutes > 0) {
      const rawOvertime = Math.max(0, workedMinutes - effectivePlannedMinutes);
      // FM eşiği: 30 dakika altı fazla mesai sayılmaz (DOSPRESSO iç kuralı)
      const overtimeMinutes = rawOvertime >= 30 ? rawOvertime : 0;
      return { ...base, status: 'worked', workedMinutes, overtimeMinutes };
    }
    const hasGiris = dayRecords.some(r => r.type === 'giris');
    if (hasGiris) {
      return { ...base, status: 'worked', workedMinutes: 0, overtimeMinutes: 0 };
    }
  }

  if (isScheduledOff) return { ...base, status: 'program_off' };
  return { ...base, status: 'absent' };
}

export async function getMonthClassification(
  userId: string,
  year: number,
  month: number
): Promise<PdksMonthSummary> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const daysInMonth = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  const [records, offs, leaves, userShifts, holidays] = await Promise.all([
    db.select({
      recordDate: pdksRecords.recordDate,
      recordTime: pdksRecords.recordTime,
      recordType: pdksRecords.recordType,
      source: pdksRecords.source,
    })
    .from(pdksRecords)
    .where(and(
      eq(pdksRecords.userId, userId),
      gte(pdksRecords.recordDate, startDate),
      lte(pdksRecords.recordDate, endDate)
    )),

    db.select({ offDate: scheduledOffs.offDate })
    .from(scheduledOffs)
    .where(and(
      eq(scheduledOffs.userId, userId),
      gte(scheduledOffs.offDate, startDate),
      lte(scheduledOffs.offDate, endDate)
    )),

    db.select({
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      leaveType: leaveRequests.leaveType,
      status: leaveRequests.status,
    })
    .from(leaveRequests)
    .where(and(
      eq(leaveRequests.userId, userId),
      eq(leaveRequests.status, 'approved'),
      lte(leaveRequests.startDate, endDate),
      gte(leaveRequests.endDate, startDate)
    )),

    // P2.1: Fetch planned shifts to calculate correct overtime threshold
    db.select({
      shiftDate: shifts.shiftDate,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
    })
    .from(shifts)
    .where(and(
      eq(shifts.assignedToId, userId),
      gte(shifts.shiftDate, startDate),
      lte(shifts.shiftDate, endDate),
      isNull(shifts.deletedAt),
    )),

    // Resmi tatiller
    db.select({
      date: publicHolidays.date,
      name: publicHolidays.name,
      isHalfDay: publicHolidays.isHalfDay,
    })
    .from(publicHolidays)
    .where(and(
      eq(publicHolidays.year, year),
      eq(publicHolidays.isActive, true),
    )),
  ]);

  const offSet = new Set(offs.map(o => o.offDate));

  // Tatil haritası: tarih → { isHoliday, name }
  const holidayMap = new Map<string, { isHoliday: boolean; name: string }>();
  for (const h of holidays) {
    holidayMap.set(h.date, { isHoliday: true, name: h.name });
  }

  // Build date → planned shift minutes map
  const shiftMinutesMap = new Map<string, number>();
  for (const s of userShifts) {
    if (s.startTime && s.endTime) {
      const [startH, startM] = s.startTime.split(':').map(Number);
      const [endH, endM] = s.endTime.split(':').map(Number);
      let duration = (endH * 60 + endM) - (startH * 60 + startM);
      if (duration < 0) duration += 24 * 60; // Gece vardiyası
      shiftMinutesMap.set(s.shiftDate, duration);
    }
  }

  const days: DayClassification[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const dayRecords = records
      .filter(r => r.recordDate === dateStr)
      .map(r => ({ time: r.recordTime, type: r.recordType, source: r.source }));

    const isOff = offSet.has(dateStr);

    let leaveType: string | null = null;
    for (const leave of leaves) {
      if (dateStr >= leave.startDate && dateStr <= leave.endDate) {
        leaveType = leave.leaveType;
        break;
      }
    }

    days.push(classifyDay(dateStr, dayRecords, isOff, leaveType, shiftMinutesMap.get(dateStr), holidayMap.get(dateStr)));
  }

  const workedDays = days.filter(d => d.status === 'worked').length;
  const offDays = days.filter(d => ['program_off', 'kapanish_off', 'no_shift'].includes(d.status)).length;
  const absentDays = days.filter(d => d.status === 'absent').length;
  const unpaidLeaveDays = days.filter(d => d.status === 'unpaid_leave').length;
  const sickLeaveDays = days.filter(d => d.status === 'sick_leave').length;
  const annualLeaveDays = days.filter(d => d.status === 'annual_leave').length;
  const totalOvertimeMinutes = days.reduce((sum, d) => sum + d.overtimeMinutes, 0);
  const holidayWorkedDays = days.filter(d => d.status === 'worked' && d.isHoliday).length;

  return {
    userId, year, month, days,
    workedDays, offDays, absentDays,
    unpaidLeaveDays, sickLeaveDays, annualLeaveDays,
    totalOvertimeMinutes, holidayWorkedDays
  };
}

// ═══════════════════════════════════════════════════════════════════
// Sprint 15 (S15.3) — Haftalık 45h Kontrol (İş Kanunu m.63)
// ═══════════════════════════════════════════════════════════════════
//
// Fulltime: 45h/hafta üst sınır (m.63)
// Parttime: pozisyon tanımlı saat (genelde 30h/hafta)
//
// users.employmentType bilinmiyorsa fulltime varsayılır.
// İhlal durumunda result.violation: true olur.
// ═══════════════════════════════════════════════════════════════════

export interface WeeklyHourCheckResult {
  userId: string;
  weekStart: string;  // YYYY-MM-DD (Pazartesi)
  weekEnd: string;    // YYYY-MM-DD (Pazar)
  employmentType: 'fulltime' | 'parttime' | 'intern' | 'unknown';
  weeklyHourLimit: number;     // dk cinsinden (fulltime: 2700, parttime: 1800)
  actualWorkedMinutes: number; // gerçek çalışma
  overLimitMinutes: number;    // sınır aşımı (negatifse 0)
  underLimitMinutes: number;   // sınırın altı (parttime için anlamlı)
  violation: boolean;          // sınır aşımı varsa true
  legalReference: string;      // 'İş K. m.63'
}

export async function getWeeklyHourCheck(
  userId: string,
  weekStartIso: string  // ISO date: monday of the week
): Promise<WeeklyHourCheckResult> {
  const { users } = await import("@shared/schema");

  // User'ın employmentType'ını al
  const [user] = await db
    .select({ id: users.id, employmentType: (users as any).employmentType })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const empType: 'fulltime' | 'parttime' | 'intern' | 'unknown' =
    user?.employmentType === 'parttime' ? 'parttime' :
    user?.employmentType === 'intern'   ? 'intern' :
    user?.employmentType === 'fulltime' ? 'fulltime' :
    'unknown';

  // Sınır (dk)
  const weeklyHourLimit =
    empType === 'parttime' ? 30 * 60 :   // 1800 dk
    empType === 'intern'   ? 40 * 60 :   // 2400 dk
    45 * 60;                              // 2700 dk (fulltime + unknown default)

  const weekStart = new Date(weekStartIso);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  // Bu hafta günlerinden classifyDay topla
  let actualWorkedMinutes = 0;
  const cursor = new Date(weekStart);
  while (cursor <= weekEnd) {
    const dateStr = cursor.toISOString().split('T')[0];
    try {
      const day = await classifyDay(dateStr, userId);
      if (day.status === 'worked') {
        actualWorkedMinutes += day.workedMinutes;
      }
    } catch (e) {
      console.warn(`[pdks-engine] classifyDay failed for ${userId} ${dateStr}:`, e);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  const overLimitMinutes = Math.max(0, actualWorkedMinutes - weeklyHourLimit);
  const underLimitMinutes = Math.max(0, weeklyHourLimit - actualWorkedMinutes);
  const violation = overLimitMinutes > 0;

  return {
    userId,
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    employmentType: empType,
    weeklyHourLimit,
    actualWorkedMinutes,
    overLimitMinutes,
    underLimitMinutes,
    violation,
    legalReference: 'İş Kanunu m.63 (45h/hafta fulltime, 30h/hafta parttime üst sınırı)',
  };
}

// Birden fazla personel için toplu hafta kontrolü (rapor için)
export async function getWeeklyHourCheckBulk(
  userIds: string[],
  weekStartIso: string
): Promise<WeeklyHourCheckResult[]> {
  const results: WeeklyHourCheckResult[] = [];
  for (const userId of userIds) {
    try {
      const r = await getWeeklyHourCheck(userId, weekStartIso);
      results.push(r);
    } catch (e: any) {
      console.warn(`[pdks-engine] getWeeklyHourCheck failed for ${userId}:`, e.message);
    }
  }
  return results;
}
