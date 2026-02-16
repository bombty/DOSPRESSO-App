export interface RoleGuideContent {
  roleKey: string;
  roleTitle: string;
  roleDescription: string;
  availableModules: Array<{
    name: string;
    description: string;
    icon: string;
    path: string;
  }>;
  quickTips: string[];
  commonTasks: Array<{
    title: string;
    steps: string[];
  }>;
  restrictions: string[];
}

export const ROLE_GUIDE_CONTENT: Record<string, RoleGuideContent> = {
  admin: {
    roleKey: "admin",
    roleTitle: "Sistem Yöneticisi",
    roleDescription: "Tüm sistem modüllerine tam erişim. Kullanıcı yönetimi, sistem ayarları, yedekleme ve güvenlik işlemlerinden sorumlusunuz.",
    availableModules: [
      { name: "Kontrol Paneli", description: "Genel sistem durumu ve özet bilgiler", icon: "LayoutDashboard", path: "/" },
      { name: "Kullanıcı Yönetimi", description: "Tüm kullanıcıları oluşturma, düzenleme ve yetkilendirme", icon: "Users", path: "/admin/kullanicilar" },
      { name: "Sistem Ayarları", description: "Uygulama genelinde konfigürasyon ve tercihler", icon: "Settings", path: "/admin/ayarlar" },
      { name: "Yedekleme & Güvenlik", description: "Veri yedekleme, güvenlik logları ve denetim", icon: "HardDrive", path: "/admin/yedekleme" },
      { name: "Şube Yönetimi", description: "Tüm şubeleri görüntüleme ve yönetme", icon: "Building2", path: "/subeler" },
      { name: "Ekipman & Bakım", description: "Ekipman envanteri, arıza takibi ve bakım planlaması", icon: "Wrench", path: "/ekipman" },
      { name: "İK & Vardiya", description: "İnsan kaynakları, vardiya planlama ve devam takibi", icon: "Users", path: "/ik" },
      { name: "Eğitim Akademisi", description: "Eğitim modülleri, quiz ve sertifika yönetimi", icon: "GraduationCap", path: "/akademi/*" },
      { name: "Raporlar", description: "Tüm analitik ve raporlama araçları", icon: "BarChart3", path: "/raporlar" },
      { name: "Yönetim Paneli", description: "Admin mega modülü ve gelişmiş ayarlar", icon: "LayoutDashboard", path: "/admin" },
    ],
    quickTips: [
      "Yeni kullanıcı eklerken rol ve şube atamasını doğru yapın.",
      "Sistem ayarlarında yapılan değişiklikler tüm kullanıcıları etkiler.",
      "Düzenli yedekleme alarak veri güvenliğinizi sağlayın.",
      "Yetkilendirme modülünden rollerin erişim haklarını özelleştirebilirsiniz.",
      "AI Asistan'ı kullanarak hızlı raporlar ve özetler alabilirsiniz.",
    ],
    commonTasks: [
      { title: "Yeni Kullanıcı Ekleme", steps: ["Yönetim > Kullanıcılar sayfasına gidin", "Yeni Kullanıcı butonuna tıklayın", "Ad, soyad, rol ve şube bilgilerini girin", "Kaydet butonuna basın"] },
      { title: "Şube Oluşturma", steps: ["Şube Yönetimi sayfasına gidin", "Yeni Şube butonuna tıklayın", "Şube adı, adresi ve diğer bilgileri doldurun", "Kaydet ile onaylayın"] },
      { title: "Sistem Yedeği Alma", steps: ["Yönetim > Yedekleme & Güvenlik'e gidin", "Yedek Al butonuna tıklayın", "Yedekleme tamamlanana kadar bekleyin"] },
    ],
    restrictions: [],
  },

  ceo: {
    roleKey: "ceo",
    roleTitle: "CEO",
    roleDescription: "Üst düzey yönetim görünümü. Tüm şubelerin performansını, stratejik raporları ve AI destekli analizleri takip edebilirsiniz.",
    availableModules: [
      { name: "CEO Komut Merkezi", description: "Üst düzey yönetim paneli ve stratejik göstergeler", icon: "Crown", path: "/ceo-command-center" },
      { name: "Kontrol Paneli", description: "Genel performans özeti", icon: "LayoutDashboard", path: "/" },
      { name: "Şubeler", description: "Tüm şubelerin genel durumu", icon: "Building2", path: "/subeler" },
      { name: "Performans", description: "Şube ve personel performans analizleri", icon: "BarChart3", path: "/performans" },
      { name: "Raporlar", description: "Detaylı analitik raporlar", icon: "FileText", path: "/raporlar" },
      { name: "AI Asistan", description: "Yapay zeka destekli analiz ve öneriler", icon: "Bot", path: "/ai-asistan" },
    ],
    quickTips: [
      "CEO Komut Merkezi'nden tüm operasyonların anlık durumunu görebilirsiniz.",
      "Performans sayfasından şubeleri karşılaştırabilirsiniz.",
      "AI Asistan'a sorular sorarak hızlı analiz alabilirsiniz.",
      "Raporlar bölümünden haftalık/aylık özet raporları inceleyebilirsiniz.",
    ],
    commonTasks: [
      { title: "Şube Performansını İnceleme", steps: ["CEO Komut Merkezi'ne gidin", "Şube karşılaştırma bölümünü inceleyin", "Detay için ilgili şubeye tıklayın"] },
      { title: "Stratejik Rapor Oluşturma", steps: ["Raporlar sayfasına gidin", "İstediğiniz rapor türünü seçin", "Tarih aralığını belirleyin", "Raporu görüntüleyin veya dışa aktarın"] },
    ],
    restrictions: ["Kullanıcı oluşturma ve silme yetkiniz yoktur.", "Sistem ayarlarını değiştiremezsiniz."],
  },

  cgo: {
    roleKey: "cgo",
    roleTitle: "CGO (Büyüme Sorumlusu)",
    roleDescription: "Operasyon ve büyüme sorumlusu. Tüm departmanların özetini, pazarlama analitiklerini ve müşteri memnuniyetini takip edersiniz.",
    availableModules: [
      { name: "CGO Komut Merkezi", description: "Büyüme metrikleri ve departman özeti", icon: "TrendingUp", path: "/cgo-command-center" },
      { name: "Kontrol Paneli", description: "Genel operasyon durumu", icon: "LayoutDashboard", path: "/" },
      { name: "Şubeler", description: "Tüm şubelerin durumu", icon: "Building2", path: "/subeler" },
      { name: "Misafir Memnuniyeti", description: "Müşteri geri bildirimleri ve memnuniyet analizleri", icon: "MessageSquareHeart", path: "/misafir-memnuniyeti" },
      { name: "Performans", description: "Performans takibi ve karşılaştırma", icon: "BarChart3", path: "/performans" },
      { name: "Kampanya Yönetimi", description: "Pazarlama kampanyalarının yönetimi", icon: "Megaphone", path: "/kampanya-yonetimi" },
    ],
    quickTips: [
      "CGO Komut Merkezi'nden tüm departmanların performansını tek ekranda görün.",
      "Misafir memnuniyeti skorlarını düzenli takip edin.",
      "Kampanya performanslarını analiz ederek ROI hesaplayın.",
    ],
    commonTasks: [
      { title: "Büyüme Raporunu İnceleme", steps: ["CGO Komut Merkezi'ne gidin", "Büyüme metrikleri bölümünü kontrol edin", "Departman bazlı detaylara inin"] },
      { title: "Müşteri Memnuniyetini Takip Etme", steps: ["Misafir Memnuniyeti sayfasına gidin", "Son geri bildirimleri inceleyin", "Trend analizlerini kontrol edin"] },
    ],
    restrictions: ["Kullanıcı yönetimi yetkiniz yoktur.", "Sistem ayarlarını değiştiremezsiniz."],
  },

  muhasebe_ik: {
    roleKey: "muhasebe_ik",
    roleTitle: "Muhasebe & İK",
    roleDescription: "İnsan kaynakları ve muhasebe işlemlerinden sorumlusunuz. Personel yönetimi, maaş bordrosu, izin takibi ve vardiya planlaması yapabilirsiniz.",
    availableModules: [
      { name: "İK Dashboard", description: "İK departmanı genel özeti", icon: "LayoutDashboard", path: "/hq-dashboard/ik" },
      { name: "İK Yönetimi", description: "Personel kayıtları, işe alım ve işten çıkış", icon: "Users", path: "/ik" },
      { name: "Vardiya Planlama", description: "Vardiya programı oluşturma ve düzenleme", icon: "Calendar", path: "/vardiyalar" },
      { name: "Devam Takibi", description: "Personel devam ve devamsızlık kayıtları", icon: "UserCheck", path: "/devam-takibi" },
      { name: "İzin Talepleri", description: "Personel izin taleplerini görüntüleme ve onaylama", icon: "CalendarOff", path: "/izin-talepleri" },
      { name: "Muhasebe", description: "Finansal işlemler ve maaş bordrosu", icon: "Calculator", path: "/muhasebe" },
    ],
    quickTips: [
      "İzin taleplerini zamanında onaylayın, personel planlaması buna bağlıdır.",
      "Vardiya planlarını en az bir hafta önceden oluşturun.",
      "Devam takibini günlük kontrol edin.",
      "Maaş bordrosunu ay sonundan önce hazırlayın.",
    ],
    commonTasks: [
      { title: "İzin Talebi Onaylama", steps: ["İzin Talepleri sayfasına gidin", "Bekleyen talepleri inceleyin", "Uygun olan talepleri onaylayın veya reddedin"] },
      { title: "Vardiya Planı Oluşturma", steps: ["Vardiya Planlama sayfasına gidin", "İlgili haftayı seçin", "Personeli vardiyalara atayın", "Planı kaydedin"] },
      { title: "Yeni Personel Kaydı", steps: ["İK Yönetimi sayfasına gidin", "Yeni Personel butonuna tıklayın", "Kişisel bilgileri ve rol atamasını yapın", "Kaydedin"] },
    ],
    restrictions: ["Sistem ayarlarını değiştiremezsiniz.", "Ekipman yönetimi yetkiniz sınırlıdır."],
  },

  muhasebe: {
    roleKey: "muhasebe",
    roleTitle: "Muhasebe",
    roleDescription: "Finansal işlemler, muhasebe kayıtları ve mali raporlamadan sorumlusunuz.",
    availableModules: [
      { name: "Muhasebe", description: "Finansal işlemler ve mali kayıtlar", icon: "Calculator", path: "/muhasebe" },
      { name: "Raporlar", description: "Mali raporlar ve analizler", icon: "FileText", path: "/raporlar" },
      { name: "Şubeler", description: "Şube mali verileri", icon: "Building2", path: "/subeler" },
    ],
    quickTips: [
      "Mali raporları düzenli olarak kontrol edin.",
      "Şube bazlı gelir-gider analizlerini takip edin.",
    ],
    commonTasks: [
      { title: "Mali Rapor İnceleme", steps: ["Raporlar sayfasına gidin", "Mali rapor türünü seçin", "Tarih aralığını belirleyin", "Raporu inceleyin"] },
    ],
    restrictions: ["Kullanıcı yönetimi yetkiniz yoktur.", "Ekipman ve arıza yönetimi sınırlıdır."],
  },

  satinalma: {
    roleKey: "satinalma",
    roleTitle: "Satın Alma",
    roleDescription: "Tedarik zinciri, stok yönetimi, tedarikçi ilişkileri ve satın alma siparişlerinden sorumlusunuz.",
    availableModules: [
      { name: "Satın Alma Dashboard", description: "Satın alma departmanı genel görünümü", icon: "LayoutDashboard", path: "/hq-dashboard/satinalma" },
      { name: "Satın Alma", description: "Satın alma modülü ve sipariş yönetimi", icon: "ShoppingCart", path: "/satinalma" },
      { name: "Stok Yönetimi", description: "Ürün stok takibi ve minimum stok uyarıları", icon: "Package", path: "/satinalma/stok-yonetimi" },
      { name: "Tedarikçi Yönetimi", description: "Tedarikçi listesi ve performans takibi", icon: "Truck", path: "/satinalma/tedarikci-yonetimi" },
      { name: "Sipariş Yönetimi", description: "Satın alma siparişleri oluşturma ve takip", icon: "ClipboardList", path: "/satinalma/siparis-yonetimi" },
      { name: "Mal Kabul", description: "Gelen malzemelerin kabul ve kontrol işlemleri", icon: "PackageCheck", path: "/satinalma/mal-kabul" },
    ],
    quickTips: [
      "Minimum stok seviyesi uyarılarını düzenli kontrol edin.",
      "Tedarikçi performansını aylık değerlendirin.",
      "Siparişleri onaylamadan önce fiyat karşılaştırması yapın.",
      "Mal kabul sürecinde kalite kontrolü ihmal etmeyin.",
    ],
    commonTasks: [
      { title: "Satın Alma Siparişi Oluşturma", steps: ["Sipariş Yönetimi sayfasına gidin", "Yeni Sipariş butonuna tıklayın", "Tedarikçi ve ürünleri seçin", "Miktarları girin ve siparişi onaylayın"] },
      { title: "Stok Kontrolü Yapma", steps: ["Stok Yönetimi sayfasına gidin", "Düşük stoklu ürünleri filtreleyin", "Gerekli siparişleri oluşturun"] },
      { title: "Mal Kabul İşlemi", steps: ["Mal Kabul sayfasına gidin", "İlgili siparişi seçin", "Gelen ürünleri kontrol edin ve onaylayın"] },
    ],
    restrictions: ["İK ve muhasebe modüllerine erişiminiz yoktur.", "Sistem ayarlarını değiştiremezsiniz."],
  },

  coach: {
    roleKey: "coach",
    roleTitle: "Coach",
    roleDescription: "Şube performans ve personel gelişiminden sorumlusunuz. Şube denetimleri, kalite kontrolleri ve misafir memnuniyetini izleyebilirsiniz.",
    availableModules: [
      { name: "Coach Dashboard", description: "Coach departmanı genel görünümü", icon: "LayoutDashboard", path: "/hq-dashboard/coach" },
      { name: "Şube Denetim", description: "Şube denetim ve kalite kontrol ziyaretleri", icon: "ClipboardCheck", path: "/coach-sube-denetim" },
      { name: "Kalite Kontrol", description: "Kalite denetimi ve puanlama", icon: "Star", path: "/kalite-denetimi" },
      { name: "Şube Sağlık Skoru", description: "Şubelerin genel sağlık ve performans skorları", icon: "BarChart", path: "/sube-saglik-skoru" },
      { name: "İK Yönetimi", description: "Personel değerlendirme ve gelişim takibi", icon: "Users", path: "/ik" },
      { name: "Eğitim Akademisi", description: "Eğitim içerikleri ve personel gelişim takibi", icon: "GraduationCap", path: "/akademi/*" },
      { name: "Misafir Memnuniyeti", description: "Müşteri geri bildirimleri ve memnuniyet analizi", icon: "MessageSquareHeart", path: "/misafir-memnuniyeti" },
    ],
    quickTips: [
      "Şube denetimlerini planlı ve düzenli yapın.",
      "Denetim sonrası aksiyon planlarını takip edin.",
      "Personel gelişim hedeflerini somut ve ölçülebilir tutun.",
      "Misafir şikayetlerini hızlı şekilde değerlendirin.",
    ],
    commonTasks: [
      { title: "Şube Denetimi Yapma", steps: ["Şube Denetim sayfasına gidin", "Denetim şablonunu seçin", "Şubeyi ziyaret ederek maddeleri değerlendirin", "Puanları girin ve denetimi tamamlayın"] },
      { title: "Personel Değerlendirmesi", steps: ["İK Yönetimi'ne gidin", "İlgili personeli seçin", "Değerlendirme formunu doldurun", "Geri bildirim notlarını ekleyin"] },
    ],
    restrictions: ["Muhasebe ve finans modüllerine erişiminiz yoktur.", "Sistem ayarlarını değiştiremezsiniz."],
  },

  trainer: {
    roleKey: "trainer",
    roleTitle: "Eğitmen",
    roleDescription: "Eğitim içerikleri, reçete yönetimi ve akademi modülünden sorumlusunuz. Personel eğitim programlarını oluşturur ve takip edersiniz.",
    availableModules: [
      { name: "Eğitmen Dashboard", description: "Eğitim departmanı genel görünümü", icon: "LayoutDashboard", path: "/hq-dashboard/trainer" },
      { name: "Eğitim Akademisi", description: "Eğitim modülleri, dersler ve quizler", icon: "GraduationCap", path: "/akademi/*" },
      { name: "Reçeteler", description: "İçecek ve ürün reçeteleri", icon: "BookOpen", path: "/receteler" },
      { name: "Bilgi Bankası", description: "Eğitim materyalleri ve dokümanlar", icon: "BookOpen", path: "/bilgi-bankasi" },
    ],
    quickTips: [
      "Yeni reçeteleri eklerken fotoğraf ve detaylı açıklama ekleyin.",
      "Eğitim modüllerini düzenli güncelleyin.",
      "Quiz sorularını pratik ve uygulanabilir tutun.",
      "Personel eğitim tamamlama oranlarını takip edin.",
    ],
    commonTasks: [
      { title: "Eğitim Modülü Oluşturma", steps: ["Eğitim Akademisi'ne gidin", "Yeni Modül butonuna tıklayın", "Modül başlığı ve içeriğini ekleyin", "Ders ve quiz bölümlerini oluşturun", "Modülü yayınlayın"] },
      { title: "Reçete Ekleme", steps: ["Reçeteler sayfasına gidin", "Yeni Reçete butonuna tıklayın", "İçerik, malzeme ve hazırlanış bilgilerini girin", "Fotoğraf ekleyin ve kaydedin"] },
    ],
    restrictions: ["Muhasebe, İK ve satın alma modüllerine erişiminiz sınırlıdır.", "Sistem ayarlarını değiştiremezsiniz."],
  },

  kalite_kontrol: {
    roleKey: "kalite_kontrol",
    roleTitle: "Kalite Kontrol",
    roleDescription: "Fabrika kalite kontrolü, ürün şikayetleri ve geri bildirim süreçlerinden sorumlusunuz.",
    availableModules: [
      { name: "Kalite Dashboard", description: "Kalite kontrol departmanı genel görünümü", icon: "LayoutDashboard", path: "/hq-dashboard/kalite" },
      { name: "Kalite Kontrol", description: "Fabrika ve şube kalite denetimleri", icon: "Shield", path: "/kalite-denetimi" },
      { name: "Ürün Şikayetleri", description: "Ürün şikayet takibi ve çözüm süreçleri", icon: "AlertTriangle", path: "/urun-sikayet" },
      { name: "Fabrika Kalite", description: "Fabrika üretim kalite kontrolleri", icon: "Factory", path: "/fabrika/kalite-kontrol" },
      { name: "Misafir Memnuniyeti", description: "Müşteri geri bildirimleri", icon: "MessageSquareHeart", path: "/misafir-memnuniyeti" },
    ],
    quickTips: [
      "Kalite kontrol raporlarını günlük olarak gözden geçirin.",
      "Ürün şikayetlerini en kısa sürede yanıtlayın.",
      "Fabrika üretim kalitesini düzenli denetleyin.",
    ],
    commonTasks: [
      { title: "Kalite Denetimi Yapma", steps: ["Kalite Kontrol sayfasına gidin", "Denetim şablonunu seçin", "Kriterleri değerlendirin ve puanlayın", "Denetimi tamamlayın"] },
      { title: "Ürün Şikayeti Takibi", steps: ["Ürün Şikayetleri sayfasına gidin", "Açık şikayetleri inceleyin", "Gerekli aksiyonları alın ve durumu güncelleyin"] },
    ],
    restrictions: ["İK ve muhasebe modüllerine erişiminiz yoktur.", "Kullanıcı yönetimi yetkiniz yoktur."],
  },

  teknik: {
    roleKey: "teknik",
    roleTitle: "Teknik Servis",
    roleDescription: "Ekipman yönetimi, arıza takibi ve bakım planlamasından sorumlusunuz.",
    availableModules: [
      { name: "Ekipman Listesi", description: "Tüm ekipman envanteri ve durumları", icon: "Wrench", path: "/ekipman" },
      { name: "Arıza Yönetimi", description: "Arıza bildirimlerini görüntüleme ve takip etme", icon: "AlertTriangle", path: "/ariza" },
      { name: "QR Tarama", description: "Ekipman QR kodlarını tarayarak hızlı erişim", icon: "QrCode", path: "/qr-tara" },
      { name: "Bilgi Bankası", description: "Teknik dokümanlar ve sorun giderme rehberleri", icon: "BookOpen", path: "/bilgi-bankasi" },
      { name: "HQ Destek", description: "Destek talepleri ve iletişim", icon: "Headphones", path: "/hq-destek" },
    ],
    quickTips: [
      "Arıza bildirimlerini öncelik sırasına göre değerlendirin.",
      "Bakım planlarını düzenli takip edin ve takvime uygun çalışın.",
      "Ekipman QR kodlarını tarayarak hızlı bilgi alabilirsiniz.",
      "Teknik dokümanları bilgi bankasından inceleyebilirsiniz.",
    ],
    commonTasks: [
      { title: "Arıza Müdahalesi", steps: ["Arıza Yönetimi sayfasına gidin", "Açık arızaları listeleyin", "Arıza detayını inceleyin", "Müdahale notunu ekleyin ve durumu güncelleyin"] },
      { title: "Bakım Planı Takibi", steps: ["Ekipman Listesi'ne gidin", "Bakım zamanı gelen ekipmanları filtreleyin", "Bakım işlemini gerçekleştirin ve kaydedin"] },
    ],
    restrictions: ["İK, muhasebe ve satın alma modüllerine erişiminiz yoktur.", "Kullanıcı yönetimi yetkiniz yoktur."],
  },

  destek: {
    roleKey: "destek",
    roleTitle: "Destek",
    roleDescription: "Destek talepleri ve yardım masası işlemlerinden sorumlusunuz.",
    availableModules: [
      { name: "HQ Destek", description: "Destek talepleri ve yardım masası", icon: "Headphones", path: "/hq-destek" },
      { name: "Bildirimler", description: "Sistem bildirimleri", icon: "Bell", path: "/bildirimler" },
      { name: "Mesajlar", description: "İletişim ve mesajlaşma", icon: "MessageSquare", path: "/mesajlar" },
    ],
    quickTips: [
      "Destek taleplerini öncelik sırasına göre yanıtlayın.",
      "Sık sorulan soruları bilgi bankasına ekleyin.",
      "Açık talepleri düzenli takip edin.",
    ],
    commonTasks: [
      { title: "Destek Talebi Yanıtlama", steps: ["HQ Destek sayfasına gidin", "Açık talepleri listeleyin", "İlgili talebi seçin", "Yanıt yazın ve durumu güncelleyin"] },
    ],
    restrictions: ["İK, muhasebe ve teknik modüllere erişiminiz sınırlıdır.", "Sistem ayarlarını değiştiremezsiniz."],
  },

  marketing: {
    roleKey: "marketing",
    roleTitle: "Pazarlama",
    roleDescription: "Pazarlama kampanyaları, içerik yönetimi ve duyurulardan sorumlusunuz.",
    availableModules: [
      { name: "Pazarlama Dashboard", description: "Pazarlama departmanı genel görünümü", icon: "LayoutDashboard", path: "/hq-dashboard/marketing" },
      { name: "Kampanya Yönetimi", description: "Pazarlama kampanyaları oluşturma ve takip", icon: "Megaphone", path: "/kampanya-yonetimi" },
      { name: "İçerik Stüdyosu", description: "İçerik oluşturma ve düzenleme", icon: "FileText", path: "/icerik-studyosu" },
      { name: "Duyurular", description: "Şube ve personele duyuru gönderme", icon: "Bell", path: "/duyurular" },
    ],
    quickTips: [
      "Kampanyaları şube bazında hedefleyebilirsiniz.",
      "İçerik takvimini düzenli güncelleyin.",
      "Kampanya performans metriklerini takip edin.",
    ],
    commonTasks: [
      { title: "Kampanya Oluşturma", steps: ["Kampanya Yönetimi sayfasına gidin", "Yeni Kampanya butonuna tıklayın", "Kampanya detaylarını ve hedef şubeleri belirleyin", "Kampanyayı başlatın"] },
      { title: "Duyuru Yayınlama", steps: ["Duyurular sayfasına gidin", "Yeni Duyuru butonuna tıklayın", "İçeriği yazın ve hedef kitleyi seçin", "Yayınlayın"] },
    ],
    restrictions: ["İK, muhasebe ve teknik modüllere erişiminiz yoktur.", "Kullanıcı yönetimi yetkiniz yoktur."],
  },

  fabrika_mudur: {
    roleKey: "fabrika_mudur",
    roleTitle: "Fabrika Müdürü",
    roleDescription: "Fabrika operasyonları, üretim planlama, vardiya yönetimi ve kalite kontrolünden sorumlusunuz.",
    availableModules: [
      { name: "Fabrika Dashboard", description: "Fabrika genel üretim ve performans durumu", icon: "LayoutDashboard", path: "/hq-dashboard/fabrika" },
      { name: "Fabrika Paneli", description: "Fabrika operasyonları mega modülü", icon: "Factory", path: "/fabrika/dashboard" },
      { name: "Üretim İstasyonları", description: "Üretim hattı istasyonlarının durumu", icon: "Grid", path: "/fabrika/istasyonlar" },
      { name: "Kalite Kontrol", description: "Fabrika üretim kalite kontrolleri", icon: "Shield", path: "/fabrika/kalite-kontrol" },
      { name: "Performans Analitik", description: "Üretim performans metrikleri", icon: "BarChart3", path: "/fabrika/performans" },
      { name: "Vardiya Uyumluluk", description: "Vardiya uyumluluk takibi", icon: "Clock", path: "/fabrika/vardiya-uyumluluk" },
    ],
    quickTips: [
      "Günlük üretim hedeflerini takip edin.",
      "Vardiya geçişlerinde üretim kayıplarını minimize edin.",
      "Kalite kontrol raporlarını düzenli inceleyin.",
      "Üretim performansını vardiya bazında karşılaştırın.",
    ],
    commonTasks: [
      { title: "Üretim Planı Oluşturma", steps: ["Fabrika Dashboard'a gidin", "Üretim Planlama bölümüne geçin", "Günlük/haftalık hedefleri belirleyin", "Planı kaydedin"] },
      { title: "Kalite Kontrolü İnceleme", steps: ["Kalite Kontrol sayfasına gidin", "Son kontrol sonuçlarını inceleyin", "Sorunlu ürünleri raporlayın"] },
    ],
    restrictions: ["İK ve muhasebe modüllerine erişiminiz sınırlıdır.", "Kullanıcı yönetimi yetkiniz yoktur."],
  },

  fabrika_operator: {
    roleKey: "fabrika_operator",
    roleTitle: "Fabrika Operatör",
    roleDescription: "Fabrika kiosk sistemi üzerinden üretim takibi ve giriş/çıkış işlemlerini yaparsınız.",
    availableModules: [
      { name: "Fabrika Kiosk", description: "Giriş/çıkış ve üretim kayıtları", icon: "Tablet", path: "/fabrika/kiosk" },
      { name: "Fabrika Paneli", description: "Üretim durumu görüntüleme", icon: "Factory", path: "/fabrika/dashboard" },
    ],
    quickTips: [
      "Vardiya başında ve sonunda giriş/çıkış yapmayı unutmayın.",
      "Üretim kayıtlarını doğru ve zamanında girin.",
      "Kalite sorunlarını hemen raporlayın.",
    ],
    commonTasks: [
      { title: "Vardiya Girişi", steps: ["Fabrika Kiosk'a gidin", "PIN kodunuzu girin", "Vardiya girişini onaylayın"] },
      { title: "Üretim Kaydı Girme", steps: ["Fabrika Kiosk'ta üretim bölümüne gidin", "Üretilen ürün ve miktarı girin", "Kaydı onaylayın"] },
    ],
    restrictions: ["Yalnızca fabrika kiosk ve üretim takibi modüllerine erişiminiz vardır.", "Yönetim ve raporlama modüllerine erişiminiz yoktur."],
  },

  fabrika_sorumlu: {
    roleKey: "fabrika_sorumlu",
    roleTitle: "Fabrika Sorumlu",
    roleDescription: "Fabrika kiosk sistemi üzerinden üretim takibi ve sorumluluk alanınızdaki işlemleri yönetirsiniz.",
    availableModules: [
      { name: "Fabrika Kiosk", description: "Giriş/çıkış ve üretim kayıtları", icon: "Tablet", path: "/fabrika/kiosk" },
      { name: "Fabrika Paneli", description: "Üretim durumu görüntüleme", icon: "Factory", path: "/fabrika/dashboard" },
    ],
    quickTips: [
      "Sorumlu olduğunuz alandaki üretimi düzenli takip edin.",
      "Vardiya giriş/çıkışlarını zamanında yapın.",
      "Sorunları hemen üst yönetime bildirin.",
    ],
    commonTasks: [
      { title: "Vardiya Girişi", steps: ["Fabrika Kiosk'a gidin", "PIN kodunuzu girin", "Vardiya girişini onaylayın"] },
    ],
    restrictions: ["Yalnızca fabrika kiosk modülüne erişiminiz vardır.", "Yönetim modüllerine erişiminiz yoktur."],
  },

  fabrika_personel: {
    roleKey: "fabrika_personel",
    roleTitle: "Fabrika Personel",
    roleDescription: "Fabrika kiosk sistemi üzerinden giriş/çıkış ve üretim takibi yaparsınız.",
    availableModules: [
      { name: "Fabrika Kiosk", description: "Giriş/çıkış ve üretim kayıtları", icon: "Tablet", path: "/fabrika/kiosk" },
    ],
    quickTips: [
      "Vardiya başında ve sonunda giriş/çıkış yapmayı unutmayın.",
      "Üretim kayıtlarını doğru girin.",
    ],
    commonTasks: [
      { title: "Vardiya Girişi", steps: ["Fabrika Kiosk'a gidin", "PIN kodunuzu girin", "Vardiya girişini onaylayın"] },
    ],
    restrictions: ["Yalnızca fabrika kiosk modülüne erişiminiz vardır."],
  },

  fabrika: {
    roleKey: "fabrika",
    roleTitle: "Fabrika",
    roleDescription: "Fabrika operasyonları ve üretim süreçlerinden sorumlusunuz.",
    availableModules: [
      { name: "Fabrika Paneli", description: "Fabrika genel durumu", icon: "Factory", path: "/fabrika/dashboard" },
      { name: "Fabrika Kiosk", description: "Giriş/çıkış sistemi", icon: "Tablet", path: "/fabrika/kiosk" },
    ],
    quickTips: [
      "Üretim süreçlerini düzenli takip edin.",
      "Kalite kontrol standartlarına uyun.",
    ],
    commonTasks: [
      { title: "Üretim Takibi", steps: ["Fabrika Paneli'ne gidin", "Günlük üretim verilerini inceleyin"] },
    ],
    restrictions: ["Yönetim modüllerine erişiminiz sınırlıdır."],
  },

  stajyer: {
    roleKey: "stajyer",
    roleTitle: "Stajyer",
    roleDescription: "Temel görev ve checklisti tamamlayabilir, kendi profilinizi görüntüleyebilirsiniz. Sınırlı erişim ile sisteme aşinalık kazanırsınız.",
    availableModules: [
      { name: "Ana Sayfa", description: "Günlük özet ve görevleriniz", icon: "Home", path: "/sube/dashboard" },
      { name: "Görevler", description: "Size atanan görevler", icon: "CheckSquare", path: "/gorevler" },
      { name: "Checklistler", description: "Tamamlamanız gereken checklistler", icon: "ClipboardList", path: "/checklistler" },
      { name: "Eğitim Akademisi", description: "Eğitim modülleri ve quizler", icon: "GraduationCap", path: "/akademi/*" },
    ],
    quickTips: [
      "Günlük görevlerinizi düzenli kontrol edin.",
      "Checklistleri zamanında tamamlayın.",
      "Eğitim modüllerini tamamlayarak gelişiminizi hızlandırın.",
      "Sorularınızı supervisorunuza iletin.",
    ],
    commonTasks: [
      { title: "Görev Tamamlama", steps: ["Görevler sayfasına gidin", "Size atanan görevi seçin", "Görevi tamamlayın ve durumu güncelleyin"] },
      { title: "Checklist Tamamlama", steps: ["Checklistler sayfasına gidin", "İlgili checklisti açın", "Maddeleri tek tek işaretleyin", "Tamamlandığında kaydedin"] },
    ],
    restrictions: ["Yönetim ve raporlama modüllerine erişiminiz yoktur.", "Personel bilgilerini düzenleyemezsiniz.", "Sadece size atanan görev ve checklistleri görebilirsiniz."],
  },

  barista: {
    roleKey: "barista",
    roleTitle: "Barista",
    roleDescription: "Günlük görevler, checklistler, reçeteler ve vardiya bilgilerinizi takip edebilirsiniz.",
    availableModules: [
      { name: "Ana Sayfa", description: "Günlük özet ve görevleriniz", icon: "Home", path: "/sube/dashboard" },
      { name: "Görevler", description: "Günlük görev listeniz", icon: "CheckSquare", path: "/gorevler" },
      { name: "Checklistler", description: "Açılış/kapanış ve diğer checklistler", icon: "ClipboardList", path: "/checklistler" },
      { name: "Reçeteler", description: "İçecek hazırlama reçeteleri", icon: "BookOpen", path: "/receteler" },
      { name: "Eğitim Akademisi", description: "Eğitim ve gelişim modülleri", icon: "GraduationCap", path: "/akademi/*" },
      { name: "Vardiyalarım", description: "Vardiya programınız", icon: "Calendar", path: "/vardiyalarim" },
    ],
    quickTips: [
      "Açılış ve kapanış checklistlerini eksiksiz tamamlayın.",
      "Reçeteleri standartlara uygun hazırlayın.",
      "Eğitim modüllerini tamamlayarak kariyer gelişiminizi hızlandırın.",
      "Vardiya programınızı düzenli kontrol edin.",
      "Arıza fark ettiğinizde hemen bildirin.",
    ],
    commonTasks: [
      { title: "Açılış Checklisti Tamamlama", steps: ["Checklistler sayfasına gidin", "Açılış checklistini seçin", "Tüm maddeleri kontrol edin ve işaretleyin", "Gerekli fotoğrafları yükleyin", "Checklisti tamamlayın"] },
      { title: "Reçete Kontrolü", steps: ["Reçeteler sayfasına gidin", "İlgili içecek reçetesini arayın", "Malzeme ve ölçüleri kontrol edin"] },
      { title: "Arıza Bildirimi", steps: ["Arıza sayfasına gidin", "Yeni Arıza butonuna tıklayın", "Ekipmanı seçin ve sorunu açıklayın", "Fotoğraf ekleyin ve gönderin"] },
    ],
    restrictions: ["Yönetim modüllerine erişiminiz yoktur.", "Personel bilgilerini düzenleyemezsiniz.", "Raporlara erişiminiz sınırlıdır."],
  },

  bar_buddy: {
    roleKey: "bar_buddy",
    roleTitle: "Bar Buddy",
    roleDescription: "Barista'ya yardımcı olarak görev ve checklistlerinizi tamamlarsınız.",
    availableModules: [
      { name: "Ana Sayfa", description: "Günlük özet ve görevleriniz", icon: "Home", path: "/sube/dashboard" },
      { name: "Görevler", description: "Size atanan görevler", icon: "CheckSquare", path: "/gorevler" },
      { name: "Checklistler", description: "Tamamlamanız gereken checklistler", icon: "ClipboardList", path: "/checklistler" },
      { name: "Eğitim Akademisi", description: "Eğitim modülleri", icon: "GraduationCap", path: "/akademi/*" },
    ],
    quickTips: [
      "Görevlerinizi zamanında tamamlayın.",
      "Checklistleri eksiksiz doldurun.",
      "Eğitim modüllerini tamamlayarak kendinizi geliştirin.",
    ],
    commonTasks: [
      { title: "Görev Tamamlama", steps: ["Görevler sayfasına gidin", "Size atanan görevi seçin", "Görevi tamamlayın ve durumu güncelleyin"] },
    ],
    restrictions: ["Yönetim modüllerine erişiminiz yoktur.", "Sınırlı erişim ile çalışırsınız."],
  },

  supervisor_buddy: {
    roleKey: "supervisor_buddy",
    roleTitle: "Supervisor Buddy",
    roleDescription: "Vardiya yardımcısı olarak temel operasyonel gözetim görevlerini yerine getirirsiniz.",
    availableModules: [
      { name: "Ana Sayfa", description: "Günlük özet ve görevleriniz", icon: "Home", path: "/sube/dashboard" },
      { name: "Görevler", description: "Görev yönetimi", icon: "CheckSquare", path: "/gorevler" },
      { name: "Checklistler", description: "Günlük checklistler", icon: "ClipboardList", path: "/checklistler" },
      { name: "Vardiyalarım", description: "Vardiya programınız", icon: "Calendar", path: "/vardiyalarim" },
    ],
    quickTips: [
      "Vardiya sürecinde ekibi destekleyin.",
      "Checklistleri zamanında tamamlayın.",
      "Sorunları supervisor'a raporlayın.",
    ],
    commonTasks: [
      { title: "Vardiya Desteği", steps: ["Ana sayfa'dan günlük görevleri kontrol edin", "Atanan görevleri tamamlayın", "Sorunları raporlayın"] },
    ],
    restrictions: ["Yönetim ve raporlama modüllerine erişiminiz yoktur.", "Personel yönetimi yetkiniz yoktur."],
  },

  supervisor: {
    roleKey: "supervisor",
    roleTitle: "Supervisor",
    roleDescription: "Şube operasyonları, ekip yönetimi, personel değerlendirmeleri ve vardiya planlamasından sorumlusunuz.",
    availableModules: [
      { name: "Ana Sayfa", description: "Şube günlük özeti", icon: "Home", path: "/sube/dashboard" },
      { name: "Görevler", description: "Görev oluşturma ve takip", icon: "CheckSquare", path: "/gorevler" },
      { name: "Checklistler", description: "Checklist yönetimi", icon: "ClipboardList", path: "/checklistler" },
      { name: "Vardiya Planlama", description: "Vardiya programı oluşturma", icon: "Calendar", path: "/vardiyalar" },
      { name: "İK Yönetimi", description: "Personel takibi ve değerlendirme", icon: "Users", path: "/ik" },
      { name: "Performans", description: "Ekip performans takibi", icon: "BarChart3", path: "/performans" },
      { name: "Ekipman", description: "Ekipman durumu ve arıza bildirimi", icon: "Wrench", path: "/ekipman" },
    ],
    quickTips: [
      "Günlük görev dağılımını vardiya başında yapın.",
      "Personel performansını düzenli değerlendirin.",
      "Checklistlerin tamamlanmasını takip edin.",
      "Ekipman arızalarını hemen bildirin.",
      "Vardiya geçişlerinde detaylı bilgi aktarımı yapın.",
    ],
    commonTasks: [
      { title: "Görev Atama", steps: ["Görevler sayfasına gidin", "Yeni Görev butonuna tıklayın", "Görevi tanımlayın ve personele atayın", "Öncelik ve son tarihi belirleyin"] },
      { title: "Vardiya Planı Oluşturma", steps: ["Vardiya Planlama'ya gidin", "İlgili haftayı seçin", "Personeli vardiyalara atayın", "Planı kaydedin"] },
      { title: "Personel Değerlendirmesi", steps: ["İK Yönetimi'ne gidin", "Personeli seçin", "Değerlendirme formunu doldurun"] },
    ],
    restrictions: ["Finans ve muhasebe modüllerine erişiminiz yoktur.", "Sistem ayarlarını değiştiremezsiniz."],
  },

  mudur: {
    roleKey: "mudur",
    roleTitle: "Şube Müdürü",
    roleDescription: "Şubenizin tüm operasyonlarını yönetirsiniz. Personel, ekipman, performans analizi ve İK işlemlerinden sorumlusunuz.",
    availableModules: [
      { name: "Ana Sayfa", description: "Şube günlük özeti ve kritik bilgiler", icon: "Home", path: "/sube/dashboard" },
      { name: "Görevler", description: "Görev oluşturma, atama ve takip", icon: "CheckSquare", path: "/gorevler" },
      { name: "Checklistler", description: "Tüm checklist yönetimi", icon: "ClipboardList", path: "/checklistler" },
      { name: "İK Yönetimi", description: "Şube personel yönetimi", icon: "Users", path: "/ik" },
      { name: "Vardiya Planlama", description: "Vardiya programı oluşturma ve düzenleme", icon: "Calendar", path: "/vardiyalar" },
      { name: "Ekipman & Bakım", description: "Ekipman takibi ve arıza yönetimi", icon: "Wrench", path: "/ekipman" },
      { name: "Performans", description: "Şube ve personel performans analizleri", icon: "BarChart3", path: "/performans" },
      { name: "Raporlar", description: "Şube raporları ve analizler", icon: "FileText", path: "/raporlar" },
    ],
    quickTips: [
      "Günlük açılış ve kapanış checklistlerini takip edin.",
      "Personel performansını haftalık değerlendirin.",
      "Ekipman bakım takvimini düzenli kontrol edin.",
      "Müşteri şikayetlerine hızlı yanıt verin.",
      "Vardiya planlarını en az bir hafta önceden hazırlayın.",
    ],
    commonTasks: [
      { title: "Günlük Şube Kontrolü", steps: ["Ana Sayfa'dan günlük özeti inceleyin", "Açık görevleri ve checklistleri kontrol edin", "Kritik uyarıları değerlendirin"] },
      { title: "Personel Yönetimi", steps: ["İK Yönetimi sayfasına gidin", "Personel listesini inceleyin", "İzin ve devam durumlarını kontrol edin"] },
      { title: "Aylık Performans Raporu", steps: ["Raporlar sayfasına gidin", "Performans raporunu seçin", "Tarih aralığını belirleyin", "Raporu inceleyin ve paylaşın"] },
    ],
    restrictions: ["Diğer şubelerin verilerine erişiminiz yoktur.", "Sistem ayarlarını değiştiremezsiniz."],
  },

  yatirimci_branch: {
    roleKey: "yatirimci_branch",
    roleTitle: "Şube Yatırımcısı",
    roleDescription: "Şubenizin performans ve finansal raporlarını görüntüleyebilirsiniz. Salt okunur erişim.",
    availableModules: [
      { name: "Ana Sayfa", description: "Şube performans özeti", icon: "Home", path: "/sube/dashboard" },
      { name: "Performans", description: "Şube performans metrikleri", icon: "BarChart3", path: "/performans" },
      { name: "Raporlar", description: "Finansal ve operasyonel raporlar", icon: "FileText", path: "/raporlar" },
    ],
    quickTips: [
      "Performans raporlarını düzenli takip edin.",
      "Aylık finansal verileri kontrol edin.",
      "Sorularınız için HQ Destek'e başvurabilirsiniz.",
    ],
    commonTasks: [
      { title: "Performans Raporu İnceleme", steps: ["Performans sayfasına gidin", "Şube metriklerini inceleyin", "Tarih bazlı karşılaştırmalar yapın"] },
    ],
    restrictions: ["Salt okunur erişiminiz vardır.", "Veri oluşturma ve düzenleme yetkiniz yoktur.", "Personel bilgilerine erişiminiz sınırlıdır."],
  },

  yatirimci_hq: {
    roleKey: "yatirimci_hq",
    roleTitle: "HQ Yatırımcı",
    roleDescription: "Çoklu şube performansını ve yatırım metriklerini takip edebilirsiniz.",
    availableModules: [
      { name: "Kontrol Paneli", description: "Genel performans özeti", icon: "LayoutDashboard", path: "/" },
      { name: "Şubeler", description: "Tüm şubelerin performans karşılaştırması", icon: "Building2", path: "/subeler" },
      { name: "Performans", description: "Performans analizleri ve trendler", icon: "BarChart3", path: "/performans" },
      { name: "Raporlar", description: "Detaylı raporlar ve analizler", icon: "FileText", path: "/raporlar" },
    ],
    quickTips: [
      "Şube performanslarını düzenli karşılaştırın.",
      "Aylık trend raporlarını takip edin.",
      "Yatırım getirisi metriklerini izleyin.",
    ],
    commonTasks: [
      { title: "Çoklu Şube Karşılaştırması", steps: ["Şubeler sayfasına gidin", "Karşılaştırmak istediğiniz şubeleri seçin", "Performans metriklerini inceleyin"] },
    ],
    restrictions: ["Salt okunur erişiminiz vardır.", "Operasyonel değişiklik yapma yetkiniz yoktur."],
  },
};

export function getRoleGuideContent(role: string): RoleGuideContent {
  const content = ROLE_GUIDE_CONTENT[role];
  if (content) return content;

  return {
    roleKey: role,
    roleTitle: role,
    roleDescription: "Bu rol için kılavuz içeriği henüz tanımlanmamıştır. Lütfen yöneticinize başvurun.",
    availableModules: [],
    quickTips: ["Sorularınız için HQ Destek'e başvurabilirsiniz."],
    commonTasks: [],
    restrictions: [],
  };
}
