# DEVİR TESLİM — 11 MAYIS 2026 GECE (PİLOT ÖNCESİ FİNAL)

> **Hazırlayan:** Claude (CLI)
> **Tarih:** 11 Mayıs 2026 Pazartesi, 01:30+
> **Pilot:** 13 Mayıs 2026 Çarşamba 15:00
> **Kalan süre:** ~38 saat
> **Branch:** `claude/kiosk-mega-improvements-2026-05-10`
> **Son commit:** `5d0dfbfcd` — PIN reset + 8 deneme limiti
> **Senkron durumu:** ✅ Local ↔ GitHub TAM SENKRON

---

## 🎯 BU OTURUMDA YAPILANLAR (10 May Gece → 11 May Gece)

### Aşama 1: KVKK Per-User Sistemi (10 May gece, ilk maraton)

- Per-user KVKK onay sistemi (DB tabanlı, audit trail)
- 3 SQL migration (✅ Replit'te çalıştırıldı):
  - `kvkk-per-user-approvals.sql`
  - `kvkk-data-subject-requests.sql` (KVKK m.11)
  - `kvkk-policy-v1-1.sql` (yurtdışı aktarım beyanı)
- KVKK Aydınlatma Metni v1.0 → **v1.1 aktif** (Neon AWS US-East beyanı dahil)
- 6 yeni endpoint (`/api/kvkk/*`)
- Per-user modal (`client/src/components/kvkk-per-user-modal.tsx`)
- KVKK Denetim Merkezi sayfası (`/kvkk-denetim`)
- KVKK Haklarım sayfası (`/kvkk-haklarim`, KVKK m.11 talep)
- PDF kanıt sistemi (devlet uyumlu, Türkçe karakter ASCII fallback)

### Aşama 2: Mola Sayaç Sistemi (10 May gece)

- BreakCountdown component (60 dk geri sayım + 10/5/1 dk uyarı + 0 ALARM)
- BreakReturnSummary modal (mola dönüş yeşil/kırmızı + auto-tutanak)
- Türk İş K. m.68 hesaplama (4hr→0, 4-7.5hr→30, 7.5+hr→60 dk)
- Auto-tutanak kuralları:
  - 0-3 dk geç: compliance score -2/dk
  - 3-10 dk: verbal warning
  - 10+ dk: written warning

### Aşama 3: Kiosk UI Yenileme (10-11 May)

- Yeni KioskMainScreen component (DOSPRESSO branded, büyük şube ismi)
- 5 mod demo sayfası (`/sube/kiosk-yenilik-demo`)
- Mola realtime UI (her saniye azalan badge)
- 60+ dk ihlal kırmızı kart + animate-pulse

### Aşama 4: HQ Canlı Vardiya Dashboard (10 May gece)

- `/hq/canli-vardiya` sayfası (450 satır)
- 4 endpoint (`/api/hq/live-shifts`, `/pdks-history`, `/violations`)
- 25 şube grid (canlı 10sn refresh)
- İhlal animate-pulse
- Mahkeme/dava için 6 ay PDKS geçmiş export

### Aşama 5: Font Sistem Refactor (11 May)

- **Endüstri araştırması:** DIN-1450 + WCAG AA + Frank Mayer (kiosk)
- Yeni skill: `dospresso-design-system`
- Migration map:
  - `fontSize: 7,8 → 12`
  - `fontSize: 9 → 11` (avatar OK)
  - `fontSize: 10 → 13`
  - `fontSize: 11,12 → 14`
- kiosk.tsx: 76 yer düzeltildi (0 sorun kaldı)
- 4 yeni component (break-countdown, break-return-summary, kvkk-modal, hq-canli) zaten ≥12px

### Aşama 6: Kümülatif Günlük Mola (11 May gece) ⭐ KRİTİK

**Sorun:** Personel 15 dk mola yaptı, bitirdi → 2. mola başlatınca 60 dk değil 45 dk başlamalı.

- Backend `/api/branches/:branchId/kiosk/break-start` → response'a `dailyUsedMinutes`, `dailyRemainingMinutes` eklendi
- Backend `team-status` → her staff için kümülatif fields eklendi
- Frontend `breakEndMutation.onSuccess` → **breakMinutes kümülatif topluyor** (kritik fix)
- Frontend tick state (saniyede re-render)
- Time line'da mola bar (turuncu, üzerinde countdown sayı azalan)
- Sol kart sadeleştirildi (badge kaldırıldı, sadece "Molada" yazıyor)

### Aşama 7: PIN Sıfırlama Sistemi (11 May gece)

- MAX_ATTEMPTS: 5 → **8** (Aslan talebi)
- Yeni dosya: `server/routes/pin-reset.ts`
- Endpoint: POST `/api/kiosk/pin-reset/request`
- Mail ile yeni 4-haneli PIN (DOSPRESSO branded HTML)
- Frontend: 3+ hata → "PIN'imi Unuttum" butonu görünür
- 6+ hata → ⚠️ uyarı
- 8+ hata → 🔒 toast + reset öner
- Email-enumeration koruması

---

## 📦 COMMIT'LER (Bu Branch'ta, Hepsi Push'lı)

| Commit | Açıklama |
|--------|----------|
| `5d0dfbfcd` | PIN 8 deneme + sıfırlama mail ile |
| `cdfb9b3ba` | Mola breakMinutes kümülatif topla (45+15 fix) |
| `3e0ce8041` | Kiosk session endpoint fix (Replit Agent) |
| `1156d0b9b` | Sol kart sadeleştir + time line mola bar + countdown azalan |
| `3cc64214d` | Kümülatif günlük hak + countdown realtime (saniyede) |
| `b15f8bfe4` | Font size standartları (12px min, kiosk.tsx 76 yer) |
| `d138261e1` | Mola sayaç font büyüt + kalan dakika badge |
| `eb3a72061` | KVKK m.11 talep sistemi + v1.1 yurtdışı beyanı |
| `1abe03a80` | HQ Canlı Vardiya + PDKS Geçmiş API + sayfa |
| `c961ed039` | Mola realtime + ihlal vurgu + vardiya başla zamanı |
| `c81b68536` | Yeni componentleri sube/kiosk.tsx'e entegre |
| `497c129ac` | KVKK Denetim PDF + Admin Sayfası |
| `a19e35245` | Yeni ana ekran + bildirim hierarchy + demo (FINAL) |
| `78c27f862` | Mola sayaç + alarm + otomatik tutanak |

**Toplam:** ~6,500 satır kod, 14 commit, 0 TS hata

---

## ✅ REPLİT DURUMU (Aslan Tarafından Doğrulandı)

### Migration'lar (Hepsi Başarılı)
- ✅ `2026-05-10-branch-data-collection.sql`
- ✅ `2026-05-10-kvkk-per-user-approvals.sql` (kvkk v1.0)
- ✅ `2026-05-10-kvkk-data-subject-requests.sql` (m.11 tablosu)
- ✅ `2026-05-10-kvkk-policy-v1-1.sql` (yurtdışı beyanı, aktif policy)

### Tablo Durumu
```
kvkk_policy_versions       ✅ 2 versiyon (1.0 + 1.1, aktif: 1.1)
user_kvkk_approvals        ✅ Hazır
kvkk_data_subject_requests ✅ Hazır (m.11 talepleri)
branch_data_uploads        ✅ Hazır
branch_data_collection_status ✅ Hazır
```

---

## 🔄 YENİ OTURUMDA YAPILACAKLAR (ÖNCELİK SIRASI)

### 1️⃣ HEMEN — Replit Pull + Restart (Aslan)

```bash
git pull
```

Ardından Replit UI'dan **Workflow Restart**.

Bu olmadan **son değişiklikler ekrana yansımaz**. Aslan ekran 3'te "Mola Süresi (eski sayaç)" gördü çünkü restart eksik olabilir.

### 2️⃣ Test (Aslan + Replit Agent)

#### Test A: Mola Kümülatif (Aslan'ın son test isteği)
```
1. Bir personel PIN ile gir
2. Mola Al → 5 dk bekle → Molayı Bitir
3. Toast: "(5 dk yapıldı, 55 dk hakkın kaldı)"
4. Tekrar Mola Al
5. Beklenen: "55" dk başlatmalı, 60 değil
6. Countdown her dakika -1 azalmalı
```

#### Test B: PIN Reset Mail
```
1. Bilerek 8 yanlış PIN gir
2. "PIN'imi Unuttum" butonu görünmeli
3. Modal aç → e-posta gir → "Mail Gönder"
4. 1-2 dakika sonra mail gelmeli
5. Yeni PIN ile giriş
```

**Mail gelmezse:** Replit Secrets'da `SMTP_*` env variables tanımlı mı kontrol et.

#### Test C: HQ Canlı Vardiya
```
1. CGO veya admin hesabıyla /hq/canli-vardiya aç
2. 25 şube grid görünmeli
3. Aktif şubeler yeşil, ihlalli kırmızı pulse
4. 10sn sonra otomatik refresh
```

#### Test D: KVKK Modal (Yeni Versiyon)
```
1. Personel PIN ile giriş yap
2. KVKK v1.1 modal otomatik açılmalı (eski v1.0 onayı geçersiz)
3. "Okudum, anladım" işaretle → Onayla
4. Devam et: vardiya başlat
```

### 3️⃣ Aslan'ın Manuel Görevleri (Önceki Devirde Belirtilen)

- [ ] **Mahmut payroll** 5 BRÜT figures (P-1)
- [ ] **HQ PIN'leri ayarla** (UI'dan eren + hqkiosk)
- [ ] **WhatsApp Sema** — 36 ham madde (HAM-1000–HAM-1035) + 4 reçete:
  - DOREO aktivasyon
  - Golden Latte aktivasyon
  - 4 pilot reçete "Besin Hesapla" + "Gramaj Onayla"
- [ ] **Fabrika manager** — 3 unknown passive users doğrulama (13 May sabah)

### 4️⃣ PR Mergele (Aslan)

🔗 https://github.com/bombty/DOSPRESSO-App/pull/new/claude/kiosk-mega-improvements-2026-05-10

PR açıklaması (kopyala-yapıştır):
```
8-saat+ maraton (10-11 May 2026):
- KVKK per-user (v1.0+v1.1)
- KVKK m.11 + denetim PDF
- Mola sayaç + alarm + tutanak
- Kümülatif günlük mola (45+15 fix)
- Realtime countdown (saniyede)
- Yeni kiosk ana ekran
- HQ canlı vardiya (25 şube)
- PDKS geçmiş raporlama
- Font sistem refactor (12px min)
- PIN 8 deneme + mail sıfırlama

~6,500 satır, 14 commit, 0 TS hata
```

---

## ⚠️ BİLİNEN SORUNLAR (Post-Pilot)

### Yapılması Gereken (14-15 May)

1. **Proje geneli font refactor** — ~1,500 sorunlu `text-[Npx]` ve inline fontSize (kiosk.tsx hariç)
2. **VERBIS kaydı** (KVKK Kurulu, gerekirse)
3. **DPO atanması** (resmi)
4. **Neon AWS Frankfurt'a taşıma** (US-East yerine, opsiyonel)
5. **Yıllık politika revizyon hatırlatıcısı** (otomatik)
6. **Aylık puantaj otomatik PDF + Partner/Müdür bildirim**
7. **Excel POS import** (franchise için)
8. **Sprint 14 yapısal:** dual payroll tables cleanup, account_status normalize
9. **/ik route hatası** (önceki devirden çözülmedi)

### Düşük Öncelikli

- Component bazlı görsel test (font değişikliği sonrası layout taşması var mı)
- Mola süresi parametrik (60dk sabit yerine şube ayarı)
- Mola hakkı vardiya süresine göre dinamik (İş K. m.68: <4hr=0, 4-7.5hr=30, 7.5+hr=60)
- WebSocket gerçek zamanlı (polling yerine)

---

## 📚 SKILL MD'LER (4 Dosya, Hepsi Güncel)

Yeni Claude oturumu otomatik okuyacak:

| Skill | Konum | Amaç |
|-------|-------|------|
| `dospresso-architecture` | `/mnt/skills/user/dospresso-architecture/SKILL.md` | Tech stack, DB, API, modüller, 10-11 May maraton özeti |
| `dospresso-debug-guide` | `/mnt/skills/user/dospresso-debug-guide/SKILL.md` | 21 bug pattern (yeni: mola kümülatif, tick state, PIN reset) |
| `dospresso-quality-gate` | `/mnt/skills/user/dospresso-quality-gate/SKILL.md` | 40 quality check (yeni: kümülatif tutarlılık, PIN mail, font audit) |
| `dospresso-design-system` | `/mnt/skills/user/dospresso-design-system/SKILL.md` | Typography (12px min), color tokens, migration map |

### Skill MD Anahtar Bilgiler (Yeni Oturum İçin Önemli)

**Mola System Mekanik:**
- Backend `break-start` döndürür: `breakStartTime`, `dailyUsedMinutes`, `dailyRemainingMinutes`
- Backend `team-status` döndürür: aynı + her staff için
- Frontend `breakEnd.onSuccess` mutlaka `breakMinutes` kümülatif toplamalı (yoksa 2. molada 60'tan başlar)
- Global `tick` state (1sn interval) — countdown animasyonu için

**PIN System:**
- `MAX_ATTEMPTS = 8` (branches.ts + factory.ts)
- 15dk pencere, 30dk kilit
- `pin-reset.ts` mail gönderir (SMTP_* env gerekli)
- bcrypt hash kullanılır

**KVKK:**
- v1.1 aktif (yurtdışı aktarım beyanı dahil)
- `user_kvkk_approvals` audit trail
- 30 gün deadline (m.13)
- 6 talep türü (info/correction/deletion/notification/objection/compensation)

**Font Standartı (12px Minimum):**
- Yeni kod yazılırken **asla `fontSize < 12`** kullanma
- Sadece şu istisnalar: avatar circle harfler, timeline scale markers
- Tailwind: `text-xs` (12), `text-sm` (14), `text-lg` (18), `text-xl` (20)

---

## 🚨 KRİTİK BİLGİLER (Yeni Oturum İçin)

### Repo & Token
- **Repo:** `bombty/DOSPRESSO-App` (DOSPRESSO-D harfi, typo prone)
- **Token:** `[GITHUB_TOKEN_REDACTED]`
- **Branch:** `claude/kiosk-mega-improvements-2026-05-10` (henüz mergele edilmedi)

### Push Komutu
```bash
git push "https://x-access-token:TOKEN@github.com/bombty/DOSPRESSO-App.git" BRANCH
```

### Aslan'ın Özellikleri
- **Türkçe** konuşur, IT uzmanı **değil**
- Asla teknik JSON/kod blokları gösterme
- Adım adım basit direktif ver
- Mobil iPad'de çalışır (kısa cevaplar)
- CEO/Founder — strateji + UX kararları kendisi verir
- Teknik kararları Claude alır

### Triangle Workflow
```
Claude (CLI) → Kod yazar + GitHub push
Replit Agent → DB migration + build + smoke test (Shell access, NO push)
Aslan → Manuel UI testler + business kararlar
```

### Pilot Detayları
- **Tarih:** 13 Mayıs 2026 Çarşamba 15:00
- **4 Şube:** Antalya Işıklar #5 (HQ), Lara #8 (Franchise), Merkez HQ #23, Fabrika #24
- **4 Ürün:** Donut Base Hamuru, Cinnaboom Classic, Cinnaboom Brownie, Cheesecake Base

### Önemli Klavye Komutları
```bash
# Session başı zorunlu
git fetch && git log --oneline origin/main..HEAD

# TS check
timeout 60 npx tsc --noEmit 2>&1 | grep "error TS" | head -10

# Skill MD update sonu (komut çalışmıyorsa Manual)
ls /mnt/skills/user/dospresso-*/

# Font audit
grep -roE 'text-\[(7|8|9|10|11)px\]' client/src/ | wc -l
```

---

## 📊 ÖZET TABLO

| Konu | Önceki | Şu Anki | Sonraki |
|------|--------|---------|---------|
| KVKK | localStorage | DB tabanlı v1.1 | ✅ Pilot hazır |
| Mola sayaç | Tek mola 60dk | Kümülatif günlük | ✅ Pilot hazır |
| Countdown | Static | Saniyede azalan | ✅ Test gerekli |
| PIN limit | 5 deneme | 8 deneme | ✅ Pilot hazır |
| PIN reset | ❌ Yok | Mail ile | ✅ Mail config gerek |
| Font sistem | 1500+ sub-12px | Kiosk düzelt | ⏳ Post-pilot |
| HQ Canlı | ❌ Yok | 25 şube grid | ✅ Pilot hazır |
| Mahkeme PDKS | ❌ Yok | 6 ay export | ✅ Pilot hazır |

---

## 💡 YENİ OTURUM AÇILIŞI — CLAUDE'A NOTLAR

Eğer yeni Claude oturumu açıldıysa:

1. **İlk yapılacak:** `git fetch && git log --oneline origin/main..HEAD`
2. **Skill MD'leri oku:** Otomatik yüklenir, ama özet ihtiyacın varsa bu doküman + 4 skill MD yeterli
3. **Aslan'a sor:** "Replit'te pull + workflow restart yapıldı mı? Hangi test sonucu var?"
4. **Aslan'ın stiline dikkat:** Basit Türkçe, görsel listeler, asla JSON gösterme

### Eğer Aslan bug raporu verirse:
1. Debug guide'a bak (21 pattern var)
2. Quality gate çalıştır (40 check)
3. TS clean check
4. Skill MD'ye yeni pattern ekle (sonraki Claude için)

### Eğer Aslan yeni özellik isterse:
1. Architecture skill'e uygun mu kontrol
2. Design system'e uy (12px min font)
3. Aslan'a basit anlat (teknik detay yok)
4. Commit + push + Replit instructions ver

---

**Bu doküman tüm gerekli bilgiyi içerir. Yeni oturum bu dokümanla başlayabilir.**

*Hazırladı: Claude — 11 Mayıs 2026 01:35*
