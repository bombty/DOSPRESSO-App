// DOSPRESSO 26 Rol için manuel hazırlanmış Türkçe içerik
// Kaynaklar: roles tablosu (DB), dospresso-roles-and-people skill, dospresso-architecture skill,
// shared/schema/schema-02.ts PERMISSIONS map, client/src/pages/admin/yetkilendirme.tsx,
// + Replit (Asistan) eklemeleri: çoklu perspektifler ve eksik görev/akış önerileri.
// Üretim tarihi: 26 Apr 2026

export const CATEGORIES = {
  hq_yonetim: { title: "HQ Yönetim", color: [0.12, 0.27, 0.51], icon: "▲" },
  hq_operasyon: { title: "HQ Operasyon", color: [0.10, 0.45, 0.40], icon: "■" },
  sube_operasyon: { title: "Şube Operasyon", color: [0.65, 0.40, 0.10], icon: "●" },
  buddy: { title: "Buddy / Yardımcı", color: [0.55, 0.30, 0.55], icon: "◆" },
  fabrika: { title: "Fabrika", color: [0.70, 0.20, 0.20], icon: "◼" },
  yatirimci: { title: "Yatırımcı", color: [0.40, 0.40, 0.45], icon: "○" },
  sistem: { title: "Sistem", color: [0.20, 0.20, 0.20], icon: "★" },
};

export const ROLE_ORDER = [
  // HQ Yönetim
  "admin", "ceo", "cgo", "yatirimci_hq",
  // HQ Operasyon
  "coach", "trainer", "muhasebe_ik", "satinalma", "gida_muhendisi",
  "recete_gm", "marketing", "destek", "teknik",
  // Fabrika
  "fabrika_mudur", "uretim_sefi", "sef", "fabrika_operator", "fabrika_depo",
  // Şube Operasyon
  "mudur", "supervisor", "barista", "stajyer", "sube_kiosk",
  // Buddy
  "supervisor_buddy", "bar_buddy",
  // Yatırımcı
  "yatirimci_branch",
];

// Her rol için içerik. Alan tanımları:
// - displayName: Türkçe başlık (DB roles.display_name veya manuel)
// - category: CATEGORIES key
// - scope: yetki kapsamı
// - shortPurpose: 1 cümlede rolün varlık sebebi
// - description: 2-4 cümlelik genel açıklama
// - currentStatus: güncel durum (atanmış kişi, sayı, anomali notu)
// - responsibilities: 5-8 madde
// - dailyFlow: { sabah, oglen, aksam } -- HQ rolleri için "haftalik" alanı kullanılabilir
// - perspectives: { operasyonel, stratejik, veri, ik, risk }
// - hierarchy: { reportsTo, manages }
// - pilotNote: Pilot Day-1 (5 May 2026) durumu
// - knownIssues: skill R-6 backlog'u veya tespit edilen sorunlar
// - recommendations: Replit (Asistan) önerileri — eksik görevler, akış iyileştirme

export const ROLES_CONTENT = {
  // ============================================================
  // HQ YÖNETİM
  // ============================================================
  admin: {
    displayName: "Sistem Yöneticisi",
    category: "sistem",
    scope: "Tüm sistem (sınırsız)",
    shortPurpose: "Platformun teknik bütünlüğünü koruyan, tüm yetkilere sahip süper-kullanıcı.",
    description:
      "Admin rolü, DOSPRESSO platformunun en üst düzey teknik yetkisidir. Tüm modüllere okuma-yazma-silme erişimine sahiptir, lock'ları aşabilir, kullanıcı ve rol yönetimi yapar. Genellikle gerçek bir operasyonel rol değil, sistem bakımı, kurulum ve acil durum müdahale içindir. Pilot ekibinde admin yetkisi sadece çekirdek geliştirici/sistem sorumlularına verilir.",
    currentStatus:
      "DB'de 5 admin hesabı tanımlı, 3'ü aktif: Admin DOSPRESSO (kurulum), Admin HQ (Aslan tarafından kullanılan superuser), Test HQ Superuser (test/QA). Pilot öncesi test_hq_all hesabı is_active=false yapılmalı (R-6 backlog #5).",
    responsibilities: [
      "Kullanıcı oluşturma, rol değiştirme, şifre sıfırlama (her şube/her rol için)",
      "Modül flag'lerini açma/kapama (module_flags tablosu, 95 modül için)",
      "Yetki tablosu yönetimi (role_module_permissions, 3127 satır)",
      "Veri locking'i aşma (recipe.editLocked, finance.lockedAt)",
      "Acil durumlarda diğer kullanıcı adına işlem (kontrolü kim yapacak — denetim eksik)",
      "Audit log inceleme, sistem ayarları (ayarlar.tsx)",
      "Yedekleme, geri yükleme, schema migration (db:push)",
      "Pilot süresince hata raporlarını triage etme (Aslan + Replit ortak)",
    ],
    dailyFlow: null, // event-driven, sabit akış yok
    eventDriven: [
      "Yeni kullanıcı eklenir → admin role atar, branch_id setler, şifre paylaşır",
      "Modül lock kararı (örn. payroll lock → admin override 423→200)",
      "Bug raporu gelir → admin canlı DB'ye join olur, durum tespit eder",
      "Sprint sonu → admin tüm migration'ları db:push --force ile çeker",
    ],
    perspectives: {
      operasyonel:
        "Admin günlük operasyona dahil değildir; hata, bug, lock-çakışması, yetki anomalisi durumlarında devreye girer. Pilot süresince Aslan+Replit ekibi bu rolü ortak kullanır.",
      stratejik:
        "Sistem geneli güvenlik, bütünlük, audit trail'in sahibidir. Yetki dağıtımındaki yanlışlıklar (örn. cgo'ya haksız checklist erişimi) admin tarafından düzeltilir. Stratejik anlamda 'son kapı' rolüdür.",
      veri:
        "DB'nin tamamına okuma-yazma erişimi var. Tüm tablolarda CRUD yapabilir, audit_logs ve permission_audit_logs tablolarını okuyabilir. Veri tabanlı kararların kaynağıdır.",
      ik:
        "Admin yetkisi sadece bir veya iki çekirdek kişiye verilmelidir. Yetiştirme: Admin yedeklemesi için Aslan haricinde en az bir teknik personel admin yetkisi almalı (Murat? Replit ekibi?). Şu anda yedekleme yok.",
      risk:
        "En yüksek risk rolüdür — yanlış admin işlemi (örn. tüm tasks SET deleted_at=now()) tüm sistemi durdurabilir. Kötü niyetli kullanım veya parola sızıntısı catastrophic. Pilot'ta MFA yok, audit log incelemesi yok.",
    },
    hierarchy: { reportsTo: "Aslan (sahibi)", manages: "Tüm sistem teknik" },
    pilotNote:
      "Pilot Day-1 (5 May 2026) admin yetkisi 2 hesapta aktif olmalı: 'admin' (acil müdahale) ve 'aslan' (operasyon). Test hesabı (test_hq_all) önceden devre dışı bırakılmalı.",
    knownIssues: [
      "MFA yok — admin parolası tek faktör (R-6 backlog)",
      "Admin işlemleri için ayrı bir audit ekranı yok (permission_audit_logs DB'de var ama UI yok)",
      "Admin yedekleme yok — Aslan tek admin operatörü, izinli olduğunda destek kim?",
    ],
    recommendations: [
      "Pilot öncesi 2. admin operatörü tayin et (Murat veya Replit destek hesabı). Tek nokta arıza riski azalır.",
      "Admin işlemlerini gösteren bir 'Sistem Olayları' sayfası ekle (ayarlar.tsx altında). audit_logs + permission_audit_logs join'i.",
      "Admin yetkisi atandığında otomatik bildirim (Aslan'a) — kim ne zaman admin oldu görünmeli.",
      "Acil 'lock-aşma' işlemleri için onay akışı (admin → Aslan'a notification, override işlemi loglanır).",
      "Geliştirme: 'Read-only admin' alt rolü düşünülebilir — bug-tespit eden ekip yazma yapamadan inceleme yapar.",
    ],
  },

  ceo: {
    displayName: "CEO",
    category: "hq_yonetim",
    scope: "Tüm şubeler + fabrika (branchId=null, executive)",
    shortPurpose: "Şirketin tüm operasyonel ve finansal panoramasına salt-yönetim erişimi olan üst düzey karar verici.",
    description:
      "CEO rolü, DOSPRESSO ağının en üst karar mercii içindir. AI Kontrol Merkezi (Mr. Dobody), tüm şube/fabrika dashboard'ları, finansal raporlar, denetim sonuçları, KPI snapshot'larına erişim sağlar. Operasyonel CRUD'a doğrudan girişi azdır — onun yerine talimat/karar verir, raporları okur. Aslan (sahibi) ve Ali (ortak) bu rolde.",
    currentStatus:
      "3 aktif CEO hesabı: Aslan Fahrettin (sahibi, operasyonu da yürütür), Ali (ortak, salt-yönetim odaklı), Test CEO. R-6 backlog #3: Ali ile pilot öncesi rol netleştirilmeli (test mi gerçek mi?).",
    responsibilities: [
      "Tüm şube performansını izleme (Mission Control HQ Dashboard)",
      "AI brifing okuma (Mr. Dobody günlük özet)",
      "Stratejik görev atama (CEO → tüm rollere bulk task)",
      "Finansal özet onaylama, lock kararları",
      "Yatırımcı brifingi hazırlama (yatirimci_hq raporlarına altyapı)",
      "Yeni şube açılış kararı, ownership_type yönetimi",
      "Pilot sürecini izleme, eskalasyonları çözme",
      "Marka ve büyüme stratejisi (cgo ile birlikte)",
    ],
    dailyFlow: {
      sabah:
        "Mr. Dobody AI brifing okuma (gece toplanan özet: dünün satışları, şube anomalileri, açık görevler). Acil işaretler için cgo/coach'a yönlendirme.",
      oglen:
        "Mission Control panel — branch_status, sla_tracker, open_tickets widget'ları. Şubeler arası karşılaştırma. Ekipman arıza ve müşteri şikayet trendleri.",
      aksam:
        "Günü kapatma: pending_orders, financial_overview. Yarınki kritik konuları cgo+coach ile WhatsApp/toplantı.",
    },
    perspectives: {
      operasyonel:
        "CEO günlük operasyonda sahnede değil ama her şeyi izler. Müdahalesi 'baş kaldıran sorunda' (örn. şube müdürü istifa, müşteri PR krizi) gerçekleşir. Pilot Day-1'de Aslan operasyonu da yürütür çünkü ekip küçük.",
      stratejik:
        "Şirketin yön verici rolü. 22-şube → 50-şube hedefi gibi büyüme kararları, franchise sözleşme yaklaşımı, marka konumlanma kararları burada alınır. Pilot sonrası ders öğrenimi ve genişleme stratejisi.",
      veri:
        "Tüm KPI'lara salt-okur erişim. Aslan + Ali farklı kullanım: Aslan operasyonel detaya iner, Ali sadece üst-seviye özet ister. Dashboard'da rol-içi kişi farkı için widget atama desteği eksik (her ikisi aynı widget'ları görür).",
      ik:
        "CEO hesabı uçtan uca güçlü. Aslan-Ali arasında yetki ayrımı yok — etiket olarak ikisi de 'ceo'. Yedekleme açısından sağlam: 2 hesap aktif. Yetiştirme gerekmez (sahibi rolü).",
      risk:
        "CEO yetkisinin franchise/yatırımcıya verilmesi büyük risk olur (henüz olmadı). Aslan operasyonu yürütürken yorulması = pilot başarısı için en büyük sürdürülebilirlik riski. Görev devri planı yok.",
    },
    hierarchy: {
      reportsTo: "—",
      manages: "Tüm operasyon (cgo, coach, fabrika_mudur, mudur'lar üzerinden)",
    },
    pilotNote:
      "Pilot Day-1 Aslan operasyonel CEO + Replit teknik destek + Ali stratejik özet okuyucu. Ali'nin pilot süresince sistemi ne kadar kullanacağı belirsiz (R-6).",
    knownIssues: [
      "Ali'nin gerçek aktivitesi belirsiz — son login tarihi takip edilmeli (#3)",
      "CEO için 'günlük brifing email' yok (Mr. Dobody widget içinde, mail bildirimi yok)",
      "İki CEO aynı widget'ları görür — kişiselleştirme eksik",
    ],
    recommendations: [
      "Aslan için ayrı 'Owner Dashboard' (default_open=true=ai_briefing+branch_status+sla+financial) ve Ali için 'Stratejik özet' (sadece ai_briefing+financial+kpi_snapshot) profili kur. dashboard_role_widgets'ta user-level override eklenmeli (henüz yok).",
      "CEO için günlük 08:00 mail brifingi (Mr. Dobody → SMTP) → rapor masada olur, sisteme login etmeden okunur.",
      "Pilot sırasında haftalık 'CEO Q&A' sayfası — pilot ekipten gelen sorulara Aslan tek yerde cevap verir, log kalır (knowledge_base modülünde olabilir).",
      "Görev devri planı: Aslan tatil/raporlu olduğunda hangi yetkiler kime devredilir, bir delegasyon matrisi oluşturulmalı.",
    ],
  },

  cgo: {
    displayName: "CGO (Chief Growth Officer)",
    category: "hq_yonetim",
    scope: "Tüm şubeler + fabrika (operasyon odaklı)",
    shortPurpose: "Operasyonel verimliliği, müşteri kalitesini ve şube büyümesini günlük olarak yönetir.",
    description:
      "CGO, CEO'nun operasyonel kanadıdır. CEO stratejik karar verirken, CGO bu kararları sahaya aktarır: koçlarla şube ziyareti planlar, kalite şikayetlerini takip eder, satışları izler. 25 Apr 2026'dan itibaren Ümran'ın kalite görevleri de CGO'ya (Utku) devredildi — bu nedenle checklist/complaints/product_complaints yetkilerinin CGO'ya tam atanması bir pilot öncesi açık iştir.",
    currentStatus:
      "1 aktif CGO: Utku. 25 Apr 2026'dan itibaren Ümran'ın (kalite_kontrol) görevleri devredildi. Mevcut yetki: tüm operasyon view, ama checklist+complaints CRUD eksik. Pilot öncesi yetki ekleme veya bu görevleri başka role devretme gerek.",
    responsibilities: [
      "Şube ziyaret planlaması (Yavuz/Ece koçlarla)",
      "Kalite şikayetleri triage ve çözüm (DEVR ALDI Ümran'dan)",
      "Müşteri geri bildirim trendleri (CRM modülü)",
      "Şube performans karşılaştırması (Mission Control)",
      "Yeni ürün lansman desteği (marketing+recete_gm ile)",
      "Operasyonel KPI takibi (sales, waste, customer satisfaction)",
      "Satış kampanyaları (marketing ile koordinasyon)",
      "Pilot sürecinde günlük 'pulse check' — tüm şube müdürleriyle hızlı kontak",
    ],
    dailyFlow: {
      sabah:
        "Open tickets, sla_tracker widget. Müşteri şikayetleri ön sırada. Acil işler için coach'a yönlendirme.",
      oglen:
        "Şube karşılaştırma dashboard. Düşük performans şubelere aksiyon planı. Yeni ürün satış raporu.",
      aksam:
        "Yarınki ziyaret planı. Marketing kampanya inceleme. CEO'ya günlük özet (whatsapp).",
    },
    perspectives: {
      operasyonel:
        "Saha-ofis köprüsü. CEO ile şube müdürü arasında en aktif yöneticidir. Pilot Day-1'de tek CGO (Utku) olduğundan iş yükü 2 katına çıkacak (kalite + büyüme).",
      stratejik:
        "Büyüme öncelikleri: yeni şube performansı, mevcut şubelerden ek satış (upsell), müşteri sadakati. Pilot sonrası 'hangi şube genişlemeye hazır' raporu CGO tarafından hazırlanır.",
      veri:
        "CRM, satış, kalite, ekipman datasına view erişimi var. Ama checklist+complaints CRUD eksikliği veri girişini de engelliyor (örn. şikayet kapanış notu yazamaz).",
      ik:
        "Tek CGO = tek nokta arıza. Pilot öncesi yedekleme yok. Coach ekibi destekliyor ama coach rolü daha sahaya odaklı, yönetim değil. Yedekleme için CGO yetkilerinin alt-rolü oluşturulabilir.",
      risk:
        "Utku iki rol birden taşıyor (CGO + kalite). Yorgunluk + dikkat dağılması riski. Kalite şikayetleri SLA dışına çıkarsa CGO sorumlu görünecek ama yetki atamaları henüz tam değil — sorumluluk-yetki uyumsuzluğu.",
    },
    hierarchy: {
      reportsTo: "CEO (Aslan/Ali)",
      manages: "coach (Yavuz, Ece), trainer, marketing (dolaylı)",
    },
    pilotNote:
      "Pilot Day-1 Utku tek CGO. R-6 backlog: kalite görevlerinin CGO'ya tam yetkilendirilmesi (checklist+complaints+product_complaints CRUD).",
    knownIssues: [
      "CGO'da checklist+complaints+product_complaints CRUD yetkisi eksik (devreden Ümran'dan tam transfer olmadı)",
      "CGO için ayrı 'kalite dashboard' yok — kalite KPI'ları ana dashboard'a karışıyor",
      "Kalite SLA'ları CGO'ya bildirim atmıyor (sla_tracker widget'ta ama push yok)",
    ],
    recommendations: [
      "Pilot öncesi (kritik): CGO rolüne checklist, complaints, product_complaints, qc_records modüllerinde {view,create,edit} yetkilerini ekle. Sef bir SQL ile yapılabilir.",
      "CGO için 'Kalite Komuta' dashboard sayfası oluştur (yeni route /cgo/kalite). Şikayet → atama → kapanış akışı tek ekranda.",
      "CGO'ya gece 22:00 günlük mail (gün boyunca açılan şikayet, kapanan şikayet, SLA dışı kalan).",
      "Yedekleme için 'kalite_yardimcisi' alt-rolü tanımla — CGO yokken Yavuz veya Ece şikayetleri kapatabilsin.",
      "Pilot sonrası ders: CGO için kalite ve büyüme görevlerini ayrı kişiye dağıtmak gerekebilir. Şu an konsolidasyon kabul, ama yorgunluk takibi yapılmalı.",
    ],
  },

  yatirimci_hq: {
    displayName: "Yatırımcı (HQ)",
    category: "yatirimci",
    scope: "Tüm şubeler + fabrika (sadece view)",
    shortPurpose: "Şirket geneline finansal ve operasyonel salt-okur erişim — yatırımcıya şeffaflık.",
    description:
      "Yatırımcı (HQ) rolü, holdingin veya yatırım ortağının şirket geneline müdahale yapmadan görünüm sağlamasıdır. Tüm finansal raporları, KPI'ları, satış trendlerini, müşteri memnuniyet skorlarını okur. CRUD yetkisi yok, lock'lara dokunamaz, kullanıcı yönetimi yapamaz. Genellikle haftalık/aylık dashboard incelemesi için kullanılır.",
    currentStatus:
      "1 aktif yatırımcı_hq: Mehmet Özkan. Pilot kapsamında pasif kullanıcı — beklenen aktivite haftada 1-2 login.",
    responsibilities: [
      "Aylık finansal rapor inceleme",
      "Şube karşılaştırması (sales, satışlar)",
      "Marka KPI'ları (NPS, müşteri memnuniyeti, geri dönüş oranı)",
      "Yatırım ROI takibi (ownership_type=franchise + sales)",
      "Stratejik kararlar için bilgi toplama (CEO ile toplantı öncesi)",
      "Pilot performansı izleme (5 May 2026 sonrası ilk veri seti)",
    ],
    dailyFlow: null,
    eventDriven: [
      "Aylık → finansal rapor mail",
      "Çeyreklik → büyüme/karlılık inceleme",
      "Yıllık → şube karşılaştırma raporu",
    ],
    perspectives: {
      operasyonel:
        "Operasyonda yok. Sadece sonuçları okur. Pilot Day-1'de Mehmet'ten beklenti yok.",
      stratejik:
        "Yatırım kararları için kritik. 'Hangi şubeye yeni ekipman?' veya 'hangi pazara genişleme?' kararları için bu rol KPI sağlar. Pilot başarısı yatırımcıya hangi metriklerle anlatılacak — bunu CGO/CEO planlamalı.",
      veri:
        "Tüm reporting layer'a view erişimi. Ama gerçek datayla nasıl etkileşeceği belirsiz — login sıklığı düşükse hazır rapor ekran ihtiyacı yüksek (PDF export etc).",
      ik:
        "Tek yatırımcı_hq hesabı. Yedeklemeye ihtiyaç yok (rol bireysel).",
      risk:
        "Veri okumak isteyen tek kişi sürekli login etmeyince, kritik konuları kaçırabilir. Mail/PDF brifing eksik.",
    },
    hierarchy: { reportsTo: "—", manages: "—" },
    pilotNote:
      "Pilot Day-1 Mehmet'ten beklenen aktivite minimum (yatırımcı). Pilot sonu rapor sunumu için CGO/CEO hazırlık yapacak.",
    knownIssues: [
      "Yatırımcıya özel rapor ekranı yok (genel dashboard ile aynı)",
      "Aylık otomatik mail/PDF brifing yok",
      "Yatırımcı login sıklığı düşük olduğundan kritik anlık güncellemeleri kaçırabilir",
    ],
    recommendations: [
      "Yatırımcı için 'Aylık Yönetim Brifingi' otomatik PDF üretimi (her ayın 1'inde mail). Mr. Dobody'ye ek skill: investor_monthly_report.",
      "Yatırımcı dashboard'una 'Yıllık karşılaştırma' widget'ı ekle (sales, customer count, NPS, growth%).",
      "Pilot sonrası 'investor scorecard' tasarla — 5 ana KPI, kırmızı/sarı/yeşil renkli.",
      "Mehmet'in login takibi: 30 gün login etmezse Aslan'a uyarı (audit_logs üzerinden cron).",
    ],
  },

  // ============================================================
  // HQ OPERASYON
  // ============================================================
  coach: {
    displayName: "Coach (Franchise Koçu)",
    category: "hq_operasyon",
    scope: "Tüm şubeler (branchId=null, executive)",
    shortPurpose: "Şube müdürlerini sahada koçluk yapan, performans gelişimini yöneten gezici lider.",
    description:
      "Coach rolü, sahaya çıkıp şube müdürleriyle birebir çalışan kişidir. PDKS, vardiya, izin, eğitim, görev verisini görür ve sahadaki uygulamayı denetler. Personel gelişimi (leadership coaching), şube standartlarına uyum, yeni müdür onboarding'i ana sorumluluklarıdır. Pilot Day-1'de en kritik HQ rollerinden biri — şubeyle HQ arasındaki canlı bağ.",
    currentStatus:
      "3 aktif coach: Yavuz (kıdemli, branchId=null), Ece (25 Apr 2026 trainer→coach geçti), Test Coach. Pilot Day-1'de Yavuz pilot 4 şube odaklı, Ece destek.",
    responsibilities: [
      "Şube ziyareti planlama ve gerçekleştirme (haftalık tur)",
      "Müdür/supervisor performans değerlendirme",
      "PDKS+vardiya anomalileri inceleme (geç gelme, devamsızlık)",
      "Yeni müdür onboarding (3 gün eğitim + ziyaret)",
      "İzin onayı (mudur'un altındaki personel)",
      "Görev atama ve takibi (sahada eksik olan işler)",
      "Eğitim eksikliği tespit edip trainer'a yönlendirme",
      "Şube standartlarına uyum denetimi (checklist üzerinden)",
    ],
    dailyFlow: {
      sabah:
        "Geçen gün PDKS özetini incele (geç gelen, gelmeyen). 2+ geç olan personeli müdüre uyar (Mr. Dobody late_arrival_tracker skill).",
      oglen:
        "Planlanmış şube ziyareti. Müdürle 1-1 görüşme, checklist denetimi, personel rotasyonu önerisi.",
      aksam:
        "Ziyaret notlarını sisteme gir (görev olarak). Yarın için ziyaret planı. CGO'ya günlük özet.",
    },
    perspectives: {
      operasyonel:
        "Coach sahada en güvenilen ses. Müdürler problemi önce coach'a anlatır. Pilot Day-1'de Yavuz pilot 2 aktif şubeye günde 1 ziyaret yapacak (Işıklar, Lara). 16 hazırlık şubesi için onboarding wizard takibi.",
      stratejik:
        "Coach gözlemleri = stratejik karar girdisi. 'Hangi şube müdürü liderlik gösteriyor', 'hangi pozisyon eksik' cevapları coach'tan gelir. CGO'ya raporlanır, CEO kararına dönüşür.",
      veri:
        "Şube genelinde tüm operasyonel veriye view. Ama coach raporlarını sisteme yapısal girmek için ayrı modül yok — şu an görev/checklist üzerinden dolaylı yapıyor.",
      ik:
        "3 coach var ama hierarchical değil — yatay. Yavuz kıdemli ama Ece'ye yetki devri yok. Pilot sonrası 'kıdemli coach' rolü düşünülebilir.",
      risk:
        "Coach yokken (tatil, hastalık) müdürler iletişim koparılır. Yedekleme: Yavuz tatildeyse Ece, Ece tatildeyse CGO Utku. Bu rotasyon yazılı değil — informal.",
    },
    hierarchy: {
      reportsTo: "CGO (Utku)",
      manages: "mudur, supervisor (sahada koçluk; resmi yönetim hattı yok)",
    },
    pilotNote:
      "Pilot Day-1 Yavuz tüm pilot şubelere haftalık 2 ziyaret. Ece destek (özellikle 16 hazırlık şubesi onboarding wizard takibi). Eğitim açısından da yardım eder (eski trainer rolü).",
    knownIssues: [
      "Coach 'ziyaret raporu' modülü yok — notlar görev/yorum şeklinde dağınık",
      "Coach için şube karşılaştırma 'performance heatmap' yok",
      "Yedekleme planı yazılı değil",
    ],
    recommendations: [
      "Yeni modül: 'Coach Ziyaret Defteri' (/coach/ziyaret) — branch + tarih + checklist + serbest not + foto. Ziyaret verisi = stratejik analitik girdisi.",
      "Coach dashboard'una 'şube heatmap' widget ekle: PDKS, görev tamamlama, müşteri puanı, satış %. Renk kodu (yeşil/sarı/kırmızı). Zayıf şubeyi anında görür.",
      "'Coach Plan' modülü: önümüzdeki 4 hafta için ziyaret takvimi. CGO görür, çakışma engellenir.",
      "Pilot Day-1'de coach için günlük 18:00 mail brifing: bugün ziyaret edilen şube, açık görev, yarınki plan.",
      "Yedekleme: 'Coach yokken delegasyon' kuralı — branch_kiosk_settings'e backup_coach_id ekle (örn. Yavuz tatil → Ece otomatik bildirimleri alır).",
    ],
  },

  trainer: {
    displayName: "Trainer (Eğitim Sorumlusu)",
    category: "hq_operasyon",
    scope: "Tüm şubeler (eğitim odaklı)",
    shortPurpose: "Akademi modülünün içerik sahibi; eğitim modülleri, quiz'ler ve sertifika yönetiminden sorumlu.",
    description:
      "Trainer rolü, Academy modülünün öğretim tarafıdır. Yeni eğitim modülü oluşturma, quiz yazma, öğrenme yolu (learning path) tasarlama, sertifika tanımlama görevlerini yapar. 25 Apr 2026'dan itibaren Ece trainer→coach geçti, şu an aktif trainer hesabı yok. Bu durum pilot öncesi netleştirilmeli — eğitim içerik sahipliği boş.",
    currentStatus:
      "1 trainer hesabı (Test Trainer) DB'de aktif görünüyor ama operasyonel sahibi yok (Ece coach'a geçti, henüz yenisi atanmadı). KRİTİK BOŞLUK.",
    responsibilities: [
      "Yeni eğitim modülü oluşturma (Academy)",
      "Quiz yazma ve değerlendirme",
      "Öğrenme yolu (learning_paths) tasarlama (rol bazlı)",
      "Sertifika ve rozet (badges) tanımlama",
      "Eğitim ilerleme takibi (per kullanıcı)",
      "Yeni başlayan personele onboarding eğitimi",
      "Reçete eğitimi (recete_gm ile koordinasyon)",
      "Pilot öncesi 'kullanıcı eğitimi' içerik üretimi",
    ],
    dailyFlow: {
      sabah:
        "Yeni quiz/eğitim onayı. Geçen gün eğitim alan kullanıcı sayısını incele.",
      oglen:
        "Modül geliştirme (içerik yazma, video gömme, AI tutor prompt'u ayarlama).",
      aksam:
        "Eğitim raporu (kim ne kadar tamamladı). Yarınki yeni modül planlama.",
    },
    perspectives: {
      operasyonel:
        "Trainer sahada görünmez ama her yeni başlayan kullanıcı trainer'ın ürettiği içeriği yapar. Pilot Day-1 öncesi 'sistemi nasıl kullanırım' eğitimi şart — şu an boş.",
      stratejik:
        "Eğitim = operasyonel kalitenin temeli. Trainer eksikliği = pilot Day-1'de personel sistemi yanlış kullanır. R-6 öncesi en geç tayini yapılmalı.",
      veri:
        "academy_progress, quiz_attempts, certificates verisine erişimi var. Hangi rolün eğitimi eksik anında görür.",
      ik:
        "Şu an trainer kadrosu boş. Acil tayin: Ece (eski trainer) coach + trainer çift rol mü, yoksa yeni biri mi? Karar Aslan'da.",
      risk:
        "Trainer yokken yeni eğitim modülü çıkmaz, mevcut quiz'ler güncellenmez, sertifikasyon donar. Pilot Day-1'de yeni kullanıcı brief'i yapılamaz.",
    },
    hierarchy: { reportsTo: "CGO (Utku) veya CEO", manages: "Academy içeriği" },
    pilotNote:
      "KRİTİK: Pilot Day-1'e kalan 9 gün içinde trainer ya tayin edilmeli ya da eğitim sahipliği coach'a (Ece) resmi olarak devredilmeli. Şu an boşluk.",
    knownIssues: [
      "Aktif operasyonel trainer yok (Ece coach'a geçti, devir tamamlanmadı)",
      "Pilot kullanıcı eğitim seti hazır değil (sistemi nasıl kullanırım modülü)",
      "Trainer rolünün CRUD yetkisi DB'de tanımlı ama operasyon ve trainer rolü çakışması belirsiz",
    ],
    recommendations: [
      "ACİL (5 günde): Aslan ile karar — Ece çift rol (coach+trainer) olsun mu, yoksa yeni trainer alımı mı? Kararı yaz, atamayı yap.",
      "Pilot kullanıcı eğitim seti hazırla (10 modül x 5 dakika): 'Sistemi nasıl kullanırım', 'PDKS giriş', 'Vardiya görme', 'Görev tamamlama', 'Şikayet yazma', 'Akademi'. Pilot 5 May öncesi yayınla.",
      "Pilot öncesi her role 'rolünüze özel 5 dakikalık eğitim videosu' (Aslan ses kaydı ile bile olur). Mr. Dobody bu videoyu ilk login'de zorunlu açar.",
      "Trainer + recete_gm arasında reçete eğitimi koordinasyonu: yeni reçete çıktığında otomatik eğitim modülü oluşturma akışı (Academy + Reçete entegrasyonu).",
      "Sertifika otomasyonu: belirli quiz'leri geçen kullanıcıya otomatik 'Pilot Day-1 Hazır' rozeti — trainer manual işe gerek kalmaz.",
    ],
  },

  muhasebe_ik: {
    displayName: "Muhasebe & İK",
    category: "hq_operasyon",
    scope: "Tüm şubeler + fabrika (finans + İK)",
    shortPurpose: "Bordro, payroll, PDKS Excel import, izin onayı ve İK belgelerinin sahibi.",
    description:
      "Muhasebe & İK rolü, çalışanın işe alımdan ayrılışa kadar tüm İK süreçlerini yönetir: belgeler, sözleşmeler, performans dosyası, disiplin, payroll. PDKS Excel import sürecinin (5-table system) sahibidir — her ay sonunda yoklama veriler bu rol tarafından sisteme aktarılır. Aynı zamanda muhasebe modülünün de yetkilisi: gelir-gider, fatura, masraf onayı.",
    currentStatus:
      "2 aktif: Mahmut İK (Mahmut, kıdemli; PDKS Excel sahibi, payroll yöneticisi), Test Muhasebe.",
    responsibilities: [
      "PDKS Excel import (her ay sonu, 5-table system)",
      "Bordro hesaplama ve payroll çalıştırma",
      "İzin talebi onayı (full yetki)",
      "İK belgeleri (sözleşme, kimlik, sağlık raporu)",
      "Disiplin tutanakları takibi",
      "Yeni personel onboarding (form doldurma, kart açma)",
      "İşten çıkış işlemleri (deactivate, kıdem, ihbar)",
      "Aylık finans raporu (lock öncesi temizlik)",
    ],
    dailyFlow: {
      sabah:
        "Bekleyen izin talepleri. Personel hareketleri (yeni başlayan, ayrılan). Yarın doğum günü olanlar (otomatik bildirim).",
      oglen:
        "Belge takibi (yaklaşan kimlik fotokopisi yenileme). Payroll hazırlık.",
      aksam:
        "Müdürlerden gelen bordro soruları. Yarının izin onaylarına bakış.",
    },
    perspectives: {
      operasyonel:
        "Mahmut sistemin 'gizli kahramanı' — her ay PDKS Excel'i 22 şube için toplar, sisteme bind eder, payroll çalıştırır. Eksik olduğunda payroll donar.",
      stratejik:
        "İK verisi = ekip kalitesi göstergesi. Kıdem dağılımı, devir hızı, eğitim tamamlama oranı bu rolden çıkar. CEO'ya stratejik İK raporu hazırlar.",
      veri:
        "DB'nin İK + finans tablolarına full CRUD. PDKS, payroll, leaves, hr_documents, employee_disciplinary_actions tablolarının sahibi.",
      ik:
        "Tek operasyonel İK kişisi (Mahmut). Yedekleme yok. Mahmut tatildeyse PDKS bind olmaz, payroll gecikir. Pilot için kritik risk.",
      risk:
        "PDKS Excel import (5-table) hatalı yapılırsa devamsızlık yanlış hesaplanır → personele haksız kesinti → güven kaybı. Mahmut'un işine son derece bağımlı.",
    },
    hierarchy: { reportsTo: "CEO (Aslan)", manages: "Tüm personel İK süreçleri" },
    pilotNote:
      "Pilot Day-1'de Mahmut PDKS Excel'i ilk kez canlı veriyle bind edecek (Apr 2026 sonu). Hata olursa 22 şube etkilenir.",
    knownIssues: [
      "PDKS Excel import wizard'ı UI olarak kompleks, eğitim gerektirir (5 tablo)",
      "Mahmut yedeklemesi yok",
      "Payroll runs için otomasyon eksik (manual tetik)",
    ],
    recommendations: [
      "PDKS Excel import için 'preview & validate' adımı ekle — kaç satır okundu, kaç eşleşti, kaç hatası var. Mahmut bind etmeden onaylar (yanlışı geri al şansı).",
      "Mahmut yedek için 'ik_yardimcisi' rolü tanımla (sadece izin onay + belge görme; payroll yok). Mahmut tatildeyse Aysel/başka biri izin onaylayabilsin.",
      "Aylık payroll otomatik trigger: ayın 25'i sabah 09:00'da 'Bordro çalıştırma için hazırsın' bildirimi. Mahmut tek tık ile run eder.",
      "İK için 'kritik tarihler' widget'ı: kim doğum günü, kim sözleşme yenileniyor, kim sağlık raporu süresi doluyor — proaktif takip.",
      "Devir hızı (turnover) raporu otomasyonu: ayda kaç kişi geldi, kaç kişi gitti, sebep dağılımı. CEO'ya gönder.",
    ],
  },

  satinalma: {
    displayName: "Satınalma",
    category: "hq_operasyon",
    scope: "Tüm şubeler + fabrika (tedarik)",
    shortPurpose: "Hammadde fiyat takibi, tedarikçi yönetimi, sipariş onayı ve maliyet kontrolü.",
    description:
      "Satınalma rolü, fabrika ve şubeler için hammadde tedarikinden sorumludur. Tedarikçi listesi, fiyat tarihçesi, sipariş geçmişi, sözleşmeler bu rolde toplanır. Reçete maliyetleri (recipe.unit_cost) doğrudan satınalma fiyatına bağlıdır — fiyat değişikliği reçete maliyetini etkiler, finansal raporlara yansır.",
    currentStatus:
      "1 aktif satınalma: Samet. Pilot Day-1'de tek nokta arıza riski yüksek.",
    responsibilities: [
      "Hammadde fiyat takibi (recipe ingredient unit_price)",
      "Tedarikçi yönetimi (suppliers tablosu)",
      "Şube siparişleri onayı (branch_orders)",
      "Yeni hammadde ekleme (ingredients tablosu)",
      "Aylık satınalma raporu (gider analizi)",
      "Tedarikçi kalite şikayetleri (gida_muhendisi ile koordinasyon)",
      "Stok kritik uyarıları (fabrika depo + recete_gm ile)",
      "Sezonluk fiyat düzenlemesi",
    ],
    dailyFlow: {
      sabah:
        "Bekleyen şube siparişleri. Stok kritik uyarılar (fabrika_depo bildirimi).",
      oglen:
        "Tedarikçi görüşmesi, fiyat güncellemesi (sisteme yeni fiyat girişi).",
      aksam:
        "Yarın için sipariş planlama. Aylık rapor güncel tutma.",
    },
    perspectives: {
      operasyonel:
        "Samet, fabrika ve şube arasında lojistik bağ. Tedarik gecikmesi = fabrika üretimi durur = şube reçete servisi yapamaz. Zincir hassas.",
      stratejik:
        "Tedarikçi pazarlığı = brüt kar marjını doğrudan etkiler. Stratejik tedarikçi seçimi (örn. tek kaynak vs çoklu kaynak) CEO ile birlikte yapılır.",
      veri:
        "ingredients, suppliers, branch_orders tablolarına CRUD. Maliyet tarihçesi tutulur — fiyat trend analizi yapılabilir.",
      ik:
        "Tek satınalma kişisi. Yedekleme yok. Samet yokken yeni hammadde girişi durur.",
      risk:
        "Yanlış fiyat girişi → reçete maliyeti yanlış → karlılık raporu hatalı. Tedarikçi bilgisi tek kişide → tedarikçi bilgisi kaybedilebilir.",
    },
    hierarchy: { reportsTo: "CEO (Aslan)", manages: "Tedarikçiler (dış)" },
    pilotNote:
      "Pilot Day-1'de Samet aktif. Şube siparişleri bu rol üzerinden akacak.",
    knownIssues: [
      "Fiyat değişikliği audit log'u zayıf (kim ne zaman ne kadar fiyat değiştirdi tek tabloda yok)",
      "Tedarikçi performans skoru yok",
      "Sipariş otomatik öneri yok (stok azaldığında manuel)",
    ],
    recommendations: [
      "Hammadde fiyat değişikliği için 4-eyes approval (yeni fiyat → CGO veya gida_muhendisi onayı). Fiyat manipülasyon riski azalır.",
      "Tedarikçi performans dashboard'u: zamanında teslim oranı, kalite şikayet sayısı, fiyat istikrarı. Pilot sonrası ders.",
      "Stok kritik seviye → otomatik sipariş önerisi (fabrika_depo'dan girdi alıp Samet'e draft sipariş hazırlar).",
      "Satınalma yedek için 'satinalma_yardimcisi' rolü (sipariş onayı yok ama yeni hammadde + tedarikçi ekleyebilir). Samet izinli olduğunda fabrika beklemez.",
      "Aylık 'tedarikçi sözleşme yenileme' takvimi (proaktif uyarı, son 30 gün).",
    ],
  },

  gida_muhendisi: {
    displayName: "Gıda Mühendisi",
    category: "hq_operasyon",
    scope: "Fabrika + ürün güvenliği (HQ scope)",
    shortPurpose: "Gıda güvenliği, alerjen kontrol, besin değeri onayı ve fabrika kalite süreçleri.",
    description:
      "Gıda mühendisi rolü, ürün güvenliği ve uyumluluk içindir. Yeni reçeteler için alerjen analizi, besin değeri hesaplama, gıda güvenliği checklist'leri (HACCP) bu rolde yapılır. Fabrika qc_records (kalite kayıtları) ve allergen takibinin sahibidir. Sema (gida_muhendisi) bu rolü taşır; aynı zamanda ikinci hesabı RGM (recete_gm) — duplicate ama bilinçli.",
    currentStatus:
      "1 aktif gida_muhendisi: Sema. Aynı kişi recete_gm rolünde 2. hesap (R-6 backlog #1).",
    responsibilities: [
      "Yeni reçete alerjen onayı (gluten, süt, yumurta, fındık vb.)",
      "Besin değeri hesaplama (kalori, protein, yağ, karbonhidrat)",
      "HACCP checklist sahipliği (factory_food_safety modülü)",
      "Tedarikçi gıda güvenliği belgeleri inceleme",
      "Şube gıda güvenliği şikayetlerini triage",
      "Fabrika qc_records denetimi",
      "Yıllık gıda güvenliği denetimi koordinasyonu",
      "Yeni ürün için 'safe to launch' onayı",
    ],
    dailyFlow: {
      sabah:
        "Bekleyen reçete onayı. Geçen gün qc_records anomalileri.",
      oglen:
        "Reçete alerjen analizi (recete_gm Sema ile koordinasyon — aynı kişi).",
      aksam:
        "HACCP checklist günlük rapor. Yarın için planlama.",
    },
    perspectives: {
      operasyonel:
        "Sema'nın iki hesabı pratik bir yol — gida_muhendisi yetkisiyle alerjen onayı, recete_gm yetkisiyle reçete CRUD. Ama iki kez login gerekiyor, akış kesintili.",
      stratejik:
        "Gıda güvenliği kanun zorunlu (T.C. Tarım ve Orman Bakanlığı). Hatalı alerjen etiketi = ciddi yasal risk. Bu rol şirket için uzun vadeli sigorta.",
      veri:
        "factory_food_safety, qc_records, recipe_allergens tablolarına CRUD. Kritik veri sahibi.",
      ik:
        "Sema'nın iki hesabı: pratik ama yorucu. Konsolidasyon (R-6) sonrası tek hesap = iki ayrı view = daha iyi.",
      risk:
        "Sema yokken alerjen onayı durur, yeni reçete launch edilemez. Yedekleme: trainer veya recete_gm yetkisi alabilir ama yetkili gıda mühendisi sertifikası ister.",
    },
    hierarchy: { reportsTo: "CGO (Utku)", manages: "Gıda güvenliği süreçleri" },
    pilotNote:
      "Pilot Day-1'de Sema aktif. R-6 sonrası iki hesap birleştirilecek.",
    knownIssues: [
      "Sema iki hesap (sema + RGM) — manual switch gerekli (R-6 backlog #1)",
      "Alerjen onay akışı UI'da net değil (recipe edit sayfasında satır içi)",
      "HACCP checklist mobil-friendly değil (tablet kullanırken sıkıntı)",
    ],
    recommendations: [
      "R-6'da Sema hesaplarını birleştir: tek user, iki rol → user_roles many-to-many tablosu (mevcut user_role single değer kısıtı).",
      "Alerjen onayı için ayrı 'Onay Kuyruğu' ekranı (/gida/onay-kuyrugu). Reçete edit ekranı dışında listeleyici görünüm.",
      "HACCP checklist tablet-optimize (büyük buton, iconlu giriş, foto yükleme).",
      "Yıllık gıda güvenliği denetimi takvimi otomasyonu: 60 gün önce uyarı, hazırlanma checklist'i.",
      "Yedek: 'gida_yardimcisi' (sertifikası olmayan kişi alerjen taslağı hazırlar, Sema onaylar). Sema iş yükü azalır.",
    ],
  },

  recete_gm: {
    displayName: "Reçete Genel Müdürü",
    category: "hq_operasyon",
    scope: "Fabrika + tüm şubeler (reçete master)",
    shortPurpose: "Tüm reçetelerin master sahibi; keyblend, lock, versiyon ve maliyet kontrolü.",
    description:
      "Recete_gm rolü, ürün reçetelerinin tek doğruluk kaynağıdır. Yeni reçete oluşturma, var olan reçeteyi düzenleme, sürüm kontrolü, lock yönetimi (recipe.editLocked), keyblend (gizli karışım reçeteleri) bu rolde toplanır. Maliyet hesabı (unit_cost) ve fabrika üretim emirleri buna bağlıdır.",
    currentStatus:
      "1 aktif recete_gm: Sema (RGM hesabı; gida_muhendisi ile aynı kişi, R-6 backlog #1).",
    responsibilities: [
      "Yeni reçete oluşturma (recipes tablo + ingredients many-to-many)",
      "Mevcut reçete versiyonlama (lock + edit history)",
      "Keyblend reçete sahipliği (gizli formüller, sadece recete_gm görür)",
      "Maliyet hesaplama ve raporlama (unit_cost calculation)",
      "Fabrika üretim emrine reçete ekleme",
      "Şube reçete servis görünürlüğü ayarlama (visibility flags)",
      "Sezonluk yeni ürün reçeteleri (marketing ile koordinasyon)",
      "Reçete eğitim materyali (trainer ile koordinasyon)",
    ],
    dailyFlow: {
      sabah:
        "Yeni reçete talepleri (sef veya marketing'ten). Lock'lu reçeteleri review.",
      oglen:
        "Reçete CRUD (yeni ekleme, fiyat güncelleme).",
      aksam:
        "Fabrika üretim emirleri için reçete onayı. Maliyet raporu güncelleme.",
    },
    perspectives: {
      operasyonel:
        "Recete_gm = reçete tanrısı. Tüm üretim ve servis akışı onun onayına bağlı. Lock kararı (admin bile aşamasın) ürün entegritesini korur.",
      stratejik:
        "Reçete = marka. Recete_gm değişiklikleri marka tutarlılığını etkiler. Stratejik kararlar (örn. 'kahve değiştirme') bu rolde başlar.",
      veri:
        "recipes, recipe_ingredients, recipe_allergens, recipe_versions tablolarına full CRUD. lock kontrolü.",
      ik:
        "Sema iki rol birden taşır (gida_muhendisi + recete_gm). Pratik ama yorucu, yedekleme yok.",
      risk:
        "Sema yokken yeni reçete giremez, fiyat güncellenmez, fabrika üretim emri çıkmaz. Tek nokta arıza, en yüksek risk rolü.",
    },
    hierarchy: { reportsTo: "CEO (Aslan)", manages: "Reçete katalogu" },
    pilotNote:
      "Pilot Day-1'de Sema (RGM) aktif. Reçete 16 (Cheesecake Frambuaz) test edilen örnek (lock pattern sınanmış).",
    knownIssues: [
      "Sema duplicate hesap (R-6 #1)",
      "Yedek recete_gm yok",
      "Reçete versiyon karşılaştırması UI yok (eski-yeni diff)",
      "Keyblend reçete farklı şubelerde nasıl saklanır net değil (görünürlük matrisi yok)",
    ],
    recommendations: [
      "ACİL: Yedek recete_gm planı — 'recete_gm_yardimcisi' rolü oluştur (lock yetkisi olmadan reçete CRUD yapabilir, lock + keyblend Sema'da kalır). sef veya gida_muhendisi yardımcı görev alabilir.",
      "Reçete versiyon diff UI: iki sürümü yan yana göster, neyin değiştiği vurgulansın. Trainer+sef için kritik.",
      "Keyblend görünürlük matrisi (visibility) — hangi şube/rol görür ekranı. Şu an sadece veritabanı flag, UI yok.",
      "Reçete maliyet trend grafiği: 30 günlük unit_cost değişimi (satınalma fiyat değişikliklerinin etkisi).",
      "Otomatik trainer entegrasyonu: yeni reçete → otomatik draft eğitim modülü oluşturulur (Sema açıklama yazar, trainer yayınlar).",
    ],
  },

  marketing: {
    displayName: "Pazarlama",
    category: "hq_operasyon",
    scope: "Tüm şubeler (kampanya + içerik)",
    shortPurpose: "Marka, sosyal medya, kampanya tasarımı ve müşteri sadakat programları.",
    description:
      "Marketing rolü, DOSPRESSO markasının sesi ve görsel kimliğidir. Sosyal medya içeriği, kampanya tasarımı (örn. happy hour), sezonluk grafik, lokasyon bazlı promosyonlar, müşteri sadakati programları (loyalty) bu rolde yönetilir. CRM modülü ile sıkı entegre — kampanya targeting CRM segmentlerine bağlanır.",
    currentStatus:
      "1 aktif marketing: Diana (Diana Demir). HQ dashboard /hq-dashboard/marketing kullanılıyor. Pilot Day-1'de aktif.",
    responsibilities: [
      "Sosyal medya içerik takvimi",
      "Kampanya tasarımı (Photoshop/Canva çıktıları)",
      "Yeni ürün lansman görseli (recete_gm ile)",
      "Müşteri sadakat programları (CRM segmentleri)",
      "Lokasyon bazlı promosyonlar (şube bazlı kampanya)",
      "QR feedback dashboard (şube müşteri puanı)",
      "Influencer/PR ilişkileri (CRM iletişim modülü)",
      "Aylık marka raporu (NPS, mention, kampanya ROI)",
    ],
    dailyFlow: {
      sabah:
        "Sosyal medya postu yayını. Müşteri yorumları monitor.",
      oglen:
        "Kampanya tasarımı (Canva/Photoshop). Yeni ürün görseli.",
      aksam:
        "Performans rapor: hangi post yüksek engagement. Yarınki içerik planlama.",
    },
    perspectives: {
      operasyonel:
        "Marketing günlük operasyona az müdahale eder ama kampanya çıktıları her şubeye akar. Diana yokken yeni içerik üretilmez.",
      stratejik:
        "Marka tonalitesi = uzun vadeli müşteri sadakati. Marketing kararları 6-12 ay etki eder. Stratejik karar CEO ile alınır, marketing uygular.",
      veri:
        "CRM segmentleri, customer_feedback, qr_feedback, social mention'ları görür. Veri-odaklı kampanya hedefleme yapabilir.",
      ik:
        "Tek marketing kişisi (Diana). Yedekleme yok. Yetiştirme: Diana sezonluk yoğunlukta freelancer destek alabilir mi?",
      risk:
        "Yanlış marka mesajı = sosyal medya krizi. Kampanya hatası = bütçe boşa harcanır. Diana tek karar verici, kontrolsüz risk.",
    },
    hierarchy: { reportsTo: "CGO (Utku)", manages: "Marka süreçleri (dış ajans dahil)" },
    pilotNote:
      "Pilot Day-1'de Diana aktif. Pilot başarısı medyaya nasıl yansıtılacak (basın bülteni, influencer ziyareti) Diana planlayacak.",
    knownIssues: [
      "Diana yedeklemesi yok",
      "Kampanya ROI ölçümü manuel (ATT/CTR vs gelir)",
      "QR feedback dashboard ile marketing aksiyon arasında iş akışı yok",
    ],
    recommendations: [
      "Kampanya ROI dashboard (yeni widget): kampanya → ek satış → ROI%. Diana ve CGO görür.",
      "QR feedback negatif → otomatik marketing aksiyon önerisi (örn. müşteriye indirim mesajı). CRM entegrasyonu derinleştir.",
      "Marketing yedek: 'pazarlama_yardimcisi' rolü (post yayını + tasarım indirme; kampanya onayı yok). Diana izinli olduğunda planlanmış post otomatik çıkar.",
      "İçerik takvimi 90 günlük şablon (sezonluk lansman + sürekli post karışımı). Diana planı CGO'ya gösterir, her ay revize.",
      "Pilot sonrası 'kampanya kütüphanesi' (knowledge_base modülünde) — başarılı kampanyalar arşivlenir, gelecekte tekrarlanabilir.",
    ],
  },

  destek: {
    displayName: "Destek (Help Desk)",
    category: "hq_operasyon",
    scope: "Tüm şubeler (ticket çözüm)",
    shortPurpose: "Şube ve personel sistem kullanım desteği, ticket çözüm ve eğitim sorularına yanıt.",
    description:
      "Destek rolü, sistemi kullanan tüm personele birinci destek hattıdır. 'Şifremi unuttum', 'PDKS giriş yapamıyorum', 'reçete görünmüyor' tarzı problemleri triage eder, çözer veya doğru role yönlendirir. Açık ticket modülü (open_tickets) bu rolün ana ekranıdır.",
    currentStatus:
      "1 aktif destek: Ayşe Kaya. Pilot Day-1'de tek nokta arıza riski; pilot sırasında ticket sayısının patlayacağı bekleniyor.",
    responsibilities: [
      "Ticket karşılama (open_tickets modülü)",
      "Tier-1 sorun çözümü (şifre reset, kullanım sorusu)",
      "Tier-2'ye eskalasyon (teknik → Murat, sistem → admin)",
      "FAQ ve knowledge_base güncelleme",
      "Eğitim sorularına yanıt (trainer ile koordinasyon)",
      "Pilot süresince intensive destek hattı",
      "Hata raporlarını Aslan'a iletme (bug triage)",
      "Ticket KPI raporu (çözüm süresi, satisfaction)",
    ],
    dailyFlow: {
      sabah:
        "Gece açılan ticketları incele. Acilleri çöz/eskalate et.",
      oglen:
        "Aktif ticketlar üzerinde çalışma. Şubelerle telefon/whatsapp iletişimi.",
      aksam:
        "Açık kalan ticketları yarına devret. SLA dışı kalanları rapor.",
    },
    perspectives: {
      operasyonel:
        "Pilot Day-1'de Ayşe en yoğun çalışacak kişilerden biri. Yeni kullanıcılar (270 hedef) sürekli soru soracak. Yetersiz destek = pilot başarısızlık riski.",
      stratejik:
        "Destek ticket'ları = ürün eksiklerinin hazinesi. 'En çok ne soruluyor' analizi bug-fix ve UX iyileştirme önceliklendirir.",
      veri:
        "tickets, ticket_messages, knowledge_base tablolarına CRUD. Geçmiş ticket arama önemli.",
      ik:
        "Tek destek kişisi. Pilot için kritik yetersizlik. Pilot 1. hafta için ek destek (Replit ekibi veya freelance) düşünülmeli.",
      risk:
        "Ayşe yetiştiremezse personel sistemi yanlış kullanır → veri kalitesi düşer → tüm raporlar şüpheli olur. Pilot başarısı için Ayşe'nin desteklenmesi şart.",
    },
    hierarchy: { reportsTo: "Teknik (Murat) ve CGO (Utku)", manages: "Tier-1 destek" },
    pilotNote:
      "Pilot 1. hafta destek hacmi 5-10x artacak. Ayşe için ek personel veya saat genişlemesi (08:00-22:00) planlanmalı.",
    knownIssues: [
      "Tek destek kişisi — yedekleme yok",
      "Knowledge base hala başlangıç seviyesinde",
      "Ticket otomatik routing yok (tüm ticket Ayşe'ye)",
    ],
    recommendations: [
      "Pilot için 7-14 gün ek destek desteği (Replit yardımı veya geçici personel). Ayşe burnout riski azalır.",
      "Knowledge base'i pilot öncesi doldur: en olası 50 soru (PDKS, vardiya, görev, izin, akademi) — Ayşe'nin iş yükü azalır.",
      "Ticket otomatik routing: kategori 'PDKS' → muhasebe_ik, kategori 'reçete' → recete_gm, kategori 'sistem' → teknik. Ayşe sadece tier-1 + triage.",
      "Pilot sırasında 'destek hattı' WhatsApp grubu — Ayşe + Mahmut + Murat + Aslan. Şubeler buradan ulaşır, sistemde ticket otomatik açılır.",
      "Ticket SLA: tier-1 4 saat, tier-2 8 saat, kritik 1 saat. Aşılırsa Aslan'a otomatik bildirim.",
    ],
  },

  teknik: {
    displayName: "Teknik (IT)",
    category: "hq_operasyon",
    scope: "Tüm sistem (IT altyapı)",
    shortPurpose: "IT altyapı, ekipman, ağ, kiosk donanımı ve teknik bakım sorumlusu.",
    description:
      "Teknik rolü, IT ve donanım tarafını yönetir: ağ bağlantısı, kiosk tabletler, kasa POS sistemleri, internet kesintileri, donanım arızası. Yazılım tarafında admin değildir ama hardware-software arasındaki bağlamayı kurar.",
    currentStatus:
      "1 aktif teknik: Murat Demir. Pilot Day-1'de tek kişi.",
    responsibilities: [
      "Şube ekipman bakım takibi (equipment_maintenance modülü)",
      "Ekipman arızalarını triage (equipment_faults)",
      "Kiosk tablet kurulumu ve bakımı",
      "POS-sistem entegrasyon",
      "İnternet/ağ sorunları çözümü",
      "Yeni ekipman alımı önerisi (satınalma ile)",
      "Pilot Day-1 öncesi tüm 22 şube ekipman kontrolü",
      "Yedekleme sistemleri (DB backup vb.)",
    ],
    dailyFlow: {
      sabah:
        "Ekipman arıza talepleri. Kritik arızaları öncelik sırasına koy.",
      oglen:
        "Şube ziyareti (planlanmış bakım). Tablet/POS güncellemesi.",
      aksam:
        "Aylık bakım raporu. Yarın için planlama.",
    },
    perspectives: {
      operasyonel:
        "Murat sahada ekipman çalışmasının garantörü. Bir şube tableti çalışmazsa kiosk login kapanır → personel PDKS giremez → çorap söker.",
      stratejik:
        "Ekipman ROI takibi (hangi makine ne kadar çalıştı, ne kadar arıza yaptı). Yenileme kararları Murat verisi ile alınır.",
      veri:
        "equipment, equipment_maintenance, equipment_faults tablolarına CRUD. Aylık bakım takvimi izleyici.",
      ik:
        "Tek teknik kişi. 22 şube + 1 fabrika = çok yüksek hareket. Yedekleme yok.",
      risk:
        "Murat yokken kritik ekipman arızası = günlerce bekleme. Pilot Day-1 risk.",
    },
    hierarchy: { reportsTo: "CGO (Utku)", manages: "Ekipman ve IT altyapı" },
    pilotNote:
      "Pilot Day-1 öncesi tüm 22 şube + fabrika ekipman kontrolü Murat tarafından yapılmalı. Hala 9 gün var.",
    knownIssues: [
      "Tek teknik kişi (Murat)",
      "Ekipman bakım takvimi proaktif değil (reaktif)",
      "Kritik arıza için SLA tanımı yok",
    ],
    recommendations: [
      "Pilot öncesi 22 şube 'sistem hazırlık' kontrol listesi (Murat) — tablet, POS, internet, kasa, kahve makinesi. Eksiklerin pilot öncesi tamamlanması.",
      "Ekipman bakım takvimi proaktif: aylık/haftalık şablonlar, otomatik görev oluşturma. Murat sadece onaylar.",
      "Kritik ekipman SLA: kahve makinesi arızası 2 saat, kasa 1 saat, internet 4 saat. Aşılırsa eskalasyon.",
      "Murat yedek için 'teknik_yardimcisi' rolü (sadece ticket alma + basit reset). Aysel (destek) çift rol alabilir.",
      "Pilot sonrası 'ekipman maliyet vs. kullanım' raporu (Murat + satınalma) — yenileme önceliklendirmesi.",
    ],
  },

  // ============================================================
  // FABRİKA
  // ============================================================
  fabrika_mudur: {
    displayName: "Fabrika Müdürü",
    category: "fabrika",
    scope: "Fabrika (#24) — şube görmez",
    shortPurpose: "Fabrikanın tüm üretim, kalite, sevkiyat ve personel akışını yöneten en üst yetkili.",
    description:
      "Fabrika müdürü, üretim merkezinin günlük operasyonel sahibidir. Üretim planı, kalite kontrol, sevkiyat hazırlığı, personel vardiyası, ekipman bakımı bu rolde toplanır. Şube tarafına müdahale etmez (kapsam fabrikadır), ama recete_gm ve satınalma ile dirsek temasında çalışır.",
    currentStatus:
      "1 aktif fabrika_mudur: Eren. 25 Apr 2026'dan itibaren branchId atandı (#24). 26 Apr 2026 dashboard tune edildi: 10 widget, default_open=5 (factory_production, todays_tasks, qc_stats, pending_shipments, equipment_faults).",
    responsibilities: [
      "Günlük üretim planı çalıştırma (factory_production modülü)",
      "Kalite kontrol gözlem (qc_stats — gida_muhendisi ile)",
      "Sevkiyat hazırlığı (pending_shipments — şubelere)",
      "Fabrika personel vardiya yönetimi",
      "Ekipman arıza triage (equipment_faults)",
      "Stok seviye takibi (recete_gm ile)",
      "Aylık fabrika performans raporu",
      "Üretim sefi (uretim_sefi) ile günlük plan koordinasyonu",
    ],
    dailyFlow: {
      sabah:
        "Vardiya kontrol (kim geldi). Üretim planını başlat. Acil sevkiyat varsa öncelik ver.",
      oglen:
        "Üretim hattı gözetim. QC anomali varsa müdahale. Şubelerden sipariş kabul.",
      aksam:
        "Üretim raporu kapanış. Yarın için stok hazırlığı. Vardiya geçişi.",
    },
    perspectives: {
      operasyonel:
        "Eren tek fabrika operasyon yöneticisi. Pilot Day-1'de şubeler fabrika sevkiyatına bağımlı — fabrika çalışmazsa şube ürün servisi yapamaz.",
      stratejik:
        "Fabrika kapasitesi = şirket büyüme tavanı. Eren'in raporu CEO'ya yeni fabrika ihtiyacını sinyalleyecektir.",
      veri:
        "Fabrika scope tüm tablo ve KPI'lara erişim. Şube verisi görünmez (kasıtlı).",
      ik:
        "Tek fabrika müdürü. Yedek için ürün şefi (uretim_sefi) ön plan ama yetki devri net değil.",
      risk:
        "Eren yokken üretim duraklayabilir. Fabrika ekibi ek talimat almadan ne yapacağı belirsiz.",
    },
    hierarchy: { reportsTo: "CGO (Utku) ve CEO", manages: "uretim_sefi, sef, fabrika_operator, fabrika_depo" },
    pilotNote:
      "Pilot Day-1'de Eren aktif. Dashboard tune yapıldı. Fabrika 4 pilot şube + tüm 22 şubeye sevkiyat hazırlayacak (üretim seviyesi yükselecek).",
    knownIssues: [
      "Yedek fabrika müdürü yok (uretim_sefi geçici devralabilir ama tam yetki yok)",
      "Sevkiyat-şube bağı UI'da net değil (hangi şubeye ne gönderiliyor)",
      "Fabrika personel SLA tanımı yok (örn. Eren cevaplama süresi)",
    ],
    recommendations: [
      "Pilot Day-1 öncesi yedek fabrika müdür planı: Eren tatildeyse uretim_sefi'ye 'acting fabrika_mudur' yetkisi otomatik aktif (admin onaylı, geçici).",
      "Sevkiyat→şube bağı UI: fabrika dashboard'unda 'bugünün sevkiyatları' tablosu (şube + ürün + paket adedi). Şube müdürü ne bekleyeceğini bilir.",
      "Fabrika SLA: sevkiyat geç gelir → şube müdürüne otomatik bildirim + Eren'e uyarı.",
      "Pilot sonrası 'fabrika kapasite kullanımı' raporu (planlanan vs. gerçek üretim).",
      "Fabrika personel motivasyonu: uretim_sefi+sef+operatör birlikte 'haftanın ekibi' rozeti (Academy badges).",
    ],
  },

  uretim_sefi: {
    displayName: "Üretim Şefi",
    category: "fabrika",
    scope: "Fabrika (#24) — üretim planlama",
    shortPurpose: "Günlük üretim planının uygulayıcısı; reçeteleri üretim emirlerine dönüştürür.",
    description:
      "Uretim_sefi rolü, fabrika müdürünün operasyonel kollektivedir. Reçete listesinden günlük üretim emirleri çıkarır (production batches), iş emirlerini operatörlere dağıtır, üretim akışını saatlik takip eder. Fabrika ekibinin saha komutanıdır.",
    currentStatus:
      "1 aktif uretim_sefi: Ümit Usta (umit hesabı; ⚠️ duplicate Umit ile çakışıyor — R-6 #4).",
    responsibilities: [
      "Günlük üretim emri oluşturma (production_batches)",
      "Operatörlere iş emri dağıtımı",
      "Saat saat üretim takibi",
      "Lot tracking (parti numarası kayıtları)",
      "İstasyon benchmark'ları (station benchmarks)",
      "Üretim hataları triage (qc geri besleme)",
      "Vardiya geçiş raporu",
      "Fabrika müdürüne günlük özet",
    ],
    dailyFlow: {
      sabah:
        "Vardiya başlangıç. Bugünkü üretim emirleri hazırla (recete_gm planına göre). Operatörlere brief.",
      oglen:
        "Üretim hattı denetim. Anomali varsa hızlı müdahale.",
      aksam:
        "Vardiya kapanış. Üretim raporu. Yarın için hazırlık.",
    },
    perspectives: {
      operasyonel:
        "Ümit Usta'nın saha komutu = pilot başarısının operasyonel temeli. Pilot Day-1'de fabrika'da en kritik kişi.",
      stratejik:
        "Üretim verimliliği = brüt kar marjı. Ümit'in raporları kapasite + verimlilik için stratejik.",
      veri:
        "production_batches, station_benchmarks, lot_tracking tablolarına CRUD. Operasyonel veri sahibi.",
      ik:
        "Ümit duplicate hesap (Umit + umit). Yedekleme: sef veya başka kıdemli operatör.",
      risk:
        "Ümit yokken üretim emri çıkmaz. Yedekleme planı net değil.",
    },
    hierarchy: { reportsTo: "fabrika_mudur (Eren)", manages: "fabrika_operator, sef" },
    pilotNote:
      "Pilot Day-1 Ümit aktif. Duplicate hesap (Umit) sef rolünde — manual switch gereksiz görünüyor (R-6 #4 doğrula).",
    knownIssues: [
      "Ümit duplicate (Umit/sef + umit/uretim_sefi) — R-6 #4",
      "Üretim emri otomatik oluşturma yok (manual)",
      "Vardiya geçiş raporu serbest format (yapılandırılmamış)",
    ],
    recommendations: [
      "R-6: Ümit duplicate çözümü — Aslan ile fabrikada doğrulama. Tek hesap, çift rol veya tek kalan rol.",
      "Üretim emri otomatik draft: recete_gm sevk planı → uretim_sefi onaylar (manuel kalmaz).",
      "Vardiya geçiş raporu yapılandırılmış formu (tamamlandı, kalan, problem, ihtiyaç).",
      "Ümit yedek için 'uretim_yardimcisi' rolü.",
      "Lot tracking için QR kod entegrasyonu (parti numarası tablet ile okutulur, manuel yazıma gerek kalmaz).",
    ],
  },

  sef: {
    displayName: "Pasta Şefi",
    category: "fabrika",
    scope: "Fabrika (#24) — sınırlı kategori reçete",
    shortPurpose: "Pasta/tatlı kategorisi reçete uzmanı, sınırlı reçete CRUD yetkili.",
    description:
      "Sef rolü, fabrika içindeki uzman pozisyonudur — özellikle pasta/tatlı kategorisinde reçete CRUD yetkisi vardır (RECIPE_EDIT_ROLES). Recete_gm'in altında, ama tam yetki almaz: lock'ları aşamaz, yeni kategori açamaz, keyblend görmez. Test reçetesi: Cheesecake Frambuaz (id=16).",
    currentStatus:
      "1 aktif sef: Ümit Usta (Umit hesabı; uretim_sefi ile duplicate — R-6 #4).",
    responsibilities: [
      "Pasta/tatlı kategorisi reçete editi",
      "Yeni pasta reçetesi öneri (recete_gm onayı sonrası)",
      "Üretim sırasında reçete uygulama denetimi",
      "Pasta kalite kontrolü (gida_muhendisi destek)",
      "Pasta üretim çıktı miktarı takibi",
      "Yeni operatör pasta eğitimi (trainer destek)",
    ],
    dailyFlow: {
      sabah:
        "Pasta üretim planı. Hammadde stok kontrolü.",
      oglen:
        "Pasta üretim sürecinde aktif rol. QC geri bildirim.",
      aksam:
        "Pasta üretim raporu. Yarınki plan.",
    },
    perspectives: {
      operasyonel:
        "Sef alan uzmanı. Pasta kategorisinde recete_gm vekili. Pasta üretiminin kalite ölçütünü tutar.",
      stratejik:
        "Pasta kategorisi büyüme alanı (yeni ürün lansmanı). Sef rolü ekspansiyon için kritik.",
      veri:
        "Recete CRUD ama sınırlı kategori (RECIPE_EDIT_ROLES kısıtı). lock yok.",
      ik:
        "Sef + uretim_sefi duplicate. Aynı kişi iki rol birden taşır.",
      risk:
        "Pasta eksperliği tek kişide. Yedekleme yok.",
    },
    hierarchy: { reportsTo: "uretim_sefi → fabrika_mudur", manages: "Pasta operatörleri" },
    pilotNote:
      "Pilot Day-1 Ümit aktif. R-6 #4 duplicate çözümü sonrası rol netleşir.",
    knownIssues: [
      "Sef + uretim_sefi duplicate (#4)",
      "RECIPE_EDIT_ROLES kategori kontrolü kod düzeyinde (UI'da net görünmüyor)",
      "Sef için ayrı dashboard yok (genel fabrika dashboard kullanır)",
    ],
    recommendations: [
      "R-6 sonrası tek rol kalır (sef veya uretim_sefi). Pasta ekspersizi için sef tercih edilebilir.",
      "RECIPE_EDIT_ROLES UI'da görünür: sef login olduğunda 'Pasta kategorisi' filtresi otomatik açık, başka kategoriyi gri görsün.",
      "Yedek için 'pasta_yardimcisi' (sadece view + öneri; CRUD yok). Yeni operatör eğitiminde kullanılabilir.",
      "Pasta üretim performans dashboard (sef'e özel widget): günlük üretim adedi, hata oranı, fire %.",
      "Pasta yeni ürün önerisi akışı: sef öneri yazar → recete_gm onaylar → trainer eğitim oluşturur.",
    ],
  },

  fabrika_operator: {
    displayName: "Fabrika Operatör",
    category: "fabrika",
    scope: "Fabrika (#24) — üretim hattı",
    shortPurpose: "Üretim hattında reçete uygulayıcı, kiosk üzerinden iş emri alan operasyon personeli.",
    description:
      "Fabrika operatörü, üretim hattının ana çalışanıdır. Kiosk tabletten iş emri okur, reçeteyi uygular, çıktı miktarını sisteme girer. CRUD yetkisi yok denecek kadar az; sistemi 'tüketici' olarak kullanır.",
    currentStatus:
      "6 aktif fabrika_operator. Pilot Day-1'de 6 operatör aktif.",
    responsibilities: [
      "Kiosk login (PIN ile)",
      "İş emrini okuma ve uygulama",
      "Reçete adımlarını sırasıyla yapma",
      "Çıktı miktarını sisteme girme (production_records)",
      "Anomali (hatalı parti, ekipman uyarısı) bildirme",
      "Vardiya başı/sonu PDKS",
      "Akademi modülü tamamlama (eğitim sürekli)",
      "Hijyen ve gıda güvenliği checklist'i",
    ],
    dailyFlow: {
      sabah:
        "Kiosk login + PDKS giriş. İş emri kontrol.",
      oglen:
        "Üretim hattında çalışma. Reçete uygulaması.",
      aksam:
        "Çıktı kayıt. Vardiya kapanış. PDKS çıkış.",
    },
    perspectives: {
      operasyonel:
        "6 operatör = fabrika kapasitesinin tamamı. Birinin yokluğu kapasiteyi %15 azaltır. Hızlı yedekleme zor.",
      stratejik:
        "Operatör performansı = üretim verimliliği. Worker scoring sistemi var (factory worker_scoring).",
      veri:
        "Sadece kendi PDKS, vardiya, eğitim verisini görür. Kiosk-bound interface.",
      ik:
        "6 kişi rotasyon yönetilir. Yetiştirme: yeni operatör 2 hafta eğitim + sef gözetiminde.",
      risk:
        "Kiosk arızası → operatör iş emri okuyamaz → üretim durur. Backup mekanizma (kağıt iş emri) eksik.",
    },
    hierarchy: { reportsTo: "uretim_sefi (Ümit)", manages: "—" },
    pilotNote:
      "Pilot Day-1'de 6 operatör aktif. Kiosk eğitimleri tamamlanmalı.",
    knownIssues: [
      "Kiosk arızası fallback yok (kağıt iş emri akışı yok)",
      "Yeni operatör eğitim modülü hazır değil",
      "Worker scoring UI operatöre kapalı (sadece müdür görür)",
    ],
    recommendations: [
      "Kiosk fallback: kiosk arızalı ise tablet/telefon ile QR taranabilir alternatif iş emri (geçici).",
      "Operatör eğitim modülü pilot öncesi yayımla (Akademi: 'Fabrika Hattı Operatör Onboarding' 5 modül x 5 dakika).",
      "Operatör motivasyon: worker scoring ekranını operatöre aç (kendi puanını görür, hedef belirleyebilir).",
      "Vardiya geçiş kontrol listesi (kiosk üzerinden) — vardiya bitiminde 'tüm görevler tamam mı' kontrol.",
      "Operatör için 'haftanın yıldızı' rozeti (Academy badges) — worker scoring'e bağlı otomatik.",
    ],
  },

  fabrika_depo: {
    displayName: "Fabrika Depocu",
    category: "fabrika",
    scope: "Fabrika (#24) — depo yönetimi",
    shortPurpose: "Hammadde girişi, stok takibi, sevkiyat paketleme ve şubeye gönderim sorumlusu.",
    description:
      "Fabrika_depo rolü, fabrikanın depo operasyonlarını yönetir. Tedarikçiden hammadde girişi (stock_movements), sevkiyat paketleme, şubeye gönderim, stok seviyesi takibi bu rolün ana işidir. Satınalma+recete_gm+fabrika_mudur ile sıkı koordinasyon.",
    currentStatus:
      "1 aktif fabrika_depo: Test Depocu. R-6 backlog #5: pilot öncesi is_active=false yapılmalı (test hesabı).",
    responsibilities: [
      "Hammadde girişi (tedarikçiden)",
      "Stok seviyesi takibi (real-time)",
      "Şubeye sevkiyat paketleme",
      "Sevkiyat numarası verme (lot tracking)",
      "Stok kritik uyarıları (satınalma'ya tetik)",
      "Aylık stok sayımı (envanter)",
      "Hammadde fire kayıtları",
      "Tedarikçi teslim alındı belgeleri",
    ],
    dailyFlow: {
      sabah:
        "Bugün gelen hammadde teslim alma. Sayım, kalite kontrol.",
      oglen:
        "Şubeye sevkiyat paketleme. Stok seviye güncelleme.",
      aksam:
        "Günlük stok raporu. Kritik seviyede olanları satınalma'ya bildir.",
    },
    perspectives: {
      operasyonel:
        "Depocu, fabrika'nın 'kapı' rolüdür. Hammadde gelmezse üretim olmaz, sevkiyat çıkmazsa şube ürün servis edemez.",
      stratejik:
        "Stok yönetimi = işletme sermayesi. Fazla stok=para bağlama, az stok=satış kaybı. Depocu raporu nakit akışına etki eder.",
      veri:
        "stock_movements, inventory_levels, shipments tablolarına CRUD.",
      ik:
        "Şu an sadece test depocu. Pilot için gerçek bir kişi atanmalı (R-6 #5 öncesi).",
      risk:
        "Test hesabı yerine gerçek depocu yoksa pilot Day-1'de fabrika depo işi belirsiz kalır. ACİL.",
    },
    hierarchy: { reportsTo: "fabrika_mudur (Eren)", manages: "—" },
    pilotNote:
      "KRİTİK: Pilot Day-1'e 9 gün kala depocu pozisyonu boş. Aslan ile karar verilmeli (gerçek personel atanması veya Eren'in geçici çift rolü).",
    knownIssues: [
      "Test depocu hesabı aktif (R-6 #5)",
      "Gerçek depocu pozisyonu boş",
      "Stok sayım workflow yok (manuel)",
    ],
    recommendations: [
      "ACİL (5 gün): Pilot Day-1 öncesi depocu pozisyonunu doldur. Aslan kararı.",
      "Pilot süresince Eren çift rol (fabrika_mudur + fabrika_depo) alabilir, ama yorgunluk riski.",
      "Stok sayım modülü: aylık otomatik sayım takvimi, mobil tablet ile kategori bazlı sayım.",
      "Kritik stok seviye uyarısı: dinamik (geçmiş kullanım hızına göre) yerine statik eşik (henüz yok).",
      "Sevkiyat takip: şube müdürü 'sevkiyat geldi mi' onaylar, depocu performansı ölçülür.",
    ],
  },

  // ============================================================
  // ŞUBE OPERASYON
  // ============================================================
  mudur: {
    displayName: "Şube Müdürü",
    category: "sube_operasyon",
    scope: "Tek şube (kendi şubesi)",
    shortPurpose: "Şubenin operasyonel ve insan kaynakları sorumlusu, P&L hesabını yöneten saha lideri.",
    description:
      "Şube müdürü, kendi şubesinin tam operasyonel sahibidir. Personel vardiyası, izin onayı, müşteri şikayetleri, şube siparişleri (fabrikadan), ekipman bakımı, günlük satış, yerel kampanyalar bu rolde. Şube P&L'sinin sorumlusu — coach ve CGO'ya rapor verir.",
    currentStatus:
      "37 aktif mudur (22 şube + ek hesaplar). Pilot Day-1'de aktif olan: Erdem Yıldız (Işıklar), Lara Müdür (Antalya Lara — generic isim, R-6 #2). 16 hazırlık şubesi mudur'ları onboarding wizard'a düşecek.",
    responsibilities: [
      "Personel vardiya planlama (haftalık)",
      "PDKS denetim (geç gelme, devamsızlık)",
      "İzin onayı (kendi şubesi)",
      "Şube siparişi (fabrikadan)",
      "Müşteri şikayet ilk müdahale",
      "Ekipman arıza bildirimi (teknik'e)",
      "Yerel kampanya uygulama (marketing'ten)",
      "Coach ziyaretine hazırlık",
      "Aylık şube P&L raporu",
      "Yeni personel mülakat (HQ ile)",
    ],
    dailyFlow: {
      sabah:
        "Vardiya kontrol (kim geldi). PDKS özeti. Önceki gün satış raporu.",
      oglen:
        "Şubede aktif yönetim. Müşteri etkileşimi. Acil sorunları çöz.",
      aksam:
        "Günü kapatma: kasa, sayım, yarın için hazırlık. Coach'a günlük özet.",
    },
    perspectives: {
      operasyonel:
        "Şube müdürü pilot başarısının çekirdeği. Pilot Day-1 Erdem (Işıklar) şu an en hazır müdür. Lara müdürü hala generic isim — pilot öncesi gerçek kişi atanmalı.",
      stratejik:
        "37 müdür = 37 küçük P&L. Stratejik anlamda mudur'un raporu CGO+CEO'ya şirket gerçekliğini gösterir.",
      veri:
        "Kendi şubesi için tam erişim. Diğer şubeleri görmez (kasıtlı izolasyon).",
      ik:
        "Müdür ekibinin yetiştirilmesi = pilot başarısı. Pilot Day-1 öncesi her müdüre 'sistem nasıl kullanılır' eğitimi şart (trainer rolü boş — kritik).",
      risk:
        "Müdür yetersiz eğitim alırsa sistem yanlış kullanılır, veri kalitesi düşer, raporlar şüpheli olur. En büyük risk eğitim açığı.",
    },
    hierarchy: { reportsTo: "Coach (Yavuz/Ece) → CGO", manages: "supervisor, barista, stajyer (kendi şubesi)" },
    pilotNote:
      "Pilot Day-1 Erdem (Işıklar) hazır, Lara müdürü atanmalı. 16 hazırlık şubesi müdürleri onboarding wizard'a düşecek (3 adım: personel yükle, gap analiz, setup tamamla).",
    knownIssues: [
      "Lara müdürü generic isim (R-6 #2)",
      "Müdür sistem eğitimi henüz hazır değil (trainer rolü boş)",
      "Müdür yedekleme planı yok (müdür izinli ise supervisor mu yetki devralır?)",
      "37 müdür kayıtlı ama sadece 22 şube var — fazlalık hesaplar pilot öncesi temizlik gerek",
    ],
    recommendations: [
      "ACİL: Pilot öncesi her aktif müdüre 5 modül eğitim (PDKS, vardiya, izin, sipariş, raporlama). Trainer eksik olduğu için Aslan veya coach hazırlamalı.",
      "Lara müdür gerçek isim atanması (Aslan + franchise sahibi).",
      "Müdür yedek: supervisor'a 'acting mudur' yetkisi (müdür 7+ gün izinli ise otomatik). branchId aynı kalır, geçici full yetki.",
      "Fazla müdür hesapları temizlik: 37 - 22 = 15 fazla hesap, pilot öncesi neden var anlaşılmalı.",
      "Müdür dashboard: günlük 'yapılacak' özetleri (operasyonel + stratejik widget'lar dengeli).",
      "Müdür performans skoru (aylık): PDKS uyum, görev tamamlama, müşteri puan, satış hedefi. Bonus için temel.",
    ],
  },

  supervisor: {
    displayName: "Supervisor (Vardiya Sorumlusu)",
    category: "sube_operasyon",
    scope: "Tek şube (kendi şubesi)",
    shortPurpose: "Vardiya yönetimi, ekip lideri, müdürün operasyonel kolu.",
    description:
      "Supervisor rolü, şube müdürünün altında vardiya seviyesinde lider. Bir vardiyanın baristası ve stajyeri ile çalışır, görev dağılımı yapar, eğitim ve performans takibi yapar. Müdür yokken (örn. izinli) günlük operasyonu sürdürür ama tam yetki almaz.",
    currentStatus:
      "38 aktif supervisor. Pilot Day-1 öncü: Basri Şen (Işıklar), Lara Supervisor (R-6 #2 — generic).",
    responsibilities: [
      "Vardiya başlangıç brief'i",
      "Görev dağılımı (barista + stajyer)",
      "Müşteri etkileşimi (ön sıra)",
      "Vardiya sonu kasa kontrol",
      "Anomali bildirimi (müdüre)",
      "Yeni başlayan eğitim destek",
      "Stok kullanım takibi (vardiya seviyesi)",
      "Vardiya raporu (müdüre)",
    ],
    dailyFlow: {
      sabah:
        "Vardiya başlangıç. Personel yoklama. Bugünkü görevler dağılımı.",
      oglen:
        "Vardiya yönetimi. Müşteri etkileşim ve sorun çözme.",
      aksam:
        "Vardiya kapanış. Kasa kontrol. Müdüre rapor.",
    },
    perspectives: {
      operasyonel:
        "Supervisor pilot Day-1'de günün her dakikasında sahnede. Basri (Işıklar) deneyimli. Lara supervisor atanmalı.",
      stratejik:
        "Supervisor = gelecek müdür havuzu. Kariyer gelişim yolu net olmalı.",
      veri:
        "Kendi vardiyası ve şubesi için view + sınırlı CRUD. Müdür ile aynı şube, daha az yetki.",
      ik:
        "38 supervisor — bazı şubelerde 2-3 supervisor (vardiya rotasyonu). Yetiştirme: müdür yardımıyla.",
      risk:
        "Supervisor yetersiz eğitimle sahaya çıkarsa müdür sürekli müdahale etmek zorunda kalır. Ekip yorgunluğu.",
    },
    hierarchy: { reportsTo: "mudur", manages: "barista, stajyer (kendi vardiyası)" },
    pilotNote:
      "Pilot Day-1 Basri aktif. Lara supervisor atanmalı.",
    knownIssues: [
      "Lara supervisor generic isim (R-6 #2)",
      "Supervisor → mudur kariyer yolu net değil",
      "Supervisor için ayrı dashboard yok (mudur ile aynı görür ama daha az yetki)",
    ],
    recommendations: [
      "ACİL: Lara supervisor gerçek isim.",
      "Supervisor dashboard kişiselleştirme (12 widget tune yapıldı 26 Apr — pilot Day-1 hazır).",
      "Supervisor → mudur kariyer yolu: 6+12 ay deneyim + müdür eğitimi + Aslan onayı. Şeffaf yol.",
      "Supervisor 'acting mudur' modu: müdür izinli ise geçici yetki devri (otomatik).",
      "Supervisor vardiya bitiminde 'günlük başarı' rozeti — Akademi entegrasyonu.",
    ],
  },

  barista: {
    displayName: "Barista",
    category: "sube_operasyon",
    scope: "Tek şube (sadece kendi vardiyası)",
    shortPurpose: "İçecek hazırlama, müşteri hizmeti, şubenin operasyonel ana kuvveti.",
    description:
      "Barista, şubenin ana üretim ve hizmet personelidir. Müşteri karşılama, sipariş alma, içecek hazırlama, ödeme alma, hijyen kuralları bu rolde. Sistemde sınırlı yetki: sadece kendi PDKS, eğitim, görev görür. Müşteri şikayeti girebilir.",
    currentStatus:
      "73 aktif barista (122 toplam — bazı 'pasif' eski personel). En büyük rol grubu.",
    responsibilities: [
      "Müşteri karşılama ve sipariş alma",
      "İçecek hazırlama (reçeteye uygun)",
      "Hijyen kurallarına uyum",
      "Stok kullanım gözlemi (azalan ürün uyarı)",
      "Vardiya sonu temizlik",
      "PDKS giriş/çıkış (kiosk)",
      "Akademi eğitim modülleri (sürekli)",
      "Müşteri şikayet ilk dinleyici (supervisor'a aktarır)",
    ],
    dailyFlow: {
      sabah:
        "PDKS giriş (kiosk). Vardiya brief'i. İçecek istasyonu kurulum.",
      oglen:
        "Müşteri hizmeti yoğun saat. İçecek hazırlama hızlı.",
      aksam:
        "Vardiya kapanış. Temizlik. PDKS çıkış.",
    },
    perspectives: {
      operasyonel:
        "Barista = müşteri ile en çok temas eden rol. Marka deneyiminin yüzü. 73 aktif barista, pilot Day-1'de 22 şube üzerinde dağılı.",
      stratejik:
        "Barista yetiştirme = uzun vadeli kalite. Kariyer yolu: barista → supervisor → mudur. İyi barista yetiştirme stratejik.",
      veri:
        "Sadece kendi PDKS, vardiya, eğitim, görev. Şube datasını görmez.",
      ik:
        "En büyük rol grubu, devir hızı en yüksek (sezonluk + öğrenci personel). Pilot Day-1'de 73 baristanın eğitim seviyesi belirsiz.",
      risk:
        "Barista yetersiz eğitimde (akademi tamamlamamış) reçete yanlış uygular, müşteri şikayeti artar. Pilot 1. hafta için kritik.",
    },
    hierarchy: { reportsTo: "supervisor → mudur", manages: "—" },
    pilotNote:
      "Pilot Day-1 73 barista aktif. Akademi tamamlama oranı pilot öncesi raporlanmalı (kim hangi modülü tamamladı).",
    knownIssues: [
      "Akademi tamamlama oranı şu an düşük (pilot öncesi push gerek)",
      "Barista'lar arası performans farkı belirsiz (worker scoring yok şubede)",
      "Sezonluk personel onboarding hızlı yapılamıyor",
    ],
    recommendations: [
      "ACİL: 9 günde 73 baristanın akademi tamamlama oranını %80'e çek (Aslan + coach kampanyası).",
      "Barista 'haftanın yıldızı' rozeti — müşteri puanı + akademi tamamlama + PDKS uyumu kombinasyonu (Akademi badges).",
      "Sezonluk personel için 'fast onboarding' (2 saatlik intensive akademi). Pilot sonrası standart hale getir.",
      "Barista performans karşılaştırma şube içi (anonim, motivasyon için).",
      "Barista'lar arasında 'mentörlük' sistemi: deneyimli barista yeniyi yönlendirir, akademi puanı kazanır.",
    ],
  },

  stajyer: {
    displayName: "Stajyer",
    category: "sube_operasyon",
    scope: "Tek şube (sadece kendi vardiyası)",
    shortPurpose: "Eğitim aşamasındaki personel, sınırlı yetki ile gözetim altında çalışır.",
    description:
      "Stajyer rolü, deneme süresi (2-4 hafta) içindeki yeni personeldir. Barista'dan daha az yetki: bağımsız sipariş alamaz, hijyen kontrolü için supervisor onayı gerekir. Akademi modüllerini tamamladıktan sonra barista'ya yükselir.",
    currentStatus:
      "42 aktif stajyer. Pilot Day-1'de yüksek devir grubu — bir kısmı pilot 1. ay sonunda barista olacak.",
    responsibilities: [
      "Akademi modülleri tamamlama (öncelik)",
      "Supervisor gözetiminde müşteri hizmeti",
      "Reçete öğrenme (uygulamalı)",
      "Hijyen kurallarına uyum",
      "Vardiya sonu temizlik destek",
      "PDKS kiosk giriş/çıkış",
    ],
    dailyFlow: {
      sabah:
        "PDKS giriş. Akademi modülü çalışma (sabah saatleri öğrenme).",
      oglen:
        "Supervisor gözetiminde aktif çalışma. Müşteri hizmeti pratiği.",
      aksam:
        "Vardiya sonu eğitim notları. Akademi tamamlama planı.",
    },
    perspectives: {
      operasyonel:
        "Stajyer = gelecek barista havuzu. Eğitim kalitesi pilot 2. ayda barista kalitesini belirler.",
      stratejik:
        "Stajyer havuzu büyüklüğü = büyüme kapasitesi. 42 stajyer = pilot ayı sonunda potansiyel 30+ yeni barista.",
      veri:
        "Sadece kendi eğitim ve PDKS verisi.",
      ik:
        "Yüksek devir hızı (deneme süresi sonu ayrılma). 42 stajyerden kaç tanesinin barista olduğu KPI.",
      risk:
        "Stajyer eğitimi zayıfsa barista'ya yükselince hata yapar. Akademi tamamlama oranı kritik.",
    },
    hierarchy: { reportsTo: "supervisor → mudur", manages: "—" },
    pilotNote:
      "Pilot Day-1 42 stajyer aktif. Pilot 1. ay sonunda hangi stajyerin barista olacağı CGO + müdür kararı.",
    knownIssues: [
      "Stajyer → barista geçiş kriterleri net değil (şu an müdür kararı, standart yok)",
      "Stajyer akademi tamamlama oranı düşük",
      "Stajyer için ayrı dashboard yok (barista ile aynı)",
    ],
    recommendations: [
      "Stajyer → barista geçiş kriterleri standart: akademi %80 + supervisor onayı + 2 hafta gözlem. Şeffaf.",
      "Stajyer için ayrı 'öğrenme dashboard'u (Akademi öncelikli, görev geri planda).",
      "Stajyer mentor (deneyimli barista) atama otomatik.",
      "Pilot Day-1'de stajyer'lere acil 'sistem kullanımı' eğitimi (PDKS giriş, vardiya görme, akademi).",
      "Stajyer yetersiz performansta otomatik supervisor uyarı (akademi 7 gün ilerlememiş, vb.).",
    ],
  },

  sube_kiosk: {
    displayName: "Şube Kiosk",
    category: "sube_operasyon",
    scope: "Tek şube (kiosk paylaşımlı)",
    shortPurpose: "Şubedeki paylaşımlı kiosk tablet için PIN-based hesap, PDKS girişine özel.",
    description:
      "Sube_kiosk rolü, şubedeki paylaşımlı tablet/POS terminali için tasarlanmış genel hesap. Personel kiosk'a kendi PIN'i ile giriş yapar (4 haneli, bcrypt), PDKS girişi yapar, vardiya görür, görev tamamlar. Web login gibi tam ekran değil — kısıtlı kiosk arayüzü.",
    currentStatus:
      "18 aktif sube_kiosk hesabı (her şubede 1 kiosk). Pilot Day-1'de aktif.",
    responsibilities: [
      "Kiosk PIN authentication aracı",
      "Personel PDKS giriş/çıkış",
      "Vardiya görüntüleme",
      "Görev tamamlama (kiosk üzerinden)",
      "Şube içi duyurular",
    ],
    dailyFlow: null,
    eventDriven: [
      "Personel vardiya başında kiosk'a PIN ile giriş",
      "Vardiya sonu PIN ile çıkış",
      "Görev tamamlanınca kiosk'tan onay",
    ],
    perspectives: {
      operasyonel:
        "Kiosk = PDKS verisinin doğruluğu için kritik. Kiosk arızalı ise personel manuel PDKS yapamaz, veri eksik kalır.",
      stratejik:
        "Kiosk verisi = personel performansı temelinin başlangıcı. PDKS yanlışsa tüm İK kararları yanlış.",
      veri:
        "Kiosk hesabı kendi başına veri tutmaz, üzerinden geçen personel PIN'leri ile veri girilir.",
      ik:
        "Her şubede 1 kiosk = 22 kiosk. Donanım bakımı teknik (Murat) sorumluluğunda.",
      risk:
        "Kiosk PIN paylaşımı (kötü pratik) → veri sahteliği. Pilot Day-1'de PIN güvenlik eğitimi şart.",
    },
    hierarchy: { reportsTo: "—", manages: "—" },
    pilotNote:
      "Pilot Day-1'de 22 şube + fabrika = 23 kiosk aktif olmalı. Murat (teknik) kontrol ediyor.",
    knownIssues: [
      "PIN paylaşım riski (eğitimle azaltılabilir)",
      "Kiosk arıza fallback yok",
      "Kiosk üzerinden 'foto çekme' (görev evidence) zayıf",
    ],
    recommendations: [
      "Pilot öncesi tüm 23 kiosk donanım kontrolü (Murat).",
      "PIN güvenlik eğitimi: 'PIN'inizi paylaşmayın' Akademi modülü zorunlu.",
      "Kiosk arıza fallback: müdür telefonundan 'manuel PDKS' giriş yapabilir (audit log'lu).",
      "Kiosk üzerinden görev evidence foto upload UX iyileştirme (büyük buton, hızlı kaydet).",
      "Pilot Day-1'de her şubeye 'kiosk kullanım kart'ı (laminat, masaüstü) — temel adımlar.",
    ],
  },

  // ============================================================
  // BUDDY
  // ============================================================
  supervisor_buddy: {
    displayName: "Supervisor Buddy (Yedek Supervisor)",
    category: "buddy",
    scope: "Tek şube (yedek/destek)",
    shortPurpose: "Supervisor'un eğitilmiş yardımcısı, supervisor yokken operasyonu sürdürür.",
    description:
      "Supervisor_buddy rolü, supervisor'un yedek pozisyonudur. Genellikle deneyimli barista bu role atanır. Supervisor izinli/raporlu olduğunda vardiya sürdürme yetkisi alır ama tam supervisor yetkisi yoktur (örn. izin onayı yok).",
    currentStatus:
      "39 aktif supervisor_buddy. Şubelerin çoğunda 1-2 buddy var.",
    responsibilities: [
      "Supervisor yokken vardiya yönetimi",
      "Personel görev dağılımı",
      "Müşteri sorun çözümü",
      "Vardiya raporu (müdüre)",
      "Yeni barista pratik eğitimi",
      "Acil durumlarda müdür ile iletişim",
    ],
    dailyFlow: {
      sabah:
        "Normalde barista olarak çalışır. Supervisor yoksa vardiya brief'i.",
      oglen:
        "Vardiya yönetimi (supervisor yokken) veya destek (varken).",
      aksam:
        "Vardiya kapanış. Müdüre rapor.",
    },
    perspectives: {
      operasyonel:
        "Supervisor_buddy 'gizli supervisor' yetkisidir. 39 buddy = 39 yedek vardiya yöneticisi. Sürdürülebilirlik kalkanı.",
      stratejik:
        "Buddy → supervisor → mudur kariyer yolu. Buddy başarılı ise supervisor terfisi.",
      veri:
        "Supervisor ile aynı yetki (vardiya seviyesi) ama izin onayı vb. yok.",
      ik:
        "Buddy rolü pilot için kritik yedekleme. Supervisor + buddy birlikte = tek nokta arıza yok.",
      risk:
        "Buddy yetiştirme zayıfsa supervisor olunca hata yapar. Eğitim kalitesi önemli.",
    },
    hierarchy: { reportsTo: "supervisor → mudur", manages: "barista, stajyer (geçici)" },
    pilotNote:
      "Pilot Day-1 39 buddy. Pilot başarısı için yedekleme kritik — buddy aktif rolün yarısı.",
    knownIssues: [
      "Buddy → supervisor terfi kriterleri net değil",
      "Buddy eğitim modülü ayrı tasarlanmamış (supervisor ile aynı)",
      "Buddy rolünde 'hangi gün buddy görev yaptı' KPI yok",
    ],
    recommendations: [
      "Buddy → supervisor terfi: 6 ay buddy + akademi tamamlama + müdür önerisi.",
      "Buddy için ayrı eğitim modülü (supervisor pratik becerileri).",
      "Buddy aktif gün sayısı KPI: ayda kaç gün buddy görev yaptı (müdüre raporlama).",
      "Buddy 'hazır olduğunda' otomatik supervisor terfi önerisi (Akademi + performans tamamlandığında).",
      "Pilot sonrası buddy → supervisor terfi vakası — kariyer yolu örneği.",
    ],
  },

  bar_buddy: {
    displayName: "Bar Buddy (Yedek Barista)",
    category: "buddy",
    scope: "Tek şube (yedek)",
    shortPurpose: "Barista'nın yedek pozisyonu, yoğun saatlerde destek, eğitim aşaması bitmiş stajyer.",
    description:
      "Bar_buddy rolü, barista'nın yedek/destek versiyonudur. Stajyer bittikten sonra ama tam barista yetkisi almadan önce verilir. Yoğun saatlerde ek hand-on-deck olarak çalışır.",
    currentStatus:
      "39 aktif bar_buddy. Genellikle stajyer'den barista'ya geçiş aşamasında kullanılır.",
    responsibilities: [
      "Barista'ya destek (yoğun saat)",
      "Sipariş alma (denetim altında)",
      "İçecek hazırlama (basit reçeteler)",
      "Akademi modülü tamamlama (barista terfisi için)",
      "Hijyen ve temizlik destek",
      "Yeni stajyer mentörlüğü",
    ],
    dailyFlow: {
      sabah:
        "PDKS giriş. Vardiya brief'i. Barista'ya destek.",
      oglen:
        "Yoğun saat aktif çalışma.",
      aksam:
        "Vardiya kapanış. Akademi modülü.",
    },
    perspectives: {
      operasyonel:
        "Bar_buddy yoğun saat (peak hour) için tampon. 39 buddy = peak hour kapasitesi koruyucu.",
      stratejik:
        "Buddy → barista terfi geçişi pilot için akış. Erken terfi = kariyer hızı.",
      veri:
        "Barista ile benzer ama daha az yetki.",
      ik:
        "Pilot için orta kademe yedek. Stajyer-barista arası köprü.",
      risk:
        "Yetersiz buddy eğitimde barista'ya geçiş hatalı. Akademi takip kritik.",
    },
    hierarchy: { reportsTo: "supervisor → mudur", manages: "stajyer (mentörlük)" },
    pilotNote:
      "Pilot Day-1 39 bar_buddy. Pilot 1. ay buddy → barista terfileri olacaktır.",
    knownIssues: [
      "Buddy → barista terfi kriterleri standart değil",
      "Buddy için özel akademi modülü yok",
      "Peak hour buddy gereksinim hesaplama yok (kaç buddy yeterli?)",
    ],
    recommendations: [
      "Buddy → barista terfi: 3 ay buddy + akademi %90 + supervisor onayı.",
      "Peak hour buddy ihtiyacı: şube müşteri sayısı/saat verisi → otomatik buddy ihtiyaç hesaplama (vardiya planlaması optimize).",
      "Buddy için 'buddy başarı' rozeti (yoğun saat hayatta kalma + müşteri puanı).",
      "Buddy mentor → stajyer akışı standart (her stajyer'e bir buddy mentor atama otomatik).",
    ],
  },

  // ============================================================
  // YATIRIMCI (Branch)
  // ============================================================
  yatirimci_branch: {
    displayName: "Şube Yatırımcısı",
    category: "yatirimci",
    scope: "Tek şube (sadece view)",
    shortPurpose: "Tek şubeye finansal/operasyonel salt-okur erişim — franchise yatırımcısına şeffaflık.",
    description:
      "Yatırımcı_branch rolü, bir şubenin franchise sahibinin sisteme şeffaf erişimidir. Sadece kendi şubesinin satış, gider, performans, müşteri verisini okur. CRUD yok, müdahale yok. Aylık ROI takibi için.",
    currentStatus:
      "4 aktif yatirimci_branch. Franchise şubelerin sahipleri.",
    responsibilities: [
      "Şube finansal rapor inceleme (aylık)",
      "Şube performans karşılaştırması",
      "Müşteri puan trendleri",
      "Yatırım ROI takibi",
      "Pilot başarısı izleme (kendi şubesi)",
    ],
    dailyFlow: null,
    eventDriven: [
      "Aylık → finansal rapor mail",
      "Çeyreklik → performans inceleme",
      "Yıllık → büyük resim",
    ],
    perspectives: {
      operasyonel:
        "Operasyonda yok. Sadece sonuç okur.",
      stratejik:
        "Franchise yatırımcı memnuniyeti = sözleşme yenileme. Pilot başarısı yatırımcı raporlaması ile pekiştirilir.",
      veri:
        "Kendi şubesi view. Diğer şubeleri görmez.",
      ik:
        "4 yatırımcı = 4 farklı kişi/şirket. Yetiştirme gerekmez (dış paydaş).",
      risk:
        "Yanlış raporlama → yatırımcı güveni kaybı → franchise sözleşme problemi.",
    },
    hierarchy: { reportsTo: "—", manages: "—" },
    pilotNote:
      "Pilot Day-1'de 4 yatırımcı aktif. Pilot başarısı kanıtlama için raporlama önemli.",
    knownIssues: [
      "Yatırımcıya özel rapor ekranı yok",
      "Aylık otomatik PDF brifing yok",
      "Yatırımcı login sıklığı düşük",
    ],
    recommendations: [
      "Yatırımcı için aylık otomatik PDF rapor (kendi şubesi).",
      "Yatırımcı dashboard: 5 ana KPI renk kodlu.",
      "Pilot sonrası 'yatırımcı brifing' toplantısı (Aslan + yatırımcılar).",
      "Yatırımcı için 'mobil özet' SMS (haftalık satış + müşteri puanı).",
    ],
  },
};

// Yardımcı: rolün ana açıklamasını DB'deki description ile karşılaştırma
export function getRoleContent(roleKey) {
  return ROLES_CONTENT[roleKey] || null;
}
