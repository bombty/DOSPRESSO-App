# Pilot Başarı Kriterleri — 4 Sayısal Eşik

**Aslan Onayı**: 19 Nis 2026  
**Geçerlilik**: 28 Nis 2026 09:00 — 5 May 2026 18:00 (1 hafta pilot)  
**Karar Mercii**: Aslan + IT (Day-1: 28 Nis 18:00, Day-7: 5 May 18:00)

---

## 1. Karar Kuralı (Tek Cümle)

> **4 eşikten en az 3'ü sağlanırsa pilot devam eder. 2 veya daha az sağlanırsa Aslan + IT acil kriz toplantısı (aynı akşam) yapılır.**

---

## 2. 4 Sayısal Eşik

### Eşik 1 — Login Success Rate > %95

| Tanım | Detay |
|---|---|
| Ne ölçüyoruz | Başarılı login / toplam login denemesi |
| Veri kaynağı | `audit_logs` action='LOGIN_SUCCESS' / ('LOGIN_SUCCESS' + 'LOGIN_FAILED') |
| Kapsam | 4 pilot lokasyon kullanıcıları (branch_id IN 5, 8, 23, 24) |
| Eşik | **> %95** |
| Ölçüm dönemi | Day-1: 09:00-18:00 (9 saat) / Day-7: kümülatif 7 gün |
| FAIL örneği | %85 → 6 kullanıcı parolasını hatırlamıyor / sistem kilidi |

**Ölçüm SQL**:
```sql
WITH attempts AS (
  SELECT
    count(*) FILTER (WHERE action = 'LOGIN_SUCCESS') AS success,
    count(*) FILTER (WHERE action IN ('LOGIN_SUCCESS','LOGIN_FAILED')) AS total
  FROM audit_logs
  WHERE created_at >= '2026-04-28 09:00'
    AND created_at <  '2026-04-28 18:00'
)
SELECT success, total, ROUND(100.0 * success / NULLIF(total,0), 2) AS pct
FROM attempts;
```

---

### Eşik 2 — Task Completion > 10/gün/lokasyon

| Tanım | Detay |
|---|---|
| Ne ölçüyoruz | `tasks.status='completed'` count / lokasyon / gün |
| Veri kaynağı | `tasks` tablosu, `branch_id` + `completed_at` |
| Kapsam | 4 pilot lokasyon × 1 gün |
| Eşik | **> 10 task/lokasyon/gün** (toplam ≥ 40) |
| Mantık | Tipik şubede günlük 15-20 operasyonel task → 10 = %50-67 minimum kullanım |
| FAIL örneği | HQ 25, Fabrika 18, Işıklar 4, Lara 6 → 2 lokasyon eşik altı |

**Ölçüm SQL**:
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

---

### Eşik 3 — Error Rate (5xx) < %5

| Tanım | Detay |
|---|---|
| Ne ölçüyoruz | HTTP 5xx response sayısı / toplam response |
| Veri kaynağı | Server access log (Replit deployment logs) veya `audit_logs` action='API_ERROR' |
| Kapsam | Tüm `/api/*` çağrıları, 09:00-18:00 |
| Eşik | **< %5** (yani 100 istekten 95+ başarılı) |
| FAIL örneği | %12 → DB connection pool yetersiz, OpenAI rate limit, vb. |

**Ölçüm**: Replit deployment logs üzerinden grep:
```bash
# Pseudo-counter — Pazartesi gerçek log path'inden çekilecek
total=$(wc -l < /var/log/app/access.log)
errors=$(grep -E ' 5[0-9][0-9] ' /var/log/app/access.log | wc -l)
echo "scale=2; 100 * $errors / $total" | bc
```

---

### Eşik 4 — Day-1 Smoke Test Pass > 7/8

`docs/pilot/pzt-28-nis-sprint-plan.md` §6'daki 8 maddelik smoke test checklist:

| # | Test | PASS Kriteri |
|---|---|---|
| 1 | adminhq yeni parola login | 200 OK + dashboard yüklenir |
| 2 | 4 lokasyon müdür `setup_complete=true` | Onboarding wizard ÇIKMAZ |
| 3 | Eren (`fabrika_mudur`) mali panel | 200 OK (403 yok) |
| 4 | Mudur dashboard `branch_score_detail` widget | Görünür + data döner |
| 5 | Test Branch sidebar'da görünmüyor | Soft-deleted, listelenmez |
| 6 | Nisan bordro 31 user için ücret hesaplı | Tüm satırlar `amount > 0` |
| 7 | Notification spam | Son 1 saatte ≤10 escalation |
| 8 | F04 backup user login | 3 backup user başarılı login |

**Eşik**: 8/8 ideal, **7/8 kabul**, 6/8 → kriz.

---

## 3. Day-1 Karar Akışı (28 Nis 18:00)

```
Smoke test bitti → 4 eşik ölçüldü
        ↓
   ┌────┴────┐
   │ 4/4 ✅  │ → "Pilot tamamen yeşil" — Day-2 normal sprint
   ├────┬────┤
   │ 3/4 🟡 │ → "Pilot devam ediyor, dikkatli izle" — fail eşik için Sprint A patch
   ├────┬────┤
   │ 2/4 🔴 │ → KRİZ TOPLANTISI 19:00 (Aslan + IT) — rollback opsiyonu masada
   ├────┬────┤
   │ ≤1/4 🚨 │ → ROLLBACK kararı (Pazar 23:00 backup geri yükle)
   └─────────┘
```

---

## 4. Day-7 Final Karar (5 May 2026 18:00)

| Sonuç | Karar |
|---|---|
| 4/4 tüm hafta | ✅ Production rollout planlama (22 şubeye genişletme) |
| 3/4 ortalama | 🟡 Pilot 1 hafta uzatma + tespit edilen sorunlar fix |
| 2/4 ortalama | 🔴 Pilot askıya alma + 4 hafta refactor |
| ≤1/4 | 🚨 Pilot iptal + projenin yeniden değerlendirilmesi |

---

## 5. Sorumluluklar

| Eşik | Ölçüm Sorumlusu | Raporlayan |
|---|---|---|
| 1. Login success | Replit Agent | Day-1 raporu §A |
| 2. Task completion | Replit Agent (SQL) | Day-1 raporu §A |
| 3. Error rate | IT (deployment logs) | Day-1 raporu §A |
| 4. Smoke test | Replit Agent | Day-1 raporu §B |

**Karar mercii**: Aslan (4/4 ve 3/4 kararları için), Aslan + IT (2/4 ve aşağısı için).
