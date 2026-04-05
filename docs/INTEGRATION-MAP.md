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

---

## AI PROVIDER SİSTEMİ (Multi-Provider Hazır)

### Mevcut Mimari:
```
server/ai.ts              — Ana AI yapılandırma + provider yönetimi
server/services/ai-client.ts — Soyutlama katmanı (provider-agnostik)

Desteklenen provider'lar:
  1. OpenAI (GPT-4o, GPT-4o-mini) — varsayılan
  2. Anthropic (Claude Sonnet/Opus) — hazır, API key gerekli
  3. Gemini (gemini-2.0-flash) — hazır, API key gerekli
```

### Provider Değiştirme:
```
Admin paneli → AI Ayarları → Provider seç
  → API key gir → Model seç → Kaydet
  → Sistem otomatik yeni provider'a geçer
  → Tüm AI çağrıları (Dobody, analiz, görsel) yeni provider'ı kullanır
```

### Teknik Detay:
```
ai-client.ts → chat() fonksiyonu:
  1. getAIConfig() → DB'den aktif provider'ı çek
  2. Provider'a göre model seç (OpenAI/Claude/Gemini)
  3. İstek gönder (OpenAI SDK veya Anthropic REST)
  4. Standart response formatına dönüştür
  5. Cache + rate limiter uygula

Provider değiştiğinde KOD DEĞİŞİKLİĞİ GEREKMEZ.
Sadece admin panelinden API key + provider seçilir.
```

### Env Variables:
```
AI_INTEGRATIONS_OPENAI_API_KEY — OpenAI key
AI_INTEGRATIONS_OPENAI_BASE_URL — OpenAI base URL (özel endpoint için)
ANTHROPIC_API_KEY — Claude API key (DB'den de okunabilir)
GEMINI_API_KEY — Gemini API key (DB'den de okunabilir)
```

### Kullanım Alanları:
- Mr. Dobody analiz + öneri üretimi
- Fotoğraf analizi (denetim, arıza)
- Metin özetleme
- Embedding (bilgi bankası arama)
- AI rapor oluşturma
