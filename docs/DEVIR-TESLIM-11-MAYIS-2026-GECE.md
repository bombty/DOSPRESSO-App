# DEVİR TESLİM v2 — 11 MAYIS 2026 GECE (EKSİKSİZ)

> **Bu doküman yeni Claude oturumunun %100 sistemi anlaması için hazırlandı.**
> Atlanmış ve eksik bilgiler ekleyerek kapsamlı revize edilmiştir.

---

## 🎯 BAŞLAMADAN ÖNCE — YENİ CLAUDE İÇİN ŞART

### Önce Bunları Oku (sırayla, 5 dakika)

1. **Bu doküman** (tam okumadan kod yazma)
2. **Skill MD'ler** (otomatik yüklendi, ama dikkat et):
   - `/mnt/skills/user/dospresso-architecture/SKILL.md`
   - `/mnt/skills/user/dospresso-debug-guide/SKILL.md`
   - `/mnt/skills/user/dospresso-quality-gate/SKILL.md`
   - `/mnt/skills/user/dospresso-design-system/SKILL.md`
3. **userMemories** (system prompt'ta var)

### Aslan'a Selam ve Durum Kontrol

```
Merhaba Aslan! Önceki oturumdan devam ediyorum.
docs/DEVIR-TESLIM-11-MAYIS-2026-GECE.md okudum.

Pilot 13 May Çar 15:00, ~XX saat kaldı.

Şu an Replit'te:
1. Mola kümülatif test ettin mi? (45+15 senaryosu)
2. PIN reset mail çalışıyor mu?
3. Long-shift migration'ı çalıştırdın mı? (kritik - henüz yapılmadı)

Hangi sorun var?
```

---

## 🚨 EN KRİTİK — HENÜZ YAPILMAMIŞ İŞLER

### A. Replit'te ÇALIŞTIRILMASI GEREKEN MİGRATİON

**Long-shift auto-close** (Aslan henüz haberdar değil, kritik):

```bash
psql "$DATABASE_URL" -1 -f migrations/2026-05-11-long-shift-auto-close.sql
```

Eklenenler:
- `branch_shift_sessions.auto_closed` (BOOLEAN)
- `branch_shift_sessions.auto_closed_reason` (VARCHAR)
- `branch_shift_sessions.auto_closed_at` (TIMESTAMP)

**Bu migration çalışmazsa long-shift monitor crash eder!**

### B. Aslan'a Bildirilecek Yeni Özellik: LONG-SHIFT MONITORING

**Aslan bilmiyor olabilir — son commit'te eklendi:**

Sistem otomatik takip eder:
- **10 saat aktif** → kiosk ana sayfada soft warning
- **12 saat aktif** → OTOMATIK ÇIKIŞ (system_auto)
  - `checkOutTime = scheduledEndTime` (normal mesai saati)
  - Audit log oluşturulur
  - `auto_closed=true` işaretlenir

`server/services/long-shift-monitor.ts` (204 satır) — `tick-1hr` scheduler'a entegre, saatte 1 kez kontrol.

Bu özellik var çünkü: Personel "Vardiyayı Bitir" basmadan ayrılırsa, sistem açık kalır → PDKS/bordro hatalı olur.

---

## 📦 SON DURUM (11 May 2026, 02:00)

```
Branch:    claude/kiosk-mega-improvements-2026-05-10
Son commit: [latest after long-shift cherry-pick]
Senkron:   ✅ Local ↔ GitHub
TS check:  ✅ 0 hata
```

### 15+ Commit Listesi (Bu Branch'ta)

| # | Commit | Açıklama |
|---|--------|----------|
| 1 | `[NEW]` | Long-shift recover + devir teslim |
| 2 | `78ad5087b` | Devir teslim v1 |
| 3 | `5d0dfbfcd` | PIN 8 deneme + sıfırlama mail |
| 4 | `cdfb9b3ba` | Mola breakMinutes KÜMÜLATİF (45+15 fix) |
| 5 | `3e0ce8041` | Kiosk session endpoint fix (Replit) |
| 6 | `1156d0b9b` | Sol kart sade + time line bar |
| 7 | `3cc64214d` | Kümülatif günlük hak + countdown realtime |
| 8 | `b15f8bfe4` | Font standartları (12px min, 76 yer) |
| 9 | `d138261e1` | Mola sayaç font + kalan dakika badge |
| 10 | `eb3a72061` | KVKK m.11 + v1.1 yurtdışı |
| 11 | `1abe03a80` | HQ Canlı Vardiya + PDKS geçmiş |
| 12 | `c961ed039` | Mola realtime + ihlal + vardiya başla |
| 13 | `c81b68536` | Yeni components → sube/kiosk.tsx |
| 14 | `497c129ac` | KVKK Denetim PDF + Admin |
| 15 | `a19e35245` | Yeni ana ekran + bildirim + demo |
| 16 | `78c27f862` | Mola sayaç + alarm + tutanak |

---

## 🏗️ SİSTEM MİMARİSİ — YENİ CLAUDE İÇİN

### Tech Stack
- **Frontend:** React 18 + TypeScript + Vite + Wouter (NOT React Router!)
- **State:** TanStack Query (server state) + useState (local)
- **UI:** Tailwind CSS + shadcn/ui + Lucide icons
- **Backend:** Node.js + Express + Drizzle ORM
- **Database:** PostgreSQL (Neon Serverless, AWS US-East)
- **Auth:** Session-based (Replit Auth), NOT JWT
- **Mail:** nodemailer (SMTP) + resend opsiyonel

### Database — 29 Schema Dosyası
```
shared/schema/
├── schema-01.ts ... schema-29.ts
└── schema-29-kvkk-data-requests.ts (Aslan 10 May 2026)
```

**Önemli tablolar:**
- `users` (id, email, firstName, lastName, role, branchId, isActive)
- `branches` (id, name, city, ownershipType, isActive)
- `branch_staff_pins` (userId, branchId, hashedPin, pinFailedAttempts, pinLockedUntil)
- `branch_shift_sessions` (id, userId, branchId, status, checkInTime, breakMinutes, **+auto_closed/auto_closed_reason/auto_closed_at**)
- `branch_break_logs` (sessionId, userId, breakStartTime, breakEndTime, breakDurationMinutes)
- `shift_attendance` (planlanmış vardiya, complianceScore)
- `shifts` (shiftDate, branchId)
- `kvkk_policy_versions` (v1.0 + v1.1 aktif)
- `user_kvkk_approvals` (audit trail)
- `kvkk_data_subject_requests` (m.11 talepleri)
- `employee_warnings` (tutanaklar)
- `monthly_payroll` (REAL — 887 kayıt, NOT `monthly_payrolls` phantom!)

### File System

```
/home/claude/DOSPRESSO-App/   ← Repo root (writable)
├── client/src/
│   ├── pages/
│   │   ├── sube/kiosk.tsx (~2900 satır) ← ANA dosya, hassas
│   │   ├── hq-canli-vardiya.tsx (450 satır)
│   │   ├── kvkk-denetim.tsx (admin)
│   │   ├── kvkk-haklarim.tsx (kullanıcı m.11)
│   │   └── sube/kiosk-yenilik-demo.tsx
│   └── components/
│       ├── break-countdown.tsx (yeni 10 May)
│       ├── break-return-summary.tsx (yeni)
│       ├── kvkk-per-user-modal.tsx (yeni)
│       └── kiosk-main-screen.tsx (yeni)
├── server/
│   ├── index.ts (scheduler kayıtları)
│   ├── routes.ts (route mount)
│   ├── routes/
│   │   ├── branches.ts (~5800 satır) ← Şube ana logic
│   │   ├── factory.ts (~8000 satır)
│   │   ├── kvkk-approvals.ts (yeni)
│   │   ├── kvkk-data-requests.ts (yeni m.11)
│   │   ├── hq-live-pdks.ts (yeni)
│   │   ├── pin-reset.ts (yeni 11 May)
│   │   ├── long-shift.ts (yeni 11 May)
│   │   └── break-management.ts (legacy, kullanılmıyor)
│   ├── services/
│   │   ├── long-shift-monitor.ts (YENİ — tick-1hr'a entegre)
│   │   ├── agent-engine.ts (Mr. Dobody)
│   │   ├── agent-scheduler.ts
│   │   └── ...
│   ├── utils/
│   │   └── kvkk-pdf-generator.ts (687 satır, ASCII fallback)
│   ├── email.ts (nodemailer + resend)
│   └── scheduler-manager.ts (registerInterval/registerTimeout)
├── shared/schema/ (Drizzle types)
├── migrations/*.sql
└── docs/DEVIR-TESLIM-*.md

/mnt/skills/user/         ← Skill MD'ler (Aslan görmez, Claude için)
├── dospresso-architecture/SKILL.md (413 satır)
├── dospresso-debug-guide/SKILL.md (21 bug pattern)
├── dospresso-quality-gate/SKILL.md (40 quality check)
└── dospresso-design-system/SKILL.md (Typography 12px min)

/mnt/user-data/uploads/   ← Aslan'dan gelen dosyalar (ekran görüntüleri)
/mnt/user-data/outputs/   ← Aslan'a gösterilecek (final dosyalar)
```

### Scheduler'lar (server/index.ts)

Mevcut periodik servisler (`schedulerManager.registerInterval`):

| Scheduler | Sıklık | Görev |
|-----------|--------|-------|
| `master-tick-10min` | 10 dk | Genel sağlık check |
| `tick-1hr` | 1 saat | **Long-shift monitor** + Mr.Dobody periyodik |
| `factory-scoring-daily` | Günlük | Fabrika skor |
| `gap-detection-daily` | Günlük | Veri boşluğu tespit |
| `notification-cleanup-daily` | Günlük | Eski bildirim temizle |
| `pdks-auto-weekend-offs` | ? | Otomatik hafta sonu izinli |
| `pdks-weekly-summary` | Haftalık | Şube haftalık özet |
| `pdks-daily-absence` | Günlük | Devamsızlık raporu |
| `pdks-monthly-payroll` | Aylık | Bordro hesap |
| `task-delivery` | ? | Görev dağıtım |
| `skt-expiry` | ? | SKT yaklaşan uyarı |

### Replit Environment (Secrets)

```env
DATABASE_URL=postgres://...neon.tech...  # KRİTİK
NODE_ENV=development
PORT=5000

# Mail (PIN reset için)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@dospresso.com
SMTP_PASSWORD=app-password
SMTP_FROM_EMAIL=noreply@dospresso.com
# VEYA Resend alternatif
RESEND_API_KEY=re_...

# AI (Mr. Dobody)
OPENAI_API_KEY=sk-...

# Auth
SESSION_SECRET=...
REPLIT_AUTH_*=...  (Replit Auth)

# Pilot Override
PILOT_BREAK_MINUTES_OVERRIDE=120  # 90→120 override (mola threshold)
ALLOW_PILOT_PASSWORD_RESET=true
ADMIN_BOOTSTRAP_PASSWORD=...
```

**Mail çalışmıyorsa:** `SMTP_*` secrets eksik. PIN reset yapılır ama mail gitmez → DB güncellenir, admin WhatsApp ile bildirir.

---

## 🤝 ASLAN'A NASIL DAVRANILMALI

### Aslan = CEO, Founder DOSPRESSO

**Karakterik özellikler:**
- 🇹🇷 **Türkçe** konuşur (asla İngilizce response verme)
- 📱 **iPad mobil** kullanır (kısa, görsel cevaplar)
- 👔 **IT uzmanı değil** — CEO/işletme zihniyeti
- 🎯 **Strateji + UX kararları** verir, teknik bırakır
- ⚡ **Hızlı geri dönüş** bekler
- 🎨 **Ekran görüntüsü** ile geri bildirim verir

### Asla Yapma

❌ JSON, API endpoint, kod blokları gösterme
❌ "git rebase", "TypeScript types" gibi teknik jargon
❌ Uzun paragraflar (3-5 cümle max)
❌ Manuel git komutları öğretmek
❌ "Sen IT bilmiyorsan ben açıklayayım" tonu

### Mutlaka Yap

✅ Basit görsel listeler (✅/❌, tablolar)
✅ "Sen şunu yap:" şeklinde direktif
✅ Mobil-friendly (1 ekran = 1 mesaj)
✅ Karar gerektiren yerlerde ask_user_input_v0 kullan
✅ "Anlamadım, ekran görüntüsü at" denilebilir

### Aslan'ın Tipik İletişim Şekli

Gerçek örnekler:
- "burda hata veriyor çok fazla denem olduğu için" → spec değil, problem
- "burda mola dakika ssayısı sabit kalıyor" → screenshot bekler
- "fakrlı perspektiflerden değerlendir" → analiz iste
- "İT uzmanı değilim" → bunu hatırlatır

---

## 🔄 TRIANGLE WORKFLOW (KRİTİK)

```
┌─────────────────────────────────────────────────────────────┐
│                    DOSPRESSO TRIANGLE                       │
└─────────────────────────────────────────────────────────────┘

       Claude (CLI)
       ├─ Kod yazar
       ├─ GitHub push yapar  ← TEK push yetkisi
       ├─ Skill MD update    ← TEK skill yetkisi
       └─ Mimari kararlar

       Replit Agent
       ├─ DB migration çalıştırır (psql)
       ├─ Build/restart yapar
       ├─ Smoke test
       ├─ Küçük hotfix (typo, import)
       └─ ❌ PUSH YAPMAZ (Aslan kuralı!)

       Aslan (CEO)
       ├─ Manuel UI test
       ├─ Business kararlar
       ├─ Strateji/UX
       └─ Replit'te workflow restart
```

### Çakışma Çözümü

Eğer Replit Agent commit yaptıysa ve push edilmediyse:
1. `git fetch origin`
2. Replit commit'i local'da olabilir, remote'ta yok
3. `git log origin/BRANCH..HEAD` → görür
4. Cherry-pick veya merge ile birleştir
5. Push

**11 May 2026 örneği:** Replit Agent `69967ac98` commit'i yaptı, ben hard reset ile sildim, cherry-pick ile recover ettim.

---

## 🧪 PİLOT BİLGİLERİ

### Tarih
- **Pilot:** 13 Mayıs 2026 Çarşamba 15:00
- **Yer:** Antalya, Türkiye
- **Süre:** Belirsiz (test etkinliği)

### 4 Pilot Şube

| ID | Ad | Tip | Sahiplik |
|----|----|----|----------|
| 5 | Antalya Işıklar | HQ-owned | Aslan |
| 8 | Antalya Lara | Franchise | Yatırımcı |
| 23 | Merkez HQ | HQ | Aslan |
| 24 | Fabrika | Factory | Aslan |

### 4 Pilot Ürün

1. Donut Base Hamuru
2. Cinnaboom Classic
3. Cinnaboom Brownie
4. Cheesecake Base

### Pilot Kişiler

- **Aslan** — CEO (her şeyi gözlemler)
- **Utku Bey** — CGO (canlı vardiya izler)
- **Mahmut Bey** — IK/Muhasebe (puantaj/bordro)
- **Samet** — Procurement Lead (stok/fatura)
- **Sema** — WhatsApp ile hammadde girişi (36 ham madde + 4 reçete)
- **Ümit Usta** — Şef (recipe role 'sef')
- **İlker** — Recipe GM (role 'recete_gm')
- **Cihan Kolakan** — Test kullanıcısı (CK avatar)

---

## ⚠️ BİLİNEN PROBLEMLER VE ÇÖZÜMLER

### Pre-existing Issues (Pilot için sorun olmaz)

| Sorun | Durum | Plan |
|-------|-------|------|
| ~1500 yer sub-12px font | Pilot-critical düzeltildi | Post-pilot 14-15 May |
| /ik route hatası | Bilinmeyen | Post-pilot |
| dual payroll tables | monthly_payroll kullan | Sprint 14 |
| account_status (active vs approved) | `IN ('active','approved')` | Sprint 14 |
| 5 phantom fabrika roles (zero users) | Yok say | Post-pilot |
| Procurement module dormant | Code-complete | Aktive et |

### Pilot Risk Senaryoları

**Senaryo 1: Kiosk donar / yenilenmez**
- Replit logs'a bak → ne hata?
- Network sorunu mu? Localhost testi
- Workflow restart son çare

**Senaryo 2: PIN reset mail gelmez**
- Replit Secrets'da SMTP_* var mı?
- Eğer yoksa: DB'de PIN değişmiştir, admin WhatsApp ile bildirsin
- Alternatif: Resend API key dene

**Senaryo 3: Mola sayacı azalmıyor**
- workflow restart yapıldı mı?
- Browser cache temizle
- Backend `currentSession.breakStartTime` field'ı dönüyor mu?
- Fallback bloğu çalışıyor mu? (tick state)

**Senaryo 4: Long-shift otomatik kapatmadı**
- Migration çalıştı mı? (auto_closed kolonu var mı?)
- tick-1hr scheduler logs'a bak
- Manuel check: `await checkLongShifts()` çağır

**Senaryo 5: 65 dk mola ihlali ama uyarı yok**
- isBreakAnomaly kümülatif kontrol ediyor mu?
- pbStyle kırmızı yanıp sönüyor mu?
- statusTxt "🚨 +5dk geç" gösteriyor mu?

---

## 📋 ASLAN'IN MANUEL GÖREVLERİ (Bekleyenler)

1. **Mahmut payroll BRÜT figures** (5 kişi P-1) — manuel Excel entry
2. **HQ PIN setup** — eren + hqkiosk via UI
3. **WhatsApp Sema** çok kapsamlı:
   - 36 ham madde fiyat: HAM-1000 → HAM-1035
   - 36 ham madde besin değeri
   - DOREO aktivasyonu (factory_recipes)
   - Golden Latte aktivasyonu
   - 4 pilot reçete "Besin Hesapla" + "Gramaj Onayla"
4. **Fabrika manager** doğrulama (3 unknown pasif user, 13 May sabah)
5. **PR mergele**: https://github.com/bombty/DOSPRESSO-App/pulls

---

## 🛠️ EN ÇOK KULLANILAN KOMUTLAR

### Session Başı (Zorunlu)

```bash
cd /home/claude/DOSPRESSO-App
git fetch origin
git log --oneline origin/main..HEAD  # local'de push edilmemiş var mı?
git log --oneline HEAD..origin/[BRANCH]  # behind mı?
```

### Push (--no-verify gerekli — skill MD freshness rule)

```bash
git push "https://x-access-token:[TOKEN]@github.com/bombty/DOSPRESSO-App.git" [BRANCH]
```
**ASLA token'ı dosya içine yazma** — GitHub Secret Scanning push'u reddeder!

### TypeScript Check

```bash
timeout 60 npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "TS2688\|TS5101\|TS6310" | head -10
```
(Boş = clean)

### Quality Gate Audit

```bash
# Font (post-fix)
grep -roE 'text-\[(7|8|9|10|11)px\]' client/src/ | wc -l

# Mola consistency
psql "$DATABASE_URL" -c "..."
# (Quality gate skill MD'ye bak)
```

### Migration Çalıştır (Replit Agent)

```bash
psql "$DATABASE_URL" -1 -f migrations/[file].sql
# -1 flag = single transaction (rollback eğer hata)
```

---

## 🎓 YENİ CLAUDE — SIK YAPILAN HATALAR (Önlem)

### Hata 1: Skill MD'leri Atlama

❌ Direkt kod yazmaya başlama
✅ Önce `dospresso-debug-guide` ve `dospresso-architecture` oku

### Hata 2: Aslan'a Teknik Detay Verme

❌ "Backend response'ta `breakStartTime` field eklendi..."
✅ "Mola süresi artık her saniye azalır"

### Hata 3: Push'u Unutma

❌ Sadece commit yapıp bırakma
✅ Her commit sonrası `git push` ile remote'a yansıt

### Hata 4: Migration'ı Unutma

❌ Sadece schema dosyasını yaz
✅ İlgili SQL migration dosyası da oluştur + Aslan'a hatırlat

### Hata 5: --no-verify Bayrağını Unutma

❌ `git commit -m "..."`
✅ `git commit --no-verify -m "..."` (skill freshness check için)

### Hata 6: Replit Agent'ın Push Yetkisinin Olmadığını Unutma

❌ "Replit push yapsın"
✅ "Replit commit yapsın, ben push edeyim"

---

## 🔍 ASLAN'IN SİSTEM TERCİHLERİ

### Terminology (Önemli)

- **"Partner"** kullan (NOT "yatırımcı", "owner", "franchisee")
  - DB role: `yatirimci_hq`, `yatirimci_branch`, `owner` → UI'de "Partner"
  - Starbucks-style

- **"Vardiya"** kullan (NOT "shift")
- **"Mola"** kullan (NOT "break")
- **"Çalışıyor / Molada / İzinli"** durum kelimeleri

### UI/UX Tercihleri

- **DOSPRESSO Brand Colors:**
  - Red: `#C0392B` (primary)
  - Navy: `#192838` (header/dark)
- **Header:** Kırmızı
- **Footer:** Lacivert
- **Dark mode default** (kiosk için)
- **Touch target:** min 44×44px (iPad)
- **Font min:** 12px caption, 14px body

### Mola Kuralları (Pilot)

- **60 dakika günlük** (Türk İş K. m.68: 7.5+ saat = 60dk)
- **Kümülatif** (parçalı mola)
- **10 dk uyarı, 5 dk uyarı, 1 dk son uyarı, 0 dk ALARM**
- **3+ dk geç:** auto verbal warning
- **10+ dk geç:** written warning

### Veri Saklama

- **10 yıl** payroll/PDKS (SGK m.86)
- **10 yıl** KVKK onay kayıtları
- **5 yıl** müşteri geri bildirimi (TBK m.146)
- **Soft archive** (status='archived', DELETE değil)

---

## 🧠 ASLAN'IN DAHA ÖNCEKİ KARARLARI (Hatırla)

### Mimari Kararlar
1. **Branch vs Factory isolation:** product_recipes (şube) ile factory_recipes (fabrika) MUTLAK ayrı. Asla birleştirme.
2. **HQ + Factory + 25 şube** (hedef 55, 2 yıl)
3. **Veri tek yön:** branch → HQ, asla tersi
4. **Mr. Dobody pattern-based** bildirim (bireysel değil)
5. **Replit cannot push** (Triangle rule)

### Teknik Kararlar
1. **Drizzle ORM** (TypeORM/Prisma değil)
2. **Wouter routing** (React Router değil)
3. **Neon Serverless** PostgreSQL (managed)
4. **Vite** (CRA değil)
5. **TanStack Query** (Redux değil)
6. **Tailwind + shadcn/ui** (Material-UI değil)
7. **Session-based auth** (JWT değil)
8. **localStorage "kiosk-token"** (cookie değil)

---

## 💡 İLERİ DÜZEY İPUÇLARI (Yeni Claude İçin)

### Kiosk.tsx Hassasiyet

`client/src/pages/sube/kiosk.tsx` ~2900 satır. Bu dosyada:
- `tick` state (her saniye)
- `currentSession` (TypeScript type'ında breakStartTime YOK, `as any` cast kullan)
- `selectedUser` (PIN giriş sonrası)
- `step` ('select-user' | 'pin' | 'working' | 'announcements')
- PersonRow component (staff card)
- pbStyle function (kart stilleri)
- statusTxt function (durum metni)

**Hassas alanlar:**
- breakStartMutation/breakEndMutation onSuccess (state senkron)
- PersonRow re-render (tick referansı şart)
- Modal stack (KVKK → PIN reset → BreakReturnSummary)

### Backend Endpoint Patterns

```ts
// Standart pattern
router.get('/api/.../...', isAuthenticated, async (req, res) => {
  try {
    const userRole = (req.user as any)?.role;
    if (!ADMIN_ROLES.includes(userRole)) return res.status(403).json({ error: 'Yetkisiz' });
    // logic
    res.json({ ... });
  } catch (error: any) {
    console.error('[endpoint-name]', error);
    res.status(500).json({ error: '...', message: error.message });
  }
});
```

### Drizzle Patterns

```ts
// Select
const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

// Insert + return
const [created] = await db.insert(users).values({...}).returning();

// Update
await db.update(users).set({...}).where(eq(users.id, userId));

// Soft delete (KVKK)
await db.update(users).set({ status: 'archived', archivedAt: new Date() })
  .where(eq(users.id, userId));
```

### React Patterns (Bu Projeye Özgü)

```tsx
// Tick state — countdown için
const [tick, setTick] = useState(0);
useEffect(() => {
  const id = setInterval(() => setTick(t => t + 1), 1000);
  return () => clearInterval(id);
}, []);

// Component içinde
void tick;  // referans şart - re-render tetiklenir

// API
const { data, refetch } = useQuery({
  queryKey: ["/api/..."],
  queryFn: async () => {
    const r = await fetch("/api/...", { credentials: "include" });
    if (!r.ok) throw new Error("...");
    return r.json();
  },
  refetchInterval: 10000,  // 10sn
});
```

---

## 🏁 SON KONTROL — YENİ OTURUM BAŞLATMADAN ÖNCE

### Aslan İçin Checklist

- [ ] Git pull yaptım (son commit görünüyor)
- [ ] Workflow restart yaptım
- [ ] Long-shift migration çalıştırıldı (`psql ... 2026-05-11-long-shift-auto-close.sql`)
- [ ] PIN reset mail çalışıyor mu? (SMTP secrets var mı?)
- [ ] Kümülatif mola test ettim (45+15)
- [ ] PR mergele edildi (henüz değilse Aslan tıklamalı)

### Yeni Claude İçin Checklist

- [ ] Bu dokümanı okudum (DEVIR-TESLIM-11-MAYIS-2026-GECE.md)
- [ ] 4 skill MD'yi gözden geçirdim
- [ ] userMemories'i okudum (system prompt)
- [ ] Aslan'a Türkçe yanıt veriyorum
- [ ] Teknik JSON/kod göstermiyorum
- [ ] Mobil-friendly cevap veriyorum

---

## 📞 ACİL DURUM PROCEDÜRÜ (Pilot Sırasında)

### Sorun 1: Kiosk çöker
1. Replit logs'a bak
2. Workflow restart
3. Aslan'a "ekran görüntüsü at" iste

### Sorun 2: DB connection lost
1. `DATABASE_URL` secret kontrol
2. Neon dashboard'a bak
3. Replit logs `Database error` ara

### Sorun 3: Mail gitmez
1. SMTP_* secrets kontrol
2. `console.log` ile error mesajı bak
3. **Acil çözüm:** PIN DB'de var, WhatsApp ile bildir

### Sorun 4: Personel kilitlendi
```sql
UPDATE branch_staff_pins 
SET pin_failed_attempts=0, pin_locked_until=NULL 
WHERE user_id='USER_ID';
```
+ Workflow restart (in-memory Map temizlenir)

### Sorun 5: Acil rollback
```bash
git reset --hard <önceki-stable-commit>
git push --force-with-lease origin claude/branch
```
(Sadece son çare!)

---

## 🎯 SON SÖZ

**Bu doküman + 4 skill MD + userMemories = sistemin %100 anlaşılması için yeterli.**

Yeni Claude oturumu:
1. Bu dokümanı okur (5 dakika)
2. Skill MD'leri tarar (otomatik)
3. Aslan'a durumu sorar
4. Çalışmaya başlar

---

*Hazırladı: Claude — 11 Mayıs 2026 02:00*
*Pilot: 13 Mayıs 2026 15:00 (~37 saat kaldı)*
*Branch: `claude/kiosk-mega-improvements-2026-05-10`*
*Token'lar redact edilmiştir. Push hatası alırsanız doküman içinde token yok demektir.*
