# COLLABORATION PROTOCOL — DOSPRESSO

DOSPRESSO geliştirme/operasyon ekibinin çalışma kuralları. Bu protokol owner (Aslan) tarafından koyulur ve değiştirilir.

Son güncelleme: 29 Nisan 2026

---

## Roller

| Rol | Kim | Sorumluluk |
|---|---|---|
| **Owner** | Aslan | İş kararı, GO / NO-GO, öncelik, kapsam tanımı, son söz. |
| **IT Danışman** | ChatGPT | Mimari değerlendirme, prompt hazırlama, risk analizi, sade karar özeti, alternatif sunma. |
| **Uygulayıcı** | Replit (agent) | Veritabanı işlemleri, runtime, kod, test, deploy. Owner direktifine göre uygulama yapar. |

---

## Mod Disiplini

Her iş tek bir mod ile başlar. Aynı anda yalnızca tek aktif iş olur.

| Mod | Kapsam |
|---|---|
| **READ-ONLY** | Sadece SELECT, dosya okuma, log inceleme. Hiçbir yazma yok. |
| **PLAN** | Plan/teklif/çözüm önerisi yazılır. Kod, DB, schema değişmez. |
| **IMPLEMENTATION** | Kod ve/veya yapılandırma yazılır. DB write opsiyoneldir ve ayrı onaylanır. |
| **DB-WRITE** | Yalnızca veritabanına yazma. Kod değişmez. Backup + dry-run + GO zorunlu. |
| **GIT-ONLY** | Yalnızca git operasyonu (status, log, sync). Kod / DB / dosya değişmez. |
| **DOCS-ONLY** | Yalnızca dokümantasyon dosyası (markdown vb.). Kod / DB / schema / env / paket / SQL değişmez. Commit/push yapılmaz. |

---

## Akış Kuralları

1. **Her Replit işi başında Git sync kontrolü yapılır.**  
   - Local HEAD ile `origin/main` karşılaştırılır.  
   - Behind ise `pull --ff-only`.  
   - Ahead/Diverged ise iş başlamaz, owner'a raporlanır.  
   - Sync temizse devam edilir.
2. **Aynı anda tek aktif iş.** Yeni iş başlamadan önce öncekinin raporu alınır.
3. **Mod değişikliği owner onayı ile olur.** Replit kendi başına mod atlamaz (örn. DOCS-ONLY içinde DB write yapmaz).

---

## İş Sonu Raporu (zorunlu format)

Her iş tamamlandığında Replit aşağıdaki başlıkları rapor eder:

1. **Değişen dosyalar** — yeni / güncellenen / silinen dosya listesi.
2. **DB write var mı?** — Evet / Hayır. Varsa hangi tablo, kaç satır, hangi alan.
3. **Commit / push durumu** — yapıldı / yapılmadı, hash bilgisi.
4. **Test sonucu** — koşulan testler, geçti / kaldı, ekran görüntüsü/log varsa not.
5. **Risk** — bilinen yan etkiler, açık uçlu noktalar, geri alma planı.
6. **Sonraki adım** — önerilen ya da zorunlu sonraki iş.

---

## Etik & Güvenlik Kısıtları

- **Hard delete yasak.** Pilot/test kullanıcıları için soft-delete / pasif kullanılır.
- **DB write öncesi backup + dry-run + owner GO.** İstisnasız.
- **Hassas veri (PIN, password, secret) raporda asla yazılmaz.** Sadece varlık/durum belirtilir.
- **Kiosk insan değildir.** İK / bordro / performans listelerine eklenmez.

---

> Bu protokol değişikliği yalnızca owner (Aslan) tarafından yapılır. Replit ve ChatGPT bu dosyayı kendi başlarına güncellemez; ancak bir önceki sürümü referans alıp "öneri" sunabilirler.
