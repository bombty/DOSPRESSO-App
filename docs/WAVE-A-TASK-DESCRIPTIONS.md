# Wave A — Plan Modu Task Açma (Copy-Paste Hazır)

> **Amaç:** Owner Plan moduna geçince hızlıca 3 task açabilmesi için copy-paste hazır task description'lar.
> **Kullanım:** Aşağıdaki 3 task'i sırayla `project_tasks` üzerinden propose et. Bağımlılık yok → 3 paralel.

---

## 📋 Task #278: Wave A-1 — Acil AUTH Fix (G1+G2)

### Title
```
Wave A-1: AUTH fix delegation-routes (5) + module-content-routes (5) — G1+G2
```

### Description
```
Audit bulguları G1 ve G2'ye göre 10 endpoint anonim erişime açık. Pilot Day-1 öncesi en kritik güvenlik açığı.

KAPSAM:
1. server/routes/delegation-routes.ts — 5 endpoint (GET, POST, GET/:id, PATCH/:id, DELETE/:id)
2. server/routes/module-content-routes.ts — 5 endpoint (POST, GET/:moduleId, PATCH/:id, DELETE/:id, POST/:id/publish)

YAPILACAK:
- Her endpoint'e isAuthenticated middleware ekle
- POST/PATCH/DELETE endpoint'lere hasRole([...]) rol kontrolü ekle (önerilen rol matrisi: docs/plans/W-A1-auth-fix-delegation-module-content.md Bölüm 2.2)
- Owner check (delegation/:id PATCH/DELETE, module-content/:id PATCH) — kullanıcı kendi kaydı mı kontrol et
- Frontend etkilenen sayfaları manuel test (delegations admin, akademi modül içerik)

PLAN DOSYASI:
docs/plans/W-A1-auth-fix-delegation-module-content.md (~250 satır, detaylı adımlar + 16 test senaryosu)

TEST:
- Anonim → 401, yetkisiz rol → 403, yetkili rol → 200
- 16 test senaryosu (T1-T16) — curl ile manuel doğrulama
- npx tsc --noEmit PASS

BAĞIMLILIK: Yok — bağımsız çalışır

YAPMA:
- Şema değişikliği yapma
- Yeni rol enum ekleme yapma (B14 ayrı iş)
- Business logic değiştirme (sadece auth/authz ekle)
- Mevcut API contract'ı kırma

YAP:
- isAuthenticated + hasRole ekle
- DECISIONS.md ve audit doc güncelle
- replit.md memory'e KISA not (Sprint 2 W-A1 MERGED + 1 cümle)
- SPRINT-LIVE.md "Tamamlananlar" listesine ekle (sıralı, en sona)

TAHMİNİ SÜRE: 1.5 saat
```

### Acceptance Criteria
```
- delegation-routes.ts 5 endpoint isAuthenticated ile korumalı
- module-content-routes.ts 5 endpoint isAuthenticated ile korumalı
- POST/PATCH/DELETE'lere uygun hasRole eklendi
- Owner check implementasyonu var
- Anonim 401, yetkisiz 403, yetkili 200 — manuel doğrulandı
- Frontend sayfalar hâlâ çalışıyor
- npx tsc --noEmit PASS
- Audit doc G1+G2 "Çözüldü" notu
- DECISIONS.md güncel
```

---

## 📋 Task #279: Wave A-2 — pg_dump Cron + S3 Upload + DR Playbook

### Title
```
Wave A-2: pg_dump günlük cron + Object Storage upload + DR restore playbook (B16)
```

### Description
```
Pilot Day-1 öncesi DR seviye 5 hazırlığı. Şu an pg_dump cron yok → Neon point-in-time çalışmazsa veri kaybı %100 risk.

KAPSAM:
1. scripts/backup/pg-dump-daily.ts — Günlük tam DB dump (gzip)
2. scripts/backup/upload-to-storage.ts — Replit Object Storage'a upload
3. scripts/backup/cleanup-old-backups.ts — 30 gün retention
4. package.json "backup:daily" script
5. Mevcut scheduler'a günlük job (gece 03:00 UTC = TR 06:00)
6. docs/runbooks/db-restore-from-backup.md — Restore playbook (~80 satır)

YAPILACAK:
- pg_dump --format=custom --no-owner --no-acl --exclude-table-data='audit_logs','notifications','scheduler_executions'
- Object Storage path: db-backups/dospresso/YYYY-MM-DD/dump.sql.gz
- Retention: 30 gün, eski dosyaları cleanup script siler
- Test restore: test branch'e restore et, tablo + örnek satır kontrol
- PILOT-DAY1-ROLLBACK-PLAN.md Seviye 5 "✅ HAZIR" güncelle

PLAN DOSYASI:
docs/plans/W-A2-pgdump-cron-DR.md (~280 satır, 6 faz, restore komut örnekleri)

TEST:
- Manuel npm run backup:daily → dump + upload + cleanup PASS
- Object Storage'da bugünkü dosya görünüyor
- Test branch'e restore PASS
- Cron job scheduler'da kayıtlı (sonraki gece 03:00 UTC denenecek)

BAĞIMLILIK: Yok — bağımsız

YAPMA:
- Mevcut DB'ye DDL/DML çalıştırma
- Backup'ı email/git ile gönderme
- Hassas veriyi log'a yazma

YAP:
- @replit/object-storage SDK kullan
- Sıkıştırma + retention zorunlu
- Test restore mutlaka yap
- DECISIONS.md'ye eklendi: "Backup retention 30 gün, format custom + gzip"
- replit.md memory'e KISA not + Migration süreci güncellemesi

TAHMİNİ SÜRE: 4 saat
```

### Acceptance Criteria
```
- 3 script dosyası oluşturuldu (pg-dump, upload, cleanup)
- package.json backup:daily script
- Scheduler'a günlük job eklendi
- docs/runbooks/db-restore-from-backup.md (~80 satır)
- Test restore başarılı
- PILOT-DAY1-ROLLBACK-PLAN.md Seviye 5 ✅ HAZIR
- DECISIONS.md güncel
- npx tsc --noEmit PASS
```

---

## 📋 Task #280: Wave A-3 — ROLE_MODULE_DEFAULTS 16 Eksik Rol

### Title
```
Wave A-3: ROLE_MODULE_DEFAULTS 16 eksik rol için modül erişim varsayılanı seed (B14)
```

### Description
```
replit.md "Bilinen açık" notuna göre ROLE_MODULE_DEFAULTS tablosunda 16 rol eksik. CEO, CGO, mudur dahil pilot için kritik roller — Day-1'de modül erişim listesi tutarsız olabilir.

KAPSAM:
16 rol için modül erişim varsayılanı INSERT (toplam ~250-300 satır):
- HQ Executive: ceo, cgo
- HQ Departman: marketing, kalite_kontrol, gida_muhendisi
- Branch Hierarchy: mudur, sef, sube_kiosk
- Factory Floor: uretim_sefi, fabrika_operator, fabrika_sorumlu, fabrika_personel, fabrika_depo
- Factory Recipe: recete_gm

YAPILACAK:
1. Mevcut 15 rolün defaults'ını incele (SELECT + tablo schema)
2. Modül listesini topla (SELECT DISTINCT module_key + shared/schema)
3. 16 rol × ~25 modül matrisi hazırla (önerilen matris: docs/plans/W-A3-role-module-defaults-16-rol.md Bölüm 3.3)
4. migrations/00NN_role_module_defaults_16_rol.sql oluştur (BEGIN/COMMIT, ON CONFLICT DO NOTHING)
5. DB-WRITE PROTOKOL: backup verify, dry-run sayım, 2 imza, sonra UYGULA
6. Pilot CEO + mudur ile login test (modül listesi eksiksiz mi)

PLAN DOSYASI:
docs/plans/W-A3-role-module-defaults-16-rol.md (~250 satır, 6 faz, rol matrisi, rollback)

TEST:
- SELECT role, COUNT(*) FROM role_module_defaults GROUP BY role → 31 rol
- CEO (Aslan) login → modül listesi tam
- mudur (örn. Mahmut/Erdem) login → mudur modülleri görünüyor

BAĞIMLILIK: Yok — bağımsız (W-A2 backup hazırsa daha güvenli, ama zorunlu değil)

YAPMA:
- Mevcut 15 rolün defaults'ını DEĞİŞTİRME (sadece INSERT)
- Yeni rol enum ekleme (31 rol schema-01.ts:52-98'de zaten tanımlı)
- module_flags kullanıcı bazlı override'ları silme
- Production'a dry-run yapmadan INSERT

YAP:
- Transaction içinde çalıştır
- ON CONFLICT (role, module_key) DO NOTHING
- Insert sayısını commit message'a yaz
- replit.md "Bilinen açık" notu kaldır
- DECISIONS.md'ye matris versiyonu
- Migration dosyasını _journal.json'a ekle

TAHMİNİ SÜRE: 2 saat
```

### Acceptance Criteria
```
- Mevcut 15 rol incelendi, schema dokumante
- 16 rol matrisi hazırlandı + agent revize
- Migration SQL oluşturuldu (transaction)
- Dry-run sayım yapıldı (~250-300 beklenen)
- Migration uygulandı, INSERT log doğrulandı
- 31 rol GROUP BY ile doğrulandı
- CEO + mudur login test PASS
- replit.md "Bilinen açık" notu kaldırıldı
- DECISIONS.md güncel
- sprint-2-master-backlog.md B14 "Tamamlandı"
```

---

## 🚀 OWNER PLAN MODU AKIŞI

### Adım 1: Plan moduna geç
Replit UI üzerinden Plan moduna geçiş.

### Adım 2: 3 Task'i sırayla aç
Yukarıdaki Title + Description + Acceptance Criteria'ları sırayla copy-paste:
1. Task #278 (Wave A-1)
2. Task #279 (Wave A-2)
3. Task #280 (Wave A-3)

### Adım 3: Bağımlılık ayarı
**HER 3 TASK BAĞIMSIZ** → herhangi birini başkasına bağlama. Paralel başlasın.

### Adım 4: Owner onay
3 task da "İsolated task agent'a delegate" seç → paralel başlar.

### Adım 5: Beklenen sonuç (1 hafta içinde)
- Task #278 MERGED (~1.5 saat agent süresi)
- Task #279 MERGED (~4 saat agent süresi)
- Task #280 MERGED (~2 saat agent süresi)

→ Wave A teknik kısmı tamam. Eğitim materyali (Sema/Eren/Aslan) ve pilot kullanıcı listesi (Owner) paralel devam.

---

## 📊 BEKLENEN ETKİ

| Önce | Sonra (Wave A merge) |
|---|---|
| 10 endpoint anonim erişime açık (G1+G2) | 0 endpoint anonim |
| pg_dump cron yok, DR seviye 5 ❌ | DR seviye 5 ✅ HAZIR, günlük backup |
| ROLE_MODULE_DEFAULTS 15 rol (16 eksik) | ROLE_MODULE_DEFAULTS 31 rol tam |
| Pilot Day-1 NO-GO (3 kritik eksik) | Pilot Day-1 GO için teknik temiz |

---

## 🔗 İLİŞKİLİ DOKÜMANLAR

- `docs/SPRINT-2-WAVE-PLAN.md` — Bütünsel plan
- `docs/plans/W-A1-auth-fix-delegation-module-content.md`
- `docs/plans/W-A2-pgdump-cron-DR.md`
- `docs/plans/W-A3-role-module-defaults-16-rol.md`
- `docs/audit/system-multi-perspective-evaluation-2026-05-02.md` — G1+G2
- `docs/audit/sprint-2-master-backlog.md` — B14 + B16
- `docs/PILOT-DAY1-ROLLBACK-PLAN.md` — DR seviye 5
- `replit.md` — "Bilinen açık" + Migration süreci

---

> **Bu doküman Plan moduna geçişten saniyeler sonra task açabilmen için copy-paste hazır. Hazır olduğunda Plan moduna geç.**
