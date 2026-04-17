/**
 * DOSPRESSO — Sprint A6: Notification Spam Aggregation
 *
 * PROBLEM: 20,327 okunmamış bildirim (%99.98). Mr. Dobody agent'i
 * escalation_info, agent_escalation, franchise_escalation tiplerini
 * dakikalık spam olarak üretiyor.
 *
 * ÇÖZÜM (2 adım):
 *   1) Geriye dönük temizlik: 24 saat öncesine ait agent-origin
 *      bildirimleri is_archived=true yap (kullanıcı okumuyor, sadece
 *      feed'i kirletiyor).
 *   2) Günlük özet: Her agent tipi için kullanıcı başına günde 1
 *      aggregate bildirim üret ("Bugün 15 operasyonel eskalasyon var").
 *
 * Script iki mod'da çalışabilir:
 *   - "archive"   : Sadece geriye dönük temizlik (dry-run destek)
 *   - "aggregate" : Geçmiş + bundan sonra günlük aggregation cron
 *
 * Çalıştırma:
 *   npx tsx server/scripts/notification-aggregation.ts archive --dry-run
 *   npx tsx server/scripts/notification-aggregation.ts archive
 *   npx tsx server/scripts/notification-aggregation.ts aggregate
 */

import { db } from "../db";
import { notifications } from "@shared/schema";
import { and, eq, sql, inArray, lt, isNull, gte } from "drizzle-orm";

// Spam sayılan bildirim tipleri (Mr. Dobody agent kaynaklı)
const SPAM_TYPES = [
  "escalation_info",
  "agent_escalation_info",
  "agent_escalation",
  "franchise_escalation",
  "agent_guidance",
  "sla_breach",
  "task_overdue", // bu tartışılır ama yığılma riski yüksek
];

// Agent tipi → Türkçe özet başlık eşleştirmesi
const AGGREGATE_TITLES: Record<string, string> = {
  escalation_info: "Bugünkü Bilgilendirme Özeti",
  agent_escalation_info: "Agent Bilgilendirme Özeti",
  agent_escalation: "Bugünkü Agent Eskalasyonları",
  franchise_escalation: "Bugünkü Franchise Eskalasyonları",
  agent_guidance: "Bugünkü Agent Önerileri",
  sla_breach: "SLA İhlal Özeti",
  task_overdue: "Geciken Görev Özeti",
};

// ═══════════════════════════════════════════════════════════
// 1) ARCHIVE: Geriye dönük spam temizliği
// ═══════════════════════════════════════════════════════════
async function archiveOldSpam(dryRun = false) {
  console.log("🧹 Geriye dönük spam temizliği başlıyor...");

  // Şu andan 24 saat öncesi (son 24 saati ellemiyoruz, yeni/aktif)
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  console.log(`   Cutoff: ${cutoff.toISOString()} (24 saatten eski)`);
  console.log(`   Tipler: ${SPAM_TYPES.join(", ")}`);

  // Önce kaç kayıt etkilenecek?
  const [count] = await db
    .select({ c: sql<number>`count(*)` })
    .from(notifications)
    .where(
      and(
        inArray(notifications.type, SPAM_TYPES),
        eq(notifications.isRead, false),
        eq(notifications.isArchived, false),
        lt(notifications.createdAt, cutoff)
      )
    );

  console.log(`   Etkilenecek kayıt: ${count.c}`);

  if (dryRun) {
    console.log("   🔸 DRY-RUN modu — kayıt UPDATE edilmiyor");
    return count.c;
  }

  // Gerçek archive
  const result = await db
    .update(notifications)
    .set({ isArchived: true })
    .where(
      and(
        inArray(notifications.type, SPAM_TYPES),
        eq(notifications.isRead, false),
        eq(notifications.isArchived, false),
        lt(notifications.createdAt, cutoff)
      )
    );

  console.log(`   ✅ Arşivlendi: ${count.c} kayıt`);
  return count.c;
}

// ═══════════════════════════════════════════════════════════
// 2) AGGREGATE: Günlük özet bildirimi üret
// ═══════════════════════════════════════════════════════════
async function aggregateToday() {
  console.log("📊 Günlük özet bildirimleri üretiliyor...");

  // Bugünün başı (00:00)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  console.log(`   Tarih: ${todayStart.toISOString().split("T")[0]}`);

  // Kullanıcı × tip bazlı bugün sayım
  const aggregates = await db
    .select({
      userId: notifications.userId,
      type: notifications.type,
      count: sql<number>`count(*)::int`,
      latestMessage: sql<string>`MAX(${notifications.message})`,
      branchId: sql<number | null>`MAX(${notifications.branchId})`,
    })
    .from(notifications)
    .where(
      and(
        inArray(notifications.type, SPAM_TYPES),
        eq(notifications.isRead, false),
        eq(notifications.isArchived, false),
        gte(notifications.createdAt, todayStart)
      )
    )
    .groupBy(notifications.userId, notifications.type);

  console.log(`   Bulunan kullanıcı×tip çifti: ${aggregates.length}`);

  let createdCount = 0;

  for (const agg of aggregates) {
    // Eğer 3'ten az bildirim varsa, aggregate gereksiz (zaten az)
    if (agg.count < 3) continue;

    const title = AGGREGATE_TITLES[agg.type] || "Bugünkü Bildirim Özeti";
    const message = `${agg.count} adet ${agg.type} bildirimi geldi. En son: "${agg.latestMessage.substring(0, 80)}..."`;

    // Aynı gün + aynı tip için mevcut aggregate var mı?
    const [existing] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, agg.userId),
          eq(notifications.type, `${agg.type}_aggregate`),
          gte(notifications.createdAt, todayStart)
        )
      )
      .limit(1);

    if (existing) {
      // Güncelleme: aynı gün içinde tekrar çağrıldıysa mesajı güncelle
      await db
        .update(notifications)
        .set({ message })
        .where(eq(notifications.id, existing.id));
      console.log(`   🔄 Güncellendi: user=${agg.userId} type=${agg.type} count=${agg.count}`);
    } else {
      // Yeni aggregate bildirim oluştur
      await db.insert(notifications).values({
        userId: agg.userId,
        type: `${agg.type}_aggregate`,
        title,
        message,
        branchId: agg.branchId,
        isRead: false,
        isArchived: false,
      });
      createdCount++;
      console.log(`   ✅ Yeni aggregate: user=${agg.userId} type=${agg.type} count=${agg.count}`);
    }

    // Orijinal detayları arşivle (artık özet var)
    await db
      .update(notifications)
      .set({ isArchived: true })
      .where(
        and(
          eq(notifications.userId, agg.userId),
          eq(notifications.type, agg.type),
          eq(notifications.isRead, false),
          eq(notifications.isArchived, false),
          gte(notifications.createdAt, todayStart)
        )
      );
  }

  console.log(`   📊 Üretilen aggregate: ${createdCount}`);
  return createdCount;
}

// ═══════════════════════════════════════════════════════════
// 3) STATS: Durum raporu
// ═══════════════════════════════════════════════════════════
async function showStats() {
  console.log("📊 Notification Durum Raporu");
  console.log("─".repeat(60));

  const [total] = await db.select({ c: sql<number>`count(*)::int` }).from(notifications);
  const [unread] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.isRead, false), eq(notifications.isArchived, false)));
  const [archived] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(notifications)
    .where(eq(notifications.isArchived, true));

  console.log(`  Toplam      : ${total.c}`);
  console.log(`  Okunmamış   : ${unread.c}`);
  console.log(`  Arşivlenmiş : ${archived.c}`);
  console.log("");

  // Tip dağılımı (ilk 15)
  const byType = await db
    .select({
      type: notifications.type,
      unread: sql<number>`SUM(CASE WHEN is_read=false AND is_archived=false THEN 1 ELSE 0 END)::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(notifications)
    .groupBy(notifications.type)
    .orderBy(sql`SUM(CASE WHEN is_read=false AND is_archived=false THEN 1 ELSE 0 END) DESC`)
    .limit(15);

  console.log("  Tip Dağılımı (okunmamış DESC, ilk 15):");
  for (const t of byType) {
    const flag = SPAM_TYPES.includes(t.type) ? "🔴" : "  ";
    console.log(`    ${flag} ${t.type.padEnd(35)} ${String(t.unread).padStart(6)} / ${t.total}`);
  }
}

// ═══════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════
async function main() {
  const mode = process.argv[2] || "stats";
  const dryRun = process.argv.includes("--dry-run");

  console.log("═".repeat(60));
  console.log(`  DOSPRESSO Notification Aggregation — ${new Date().toISOString()}`);
  console.log(`  Mode: ${mode}${dryRun ? " (DRY-RUN)" : ""}`);
  console.log("═".repeat(60));
  console.log("");

  // Önce durum raporu
  await showStats();
  console.log("");

  if (mode === "archive") {
    const n = await archiveOldSpam(dryRun);
    console.log(`\n✅ Archive tamamlandı — ${n} kayıt etkilendi`);
  } else if (mode === "aggregate") {
    const archived = await archiveOldSpam(dryRun);
    console.log("");
    if (!dryRun) {
      const created = await aggregateToday();
      console.log(`\n✅ Aggregate tamamlandı — ${archived} arşivlendi, ${created} özet oluştu`);
    }
  } else if (mode === "stats") {
    console.log("ℹ️  Sadece rapor çalıştırıldı. Temizlik için:");
    console.log("    npx tsx server/scripts/notification-aggregation.ts archive --dry-run");
    console.log("    npx tsx server/scripts/notification-aggregation.ts archive");
    console.log("    npx tsx server/scripts/notification-aggregation.ts aggregate");
  } else {
    console.log("❌ Bilinmeyen mod. Kullanım: stats | archive | aggregate [--dry-run]");
    process.exit(1);
  }

  // Son durum
  console.log("\n" + "═".repeat(60));
  console.log("Son Durum:");
  await showStats();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ HATA:", e);
    process.exit(1);
  });
