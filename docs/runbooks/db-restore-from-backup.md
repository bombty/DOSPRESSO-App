# Runbook — DB Restore from pg_dump Backup

> **Amaç:** Replit Object Storage'da saklanan günlük `pg_dump` backup'ından DB'yi geri yükleme.
> **Tetikleyici:** PILOT-DAY1-ROLLBACK-PLAN Seviye 5 (DB tamamen düştü, Neon point-in-time çalışmıyor).
> **Karar makamı:** Aslan (owner) + Eren (fabrika sorumlu) **ortak imza, en az 2 kişi**.
> **Tahmini süre:** ~45 dakika (indirme + restore + smoke test).

---

## 0. Önkoşullar

- [ ] **2 imza** — Aslan + Eren ortak GO
- [ ] Mevcut DB'nin son durumu screenshot/log alındı (post-mortem için)
- [ ] Pilot kullanıcılar "duraklatın" mesajını aldı (PILOT-COMMUNICATION-PLAN şablonu)
- [ ] Yeni boş bir Neon branch oluşturuldu (TEST DB) — production'a doğrudan dokunma
- [ ] `pg_restore` binary kurulu (Replit Shell `pg_restore --version` ile doğrula)

---

## 1. En Son Backup'ı Bul

```bash
# Object Storage'daki backup'ları listele (manuel admin scripti yoksa)
tsx -e '
import { objectStorageClient } from "./server/objectStorage";
const bucket = objectStorageClient.bucket(process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID!);
const [files] = await bucket.getFiles({ prefix: "db-backups/dospresso/" });
files.sort((a, b) => b.name.localeCompare(a.name));
console.log(files.slice(0, 10).map(f => f.name).join("\n"));
'
```

Beklenen çıktı (en yenisi en üstte):
```
db-backups/dospresso/2026-05-02/dump.dump
db-backups/dospresso/2026-05-01/dump.dump
db-backups/dospresso/2026-04-30/dump.dump
...
```

---

## 2. Backup'ı İndir

```bash
mkdir -p /tmp/db-restore
DUMP_PATH="db-backups/dospresso/2026-05-02/dump.dump"   # Adım 1'den seç

tsx -e "
import { objectStorageClient } from './server/objectStorage';
const bucket = objectStorageClient.bucket(process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID!);
await bucket.file('${DUMP_PATH}').download({ destination: '/tmp/db-restore/restore.dump' });
console.log('Downloaded');
"

ls -lh /tmp/db-restore/restore.dump
```

**Bekleme:** 100-200 MB, 5-10 saniye.

---

## 3. TEST DB'ye Restore (ZORUNLU İLK ADIM — production'a değil)

```bash
# 1. Neon Console'da yeni branch oluştur: "restore-test-YYYY-MM-DD"
# 2. Branch'in connection string'ini al (TEST_DATABASE_URL olarak export et)
export TEST_DATABASE_URL="postgresql://...neondb-test..."

# 3. Restore çalıştır
pg_restore \
  --dbname="$TEST_DATABASE_URL" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  --verbose \
  /tmp/db-restore/restore.dump 2>&1 | tee /tmp/db-restore/restore.log

# 4. Hatalı satır var mı kontrol
grep -i "error\|fatal" /tmp/db-restore/restore.log | head -20
```

**KABUL KRİTERİ:** Sadece "errors ignored on restore" benzeri info mesajları. Gerçek hata olmayacak.

---

## 4. Test DB Smoke Test

```bash
# Tablo sayısı kontrol
psql "$TEST_DATABASE_URL" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"
# Beklenen: 200+ tablo

# Kritik tablo satır sayıları
psql "$TEST_DATABASE_URL" -c "
SELECT 'users' AS tbl, COUNT(*) FROM users UNION ALL
SELECT 'branches', COUNT(*) FROM branches UNION ALL
SELECT 'tasks', COUNT(*) FROM tasks UNION ALL
SELECT 'pdks_records', COUNT(*) FROM pdks_records UNION ALL
SELECT 'shift_attendance', COUNT(*) FROM shift_attendance;
"

# Admin kullanıcı var mı?
psql "$TEST_DATABASE_URL" -c "SELECT id, username, account_status FROM users WHERE username='admin';"
```

**KABUL KRİTERİ:** Tüm sayılar pozitif, admin kullanıcı görünür, oranlar son operasyon raporuna yakın (±%5).

---

## 5. PRODUCTION RESTORE KARARI — 2 İMZA ZORUNLU

| Kontrol | Aslan | Eren |
|---|:--:|:--:|
| Test restore PASS (Adım 3+4) | ☐ | ☐ |
| Mevcut prod DB tamamen kayıp/bozuk | ☐ | ☐ |
| Pilot kullanıcılar bilgilendirildi | ☐ | ☐ |
| Veri kaybı kabul edilebilir (son backup'tan sonraki yazımlar gidecek) | ☐ | ☐ |

**HER İKİ TARAFTAN ☑ GELMEDEN ADIM 6'YA GEÇMEYİN.**

---

## 6. Production Restore (geri dönüşü yok)

```bash
# DİKKAT: Bu komut $DATABASE_URL'deki tüm tabloları siler ve backup'tan yeniden yazar.
# Tekrar tekrar onayla. Yanlış DB'yi vurursan kaybedilir.
echo "Hedef DB: $DATABASE_URL"
read -p "Devam et? (yalnızca 'EVET-RESTORE' yazınca devam) " confirm
[ "$confirm" = "EVET-RESTORE" ] || exit 1

# Önce uygulamayı durdur (Replit UI'dan workflow stop)

pg_restore \
  --dbname="$DATABASE_URL" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  --verbose \
  /tmp/db-restore/restore.dump 2>&1 | tee /tmp/db-restore/restore-prod.log
```

---

## 7. Post-Restore Smoke Test

```bash
# Workflow başlat (Replit UI veya Build modunda Agent restart)

# Login simulasyonu (admin)
curl -X POST "$REPLIT_DEV_DOMAIN/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<ADMIN_BOOTSTRAP_PASSWORD>"}' \
  -c /tmp/restore-cookies.txt

# Bir endpoint sorgu
curl -b /tmp/restore-cookies.txt "$REPLIT_DEV_DOMAIN/api/me"
curl -b /tmp/restore-cookies.txt "$REPLIT_DEV_DOMAIN/api/branches" | head -100
```

**KABUL KRİTERİ:** Login OK, `/api/me` admin döner, `/api/branches` 22 kayıt döner.

---

## 8. İletişim

Restore başarılıysa pilot grubuna mesaj (PILOT-COMMUNICATION-PLAN "Devam" şablonu):

> "Sistem geri yüklendi. Saat HH:MM ile HH:MM arası girilen veriler kaybolmuş olabilir. Lütfen kontrol edin, eksikse tekrar girin. Özür dileriz."

---

## 9. Post-Mortem (24 saat içinde)

`docs/audit/restore-postmortem-YYYY-MM-DD.md` oluştur:
- Neden restore gerekti? (root cause)
- Neden Neon point-in-time çalışmadı? (Seviye 4 başarısız mıydı?)
- Hangi backup kullanıldı? (tarih + boyut)
- Veri kaybı: kaç saat? Kaç kayıt? Hangi tablolar?
- Pilot kullanıcı etkisi
- Sprint 2 backlog'a önleyici iş ekle

---

## 10. İlgili Dokümanlar

- `docs/PILOT-DAY1-ROLLBACK-PLAN.md` — Seviye 5 tetikleyici tanımı
- `docs/PILOT-DAY1-INCIDENT-LOG.md` — incident kayıt
- `docs/PILOT-COMMUNICATION-PLAN.md` — kullanıcı bildirim şablonları
- `docs/runbooks/db-write-protocol.md` — DB-write acil prosedür (restore'dan farklı)
- `scripts/backup/pg-dump-daily.ts` — backup üretici script

---

> **Bu runbook her ay 1 kere prova edilmeli (TEST branch'e dry-run restore). Production restore sadece gerçek DR durumunda.**
