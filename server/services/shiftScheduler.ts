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
  fairnessScore: number; // 0-100
}

export class ShiftScheduler {
  // Calculate hours between two times (HH:MM format)
  private static calculateHours(startTime: string, endTime: string): number {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return (endMinutes - startMinutes) / 60;
  }

  // Get hours worked by employee in week
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

  // Get days worked by employee in week
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

  // Generate shift recommendations for a week
  static generateRecommendations(
    weekStart: string,
    employees: Employee[],
    existingShifts: ExistingShift[],
    openingHour: string = "08:00",
    closingHour: string = "22:00"
  ): ShiftRecommendation[] {
    const recommendations: ShiftRecommendation[] = [];
    const weekStartDate = parseISO(weekStart);

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = addDays(weekStartDate, dayOffset);
      const dateStr = format(date, "yyyy-MM-dd");
      const dayShifts = existingShifts.filter((s) => s.shiftDate === dateStr);

      // Skip if day already has many shifts
      if (dayShifts.length >= Math.ceil(employees.length / 2)) continue;

      // Find best employee for this day
      const candidates = employees.map((emp) => {
        const weeklyHours = this.getWeeklyHours(emp.id, weekStart, existingShifts);
        const weeklyDays = this.getWeeklyDays(emp.id, weekStart, existingShifts);
        const targetHours = emp.employmentType === "fulltime" ? 45 : 25;
        const targetDays = emp.employmentType === "fulltime" ? 6 : 3;

        // Calculate fairness: how far from targets
        const hoursFairness = Math.max(0, 100 - Math.abs(targetHours - weeklyHours) * 5);
        const daysFairness = weeklyDays >= targetDays ? 0 : (weeklyDays / targetDays) * 100;

        // Check if already on shift this day
        const onShiftToday = dayShifts.some((s) => s.assignedToId === emp.id);
        if (onShiftToday) return { emp, fairnessScore: -100 };

        return {
          emp,
          fairnessScore: (hoursFairness + daysFairness) / 2,
        };
      });

      // Pick best candidate (highest fairness score)
      const best = candidates
        .filter((c) => c.fairnessScore > 0)
        .sort((a, b) => b.fairnessScore - a.fairnessScore)[0];

      if (best) {
        const shiftHours = best.emp.employmentType === "fulltime" ? 7.5 : 4;
        const endHour = parseInt(openingHour.split(":")[0]) + Math.floor(shiftHours);
        const endTime = `${String(endHour).padStart(2, "0")}:${openingHour.split(":")[1]}`;

        recommendations.push({
          employeeId: best.emp.id,
          employeeName: best.emp.name,
          date: dateStr,
          startTime: openingHour,
          endTime: endTime,
          reason:
            best.emp.employmentType === "fulltime"
              ? `Fulltime (${this.getWeeklyDays(best.emp.id, weekStart, existingShifts)}/6 gün, ${this.getWeeklyHours(best.emp.id, weekStart, existingShifts).toFixed(1)}/45 saat)`
              : `Parttime (${this.getWeeklyDays(best.emp.id, weekStart, existingShifts)}/3 gün, ${this.getWeeklyHours(best.emp.id, weekStart, existingShifts).toFixed(1)}/25 saat)`,
          fairnessScore: Math.round(best.fairnessScore),
        });
      }
    }

    return recommendations;
  }

  // Validate week against constraints
  static validateWeek(
    weekStart: string,
    existingShifts: ExistingShift[],
    employees: Employee[]
  ): {
    isValid: boolean;
    violations: string[];
  } {
    const violations: string[] = [];
    const weekStartDate = parseISO(weekStart);

    employees.forEach((emp) => {
      const weeklyHours = this.getWeeklyHours(emp.id, weekStart, existingShifts);
      const weeklyDays = this.getWeeklyDays(emp.id, weekStart, existingShifts);

      if (emp.employmentType === "fulltime") {
        if (weeklyDays < 6 && weeklyDays > 0) {
          violations.push(`${emp.name}: ${weeklyDays} gün çalışacak (minimum 6 gerekli)`);
        }
        if (weeklyHours < 45 && weeklyHours > 0) {
          violations.push(
            `${emp.name}: ${weeklyHours.toFixed(1)} saat (minimum 45 gerekli)`
          );
        }
      }
    });

    return {
      isValid: violations.length === 0,
      violations,
    };
  }
}
