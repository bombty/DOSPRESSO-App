# SPRINT LIVE — DOSPRESSO

Aktif sprintin canlı durumudur. Sprint kapanırken arşive alınır, yeni sprint için bu dosya sıfırlanır.

Son güncelleme: 2 Mayıs 2026

---

## Aktif Sprint

**Sprint 1 — Personel + Kiosk + PDKS Pilot Hazırlığı**

Hedef: Pilot Day-1 öncesi personel kayıtları, kiosk giriş/çıkış akışı ve PDKS verisinin uçtan uca çalışır durumda olması.

---

## Tamamlanan İşler

1. **Personel import** — Excel kaynağından personel listesi sisteme alındı (Phase 1).
2. **PIN cleanup** — Eski/test PIN kayıtları temizlendi.
3. **PIN seed** — Aktif personel için kiosk PIN'leri yüklendi.
4. **HQ kiosk** — HQ birimi için kiosk akışı kuruldu.
5. **Işıklar PIN mode** — Işıklar şubesi PIN tabanlı kiosk girişine geçti.
6. **Backend kiosk güvenlik yaması** — Kiosk login endpoint'lerine ait güvenlik düzeltmeleri devreye alındı.
7. **4 birim kiosk giriş/çıkış testi** — Işıklar (basrisen), Lara (berkanbozdag), Fabrika (busradogmus), HQ (mahmut) için tam akış başarıyla tamamlandı; ilgili kayıtlar `PILOT_PRE_DAY1_TEST_2026_04_29` notu ile işaretli.
8. **GitHub hassas dosya cleanup** — Repo current tracking'inden hassas dosyalar çıkarıldı, `.gitignore` ile yeniden eklenmeleri engellendi (history rewrite YAPILMADI; bkz. `docs/DECISIONS.md` madde 18).
9. **P7.2 Reçete rol matrisi düzeltmesi** — CEO, gida_muhendisi, sef ve fabrika_mudur rollerinin reçete modülündeki backend + frontend yetkileri `docs/DECISIONS.md` madde 19-23 ile uyumlu olacak şekilde güncellendi.
10. **P7.2.1 CEO nutrition approval düzeltmesi** — `factory-recipe-nutrition.ts` `APPROVAL_ROLES` listesine `ceo` rolü eklendi; `/api/factory/recipes/:id/calculate-nutrition` rol kontrolü güncellendi.
11. **API 404 fallback düzeltmesi** — Tanımsız `/api/...` route'ları artık Vite HTML fallback yerine JSON 404 döner (`server/index.ts` middleware).
12. **TEST-MATRIX + runbook seti** (1 May 2026, commit `57a6c4c0c`) — `docs/TEST-MATRIX.md` (13 rol), `docs/runbooks/db-write-protocol.md`, `docs/runbooks/kiosk-pdks-test.md`, `docs/runbooks/git-security-cleanup.md`, `docs/runbooks/recipe-label-workflow.md` (913 satır toplam).
13. **HQ kiosk PIN güvenlik planı** (2 May 2026, commit `bf2ac7c94`) — `docs/plans/hq-kiosk-pin-security.md` (~250 satır): mevcut plaintext durum analizi, tehdit modeli, bcrypt + lockout + audit refactor planı, 4 faz implementasyon adımları, 15 test senaryosu, rollback, 7 açık karar. Implementasyon BEKLİYOR (owner GO).
14. **`shift_attendance` check-out bug planı** (2 May 2026, commit `bf2ac7c94`) — `docs/plans/shift-attendance-checkout-fix.md` (~280 satır): branch/HQ/factory 3 endpoint root cause, ortak utility refactor önerisi, 5 faz, 14 test, 6 açık karar. Implementasyon BEKLİYOR (owner GO).
15. **Pilot Day-1 GO/NO-GO checklist** (2 May 2026, commit `bf2ac7c94`) — `docs/PILOT-DAY1-CHECKLIST.md` (~200 satır): 7 kategori 50+ kontrol, 7 NO-GO senaryosu + tampon plan, saat-bazlı izleme tablosu, gün sonu değerlendirme şablonu.
16. **Pilot Day-1 incident log template** (2 May 2026, commit `bf2ac7c94`) — `docs/PILOT-DAY1-INCIDENT-LOG.md` (~210 satır): severity matrisi (P0-P3), eskalasyon zinciri, incident kayıt formatı, 6 P0/P1 acil runbook shortcut, gün sonu metrik tablosu.

---

## Açık İşler

1. **HQ kiosk PIN güvenliği** — Plan ✅ hazır (`docs/plans/hq-kiosk-pin-security.md`); implementasyon owner GO bekliyor.
2. **`shift_attendance` check-out kapanışı** — Plan ✅ hazır (`docs/plans/shift-attendance-checkout-fix.md`); implementasyon owner GO bekliyor.
3. **İzin / rapor / ücretsiz izin bakiyeleri** — Bakiye hesap ve gösterim mantığı. Plan dokümanı YOK.
4. **Ay sonu puantaj simülasyonu** — Pilot ay sonu öncesi tam puantaj kuru çalıştırması.
5. **Fabrika üretim MVP** — Fabrika üretim modülünün pilot için MVP kapsamı. Plan dokümanı YOK.
6. **Reçete + besin + alerjen + etiket sistemi** — Reçete değişikliğinin etiket revize akışına bağlanması. Workflow runbook ✅ var (`docs/runbooks/recipe-label-workflow.md`); implementasyon planı YOK (Sprint 2 / post-pilot).
7. **Replit otomatik propose ettiği task'lar** (PROPOSED, owner inceleme bekliyor):
   - **#272** "Pilot Day-5 Güvenlik Sertleştirme Paketi (register + frameguard + authLimiter + log temizliği)" — isim/zamanlama tuhaf, içerik anlamlı; owner inceleyip retract veya scope netleştirsin.
   - **#273** "shift_attendance check-out kapanış bug'ını düzelt (DECISIONS madde 15)" — Madde 14 plan ile destekleniyor (`docs/plans/shift-attendance-checkout-fix.md`); implementasyon için owner GO yeterli.

---

## Sonraki 3 Adım (öncelik sırası)

1. **Push** — local 2 commit ahead (`57a6c4c0c` + `bf2ac7c94`); owner Replit Shell'den `git push origin main` ile origin/main güncelle (ChatGPT/Claude reaktive olursa divergence riskini sıfırla).
2. **Task #272 değerlendir** — Replit otomatik propose ettiği "Day-5 güvenlik paketi" task'ını UI'dan aç, isim/zamanlama/scope netleştir veya `markFollowUpTaskObsolete({ taskRef: "#272" })` ile retract.
3. **Owner kararı: implementasyon mı, ek docs mı?** — A) HQ PIN implementasyonu (~4.5 saat), B) shift_attendance fix (~3 saat), C) İzin/rapor bakiye planı (~30 dk DOCS), D) Fabrika üretim MVP planı (~45 dk DOCS), E) Sprint 2 master backlog audit (~1.5 saat DOCS, ChatGPT önerisi).

---

## Notlar

- Pilot test kayıtları (4 birim) gerçek operasyon değildir; raporlamalarda `notes='PILOT_PRE_DAY1_TEST_2026_04_29'` filtresi ile dışlanmalıdır.
- Aylık raporlamalar Excel kaynaklı `pdks_daily_summary` ve `pdks_monthly_stats` üzerinden hesaplandığı için pilot test kayıtları aylık maaş hesabını etkilemez.
- **Reçete detay sayfası — bilinen geçici davranış (T2.1, 29 Nis 2026):** Reçete detay sayfasında nadiren yükleme spinner'da kalma görülebilir. Geçici çözüm: sayfayı yenile / hard refresh (Cmd+Shift+R). Backend recipe API 200 dönüyor; kalıcı frontend UX iyileştirme post-pilot değerlendirilecek (bkz. `docs/DECISIONS.md` madde 28).
- **Çalışma modeli (2 May 2026):** ChatGPT + Claude şu an devre dışı, sadece Replit Agent ile ilerleniyor → divergence riski düşük, push acil değil ama tamponlu kalmak için yapılması önerilir.
- Detaylı ürün/operasyon kararları: `docs/DECISIONS.md`.
- Çalışma protokolü: `docs/COLLABORATION-PROTOCOL.md`.
