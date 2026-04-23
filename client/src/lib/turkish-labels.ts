export const SIGNAL_CODE_LABELS: Record<string, string> = {
  high_waste: "Yüksek Fire",
  cold_chain_violation: "Soğuk Zincir İhlali",
  low_quiz_score: "Düşük Sınav Puanı",
  high_absence: "Yüksek Devamsızlık",
  late_checklist: "Geç Kontrol Listesi",
  product_complaint: "Ürün Şikayeti",
  gate_failure: "Kapı Başarısızlığı",
  hygiene_violation: "Hijyen İhlali",
  equipment_failure: "Ekipman Arızası",
  training_overdue: "Eğitim Gecikmesi",
  sla_breach: "SLA İhlali",
  stock_shortage: "Stok Eksikliği",
};

export const SEVERITY_LABELS: Record<string, string> = {
  critical: "Kritik",
  high: "Yüksek",
  medium: "Orta",
  low: "Düşük",
  warning: "Uyarı",
  info: "Bilgi",
};

export const PRIORITY_LABELS: Record<string, string> = {
  critical: "Kritik",
  high: "Yüksek",
  medium: "Orta",
  low: "Düşük",
};

export const AUDIT_CATEGORY_LABELS: Record<string, string> = {
  hijyen: "Hijyen",
  hizmet_kalitesi: "Hizmet Kalitesi",
  stok_yonetimi: "Stok Yönetimi",
  ekipman: "Ekipman",
  bilgi_testi: "Bilgi Testi",
  beceri_degerlendirme: "Beceri Değerlendirme",
  quality_audit: "Kalite Denetimi",
  food_safety: "Gıda Güvenliği",
  sicaklik: "Sıcaklık",
  su_kalitesi: "Su Kalitesi",
  depolama: "Depolama",
  pest_kontrol: "Pest Kontrol",
  kimyasal: "Kimyasal",
  genel: "Genel",
  personel: "Personel",
  musteri_hizmetleri: "Müşteri Hizmetleri",
  temizlik: "Temizlik",
  guvenlik: "Güvenlik",
};

export const CAPA_STATUS_LABELS: Record<string, string> = {
  OPEN: "Açık",
  IN_PROGRESS: "Devam Ediyor",
  PENDING_REVIEW: "İnceleme Bekliyor",
  PENDING_VERIFICATION: "Doğrulama Bekliyor",
  CLOSED: "Kapatıldı",
  OVERDUE: "Gecikmiş",
  ESCALATED: "Eskalasyon",
};

export const CAPA_TYPE_LABELS: Record<string, string> = {
  CORRECTIVE: "Düzeltici",
  PREVENTIVE: "Önleyici",
  IMMEDIATE: "Acil",
  MAINTENANCE: "Bakım",
  corrective_and_preventive: "Düzeltici ve Önleyici",
  corrective: "Düzeltici",
  preventive: "Önleyici",
  immediate: "Acil",
  maintenance: "Bakım",
};

export const STOCK_CATEGORY_LABELS: Record<string, string> = {
  hammadde: "Hammadde",
  yari_mamul: "Yarı Mamul",
  bitimis_urun: "Bitmiş Ürün",
  ticari_mal: "Ticari Mal",
  ambalaj: "Ambalaj",
  ekipman: "Ekipman",
  sube_ekipman: "Şube Ekipman",
  sube_malzeme: "Şube Malzeme",
  konsantre: "Konsantre",
  donut: "Donut",
  tatli: "Tatlı",
  tuzlu: "Tuzlu",
  cay_grubu: "Çay Grubu",
  kahve: "Kahve",
  toz_topping: "Toz/Topping",
  sarf_malzeme: "Sarf Malzeme",
  temizlik: "Temizlik",
  arge: "Ar-Ge",
  diger: "Diğer",
  kahve_cekirdegi: "Kahve Çekirdeği",
  sirop: "Sirop",
  sut_urunleri: "Süt Ürünleri",
  yarimamul: "Yarı Mamul",
  mamul: "Bitmiş Ürün",
};

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  giris: "Giriş",
  cikis: "Çıkış",
  sayim_duzeltme: "Sayım Düzeltme",
  fire: "Fire",
  iade: "İade",
  mal_kabul: "Mal Kabul",
  uretim_giris: "Üretimden Giriş",
  uretim_cikis: "Üretime Çıkış",
};

export const COUNT_TYPE_LABELS: Record<string, string> = {
  tam_sayim: "Tam Sayım",
  bitimis_urun: "Bitmiş Ürün Sayımı",
  hammadde: "Hammadde Sayımı",
  ambalaj: "Ambalaj Sayımı",
  ekipman: "Ekipman Sayımı",
};

const ALL_LABEL_MAPS: Record<string, string>[] = [
  SIGNAL_CODE_LABELS,
  SEVERITY_LABELS,
  PRIORITY_LABELS,
  AUDIT_CATEGORY_LABELS,
  CAPA_STATUS_LABELS,
  CAPA_TYPE_LABELS,
  STOCK_CATEGORY_LABELS,
  MOVEMENT_TYPE_LABELS,
  COUNT_TYPE_LABELS,
];

export function formatDisplayLabel(key: string | null | undefined): string {
  if (!key) return "";

  for (const map of ALL_LABEL_MAPS) {
    if (map[key]) return map[key];
  }

  const upperKey = key.toLocaleUpperCase('tr-TR');
  for (const map of ALL_LABEL_MAPS) {
    if (map[upperKey]) return map[upperKey];
  }

  const lowerKey = key.toLocaleLowerCase('tr-TR');
  for (const map of ALL_LABEL_MAPS) {
    if (map[lowerKey]) return map[lowerKey];
  }

  return key
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toLocaleUpperCase('tr-TR'))
    .replace(/\bSicaklik\b/gi, "Sıcaklık")
    .replace(/\bYuzey\b/gi, "Yüzey")
    .replace(/\bTemizligi\b/gi, "Temizliği")
    .replace(/\bKisisel\b/gi, "Kişisel")
    .replace(/\bAtik\b/gi, "Atık")
    .replace(/\bYonetimi\b/gi, "Yönetimi")
    .replace(/\bKontrolü\b/gi, "Kontrolü")
    .replace(/\bUrun\b/gi, "Ürün")
    .replace(/\bDenetimi\b/gi, "Denetimi")
    .replace(/\bGuvenligi\b/gi, "Güvenliği")
    .replace(/\bCalisma\b/gi, "Çalışma")
    .replace(/\bGecikmis\b/gi, "Gecikmiş")
    .replace(/\bPlanlandi\b/gi, "Planlandı")
    .replace(/\bTamamlandi\b/gi, "Tamamlandı");
}

export const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  ceo: "CEO",
  cgo: "CGO",
  muhasebe_ik: "Muhasebe & İK",
  satinalma: "Satın Alma",
  coach: "Koç",
  marketing: "Pazarlama",
  trainer: "Eğitmen",
  kalite_kontrol: "Kalite Kontrol",
  fabrika_mudur: "Fabrika Müdürü",
  muhasebe: "Muhasebe",
  teknik: "Teknik",
  destek: "Destek",
  fabrika: "Fabrika",
  yatirimci_hq: "Yatırımcı Merkez",
  stajyer: "Stajyer",
  bar_buddy: "Bar Yardımcısı",
  barista: "Barista",
  supervisor_buddy: "Süpervizör Yardımcısı",
  supervisor: "Süpervizör",
  mudur: "Müdür",
  yatirimci_branch: "Yatırımcı Şube",
  fabrika_operator: "Fabrika Operatörü",
  fabrika_sorumlu: "Fabrika Sorumlusu",
  fabrika_personel: "Fabrika Personeli",
  gida_muhendisi: "Gıda Mühendisi",
};

export const ALERT_TYPE_LABELS: Record<string, string> = {
  fault: "Arıza",
  hr: "İK",
  performance: "Performans",
  equipment: "Ekipman",
};

const MONTH_SHORT_TR: Record<string, string> = {
  "01": "Oca", "02": "Şub", "03": "Mar", "04": "Nis",
  "05": "May", "06": "Haz", "07": "Tem", "08": "Ağu",
  "09": "Eyl", "10": "Eki", "11": "Kas", "12": "Ara",
};

export function formatTurkishDate(dateStr: string): string {
  if (!dateStr) return dateStr;
  const parts = dateStr.split("-");
  if (parts.length === 2) {
    return `${MONTH_SHORT_TR[parts[1]] || parts[1]} ${parts[0]}`;
  }
  if (parts.length === 3) {
    return `${parseInt(parts[2])} ${MONTH_SHORT_TR[parts[1]] || parts[1]} ${parts[0]}`;
  }
  return dateStr;
}
