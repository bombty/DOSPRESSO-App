import { db } from "../../db";
import { shifts, users } from "@shared/schema";
import { eq, and, gte, lte, notInArray } from "drizzle-orm";
import { registerSkill, type AgentSkill, type SkillContext, type SkillInsight } from "./skill-registry";

const WEEKEND_DAYS = [5, 6, 0];
const SMALL_BRANCH_THRESHOLD = 8;
const ROTATION_ORDER = ["opening", "relay_1", "relay_2", "closing"];
const SHIFT_LABELS: Record<string, string> = {
  opening: "Açılış", relay_1: "1. Aracı", relay_2: "2. Aracı", closing: "Kapanış",
  morning: "Sabah", evening: "Akşam", night: "Gece",
};
const PEAK_WINDOWS = [
  { label: "Öğle peak (11:30-17:30)", startH: 11.5, endH: 17.5, minStaff: 3 },
  { label: "Akşam peak (19:00-22:00)", startH: 19, endH: 22, minStaff: 2 },
];

function getWeekStart(offsetWeeks = 0): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff + offsetWeeks * 7);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function dateRange(start: Date, days: number): string[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

function timeToHour(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
}

function overlaps(sH: number, eH: number, wS: number, wE: number): boolean {
  const eff = eH < sH ? eH + 24 : eH;
  return sH < wE && eff > wS;
}

const shiftPlannerSkill: AgentSkill = {
  id: "shift_planner",
  name: "Vardiya Planlama Danışmanı",
  description: "Hafta sonu kuralları, peak saat örtüşmesi ve rotasyon adaleti için uyarılar",
  targetRoles: ["mudur", "supervisor", "supervisor_buddy", "admin", "ceo", "coach", "trainer", "cgo"],
  schedule: "daily",
  autonomyLevel: "suggest",
  dataSources: ["shifts", "users"],

  async analyze(context: SkillContext): Promise<SkillInsight[]> {
    const insights: SkillInsight[] = [];
    try {
      const branchId = context.branchId;
      if (!branchId) return insights;

      const branchStaff = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
        .from(users).where(and(eq(users.branchId, branchId), eq(users.isActive, true)));
      const staffCount = branchStaff.length;

      const thisWeekStart = getWeekStart(0);
      const nextWeekStart = getWeekStart(1);
      const nextWeekEnd = new Date(nextWeekStart);
      nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);
      const threeWeeksAgo = getWeekStart(-3);

      const allShifts = await db.select({
        id: shifts.id, shiftDate: shifts.shiftDate,
        startTime: shifts.startTime, endTime: shifts.endTime,
        shiftType: shifts.shiftType, assignedToId: shifts.assignedToId,
      }).from(shifts).where(and(
        eq(shifts.branchId, branchId),
        gte(shifts.shiftDate, threeWeeksAgo.toISOString().split("T")[0]),
        lte(shifts.shiftDate, nextWeekEnd.toISOString().split("T")[0]),
        notInArray(shifts.status, ["cancelled"])
      ));

      const thisWeekStr = thisWeekStart.toISOString().split("T")[0];
      const nextWeekStr = nextWeekStart.toISOString().split("T")[0];
      const nextWeekEndStr = nextWeekEnd.toISOString().split("T")[0];

      const nextWeekShifts = allShifts.filter(s => s.shiftDate >= nextWeekStr && s.shiftDate <= nextWeekEndStr);
      const thisWeekShifts = allShifts.filter(s => s.shiftDate >= thisWeekStr && s.shiftDate < nextWeekStr);
      const pastShifts = allShifts.filter(s => s.shiftDate < thisWeekStr);

      // KURAL 1: Hafta sonu OFF kontrolü
      const nextWeekDates = dateRange(nextWeekStart, 7);
      const violDates: string[] = [];
      const DAY_NAMES = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

      for (const d of nextWeekDates) {
        const dow = new Date(d).getDay();
        if (!WEEKEND_DAYS.includes(dow)) continue;
        const staffOnShift = new Set(nextWeekShifts.filter(s => s.shiftDate === d).map(s => s.assignedToId).filter(Boolean));
        const offCount = branchStaff.filter(s => !staffOnShift.has(s.id)).length;
        if (offCount === 0) continue;
        const isFri = dow === 5, isWeekend = dow === 6 || dow === 0;
        if (staffCount < SMALL_BRANCH_THRESHOLD) violDates.push(`${DAY_NAMES[dow]}(${d})`);
        else if (isWeekend) violDates.push(`${DAY_NAMES[dow]}(${d})`);
      }
      if (violDates.length > 0) {
        insights.push({
          type: "weekend_off_violation", severity: "warning",
          message: staffCount < SMALL_BRANCH_THRESHOLD
            ? `Şube ${staffCount} kişi: ${violDates.join(", ")} günlerinde tüm personel çalışmalı, off verilmemeli`
            : `Cumartesi/Pazar ${violDates.join(", ")} — off yasak. Sadece Cuma off verilebilir`,
          data: { violDates, staffCount },
          requiresAI: false,
        });
      }

      // KURAL 2: Peak saat örtüşmesi
      for (const d of nextWeekDates) {
        const dayS = nextWeekShifts.filter(s => s.shiftDate === d && s.startTime && s.endTime);
        for (const peak of PEAK_WINDOWS) {
          const covering = dayS.filter(s => overlaps(timeToHour(s.startTime!), timeToHour(s.endTime!), peak.startH, peak.endH));
          if (covering.length < peak.minStaff) {
            insights.push({
              type: "peak_understaffed", severity: covering.length === 0 ? "critical" : "warning",
              message: `${DAY_NAMES[new Date(d).getDay()]} ${peak.label}: ${covering.length}/${peak.minStaff} kişi planlandı — yetersiz`,
              data: { date: d, peak: peak.label, current: covering.length, required: peak.minStaff },
              requiresAI: false,
            });
          }
        }
      }

      // KURAL 3: Rotasyon adaleti
      const lastType: Record<string, string> = {};
      const sortedPast = [...pastShifts, ...thisWeekShifts].sort((a, b) => (b.shiftDate || "").localeCompare(a.shiftDate || ""));
      for (const s of sortedPast) {
        if (s.assignedToId && s.shiftType && !lastType[s.assignedToId]) lastType[s.assignedToId] = s.shiftType;
      }
      const nextTypeMap: Record<string, string> = {};
      for (const s of nextWeekShifts) { if (s.assignedToId && s.shiftType) nextTypeMap[s.assignedToId] = s.shiftType; }

      const rotViolators: string[] = [];
      for (const staff of branchStaff) {
        const last = lastType[staff.id], next = nextTypeMap[staff.id];
        if (!last || !next) continue;
        if (last === next && (last === "closing" || last === "opening")) {
          rotViolators.push(`${staff.firstName} ${staff.lastName} (${SHIFT_LABELS[last] || last}→${SHIFT_LABELS[next] || next})`);
        }
      }
      if (rotViolators.length > 0) {
        insights.push({
          type: "rotation_imbalance", severity: "info",
          message: `Rotasyon önerisi: ${rotViolators.join(", ")} arka arkaya aynı tip vardiyaya atandı. Adil dönüşüm: Kapanış→Aracı→Açılış`,
          data: { violators: rotViolators },
          requiresAI: false,
        });
      }

      // KURAL 4: Bu hafta planlama boşluğu
      const thisWeekDates = dateRange(thisWeekStart, 7);
      const unplanned = thisWeekDates.filter(d => !thisWeekShifts.some(s => s.shiftDate === d));
      if (unplanned.length >= 3) {
        insights.push({
          type: "week_not_planned", severity: "warning",
          message: `Bu hafta ${unplanned.length} gün vardiya planlanmamış. Vardiya Planlama sayfasından "Geçen Haftayı Kopyala" ile hızlıca oluşturabilirsiniz.`,
          data: { unplanned },
          requiresAI: false,
        });
      }

    } catch (err) {
      console.error("[ShiftPlanner] error:", err);
    }
    return insights;
  },
};

registerSkill(shiftPlannerSkill);
export default shiftPlannerSkill;
