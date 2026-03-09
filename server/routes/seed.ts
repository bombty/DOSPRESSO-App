import { Router } from "express";
import { isAuthenticated } from "../localAuth";
import { db } from "../db";
import { sql } from "drizzle-orm";

const router = Router();

function requireAdmin(req: any, res: any, next: any) {
  const user = req.user as any;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Yalnızca admin bu işlemi yapabilir' });
  }
  next();
}

router.post('/api/admin/seed-checklists', isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const templates = [
      {
        title: "Sabah Açılış Kontrol Listesi", frequency: "daily", category: "opening",
        timeWindowStart: "06:00", timeWindowEnd: "09:00",
        items: [
          "Işıklar açıldı", "Klima/havalandırma çalışıyor", "Vitrin temizlendi",
          "Kahve makinesi ısınmaya bırakıldı", "Süt stoku kontrol edildi",
          "Kasa açılış sayımı yapıldı", "Müzik sistemi açıldı",
          "Tezgah ve servis alanı temizlendi", "Çöpler boşaltıldı", "Menü panosu kontrol edildi"
        ]
      },
      {
        title: "Akşam Kapanış Kontrol Listesi", frequency: "daily", category: "closing",
        timeWindowStart: "21:00", timeWindowEnd: "23:00",
        items: [
          "Vitrin boşaltıldı ve temizlendi", "Kahve makinesi temizlendi ve kapatıldı",
          "Blender ve ekipmanlar temizlendi", "Süt ve bozulabilir ürünler buzdolabına kaldırıldı",
          "Kasa kapanış sayımı yapıldı", "Çöpler çıkarıldı",
          "Zemin paspaslandı", "Işıklar kapatıldı", "Alarm sistemi aktif edildi"
        ]
      },
      {
        title: "Günlük Temizlik Kontrol Listesi", frequency: "daily", category: "cleaning",
        timeWindowStart: "10:00", timeWindowEnd: "18:00",
        items: [
          "Tezgah dezenfekte edildi", "Lavabo ve musluklar temizlendi",
          "Tuvalet kontrol edildi", "Cam ve aynalar silindi",
          "Ekipman yüzeyleri temizlendi", "Çöp kovaları dezenfekte edildi"
        ]
      },
      {
        title: "Haftalık Derin Temizlik", frequency: "weekly", category: "deep_cleaning",
        items: [
          "Buzdolabı içi temizlendi", "Fırın ve mikrodalga temizlendi",
          "Havalandırma filtreleri kontrol edildi", "Depo düzenlendi",
          "Ekipman bakımları yapıldı", "Dış cephe ve cam temizliği"
        ]
      },
      {
        title: "Vardiya Devir Teslim", frequency: "daily", category: "shift_handover",
        items: [
          "Kasa sayımı eşleşiyor", "Açık siparişler devredildi",
          "Ekipman durumu bilgilendirildi", "Stok eksikleri not edildi",
          "Müşteri şikayetleri aktarıldı"
        ]
      },
      {
        title: "Hijyen Kontrol Listesi", frequency: "daily", category: "hygiene",
        timeWindowStart: "08:00", timeWindowEnd: "20:00",
        items: [
          "Personel kıyafetleri uygun", "Eldiven ve bone kullanımı",
          "El yıkama prosedürü uygulanıyor", "Gıda saklama sıcaklıkları uygun",
          "Son kullanma tarihleri kontrol edildi", "Çapraz kontaminasyon önlemi alındı"
        ]
      },
      {
        title: "Ekipman Günlük Kontrol", frequency: "daily", category: "equipment_daily",
        timeWindowStart: "07:00", timeWindowEnd: "09:00",
        items: [
          "Espresso makinesi basınç kontrolü", "Değirmen ayar kontrolü",
          "Blender çalışma testi", "Buzdolabı sıcaklık kontrolü",
          "Buz makinesi kontrol", "POS cihazı çalışıyor"
        ]
      },
      {
        title: "Stok Sayım Kontrol Listesi", frequency: "weekly", category: "stock_count",
        items: [
          "Kahve çekirdeği stoku", "Süt ve alternatif süt stoku",
          "Şurup ve sos stoku", "Tek kullanımlık malzeme stoku",
          "Temizlik malzemesi stoku", "Ambalaj malzemesi stoku"
        ]
      },
      {
        title: "Müşteri Deneyimi Kontrolü", frequency: "daily", category: "customer_experience",
        timeWindowStart: "10:00", timeWindowEnd: "20:00",
        items: [
          "Oturma alanları temiz ve düzenli", "Menü panosu güncel ve okunaklı",
          "Müzik seviyesi uygun", "Aydınlatma yeterli",
          "WiFi çalışıyor", "Priz noktaları erişilebilir"
        ]
      },
      {
        title: "Gıda Güvenliği Günlük Kontrol", frequency: "daily", category: "food_safety",
        timeWindowStart: "08:00", timeWindowEnd: "20:00",
        items: [
          "Buzdolabı sıcaklığı: 0-4°C", "Dondurucu sıcaklığı: -18°C altı",
          "Sıcak servis sıcaklığı: 65°C üstü", "Son kullanma tarihleri kontrol edildi",
          "FIFO kuralı uygulanıyor", "Temizlik kimyasalları gıdadan ayrı"
        ]
      }
    ];

    let createdCount = 0;
    let assignmentCount = 0;
    const createdIds: number[] = [];

    const branches = await db.execute(sql`SELECT id FROM branches WHERE id NOT IN (23, 24) ORDER BY id`);
    const branchIds = (branches.rows as any[]).map(r => r.id);

    for (const t of templates) {
      const existing = await db.execute(sql`SELECT id FROM checklists WHERE title = ${t.title} LIMIT 1`);
      if ((existing.rows as any[]).length > 0) continue;

      const [checklist] = (await db.execute(sql`
        INSERT INTO checklists (title, frequency, category, scope, time_window_start, time_window_end)
        VALUES (${t.title}, ${t.frequency}, ${t.category}, 'branch', ${t.timeWindowStart || null}, ${t.timeWindowEnd || null})
        RETURNING id
      `)).rows as any[];

      createdIds.push(checklist.id);
      createdCount++;

      for (let i = 0; i < t.items.length; i++) {
        await db.execute(sql`
          INSERT INTO checklist_tasks (checklist_id, task_description, "order", requires_photo)
          VALUES (${checklist.id}, ${t.items[i]}, ${i + 1}, false)
        `);
      }

      const isDailyCore = ['opening', 'closing', 'cleaning', 'hygiene', 'food_safety'].includes(t.category);
      if (isDailyCore) {
        for (const branchId of branchIds) {
          await db.execute(sql`
            INSERT INTO checklist_assignments (checklist_id, scope, branch_id, is_active, created_at)
            VALUES (${checklist.id}, 'branch', ${branchId}, true, NOW())
            ON CONFLICT DO NOTHING
          `);
          assignmentCount++;
        }
      }
    }

    res.json({ success: true, created: createdCount, assignments: assignmentCount, checklistIds: createdIds });
  } catch (error: any) {
    console.error('Seed checklists error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/admin/seed-quiz-questions', isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const modules = await db.execute(sql`SELECT id, title FROM training_modules LIMIT 51`);
    const moduleList = modules.rows as any[];

    let quizMap: Record<number, number> = {};
    const existingQuizzes = await db.execute(sql`SELECT id, module_id FROM module_quizzes`);
    for (const q of existingQuizzes.rows as any[]) {
      if (!quizMap[q.module_id]) quizMap[q.module_id] = q.id;
    }

    for (const mod of moduleList) {
      if (!quizMap[mod.id]) {
        const [newQuiz] = (await db.execute(sql`
          INSERT INTO module_quizzes (module_id, title, passing_score, randomize_questions)
          VALUES (${mod.id}, ${mod.title + ' - Quiz'}, 70, true)
          RETURNING id
        `)).rows as any[];
        quizMap[mod.id] = newQuiz.id;
      }
    }

    const questionSets: { category: string; questions: { q: string; opts: string[]; correct: number; explanation: string }[] }[] = [
      {
        category: "kahve",
        questions: [
          { q: "Espresso çekimi için ideal su sıcaklığı kaç derecedir?", opts: ["85-88°C", "90-96°C", "100°C", "75-80°C"], correct: 1, explanation: "Espresso için ideal su sıcaklığı 90-96°C arasındadır." },
          { q: "Tek shot espresso için standart kahve miktarı nedir?", opts: ["5-7 gram", "7-9 gram", "14-18 gram", "20-22 gram"], correct: 1, explanation: "Tek shot espresso için 7-9 gram kahve kullanılır." },
          { q: "Espresso çekim süresi ideal olarak ne kadardır?", opts: ["10-15 saniye", "20-30 saniye", "35-45 saniye", "50-60 saniye"], correct: 1, explanation: "İdeal espresso çekim süresi 20-30 saniyedir." },
          { q: "Crema nedir?", opts: ["Kahvenin acı tadı", "Espresso üzerindeki altın renkli köpük", "Süt köpüğü", "Kahve çekirdeği türü"], correct: 1, explanation: "Crema, espresso üzerindeki karakteristik altın renkli köpüktür." },
          { q: "Arabica ve Robusta arasındaki temel fark nedir?", opts: ["Arabica daha acıdır", "Robusta daha fazla kafein içerir", "Arabica daha koyu renktedir", "Farklı değildir"], correct: 1, explanation: "Robusta, Arabica'ya göre yaklaşık iki kat daha fazla kafein içerir." },
          { q: "Cold brew kahve ne kadar süre demlenir?", opts: ["1-2 saat", "4-6 saat", "12-24 saat", "48 saat"], correct: 2, explanation: "Cold brew kahve soğuk suda 12-24 saat demlenir." },
          { q: "Latte ve cappuccino arasındaki temel fark nedir?", opts: ["Kahve miktarı", "Süt/köpük oranı", "Bardak boyutu", "Kahve çeşidi"], correct: 1, explanation: "Latte daha fazla ısıtılmış süt, cappuccino daha fazla köpük içerir." },
          { q: "Kahve değirmeni ayarı çok ince olursa ne olur?", opts: ["Kahve hızlı akar", "Kahve çok yavaş akar ve acı olur", "Bir şey değişmez", "Kahve soğuk gelir"], correct: 1, explanation: "Çok ince öğütme, suyun geçişini yavaşlatır ve aşırı ekstraksiyona neden olur." },
          { q: "Flat white ile latte arasındaki fark nedir?", opts: ["Flat white daha küçük ve yoğundur", "Aynı içecektir", "Flat white sütsüzdür", "Latte daha küçüktür"], correct: 0, explanation: "Flat white daha küçük porsiyonda ve daha yoğun mikro köpüklü sütle hazırlanır." },
          { q: "Espresso makinesi basıncı ideal olarak kaç bar olmalıdır?", opts: ["5 bar", "9 bar", "15 bar", "20 bar"], correct: 1, explanation: "Espresso makinesi için ideal basınç 9 bardır." },
          { q: "Pour-over kahve demleme yönteminin özelliği nedir?", opts: ["Basınçla hazırlanır", "Suyun yerçekimiyle kahveden geçmesidir", "Soğuk su kullanılır", "Espresso makinesiyle yapılır"], correct: 1, explanation: "Pour-over yönteminde sıcak su yerçekimiyle kahve üzerinden geçirilir." },
          { q: "Kahve çekirdeği kavrulma dereceleri hangi sıradadır?", opts: ["Koyu, orta, açık", "Açık, orta, koyu", "Sadece koyu kavurma vardır", "Ham, pişmiş, yanmış"], correct: 1, explanation: "Kavurma dereceleri açıktan koyuya doğru gider." },
        ]
      },
      {
        category: "musteri",
        questions: [
          { q: "Müşteri karşılamada ilk yapılması gereken nedir?", opts: ["Siparişi sormak", "Göz teması ve gülümseme ile selamlamak", "Menüyü uzatmak", "Beklemesini söylemek"], correct: 1, explanation: "İlk izlenim için göz teması ve samimi bir gülümseme esastır." },
          { q: "Şikayette bulunan bir müşteriye nasıl yaklaşılmalıdır?", opts: ["Savunmaya geçmek", "Dinlemek, özür dilemek ve çözüm sunmak", "Yöneticiye yönlendirmek", "Görmezden gelmek"], correct: 1, explanation: "Aktif dinleme, empati ve hızlı çözüm önerisi en doğru yaklaşımdır." },
          { q: "Upselling (yukarı satış) nedir?", opts: ["İndirim yapmak", "Daha büyük veya premium ürün önermek", "Ürün iade etmek", "Promosyon dağıtmak"], correct: 1, explanation: "Upselling, müşteriye daha değerli bir alternatif sunmaktır." },
          { q: "Müşterinin siparişini tekrar etmenin amacı nedir?", opts: ["Zaman kazanmak", "Doğruluğu teyit etmek ve güven vermek", "Gereksiz bir adımdır", "Hız göstermek"], correct: 1, explanation: "Sipariş tekrarı hata riskini azaltır ve müşteriye önem verildiğini gösterir." },
          { q: "Bir müşteri uzun süre beklediyse ne yapılmalıdır?", opts: ["Özür dilemek ve bekleme nedenini açıklamak", "Hiçbir şey söylememek", "İndirim kuponu vermek", "Acele etmek"], correct: 0, explanation: "Samimi bir özür ve açıklama müşteri memnuniyetini korur." },
          { q: "DOSPRESSO'da müşteri deneyiminin temel unsuru nedir?", opts: ["Hızlı servis", "Tutarlı kalite ve sıcak iletişim", "Düşük fiyat", "Büyük porsiyon"], correct: 1, explanation: "Marka tutarlılığı ve sıcak müşteri iletişimi temel deneyim unsurlarıdır." },
          { q: "Alerjen bilgisi soran müşteriye ne yapılmalıdır?", opts: ["Tahminde bulunmak", "Alerjen listesini kontrol edip doğru bilgi vermek", "Bilmiyorum demek", "Her şey güvenli demek"], correct: 1, explanation: "Alerjen bilgisi hayati önem taşır, her zaman doğru kaynak kontrol edilmelidir." },
          { q: "Cross-selling (çapraz satış) nedir?", opts: ["İade işlemi", "Siparişe tamamlayıcı ürün önermek", "Fiyat artırmak", "Stok saymak"], correct: 1, explanation: "Çapraz satış, mevcut siparişe uygun ek ürünler önerme tekniğidir." },
        ]
      },
      {
        category: "hijyen",
        questions: [
          { q: "HACCP nedir?", opts: ["Bir kahve türü", "Tehlike analizi ve kritik kontrol noktaları sistemi", "Bir temizlik markası", "Ekipman adı"], correct: 1, explanation: "HACCP, gıda güvenliğini sağlamak için kullanılan uluslararası bir sistemdir." },
          { q: "El yıkama prosedürü kaç saniye sürmelidir?", opts: ["5 saniye", "10 saniye", "Minimum 20 saniye", "1 dakika"], correct: 2, explanation: "Etkin el yıkama en az 20 saniye süpürtme ile yapılmalıdır." },
          { q: "Buzdolabı sıcaklığı kaç derece olmalıdır?", opts: ["5-8°C", "0-4°C", "8-12°C", "-5°C"], correct: 1, explanation: "Gıda güvenliği için buzdolabı 0-4°C arasında tutulmalıdır." },
          { q: "FIFO kuralı ne anlama gelir?", opts: ["First In, First Out - İlk giren ilk çıkar", "İlk temizlenen ilk kullanılır", "Bir stok kodu", "Fast In, Fast Out"], correct: 0, explanation: "FIFO, raf ömrü yönetimi için ilk gelen ürünün ilk kullanılmasıdır." },
          { q: "Çapraz kontaminasyon nedir?", opts: ["Ekipman arızası", "Zararlı maddelerin bir gıdadan diğerine geçmesi", "Temizlik yöntemi", "Stok sayım hatası"], correct: 1, explanation: "Çapraz kontaminasyon, patojenlerin yüzeyler veya gıdalar arasında taşınmasıdır." },
          { q: "Sıcak servis sıcaklığı en az kaç derece olmalıdır?", opts: ["45°C", "55°C", "65°C", "75°C"], correct: 2, explanation: "Sıcak gıdalar en az 65°C'de servis edilmelidir." },
          { q: "Eldiven ne zaman değiştirilmelidir?", opts: ["Günde bir kez", "Her görev değişiminde", "Sadece yırtılınca", "Asla"], correct: 1, explanation: "Eldiven her farklı görev veya gıda türü arasında değiştirilmelidir." },
          { q: "Gıda depolama alanında temizlik kimyasalları nerede saklanmalıdır?", opts: ["Gıdaların yanında", "Gıdalardan ayrı, kilitli dolapta", "Tezgah üstünde", "Fark etmez"], correct: 1, explanation: "Kimyasallar gıdalardan ayrı, etiketli ve kilitli bir alanda saklanmalıdır." },
          { q: "Dondurucu sıcaklığı kaç derece olmalıdır?", opts: ["0°C", "-10°C", "-18°C ve altı", "-5°C"], correct: 2, explanation: "Dondurucu sıcaklığı -18°C veya altında tutulmalıdır." },
          { q: "Son kullanma tarihi geçmiş ürünle ne yapılır?", opts: ["İndirimli satılır", "Hemen imha edilir ve kayıt altına alınır", "Görünümü iyiyse satılır", "Personele verilir"], correct: 1, explanation: "SKT geçmiş ürünler derhal kullanımdan çekilip imha edilmelidir." },
          { q: "Personel iş başında hangi takıları çıkarmalıdır?", opts: ["Sadece küpe", "Yüzük, bilezik, saat ve takılar", "Hiçbirini", "Sadece kolye"], correct: 1, explanation: "Gıda güvenliği için tüm takılar çıkarılmalıdır." },
          { q: "Tehlike bölgesi (danger zone) sıcaklık aralığı nedir?", opts: ["0-4°C", "5-63°C", "20-40°C", "60-100°C"], correct: 1, explanation: "5-63°C arası bakteri üremesi için tehlike bölgesidir." },
        ]
      },
      {
        category: "ekipman",
        questions: [
          { q: "Espresso makinesi günlük temizliğinde ne kullanılır?", opts: ["Sadece su", "Backflush deterjanı ve temiz bez", "Bulaşık deterjanı", "Alkol"], correct: 1, explanation: "Backflush deterjanı ile günlük temizlik yapılmalıdır." },
          { q: "Kahve değirmeni bıçakları ne sıklıkla değiştirilmelidir?", opts: ["Her ay", "Her 3 ayda bir", "Üretici önerisine göre (genellikle 500-1000kg sonra)", "Hiç değişmez"], correct: 2, explanation: "Bıçak ömrü kullanım yoğunluğuna ve üretici önerisine bağlıdır." },
          { q: "Blender kullanımı sonrası ne yapılmalıdır?", opts: ["Hiçbir şey", "Su ve buz ile 10 saniye çalıştırıp temizlemek", "Ertesi gün temizlemek", "Sadece silmek"], correct: 1, explanation: "Her kullanım sonrası su ve buz ile kısa temizlik yapılmalıdır." },
          { q: "POS cihazı arızalandığında ilk adım nedir?", opts: ["Kendi başına tamir etmek", "Yeniden başlatmak ve sorun devam ederse teknik destek aramak", "Kullanmamak", "Kasayı kapatmak"], correct: 1, explanation: "İlk adım yeniden başlatma, sonra teknik desteğe başvurmadır." },
          { q: "Buz makinesi temizliği ne sıklıkla yapılmalıdır?", opts: ["Her gün", "Haftada bir", "Ayda bir", "Yılda bir"], correct: 1, explanation: "Buz makinesi hijyeni için haftada bir temizlik önerilir." },
          { q: "Espresso makinesi basıncı düştüğünde ne yapılmalıdır?", opts: ["Kullanmaya devam etmek", "Durumu raporlayıp teknik servis çağırmak", "Kendi başına tamir etmek", "Yok saymak"], correct: 1, explanation: "Basınç düşüşü teknik bir sorundur ve profesyonel müdahale gerektirir." },
          { q: "Süt köpürtme çubuğu (steam wand) her kullanımdan sonra ne yapılmalıdır?", opts: ["Hiçbir şey", "Islak bezle silmek ve buhar vermek", "Suya batırmak", "Haftada bir temizlemek"], correct: 1, explanation: "Her kullanımdan sonra silinmeli ve kısa buhar verilmelidir." },
          { q: "Değirmen kalibrasyonu ne zaman yapılmalıdır?", opts: ["Sadece kurulumda", "Her vardiya başında ve çekim kalitesi değiştiğinde", "Ayda bir", "Hiçbir zaman"], correct: 1, explanation: "Kalibrasyon vardiya başında ve tat değişikliklerinde yapılmalıdır." },
        ]
      },
      {
        category: "operasyon",
        questions: [
          { q: "Sabah açılışta ilk yapılması gereken nedir?", opts: ["Kasayı açmak", "Işıkları ve klimayı açıp ekipmanları çalıştırmak", "Sipariş almak", "Temizlik yapmak"], correct: 1, explanation: "Açılışta önce altyapı kontrolleri yapılmalıdır." },
          { q: "Kasa kapanış sayımında fark çıkarsa ne yapılır?", opts: ["Görmezden gelmek", "Farkı kayıt altına alıp müdüre bildirmek", "Kendi cebinden tamamlamak", "Kasayı tekrar saymak"], correct: 1, explanation: "Her fark kayıt altına alınmalı ve yöneticiye raporlanmalıdır." },
          { q: "Vardiya devir tesliminde hangi bilgiler aktarılmalıdır?", opts: ["Sadece kasa", "Kasa, açık siparişler, ekipman durumu, stok eksikleri", "Hiçbiri", "Sadece müşteri şikayetleri"], correct: 1, explanation: "Tam devir teslim tüm operasyonel bilgileri kapsamalıdır." },
          { q: "Stok sayımı ne sıklıkla yapılmalıdır?", opts: ["Ayda bir", "Haftada en az bir kez", "Yılda bir", "Gerek yok"], correct: 1, explanation: "Düzenli haftalık stok sayımı kayıp ve fireleri kontrol altında tutar." },
          { q: "Yangın söndürme cihazının yeri bilinmeli midir?", opts: ["Sadece müdür bilmeli", "Tüm personel bilmeli", "Sadece güvenlik", "Gerek yok"], correct: 1, explanation: "Acil durum prosedürü gereği tüm personel yangın söndürücü yerini bilmelidir." },
          { q: "İlk yardım çantasında ne olmalıdır?", opts: ["Sadece yara bandı", "Bandaj, antiseptik, eldiven ve temel tıbbi malzeme", "İlaçlar", "Hiçbir şey"], correct: 1, explanation: "Standart ilk yardım çantası temel tıbbi malzemeleri içermelidir." },
          { q: "Kapanışta alarm sistemi kim tarafından aktif edilir?", opts: ["Son çıkan personel", "Vardiya kapanış sorumlusu veya müdür", "Güvenlik şirketi", "Otomatik aktif olur"], correct: 1, explanation: "Alarm aktivasyonu yetkili personel tarafından yapılmalıdır." },
          { q: "Acil durumda (deprem, yangın) ilk yapılması gereken nedir?", opts: ["Kasayı kapatmak", "Müşteri ve personel güvenliğini sağlayıp tahliye etmek", "Polisi aramak", "Ekipmanları kapatmak"], correct: 1, explanation: "İnsan güvenliği her zaman önceliktir, tahliye ilk adımdır." },
        ]
      },
      {
        category: "is_guvenligi",
        questions: [
          { q: "Islak zeminde ne yapılmalıdır?", opts: ["Normal yürümek", "Uyarı levhası koymak ve en kısa sürede kurulamak", "Görmezden gelmek", "Sadece paspas koymak"], correct: 1, explanation: "Islak zemin kayma riski oluşturur, uyarı ve kurutma şarttır." },
          { q: "Sıcak sıvı dökülmesi durumunda ne yapılır?", opts: ["Hemen silmek", "Yanık bölgesini soğuk suyla soğutup ilk yardım uygulamak", "Hiçbir şey", "Buz koymak"], correct: 1, explanation: "Yanık durumunda 10-20 dakika soğuk su uygulanmalıdır." },
          { q: "Kaldırma tekniğinde doğru yöntem nedir?", opts: ["Belden eğilerek", "Dizlerden çökerek, sırt düz tutarak", "Tek elle kaldırmak", "Fark etmez"], correct: 1, explanation: "Bel incinmesini önlemek için dizlerden çökülerek kaldırılmalıdır." },
          { q: "Elektrik kaçağı şüphesinde ne yapılır?", opts: ["Cihazı kullanmaya devam etmek", "Cihazı kapatıp fişini çekmek ve teknik destek çağırmak", "Suyla temizlemek", "Yok saymak"], correct: 1, explanation: "Elektrik kaçağı hayati tehlike oluşturur, cihaz derhal devre dışı bırakılmalıdır." },
          { q: "İş kazası olduğunda hangi form doldurulur?", opts: ["Hiçbiri", "İş kazası bildirim formu", "Müşteri şikayet formu", "Stok formu"], correct: 1, explanation: "Her iş kazası yasal olarak bildirim formuyla kayıt altına alınmalıdır." },
          { q: "Kesici aletler nasıl saklanmalıdır?", opts: ["Açıkta bırakılır", "Özel bıçak muhafazasında veya manyetik şeritte", "Çekmecede karışık", "Fark etmez"], correct: 1, explanation: "Kesici aletler güvenli muhafazalarda saklanmalıdır." },
        ]
      }
    ];

    const modulesByCategory: Record<string, number[]> = {
      kahve: [2, 6, 8, 9, 10, 23, 24, 26],
      musteri: [1, 4, 14, 22, 37, 53],
      hijyen: [3, 19, 32, 43, 47, 48],
      ekipman: [17, 40, 42, 49, 25],
      operasyon: [5, 13, 16, 28, 29, 30, 34],
      is_guvenligi: [15, 35, 38, 46, 50],
    };

    let insertedCount = 0;

    for (const set of questionSets) {
      const targetModules = modulesByCategory[set.category] || [];
      for (let qi = 0; qi < set.questions.length; qi++) {
        const q = set.questions[qi];
        const modId = targetModules[qi % targetModules.length];
        const quizId = quizMap[modId];
        if (!quizId) continue;

        const existing = await db.execute(sql`SELECT id FROM quiz_questions WHERE quiz_id = ${quizId} AND question = ${q.q} LIMIT 1`);
        if ((existing.rows as any[]).length > 0) continue;

        const optsArray = `{${q.opts.map((o: string) => `"${o.replace(/"/g, '\\"')}"`).join(',')}}`;
        await db.execute(sql`
          INSERT INTO quiz_questions (quiz_id, question, question_type, options, correct_answer, correct_answer_index, explanation, points)
          VALUES (${quizId}, ${q.q}, 'multiple_choice', ${optsArray}::text[], ${q.opts[q.correct]}, ${q.correct}, ${q.explanation}, 10)
        `);
        insertedCount++;
      }
    }

    res.json({ success: true, questionsInserted: insertedCount, totalModuleQuizzes: Object.keys(quizMap).length });
  } catch (error: any) {
    console.error('Seed quiz questions error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/admin/seed-salaries', isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const salaries = [
      { code: 'stajyer', name: 'Stajyer', total: 3300000, base: 3100000, bonus: 200000 },
      { code: 'bar_buddy', name: 'Bar Buddy', total: 3600000, base: 3100000, bonus: 500000 },
      { code: 'barista', name: 'Barista', total: 4100000, base: 3100000, bonus: 1000000 },
      { code: 'supervisor_buddy', name: 'Supervisor Buddy', total: 4500000, base: 3100000, bonus: 1400000 },
      { code: 'supervisor', name: 'Supervisor', total: 4900000, base: 3100000, bonus: 1800000 },
      { code: 'mudur', name: 'Müdür', total: 5500000, base: 3500000, bonus: 2000000 },
      { code: 'fabrika_operator', name: 'Fabrika Operatör', total: 4000000, base: 3100000, bonus: 900000 },
      { code: 'fabrika_mudur', name: 'Fabrika Müdür', total: 5800000, base: 3800000, bonus: 2000000 },
      { code: 'muhasebe_ik', name: 'Muhasebe & İK', total: 5200000, base: 3500000, bonus: 1700000 },
      { code: 'satinalma', name: 'Satın Alma', total: 5000000, base: 3500000, bonus: 1500000 },
      { code: 'marketing', name: 'Pazarlama', total: 5000000, base: 3500000, bonus: 1500000 },
      { code: 'kalite_kontrol', name: 'Kalite Kontrol', total: 5000000, base: 3500000, bonus: 1500000 },
      { code: 'gida_muhendisi', name: 'Gıda Mühendisi', total: 5800000, base: 4000000, bonus: 1800000 },
      { code: 'trainer', name: 'Eğitmen', total: 5000000, base: 3500000, bonus: 1500000 },
      { code: 'coach', name: 'Koç', total: 5500000, base: 3800000, bonus: 1700000 },
      { code: 'cgo', name: 'CGO', total: 8000000, base: 5000000, bonus: 3000000 },
      { code: 'ceo', name: 'CEO', total: 10000000, base: 6000000, bonus: 4000000 },
      { code: 'admin', name: 'Sistem Yöneticisi', total: 6000000, base: 4000000, bonus: 2000000 },
      { code: 'yatirimci_branch', name: 'Yatırımcı (Şube)', total: 0, base: 0, bonus: 0 },
    ];

    let inserted = 0;
    let skipped = 0;

    for (const s of salaries) {
      const existing = await db.execute(sql`SELECT id FROM position_salaries WHERE position_code = ${s.code} LIMIT 1`);
      if ((existing.rows as any[]).length > 0) {
        skipped++;
        continue;
      }

      await db.execute(sql`
        INSERT INTO position_salaries (position_code, position_name, total_salary, base_salary, bonus, effective_from)
        VALUES (${s.code}, ${s.name}, ${s.total}, ${s.base}, ${s.bonus}, '2026-01-01')
      `);
      inserted++;
    }

    res.json({ success: true, inserted, skipped });
  } catch (error: any) {
    console.error('Seed salaries error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/admin/seed-pdks', isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const branchId = 5;
    const usersResult = await db.execute(sql`
      SELECT id, role FROM users WHERE branch_id = ${branchId} AND is_active = true
      AND role IN ('barista', 'supervisor', 'supervisor_buddy', 'mudur', 'stajyer')
    `);
    const activeUsers = usersResult.rows as any[];

    if (activeUsers.length === 0) {
      return res.status(400).json({ error: 'Aktif kullanıcı bulunamadı' });
    }

    let insertedCount = 0;
    const now = new Date();

    for (const user of activeUsers) {
      const skipDays = new Set<number>();
      while (skipDays.size < 3) {
        skipDays.add(Math.floor(Math.random() * 30) + 1);
      }

      for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
        const date = new Date(now);
        date.setDate(date.getDate() - dayOffset);

        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        if (skipDays.has(dayOffset)) continue;

        const dateStr = date.toISOString().split('T')[0];

        const isLate = Math.random() < 0.2;
        const lateMinutes = isLate ? Math.floor(Math.random() * 16) + 15 : 0;

        const baseHour = 8;
        const randomMinOffset = Math.floor(Math.random() * 15);
        const girisMinutes = baseHour * 60 + randomMinOffset + lateMinutes;
        const girisH = String(Math.floor(girisMinutes / 60)).padStart(2, '0');
        const girisM = String(girisMinutes % 60).padStart(2, '0');

        const cikisBaseHour = 16;
        const cikisRandomMin = Math.floor(Math.random() * 30);
        const cikisMinutes = cikisBaseHour * 60 + cikisRandomMin;
        const cikisH = String(Math.floor(cikisMinutes / 60)).padStart(2, '0');
        const cikisM = String(cikisMinutes % 60).padStart(2, '0');

        await db.execute(sql`
          INSERT INTO pdks_records (user_id, branch_id, record_date, record_time, record_type, source)
          VALUES (${user.id}, ${branchId}, ${dateStr}, ${girisH + ':' + girisM + ':00'}, 'giris', 'kiosk')
          ON CONFLICT DO NOTHING
        `);

        await db.execute(sql`
          INSERT INTO pdks_records (user_id, branch_id, record_date, record_time, record_type, source)
          VALUES (${user.id}, ${branchId}, ${dateStr}, ${cikisH + ':' + cikisM + ':00'}, 'cikis', 'kiosk')
          ON CONFLICT DO NOTHING
        `);

        insertedCount += 2;
      }
    }

    res.json({ success: true, records: insertedCount, users: activeUsers.length, branch: 'Işıklar' });
  } catch (error: any) {
    console.error('Seed PDKS error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/admin/seed-factory-chain', isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const products = await db.execute(sql`SELECT id, name, category FROM factory_products WHERE id IN (1, 3, 8, 12, 6) LIMIT 5`);
    const productList = products.rows as any[];

    if (productList.length === 0) {
      return res.status(400).json({ error: 'Fabrika ürünü bulunamadı' });
    }

    const sessions = await db.execute(sql`SELECT id FROM factory_shift_sessions WHERE status = 'active' LIMIT 1`);
    const sessionId = (sessions.rows as any[])[0]?.id;
    if (!sessionId) {
      return res.status(400).json({ error: 'Aktif fabrika oturumu bulunamadı' });
    }

    const operators = await db.execute(sql`SELECT id FROM users WHERE role = 'fabrika_operator' AND is_active = true LIMIT 3`);
    const operatorIds = (operators.rows as any[]).map((r: any) => r.id);
    if (operatorIds.length === 0) {
      return res.status(400).json({ error: 'Aktif fabrika operatörü bulunamadı' });
    }

    const inspectors = await db.execute(sql`SELECT id FROM users WHERE role IN ('kalite_kontrol', 'gida_muhendisi') AND is_active = true LIMIT 2`);
    const inspectorIds = (inspectors.rows as any[]).map((r: any) => r.id);
    if (inspectorIds.length === 0) inspectorIds.push(operatorIds[0]);

    const stations = await db.execute(sql`SELECT id, name FROM factory_stations LIMIT 5`);
    const stationList = stations.rows as any[];

    let batchIds: number[] = [];
    let outputIds: number[] = [];
    let qcIds: number[] = [];
    let lotNumbers: string[] = [];

    for (let i = 0; i < productList.length; i++) {
      const prod = productList[i];
      const stationId = stationList[i % stationList.length]?.id || 1;
      const operatorId = operatorIds[i % operatorIds.length];
      const quantity = 50 + Math.floor(Math.random() * 100);

      const [output] = (await db.execute(sql`
        INSERT INTO factory_production_outputs (session_id, user_id, station_id, product_id, product_name, produced_quantity, produced_unit, quality_status, created_at)
        VALUES (${sessionId}, ${operatorId}, ${stationId}, ${prod.id}, ${prod.name}, ${quantity}, 'adet', 'pending', NOW() - interval '${sql.raw(String(i + 1))} days')
        RETURNING id
      `)).rows as any[];
      outputIds.push(output.id);

      const batchNum = `BATCH-${Date.now()}-${i}`;
      const [batch] = (await db.execute(sql`
        INSERT INTO production_batches (batch_number, product_id, quantity, unit, status, produced_by_id, production_date)
        VALUES (${batchNum}, ${prod.id}, ${quantity}, 'adet', 'approved', ${operatorId}, CURRENT_DATE - interval '${sql.raw(String(i + 1))} days')
        RETURNING id
      `)).rows as any[];
      batchIds.push(batch.id);

      const decision = i < 4 ? 'approved' : 'pending_engineer';
      const inspectorId = inspectorIds[i % inspectorIds.length];

      const [qc] = (await db.execute(sql`
        INSERT INTO factory_quality_checks (production_output_id, inspector_id, producer_id, station_id, decision, visual_inspection, taste_test, texture_check, weight_check, packaging_integrity, haccp_compliance, checked_at)
        VALUES (${output.id}, ${inspectorId}, ${operatorId}, ${stationId}, ${decision}, 'pass', 'pass', 'pass', 'pass', 'pass', true, NOW() - interval '${sql.raw(String(i))} days')
        RETURNING id
      `)).rows as any[];
      qcIds.push(qc.id);

      if (decision === 'approved') {
        const lotNum = `LOT-${prod.category?.toUpperCase() || 'PROD'}-${Date.now()}-${i}`;
        lotNumbers.push(lotNum);

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);

        await db.execute(sql`
          INSERT INTO production_lots (lot_number, product_id, batch_id, quantity, unit, status, quality_check_id, station_id, produced_by, expiry_date)
          VALUES (${lotNum}, ${prod.id}, ${batch.id}, ${quantity}, 'adet', 'uretildi', ${qc.id}, ${stationId}, ${operatorId}, ${expiryDate.toISOString()})
        `);

        const existingInv = await db.execute(sql`SELECT id, quantity FROM factory_inventory WHERE product_id = ${prod.id} LIMIT 1`);
        if ((existingInv.rows as any[]).length > 0) {
          await db.execute(sql`
            UPDATE factory_inventory SET quantity = quantity + ${quantity}, updated_at = NOW()
            WHERE product_id = ${prod.id}
          `);
        } else {
          await db.execute(sql`
            INSERT INTO factory_inventory (product_id, quantity, reserved_quantity, updated_at)
            VALUES (${prod.id}, ${quantity}, 0, NOW())
          `);
        }
      }
    }

    const shipNum1 = `SHP-${Date.now()}-1`;
    const [ship1] = (await db.execute(sql`
      INSERT INTO factory_shipments (shipment_number, branch_id, status, prepared_by_id, dispatched_at, delivered_at, created_at)
      VALUES (${shipNum1}, 5, 'teslim_edildi', ${operatorIds[0]}, NOW() - interval '2 days', NOW() - interval '1 day', NOW() - interval '3 days')
      RETURNING id
    `)).rows as any[];

    if (lotNumbers.length > 0 && productList.length > 0) {
      await db.execute(sql`
        INSERT INTO factory_shipment_items (shipment_id, product_id, quantity, lot_number, unit)
        VALUES (${ship1.id}, ${productList[0].id}, 20, ${lotNumbers[0]}, 'adet')
      `);
    }

    const shipNum2 = `SHP-${Date.now()}-2`;
    const [ship2] = (await db.execute(sql`
      INSERT INTO factory_shipments (shipment_number, branch_id, status, prepared_by_id, created_at)
      VALUES (${shipNum2}, 5, 'hazirlaniyor', ${operatorIds[0]}, NOW())
      RETURNING id
    `)).rows as any[];

    if (lotNumbers.length > 1 && productList.length > 1) {
      await db.execute(sql`
        INSERT INTO factory_shipment_items (shipment_id, product_id, quantity, lot_number, unit)
        VALUES (${ship2.id}, ${productList[1].id}, 15, ${lotNumbers[1]}, 'adet')
      `);
    }

    const haccpChecks = [
      { checkPoint: 'Hammadde Kabul Sıcaklık Kontrolü', result: 'pass', temp: 3.5, station: stationList[0]?.id || 1 },
      { checkPoint: 'Üretim Hattı Sıcaklık Kontrolü', result: 'pass', temp: 22.0, station: stationList[1]?.id || 1 },
      { checkPoint: 'Soğuk Depo Sıcaklık Kontrolü', result: 'warning', temp: 5.2, station: stationList[2]?.id || 1, corrective: 'Soğutucu ayarı düzeltildi, sıcaklık 3°C ye düşürüldü' },
    ];

    for (const h of haccpChecks) {
      await db.execute(sql`
        INSERT INTO haccp_check_records (check_point, station_id, checked_by, result, temperature_value, corrective_action, notes)
        VALUES (${h.checkPoint}, ${h.station}, ${inspectorIds[0]}, ${h.result}, ${h.temp}, ${h.corrective || null}, ${'Rutin kontrol'})
      `);
    }

    res.json({
      success: true,
      batches: batchIds.length,
      outputs: outputIds.length,
      qualityChecks: qcIds.length,
      lots: lotNumbers.length,
      shipments: 2,
      haccpRecords: 3,
    });
  } catch (error: any) {
    console.error('Seed factory chain error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/admin/seed-training-completions', isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const usersResult = await db.execute(sql`
      SELECT id, role FROM users WHERE branch_id = 5 AND is_active = true
      AND role IN ('barista', 'supervisor', 'supervisor_buddy')
      LIMIT 4
    `);
    const trainees = usersResult.rows as any[];

    if (trainees.length === 0) {
      return res.status(400).json({ error: 'Pilot şubede aktif eğitim alacak kullanıcı bulunamadı' });
    }

    const modulesResult = await db.execute(sql`SELECT id, title FROM training_modules LIMIT 15`);
    const moduleList = (modulesResult.rows as any[]);

    const quizzesResult = await db.execute(sql`SELECT id, module_id FROM module_quizzes`);
    const quizMap: Record<number, number> = {};
    for (const q of quizzesResult.rows as any[]) {
      if (!quizMap[q.module_id]) quizMap[q.module_id] = q.id;
    }

    const materialsResult = await db.execute(sql`SELECT id FROM training_materials LIMIT 10`);
    const materialIds = (materialsResult.rows as any[]).map((r: any) => r.id);

    const assignmentsResult = await db.execute(sql`SELECT id, material_id, user_id FROM training_assignments LIMIT 50`);
    const assignmentMap: Record<string, number> = {};
    for (const a of assignmentsResult.rows as any[]) {
      assignmentMap[`${a.user_id}_${a.material_id}`] = a.id;
    }

    let completions = 0;
    let quizAttempts = 0;
    let progressUpdates = 0;

    for (let ui = 0; ui < trainees.length; ui++) {
      const user = trainees[ui];
      const moduleCount = 5 + Math.floor(Math.random() * 6);
      const userModules = moduleList.slice(0, moduleCount);

      for (let mi = 0; mi < userModules.length; mi++) {
        const mod = userModules[mi];
        const daysAgo = 30 - mi * 3;
        const completedDate = new Date();
        completedDate.setDate(completedDate.getDate() - Math.max(1, daysAgo));

        const existing = await db.execute(sql`
          SELECT id FROM user_training_progress WHERE user_id = ${user.id} AND module_id = ${mod.id} LIMIT 1
        `);
        if ((existing.rows as any[]).length === 0) {
          await db.execute(sql`
            INSERT INTO user_training_progress (user_id, module_id, status, progress_percentage, completed_at, created_at, updated_at)
            VALUES (${user.id}, ${mod.id}, 'completed', 100, ${completedDate.toISOString()}, ${completedDate.toISOString()}, ${completedDate.toISOString()})
          `);
          progressUpdates++;
        }

        const quizId = quizMap[mod.id];
        if (quizId) {
          const score = 70 + Math.floor(Math.random() * 21);
          const existingAttempt = await db.execute(sql`
            SELECT id FROM user_quiz_attempts WHERE user_id = ${user.id} AND quiz_id = ${quizId} LIMIT 1
          `);
          if ((existingAttempt.rows as any[]).length === 0) {
            await db.execute(sql`
              INSERT INTO user_quiz_attempts (user_id, quiz_id, score, is_passed, attempt_number, approval_status, started_at, completed_at)
              VALUES (${user.id}, ${quizId}, ${score}, true, 1, 'approved', ${completedDate.toISOString()}, ${completedDate.toISOString()})
            `);
            quizAttempts++;
          }
        }

        if (materialIds.length > 0 && mi < materialIds.length) {
          const materialId = materialIds[mi];
          const assignmentId = assignmentMap[`${user.id}_${materialId}`];

          if (assignmentId) {
            const existingCompletion = await db.execute(sql`
              SELECT id FROM training_completions WHERE user_id = ${user.id} AND material_id = ${materialId} LIMIT 1
            `);
            if ((existingCompletion.rows as any[]).length === 0) {
              const score = 75 + Math.floor(Math.random() * 20);
              await db.execute(sql`
                INSERT INTO training_completions (assignment_id, user_id, material_id, status, score, time_spent_seconds, completed_at)
                VALUES (${assignmentId}, ${user.id}, ${materialId}, 'passed', ${score}, ${600 + Math.floor(Math.random() * 1800)}, ${completedDate.toISOString()})
              `);
              completions++;
            }
          }
        }
      }
    }

    res.json({ success: true, trainees: trainees.length, progressUpdates, quizAttempts, completions });
  } catch (error: any) {
    console.error('Seed training completions error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/admin/seed-feedback', isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const branchId = 5;
    const feedbackData = [
      { rating: 5, comment: "Kahve çok güzel, her zamanki gibi mükemmel!", service: 5, cleanliness: 5, product: 5, staff: 5 },
      { rating: 5, comment: "Personel çok ilgili ve güler yüzlü. Teşekkürler!", service: 5, cleanliness: 4, product: 5, staff: 5 },
      { rating: 5, comment: "Donut ve kahve ikilisi harika. Kesinlikle tavsiye ederim.", service: 4, cleanliness: 5, product: 5, staff: 4 },
      { rating: 4, comment: "Latte art çok güzel yapılmış, bravo!", service: 4, cleanliness: 4, product: 5, staff: 4 },
      { rating: 4, comment: "Rahat bir mekan, wifi hızlı. Çalışmak için ideal.", service: 4, cleanliness: 4, product: 4, staff: 4 },
      { rating: 5, comment: "Cold brew muhteşem! Yaz aylarında vazgeçilmezim.", service: 5, cleanliness: 5, product: 5, staff: 5 },
      { rating: 4, comment: "Cheesecake çok taze ve lezzetli.", service: 4, cleanliness: 4, product: 5, staff: 4 },
      { rating: 4, comment: "Hızlı servis, temiz mekan. Memnun kaldım.", service: 4, cleanliness: 5, product: 4, staff: 4 },
      { rating: 5, comment: "Her geldiğimde aynı kalite. Tutarlılık için teşekkürler.", service: 5, cleanliness: 5, product: 5, staff: 5 },
      { rating: 4, comment: "Cinnaboom denedim, çok güzeldi!", service: 4, cleanliness: 4, product: 5, staff: 4 },
      { rating: 5, comment: "Çocuklara özel ilgi gösterdikleri için teşekkürler.", service: 5, cleanliness: 4, product: 4, staff: 5 },
      { rating: 4, comment: "Espresso kalitesi çok iyi. Kavurma mükemmel.", service: 4, cleanliness: 4, product: 5, staff: 4 },
      { rating: 3, comment: "Ortalama bir deneyim. Kahve ılık geldi.", service: 3, cleanliness: 3, product: 3, staff: 3 },
      { rating: 3, comment: "Bekleme süresi biraz uzundu ama kahve güzeldi.", service: 2, cleanliness: 4, product: 4, staff: 3 },
      { rating: 3, comment: "Fiyatlar biraz yüksek ama kalite iyi.", service: 3, cleanliness: 4, product: 3, staff: 3 },
      { rating: 3, comment: "Mekan kalabalıktı, oturma alanı yetersiz.", service: 3, cleanliness: 3, product: 4, staff: 3 },
      { rating: 3, comment: "Kahve fena değildi ama beklentimin altında kaldı.", service: 3, cleanliness: 3, product: 3, staff: 3 },
      { rating: 2, comment: "Kahvem soğuk geldi, tekrar ısıtılmasını istedim.", service: 2, cleanliness: 3, product: 1, staff: 2 },
      { rating: 1, comment: "Tezgah kirli idi ve sipariş yanlış geldi.", service: 1, cleanliness: 1, product: 2, staff: 1 },
      { rating: 2, comment: "Personel ilgisiz davrandı, uzun süre bekledim.", service: 1, cleanliness: 3, product: 3, staff: 1 },
    ];

    const supervisors = await db.execute(sql`
      SELECT id FROM users WHERE branch_id = ${branchId} AND role IN ('supervisor', 'mudur') AND is_active = true LIMIT 2
    `);
    const reviewerIds = (supervisors.rows as any[]).map((r: any) => r.id);

    let inserted = 0;

    for (let i = 0; i < feedbackData.length; i++) {
      const fb = feedbackData[i];
      const daysAgo = Math.floor(i * 1.5) + 1;
      const feedbackDate = new Date();
      feedbackDate.setDate(feedbackDate.getDate() - daysAgo);

      const hasResponse = fb.rating <= 2 || (fb.rating >= 4 && Math.random() > 0.5);
      const reviewerId = hasResponse && reviewerIds.length > 0 ? reviewerIds[i % reviewerIds.length] : null;
      const reviewNotes = hasResponse ? (fb.rating <= 2 ? 'Müşteriye ulaşıldı, sorun çözüldü.' : 'Teşekkür mesajı iletildi.') : null;
      const reviewedAt = hasResponse ? new Date(feedbackDate.getTime() + 3600000 * (1 + Math.random() * 4)) : null;

      const status = hasResponse ? 'resolved' : (fb.rating <= 2 ? 'in_progress' : 'new');

      await db.execute(sql`
        INSERT INTO customer_feedback (branch_id, rating, comment, feedback_date, is_anonymous, status, reviewed_by_id, reviewed_at, review_notes, source, service_rating, cleanliness_rating, product_rating, staff_rating, feedback_type, priority)
        VALUES (${branchId}, ${fb.rating}, ${fb.comment}, ${feedbackDate.toISOString()}, true, ${status}, ${reviewerId}, ${reviewedAt?.toISOString() || null}, ${reviewNotes}, 'qr_code', ${fb.service}, ${fb.cleanliness}, ${fb.product}, ${fb.staff}, 'feedback', ${fb.rating <= 2 ? 'high' : fb.rating === 3 ? 'medium' : 'low'})
      `);
      inserted++;
    }

    res.json({ success: true, inserted, branch: 'Işıklar' });
  } catch (error: any) {
    console.error('Seed feedback error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/admin/seed-branch-inventory', isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const existing = await db.execute(sql`SELECT COUNT(*)::text as c FROM branch_inventory`);
    if (parseInt((existing.rows[0] as any).c) > 10) {
      return res.json({ success: true, message: 'Branch inventory already seeded', count: parseInt((existing.rows[0] as any).c) });
    }

    const branches = await db.execute(sql`SELECT id FROM branches WHERE is_active = true ORDER BY id`);
    const products = await db.execute(sql`SELECT id, name FROM factory_products ORDER BY id LIMIT 15`);
    const branchIds = branches.rows.map((b: any) => b.id);
    const productList = products.rows as any[];

    let inserted = 0;
    for (const branchId of branchIds.slice(0, 10)) {
      const numProducts = 8 + Math.floor(Math.random() * 5);
      const selectedProducts = productList.sort(() => Math.random() - 0.5).slice(0, numProducts);
      
      for (const product of selectedProducts) {
        const currentStock = Math.round((5 + Math.random() * 45) * 100) / 100;
        const minStock = Math.round((3 + Math.random() * 7) * 100) / 100;
        const units = ['adet', 'kg', 'litre', 'paket'];
        const unit = units[Math.floor(Math.random() * units.length)];
        const lastReceived = new Date(Date.now() - Math.random() * 7 * 86400000);

        try {
          await db.execute(sql`
            INSERT INTO branch_inventory (branch_id, product_id, current_stock, minimum_stock, unit, last_received_at)
            VALUES (${branchId}, ${product.id}, ${currentStock}, ${minStock}, ${unit}, ${lastReceived.toISOString()})
            ON CONFLICT (branch_id, product_id) DO NOTHING
          `);
          inserted++;
        } catch (e) {}
      }
    }

    res.json({ success: true, inserted, branches: branchIds.slice(0, 10).length });
  } catch (error: any) {
    console.error('Seed branch inventory error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/admin/seed-flow-completions', isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const existing = await db.execute(sql`SELECT COUNT(*)::text as c FROM dobody_flow_completions`);
    if (parseInt((existing.rows[0] as any).c) > 0) {
      return res.json({ success: true, message: 'Flow completions already seeded', count: parseInt((existing.rows[0] as any).c) });
    }

    const flowTasks = await db.execute(sql`SELECT id FROM dobody_flow_tasks`);
    const taskIds = flowTasks.rows.map((t: any) => t.id);
    if (taskIds.length === 0) {
      return res.json({ success: true, message: 'No flow tasks found', inserted: 0 });
    }

    const users = await db.execute(sql`SELECT id FROM users WHERE branch_id = 5 AND is_active = true AND role = 'barista' LIMIT 4`);
    const userIds = users.rows.map((u: any) => u.id);

    let inserted = 0;
    for (const userId of userIds) {
      for (const taskId of taskIds) {
        if (Math.random() < 0.7) {
          const completedAt = new Date(Date.now() - Math.random() * 14 * 86400000);
          await db.execute(sql`
            INSERT INTO dobody_flow_completions (task_id, user_id, completed_at)
            VALUES (${taskId}, ${userId}, ${completedAt.toISOString()})
          `);
          inserted++;
        }
      }
    }

    res.json({ success: true, inserted });
  } catch (error: any) {
    console.error('Seed flow completions error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/admin/seed-training-assignments', isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const existing = await db.execute(sql`SELECT COUNT(*)::text as c FROM training_assignments`);
    if (parseInt((existing.rows[0] as any).c) > 0) {
      return res.json({ success: true, message: 'Training assignments already seeded', count: parseInt((existing.rows[0] as any).c) });
    }

    const adminId = '0ccb206f-2c38-431f-8520-291fe9788f50';
    const articles = await db.execute(sql`SELECT id, title FROM knowledge_base_articles LIMIT 8`);
    const articleList = articles.rows as any[];

    if (articleList.length === 0) {
      return res.json({ success: true, message: 'No KB articles found', inserted: 0 });
    }

    let materialCount = 0;
    const materialIds: number[] = [];
    for (const article of articleList) {
      try {
        const result = await db.execute(sql`
          INSERT INTO training_materials (article_id, material_type, title, description, content, status, target_roles, created_by_id)
          VALUES (${article.id}, 'reading', ${article.title}, ${'Eğitim materyali: ' + article.title}, ${'{"type":"reading","articleId":' + article.id + '}'}::jsonb, 'published', ARRAY['barista','stajyer','supervisor']::text[], ${adminId})
          RETURNING id
        `);
        materialIds.push((result.rows[0] as any).id);
        materialCount++;
      } catch (e) {}
    }

    const users = await db.execute(sql`SELECT id FROM users WHERE branch_id = 5 AND is_active = true AND role IN ('barista','stajyer') LIMIT 4`);
    const userIds = users.rows.map((u: any) => u.id);

    let assignmentCount = 0;
    for (const userId of userIds) {
      const numAssignments = 3 + Math.floor(Math.random() * 3);
      const selected = materialIds.sort(() => Math.random() - 0.5).slice(0, numAssignments);
      
      for (const materialId of selected) {
        const dueDate = new Date(Date.now() + (7 + Math.random() * 14) * 86400000);
        const statuses = ['assigned', 'assigned', 'in_progress', 'completed'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        try {
          await db.execute(sql`
            INSERT INTO training_assignments (material_id, user_id, branch_id, assigned_by_id, due_date, is_required, status)
            VALUES (${materialId}, ${userId}, 5, ${adminId}, ${dueDate.toISOString().split('T')[0]}, true, ${status})
          `);
          assignmentCount++;
        } catch (e) {}
      }
    }

    res.json({ success: true, materials: materialCount, assignments: assignmentCount });
  } catch (error: any) {
    console.error('Seed training assignments error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/admin/seed-announcements', isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const existing = await db.execute(sql`SELECT COUNT(*)::text as c FROM announcements`);
    if (parseInt((existing.rows[0] as any).c) >= 3) {
      return res.json({ success: true, message: 'Announcements already seeded', count: parseInt((existing.rows[0] as any).c) });
    }

    const adminId = '0ccb206f-2c38-431f-8520-291fe9788f50';
    const announcements = [
      {
        title: 'Pilot Dönemi Başladı',
        message: 'Değerli ekip üyelerimiz, DOSPRESSO WebApp pilot dönemi resmi olarak başlamıştır. Tüm şube operasyonlarınızı bu platform üzerinden yönetebilirsiniz. Sorularınız için destek bölümünü kullanabilirsiniz.',
        priority: 'high',
        category: 'general',
        showOnDashboard: true,
        targetRoles: ['barista', 'supervisor', 'mudur', 'stajyer', 'admin', 'ceo', 'cgo'],
      },
      {
        title: 'Yeni Checklist Sistemi Aktif',
        message: 'Sabah açılış, akşam kapanış ve günlük temizlik checklist\'leri tüm şubelere atanmıştır. Vardiya başında ve sonunda checklist\'lerinizi tamamlamayı unutmayın. Performans değerlendirmelerinde checklist tamamlama oranları dikkate alınacaktır.',
        priority: 'normal',
        category: 'operations',
        showOnDashboard: false,
        targetRoles: ['barista', 'supervisor', 'mudur', 'stajyer'],
      },
      {
        title: 'DOSPRESSO Academy Eğitimleri',
        message: 'Kahve bilgisi, hijyen, müşteri ilişkileri ve ekipman kullanımı konularında yeni eğitim modülleri eklenmiştir. Akademi bölümünden eğitimlerinizi tamamlayarak sertifika ve rozet kazanabilirsiniz.',
        priority: 'normal',
        category: 'training',
        showOnDashboard: true,
        targetRoles: ['barista', 'supervisor', 'stajyer'],
      },
      {
        title: 'Mart Ayı Kampanya Duyurusu',
        message: 'Bu ay tüm şubelerde "2 al 1 öde" donut kampanyası başlıyor. Kampanya detayları ve POS ayarları için müdürünüzle iletişime geçin.',
        priority: 'normal',
        category: 'marketing',
        showOnDashboard: false,
        targetRoles: ['barista', 'supervisor', 'mudur', 'marketing'],
      },
      {
        title: 'Bakım Bildirimi: Sistem Güncellemesi',
        message: 'Bu hafta sonu (Cumartesi 02:00-04:00 arası) planlı sistem bakımı yapılacaktır. Bu süre zarfında platforma erişim kısıtlı olabilir.',
        priority: 'low',
        category: 'system',
        showOnDashboard: false,
        targetRoles: ['admin', 'mudur', 'supervisor'],
      },
    ];

    let inserted = 0;
    for (const ann of announcements) {
      const publishedAt = new Date(Date.now() - Math.random() * 14 * 86400000);
      const expiresAt = new Date(Date.now() + 30 * 86400000);
      
      const rolesArray = `{${ann.targetRoles.join(',')}}`;
      await db.execute(sql`
        INSERT INTO announcements (created_by_id, title, message, target_roles, priority, published_at, expires_at, category, show_on_dashboard)
        VALUES (${adminId}, ${ann.title}, ${ann.message}, ${rolesArray}::text[], ${ann.priority}, ${publishedAt.toISOString()}, ${expiresAt.toISOString()}, ${ann.category}, ${ann.showOnDashboard})
      `);
      inserted++;
    }

    res.json({ success: true, inserted });
  } catch (error: any) {
    console.error('Seed announcements error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/admin/seed-factory-extended', isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const existingBatches = await db.execute(sql`SELECT COUNT(*)::text as c FROM production_batches`);
    if (parseInt((existingBatches.rows[0] as any).c) > 20) {
      return res.json({ success: true, message: 'Extended factory data already seeded' });
    }

    const products = await db.execute(sql`SELECT id, name FROM factory_products ORDER BY id LIMIT 10`);
    const productList = products.rows as any[];
    const adminId = '0ccb206f-2c38-431f-8520-291fe9788f50';
    const factoryBranchId = 24;

    let batchCount = 0;
    let outputCount = 0;
    let qcCount = 0;

    for (let dayOffset = 1; dayOffset <= 10; dayOffset++) {
      const prodDate = new Date(Date.now() - dayOffset * 86400000);
      const dateStr = prodDate.toISOString().split('T')[0];
      
      const numBatches = 2 + Math.floor(Math.random() * 2);
      for (let b = 0; b < numBatches; b++) {
        const product = productList[Math.floor(Math.random() * productList.length)];
        const qty = 50 + Math.floor(Math.random() * 150);
        const batchNumber = 'BATCH-' + dateStr.replace(/-/g, '') + '-' + (b + 1);
        const expiryDate = new Date(prodDate.getTime() + 30 * 86400000);

        try {
          const batchResult = await db.execute(sql`
            INSERT INTO production_batches (product_id, batch_number, quantity, unit, production_date, expiry_date, status, quality_score, notes)
            VALUES (${product.id}, ${batchNumber}, ${qty}, 'adet', ${dateStr}, ${expiryDate.toISOString().split('T')[0]}, 'completed', ${85 + Math.floor(Math.random() * 15)}, ${'Günlük üretim - ' + product.name})
            ON CONFLICT DO NOTHING
            RETURNING id
          `);
          if (batchResult.rows.length === 0) continue;
          const batchId = (batchResult.rows[0] as any).id;
          batchCount++;

          await db.execute(sql`
            INSERT INTO factory_production_outputs (batch_id, product_id, quantity, unit, quality_status, produced_at)
            VALUES (${batchId}, ${product.id}, ${qty}, 'adet', 'approved', ${prodDate.toISOString()})
          `);
          outputCount++;

          if (Math.random() < 0.5) {
            const qcStatus = Math.random() < 0.85 ? 'approved' : 'pending_engineer';
            await db.execute(sql`
              INSERT INTO factory_quality_checks (batch_id, product_id, checked_by_id, check_type, status, notes, checked_at, parameters)
              VALUES (${batchId}, ${product.id}, ${adminId}, 'final_inspection', ${qcStatus}, ${'Kalite kontrol - ' + dateStr}, ${new Date(prodDate.getTime() + 7 * 3600000).toISOString()}, '{"temperature":22,"humidity":45}'::jsonb)
            `);
            qcCount++;
          }
        } catch (e) {}
      }
    }

    res.json({ success: true, batches: batchCount, outputs: outputCount, qualityChecks: qcCount, days: 10 });
  } catch (error: any) {
    console.error('Seed factory extended error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
