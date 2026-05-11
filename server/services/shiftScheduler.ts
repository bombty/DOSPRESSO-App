import { format, parseISO, addDays, isAfter, isBefore } from "date-fns";

interface Employee {
  id: string;
  name: string;
  role: string;
  employmentType: 'fulltime' | 'parttime' | 'stajyer';
}

interface ExistingShift {
  assignedToId: string | null;
  shiftDate: string;
  startTime: string;
  endTime: string;
}

interface ShiftRecommendation {
  employeeId: string;
  employeeName: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  fairnessScore: number;
}

export interface BreakTimeResult {
  breakStart: string;
  breakEnd: string;
}

export interface BreakValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ShiftWithBreak {
  userId: string;
  userName?: string;
  branchId: number;
  date: string;
  startTime: string;
  endTime: string;
  breakStartTime: string;
  breakEndTime: string;
  breakDurationMinutes: number;
  isOff: boolean;
  shiftType: 'opening' | 'standard' | 'closing' | 'off';
  dayOfWeek: number;
}

export interface WeeklyPlanResult {
  plan: ShiftWithBreak[];
  weeklyHours: Record<string, number>;
  validation: BreakValidationResult;
  staffCount: number;
  offDaysSummary: Record<string, number>;
}

function timeToMinutes(time: string): number {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export class ShiftScheduler {
  private static calculateHours(startTime: string, endTime: string): number {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return (endMinutes - startMinutes) / 60;
  }

  private static getWeeklyHours(
    employeeId: string,
    weekStart: string,
    existingShifts: ExistingShift[]
  ): number {
    const weekStartDate = parseISO(weekStart);
    const weekEndDate = addDays(weekStartDate, 6);
    
    return existingShifts
      .filter((s) => {
        if (s.assignedToId !== employeeId) return false;
        const shiftDate = parseISO(s.shiftDate);
        return !isBefore(shiftDate, weekStartDate) && !isAfter(shiftDate, weekEndDate);
      })
      .reduce((total, s) => total + this.calculateHours(s.startTime, s.endTime), 0);
  }

  private static getWeeklyDays(
    employeeId: string,
    weekStart: string,
    existingShifts: ExistingShift[]
  ): number {
    const weekStartDate = parseISO(weekStart);
    const weekEndDate = addDays(weekStartDate, 6);
    
    const daysSet = new Set<string>();
    existingShifts
      .filter((s) => {
        if (s.assignedToId !== employeeId) return false;
        const shiftDate = parseISO(s.shiftDate);
        return !isBefore(shiftDate, weekStartDate) && !isAfter(shiftDate, weekEndDate);
      })
      .forEach((s) => daysSet.add(s.shiftDate));
    
    return daysSet.size;
  }

  static calculateBreakTime(
    shiftStart: string,
    shiftEnd: string,
    existingBreaks: { start: string; end: string }[],
    breakDuration: number = 60
  ): BreakTimeResult {
    const startMinutes = timeToMinutes(shiftStart);
    const endMinutes = timeToMinutes(shiftEnd);
    const shiftDuration = endMinutes - startMinutes;

    if (shiftDuration < 360) {
      return { breakStart: '', breakEnd: '' };
    }

    const earliestBreak = startMinutes + 210;
    const latestBreak = startMinutes + 300;

    for (let candidate = earliestBreak; candidate <= latestBreak; candidate += 10) {
      const candidateEnd = candidate + breakDuration;

      if (candidateEnd > endMinutes) continue;

      const hasConflict = existingBreaks.some(existing => {
        if (!existing.start || !existing.end) return false;
        const existStart = timeToMinutes(existing.start);
        const existEnd = timeToMinutes(existing.end);
        return !(candidateEnd + 10 <= existStart || candidate >= existEnd + 10);
      });

      if (!hasConflict) {
        return {
          breakStart: minutesToTime(candidate),
          breakEnd: minutesToTime(candidateEnd),
        };
      }
    }

    const mid = Math.floor((startMinutes + endMinutes) / 2) - 30;
    return {
      breakStart: minutesToTime(mid),
      breakEnd: minutesToTime(mid + breakDuration),
    };
  }

  static validateBreakSchedule(
    shifts: Array<{
      userId: string;
      startTime: string;
      endTime: string;
      breakStart: string;
      breakEnd: string;
      isOff: boolean;
    }>,
    branchSize: 'small' | 'medium' | 'large' = 'small'
  ): BreakValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Sprint 19.2 HOTFIX-5 (Aslan 12 May): Medium branch (7-12 personel) için
    // aynı anda max 2 kişi mola yapabilmeli. 'large' için 3.
    // Önce: medium=1 (aşırı kısıtlayıcı, 10 personel ile %75 violation)
    const maxSimultaneous = branchSize === 'large' ? 3 : branchSize === 'medium' ? 2 : 1;
    const minGapMinutes = 10;

    const activeShifts = shifts.filter(s => !s.isOff && s.breakStart);

    const sorted = [...activeShifts].sort((a, b) =>
      timeToMinutes(a.breakStart) - timeToMinutes(b.breakStart)
    );

    for (let i = 0; i < sorted.length; i++) {
      let simultaneous = 1;
      const iStart = timeToMinutes(sorted[i].breakStart);
      const iEnd = timeToMinutes(sorted[i].breakEnd);

      for (let j = i + 1; j < sorted.length; j++) {
        const jStart = timeToMinutes(sorted[j].breakStart);
        const jEnd = timeToMinutes(sorted[j].breakEnd);

        if (jStart < iEnd && jEnd > iStart) {
          simultaneous++;
        }
      }

      if (simultaneous > maxSimultaneous) {
        errors.push(`Saat ${sorted[i].breakStart}'da ${simultaneous} kişi aynı anda molada — max ${maxSimultaneous}`);
      }
    }

    for (let i = 0; i < sorted.length - 1; i++) {
      const currentEnd = timeToMinutes(sorted[i].breakEnd);
      const nextStart = timeToMinutes(sorted[i + 1].breakStart);
      const gap = nextStart - currentEnd;

      if (gap < minGapMinutes && gap >= 0) {
        warnings.push(`${sorted[i].breakStart} ve ${sorted[i + 1].breakStart} molaları arası ${gap}dk — min 10dk olmalı`);
      }
    }

    const minOnFloor = branchSize === 'small' ? 1 : 2;

    // Sprint 19.2 HOTFIX-5: Slot boundary fix
    // Açılış öncesi (sadece 1 opening personeli) ve kapanış sonrası (sadece 1 closing) slot'larında
    // 'min 2 kişi' kuralı false positive verir. Bu slot'lar opening/closing window'ları —
    // tek personel doğru pattern. Sadece 'core hours' içinde kontrol et.
    const startTimes = activeShifts.map(s => timeToMinutes(s.startTime)).sort((a, b) => a - b);
    const endTimes = activeShifts.map(s => timeToMinutes(s.endTime)).sort((a, b) => a - b);

    // Core hours: 2. erkenci shift'in başlangıcı → 2. son shift'in bitişi
    // (yani açılış/kapanış için tek personel pattern'i dışlanır)
    const coreStart = startTimes[Math.min(1, startTimes.length - 1)] || startTimes[0];
    const coreEnd = endTimes[Math.max(0, endTimes.length - 2)] || endTimes[endTimes.length - 1];

    for (let slot = coreStart; slot < coreEnd; slot += 30) {
      const working = activeShifts.filter(s => {
        const sStart = timeToMinutes(s.startTime);
        const sEnd = timeToMinutes(s.endTime);
        const bStart = timeToMinutes(s.breakStart);
        const bEnd = timeToMinutes(s.breakEnd);
        const onShift = slot >= sStart && slot < sEnd;
        const onBreak = slot >= bStart && slot < bEnd;
        return onShift && !onBreak;
      }).length;

      if (working < minOnFloor && activeShifts.length >= 2) {
        errors.push(`Saat ${minutesToTime(slot)}'da şubede sadece ${working} kişi çalışıyor — min ${minOnFloor} olmalı`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  static generateWeeklyPlan(
    staff: Array<{ id: string; name: string; role: string; employmentType: string }>,
    weekStartDate: string,
    branchId: number,
    leaveUserDates: Set<string> = new Set(),
    openingHour: string = '08:00',
    closingHour: string = '17:00'
  ): WeeklyPlanResult {
    const plan: ShiftWithBreak[] = [];
    const staffCount = staff.length;
    const branchSize: 'small' | 'medium' | 'large' = staffCount <= 6 ? 'small' : staffCount <= 12 ? 'medium' : 'large';

    const weeklyHoursTracker: Record<string, number> = {};
    const offDaysTracker: Record<string, number> = {};
    staff.forEach(s => {
      weeklyHoursTracker[s.id] = 0;
      offDaysTracker[s.id] = 0;
    });

    const openH = parseInt(openingHour.split(':')[0]);
    const openM = parseInt(openingHour.split(':')[1] || '0');
    const closeH = parseInt(closingHour.split(':')[0]);
    const closeM = parseInt(closingHour.split(':')[1] || '0');

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const dateObj = new Date(weekStartDate);
      dateObj.setDate(dateObj.getDate() + dayOffset);
      const dateStr = dateObj.toISOString().split('T')[0];
      const dayOfWeek = dateObj.getDay();
      // Sprint 19.2 (Aslan 12 May): Cuma, Cmt, Paz cafe için EN YOĞUN günler.
      // Hafta sonu OFF verilmemeli (yoğun gün → herkes çalışsın).
      const isBusyDay = [0, 5, 6].includes(dayOfWeek); // 0=Paz, 5=Cuma, 6=Cmt
      const isQuietDay = [1, 2].includes(dayOfWeek);   // 1=Pzt, 2=Sal

      const availableToday = staff.filter(s => {
        const key = `${s.id}_${dateStr}`;
        return !leaveUserDates.has(key);
      });

      // Sprint 19.2: Busy day (Fri/Sat/Sun) → SIFIR off verilir, herkes çalışır
      const needOff = isBusyDay
        ? 0
        : isQuietDay
          ? Math.ceil(staffCount * 0.3)
          : Math.ceil(staffCount * 0.2);

      const offCandidates = availableToday
        .filter(s => offDaysTracker[s.id] < 2)
        .filter(s => !(s.role === 'mudur' && isBusyDay))
        .sort((a, b) => offDaysTracker[a.id] - offDaysTracker[b.id]);

      const todayOffIds = new Set(offCandidates.slice(0, Math.min(needOff, offCandidates.length)).map(s => s.id));
      todayOffIds.forEach(id => { offDaysTracker[id]++; });

      const workingToday = availableToday.filter(s => !todayOffIds.has(s.id));

      const dayBreaks: { start: string; end: string }[] = [];

      for (let i = 0; i < workingToday.length; i++) {
        const person = workingToday[i];
        const isFT = person.employmentType === 'fulltime' || person.employmentType === 'tam_zamanli' || !person.employmentType;
        // Sprint 19.2 (Aslan kuralı): FT = 8.5h gross = 7.5h work + 1h break
        // 6 gün × 7.5h = 45h work (İş K. m.63 uyumlu)
        // PT = 6h gross = 5h work + 1h break
        const targetDailyHours = isFT ? 8.5 : 6;

        let startTime: string;
        let endTime: string;
        let shiftType: 'opening' | 'standard' | 'closing' = 'standard';

        if (i < 2) {
          shiftType = 'opening';
          startTime = i === 0
            ? minutesToTime(openH * 60 + openM - 30)
            : minutesToTime(openH * 60 + openM);
          endTime = minutesToTime(timeToMinutes(startTime) + targetDailyHours * 60);
        } else if (i >= workingToday.length - (isBusyDay ? 3 : 2)) {
          shiftType = 'closing';
          endTime = minutesToTime(closeH * 60 + closeM + 30);
          startTime = minutesToTime(timeToMinutes(endTime) - targetDailyHours * 60);
        } else {
          startTime = minutesToTime(openH * 60 + openM);
          endTime = minutesToTime(timeToMinutes(startTime) + targetDailyHours * 60);
        }

        const breakInfo = this.calculateBreakTime(startTime, endTime, dayBreaks, 60);
        if (breakInfo.breakStart) {
          dayBreaks.push({ start: breakInfo.breakStart, end: breakInfo.breakEnd });
        }

        const shiftMinutes = timeToMinutes(endTime) - timeToMinutes(startTime);
        const netWorkMinutes = shiftMinutes - 60;
        weeklyHoursTracker[person.id] += netWorkMinutes / 60;

        plan.push({
          userId: person.id,
          userName: person.name,
          branchId,
          date: dateStr,
          startTime,
          endTime,
          breakStartTime: breakInfo.breakStart || '',
          breakEndTime: breakInfo.breakEnd || '',
          breakDurationMinutes: breakInfo.breakStart ? 60 : 0,
          isOff: false,
          shiftType,
          dayOfWeek,
        });
      }

      todayOffIds.forEach(userId => {
        const person = staff.find(s => s.id === userId);
        plan.push({
          userId,
          userName: person?.name || '',
          branchId,
          date: dateStr,
          startTime: '',
          endTime: '',
          breakStartTime: '',
          breakEndTime: '',
          breakDurationMinutes: 0,
          isOff: true,
          shiftType: 'off',
          dayOfWeek,
        });
      });
    }

    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    const dates = [...new Set(plan.filter(p => !p.isOff).map(p => p.date))];
    for (const date of dates) {
      const dayPlan = plan.filter(p => p.date === date && !p.isOff);
      const daySize: 'small' | 'medium' | 'large' = dayPlan.length <= 6 ? 'small' : dayPlan.length <= 12 ? 'medium' : 'large';
      const dayValidation = this.validateBreakSchedule(
        dayPlan.map(p => ({
          userId: p.userId,
          startTime: p.startTime,
          endTime: p.endTime,
          breakStart: p.breakStartTime,
          breakEnd: p.breakEndTime,
          isOff: false,
        })),
        daySize
      );
      allErrors.push(...dayValidation.errors.map(e => `[${date}] ${e}`));
      allWarnings.push(...dayValidation.warnings.map(w => `[${date}] ${w}`));
    }

    return {
      plan,
      weeklyHours: weeklyHoursTracker,
      validation: { valid: allErrors.length === 0, errors: allErrors, warnings: allWarnings },
      staffCount,
      offDaysSummary: offDaysTracker,
    };
  }

  static generateRecommendations(
    weekStart: string,
    employees: Employee[],
    existingShifts: ExistingShift[],
    openingHour: string = "08:00",
    closingHour: string = "22:00"
  ): ShiftRecommendation[] {
    const recommendations: ShiftRecommendation[] = [];
    const weekStartDate = parseISO(weekStart);
    const openH = parseInt(openingHour.split(':')[0]);
    const closeH = parseInt(closingHour.split(':')[0]);
    const midH = Math.floor((openH + closeH) / 2);

    const allShifts = [...existingShifts];

    const empDaysAssigned = new Map<string, Set<string>>();
    employees.forEach(emp => {
      const days = new Set<string>();
      existingShifts.filter(s => s.assignedToId === emp.id).forEach(s => days.add(s.shiftDate));
      empDaysAssigned.set(emp.id, days);
    });

    for (const emp of employees) {
      const targetDays = emp.employmentType === 'fulltime' ? 6 : 
                         emp.employmentType === 'parttime' ? 3 : 3;
      const assigned = empDaysAssigned.get(emp.id)!;
      const neededDays = targetDays - assigned.size;

      if (neededDays <= 0) continue;

      const weekDates: string[] = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = format(addDays(weekStartDate, d), "yyyy-MM-dd");
        if (!assigned.has(dateStr)) {
          weekDates.push(dateStr);
        }
      }

      weekDates.sort((a, b) => {
        const countA = allShifts.filter(s => s.shiftDate === a).length;
        const countB = allShifts.filter(s => s.shiftDate === b).length;
        return countA - countB;
      });

      const isFT = emp.employmentType === 'fulltime';
      const shiftDuration = isFT ? 7.5 : 4;

      for (let i = 0; i < neededDays && i < weekDates.length; i++) {
        const dateStr = weekDates[i];
        const morningCount = allShifts.filter(s => s.shiftDate === dateStr && 
          parseInt(s.startTime.split(':')[0]) < midH).length;
        const eveningCount = allShifts.filter(s => s.shiftDate === dateStr && 
          parseInt(s.startTime.split(':')[0]) >= midH).length;

        const isMorning = morningCount <= eveningCount;
        const startH = isMorning ? openH : midH;
        const endH = startH + Math.floor(shiftDuration);
        const endM = isFT ? '30' : '00';

        const startTime = `${String(startH).padStart(2,'0')}:00`;
        const endTime = `${String(Math.min(endH, closeH)).padStart(2,'0')}:${endM}`;

        recommendations.push({
          employeeId: emp.id,
          employeeName: emp.name,
          date: dateStr,
          startTime,
          endTime,
          reason: isFT
            ? `Fulltime (${assigned.size + i + 1}/6 gun, hedef 45 saat)`
            : `Parttime (${assigned.size + i + 1}/3 gun, hedef 25 saat)`,
          fairnessScore: Math.round(100 - ((assigned.size + i) / targetDays) * 100),
        });

        allShifts.push({
          assignedToId: emp.id,
          shiftDate: dateStr,
          startTime,
          endTime,
        });
        assigned.add(dateStr);
      }
    }

    return recommendations;
  }

  static validateWeek(
    weekStart: string,
    existingShifts: ExistingShift[],
    employees: Employee[]
  ): {
    isValid: boolean;
    violations: string[];
  } {
    const violations: string[] = [];

    employees.forEach((emp) => {
      const weeklyHours = this.getWeeklyHours(emp.id, weekStart, existingShifts);
      const weeklyDays = this.getWeeklyDays(emp.id, weekStart, existingShifts);

      if (emp.employmentType === "fulltime") {
        if (weeklyDays < 6 && weeklyDays > 0) {
          violations.push(`${emp.name}: ${weeklyDays} gun (minimum 6 gerekli)`);
        }
        if (weeklyHours < 45 && weeklyHours > 0) {
          violations.push(`${emp.name}: ${weeklyHours.toFixed(1)} saat (minimum 45 gerekli)`);
        }
      } else if (emp.employmentType === "parttime") {
        if (weeklyDays < 3 && weeklyDays > 0) {
          violations.push(`${emp.name}: ${weeklyDays} gun (minimum 3 gerekli)`);
        }
      }
    });

    return {
      isValid: violations.length === 0,
      violations,
    };
  }
}
