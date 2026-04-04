# DOSPRESSO — Bildirim ve Agent Routing Sistemi
**Push bildirim, in-app bildirim, Dobody aksiyon routing, escalation**

---

## Bildirim Akışı
```
Olay oluşur (görev atandı, denetim tamamlandı, SLA yaklaştı)
  ↓
Agent Routing Rules → doğru alıcıyı bul
  ↓
Bildirim oluştur (notifications tablosu)
  ↓
Push notification (PWA) + in-app badge
  ↓
Kullanıcı okur → okundu işaretle
```

## DB Tabloları
```
Bildirim:
  notifications            — bildirimler (userId, title, message, type, isRead)
  notification_preferences — kullanıcı tercihleri (hangi bildirimi alır)
  notification_policies    — bildirim politikaları (global kurallar)
  notification_digest_queue — toplu bildirim kuyruğu

Agent:
  agent_routing_rules      — routing kuralları (kategori → hedef rol)
  agent_action_outcomes    — aksiyon sonuçları (başarılı/başarısız)

Dobody:
  dobody_flow_tasks        — Dobody görevleri
  dobody_flow_completions  — tamamlama kayıtları
  dobody_action_templates  — aksiyon şablonları
  dobody_avatars           — Dobody avatar ayarları
```

## Agent Routing Mantığı
```
Olay kategorisi → agent_routing_rules
  → primary_role hedef (ilk bildirim)
  → escalation_days sonra → CGO'ya/Coach'a escalation
  → Birden fazla kural eşleşirse → hepsi bildirilir

Örnek:
  Kategori: "denetim_aksiyonu"
  Primary: supervisor (o şubenin)
  Escalation: 3 gün → coach
  Final: 7 gün → cgo
```

## Bildirim Tipleri
```
info        — bilgilendirme (mavi)
warning     — uyarı (amber)
alert       — acil (kırmızı)
success     — başarı (yeşil)
task        — görev atama
reminder    — hatırlatma
escalation  — yükseltme
```

## Kullanıcı Tercihleri
```
notification_preferences: her kullanıcı hangi tipleri alacağını seçer
Push notification: PWA Service Worker üzerinden
Email: ileride eklenecek (şu an yok)
```

## Dobody 3 Mod
```
auto   — arka planda çalışır, pattern izler, otomatik bildirim
action — kullanıcıya aksiyon önerir, onay bekler
info   — sadece bilgi sunar, aksiyon önermez
```

## Dosya Konumları
```
shared/schema/schema-03.ts — notifications
shared/schema/schema-12.ts — agent tabloları
shared/schema/schema-15-ajanda.ts — notification digest
server/agent/ — agent skills + routing
server/routes/dobody-flow.ts — Dobody API
```
