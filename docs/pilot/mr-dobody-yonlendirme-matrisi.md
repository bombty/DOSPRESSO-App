# Mr. Dobody Yönlendirme Matrisi

**Tarih:** 21 Nisan 2026
**Amaç:** Cheat-sheet'lerdeki "Mr. Dobody seni doğru kişiye yönlendirir" iddiasının teknik dayanak ve rol-bazlı eşleşme tablosu.

---

## 1. Mr. Dobody Sistemi (Doğrulama)

Kod incelemesi ile doğrulanmıştır:

| Bileşen | Konum | Durum |
|---------|-------|-------|
| **AI Chat Endpoint** | `/api/ai/chat` (`server/routes/ceo-command-center-routes.ts`) | ✅ Aktif |
| **Workflow Engine** | `server/lib/dobody-workflow-engine.ts` + `server/services/agent-engine.ts` | ✅ Aktif (proaktif öneriler) |
| **Eskalasyon Servisi** | `server/services/agent-escalation.ts` | ✅ 4-seviye |
| **Routing** | `server/agent/routing.ts` | ✅ Action-based role routing |
| **Severity Sınıflama** | `low / med / high / critical` | ✅ Tüm action'larda |
| **Bildirim** | `storage.createNotification` + `sendNotificationEmail` (L3-L4) | ✅ |
| **Flow Tasks** | `server/routes/dobody-flow.ts` (`/api/dobody/flow-tasks`) | ✅ "My Day" listesi |

**Sonuç:** Cheat-sheet'lerdeki "Mr. Dobody seni doğru kişiye otomatik yönlendirir" iddiası teknik olarak dayanaklıdır.

---

## 2. Eskalasyon Zinciri (4-seviye)

`agent-escalation.ts` baz alındığında:

| Seviye | Süre Sonra | Hedef Rol |
|--------|------------|-----------|
| **L1** | 0 saat | Atanan personel (Assignee) |
| **L2** | 24 saat | Şube Müdürü (Branch Manager) |
| **L3** | 48 saat | HQ Operasyon (Coach / CGO) |
| **L4** | 72 saat | Üst Yönetim (CEO / CGO) |

---

## 3. Action-Type → Hedef Rol Routing

`agent/routing.ts` baz alındığında:

| Sorun Tipi | İlk Hedef | Eskalasyon Yolu |
|------------|-----------|-----------------|
| Denetim hatası (audit fail) | `coach` | → CGO → CEO |
| SLA ihlali | `coach` veya `cgo` | → CEO |
| Stok kritik | `supervisor` veya `mudur` | → Coach → Satınalma |
| Vardiya sorunu (eksik personel) | `supervisor` veya `mudur` | → Coach |
| Ekipman arızası | `teknik` (`murat.demir`) | → Coach → Fabrika Müdür |
| Müşteri sağlık şikayeti | `kalite_kontrol` (`umran`) | → Reçete GM → CEO |
| Mali sapma | `muhasebe_ik` (`mahmut`) | → CGO → CEO |
| Yeni ürün talebi | `recete_gm` + `gida_muhendisi` | → CGO |
| Personel disiplin | `mudur` | → İK (`mahmut`) → Coach |
| Müşteri yorum (negatif) | `marketing` (`diana`) | → CGO |
| Eğitim gap | `trainer` (`ece`) | → Coach |
| IT/sistem sorunu | `teknik` veya `destek` | → Admin |
| Yasal/denetim | CEO direkt | → Hukuki |

---

## 4. Cheat-Sheet'ten Mr. Dobody Akışı (Kullanıcı Perspektifi)

### Adım 1: Kullanıcı yardım istiyor
- Şube/Fabrika çalışanı sistem içinde "chat" ikonuna basar
- Sorununu yazar: "Espresso makinesi yine kapandı"

### Adım 2: AI Niyet Tespiti
- `/api/ai/chat` endpoint çağrılır
- `ai-assistant-context.ts` kullanıcının rolüne göre context oluşturur
- AI sorunun kategorisini tespit eder (örnek: "ekipman arızası")

### Adım 3: AI Yanıt + Aksiyon Önerisi
- Hızlı çözüm denenir (örn: "fişten çek-tak"). Çözmediyse:
- "Sorununu Teknik ekibe (Murat) ilettim, 30 dk içinde dönecek" der
- `agent_action` oluşturulur (severity: high)
- `teknik` rolündeki kullanıcıya bildirim + email

### Adım 4: SLA Eskalasyon
- 24 saat içinde teknik dönüş yapmazsa → otomatik Şube Müdürü'ne eskalasyon
- 48 saat → Coach
- 72 saat → CEO

---

## 5. Pilot Süresince Mr. Dobody Kontrol Listesi

Pilot başlamadan önce doğrulanması gereken:

- [ ] `/api/ai/chat` endpoint canlı (manuel test: adminhq ile soru sor, cevap gelmeli)
- [ ] Ekipman arıza intent'i `teknik` rolündeki kullanıcıya bildirim gönderiyor mu?
- [ ] Stok kritik intent'i `mudur`'a + `satinalma`'ya bildirim gidiyor mu?
- [ ] Müşteri sağlık intent'i `kalite_kontrol` + `recete_gm`'e gidiyor mu?
- [ ] L1→L2 eskalasyon 24 saat sonra otomatik tetikleniyor mu? (cron job aktif mi?)
- [ ] Email bildirim L3+ için SMTP çalışıyor mu? (SMTP_HOST env var mevcut)
- [ ] Mobil cihazda (telefon) chat ikonu görünür ve tıklanabilir mi?

---

## 6. Bilinen Sınırlamalar

- **Sistem çökerse Mr. Dobody'e yazılamaz** → Cheat-sheet'lerde "Sistem yok" satırında WhatsApp Pilot Grubu fallback'i mevcut
- **Mr. Dobody yasal/medikal tavsiye vermez** — gerçek acil durumda 110/112
- **Mr. Dobody parola sıfırlayamaz** → admin'e yönlendirir, admin manuel sıfırlar
- **Mr. Dobody gece geç saat (22:00-06:00) HQ rollerine email göndermez** (rahatsız etmemek için), kritik olmayan durumlar sabaha bekler

---

## 7. Cheat-Sheet'lerdeki Yönlendirme İfadesi (Standart Format)

24 cheat-sheet'in tamamında şu format kullanılmıştır:

```markdown
🚨 **ACİL DURUM**
- Yangın: **110**
- Sağlık: **112**
- Sistem içi: **Mr. Dobody'e yaz** (chat ikonundan)
  Mr. Dobody seni doğru kişiye otomatik yönlendirir (rol1 / rol2 / rol3)

📱 **Pilot İletişim**
- WhatsApp Pilot Grubu: "DOSPRESSO Pilot — [konum]"
- Cheat sheet: `docs/pilot/cheat-sheets/XX-rol.md`
```

---

**Sahip:** Replit Agent (matrix dokümantasyonu) → Aslan (Mr. Dobody training data onayı) → IT/Teknik (kontrol listesi yürütme)
