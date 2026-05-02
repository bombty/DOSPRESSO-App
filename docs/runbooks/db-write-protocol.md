# DB WRITE PROTOCOL — DOSPRESSO

Production veritabanına yazma işlemi için zorunlu protokol. Owner (Aslan) tarafından koyulan kural; Replit (uygulayıcı) bu protokolü atlamadan DB write yapamaz.

Son güncelleme: 2 Mayıs 2026  
Kaynak karar: `docs/DECISIONS.md` md. 9 (DB write öncesi backup + dry-run + owner GO zorunlu).

---

## Genel Prensipler

1. **DB write işleri Replit tarafından yapılır.** Owner DB'ye doğrudan dokunmaz; Replit, owner'ın açık talimatı ve GO'su ile yazar.
2. **Hard delete YASAK** (`DECISIONS.md` md. 8). Test/demo kullanıcılar dahil her şey soft-delete (`deleted_at`) veya pasifleştirme (`is_active=false`) ile yapılır.
3. **Hassas veri loglanmaz.** PIN, password, token, bcrypt hash, müşteri PII raporda asla yazılmaz; sadece "X kayıt güncellendi" / "PIN seed OK" şeklinde durum raporlanır.
4. **Schema/migration değişiklikleri ayrı kanal:** `migrations/` altında versiyonlu SQL ile yapılır (`replit.md` Migration Süreci). DB write protokolü veri (DML) yazımı içindir; DDL için migration süreci uygulanır.

---

## 8 Adımlık Akış

### 1. Read-only analiz

- Mevcut durumu SELECT ile incele.
- Etkilenecek satır sayısını çıkar (`SELECT COUNT(*) FROM ... WHERE ...`).
- İlişkili FK / dependent tabloları listele.
- Owner'a kapsam özetini paylaş (kaç tablo, kaç satır, hangi alanlar).

### 2. SQL preview

- Yazma SQL'ini owner'a göster (komutu DB'de çalıştırmadan).
- WHERE clause'unu birden fazla okumayla doğrula (test ortamında SELECT olarak çalıştır).
- Hard delete varsa DUR — soft-delete'e çevir.

### 3. Dry-run / ROLLBACK

- BEGIN; → UPDATE/INSERT/DELETE; → SELECT (etkilenen satırları doğrula); → ROLLBACK;
- Etkilenen satır sayısı `read-only analiz` adımındaki sayıyla eşleşmeli.
- Eşleşmezse DUR, owner'a raporla, kapsamı tekrar değerlendir.

### 4. Backup

- Etkilenecek tablo(lar)nın current snapshot'ını al:
  - `CREATE TABLE backup_<table>_YYYYMMDD AS TABLE <table>;` (in-DB), VEYA
  - `pg_dump -t <table> ... > backups/<table>-YYYYMMDD-HHMM.sql.gz` (file-based).
- Backup dosyaları `.gitignore` ile tracking dışı (bkz. `git-security-cleanup.md`).
- Backup başarılı doğrulandıktan sonra (`SELECT COUNT(*) FROM backup_...` orijinalle eşleşir) bir sonraki adıma geç.

### 5. Owner GO

- Owner'a şunu paylaş:
  - Etkilenecek tablo(lar) ve satır sayıları
  - SQL preview
  - Dry-run sonucu (etkilenen satır sayısı)
  - Backup yolu/adı
  - Geri alma planı (adım 8)
- Owner **açık metinle GO der**: "Yes, GO" / "Devam et" / "Onaylı" — yorumlama yok, açık onay.
- Owner GO vermezse iş durur, açık konular netleştirilir, gerekirse SQL revize edilir.

### 6. COMMIT

- BEGIN; → UPDATE/INSERT/DELETE; → SELECT (doğrula); → COMMIT;
- Owner GO sonrası komut çalıştırılır.
- Hata olursa transaction `ROLLBACK`; tekrar başla.

### 7. Verification

- Yazma sonrası SELECT ile sonucu doğrula:
  - Hedeflenen satır sayısı doğru mu?
  - İlişkili tablolarda beklenen yan etki oluştu mu?
  - Constraint/FK ihlali yok mu?
- Sonucu owner'a raporla (sayı + örnek satır — hassas alan maskelenmiş).

### 8. Rollback planı

- Her DB write öncesi rollback planı yazılı olarak hazır olmalı:
  - `RESTORE FROM backup_<table>_YYYYMMDD;` (in-DB), VEYA
  - `psql ... < backups/<table>-YYYYMMDD-HHMM.sql.gz`
- Rollback senaryosu owner'a önceden paylaşılır (adım 5).
- Rollback gerekirse: owner GO + backup'tan restore + verification (yine 8 adım protokolü).

---

## Yasaklar

- ❌ Hard delete (her durumda — test/demo dahil).
- ❌ `TRUNCATE` (kullanım gerekirse owner özel onayı + ayrı protokol).
- ❌ `DROP TABLE` / `DROP COLUMN` (DDL — migration kanalı kullan).
- ❌ Backup almadan yazma (istisna yok).
- ❌ Dry-run atlamak (istisna yok).
- ❌ Owner GO almadan COMMIT (istisna yok).
- ❌ Hassas veriyi raporda/log'da yazmak (PIN, password, bcrypt hash, token, müşteri PII).

---

## Hızlı Kontrol Listesi (DB write öncesi)

- [ ] Read-only analiz tamamlandı, etkilenecek satır sayısı biliniyor.
- [ ] SQL preview owner'a paylaşıldı.
- [ ] Dry-run yapıldı, etkilenen satır sayısı eşleşti.
- [ ] Backup alındı ve doğrulandı.
- [ ] Owner açık GO verdi.
- [ ] Rollback planı yazılı.

Hepsi ✅ olmadan COMMIT YOK.

---

## Sık Karşılaşılan Senaryolar

### A) PIN seed / cleanup
- Hassas veri var (PIN bcrypt hash). Raporda PIN'lerin kendisi asla yazılmaz.
- Backup: `users` tablosu (etkilenecek satırlar için) + `kiosk_pin` ilişkili tablolar.
- Audit log: hangi kullanıcı PIN seed/cleanup operasyonuna girdi → JSON dosya `docs/pilot/audit/<tarih>.json` (PII maskelenmiş).

### B) Test kullanıcı pasifleştirme
- Hard delete YASAK; `is_active=false` + `deleted_at=now()` SET.
- Backup: ilgili `users` satırları + ilişkili sessions.
- Verification: kullanıcı login deneyince 401/403 döner.

### C) Pilot test kaydı işaretleme
- `branch_shift_sessions`, `factory_shift_sessions`, `hq_shift_sessions`, `shift_attendance` tablolarında `notes` alanı `PILOT_PRE_DAY1_TEST_<tarih>` olarak SET.
- Backup gereksiz (sadece notes alanı update); ama yine de etkilenen satır listesi hazır olmalı.

---

> Bu protokol değişikliği yalnızca owner (Aslan) tarafından yapılır. Replit ve ChatGPT bu dosyayı kendi başlarına güncellemez; ancak öneri sunabilirler.
