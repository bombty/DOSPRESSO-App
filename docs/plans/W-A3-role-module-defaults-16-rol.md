# ⚠️ SUPERSEDED — Bu plan Task #281 ile NO-OP olarak kapatıldı (2 May 2026)

> **DURUM:** ❌ **OBSOLETE — UYGULAMAYIN.**
> **Karar:** B14 ÇÖZÜLDÜ NO-OP. `ROLE_MODULE_DEFAULTS` (`shared/modules-registry.ts:368`) **dead code** (0 import). Gerçek mekanizma `role_module_permissions` DB tablosu (3127 satır, 31 rolün hepsi DOLU) → `GET /api/me/permissions`. Bu plan dosyasındaki "16 eksik rol" teşhisi yanlış katmanı işaret ediyordu.
> **Kanıt:** `docs/audit/role-module-defaults-noop-verification-2026-05-02.md` (rg + psql sorguları)
> **Karar dokümanı:** `docs/DECISIONS.md` madde 31
> **Audit düzeltmesi:** `docs/audit/system-multi-perspective-evaluation-2026-05-02.md` Bölüm 11.5
> **Sprint 3 takip:** B21 (modül erişim mimari konsolidasyon — 9 paralel mekanizmayı birleştir)
>
> **Aşağıdaki orijinal plan tarihsel referans için tutuluyor; uygulanmayacaktır.**

---

# Wave A-3 Plan — ROLE_MODULE_DEFAULTS 16 Eksik Rol Tamamlama (SUPERSEDED)

> **Sprint 2 / Wave A / İş #3** — 31 rolün modül erişim varsayılanları
> **Backlog ref:** B14 (Sprint 2 master backlog) — ✅ ÇÖZÜLDÜ NO-OP (Task #281)
> **Tahmini süre:** ~~2 saat~~ — UYGULANMADI
> **Mode:** ~~Plan + isolated agent~~ — gerek yok
> **Bağımlılık:** Yok — bağımsız, paralel başlatılabilir.

---

## 1. Sorun Tanımı

`replit.md`'de tespit edildi (Bilinen açık 2 May 2026):
> ROLE_MODULE_DEFAULTS tablosunda **16 rol eksik** (ceo, cgo, mudur, sef, gida_muhendisi, sube_kiosk, factory floor 5, marketing, kalite_kontrol, vs.)

**Mevcut durum:** ROLE_MODULE_DEFAULTS tablosunda sadece 15 rol için varsayılan modül erişimleri tanımlı. Yeni rol eklendiğinde manuel `module_flags` atama gerekiyor → tutarsız modül erişimi.

**Etki:**
- Yeni atanan kullanıcılar (özellikle CEO, CGO, mudur) sisteme girince hangi modülleri göreceği belirsiz
- Module flag'lar manuel set edildiğinde insan hatası riski
- Pilot Day-1'de CEO/CGO Aslan giriş yaparsa modül listesi eksik olabilir

---

## 2. Eksik 16 Rol Listesi

### HQ Executive (2)
1. `ceo` — Tüm modüller (Aslan)
2. `cgo` — Tüm operasyonel modüller (boş şu an, gelecek)

### HQ Departman (3 yeni — toplam 8'den eksik)
3. `marketing` — CRM, Akademi, Bildirim, Raporlar
4. `kalite_kontrol` — Kalite, Üretim (read), Tarif (read), Akademi
5. `gida_muhendisi` — Tarif (full), Üretim, Kalite, Alerjen, Besin

### Branch Hierarchy (3 yeni — toplam 7'den eksik)
6. `mudur` — Şube modüllerinin hepsi (yönetim seviyesi)
7. `sef` — Üretim, Kalite, Stok, Çalışan
8. `sube_kiosk` — Sadece kiosk endpoint'leri (PIN auth)

### Factory Floor (5)
9. `uretim_sefi` — Üretim, Kalite, Çalışan, Vardiya
10. `fabrika_operator` — Üretim (kendi vardiya), Kalite (kendi)
11. `fabrika_sorumlu` — Üretim, Stok, Vardiya, Çalışan
12. `fabrika_personel` — Üretim (kendi vardiya), Görevler
13. `fabrika_depo` — Stok, Sevkiyat, Üretim (read)

### Factory Recipe (2)
14. `recete_gm` — Tarif (full), Üretim, Kalite (read), Akademi
15. `gida_muhendisi` (zaten yukarıda) — atlandı

### Toplam: 13 + 3 (legacy denetim sonrası eklenebilir) ≈ **16 rol** (sayım 31 - 15 mevcut = 16 ✅)

---

## 3. Çözüm Yapısı

### 3.1 ROLE_MODULE_DEFAULTS Tablosu Yapı (Mevcut)
Task agent önce mevcut tabloyu inceleyip modeli anlamalı:
```sql
SELECT * FROM role_module_defaults LIMIT 5;
-- Beklenen kolonlar (tahmini):
-- role, module_key, can_view, can_edit, can_delete, default_landing
```

### 3.2 Modül Listesi Tahmini (~25-30 modül)
Task agent `module_flags` tablosundan veya `shared/schema/schema-*.ts`'den modül listesini çekmeli. Tahmini:
- HR (employee, leave, payroll, attendance)
- Akademi (course, quiz, certificate, badge)
- Üretim (production, batch, recipe, label)
- Kalite (qc, lot, allergen, nutrition)
- CRM (customer, feedback, communication)
- Stok (inventory, supplier, shipment)
- Görev (task, recurring, evidence)
- Vardiya (shift, kiosk, pdks)
- Bildirim (notification, broadcast)
- Rapor (analytics, dashboard)
- Mr. Dobody (agent, skill, briefing)
- Yönetim (user, role, settings, audit)

### 3.3 Rol-Modül Matrisi (Önerilen Yaklaşım)
3 erişim seviyesi:
- **F (full):** can_view + can_edit + can_delete = true
- **E (edit):** can_view + can_edit = true, can_delete = false
- **R (read):** can_view = true, edit/delete = false
- **— (yok):** Modüle erişim yok

Önerilen matris (TASK AGENT detaylandırır, bu KISA özet):

| Rol | HR | Akademi | Üretim | Kalite | CRM | Stok | Görev | Vardiya | Bildirim | Rapor | Yönetim |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ceo | F | F | F | F | F | F | F | F | F | F | F |
| cgo | F | F | F | F | F | F | F | F | F | F | E |
| marketing | — | F | — | — | F | — | E | — | F | E | — |
| kalite_kontrol | — | E | R | F | — | R | E | — | E | E | — |
| gida_muhendisi | — | E | E | F | — | R | E | — | E | E | — |
| mudur | E | E | F | F | E | F | F | F | E | E | R |
| sef | — | R | F | E | — | E | E | F | R | R | — |
| sube_kiosk | — | — | — | — | — | — | — | F (kiosk-only) | — | — | — |
| uretim_sefi | — | R | F | F | — | E | F | F | E | E | — |
| fabrika_operator | — | R | E (own) | E (own) | — | R | E | F (own) | E | R | — |
| fabrika_sorumlu | — | R | F | E | — | F | F | F | E | E | — |
| fabrika_personel | — | R | E (own) | R | — | R | E (own) | F (own) | R | — | — |
| fabrika_depo | — | R | R | — | — | F | E | F (own) | R | R | — |
| recete_gm | — | E | E | R | — | R | R | — | E | R | — |

> **Not:** Bu matris öneridir. Task agent kodu inceleyip mevcut 15 rolün defaults'ı ile uyumlu yapı kurarsa daha iyi. Owner onayı gerekirse Faz 4'te alınır.

---

## 4. Implementasyon Adımları

### Faz 1 — Mevcut Yapı İnceleme (30 dk)
1. `SELECT * FROM role_module_defaults` ile mevcut 15 rolün satırlarını oku
2. Tablo schema kontrol: kolonlar, NOT NULL, FK, unique constraint
3. Modül listesini topla: `SELECT DISTINCT module_key FROM role_module_defaults`
4. `shared/schema/schema-*.ts` içinde ROLE_MODULE_DEFAULTS Drizzle tanımı var mı? Migration ile mi yönetiliyor?

### Faz 2 — Migration Hazırlama (30 dk)
5. `migrations/00NN_role_module_defaults_16_rol.sql` oluştur:
   ```sql
   BEGIN;
   
   -- 16 yeni rol için defaults insert
   INSERT INTO role_module_defaults (role, module_key, can_view, can_edit, can_delete) VALUES
     ('ceo', 'hr_employee', TRUE, TRUE, TRUE),
     ('ceo', 'hr_leave', TRUE, TRUE, TRUE),
     -- ... (her rol × her modül)
   ON CONFLICT (role, module_key) DO NOTHING;
   
   COMMIT;
   ```
6. Insert sayı tahmini: 16 rol × ~25 modül = 400 satır (boş olanlar atlanır → ~250-300 efektif)

### Faz 3 — Dry-Run + Onay (15 dk)
7. **DB-WRITE PROTOKOL:** Önce backup verify (W-A2 cron çalışıyorsa otomatik, değilse manuel pg_dump)
8. Migration'u test edebilecek bir çevrim yok → mevcut DB üzerinde direkt çalıştırılacak
9. Insert sayısını sayma sorgusu ile dry-run:
   ```sql
   SELECT COUNT(*) FROM (VALUES ...) AS v(role, module_key)
   WHERE NOT EXISTS (SELECT 1 FROM role_module_defaults rmd WHERE rmd.role = v.role AND rmd.module_key = v.module_key);
   ```
10. Beklenen aktarım: ~250-300 satır

### Faz 4 — Migration Uygulama (15 dk)
11. **2 imza karar (Owner + Replit Agent merge onayı)**
12. `psql "$DATABASE_URL" -f migrations/00NN_role_module_defaults_16_rol.sql`
13. Sonuç: `INSERT 0 N` (N ≈ 250-300)

### Faz 5 — Doğrulama (15 dk)
14. `SELECT role, COUNT(*) FROM role_module_defaults GROUP BY role` → 31 rol görünmeli (eski 15 + yeni 16)
15. Pilot CEO Aslan ile login test → modül listesi eksiksiz mi
16. Pilot mudur (örn. Mahmut) ile login test → mudur modülleri görünüyor mu
17. Frontend `useEffectiveModules` hook'u (varsa) doğru defaults çekiyor mu
18. `npx tsc --noEmit` PASS (schema değişmediyse zaten geçer)

### Faz 6 — Doc Güncelleme (15 dk)
19. `replit.md`'de "Bilinen açık" notunu kaldır (16 rol artık tamamlandı)
20. `docs/audit/sprint-2-master-backlog.md` B14 "Tamamlandı" notu
21. DECISIONS.md'ye eklendi: "ROLE_MODULE_DEFAULTS 31 rol için tam, matris versiyonu vN"
22. Migration dosyası `replit.md` Migration Süreci bölümünde sayı güncellendi (örn. "Migration #6 ile 31 rol tam")

---

## 5. Acceptance Criteria

- [ ] Mevcut 15 rolün defaults'ı incelendi, tablo schema dokumante edildi
- [ ] 16 yeni rol için defaults matrisi hazırlandı (Bölüm 3.3 + task agent revize)
- [ ] Migration dosyası `migrations/00NN_role_module_defaults_16_rol.sql` oluşturuldu
- [ ] Dry-run sayım yapıldı (~250-300 satır beklenen)
- [ ] Migration uygulandı, `INSERT 0 N` log'u doğrulandı
- [ ] `SELECT role, COUNT(*) FROM role_module_defaults GROUP BY role` → 31 rol görünüyor
- [ ] CEO (Aslan) login test PASS, modül listesi tam
- [ ] mudur (örn. Mahmut/Erdem) login test PASS
- [ ] replit.md "Bilinen açık" notu kaldırıldı
- [ ] sprint-2-master-backlog.md B14 "Tamamlandı"
- [ ] DECISIONS.md'ye matris versiyonu yazıldı

---

## 6. Risk + Rollback

### Risk
- **Yanlış modül atama:** Bir rol görmesi gereken modülü görmez. **Mitigation:** Faz 5 adım 15-16 manuel test, sorun varsa hot-fix migration ekle
- **Mevcut module_flags overrides bozulur:** ROLE_MODULE_DEFAULTS sadece varsayılan, kullanıcı bazlı override (`module_flags` tablosu) etkilenmez. **Mitigation:** Migration sadece INSERT, UPDATE yok
- **DB write hatası:** Transaction içinde, hata olursa ROLLBACK
- **Pilot kullanıcı oturumu açıkken atama değişir:** Kullanıcı re-login yapana kadar eski cache görür. **Mitigation:** Day-1 sabah önce yapılırsa zaten sıfırdan login

### Rollback
- Migration ROLLBACK ile geri alınır:
  ```sql
  BEGIN;
  DELETE FROM role_module_defaults
  WHERE role IN ('ceo', 'cgo', 'marketing', 'kalite_kontrol', 'gida_muhendisi',
                 'mudur', 'sef', 'sube_kiosk', 'uretim_sefi', 'fabrika_operator',
                 'fabrika_sorumlu', 'fabrika_personel', 'fabrika_depo', 'recete_gm');
  COMMIT;
  ```
- Eski 15 rol etkilenmez

---

## 7. Bağımlılıklar

### Önce çözülmesi gerekenler
- Yok — bağımsız (W-A2 backup hazır olursa daha güvenli ama zorunlu değil)

### Sonra etkileneceklere
- B19 (legacy rol denetim) — Bu task'in matrisi B19'a baseline olur
- B18 (TEST-MATRIX 31 role genişletme) — Yeni 16 rolün modül erişimini test edecek

---

## 8. İzole Task Agent İçin Notlar

### Yapma
- Mevcut 15 rolün defaults'ını DEĞİŞTİRME (sadece INSERT)
- Yeni rol enum ekleme yapma (31 rol zaten schema-01.ts:52-98'de tanımlı)
- module_flags tablosunda kullanıcı bazlı override silme/değiştirme
- Production DB'ye dry-run yapmadan direkt INSERT

### Yap
- Önce mevcut yapıyı oku, sonra ek
- Transaction içinde çalıştır (hata = ROLLBACK)
- Insert sayısını commit message'a yaz
- Her rol için en az 1 manuel login test
- Migration dosyasını `migrations/_journal.json`'a ekle (drizzle-kit pattern'i)

---

## 9. İLİŞKİLİ DOKÜMANLAR

- `replit.md` — "Bilinen açık" notu (kaldırılacak), Migration süreci
- `docs/SPRINT-LIVE.md` — Açık işler B14
- `docs/SPRINT-2-WAVE-PLAN.md` — Wave A planı
- `docs/audit/sprint-2-master-backlog.md` — B14 detay
- `shared/schema/schema-01.ts:52-98` — 31 rol enum
- `.agents/skills/dospresso-architecture/SKILL.md` — Rol sistemi referansı

---

> **Bu plan task agent için yeterli detayda. Owner Plan moduna geçince bu doc'u referans verip task aç.**
