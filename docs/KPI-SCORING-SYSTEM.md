# DOSPRESSO — KPI ve Skor Hesaplama Sistemi
**Şube skoru, personel skoru, composite score, sağlık skoru, trend**

---

## Skor Hiyerarşisi
```
Şube Genel Skoru (branch_health_scores)
├── Denetim Skoru — audit v2 genel skor
├── Checklist Uyumu — günlük checklist tamamlama %
├── Personel Skoru — çalışan ortalama performans
├── Müşteri Memnuniyeti — feedback/NPS
├── Operasyon Skoru — vardiya uyumu, devamsızlık
└── Eğitim Skoru — eğitim tamamlama oranı

Personel Composite Score
├── Checklist tamamlama
├── Eğitim tamamlama
├── Devam (PDKS)
├── Geri bildirim
└── Görev tamamlama
```

## 6 Boyutlu Şube Sağlık Skoru
```
branch_health_scores tablosu:
  1. Operasyon — vardiya uyumu, checklist, günlük işler
  2. Kalite — denetim skoru, müşteri feedback
  3. Personel — devam, eğitim, turnover
  4. Finansal — bütçe uyumu, maliyet kontrolü (sadece HQ görür)
  5. Müşteri — NPS, şikayet oranı, tekrar ziyaret
  6. Ekipman — arıza oranı, bakım uyumu
```

## Renk Kodlama
```
90-100 → Yeşil (mükemmel)
75-89  → Amber (iyi, iyileştirme alanı var)
50-74  → Turuncu (dikkat gerekli)
0-49   → Kırmızı (acil müdahale)
```

## Skor Etki Kuralları (KRİTİK)
```
Şube denetim skoru:
  → Supervisor, Sup. Buddy, Müdür ETKİLER
  → Barista, Bar Buddy, Stajyer ETKİLEMEZ

Personel denetim skoru (dress code, hijyen):
  → Herkesin BİREYSEL skoru ETKİLER

Checklist, eğitim, devam:
  → Herkesin BİREYSEL skoru ETKİLER
```

## Trend Hesaplama
```
Son 3 veri noktası karşılaştırılır:
  Artış (▲) — son değer > önceki ortalama
  Düşüş (▼) — son değer < önceki ortalama
  Sabit (—) — ±2 puan fark
```

## TopFlop Sıralama
```
Tüm şubeler skor sırasına göre:
  Top 3 — en iyi şubeler (yeşil)
  Flop 3 — en düşük şubeler (kırmızı)
  CEO/CGO dashboard'unda gösterilir
```

## Dosya Konumları
```
server/routes/branch-health.ts — sağlık skoru API
server/lib/composite-score.ts — composite hesaplama
shared/schema/schema-04.ts, 11 — skor tabloları
```
