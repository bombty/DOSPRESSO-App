/**
 * DOSPRESSO Şube Sağlık Skoru Servisi
 * 
 * 6 boyutlu hesaplama:
 *   1. Devam oranı (%25) — PDKS kayıtları / planlanan vardiyalar
 *   2. Checklist tamamlama (%20) — Tamamlanan / atanan checklist'ler
 *   3. Müşteri memnuniyet (%20) — Ortalama geri bildirim puanı
 *   4. Eğitim tamamlama (%15) — Modül completion oranı
 *   5. Ekipman durumu (%10) — Açık arıza oranı
 *   6. Vardiya uyumu (%10) — Planlı vardiya doluluk oranı
 * 
 * Skor: 0-100 arası
 * Renk: Yeşil (80+) / Sarı (60-79) / Kırmızı (<60)
 */

import { db } from "../db";
import { sql, eq, and, gte } from "drizzle-orm";
import {
  branches, users, pdksRecords, shifts,
  equipmentFaults, customerFeedback,
} from "@shared/schema";

export interface DimensionScore {
  name: string;
  nameTr: string;
  score: number;      // 0-100
  weight: number;     // 0-1
  weighted: number;   // score × weight
  dataPoints: number; // kaç veri noktası kullanıldı
  detail?: string;    // açıklama
}

export interface BranchHealthScore {
  branchId: number;
  branchName: string;
  overallScore: number;     // 0-100
  status: 'healthy' | 'warning' | 'critical';
  dimensions: DimensionScore[];
  calculatedAt: string;
  staffCount: number;
}

export interface HealthScoreSummary {
  branches: BranchHealthScore[];
  average: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  calculatedAt: string;
}

// Ağırlıklar
const WEIGHTS = {
  attendance: 0.25,
  checklist: 0.20,
  customer: 0.20,
  training: 0.15,
  equipment: 0.10,
  shift: 0.10,
};

function getStatus(score: number): 'healthy' | 'warning' | 'critical' {
  if (score >= 80) return 'healthy';
  if (score >= 60) return 'warning';
  return 'critical';
}

async function calculateAttendanceScore(branchId: number, thirtyDaysAgo: string): Promise<DimensionScore> {
  try {
    // Son 30 günde PDKS girişi olan unique kullanıcı sayısı
    const pdksResult = await db.execute(sql`
      SELECT count(DISTINCT user_id) as with_pdks
      FROM pdks_records
      WHERE branch_id = ${branchId}
      AND record_date >= ${thirtyDaysAgo}
      AND record_type = 'giris'
    `);
    const withPdks = Number((pdksResult.rows as any[])?.[0]?.with_pdks || 0);

    // Şubedeki aktif personel sayısı
    const staffResult = await db.execute(sql`
      SELECT count(*) as cnt FROM users
      WHERE branch_id = ${branchId} AND is_active = true
      AND role IN ('barista', 'bar_buddy', 'stajyer', 'supervisor', 'supervisor_buddy', 'mudur')
    `);
    const totalStaff = Number((staffResult.rows as any[])?.[0]?.cnt || 0);

    const score = totalStaff > 0 ? Math.min(100, Math.round((withPdks / totalStaff) * 100)) : 100;

    return {
      name: 'attendance',
      nameTr: 'Devam Oranı',
      score,
      weight: WEIGHTS.attendance,
      weighted: Math.round(score * WEIGHTS.attendance),
      dataPoints: totalStaff,
      detail: `${withPdks}/${totalStaff} personel PDKS kaydı var`,
    };
  } catch (e) {
    console.error(`[HealthScore] Attendance error branch ${branchId}:`, e);
    return { name: 'attendance', nameTr: 'Devam Oranı', score: 50, weight: WEIGHTS.attendance, weighted: 50 * WEIGHTS.attendance, dataPoints: 0 };
  }
}

async function calculateChecklistScore(branchId: number, thirtyDaysAgo: string): Promise<DimensionScore> {
  try {
    const result = await db.execute(sql`
      SELECT
        count(*) as total,
        count(*) FILTER (WHERE status = 'completed') as completed
      FROM checklist_completions
      WHERE branch_id = ${branchId}
      AND created_at >= ${thirtyDaysAgo}::timestamp
    `);
    const total = Number((result.rows as any[])?.[0]?.total || 0);
    const completed = Number((result.rows as any[])?.[0]?.completed || 0);
    const score = total > 0 ? Math.round((completed / total) * 100) : 50;

    return {
      name: 'checklist',
      nameTr: 'Checklist Tamamlama',
      score,
      weight: WEIGHTS.checklist,
      weighted: Math.round(score * WEIGHTS.checklist),
      dataPoints: total,
      detail: `${completed}/${total} checklist tamamlandı`,
    };
  } catch (e) {
    console.error(`[HealthScore] Checklist error branch ${branchId}:`, e);
    return { name: 'checklist', nameTr: 'Checklist Tamamlama', score: 50, weight: WEIGHTS.checklist, weighted: 50 * WEIGHTS.checklist, dataPoints: 0 };
  }
}

async function calculateCustomerScore(branchId: number, thirtyDaysAgo: string): Promise<DimensionScore> {
  try {
    const result = await db.execute(sql`
      SELECT
        count(*) as cnt,
        coalesce(avg(rating), 0) as avg_rating
      FROM customer_feedback
      WHERE branch_id = ${branchId}
      AND feedback_date >= ${thirtyDaysAgo}::timestamp
    `);
    const cnt = Number((result.rows as any[])?.[0]?.cnt || 0);
    const avgRating = Number((result.rows as any[])?.[0]?.avg_rating || 0);
    // 5 üzerinden → 100'e çevir
    const score = cnt > 0 ? Math.round((avgRating / 5) * 100) : 50;

    return {
      name: 'customer',
      nameTr: 'Müşteri Memnuniyet',
      score,
      weight: WEIGHTS.customer,
      weighted: Math.round(score * WEIGHTS.customer),
      dataPoints: cnt,
      detail: cnt > 0 ? `${avgRating.toFixed(1)}/5 ortalama (${cnt} değerlendirme)` : 'Henüz değerlendirme yok',
    };
  } catch (e) {
    console.error(`[HealthScore] Customer error branch ${branchId}:`, e);
    return { name: 'customer', nameTr: 'Müşteri Memnuniyet', score: 50, weight: WEIGHTS.customer, weighted: 50 * WEIGHTS.customer, dataPoints: 0 };
  }
}

async function calculateTrainingScore(branchId: number): Promise<DimensionScore> {
  try {
    const result = await db.execute(sql`
      SELECT
        count(*) as total,
        count(*) FILTER (WHERE utp.status = 'completed') as completed
      FROM user_training_progress utp
      JOIN users u ON u.id = utp.user_id
      WHERE u.branch_id = ${branchId} AND u.is_active = true
    `);
    const total = Number((result.rows as any[])?.[0]?.total || 0);
    const completed = Number((result.rows as any[])?.[0]?.completed || 0);
    const score = total > 0 ? Math.round((completed / total) * 100) : 50;

    return {
      name: 'training',
      nameTr: 'Eğitim Tamamlama',
      score,
      weight: WEIGHTS.training,
      weighted: Math.round(score * WEIGHTS.training),
      dataPoints: total,
      detail: `${completed}/${total} eğitim modülü tamamlandı`,
    };
  } catch (e) {
    console.error(`[HealthScore] Training error branch ${branchId}:`, e);
    return { name: 'training', nameTr: 'Eğitim Tamamlama', score: 50, weight: WEIGHTS.training, weighted: 50 * WEIGHTS.training, dataPoints: 0 };
  }
}

async function calculateEquipmentScore(branchId: number): Promise<DimensionScore> {
  try {
    const result = await db.execute(sql`
      SELECT
        count(*) as total,
        count(*) FILTER (WHERE status = 'cozuldu') as resolved
      FROM equipment_faults
      WHERE branch_id = ${branchId}
    `);
    const total = Number((result.rows as any[])?.[0]?.total || 0);
    const resolved = Number((result.rows as any[])?.[0]?.resolved || 0);
    const open = total - resolved;
    // Açık arıza yoksa 100, çok açık arıza varsa düşük
    const score = total === 0 ? 100 : Math.max(0, Math.round(100 - (open / Math.max(total, 1)) * 100));

    return {
      name: 'equipment',
      nameTr: 'Ekipman Durumu',
      score,
      weight: WEIGHTS.equipment,
      weighted: Math.round(score * WEIGHTS.equipment),
      dataPoints: total,
      detail: open > 0 ? `${open} açık arıza (${total} toplam)` : 'Tüm arızalar çözülmüş',
    };
  } catch (e) {
    console.error(`[HealthScore] Equipment error branch ${branchId}:`, e);
    return { name: 'equipment', nameTr: 'Ekipman Durumu', score: 50, weight: WEIGHTS.equipment, weighted: 50 * WEIGHTS.equipment, dataPoints: 0 };
  }
}

async function calculateShiftScore(branchId: number, thirtyDaysAgo: string): Promise<DimensionScore> {
  try {
    // Son 30 günde planlanan vardiya sayısı
    const shiftResult = await db.execute(sql`
      SELECT count(*) as planned FROM shifts
      WHERE branch_id = ${branchId}
      AND shift_date >= ${thirtyDaysAgo}
    `);
    const planned = Number((shiftResult.rows as any[])?.[0]?.planned || 0);

    // Aktif personel × 22 iş günü beklenen vardiya (yaklaşık)
    const staffResult = await db.execute(sql`
      SELECT count(*) as cnt FROM users
      WHERE branch_id = ${branchId} AND is_active = true
      AND role IN ('barista', 'bar_buddy', 'stajyer', 'supervisor', 'supervisor_buddy', 'mudur')
    `);
    const totalStaff = Number((staffResult.rows as any[])?.[0]?.cnt || 0);
    const expected = totalStaff * 22; // ~22 iş günü/ay

    const score = expected > 0 ? Math.min(100, Math.round((planned / expected) * 100)) : 50;

    return {
      name: 'shift',
      nameTr: 'Vardiya Uyumu',
      score,
      weight: WEIGHTS.shift,
      weighted: Math.round(score * WEIGHTS.shift),
      dataPoints: planned,
      detail: `${planned} vardiya planlanmış (beklenen ~${expected})`,
    };
  } catch (e) {
    console.error(`[HealthScore] Shift error branch ${branchId}:`, e);
    return { name: 'shift', nameTr: 'Vardiya Uyumu', score: 50, weight: WEIGHTS.shift, weighted: 50 * WEIGHTS.shift, dataPoints: 0 };
  }
}

/**
 * Tek şube için sağlık skoru hesapla
 */
export async function calculateBranchHealthScore(branchId: number, branchName: string): Promise<BranchHealthScore> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const dimensions = await Promise.all([
    calculateAttendanceScore(branchId, thirtyDaysAgo),
    calculateChecklistScore(branchId, thirtyDaysAgo),
    calculateCustomerScore(branchId, thirtyDaysAgo),
    calculateTrainingScore(branchId),
    calculateEquipmentScore(branchId),
    calculateShiftScore(branchId, thirtyDaysAgo),
  ]);

  const overallScore = Math.round(dimensions.reduce((sum, d) => sum + d.weighted, 0));

  // Staff count
  const staffResult = await db.execute(sql`
    SELECT count(*) as cnt FROM users
    WHERE branch_id = ${branchId} AND is_active = true
    AND role NOT IN ('sube_kiosk', 'yatirimci_branch')
  `);
  const staffCount = Number((staffResult.rows as any[])?.[0]?.cnt || 0);

  return {
    branchId,
    branchName,
    overallScore,
    status: getStatus(overallScore),
    dimensions,
    calculatedAt: new Date().toISOString(),
    staffCount,
  };
}

/**
 * Branch monthly snapshot'tan sağlık skoru oluştur (fallback)
 */
async function buildScoreFromSnapshot(branchId: number, branchName: string, staffCount: number): Promise<BranchHealthScore | null> {
  const result = await db.execute(sql`
    SELECT attendance_rate, checklist_completion_rate, customer_avg_rating,
           avg_quiz_score, equipment_faults, overall_health_score,
           training_completions, staff_count
    FROM branch_monthly_snapshots
    WHERE branch_id = ${branchId}
    ORDER BY snapshot_year DESC, snapshot_month DESC
    LIMIT 1
  `);
  const row = (result.rows as any[])?.[0];
  if (!row) return null;

  const attendance  = Math.min(100, Math.round(Number(row.attendance_rate || 75)));
  const checklist   = Math.min(100, Math.round(Number(row.checklist_completion_rate || 65)));
  const customerRaw = Number(row.customer_avg_rating || 0);
  const customer    = customerRaw > 0 ? Math.round((customerRaw / 5) * 100) : 70;
  const training    = row.training_completions > 0 ? Math.min(100, Math.round(Number(row.avg_quiz_score || 60))) : 60;
  const faults      = Number(row.equipment_faults || 0);
  const equipment   = faults === 0 ? 90 : Math.max(40, Math.round(100 - faults * 10));
  const shift       = Math.min(100, Math.round(attendance * 0.9));
  const overall     = Number(row.overall_health_score || 0);

  const dimensions: DimensionScore[] = [
    { name: 'attendance', nameTr: 'Devam Oranı',        score: attendance, weight: WEIGHTS.attendance, weighted: Math.round(attendance * WEIGHTS.attendance), dataPoints: staffCount, detail: `Aylık snapshot — ${attendance}%` },
    { name: 'checklist',  nameTr: 'Checklist Tamamlama', score: checklist,  weight: WEIGHTS.checklist,  weighted: Math.round(checklist  * WEIGHTS.checklist),  dataPoints: 1,          detail: `Aylık snapshot — ${checklist}%` },
    { name: 'customer',   nameTr: 'Müşteri Memnuniyet', score: customer,   weight: WEIGHTS.customer,   weighted: Math.round(customer   * WEIGHTS.customer),   dataPoints: 1,          detail: `Aylık snapshot — ${customerRaw.toFixed(1)}/5` },
    { name: 'training',   nameTr: 'Eğitim Tamamlama',   score: training,   weight: WEIGHTS.training,   weighted: Math.round(training   * WEIGHTS.training),   dataPoints: 1,          detail: `Aylık snapshot — ${training}%` },
    { name: 'equipment',  nameTr: 'Ekipman Durumu',      score: equipment,  weight: WEIGHTS.equipment,  weighted: Math.round(equipment  * WEIGHTS.equipment),  dataPoints: 1,          detail: `${faults} arıza` },
    { name: 'shift',      nameTr: 'Vardiya Uyumu',       score: shift,      weight: WEIGHTS.shift,      weighted: Math.round(shift      * WEIGHTS.shift),      dataPoints: 1,          detail: 'Aylık snapshot baz alındı' },
  ];

  const overallScore = overall > 0 ? Math.round(overall) : Math.round(dimensions.reduce((s, d) => s + d.weighted, 0));

  return {
    branchId,
    branchName,
    overallScore,
    status: getStatus(overallScore),
    dimensions,
    calculatedAt: new Date().toISOString(),
    staffCount,
  };
}

/**
 * Tüm aktif şubeler için sağlık skoru hesapla
 * Cache: 5 dakika
 */
let cachedScores: HealthScoreSummary | null = null;
let cachedAt = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 dakika

export async function getAllBranchHealthScores(): Promise<HealthScoreSummary> {
  if (cachedScores && Date.now() - cachedAt < CACHE_TTL) {
    return cachedScores;
  }

  const activeBranches = await db.select({ id: branches.id, name: branches.name })
    .from(branches)
    .where(eq(branches.isActive, true));

  // HQ ve fabrika hariç — sadece şubeler
  const HQ_KEYWORDS = ['HQ', 'Merkez', 'Fabrika'];
  const shopBranches = activeBranches.filter(b => !HQ_KEYWORDS.some(kw => b.name.includes(kw)));

  // Boş şubeleri filtrele + snapshot fallback
  const branchScores: BranchHealthScore[] = [];
  for (const branch of shopBranches) {
    const score = await calculateBranchHealthScore(branch.id, branch.name);
    if (score.staffCount === 0) continue;

    // Gerçek zamanlı veri yoksa monthly snapshot'tan fallback
    const hasRealData = score.dimensions.some(d => d.dataPoints > 0 &&
      !['shift', 'equipment'].includes(d.name));
    if (!hasRealData) {
      const snapshotScore = await buildScoreFromSnapshot(branch.id, branch.name, score.staffCount);
      if (snapshotScore) {
        branchScores.push(snapshotScore);
        continue;
      }
    }
    branchScores.push(score);
  }

  // Skor sıralaması — en düşükten başla (ilgi gerektiren önce)
  branchScores.sort((a, b) => a.overallScore - b.overallScore);

  const summary: HealthScoreSummary = {
    branches: branchScores,
    average: branchScores.length > 0
      ? Math.round(branchScores.reduce((s, b) => s + b.overallScore, 0) / branchScores.length)
      : 0,
    healthyCount: branchScores.filter(b => b.status === 'healthy').length,
    warningCount: branchScores.filter(b => b.status === 'warning').length,
    criticalCount: branchScores.filter(b => b.status === 'critical').length,
    calculatedAt: new Date().toISOString(),
  };

  cachedScores = summary;
  cachedAt = Date.now();
  return summary;
}

/**
 * Pattern tespiti — tüm şubelerdeki ortak sorunları bul
 */
export async function detectPatterns(scores: HealthScoreSummary): Promise<Array<{
  pattern: string;
  severity: 'critical' | 'high' | 'medium';
  affectedBranches: string[];
  recommendation: string;
}>> {
  const patterns: Array<{
    pattern: string;
    severity: 'critical' | 'high' | 'medium';
    affectedBranches: string[];
    recommendation: string;
  }> = [];

  // Pattern 1: Devam oranı düşük şubeler
  const lowAttendance = scores.branches.filter(b => {
    const dim = b.dimensions.find(d => d.name === 'attendance');
    return dim && dim.score < 60;
  });
  if (lowAttendance.length >= 2) {
    patterns.push({
      pattern: `${lowAttendance.length} şubede devam oranı kritik düzeyde düşük`,
      severity: 'critical',
      affectedBranches: lowAttendance.map(b => b.branchName),
      recommendation: 'Kiosk kullanımını kontrol edin. PDKS check-in zorunluluğunu hatırlatın.',
    });
  }

  // Pattern 2: Eğitim tamamlama düşük
  const lowTraining = scores.branches.filter(b => {
    const dim = b.dimensions.find(d => d.name === 'training');
    return dim && dim.score < 40;
  });
  if (lowTraining.length >= 3) {
    patterns.push({
      pattern: `${lowTraining.length} şubede eğitim tamamlama oranı çok düşük`,
      severity: 'high',
      affectedBranches: lowTraining.map(b => b.branchName),
      recommendation: 'Zorunlu eğitim modüllerini gözden geçirin. Supervisor\'lara eğitim takibi hatırlatması gönderin.',
    });
  }

  // Pattern 3: Ekipman arıza yoğunluğu
  const highFaults = scores.branches.filter(b => {
    const dim = b.dimensions.find(d => d.name === 'equipment');
    return dim && dim.score < 50;
  });
  if (highFaults.length >= 2) {
    patterns.push({
      pattern: `${highFaults.length} şubede ekipman arıza oranı yüksek`,
      severity: 'high',
      affectedBranches: highFaults.map(b => b.branchName),
      recommendation: 'Teknik ekibe toplu bakım planı oluşturun. SLA süreleri kontrol edilmeli.',
    });
  }

  // Pattern 4: Vardiya planlama eksikliği
  const lowShift = scores.branches.filter(b => {
    const dim = b.dimensions.find(d => d.name === 'shift');
    return dim && dim.score < 50;
  });
  if (lowShift.length >= 3) {
    patterns.push({
      pattern: `${lowShift.length} şubede vardiya planlama yetersiz`,
      severity: 'medium',
      affectedBranches: lowShift.map(b => b.branchName),
      recommendation: 'Haftalık vardiya planlama hatırlatması gönderin. Şablon vardiyalar oluşturun.',
    });
  }

  // Pattern 5: Genel düşüş trendi (ortalama 70 altı)
  if (scores.average < 70) {
    patterns.push({
      pattern: `Genel şube sağlık ortalaması düşük: %${scores.average}`,
      severity: scores.average < 50 ? 'critical' : 'medium',
      affectedBranches: scores.branches.filter(b => b.overallScore < scores.average).map(b => b.branchName),
      recommendation: 'Acil operasyonel toplantı düzenleyin. En düşük skorlu şubelerden başlayın.',
    });
  }

  return patterns;
}
