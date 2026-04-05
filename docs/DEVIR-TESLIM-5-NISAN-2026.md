# DOSPRESSO Devir Teslim — 5 Nisan 2026 (Final)

## BU OTURUMDA TAMAMLANAN İŞLER (~25 commit)

### Dobody Agent Sistemi — 10 Sprint ✅
| Sprint | İçerik | Durum |
|--------|--------|:-----:|
| 1 | DB (5 tablo) + API (9 endpoint) | ✅ |
| 2 | Workflow Engine (WF-1,2,6,7) | ✅ |
| 3 | Haftalık Brief + Cleanup | ✅ |
| 4 | Güvenlik Test | ✅ |
| 5 | Aksiyon Yürütme + 27 Rol Scope | ✅ |
| 6 | 6 Modül + Sistem Sağlık İzleme | ✅ |
| 7 | Gruplu Aksiyon + Toplu Onay | ✅ |
| 8 | CRM + Fabrika Event Bağlantıları | ✅ |
| 9 | AI Mesaj Üretimi (multi-provider) | ✅ |
| 10 | Özel Dönemler + Veri Kalitesi | ✅ |

Final: 17 event, 12 modül, 27 rol scope, 5 tablo, 16+ endpoint

### Proje & Denetim
- Proje v2 Sprint 1: 6 tab portfolio dashboard ✅
- Denetim v2 Sprint A-D: şablon, form, aksiyon, SLA, trend ✅

### Sistem Atölyesi v4
- 20 akış (modül filtre + yön göstergesi) ✅
- Roller tab: her rolün akışları ✅
- Canlı endpoint testi (diagnostic) ✅

### Bug Fix'ler
- Barista "Benim Günüm" hooks crash ✅
- Barista "İzin Yönetimi" crash ✅
- Ekipman + Stok manifest eksik roller ✅
- TÜM modüllerde eksik roller tamamlandı ✅
- Çift yetki sistemi (manifest + PERMISSIONS) uyarısı ✅

### Dokümantasyon (19+ dosya)
AGENTS.md, STATUS.md, CHANGELOG.md, ROLES-AND-PERMISSIONS (27 rol),
DOBODY-AGENT-PLAN (16 bölüm), BUSINESS-RULES, INTEGRATION-MAP,
FACTORY, PDKS-PAYROLL, EQUIPMENT, STOCK, EDUCATION, CRM,
CHECKLIST, NOTIFICATION, KPI-SCORING, DATA-PRIVACY-KVKK,
DENETIM-PLAN, PROJE-PLAN, SISTEM-ATOLYESI-PLAN

## ÖNEMLİ TEKNİK NOTLAR

1. **Çift yetki sistemi:** module-manifest.ts (yeni) + schema-02.ts PERMISSIONS (eski). İkisini birlikte güncelle!

2. **AI endpoint çakışması:** Eski `dobody-generate-message.ts` (template) vs yeni `dobody-message-generator.ts` (AI). Yeni endpoint: `/api/dobody/generate-ai-message`

3. **Frontend crash raporlama:** ErrorBoundary → POST /api/system/crash-report → Dobody → Admin proposal

## BEKLEYEN İŞLER (SONRAKİ OTURUM)

### Kısa Vadeli
- [ ] Duyuru düzenleme sorunları (detay bekleniyor)
- [ ] Kiosk token bug doğrulama
- [ ] Eski `dobody-generate-message.ts` ile yeni AI generator birleştirme

### Orta Vadeli
- [ ] Sistem Atölyesi: frontend crash tespiti + sayfa sağlık matrisi
- [ ] Centrum'a proje portfolio widget
- [ ] Dashboard'a duyuru + görevlerim widget
- [ ] Dobody otonom eşik: güven %90+ → onaysız aksiyon

### Uzun Vadeli
- [ ] Dinamik yetki kaydırma UI (admin paneli)
- [ ] Dobody GPT-4o cross-branch analiz
- [ ] Franchise missing features (upselling, NPS, Excel import)

---

---

## DUYURU SİSTEMİ v2 (AKTİF GELİŞTİRME)

### Tamamlanan
- [x] ImageStudio.tsx bileşeni (commit `f0d988c`)
  - 5 sekmeli görsel düzenleme: Kırp, Arkaplan Silme, Ayar, Filtre, Şekil
  - @imgly/background-removal entegrasyonu (tarayıcı tabanlı AI)
  - banner-editor.tsx ve admin/duyurular.tsx entegrasyonu

### Sprint 1: Tasarım Stüdyosu + Onay Akışı (devam ediyor)
- [ ] Duyuru düzenleme bug fix
- [ ] Kategori şablonları (8 tip)
- [ ] TipTap zengin metin editörü
- [ ] Draft → Review → Approve → Publish yaşam döngüsü
- [ ] Görev bağlama (mevcut tasks tablosuna announcementId FK)

### Sprint 2: Landing Page + Onay
- [ ] /duyuru/:id tam sayfa route
- [ ] Hero banner + içerik blokları
- [ ] Acknowledgment butonu (kritik duyurularda zorunlu)
- [ ] Mini quiz (reçete/kanuni değişiklikler)

### Sprint 3: Header + Kiosk
- [ ] Üst bar header banner sistemi
- [ ] Banner fatigue kontrolü (max 2 aynı anda)
- [ ] Kiosk'ta vardiya başı zorunlu okuma

### Sprint 4: Analitik + Dobody
- [ ] Okuma/onay/tıklama oranları
- [ ] Dobody 18. event: announcement_followup
- [ ] Hatırlatma + eskalasyon

---

---

## REPLİT AGENT İLE ÇALIŞMA DÜZENİ

### Genel Akış:
```
1. Claude (bu sohbet): Büyük feature, mimari değişiklik, yeni modül yazımı
   → Kod yazar → npm run build (Vite+esbuild) → git commit → git push

2. Aslan: Push sonrası Claude'un hazırladığı talimatı Replit Agent'a yapıştırır

3. Replit Agent: 
   → git pull --rebase origin main
   → Server restart
   → Test eder (API curl, DB kontrol, screenshot)
   → Bug bulursa küçük hotfix yapar → push
   → Büyük sorun varsa raporlar

4. Aslan: Replit sonuçlarını (screenshot/rapor) Claude'a gönderir
   → Döngü devam eder
```

### Claude Push Sonrası Replit Talimat Formatı:
```
[Kısa açıklama] push edildi. Yapman gerekenler:

1. ÖNCE AGENTS.md oku.
2. git pull --rebase origin main
3. Server restart

4. TEST — [test adımları]:
   A) [adım 1]
   B) [adım 2]
   ...

5. HATA BULURSAN: küçük fix → push, büyük → raporla
```

### Replit Agent'ın Yapabileceği İşler:
- `git pull --rebase` (ASLA `git reset --hard` değil!)
- Server restart
- API endpoint testi (curl)
- DB sorgusu (psql)
- SQL sütun/tablo adı hotfix'leri (shifts.date → shift_date gibi)
- Missing import düzeltmeleri
- Screenshot alma
- Build test (npm run build)

### Replit Agent'ın YAPMAMASI Gereken İşler:
- Büyük feature/sayfa yazımı
- Mimari değişiklik
- Yeni tablo/schema oluşturma
- `git reset --hard` (schema fix'leri silinir!)

### GitHub Push Pattern:
```
git push https://[TOKEN]@github.com/bombty/DOSPRESSO-App.git HEAD:main
```
⚠️ Token ASLA dosya içeriğine yazılmaz — repository kuralı push'u reddeder.

### Build Kuralı:
Her commit ÖNCE iki build başarılı olmalı:
```
npx vite build          # Frontend (React)
npx esbuild server/...  # Backend (Node.js)
```

### Sık Karşılaşılan Replit Hotfix'ler:
| Sorun | Fix |
|-------|-----|
| `column X does not exist` | SQL'de doğru sütun adını bul (schema kontrol) |
| `relation X does not exist` | Tablo adını kontrol et |
| `ensurePermission reject` | manifest + schema-02 PERMISSIONS'ı birlikte güncelle |
| `HAVING without GROUP BY` | HAVING → WHERE subquery |
| `import not found` | Eksik import ekle |
| `category/metadata sütunu yok` | notifications tablosuna uygun alan kullan |
