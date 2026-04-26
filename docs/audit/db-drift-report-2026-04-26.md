# DB Drift Raporu — 26 Nisan 2026 (Task #255)

> Kaynak: `tsx scripts/db-drift-check.ts`
> Audit referansı: `docs/audit/DOSPRESSO_FULL_AUDIT_2026-04-26.md` (Bölüm 6, 16 #4-5)

## 1. Özet

| Metrik | Audit (öncesi) | Bu rapor (öncesi) | **Migration sonrası** |
|---|---:|---:|---:|
| Drizzle'da tanımlı tablo | 455 | 455 | **455** |
| DB'de eksik tablo | 11 | 13 | **0** |
| Eksik UNIQUE constraint | – | 4 | **0** |
| Eksik index | – | 83 | **0** |
| Eksik foreign key | – | 47 | **0** |
| Kolon tipi/nullability drift | – | 42 | **42** ⚠️ (kapsam dışı) |

> **Not:** Audit raporu 11 tablo drift'inden bahsediyordu; tarama anında schema
> 13 yeni tabloya genişlemiş bulundu (audit'ten sonra
> `notification_digest_queue`, `dobody_action_templates` eklenmiş). Hepsi bu
> task kapsamında kapatıldı.

## 2. DB'de eksik 13 tablo

Aşağıdaki tabloların tamamı koddan (storage / route / servis katmanı)
çağrılıyor. Yöneticinin kararı: **DB'de yarat (silme)**. Tablolar
`migrations/task-255-close-drift.sql` ile yaratıldı.

| Tablo | Kullanıldığı yer |
|---|---|
| `ai_report_summaries` | `server/storage.ts` (AI rapor özetleri) |
| `branch_comparisons` | `server/storage.ts` (şube karşılaştırma raporları) |
| `branch_feedbacks` | `server/storage.ts` (şubeden HQ'ya geri bildirim) |
| `dobody_action_templates` | `shared/schema/schema-15-ajanda.ts` (Dobody aksiyon şablonları) |
| `hq_support_category_assignments` | `server/storage.ts` (HQ destek kategori atama) |
| `mega_module_mappings` | `client/src/lib/megaModuleConfig.ts` (mega modül eşleme) |
| `notification_digest_queue` | `server/routes/notification-preferences.ts` (özet bildirim kuyruğu) |
| `notification_policies` | `server/routes/notification-preferences.ts` (bildirim politikaları) |
| `notification_preferences` | `server/routes/notification-preferences.ts` (kullanıcı bildirim tercihi) |
| `product_suppliers` | `server/satinalma-routes.ts` (ürün-tedarikçi ilişki tablosu) |
| `recipe_ingredients` | `server/satinalma-routes.ts` (reçete malzeme tablosu) |
| `ticket_activity_logs` | `server/storage.ts` (HQ destek aktivite geçmişi) |
| `trend_metrics` | `server/storage.ts` (trend metrik geçmişi) |

## 3. Eksik UNIQUE constraint (mevcut tablolar)

| Tablo | Constraint | Sütunlar |
|---|---|---|
| `module_flags` | `uq_module_flags_key_scope_branch_role` | `(module_key, scope, branch_id, target_role)` |
| `dobody_action_templates` | `dobody_action_templates_template_key_unique` | `(template_key)` |
| `hq_support_category_assignments` | `hq_support_cat_assign_unique` | `(category, user_id)` |
| `mega_module_mappings` | `mega_module_mappings_unique` | `(module_id)` |

Son 3 constraint, ilgili tablolar yaratılırken `CREATE TABLE` içinde tanımlandı.

## 4. Eksik 83 index

Tam liste için `migrations/task-255-close-drift.sql` (Index'ler bölümü).
Özetle:

- **Yeni tablolardaki 23 index** — tablolarla birlikte oluşturuldu.
- **Mevcut tablolardaki 60 index** — `CREATE INDEX IF NOT EXISTS` ile eklendi.
  En sık dokunulan tablolar: `inventory`, `inventory_movements`, `goods_receipts`,
  `production_records`, `factory_recipes`, `purchase_orders`, `dobody_*`,
  `audit_personnel_feedback`, `employee_onboarding_*`, `employee_terminations`,
  `hq_support_tickets`.

## 5. Eksik 47 foreign key

Tüm FK'lar `ADD CONSTRAINT ... NOT VALID` olarak eklendi (mevcut orphan
satırları korumak için). Sonradan veriler temizlendiğinde
`VALIDATE CONSTRAINT` ile aktif validasyona alınabilir.

> Bilinen orphan kaynağı: `customer_feedback.staff_id` →
> users tablosunda artık var olmayan eski personel ID'leri (`b139eff9-…` vb.).
> Veri temizliği ayrı bir task'ta yapılmalıdır.

Tam liste: `migrations/task-255-close-drift.sql` (Foreign Key'ler bölümü).

## 6. Kapsam dışı kalan 42 kolon tipi / nullability drift'i

Bu drift'ler **bu task kapsamında düzeltilmedi**, çünkü tip/null
değişiklikleri veri kaybı veya runtime hatası riskini barındırır
(örneğin `tasks.target_branch_ids` Drizzle'da `text` ama DB'de `text[]` —
hangi yön doğru, koddaki kullanımdan denetlenmeli).

Çözüm yaklaşımı (ileri task):
1. Her bir mismatch için Drizzle tarafı mı, DB tarafı mı doğru karar verilir.
2. Doğru hedef seçildiğinde, ya schema güncellenir ya da migration ile DB
   alter edilir (gerekirse veri dönüşüm script'i).

Tüm liste konsol çıktısında ve `scripts/db-drift-check.ts` raporundadır.

## 7. Migration / startup DDL ayrıştırması

Önceden `server/index.ts` her boot'ta aşağıdaki ham DDL'i çalıştırıyordu:
- `CREATE TABLE IF NOT EXISTS kiosk_sessions ...`
- `ALTER TABLE branch_kiosk_settings ALTER COLUMN kiosk_password ...`
- `ALTER TABLE branch_kiosk_settings ADD COLUMN auto_close_time / allow_pin / allow_qr`
- `ALTER TABLE branches ADD COLUMN setup_complete`
- `ALTER TABLE users ADD COLUMN onboarding_complete`

Bu DDL blokları artık `migrations/task-255-startup-ddl.sql` dosyasında
versiyonlanır. `server/index.ts` içindeki çağrılar kaldırıldı; yalnızca
runtime veri migration'ı (parola hashleme — `migrateKioskPasswords`) kaldı.

## 8. Drizzle baseline'ı

- `migrations/0000_baseline.sql` (drizzle-kit generate) commit edildi —
  455 tablonun tamamını CREATE TABLE ile betimliyor.
- Canlı DB zaten bu tabloların tamamına sahip olduğundan baseline
  **doğrudan çalıştırılmaz**; bunun yerine `tsx scripts/db-mark-baseline-applied.ts`
  ile `drizzle.__drizzle_migrations` tablosuna "uygulandı" olarak işaretlendi.
- Sonraki migration'lar (`0001_*`, `task-*.sql`) normal akışla uygulanır.
