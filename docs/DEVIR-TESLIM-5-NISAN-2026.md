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

### Kısa: duyuru düzenleme bug, kiosk token, eski Dobody message birleştirme
### Orta: Atölye sağlık matrisi, proje portfolio widget, dinamik yetki kaydırma UI
### Uzun: Franchise features (~38 ekran), POS API, Dobody otonom eşik
