/**
 * Sprint 10 (5 May 2026) - Performans Skor Hesaplama Servisi
 * 
 * Aslan'ın talebi (5 May 21:30):
 *   "skor kriterleri net belirlenmeli. icabında admin tarafından
 *    güncellenebilir olmalı kriterler ve verilen ağırlıklar."
 *   "şuanki skor hesaplamaları da hatalı sanki"
 * 
 * 5 ana kategori:
 *   1. DEVAM (max 20): PDKS uyum oranı (planlanan vardiya / kayıtlı giriş)
 *   2. CHECKLIST (max 20): Tamamlanan / Toplam atanan
 *   3. GÖREV (max 15): Zamanında tamamlanan / Toplam atanan
 *   4. MÜŞTERİ (max 15): Şube ortalama müşteri puanı (5 üzerinden)
 *   5. YÖNETİCİ (max 20): Manager rating (manual)
 * 
 * Toplam: 90 puan
 * 
 * Kullanım:
 *   const score = await calculatePersonnelScore(userId, startDate, endDate);
 *   → { devam: 18, checklist: 15, gorev: 12, musteri: 13, yonetici: 16, total: 74, percent: 82 }
 */

import { db } from "../db";
import { eq, and, gte, lte, inArray, sql, isNotNull } from "drizzle-orm";
import {
  users,
  shifts,
  pdksRecords,
  checklistCompletions,
  tasks,
  monthlyEmployeePerformance,
  scoreParameters,
} from "@shared/schema";

export interface PersonnelScoreBreakdown {
  devam: number;        // 0-20
  checklist: number;    // 0-20
  gorev: number;        // 0-15
  musteri: number;      // 0-15
  yonetici: number;     // 0-20
}

export interface PersonnelScoreResult {
  userId: string;
  breakdown: PersonnelScoreBreakdown;
  totalScore: number;     // breakdown toplam
  maxScore: number;       // dynamic, scoreParameters tablosundan (default 90)
  scorePercent: number;   // 0-100
  metrics: {
    totalShifts: number;
    attendedShifts: number;
    totalChecklists: number;
    completedChecklists: number;
    totalTasks: number;
    onTimeTasks: number;
    customerRatingAvg: number;
    managerRatingAvg: number;
  };
}

/**
 * Skor parametrelerini cache'le (5 dakika)
 * scoreParameters tablosundan max puan değerlerini al
 */
let cachedParams: any[] = [];
let cacheExpiry = 0;
async function getScoreParameters() {
  if (Date.now() < cacheExpiry && cachedParams.length > 0) return cachedParams;
  const params = await db.select().from(scoreParameters).where(eq(scoreParameters.isActive, true));
  cachedParams = params;
  cacheExpiry = Date.now() + 5 * 60 * 1000; // 5 dakika
  return params;
}

/**
 * Tek bir personelin skoru hesapla
 */
export async function calculatePersonnelScore(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<PersonnelScoreResult> {
  const params = await getScoreParameters();
  
  // Max puanlar (DB'den dinamik veya default)
  const maxDevam = params.find(p => p.formulaCode === 'pdks_compliance')?.maxPoints ?? 20;
  const maxChecklist = params.find(p => p.formulaCode === 'checklist_completion')?.maxPoints ?? 20;
  const maxGorev = params.find(p => p.formulaCode === 'task_completion')?.maxPoints ?? 15;
  const maxMusteri = params.find(p => p.formulaCode === 'customer_satisfaction')?.maxPoints ?? 15;
  const maxYonetici = params.find(p => p.formulaCode === 'manager_evaluation')?.maxPoints ?? 20;
  const maxScore = maxDevam + maxChecklist + maxGorev + maxMusteri + maxYonetici;

  // ═══════════════════════════════════════════════════════════════════
  // 1. DEVAM SKORU (PDKS uyum oranı)
  // ═══════════════════════════════════════════════════════════════════
  const startStr = startDate.toISOString().slice(0, 10);
  const endStr = endDate.toISOString().slice(0, 10);

  // Planlanan vardiyalar
  const plannedShifts = await db.select({ count: sql<number>`count(*)::int` })
    .from(shifts)
    .where(and(
      eq(shifts.assignedToId, userId),
      gte(shifts.startTime, startDate),
      lte(shifts.startTime, endDate),
    ));
  const totalShifts = plannedShifts[0]?.count ?? 0;

  // Gerçekleşen giriş kayıtları
  const attendedRecords = await db.select({ count: sql<number>`count(distinct record_date)::int` })
    .from(pdksRecords)
    .where(and(
      eq(pdksRecords.userId, userId),
      eq(pdksRecords.recordType, 'giris'),
      gte(pdksRecords.recordDate, startStr),
      lte(pdksRecords.recordDate, endStr),
    ));
  const attendedShifts = attendedRecords[0]?.count ?? 0;

  // Skor: oran × max
  const devamRatio = totalShifts > 0 ? Math.min(attendedShifts / totalShifts, 1) : 0;
  const devamScore = Math.round(devamRatio * maxDevam);

  // ═══════════════════════════════════════════════════════════════════
  // 2. CHECKLIST SKORU
  // ═══════════════════════════════════════════════════════════════════
  const checklistData = await db.select({
    total: sql<number>`count(*)::int`,
    completed: sql<number>`count(case when status = 'completed' then 1 end)::int`,
  })
    .from(checklistCompletions)
    .where(and(
      eq(checklistCompletions.userId, userId),
      gte(checklistCompletions.scheduledDate, startStr),
      lte(checklistCompletions.scheduledDate, endStr),
    ));

  const totalChecklists = checklistData[0]?.total ?? 0;
  const completedChecklists = checklistData[0]?.completed ?? 0;
  const checklistRatio = totalChecklists > 0 ? completedChecklists / totalChecklists : 0;
  const checklistScore = Math.round(checklistRatio * maxChecklist);

  // ═══════════════════════════════════════════════════════════════════
  // 3. GÖREV SKORU (zamanında tamamlanan)
  // ═══════════════════════════════════════════════════════════════════
  const taskData = await db.select({
    total: sql<number>`count(*)::int`,
    completed: sql<number>`count(case when status = 'onaylandi' then 1 end)::int`,
    onTime: sql<number>`count(case 
      when status = 'onaylandi' 
      and completed_at IS NOT NULL 
      and (due_date IS NULL OR completed_at <= due_date) 
      then 1 end)::int`,
  })
    .from(tasks)
    .where(and(
      eq(tasks.assignedToId, userId),
      gte(tasks.createdAt, startDate),
      lte(tasks.createdAt, endDate),
    ));

  const totalTasks = taskData[0]?.total ?? 0;
  const onTimeTasks = taskData[0]?.onTime ?? 0;
  const gorevRatio = totalTasks > 0 ? onTimeTasks / totalTasks : 0;
  const gorevScore = Math.round(gorevRatio * maxGorev);

  // ═══════════════════════════════════════════════════════════════════
  // 4. MÜŞTERİ MEMNUNİYETİ
  // ═══════════════════════════════════════════════════════════════════
  // monthlyEmployeePerformance tablosundan al (eğer kayıt varsa)
  const month = endDate.getMonth() + 1;
  const year = endDate.getFullYear();
  
  let customerRatingAvg = 0;
  let managerRatingAvg = 0;
  
  const monthlyPerf = await db.select()
    .from(monthlyEmployeePerformance)
    .where(and(
      eq(monthlyEmployeePerformance.userId, userId),
      eq(monthlyEmployeePerformance.year, year),
      eq(monthlyEmployeePerformance.month, month),
    ))
    .limit(1);

  if (monthlyPerf.length > 0) {
    const mp = monthlyPerf[0];
    // customerRatingScore 0-100, normalize et
    customerRatingAvg = (mp.customerRatingScore || 0) / 100 * 5; // 5 üzerinden
    managerRatingAvg = (mp.managerRatingScore || 0) / 100 * 5;
  }

  // Müşteri skoru = (ortalama puan / 5) × max
  const musteriRatio = customerRatingAvg / 5;
  const musteriScore = Math.round(musteriRatio * maxMusteri);

  // ═══════════════════════════════════════════════════════════════════
  // 5. YÖNETİCİ SKORU
  // ═══════════════════════════════════════════════════════════════════
  const yoneticiRatio = managerRatingAvg / 5;
  const yoneticiScore = Math.round(yoneticiRatio * maxYonetici);

  // ═══════════════════════════════════════════════════════════════════
  // TOPLAM
  // ═══════════════════════════════════════════════════════════════════
  const totalScore = devamScore + checklistScore + gorevScore + musteriScore + yoneticiScore;
  const scorePercent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  return {
    userId,
    breakdown: {
      devam: devamScore,
      checklist: checklistScore,
      gorev: gorevScore,
      musteri: musteriScore,
      yonetici: yoneticiScore,
    },
    totalScore,
    maxScore,
    scorePercent,
    metrics: {
      totalShifts,
      attendedShifts,
      totalChecklists,
      completedChecklists,
      totalTasks,
      onTimeTasks,
      customerRatingAvg,
      managerRatingAvg,
    },
  };
}

/**
 * Birden çok personel için bulk hesaplama (performans için optimize)
 */
export async function calculateBulkPersonnelScores(
  userIds: string[],
  startDate: Date,
  endDate: Date
): Promise<Map<string, PersonnelScoreResult>> {
  const results = new Map<string, PersonnelScoreResult>();
  
  // N+1 problemi olmaması için her birini ayrı sorgula (dizi büyük olursa Promise.all yapılır)
  const promises = userIds.map(async (uid) => {
    try {
      const score = await calculatePersonnelScore(uid, startDate, endDate);
      return { uid, score };
    } catch (e) {
      console.error(`Score calc error for ${uid}:`, e);
      return null;
    }
  });
  
  const all = await Promise.all(promises);
  for (const r of all) {
    if (r) results.set(r.uid, r.score);
  }
  
  return results;
}

/**
 * Dönem aralığını bir aydan al (default: bu ay)
 */
export function getMonthRange(year?: number, month?: number): { start: Date; end: Date } {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? (now.getMonth() + 1); // 1-12
  
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59); // Son gün
  
  return { start, end };
}
