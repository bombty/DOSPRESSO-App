# 🔀 DOSPRESSO — Modül Akış Haritası

> **Bu doküman ne için?** 11 ana modülün **end-to-end iş akışlarını** Mermaid sequence diyagramlarıyla gösterir. Bir senaryo (örn. müşteri şikâyeti) baştan sona hangi rollerden geçer, hangi onayları alır, hangi tabloya yazılır — tek bakışta görünür.
>
> **Kullanım:** Master harita (`docs/SISTEM-VE-ROLLER-MASTER.md`) modülleri tanıttı. Bu doküman modüller arasındaki iş akışlarını derinleştirir.

---

## İçerik

1. [Görev (m05) — Tipik Görev Yaşam Döngüsü](#1-görev-m05--tipik-görev-yaşam-döngüsü)
2. [İK (m02) — İzin Talebi → Çift Onay](#2-i̇k-m02--i̇zin-talebi--çift-onay)
3. [Akademi (m07) — Stajyer Onboarding 14 Günü](#3-akademi-m07--stajyer-onboarding-14-günü)
4. [Fabrika (m09) — Reçete → Plan → Üretim → Sevkiyat](#4-fabrika-m09--reçete--plan--üretim--sevkiyat)
5. [CRM (m08) — Müşteri Şikâyeti → Atama → Çözüm](#5-crm-m08--müşteri-şikâyeti--atama--çözüm)
6. [Kalite (m05/m20) — Denetim → Düzeltici Faaliyet](#6-kalite-m05m20--denetim--düzeltici-faaliyet)
7. [Ekipman (m06) — Arıza Bildirimi → Servis](#7-ekipman-m06--arıza-bildirimi--servis)
8. [Satınalma (m10) — PO → Mal Kabul → Ödeme](#8-satınalma-m10--po--mal-kabul--ödeme)
9. [Vardiya (m03) — Kiosk PIN Login → Check-in/out](#9-vardiya-m03--kiosk-pin-login--check-inout)
10. [Mr. Dobody (m12) — AI Öneri Zinciri](#10-mr-dobody-m12--ai-öneri-zinciri)
11. [Bildirim (m05) — 4-Katmanlı Bildirim Akışı](#11-bildirim-m05--4-katmanlı-bildirim-akışı)
12. [Pilot Launch — GO/NO-GO Akışı](#12-pilot-launch--gono-go-akışı)

---

## 1. Görev (m05) — Tipik Görev Yaşam Döngüsü

**Senaryo:** Saha Koçu (coach) bir şube müdürüne (mudur) "Bu hafta vitrin temizliği fotoğraflı" görevini atar. Müdür kabul eder, baristaya devreder, barista kanıt yükler, koç onaylar.

```mermaid
sequenceDiagram
  participant C as Coach (HQ)
  participant DB as DB (tasks)
  participant N as Notification
  participant M as Mudur (Şube)
  participant B as Barista
  participant E as Object Storage

  C->>DB: POST /api/tasks (create + assign mudur)
  DB-->>N: trigger notification
  N->>M: push + e-mail "Yeni görev"
  M->>DB: PATCH /api/tasks/:id/accept
  M->>DB: POST /api/tasks/:id/reassign (delegate barista)
  N->>B: push "Yeni atama"
  B->>DB: PATCH /api/tasks/:id/accept
  B->>E: PUT photo.jpg
  E-->>B: returns object_url
  B->>DB: POST /api/tasks/:id/evidence (object_url)
  B->>DB: PATCH /api/tasks/:id/status=DONE
  N->>C: push "Tamamlandı, onay bekliyor"
  C->>DB: PATCH /api/tasks/:id/approve (rating=5)
  N->>B: push "Onaylandı +puan"
  N->>M: push "Ekip puan +"
```

**Status zinciri:** `OPEN → ACCEPTED → IN_PROGRESS → DONE → APPROVED` (alternatif: `REJECTED`, `REASSIGNED`)
**Tablolar:** `tasks`, `task_assignees`, `task_comments`, `task_evidence`, `notifications`
**Kanıt depolama:** Replit Object Storage (`PRIVATE_OBJECT_DIR` altında)
**Rate sınırı:** Bir kullanıcıya günlük max 20 görev (anti-spam)

---

## 2. İK (m02) — İzin Talebi → Çift Onay

**Senaryo:** Barista 3 günlük yıllık izin talep eder. Şube müdürü ön-onay verir, İK (muhasebe_ik) final onay verir, bordroya yansır.

```mermaid
sequenceDiagram
  participant B as Barista
  participant DB as DB (leave_requests)
  participant N as Notification
  participant M as Mudur
  participant IK as Muhasebe_IK
  participant P as Payroll

  B->>DB: POST /api/leaves (start, end, type=YILLIK)
  Note over DB: status=PENDING_MANAGER
  DB-->>N: trigger
  N->>M: "İzin onayı bekliyor"
  M->>DB: PATCH /api/leaves/:id/manager-approve
  Note over DB: status=PENDING_HR
  N->>IK: "İK onayı bekliyor"
  IK->>DB: PATCH /api/leaves/:id/hr-approve
  Note over DB: status=APPROVED
  DB->>P: trigger payroll adjustment
  N->>B: "İzin onaylandı"
  N->>M: "Ekip planlamaya yansıdı"
```

**Onay matrisi:** Bkz. `docs/role-flows/00-cross-role-matrix.md` §3 Boyut 2 — Onay Matrisi.
**Reddetme:** Herhangi bir aşamada `PATCH /reject` ile gerekçe yazılır, talep `REJECTED` olur.
**Veri kilidi:** Onaylandıktan sonra leave_requests kaydı **kilitlenir** (data lock). Değişiklik için change request açılır.

---

## 3. Akademi (m07) — Stajyer Onboarding 14 Günü

**Senaryo:** Yeni işe alınan bir stajyer 14 günlük programa giriyor. Sonunda Gate-0 sınavı geçerse Bar Buddy oluyor.

```mermaid
sequenceDiagram
  participant T as Trainer (HQ)
  participant DB as DB (training, onboarding)
  participant S as Stajyer
  participant M as Mudur (Şube)
  participant N as Notification

  Note over T,S: GÜN 1 — Atama
  T->>DB: POST /api/onboarding/programs/:id/assign-user
  DB->>S: Otomatik 14 günlük takvim oluşturuldu
  N->>S: "Onboarding başladı"
  N->>M: "Yeni stajyer ekibinde"

  Note over S: GÜN 1-7 — Hafta 1 (Temel Oryantasyon)
  loop Her gün
    S->>DB: GET /api/academy/today (NBA modüller)
    S->>DB: POST /api/quiz/:id/submit
  end

  Note over S: GÜN 8-14 — Hafta 2 (Uygulama)
  S->>DB: Saha pratiği + günlük checklist

  Note over S,T: GÜN 14 — Gate-0 Sınavı
  S->>DB: POST /api/quiz/gate-0/submit
  alt Score ≥ 70
    DB->>S: Status=PASSED
    DB->>S: role=bar_buddy (auto-promote)
    N->>S: "🎉 Bar Buddy oldun"
    N->>T: "Stajyer geçti"
  else Score < 70
    DB->>S: Status=RETRY (3 hak)
    N->>S: "Yeniden deneme: 3 gün sonra"
  end
```

**Eğitim yolu:** `stajyer → bar_buddy → barista → supervisor_buddy → supervisor`
**NBA (Next Best Action) motoru:** `docs/01-user-flows.md` §5 detayları içerir
**Sertifika:** Her gate sonrası `issued_certificates` tablosuna kayıt + PDF üretimi

---

## 4. Fabrika (m09) — Reçete → Plan → Üretim → Sevkiyat

**Senaryo:** Yeni bir reçete (recete_gm onayıyla) sisteme girer, fabrika müdürü haftalık plana ekler, üretim şefi günlük dağıtır, operatör batch üretir, depo şubeye sevk eder.

```mermaid
sequenceDiagram
  participant RG as Recete_GM
  participant FM as Fabrika_Mudur
  participant US as Uretim_Sefi
  participant FO as Fabrika_Operator
  participant FD as Fabrika_Depo
  participant DB as DB
  participant SUBE as Şube Mudur
  participant QC as Kalite_Kontrol

  Note over RG,DB: AŞAMA 1 — Reçete Onayı
  RG->>DB: POST /api/factory-recipes (yeni reçete)
  DB-->>RG: status=DRAFT
  RG->>DB: PATCH /api/factory-recipes/:id/approve
  DB-->>RG: status=APPROVED, version+1

  Note over FM,DB: AŞAMA 2 — Haftalık Plan
  FM->>DB: POST /api/production-plans (week=2026-W18)
  FM->>DB: POST /api/production-plans/:id/items (recipe×qty×day)
  FM->>DB: PATCH /api/production-plans/:id/status=APPROVED

  Note over US,FO: AŞAMA 3 — Günlük Üretim
  US->>DB: POST /api/production-batches (assign worker)
  FO->>DB: POST /api/batches/:id/start (clock-in)
  FO->>DB: POST /api/batches/:id/lots (lot_no + SKT)
  FO->>DB: POST /api/batches/:id/end (qty produced)

  Note over QC,DB: AŞAMA 4 — Kalite Kontrol
  QC->>DB: POST /api/qc-checks (batch_id, score)
  alt QC PASS
    DB->>FD: enable shipment
  else QC FAIL
    DB->>FO: rework required
    Note over FO: Geri batch'e dön
  end

  Note over FD,SUBE: AŞAMA 5 — Sevkiyat
  FD->>DB: POST /api/shipments (lot, qty, branch_id)
  Note over FD: FEFO/SKT kontrolü otomatik
  SUBE->>DB: POST /api/shipments/:id/receive
  DB-->>SUBE: stok güncellendi
```

**Tablolar:** `factory_recipes`, `weekly_production_plans`, `production_plan_items`, `production_batches`, `lots`, `qc_checks`, `shipments`
**FEFO (First-Expired-First-Out):** Depo otomatik en yakın SKT'yi seçer
**SPOF:** `recete_gm` rolü tek kullanıcı — hastalık/izin riski (FINDINGS #2)

---

## 5. CRM (m08) — Müşteri Şikâyeti → Atama → Çözüm

**Senaryo:** Müşteri QR feedback ile "Kahvem soğuktu" şikâyeti yazar. Otomatik kategoriye düşer, destek atar, müdür çözer, müşteriye geri bildirim gönderilir.

```mermaid
sequenceDiagram
  participant Q as Müşteri (QR)
  participant DB as DB (guest_complaints)
  participant CAT as Auto-Categorize
  participant SLA as SLA Scheduler
  participant DES as Destek (HQ)
  participant M as Mudur (Şube)
  participant N as Notification
  participant KK as Kalite_Kontrol

  Q->>DB: POST /api/feedback (qr_code, text, rating=2)
  DB->>CAT: AI categorize → category=URUN_KALITE, severity=ORTA
  DB-->>SLA: timer start (24h SLA)
  N->>DES: "Yeni şikâyet (ORTA)"
  N->>M: "Şubende şikâyet var"

  DES->>DB: PATCH /api/complaints/:id/assign (assignee=mudur_id)
  M->>DB: PATCH /api/complaints/:id/start
  M->>DB: POST /api/complaints/:id/actions (taken_action="Personel uyarıldı")
  M->>DB: PATCH /api/complaints/:id/status=RESOLVED

  alt SLA aşıldı (>24h)
    SLA->>KK: ESCALATE
    N->>KK: "Eskalasyon — ORTA şikâyet 24h+"
    KK->>DB: PATCH /api/complaints/:id/escalate
  end

  DES->>DB: POST /api/complaints/:id/customer-reply (e-mail/sms)
  DB->>Q: müşteriye geri bildirim
  Q->>DB: PATCH /api/complaints/:id/customer-confirm (resolved=true)
```

**Severity skalası:** DUSUK (72h SLA), ORTA (24h), YUKSEK (4h), KRITIK (1h)
**Kategori örnekleri:** URUN_KALITE, HIZ, NEZAKET, FIYAT, TEMIZLIK
**Eskalasyon zinciri:** destek → mudur → kalite_kontrol → cgo

---

## 6. Kalite (m05/m20) — Denetim → Düzeltici Faaliyet

**Senaryo:** Saha koçu (coach) bir şubeye habersiz denetime gider, audit_v2 şablonunu kullanır, eksiklik bulur, düzeltici faaliyet açılır, müdür düzeltir, re-denetim yapılır.

```mermaid
sequenceDiagram
  participant C as Coach
  participant DB as DB (audit_v2)
  participant M as Mudur
  participant N as Notification
  participant CGO as CGO

  C->>DB: GET /api/audit-templates-v2 (kategori=HIJYEN)
  C->>DB: POST /api/audits-v2 (template_id, branch_id)
  Note over DB: status=DRAFT

  loop Her checklist item
    C->>DB: POST /api/audits-v2/:id/items (item_id, score, photo)
  end

  C->>DB: PATCH /api/audits-v2/:id/finalize
  DB-->>DB: total_score hesaplandı (örn 65/100)

  alt total_score < 70
    DB->>DB: corrective_actions otomatik açıldı
    N->>M: "Denetim 65/100 — düzeltici faaliyet"
    N->>CGO: "Düşük puan denetim raporu"
  end

  M->>DB: GET /api/corrective-actions/branch/:id
  M->>DB: PATCH /api/corrective-actions/:id (status=IN_PROGRESS)
  M->>DB: POST /api/corrective-actions/:id/evidence (photo)
  M->>DB: PATCH /api/corrective-actions/:id (status=COMPLETED)

  C->>DB: POST /api/audits-v2 (re-audit)
  Note over C,DB: re-audit başarılıysa → CLOSED
```

**Tablolar:** `audit_templates_v2`, `audits_v2`, `audit_v2_items`, `corrective_actions`, `corrective_action_evidence`
**Eşik:** <70 düşük, 70-85 orta, >85 yüksek skor
**Re-denetim:** Düzeltici faaliyet kapandıktan max 14 gün sonra zorunlu

---

## 7. Ekipman (m06) — Arıza Bildirimi → Servis

**Senaryo:** Barista espresso makinesinde arıza fark eder, fotoğrafla bildirir. Teknik ekibe atanır, parça gelir, servis yapılır, kapatılır.

```mermaid
sequenceDiagram
  participant B as Barista/Supervisor
  participant DB as DB (equipment_faults)
  participant N as Notification
  participant T as Teknik
  participant M as Mudur

  B->>DB: POST /api/equipment-faults (equipment_id, photo, desc)
  Note over DB: status=REPORTED, severity=auto-detect
  N->>T: "Yeni arıza"
  N->>M: "Şubende arıza"

  T->>DB: GET /api/equipment-faults?status=REPORTED
  T->>DB: PATCH /api/faults/:id (status=ASSIGNED, assignee=t_user)
  T->>DB: POST /api/faults/:id/diagnosis (cause, parts_needed)

  alt Parça stokta
    T->>DB: PATCH /api/faults/:id (status=IN_PROGRESS)
  else Parça yok
    T->>DB: POST /api/parts-orders (supplier_id)
    Note over T: bekleme: parça gelene kadar
  end

  T->>DB: POST /api/maintenance-logs (action_taken, parts_used)
  T->>DB: PATCH /api/faults/:id (status=RESOLVED)
  N->>B: "Arıza giderildi, test et"
  B->>DB: PATCH /api/faults/:id/customer-confirm (working=true)
  Note over DB: status=CLOSED
```

**Tablolar:** `equipment`, `equipment_faults`, `maintenance_logs`, `parts_orders`
**Periyodik bakım:** Scheduler her ay otomatik task açar (m12 dobody üzerinden)

---

## 8. Satınalma (m10) — PO → Mal Kabul → Ödeme

**Senaryo:** Şube müdürü kahve çekirdeği ister, satınalma tedarikçi seçer, PO açar, fabrika depo mal kabul yapar, muhasebe öder.

```mermaid
sequenceDiagram
  participant M as Mudur (Şube)
  participant SAT as Satinalma
  participant DB as DB (purchase_orders)
  participant SUP as Tedarikçi (dış)
  participant FD as Fabrika_Depo
  participant MUH as Muhasebe
  participant N as Notification

  M->>DB: POST /api/branch-orders (item, qty, target_date)
  Note over DB: status=REQUESTED
  N->>SAT: "Şube siparişi"

  SAT->>DB: GET /api/suppliers (item bazında)
  SAT->>DB: POST /api/purchase-orders (supplier_id, items, total)
  Note over DB: status=PENDING_APPROVAL

  alt total > 5000 TL
    N->>MUH: "Yüksek tutar onay"
    MUH->>DB: PATCH /api/po/:id/approve
  else total ≤ 5000 TL
    SAT->>DB: PATCH /api/po/:id/approve (auto)
  end

  SAT->>SUP: PO PDF e-mail / sistem dışı
  Note over SUP: Tedarikçi mal hazırlar

  SUP->>FD: Fiziksel teslimat
  FD->>DB: POST /api/goods-receipts (po_id, qty_received, qc_pass=true)
  Note over DB: PO status=DELIVERED

  MUH->>DB: GET /api/po?status=DELIVERED&payment=PENDING
  MUH->>DB: POST /api/payments (po_id, amount, method=EFT)
  Note over DB: PO status=PAID, cari güncellendi
```

**Tablolar:** `purchase_orders`, `purchase_order_items`, `suppliers`, `goods_receipts`, `payments`, `branch_financial_summary`
**Onay eşikleri:** ≤5000 TL satinalma yetkili, >5000 TL muhasebe onayı, >50000 TL ceo onayı
**Cari takip:** Her ödeme `branch_financial_summary` ve tedarikçi cari hesabını günceller

---

## 9. Vardiya (m03) — Kiosk PIN Login → Check-in/out

**Senaryo:** Barista sabah şubeye gelir, kiosk cihazından 4-haneli PIN girer, vardiyasına check-in yapar, mola verir, check-out yapar.

```mermaid
sequenceDiagram
  participant B as Barista (fiziksel)
  participant K as Kiosk (tablet)
  participant API as /api/kiosk
  participant DB as DB (kiosk_sessions, attendance)
  participant N as Notification
  participant M as Mudur

  B->>K: PIN 4-hane gir
  K->>API: POST /api/kiosk/pin-login
  API->>DB: bcrypt.compare(pin)
  alt PIN doğru
    DB->>API: kiosk_session UUID üret
    API-->>K: x-kiosk-token header
    K->>API: GET /api/kiosk/my-shift (today)
    API->>K: shift_id, start_time
  else PIN yanlış
    API-->>K: 401, attempts++
    Note over K: 3 yanlış → 5 dk lock
  end

  K->>API: POST /api/shift-attendance/check-in
  Note over DB: attendance.status=PRESENT, check_in=NOW()
  N->>M: "Barista geldi"

  Note over B: Vardiya boyunca

  B->>K: "Mola başlat"
  K->>API: POST /api/shift-attendance/break-start
  Note over DB: break_start=NOW()

  B->>K: "Mola bitti"
  K->>API: POST /api/shift-attendance/break-end

  Note over B: Vardiya sonu

  B->>K: "Çıkış"
  K->>API: POST /api/shift-attendance/check-out
  Note over DB: check_out=NOW(), worked_hours hesaplandı

  alt SLA: PDKS Excel import gece
    Note over DB: Otomatik puantaj hesabı + bordro pre-calc
  end
```

**Tablolar:** `shifts`, `shift_attendance`, `kiosk_sessions`
**Kiosk token TTL:** Vardiya sonuna kadar (max 12h)
**PIN brute force koruması:** 3 yanlış → 5 dk lock + audit log
**Mobile QR alternatifi:** `mobile_qr` flag açıksa kuryeler/saha için QR kod tarama (TASK-004 audit edilecek)

---

## 10. Mr. Dobody (m12) — AI Öneri Zinciri

**Senaryo:** Agent gece KPI analizi yapar, "Lara şubesi son 7 gün cila puanı düşüyor" tespit eder, öneri kartı oluşturur, koç onaylar, otomatik task açılır.

```mermaid
sequenceDiagram
  participant SCH as Agent Scheduler (cron)
  participant AE as Agent Engine
  participant DB as DB
  participant DP as dobody_proposals
  participant C as Coach
  participant T as Tasks Module
  participant M as Mudur

  Note over SCH: Her gün 03:00
  SCH->>AE: trigger nightly KPI scan
  AE->>DB: SELECT branch metrics last 7d
  AE->>AE: anomaly detection (z-score)

  alt anomali tespit
    AE->>DP: INSERT proposal (action_type=SUGGEST_TASK)
    Note over DP: status=PROPOSED, owner=coach
    DP->>C: notification (sabah 07:00 batch)
  end

  C->>DP: GET /api/dobody-proposals?owner=me
  C->>DP: PATCH /api/dobody-proposals/:id/review

  alt Coach onaylar
    DP->>T: POST /api/tasks (auto-create with template)
    T->>M: notification "Cila kontrolü"
    DP-->>DP: status=ACCEPTED
  else Coach reddeder
    C->>DP: PATCH /api/proposals/:id/reject (reason)
    DP-->>DP: status=REJECTED
    Note over AE: ML feedback loop
  end

  Note over T: Görev m05 yaşam döngüsüne girer
```

**Aksiyon türleri:** Remind, Escalate, Report, Suggest Task
**ML feedback:** Reddedilen öneriler agent'ın ileride benzer önerileri filtrelemesini sağlar
**Detay:** `docs/DOBODY-AGENT-PLAN.md`, `docs/dobody-security-spec.md`

---

## 11. Bildirim (m05) — 4-Katmanlı Bildirim Akışı

**Senaryo:** Bir günde aynı kullanıcıya farklı katmanlardan bildirim düşer. Sistem önceliklendirme + frekans kontrolü yapar.

```mermaid
sequenceDiagram
  participant SRC as Çeşitli kaynaklar
  participant N as Notification Service
  participant PREF as notification_preferences
  participant DB as notifications
  participant USER as Kullanıcı

  Note over SRC,N: Anlık tetikleyiciler
  SRC->>N: trigger (type, severity, role_target)

  N->>PREF: GET user preferences
  alt Operasyonel (P0 — anlık)
    N->>USER: push (ekrana hemen)
    N->>DB: INSERT (instant=true)
  else Taktik (P1 — saatlik özet)
    N->>DB: queue (delivery_at=next_hour)
  else Stratejik (P2 — günlük özet)
    N->>DB: queue (delivery_at=18:00)
  else Kişisel (P3 — anlık + e-mail)
    N->>USER: push
    N->>USER: e-mail (SMTP IONOS)
    N->>DB: INSERT (channels=[push, email])
  end

  Note over USER: Saatlik/Günlük cron
  loop Her saat (taktik)
    DB->>N: SELECT pending where delivery_at<=NOW()
    N->>USER: digest push
  end

  USER->>DB: PATCH /api/notifications/:id/read
  USER->>DB: POST /api/notifications/:id/archive

  alt User snooze
    USER->>PREF: PATCH category=URUN_KALITE/snooze=24h
  end
```

**Katman sembolleri:** P0 (kırmızı), P1 (turuncu), P2 (mavi), P3 (yeşil)
**Push:** Web Push API (PWA), email: IONOS SMTP
**Audit:** `bildirim-sistemi-v2-audit-raporu.md`

---

## 12. Pilot Launch — GO/NO-GO Akışı

**Senaryo:** 28 Nis 2026 Salı 09:00 pilot başlar. İlk gün sonunda 4 sayısal eşik ölçülür, 4/3 kuralıyla ertesi gün GO veya NO-GO kararı verilir.

```mermaid
sequenceDiagram
  participant A as Admin (Aslan)
  participant API as /api/admin/pilot-launch
  participant DB as DB
  participant SCH as Pilot Scheduler
  participant USERS as 4 Pilot Şube
  participant DASH as Pilot Day-1 Dashboard

  Note over A: T-1 (Pazartesi 28 Nis sabah)
  A->>API: POST /api/admin/pilot-launch
  Note over API: Cleanup: notifications, audit_logs, perf scores
  Note over API: mustChangePassword=false (zaten temiz)
  API->>USERS: parola rotasyon (1Password'e geçiş)

  Note over A: T0 (Salı 09:00 — Faz 1)
  A->>API: POST /api/admin/pilot-go-live (branches=[5,23])
  USERS->>API: login, task, kiosk vb. her aksiyon
  SCH->>DB: her saat KPI snapshot

  Note over DASH: Day-1 sonu (29 Nis 09:00)
  DASH->>DB: SELECT pilot KPIs

  Note over DASH: 4 Eşik kontrol
  alt Login success >%95
    Note over DASH: ✓ Eşik 1 PASS
  end
  alt Task >10/lokasyon
    Note over DASH: ✓ Eşik 2 PASS
  end
  alt Error <%5
    Note over DASH: ✓ Eşik 3 PASS
  end
  alt Smoke ≥7/8
    Note over DASH: ✓ Eşik 4 PASS
  end

  alt 4/3 PASS (en az 3 eşik tuttu)
    DASH->>A: "GO — Faz 2 başlat"
    A->>API: POST /api/admin/pilot-go-live (branches=[8,24])
    Note over USERS: Lara + Fabrika devreye girdi
  else 4/3 FAIL (3+ eşik düştü)
    DASH->>A: "NO-GO — rollback"
    A->>API: POST /api/admin/pilot-rollback
    Note over DB: Faz 1 verileri arşivlendi, sistem pre-pilot state
  end
```

**Kaynaklar:**
- `docs/pilot/success-criteria.md` — eşik tanımları
- `docs/pilot/day-1-report.md` — rapor template
- `scripts/pilot/00-db-isolation.sql` — Pazar 22:30 mantıksal izolasyon
- `scripts/pilot/yuk-testi-5-user.ts` — gerçek 5-user yük testi (adminhq 4-step ✅ avg 178ms, max 463ms)

---

## 📌 Özet Tablo: Akış × Modül × Roller

| Akış | Ana Modül | Tetikleyen Rol | Onaylayan Rol(ler) | Sonlanış |
|------|-----------|----------------|---------------------|----------|
| Görev yaşam döngüsü | m05 | herhangi | atayan rol | APPROVED/REJECTED |
| İzin talebi | m02 | personel | mudur + muhasebe_ik | APPROVED → bordro |
| Stajyer onboarding | m07 | trainer | trainer (gate-0) | role auto-promote |
| Üretim sevkiyat | m09 | recete_gm + fabrika_mudur | kalite_kontrol QC | shipment.received |
| Müşteri şikâyet | m08 | müşteri (QR) | mudur + destek | RESOLVED + reply |
| Denetim | m05/m20 | coach | coach (re-audit) | CLOSED |
| Arıza | m06 | personel | teknik | CLOSED |
| Satınalma | m10 | mudur | satinalma + muhasebe | PAID |
| Vardiya check-in | m03 | personel (kiosk) | mudur (puantaj) | worked_hours |
| AI öneri | m12 | system (cron) | öneri sahibi | task auto-create |
| Bildirim | m05 | her event | n/a | read/archive |
| Pilot launch | system | admin | 4-eşik 4/3 kuralı | GO/NO-GO |

---

**Bağlantılı dokümanlar:**
- Master harita: [`docs/SISTEM-VE-ROLLER-MASTER.md`](./SISTEM-VE-ROLLER-MASTER.md)
- 31 rol detay: [`docs/role-flows/`](./role-flows/)
- Cross-role 4-boyutlu matris: [`docs/role-flows/00-cross-role-matrix.md`](./role-flows/00-cross-role-matrix.md)
- Onay diyagramları (8 senaryo): [`docs/role-flows/00-cross-role-matrix.md`](./role-flows/00-cross-role-matrix.md) §6

---

**Son güncelleme:** 20 Nis 2026 Pazartesi · **Sürüm:** v1.0 · **Sahibi:** Replit Agent
