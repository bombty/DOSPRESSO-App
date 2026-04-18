# REPLIT ARAŞTIRMA PROMPT'U — SİSTEM DERİNLİK TARAMASI
**Hazırlayan:** Claude (18 Nis 2026 gece)
**Amaç:** Pazartesi Sprint B'den önce sistem anlayışını %75-80'den %90+'a çıkarmak
**Mod:** READ-ONLY (kod değişikliği YOK, commit YOK)
**Süre tahmini:** 15-20 dk

---

Merhaba Replit,

Bu gece oturumunda Sprint B.1 iskeleti iptal edildi (shift_attendance çakışması). Pazartesi daha sağlam başlamak için, aşağıda **8 spesifik araştırma başlığı** var. Her biri için hem DB sorgusu hem kısa kod analizi yapabilirsen minnettar olurum.

## SORU 1 — Kiosk Check-in Paralel Yazma Mekaniği

**Bağlam:** Kiosk check-in anında hem `pdks_records` hem `shift_attendance`'a yazılıyor. Hangi sırayla, transaction içinde mi, hata durumunda ne oluyor?

**Yapman istenenler:**
1. `server/routes/branches.ts` içinde `kiosk/shift-start` endpoint'ini oku (satır ~2796-3050)
2. İçinde `db.insert(pdksRecords)` ve `db.insert(shiftAttendance)` çağrılarının **sırasını** ve **transaction durumunu** raporla
3. Eğer pdks_records INSERT başarılı olup shift_attendance INSERT fail olursa ne oluyor? (orphan event)

**Beklenen çıktı:** 5-10 satırlık özet + risk değerlendirmesi.

---

## SORU 2 — monthly_payroll Neden Scheduler'sız?

**Bağlam:** Nisan'da sadece 10/41 user bordro kaydı var (yarım). Manuel tetikleniyor.

**Yapman istenenler:**
1. `monthly_payroll` tablosuna INSERT yapan tüm kod yerlerini bul: 
   ```bash
   grep -rn "insert(monthlyPayroll)\|INSERT INTO monthly_payroll" server/ --include="*.ts"
   ```
2. Bu INSERT'lerin çağrıldığı endpoint'leri listele (manuel trigger'lar mı?)
3. DB'de son 30 günde monthly_payroll'a kim tarafından INSERT yapılmış? (user_id ile join — muhasebe rolü mü?)

**Beklenen çıktı:** "Bordro Nisan 10/41 çünkü X butonu Y kişisi tarafından Z zaman tetiklendi" gibi net bir hikaye.

---

## SORU 3 — shift_attendance vs pdks_records 175 vs 87 Gap

**Bağlam:** Aynı 16 user için Nisan'da shift_attendance 175 event, pdks_records 87 event. Neden 2x fark?

**Yapman istenenler:**
1. Tek bir user seç (en çok event'i olan), o user için Nisan'ın tüm event'lerini iki tablodan yan yana çıkar
2. Farkı analiz et: shift_attendance fazla olan event'ler nereden geliyor? (shiftId farklı mı, dupplicate mi, başka kaynak mı?)
3. Eğer shift_attendance'ta "shiftId=NULL veya fake" kayıtlar varsa, bunları raporla

**Beklenen çıktı:** Gap'in kaynağı + temizlik gerekli mi kararı.

---

## SORU 4 — Akademi v1/v2/v3 Dosyalarının Ayrımı

**Bağlam:** Rapor "3 paralel akademi" diyor. Gerçekten ayrı mı yoksa evolüsyon mu?

**Yapman istenenler:**
```bash
ls server/routes/ | grep -i academy
wc -l server/routes/academy*.ts
grep "^router\." server/routes/academy*.ts | wc -l
```
Sonra her dosyanın ilk 30 satır yorumunu oku, amaçlarını raporla.

**Beklenen çıktı:** "academy-v1.ts = X, academy-v2.ts = Y, academy-v3.ts = Z" — net ayrım veya "aslında 3'ü aynı amaç, deprecate gerekli" kararı.

---

## SORU 5 — Audit v1/v2 Dualizmi

**Bağlam:** 10 template v1, 1 v2. Neden 2 paralel sistem?

**Yapman istenenler:**
1. `audit_templates` tablosunun şeması: v1/v2 field'ı nasıl ayırt ediliyor?
2. Her template'in `version` veya benzer alan değerlerini listele
3. v2 template'in v1'den FARKLI olan özelliği nedir? (kolon karşılaştır)

**Beklenen çıktı:** "v2 = X özelliği ekliyor, v1'den 9 template migrate edilmeli" gibi net plan.

---

## SORU 6 — supervisor_buddy Deprecate Hikayesi

**Bağlam:** 0 aktif / 39 pasif user var. Ne zaman deprecate edildi, 39 user nereye taşındı?

**Yapman istenenler:**
```sql
-- supervisor_buddy user'larının deactive tarihleri
SELECT 
  id, username, role, is_active, 
  updated_at, created_at
FROM users 
WHERE role = 'supervisor_buddy'
ORDER BY updated_at DESC
LIMIT 10;

-- Bu user'lar hangi role'e geçmiş (eğer log varsa)
-- role_history veya audit_log tablosu var mı kontrol et
```
Ayrıca kod tarafında `supervisor_buddy` referansları hâlâ duruyor mu?
```bash
grep -rn "supervisor_buddy" server/ client/src/ --include="*.ts" --include="*.tsx" | wc -l
```

**Beklenen çıktı:** "Deprecate ayı X, user'lar role=Y'e taşındı, kod tarafında hâlâ N referans var (temizlenmeli)" raporu.

---

## SORU 7 — pdks_records Kaynak Dağılımı Derin Analiz

**Bağlam:** Önceki raporda seed_test 704, kiosk 404, migration_fix 171, manual_test 2, auto_close 1.

**Yapman istenenler:**
1. Her kaynağın tarih aralığı + hangi branch'lerde yoğunlaştığı
2. `seed_test` kayıtlarının bir örnek 5 satırı (neyi seed ettiğini anlamak için)
3. Pilot'ta bu kayıtları silmek güvenli mi? Diğer tablolarla FK ilişkisi var mı?
   ```sql
   -- shift_attendance'da seed_test kaynaklı pdks'lere referans var mı?
   -- monthly_payroll hesaplarında seed_test data'sı kullanıldı mı?
   ```

**Beklenen çıktı:** "seed_test silme stratejisi" — güvenli/tehlikeli + hangi tablolarla paralel temizlik gerekli.

---

## SORU 8 — Hayalet Rol Silmeninin Güvenliği

**Bağlam:** fabrika_pisman/kalite/sorumlu/personel/fabrika rolleri 0 user, silinebilir diyoruz.

**Yapman istenenler:**
1. Bu 5 rolün referansı hâlâ kodda mı?
   ```bash
   for role in fabrika_pisman fabrika_kalite fabrika_sorumlu fabrika_personel fabrika; do
     echo "=== $role ==="
     grep -rn "\"$role\"\|'$role'" server/ client/src/ shared/ --include="*.ts" --include="*.tsx" | wc -l
   done
   ```
2. `module_manifest.ts` ve `schema-02.ts` PERMISSIONS map'inde bu roller tanımlı mı?
3. Silme sırası: önce kod → sonra DB mi, tersi mi?

**Beklenen çıktı:** "5 rol için silme prosedürü, sıra önemli" + kod temizlik checklist.

---

## ⏱️ Süre ve Format

Her soru için ~2 dk = toplam ~15-20 dk. Acele etme, eksik cevapla.

**Format:** Her soru için ayrı bir bölüm + sonuç özetinde "Pazartesi Sprint B'ye etkisi" 1 cümle.

**Commit:** YOK. Sadece rapor.

Teşekkürler! Pazartesi hazırlık için bu bilgi çok değerli olacak. 🟢
