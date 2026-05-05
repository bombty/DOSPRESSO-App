# DECIDED — 5 Mayıs 2026

## Sprint 6 Kararları (Aslan + Mahmut feedback)

### Yetki Modeli
- **Mahmut tüm şubeleri görsün** ama sadece HQ+Fabrika+Işıklar EDIT yetkili
- viewOnly mantığı: GET endpoint'leri tüm scope, PUT/DELETE managed branches kontrolü
- managed_branches array: [5, 23, 24] (Işıklar, HQ, Fabrika)

### UX
- /bordrom = personel kişisel (Aslan'ın gördüğü)
- /maas = HQ toplu hesaplama (Mahmut'un işi)
- /ik?tab=maas = Maaş tanımları (yeni özellikler için)
- Karışıklığı önlemek için "Maaş Hesaplama" CTA mavi banner her yerde

## Sprint 7 Kararları (Aslan)

### Kapsam
- **Tam TGK 2017/2284 uyumu**: Etiket + alerjen + besin değeri + onay
- **Tüm endpoints** (A-G), bugün 6.5 saat - hedef 00:30 → revize edildi 22:00 → revize edildi 18:00 (ec25b18 ile)

### Veri Kaynağı
- **TÜRKOMP** (turkomp.tarimorman.gov.tr) - Türkiye Tarım Bakanlığı resmi
- **Hibrit yaklaşım**: Önce manuel girilmiş, yoksa TÜRKOMP cache, yoksa TÜRKOMP'tan tek tek çek
- **Toplu scraping YASAK** (ücretli lisans gerekli)

### Yetki
- READ:  admin, ceo, cgo, satinalma, gida_muhendisi, kalite_kontrol, fabrika_mudur, fabrika_sorumlu, kalite, sef, recete_gm
- WRITE: admin, ceo, satinalma, gida_muhendisi, sef, recete_gm
- APPROVE LABEL: admin, gida_muhendisi (TGK Madde 18 - gıda mühendisi onayı zorunlu)

### Teknoloji
- **PDF**: jsPDF (zaten kurulu, client-side, server'a yük yok) - öneriden Aslan onayladı
- **PDF formatı**: A6 (105×148mm) - etiket için ideal boyut
- **PDF dil**: TR (önce), EN sonradan eklenebilir

### Veri Kararları
- 67 hammadde Numbers'tan import (HAM001-HAM067)
- 13 tedarikçi normalize edilmiş (büyük/küçük harf birleştirildi)
- Marka 11 unique → marka kolonu rawMaterials'a eklendi (yeni)
- TGK uyum flag (`tgk_compliant`): kritik olanlar (un, şeker, tuz, su, zeytinyağı) TRUE
- nutrition_source: 'manual' (default) | 'turkomp' | 'supplier_doc' | 'estimated'

## Genel Kurallar

### Çalışma Sistemi v2.0 (devam)
- 4 skill files mandatory at every session end
- Plan mode + isolated agent + DRY-RUN + GO bekle for DB writes
- 5 perspektifli review (Principal Engineer / Franchise F&B Ops / Senior QA / PM / Compliance)
- Schema kolon adlarını DB'ye yazmadan önce GREP ZORUNLU

### Triangle Workflow
- Claude: kod yazar, GitHub push, devir-teslim
- Aslan: GitHub UI ile PR merge, business kararlar
- Replit Agent: DB migration + build + smoke test

### Commit Mesaj Standardı (5 May 2026 - güncellenmiş)
- Başlık: "Sprint X (Bölüm Y) - Kısa açıklama" veya "Sprint X vN - ..."
- Body: SPRINT amacı, KARAR, IMPLEMENTATION, FILES değişiklikleri, NOTES
- Footer: DİFF satır sayısı + dosya sayısı
- Emoji yok (clean)

### Big Sprint Stratejisi (yeni)
- "Tek branch çoklu commit, tek mega PR"
- PR yorgunluğu azaltır, atomic merge daha güvenli
- Sprint bittiğinde bir tek mega PR aç
