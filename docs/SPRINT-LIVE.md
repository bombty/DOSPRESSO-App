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

---

## Açık İşler

1. **HQ kiosk PIN güvenliği** — HQ kiosk PIN'leri için hash + denetim akışı.
2. **`shift_attendance` check-out kapanışı** — Branch shift-end endpoint'inde `check_out_time` UPDATE eksiği.
3. **İzin / rapor / ücretsiz izin bakiyeleri** — Bakiye hesap ve gösterim mantığı.
4. **Ay sonu puantaj simülasyonu** — Pilot ay sonu öncesi tam puantaj kuru çalıştırması.
5. **Fabrika üretim MVP** — Fabrika üretim modülünün pilot için MVP kapsamı.
6. **Reçete + besin + alerjen + etiket sistemi** — Reçete değişikliğinin etiket revize akışına bağlanması.

---

## Sonraki 3 Adım (öncelik sırası)

1. **HQ kiosk PIN güvenliğini planla.**
2. **`shift_attendance` kapanış bug'ını planla.**
3. **TEST-MATRIX + runbook dosyalarını oluştur.**

---

## Notlar

- Pilot test kayıtları (4 birim) gerçek operasyon değildir; raporlamalarda `notes='PILOT_PRE_DAY1_TEST_2026_04_29'` filtresi ile dışlanmalıdır.
- Aylık raporlamalar Excel kaynaklı `pdks_daily_summary` ve `pdks_monthly_stats` üzerinden hesaplandığı için pilot test kayıtları aylık maaş hesabını etkilemez.
- **Reçete detay sayfası — bilinen geçici davranış (T2.1, 29 Nis 2026):** Reçete detay sayfasında nadiren yükleme spinner'da kalma görülebilir. Geçici çözüm: sayfayı yenile / hard refresh (Cmd+Shift+R). Backend recipe API 200 dönüyor; kalıcı frontend UX iyileştirme post-pilot değerlendirilecek (bkz. `docs/DECISIONS.md` madde 28).
- Detaylı ürün/operasyon kararları: `docs/DECISIONS.md`.
- Çalışma protokolü: `docs/COLLABORATION-PROTOCOL.md`.
