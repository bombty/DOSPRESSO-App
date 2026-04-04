# DOSPRESSO — Entegrasyon Haritası
**Mevcut, planlanan ve gelecek dış sistem bağlantıları**

---

## Mevcut Entegrasyonlar

| Sistem | Durum | Amaç | Teknik |
|--------|-------|------|--------|
| OpenAI GPT-4o | ✅ Aktif | Dobody AI, fotoğraf analiz, içgörü | API key, REST |
| OpenAI Embeddings | ✅ Aktif | Bilgi bankası arama (pgvector) | API |
| Neon PostgreSQL | ✅ Aktif | Ana veritabanı | Serverless connection |
| Replit Object Storage | ✅ Aktif | Dosya/fotoğraf depolama | S3 API |
| PWA Service Worker | ✅ Aktif | Push bildirim, offline cache | Web Push API |

## Planlanan Entegrasyonlar (Yakın Gelecek)

| Sistem | Durum | Amaç | Not |
|--------|-------|------|-----|
| Logo Muhasebe | 📋 Plan | Bordro/fatura import | Excel/Word → AI parsing |
| POS Sistemi | 📋 Plan | Satış verisi import | API bağlantısı (gelecek) |
| Excel Import | 📋 Plan | Geçici POS veri girişi | Manuel upload → parse |
| E-fatura | 📋 Plan | Fatura entegrasyonu | SGK/GİB entegrasyonu |
| Google Maps | 📋 Plan | Şube konum, müşteri yorum çekme | Maps API |
| Instagram | 📋 Plan | Şube sosyal medya takibi | Graph API |

## Gelecek Entegrasyonlar (Vizyon)

| Sistem | Amaç |
|--------|------|
| SGK API | Otomatik SGK bildirimi |
| Banka API | Maaş ödemesi otomasyonu |
| Tedarikçi Portal | Otomatik sipariş gönderimi |
| Kargo Takip | Sevkiyat gerçek zamanlı izleme |
| IoT Sensörler | Sıcaklık/nem izleme (soğuk zincir) |
| Mobil Ödeme | Müşteri ödeme entegrasyonu |
| WhatsApp Business | Müşteri iletişim |

## Entegrasyon Kuralları
```
1. Tüm dış bağlantılar server tarafında yapılır (client ASLA)
2. API key'ler environment variable'da saklanır
3. Rate limiting uygulanır
4. Hata durumunda fallback/retry mekanizması
5. Hassas veri (maaş, TCKN) dış sisteme gönderilmez (KVKK)
6. Dış sistemden gelen veri doğrulanır (sanitize)
```

## PWA Özellikleri
```
✅ Offline erişim (Service Worker cache)
✅ Push notification
✅ Ana ekrana ekle (iOS + Android)
✅ Fullscreen mod
⚠️ Offline veri sync (henüz yok)
⚠️ Background sync (henüz yok)
```
