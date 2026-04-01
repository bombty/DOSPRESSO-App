# DOSPRESSO Global Design System — Onaylanan Tasarım Kararları
**Son güncelleme:** 1 Nisan 2026 | **Onaylayan:** Aslan (Product Owner)
**Referans dosya:** `dospresso-home-final-v2.jsx`

---

## RENK TOKEN'LARI

### Dark Mode (Öncelikli)
| Token | Hex | Kullanım |
|-------|-----|----------|
| bg | `#0c0f14` | Sayfa arka plan |
| card | `#141820` | Kart/widget gövde |
| border | `#1e2530` | İnce ayırıcı |
| text | `#e8ecf1` | Ana metin |
| muted | `#6b7a8d` | İkincil metin |
| header | `#192838` | Widget header BG (solid) |
| alert | `#ef4444` | Kırmızı uyarı |
| warn | `#fbbf24` | Sarı uyarı |
| ok | `#22c55e` | Yeşil başarı |
| info | `#60a5fa` | Mavi bilgi |
| purple | `#a5a0f0` | Mor (eski Dobody rengi) |

### Light Mode
| Token | Hex | Kullanım |
|-------|-----|----------|
| bg | `#edeae4` | Sayfa arka plan (sıcak bej) |
| card | `#ffffff` | Kart/widget gövde |
| border | `#ddd8d0` | İnce ayırıcı |
| text | `#1c1b18` | Ana metin |
| muted | `#3d3832` | İkincil metin (koyu — okunabilir) |
| header | `#192838` | Widget header BG (dark modla aynı!) |
| warn | `#92400e` | Koyu amber (beyaz zeminde okunur) |

### Mr. Dobody Widget Token'ları (her iki modda aynı)
| Token | Hex | Kullanım |
|-------|-----|----------|
| dobodyHead | `#b42a2a` | Kırmızı header (yumuşak, agresif değil) |
| dobodyBody | `#192838` | Navy gövde (widget header ile aynı) |
| Butonlar | `#b42a2a` | Header ile aynı kırmızı |
| Auto ✓ | `#4ade80` bg `#22c55e18` | Yeşil tamamlandı |
| Action dot | `#ef4444` | Kırmızı aksiyon gerekli |

---

## WIDGET KURALLARI

### Widget Header
- Background: `#192838` (solid, her iki modda)
- Metin: beyaz
- Ok işareti: `rgba(255,255,255,0.5)` → tıklanabilir
- Badge: dolgulu renk zemin + beyaz metin (light+dark aynı kural)

### Mr. Dobody Widget (Seçenek C — Onaylandı)
```
┌──────────────────────┐
│ ◈ Mr. Dobody      3  │ ← kırmızı header (#b42a2a), beyaz metin
├──────────────────────┤
│ ● 2 şube gider...    │ ← navy gövde (#192838), açık metin
│ ● Haftalık rapor      │   kırmızı buton + action dot
│ ● Eğitim korelasyon ✓ │   yeşil ✓ tamamlandı
└──────────────────────┘
```
- İKON: `useDobodyAvatar()` API'den yüklenen görsel (SVG değil!)
- Floating avatar: `global-ai-assistant.tsx` — sayfanın altında, tıkla → sohbet penceresi
- Home card: `DobodyCard.tsx` — açılır/kapanır guidance kartı
- Mini bar: `dobody-mini-bar.tsx` — görev akışı

### KPI Chip
- Sabit genişlik: `100px` (desktop/tablet), compact `auto` (mobil)
- HER ZAMAN tek satır (değer + ok + etiket yatay)
- Trend ok: ▲ yeşil (up), ▼ kırmızı (down), — gri (flat)
- Etiket rengi: KPI'nın kendi rengi (gri değil!)
- Mobil compact: font 13/10px, padding azaltılmış

### Tıklanabilirlik Kuralı (EVRENSEL)
**TÜM KPI'lar ve widget'lar tıklanabilir + navigasyon bağlantılı.**
Tüm roller dahil — HQ, Fabrika, Şube, Personel.
Her widget'a `onClick={() => navigate("/hedef-sayfa")}` eklenmeli.

---

## FONT SCALE

| Token | Desktop | Tablet | Mobil |
|-------|---------|--------|-------|
| title | 20px | 17px | 17px |
| subtitle | 15px | 14px | 14px |
| widget header | 14px | 13px | 13px |
| body | 13px | 12px | 13px |
| meta | 12px | 11px | 12px |
| badge | 11px | 10px | 11px |
| KPI değer | 20px | 18px | 18px |
| Modül başlık | 14px | 13px | 13px |
| Modül açıklama | 12px | 11px | 11px |

---

## RESPONSIVE LAYOUT

| Cihaz | Genişlik | Widget Grid | Modül Grid | Dobody |
|-------|----------|-------------|------------|--------|
| Desktop | >1024px | 2-3 kolon | 3 kolon | Sağ sidebar 200px |
| Tablet | 480-1024px | 2 kolon | 2 kolon | Sağ sidebar 180px |
| Mobil | <480px | 1 kolon | 2 kolon (kompakt) | Alta iner (tam genişlik) |

---

## İKON SETİ — CLEAN LINE (43 ikon)

Stil: İnce 1.5px stroke, boş iç, minimal, modern
Format: Inline SVG, `(color) => <svg ...>` fonksiyon
Boyut: 22x22px viewBox 24x24
Arka plan: Renkli rounded-xl kare (40x40px)

### Kategoriler
| Kategori | İkonlar |
|----------|---------|
| Genel (7) | control, subeler, personel, operasyon, raporlar, yonetim, guvenlik |
| Üretim (7) | fabrika, depo, kalite, recete, uretimPlani, fire, sevkiyat |
| Satınalma (3) | stok, satinalma, siparis |
| Finans (5) | finans, bordro, maliyet, franchise, yatirimci |
| CRM (4) | musteri, crm, duyuru, eskalasyon |
| Eğitim (4) | akademi, egitim, performans, denetim |
| Operasyonel (6) | gorevler, checklist, vardiya, izin, ariza, ajanda |
| Navigasyon (6) | anasayfa, bildirim, profil, kiosk, qrScanner, projeler |
| Özel (1) | dobody (fallback — gerçekte API avatar kullanılır) |

### Light Mode Ek Kuralları
- İkon kutusu: `box-shadow: 0 2px 8px rgba(0,0,0,0.15)` (gölge)
- Modül kartı: `box-shadow: 0 1px 4px rgba(0,0,0,0.06)` (hafif gölge)
- Dark modda gölge YOK

---

## ANA SAYFA TASARIMI — Model A: Modül Grid (Onaylandı)

### Yapı (4 katman)
1. **Karşılama**: "Günaydın, {isim}" + rol badge + tarih
2. **KPI Strip**: Yatay scroll, sabit boyut pill'ler, trend oklu
3. **Dobody Banner**: Açılır/kapanır, kırmızı header + navy gövde, aksiyon sayısı badge
4. **Modül Grid**: Clean Line ikon + renkli arka plan + canlı stat + alert badge + → ok

### Roller ve Modülleri
| Rol | Modül Sayısı | Özel Modüller |
|-----|-------------|---------------|
| CEO | 9 | Control, Şubeler, İK, Operasyon, Fabrika, Müşteri, Raporlar, Finans, Yönetim |
| CGO | 9 | Teknik Komuta, Şubeler, İK, Operasyon, Fabrika, Müşteri, Raporlar, Finans, Yönetim |
| Coach | 7 | Kontrol Merkezi, Şubeler, Arıza, CRM, Akademi, Denetim, Raporlar |
| Trainer | 7 | Coach benzeri + eğitim odaklı |
| Müdür | 7 | Şube Kontrol, Personel, Misafir GB, Stok, Finans, Vardiya, Görevler |
| Supervisor | 6 | Operasyon, Misafir GB, Ekipman, Görevler, Checklist, Vardiya |
| Barista | 5 | Görevlerim, Eğitim, Performans, Misafir GB, Vardiyam |
| Fabrika | 6 | Üretim Kontrol, Kalite, Personel, Sevkiyat, Stok, Raporlar |

---

## CONTROL DASHBOARD TASARIMI (CentrumShell)

### Layout
- Üst: Başlık bar (rol adı + badge + zaman filtresi)
- Altında: KPI strip (aynı format — her yerde tutarlı)
- Orta: Widget grid (2-3 kolon)
- Sağ: Dobody panel (170-200px)
- Sekmeli: Coach (5 sekme), Trainer (5 sekme), Müdür (4 sekme)

### CentrumShell Component'ları
`client/src/components/centrum/CentrumShell.tsx`
Export'lar: CentrumShell, KpiChip, Widget, MiniStats, ProgressWidget, ListItem, DobodySlot, DobodyTaskPlan, TopFlop, FeedbackWidget, LostFoundBanner, Badge, TimeFilter, QCStatusWidget

---

## UYGULAMA KONTROL LİSTESİ

Tasarım uygulandıktan sonra her sayfada kontrol et:
- [ ] Widget header `#192838` solid mı?
- [ ] Dobody: kırmızı header `#b42a2a` + navy gövde `#192838`?
- [ ] KPI tek satır, sabit boyut, trend ok?
- [ ] KPI etiket rengi KPI'nın kendi rengi mi (gri değil)?
- [ ] Badge'ler dolgulu renk + beyaz metin?
- [ ] Tüm widget'lar tıklanabilir + navigasyon var mı?
- [ ] Tüm KPI'lar tıklanabilir + navigasyon var mı?
- [ ] Light modda sarı/warn metni `#92400e` koyu amber mi?
- [ ] Light modda ikon gölgesi var mı?
- [ ] Mobilde KPI compact mı?
- [ ] Mobilde Dobody alta iniyor mu?
- [ ] Font'lar scale tablosuna uygun mu?
- [ ] Clean Line ikonlar kullanılıyor mu?
- [ ] Mr. Dobody ikonu: API avatar (SVG fallback değil)?
