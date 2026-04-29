# DOSPRESSO — Bekleyen Karar Raporu (Reçete + Etiket + PIN Cleanup)

**Tarih:** 29 Nisan 2026
**Pilot Day-1:** 5 gün uzakta (4 Mayıs 2026)
**Hazırlayan:** Replit Agent (DOSPRESSO Sprint Planner)
**Kullanım:** Bu rapor ChatGPT (veya başka danışman) ile karar vermek için hazırlandı. 16 karar bekliyor.

---

## 0. Bağlam Özeti

DOSPRESSO bir kahve/yemek franchise platformu. 22 lokasyon (20 şube + HQ + Fabrika), 270 kullanıcı hedef, 29 rol. Pilot Day-1 = 4 Mayıs 2026, 2 şube (Lara b8, Mavi Boncuk b5) + Fabrika (b24) ile başlıyor.

**Aktif sprint 2 paralel iş içeriyor:**
1. **Phase 1.5 PIN Cleanup** — Eski/inactive 231 PIN pasifleştirme (preview hazır + dry-run PASS)
2. **Reçete + Etiket Bütünsel Revizyon** — gida_muhendisi yetki açma + hammadde detay + TGK etiket sistemi

**Karar verici:** Owner (Aslan). Sema = gida_muhendisi (HQ), RGM (İlker) = aynı zamanda gida_muhendisi (b24/Fabrika). Sevde = kalite_kontrol.

---

## A. Phase 1.5 PIN Cleanup Kararları (3 adet)

### A-1. Cleanup commit edilsin mi?

**Bağlam:** Mevcut 224 branch_staff_pins + 14 factory_staff_pins içinde 231 PIN soft-deleted/inactive/kiosk-yatırımcı/admin user'a bağlı ve pilot Day-1'de kioska giriş yapma riski yaratıyor. Branch ve factory kiosk login endpoint'lerinde `users.is_active` ve `deleted_at` kontrolü EKSİK — yani PIN aktif olduğu sürece silinmiş user bile giriş yapabilir.

**Dry-run sonucu:** `exit 0`, ROLLBACK doğrulandı, DB değişmedi. 219 branch + 12 factory PIN pasifleşti, 5+2=7 gerçek aktif personel PIN'i korundu (mudur5, laramudur, RGM, Umit, atiyekar0706, eren).

**Seçenekler:**
- 🅰 Şimdi commit et (DELETE değil, `is_active=false` — geri alınabilir)
- 🅱 Pilot sonrası commit et
- 🅲 Önce backend güvenlik açığını kapat, sonra commit et

**Önerim:** 🅰 — pilot Day-1'de eski user'ların kioska girememesi için en güvenli yol.

**Risk:** ⚠ Yanlış kullanıcı pasifleşirse kioska giriş yapamaz → V5 doğrulaması ile 7 anahtar user'ın PIN'inin korunduğu kanıtlandı.

---

### A-2. Phase 1 ile sıralama

**Bağlam:** Phase 1 = pilot için 26 yeni branch PIN + 11 yeni factory PIN seed (henüz commit edilmedi). Phase 1.5 = 231 eski PIN cleanup.

**Seçenekler:**
- 🅰 Phase 1.5 ÖNCE → Phase 1 SONRA (eski PIN'ler önce kapansın, sonra yeni eklensin)
- 🅱 Phase 1 ÖNCE → Phase 1.5 SONRA (yeni PIN'ler önce eklensin, sonra eskiler kapatılsın)
- 🅲 İkisini tek transaction'da ardışık çalıştır

**Önerim:** 🅰 — güvenlik için önce eski PIN'ler kapansın. Set kesişimi YOK, yeni PIN'lere dokunulmayacağı dry-run'da doğrulandı.

---

### A-3. Backend güvenlik açığının kalıcı yaması

**Bağlam:** PIN cleanup anlık çözüm. Kalıcı çözüm: PIN doğrulama endpoint'lerine `users.is_active=true AND deleted_at IS NULL` kontrolü eklemek.

**Etkilenen dosyalar:**
- `server/routes/branches.ts:2685` (kiosk login)
- `server/routes/factory.ts:694` (factory kiosk login)
- `server/routes/branches.ts:2645, 4090` (personel listesi)
- `server/routes/factory.ts:664` (factory personel listesi)

**Süre:** ~30 dk değişiklik + test.

**Seçenekler:**
- 🅰 Pilot Day-1 ÖNCESİ ayrı task olarak yap (önerim)
- 🅱 Pilot SONRASI yap (cleanup yeterli koruma sağlar)
- 🅲 Hiç yapma (cleanup düzenli aralıkla tekrarlanır)

**Önerim:** 🅰

---

## B. Reçete + Etiket Bütünsel Revizyon Kararları (12 adet)

### Bütünsel etki haritası

```
Reçete değişti (Sema)
    ├→ Maliyet analizi   ✅ on-the-fly, anında yansır
    ├→ Allergen tespit   ✅ her istekte hesap
    ├→ Üretim versiyonlama ✅ snapshot mekanizması var (eski üretim güvenli)
    ├→ Aktif üretim guard 🟡 YOK (snapshot koruyor ama uyarı yok)
    ├→ MRP-Light günlük plan 🔴 manuel yenileme gerek
    ├→ Bildirim akışı 🔴 YOK (büyük gap)
    └→ Etiket (TGK) 🔴 YENİ ihtiyaç
```

### Mevcut altyapı (DB durumu)

- `factory_ingredient_nutrition` (18 kolon, 111 kayıt) — kalori, yağ, **doymuş yağ**, karb, **şeker**, lif, protein, tuz, **trans yağ**, sodyum, alerjen → **TGK için %95 hazır** (sadece energy_kJ otomatik dönüştürülecek)
- `factory_recipes` etiket alanları var: `nutrition_facts (jsonb)`, `nutrition_per_portion (jsonb)`, `allergens`, `nutrition_calculated_at`, `nutrition_confidence`
- `computeRecipeNutrition()` fonksiyonu mevcut (`factory-allergens.ts:147`) — **gerçek zamanlı, cache yok** (owner'ın istediği davranış zaten var)
- 27 reçete (6 kategori) etiketlenecek
- 71 ingredient'in alerjen bilgisi eksik (Sema'nın somut iş listesi)
- 2 gida_muhendisi user: RGM (b24), sema (HQ)

### TGK Etiket Yönetmeliği zorunlu alanlar (Resmî Gazete 29960 mük., 26.01.2017)

| Alan | DB Durumu |
|---|---|
| 1. Gıdanın adı | ✅ |
| 2. Bileşenler azalan miktarla | 🟡 veri var, render fonksiyonu yok |
| 3. Alerjen vurgusu | ✅ |
| 4. **Net miktar (g/ml)** | ❌ EKSİK |
| 5. **TETT / raf ömrü** | ❌ EKSİK |
| 6. **Saklama koşulları** | ❌ EKSİK |
| 7. **İşletme adı/MERSİS** | ❌ EKSİK |
| 8. Menşe ülke | 🟡 TR sabit |
| 9. Kullanım talimatı | ❌ EKSİK (opsiyonel) |
| 10. Beslenme bildirimi (kJ + kcal + 6 alan) | ✅ (kJ otomatik dönüşüm) |

---

### Q1. Versiyonlama davranışı (gida_muhendisi reçete edit)

**Mevcut:** sef → pending (recete_gm onay), admin/recete_gm → auto-approved.

**Soru:** gida_muhendisi (Sema) reçete editlediğinde versiyon davranışı ne olsun?

- 🅰 Auto-approved (admin/recete_gm gibi) — hızlı ama RGM onayı yok
- 🅱 Pending → recete_gm onay (sef gibi) — güvenli ama Sema bağımsız çalışamaz
- 🅲 **Hibrit:** Besin değer + alerjen → auto-approved. Hammadde ekle/sil/değiştir + oran → pending → recete_gm onay

**Önerim:** 🅲

**Etki:** Hibrit, Sema'nın uzmanlık alanında bağımsız çalışmasına izin verirken kritik (hammadde) değişikliklerde RGM kontrolünü korur.

---

### Q2. editLocked davranışı

**Mevcut:** Reçete `editLocked=true` ise admin dışı herkes engelleniyor.

**Soru:** gida_muhendisi'ne özel davranış?

- 🅰 gida_muhendisi de engellensin (kilit özel koruma)
- 🅱 gida_muhendisi de admin gibi bypass edebilsin

**Önerim:** 🅰

**Etki:** Kilit zaten kasıtlı bir koruma — Sema'nın bypass etmesi kilidi anlamsız kılar.

---

### Q3. Aktif üretim sırasında reçete düzenleme

**Mevcut:** Guard YOK ama `recipeVersionId` snapshot mekanizması var → eski üretim eski versiyon ile güvenle devam eder.

**Soru:** Ek koruma?

- 🅰 Hiçbir şey yapma (snapshot zaten koruyor)
- 🅱 Uyarı banner göster (engelleme değil) — "Bu reçete üretimde, değişiklik sonraki üretimlere etki eder"
- 🅲 Tam engelle (HTTP 423 dön)

**Önerim:** 🅱

**Etki:** Operatör bilinçli karar alır, yanlışlıkla aktif üretim sırasında kritik değişiklik yapma riski azalır.

---

### Q4. Bildirim akışı (BÜYÜK BOŞLUK)

**Mevcut:** Reçete değişikliği için `createNotification` çağrısı YOK — kimseye haber gitmez.

**Soru:** Hangi rollere bildirim?

| Değişiklik tipi | Önerilen alıcı |
|---|---|
| Hammadde ekle/sil/değiştir | recete_gm + fabrika_mudur + uretim_sefi |
| Oran değişikliği | recete_gm + uretim_sefi |
| Besin değer / alerjen | kalite_kontrol + recete_gm |
| Reçete ana bilgi (isim, kategori) | recete_gm + fabrika_mudur |

**Alt soru:** Sadece gida_muhendisi değişikliklerine mi, tüm rol değişikliklerine mi (sef + recete_gm dahil) uygulansın?

- 🅰 Sadece gida_muhendisi değişikliklerine
- 🅱 **Tüm rol değişikliklerine** (sef + recete_gm dahil)

**Önerim:** 🅱

**Etki:** Audit izi tam, kim değiştirirse değiştirsin ilgili rol haberdar olur.

---

### Q5. MRP-Light senkronizasyonu

**Mevcut:** `daily_material_plans` reçete değişikliğini almaz; sadece `POST /api/mrp/generate-daily-plan` ile manuel yenilenir. Status='confirmed' olan plan eski reçete ile çalışır.

**Soru:** Reçete değişince MRP planı ne yapsın?

- 🅰 Auto-regenerate (riskli — depocu hazırladıktan sonra plan değişir)
- 🅱 **Bilgilendirme bildirimi** (uretim_sefi'ne: "Reçete X değişti, planı yenile")
- 🅲 Plan kilidi (status='confirmed' iken reçete değişikliğini engelle)

**Önerim:** 🅱

**Etki:** Manuel kontrol korunur, üretim sefi bilinçli karar verir.

---

### Q6. Test reçetesi seçimi

**Bağlam:** Donut DON-001 production-critical — test için kullanılmamalı. Sema'nın gerçek senaryoyu test etmesi gerek.

**Seçenekler:**
- 🅰 **Yeni TEST-001 reçetesi oluştur** (sandbox, üretim akışından izole)
- 🅱 Düşük öncelikli mevcut reçete (örn. henüz aktif olmayan)
- 🅲 İkinci Sema (`hq-sema-gida`, branch_id=NULL) sandbox kullanıcı olarak işaretlensin

**Önerim:** 🅰

---

### Q7. Etiket veri modeli (yeni alanların DB'ye yerleşimi)

**Bağlam:** TGK için 5 yeni alan eklenecek (net_quantity_g, shelf_life_days, storage_conditions_tr, usage_instructions_tr, producer_info_override).

**Seçenekler:**
- 🅰 Yeni tablo `factory_recipe_label_metadata` (1:1 ile factory_recipes'e bağlı) — temiz ayrım
- 🅱 **factory_recipes'e 5 yeni kolon ekle** — basit, sorgulamada join yok

**Önerim:** 🅱

**Etki:** factory_recipes zaten 30+ kolon — 5 ek kolon önemli yük getirmez, kod basit kalır.

---

### Q8. Üretici bilgisi yönetimi (TGK zorunlu)

**Bağlam:** TGK her etikette üretici adı/adres/MERSİS no zorunlu. Aslan Gıda San. Tic. Ltd. Şti. + adres + MERSİS.

**Seçenekler:**
- 🅰 Sistem sabit (kod içinde) — değişiklik için redeploy gerek
- 🅱 **`system_config` tablosu** (admin tek yerden günceller) — esnek, audit'lenebilir
- 🅲 Per-recipe override (her ürün için farklı işletme bilgisi)

**Önerim:** 🅱

**Etki:** İleride şirket bilgileri (adres, MERSİS) değişirse admin panelinden tek noktadan güncelleme.

---

### Q9. Etiket metadata onay akışı

**Soru:** Sema/RGM etiket metadata düzenlerken onay gerekli mi?

- 🅰 Auto-approved (Sema/RGM/admin doğrudan)
- 🅱 kalite_kontrol onayı (Sevde gıda güvenliği)
- 🅲 **Versiyonla, onay yok** (audit trail var, onay yavaşlatır)

**Önerim:** 🅲

**Etki:** Etiket sürekli güncellenir, onay süreci işi yavaşlatır. Versiyon takibi yeterli denetim sağlar.

---

### Q10. Pilot Day-1 ile sıralama

**Bağlam:** 5 gün var. Toplam iş ~15 saat (Sprint 1: 6h, Sprint 2: 9h).

**Seçenekler:**
- 🅰 Hepsini Pilot Day-1'e yetiştir (yoğun ama mümkün)
- 🅱 **Sprint 1 (A+B+C+E-min) pilot öncesi, Sprint 2 (G+H+I+J+D+F) pilot ile paralel veya sonrası**
- 🅲 Etiket sistemi tamamen Phase 2'ye (1 ay sonra)

**Önerim:** 🅱

**Sprint 1 detayı (~6h, pilot ÖNCESİ):**
- A — Backend yetki (gida_muhendisi reçete edit, 1h)
- B — Frontend buton render (1h)
- ARA TEST — Sema test reçetesinde 5 işlem
- C — Hammadde/YM detay listesi (3h)
- E-min — Bildirim altyapısı temel (1h)

**Sprint 2 detayı (~9h, pilot ile paralel veya sonrası):**
- G — Schema migration (5 kolon + system_config tablosu, 30dk)
- H — Etiket hesap motoru (TGK format, 2h)
- I — Etiket görüntüleme sayfası + PDF (3h)
- J — Yetki dağıtımı + sidebar (1h)
- D — Reçete edit besin değer UX (1h)
- F — Final entegrasyon testi (1h)

---

### Q11. PDF / Çıktı formatı

**Seçenekler:**
- 🅰 Sadece HTML web önizleme
- 🅱 **HTML + PDF indir** (etiket basılabilsin — TGK formatı)
- 🅲 + Excel toplu dışa aktarım

**Önerim:** 🅱

**Etki:** Etiket fiziksel ürüne yapışacak — PDF zorunlu.

---

### Q12. Public QR kod (müşteri ürün etiketini okuma)

**Seçenekler:**
- 🅰 Sprint 2'de yap
- 🅱 **Phase 2'ye bırak** (pilot sonrası 1-2 ay) — şu an iç araç olarak yeterli
- 🅲 Hiç yapma (sadece iç araç)

**Önerim:** 🅱

---

## C. Yetki Matrisi (Etiket Sistemi için Önerilen)

| Rol | Etiket Görüntüle | Etiket Metadata Düzenle | Reçete Düzenle |
|---|:-:|:-:|:-:|
| admin | ✅ | ✅ | ✅ |
| ceo, cgo | ✅ | ❌ | ❌ |
| **gida_muhendisi (Sema, RGM)** | ✅ | ✅ | ✅ (yeni) |
| recete_gm | ✅ | ✅ | ✅ |
| sef | ✅ | ❌ | ✅ (kategori-kısıtlı) |
| satinalma | ✅ | ❌ | ❌ |
| muhasebe / muhasebe_ik | ✅ | ❌ | ❌ |
| fabrika_mudur | ✅ | ❌ | ❌ |
| kalite_kontrol | ✅ | ❌ | ❌ |
| uretim_sefi | ✅ | ❌ | ❌ |
| Şube rolleri (mudur/supervisor) | 🟡 Sprint 2 (read-only) | ❌ | ❌ |
| Müşteri (public) | 🟡 Phase 2 (QR ile) | ❌ | ❌ |

---

## D. Karar Çek Listesi (ChatGPT için kısa form)

ChatGPT'ye sadece şu blok yapıştırılabilir:

```
DOSPRESSO Reçete + Etiket + PIN Cleanup — 16 karar bekliyor.

A. PIN CLEANUP (Pilot Day-1 5 gün uzakta):
A-1. 231 PIN cleanup commit edilsin mi? Önerim: 🅰 Şimdi commit
A-2. Sıralama? Önerim: 🅰 Phase 1.5 ÖNCE → Phase 1 SONRA
A-3. Backend güvenlik kalıcı yaması? Önerim: 🅰 Pilot öncesi ayrı task

B. REÇETE + ETİKET (12 karar):
Q1. Versiyonlama (gida_muhendisi)? 🅲 Hibrit (besin auto, hammadde pending)
Q2. editLocked bypass? 🅰 Engellensin
Q3. Aktif üretim guard? 🅱 Uyarı banner (engelleme değil)
Q4. Bildirim kapsamı? 🅱 Tüm rol değişikliklerine (sef + recete_gm dahil)
Q5. MRP-Light senkron? 🅱 Bildirim (uretim_sefi'ne plan yenile)
Q6. Test reçetesi? 🅰 Yeni TEST-001 oluştur
Q7. Etiket veri modeli? 🅱 factory_recipes'e 5 kolon
Q8. Üretici bilgisi? 🅱 system_config tablosu
Q9. Etiket onay akışı? 🅲 Versiyon yeterli, onay yok
Q10. Pilot sıralaması? 🅱 Sprint 1 önce, Sprint 2 paralel/sonra
Q11. PDF? 🅱 HTML + PDF
Q12. Public QR? 🅱 Phase 2'ye

DEĞİŞMEZ KISITLAR:
- Pilot Day-1 = 4 Mayıs 2026 (5 gün)
- 2 şube + Fabrika açılıyor (Lara b8, Mavi Boncuk b5, Fabrika b24)
- Sema = gida_muhendisi (HQ), RGM (İlker) = aynı role + b24
- Sevde = kalite_kontrol
- TGK Etiket Yönetmeliği zorunlu (RG 29960 mük., 26.01.2017)
- Schema migration: drizzle-kit generate + psql -f (drizzle-kit push timeout veriyor)

SORU CHATGPT'YE:
Önerimleri kabul ediyor musun? Farklı görüşlerin varsa Q numarasıyla belirt.
```

---

## E. Karar Onayı Beklemeyen Diğer Açık Konular

Bunlar şu an karar gerektirmiyor ama bilgi olsun:

1. **MRP-Light auto-trigger:** Şu an manuel. Pilot'ta üretim sefi günlük plan üretmeli.
2. **Allergen 71 eksik:** Sema'nın somut iş listesi — Sprint 1 sonunda hammadde detay sayfasında "Eksik" filtresiyle görecek.
3. **Reçete versiyonlama UI:** Mevcut (geri al, snapshot history). gida_muhendisi'ne açılacak (Faz B).
4. **Üretim snapshot:** `factory_production_logs.recipeVersionId` zaten var — ek iş yok.
5. **Maliyet analizi:** On-the-fly hesap, cache yok — ek iş yok.

---

## F. Toplam Süre / Kapasite Tahmini

| Sprint | İçerik | Süre | Pilot ile ilişki |
|---|---|---|---|
| Phase 1.5 cleanup commit | 231 PIN pasifleştirme | 5 dk | Pilot ÖNCESİ |
| Phase 1 PIN seed | 26 + 11 yeni PIN | 10 dk | Pilot ÖNCESİ |
| Backend güvenlik yaması | 4 endpoint güncellemesi | 30 dk | Pilot ÖNCESİ |
| **Sprint 1 (Reçete)** | A + B + ARA TEST + C + E-min | **6 saat** | Pilot ÖNCESİ |
| **Sprint 2 (Etiket)** | G + H + I + J + D + F | **9 saat** | Pilot paralel/sonrası |
| **TOPLAM** | | **~16 saat** | |

5 gün içinde rahat sığar (~3 saat/gün ortalama). Pilot Day-1 risksiz.

---

**SON:** Owner cevabı bekleniyor. ChatGPT görüşü alındıktan sonra Sprint 1 başlatılacak.
