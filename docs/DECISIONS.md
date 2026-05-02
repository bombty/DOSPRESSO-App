# DECISIONS — DOSPRESSO

Bu dosya bugüne kadar alınan ürün/operasyon kararlarının kalıcı kaydıdır. Her madde owner (Aslan) tarafından onaylı, ChatGPT (IT danışman) ile gözden geçirilmiş ve Replit (uygulayıcı) tarafından sisteme yansıtılmış / yansıtılması beklenen karardır.

Son güncelleme: 2 Mayıs 2026

---

## Personel & Rol Modeli

1. **Kiosk insan personel değildir.**
2. **Kiosk kullanıcıları personel/maaş/izin/performans listelerinde görünmemeli.** Hiçbir İK, bordro veya performans modülü kiosk kullanıcısını "çalışan" olarak listelememeli, raporlamamalı ya da hesaplamaya katmamalı.
3. **Müdür sadece kendi şubesini yönetir.** Müdür yetkisi başka şubelere okuma/yazma/raporlama amacıyla kullanılamaz.
4. **Yatırımcı / franchise alan sadece kendi şubesinin verisini görür.** Network düzeyi (HQ/diğer şubeler) veriler yatırımcı kullanıcılarına gösterilmez.
5. **Supervisor personel silemez.** Personel silme/deaktif etme yetkisi supervisor rolünde yoktur.
6. **Supervisor buddy sadece delegasyonla supervisor yetkisi alabilir.** Buddy doğrudan kalıcı supervisor yetkisi taşımaz; sadece zamanlı/delegasyona bağlı yetkilendirilir.

## Personel Kaynağı

7. **Excel personel listesi pilot için doğru kaynak kabul edildi.** Pilot süresince personel kaynağı olarak Excel import baz alınır; manuel kullanıcı oluşturma istisnasız değil, gerekçeli olur.
8. **Hard delete yok; test/demo kullanıcılar soft-delete / pasif yapılır.** `deleted_at` veya `is_active=false` ile pasifleştirilir, kayıt silinmez.

## Veri Güvenliği & DB Disiplini

9. **DB write öncesi backup + dry-run + owner GO zorunlu.** Production veritabanına yazma operasyonu için sırasıyla: backup alındı → dry-run sonucu paylaşıldı → owner açık GO verdi.
18. **GitHub hassas dosya cleanup current tracking içindir.** Hassas COMMIT SQL ve backup dosyaları current HEAD tracking'inden çıkarıldı; `.gitignore` ile yeniden eklenmeleri engellendi. Git history rewrite YAPILMADI; repo public olduğu için geçmiş commit'lerdeki hassas içerikler ayrı risk/karar konusudur ve pilot sonrası ele alınır.

## Reçete Yetkileri (P7.2 — 29 Nisan 2026)

19. **Aslan mevcut `ceo` rolünde kalır.** Rolü `recete_gm` olarak değiştirilmez. Reçete yetkisi rol değişikliğiyle değil, `ceo` rolüne reçete tarafında doğrudan yetki tanımlanarak çözülür.
20. **CEO / Aslan reçete tarafında tam yetkilidir.** Kapsam: reçete oluşturma, düzenleme, hammadde/adım CRUD, oran/miktar düzenleme, keyblend, gramaj onayı, besin/alerjen işlemleri ve reçete kilitleme/açma — hepsi `ceo` rolüyle yapılabilir.
21. **Sema / `gida_muhendisi` besin, alerjen ve gramaj onayında aktif yetkilidir.** Hammadde ekle/sil/değiştir, oran/miktar değiştir veya keyblend yönetimi YAPMAZ. Bu kapsam dışı işlemler `recete_gm` veya `ceo` tarafından yapılır.
22. **Ümit / `sef` reçete editleyemez.** Sadece kendisine atanmış kategori/reçeteler için üretim planlama ve üretim takibi yapabilir.
23. **Eren / `fabrika_mudur` reçete ve gıda bilgilerini görebilir ama değiştiremez.** Üretim planlama, üretim takibi ve sevkiyat hazırlığı tarafında yetkilidir.

## API Davranış Kuralları

24. **Tanımsız `/api/...` route'ları artık Vite HTML fallback yerine JSON 404 döner.** `server/index.ts`'e eklenen middleware ile `/api` ile başlayan ve hiçbir backend route'a denk gelmeyen istekler `{ error, path }` formatında JSON 404 cevabı verir. Bu sayede frontend istemcileri (TanStack Query, fetch wrapper'ları) HTML payload'u JSON olarak parse etmeye çalışıp gizli hata üretmez.

## Tamamlanmış Pilot Hazırlık Adımları

10. **Personel import Phase 1 tamamlandı.**
11. **PIN cleanup + PIN seed tamamlandı.**
12. **4 birim kiosk giriş/çıkış testi başarılı.** (Işıklar, Lara, Fabrika, HQ — 29 Nisan 2026.)
13. **Test kayıtları `PILOT_PRE_DAY1_TEST_2026_04_29` notu ile işaretlendi.** İlgili `branch_shift_sessions`, `factory_shift_sessions`, `hq_shift_sessions` ve `shift_attendance` satırlarında `notes` alanı ile pilot test kayıtları gerçek operasyon kayıtlarından ayrıştırılır.
25. **P7.2 reçete rol matrisi düzeltmesi tamamlandı.** CEO, gida_muhendisi, sef ve fabrika_mudur rollerinin reçete modülündeki backend + frontend yetkileri madde 19-23 ile uyumlu olacak şekilde güncellendi (commit aralığı: `e91bd51e2` … `1d014334b`).
26. **P7.2.1 CEO nutrition approval düzeltmesi tamamlandı.** `factory-recipe-nutrition.ts` içindeki `APPROVAL_ROLES` listesine `ceo` rolü eklendi; `/api/factory/recipes/:id/calculate-nutrition` endpoint'inin rol kontrolü güncellendi (commit `3939b9f52`).
27. **API 404 fallback düzeltmesi tamamlandı.** Madde 24 kapsamındaki middleware `server/index.ts`'e eklendi (commit `d99898064`).

## Açık Riskler & Teknik Borçlar (karar olarak işaretli)

14. **HQ kiosk PIN plaintext konusu ayrı risk olarak açık.** Henüz hash'lenmemiş HQ kiosk PIN'leri pilot sonrası ele alınacak, kapsam ayrıdır.
15. **`shift_attendance` check-out kapanış mantığı açık teknik borç.** Branch shift-end endpoint'i `shift_attendance.check_out_time` alanını güncellemiyor; bordrosu `pdks_daily_summary` (Excel) üzerinden okunduğu için maaş etkilenmez ama kayıt bütünlüğü açısından düzeltilmesi gerekir.
    **Çözüldü:** task #273, 2 May 2026 — `server/routes/branches.ts` 4 yerinde (kiosk shift-end, HQ end_of_day, phone checkin shift_end, QR checkin shift_end) ve `server/routes/factory.ts` 2 yerinde (shift-end, quick-end) session UPDATE + `shift_attendance.check_out_time` UPDATE artık `db.transaction` içinde atomik çalışır (ya ikisi birlikte commit ya rollback). Branch için `session.shift_attendance_id` linki üzerinden; HQ/Factory için (FK yok) `userId + checkInTime ± 5 dk pencere + pilot notu (PILOT_PRE_DAY1_TEST_2026_04_29) hariç` filtresi ile daraltılmış lookup. Backfill scripti (`scripts/backfill-shift-attendance-checkout.ts`) eklendi; dry-run 0 aday döndü, backfill gerekmedi (bkz. `docs/audit/shift-attendance-backfill-2026-05-02.md`).
28. **Reçete detay sayfasındaki intermittent spinner davranışı post-pilot UX iyileştirmesi olarak ele alınır.** Backend recipe API 200 döner; sorun lazy chunk / cache kaynaklı geçici yükleme davranışıdır. Geçici çözüm: hard refresh (Cmd+Shift+R). Kalıcı UX iyileştirmesi pilot sonrası planlanır (T2.1).

## Ürün / İçerik Kararları

16. **Reçete değişince etiket revize gerekli durumuna düşmeli.** Bir reçetenin gramaj, içerik veya alerjen alanı değiştiğinde bağlı etiketler "revize gerekli" statüsüne otomatik geçer.
17. **Gıda mühendisi besin/alerjen tarafında aktif rol almalı.** Besin değerleri ve alerjen onay/yayın akışında gıda mühendisi pasif gözlemci değil, aktif onay merci olarak konumlanır.

30. **Günlük pg_dump backup'ı Object Storage'a, custom format + 30 gün retention.** (Task #280 / Wave A-2 / B16, 2 May 2026.) Her gece 03:00 UTC (TR 06:00) `scripts/backup/pg-dump-daily.ts` çalışır: `pg_dump --format=custom --no-owner --no-acl --compress=6` ile dump alır, `audit_logs/notifications/scheduler_executions` tablo verilerini exclude eder (schema dahil), Replit Object Storage'a `db-backups/dospresso/YYYY-MM-DD/dump.dump` path'ine yükler. 30 günden eski backup'lar otomatik silinir. Restore prosedürü 2 imza zorunlu (Aslan + Eren), test branch'e önce restore + smoke test, ardından production. Mevcut JSON-bazlı saatlik backup'tan ayrı çalışır (RPO ≤1 saat JSON, ≤24 saat tam dump). Dry-run test 2 May 2026 PASS (5.55 MB, 5.3s). Runbook: `docs/runbooks/db-restore-from-backup.md` (10 adım, ~45 dk). PILOT-DAY1-ROLLBACK-PLAN Seviye 5 ✅ HAZIR.

29. **Delegation + Module-Content rol matrisi: pilot için `admin` + `ceo` ile sınırlı kalır.** (Task #279 / Wave A-1, 2 May 2026.) Audit doc G1+G2'de önerilen genişletme (mudur/fabrika_mudur GET için, coach/trainer module-content yazma için) Pilot Day-1 öncesi UYGULANMADI. Mevcut `isAdminRole(['admin','ceo'])` kontrolleri sağlam (10/10 endpoint anonim 401, yetkisiz 403 doğrulandı). Genişletme ihtiyacı pilot retrospektifinde frontend kullanım pattern'lerine göre tekrar değerlendirilecek. Minimum-risk gerekçe: pilot'ta mudur/coach kullanıcısı bu admin sayfalarına erişmiyor, gereksiz attack surface açmaktan kaçınıldı.

---

31. **K2 / B14 audit teşhisi yanlıştı; `ROLE_MODULE_DEFAULTS` dead code, gerçek mekanizma `role_module_permissions` DB tablosu — pilot etkisi YOK.** (Task #281 / Wave A-3, 2 May 2026.) Sprint 2 master backlog B14 ("16 rol için ROLE_MODULE_DEFAULTS tamamla") ve audit raporu K2/U3 bulguları yanlış katmanı işaret ediyordu. Doğrulama: (a) `ROLE_MODULE_DEFAULTS` (`shared/modules-registry.ts:368`) hiçbir yerden import edilmiyor (rg ile 0 consumer); (b) gerçek erişim `role_module_permissions` DB tablosu (3127 satır, **31 rolün hepsi DOLU** — admin/supervisor 240, coach 235, muhasebe 231, ceo/cgo/mudur/fabrika_mudur/sef/recete_gm/uretim_sefi/satinalma/trainer/muhasebe_ik 79, supervisor_buddy 123, yatirimci_hq 98, geri kalan 78); (c) frontend kanal `GET /api/me/permissions` (`certificate-routes.ts:751`) → mega-modules render; (d) 5 pilot rol için (ceo, cgo, mudur, fabrika_mudur, sube_kiosk) modül listesi `psql` ile doğrulandı, kritik modüller (dashboard, hr, employees, equipment, shifts, tasks, factory_*) hepsi dolu. **Ek bulgu — mimari borç:** Sistemde **9 paralel rol/modül erişim mekanizması** var (`role_module_permissions` DB, `permission_actions`+`role_permission_grants` boş RBAC v2, `module_flags` DB, `module-manifest.ts`+`requireManifestAccess` fail-open middleware, `MODULES[].roles`, `dobody-proposals.ts` inline matris, `dashboard_role_widgets`, `module-menu-config allowedRoles`, `ROLE_MODULE_DEFAULTS` dead code) + naming drift (243 vs 304 module, `academy.ai`/`academy_ai`/`akademi-ai-assistant`). Bunlar Sprint 3 B21 (konsolidasyon) + B22 (manifest-auth fail-open düzelt) backlog'una taşındı. **Aksiyon:** (a) `ROLE_MODULE_DEFAULTS` üstüne `@deprecated DEAD CODE` JSDoc; (b) `replit.md` "Bilinen açık" notu düzeltildi; (c) `sprint-2-master-backlog.md` B14 → ÇÖZÜLDÜ NO-OP; (d) audit raporu Bölüm 11.5 düzeltme + 9 mekanizma haritası eklendi; (e) Sprint 3 backlog'a B21+B22 önerisi; (f) **reproducible verification artifact** `docs/audit/role-module-defaults-noop-verification-2026-05-02.md` (rg + psql sorguları, 31 rol × 78-240 modül permission tablosu, 5 pilot rol kritik modül kontrolü).

---

> Karar değişikliği için: önce bu dosyada yeni karar maddesi yazılır, owner'dan açık onay alınır, eski karar ya günceller ya da "geçersiz — bkz. madde X" notu ile arşivlenir.
