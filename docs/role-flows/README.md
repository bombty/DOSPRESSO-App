# DOSPRESSO 31 Rol Detaylı İş Akışı Analizi
**Task #112** — 18 Nisan 2026  
**Hedef**: 31 distinct rol için günlük iş akışı, modül erişimi, onay zinciri, gap detection.

---

## Dosya Yapısı

### Sentez Dokümanları
- [00-cross-role-matrix.md](./00-cross-role-matrix.md) — Çapraz rol matrisi (onay, görev, bildirim, heatmap)
- [98-OPTIMIZATIONS.md](./98-OPTIMIZATIONS.md) — Top 20 optimizasyon önerisi
- [99-FINDINGS.md](./99-FINDINGS.md) — 35 adet bulgu (severity sıralı)

### Rol Dokümanları (31 adet)

#### EXECUTIVE (3 rol)
- [01-admin-hq](./01-admin-hq.md) — admin (5 user)
- [02-ceo](./02-ceo.md) — CEO (3 user)
- [03-cgo](./03-cgo.md) — CGO (1 user)

#### HQ DEPARTMENT (11 rol)
- [04-yatirimci-hq](./04-yatirimci-hq.md) — Yatırımcı HQ (1 user)
- [05-muhasebe-ik](./05-muhasebe-ik.md) — Muhasebe & İK (2 user)
- [06-muhasebe](./06-muhasebe.md) — Muhasebe legacy (0 user)
- [07-satinalma](./07-satinalma.md) — Satın Alma (1 user)
- [08-coach](./08-coach.md) — Coach (2 user)
- [09-trainer](./09-trainer.md) — Trainer (2 user)
- [10-marketing](./10-marketing.md) — Marketing (1 user)
- [11-kalite-kontrol](./11-kalite-kontrol.md) — Kalite Kontrol (1 user)
- [12-gida-muhendisi](./12-gida-muhendisi.md) — Gıda Mühendisi (1 user)
- [13-teknik](./13-teknik.md) — Teknik Servis (1 user)
- [14-destek](./14-destek.md) — Destek/Customer Care (1 user)

#### BRANCH (8 rol)
- [15-mudur](./15-mudur.md) — Şube Müdürü (37 user)
- [16-supervisor](./16-supervisor.md) — Supervisor (38 user)
- [17-supervisor-buddy](./17-supervisor-buddy.md) — Supervisor Buddy (39 user)
- [18-bar-buddy](./18-bar-buddy.md) — Bar Buddy (39 user)
- [19-barista](./19-barista.md) — Barista (122 user)
- [20-stajyer](./20-stajyer.md) — Stajyer (42 user)
- [21-yatirimci-branch](./21-yatirimci-branch.md) — Yatırımcı Şube (4 user)
- [22-sube-kiosk](./22-sube-kiosk.md) — Şube Kiosk (18 user — PIN)

#### FACTORY (9 rol)
- [23-fabrika-mudur](./23-fabrika-mudur.md) — Fabrika Müdürü (1 user)
- [24-uretim-sefi](./24-uretim-sefi.md) — Üretim Şefi (1 user)
- [25-fabrika-operator](./25-fabrika-operator.md) — Fabrika Operatör (6 user)
- [26-fabrika-sorumlu](./26-fabrika-sorumlu.md) — Fabrika Sorumlu (0 user)
- [27-fabrika-personel](./27-fabrika-personel.md) — Fabrika Personel (0 user)
- [28-fabrika-depo](./28-fabrika-depo.md) — Fabrika Depo (1 user)
- [29-sef](./29-sef.md) — Şef (1 user)
- [30-recete-gm](./30-recete-gm.md) — Reçete GM (1 user)
- [31-fabrika-legacy](./31-fabrika-legacy.md) — fabrika legacy rol (0 user — deprecated)

---

## Veri Kaynakları
- `shared/schema/schema-02.ts` → `PERMISSIONS` map (31 rol × 80+ modül)
- `dashboard_role_widgets` tablosu → 24 rol × 19 widget atama
- `dashboard_widgets` tablosu → widget kataloğu (kategori, target rol)
- `module_flags` tablosu → 90+ modül flag (global/branch/role scope)
- `client/src/App.tsx` → 250 route + ProtectedRoute/ModuleGuard
- `users` tablosu → role bazlı aktif kullanıcı sayımı (`deleted_at IS NULL`)
- `server/routes/*.ts` → 114 route file, requireRole/requireAuth middleware

## Metodoloji
1. **Veri Toplama**: PERMISSIONS map programatik dump (tsx), DB tabloları SQL query.
2. **Otomatik Üretim**: Her rol için template-based markdown — modül erişimi, widget set, günlük akış senaryosu, onay zinciri, bildirim tetikleyici, gap detection.
3. **Manuel Sentez**: Cross-role matrix, 35 bulgu, 20 öneri (uzman analiz).
4. **Pilot Önceliği**: 28 Nisan 2026 MUST-DO ayrımı (KRİTİK + YÜKSEK).

## Toplam Üretilen Çıktı
- 31 rol dokümanı (~200 KB toplam)
- 3 sentez dokümanı (matris + bulgular + öneriler)
- 35 adet kategorize bulgu
- 20 prioritized optimizasyon önerisi
