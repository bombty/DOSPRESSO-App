# 📋 DOSPRESSO Veri Temizlik Tutanağı — 10 Mayıs 2026

**Belge Türü:** KVKK Madde 7 Uyum Belgesi
**Tarih:** 10 Mayıs 2026
**Sorumlu:** Aslan (CEO, Veri Sorumlusu)
**Hazırlayan:** DOSPRESSO IT Sistemi (otomatik) + Claude (Anthropic) audit

---

## 🎯 Yasal Dayanak

### KVKK Madde 7 — Kişisel Verilerin Silinmesi
> "Bu Kanun ve ilgili diğer kanun hükümlerine uygun olarak işlenmiş olmasına rağmen, işlenmesini gerektiren sebeplerin ortadan kalkması hâlinde kişisel veriler resen veya ilgili kişinin talebi üzerine veri sorumlusu tarafından silinir, yok edilir veya anonim hâle getirilir."

### İş Kanunu Madde 75 — Özlük Dosyası
> "İşveren çalıştırdığı her işçi için bir özlük dosyası düzenler... Bu dosyalar **işten ayrılış tarihinden itibaren on yıl** süreyle saklanır."

### KVKK Veri Saklama ve İmha Politikası (Bakanlık Tebliği)
> "Kişisel verilerin silinmesi, yok edilmesi veya anonim hâle getirilmesi hususunda, alınan tüm idari ve teknik tedbirler kayıt altına alınır."

---

## 📊 Yapılan İşlemler

### A) Soft Archive — Silinmiş Çalışan Bordroları (28 kayıt)

**Tespit:**
- `monthly_payroll` tablosunda `deleted_at IS NOT NULL` olan kullanıcılara ait **28 bordro kaydı**
- Bu kayıtlar UI'da görünüyor, raporlara giriyordu
- Yasal saklama yükümlülüğü var (10 yıl) ama operasyonel kullanımda olmamalı

**Yapılan:**
```sql
ALTER TABLE monthly_payroll ADD COLUMN status VARCHAR(20) DEFAULT 'active';
ALTER TABLE monthly_payroll ADD COLUMN archived_at TIMESTAMP;
ALTER TABLE monthly_payroll ADD COLUMN archived_reason TEXT;

UPDATE monthly_payroll mp
SET status = 'archived',
    archived_at = NOW(),
    archived_reason = 'user_deleted_kvkk_compliance_2026_05_10'
FROM users u
WHERE mp.user_id = u.id
  AND u.deleted_at IS NOT NULL;
```

**Sonuç:**
- 28 kayıt arşivlendi (silinmedi)
- UI'da default `status='active'` filtresi
- Raporlardan çıkarıldı
- Yasal denetim için 10 yıl saklanır

**Yasal dayanak:** İş Kanunu m.75 + KVKK m.7

---

### B) DROP Table — Snapshot Tablolar (29 Nisan 2026'dan kalma)

**Tespit:**
| Tablo | Kayıt | İçerik |
|---|---|---|
| `users_pre_phase1_20260429` | 82 | Kullanıcı şifre hash dahil |
| `branch_staff_pins_bk_20260429` | 22 | Şube PIN'leri |
| `factory_staff_pins_bk_20260429` | 14 | Fabrika PIN'leri |
| `branch_kiosk_settings_pre_20260429` | 7 | Kiosk ayarları |

**Sorun:**
- Bu tablolar `Drizzle` schema'sında **tanımsız**
- Migration sistemi dışında — backup amaçlı oluşturulmuş ama unutulmuş
- İşleme amacı **ortadan kalkmış** (KVKK m.7 ihlali riski)
- 82 kullanıcının **şifre hash'i** dahil hassas veri var
- Sızıntı durumunda ek hukuki sorumluluk

**Yapılan:**
1. **Backup:** `pg_dump` ile `docs/audit/backups/snapshot-20260510-archive.dump` dosyasına alındı
2. **Audit log:** `audit_logs` tablosuna işlem kaydı (kim, ne zaman, hangi tablolar)
3. **DROP:** `DROP TABLE ... CASCADE` ile production'dan kaldırıldı

**Sonuç:**
- 4 tablo + 7 kiosk tablosu = **11 snapshot tablo silindi**
- Backup dosyası IT sorumlusunda saklanır (yedekleme yasal)
- Veri sızıntısı riski elimine edildi

**Yasal dayanak:** KVKK m.7 (silme yükümlülüğü) + KVKK m.12 (veri güvenliği)

---

## 🔐 Veri Güvenliği Tedbirleri

| Tedbir | Durum |
|---|---|
| Backup öncesi alındı | ✅ |
| Audit log kayıt edildi | ✅ |
| Yasal saklama süresi belgelendi | ✅ |
| Veri sorumlusu onayı | ✅ Aslan, 10 May 2026 |
| Tutanak saklandı | ✅ Bu belge |

---

## 📅 Sonraki Adımlar (Post-Pilot)

Bu temizlikten sonra **post-pilot Sprint 14**'te yapılacak:

1. **Çift bordro tablosu** birleştirilmesi (`employee_salaries` deprecated)
2. **`account_status` normalize** ('active' tek değer)
3. **`leave_balances`** carry-over motoru tamiri
4. **`pdks_employee_mappings`** doldurma (Excel import düzgün çalışsın)
5. **Schema'da olmayan tüm tablolar** için ESLint kuralı

---

## 📝 Tutanak

Bu işlem 10 Mayıs 2026 saat 23:00 civarında, **DOSPRESSO Pilot 12 Mayıs 2026** lansmanına 2 gün kala, **KVKK ve İş Kanunu uyum** amacıyla gerçekleştirildi.

İşlemin gerekçesi:
- Pilot sonrası gerçek operasyonel veri sisteme girecek
- Mevcut KVKK ihlali riskleri canlı veri ile büyüyebilir
- Pilot öncesi temizlik = post-pilot temiz başlangıç

İşlem **geri döndürülebilir değildir** (DROP TABLE), ancak backup ile **gerektiğinde restore** edilebilir (yasal denetim, mahkeme talebi).

---

**Veri Sorumlusu Onayı:**
Aslan, CEO/CGO
DOSPRESSO Coffee & Donut

**Tarih:** 10 Mayıs 2026

**Belge No:** KVKK-2026-05-10-001

**Dosya:** `docs/KVKK-VERI-IMHA-2026-05-10.md`

---

> Bu belge, KVK Kurumu denetiminde veya hukuki süreçte gösterilebilir. Backup dosyaları (`docs/audit/backups/snapshot-20260510-archive.dump`) yasal saklama yükümlülüğü için 10 yıl muhafaza edilir.
