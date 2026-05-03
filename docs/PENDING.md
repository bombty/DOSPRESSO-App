# 📋 DOSPRESSO — PENDING.md

**Son güncelleme:** 4 May 2026 Pazartesi 00:45 (Claude)
**Format:** TASK-XXX (iş) / DECISION-XXX (Aslan kararı)
**Kural:** Her biten sonra üst tablodaki ilgili satırı **DELETE**, TODAY.md "BİTENLER" bölümüne ekle.
**Bağlam:** Pilot 12 May 09:00 — 8 gün uzakta.

---

## 🚨 ASLAN'A BEKLEYEN (yeni oturum açar açmaz)

### 🔴 TASK-MERGE-001: Branch Recipes Admin PR'ı Merge (1 dk, P0)

```bash
git fetch origin && \
git merge --no-ff origin/claude/branch-recipes-admin-2026-05-04 \
  -m "Merge: HQ Admin paneli (CRUD + görsel upload)" && \
git push origin main && \
git push origin --delete claude/branch-recipes-admin-2026-05-04 && \
git pull origin main
```

**Branch:** `claude/branch-recipes-admin-2026-05-04`
**HEAD:** `f91a1e078`
**Acceptance:** `git log origin/main -1` → "Merge: HQ Admin paneli" görünür

---

### 🔴 TASK-SMOKE-001: Replit Admin Smoke Test (5 dk, P0)

**Replit Agent prompt:**
```
MODE: Build
TASK: Branch recipes admin paneli smoke test

ADIMLAR:
1. Build: npm run build (beklenen: hatasız)
2. Server restart (workflow:restart)

3. Admin login → /branch-recipes/admin browser test:
   - Sayfa yüklenir, ~23 ürün listelenir
   - "Yeni Ürün" butonu → modal açılır
   - Form (name="Test Ürün 2", category="hot_coffee") → Kaydet
   - Pencil → Düzenle modal → güncelle
   - Camera → görsel seç → 3 boyut yüklenir
   - Trash → confirm → soft delete

4. Yetki test (barista login):
   - /branch-recipes/admin → "Yetkisiz Erişim" ekranı

5. Temizlik: UPDATE branch_products SET is_active=false WHERE name='Test Ürün 2'

6. Aslan'a final rapor: HEAD hash + smoke test sonuçları
```

**Acceptance:** Replit raporu PASS

---

## 📨 CLAUDE'A BEKLEYEN (Pilot 12 May için)

### 🔴 TASK-EDIT-001: Reçete Adım/Malzeme Editör UI (2h, P0)

**Bağlam:** Backend zaten hazır (`PUT /api/branch-recipes/:id/ingredients` ve `/steps`). UI yok.

**Çıktı:**
- `client/src/pages/branch-recipes/recipe-editor.tsx`
- Route: `/branch-recipes/admin/recipe/:recipeId`
- Admin sayfasında reçete satırında "Düzenle" butonu

**Özellikler:**
- Malzeme satırı CRUD (drag-drop sıralama opsiyonel)
- Adım satırı CRUD
- "Kritik adım" toggle
- Tahmini süre (sn)
- Kaydet → transaction PUT (ingredients + steps ayrı)
- Önizleme (sağ taraf, gerçek zamanlı)

**Acceptance:**
- HQ rolü reçete adımı/malzemesi ekleyebilir/silebilir
- 0 hata, smoke test PASS

---

### 🔴 TASK-AROMA-001: Aroma Seçim UI + Yeni API Endpoint (1h, P0)

**Bağlam:** Detay sayfasında template badge görünüyor ama aroma seçimi placeholder.

**Yapılacak:**

1. **Yeni endpoint:** `GET /api/branch-recipes/:id/aroma-options`
   - Bu reçetenin uyumlu aromalarını döndürür
   - Slot bazlı grupla (`primary_fruit`, `secondary_fruit`, `chocolate_bar_type`, `cream_base_aroma`)
   - Aroma + override pump miktarları + display name
   - Default aroma `is_default=true` olanı

2. **UI:** `detail.tsx`'te `TemplateAromaSelector` doldur
   - Radio button grup (slot başına)
   - Aroma emoji + isim + override pump
   - Seçilince malzeme listesi güncellensin (aromaSlot olan satır)
   - "Müşteri seçer" badge → seçilen aroma adıyla değişsin

**Acceptance:**
- Mango Mojito detay → 5 meyve radio görünür
- Mango seçildi → "Meyve şurup" satırı "Mango şurup, 3 pump" olur
- Jimmy Jambo → primary slot Şeftali (varsayılan), secondary slot Amber

---

### 🟡 TASK-SEED-001: Geri Kalan ~75 Sabit Ürün Seed (2-3h, P1)

**Bağlam:** Şu an 8 sabit ürün + 15 template canlı. Reçete v.3.6 PDF'inde toplam ~109 reçete var.

**Eksik kategoriler:**
- Sıcak kahveler kalan 16 ürün (Power Brown, Pecan Nutty, Caramocha, Caramel Macchiato, Choconero, Nut Nougat, Toffee Nut, French Vanilla Latte, Pumpkin Latte, Chocobianco, Dolce Latte, Toasted Marshmallow, Chaity, Golden Latte, Chocolate Plus, Popflix)
- Buzlu kahveler 22 ürün
- Creamice kırık buzlu 16 ürün (Matcha hariç)
- Gourmet Shake 6 ürün (Oreo, Snickers, Pecan Nutty, Bounty, Orient, Vanilemon)
- Creamshake kahvesiz 14 ürün
- Sıcak çay tek-poşet 6 ürün
- Soğuk çay 6 ürün

**Yapılacak:**
- `scripts/seed/branch-recipes-seed-part2.ts` (Sıcak kahveler kalan)
- `scripts/seed/branch-recipes-seed-part3.ts` (Buzlu kahveler)
- `scripts/seed/branch-recipes-seed-part4.ts` (Creamice + Gourmet)
- `scripts/seed/branch-recipes-seed-part5.ts` (Çaylar + Creamshake)

**Acceptance:**
- Toplam ürün ≥ 100
- API `GET /api/branch-products` her kategoriden ürün döndürür

---

### 🟡 TASK-DOBODY-001: Mr. Dobody Recipe-Finder Skill (1h, P1)

**Çıktı:** `server/agent/skills/recipe-finder.ts`

**Özellikler:**
- Barista "Cinnabon nasıl yapılır?" → Mr. Dobody adım adım anlatır
- Aroma değişkenli ise "Hangi meyve?" diye sorar
- Müşteri profiline göre öneri (en sevdiği aroma)
- Quiz sorusu üretebilir

**Acceptance:**
- Barista kiosktan Dobody'e sorduğunda doğru reçete adımları döner
- Template ürünler için aroma sorgusu

---

### 🟡 TASK-ONBOARDING-001: Akademi Onboarding Bağlantısı (1-2h, P1)

**Bağlam:** `branch_onboarding_steps` tablosu boş. Yeni başlayan barista hangi reçeteyi hangi sırada öğrenecek?

**Yapılacak:**
- Seed: 4 hafta × 5 gün × 3 reçete = ~60 öğrenme adımı
- Hafta 1: Espresso temelleri (Americano, Latte, Flat White)
- Hafta 2: Süt köpürtme + Bombty Latte/Power Brown
- Hafta 3: Aroma + Şablon (Matcha, Mojito)
- Hafta 4: Karmaşık (Choconero, Caramel Macchiato, Twix Creamice)
- UI: `/branch-recipes/onboarding` (rol bazlı)

**Acceptance:**
- Stajyer login → "Sıradaki: Americano öğren" görür
- Tıklayınca reçete detayına gider
- Quiz tamamlayınca sonraki adıma geçer

---

### 🟡 TASK-QUIZ-001: Otomatik Quiz Üretici (1h, P1)

**Bağlam:** `branch_recipe_quizzes` tablosu boş.

**Yapılacak:**
- Script: `scripts/seed/quiz-generator.ts`
- Her reçete için 3-5 quiz sorusu otomatik üret:
  - Easy: "Latte Massivo'da kaç ml süt?"
  - Medium: "Bombty Latte sıcak Long Diva için kaç pump beyaz çikolata?"
  - Hard: "Müşteri laktozsuz Creamy Latte istiyor — reçeteyi açıkla"
- Soru tipleri: multiple_choice (4 seçenek), fill_blank, true_false

**Acceptance:**
- ~100 reçete × 3 quiz = ~300 quiz canlı
- API `GET /api/branch-recipes/:id/quizzes` rastgele 5 döndürür

---

### 🟢 TASK-AUDIT-001: Denetim Checklist'leri (1h, P2)

**Bağlam:** PDF'leri var: Açılış/Aracı/Kapanış check-list

**Yapılacak:**
- `audit_templates_v2`'ye 3 checklist ekle:
  - "Açılış (Vardiya Sorumlusu)" — 30+ madde
  - "Aracı (Bar)" — 20+ madde
  - "Kapanış (Bar + Genel)" — 40+ madde
- Kategori (sıraya göre): "Bar İçi Düzen", "Mağaza Genel Düzen", "Mola", "Çıkış"
- Her madde 1-5 puan veya checkbox

**Acceptance:**
- Yavuz/Ece denetim yaparken bu template'leri kullanır

---

### 🟢 TASK-LARA-001: Lara Personel + Bordro Import (1h, P2)

**Dosya:** `Lara_Sube_Maas_2026.xlsx`

**Yapılacak:**
- Personel listesi `users` tablosuna (eksikleri)
- Bordro `monthly_payroll` tablosuna (DRY_RUN modu)
- Mahmut DRY_RUN raporu üretebilsin

**Acceptance:**
- Mahmut Pilot Day-1'de Lara bordrosunu canlı görebilir (DRY_RUN watermark ile)

---

### 🟢 TASK-COST-001: Maliyet/Fiyat Listesi Import (1h, P2)

**Dosya:** `DOSPRESSO_Fiyat_Listesi_FINAL.xlsx`

**Yapılacak:**
- 14 ürün maliyet kartı (Donut, Cinnaboom, Cheesecake, Brownie, Cookie, Ekmek)
- `inventory` veya `product_cost_calculations` tablosuna
- Hammadde fiyat geçmişi `raw_material_price_history`

**Acceptance:**
- Samet "Bugünkü maliyet" raporu görebilir

---

## 🤝 DECISION REGISTRY (4 May 2026 sonu)

### Aktif Standing Decisions
1. **DECISION-#7** (esnetildi): Pilot freeze fonksiyonel ihtiyaç için ESNEK (4 May Aslan onayı)
2. **DECISION-#30**: Şube ↔ Fabrika veri izolasyonu MUTLAK
3. **DECISION-#39**: PDKS fazla mesai 30dk eşiği DOSPRESSO iç kuralı
4. **DECISION-CGO**: CGO rolü `ALLOWED_EDIT_ROLES`'a eklendi (4 May)
5. **DECISION-IMG**: Görsel boyut standardı 200×200 / 600×400 / 1200×800 WebP (4 May)

### 8 Donmuş Karar (23 Nis Aslan onaylı, 12 May - 25 May arası)
1. Bordro DataSource: SADECE kiosk
2. Bordro DRY_RUN modu (31 May'a kadar)
3. Skor sıfırlama: 11 May 22:30
4. Skor banner: pilot ilk hafta
5. Personel rotasyon: YASAK
6. Mola eşiği: 90→120dk geçici
7. Yeni modül/rol/branch: YASAK pilot süresince (DECISION-#7 ile esnetildi)
8. GPS manuel bypass + supervisor PIN audit

---

## 📊 PILOT 12 MAY 09:00 GO-LIVE PLANI

### 4 Pilot Birimi
- Antalya Işıklar (#5, HQ-owned) — Erdem Müdür, Basri Sup
- Antalya Lara (#8, Franchise) — Andre Müdür, Berkan Sup
- Merkez HQ (#23) — Mahmut, Samet, Utku, Ayşe
- Fabrika (#24) — Eren Müdür, Sema, Buşra

### Owner Aksiyonları (8 May Cuma 18:00 deadline)
- [ ] Pilot user list 9 TBD doldur
- [ ] Şube eğitim → Yavuz/Ece/Utku'ya dağıt
- [ ] Fabrika şablon → Sema+Eren'e gönder (deadline 9 May)
- [ ] HQ eğitim → Mahmut+Samet+Utku ile birebir oturum
- [ ] 8 May Cuma smoke test (4 birim)
- [ ] 10 May Pazar final smoke test

---

## 🔄 İŞ AKIŞI KURALI

```
Yeni iş ortaya çıktı
  ↓
PENDING.md'ye TASK-XXX olarak ekle
  ↓
Sahibinin (Claude/Replit/Aslan) "BEKLEYEN" bölümüne yaz
  ↓
Acceptance kriteri ne, süre tahmini, öncelik (P0/P1/P2)
  ↓
İş yapılır → ilgili sahibi bitirir
  ↓
PENDING.md'den DELETE
  ↓
TODAY.md "BİTENLER" bölümüne ekle (commit'e referans)
  ↓
Eğer karar verildiyse: DECIDED.md'ye yaz
```

**Skill kuralı:** Her oturum sonu **3 dosya zorunlu update**: TODAY.md + PENDING.md + (varsa) DECIDED.md
