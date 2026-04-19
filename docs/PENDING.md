# 📋 DOSPRESSO — PENDING.md

**Son güncelleme:** 20 Nis 2026 Pazartesi 02:55 (Claude)  
**Format:** TASK-XXX (iş) / DECISION-XXX (Aslan kararı)  
**Kural:** Her bitendekn sonra üst tablodaki ilgili satırı **DELETE**, TODAY.md "BİTENLER" bölümüne ekle.

---

## 📨 REPLİT'E BEKLEYEN

### 🔴 TASK-001: Sprint D ↔ E Entegrasyon (15 dk, P0)

**Bağlam:** Sprint E backend (commit `b918fe8`) tabloyu + helper'ı + endpoint'leri kurdu. Ama Sprint D'deki 6 P0 yer hâlâ ham `console.error` çağırıyor. Yani `/admin/critical-logs` paneli production'da BOŞ kalacak.

**Yapılacak:** 
- `server/routes/branches.ts` 4 yer (satır 2924, 3376, 4138, 4263)
- `server/routes/factory.ts` 2 yer (satır 1139, 1773)

**Pattern:**
```typescript
// ÖNCESİ:
console.error("[CRITICAL][PDKS-SYNC] ...", { userId, branchId, error });

// SONRASI:
import { critLog } from "../lib/crit-log";
critLog("PDKS-SYNC", "Branch kiosk giris: pdks yazılamadı", {
  userId, branchId, error: pdksErr instanceof Error ? pdksErr.message : String(pdksErr),
}, "branches.ts:2924").catch(() => {});
```

**Acceptance:**
- [x] 6 yer migrate edildi
- [x] `npx vite build` clean
- [x] Manuel test: 1 yere fail tetikle, `/admin/critical-logs` kayıt görünüyor mu?
- [x] Commit + push

**Rapor:** 5 satırlık ✅/❌ tablo

---

### 🟡 TASK-002: Derin Öz-Analiz Raporu (60-90 dk, P1)

**Dosya:** `docs/replit-deep-self-analysis-PROMPT.md` (commit `b9adf2b`)  
**Çıktı:** `docs/replit-deep-self-analysis.md` (~120 satır)  
**Format:** 5 şapka × 25 soru + 3 meta soru, her cevap MAX 3 cümle  
**Deadline:** Pazartesi sabah 09:00 öncesi  
**Acceptance:** Push edilmiş + Aslan'a "tamamlandı" mesajı

---

### 🟡 TASK-003: docs/skills-archive/ Sil (5 dk, P1)

**Bağlam:** Pazar gece Claude bu klasörü yarattı, Replit "illüzyon" diye tespit etti (3f23505). Skill'lerin gerçek yeri `.agents/skills/`.

**Yapılacak:**
```bash
git rm -r docs/skills-archive/
git commit -m "chore: docs/skills-archive sil — illüzyon yedek (Madde 39 öncesi karar)"
git push origin main
```

**Acceptance:** Klasör yok + commit + push

---

### 🟢 TASK-004: 7 Açık Silent try/catch — critLog Migrate (30 dk, P2)

**Bağlam:** Sprint D audit'inde 13 silent try/catch tespit edildi. Sadece 6'sı fix edildi. Geri kalan 7 yer hâlâ `console.warn` ile yutuyor.

**Yapılacak yerler:**
- `server/routes/shifts.ts` mobile_qr (2 yer) — kuryeler pilot dışı ama Sprint I için önemli
- `server/index.ts` auto_close (3 yer) — pilot sırasında ÇALIŞACAK ⚠️
- 2 başka yer (Replit kendisi audit'te bulmuştu, yer numaraları varsa rapor et)

**Pattern:** TASK-001 gibi `critLog()` ile DB'ye yaz.

**Acceptance:** 7 yer migrate edildi + commit + push + rapor

---

### 🟢 TASK-005: Skill Update — Madde 37 §23-25 (10 dk, P2)

**Bağlam:** Pazar gece Claude memory'e ekledi (#23, #24, #25). Live skill'lere (`. agents/skills/dospresso-quality-gate/SKILL.md`) eklenmedi. Claude `.agents/skills/` ile çalışmıyor — bu Replit'in işi.

**Yapılacak:**
- `.agents/skills/dospresso-quality-gate/SKILL.md`'ye 3 alt kural ekle:
  - **§23** Flag/Config Runtime Etki Kontrolü
  - **§24** SQL Yazmadan Önce Schema Kolon Doğrulama
  - **§25** Replit İnisiyatif Kod Review

**Detaylar:** `docs/skills-archive/dospresso-quality-gate.md` Madde 14 §23-25 kısmından (silinmeden önce kopyala). Veya Aslan'a sor, memory'den paylaşır.

**Acceptance:** Skill güncellendi + commit + push

---

## 📨 ASLAN'A BEKLEYEN

### 🔴 DECISION-001: Parola Reset Bug — Çözüm Yöntemi (10 dk konuşma, P0)

**Sorun:** `server/index.ts` startup'ta 158 user parolası `0000`'a sıfırlanıyor. Her server restart sıfırlanır. Pilot sırasında **felaket riski** — bir hotfix push parolaları "0000"a düşürür, 50+ kullanıcı login olamaz, KVKK ihlali.

**Replit'in tespiti (3f23505 #2.2):** "Pazartesi sabah parola rotasyonu (1Password'e geçiş) bunu görmedi; bir sonraki deploy parolaları geri '0000' yapacak."

**Seçenekler:**

#### A) PILOT_MODE Guard (10 dk, en güvenli)
```typescript
// server/index.ts startup
if (process.env.PILOT_MODE !== 'true') {
  await migrateKioskPasswords(); // sadece dev ortamında
}
```
- ✅ Production'da kapalı
- ✅ Dev'de hâlâ çalışıyor
- ⚠️ Replit'te env var kurulumu gerekiyor

#### B) Tamamen Kaldır (5 dk, agresif)
- migrateKioskPasswords() fonksiyonunu sil
- ✅ Bug bir daha asla olmaz
- ⚠️ Dev ortamında manuel kullanıcı oluşturmak gerekir

#### C) Conditional — Sadece İlk Çalıştırmada (15 dk, dengeli)
- "users tablosu boşsa çalıştır, doluysa ATLA" kontrolü
- ✅ Hem dev hem prod güvenli
- ⚠️ Edge case riski (boşken yarım dolu olursa?)

**Beklenen karar:** A, B, veya C (Aslan + Claude tartışma)  
**Sonra:** Replit'e TASK-006 olarak ekle

---

## 📨 CLAUDE'A BEKLEYEN

### 🟢 TASK-007: Madde 37 §26 Skill Ekle (5 dk, sonraki oturum)

**Bağlam:** Pazar gece "WhatsApp" yanılması ortaya çıktı.  
**Kural:** Memory'deki bir kelimeyi/ilişkiyi otomatik **iletişim mekanizması** olarak varsayma. Önce mimari soruyu sor: "Bu kanal gerçekten var mı?"  
**Eklenecek:** `.agents/skills/dospresso-quality-gate/SKILL.md` (Replit ile birlikte) + memory'e

---

## ✅ KARARLAR (DECIDED.md'ye geçecek - ayrı dosya)

Pazar 19 Nis kararları:
- ✅ Pilot tarihi sabit: 28 Nis 09:00
- ✅ FAZAL rollout (Işıklar+HQ → 24h → Lara+Fabrika)
- ✅ docs/skills-archive silinecek (TASK-003)
- ✅ Replit derin öz-analiz yapacak (TASK-002)
- ✅ Sprint G + Sprint E backend production'a girdi
- ✅ Skill files güncellendi (15cabee)

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
