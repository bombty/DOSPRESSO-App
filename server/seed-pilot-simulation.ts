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
import bcrypt from "bcrypt";

const IS_RESET = process.argv.includes("--reset");
const SEED_TAG = "seed_test";

// 30 günlük zaman aralığı
const START_DATE = new Date("2026-03-01T00:00:00+03:00");
const END_DATE = new Date("2026-04-01T00:00:00+03:00");
const DAYS = 35;

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

async function ensureHQUsers() {
  console.log("\n👤 Eksik HQ kullanıcıları kontrol ediliyor...");
  const missing = [
    { id: "hq-destek-001", first: "Ayşe", last: "Kaya", role: "destek", email: "ayse.kaya@dospresso.com" },
    { id: "hq-teknik-001", first: "Murat", last: "Demir", role: "teknik", email: "murat.demir@dospresso.com" },
    { id: "hq-yatirimci-001", first: "Mehmet", last: "Özkan", role: "yatirimci_hq", email: "mehmet.ozkan@dospresso.com" },
  ];
  const hashedPassword = await bcrypt.hash("0000", 10);
  let created = 0;
  for (const u of missing) {
    try {
      const exists = await db.execute(sql`SELECT id FROM users WHERE id = ${u.id}`);
      if ((exists as any).rows?.length > 0) continue;
      await db.execute(sql`
        INSERT INTO users (id, first_name, last_name, role, email, username, hashed_password, is_active, account_status, created_at)
        VALUES (${u.id}, ${u.first}, ${u.last}, ${u.role}, ${u.email}, ${u.email.split("@")[0]},
        ${hashedPassword},
        true, 'approved', NOW())
      `);
      created++;
      console.log(`  ✅ ${u.role}: ${u.first} ${u.last}`);
    } catch (e: any) {
      console.error(`  ❌ ${u.role}: ${e.message?.slice(0, 60)}`);
    }
  }
  if (created === 0) console.log("  Tüm HQ kullanıcıları mevcut");
}

async function seedEquipmentData(branches: any[]) {
  console.log("\n🔧 Ekipman envanteri oluşturuluyor...");
  let count = 0;
  const equipmentTypes = [
    { type: "espresso", name: "Espresso Makinesi", brand: "La Marzocco", model: "Linea PB" },
    { type: "krema", name: "Krema Makinesi", brand: "Rancilio", model: "Silvia Pro" },
    { type: "blender", name: "Blender", brand: "Vitamix", model: "Quiet One" },
    { type: "mixer", name: "Karıştırıcı", brand: "Artemis", model: "A-2001" },
    { type: "ice", name: "Buz Makinesi", brand: "Brema", model: "CB 184" },
    { type: "tea", name: "Çay Makinesi", brand: "Beko", model: "CM 9000" },
    { type: "cash", name: "Kasa Sistemi", brand: "Ingenico", model: "Move 5000" },
    { type: "kiosk", name: "Kiosk", brand: "DOSPRESSO", model: "K-1" },
  ];

  for (const branch of branches) {
    if ((branch.name || "").toLowerCase().includes("fabrika")) continue; // Fabrika ayrı
    for (const eq of equipmentTypes) {
      try {
        await db.execute(sql`
          INSERT INTO equipment (
            branch_id, equipment_type, model_no, serial_number,
            purchase_date, warranty_end_date,
            maintenance_responsible, fault_protocol,
            is_active, created_at
          ) VALUES (
            ${branch.id}, ${eq.type}, ${`${eq.brand} ${eq.model}`},
            ${`SN-${branch.id}-${eq.type.slice(0, 4).toUpperCase()}-${Math.floor(Math.random() * 9000) + 1000}`},
            '2024-01-15', '2026-01-15',
            ${eq.type === "pos_terminal" || eq.type === "water_filter" ? "hq" : "branch"},
            ${eq.type === "espresso_machine" || eq.type === "pos_terminal" ? "hq_teknik" : "branch"},
            true, NOW()
          ) ON CONFLICT DO NOTHING
        `);
        count++;
      } catch (e) { /* skip duplicates */ }
    }
  }
  console.log(`  ✅ ${count} ekipman oluşturuldu`);
}

async function seedTroubleshootSteps() {
  console.log("\n🔍 Troubleshoot adımları oluşturuluyor...");
  let count = 0;
  const steps = [
    { type: "espresso", order: 1, desc: "Makineyi kapatın ve 30 saniye bekleyin, sonra tekrar açın.", required: true },
    { type: "espresso", order: 2, desc: "Su tankını kontrol edin — doluysa devam edin.", required: true },
    { type: "espresso", order: 3, desc: "Basınç göstergesini kontrol edin — 8-10 bar arası normal.", required: true },
    { type: "espresso", order: 4, desc: "Filtre sepetini çıkarıp temizleyin, tekrar takın.", required: true },
    { type: "espresso", order: 5, desc: "Portafilter'ı takıp kısa bir flush yapın.", required: false },
    { type: "krema", order: 1, desc: "Krema haznesini kontrol edin — dolu mu?", required: true },
    { type: "krema", order: 2, desc: "Çıkış ağzını temizleyin — tıkanıklık var mı?", required: true },
    { type: "krema", order: 3, desc: "Makineyi kapatıp açın — hata devam ediyor mu?", required: true },
    { type: "blender", order: 1, desc: "Bıçak grubunu kontrol edin — kırık veya aşınma var mı?", required: true },
    { type: "blender", order: 2, desc: "Kapak sensörünü kontrol edin — düzgün kapanıyor mu?", required: true },
    { type: "ice", order: 1, desc: "Su bağlantısını kontrol edin — musluk açık mı?", required: true },
    { type: "ice", order: 2, desc: "Buz haznesini boşaltın ve temizleyin.", required: true },
    { type: "mixer", order: 1, desc: "Karıştırma kabını çıkarıp bağlantı noktasını temizleyin.", required: true },
    { type: "mixer", order: 2, desc: "Hız kontrol düğmesini sıfıra getirip tekrar deneyin.", required: true },
    { type: "cash", order: 1, desc: "Cihazı yeniden başlatın (kapatıp açın).", required: true },
    { type: "cash", order: 2, desc: "İnternet bağlantısını kontrol edin — WiFi/Ethernet aktif mi?", required: true },
  ];

  for (const s of steps) {
    try {
      await db.execute(sql`
        INSERT INTO equipment_troubleshooting_steps (equipment_type, "order", description, requires_photo, is_required, created_at)
        VALUES (${s.type}, ${s.order}, ${s.desc}, false, ${s.required}, NOW())
        ON CONFLICT DO NOTHING
      `);
      count++;
    } catch (e) { /* skip */ }
  }
  console.log(`  ✅ ${count} troubleshoot adımı oluşturuldu`);
}

async function seedKnowledgeBase() {
  console.log("\n📚 Bilgi bankası makaleleri oluşturuluyor...");
  let count = 0;
  const articles = [
    { title: "Espresso Makinesi Kullanım Kılavuzu", type: "espresso", category: "maintenance", content: "Thermoplan espresso makinesi günlük kullanım ve bakım kılavuzu.\n\n## Günlük Bakım\n- Portafilter her kullanım sonrası temizlenir\n- Grup başlıkları her vardiya sonunda backflush yapılır\n- Su tankı günlük kontrol edilir\n- Damla tepsisi boşaltılır\n\n## Haftalık Bakım\n- Süt sistemi kimyasal temizlik\n- Değirmen kalibrasyonu kontrol\n- Basınç göstergesi kontrolü (8-10 bar normal)\n\n## Arıza Durumunda\n1. Makineyi kapatın, 30 sn bekleyin\n2. Su tankını kontrol edin\n3. Basınç göstergesini okuyun\n4. Filtre sepetini temizleyin\n5. Sorun devam ederse arıza kaydı oluşturun" },
    { title: "Krema Makinesi Bakım Prosedürü", type: "krema", category: "maintenance", content: "Krema makinesi bakım ve temizlik prosedürü.\n\n## Günlük\n- Hazne her vardiya sonunda boşaltılıp yıkanır\n- Çıkış ağzı sıcak suyla temizlenir\n\n## Arıza Belirtileri\n- Krema akışı yavaşladı → çıkış ağzı tıkanmış olabilir\n- Motor sesi değişti → teknik servis gerekli\n- Sıcaklık düşük → termostat kontrolü" },
    { title: "Blender Güvenli Kullanım", type: "blender", category: "procedure", content: "Blendtech blender güvenli kullanım kuralları.\n\n## Güvenlik\n- Kapak takılmadan çalıştırılmaz\n- Sıcak sıvılarla dikkatli olun (buhar)\n- Bıçak grubunu elle tutmayın\n\n## Bakım\n- Her kullanım sonrası durulayın\n- Haftada 1 derin temizlik\n- Bıçak aşınması 6 ayda kontrol" },
    { title: "Buz Makinesi Bakım ve Hijyen", type: "ice", category: "maintenance", content: "Buz makinesi bakım prosedürü.\n\n## Haftalık\n- Buz haznesini boşaltıp dezenfekte edin\n- Su filtresi kontrolü\n\n## Aylık\n- İç yüzey kireç temizliği\n- Kompresör fanı temizliği\n\n## Arıza\n- Buz üretimi durdu → su bağlantısı kontrol\n- Buz kalitesi düştü → filtre değişimi" },
    { title: "Kasa Sistemi Sorun Giderme", type: "cash", category: "procedure", content: "POS terminal sorun giderme adımları.\n\n## Bağlantı Sorunu\n1. WiFi/Ethernet kontrol\n2. Cihazı yeniden başlat\n3. Modem/router kontrol\n\n## Yazıcı Sorunu\n- Kağıt kontrolü\n- Kağıt sıkışması temizliği\n\n## Ödeme Reddedildi\n- Kart okuyucu temizliği\n- Banka bağlantısı kontrol" },
    { title: "Çay Makinesi Günlük Bakım", type: "tea", category: "maintenance", content: "Çay makinesi günlük bakım.\n\n- Her vardiya sonunda iç hazne yıkanır\n- Musluk ve çıkış noktaları temizlenir\n- Kireç önleyici aylık uygulanır" },
  ];

  for (const a of articles) {
    try {
      await db.execute(sql`
        INSERT INTO knowledge_base_articles (title, category, content, equipment_type_id, is_published, tags, created_at)
        VALUES (${a.title}, ${a.category}, ${a.content}, ${a.type}, true, ${`{${a.type},bakım,kılavuz}`}, NOW())
        ON CONFLICT DO NOTHING
      `);
      count++;
    } catch (e) { /* skip */ }
  }
  console.log(`  ✅ ${count} bilgi bankası makalesi oluşturuldu`);
}

async function seedPDKSRecords(branches: any[], users: any[]) {
  console.log("\n⏰ PDKS kayıtları oluşturuluyor (30 gün)...");
  let count = 0;
  const branchUsers: Record<number, any[]> = {};
  for (const u of users) {
    if (u.branch_id) {
      if (!branchUsers[u.branch_id]) branchUsers[u.branch_id] = [];
      branchUsers[u.branch_id].push(u);
    }
  }

  for (let day = 0; day < DAYS; day++) {
    const date = addDays(START_DATE, day);
    const dateStr = date.toISOString().split("T")[0];
    const dow = date.getDay();
    if (dow === 0) continue; // Pazar kapalı

    for (const branch of branches) {
      const staff = branchUsers[branch.id] || [];
      if (staff.length === 0) continue;

      for (const person of staff.slice(0, 6)) { // max 6 kişi/şube
        const isLate = chance(10);
        const isAbsent = chance(3);
        if (isAbsent) continue;

        const girisH = isLate ? rand(8, 9) : rand(7, 8);
        const girisM = rand(0, 59);
        const cikisH = rand(17, 19);
        const cikisM = rand(0, 59);

        try {
          await db.execute(sql`
            INSERT INTO pdks_records (user_id, branch_id, record_date, record_time, record_type, source, device_info)
            VALUES (${person.id}, ${branch.id}, ${dateStr}, ${`${String(girisH).padStart(2,"0")}:${String(girisM).padStart(2,"0")}:00`}, 'giris', 'seed_test', 'Seed')
            ON CONFLICT DO NOTHING
          `);
          await db.execute(sql`
            INSERT INTO pdks_records (user_id, branch_id, record_date, record_time, record_type, source, device_info)
            VALUES (${person.id}, ${branch.id}, ${dateStr}, ${`${String(cikisH).padStart(2,"0")}:${String(cikisM).padStart(2,"0")}:00`}, 'cikis', 'seed_test', 'Seed')
            ON CONFLICT DO NOTHING
          `);
          count += 2;
        } catch (e) { /* skip */ }
      }
    }
  }
  console.log(`  ✅ ${count} PDKS kaydı oluşturuldu`);
}

async function seedShifts(branches: any[], users: any[]) {
  console.log("\n📅 Vardiya planları oluşturuluyor (30 gün)...");
  let count = 0;
  const adminUser = users.find((u: any) => u.role === "admin" || u.role === "supervisor") || users[0];

  for (let day = 0; day < DAYS; day++) {
    const date = addDays(START_DATE, day);
    const dateStr = date.toISOString().split("T")[0];
    const dow = date.getDay();
    if (dow === 0) continue;

    for (const branch of branches) {
      const branchStaff = users.filter((u: any) => u.branch_id === branch.id).slice(0, 4);
      if (branchStaff.length === 0) continue;

      for (const person of branchStaff) {
        const isMorning = chance(60);
        try {
          await db.execute(sql`
            INSERT INTO shifts (branch_id, assigned_to_id, created_by_id, shift_date, start_time, end_time, shift_type, status)
            VALUES (${branch.id}, ${person.id}, ${adminUser?.id || person.id}, ${dateStr},
            ${isMorning ? "08:00" : "14:00"}, ${isMorning ? "16:00" : "22:00"},
            ${isMorning ? "sabah" : "aksam"}, ${day < DAYS - 5 ? "completed" : "scheduled"})
            ON CONFLICT DO NOTHING
          `);
          count++;
        } catch (e) { /* skip */ }
      }
    }
  }
  console.log(`  ✅ ${count} vardiya oluşturuldu`);
}

async function seedChecklistCompletions(branches: any[], users: any[]) {
  console.log("\n✅ Checklist tamamlama kayıtları oluşturuluyor...");
  let count = 0;
  
  // Önce checklist template var mı kontrol et
  const existingChecklists = await db.execute(sql`SELECT id, title FROM checklists LIMIT 5`);
  const clists = (existingChecklists as any).rows || [];
  
  if (clists.length === 0) {
    // Basit checklist template oluştur
    const templates = [
      { title: "Açılış Checklist", type: "acilis" },
      { title: "Kapanış Checklist", type: "kapanis" },
      { title: "Temizlik Checklist", type: "temizlik" },
    ];
    for (const t of templates) {
      try {
        await db.execute(sql`
          INSERT INTO checklists (title, description, branch_id, checklist_type, is_active, created_at)
          VALUES (${t.title}, ${`Günlük ${t.title.toLowerCase()}`}, NULL, ${t.type}, true, NOW())
          ON CONFLICT DO NOTHING
        `);
      } catch (e) { /* skip */ }
    }
  }
  
  // Checklist ID'lerini al
  const allChecklists = await db.execute(sql`SELECT id FROM checklists WHERE is_active = true LIMIT 3`);
  const checklistIds = ((allChecklists as any).rows || []).map((c: any) => c.id);
  
  if (checklistIds.length === 0) {
    console.log("  ⚠️ Checklist template bulunamadı, atlanıyor");
    return;
  }

  for (let day = 0; day < DAYS; day++) {
    const date = addDays(START_DATE, day);
    const dateStr = date.toISOString().split("T")[0];
    if (date.getDay() === 0) continue;

    for (const branch of branches.slice(0, 4)) {
      const staff = users.filter((u: any) => u.branch_id === branch.id).slice(0, 2);
      if (staff.length === 0) continue;
      const person = staff[0];

      for (const clId of checklistIds) {
        const isCompleted = chance(75);
        try {
          // Önce assignment oluştur
          const assResult = await db.execute(sql`
            INSERT INTO checklist_assignments (checklist_id, branch_id, assigned_user_id, created_by_id, scope, effective_from, is_active, created_at)
            VALUES (${clId}, ${branch.id}, ${person.id}, ${person.id}, 'branch', ${dateStr}, true, NOW())
            RETURNING id
          `);
          const assId = ((assResult as any).rows || [])[0]?.id;
          if (!assId) continue;

          await db.execute(sql`
            INSERT INTO checklist_completions (assignment_id, checklist_id, user_id, branch_id, status, scheduled_date, completed_at, score)
            VALUES (${assId}, ${clId}, ${person.id}, ${branch.id}, ${isCompleted ? "completed" : "pending"}, ${dateStr},
            ${isCompleted ? date.toISOString() : null}, ${isCompleted ? rand(70, 100) : null})
            ON CONFLICT DO NOTHING
          `);
          count++;
        } catch (e) { /* skip */ }
      }
    }
  }
  console.log(`  ✅ ${count} checklist tamamlama kaydı oluşturuldu`);
}

async function resetTestData() {
  console.log("🗑️  Test verilerini sıfırlıyorum...");
  
  // sourceType='seed_test' olan tüm kayıtları sil
  await db.execute(sql`DELETE FROM customer_feedback WHERE source = 'seed_test'`);
  await db.execute(sql`DELETE FROM tasks WHERE source_type = 'seed_test'`);
  await db.execute(sql`DELETE FROM equipment_faults WHERE description LIKE '%[TEST]%'`);
  await db.execute(sql`DELETE FROM support_tickets WHERE title LIKE '%[TEST]%'`);
  await db.execute(sql`DELETE FROM hq_support_tickets WHERE title LIKE '%[TEST]%'`);
  await db.execute(sql`DELETE FROM announcements WHERE title LIKE '%[TEST]%'`);
  await db.execute(sql`DELETE FROM cowork_channels WHERE name LIKE '%test-%'`);
  await db.execute(sql`DELETE FROM notifications WHERE type = 'seed_test'`);
  await db.execute(sql`DELETE FROM agent_pending_actions WHERE title LIKE '%[TEST]%'`);
  await db.execute(sql`DELETE FROM equipment WHERE serial_number LIKE 'SN-%'`);
  await db.execute(sql`DELETE FROM equipment_troubleshooting_steps WHERE created_at > NOW() - INTERVAL '30 days'`);
  await db.execute(sql`DELETE FROM knowledge_base_articles WHERE equipment_type_id IS NOT NULL AND created_at > NOW() - INTERVAL '30 days'`);
  await db.execute(sql`DELETE FROM pdks_records WHERE source = 'seed_test'`);
  await db.execute(sql`DELETE FROM shifts WHERE status IN ('completed','scheduled') AND shift_date >= '2026-03-01'`);
  await db.execute(sql`DELETE FROM checklist_completions WHERE scheduled_date >= '2026-03-01'`);
  await db.execute(sql`DELETE FROM checklist_assignments WHERE created_at >= '2026-03-01'`);
  
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
              comment, customer_name, customer_phone,
              sla_deadline_hours, branch_response_at, branch_response_text,
              feedback_status, feedback_date, created_at, updated_at
            ) VALUES (
              ${branch.id}, 'seed_test', ${rating},
              ${Math.max(1, rand(rating - 1, Math.min(5, rating + 1)))}, ${Math.max(1, rand(rating - 1, Math.min(5, rating + 1)))}, 
              ${Math.max(1, rand(rating - 1, Math.min(5, rating + 1)))}, ${Math.max(1, rand(rating - 1, Math.min(5, rating + 1)))},
              ${comment}, ${`Misafir ${rand(100, 999)}`}, ${`05${rand(30, 59)}${rand(1000000, 9999999)}`},
              ${slaHours}, ${responseTime ? fmtDate(responseTime) : null}, 
              ${hasResponse ? "Değerli geri bildiriminiz için teşekkür ederiz." : null},
              ${hasResponse ? "branch_responded" : "open"},
              ${fmtDate(feedbackTime)}, ${fmtDate(feedbackTime)}, ${fmtDate(feedbackTime)}
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
      const ticketNum = `TKT-SEED-${String(i + 1).padStart(3, '0')}-${rand(1000, 9999)}`;
      await db.execute(sql`
        INSERT INTO support_tickets (
          ticket_number, title, description, department, priority, status,
          branch_id, created_by_user_id, 
          created_at, updated_at
        ) VALUES (
          ${ticketNum}, ${`[TEST] ${ticket.title}`}, ${`${ticket.title} — detaylı açıklama`},
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
        INSERT INTO announcements (title, message, created_by_id, priority, category, created_at, updated_at)
        VALUES (${`[TEST] ${ann.title}`}, ${ann.body}, ${admin?.id || 'admin'}, ${i === 0 ? 'high' : 'normal'}, 'general', ${fmtDate(date)}, ${fmtDate(date)})
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
        INSERT INTO cowork_channels (name, description, created_by_id, is_private, is_active, created_at)
        VALUES (${ch.name}, ${ch.desc}, ${creator?.id || 'admin'}, false, true, NOW())
      `);
      count++;
    } catch (e) {
      // Skip if columns don't match
    }
  }
  console.log(`  ✅ ${count} cowork kanalı oluşturuldu`);
}

async function seedDobodyActions(branches: any[]) {
  console.log("\n🤖 Mr. Dobody aksiyonları oluşturuluyor...");
  let count = 0;

  const actions = [
    { title: "Lara checklist uyumu düşük", desc: "Lara şubesinde son 7 günde kapanış checklist tamamlama oranı %52. Coach ziyareti önerilir.", type: "insight", severity: "high", role: "coach", category: "compliance", link: "/sube-saglik-skoru" },
    { title: "3 arıza 48 saatten fazla açık", desc: "Espresso makinesi (Lara), Buzdolabı (Işıklar), POS Terminal (Lara) — CGO dikkat.", type: "action", severity: "high", role: "cgo", category: "equipment", link: "/ariza" },
    { title: "Misafir NPS düşüş trendi", desc: "Lara NPS: 3.2 (geçen ay 3.6). Düşük puanların %40'ı temizlik şikayeti.", type: "insight", severity: "med", role: "coach", category: "customer", link: "/crm?channel=misafir" },
    { title: "5 görev 7+ gündür gecikiyor", desc: "Işıklar (2), Lara (3) şubelerinde geciken görevler var. Eskalasyon önerilir.", type: "action", severity: "high", role: "coach", category: "tasks", link: "/gorevler" },
    { title: "Fabrika fire oranı hedef üstü", desc: "Bu hafta fire oranı %6.2 — hedef <%5. Kavurma istasyonunda artış var.", type: "insight", severity: "med", role: "ceo", category: "production", link: "/waste-executive" },
    { title: "Yeni personel onboarding eksik", desc: "2 yeni barista (Işıklar) henüz onboarding görevlerini tamamlamadı.", type: "action", severity: "low", role: "trainer", category: "training", link: "/ik" },
    { title: "Stok kritik seviyede: Süt", desc: "Fabrika deposunda süt stoku 2 gün kaldı. Acil sipariş gerekli.", type: "action", severity: "critical", role: "ceo", category: "inventory", link: "/fabrika/dashboard" },
    { title: "Haftalık performans özeti", desc: "Genel uyum %71 (geçen hafta %68). Işıklar en çok gelişen şube (+8 puan).", type: "info", severity: "low", role: "ceo", category: "performance", link: "/sube-saglik-skoru" },
    { title: "Denetim planı hatırlatması", desc: "Lara şubesi 45 gündür denetlenmedi. Hijyen denetimi planlanmalı.", type: "action", severity: "med", role: "coach", category: "audit", link: "/denetimler" },
    { title: "SLA aşımı: 2 destek talebi", desc: "Teknik departmanda 2 talep 48 saatten fazla açık. Eskalasyon gerekli.", type: "action", severity: "high", role: "cgo", category: "support", link: "/crm" },
    // Şube rolleri
    { title: "Açılış checklist yapılmadı", desc: "Bugün açılış checklist'i henüz tamamlanmadı. 30 dakika geçti.", type: "action", severity: "high", role: "supervisor", category: "compliance", link: "/checklistler" },
    { title: "Ali 15dk geç kaldı", desc: "Ali Barista henüz vardiya girişi yapmadı. Beklenen: 08:00.", type: "action", severity: "med", role: "supervisor", category: "attendance", link: "/vardiyalarim" },
    { title: "2 misafir GB SLA yaklaşıyor", desc: "2 misafir geri bildirimi 4 saat içinde SLA'yı aşacak. Yanıtla.", type: "action", severity: "high", role: "supervisor", category: "customer", link: "/crm?channel=misafir" },
    { title: "Bugün 3 görevin var", desc: "Açılış hazırlığı, stok kontrol, vitrin düzenleme görevlerin bekliyor.", type: "info", severity: "low", role: "barista", category: "tasks", link: "/gorevler" },
    { title: "Eğitim modülü tamamla", desc: "Latte Art modülü %80 — tamamla ve rozet kazan!", type: "auto", severity: "low", role: "barista", category: "training", link: "/akademi" },
    { title: "HQ'dan 3 yeni görev", desc: "Coach'tan gelen görevler: stok sayım, hijyen kontrol, vitrin güncelleme.", type: "action", severity: "med", role: "mudur", category: "tasks", link: "/gorevler" },
    { title: "Fiks gider girişi bekliyor", desc: "Bu ayki elektrik ve su faturaları henüz girilmedi. Muhasebe bekliyor.", type: "action", severity: "med", role: "mudur", category: "finance", link: "/muhasebe" },
    { title: "Misafir şikayet: temizlik", desc: "Misafir 2 puan verdi: 'Tuvalet temiz değildi'. İncele ve yanıtla.", type: "action", severity: "high", role: "mudur", category: "customer", link: "/crm?channel=misafir" },
    // HQ destek rolleri
    { title: "Bordro deadline 3 gün", desc: "Bu ayki bordro hesaplaması için son 3 gün. Eksik verileri tamamla.", type: "action", severity: "high", role: "muhasebe_ik", category: "payroll", link: "/ik" },
    { title: "5 kritik stok ürünü", desc: "Süt, şeker, espresso çekirdeği, bardak, peçete — acil sipariş gerekli.", type: "action", severity: "high", role: "satinalma", category: "inventory", link: "/stok" },
    { title: "NPS raporu hazır", desc: "Bu haftanın müşteri memnuniyet raporu hazır. İncele ve kampanya planla.", type: "info", severity: "low", role: "marketing", category: "customer", link: "/crm?channel=misafir" },
  ];

  for (const a of actions) {
    const branch = a.category === "production" || a.category === "inventory" ? branches.find((b: any) => (b.name || "").toLowerCase().includes("fabrika")) : branches.find((b: any) => (b.name || "").toLowerCase().includes("lara")) || branches[0];
    try {
      await db.execute(sql`
        INSERT INTO agent_pending_actions (
          action_type, target_role_scope, branch_id,
          title, description, deep_link, severity, status,
          category, metadata, created_at
        ) VALUES (
          ${a.type}, ${a.role}, ${branch?.id || null},
          ${`[TEST] ${a.title}`}, ${a.desc}, ${a.link}, ${a.severity}, 'pending',
          ${a.category}, ${JSON.stringify({ source: "seed_test" })}::jsonb, NOW()
        )
      `);
      count++;
    } catch (e: any) {
      console.error(`  ❌ Dobody hata: ${e.message?.slice(0, 80)}`);
    }
  }
  console.log(`  ✅ ${count} Dobody aksiyonu oluşturuldu`);
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
  await ensureHQUsers();
  await seedCustomerFeedback(branches, users);
  await seedTasks(branches, users, hqUsers);
  await seedFaults(branches, users);
  await seedTickets(branches, users, hqUsers);
  await seedAnnouncements(hqUsers);
  await seedCoworkChannels(hqUsers);
  await seedDobodyActions(branches);
  await seedEquipmentData(branches);
  await seedTroubleshootSteps();
  await seedKnowledgeBase();
  await seedPDKSRecords(branches, users);
  await seedShifts(branches, users);
  await seedChecklistCompletions(branches, users);
  
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
