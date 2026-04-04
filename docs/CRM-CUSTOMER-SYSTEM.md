# DOSPRESSO — CRM ve Müşteri Sistemi
**Müşteri geri bildirimi, şikayet yönetimi, kampanya, NPS**

---

## Müşteri Geri Bildirim Akışı
```
Müşteri QR okutma (şubedeki QR kod)
  → Feedback formu açılır (özelleştirilebilir sorular)
  → Puan + yorum gönderilir
  → Şube dashboard'unda görünür
  → Düşük puan → Supervisor'a anlık uyarı
  → Trend analizi (haftalık/aylık)
```

## DB Tabloları
```
Geri Bildirim:
  customer_feedback        — müşteri geri bildirimleri (puan, yorum, şube)
  branch_feedbacks         — şube bazlı özet
  feedback_form_settings   — form ayarları (şube bazlı özelleştirme)
  feedback_custom_questions — özel sorular
  feedback_responses       — detaylı cevaplar
  feedback_ip_blocks       — spam engelleme

Şikayet:
  guest_complaints         — misafir şikayetleri
  product_complaints       — ürün şikayetleri

Kampanya:
  campaigns                — kampanya tanımları
  campaign_branches        — kampanya-şube bağlantısı
  campaign_metrics         — kampanya performans metrikleri
```

## QR Feedback Sistemi
```
Her şubenin benzersiz QR kodu: feedbackQrToken (branches tablosu)
URL: /feedback/{token}
Anonim — giriş gerektirmez
IP bazlı spam koruması
```

## NPS (Net Promoter Score)
```
"Bu şubeyi tavsiye eder misiniz?" (0-10)
  9-10 → Promoter (destekçi)
  7-8  → Passive (nötr)
  0-6  → Detractor (eleştiren)
  NPS = %Promoter - %Detractor
```

## Skor Etkisi
- Müşteri memnuniyeti → şube composite score boyutu
- Şikayet sayısı/çözüm süresi → şube kalite skoru
- Dobody: şikayet paterni tespit → kök neden analizi

## Dosya Konumları
```
shared/schema/schema-04.ts, 05 — CRM tabloları
server/routes/crm-routes.ts — API
client/src/pages/crm-mega.tsx — CRM mega modül
```
