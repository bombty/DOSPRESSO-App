# PİLOT DAY-1 GO / NO-GO CHECKLIST

Tek sayfa Day-1 sabahı karar referansı. Yazdırılabilir.

Pilot Day-1 hedef tarihi: **(owner ile netleşecek — bu doküman tarih-bağımsız hazırlandı)**  
Son güncelleme: 2 Mayıs 2026  
İlgili: `docs/SPRINT-LIVE.md`, `docs/DECISIONS.md`, `docs/TEST-MATRIX.md`, `docs/runbooks/`

---

## 🟢 GO Kriteri Özeti

**Tüm "Pre-Day-1" + "Day-1 Açılış" maddeleri ✅ ise GO.**  
**Bir tane bile 🔴 varsa → NO-GO veya ertele.**  
**🟡 olan maddeler → owner kararı + tampon plan.**

---

## ⚙️ PRE-DAY-1 (Day-0 Akşamı / Day-1 Sabahı 1 Saat Öncesi)

### A. Sistem Sağlığı

- [ ] **Workflow `Start application` running** (Replit panelinden doğrula)
- [ ] **Workflow `artifacts/mockup-sandbox` running** (varsa, gerekli değilse atla)
- [ ] **DB bağlantısı OK** — `psql "$DATABASE_URL" -c "SELECT 1;"` döner
- [ ] **DB drift = 0** — `tsx scripts/db-drift-check.ts` çıktısı: "Eksik tablo / index / FK / UNIQUE = 0"
- [ ] **Object storage erişimi OK** — public/private bucket ID'leri env'de mevcut
- [ ] **SMTP OK** — Test mail gönderilir, ulaşır (en az bir admin'e bilgi maili)
- [ ] **OpenAI API quota OK** — Mr. Dobody / Academy AI çağrıları için yeterli kredi

### B. Git + Kod Sağlığı

- [ ] **Local HEAD = origin/main** — `git --no-optional-locks status` clean
- [ ] **Son 24 saat içinde commit yok ya da review edildi** — `git log --since="24 hours ago"` kontrol
- [ ] **Working tree temiz** — Hiç staged/unstaged değişiklik yok
- [ ] **Hiçbir paralel agent (ChatGPT/Claude) açık değil** — divergence riski sıfır

### C. Pilot Kullanıcı Hazırlığı

- [ ] **Aslan (CEO)** — `aslan` kullanıcı aktif, login test geçti, dashboard widget'ları render oluyor
- [ ] **Ali (CEO yedek)** — kullanıcı aktif, login test geçti
- [ ] **Eren (Fabrika Müdürü)** — `eren` kullanıcı aktif, fabrika dashboard 10 widget açılıyor
- [ ] **Ümit (Şef)** — `umit` kullanıcı aktif, factory shift-start akışı test geçti
- [ ] **Sema (Gıda Mühendisi)** — `sema` kullanıcı aktif, reçete besin hesabı test geçti
- [ ] **RGM (Recipe-GM, hq-ilker)** — `hq-ilker` kullanıcı aktif, reçete onay akışı test geçti
- [ ] **Erdem (Müdür)** — `mudur` rolünde Erdem aktif, supervisor dashboard 11 widget render oluyor
- [ ] **Andre (Müdür)** — aynı kontrol
- [ ] **Basri (Supervisor)** — `supervisor` rolünde Basri aktif, dashboard 12 widget render oluyor
- [ ] **Pilot şubelerin `module_flags` değerleri doğru** — sadece pilot kapsamındaki modüller açık

### D. Veri Temizliği

- [ ] **Pilot test kayıtları işaretli ve ayrı** — `PILOT_PRE_DAY1_TEST_*` notlu kayıtlar production'dan ayrıştırılabilir
- [ ] **Test PDKS Excel'leri silindi veya arşivlendi** — Day-1 gerçek veriyi karıştırmasın
- [ ] **DB backup alındı (Day-0 akşamı)** — `pg_dump "$DATABASE_URL" > backup-pre-day1-YYYYMMDD.sql`
- [ ] **Backup test edildi** — En az `pg_restore --list` ile içerik doğrulandı

### E. Kiosk Hazırlığı (4 Birim: 3 Şube + 1 Fabrika)

Her birim için ayrı ayrı:

- [ ] **Tablet/cihaz çalışıyor** — şarj %80+, internet bağlı
- [ ] **Tarayıcı kiosk URL'inde açık** — `https://<replit-domain>/kiosk/<branchId>` doğru route
- [ ] **Kiosk PIN'leri seed edildi** — `branch_staff_pins` (3 şube) + `factory_staff_pins` (1 fabrika) tablolarında pilot personel kayıtları mevcut
- [ ] **Kiosk login smoke test** — Her birimde en az 1 personel login → shift-start → shift-end test geçti
- [ ] **Personel listesi yazdırıldı** — Her kiosk yanında "Hangi personel hangi PIN'i kullanır" listesi (PIN değerleri **YAZILMAZ**, sadece "isim → PIN'inizi yetkiliden alın")
- [ ] **Yedek kiosk cihazı hazır** — En az 1 spare tablet, şarj edilmiş

> ⚠️ **HQ Kiosk:** Şu an plaintext PIN ile çalışıyor (md. 14 + `docs/plans/hq-kiosk-pin-security.md`). Day-1 öncesi düzeltilmediyse → **risk kabul edilmiş**, Day-1'den sonra fix.

### F. Dokümantasyon

- [ ] **TEST-MATRIX.md güncel** — 13 rol smoke test akışları yazılı
- [ ] **Kiosk runbook hazır** — `docs/runbooks/kiosk-pdks-test.md` yazdırılmış, kiosklarda erişilebilir
- [ ] **DB-WRITE protokol kartı** — Acil DB write gerekirse owner+agent için referans
- [ ] **Recipe + label workflow** — Sema + RGM için `docs/runbooks/recipe-label-workflow.md` referans
- [ ] **Bu checklist** — yazdırılmış, owner masasında

### G. İletişim Kanalları

- [ ] **Owner (Aslan) ulaşılabilir** — telefon + WhatsApp aktif, Day-1 boyunca müsait
- [ ] **Replit Agent erişimi açık** — Aslan acil durumda agent ile çalışabilir
- [ ] **Acil durum WhatsApp grubu** — Tüm pilot kullanıcılar dahil, P0 hata kanalı
- [ ] **Yedek iletişim** — Acil durum için en az 1 alternatif kanal (e-posta listesi vb.)

---

## 🌅 DAY-1 AÇILIŞ (Sabah Saat 06:00 — İlk Vardiya Başlamadan 1 Saat Önce)

- [ ] **Tüm Pre-Day-1 maddeleri tekrar gözden geçirildi** — gece içinde değişen var mı?
- [ ] **DB son backup alındı** — sabah 05:30 itibarıyla
- [ ] **Tüm kiosklar açık ve kiosk URL'inde** — uzaktan VNC/AnyDesk ile veya birim sorumlusundan teyit
- [ ] **Tüm pilot kullanıcılar uyandı / işe geliyor** — WhatsApp grubunda "günaydın" check-in
- [ ] **Aslan + Agent online** — Day-1 boyunca canlı destek
- [ ] **Day-1 incident log dosyası açık** — `docs/PILOT-DAY1-INCIDENT-LOG.md` boş template hazır, anlık doldurulacak

---

## 🟢 GO Kararı (Day-1 Sabahı, İlk Vardiya 1 Saat Öncesi)

| Kategori | GO Kriteri | Durum |
|---|---|---|
| Sistem sağlığı | A bölümü tamamen ✅ | [ ] |
| Kod/git | B bölümü tamamen ✅ | [ ] |
| Pilot kullanıcılar | C bölümü tamamen ✅ | [ ] |
| Veri | D bölümü tamamen ✅ | [ ] |
| Kiosklar | E bölümü tamamen ✅ (HQ kiosk hariç — bilinen risk) | [ ] |
| Dokümanlar | F bölümü tamamen ✅ | [ ] |
| İletişim | G bölümü tamamen ✅ | [ ] |
| Day-1 sabah | "DAY-1 AÇILIŞ" tamamen ✅ | [ ] |

**Tüm kategoriler ✅ ise → 🟢 GO**  
**Bir tane bile 🔴 ise → 🔴 NO-GO veya ⏸ ERTELE (owner kararı)**

---

## 🔴 NO-GO Senaryoları + Tampon Plan

### NO-GO 1: DB drift > 0
- **Belirti:** `db-drift-check.ts` "Eksik X tablo / Y FK" döner
- **Eylem:** `migrations/` klasöründe son uygulanmamış migration var mı kontrol → uygula → drift tekrar test
- **Hala başarısız ise:** Owner + agent bul, root cause analizi → 2 saat ertele

### NO-GO 2: Workflow `Start application` down
- **Belirti:** Replit panelinde 🔴 status veya HTTP 502
- **Eylem:** Workflow restart → log incele (`refresh_all_logs`) → hata varsa fix
- **Hala başarısız ise:** Son commit'i revert → restart → tekrar dene

### NO-GO 3: DB backup başarısız
- **Belirti:** `pg_dump` hata verir veya boş dosya üretir
- **Eylem:** DB bağlantı kontrol, disk alanı kontrol, backup retry
- **Hala başarısız ise:** Replit Object Storage backup snapshot tetikle, owner bilgilendir

### NO-GO 4: Kiosk login test başarısız (en az 1 birim)
- **Belirti:** Personel PIN ile login olamıyor (HTTP 401 veya 423)
- **Eylem:** `branch_staff_pins` tablosunda kayıt var mı kontrol → PIN reset (admin endpoint)
- **Hala başarısız ise:** O birim manuel PDKS (Excel) kullanır, sonradan import edilir

### NO-GO 5: Kritik pilot kullanıcı hasta / izin
- **Belirti:** Aslan, Eren, Ümit, Sema, RGM'den biri Day-1'e katılamıyor
- **Eylem:** Yedek (Ali, başka şef vb.) ile devam veya 1 gün ertele
- **Owner kararı:** Hangi rol kritik, hangisi yedek ile devam edebilir

### NO-GO 6: Internet / altyapı kesintisi
- **Belirti:** Birimlerden internet erişim sorunu raporu
- **Eylem:** Mobil hotspot tampon → 30 dk içinde çözülmezse → kiosk'lar offline manuel mod (Excel)
- **Sistem fallback:** Kiosk PDKS yerine fiziksel imza → akşam Excel ile import

### NO-GO 7: Belirsiz / yeni keşfedilen kritik bug
- **Belirti:** Pre-Day-1 testlerinde fark edilen daha önce bilinmeyen ciddi sorun
- **Eylem:** Bug severity belirle (P0/P1/P2) → P0 ise ertele, P1+ ise tampon planla devam
- **Karar süresi:** Owner + agent 30 dk içinde GO/NO-GO

---

## ⏸ ERTELEME PROSEDÜRÜ

NO-GO kararı verilirse:

1. **Pilot kullanıcılara WhatsApp/SMS bildirimi** — "Day-1 erteleniyor, yeni tarih: X"
2. **Bekleme moduna geç** — Manuel PDKS (Excel) devam, sistem değişikliği yok
3. **Sorun root cause analizi** — DOCS-ONLY rapor: `docs/incidents/day1-postpone-YYYYMMDD.md`
4. **Fix + retest** — Yeni Day-1 öncesi tüm checklist tekrar
5. **Yeni Day-1 tarihi** — Owner kararı, en az 24 saat tampon önerilir

---

## 📊 DAY-1 SÜRESİ İZLEME

Day-1 boyunca her saat başı kontrol:

- [ ] **08:00** — İlk vardiyalar başladı, kiosk login başarı oranı %?
- [ ] **10:00** — PDKS kayıtları DB'ye yazılıyor mu? (`SELECT COUNT(*) FROM pdks_records WHERE created_at > NOW() - INTERVAL '4 hours';`)
- [ ] **12:00** — Mola akışı çalışıyor mu? Mr. Dobody late arrival skill tetiklendi mi?
- [ ] **14:00** — Vardiya 1 → vardiya 2 geçişi sorunsuz mu?
- [ ] **16:00** — Üretim/reçete akışı (varsa) tamamlandı mı?
- [ ] **18:00** — Akşam vardiyası başladı, gün ortası KPI'ları toplandı mı?
- [ ] **20:00** — İlk gün özet: kaç login, kaç PDKS kaydı, kaç incident?
- [ ] **22:00** — Gece vardiyası varsa kontrol, yoksa Day-1 kapanış
- [ ] **00:00** — Day-1 resmi kapanış: tüm metrikler `incident-log` ile birleştirilir

---

## 📝 GÜN SONU DEĞERLENDİRME

Day-1 bitiminde:

- [ ] **Toplam login sayısı** — beklenen vs gerçek
- [ ] **PDKS kayıt sayısı** — beklenen vs gerçek
- [ ] **Incident log özet** — kaç P0, kaç P1, kaç P2
- [ ] **Çözülmemiş sorunlar listesi** — Day-2 önceliği
- [ ] **Kullanıcı feedback özeti** — pozitif + negatif
- [ ] **GO/NO-GO Day-2** — devam mı, durdurma mı, scope daraltma mı

---

## 🔗 İLGİLİ DOSYALAR

- `docs/SPRINT-LIVE.md` — Sprint 1 ilerleme
- `docs/DECISIONS.md` — Tüm pilot kararları (28 madde)
- `docs/TEST-MATRIX.md` — 13 rol smoke test
- `docs/runbooks/db-write-protocol.md` — Acil DB write için
- `docs/runbooks/kiosk-pdks-test.md` — 4 birim kiosk test
- `docs/runbooks/git-security-cleanup.md` — Git divergence acil müdahale
- `docs/runbooks/recipe-label-workflow.md` — Reçete + besin akışı
- `docs/plans/hq-kiosk-pin-security.md` — HQ PIN güvenlik planı (post-pilot fix)
- `docs/plans/shift-attendance-checkout-fix.md` — Check-out kapanış bug planı
- `docs/PILOT-DAY1-INCIDENT-LOG.md` — Day-1 hata günlüğü template

---

> **Bu checklist Day-1 sabahı yazdırılır ve owner masasında bulunur. Her kontrol kutucuğu işaretlenir, NO-GO çıkarsa bu doküman üzerinde kayıtlı kalır.**
