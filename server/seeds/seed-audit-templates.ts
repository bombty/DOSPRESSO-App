import { db } from "../db";
import { auditTemplates, auditTemplateItems } from "@shared/schema";
import { and, eq } from "drizzle-orm";

// ── Seed: DOSPRESSO Denetim Şablonları ──
// 6 ana şablon, ~175 madde

type SeedItem = {
  itemText: string;
  itemType: "checkbox" | "rating" | "text" | "photo" | "number";
  section: string;
  weight?: string;
  sortOrder: number;
  requiresPhoto?: boolean;
  maxPoints?: number;
  aiPrompt?: string;
};

const TEMPLATES: {
  title: string;
  description: string;
  auditType: string;
  category: string;
  items: SeedItem[];
}[] = [
  // ═══════════════════════════════════════════
  // 1. TAM ŞUBE DENETİMİ
  // ═══════════════════════════════════════════
  {
    title: "Tam Şube Denetimi",
    description: "Coach/Trainer tarafından yapılan kapsamlı şube denetimi. Tüm alanları kapsar. Süre: 60-90 dk.",
    auditType: "branch",
    category: "comprehensive",
    items: [
      // ── DIŞ MEKAN ──
      { itemText: "Dış cephe genel görünüm (boya, kaplama, temizlik)", itemType: "rating", section: "dis_mekan", sortOrder: 1, requiresPhoto: true, maxPoints: 10 },
      { itemText: "Tabela ışığı yanıyor mu?", itemType: "checkbox", section: "dis_mekan", sortOrder: 2, requiresPhoto: true, maxPoints: 10 },
      { itemText: "Tabela temiz ve hasarsız mı?", itemType: "checkbox", section: "dis_mekan", sortOrder: 3, maxPoints: 10 },
      { itemText: "Dış alan masa/sandalye düzeni ve temizliği", itemType: "rating", section: "dis_mekan", sortOrder: 4, maxPoints: 10 },
      { itemText: "Camlar temiz mi? Kırık/çatlak var mı?", itemType: "checkbox", section: "dis_mekan", sortOrder: 5, requiresPhoto: true, maxPoints: 10 },
      { itemText: "Kırık, bozulmuş veya tehlike arz eden mobilya var mı?", itemType: "checkbox", section: "dis_mekan", sortOrder: 6, requiresPhoto: true, maxPoints: 10 },
      { itemText: "Giriş kapısı sorunsuz çalışıyor mu?", itemType: "checkbox", section: "dis_mekan", sortOrder: 7, maxPoints: 10 },
      { itemText: "Dış alanda menü panosu ve güncel fiyatlar mevcut mu?", itemType: "checkbox", section: "dis_mekan", sortOrder: 8, requiresPhoto: true, maxPoints: 10 },
      { itemText: "Engelli rampa/erişim uygun mu?", itemType: "checkbox", section: "dis_mekan", sortOrder: 9, maxPoints: 10 },

      // ── TEŞHİR & SATIŞ ──
      { itemText: "Teşhir dolabında olması gereken ürünler sunuluyor mu?", itemType: "checkbox", section: "teshir_satis", sortOrder: 10, requiresPhoto: true, maxPoints: 10 },
      { itemText: "Ürün sunumu ve düzeni standarda uygun mu?", itemType: "rating", section: "teshir_satis", sortOrder: 11, requiresPhoto: true, maxPoints: 10 },
      { itemText: "Raf temizliği", itemType: "rating", section: "teshir_satis", sortOrder: 12, maxPoints: 10 },
      { itemText: "Kasa önü satış ürünleri mevcut mu?", itemType: "checkbox", section: "teshir_satis", sortOrder: 13, maxPoints: 10 },
      { itemText: "Allerjen bilgi kartları görünür yerde mi?", itemType: "checkbox", section: "teshir_satis", sortOrder: 14, maxPoints: 10 },
      { itemText: "Checkout bölümü malzemeleri tam ve temiz mi?", itemType: "rating", section: "teshir_satis", sortOrder: 15, maxPoints: 10 },

      // ── TEKNOLOJİ ──
      { itemText: "Kasa sistemi sorunsuz çalışıyor mu?", itemType: "checkbox", section: "teknoloji", sortOrder: 16, maxPoints: 10 },
      { itemText: "Kiosk sistemi sorunsuz çalışıyor mu?", itemType: "checkbox", section: "teknoloji", sortOrder: 17, maxPoints: 10 },
      { itemText: "Müşteri ekranı çalışıyor mu?", itemType: "checkbox", section: "teknoloji", sortOrder: 18, maxPoints: 10 },
      { itemText: "Menü ekranları güncel ve okunabilir mi?", itemType: "checkbox", section: "teknoloji", sortOrder: 19, requiresPhoto: true, maxPoints: 10 },
      { itemText: "Yazıcılar (fiş/etiket) çalışıyor mu?", itemType: "checkbox", section: "teknoloji", sortOrder: 20, maxPoints: 10 },
      { itemText: "Güvenlik kameraları çalışıyor mu?", itemType: "checkbox", section: "teknoloji", sortOrder: 21, maxPoints: 10 },

      // ── FOOD STATION ──
      { itemText: "Teşhir dolabı donut bölümü sıcaklığı (16-22°C)", itemType: "number", section: "bar_food", sortOrder: 22, maxPoints: 10 },
      { itemText: "Sandviç/pasta dolabı sıcaklığı (2-7°C)", itemType: "number", section: "bar_food", sortOrder: 23, maxPoints: 10 },
      { itemText: "Teşhir dolabı ışıkları yanıyor mu?", itemType: "checkbox", section: "bar_food", sortOrder: 24, maxPoints: 10 },
      { itemText: "Fırın temiz mi?", itemType: "checkbox", section: "bar_food", sortOrder: 25, requiresPhoto: true, maxPoints: 10 },
      { itemText: "Fırın ön ayarları doğru mu?", itemType: "text", section: "bar_food", sortOrder: 26, maxPoints: 10 },
      { itemText: "Derin dondurucu sıcaklığı (-15 ile -22°C)", itemType: "number", section: "bar_food", sortOrder: 27, maxPoints: 10 },
      { itemText: "Food station SKT/STT kontrolleri", itemType: "checkbox", section: "bar_food", sortOrder: 28, requiresPhoto: true, maxPoints: 10 },

      // ── COFFEE STATION ──
      { itemText: "1. Espresso makinası kalibrasyon durumu", itemType: "rating", section: "bar_coffee", sortOrder: 29, maxPoints: 10 },
      { itemText: "1. Makina — tek shot espresso süresi (25-30 sn)", itemType: "number", section: "bar_coffee", sortOrder: 30, maxPoints: 10 },
      { itemText: "1. Makina — double shot espresso süresi (25-30 sn)", itemType: "number", section: "bar_coffee", sortOrder: 31, maxPoints: 10 },
      { itemText: "1. Makina — lezzet/tat değerlendirmesi", itemType: "rating", section: "bar_coffee", sortOrder: 32, maxPoints: 10 },
      { itemText: "2. Espresso makinası kalibrasyon durumu", itemType: "rating", section: "bar_coffee", sortOrder: 33, maxPoints: 10 },
      { itemText: "2. Makina — tek shot espresso süresi (25-30 sn)", itemType: "number", section: "bar_coffee", sortOrder: 34, maxPoints: 10 },
      { itemText: "2. Makina — double shot espresso süresi (25-30 sn)", itemType: "number", section: "bar_coffee", sortOrder: 35, maxPoints: 10 },
      { itemText: "2. Makina — lezzet/tat değerlendirmesi", itemType: "rating", section: "bar_coffee", sortOrder: 36, maxPoints: 10 },
      { itemText: "Şurup baz grupları tam ve SKT uygun mu?", itemType: "checkbox", section: "bar_coffee", sortOrder: 37, maxPoints: 10 },
      { itemText: "Buz hazneleri dolu mu?", itemType: "checkbox", section: "bar_coffee", sortOrder: 38, maxPoints: 10 },
      { itemText: "Makinalar temiz mi? Günlük bakım yapılmış mı?", itemType: "checkbox", section: "bar_coffee", sortOrder: 39, requiresPhoto: true, maxPoints: 10 },

      // ── TEA STATION ──
      { itemText: "Çay makinası çalışıyor mu?", itemType: "checkbox", section: "bar_tea", sortOrder: 40, maxPoints: 10 },
      { itemText: "Çay makinası su sıcaklığı (92-94°C)", itemType: "number", section: "bar_tea", sortOrder: 41, maxPoints: 10 },
      { itemText: "Filtre kahve makinası hazır mı? Eksik/kırık var mı?", itemType: "checkbox", section: "bar_tea", sortOrder: 42, maxPoints: 10 },
      { itemText: "Demleme setup'ları standarda uygun mu?", itemType: "checkbox", section: "bar_tea", sortOrder: 43, maxPoints: 10 },

      // ── CREAMICE STATION ──
      { itemText: "Blender'ler çalışıyor ve temiz mi?", itemType: "checkbox", section: "bar_creamice", sortOrder: 44, maxPoints: 10 },
      { itemText: "Blender hazneleri sorunsuz mu?", itemType: "checkbox", section: "bar_creamice", sortOrder: 45, maxPoints: 10 },
      { itemText: "Blender önünde olması gereken malzemeler tam mı?", itemType: "checkbox", section: "bar_creamice", sortOrder: 46, maxPoints: 10 },
      { itemText: "Toz grupları tam mı? SKT kontrol", itemType: "checkbox", section: "bar_creamice", sortOrder: 47, maxPoints: 10 },

      // ── BAR GENEL ──
      { itemText: "Kasa alanı temiz mi?", itemType: "checkbox", section: "bar_genel", sortOrder: 48, maxPoints: 10 },
      { itemText: "1. Buzdolabı temizliği", itemType: "rating", section: "bar_genel", sortOrder: 49, maxPoints: 10 },
      { itemText: "1. Buzdolabı sıcaklığı (2-6°C)", itemType: "number", section: "bar_genel", sortOrder: 50, maxPoints: 10 },
      { itemText: "2. Buzdolabı temizliği", itemType: "rating", section: "bar_genel", sortOrder: 51, maxPoints: 10 },
      { itemText: "2. Buzdolabı sıcaklığı (2-6°C)", itemType: "number", section: "bar_genel", sortOrder: 52, maxPoints: 10 },
      { itemText: "Tezgah altı dondurucu sıcaklığı (-15 ile -22°C)", itemType: "number", section: "bar_genel", sortOrder: 53, maxPoints: 10 },
      { itemText: "Lavabo/evye temiz mi?", itemType: "checkbox", section: "bar_genel", sortOrder: 54, maxPoints: 10 },
      { itemText: "Bar içi SKT/STT kontrolleri tamamlandı mı?", itemType: "checkbox", section: "bar_genel", sortOrder: 55, requiresPhoto: true, maxPoints: 10 },

      // ── DEPO ──
      { itemText: "Kullanıt malzeme yeterliliği", itemType: "checkbox", section: "depo", sortOrder: 56, maxPoints: 10 },
      { itemText: "Gıda raf düzeni standarda uygun mu?", itemType: "rating", section: "depo", sortOrder: 57, requiresPhoto: true, maxPoints: 10 },
      { itemText: "Gıda raflarında FIFO uygulanmış mı?", itemType: "checkbox", section: "depo", sortOrder: 58, maxPoints: 10 },
      { itemText: "Şurup raf sistemi düzenli ve FIFO uygun mu?", itemType: "checkbox", section: "depo", sortOrder: 59, maxPoints: 10 },
      { itemText: "Kahve/toz grupları raf düzeni", itemType: "rating", section: "depo", sortOrder: 60, maxPoints: 10 },
      { itemText: "Tehlike arz eden yerleşim var mı?", itemType: "checkbox", section: "depo", sortOrder: 61, requiresPhoto: true, maxPoints: 10 },
      { itemText: "-18°C soğuk hava deposu sıcaklığı (-15 ile -22°C)", itemType: "number", section: "depo", sortOrder: 62, maxPoints: 10 },
      { itemText: "+4°C dolabı sıcaklığı (2-6°C)", itemType: "number", section: "depo", sortOrder: 63, maxPoints: 10 },
      { itemText: "Tüm gıda ürünlerinde SKT/STT kontrolleri", itemType: "checkbox", section: "depo", sortOrder: 64, requiresPhoto: true, maxPoints: 10 },
      { itemText: "Süresi geçmiş ürün var mı?", itemType: "checkbox", section: "depo", sortOrder: 65, requiresPhoto: true, maxPoints: 10 },
      { itemText: "Depo zemin temizliği", itemType: "rating", section: "depo", sortOrder: 66, maxPoints: 10 },
      { itemText: "Buz makinası ağzı kapalı mı?", itemType: "checkbox", section: "depo", sortOrder: 67, maxPoints: 10 },
      { itemText: "Buz kalitesi (şeffaf=iyi, puslu/kırık=kötü)", itemType: "rating", section: "depo", sortOrder: 68, requiresPhoto: true, maxPoints: 10 },
      { itemText: "Su filtresi son değişim tarihi", itemType: "text", section: "depo", sortOrder: 69, maxPoints: 10 },
      { itemText: "Pest kontrol — haşere belirtisi var mı?", itemType: "checkbox", section: "depo", sortOrder: 70, maxPoints: 10 },

      // ── SUPERVİSOR ALANI ──
      { itemText: "Supervisor masası düzenli ve temiz mi?", itemType: "rating", section: "supervisor", sortOrder: 71, maxPoints: 10 },
      { itemText: "İK evrakları kilitli dolapta mı?", itemType: "checkbox", section: "supervisor", sortOrder: 72, maxPoints: 10 },
      { itemText: "Fatura giriş/çıkış dosyaları düzenli mi?", itemType: "checkbox", section: "supervisor", sortOrder: 73, maxPoints: 10 },
      { itemText: "Müzik lisans belgeleri mevcut ve güncel mi?", itemType: "checkbox", section: "supervisor", sortOrder: 74, maxPoints: 10 },
      { itemText: "Tüm personellerin sigorta giriş bildirgesi var mı?", itemType: "checkbox", section: "supervisor", sortOrder: 75, maxPoints: 10 },
      { itemText: "Vardiya çizelgesi asılı/görünür mü?", itemType: "checkbox", section: "supervisor", sortOrder: 76, maxPoints: 10 },

      // ── İÇ MEKAN ──
      { itemText: "İç mekan mobilya kontrolü (kırık, dökük, bozuk)", itemType: "checkbox", section: "ic_mekan", sortOrder: 77, requiresPhoto: true, maxPoints: 10 },
      { itemText: "Genel iç mekan temizliği", itemType: "rating", section: "ic_mekan", sortOrder: 78, maxPoints: 10 },
      { itemText: "Misafir açısından rahat bir ortam mı?", itemType: "rating", section: "ic_mekan", sortOrder: 79, maxPoints: 10 },
      { itemText: "Aydınlatma sistemi — patlamış ampül/bozuk aplik?", itemType: "checkbox", section: "ic_mekan", sortOrder: 80, maxPoints: 10 },
      { itemText: "Çatıdan akma/sızma var mı?", itemType: "checkbox", section: "ic_mekan", sortOrder: 81, requiresPhoto: true, maxPoints: 10 },
      { itemText: "Ses sistemi doğru ayarda mı? Merkez playlist çalıyor mu?", itemType: "checkbox", section: "ic_mekan", sortOrder: 82, maxPoints: 10 },
      { itemText: "Klima/ısıtma sistemi çalışıyor mu?", itemType: "checkbox", section: "ic_mekan", sortOrder: 83, maxPoints: 10 },

      // ── TUVALET ERKEK ──
      { itemText: "Erkek tuvalet — genel temizlik", itemType: "rating", section: "tuvalet_erkek", sortOrder: 84, requiresPhoto: true, maxPoints: 10 },
      { itemText: "Erkek tuvalet — sabun, kağıt havlu, el kurutma mevcut mu?", itemType: "checkbox", section: "tuvalet_erkek", sortOrder: 85, maxPoints: 10 },
      { itemText: "Erkek tuvalet — klozet/kapı/aydınlatma sorunsuz mu?", itemType: "checkbox", section: "tuvalet_erkek", sortOrder: 86, maxPoints: 10 },
      { itemText: "Erkek tuvalet — koku sorunu var mı?", itemType: "checkbox", section: "tuvalet_erkek", sortOrder: 87, maxPoints: 10 },

      // ── TUVALET KADIN ──
      { itemText: "Kadın tuvalet — genel temizlik", itemType: "rating", section: "tuvalet_kadin", sortOrder: 88, requiresPhoto: true, maxPoints: 10 },
      { itemText: "Kadın tuvalet — sabun, kağıt havlu, el kurutma mevcut mu?", itemType: "checkbox", section: "tuvalet_kadin", sortOrder: 89, maxPoints: 10 },
      { itemText: "Kadın tuvalet — klozet/kapı/aydınlatma sorunsuz mu?", itemType: "checkbox", section: "tuvalet_kadin", sortOrder: 90, maxPoints: 10 },
      { itemText: "Kadın tuvalet — hijyenik ped çöp kutusu mevcut mu?", itemType: "checkbox", section: "tuvalet_kadin", sortOrder: 91, maxPoints: 10 },

      // ── GÜVENLİK & YASAL ──
      { itemText: "İlk yardım çantası mevcut ve eksiksiz mi?", itemType: "checkbox", section: "guvenlik", sortOrder: 92, requiresPhoto: true, maxPoints: 10 },
      { itemText: "Yangın söndürücüler yerinde ve dolum tarihi geçerli mi?", itemType: "checkbox", section: "guvenlik", sortOrder: 93, requiresPhoto: true, maxPoints: 10 },
      { itemText: "Acil çıkış yolları açık ve işaretli mi?", itemType: "checkbox", section: "guvenlik", sortOrder: 94, requiresPhoto: true, maxPoints: 10 },
      { itemText: "İSG panosu güncel mi?", itemType: "checkbox", section: "guvenlik", sortOrder: 95, maxPoints: 10 },
    ],
  },

  // ═══════════════════════════════════════════
  // 2. PERSONEL DEĞERLENDİRME
  // ═══════════════════════════════════════════
  {
    title: "Personel Değerlendirme",
    description: "Bireysel personel denetimi. Güler yüz %30 ağırlıkla en kritik kriter. Her personel için ayrı doldurulur.",
    auditType: "personnel",
    category: "personnel",
    items: [
      // ── MİSAFİR DENEYİMİ & GÜLER YÜZ (%30) ──
      { itemText: "⭐ Güler yüzlü mü? Samimi ve sıcak bir tavır sergiliyor mu?", itemType: "rating", section: "guler_yuz", weight: "30", sortOrder: 1, maxPoints: 10 },
      { itemText: "Misafiri kapıda/kasada selamlıyor mu?", itemType: "rating", section: "guler_yuz", sortOrder: 2, maxPoints: 10 },
      { itemText: "Sipariş alırken sabırlı ve yardımcı mı?", itemType: "rating", section: "guler_yuz", sortOrder: 3, maxPoints: 10 },
      { itemText: "Ürün sunumunda 'Afiyet olsun' diyor mu?", itemType: "checkbox", section: "guler_yuz", sortOrder: 4, maxPoints: 10 },
      { itemText: "Misafir ayrılırken vedalaşıyor mu?", itemType: "checkbox", section: "guler_yuz", sortOrder: 5, maxPoints: 10 },
      { itemText: "Zor/sinirli müşteriye yaklaşımı nasıl?", itemType: "rating", section: "guler_yuz", sortOrder: 6, maxPoints: 10 },
      { itemText: "Misafir şikayetine profesyonel yaklaşım", itemType: "rating", section: "guler_yuz", sortOrder: 7, maxPoints: 10 },

      // ── ÜRÜN BİLGİSİ (%25) ──
      { itemText: "Menüdeki ürünleri tanıyor mu? (rastgele 3 ürün sor)", itemType: "rating", section: "urun_bilgisi", weight: "25", sortOrder: 8, maxPoints: 10 },
      { itemText: "Ürün içeriklerini/allerjen bilgisini biliyor mu?", itemType: "rating", section: "urun_bilgisi", sortOrder: 9, maxPoints: 10 },
      { itemText: "Ürün önerisi yapabiliyor mu?", itemType: "rating", section: "urun_bilgisi", sortOrder: 10, maxPoints: 10 },
      { itemText: "Upselling yapıyor mu?", itemType: "checkbox", section: "urun_bilgisi", sortOrder: 11, maxPoints: 10 },
      { itemText: "Espresso ayar bilgisi (shot süresi, öğütme)", itemType: "rating", section: "urun_bilgisi", sortOrder: 12, maxPoints: 10 },
      { itemText: "Son reçete değişikliklerini biliyor mu?", itemType: "checkbox", section: "urun_bilgisi", sortOrder: 13, maxPoints: 10 },
      { itemText: "Kasa kullanım yetkinliği", itemType: "rating", section: "urun_bilgisi", sortOrder: 14, maxPoints: 10 },

      // ── DRESS CODE & KİŞİSEL BAKIM (%15) ──
      { itemText: "DOSPRESSO üniforması giyiyor mu?", itemType: "checkbox", section: "dress_code", weight: "15", sortOrder: 15, requiresPhoto: true, maxPoints: 10 },
      { itemText: "Üniforma temiz ve ütülü mü?", itemType: "checkbox", section: "dress_code", sortOrder: 16, maxPoints: 10 },
      { itemText: "İsimlik takıyor mu?", itemType: "checkbox", section: "dress_code", sortOrder: 17, maxPoints: 10 },
      { itemText: "Ayakkabı uygun mu? (kapalı, kaymaz, temiz)", itemType: "checkbox", section: "dress_code", sortOrder: 18, maxPoints: 10 },
      { itemText: "Saç bakımı — uzun saçlar toplanmış mı?", itemType: "checkbox", section: "dress_code", sortOrder: 19, maxPoints: 10 },
      { itemText: "Sakal/bıyık düzenli ve bakımlı mı?", itemType: "checkbox", section: "dress_code", sortOrder: 20, maxPoints: 10 },
      { itemText: "Tırnak kısa, temiz, ojeli değil mi?", itemType: "checkbox", section: "dress_code", sortOrder: 21, maxPoints: 10 },
      { itemText: "Takı kuralı — yüzük (evlilik hariç), bilezik, piercing yok mu?", itemType: "checkbox", section: "dress_code", sortOrder: 22, maxPoints: 10 },
      { itemText: "Parfüm/koku aşırı değil mi?", itemType: "checkbox", section: "dress_code", sortOrder: 23, maxPoints: 10 },

      // ── HİJYEN KURALLARI (%10) ──
      { itemText: "El yıkama sıklığı yeterli mi?", itemType: "rating", section: "hijyen", weight: "10", sortOrder: 24, maxPoints: 10 },
      { itemText: "Eldiven gerektiğinde kullanıyor mu?", itemType: "checkbox", section: "hijyen", sortOrder: 25, maxPoints: 10 },
      { itemText: "Yiyeceklere çıplak elle dokunmuyor mu?", itemType: "checkbox", section: "hijyen", sortOrder: 26, maxPoints: 10 },
      { itemText: "Bar içinde kişisel telefon kullanıyor mu?", itemType: "checkbox", section: "hijyen", sortOrder: 27, maxPoints: 10 },
      { itemText: "Bardak/kupayı üst kısmından tutmuyor mu?", itemType: "checkbox", section: "hijyen", sortOrder: 28, maxPoints: 10 },

      // ── TAKIM RUHU (%15) ──
      { itemText: "Ekip arkadaşlarıyla iletişimi olumlu mu?", itemType: "rating", section: "takim_ruhu", weight: "15", sortOrder: 29, maxPoints: 10 },
      { itemText: "Yardımlaşma — iş yoğunluğunda destek oluyor mu?", itemType: "rating", section: "takim_ruhu", sortOrder: 30, maxPoints: 10 },
      { itemText: "İstasyon devir teslimini düzgün yapıyor mu?", itemType: "checkbox", section: "takim_ruhu", sortOrder: 31, maxPoints: 10 },
      { itemText: "Proaktif mi? (boş durmuyor, iş arıyor)", itemType: "rating", section: "takim_ruhu", sortOrder: 32, maxPoints: 10 },
      { itemText: "Stres altında sakin kalabiliyor mu?", itemType: "rating", section: "takim_ruhu", sortOrder: 33, maxPoints: 10 },
      { itemText: "Yeni ekip arkadaşına yardımcı mı?", itemType: "checkbox", section: "takim_ruhu", sortOrder: 34, maxPoints: 10 },
      { itemText: "Supervisor/müdür talimatlarına uyuyor mu?", itemType: "checkbox", section: "takim_ruhu", sortOrder: 35, maxPoints: 10 },

      // ── GELİŞİM (%5) ──
      { itemText: "Eğitimlere katılım durumu", itemType: "checkbox", section: "gelisim", weight: "5", sortOrder: 36, maxPoints: 10 },
      { itemText: "Öğrenme isteği var mı?", itemType: "rating", section: "gelisim", sortOrder: 37, maxPoints: 10 },
      { itemText: "Geri bildirime açık mı?", itemType: "rating", section: "gelisim", sortOrder: 38, maxPoints: 10 },
      { itemText: "İyileştirme önerisi sunuyor mu?", itemType: "checkbox", section: "gelisim", sortOrder: 39, maxPoints: 10 },
      { itemText: "Genel motivasyon ve enerji seviyesi", itemType: "rating", section: "gelisim", sortOrder: 40, maxPoints: 10 },
    ],
  },

  // ═══════════════════════════════════════════
  // 3. GÜNLÜK AÇILIŞ KONTROLÜ
  // ═══════════════════════════════════════════
  {
    title: "Günlük Açılış Kontrolü",
    description: "Supervisor tarafından her sabah yapılan hızlı kontrol. Sıcaklıklar ve temel hazırlık. Süre: 10-15 dk.",
    auditType: "branch",
    category: "daily_opening",
    items: [
      { itemText: "Teşhir dolabı donut bölümü sıcaklığı (16-22°C)", itemType: "number", section: "sicaklik", sortOrder: 1, maxPoints: 10 },
      { itemText: "Sandviç/pasta dolabı sıcaklığı (2-7°C)", itemType: "number", section: "sicaklik", sortOrder: 2, maxPoints: 10 },
      { itemText: "1. Buzdolabı sıcaklığı (2-6°C)", itemType: "number", section: "sicaklik", sortOrder: 3, maxPoints: 10 },
      { itemText: "2. Buzdolabı sıcaklığı (2-6°C)", itemType: "number", section: "sicaklik", sortOrder: 4, maxPoints: 10 },
      { itemText: "Tezgah altı dondurucu sıcaklığı (-15 ile -22°C)", itemType: "number", section: "sicaklik", sortOrder: 5, maxPoints: 10 },
      { itemText: "Derin dondurucu sıcaklığı (-15 ile -22°C)", itemType: "number", section: "sicaklik", sortOrder: 6, maxPoints: 10 },
      { itemText: "Çay makinası su sıcaklığı (92-94°C)", itemType: "number", section: "sicaklik", sortOrder: 7, maxPoints: 10 },
      { itemText: "1. Espresso makinası — tek shot süresi (25-30 sn)", itemType: "number", section: "kalibrasyon", sortOrder: 8, maxPoints: 10 },
      { itemText: "2. Espresso makinası — tek shot süresi (25-30 sn)", itemType: "number", section: "kalibrasyon", sortOrder: 9, maxPoints: 10 },
      { itemText: "Teşhir dolabında ürünler hazır mı?", itemType: "checkbox", section: "hazirlik", sortOrder: 10, maxPoints: 10 },
      { itemText: "Buz hazneleri dolu mu?", itemType: "checkbox", section: "hazirlik", sortOrder: 11, maxPoints: 10 },
      { itemText: "Kasa ve kiosk sistemi açık ve çalışıyor mu?", itemType: "checkbox", section: "hazirlik", sortOrder: 12, maxPoints: 10 },
      { itemText: "Bar içi genel temizlik uygun mu?", itemType: "checkbox", section: "hazirlik", sortOrder: 13, maxPoints: 10 },
      { itemText: "SKT yaklaşan ürün var mı?", itemType: "checkbox", section: "hazirlik", sortOrder: 14, maxPoints: 10 },
    ],
  },

  // ═══════════════════════════════════════════
  // 4. HİJYEN & GIDA GÜVENLİĞİ
  // ═══════════════════════════════════════════
  {
    title: "Hijyen & Gıda Güvenliği Denetimi",
    description: "HACCP odaklı gıda güvenliği denetimi. Sıcaklık kontrolleri, SKT, cross-kontaminasyon. Süre: 20-30 dk.",
    auditType: "branch",
    category: "food_safety",
    items: [
      { itemText: "Teşhir dolabı donut sıcaklığı (16-22°C)", itemType: "number", section: "sicaklik", sortOrder: 1, maxPoints: 10 },
      { itemText: "Sandviç/pasta dolabı sıcaklığı (2-7°C)", itemType: "number", section: "sicaklik", sortOrder: 2, maxPoints: 10 },
      { itemText: "1. Buzdolabı sıcaklığı (2-6°C)", itemType: "number", section: "sicaklik", sortOrder: 3, maxPoints: 10 },
      { itemText: "2. Buzdolabı sıcaklığı (2-6°C)", itemType: "number", section: "sicaklik", sortOrder: 4, maxPoints: 10 },
      { itemText: "Dondurucu sıcaklığı (-15 ile -22°C)", itemType: "number", section: "sicaklik", sortOrder: 5, maxPoints: 10 },
      { itemText: "-18°C soğuk hava deposu (-15 ile -22°C)", itemType: "number", section: "sicaklik", sortOrder: 6, maxPoints: 10 },
      { itemText: "+4°C çözündürme dolabı (2-6°C)", itemType: "number", section: "sicaklik", sortOrder: 7, maxPoints: 10 },
      { itemText: "Bar içi SKT/STT kontrolleri", itemType: "checkbox", section: "skt", sortOrder: 8, requiresPhoto: true, maxPoints: 10 },
      { itemText: "Depo SKT/STT kontrolleri", itemType: "checkbox", section: "skt", sortOrder: 9, requiresPhoto: true, maxPoints: 10 },
      { itemText: "Süresi geçmiş ürün var mı?", itemType: "checkbox", section: "skt", sortOrder: 10, requiresPhoto: true, maxPoints: 10 },
      { itemText: "FIFO uygulanıyor mu? (bar + depo)", itemType: "checkbox", section: "fifo", sortOrder: 11, maxPoints: 10 },
      { itemText: "Cross-kontaminasyon riski var mı? (çiğ/pişmiş)", itemType: "checkbox", section: "hijyen", sortOrder: 12, maxPoints: 10 },
      { itemText: "Personel el yıkama kurallara uygun mu?", itemType: "checkbox", section: "hijyen", sortOrder: 13, maxPoints: 10 },
      { itemText: "Eldiven kullanımı uygun mu?", itemType: "checkbox", section: "hijyen", sortOrder: 14, maxPoints: 10 },
      { itemText: "Buz kalitesi (şeffaf=iyi)", itemType: "rating", section: "hijyen", sortOrder: 15, maxPoints: 10 },
      { itemText: "Su filtresi son değişim tarihi", itemType: "text", section: "hijyen", sortOrder: 16, maxPoints: 10 },
      { itemText: "Pest kontrol — haşere belirtisi?", itemType: "checkbox", section: "hijyen", sortOrder: 17, maxPoints: 10 },
      { itemText: "Allerjen bilgi kartları mevcut mu?", itemType: "checkbox", section: "hijyen", sortOrder: 18, maxPoints: 10 },
    ],
  },

  // ═══════════════════════════════════════════
  // 5. EKİPMAN DENETİMİ
  // ═══════════════════════════════════════════
  {
    title: "Ekipman Denetimi",
    description: "Tüm ekipman ve cihazların çalışma durumu kontrolü. Süre: 15-20 dk.",
    auditType: "branch",
    category: "equipment",
    items: [
      { itemText: "Kasa sistemi çalışıyor mu?", itemType: "checkbox", section: "teknoloji", sortOrder: 1, maxPoints: 10 },
      { itemText: "Kiosk sistemi çalışıyor mu?", itemType: "checkbox", section: "teknoloji", sortOrder: 2, maxPoints: 10 },
      { itemText: "Müşteri ekranı çalışıyor mu?", itemType: "checkbox", section: "teknoloji", sortOrder: 3, maxPoints: 10 },
      { itemText: "Menü ekranları çalışıyor mu?", itemType: "checkbox", section: "teknoloji", sortOrder: 4, maxPoints: 10 },
      { itemText: "Yazıcılar çalışıyor mu?", itemType: "checkbox", section: "teknoloji", sortOrder: 5, maxPoints: 10 },
      { itemText: "1. Espresso makinası çalışıyor mu? Arıza var mı?", itemType: "checkbox", section: "bar_ekipman", sortOrder: 6, maxPoints: 10 },
      { itemText: "2. Espresso makinası çalışıyor mu? Arıza var mı?", itemType: "checkbox", section: "bar_ekipman", sortOrder: 7, maxPoints: 10 },
      { itemText: "Çay makinası çalışıyor mu?", itemType: "checkbox", section: "bar_ekipman", sortOrder: 8, maxPoints: 10 },
      { itemText: "Filtre kahve makinası çalışıyor mu?", itemType: "checkbox", section: "bar_ekipman", sortOrder: 9, maxPoints: 10 },
      { itemText: "Fırın çalışıyor mu?", itemType: "checkbox", section: "bar_ekipman", sortOrder: 10, maxPoints: 10 },
      { itemText: "Blender'ler çalışıyor mu?", itemType: "checkbox", section: "bar_ekipman", sortOrder: 11, maxPoints: 10 },
      { itemText: "Buz makinası çalışıyor mu?", itemType: "checkbox", section: "bar_ekipman", sortOrder: 12, maxPoints: 10 },
      { itemText: "Buzdolapları sorunsuz çalışıyor mu?", itemType: "checkbox", section: "sogutma", sortOrder: 13, maxPoints: 10 },
      { itemText: "Dondurucular sorunsuz çalışıyor mu?", itemType: "checkbox", section: "sogutma", sortOrder: 14, maxPoints: 10 },
      { itemText: "Teşhir dolabı sorunsuz çalışıyor mu?", itemType: "checkbox", section: "sogutma", sortOrder: 15, maxPoints: 10 },
      { itemText: "Klima/ısıtma sistemi çalışıyor mu?", itemType: "checkbox", section: "diger", sortOrder: 16, maxPoints: 10 },
      { itemText: "Güvenlik kameraları çalışıyor mu?", itemType: "checkbox", section: "diger", sortOrder: 17, maxPoints: 10 },
      { itemText: "Ses sistemi çalışıyor mu?", itemType: "checkbox", section: "diger", sortOrder: 18, maxPoints: 10 },
    ],
  },

  // ═══════════════════════════════════════════
  // 6. HIZLI TUR DENETİMİ
  // ═══════════════════════════════════════════
  {
    title: "Hızlı Tur Denetimi (15 dk)",
    description: "Her kategoriden 1-2 kritik madde. Anomali bulunursa 'Tam Denetim Gerekli' flag'ı atılır.",
    auditType: "branch",
    category: "quick_tour",
    items: [
      { itemText: "Dış mekan genel görünüm uygun mu?", itemType: "checkbox", section: "genel", sortOrder: 1, maxPoints: 10 },
      { itemText: "Teşhir dolabı uygun mu?", itemType: "checkbox", section: "genel", sortOrder: 2, maxPoints: 10 },
      { itemText: "Bar içi genel temizlik", itemType: "rating", section: "genel", sortOrder: 3, maxPoints: 10 },
      { itemText: "Espresso kalitesi — hızlı tat testi", itemType: "rating", section: "genel", sortOrder: 4, maxPoints: 10 },
      { itemText: "Kritik sıcaklık kontrol (sandviç dolabı)", itemType: "number", section: "genel", sortOrder: 5, maxPoints: 10 },
      { itemText: "SKT — en eski 3 ürünü kontrol et", itemType: "checkbox", section: "genel", sortOrder: 6, maxPoints: 10 },
      { itemText: "Depo düzeni ve temizliği", itemType: "rating", section: "genel", sortOrder: 7, maxPoints: 10 },
      { itemText: "Tuvaletler temiz mi?", itemType: "checkbox", section: "genel", sortOrder: 8, maxPoints: 10 },
      { itemText: "Personel dress code uygun mu?", itemType: "checkbox", section: "genel", sortOrder: 9, maxPoints: 10 },
      { itemText: "Personel güler yüzlü mü?", itemType: "rating", section: "genel", sortOrder: 10, maxPoints: 10 },
      { itemText: "Tam Denetim Gerekli mi?", itemType: "checkbox", section: "karar", sortOrder: 11, maxPoints: 10 },
      { itemText: "Genel notlar ve gözlemler", itemType: "text", section: "karar", sortOrder: 12, maxPoints: 10 },
    ],
  },
];

export async function seedAuditTemplates(adminUserId: string) {
  console.log("[Seed] Denetim şablonları oluşturuluyor...");

  for (const tmpl of TEMPLATES) {
    // Check if template already exists
    const existing = await db.select()
      .from(auditTemplates)
      .where(
        and(
          eq(auditTemplates.title, tmpl.title),
          eq(auditTemplates.isActive, true)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      console.log(`[Seed] "${tmpl.title}" zaten mevcut, atlanıyor.`);
      continue;
    }

    // Create template
    const [template] = await db.insert(auditTemplates)
      .values({
        title: tmpl.title,
        description: tmpl.description,
        auditType: tmpl.auditType,
        category: tmpl.category,
        isActive: true,
        requiresPhoto: false,
        aiAnalysisEnabled: false,
        createdById: adminUserId,
      })
      .returning();

    console.log(`[Seed] ✅ "${tmpl.title}" oluşturuldu (ID: ${template.id})`);

    // Create items
    for (const item of tmpl.items) {
      await db.insert(auditTemplateItems).values({
        templateId: template.id,
        itemText: item.itemText,
        itemType: item.itemType,
        section: item.section,
        weight: item.weight || null,
        sortOrder: item.sortOrder,
        requiresPhoto: item.requiresPhoto || false,
        maxPoints: item.maxPoints || 10,
        aiCheckEnabled: false,
      });
    }

    console.log(`[Seed]   → ${tmpl.items.length} madde eklendi`);
  }

  console.log("[Seed] Denetim şablonları tamamlandı!");
}
