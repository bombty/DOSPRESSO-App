# Pazartesi 28 Nisan 2026 — Pilot Day-1 Sprint Planı

**Hazırlayan**: Replit Agent  
**Tarih**: 19 Nisan 2026 (Cumartesi)  
**Pilot Başlangıç**: 28 Nis 2026 09:00 (4 lokasyon: HQ + Fabrika + Işıklar + Lara)

---

## 1. Saat Bazlı İş Listesi (9 saat)

| Saat | İş | Kim | Süre | Dosya/Script |
|---|---|---|---|---|
| 08:00-08:15 | F03 — adminhq parola rotate | IT | 15 dk | `docs/pilot/f03-password-rotation-runbook.md` |
| 08:15-08:45 | F04 — 3 SPOF role karşılıklı backup atama | Replit Agent | 30 dk | `scripts/pilot/02-f04-spof-backup.sql` + `shared/schema/schema-02.ts` patch |
| 08:45-08:50 | F05 — Yatirimci_HQ users `status=inactive` | Replit Agent | 5 dk | inline SQL |
| 08:00-10:00 | O13 — Branch onboarding bypass (4 lokasyon) | Replit Agent | 2 saat | `scripts/pilot/05-o13-branch-setup-complete.sql` |
| 10:00-12:00 | O06 — Eren mali yetki senkron | Replit Agent | 2 saat | `shared/schema/schema-02.ts` patch |
| 12:00-13:00 | O03 — Mudur `branch_score_detail` widget | Replit Agent | 1 saat | `scripts/pilot/07-o03-mudur-widget.sql` |
| 13:00-14:00 | **ÖĞLE** | — | — | — |
| 14:00-14:45 | F02 kod incelemesi (CUMARTESİ ÖNCEDEN YAPILDI ✅) | — | 0 dk | bu dosyada özet var |
| 14:45-15:15 | F01 + F02 — modül flag karar toplantısı (Aslan + IT + Agent) | 3 kişi | 30 dk | `scripts/pilot/01-f01-module-flags-toggle.sql` |
| 15:15-16:00 | F01 + F02 — onaylanan SQL uygula | Replit Agent | 45 dk | yukarıdaki SQL |
| 16:00-17:00 | Test Branch + seed_test PDKS cleanup | Replit Agent | 1 saat | `scripts/pilot/03-test-branch-cleanup.sql` |
| 17:00-17:30 | Nisan bordro backfill (31 user) | Replit Agent | 30 dk | `scripts/pilot/04-nisan-bordro-backfill.ts` |
| 17:30-18:00 | Smoke test + Day-1 raporu | Replit Agent | 30 dk | `docs/pilot/day-1-report.md` (yeni oluşacak) |

**Toplam Replit Agent efor**: ~8 saat (bazı işler paralel)

---

## 2. Paralel Claude Sprint'leri (4 saat)

| Saat | İş |
|---|---|
| 09:00-11:00 | Sprint B.1 — `shift_attendance` tutarlılık kontrolü |
| 11:00-13:00 | Sprint B.3 — `monthly_attendance_summaries` scheduler |
| 14:00-16:00 | Sprint A.2 — `notification_task_escalation_log` (Feature Freeze istisnası) |

---

## 3. Aslan Onay Bekleyen Kararlar

| # | Konu | Aslan'dan beklenen | Etki |
|---|---|---|---|
| AK-01 | F02 Senaryo: A (sadece sil) vs B (yeni İngilizce eş ekle) | A/B/Karma seçim | Pazartesi 14:45 toplantısı |
| AK-02 | F04 backup yöntemi: A) `users.backup_roles[]` B) yeni tablo C) PERMISSIONS suffix | A/B/C seçim | Pazartesi 08:15 başlamadan |
| AK-03 | F05 Yatirimci_HQ pilot'ta aktif mi? | Aktif/İnaktif | Pazartesi 08:45 |
| AK-04 | GitHub token reconnect (push için) | Token yenile | Pazartesi 09:00 öncesi |

---

## 4. F02 Cumartesi Kod İncelemesi Özeti

### Kritik Bulgu: Fabrika Modül Flag'leri RUNTIME'DA ETKİSİZ
- Hiçbir `pages/fabrika/*.tsx` dosyasında `useModuleFlag` check'i YOK
- Sayfa erişimi `FabrikaOnly` + `ProtectedRoute(allowedRoles)` ile korunuyor — flag bağımsız
- "Disabled" flag'lerin **runtime impact'i SIFIR**, sadece admin paneli görünümü

### Türkçe→İngilizce Migration Tablosu
| Türkçe (DISABLED) | İngilizce (ENABLED) | Durum |
|---|---|---|
| fabrika.kalite | fabrika.quality ✅ | Türkçe SİL |
| fabrika.kavurma | fabrika.roasting ✅ | Türkçe SİL |
| fabrika.sevkiyat | fabrika.shipment ✅ | Türkçe SİL |
| fabrika.hammadde | — eş yok | Aslan kararı |
| fabrika.siparis | — eş yok | Aslan kararı |
| fabrika.sayim | — eş yok | Aslan kararı |
| fabrika.stok | — `production` ≠ stok | Aslan kararı |

### Aktif İngilizce fabrika.* Set (8 modül)
`fabrika`, `fabrika.factory-kiosk`, `fabrika.haccp`, `fabrika.production`, `fabrika.quality`, `fabrika.roasting`, `fabrika.shipment`, `fabrika.vardiya`

---

## 5. Rollback Stratejisi (Acil Durum)

Her SQL script'inin başında BEGIN/ROLLBACK opsiyonu. Smoke test başarısızsa:
```sql
-- Acil rollback: Pazartesi öncesi alınan backup'tan geri dön
psql "$DATABASE_URL" < /tmp/pilot-backup-2026-04-27.sql
```

Backup alma (Pazar gecesi 23:00):
```bash
pg_dump "$DATABASE_URL" > /tmp/pilot-backup-2026-04-27.sql
```

---

## 6. Smoke Test Checklist (17:30)

- [ ] adminhq parola yeni parolayla login OK
- [ ] 4 lokasyon müdür `setup_complete=true` ekran açılıyor
- [ ] Eren (`fabrika_mudur`) mali panel 200 dönüyor (403 yok)
- [ ] Mudur dashboard'unda `branch_score_detail` widget görünüyor
- [ ] Test Branch sidebar'da görünmüyor (soft-deleted)
- [ ] Nisan bordro 31 user için ücret hesaplanmış
- [ ] Notification spam: son 1 saatte ≤10 escalation
- [ ] F04 backup user login OK (3 backup user test)

---

## 7. Day-1 Raporu Şablonu (`day-1-report.md` 18:00'de yazılacak)

```markdown
# Pilot Day-1 Raporu — 28 Nis 2026

## Tamamlanan İşler
- [ ] F03 ✅ / ❌
- [ ] F04 ✅ / ❌
...

## Karşılaşılan Hatalar
- (varsa)

## Sprint I İçin Re-prioritize Edilen Bulgular
- (Day-1 verilerine göre)

## Kullanıcı Geri Bildirimleri (4 lokasyon)
- HQ: ...
- Fabrika: ...
- Işıklar: ...
- Lara: ...
```
