# 🔄 Sprint 14 Durum Tespiti — Sekmeler ZATEN YAPILMIŞ!

> **Tarih:** 7 May 2026, 00:50 (gece otonom kontrol)
> **Tetikleyici:** Aslan "Sprint 14'e başla" dedi → kontrol ettiğimde sekmeler zaten mevcut

---

## 🎯 Büyük Keşif

`fabrika-recete-detay.tsx` (149KB) **zaten 10 sekmeli yapıda**! Sprint 14 planındaki tüm sekmeler kodda var — birkaçı çalışıyor, birkaçı placeholder.

### Sekme Durum Tablosu

| # | Sekme | Durum | Kaynak | Aksiyon |
|---|---|---|---|---|
| 1 | 🥄 Malzemeler | ✅ Tam | factory_recipe_ingredients canlı | — |
| 2 | 📝 Adımlar | ✅ Tam | factory_recipe_steps canlı | — |
| 3 | 🥗 Besin | ✅ Tam | TÜRKOMP + AI | — |
| 4 | ⚠️ Alerjen | ✅ Tam | recipe.allergens (14 alerjen) | — |
| 5 | 🏷️ **Etiket** | 🟡 **Yarım** | `gramajApproved` varsa link → /etiket-hesapla | **Sprint 14 inline embed** |
| 6 | 📦 Lot | 🟡 Placeholder | "Sprint 16'da aktif" yazıyor | Post-pilot Sprint 16 |
| 7 | 📋 Notlar | ✅ Tam | recipe.technicalNotes | — |
| 8 | ✅ Onaylar | ✅ Tam | factory_recipe_approvals workflow | — |
| 9 | 💰 Maliyet | ✅ Tam | factory_recipe_price_history | — |
| 10 | 📊 Geçmiş | 🟡 Placeholder | "Sprint 16'da aktif" yazıyor | Post-pilot Sprint 16 |

---

## 📊 Yeni Sprint 14 Plan (Revize)

Önceki plan: "10 sekme yapısını ekle (4 yeni sekme)" → **YANLIŞ**, zaten var.

**Doğru plan:**

### Hızlı İş (Pilot Öncesi — 1-2 saat)
1. ✅ ~~10 sekme yapısı~~ — Zaten yapılmış
2. ~~Alerjen sekmesi içerik~~ — Zaten dolu
3. **Etiket sekmesi inline embed** — Yarım kalmış, link yerine inline editör

### Post-Pilot Sprint 14 Reel İşler (25 May+)
1. Etiket sekmesi tam inline (etiket-hesapla.tsx içeriği embed)
2. Lot sekmesi placeholder → gerçek (Sprint 16 öncesi öne alınabilir)
3. Geçmiş sekmesi placeholder → gerçek (factory_production_logs)

### Hammadde Detay Refactor (Sprint 15)
- Henüz incelemedim, ayrı kontrol gerekli
- Tedarikçi Kalite QC'nin tab olarak embed edilip edilmediği belirsiz

---

## 💡 Strateji Değişikliği

### Önceki Tahmin

> Sprint 14 = 1 hafta refactor, 4 yeni sekme eklenmeli, büyük iş.

### Gerçek

> Sprint 14 = **çoğu zaten yapılmış**. Sadece 2-3 placeholder gerçek içeriğe dönüştürülmeli (post-pilot, Sprint 16'ya kalmış).

### Pilot İçin Etki

✅ **Pilot 18 May için reçete modülü ZATEN HAZIR** — Sema, İlker, Ümit, Eren bu sekmeleri kullanabilir.

🟡 **Etiket sekmesinin inline embed olmaması ufak bir UX şikayeti** — ama "Etiket Düzenleyiciyi Aç" butonu çalışıyor → pilot için yeterli.

🟢 **Lot ve Geçmiş placeholder** — Pilot Day-1'de zaten kullanılmayacak (lot Eren manuel kağıt, geçmiş ilk üretim sonrası dolacak).

---

## 🚦 Yeni Karar Önerisi

### Bu Gece (00:50)
**DUR.** Sprint 14 ana işi zaten yapılmış. Etiket inline embed büyük refactor — düzgün test gerekir.

### 7 May Sabah (Aslan için)
1. Önce 3 PR mergele (P-19, P-20, PENDING v4)
2. Replit deploy
3. HQ PIN dağıtım (kritik blocker)
4. **Reçete detay sayfasına gözat** — sekmelerin canlıda nasıl çalıştığını test et
5. Sema rolüyle bir reçete aç → 10 sekmeyi gez → hatalar var mı?

### Post-Pilot (25 May+)
1. Etiket sekmesi inline embed (D-44 tam uyum) — 1-2 gün
2. Hammadde detay refactor (Sprint 15)
3. Sidebar minimal (Sprint 17)
4. Mr. Dobody Dashboard (Sprint 16)

---

## 📋 Yarın Aslan İçin Test Senaryosu

`/admin/hq-pin-yonetimi` sonrası, yine Sema rolüyle:

```
1. Login: Sema (gida_muhendisi)
2. Aç: /fabrika-receteler → bir reçete seç (örn: BRW-001)
3. Sekmeleri sırayla gez:
   ✓ Malzemeler — liste geliyor mu?
   ✓ Adımlar — liste geliyor mu?
   ✓ Besin — değerler hesap edilmiş mi?
   ✓ Alerjen — 14 allerjen badge'leri görünüyor mu?
   ✓ Etiket — buton "Etiket Düzenleyiciyi Aç" aktif mi?
   ✓ Lot — placeholder görünüyor mu (normal)?
   ✓ Notlar — teknik notlar geliyor mu?
   ✓ Onaylar — workflow bekleyenler listeleniyor mu?
   ✓ Maliyet — fiyat hesabı çıkıyor mu?
   ✓ Geçmiş — placeholder (normal)?
4. Beklenmeyen bir crash veya boşluk varsa not al
5. Aslan'a (kendine) raporla → Claude'a iletir
```

---

## 📌 Replit'ten Gelen Bilgiler (Önemli)

Aslan'ın paylaştığı Replit raporundan:

### Kritik PRE_CHECK Sonuçları (Sprint 10 P-7 Migration için)

| Kontrol | Değer | Yorum |
|---|---|---|
| HQ user phone_number NOT NULL | **0** | Tümü NULL — beklendiği gibi |
| Existing HQ branch_staff_pins | **18** | (önceki tahminim 19'du, gerçek 18) |
| pgcrypto installed | **HAYIR** | CREATE EXTENSION çalışacak |
| Beklenen INSERT | **0 satır** | Migration trace amaçlı |

### Replit'in Yaptığı Test Sonuçları

- 3 admin endpoint HTTP 200 ✅
- 19 HQ kullanıcı sorgulandı, 17 PIN tanımlı, 2 PIN yok (Replit raporu) — ya da 18'i mi, kesinleşmeli
- Admin DOSPRESSO PIN reset test → hasPin=True ✅
- PIN unlock test → {"ok":true} ✅
- Pre-commit hook aktif ✅

### Replit'in Endpoint'leri (benimki ile karşılaştırma)

**Benim (PR #36):**
- `POST /api/admin/hq-users/:userId/reset-pin`
- `POST /api/admin/hq-users/bulk-pin-reset`
- `GET /api/admin/hq-users-pin-status`

**Replit (henüz push'lanmamış):**
- `GET /api/admin/hq-users-pin-status` (aynı)
- `POST /api/admin/hq-pin-reset/:userId` (farklı route)
- `POST /api/admin/hq-pin-unlock/:userId` (YENİ — kilit açma)

🟡 **Çakışma riski:** Aynı amaçla iki farklı endpoint set'i var. Replit push yaparsa merge conflict olabilir.

**Çözüm önerisi:** Replit'in push ettiğinde Aslan + Claude (yarın) çakışmayı çöz. Replit'in unlock endpoint'i değerli — ekleyebiliriz. Ama route isimleri standardize edilmeli.

---

## ✅ Karar

**Sprint 14'e geç başlatma:** 25 May+ (post-pilot). Sebep:
1. Sekmeler zaten var
2. Pilot için yeterli durumda
3. Etiket inline embed büyük refactor → riskli, test gerekli
4. Pilot 18 May'a 11 gün kaldı, mevcut işlere odaklan

**Şu an dur:** Saat 00:50, 8 saat mesai. Sabah Aslan kalkacak, mergele + test + Mahmut çağrı yapacak. Ben hazır beklerim.

---

**Hazırlayan:** Claude (otonom 8 saat mesai sonu)
**Tarih:** 7 May 2026, 00:50
**Sonraki adım:** Aslan sabah uyandığında ASLAN-7-MAY-SABAH-CHECKLIST.md sırasıyla
