/**
 * DOSPRESSO Pilot Simülasyon — 1 Aylık Gerçekçi Test Verisi
 * 
 * Kullanım: npx tsx server/seed-pilot-simulation.ts
 * Sıfırlama: npx tsx server/seed-pilot-simulation.ts --reset
 * 
 * Tüm test verileri sourceType='seed_test' ile işaretlenir.
 * Pilot başlangıcında admin panelinden veya --reset ile silinebilir.
 */

import { db } from "./db";
import { sql } from "drizzle-orm";

const IS_RESET = process.argv.includes("--reset");
const SEED_TAG = "seed_test";

// 30 günlük zaman aralığı
const START_DATE = new Date("2026-03-01T00:00:00+03:00");
const END_DATE = new Date("2026-04-01T00:00:00+03:00");
const DAYS = 31;

// Rastgele helper'lar
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[rand(0, arr.length - 1)];
const chance = (pct: number) => Math.random() * 100 < pct;
const fmtDate = (d: Date) => d.toISOString();
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const addHours = (d: Date, h: number) => new Date(d.getTime() + h * 3600000);
const addMinutes = (d: Date, m: number) => new Date(d.getTime() + m * 60000);

// ═══ Türkçe veri ═══
const FEEDBACK_COMMENTS_GOOD = [
  "Kahve harika, personel çok ilgili",
  "Her zaman geliyorum, kalite tutarlı",
  "Çok güzel bir mekan, tavsiye ederim",
  "Espresso mükemmel, latte art çok güzel",
  "Servis hızlı, personel güler yüzlü",
  "Dekorasyonu çok beğendim, temiz ve ferah",
  "Türk kahvesi en iyisi burada",
  "Çalışanlar çok profesyonel",
];
const FEEDBACK_COMMENTS_MID = [
  "Kahve iyi ama bekleme süresi uzun",
  "Fiyatlar biraz yüksek ama kaliteli",
  "Mekan güzel ama müzik çok yüksek",
  "Personel iyi ama servis yavaş",
  "Ürün kaliteli ama porsiyon küçük",
];
const FEEDBACK_COMMENTS_BAD = [
  "Tuvalet temizliği yetersiz",
  "Siparişim yanlış geldi",
  "Kahve soğuk servis edildi",
  "Personel ilgisiz",
  "Çok uzun bekledim",
  "Bardak kirli geldi",
];

const TASK_DESCRIPTIONS = [
  "Günlük açılış kontrollerini tamamla",
  "Kapanış temizlik prosedürünü uygula",
  "Stok sayımı yap ve eksikleri bildir",
  "Ekipman bakım kontrolü yap",
  "Yeni personel oryantasyonunu tamamla",
  "Vitrin düzenlemesini güncelle",
  "Müşteri geri bildirimlerini incele ve yanıtla",
  "Haftalık hijyen kontrolünü tamamla",
  "Malzeme siparişini hazırla",
  "Personel değerlendirme formunu doldur",
  "Kampanya materyallerini yerleştir",
  "Kasa sayımı ve mutabakat yap",
  "Eğitim modülünü tamamla",
  "Reçete güncellemelerini incele",
  "Vardiya devir teslim formunu doldur",
];

const FAULT_DESCRIPTIONS = [
  { equipment: "Espresso Makinesi", desc: "Basınç düzensiz, shot kalitesi düşük" },
  { equipment: "Kahve Değirmeni", desc: "Öğütme ayarı kayıyor, kalibre edilmeli" },
  { equipment: "Buzdolabı", desc: "Sıcaklık 8°C üzerine çıkıyor" },
  { equipment: "Bulaşık Makinesi", desc: "Su tahliye problemi" },
  { equipment: "Buz Makinesi", desc: "Buz üretim kapasitesi düştü" },
  { equipment: "POS Terminali", desc: "Ekran donuyor, yeniden başlatma gerekli" },
  { equipment: "Süt Köpürtücü", desc: "Buhar basıncı yetersiz" },
  { equipment: "Filtre Kahve Makinesi", desc: "Isıtıcı plaka çalışmıyor" },
  { equipment: "Vitrin Dolabı", desc: "Aydınlatma arızası" },
  { equipment: "Klima", desc: "Soğutma kapasitesi düşük" },
];

const TICKET_SUBJECTS = [
  { dept: "teknik", title: "Espresso makinesi basınç sorunu", priority: "yüksek" },
  { dept: "teknik", title: "POS terminal donma problemi", priority: "normal" },
  { dept: "teknik", title: "Buzdolabı sıcaklık alarmı", priority: "acil" },
  { dept: "lojistik", title: "Eksik ürün teslimatı", priority: "yüksek" },
  { dept: "lojistik", title: "Geç gelen sipariş", priority: "normal" },
  { dept: "muhasebe", title: "Fatura düzeltme talebi", priority: "normal" },
  { dept: "muhasebe", title: "Cari hesap mutabakat", priority: "normal" },
  { dept: "trainer", title: "Yeni reçete eğitim talebi", priority: "normal" },
  { dept: "trainer", title: "Barista sertifika yenileme", priority: "düşük" },
  { dept: "marketing", title: "Kampanya materyali ihtiyacı", priority: "normal" },
  { dept: "hr", title: "Personel izin talebi sistemi", priority: "düşük" },
];

const ANNOUNCEMENTS = [
  { title: "Yeni Espresso Reçetesi Yayınlandı", body: "Tüm şubelerde yeni single origin espresso reçetesini uygulamaya başlayın. Detaylar Akademi modülünde." },
  { title: "Ramazan Mesai Düzenlemesi", body: "1-30 Mart arası mesai saatleri 09:00-22:00 olarak güncellenmiştir. Vardiya planlarını kontrol edin." },
  { title: "Hijyen Denetim Haftası", body: "15-22 Mart arası tüm şubelerde hijyen denetimi yapılacaktır. Hazırlıklarınızı tamamlayın." },
  { title: "Yeni Personel Oryantasyon Programı", body: "Mart ayında katılan yeni personel için oryantasyon programı güncellendi." },
  { title: "Pilot Başlangıç Hazırlıkları", body: "DOSPRESSO dijital yönetim sistemi pilot süreci başlıyor. Tüm personelin sisteme giriş yapması bekleniyor." },
];

async function getPilotData() {
  // Pilot şubelerini bul
  const branches = await db.execute(sql`
    SELECT id, name FROM branches 
    WHERE name ILIKE '%lara%' OR name ILIKE '%ışıklar%' OR name ILIKE '%isiklar%' 
    OR name ILIKE '%fabrika%' OR name ILIKE '%merkez%' OR name ILIKE '%hq%'
    OR id IN (1, 24)
    ORDER BY id LIMIT 6
  `);
  
  // Tüm şubeleri al (fallback)
  const allBranches = await db.execute(sql`SELECT id, name FROM branches WHERE is_active = true ORDER BY id LIMIT 10`);
  
  const branchList = (branches as any).rows?.length > 0 ? (branches as any).rows : (allBranches as any).rows || [];
  
  // Her şubedeki personeli al
  const users = await db.execute(sql`
    SELECT id, branch_id, role, first_name, last_name 
    FROM users WHERE is_active = true AND branch_id IS NOT NULL
    ORDER BY branch_id, role
  `);
  const userList = (users as any).rows || [];
  
  // HQ kullanıcıları
  const hqUsers = await db.execute(sql`
    SELECT id, role, first_name, last_name 
    FROM users WHERE is_active = true AND (branch_id IS NULL OR role IN ('ceo','cgo','coach','trainer','admin'))
    ORDER BY role
  `);
  const hqList = (hqUsers as any).rows || [];
  
  return { branches: branchList, users: userList, hqUsers: hqList };
}

async function resetTestData() {
  console.log("🗑️  Test verilerini sıfırlıyorum...");
  
  // sourceType='seed_test' olan tüm kayıtları sil
  await db.execute(sql`DELETE FROM customer_feedback WHERE source = 'seed_test'`);
  await db.execute(sql`DELETE FROM tasks WHERE source_type = 'seed_test'`);
  await db.execute(sql`DELETE FROM equipment_faults WHERE description LIKE '%[TEST]%'`);
  await db.execute(sql`DELETE FROM support_tickets WHERE subject LIKE '%[TEST]%'`);
  await db.execute(sql`DELETE FROM hq_support_tickets WHERE title LIKE '%[TEST]%'`);
  await db.execute(sql`DELETE FROM announcements WHERE title LIKE '%[TEST]%'`);
  await db.execute(sql`DELETE FROM cowork_channels WHERE name LIKE '%test-%'`);
  await db.execute(sql`DELETE FROM notifications WHERE type = 'seed_test'`);
  
  console.log("✅ Test verileri silindi.");
}

async function seedCustomerFeedback(branches: any[], users: any[]) {
  console.log("\n📝 Müşteri geri bildirimi oluşturuluyor...");
  let count = 0;
  
  for (let day = 0; day < DAYS; day++) {
    const date = addDays(START_DATE, day);
    
    for (const branch of branches) {
      // Her şube günde 1-5 geri bildirim
      const feedbackCount = rand(1, 5);
      
      for (let f = 0; f < feedbackCount; f++) {
        const rating = (() => {
          // Şube bazlı ağırlıklı puanlama
          const branchName = (branch.name || "").toLowerCase();
          if (branchName.includes("lara")) return pick([1, 2, 2, 3, 3, 3, 4, 4, 5]); // avg ~3.2
          if (branchName.includes("ışıklar") || branchName.includes("isiklar")) return pick([2, 3, 3, 4, 4, 4, 4, 5, 5]); // avg ~3.8
          return pick([3, 3, 4, 4, 4, 4, 5, 5, 5]); // avg ~4.1
        })();
        
        const comment = rating >= 4 ? pick(FEEDBACK_COMMENTS_GOOD) : 
                        rating >= 3 ? pick(FEEDBACK_COMMENTS_MID) : pick(FEEDBACK_COMMENTS_BAD);
        
        const hour = rand(9, 21);
        const feedbackTime = addHours(addMinutes(date, rand(0, 59)), hour);
        
        // SLA: %70 yanıtlanmış, %15 SLA dahilinde bekleniyor, %15 SLA aşmış
        const hasResponse = chance(70);
        const slaHours = 24;
        const responseTime = hasResponse ? addHours(feedbackTime, rand(1, 36)) : null;
        
        try {
          await db.execute(sql`
            INSERT INTO customer_feedback (
              branch_id, source, rating, 
              service_rating, cleanliness_rating, product_rating, staff_rating,
              comment, guest_name, guest_phone,
              sla_deadline_hours, branch_response_at, branch_response_text,
              status, created_at, updated_at
            ) VALUES (
              ${branch.id}, 'seed_test', ${rating},
              ${rand(rating - 1, Math.min(5, rating + 1))}, ${rand(rating - 1, Math.min(5, rating + 1))}, 
              ${rand(rating - 1, Math.min(5, rating + 1))}, ${rand(rating - 1, Math.min(5, rating + 1))},
              ${comment}, ${`Misafir ${rand(100, 999)}`}, ${`05${rand(30, 59)}${rand(1000000, 9999999)}`},
              ${slaHours}, ${responseTime ? fmtDate(responseTime) : null}, 
              ${hasResponse ? "Değerli geri bildiriminiz için teşekkür ederiz." : null},
              ${hasResponse ? "responded" : (chance(50) ? "pending" : "new")},
              ${fmtDate(feedbackTime)}, ${fmtDate(feedbackTime)}
            )
          `);
          count++;
        } catch (e) {
          // Skip duplicates or errors
        }
      }
    }
  }
  console.log(`  ✅ ${count} müşteri geri bildirimi oluşturuldu`);
}

async function seedTasks(branches: any[], users: any[], hqUsers: any[]) {
  console.log("\n📋 Görevler oluşturuluyor...");
  let count = 0;
  
  const coaches = hqUsers.filter((u: any) => ["coach", "trainer", "ceo", "cgo"].includes(u.role));
  if (coaches.length === 0) { console.log("  ⚠️ HQ kullanıcı bulunamadı, görev atlaması"); return; }
  
  for (let day = 0; day < DAYS; day++) {
    const date = addDays(START_DATE, day);
    
    // Günde 2-4 görev oluştur
    const taskCount = rand(2, 4);
    for (let t = 0; t < taskCount; t++) {
      const branch = pick(branches);
      const branchUsers = users.filter((u: any) => u.branch_id === branch.id);
      const assignee = branchUsers.length > 0 ? pick(branchUsers) : null;
      const assigner = pick(coaches);
      const desc = pick(TASK_DESCRIPTIONS);
      const priority = pick(["düşük", "orta", "orta", "yüksek", "yüksek", "kritik"]);
      const dueDate = addDays(date, rand(1, 7));
      
      // Eski görevler tamamlanmış olma olasılığı yüksek
      const daysAgo = DAYS - day;
      const isCompleted = chance(daysAgo > 20 ? 80 : daysAgo > 10 ? 60 : 30);
      const isOverdue = !isCompleted && chance(20);
      const status = isCompleted ? "onaylandi" : isOverdue ? "gecikmiş" : pick(["beklemede", "devam_ediyor"]);
      
      try {
        await db.execute(sql`
          INSERT INTO tasks (
            branch_id, assigned_to_id, assigned_by_id, description,
            status, priority, due_date, source_type,
            completed_at, created_at, updated_at
          ) VALUES (
            ${branch.id}, ${assignee?.id || assigner.id}, ${assigner.id}, ${desc},
            ${status}, ${priority}, ${fmtDate(dueDate)}, 'seed_test',
            ${isCompleted ? fmtDate(addDays(date, rand(0, 3))) : null},
            ${fmtDate(addHours(date, rand(8, 17)))}, ${fmtDate(addHours(date, rand(8, 17)))}
          )
        `);
        count++;
      } catch (e) {
        // Skip
      }
    }
  }
  console.log(`  ✅ ${count} görev oluşturuldu`);
}

async function seedFaults(branches: any[], users: any[]) {
  console.log("\n🔧 Arıza kayıtları oluşturuluyor...");
  let count = 0;
  
  for (const branch of branches) {
    const branchUsers = users.filter((u: any) => u.branch_id === branch.id);
    if (branchUsers.length === 0) continue;
    
    // Şube bazlı arıza sayısı (Lara daha çok)
    const branchName = (branch.name || "").toLowerCase();
    const faultCount = branchName.includes("lara") ? rand(8, 12) : rand(2, 6);
    
    for (let f = 0; f < faultCount; f++) {
      const fault = pick(FAULT_DESCRIPTIONS);
      const day = rand(0, DAYS - 1);
      const date = addDays(START_DATE, day);
      const reporter = pick(branchUsers);
      const daysAgo = DAYS - day;
      
      const status = daysAgo > 20 ? pick(["resolved", "resolved", "resolved", "in_progress"]) :
                     daysAgo > 10 ? pick(["resolved", "in_progress", "in_progress", "open"]) :
                     pick(["open", "open", "in_progress", "waiting_parts"]);
      const priority = pick(["düşük", "orta", "orta", "yüksek", "yüksek", "kritik"]);
      
      try {
        await db.execute(sql`
          INSERT INTO equipment_faults (
            branch_id, reported_by_id, equipment_name, description,
            status, priority, priority_level, current_stage,
            created_at, updated_at
          ) VALUES (
            ${branch.id}, ${reporter.id}, ${fault.equipment}, ${`[TEST] ${fault.desc}`},
            ${status === "resolved" ? "cozuldu" : status === "open" ? "acik" : "devam_ediyor"},
            ${priority},
            ${priority === "kritik" ? "red" : priority === "yüksek" ? "yellow" : "green"},
            ${status === "resolved" ? "resolved" : status === "waiting_parts" ? "waiting_parts" : "diagnosis"},
            ${fmtDate(addHours(date, rand(8, 18)))}, ${fmtDate(addHours(date, rand(8, 18)))}
          )
        `);
        count++;
      } catch (e) {
        // Skip
      }
    }
  }
  console.log(`  ✅ ${count} arıza kaydı oluşturuldu`);
}

async function seedTickets(branches: any[], users: any[], hqUsers: any[]) {
  console.log("\n🎫 Destek talepleri oluşturuluyor...");
  let count = 0;
  
  for (let i = 0; i < 25; i++) {
    const ticket = pick(TICKET_SUBJECTS);
    const branch = pick(branches);
    const branchUsers = users.filter((u: any) => u.branch_id === branch.id);
    const creator = branchUsers.length > 0 ? pick(branchUsers) : pick(hqUsers);
    const day = rand(0, DAYS - 1);
    const date = addDays(START_DATE, day);
    const daysAgo = DAYS - day;
    const status = daysAgo > 15 ? "cozuldu" : daysAgo > 7 ? pick(["cozuldu", "islemde"]) : pick(["acik", "islemde"]);
    
    try {
      await db.execute(sql`
        INSERT INTO support_tickets (
          subject, description, department, priority, status,
          branch_id, created_by_user_id, 
          created_at, updated_at
        ) VALUES (
          ${`[TEST] ${ticket.title}`}, ${`${ticket.title} — detaylı açıklama`},
          ${ticket.dept}, ${ticket.priority}, ${status},
          ${branch.id}, ${creator.id},
          ${fmtDate(addHours(date, rand(8, 18)))}, ${fmtDate(addHours(date, rand(8, 18)))}
        )
      `);
      count++;
    } catch (e) {
      // Skip
    }
  }
  console.log(`  ✅ ${count} destek talebi oluşturuldu`);
}

async function seedAnnouncements(hqUsers: any[]) {
  console.log("\n📢 Duyurular oluşturuluyor...");
  let count = 0;
  const admin = hqUsers.find((u: any) => u.role === "admin" || u.role === "ceo") || hqUsers[0];
  
  for (let i = 0; i < ANNOUNCEMENTS.length; i++) {
    const ann = ANNOUNCEMENTS[i];
    const date = addDays(START_DATE, i * 7);
    try {
      await db.execute(sql`
        INSERT INTO announcements (title, body, author_id, is_active, target_audience, priority, created_at, updated_at)
        VALUES (${`[TEST] ${ann.title}`}, ${ann.body}, ${admin?.id || 'admin'}, true, 'all', ${i === 0 ? 'high' : 'normal'}, ${fmtDate(date)}, ${fmtDate(date)})
      `);
      count++;
    } catch (e) {
      // Skip
    }
  }
  console.log(`  ✅ ${count} duyuru oluşturuldu`);
}

async function seedCoworkChannels(hqUsers: any[]) {
  console.log("\n💬 Cowork kanalları oluşturuluyor...");
  const channels = [
    { name: "test-genel", displayName: "Genel", desc: "Genel iletişim kanalı" },
    { name: "test-teknik", displayName: "Teknik", desc: "Teknik ekip kanalı" },
    { name: "test-egitim", displayName: "Eğitim", desc: "Eğitim ve reçete tartışmaları" },
    { name: "test-operasyon", displayName: "Operasyon", desc: "Operasyonel konular" },
    { name: "test-pilot", displayName: "Pilot Hazırlık", desc: "Pilot süreç koordinasyonu" },
  ];
  
  const creator = hqUsers.find((u: any) => u.role === "admin") || hqUsers[0];
  let count = 0;
  
  for (const ch of channels) {
    try {
      await db.execute(sql`
        INSERT INTO cowork_channels (name, display_name, description, created_by_id, channel_type, is_archived, created_at)
        VALUES (${ch.name}, ${ch.displayName}, ${ch.desc}, ${creator?.id || 'admin'}, 'department', false, NOW())
      `);
      count++;
    } catch (e) {
      // Skip if columns don't match
    }
  }
  console.log(`  ✅ ${count} cowork kanalı oluşturuldu`);
}

// ═══ ANA FONKSİYON ═══
async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  DOSPRESSO Pilot Simülasyon Seed");
  console.log("  Tarih aralığı: 1 Mart — 1 Nisan 2026");
  console.log("═══════════════════════════════════════════\n");
  
  if (IS_RESET) {
    await resetTestData();
    process.exit(0);
  }
  
  const { branches, users, hqUsers } = await getPilotData();
  
  console.log(`Bulunan şubeler: ${branches.length}`);
  branches.forEach((b: any) => console.log(`  - ${b.name} (id:${b.id})`));
  console.log(`Şube personeli: ${users.length}`);
  console.log(`HQ kullanıcıları: ${hqUsers.length}`);
  
  if (branches.length === 0) {
    console.error("❌ Şube bulunamadı! Önce şube seed'i çalıştırın.");
    process.exit(1);
  }
  
  // Sırayla seed et
  await seedCustomerFeedback(branches, users);
  await seedTasks(branches, users, hqUsers);
  await seedFaults(branches, users);
  await seedTickets(branches, users, hqUsers);
  await seedAnnouncements(hqUsers);
  await seedCoworkChannels(hqUsers);
  
  console.log("\n═══════════════════════════════════════════");
  console.log("  ✅ Pilot simülasyon verisi tamamlandı!");
  console.log("  Sıfırlamak için: npx tsx server/seed-pilot-simulation.ts --reset");
  console.log("═══════════════════════════════════════════");
  
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed hatası:", err);
  process.exit(1);
});
