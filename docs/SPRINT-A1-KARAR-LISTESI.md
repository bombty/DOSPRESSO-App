# Sprint A1 — Kırık Link Düzeltme Karar Listesi

**Tarih:** 21 Nisan 2026 (Pazartesi)
**Süre:** ~10 dakika (Aslan karar verme)
**Sorumlular:** Aslan (karar), Claude (SQL/kod), Replit (uygulama)

---

## 📊 Durum Özeti

- **26 kırık sidebar linki** tespit edildi (Replit 18 Nisan audit)
- **14'ü kolay fix** — sayfa zaten var (Kategori A)
- **2'si SQL UPDATE** — path rename (Kategori B)
- **10'u karar gerekli** — silinsin mi / yönlendirilsin mi (Kategori C)

---

## 🟢 KATEGORİ A — Otomatik Fix (14 Link)

**Durum:** Sayfa dosyası `client/src/pages/admin/*.tsx` içinde mevcut, sadece `App.tsx`'te `<Route>` satırı eksik.

**Aksiyon:** Tek commit'te App.tsx'e 14 route satırı eklenir. Risk sıfır, karar gerekmez.

| # | Kırık Link | Mevcut Sayfa |
|---|------------|--------------|
| 1 | `/admin/aktivite-loglari` | `pages/admin/aktivite-loglari.tsx` |
| 2 | `/admin/bannerlar` | `pages/admin/bannerlar.tsx` |
| 3 | `/admin/duyurular` | `pages/admin/duyurular.tsx` ⚠️ |
| 4 | `/admin/email-ayarlari` | `pages/admin/email-ayarlari.tsx` |
| 5 | `/admin/fabrika-fire-sebepleri` | `pages/admin/fabrika-fire-sebepleri.tsx` |
| 6 | `/admin/fabrika-istasyonlar` | `pages/admin/fabrika-istasyonlar.tsx` |
| 7 | `/admin/fabrika-kalite-kriterleri` | `pages/admin/fabrika-kalite-kriterleri.tsx` |
| 8 | `/admin/fabrika-pin-yonetimi` | `pages/admin/fabrika-pin-yonetimi.tsx` |
| 9 | `/admin/servis-mail-ayarlari` | `pages/admin/servis-mail-ayarlari.tsx` |
| 10 | `/admin/toplu-veri-yonetimi` | `pages/admin/toplu-veri-yonetimi.tsx` |
| 11 | `/admin/yapay-zeka-ayarlari` | `pages/admin/yapay-zeka-ayarlari.tsx` |
| 12 | `/admin/yedekleme` | `pages/admin/yedekleme.tsx` |
| 13 | `/admin/yetkilendirme` | `pages/admin/yetkilendirme.tsx` |
| 14 | `/yonetim/menu` | `pages/yonetim/menu.tsx` |

⚠️ **Not (3. satır):** `/admin/duyurular` ile üst seviyedeki `/duyurular` aynı içeriği gösterebilir. **Karar 2'de** netleştirilmeli.

---

## 🟡 KATEGORİ B — SQL UPDATE (2 Link)

**Durum:** Sayfa farklı path'te mevcut. Sidebar kaydı güncellenecek.

| # | Eski Path (sidebar'da) | Yeni Path (gerçek sayfa) | SQL |
|---|-----------------------|--------------------------|-----|
| 15 | `/yonetim/rol-yetkileri` | `/admin/rol-yetkileri` | `UPDATE menu_items SET path='/admin/rol-yetkileri' WHERE path='/yonetim/rol-yetkileri';` |
| 16 | `/ekipman` | **KARAR 1** ⬇️ | Karar sonrası SQL |

---

## ⚪ KATEGORİ C — Karar Gerekli (10 Link)

**Durum:** Sayfa yok veya belirsiz. Senin kararın ile silinecek / yönlendirilecek.

### 📝 SENİN 7 KARARIN (Pazartesi 10 dakika)

Her karar için: ✅ = "kabul", ❌ = "alternatif öner"

---

### 🔵 KARAR 1: `/ekipman` ana sayfası hangisi?

`/ekipman` tıklandığında kullanıcı nereye gitmeli?

- [ ] **A)** `/ekipman-katalog` — Ekipman listesi/kataloğu (tüm ekipmanları görsel liste)
- [ ] **B)** `/ekipman-mega` — Yeni mega dashboard (Aslan'ın Nisan başında yaptırdığı)
- [ ] **C)** Her ikisi de kalsın, `/ekipman` ana sekmeli bir landing olsun
- [ ] **D)** Hiçbiri — sidebar'dan kaldır

**Claude'un önerisi:** **B** (mega dashboard) — daha yeni, daha fonksiyonel.

---

### 🔵 KARAR 2: `/admin/duyurular` ile `/duyurular` ilişkisi?

Sistemde iki farklı duyuru sayfası var:
- `/admin/duyurular` → admin'in duyuru yönetim panel'i (CRUD)
- `/duyurular` → son kullanıcıların gördüğü feed

- [ ] **A)** Aynı şey — birini sil (`/admin/duyurular` daha mantıklı, diğerini sil)
- [ ] **B)** Farklı amaçlar — ikisi de kalsın (admin görüyor + kullanıcı feed'i)
- [ ] **C)** `/admin/duyurular` → `/duyuru-yonetimi`'ye redirect (zaten böyle bir sayfa var?)

**Claude'un önerisi:** **B** (ikisi de kalsın) — Admin CRUD ve kullanıcı feed'i ayrı işlevler.

---

### 🔵 KARAR 3: `/ai-asistan` linki?

Mr. Dobody AI asistan modülü var. `/ai-asistan` sidebar'da ama sayfa yok.

- [ ] **A)** Sil — zaten Mr. Dobody her sayfada mevcut, ayrı sayfaya gerek yok
- [ ] **B)** `/dobody`'ye redirect et (varsa)
- [ ] **C)** Yeni bir AI asistan ana sayfası yap (chat history, preferences, vb.)

**Claude'un önerisi:** **A** (sil) — Dobody zaten her ekranda, ayrı sayfa gereksiz.

---

### 🔵 KARAR 4: `/musteri-geribildirimi` linki?

- [ ] **A)** Sil — CRM modülü zaten bu işi yapıyor
- [ ] **B)** `/crm`'e redirect (CRM müşteri şikayet zaten orada)
- [ ] **C)** Yeni sayfa — public customer feedback form (QR ile müşteriler doldurur)

**Claude'un önerisi:** **B** (CRM'e redirect) — işlev aynı, tek yerden yönet.

---

### 🔵 KARAR 5: `/training` linki?

- [ ] **A)** Sil — akademi modülü zaten bu işi yapıyor
- [ ] **B)** `/akademi`'ye redirect
- [ ] **C)** Farklı bir şey — on-the-job training log tutan ayrı modül

**Claude'un önerisi:** **B** (akademi redirect) — tek eğitim modülü.

---

### 🔵 KARAR 6: Silme yöntemi hangi olsun?

- [ ] **A)** **Hemen DELETE** — `menu_items` satırını sil (hızlı, risk var: eğer hala biri kullanıyorsa uyarı almaz)
- [ ] **B)** **Archive (is_archived)** — Plan B-1: 30 gün bekle, şikayet gelmezse fiziksel sil (güvenli ama schema değişikliği)
- [ ] **C)** **Sadece is_active=false** — Zaten var olan kolon, 1 satır SQL, hem hızlı hem geri döndürülebilir

**Claude'un önerisi:** **C** (is_active=false) — schema değişikliği yok, hızlı, geri döndürülebilir. 30 gün sonra DELETE.

---

### 🔵 KARAR 7: Access log middleware bu sprint'te mi kurulsun?

Problem: 200 orphan sayfanın hangisi kullanılıyor bilmiyoruz.

- [ ] **A)** **Evet, Sprint A6 ile birlikte** — Notification aggregation için de log lazım, aynı middleware ikisine hizmet eder
- [ ] **B)** **Hayır, Sprint H (Observability)'de** — Sprint A sadece kırık link fix, observability ayrı
- [ ] **C)** **Minimal versiyon şimdi** — Sadece 404 ve page-view log, tam observability Sprint H'de

**Claude'un önerisi:** **C** (minimal versiyon) — 200 orphan kararı için veri toplamak lazım, ama full Pino+Sentry Sprint H'de.

---

## 📋 Kararlardan Sonra Aksiyon Planı

Senin 7 kararın geldikten sonra ben şunları hazırlayacağım:

### A) App.tsx Route Ekleme (Kategori A — 14 link)
```typescript
// client/src/App.tsx içine eklenecek 14 satır
<Route path="/admin/aktivite-loglari" component={AktiviteLoglari} />
<Route path="/admin/bannerlar" component={Bannerlar} />
// ... (14 adet)
```

### B) SQL Migration (Kategori B+C — 2 UPDATE + 10 DELETE/ARCHIVE)
```sql
-- migrations/sprint-a1-fix-broken-links.sql
BEGIN;

-- KATEGORİ B — Path güncelleme
UPDATE menu_items SET path='/admin/rol-yetkileri' WHERE path='/yonetim/rol-yetkileri';
UPDATE menu_items SET path='<KARAR 1>' WHERE path='/ekipman';

-- KATEGORİ C — Silme/arşivleme (KARAR 6'ya göre)
-- Seçenek C: is_active=false
UPDATE menu_items SET is_active=false WHERE path IN (
  '/admin/kalite-denetim-sablonlari',
  '/ai-asistan',       -- KARAR 3
  '/disiplin-yonetimi',
  '/ekipman-arizalari',
  '/ekipman-troubleshooting',
  '/ik',
  '/musteri-geribildirimi',  -- KARAR 4
  '/personel-yonetimi',
  '/training',         -- KARAR 5
  '/vardiya-sablonlari'
);

COMMIT;
```

### C) Acceptance Kontrolü (Sprint A1 kapanış)
```sql
-- Kaç kırık link kaldı?
SELECT COUNT(*) FROM menu_items mi
WHERE is_active=true
AND NOT EXISTS (SELECT 1 FROM app_routes WHERE path=mi.path);
-- Hedef: 0
```

---

## ⏱️ Zaman Çizelgesi

| Saat | İş |
|------|-----|
| **09:00** | Aslan 7 kararı verir (10 dk) |
| **09:15** | Claude SQL + App.tsx değişikliği commit'ler |
| **09:30** | Replit `git pull` + Build → 14 yeni route aktif + SQL migration çalışır |
| **10:00** | Replit audit: "26 kırık link → 0 kırık link" teyidi |
| **10:15** | Sprint A1 ✅ kapanır → Sprint A3 (enum migration) başlar |

---

## 🎯 Hedef

Bu dokümanı tamamladığında **26 kırık sidebar linki → 0** olacak. Pilot launch hazırlığının ilk P0 maddesi kapanır. Sprint A1 acceptance: ✅
