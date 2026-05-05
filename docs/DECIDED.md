# ✅ DECIDED — Kalıcı Kararlar

> **Bir kez verilen kararlar, tartışılmaz.** Yeni oturum: önce bu dosyayı oku, kararları yeniden açma.

---

## 🏗️ MİMARİ KARARLAR

### D-01: Triangle Workflow (4 Apr 2026)
**Karar:** İş bölümü kesindir.
- **Aslan (CEO):** Business, UX, priority kararları
- **Claude:** Architecture, code, GitHub push, kod yazma
- **Replit Agent:** DB migration, build, hotfix, smoke test

**Neden:** Karışıklığı önlemek, sorumluluk net olsun.

---

### D-02: Monorepo Tek Repo (Mart 2026)
**Karar:** `bombty/DOSPRESSO-App` tek repo, monorepo değil.  
**Yapı:** client/ + server/ + shared/ + migrations/ + docs/  
**Neden:** Replit hızlı build için tek workspace.

---

### D-03: Drizzle ORM + PostgreSQL Neon (Mart 2026)
**Karar:** Drizzle ORM, type-safe schema. Neon serverless.  
**Neden:** TypeScript inference, migration yönetimi kolay.  
**Schema dosyaları:** schema-01 → schema-25 (domain bazlı).

---

### D-04: 24 Schema Dosyası (Apr 2026)
**Karar:** Tek monolit yerine domain bazlı 24+ schema.  
**Avantaj:** Modüler, paralel iş, conflict az.  
**Schema-25 (Sprint 8):** scoreParameters + history.

---

## 🔐 GÜVENLİK VE COMPLIANCE

### D-05: Push Token Asla Dosyaya Yazılmaz (10 Apr 2026)
**Token:** Konuşmada paylaşılır (asla dosyaya yazma — bu kural D-05).  
**Komut formatı:** `git push "https://x-access-token:TOKEN@github.com/bombty/DOSPRESSO-App.git" BRANCH`

---

### D-06: Main'e Doğrudan Push Yasak (5 May 2026)
**Karar:** Tüm değişiklikler hotfix branch + PR mecburi.  
**Neden:** 5 May gecesi 30 conflict marker push olayı.  
**Aktif:** P-9'dan sonra GitHub Branch Protection ile teknik olarak da uygulanacak.

---

### D-07: 5 Perspektif Review (3 May 2026)
Her major değişiklik için:
1. **Principal Engineer** — kod kalitesi
2. **Franchise F&B Ops** — operasyonel etki
3. **Senior QA** — test edilebilirlik
4. **Product Manager** — UX
5. **Compliance** — İş Kanunu, gıda mevzuat, KDV/AGI, KVKK

---

### D-08: Plan Mode Zorunluluğu (Apr 2026)
**Karar:** DB write, schema, migration, env değişiklik için:
- Mode'u **Plan**'a çevir (Aslan)
- Isolated task agent (Replit Agent)
- pg_dump backup zorunlu
- DRY-RUN + GO mecburi
- PR review

**Build mode'da DB yazma YASAK** (kuralı esnetme).

---

### D-09: Çalışma Sistemi v2.0 — 4 Skill Mecburi (14 Apr 2026)
**Karar:** Her oturum sonu 4 skill dosyası güncellenir:
- `dospresso-architecture`
- `dospresso-debug-guide`
- `dospresso-quality-gate`
- `session-protocol`

---

### D-10: Async Coordination — 3 MD Dosya (Apr 2026)
- `docs/TODAY.md` — bugün ne yapıldı
- `docs/PENDING.md` — bekleyen işler
- `docs/DECIDED.md` — kalıcı kararlar (bu dosya)

---

## 🏢 İŞ MODELİ KARARLARI

### D-11: Pilot 4 Lokasyon (Apr 2026)
- **Işıklar #5** (HQ-owned, Antalya)
- **Antalya Lara #8** (franchise temsil)
- **Merkez Ofis #23** (HQ)
- **Fabrika #24** (üretim)

**Strateji:** Hibrit C — Mahmut HQ koordinasyon, Coach saha gözetim.  
**Tarih:** 12 May 2026 Pazartesi 09:00.

---

### D-12: Muhasebe Scope Sabit (Apr 2026)
**Karar:** Muhasebe modülü = HQ + Fabrika + Işıklar **SADECE**.  
**Neden:** Diğer şubeler franchise muhasebe ayrı yürütüyor.

---

### D-13: Data Flow Tek Yönlü (Apr 2026)
**Karar:** Branch → HQ. ASLA tersi.  
**Neden:** Veri tutarlılığı, audit, complians.

---

### D-14: Fabrika ↔ Branch Tam İzole (Apr 2026)
**Karar:** Cross-access yok.  
- `product_recipes` (branch) ≠ `factory_recipes` (factory)
- Branch ve factory personeli birbirini görmez
- Stok ayrı

---

### D-15: Mr. Dobody — Pattern-Based (Mart 2026)
**Karar:** Individual alert DEĞİL.  
**Yapı:** Pattern-based notifications + autonomous actions with approval mechanism.

---

### D-16: Admin Tam Erişim (Mart 2026)
**Karar:** Admin role her zaman tam erişim. Filtre uygulanmaz.

---

### D-17: HQ Kiosk PIN Plaintext (DECISIONS#14, Mart 2026)
**Karar:** Pilot süresince plaintext kalır (HQ hesabı az, düşük risk).  
**Pilot SONRASI (B1):** Hash + secure storage.

---

## 🎯 PILOT-SPESIFIK KARARLAR

### D-18: Sprint 8 EXECUTE — Seçenek (a) GO (5 May 2026)
**Karar:** Pilot şubelerdeki 11 ekstra kişi aktif kalır.  
**Neden:** Veri kaybetmek yerine fazlalık tut. Mahmut sonra inceler.

---

### D-19: monthly_payroll Pilot Süresince Aktif (5 May 2026)
**Karar:** schema-12 monthlyPayroll kullanılır (51 aktif kayıt).  
**schema-07 monthlyPayrolls boş kalır** (deprecated-candidate).  
**Pilot SONRASI:** `docs/DECISIONS-MONTHLY-PAYROLL.md` Seçenek A.

---

### D-20: Feature Freeze (18 Apr - 15 Haz 2026)
**Karar:** Pilot stabilize olana kadar yeni feature yok.  
**İstisna:** Kritik bug fix, pilot bloker.  
**Yeni feature talebi → "Sprint 17+ pilot sonrası"** yanıtı.

---

### D-21: payroll_parameters 2026 Tahmin Değerleri (5 May 2026)
**Karar:** Migration tahmini değerler kullanır:
- Asgari ücret 33.030 TL brüt / 28.075,50 TL net
- SGK %14 işçi / %20.5 işveren
- 5 vergi dilimi (%15 → %40)

**Mahmut'un sorumluluğu:** Resmi Gazete + GİB ile DOĞRULAMA.

---

## 📐 SCHEMA / VERİ KARARLARI

### D-22: Bordro Tablo Kanonik Karar (5 May 2026)
**Detay:** `docs/DECISIONS-MONTHLY-PAYROLL.md`  
**Pilot süresince:** monthlyPayroll (schema-12) aktif tablo.  
**Pilot sonrası:** Seçenek A — monthlyPayrolls'a migrate, monthlyPayroll DROP.

---

### D-23: Skor Sistemi 5 Kategori 90 Puan (Sprint 8, 5 May 2026)
**Karar:** Default skor parametreleri:
- Devam (PDKS): max 20
- Checklist: max 20
- Görev: max 15
- Müşteri: max 15
- Yönetici: max 20
- **Toplam:** 90 puan

**Admin/CEO** kriter ekleyebilir/değiştirebilir.

---

### D-24: 35 Gerçek Personel (5 May 2026)
**Karar:** Aslan'ın gönderdiği 2 Excel'den:
- PERSONEL_o_zlu_k_app.xlsx (26 kişi)
- Lara_Sube_Maas_2026_replit.xlsx (9 kişi Lara)

**Toplam 35.** Migration ADIM 3'te UPSERT.

---

## 🚦 GIT VE WORKFLOW KARARLARI

### D-25: Git Safety 5 Katman (5 May 2026)
**Skill:** `dospresso-git-safety` (4 May)
- L1: Build session başı `git fetch && git status -sb`
- L2: Plan mode task agent `touched_paths`
- L3: Commit öncesi sync check
- L4: Conflict çıkarsa Replit Resolve UI (CLI değil)
- L5: Push öncesi `git log @{u}..HEAD`

**YASAK:** force push, `--theirs .` toptan, `reset --hard`, filter-branch.

---

### D-26: Mode Geçiş Kuralı (Apr 2026)
**Build mode:** kod yazma, edit, doc, lint  
**Plan mode:** DB write, schema, migration, env

---

### D-27: Triangle Conflict Çözümü (5 May 2026)
**Karar:** Replit + Claude aynı dosyayı düzenlerse:
- Conflict çıkarsa **GitHub UI** (görsel, hata az)
- CLI `git checkout --theirs` SADECE iki taraf bilinçli emrederse
- main'de doğrudan kod editi YASAK

---

## 🧠 BİLGİ YÖNETİMİ KARARLARI

### D-28: Memory Edits 30 Madde Limit (Mart 2026)
**Karar:** memory_user_edits max 30 satır, 100k char.  
**Format:** Concise. Verbatim komut yok.

---

### D-29: Skill Files Mandatory at Session End (14 Apr 2026)
4 skill dosyası her oturum sonu güncellenir.  
Aksi: yarın Claude eksik bilgiyle çalışır.

---

### D-30: Devir-Teslim Tek Dosya Hafıza (Apr 2026)
**Format:** `docs/DEVIR-TESLIM-X-NISAN-2026.md` veya `-MAYIS-`  
**İçerik:** Yeni oturum sıfırdan başlasa devam edebilecek seviyede.

---

## 📊 İSTATİSTİK (5 May 2026 sonu itibarıyla)

- **Toplam tablo:** 478+
- **Toplam endpoint:** 1.963+
- **Toplam sayfa:** 324+
- **Aktif rol:** 23 (8 phantom)
- **Bilinen bug:** 31 (debug-guide §1-31)
- **Schema dosyası:** 25 (schema-01 → schema-25)
- **Migration:** 14 (en yenisi 2026-05-05)

---

**Bu dosya değişmez kararları içerir.** Yeni karar eklenirse yeni satır olarak ekle, eski karar silinmez. Audit trail önemli.

**Son güncelleme:** 5 May 2026, 23:30 (Sprint 16 sonrası)
