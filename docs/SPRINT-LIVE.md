# SPRINT LIVE — DOSPRESSO

Aktif sprintin canlı durumudur. Sprint kapanırken arşive alınır, yeni sprint için bu dosya sıfırlanır.

Son güncelleme: 29 Nisan 2026

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
8. **GitHub hassas dosya cleanup** — Repo geçmişinden hassas dosyalar temizlendi.

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
3. **Fabrika üretim MVP planını çıkar.**

---

## Notlar

- Pilot test kayıtları (4 birim) gerçek operasyon değildir; raporlamalarda `notes='PILOT_PRE_DAY1_TEST_2026_04_29'` filtresi ile dışlanmalıdır.
- Aylık raporlamalar Excel kaynaklı `pdks_daily_summary` ve `pdks_monthly_stats` üzerinden hesaplandığı için pilot test kayıtları aylık maaş hesabını etkilemez.
- Detaylı ürün/operasyon kararları: `docs/DECISIONS.md`.
- Çalışma protokolü: `docs/COLLABORATION-PROTOCOL.md`.
