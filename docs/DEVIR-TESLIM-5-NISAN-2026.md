# DOSPRESSO Devir Teslim — 5 Nisan 2026 (KAPSAMLI)

## YENİ OTURUM BAŞLATMA PROSEDÜRÜ

Aslan "DOSPRESSO'da devam edelim" dediğinde Claude:

### Adım 1: Repo Klonla
```bash
cd /home/claude
git clone https://github.com/bombty/DOSPRESSO-App.git
cd DOSPRESSO-App
```

### Adım 2: Skill Dosyaları Oku
Kalıcı dosyalar (oturumlar arası silinmez):
```
/mnt/skills/user/dospresso-architecture/SKILL.md  — Mimari (27 rol, DB, API)
/mnt/skills/user/dospresso-quality-gate/SKILL.md   — Quality gate
/mnt/skills/user/dospresso-debug-guide/SKILL.md    — Debug
```

### Adım 3: Devir Teslim + STATUS Oku
```bash
cat docs/DEVIR-TESLIM-5-NISAN-2026.md
cat STATUS.md
cat AGENTS.md
```

### Adım 4: Transcript (gerekirse)
```
/mnt/transcripts/journal.txt  — Katalog
/mnt/transcripts/2026-04-05-*.txt  — Bu oturum detayları
```

---

## KİMLER NE YAPAR

### Aslan (Proje Sahibi)
- İş kararları, tasarım onayları, screenshot ile test sonucu paylaşır
- Claude push sonrası hazırladığı talimatı Replit Agent'a yapıştırır

### Claude (IT Danışmanı / Yazılım Mimarı)
- Büyük feature, yeni modül, mimari değişiklik yazar
- Build kontrol (vite + esbuild) → git commit → GitHub push
- Her push sonrası Replit talimatı hazırlar
- MD doküman, plan oluşturma

### Replit Agent (Yardımcı AI)
- YAPAR: git pull --rebase, server restart, API test (curl), DB sorgu (psql),
  küçük hotfix (SQL sütun adı, import eksik, typo), screenshot, build test
- YAPMAZ: büyük feature, mimari değişiklik, yeni tablo
- ASLA: git reset --hard (schema fix'leri silinir!)

---

## ÇALIŞMA DÖNGÜSÜ

```
Claude kod yazar → build → commit → push
  → Aslan talimatı Replit'e yapıştırır
  → Replit: pull → restart → test → sonuç
  → Aslan sonucu Claude'a bildirir
  → Sorun varsa döngü tekrar
```

### Replit Talimat Formatı:
```
[Açıklama] push edildi. Yapman gerekenler:
1. ÖNCE AGENTS.md oku.
2. git pull --rebase origin main
3. Server restart
4. TEST — [adımlar]
5. HATA BULURSAN: küçük fix → push, büyük → raporla
```

### GitHub Push:
```
git push https://[TOKEN]@github.com/bombty/DOSPRESSO-App.git HEAD:main
```
Token ASLA dosya içine yazılmaz! Push reject → dosyadan token sil, amend, tekrar push.

---

## SİSTEM DURUMU (5 Nisan 2026)

Tech: React 18 + TypeScript + Vite | Node.js + Express | PostgreSQL (Neon) + Drizzle ORM
Rakamlar: 363+ tablo | 1500+ endpoint | 304+ sayfa | 27 rol | 19+ doküman

### Tamamlanan
- Proje v2 (6 tab) | Denetim v2 (şablon+form+aksiyon+SLA+trend)
- Dobody Agent v1.0 (10 sprint: 17 event, 12 modül, 27 scope, AI mesaj, özel dönemler)
- Sistem Atölyesi v4 (20 akış + diagnostic)
- DobodyProposalWidget v2 (draft mesaj + düzenle + gönder)
- Tüm modüllerde eksik roller düzeltildi

### Düzeltilen Bug'lar
- [x] Barista "Benim Günüm" hooks crash
- [x] Barista "İzin Yönetimi" crash
- [x] Şube ekipman listesi boş (manifest fix)
- [x] 12 modülde eksik roller

---

## TEKNİK NOTLAR

### 1. Çift Yetki Sistemi (KRİTİK!)
```
module-manifest.ts (yeni) + schema-02.ts PERMISSIONS (eski)
İKİSİNİ BİRLİKTE güncelle!
```

### 2. 27 Rol (schema-01.ts UserRole)
Sistem(1) + Yönetim(2) + HQ(12) + Şube(7) + Fabrika(4) + Kiosk(1)

### 3. AI Provider (hazır, kod değişikliği gerekmez)
Aktif: OpenAI | Hazır: Claude, Gemini | Geçiş: admin panelinden

### 4. Dobody Endpoint Çakışması
Eski: /api/dobody/generate-message (template) — dobody-generate-message.ts
Yeni: /api/dobody/generate-ai-message (AI) — dobody-message-generator.ts

---

## REFERANS DOSYALARI

| Dosya | İçerik |
|-------|--------|
| AGENTS.md | AI kuralları |
| STATUS.md | Canlı durum |
| docs/DOBODY-AGENT-PLAN.md | Dobody 16 bölüm |
| docs/ROLES-AND-PERMISSIONS.md | 27 rol detay |
| docs/BUSINESS-RULES.md | Bozulamaz kurallar |
| docs/INTEGRATION-MAP.md | AI multi-provider |
| docs/SISTEM-ATOLYESI-PLAN.md | 25 akış planı |

---

## BEKLEYEN İŞLER

### Kısa: ~~duyuru düzenleme bug~~ ✅, kiosk token, eski Dobody message birleştirme
### Orta: Atölye sağlık matrisi, proje portfolio widget, dinamik yetki kaydırma UI
### Uzun: Franchise features (~38 ekran), POS API, Dobody otonom eşik

---

## DUYURU SİSTEMİ v2 (AKTİF GELİŞTİRME — 5 Nisan 2026+)

### Tamamlanan
- [x] ImageStudio.tsx (commit `f0d988c`) — 5 sekmeli görsel düzenleme
  - Kırp (7 aspect preset), Arkaplan Silme (AI @imgly/background-removal),
    Ayar (parlaklık/kontrast/doygunluk/blur), Filtre (8 preset), Şekil (5 mask)
  - banner-editor.tsx + admin/duyurular.tsx entegrasyonu
- [x] Duyuru düzenleme bug fix (commit `1bad311`) — 5 eksik alan eklendi

### Sprint 1: Tasarım Stüdyosu + Onay Akışı (devam ediyor)
- [ ] Kategori şablonları (yeni ürün, reçete değişikliği, kanuni, kampanya...)
- [ ] TipTap zengin metin editörü (detailedContent alanı)
- [ ] Draft → Review → Approve → Publish yaşam döngüsü
- [ ] Görev bağlama (mevcut tasks tablosuna announcementId FK)

### Sprint 2: Landing Page + Acknowledgment
- [ ] /duyuru/:id tam sayfa route (şu an Dialog'da açılıyor)
- [ ] Hero banner + içerik blokları + CTA
- [ ] Acknowledgment butonu (reçete/kanuni duyurularda zorunlu)
- [ ] Mini quiz + eski/yeni diff görünümü

### Sprint 3: Header Banner + Kiosk
- [x] Üst bar header banner sistemi (rol bazlı, commit `9d3ddf4`)
- [x] Banner fatigue kontrolü (max 2 aynı anda)
- [x] Dismiss + tekrar gösterme (kalıcı/geçici)
- [x] announcement_dismissals tablosu
- [ ] Kiosk'ta vardiya başı zorunlu okuma (ayrı oturum — kiosk 2186 satır)

### Sprint 4: Analitik + Dobody
- [ ] Okuma/onay/tıklama oranları + rol/şube breakdown
- [ ] Dobody 18. event: announcement_followup
- [ ] "3 barista reçete değişikliğini onaylamadı" → hatırlatma + eskalasyon
- [ ] Görev tamamlama takibi

---

## CODEBASE YAPISI

```
DOSPRESSO-App/
├── client/src/
│   ├── pages/          — 195 sayfa (.tsx)
│   ├── components/     — 83 bileşen
│   │   ├── centrum/    — CentrumShell (tüm dashboard'lar bunu kullanır)
│   │   ├── home-screen/— role-module-config.ts (her rolün ana sayfa kartları)
│   │   ├── ui/         — Shadcn/ui
│   │   └── DobodyProposalWidget.tsx — Dobody öneri kartı
│   ├── hooks/          — useAuth.ts
│   ├── lib/            — queryClient, role-routes, turkish-labels
│   └── App.tsx         — TÜM route tanımları
├── server/
│   ├── routes/         — 106 route dosyası
│   ├── lib/            — dobody-workflow-engine, action-executor, message-generator
│   ├── services/       — ai-client.ts (multi-provider)
│   ├── ai.ts           — AI config + provider
│   ├── storage.ts      — DB erişim
│   └── routes.ts       — Route birleştirici
├── shared/
│   ├── schema/         — 21 schema (schema-01: UserRole, schema-02: PERMISSIONS)
│   └── module-manifest.ts — Modül yetkileri (yeni)
├── docs/               — 40+ MD doküman
└── AGENTS.md / STATUS.md / CHANGELOG.md
```

### En Kırılgan Dosyalar
| Dosya | Satır | Dikkat |
|-------|------:|--------|
| server/routes/factory.ts | 7655 | Fabrika tüm endpoint |
| server/routes/hr.ts | 7460 | İK + izin + bordro |
| shared/schema/schema-02.ts | 3311 | PERMISSIONS — manifest ile birlikte güncelle! |
| shared/module-manifest.ts | ~600 | Yetki — schema-02 ile birlikte güncelle! |
| client/src/App.tsx | ~600 | Route tanımları — bozulursa hiçbir sayfa açılmaz |

---

## ASLAN NASIL ÇALIŞIR

- Türkçe konuşur, UI Türkçe, DB enum karışık (TR+EN)
- Gece çalışır (01:00-05:00 arası)
- Önce plan ister, onaylar, sonra kod. Bazen direkt "devam et" der
- iPad'den Replit üzerinden test, screenshot gönderir
- Aslan iş sahibi — mimari kararları o verir, Claude önerir

---

## TEST ORTAMI

- Dev: `*.riker.replit.dev` (değişebilir)
- Prod: `dospressohq.replit.app` (sabit)
- Test kullanıcıları: Yavuz(Coach), Cihan(Barista/Işıklar), Aslan(Admin)
- DB: PostgreSQL Neon serverless (Replit env'de)

---

## YAPILAN HATALAR (TEKRARLAMA!)

| Hata | Ders |
|------|------|
| Token dosya içine yazıldı | Token SADECE komut satırında |
| `git reset --hard` | SADECE `git pull --rebase` |
| `view: 'own'` (string) | `view: true` (boolean) kullan |
| Manifest güncelle ama PERMISSIONS güncelleme | İKİSİNİ BİRLİKTE |
| SQL'de yanlış sütun (date→shift_date) | Schema'yı kontrol et |
| notifications'a category/metadata INSERT | Tablo yapısını kontrol et |
| Aynı endpoint path iki route'ta | Path çakışma kontrol et |
| Hook koşullu çağrılmış (if içinde useQuery) | Hook'lar her zaman aynı sırada |
