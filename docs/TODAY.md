# 📅 TODAY — 6 Mayıs 2026, Çarşamba (Pilot T-6)

> **Bugün ne yapıldı, ne yarın devam edecek.** Yeni oturum başında oku.

---

## 🎯 BUGÜN NE YAPILDI (6 Mayıs)

**Çalışma:** Sprint 8 DB migration serisi (8a + 8b + 8c) + Sprint 10 P-7 HQ PIN UI  
**Tamamlanan:** 3 migration + HQ PIN yönetim sayfası + 3 API endpoint ✅  
**Ertelenen:** Sprint 8d (payroll/net-brüt) ve Sprint 8e (35 personel UPSERT) → yarına

---

## ✅ TAMAMLANAN (6 Mayıs)

| Task | İçerik | Durum |
|---|---|---|
| Sprint 8a (#351) | `score_parameters` + `score_parameter_history` DDL — 19/8 kolon, 7 index, 3 FK | ✅ MERGED (PR #27) |
| Sprint 8b (#352) | `position_salaries` — intern/Stajyer satırı eklendi (33.000 TL net = 3.300.000 kuruş) | ✅ MERGED |
| Sprint 8c (#354) | `position_salaries` UNIQUE(position_code, effective_from) constraint | ✅ DB'de aktif |
| Sprint 10 P-7 UI | `/admin/hq-pin-yonetimi` sayfası + 3 endpoint (status/reset/unlock) | ✅ Canlıda |

### Sprint 8c Detay (Bu Oturum)
- PRE_CHECK_DUPLICATES: 0 satır ✅
- POST_CHECK_CONSTRAINT: `position_salaries_code_effective_unique` ✅
- POST_CHECK_ROW_COUNT: 19 = 19 ✅
- Idempotent re-run: "CONSTRAINT ALREADY EXISTS: skipping" ✅
- Backup: `backups/pre-sprint-8c-constraint-20260506-075824-*`
- Artık `ON CONFLICT (position_code, effective_from)` çalışır

---

## 🔄 ŞU AN AKTİF DB DURUMU

```
score_parameters:       0 satır  ← seed bekliyor (Sprint 8e'de gelecek)
score_parameter_history: 0 satır
position_salaries:     19 satır  ✅  UNIQUE constraint aktif
health:                HEALTHY, db: connected
conflict markers:      0 ✅
```

---

## 🚦 YARIN (7 Mayıs) DEVAM EDECEK

### Sıra DEĞİŞTİ — Aslan Kararı (6 May Gece)

1. **Sprint 8d** — payroll-engine net/brüt revizyonu (Task #355)
   - tax-calculator.ts doğrulanacak
   - payroll-engine.ts net maaş → brüt hesaplama düzeltmesi
   - `payroll_parameters` 2026 seed (asgari ücret, SGK, vergi dilimi)
   - **Sebep:** 35 personel UPSERT'te `users.netSalary=0` girmeyelim, önce engine hazır olsun

2. **Sprint 8e** — 35 gerçek personel UPSERT (Task #353 → yeniden değerlendirilecek)
   - 18 fake şube → is_active=false
   - 119 fake personel → is_active=false
   - 35 gerçek personel UPSERT (Fabrika 10, Ofis 5, Işıklar 11, Lara 9)
   - 5 skor kriteri seed (score_parameters 0→5)
   - payroll_parameters 2026 seed
   - **Bağımlılık:** Sprint 8d bitmeli önce

---

## 📊 PILOT 12 MAYIS HAZIRLIK (T-6)

| Kategori | Status |
|---|---|
| Backend kod | ✅ Hazır |
| Frontend sayfalar | ✅ Hazır |
| score_parameters DDL | ✅ Hazır (0 satır, seed bekliyor) |
| position_salaries | ✅ 19 satır + UNIQUE constraint |
| payroll-engine net/brüt | ⏳ Sprint 8d |
| 35 gerçek personel UPSERT | ⏳ Sprint 8e |
| payroll_parameters 2026 | ⏳ Sprint 8d/8e |
| score_parameters 5 kriter | ⏳ Sprint 8e |

---

## 💡 KRİTİK HATIRLATMALAR

- **Maaşlar NET:** position_salaries'deki tüm tutarlar net TL × 100 kuruş (brüt DEĞİL)
- **Feature Freeze:** 18 Apr - 15 Jun. Yeni feature → "Sprint 17+ pilot sonrası"
- **Schema tuzakları:** users.firstName+lastName, monthlyPayroll (schema-12), tgkLabels.rejectedReason
- **DRY-RUN notu:** Migration BEGIN/COMMIT içeriyorsa dış ROLLBACK çalışmıyor — idempotency ile doğrula

---

**Son güncelleme:** 6 May 2026, ~09:00 (Sprint 8c ✅, 8d/8e yarına ertelendi)  
**Sonraki güncelleme:** Sprint 8d tamamlandıktan sonra
