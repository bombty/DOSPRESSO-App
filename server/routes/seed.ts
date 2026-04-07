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

router.post('/api/admin/seed-checklists', isAuthenticated, requireAdmin, async (req, res) => {
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
  } catch (error: unknown) {
    console.error('Seed checklists error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/admin/seed-quiz-questions', isAuthenticated, requireAdmin, async (req, res) => {
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
  } catch (error: unknown) {
    console.error('Seed quiz questions error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/admin/seed-salaries', isAuthenticated, requireAdmin, async (req, res) => {
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
  } catch (error: unknown) {
    console.error('Seed salaries error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/admin/seed-pdks', isAuthenticated, requireAdmin, async (req, res) => {
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
  } catch (error: unknown) {
    console.error('Seed PDKS error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/admin/seed-factory-chain', isAuthenticated, requireAdmin, async (req, res) => {
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
    const operatorIds = (operators.rows as any[]).map((r) => r.id);
    if (operatorIds.length === 0) {
      return res.status(400).json({ error: 'Aktif fabrika operatörü bulunamadı' });
    }

    const inspectors = await db.execute(sql`SELECT id FROM users WHERE role IN ('kalite_kontrol', 'gida_muhendisi') AND is_active = true LIMIT 2`);
    const inspectorIds = (inspectors.rows as any[]).map((r) => r.id);
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
  } catch (error: unknown) {
    console.error('Seed factory chain error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/admin/seed-training-completions', isAuthenticated, requireAdmin, async (req, res) => {
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
    const materialIds = (materialsResult.rows as any[]).map((r) => r.id);

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
  } catch (error: unknown) {
    console.error('Seed training completions error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/admin/seed-feedback', isAuthenticated, requireAdmin, async (req, res) => {
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
    const reviewerIds = (supervisors.rows as any[]).map((r) => r.id);

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
  } catch (error: unknown) {
    console.error('Seed feedback error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/admin/seed-branch-inventory', isAuthenticated, requireAdmin, async (req, res) => {
  try {
    const existing = await db.execute(sql`SELECT COUNT(*)::text as c FROM branch_inventory`);
    if (parseInt((existing.rows[0] as any).c) > 10) {
      return res.json({ success: true, message: 'Branch inventory already seeded', count: parseInt((existing.rows[0] as any).c) });
    }

    const branches = await db.execute(sql`SELECT id FROM branches WHERE is_active = true ORDER BY id`);
    const products = await db.execute(sql`SELECT id, name FROM factory_products ORDER BY id LIMIT 15`);
    const branchIds = branches.rows.map((b) => b.id);
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
        } catch (e) {
          console.warn('Seed branch inventory insert skipped:', (e as Error).message);
        }
      }
    }

    res.json({ success: true, inserted, branches: branchIds.slice(0, 10).length });
  } catch (error: unknown) {
    console.error('Seed branch inventory error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/admin/seed-flow-completions', isAuthenticated, requireAdmin, async (req, res) => {
  try {
    const existing = await db.execute(sql`SELECT COUNT(*)::text as c FROM dobody_flow_completions`);
    if (parseInt((existing.rows[0] as any).c) > 0) {
      return res.json({ success: true, message: 'Flow completions already seeded', count: parseInt((existing.rows[0] as any).c) });
    }

    const flowTasks = await db.execute(sql`SELECT id FROM dobody_flow_tasks`);
    const taskIds = flowTasks.rows.map((t) => t.id);
    if (taskIds.length === 0) {
      return res.json({ success: true, message: 'No flow tasks found', inserted: 0 });
    }

    const users = await db.execute(sql`SELECT id FROM users WHERE branch_id = 5 AND is_active = true AND role = 'barista' LIMIT 4`);
    const userIds = users.rows.map((u) => u.id);

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
  } catch (error: unknown) {
    console.error('Seed flow completions error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/admin/seed-training-assignments', isAuthenticated, requireAdmin, async (req, res) => {
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
      } catch (e) {
        console.warn('Seed training material insert skipped:', (e as Error).message);
      }
    }

    const users = await db.execute(sql`SELECT id FROM users WHERE branch_id = 5 AND is_active = true AND role IN ('barista','stajyer') LIMIT 4`);
    const userIds = users.rows.map((u) => u.id);

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
        } catch (e) {
          console.warn('Seed training assignment insert skipped:', (e as Error).message);
        }
      }
    }

    res.json({ success: true, materials: materialCount, assignments: assignmentCount });
  } catch (error: unknown) {
    console.error('Seed training assignments error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/admin/seed-announcements', isAuthenticated, requireAdmin, async (req, res) => {
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
  } catch (error: unknown) {
    console.error('Seed announcements error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/admin/seed-factory-extended', isAuthenticated, requireAdmin, async (req, res) => {
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
        } catch (e) {
          console.warn('Seed factory extended insert skipped:', (e as Error).message);
        }
      }
    }

    res.json({ success: true, batches: batchCount, outputs: outputCount, qualityChecks: qcCount, days: 10 });
  } catch (error: unknown) {
    console.error('Seed factory extended error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/admin/seed-agent-routing', isAuthenticated, requireAdmin, async (req, res) => {
  try {
    const existingCount = await db.execute(sql`SELECT COUNT(*) as cnt FROM agent_routing_rules`);
    const cnt = Number((existingCount.rows[0] as any).cnt);
    if (cnt > 0) {
      return res.json({ success: true, message: `Zaten ${cnt} kural mevcut, atlanıyor`, skipped: true });
    }

    const rules = [
      { category: 'performance', subcategory: 'low_score', description: 'Düşük performans skoru', primaryRole: 'coach', secondaryRole: 'supervisor', escalationRole: 'cgo', escalationDays: 3 },
      { category: 'performance', subcategory: 'absence', description: 'Devamsızlık', primaryRole: 'supervisor', secondaryRole: 'coach', escalationRole: 'cgo', escalationDays: 3 },
      { category: 'performance', subcategory: 'promotion_ready', description: 'Terfi hazırlığı', primaryRole: 'coach', secondaryRole: 'trainer', escalationRole: 'cgo', escalationDays: 7 },
      { category: 'training', subcategory: 'overdue', description: 'Geciken eğitim', primaryRole: 'trainer', secondaryRole: 'supervisor', escalationRole: 'cgo', escalationDays: 5 },
      { category: 'training', subcategory: 'low_quiz_score', description: 'Düşük sınav başarısı', primaryRole: 'trainer', secondaryRole: null, escalationRole: 'coach', escalationDays: 5 },
      { category: 'operations', subcategory: 'checklist_missed', description: 'Checklist yapılmadı', primaryRole: 'supervisor', secondaryRole: 'mudur', escalationRole: 'cgo', escalationDays: 2 },
      { category: 'operations', subcategory: 'stock_low', description: 'Düşük stok', primaryRole: 'supervisor', secondaryRole: 'satinalma', escalationRole: 'cgo', escalationDays: 1 },
      { category: 'quality', subcategory: 'customer_complaint', description: 'Müşteri şikayeti', primaryRole: 'kalite_kontrol', secondaryRole: 'supervisor', escalationRole: 'cgo', escalationDays: 1 },
      { category: 'quality', subcategory: 'low_satisfaction', description: 'Düşük memnuniyet', primaryRole: 'kalite_kontrol', secondaryRole: 'supervisor', escalationRole: 'cgo', escalationDays: 3 },
      { category: 'factory', subcategory: 'production_miss', description: 'Üretim hedefi tutmadı', primaryRole: 'fabrika_mudur', secondaryRole: null, escalationRole: 'cgo', escalationDays: 2 },
      { category: 'factory', subcategory: 'high_waste', description: 'Yüksek fire oranı', primaryRole: 'fabrika_mudur', secondaryRole: 'gida_muhendisi', escalationRole: 'cgo', escalationDays: 2 },
      { category: 'factory', subcategory: 'haccp_fail', description: 'HACCP uyumsuzluk', primaryRole: 'gida_muhendisi', secondaryRole: 'fabrika_mudur', escalationRole: 'ceo', escalationDays: 1 },
      { category: 'strategic', subcategory: 'branch_risk', description: 'Şube kapanma riski', primaryRole: 'cgo', secondaryRole: 'ceo', escalationRole: null, escalationDays: null },
      { category: 'strategic', subcategory: 'franchise_issue', description: 'Franchise sorunu', primaryRole: 'cgo', secondaryRole: 'ceo', escalationRole: null, escalationDays: null },
      { category: 'strategic', subcategory: 'trend_analysis', description: 'Genel trend analizi', primaryRole: 'cgo', secondaryRole: null, escalationRole: null, escalationDays: null },
    ];

    let inserted = 0;
    for (const rule of rules) {
      await db.execute(sql`
        INSERT INTO agent_routing_rules (category, subcategory, description, primary_role, secondary_role, escalation_role, escalation_days)
        VALUES (${rule.category}, ${rule.subcategory}, ${rule.description}, ${rule.primaryRole}, ${rule.secondaryRole}, ${rule.escalationRole}, ${rule.escalationDays})
      `);
      inserted++;
    }

    res.json({ success: true, inserted, message: `${inserted} yönlendirme kuralı eklendi` });
  } catch (error: unknown) {
    console.error('Seed agent routing error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/admin/seed-factory-full', isAuthenticated, requireAdmin, async (req, res) => {
  try {
    const results: Record<string, any> = {};

    // ─── TASK 1: Fix product category inconsistencies ───
    const catFixes = [
      { from: ['donut'], to: 'Donut' },
      { from: ['sirup', 'syrup', 'Şuruplar'], to: 'Şurup' },
      { from: ['cheesecake'], to: 'Cheesecake' },
      { from: ['cookie'], to: 'Cookie' },
      { from: ['brownie'], to: 'Brownie' },
      { from: ['mamabon'], to: 'Mamabon' },
      { from: ['cinnaboom'], to: 'Cinnaboom' },
      { from: ['kruvasan'], to: 'Kruvasan' },
      { from: ['quesadilla'], to: 'Quesadilla' },
      { from: ['sos'], to: 'Sos' },
      { from: ['powder'], to: 'Toz&Topping' },
      { from: ['cake'], to: 'Kek' },
      { from: ['wrapitos'], to: 'Wrapitos' },
    ];
    let catUpdated = 0;
    for (const fix of catFixes) {
      for (const fromCat of fix.from) {
        const r = await db.execute(sql`UPDATE factory_products SET category = ${fix.to} WHERE category = ${fromCat}`);
        catUpdated += (r as any).rowCount || 0;
      }
    }
    results.categoryFixes = catUpdated;

    // ─── TASK 2: Add missing shift types ───
    const existingShifts = await db.execute(sql`SELECT shift_type FROM factory_shifts`);
    const existingTypes = (existingShifts.rows as any[]).map(r => r.shift_type);
    let shiftsAdded = 0;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (!existingTypes.includes('ogle')) {
      await db.execute(sql`
        INSERT INTO factory_shifts (shift_date, shift_type, start_time, end_time, status, created_by_id)
        VALUES (${todayStr}, 'ogle', '14:00', '22:00', 'planned', 'hq-eren-fabrika')
      `);
      shiftsAdded++;
    }
    if (!existingTypes.includes('gece')) {
      await db.execute(sql`
        INSERT INTO factory_shifts (shift_date, shift_type, start_time, end_time, status, created_by_id)
        VALUES (${todayStr}, 'gece', '22:00', '06:00', 'planned', 'hq-eren-fabrika')
      `);
      shiftsAdded++;
    }
    results.shiftsAdded = shiftsAdded;

    // ─── TASK 3: Add factory teams ───
    const existingTeams = await db.execute(sql`SELECT COUNT(*)::text as c FROM factory_teams`);
    let teamsAdded = 0;
    if (parseInt((existingTeams.rows[0] as any).c) === 0) {
      const teamDefs = [
        { name: 'A Ekibi — Sabah', stationId: 1, leaderId: 'hq-eren-fabrika' },
        { name: 'B Ekibi — Öğle', stationId: 7, leaderId: 'a5cb16ee-d017-4ebc-bc80-b5a215cf3550' },
        { name: 'C Ekibi — Donut Hattı', stationId: 8, leaderId: '6d5b583c-f03f-4a27-bd03-c616e745302e' },
      ];
      for (const t of teamDefs) {
        await db.execute(sql`
          INSERT INTO factory_teams (name, station_id, leader_id, is_active)
          VALUES (${t.name}, ${t.stationId}, ${t.leaderId}, true)
        `);
        teamsAdded++;
      }

      const newTeams = await db.execute(sql`SELECT id FROM factory_teams ORDER BY id`);
      const teamIds = (newTeams.rows as any[]).map(r => r.id);
      const factoryUsers = [
        '6d5b583c-f03f-4a27-bd03-c616e745302e',
        '41d2a9f0-f3be-45d0-90cc-e2aa585cfcc9',
        'b8743987-e5d4-47f5-9a6f-08112d21d6c6',
        '38f93cb4-0135-4402-99cf-b62c4e338546',
        '4006e4a0-f2e1-404c-b860-3c41b2dc7842',
      ];
      for (let i = 0; i < factoryUsers.length; i++) {
        const teamId = teamIds[i % teamIds.length];
        await db.execute(sql`
          INSERT INTO factory_team_members (team_id, user_id, role, is_active)
          VALUES (${teamId}, ${factoryUsers[i]}, 'member', true)
          ON CONFLICT DO NOTHING
        `);
      }
    }
    results.teamsAdded = teamsAdded;

    // ─── TASK 4: Add daily targets (last 30 days + next 7 days) ───
    const stationTargets = [
      { stationId: 1, target: 900 },
      { stationId: 2, target: 500 },
      { stationId: 3, target: 384 },
      { stationId: 4, target: 300 },
      { stationId: 5, target: 350 },
      { stationId: 6, target: 600 },
      { stationId: 7, target: 900 },
      { stationId: 8, target: 900 },
      { stationId: 9, target: 280 },
    ];

    let targetsAdded = 0;
    for (let daysAgo = 30; daysAgo >= -7; daysAgo--) {
      const d = new Date(today);
      d.setDate(d.getDate() - daysAgo);
      if (d.getDay() === 0) continue;
      const dateStr = d.toISOString().split('T')[0];

      for (const st of stationTargets) {
        const variation = 0.9 + Math.random() * 0.2;
        const tgt = Math.round(st.target * variation);
        const actual = daysAgo > 0 ? Math.round(tgt * (0.75 + Math.random() * 0.3)) : 0;
        const waste = daysAgo > 0 ? Math.round(actual * (0.02 + Math.random() * 0.06)) : 0;

        try {
          await db.execute(sql`
            INSERT INTO factory_daily_targets (station_id, target_date, target_quantity, actual_quantity, waste_quantity)
            VALUES (${st.stationId}, ${dateStr}, ${tgt}, ${actual}, ${waste})
            ON CONFLICT (station_id, target_date) DO NOTHING
          `);
          targetsAdded++;
        } catch (e) { console.error(e); }
      }
    }
    results.dailyTargetsAdded = targetsAdded;

    // ─── TASK 5: Add production runs (last 30 days) ───
    const operatorIds = [
      '6d5b583c-f03f-4a27-bd03-c616e745302e',
      '41d2a9f0-f3be-45d0-90cc-e2aa585cfcc9',
      'b8743987-e5d4-47f5-9a6f-08112d21d6c6',
      '38f93cb4-0135-4402-99cf-b62c4e338546',
      '4006e4a0-f2e1-404c-b860-3c41b2dc7842',
    ];
    const stationIds = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const wasteReasons = ['Hamur kıvamı uygunsuz', 'Pişirme süresi aşıldı', 'Şekil bozukluğu', 'Sıcaklık hatası', 'Ambalaj hasarı'];

    let runsAdded = 0;
    let sessionsAdded = 0;

    for (let daysAgo = 30; daysAgo >= 1; daysAgo--) {
      const runDate = new Date(today);
      runDate.setDate(runDate.getDate() - daysAgo);
      if (runDate.getDay() === 0) continue;

      const runsPerDay = 2 + Math.floor(Math.random() * 2);
      for (let run = 0; run < runsPerDay; run++) {
        const stationId = stationIds[Math.floor(Math.random() * stationIds.length)];
        const operatorId = operatorIds[Math.floor(Math.random() * operatorIds.length)];

        const checkIn = new Date(runDate);
        checkIn.setHours(6 + run * 4, Math.floor(Math.random() * 30), 0, 0);
        const checkOut = new Date(checkIn);
        checkOut.setHours(checkIn.getHours() + 3 + Math.floor(Math.random() * 2));

        const produced = 80 + Math.floor(Math.random() * 300);
        const waste = Math.floor(produced * (0.02 + Math.random() * 0.06));

        try {
          const sessionRes = await db.execute(sql`
            INSERT INTO factory_shift_sessions (user_id, station_id, check_in_time, check_out_time, total_produced, total_waste, work_minutes, status, phase)
            VALUES (${operatorId}, ${stationId}, ${checkIn.toISOString()}, ${checkOut.toISOString()}, ${produced}, ${waste}, ${Math.round((checkOut.getTime() - checkIn.getTime()) / 60000)}, 'completed', 'uretim')
            RETURNING id
          `);
          const sessionId = (sessionRes.rows[0] as any).id;
          sessionsAdded++;

          const startTime = new Date(checkIn);
          startTime.setMinutes(startTime.getMinutes() + 15);
          const endTime = new Date(checkOut);
          endTime.setMinutes(endTime.getMinutes() - 10);

          const qualityScore = 70 + Math.floor(Math.random() * 30);
          const wasteReason = waste > 10 ? wasteReasons[Math.floor(Math.random() * wasteReasons.length)] : null;

          await db.execute(sql`
            INSERT INTO factory_production_runs (session_id, user_id, station_id, start_time, end_time, quantity_produced, quantity_waste, waste_reason, quality_score, status)
            VALUES (${sessionId}, ${operatorId}, ${stationId}, ${startTime.toISOString()}, ${endTime.toISOString()}, ${produced}, ${waste}, ${wasteReason}, ${qualityScore}, 'completed')
          `);
          runsAdded++;
        } catch (e) {
          console.warn('Seed production run skipped:', (e as Error).message);
        }
      }
    }
    results.sessionsAdded = sessionsAdded;
    results.productionRunsAdded = runsAdded;

    // ─── TASK 6: Add worker scores (last 4 weeks) ───
    const allFactoryUserIds = [
      'hq-eren-fabrika',
      'a5cb16ee-d017-4ebc-bc80-b5a215cf3550',
      '6d5b583c-f03f-4a27-bd03-c616e745302e',
      '41d2a9f0-f3be-45d0-90cc-e2aa585cfcc9',
      'b8743987-e5d4-47f5-9a6f-08112d21d6c6',
      '38f93cb4-0135-4402-99cf-b62c4e338546',
      '4006e4a0-f2e1-404c-b860-3c41b2dc7842',
    ];

    const existingScores = await db.execute(sql`SELECT COUNT(*)::text as c FROM factory_worker_scores`);
    let scoresAdded = 0;
    if (parseInt((existingScores.rows[0] as any).c) === 0) {
      for (const userId of allFactoryUserIds) {
        for (let weeksAgo = 4; weeksAgo >= 0; weeksAgo--) {
          const weekDate = new Date(today);
          weekDate.setDate(weekDate.getDate() - weeksAgo * 7);
          const dateStr = weekDate.toISOString().split('T')[0];

          const prodScore = (70 + Math.random() * 25).toFixed(2);
          const wasteScore = (75 + Math.random() * 20).toFixed(2);
          const qualScore = (78 + Math.random() * 20).toFixed(2);
          const attendScore = (80 + Math.random() * 20).toFixed(2);
          const breakScore = (70 + Math.random() * 25).toFixed(2);
          const totalScore = ((parseFloat(prodScore) + parseFloat(wasteScore) + parseFloat(qualScore) + parseFloat(attendScore) + parseFloat(breakScore)) / 5).toFixed(2);
          const totalProduced = (200 + Math.random() * 800).toFixed(0);
          const totalWaste = (5 + Math.random() * 40).toFixed(0);
          const breakMin = 30 + Math.floor(Math.random() * 30);

          await db.execute(sql`
            INSERT INTO factory_worker_scores (user_id, period_date, period_type, production_score, waste_score, quality_score, attendance_score, break_score, total_score, total_produced, total_waste, total_break_minutes, special_break_count)
            VALUES (${userId}, ${dateStr}, 'weekly', ${prodScore}, ${wasteScore}, ${qualScore}, ${attendScore}, ${breakScore}, ${totalScore}, ${totalProduced}, ${totalWaste}, ${breakMin}, ${Math.floor(Math.random() * 3)})
          `);
          scoresAdded++;
        }
      }
    }
    results.workerScoresAdded = scoresAdded;

    // ─── TASK 7: Add management scores (last 3 months) ───
    const existingMgmt = await db.execute(sql`SELECT COUNT(*)::text as c FROM factory_management_scores`);
    let mgmtAdded = 0;
    if (parseInt((existingMgmt.rows[0] as any).c) === 0) {
      for (let monthsAgo = 3; monthsAgo >= 0; monthsAgo--) {
        const d = new Date(today);
        d.setMonth(d.getMonth() - monthsAgo);
        const month = d.getMonth() + 1;
        const year = d.getFullYear();

        const wasteCount = Math.floor(Math.random() * 8);
        const prodErrorCount = Math.floor(Math.random() * 5);
        const wrongProdCount = Math.floor(Math.random() * 3);
        const branchComplaint = Math.floor(Math.random() * 4);
        const invCompleted = Math.random() > 0.3;
        const invOnTime = invCompleted && Math.random() > 0.2;

        const wasteScore = Math.max(0, 100 - wasteCount * 8);
        const prodErrScore = Math.max(0, 100 - prodErrorCount * 10);
        const wrongProdScore = Math.max(0, 100 - wrongProdCount * 12);
        const branchScore = Math.max(0, 100 - branchComplaint * 10);
        const invScore = invCompleted ? (invOnTime ? 100 : 70) : 30;
        const overall = Math.round((wasteScore + prodErrScore + wrongProdScore + branchScore + invScore) / 5);

        await db.execute(sql`
          INSERT INTO factory_management_scores (month, year, inventory_count_score, waste_score, production_error_score, wrong_production_score, branch_complaint_score, overall_score, waste_count, production_error_count, wrong_production_count, branch_complaint_count, inventory_count_completed, inventory_count_on_time)
          VALUES (${month}, ${year}, ${invScore}, ${wasteScore}, ${prodErrScore}, ${wrongProdScore}, ${branchScore}, ${overall}, ${wasteCount}, ${prodErrorCount}, ${wrongProdCount}, ${branchComplaint}, ${invCompleted}, ${invOnTime})
        `);
        mgmtAdded++;
      }
    }
    results.managementScoresAdded = mgmtAdded;

    // ─── Summary counts ───
    const finalCounts = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM factory_shifts) as shifts,
        (SELECT COUNT(*) FROM factory_teams) as teams,
        (SELECT COUNT(*) FROM factory_daily_targets) as daily_targets,
        (SELECT COUNT(*) FROM factory_shift_sessions) as sessions,
        (SELECT COUNT(*) FROM factory_production_runs) as runs,
        (SELECT COUNT(*) FROM factory_worker_scores) as worker_scores,
        (SELECT COUNT(*) FROM factory_management_scores) as mgmt_scores,
        (SELECT COUNT(DISTINCT category) FROM factory_products) as product_categories
    `);

    res.json({
      success: true,
      message: 'Fabrika seed verileri başarıyla oluşturuldu',
      inserted: results,
      finalCounts: finalCounts.rows[0],
    });
  } catch (error: unknown) {
    console.error('Seed factory full error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/admin/seed-kiosk-accounts', isAuthenticated, requireAdmin, async (req, res) => {
  try {
    const { seedAllKioskAccounts } = await import('../lib/kiosk-accounts');
    const results = await seedAllKioskAccounts();

    res.json({
      success: true,
      total: results.length,
      created: results.filter(r => r.status === 'created').length,
      updated: results.filter(r => r.status === 'updated').length,
      accounts: results,
    });
  } catch (error: unknown) {
    console.error('[SeedKiosk] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/seed-cost-settings — Fabrika maliyet parametreleri
router.post('/api/admin/seed-cost-settings', isAuthenticated, requireAdmin, async (req, res) => {
  try {
    const costSettings = [
      { key: 'electricity_tl_per_kwh', value: '3.50', desc: 'Endüstriyel elektrik birim fiyatı (₺/kWh)' },
      { key: 'gas_tl_per_m3', value: '8.00', desc: 'Doğalgaz birim fiyatı (₺/m³)' },
      { key: 'water_tl_per_liter', value: '0.03', desc: 'Su birim fiyatı (₺/L = 30 ₺/m³)' },
      { key: 'hourly_wage_tl', value: '120', desc: 'Ortalama saatlik işçilik ücreti (₺/saat)' },
      { key: 'packaging_cost_per_unit', value: '1.50', desc: 'Ortalama ambalaj maliyeti (₺/adet)' },
      { key: 'overhead_percentage', value: '15', desc: 'Genel gider yüzdesi (%)' },
    ];

    let created = 0;
    for (const s of costSettings) {
      const existing = await db.execute(sql`SELECT id FROM factory_cost_settings WHERE setting_key = ${s.key}`);
      if ((existing.rows as any[]).length > 0) continue;
      await db.execute(sql`
        INSERT INTO factory_cost_settings (setting_key, setting_value, description) 
        VALUES (${s.key}, ${s.value}, ${s.desc})
      `);
      created++;
    }

    res.json({ success: true, message: `${created} maliyet ayarı oluşturuldu`, created });
  } catch (error: any) {
    console.error('[SeedCostSettings] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/seed-batch-specs — 9 istasyon için batch spec oluştur
router.post('/api/admin/seed-batch-specs', isAuthenticated, requireAdmin, async (req, res) => {
  try {
    // İstasyonları al
    const stations = await db.execute(sql`SELECT id, name, code, product_type_id FROM factory_stations WHERE is_active = true ORDER BY sort_order`);
    const stationList = stations.rows as any[];

    if (stationList.length === 0) {
      return res.status(400).json({ error: 'Aktif fabrika istasyonu bulunamadı' });
    }

    // Her istasyonun ürününü bul (product_type_id veya isme göre)
    const stationSpecs: Record<string, { batchKg: string; pieces: number; pieceWeight: string; pieceUnit: string; duration: number; minW: number; maxW: number; prep: number; waste: string; desc: string; productSearch: string; kwh: string; gas: string; water: string }> = {
      'DONUT_HAMUR': { batchKg: '50', pieces: 500, pieceWeight: '80', pieceUnit: 'g', duration: 120, minW: 3, maxW: 5, prep: 30, waste: '8', desc: 'Donut hamuru hazırlama — yoğurma, mayalama, şekillendirme', productSearch: 'Donut', kwh: '18.5', gas: '2.5', water: '50' },
      'KONSANTRE': { batchKg: '500', pieces: 550, pieceWeight: '950', pieceUnit: 'ml', duration: 120, minW: 2, maxW: 3, prep: 20, waste: '3', desc: 'Konsantre şurup dolum hattı', productSearch: 'Şurup', kwh: '8.0', gas: '0', water: '120' },
      'CHEESECAKE': { batchKg: '25', pieces: 50, pieceWeight: '450', pieceUnit: 'g', duration: 90, minW: 2, maxW: 3, prep: 25, waste: '5', desc: 'Cheesecake üretimi — taban, dolgu, pişirme', productSearch: 'Cheesecake', kwh: '12.0', gas: '1.8', water: '30' },
      'MAMABON': { batchKg: '20', pieces: 60, pieceWeight: '300', pieceUnit: 'g', duration: 60, minW: 2, maxW: 3, prep: 15, waste: '5', desc: 'Mamabon üretimi', productSearch: 'Mamabon', kwh: '10.0', gas: '1.5', water: '25' },
      'WRAPITOS': { batchKg: '30', pieces: 100, pieceWeight: '250', pieceUnit: 'g', duration: 75, minW: 2, maxW: 4, prep: 20, waste: '4', desc: 'Wrapitos üretimi — hamur sarma ve doldurma', productSearch: 'Wrapitos', kwh: '9.5', gas: '1.2', water: '20' },
      'COOKIES': { batchKg: '15', pieces: 90, pieceWeight: '150', pieceUnit: 'g', duration: 60, minW: 1, maxW: 3, prep: 15, waste: '6', desc: 'Cookie üretimi — hamur hazırlama, şekillendirme, pişirme', productSearch: 'Cookie', kwh: '14.0', gas: '2.0', water: '15' },
      'DONUT_SUSLEME': { batchKg: '30', pieces: 200, pieceWeight: '120', pieceUnit: 'g', duration: 90, minW: 2, maxW: 4, prep: 10, waste: '4', desc: 'Donut süsleme — kaplama, dolgu, dekorasyon', productSearch: 'Donut', kwh: '5.0', gas: '0', water: '10' },
      'DONUT_PAKETLEME': { batchKg: '40', pieces: 300, pieceWeight: '120', pieceUnit: 'g', duration: 60, minW: 2, maxW: 4, prep: 10, waste: '2', desc: 'Donut paketleme — kutu, etiket, sevkiyat hazırlık', productSearch: 'Donut', kwh: '3.0', gas: '0', water: '5' },
      'CINNABOOM': { batchKg: '20', pieces: 60, pieceWeight: '280', pieceUnit: 'g', duration: 75, minW: 2, maxW: 3, prep: 20, waste: '5', desc: 'Cinnaboom üretimi — hamur, dolgu, pişirme', productSearch: 'Cinnaboom', kwh: '13.0', gas: '1.8', water: '20' },
    };

    let created = 0;
    let skipped = 0;

    for (const station of stationList) {
      const spec = stationSpecs[station.code];
      if (!spec) { skipped++; continue; }

      // Bu istasyon için zaten batch spec var mı?
      const existing = await db.execute(sql`SELECT id FROM factory_batch_specs WHERE station_id = ${station.id} AND is_active = true LIMIT 1`);
      if ((existing.rows as any[]).length > 0) { skipped++; continue; }

      // İstasyonun ürününü bul
      let productId = station.product_type_id;
      if (!productId) {
        const products = await db.execute(sql`SELECT id FROM factory_products WHERE name ILIKE ${'%' + spec.productSearch + '%'} AND is_active = true LIMIT 1`);
        productId = (products.rows as any[])[0]?.id;
      }
      if (!productId) {
        // İlk aktif ürünü al (fallback)
        const fallback = await db.execute(sql`SELECT id FROM factory_products WHERE is_active = true LIMIT 1`);
        productId = (fallback.rows as any[])[0]?.id || 1;
      }

      // İstasyonun product_type_id'sini güncelle
      if (!station.product_type_id && productId) {
        await db.execute(sql`UPDATE factory_stations SET product_type_id = ${productId} WHERE id = ${station.id}`);
      }

      // Batch spec oluştur
      await db.execute(sql`
        INSERT INTO factory_batch_specs (product_id, station_id, batch_weight_kg, batch_weight_unit, expected_pieces, piece_weight_grams, piece_weight_unit, target_duration_minutes, min_workers, max_workers, prep_duration_minutes, expected_waste_percent, energy_kwh_per_batch, gas_m3_per_batch, water_l_per_batch, description, is_active)
        VALUES (${productId}, ${station.id}, ${spec.batchKg}, 'kg', ${spec.pieces}, ${spec.pieceWeight}, ${spec.pieceUnit}, ${spec.duration}, ${spec.minW}, ${spec.maxW}, ${spec.prep}, ${spec.waste}, ${spec.kwh}, ${spec.gas}, ${spec.water}, ${spec.desc}, true)
      `);
      created++;
    }

    res.json({ success: true, message: `${created} batch spec oluşturuldu, ${skipped} atlandı`, created, skipped, totalStations: stationList.length });
  } catch (error: any) {
    console.error('[SeedBatchSpecs] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/seed-audit-templates — Denetim şablonlarını oluştur
router.post('/api/admin/seed-audit-templates', isAuthenticated, requireAdmin, async (req, res) => {
  try {
    const { seedAuditTemplates } = await import('../seeds/seed-audit-templates');
    await seedAuditTemplates(req.user.id);
    res.json({ success: true, message: "Denetim şablonları oluşturuldu" });
  } catch (error: any) {
    console.error('[SeedAuditTemplates] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/seed-holidays-2026 — 2026 Türkiye resmi tatilleri
router.post('/api/admin/seed-holidays-2026', isAuthenticated, requireAdmin, async (req, res) => {
  try {
    const holidays2026 = [
      { name: "Yılbaşı", date: "2026-01-01", year: 2026, is_half_day: false },
      { name: "Ramazan Bayramı Arife", date: "2026-03-19", year: 2026, is_half_day: true },
      { name: "Ramazan Bayramı 1. Gün", date: "2026-03-20", year: 2026, is_half_day: false },
      { name: "Ramazan Bayramı 2. Gün", date: "2026-03-21", year: 2026, is_half_day: false },
      { name: "Ramazan Bayramı 3. Gün", date: "2026-03-22", year: 2026, is_half_day: false },
      { name: "Ulusal Egemenlik ve Çocuk Bayramı", date: "2026-04-23", year: 2026, is_half_day: false },
      { name: "Emek ve Dayanışma Günü", date: "2026-05-01", year: 2026, is_half_day: false },
      { name: "Atatürk'ü Anma, Gençlik ve Spor Bayramı", date: "2026-05-19", year: 2026, is_half_day: false },
      { name: "Kurban Bayramı Arife", date: "2026-05-26", year: 2026, is_half_day: true },
      { name: "Kurban Bayramı 1. Gün", date: "2026-05-27", year: 2026, is_half_day: false },
      { name: "Kurban Bayramı 2. Gün", date: "2026-05-28", year: 2026, is_half_day: false },
      { name: "Kurban Bayramı 3. Gün", date: "2026-05-29", year: 2026, is_half_day: false },
      { name: "Kurban Bayramı 4. Gün", date: "2026-05-30", year: 2026, is_half_day: false },
      { name: "Demokrasi ve Milli Birlik Günü", date: "2026-07-15", year: 2026, is_half_day: false },
      { name: "Zafer Bayramı", date: "2026-08-30", year: 2026, is_half_day: false },
      { name: "Cumhuriyet Bayramı", date: "2026-10-29", year: 2026, is_half_day: false },
    ];

    // Mevcut 2026 tatilleri temizle
    await db.execute(sql`DELETE FROM public_holidays WHERE year = 2026`);

    // Yenilerini ekle
    for (const h of holidays2026) {
      await db.execute(sql`
        INSERT INTO public_holidays (name, date, year, is_half_day, is_active)
        VALUES (${h.name}, ${h.date}, ${h.year}, ${h.is_half_day}, true)
      `);
    }

    res.json({ success: true, message: `2026 yılı için ${holidays2026.length} resmi tatil oluşturuldu` });
  } catch (error: any) {
    console.error('[SeedHolidays2026] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
