# Wave A-2 Plan — pg_dump Cron + S3 Upload + DR Playbook

> **Sprint 2 / Wave A / İş #2** — Disaster Recovery seviye 5 hazırlığı.
> **Backlog ref:** B16 (Sprint 2 master backlog)
> **Tahmini süre:** 4 saat (isolated task agent)
> **Mode:** Plan + isolated agent
> **Bağımlılık:** Yok — bağımsız, paralel başlatılabilir.

---

## 1. Sorun Tanımı

`docs/PILOT-DAY1-ROLLBACK-PLAN.md` Bölüm 7'de tespit edildi:

| Seviye | Durum |
|---|---|
| 1 (workflow restart) | ✅ HAZIR |
| 2 (kod rollback) | ✅ HAZIR |
| 3 (Replit checkpoint) | ✅ HAZIR |
| 4 (Neon point-in-time) | 🟡 TEST EDİLMEDİ |
| **5 (pg_dump restore)** | **❌ EKSİK — Pilot Day-1 öncesi ZORUNLU** |

**Etki:** Eğer Neon point-in-time çalışmazsa veya Neon hesabı sorun yaşarsa, DB'yi geri getirebileceğimiz yedek YOK. Veri kaybı %100 risk.

---

## 2. Çözüm Hedefi

### 2.1 Üç Bileşen
1. **pg_dump cron script** — günlük (gece 03:00) tam DB dump alma
2. **S3 / Object Storage upload** — dump'ı Replit Object Storage'a yükleme + 30 gün retention
3. **DR Playbook** — felaket anında restore prosedürü (1 sayfa, adım adım)

### 2.2 Replit Object Storage Kullanımı
- Mevcut bucket: `DEFAULT_OBJECT_STORAGE_BUCKET_ID` (env)
- Klasör yapısı: `db-backups/dospresso/YYYY-MM-DD/dump.sql.gz`
- Sıkıştırma: gzip (~%70 küçülme)
- Tahmini boyut: 500MB ham → ~150MB sıkışık
- 30 gün × 150MB = ~4.5GB toplam

---

## 3. Implementasyon Adımları

### Faz 1 — pg_dump Script (1 saat)
1. `scripts/backup/pg-dump-daily.ts` oluştur:
   - DATABASE_URL'den connection bilgisi al
   - pg_dump komutu çalıştır (`--format=custom --no-owner --no-acl`)
   - Output dosyasını gzip ile sıkıştır
   - Dosya adı: `dospresso-YYYY-MM-DD-HHmm.dump.gz`
   - Local geçici klasör: `/tmp/db-backups/`
2. Test: manuel çalıştır, dump dosyası oluştu mu?

### Faz 2 — Object Storage Upload (1 saat)
3. `scripts/backup/upload-to-storage.ts` oluştur:
   - `@replit/object-storage` SDK kullan
   - `db-backups/dospresso/YYYY-MM-DD/dump.sql.gz` path
   - Upload başarılıysa local dosyayı sil
4. `pg-dump-daily.ts` içinden upload'u çağır
5. Test: dump → upload → Object Storage'da dosya görünüyor mu?

### Faz 3 — Retention Policy (30 dk)
6. `scripts/backup/cleanup-old-backups.ts` oluştur:
   - Object Storage'da `db-backups/dospresso/` listele
   - 30 günden eski dosyaları sil
   - Log: kaç dosya silindi
7. `pg-dump-daily.ts` sonunda cleanup'ı çağır
8. Test: 31 gün önce tarihli mock dosya oluştur, cleanup çalıştır, silindi mi?

### Faz 4 — Cron Setup (30 dk)
9. `package.json` script ekle:
   ```json
   "backup:daily": "tsx scripts/backup/pg-dump-daily.ts"
   ```
10. **Replit ortamında cron yok** → 2 alternatif:
    - **Alternatif A:** Mevcut `node-cron` veya `bullmq` scheduler'ı kullan (`server/scheduler.ts` veya benzer dosya inceleme gerek)
    - **Alternatif B:** External cron servisi (örn. cron-job.org → POST /api/admin/trigger-backup endpoint çağırır, AUTH'lu)
11. **Önerilen:** Alternatif A — mevcut scheduler'a yeni job ekle (gece 03:00 UTC = TR 06:00)

### Faz 5 — Restore Playbook (30 dk)
12. `docs/runbooks/db-restore-from-backup.md` oluştur (~80 satır):
    - Adım 1: Object Storage'dan en son backup'ı indir
    - Adım 2: gzip aç → `dump.sql`
    - Adım 3: Test DB'ye restore et (önce!) → veri tutarlı mı?
    - Adım 4: Production restore karar (2 imza zorunlu)
    - Adım 5: `psql` ile restore komutu (örnek hazır)
    - Adım 6: App restart + smoke test
    - Adım 7: Restore sonrası iletişim (PILOT-COMMUNICATION-PLAN şablonu)

### Faz 6 — Doğrulama (1 saat)
13. Manuel `npm run backup:daily` çalıştır → dump + upload + cleanup başarılı
14. Object Storage'da bugünkü dosya görünüyor (admin UI veya script ile listele)
15. Test restore: Boş bir test branch oluştur, dump'ı restore et, tablo sayısı + örnek satır kontrol
16. Cron çalışacak mı? Scheduler logu kontrol (sonraki gece 03:00 UTC test sonucu)
17. PILOT-DAY1-ROLLBACK-PLAN.md Bölüm 7 güncelle: "Seviye 5 ✅ HAZIR"

---

## 4. Acceptance Criteria

- [ ] `scripts/backup/pg-dump-daily.ts` oluşturuldu, manuel test PASS
- [ ] `scripts/backup/upload-to-storage.ts` oluşturuldu, Object Storage'a upload PASS
- [ ] `scripts/backup/cleanup-old-backups.ts` oluşturuldu, 30 gün retention test PASS
- [ ] `package.json` `backup:daily` script eklendi
- [ ] Scheduler'a günlük job eklendi (gece 03:00 UTC)
- [ ] `docs/runbooks/db-restore-from-backup.md` oluşturuldu (~80 satır)
- [ ] Test restore başarılı (test branch'te tablo + satır sayısı kontrol)
- [ ] PILOT-DAY1-ROLLBACK-PLAN.md Seviye 5 "✅ HAZIR" notu
- [ ] DECISIONS.md'ye eklendi: "Backup retention 30 gün, format custom + gzip"
- [ ] `npx tsc --noEmit` PASS
- [ ] replit.md memory'e kısa not (Wave A-2 MERGED)

---

## 5. Risk + Rollback

### Risk
- **Object Storage quota dolar:** 4.5GB az ama uzun vadede kontrol gerek. **Mitigation:** Cleanup'tan sonra storage usage logla
- **pg_dump uzun sürer (>5 dk):** Büyük tablolar varsa scheduler timeout. **Mitigation:** `--exclude-table-data` ile log/event tablolarını dump dışı tut (örn. `audit_logs`, `notifications` historik)
- **Test restore production'a değer mi:** Test branch'e restore — production etkilenmez. **Mitigation:** Faz 6 adım 15 net "test branch"

### Rollback
- pg_dump çalışmazsa → cron job devre dışı bırak (workflow restart yeterli)
- Storage upload başarısızsa → local dosya kalsın, manuel inceleme
- DB restore yapılırsa → bu zaten DR durumu, normale dönüş app restart sonrası

---

## 6. Bağımlılıklar

### Önce çözülmesi gerekenler
- Yok — bağımsız

### Sonra etkileneceklere
- DR seviye 4 (Neon point-in-time) test — bu task tamamlanırsa post-pilot test daha rahat
- B17 (login lockout DB) — Yedek aldığımız DB değişiklikten önceki haline dönülebilir

---

## 7. İzole Task Agent İçin Notlar

### Yapma
- Şema değişikliği yapma
- Mevcut DB'ye DDL/DML çalıştırma (sadece okuma + dump)
- Backup'ı email ile gönderme (büyük + güvenlik riski)
- Backup dosyasını git'e push etme (kesinlikle hayır)

### Yap
- Object Storage SDK kullan (mevcut integration ✅)
- Sıkıştırma + retention zorunlu
- Test restore mutlaka yap
- Restore playbook'u net + adım adım yaz
- Backup dosyasında hassas veri olduğunu hatırla → erişim sadece admin/ceo

---

## 8. Önemli Teknik Notlar

### pg_dump Komut Önerisi
```bash
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --exclude-table-data='audit_logs' \
  --exclude-table-data='notifications' \
  --exclude-table-data='scheduler_executions' \
  --file=/tmp/db-backups/dospresso-2026-05-02-0300.dump
```

### Restore Komut Önerisi
```bash
pg_restore --dbname="$TEST_DATABASE_URL" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  /tmp/db-backups/dospresso-2026-05-02-0300.dump
```

### Object Storage SDK Kullanımı
```typescript
import { Client } from '@replit/object-storage';
const client = new Client();
await client.uploadFromFilename(
  `db-backups/dospresso/${dateStr}/${filename}`,
  localPath
);
```

---

## 9. İLİŞKİLİ DOKÜMANLAR

- `docs/PILOT-DAY1-ROLLBACK-PLAN.md` — DR seviye tanımı
- `docs/SPRINT-LIVE.md` — Açık işler
- `docs/SPRINT-2-WAVE-PLAN.md` — Wave A planı
- `docs/audit/sprint-2-master-backlog.md` — B16 detay
- `replit.md` — Migration süreci (DB ile temas eden işler için)

---

> **Bu plan task agent için yeterli detayda. Owner Plan moduna geçince bu doc'u referans verip task aç.**
