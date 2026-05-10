/**
 * Equipment Maintenance Check — Mr. Dobody Bildirim Sistemi
 *
 * runPeriodicChecks (tick-1hr) tarafından çağrılır.
 *
 * 3 KONTROL:
 * 1. Yaklaşan Bakım (14, 7, 1 gün önceden) → branch_manager + cgo bildirim
 * 2. Gecikmiş Bakım (zamanı geçmiş) → ACİL bildirim
 * 3. Garanti Süresi (30, 14, 7 gün önceden) → uyarı
 *
 * Aslan 10 May 2026 talebi.
 */

import { db } from "../db";
import { sql } from "drizzle-orm";

interface MaintenanceCheckResult {
  upcomingCount: number;
  overdueCount: number;
  warrantyExpiringCount: number;
  totalNotifications: number;
}

// ═══════════════════════════════════════════════════════════════════
// 1. Yaklaşan Bakım Kontrolü
// ═══════════════════════════════════════════════════════════════════

async function checkUpcomingMaintenance(
  fireEvent: any
): Promise<number> {
  let count = 0;

  // 14, 7, 1 gün önceden hatırlatma
  const reminderDays = [14, 7, 1];

  for (const days of reminderDays) {
    try {
      const equipment = await db.execute(sql`
        SELECT 
          e.id, e.equipment_type, e.branch_id, 
          e.next_maintenance_date,
          b.name AS branch_name,
          b.manager_name AS manager_name
        FROM equipment e
        JOIN branches b ON b.id = e.branch_id
        WHERE e.is_active = true
          AND e.deleted_at IS NULL
          AND e.next_maintenance_date IS NOT NULL
          AND e.next_maintenance_date::date = (CURRENT_DATE + INTERVAL '${sql.raw(String(days))} days')::date
        LIMIT 50
      `);

      for (const row of (equipment as any).rows || []) {
        const severity =
          days === 1 ? "critical" : days === 7 ? "high" : "medium";

        await fireEvent(
          "equipment_maintenance_due",
          "ekipman",
          "equipment",
          row.id,
          {
            equipmentId: row.id,
            equipmentType: row.equipment_type,
            branchId: row.branch_id,
            branchName: row.branch_name,
            managerName: row.manager_name,
            nextMaintenanceDate: row.next_maintenance_date,
            daysUntil: days,
            severity,
            description:
              days === 1
                ? `🚨 ACİL: ${row.equipment_type} bakımı YARIN! Şube: ${row.branch_name}`
                : days === 7
                ? `⚠️ ${row.equipment_type} bakımı ${days} gün sonra. Şube: ${row.branch_name}`
                : `📅 ${row.equipment_type} bakımı ${days} gün sonra. Şube: ${row.branch_name}`,
          }
        );
        count++;
      }
    } catch (e: any) {
      console.error(
        `[equipment-maintenance-check] upcoming ${days} days error:`,
        e.message
      );
    }
  }

  return count;
}

// ═══════════════════════════════════════════════════════════════════
// 2. Gecikmiş Bakım Kontrolü
// ═══════════════════════════════════════════════════════════════════

async function checkOverdueMaintenance(fireEvent: any): Promise<number> {
  let count = 0;

  try {
    const equipment = await db.execute(sql`
      SELECT 
        e.id, e.equipment_type, e.branch_id, 
        e.next_maintenance_date,
        b.name AS branch_name,
        b.manager_name AS manager_name,
        (CURRENT_DATE - e.next_maintenance_date::date) AS days_overdue
      FROM equipment e
      JOIN branches b ON b.id = e.branch_id
      WHERE e.is_active = true
        AND e.deleted_at IS NULL
        AND e.next_maintenance_date IS NOT NULL
        AND e.next_maintenance_date::date < CURRENT_DATE
      ORDER BY e.next_maintenance_date ASC
      LIMIT 50
    `);

    for (const row of (equipment as any).rows || []) {
      // 1, 3, 7, 14 gün gecikme — sadece bu eşiklerde bildirim (spam önle)
      const overdue = parseInt(row.days_overdue);
      if (![1, 3, 7, 14, 30].includes(overdue)) continue;

      await fireEvent(
        "equipment_maintenance_overdue",
        "ekipman",
        "equipment",
        row.id,
        {
          equipmentId: row.id,
          equipmentType: row.equipment_type,
          branchId: row.branch_id,
          branchName: row.branch_name,
          managerName: row.manager_name,
          nextMaintenanceDate: row.next_maintenance_date,
          daysOverdue: overdue,
          severity: overdue > 14 ? "critical" : "high",
          description: `🔴 GECİKMİŞ: ${row.equipment_type} bakımı ${overdue} gün gecikti! Şube: ${row.branch_name}`,
        }
      );
      count++;
    }
  } catch (e: any) {
    console.error(
      "[equipment-maintenance-check] overdue error:",
      e.message
    );
  }

  return count;
}

// ═══════════════════════════════════════════════════════════════════
// 3. Garanti Süresi Kontrolü
// ═══════════════════════════════════════════════════════════════════

async function checkWarrantyExpiring(fireEvent: any): Promise<number> {
  let count = 0;

  // 30, 14, 7 gün önceden uyar
  const reminderDays = [30, 14, 7];

  for (const days of reminderDays) {
    try {
      const equipment = await db.execute(sql`
        SELECT 
          e.id, e.equipment_type, e.branch_id, 
          e.warranty_end_date,
          b.name AS branch_name,
          b.manager_name AS manager_name
        FROM equipment e
        JOIN branches b ON b.id = e.branch_id
        WHERE e.is_active = true
          AND e.deleted_at IS NULL
          AND e.warranty_end_date IS NOT NULL
          AND e.warranty_end_date::date = (CURRENT_DATE + INTERVAL '${sql.raw(String(days))} days')::date
        LIMIT 50
      `);

      for (const row of (equipment as any).rows || []) {
        await fireEvent(
          "equipment_warranty_expiring",
          "ekipman",
          "equipment",
          row.id,
          {
            equipmentId: row.id,
            equipmentType: row.equipment_type,
            branchId: row.branch_id,
            branchName: row.branch_name,
            warrantyEndDate: row.warranty_end_date,
            daysUntil: days,
            severity: days === 7 ? "high" : "medium",
            description: `⚠️ Garanti bitimi: ${row.equipment_type} (${row.branch_name}) — ${days} gün kaldı`,
          }
        );
        count++;
      }
    } catch (e: any) {
      console.error(
        `[equipment-maintenance-check] warranty ${days} days error:`,
        e.message
      );
    }
  }

  return count;
}

// ═══════════════════════════════════════════════════════════════════
// Ana fonksiyon — runPeriodicChecks tarafından çağrılır
// ═══════════════════════════════════════════════════════════════════

export async function runEquipmentMaintenanceChecks(
  fireEvent: any
): Promise<MaintenanceCheckResult> {
  const upcomingCount = await checkUpcomingMaintenance(fireEvent);
  const overdueCount = await checkOverdueMaintenance(fireEvent);
  const warrantyExpiringCount = await checkWarrantyExpiring(fireEvent);

  const totalNotifications =
    upcomingCount + overdueCount + warrantyExpiringCount;

  if (totalNotifications > 0) {
    console.log(
      `[equipment-maintenance-check] ${totalNotifications} bildirim ` +
        `(yaklaşan: ${upcomingCount}, gecikmiş: ${overdueCount}, garanti: ${warrantyExpiringCount})`
    );
  }

  return {
    upcomingCount,
    overdueCount,
    warrantyExpiringCount,
    totalNotifications,
  };
}
