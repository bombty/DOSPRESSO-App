# DOSPRESSO — DEVİR TESLİM DOKÜMANI v5
## 29 Mart 2026 — Oturum Sonu (Final)

---

# HIZLI BAŞLANGIÇ

```bash
cd /home/claude/DOSPRESSO-App
git pull origin main
git log --oneline -5  # Son commit: 9abead40
```

Eğer repo yoksa:
```bash
cd /home/claude
git clone https://github.com/bombty/DOSPRESSO-App.git
cd DOSPRESSO-App
git config user.email "claude@dospresso.dev"
git config user.name "Claude AI"
npm install
```

---

# PROJE BAĞLAMI

**DOSPRESSO:** 25 şubeli Türk kahve franchise zinciri yönetim platformu
- **Hedef:** 2 yılda 55 şubeye ulaşmak
- **Pilot:** ~14 Nisan 2026 (Fabrika + HQ + Işıklar + Lara)
- **Teknoloji:** React 18 + Express + Drizzle ORM + PostgreSQL (Neon)
- **Repo:** https://github.com/bombty/DOSPRESSO-App (PUBLIC)
- **Son commit:** `9abead40` (29 commit)

## Proje Boyutları
395.477 satır kod, 281 sayfa, 247 bileşen, 1.551 endpoint, 349 tablo, 31 agent skill

---

# TASARIM SİSTEMİ (Kesinleşmiş)

## Light Mode
```
HEADER:      Kırmızı (#c0392b) — marka kimliği, beyaz logo+metin
BOTTOM NAV:  Navy (#0a1628) — sakin taban, aktif sekme beyaz
ARKA PLAN:   Off-white (#f8f6f3) — saf beyaz DEĞİL
KARTLAR:     Beyaz (#fff) + sıcak border (#e8e4df)
AYIRICILAR:  Hafif krem (#f0ece7)
```

## Dark Mode
```
HEADER:      Koyu lacivert (#0c1a2e)
BOTTOM NAV:  Koyu lacivert (#0c1a2e), aktif kırmızı (#c0392b)
ARKA PLAN:   #0a1628
KARTLAR:     #0f1d32 + border (#1a2d48)
LOGO:        Kırmızı (#c0392b) — her iki modda aynı
```

## Layout Kuralları
- Bottom nav: 4 item (Ana Sayfa, Bildirim, Dobody, Profil)
- Mobil widget: 2 kolon (uzun sayfa olmasın)
- Desktop widget: 3 kolon (max-width 1200px)
- Kompakt padding: KPI 4px, widget 8-10px
- Kiosk: tam ekran, header/nav YOK, min 56px butonlar

## CGO (Utku) Rol Tanımı
Teknik departmanı yönetir:
- Fabrika üretim detayı (hedef/gerçek/fire/QC)
- Tüm şubelerin ekipman sağlığı + arıza bildirim akışı
- Bakım takvimi + servis sorumluluğu (HQ vs şube, ekipmana göre)
- CRM'den gelen teknik geri bildirimler
- Her ekipman için teknik servis sorumlusunu (HQ/şube) CGO belirler

---

# SON 3 COMMIT (push bekliyor)

```
9abead40  Sprint 3c: Pilot hazırlık — plan güncelleme + recipeId + tarama raporu
b15ec545  Sprint 3: İK scope entegrasyonu tamamlandı — 7/7 endpoint
c9affd2e  Sprint 3: İK iki katmanlı mimari — Faz 1-3
```

Push: `cd DOSPRESSO-App && git push origin main`

---

# SPRINT PLANI (2 Hafta → Pilot)

## Sprint 4a (Gün 1-2) — Crash Önleme
- [ ] 6 pilot sayfası hook safety fix (fabrika kiosk, şube kiosk, vardiya, reçete, personel-detay, görev-detay)
- [ ] 67 toFixed fix (muhasebe 34, performans 20, dashboard 4, üretim planı 6, QC 2, sevkiyat 1)
- [ ] notifications.tsx, sube-saglik-skoru.tsx, tasks.tsx hook fix
- [ ] Kiosk PIN rate limiting

## Sprint 4b (Gün 3-5) — Pilot Özellik
- [ ] P1: productRecipeId migration + backend reçete çözümleme
- [ ] P2: Plan vs gerçek UI widget (progress bar)
- [ ] Şube kiosk: açık görev listesi + "Görevi Al" (API hazır: branch-tasks.ts kiosk endpoint'leri)
- [ ] Şube kiosk: bildirimler + duyurular sekmesi (API hazır: announcements-routes.ts)
- [ ] Şube kiosk: ekip durumu (kim vardiyada/molada/yok)
- [ ] PDKS anomali: mola dönüşü giriş unuttuysa kiosk uyarısı
- [ ] Bottom nav düzeltme: 4 item
- [ ] Light mode: kırmızı header + navy bottom nav + off-white bg

## Sprint 5a (Hafta 2 başı) — E2E Test
- [ ] Fabrika: kiosk→üretim→QC→plan güncelleme→çıkış
- [ ] Şube: kiosk→giriş→açık görev al→tamamla→skor
- [ ] QR misafir geri bildirim→şube skoru
- [ ] HQ dashboard doğruluk
- [ ] Duyuru→tüm kiosk'larda görünürlük

## Sprint 5b (Hafta 2 sonu) — Veri + Cilalama
- [ ] Test verisi temizle, pilot şubeler hazırla
- [ ] Vardiya şablonları (fabrika 3, şube 4)
- [ ] Pilot kullanıcı PIN'leri
- [ ] Kiosk dokunmatik UX optimizasyonu
- [ ] Coach/supervisor canlı personel takip

---

# KRİTİK BULGULAR (21 Perspektif Tarama)

| Sorun | Sayı | Risk |
|-------|------|------|
| Hook safety violation | 56 sayfa | CRASH |
| Korumasız toFixed | 258 | CRASH |
| Array safety ihlali | 205 | CRASH |
| Korumasız endpoint | 55 | GÜVENLİK |
| Ad-hoc rol kontrolü | 505 | BAKIM |
| Rate limiting YOK | — | GÜVENLİK |
| factory.ts: 102 write tx dışında | — | VERİ |

## Pozitif Sürprizler (Zaten Hazır!)
- Açık görev sistemi + kiosk claim/complete endpoint'leri
- Misafir QR geri bildirim (7 dil, konum doğrulama)
- Personel QR puanlama (token + public rating)
- Push bildirim (web-push + VAPID + service worker)
- PWA (manifest + offline queue + cache v19)
- Email (nodemailer + 6 şablon)
- Factory scoring (796 sat, 5 boyutlu, scheduler aktif)
- 14 dashboard, 51 rapor endpoint
- Agent: 1929 sat engine + scheduler + escalation + 31 skill
- Audit trail: 558 kayıt noktası

---

# MODÜL DURUMU

| Modül | Pilot? | Not |
|-------|--------|-----|
| Fabrika Kiosk | ⚠️ | 2 eksik (recipeId, plan UI) |
| Vardiya/PDKS | ✅ | Çalışıyor |
| Bordro | ✅ | Temel hazır |
| İK Scope | ✅ | 8 endpoint done |
| Reçete | ✅ | Versiyonlama var |
| QC | ✅ | 2 aşamalı |
| Üretim Plan | ⚠️ | actualQuantity yapıldı, UI eksik |
| Şube Kiosk | ⚠️ | Görev var, bildirim/açık görev eksik |
| Mr. Dobody | ❌ | Skill testi yok |
| Akademi | ❌ | 42 empty state |
| CRM | ❌ | Auth sorunlu |

---

# SKİLL DOSYALARI (4 aktif)
```
/mnt/skills/user/dospresso-architecture/SKILL.md
/mnt/skills/user/dospresso-debug-guide/SKILL.md
/mnt/skills/user/dospresso-quality-gate/SKILL.md
/mnt/skills/user/dospresso-design-system/SKILL.md  ← YENİ v3
```

# ÖNCEKİ TRANSKRİPTLER
```
/mnt/transcripts/2026-03-29-10-22-57-dospresso-sprint3-ik-pilot-design.txt
/mnt/transcripts/2026-03-28-23-11-46-dospresso-design-sprint-full-session.txt
/mnt/transcripts/2026-03-28-20-41-45-dospresso-design-sprint-full-session.txt
/mnt/transcripts/2026-03-28-17-28-32-dospresso-design-sprint-full-session.txt
```
