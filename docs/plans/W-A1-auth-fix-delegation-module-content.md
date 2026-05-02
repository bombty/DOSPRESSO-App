# Wave A-1 Plan — Acil AUTH Fix (G1 + G2)

> **Sprint 2 / Wave A / İş #1** — Pilot Day-1 öncesi en kritik güvenlik açığı.
> **Audit referansı:** `docs/audit/system-multi-perspective-evaluation-2026-05-02.md` G1 + G2 bulguları.
> **Tahmini süre:** 1.5 saat (isolated task agent)
> **Mode:** Plan + isolated agent
> **Bağımlılık:** Yok — bağımsız çalışır, paralel başlatılabilir.

---

## 1. Sorun Tanımı

Çok perspektifli audit'te tespit edildi: **10 endpoint anonim erişime açık** (auth middleware'siz):

### G1 — `server/routes/delegation-routes.ts` (5 endpoint)
- `GET /api/delegations` — tüm delegation listesi (kim kime yetki vermiş)
- `POST /api/delegations` — anonim olarak delegation oluşturulabilir
- `GET /api/delegations/:id` — tek delegation detay
- `PATCH /api/delegations/:id` — delegation güncelleme
- `DELETE /api/delegations/:id` — delegation silme

**Etki:** Anonim kullanıcı sahte delegation oluşturup yetki yükseltme yapabilir; mevcut delegation'ları görüp organizasyon hiyerarşisini öğrenebilir.

### G2 — `server/routes/module-content-routes.ts` (5 endpoint)
- `POST /api/module-content` — anonim içerik ekleme
- `GET /api/module-content/:moduleId` — modül içerik okuma
- `PATCH /api/module-content/:id` — içerik düzenleme
- `DELETE /api/module-content/:id` — içerik silme
- `POST /api/module-content/:id/publish` — yayınlama

**Etki:** Anonim kullanıcı modül içeriklerini değiştirebilir, akademi/eğitim içeriği bozabilir, yayında olmayan taslakları görebilir.

---

## 2. Çözüm

### 2.1 Standart AUTH Pattern (Mevcut Kod)

Diğer route dosyalarında kullanılan standart:
```typescript
import { isAuthenticated } from '../localAuth';
import { hasRole } from '../middleware/role-check';

router.get('/api/X', isAuthenticated, async (req, res) => { ... });
router.post('/api/Y', isAuthenticated, hasRole(['admin', 'ceo']), async (req, res) => { ... });
```

### 2.2 Endpoint Bazlı Rol Atamaları (Önerilen)

#### Delegation Routes
| Endpoint | Method | İzin Verilen Roller | Notlar |
|---|---|---|---|
| `/api/delegations` | GET | `admin`, `ceo`, `cgo`, `muhasebe_ik`, `mudur`, `fabrika_mudur` | Sadece kendi org birimini görmeli |
| `/api/delegations` | POST | `admin`, `ceo`, `cgo`, `mudur`, `fabrika_mudur` | Yetki devri kim verebilir? |
| `/api/delegations/:id` | GET | `isAuthenticated` + ilgili kullanıcı veya admin | Owner check |
| `/api/delegations/:id` | PATCH | `admin`, `ceo`, `cgo` veya delegation owner | — |
| `/api/delegations/:id` | DELETE | `admin`, `ceo`, `cgo` veya delegation owner | — |

#### Module Content Routes
| Endpoint | Method | İzin Verilen Roller | Notlar |
|---|---|---|---|
| `/api/module-content` | POST | `admin`, `ceo`, `cgo`, `coach`, `trainer` | İçerik üretici roller |
| `/api/module-content/:moduleId` | GET | `isAuthenticated` (tüm aktif kullanıcı) | Yayınlanmış içerik herkese |
| `/api/module-content/:id` | PATCH | `admin`, `ceo`, `cgo`, `coach`, `trainer` veya owner | — |
| `/api/module-content/:id` | DELETE | `admin`, `ceo`, `cgo` | Sadece üst yönetim |
| `/api/module-content/:id/publish` | POST | `admin`, `ceo`, `cgo`, `coach`, `trainer` | Yayınlama yetkisi |

> **Not:** Bu rol atamaları tahminidir. Task agent kodu inceleyip mevcut benzer endpoint'lerin (örn. `task-routes.ts`, `crm-routes.ts`) auth pattern'ine uygun olarak adapte edebilir. Eğer farklı atama mantıklıysa task agent karar verebilir, ama sonucu DOC'la.

---

## 3. Implementasyon Adımları

### Faz 1 — Kod Inceleme (15 dk)
1. `server/routes/delegation-routes.ts` mevcut 5 endpoint kodu oku
2. `server/routes/module-content-routes.ts` mevcut 5 endpoint kodu oku
3. Bu route'ların `server/routes.ts` içinde nasıl mount edildiğine bak
4. Benzer pattern olan 2-3 route dosyasını referans olarak seç (örn. `task-routes.ts`, `crm-routes.ts`)
5. `hasRole` middleware mevcut mu kontrol et — yoksa `server/middleware/role-check.ts` üzerinden öğren

### Faz 2 — AUTH + Role Check Ekleme (30 dk)
6. Her endpoint'e `isAuthenticated` ekle
7. POST/PATCH/DELETE endpoint'lere `hasRole([...])` ekle (Bölüm 2.2 tablosuna göre)
8. Owner check için (delegation/:id PATCH/DELETE, module-content/:id PATCH) — kullanıcı kendi kaydını mı düzenliyor kontrol et:
   ```typescript
   if (req.user.role !== 'admin' && delegation.userId !== req.user.id) {
     return res.status(403).json({ error: 'forbidden' });
   }
   ```

### Faz 3 — Test (30 dk)
9. **Anonim test (her endpoint için):**
   ```bash
   curl -X GET https://APP_URL/api/delegations
   # Beklenen: 401 Unauthorized
   ```
10. **Yetkisiz rol test:**
    ```bash
    # barista login → POST /api/delegations
    # Beklenen: 403 Forbidden
    ```
11. **Yetkili rol test:**
    ```bash
    # admin login → POST /api/delegations → 200 OK
    ```
12. **Owner check test:**
    ```bash
    # supervisor X başkasının delegation'ını PATCH dener → 403
    # supervisor X kendi delegation'ını PATCH → 200
    ```

### Faz 4 — Doğrulama (15 dk)
13. Mevcut workflow restart, hata logu yok
14. Frontend bu endpoint'leri kullanan sayfalar hâlâ çalışıyor (delegations admin sayfası, akademi modül içerik sayfası)
15. Mevcut E2E testler PASS (varsa)
16. `npx tsc --noEmit` typecheck PASS

---

## 4. Acceptance Criteria

- [ ] `delegation-routes.ts` 5 endpoint hepsi `isAuthenticated` ile korumalı
- [ ] `module-content-routes.ts` 5 endpoint hepsi `isAuthenticated` ile korumalı
- [ ] POST/PATCH/DELETE endpoint'lere uygun `hasRole` rol kontrolü eklendi
- [ ] Owner check gerektiren endpoint'lerde implementasyon var
- [ ] Anonim çağrı 401, yetkisiz rol 403, yetkili rol 200 döner — manuel curl ile doğrulandı
- [ ] Frontend etkilenen sayfalar (delegations admin, akademi modül içerik) hâlâ çalışıyor
- [ ] `npx tsc --noEmit` PASS
- [ ] Audit doc G1+G2 "Çözüldü" notu ile güncellendi
- [ ] DECISIONS.md'ye yeni karar eklendi (rol-endpoint atamaları onaylandı)

---

## 5. Test Senaryoları (Detay)

### Delegation Routes

| # | Senaryo | Method + URL | Beklenen Status |
|---|---|---|---|
| T1 | Anonim list | GET /api/delegations | 401 |
| T2 | Barista list | GET /api/delegations (barista oturum) | 403 |
| T3 | Mudur list | GET /api/delegations (mudur oturum) | 200 |
| T4 | Anonim create | POST /api/delegations (body: {...}) | 401 |
| T5 | Barista create | POST /api/delegations (barista) | 403 |
| T6 | Admin create | POST /api/delegations (admin, valid body) | 200/201 |
| T7 | Başkasının delegation PATCH | PATCH /api/delegations/X (X başka user'ın) | 403 |
| T8 | Kendi delegation DELETE | DELETE /api/delegations/X (owner) | 200 |

### Module Content Routes

| # | Senaryo | Method + URL | Beklenen Status |
|---|---|---|---|
| T9 | Anonim publish | POST /api/module-content/X/publish | 401 |
| T10 | Barista publish | POST /api/module-content/X/publish (barista) | 403 |
| T11 | Coach publish | POST /api/module-content/X/publish (coach) | 200 |
| T12 | Anonim okuma | GET /api/module-content/X | 401 |
| T13 | Barista okuma (yayında) | GET /api/module-content/X (yayınlanmış) | 200 |
| T14 | Anonim DELETE | DELETE /api/module-content/X | 401 |
| T15 | Coach DELETE | DELETE /api/module-content/X (coach) | 403 (sadece admin/ceo/cgo) |
| T16 | Admin DELETE | DELETE /api/module-content/X (admin) | 200 |

**Test araçları:** curl + Postman + RUN_KIOSK_E2E benzeri vitest test (opsiyonel, post-pilot eklenebilir).

---

## 6. Risk + Rollback

### Risk
- **Frontend bozulması:** Delegations admin sayfası yetersiz role kullanıyorsa 403 alabilir. **Mitigation:** Faz 4 adım 14, frontend manuel test.
- **Rol seçimi yanlış:** Bölüm 2.2 tahmini, gerçekte farklı rol gerekebilir. **Mitigation:** Task agent kodda mevcut frontend isteklerini inceleyip karar versin.

### Rollback
- Kod git revert ile geri döner (~5 dk)
- DB değişikliği YOK, veri kaybı YOK
- Pilot kullanıcılar etkilenmez (zaten 401/403 olmazsa kullanıyor olamazlardı)

---

## 7. Bağımlılıklar

### Önce çözülmesi gerekenler
- Yok — bağımsız çalışır

### Sonra etkileneceklere
- B13 (public endpoint sertleştirme) — bu task tamamlanırsa B13 scope daralır
- B19 (legacy rol denetim) — bu task'in rol seçimleri ile uyumlu olmalı

---

## 8. İzole Task Agent İçin Notlar

### Yapma
- Şema değişikliği yapma (DB write yok)
- Yeni rol enum ekleme yapma (B14 ayrı iş)
- delegation/module-content business logic'ini değiştirme (sadece auth/authz ekle)
- Mevcut API contract'ı kırma (response format aynı kalsın)

### Yap
- `isAuthenticated` + `hasRole` ekle
- Owner check (uygun yerlere) ekle
- Test (curl) yap, sonucu commit message'da yaz
- DECISIONS.md ve audit doc güncelle
- replit.md memory'e KISA bir not düş (sadece "Sprint 2 W-A1 MERGED" + 1 cümle)

---

## 9. İLİŞKİLİ DOKÜMANLAR

- `docs/audit/system-multi-perspective-evaluation-2026-05-02.md` — G1+G2 bulguları
- `docs/SPRINT-LIVE.md` — Açık işler
- `docs/SPRINT-2-WAVE-PLAN.md` — Wave A planı
- `.agents/skills/dospresso-architecture/SKILL.md` — auth pattern referansı
- `.agents/skills/dospresso-debug-guide/SKILL.md` — §1 401, §2 403 troubleshoot

---

> **Bu plan task agent için yeterli detayda. Owner Plan moduna geçince bu doc'u referans verip task aç.**
