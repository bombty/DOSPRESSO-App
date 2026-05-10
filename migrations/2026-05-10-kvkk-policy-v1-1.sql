-- =====================================================================
-- Aslan 10 May 2026 — KVKK Metni v1.1: Yurtdışı Aktarım Beyanı
-- Tarih: 2026-05-10
--
-- AMAÇ:
--   Neon Database AWS US-East (yurtdışı) üzerinde — KVKK m.9 gereği
--   yurtdışı aktarım beyanı eklenmiş yeni versiyon.
--   Eski v1.0 deaktif, v1.1 aktif olur.
--   Tüm çalışanlar yeniden onaylamalı.
--
-- YASAL DAYANAK:
--   - KVKK m.9 (Yurtdışına aktarım)
--   - KVKK Kurulu kararları (yeterli koruma)
--   - Aydınlatma Tebliği m.5
--
-- KULLANIM:
--   psql "$DATABASE_URL" -f migrations/2026-05-10-kvkk-policy-v1-1.sql
-- =====================================================================

-- 1. Eski versiyonu deaktif et
UPDATE kvkk_policy_versions
SET is_active = FALSE
WHERE version = '1.0';

-- 2. Yeni v1.1'i ekle
INSERT INTO kvkk_policy_versions (
  version,
  content_markdown,
  title,
  legal_basis,
  published_at,
  effective_from,
  is_active
)
VALUES (
  '1.1',
  '## DOSPRESSO Coffee & Donut — KVKK Aydınlatma Metni v1.1

### Veri Sorumlusu
**DOSPRESSO Coffee & Donut**
Antalya / Türkiye

### İşlenen Veriler
- Kişisel kimlik bilgileri (Ad, soyad, TC no, doğum tarihi)
- İletişim bilgileri (telefon, adres, e-posta)
- Banka / IBAN bilgileri (bordro için)
- Vardiya / mola / mesai kayıtları (PDKS)
- Performans verileri (görev tamamlama, eğitim ilerleme)
- Sistem erişim verileri (kullanıcı PIN, IP adresi, cihaz)

### İşleme Amaçları
- PDKS (puantaj) ve bordro hesabı
- Yasal SGK bildirimi (5510 sayılı Kanun m.86)
- Vardiya planlama ve operasyonel yönetim
- İş Kanunu (4857) yükümlülükleri
- KVKK m.5/2-c gereği iş sözleşmesi gereği işleme

### Saklama Süreleri
- **Bordro/PDKS verileri**: 10 yıl (5510 sayılı SGK Kanunu m.86)
- **Audit log (denetim kayıtları)**: 10 yıl (TTK m.82)
- **Müşteri geri bildirimi**: 5 yıl (TBK m.146)
- **Operasyonel kayıtlar**: 2 yıl
- **KVKK onay kayıtları**: 10 yıl (yasal denetim için)

### 🌐 YURTDIŞI AKTARIM (YENİ - v1.1)
Veri saklama altyapımız **Amazon Web Services (AWS) ABD bölgesinde** (Neon Database, US-East) bulunmaktadır.
- **Aktarım sebebi**: Bulut altyapı performansı ve güvenlik
- **Yeterli koruma**: AWS, ISO 27001, SOC 2 Type II sertifikalı
- **Yasal dayanak**: KVKK m.9/1 (yeterli koruma bulunan ülke veya garanti hükmü)
- **Şifreleme**: TLS 1.3 (transit) + AES-256 (rest)
- **Kontrol**: Veri sorumlusu DOSPRESSO koruma sağlamakla yükümlüdür

### KVKK Madde 11 — Haklarınız
Aşağıdaki haklara sahipsiniz:
- Kişisel verilerinizin işlenip işlenmediğini öğrenme
- İşlenmişse buna ilişkin bilgi talep etme
- İşlenme amacını ve uygun kullanılıp kullanılmadığını öğrenme
- Eksik/yanlış işlenmişse düzeltilmesini isteme
- Kanun şartlarına göre silinmesini/yok edilmesini isteme
- Aktarıldığı 3. kişilere bildirilmesini isteme
- Otomatik analizle aleyhinize sonuç çıkmasına itiraz etme
- Zarara uğramışsanız tazminat talep etme

**Talep nasıl iletilir?**
1. Sistem üzerinden: `/kvkk-haklarim` sayfası (giriş yapıp talep oluştur)
2. E-posta: kvkk@dospresso.com
3. Yazılı: DOSPRESSO Merkez, Antalya

**Yanıt süresi**: 30 gün (KVKK m.13)

### İletişim
- **Veri Sorumlusu**: DOSPRESSO Coffee & Donut
- **Adres**: Antalya, Türkiye
- **E-posta**: kvkk@dospresso.com
- **Detaylı politika**: dospresso.com/kvkk

---
*Bu metin 6698 sayılı KVKK + Aydınlatma Yükümlülüğü Tebliği uyarınca düzenlenmiştir.*
*v1.1 değişiklik: KVKK m.9 gereği yurtdışı aktarım beyanı eklendi.*
*Mevzuat referansı: RG 07.04.2016/29677, RG 10.03.2018/30356.*',
  'KVKK Aydınlatma Metni v1.1',
  '6698 sayılı KVKK + Aydınlatma Yükümlülüğü Tebliği + KVKK m.9 Yurtdışı Aktarım',
  NOW(),
  NOW(),
  TRUE
)
ON CONFLICT (version) DO UPDATE SET
  content_markdown = EXCLUDED.content_markdown,
  is_active = TRUE,
  published_at = EXCLUDED.published_at;

-- Doğrulama
DO $$
DECLARE
  active_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_count
    FROM kvkk_policy_versions WHERE is_active = TRUE;

  IF active_count != 1 THEN
    RAISE EXCEPTION 'Sadece 1 aktif politika olmali, % bulundu', active_count;
  END IF;

  RAISE NOTICE '✅ KVKK v1.1 aktif (yurtdışı aktarım beyanı dahil). v1.0 deaktif.';
  RAISE NOTICE '⚠️ Tüm çalışanların v1.1 yeniden onaylaması gerekir!';
END $$;
