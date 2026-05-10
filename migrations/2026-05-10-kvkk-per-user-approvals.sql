-- =====================================================================
-- Aslan 10 May 2026 — KVKK Per-User Onay Sistemi
-- Tarih: 2026-05-10
--
-- AMAÇ:
--   - Mevcut localStorage tabanlı KVKK → DB'ye taşı (per-user)
--   - 2 yeni tablo: kvkk_policy_versions + user_kvkk_approvals
--   - İlk versiyon (1.0) seed'lenir (mevcut metin)
--
-- KULLANIM:
--   psql "$DATABASE_URL" -f migrations/2026-05-10-kvkk-per-user-approvals.sql
--
-- ROLLBACK:
--   DROP TABLE IF EXISTS user_kvkk_approvals CASCADE;
--   DROP TABLE IF EXISTS kvkk_policy_versions CASCADE;
-- =====================================================================

-- =====================================================================
-- 1. kvkk_policy_versions — Yayınlanan KVKK metinleri
-- =====================================================================

CREATE TABLE IF NOT EXISTS kvkk_policy_versions (
  id SERIAL PRIMARY KEY,
  version VARCHAR(20) NOT NULL UNIQUE,

  content_markdown TEXT NOT NULL,
  title VARCHAR(255) NOT NULL,
  legal_basis TEXT,

  published_at TIMESTAMP NOT NULL,
  effective_from TIMESTAMP NOT NULL,

  is_active BOOLEAN NOT NULL DEFAULT FALSE,

  created_by VARCHAR(50) REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kvkk_policy_active_idx
  ON kvkk_policy_versions(is_active);
CREATE INDEX IF NOT EXISTS kvkk_policy_version_idx
  ON kvkk_policy_versions(version);

COMMENT ON TABLE kvkk_policy_versions IS
  'KVKK aydınlatma metni versiyonları (Aslan 10 May 2026)';

-- =====================================================================
-- 2. user_kvkk_approvals — Kullanıcı onayları
-- =====================================================================

CREATE TABLE IF NOT EXISTS user_kvkk_approvals (
  id SERIAL PRIMARY KEY,

  user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  policy_version_id INTEGER NOT NULL,
  policy_version VARCHAR(20) NOT NULL,

  approved_at TIMESTAMP NOT NULL DEFAULT NOW(),

  ip_address VARCHAR(45),
  user_agent TEXT,

  approval_method VARCHAR(30) NOT NULL,
  -- 'kiosk_pin', 'mobile_app', 'web_dashboard'

  branch_id VARCHAR(20),
  device_fingerprint VARCHAR(100),

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_kvkk_approvals_user_idx
  ON user_kvkk_approvals(user_id);
CREATE INDEX IF NOT EXISTS user_kvkk_approvals_version_idx
  ON user_kvkk_approvals(policy_version);
CREATE INDEX IF NOT EXISTS user_kvkk_approvals_approved_idx
  ON user_kvkk_approvals(approved_at);

-- FK: policy_version_id → kvkk_policy_versions.id
-- Aşağıda seed eklendikten sonra ekleniyor (sıra önemli)

COMMENT ON TABLE user_kvkk_approvals IS
  'Kullanıcıların KVKK aydınlatma onayları (Aslan 10 May 2026)';

-- =====================================================================
-- 3. SEED — Versiyon 1.0 (mevcut metin)
-- =====================================================================

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
  '1.0',
  '## DOSPRESSO Coffee & Donut — KVKK Aydınlatma Metni

### Veri Sorumlusu
DOSPRESSO Coffee & Donut, Antalya / Türkiye

### İşlenen Veriler
- Kişisel kimlik bilgileri (Ad, soyad, TC no)
- İletişim bilgileri (telefon, adres, e-posta)
- Banka / IBAN bilgileri (bordro için)
- Vardiya / mola / mesai kayıtları (PDKS)
- Performans verileri (görev tamamlama, eğitim ilerleme)

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

### İletişim
- **Veri Sorumlusu**: DOSPRESSO Coffee & Donut
- **Adres**: Antalya, Türkiye
- **E-posta**: kvkk@dospresso.com
- **Detaylı politika**: dospresso.com/kvkk

---
*Bu metin 6698 sayılı KVKK + Aydınlatma Yükümlülüğü Tebliği uyarınca düzenlenmiştir.*
*Mevzuat referansı: RG 07.04.2016/29677, RG 10.03.2018/30356.*',
  'KVKK Aydınlatma Metni v1.0',
  '6698 sayılı KVKK + Aydınlatma Yükümlülüğü Tebliği (RG 10.03.2018/30356)',
  NOW(),
  NOW(),
  TRUE
)
ON CONFLICT (version) DO NOTHING;

-- =====================================================================
-- 4. FK ekle (seed sonrası, aksi halde policy_version_id 0 olabilirdi)
-- =====================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_kvkk_approvals_policy_version_id_fkey'
      AND table_name = 'user_kvkk_approvals'
  ) THEN
    ALTER TABLE user_kvkk_approvals
      ADD CONSTRAINT user_kvkk_approvals_policy_version_id_fkey
      FOREIGN KEY (policy_version_id)
      REFERENCES kvkk_policy_versions(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- =====================================================================
-- 5. Doğrulama
-- =====================================================================

DO $$
DECLARE
  policy_count INTEGER;
  active_policy_count INTEGER;
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count FROM kvkk_policy_versions;
  SELECT COUNT(*) INTO active_policy_count
    FROM kvkk_policy_versions WHERE is_active = TRUE;

  SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('kvkk_policy_versions', 'user_kvkk_approvals');

  IF table_count != 2 THEN
    RAISE EXCEPTION '2 tablo bekleniyordu, % tane var', table_count;
  END IF;

  IF policy_count = 0 THEN
    RAISE EXCEPTION 'KVKK policy seed ekleneмedi';
  END IF;

  IF active_policy_count != 1 THEN
    RAISE EXCEPTION '1 aktif policy bekleniyordu, % tane var', active_policy_count;
  END IF;

  RAISE NOTICE '✅ Migration başarılı: 2 tablo + 6 index + 1 seed (KVKK v1.0)';
END $$;
