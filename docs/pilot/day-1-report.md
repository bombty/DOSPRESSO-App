# Pilot Day-1 Raporu — 28 Nis 2026

**Status**: 📝 ŞABLON (Pazartesi 18:00 doldurulacak)  
**Hazırlayan**: Replit Agent  
**Karar Mercii**: Aslan  
**Karar Saati**: 28 Nis 2026 18:30

---

## A. 4 Sayısal Eşik Ölçümü

### Eşik 1 — Login Success Rate

```sql
WITH attempts AS (
  SELECT
    count(*) FILTER (WHERE action = 'LOGIN_SUCCESS') AS success,
    count(*) FILTER (WHERE action IN ('LOGIN_SUCCESS','LOGIN_FAILED')) AS total
  FROM audit_logs
  WHERE created_at >= '2026-04-28 09:00'
    AND created_at <  '2026-04-28 18:00'
)
SELECT success, total, ROUND(100.0 * success / NULLIF(total,0), 2) AS pct FROM attempts;
```

| Metrik | Değer | Eşik | Durum |
|---|---|---|---|
| Başarılı login | __ | — | — |
| Toplam deneme | __ | — | — |
| Başarı oranı | __% | > %95 | __ ✅/❌ |

### Eşik 2 — Task Completion (lokasyon başına)

```sql
SELECT b.name, count(*) AS completed_tasks
FROM tasks t
JOIN branches b ON t.branch_id = b.id
WHERE t.completed_at >= '2026-04-28 09:00'
  AND t.completed_at <  '2026-04-28 23:59'
  AND b.id IN (5, 8, 23, 24)
GROUP BY b.id, b.name
ORDER BY b.id;
```

| Lokasyon | Tamamlanan | Eşik | Durum |
|---|---|---|---|
| Işıklar (5) | __ | > 10 | __ |
| Lara (8) | __ | > 10 | __ |
| HQ (23) | __ | > 10 | __ |
| Fabrika (24) | __ | > 10 | __ |
| **Toplam** | __ | > 40 | __ |

### Eşik 3 — Error Rate (5xx)

| Metrik | Değer |
|---|---|
| Toplam istek | __ |
| 5xx hata sayısı | __ |
| Hata oranı | __% |
| Eşik | < %5 |
| Durum | __ ✅/❌ |

### Eşik 4 — Day-1 Smoke Test (8 madde)

| # | Test | Sonuç |
|---|---|---|
| 1 | adminhq yeni parola login | __ |
| 2 | 4 lokasyon `setup_complete=true` | __ |
| 3 | Eren mali panel 200 OK | __ |
| 4 | Mudur dashboard `branch_score_detail` | __ |
| 5 | Test Branch sidebar'da yok | __ |
| 6 | Nisan bordro 31 user > 0 ücret | __ |
| 7 | Notification spam ≤ 10 | __ |
| 8 | F04 backup user login (3 user) | __ |

**Skor**: __/8 (Eşik: ≥ 7)

---

## B. Karar

```
4 eşikten kaçı geçti? __/4
```

| Geçen Eşik | Karar |
|---|---|
| 4/4 | ✅ "Pilot tamamen yeşil" — Day-2 normal sprint |
| 3/4 | 🟡 "Pilot devam, dikkatli izle" — fail eşik için Sprint A patch |
| 2/4 | 🔴 KRİZ TOPLANTISI 19:00 (Aslan + IT) — rollback opsiyonu |
| ≤1/4 | 🚨 ROLLBACK kararı (Pazar backup geri yükle) |

**Aslan kararı**: __

---

## C. WhatsApp Pilot Grup Özetleri

### HQ (Branch 23)
- Toplam mesaj: __
- 🚨 KIRMIZI: __ | 🟠 TURUNCU: __ | 🟡 SARI: __ | 🟢 YEŞİL: __
- Çözülen: __ | Pending: __ | Sprint A'ya: __

### Fabrika (Branch 24)
- Toplam mesaj: __
- 🚨 KIRMIZI: __ | 🟠 TURUNCU: __ | 🟡 SARI: __ | 🟢 YEŞİL: __
- Çözülen: __ | Pending: __ | Sprint A'ya: __

### Işıklar (Branch 5)
- Toplam mesaj: __
- 🚨 KIRMIZI: __ | 🟠 TURUNCU: __ | 🟡 SARI: __ | 🟢 YEŞİL: __
- Çözülen: __ | Pending: __ | Sprint A'ya: __

### Lara (Branch 8)
- Toplam mesaj: __
- 🚨 KIRMIZI: __ | 🟠 TURUNCU: __ | 🟡 SARI: __ | 🟢 YEŞİL: __
- Çözülen: __ | Pending: __ | Sprint A'ya: __

---

## D. Bulgular & Sprint A Patch Listesi

| # | Bulgu | Aciliyet | Önerilen Aksiyon | Sahip |
|---|---|---|---|---|
| 1 | __ | __ | __ | __ |

---

## E. Day-2 Aksiyon Planı (29 Nis Salı)

- [ ] __
- [ ] __

---

## F. Performans Snapshot

| Metrik | Değer |
|---|---|
| Aktif kullanıcı sayısı | __ |
| Toplam görev oluşturma | __ |
| Toplam görev tamamlama | __ |
| Müşteri şikayet | __ |
| Stok satınalma talebi | __ |
| Mr. Dobody auto-task | __ |
| OpenAI API çağrı | __ |

---

## G. Rapor Onayı

| Rol | İsim | İmza | Saat |
|---|---|---|---|
| IT | __ | __ | __ |
| Aslan | __ | __ | __ |
| Replit Agent | (otomatik) | ✅ | __ |
