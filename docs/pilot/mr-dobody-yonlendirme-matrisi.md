# Mr. Dobody Yönlendirme Matrisi

**Versiyon:** 1.0 — 21 Nisan 2026
**Kapsam:** DOSPRESSO platform agent routing sistemi
**Kaynak kod:** `server/agent/routing.ts` + `server/routes/seed.ts`

---

## 🤖 Mr. Dobody Nedir?

**DOĞRU ANLAYIŞ:**
- Mr. Dobody = **Otomatik sistem uyarı + yönlendirme ajanı**
- Sistem olayları (düşük performans, stok, kalite sapması vb.) → ilgili role bildirim
- **Kullanıcıdan mesaj KABUL ETMEZ** — proaktif, reaktif değil
- Cowork (chat) kullanıcılar arası, Mr. Dobody o sohbette yer almaz

**YANLIŞ ANLAYIŞ (eski cheat-sheet'lerde düzeltildi):**
- ❌ "Mr. Dobody'e yaz, yönlendirir" — Mr. Dobody mesaj okumaz
- ❌ "Acil durumda Mr. Dobody" — acil durum kategorisi yok
- ❌ "Mr. Dobody chatbot" — chatbot değil, sistem ajanı

---

## 📊 Routing Kuralları Tablosu (Seed)

Aşağıdaki 15 kural `agentRoutingRules` tablosunda seed edilir. Her kural: **kategori + subcategory → primary role + secondary role + escalation role**.

| Kategori | Subcategory | Primary | Secondary | Escalation | Gün |
|---|---|---|---|---|---|
| performance | low_score | coach | supervisor | cgo | 3 |
| performance | absence | supervisor | coach | cgo | 3 |
| performance | promotion_ready | coach | trainer | cgo | 7 |
| training | overdue | trainer | supervisor | cgo | 5 |
| training | low_quiz_score | trainer | — | coach | 5 |
| operations | checklist_missed | supervisor | mudur | cgo | 2 |
| operations | stock_low | supervisor | satinalma | cgo | 1 |
| quality | customer_complaint | kalite_kontrol | supervisor | cgo | 1 |
| quality | low_satisfaction | kalite_kontrol | supervisor | cgo | 3 |
| factory | production_miss | fabrika_mudur | — | cgo | 2 |
| factory | high_waste | fabrika_mudur | gida_muhendisi | cgo | 2 |
| factory | haccp_fail | gida_muhendisi | fabrika_mudur | ceo | 1 |
| strategic | branch_risk | cgo | ceo | — | — |
| strategic | franchise_issue | cgo | ceo | — | — |
| strategic | trend_analysis | cgo | — | — | — |

**Default fallback:** Kural eşleşmezse → `cgo` (yani Aslan'a yönlendirilir)

---

## 🔄 Routing Mantığı

```
Sistem olayı tetiklenir
   ↓
routeAgentAction({ category, subcategory, branchId, targetUserId })
   ↓
agentRoutingRules tablosundan eşleşen kural aranır
   ↓
Şube bazlı roller (supervisor, mudur, fabrika_mudur) için:
  → branchId ile kullanıcı bulunur (o şubede o rol)
Genel HQ rolleri için:
  → sistem genelinde rol bulunur
   ↓
Primary role kullanıcısına bildirim gönderilir
Secondary role varsa ek bilgi bildirimi
   ↓
Escalation süresi dolduğunda eskalasyon rolüne devreder (görev henüz kapanmamışsa)
```

---

## ⚠️ Mevcut Sistemde Eksik Kategoriler

Aşağıdaki kategoriler henüz seed EDİLMEDİ. Pilot sürecinde tespit edilip eklenebilir:

| Eksik Kategori | Önerilen Routing | Öncelik |
|---|---|---|
| `emergency.safety` | mudur → ceo, escalation 0 saat | 🔴 Pilot'tan sonra ekle |
| `emergency.staff_injury` | mudur → ceo + muhasebe_ik, escalation 1 saat | 🔴 Pilot'tan sonra ekle |
| `finance.payroll_issue` | muhasebe_ik → cgo | 🟡 Orta |
| `it.system_outage` | destek → teknik → ceo | 🟡 Orta |
| `equipment.breakdown` | teknik → mudur → satinalma | 🟡 Orta |
| `marketing.campaign_issue` | marketing → cgo | 🟢 Düşük |

**Not:** Pilot süresince bu eksiklikler **WhatsApp + Cowork** ile manuel yönetilir.

---

## 🎯 Kullanıcı Perspektifi

### Sistem tetiklenince ne olur?
1. Olay (örn. checklist kaçırıldı)
2. Mr. Dobody routing
3. Primary role kullanıcısı **bildirim + Cowork mesaj** alır
4. Cevap vermezse Escalation Role bir sonraki adımda bildirilir

### Kullanıcı Mr. Dobody'e soru soramaz mı?
- **Hayır** — Mr. Dobody "AI chatbot" değil
- Soru/sorun için: **Cowork (mesaj) → Müdür/Supervisor/Coach**
- Pilot süresince: **WhatsApp Pilot Grubu**

### "Mr. Dobody Önerileri" ne?
- Bazı sayfalarda "Mr. Dobody sana öneriyor" kartları var
- Bunlar `dobodyProposals` tablosundan gelir
- Otomatik AI analizi sonucu üretilir
- Kullanıcı kabul/red yapabilir (kullanıcı→Dobody interaksiyonu sadece bu — mesaj değil)

---

## 🔧 Pilot Süresince Kural Genişletme

Pilot ilk hafta şu kurallar **manuel olarak** eklenebilir (admin panelden):

```sql
-- Örnek: Düzeltici aksiyon (CAPA) geciken
INSERT INTO agent_routing_rules (category, subcategory, description, primary_role, secondary_role, escalation_role, escalation_days)
VALUES ('quality', 'capa_overdue', 'Geciken CAPA', 'kalite_kontrol', 'supervisor', 'cgo', 2);
```

Genişletme için: `server/routes/seed.ts` + `/api/admin/seed-agent-routing` endpoint.

---

## 📚 Cheat-sheet Etkileşimi

Tüm 28 cheat-sheet'te Mr. Dobody **doğru** tanımlanmıştır:

```
🚨 ACİL DURUM
- Yangın: 110 | Sağlık: 112
- Sistem sorunu: Cowork (mesaj) → Müdür veya Supervisor'a DM
- Pilot süresince: WhatsApp "DOSPRESSO Pilot" grubu birincil kanal
- Not: Mr. Dobody otomatik uyarı sistemi (karşılıklı sohbet değil)
```

---

## 🔗 Bağlantılı Dosyalar

- Kod: `server/agent/routing.ts` (132 satır)
- Seed: `server/routes/seed.ts` (`seed-agent-routing` endpoint)
- Schema: `shared/schema/schema-12.ts` (`agentRoutingRules` tablosu)
- Cheat-sheets: `docs/pilot/cheat-sheets/01-admin.md` → `28-yatirimci-branch.md`
- Risk raporu: `docs/pilot/3-kritik-risk-dogrulama.md`

---

**Son güncelleme:** 21 Nisan 2026
**Sorumlu:** Claude (mimari) + Sprint I eklemeleri sonrası güncellenmeli
