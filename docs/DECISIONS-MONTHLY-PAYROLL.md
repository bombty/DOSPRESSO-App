# DECISIONS — monthly_payroll ↔ monthly_payrolls Duplicate Karar

**Tarih:** 5 Mayıs 2026  
**Konu:** İki farklı bordro tablosu, kanonik karar  
**Karar Verici:** Aslan (CEO/CTO)  
**Durum:** ⏳ AÇIK — Pilot sonrası karar  
**Etki Eden:** Tüm bordro hesaplama ve raporlama

---

## Sorun

Replit raporu (5 May, `docs/SISTEM-RAPORU-5-MAYIS.md`) bulgu:

> Bordro **`monthly_payroll`** ↔ **`monthly_payrolls`** duplicate tablo —  
> kanonik karar gerekli (PİLOT RİSK #4)

İki ayrı schema dosyasında, iki ayrı tablo:

| Schema | Tablo Adı | Drizzle Adı | Kullanım |
|---|---|---|---|
| `shared/schema/schema-07.ts:839` | `monthly_payrolls` | `monthlyPayrolls` | Bordro modülü ana tablosu |
| `shared/schema/schema-12.ts:645` | `monthly_payroll` | `monthlyPayroll` | PDKS bordro (51 aktif kayıt — Sprint A bulgusu) |

## İki Tablonun Farkları (Şema Karşılaştırma)

### `monthly_payrolls` (schema-07)
**Anlamı:** Bordro modülü kanonik tablosu  
**Kolonlar:** Aslan'ın 13 Apr Sprint sırasında yarattığı yapı:
- Asıl maaş, bordro statüsü, onay zinciri
- 15 parametreli cascading deduction config
- Salary Bridge entegrasyonu
- FM threshold, holiday pay, meal allowance

### `monthly_payroll` (schema-12)
**Anlamı:** PDKS-bağlı bordro (Sprint A bulgusu — 51 aktif kayıt)  
**Kolonlar:** PDKS aggregation tablosu
- Çalışılan toplam saat (PDKS'ten)
- Mesai dakikası
- Devamsızlık günü
- PDKS-bordro köprüsü için

## Mevcut Durum (5 May 2026)

- **`monthly_payrolls`:** Boş (0 kayıt — Sprint 8 öncesi)
- **`monthly_payroll`:** 51 aktif kayıt (Şubat 2026 PDKS bordrosu)
- **İki tablo bağımsız çalışıyor** — fakat aynı domain (bordro)
- **Kullanıcı kafası karışıyor:** "Hangi bordroyu nereden okuyacağız?"

## Aday Çözümler

### Seçenek A — `monthly_payrolls` Ana, `monthly_payroll` Deprecated ⭐
**Avantajlar:**
- 13 Apr Sprint'te yapılmış, daha gelişmiş yapı
- Salary Bridge entegrasyonu hazır
- 15 parametreli deduction config

**Dezavantajlar:**
- Boş, veri taşıma gerekir (51 kayıt)
- PDKS bridge yeniden bağlanmalı

**Kararlı işler:**
1. PDKS bridge'ı `monthly_payrolls`'a yönlendir
2. 51 kayıt taşı (data migration)
3. `monthly_payroll` (schema-12) `_deprecated` postfix ekle
4. 30 gün sonra DROP (pilot stabil ise)

### Seçenek B — `monthly_payroll` Ana, `monthly_payrolls` Deprecated
**Avantajlar:**
- 51 aktif kayıt korunur (sıfır migration)
- PDKS bridge zaten çalışıyor

**Dezavantajlar:**
- 13 Apr Sprint'in 15 parametreli yapısı kaybolur
- Salary Bridge yeniden yazılmalı

### Seçenek C — Birleştir (Yeni Tablo)
**Avantajlar:**
- Temiz başlangıç, en iyisini birleştir

**Dezavantajlar:**
- Büyük migration (3 hafta+)
- Pilot 12 May için imkansız
- Test yükü çok

## Karar — KONSERVATIF (Pilot için)

**ŞIMDILIK:** Hiçbir tabloyu deprecate etme. Pilot 12 May'i etkilemesin.

**PİLOT SONRASI (15 Haziran 2026 sonrası — Feature Freeze biter):**
- **Seçenek A (önerim)** — `monthly_payrolls` ana yap
- Aslan + Mahmut beraber 51 kayıt review eder
- Data migration yazılır (1 hafta)
- Test (1 hafta)
- Cutover (1 hafta)
- `monthly_payroll` DROP (Q3 2026)

## Pilot Süresince (5 May - 12 May - 15 Haziran)

**DOĞRU DAVRANıŞ:**
- Aktif tablo: **`monthly_payroll`** (schema-12) — 51 kayıt var
- PDKS bordro hesabı bu tablodan yapılır
- `monthly_payrolls` (schema-07) DOKUNULMAZ — boş kalır

**DOĞRU OLMAYAN DAVRANIŞ:**
- ❌ Pilot süresince yeni schema yazma
- ❌ İki tabloya da paralel yazma (sync sorunu)
- ❌ DROP — veri kaybı riski

## Kod İçinde Tutarlılık

### `server/routes/hr.ts` Bordro Hesaplama
**Hangi tablo?**

```typescript
// PDKS-bağlı bordro (Mahmut'un Şubat 2026 hesapları):
import { monthlyPayroll } from '@shared/schema/schema-12';  // ✅ AKTİF

// Bordro modülü (boş, gelecek için):
import { monthlyPayrolls } from '@shared/schema/schema-07';  // 🟡 DEPRECATED-CANDIDATE
```

### Pilot Süresince Tüm Yeni Kod
- Sadece `monthlyPayroll` (schema-12) kullan
- `monthlyPayrolls` (schema-07) **import etme** (yanlış data riski)
- Yorum ekle: `// monthly_payrolls deprecated-candidate, decision: docs/DECISIONS-MONTHLY-PAYROLL.md`

## Action Items

| ID | Task | Owner | Deadline |
|---|---|---|---|
| MP-1 | Pilot süresince hiçbir tablo değişmez | Tüm dev | 12 May - 15 Haz |
| MP-2 | Pilot raporu (15 Haz): hangi tablo daha iyi çalıştı? | Aslan + Mahmut | 15 Haz 2026 |
| MP-3 | Karar review meeting | Aslan + Claude | 16 Haz 2026 |
| MP-4 | Migration plan (Seçenek A için) | Claude | 17 Haz 2026 |
| MP-5 | Data migration EXECUTE | Replit isolated agent | 24 Haz 2026 |
| MP-6 | `monthly_payroll` DROP (cutover stabil ise) | Replit | Q3 2026 |

## Referanslar

- Sprint A (18 Apr) bulgu: `monthly_payroll` 51 aktif kayıt
- Replit raporu (5 May): `docs/SISTEM-RAPORU-5-MAYIS.md` Risk #4
- Schema-07: `shared/schema/schema-07.ts:839`
- Schema-12: `shared/schema/schema-12.ts:645`
- Sprint 13-14 (Apr) Mega: monthly_payrolls 15 parametre yapısı

## Onay

- [ ] Aslan onayı (CEO)
- [ ] Mahmut bilgilendirme (Muhasebe sorumlusu)
- [ ] Pilot 15 Haziran sonrası tekrar review

---

**NOT:** Bu dosya pilot süresince DEĞİŞMEZ. Pilot sonrası review için `git log docs/DECISIONS-MONTHLY-PAYROLL.md` ile audit yapılacak.
