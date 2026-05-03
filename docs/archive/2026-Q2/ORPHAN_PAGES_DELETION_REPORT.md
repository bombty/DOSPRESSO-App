# Öksüz Sayfa Silme Raporu — Task #284

**Tarih:** 2026-05-02
**Kaynak denetim:** `APP_AUDIT_REPORT_2026-05.md` Bölüm 2.1 ve 4
**Amaç:** ChatGPT'ye danışılacak detaylı analiz. Hiçbir dosya henüz **silinmedi**.

---

## Özet

- Görev başlığında "91 öksüz sayfa" yazıyor, fakat denetim raporu **2.1**'de gerçek öksüzleri **10 dosya** olarak listeliyor.
- Kalan **81 sayfa** (Bölüm 2.2) aslında mega-modüllerin (`crm-mega`, `admin-mega`, `akademi-mega`, `fabrika/index`, `satinalma-mega`, `waste-mega` vb.) içinden dinamik/statik olarak import ediliyor → bunlar **öksüz değil, tutulmalı**.
- Bölüm 4'teki duplikat aileler büyük ölçüde `[Tut]` etiketli; sadece 2.1 ile çakışan iki dosya (`hq-ozet`, `iletisim-merkezi`) silme adayı.
- Aşağıdaki 10 dosyanın tamamı için App.tsx içinde zaten **yönlendirme (redirect) route'u mevcut**, yani kullanıcı eski URL'leri yazsa bile hiçbir 404 oluşmuyor; bağlı bir live mega-modüle taşınıyor.

| # | Dosya | Boyut | Satır | Son değişiklik | Redirect var mı? | Yönlendirilen yer | Risk |
|---|---|---|---|---|---|---|---|
| 1 | `client/src/pages/ai-assistant.tsx` | 6.3 KB | 171 | 2026-03-30 | ❌ (route yok) | — | DÜŞÜK |
| 2 | `client/src/pages/crm/campaigns.tsx` | 13.4 KB | 348 | 2026-03-09 | ✅ `/crm` mega | `crm-mega` (Kampanyalar sekmesi) | DÜŞÜK |
| 3 | `client/src/pages/crm/complaints.tsx` | 30.4 KB | 760 | 2026-03-20 | ✅ `/crm` mega + `/sikayetler` | `crm-mega/ticket-talepler` | ORTA |
| 4 | `client/src/pages/crm/dashboard.tsx` | 5.5 KB | 166 | 2026-03-25 | ✅ `/crm` mega | `crm-mega` Dashboard sekmesi | DÜŞÜK |
| 5 | `client/src/pages/crm/employee-dashboard.tsx` | 9.9 KB | 285 | 2026-03-10 | ✅ (employee `/sube/employee-dashboard`) | `pages/sube/employee-dashboard` | DÜŞÜK |
| 6 | `client/src/pages/crm/settings.tsx` | 7.3 KB | 179 | 2026-03-09 | ✅ `/crm` mega | `crm-mega` Ayarlar sekmesi | DÜŞÜK |
| 7 | `client/src/pages/dashboard.tsx` | 10.7 KB | 264 | 2026-03-31 | ❌ (route yok ama `GUIDANCE_PATHS`'da geçiyor) | — (404 dönüyor) | ORTA |
| 8 | `client/src/pages/hq-ozet.tsx` | 18.2 KB | 450 | 2026-03-30 | ✅ `/hq-ozet → /ceo-command-center` | `ceo-command-center` | DÜŞÜK |
| 9 | `client/src/pages/iletisim-merkezi/index.tsx` | 13.3 KB | 353 | 2026-03-30 | ✅ `/iletisim-merkezi → /crm` | `crm-mega` | DÜŞÜK |
| 9b | `client/src/pages/iletisim-merkezi/TicketsTab.tsx` | 9.7 KB | 240 | 2026-03-30 | — (sadece üstteki `index.tsx` tarafından import ediliyor) | — | DÜŞÜK (bağımlı silme) |
| 10 | `client/src/pages/urun-sikayet.tsx` | 19.6 KB | 551 | 2026-03-09 | ✅ `/urun-sikayet → /crm/ticket-talepler` | `crm-mega/ticket-talepler` | DÜŞÜK |

**Toplam silinecek satır:** ~3 787 satır TSX (~144 KB).

---

## Detaylı analiz

### 1. `pages/ai-assistant.tsx` (171 satır, 6.3 KB)
- **Sayfa başlığı:** "AI Asistan"
- **Ne yapıyor:** Tek bir input + cevap kartı. `POST /api/knowledge-base/ask` çağırıyor, dönen cevabı + kaynakları gösteriyor.
- **App.tsx route'u:** **Yok.** `path="/ai-assistant"` hiçbir yerde tanımlı değil. Kullanıcı bu sayfayı tarayıcıdan açamaz.
- **Live alternatif:** Aynı `/api/knowledge-base/ask` endpoint'i admin-mega içindeki "AI Bilgi Yönetimi" sayfasından da kullanılıyor + global olarak `<GlobalAIAssistant>` (App.tsx:18) bileşeni tüm sayfalarda yüzen asistan olarak çalışıyor.
- **Risk:** Yok. Sayfa erişilemez, fonksiyon başka yerde mevcut.
- **Karar önerisi:** **SİL.**

### 2. `pages/crm/campaigns.tsx` (348 satır, 13.4 KB)
- **Sayfa başlığı:** "Kampanyalar"
- **Ne yapıyor:** Bütün kampanyaları listeleyen, oluştur/düzenle/sil yapan tek-dosyalık eski CRM ekranı. `GET/POST/PATCH/DELETE /api/campaigns`.
- **App.tsx route'u:** Yok. CRM ailesi tamamen `/crm` → `crm-mega` üzerinden gidiyor.
- **Live alternatif:** `crm-mega.tsx` içindeki kampanya sekmesi.
- **Risk:** Düşük. Bağımsız bir sayfa, kimse import etmiyor.
- **Karar önerisi:** **SİL.**

### 3. `pages/crm/complaints.tsx` (760 satır, 30.4 KB)
- **Sayfa başlığı:** "Ticket / Talepler"
- **Ne yapıyor:** Eski tek-dosyalık ticket / şikayet yönetimi. Endpoint: `GET/POST /api/crm/complaints`, `GET /api/crm/branches`, `GET /api/users`.
- **App.tsx route'u:** Yok. Eski `/sikayetler`, `/urun-sikayet`, `/musteri-memnuniyeti` URL'leri zaten `/crm/ticket-talepler`'e (mega) yönlendiriliyor (App.tsx:603-606, 664).
- **Live alternatif:** `crm-mega.tsx` "ticket-talepler" sekmesi (`iletisim-merkezi/ticket-list-panel`, `ticket-chat-panel`, `sla-rules-panel` bileşenlerini kullanır → bu üç dosya canlı kalmalı; **silinmez**).
- **Risk:** ORTA — dosya büyük (760 satır) ama hiçbir referansı yok. Yine de gözle bir kez doğrulayın.
- **Karar önerisi:** **SİL.**

### 4. `pages/crm/dashboard.tsx` (166 satır, 5.5 KB)
- **Ne yapıyor:** `GET /api/crm/dashboard-stats` ile basit dashboard kartları + son ticket'lar listesi.
- **App.tsx route'u:** Yok.
- **Live alternatif:** `crm-mega` içindeki `iletisim-merkezi/DashboardTab` (mega tarafından dinamik import edilen, **canlı** bir dosya, silinmez).
- **Risk:** Düşük.
- **Karar önerisi:** **SİL.**

### 5. `pages/crm/employee-dashboard.tsx` (285 satır, 9.9 KB)
- **Ne yapıyor:** `GET /api/crm/my-stats` ile çalışana ait özet. **Server'da `/api/crm/my-stats` endpoint'i de yok** (denetim raporu Bölüm 7.1 "kırık API çağrısı"). Yani çalışmıyor zaten.
- **App.tsx route'u:** Yok.
- **Live alternatif:** Çalışan dashboardu için `pages/sube/employee-dashboard.tsx` (App.tsx:175, route `/sube/employee-dashboard`) kullanılıyor.
- **Risk:** Düşük (zaten ölü endpoint).
- **Karar önerisi:** **SİL.**

### 6. `pages/crm/settings.tsx` (179 satır, 7.3 KB)
- **Sayfa başlığı:** "Ayarlar" (SLA Eşikleri, Bildirim Kuralları, Sorumluluk Matrisi, Form Ayarları)
- **Ne yapıyor:** `GET /api/crm/settings` üzerinden CRM ayarlarını gösteriyor.
- **App.tsx route'u:** Yok. CRM ayarları artık mega içinde + `pages/iletisim-merkezi/sla-rules-panel.tsx` (canlı, silinmez) tarafından yönetiliyor.
- **Risk:** Düşük.
- **Karar önerisi:** **SİL.**

### 7. `pages/dashboard.tsx` (264 satır, 10.7 KB)
- **Ne yapıyor:** `CardGridHub`, `DashboardWidgets`, `ModuleCard`, `UnifiedKPI`, `DashboardAlertPills` bileşenlerini birleştirip role göre dashboard gösteren eski sürüm. `GET /api/branch-summary`.
- **App.tsx route'u:** **Yok.** İlginç şekilde `App.tsx:40` içinde `GUIDANCE_PATHS = ["/", "/dashboard", "/ana-sayfa", "/mission-control"]` listesi var → onboarding rehberinin gösterileceği yollar; ama `<Route path="/dashboard">` tanımlı değil. Yani `/dashboard` yazan kullanıcı 404 NotFound alıyor.
- **Live alternatif:** Ana yönlendirme `/` üzerinden `mission-control` veya role-based dashboard'lara (control-dashboard, merkez-dashboard, sube/dashboard, fabrika/dashboard, ceo-command-center) gidiyor.
- **Bu silinince yapılması gereken:** `GUIDANCE_PATHS`'tan `"/dashboard"` çıkarılmalı **veya** `App.tsx`'e `/dashboard → /` redirect eklenmeli (öneri: redirect).
- **Risk:** ORTA — dosya silinince fark edilmiyor (zaten unreachable) ama redirect/guidance temizliği yapılmalı.
- **Karar önerisi:** **SİL + ufak redirect cleanup.**

### 8. `pages/hq-ozet.tsx` (450 satır, 18.2 KB)
- **Sayfa başlığı:** "HQ Genel Bakış"
- **Ne yapıyor:** `GET /api/hq-summary`, `/api/agent/actions/summary`, `/api/delegations/active`, `POST /api/quick-action` çağırıyor; HQ özet kartları + delegasyon + hızlı eylem widget'ları.
- **App.tsx route'u:** `App.tsx:673` — `/hq-ozet` zaten `/ceo-command-center`'e yönlendiriyor (içerideki bileşeni hiç çağırmıyor).
- **Live alternatif:** `pages/ceo-command-center.tsx` (canlı).
- **Risk:** Düşük.
- **Karar önerisi:** **SİL.**

### 9. `pages/iletisim-merkezi/index.tsx` (353 satır, 13.3 KB) + `TicketsTab.tsx` (240 satır)
- **Ne yapıyor (index.tsx):** Eski "İletişim Merkezi" sayfası. Tabs: Dashboard / Tickets / HqTasks / Broadcast. `GET /api/iletisim/dashboard` (sunucuda **yok**, kırık endpoint), `/api/iletisim/tickets`, `/api/branches`, `/api/delegations/active`.
- **App.tsx route'u:** `App.tsx:228, 681` — `/iletisim-merkezi` direkt `/crm`'e yönlendiriyor (`IletisimMerkeziRedirect`).
- **TicketsTab.tsx**: Sadece `iletisim-merkezi/index.tsx` tarafından import ediliyor. `index.tsx` silinince bu da öksüz olur → birlikte silmek gerekir.
- **DİKKAT — silinmemesi gereken kardeşler (canlı):** Aynı klasördeki şu dosyalar **`crm-mega.tsx` tarafından import ediliyor, silinmez**:
  - `iletisim-merkezi/crm-nav.tsx`
  - `iletisim-merkezi/ticket-list-panel.tsx`
  - `iletisim-merkezi/ticket-chat-panel.tsx`
  - `iletisim-merkezi/NewTicketDialog.tsx`
  - `iletisim-merkezi/sla-rules-panel.tsx`
  - `iletisim-merkezi/categoryConfig.ts`
  - `iletisim-merkezi/DashboardTab.tsx`
  - `iletisim-merkezi/HqTasksTab.tsx`
  - `iletisim-merkezi/BroadcastTab.tsx`
- **Risk:** Düşük (yönlendirme aktif).
- **Karar önerisi:** **`index.tsx` ve `TicketsTab.tsx` SİL — diğer 9 kardeş kalır.**

### 10. `pages/urun-sikayet.tsx` (551 satır, 19.6 KB)
- **Ne yapıyor:** Müşteri ürün şikayeti formu + listesi. `GET/POST /api/product-complaints`. `useAuth` üzerinden role-based view.
- **App.tsx route'u:** `App.tsx:664` — `/urun-sikayet` zaten `/crm/ticket-talepler`'e yönlendiriliyor (`window.location.replace`).
- **Live alternatif:** `crm-mega` ticket-talepler sekmesi (kanal: ürün şikayet).
- **Risk:** Düşük.
- **Karar önerisi:** **SİL.**

---

## Bölüm 4 ek karar adayları (denetim raporundan, 2.1 ile çakışmayanlar)

Bunlar 2.1 listesinde değiller ama Bölüm 4 onları **`[Düzelt]`** olarak işaretledi (silmek değil, route bağlamak). Bu görevin kapsamı dışı, ayrı task açılmalı:

| Sayfa | Boyut | Karar (raporda) | Aksiyon |
|---|---|---|---|
| `pages/hq-dashboard.tsx` | 79.5 KB | `[Düzelt]` | Route ekle veya silme kararı için ayrı task |
| `pages/sube-ozet.tsx` | 15.2 KB | `[Düzelt]` | Route ekle veya silme kararı için ayrı task |
| `pages/fabrika.tsx` | 42.9 KB | `[Düzelt]` | `fabrika/index.tsx` ile karşılaştırılıp birleştirme/silme |

---

## Önerilen aksiyon planı

1. Aşağıdaki **11 dosya** silinir (10 öksüz + 1 bağımlı `TicketsTab`):
   ```
   client/src/pages/ai-assistant.tsx
   client/src/pages/crm/campaigns.tsx
   client/src/pages/crm/complaints.tsx
   client/src/pages/crm/dashboard.tsx
   client/src/pages/crm/employee-dashboard.tsx
   client/src/pages/crm/settings.tsx
   client/src/pages/dashboard.tsx
   client/src/pages/hq-ozet.tsx
   client/src/pages/iletisim-merkezi/index.tsx
   client/src/pages/iletisim-merkezi/TicketsTab.tsx
   client/src/pages/urun-sikayet.tsx
   ```
2. `client/src/pages/crm/` klasörü tamamen boşalır (5 dosyanın hepsi siliniyor) → klasör de silinir.
3. `client/src/App.tsx:40` içindeki `GUIDANCE_PATHS` sabitinden `"/dashboard"` girdisi çıkarılır (ya da `/dashboard → /` redirect eklenir; öneri: girdiyi çıkar, çünkü kimse o URL'i kullanmıyor).
4. `iletisim-merkezi/` klasöründeki **diğer 9 dosya korunur** (crm-mega kullanıyor).
5. Doğrulama: `npm run check` (TypeScript) + tarayıcıda `/`, `/crm`, `/ceo-command-center`, `/iletisim-merkezi`, `/urun-sikayet`, `/sikayetler`, `/hq-ozet` URL'leri ziyaret edilip yönlendirmelerin çalıştığı görülür.

## Risk değerlendirmesi (genel)

- **Tüm silmeler güvenli**, çünkü:
  - Hiçbir dosya başka bir TS/TSX dosyası tarafından import edilmiyor (alias + relative tarama yapıldı, `crm-mega.tsx`'de "iletisim-merkezi/" import'ları kontrol edildi → sadece korunacak 9 kardeş kullanılıyor).
  - Eski URL'ler için zaten App.tsx'te redirect mevcut (sadece `/dashboard` ve `/ai-assistant` istisna; ikisi de zaten 404'e gidiyor — durum değişmiyor).
  - Server endpoint'leri (`/api/campaigns`, `/api/crm/complaints`, `/api/crm/settings`, `/api/hq-summary`, `/api/iletisim/tickets`, `/api/product-complaints`) silinmiyor — başka istemciler (mega-modül sayfaları) kullanmaya devam eder.

- **Geri alınabilirlik:** Replit checkpoint sistemi sayesinde yanlış silme durumunda rollback yapılabilir.
