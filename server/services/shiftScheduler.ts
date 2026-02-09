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
