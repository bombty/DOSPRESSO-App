# DECISIONS — DOSPRESSO

Bu dosya bugüne kadar alınan ürün/operasyon kararlarının kalıcı kaydıdır. Her madde owner (Aslan) tarafından onaylı, ChatGPT (IT danışman) ile gözden geçirilmiş ve Replit (uygulayıcı) tarafından sisteme yansıtılmış / yansıtılması beklenen karardır.

Son güncelleme: 29 Nisan 2026

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

## Tamamlanmış Pilot Hazırlık Adımları

10. **Personel import Phase 1 tamamlandı.**
11. **PIN cleanup + PIN seed tamamlandı.**
12. **4 birim kiosk giriş/çıkış testi başarılı.** (Işıklar, Lara, Fabrika, HQ — 29 Nisan 2026.)
13. **Test kayıtları `PILOT_PRE_DAY1_TEST_2026_04_29` notu ile işaretlendi.** İlgili `branch_shift_sessions`, `factory_shift_sessions`, `hq_shift_sessions` ve `shift_attendance` satırlarında `notes` alanı ile pilot test kayıtları gerçek operasyon kayıtlarından ayrıştırılır.

## Açık Riskler & Teknik Borçlar (karar olarak işaretli)

14. **HQ kiosk PIN plaintext konusu ayrı risk olarak açık.** Henüz hash'lenmemiş HQ kiosk PIN'leri pilot sonrası ele alınacak, kapsam ayrıdır.
15. **`shift_attendance` check-out kapanış mantığı açık teknik borç.** Branch shift-end endpoint'i `shift_attendance.check_out_time` alanını güncellemiyor; bordrosu `pdks_daily_summary` (Excel) üzerinden okunduğu için maaş etkilenmez ama kayıt bütünlüğü açısından düzeltilmesi gerekir.

## Ürün / İçerik Kararları

16. **Reçete değişince etiket revize gerekli durumuna düşmeli.** Bir reçetenin gramaj, içerik veya alerjen alanı değiştiğinde bağlı etiketler "revize gerekli" statüsüne otomatik geçer.
17. **Gıda mühendisi besin/alerjen tarafında aktif rol almalı.** Besin değerleri ve alerjen onay/yayın akışında gıda mühendisi pasif gözlemci değil, aktif onay merci olarak konumlanır.

---

> Karar değişikliği için: önce bu dosyada yeni karar maddesi yazılır, owner'dan açık onay alınır, eski karar ya günceller ya da "geçersiz — bkz. madde X" notu ile arşivlenir.
