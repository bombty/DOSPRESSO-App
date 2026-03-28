import { db } from "../db";
import { pdksRecords, scheduledOffs, leaveRequests, shifts } from "@shared/schema";
import { eq, and, gte, lte, sql, isNull } from "drizzle-orm";

export interface DayClassification {
  date: string;
  status: 'worked' | 'program_off' | 'kapanish_off' | 'absent' | 'no_shift' | 'unpaid_leave' | 'sick_leave' | 'annual_leave';
  records: { time: string; type: string; source: string | null }[];
  workedMinutes: number;
  overtimeMinutes: number;
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
  plannedMinutes?: number // undefined = vardiya planlanmamış, number = planlanan süre
): DayClassification {
  const base = { date: dateStr, records: dayRecords, workedMinutes: 0, overtimeMinutes: 0 };
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
      const overtimeMinutes = Math.max(0, workedMinutes - effectivePlannedMinutes);
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

  const [records, offs, leaves, userShifts] = await Promise.all([
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
  ]);

  const offSet = new Set(offs.map(o => o.offDate));

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

    days.push(classifyDay(dateStr, dayRecords, isOff, leaveType, shiftMinutesMap.get(dateStr)));
  }

  const workedDays = days.filter(d => d.status === 'worked').length;
  const offDays = days.filter(d => ['program_off', 'kapanish_off', 'no_shift'].includes(d.status)).length;
  const absentDays = days.filter(d => d.status === 'absent').length;
  const unpaidLeaveDays = days.filter(d => d.status === 'unpaid_leave').length;
  const sickLeaveDays = days.filter(d => d.status === 'sick_leave').length;
  const annualLeaveDays = days.filter(d => d.status === 'annual_leave').length;
  const totalOvertimeMinutes = days.reduce((sum, d) => sum + d.overtimeMinutes, 0);

  return {
    userId, year, month, days,
    workedDays, offDays, absentDays,
    unpaidLeaveDays, sickLeaveDays, annualLeaveDays,
    totalOvertimeMinutes
  };
}
