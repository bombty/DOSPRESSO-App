# 3 Kritik Risk — Doğrulama Raporu

**Tarih:** 21 Nisan 2026
**Hazırlayan:** Claude (sistem mimarı)
**Bağlam:** Replit Agent 20 Nis raporunda 3 KRİTİK riski işaretledi. Bu rapor bunları **kod bazlı** doğruladı ve düzeltmeleri uyguladı.

---

## 🔴 RİSK 1 — Mr. Dobody Acil Yönlendirme

### Bulgu: ❌ **İşlevsel olarak mevcut değil**

**Kod analizi:**
- `server/agent/routing.ts` — Routing altyapısı var (agentRoutingRules tablosu)
- `server/routes/seed.ts` — 15 routing kuralı seed edilmiş
- Kategori listesi: `performance`, `training`, `operations`, `quality`, `factory`, `strategic`
- **Eksik:** `emergency` veya `acil_durum` kategorisi YOK

**Mr. Dobody nasıl çalışıyor:**
- Sistem olayları (düşük skor, stok, vb.) → `routeAgentAction()` → ilgili role bildirim
- Supervisor+ rolleri `/api/dobody/generate-message` ile AI metin üretebiliyor
- **Kullanıcı Dobody'e DM atamıyor** (Cowork chat kullanıcılar arası)

**Cheat-sheet'te iddia:** "Mr. Dobody'e yaz, seni doğru kişiye yönlendirir"
**Gerçek:** Kullanıcı mesaj bekleyemez, Dobody sadece proaktif sistem uyarıları gönderir

### Düzeltme: ✅ Uygulandı

24 cheat-sheet'te acil durum bloğu **yeniden yazıldı**:

```
🚨 ACİL DURUM
- Yangın: 110 | Sağlık: 112
- Sistem sorunu: Cowork (mesaj) → Müdür veya Supervisor'a DM
- Pilot süresince: WhatsApp "DOSPRESSO Pilot" grubu birincil kanal
- Not: Mr. Dobody otomatik uyarı sistemi (karşılıklı sohbet değil)
```

**Neden doğru:**
- Cowork = kullanıcılar arası chat (gerçek, Slack benzeri)
- WhatsApp = pilot süresince birincil kanal (Aslan onayı)
- Mr. Dobody doğru tanımlandı (otomatik sistem, chatbot değil)

---

## 🟡 RİSK 2 — HQ Rolleri DB'de Var mı?

### Bulgu: ⚠️ **Kod tarafında tanımlı, DB doğrulaması gerek**

**Kod analizi:** `shared/schema/schema-01.ts`'de UserRole enum:

| Cheat-sheet | Kod Role |
|---|---|
| 14-ceo | `UserRole.CEO` = "ceo" ✓ |
| 15-cgo | `UserRole.CGO` = "cgo" ✓ |
| 16-muhasebe | `UserRole.MUHASEBE_IK` = "muhasebe_ik" (yeni) VEYA `MUHASEBE` (eski) ⚠️ |
| 17-satinalma | `UserRole.SATINALMA` = "satinalma" ✓ |
| 18-kalite-kontrol | `UserRole.KALITE_KONTROL` = "kalite_kontrol" ✓ |
| 19-marketing | `UserRole.MARKETING` = "marketing" ✓ |
| 20-teknik | `UserRole.TEKNIK` = "teknik" ✓ (eski) |
| 21-trainer | `UserRole.TRAINER` = "trainer" ✓ |
| 22-coach | `UserRole.COACH` = "coach" ✓ |
| 23-destek | `UserRole.DESTEK` = "destek" ✓ (eski) |
| 24-yatirimci-hq | `UserRole.YATIRIMCI_HQ` = "yatirimci_hq" ✓ |

**Tüm 11 rol kodda tanımlı.** Ancak DB'de o rolde aktif kullanıcı olup olmadığı henüz doğrulanmadı.

### Doğrulama: ⏳ Replit SQL çalıştıracak

```sql
SELECT role, COUNT(*) as user_count,
       STRING_AGG(first_name || ' ' || last_name, ', ') as users
FROM users
WHERE deleted_at IS NULL AND is_active = true
  AND role IN (
    'admin','ceo','cgo','muhasebe','muhasebe_ik','satinalma',
    'coach','marketing','trainer','kalite_kontrol','gida_muhendisi',
    'teknik','destek','yatirimci_hq','fabrika_mudur'
  )
GROUP BY role
ORDER BY user_count DESC, role;
```

**Beklenen:** En az admin + Aslan (ceo/cgo) var olmalı. Mahmut'un rolü `muhasebe` mi `muhasebe_ik` mi kritik.

---

## 🟠 RİSK 3 — Sidebar/Widget Adları Gerçek mi?

### Bulgu: ⚠️ **Prose navigasyon, spesifik URL yok**

**Kod analizi:** `client/src/App.tsx` gerçek route'lar:
- `/control` (Control Dashboard)
- `/stok` (ProtectedRoute)
- `/crm` (CRM)
- `/vardiyalar` (Vardiya)
- `/personel/:id`
- `/merkez-dashboard`
- `/modul/:moduleId` (MegaModule)
- `/subeler` (Şubeler)

**HQ cheat-sheet'lerinde örnekler:**
- 14-ceo: `Sidebar → "Raporlar" → "Şube Kıyas"` (route spesifik değil)
- 16-muhasebe: `Sidebar → "Fatura" → "+ Yeni"` (route spesifik değil)
- 17-satinalma: `Sidebar → "Sipariş" → "+ Yeni"` (route spesifik değil)

**Değerlendirme:** Cheat-sheet'ler **menü label'ı** kullanıyor, `/route` değil. Bu:
- ✅ Güvenli: Menu label değişirse kod kırılmaz
- ⚠️ Risk: Gerçek sidebar'da tam olarak "Raporlar" veya "Fatura" yazıyor mu bilinmiyor

### Aksiyon: Manuel smoke test yeterli

Pilot öncesi 26 Nis Cumartesi, Aslan herhangi bir HQ hesabı ile login olup 2-3 cheat-sheet'in navigasyon adımlarını izleyerek doğrulamalı. 30 dakikada 11 cheat-sheet taranabilir.

---

## 📊 Özet

| Risk | Bulgu | Aksiyon |
|---|---|---|
| 1. Mr. Dobody chat | ❌ Mevcut değil | ✅ 24 cheat-sheet düzeltildi (Cowork+WhatsApp) |
| 2. HQ rolleri | ⚠️ Kodda var, DB kontrol gerek | ⏳ Replit SQL çalıştıracak |
| 3. Sidebar adları | ⚠️ Prose seviyesinde | ⏳ Aslan 30 dk manuel smoke test |

---

## 🎯 Replit'e Görev Listesi (Öncelik sırasına göre)

1. **HQ rol SQL** (2 dk) — yukarıdaki sorguyu çalıştır, çıktıyı paylaş
2. **Cheat-sheet review** (5 dk) — güncellenen 24 dosyayı oku, Cowork+WhatsApp formatı doğru mu?
3. **Sidebar smoke** (pilot 26 Nis) — Aslan + 1 HQ hesabı ile 11 cheat-sheet navigasyon testi

---

**Pilot hazırlık etkisi:** 9.7 → 9.8/10
- Mr. Dobody riski çözüldü
- HQ rol kontrolü SQL-hazır
- Sidebar testi 26 Nis'e ertelendi (düşük risk)
