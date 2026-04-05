# DOSPRESSO — İş Kuralları (Asla Bozulmaması Gerekenler)
**Bu kurallar sistemin temelini oluşturur. Herhangi bir kod değişikliği bu kuralları ihlal edemez.**

---

## 1. VERİ AKIŞI — TEK YÖN

```
Şube → HQ (TAK YÖN)
HQ → Şube (YASAK — sadece duyuru/görev gönderilebilir, veri geri akmaz)

Şube A → Şube B (YASAK — şubeler birbirini göremez)
Fabrika → Şube (sadece sevkiyat verisi)
Şube → Fabrika (sadece sipariş talebi)
```

## 2. İK / PERSONEL YÖNETİMİ

```
Muhasebe İK → SADECE HQ + Fabrika + Işıklar şubesi personeli yönetir
Yatırımcı şubeleri → KENDİ İK'larını yönetir (Muhasebe karışmaz)
Coach/Trainer → TÜM şubeleri denetler (audit + eğitim)
Supervisor → KENDİ şubesinin günlük operasyonunu yönetir
```

## 3. SKOR SİSTEMİ

```
Şube Denetim Skoru:
  ETKİLER → Supervisor, Supervisor Buddy, Müdür skorunu
  ETKİLEMEZ → Barista, Bar Buddy, Stajyer skorunu
  NEDEN → Şube düzeni/temizlik yönetim sorumluluğundadır

Personel Denetim Skoru (dress code, hijyen, güler yüz):
  ETKİLER → O kişinin bireysel skorunu (herkes dahil barista)
  NEDEN → Kişisel sorumluluk

Composite Score = checklist + eğitim + devam + geri bildirim + görevler
```

## 4. VARDİYA / PDKS

```
Her kiosk check-in'de shift_attendance kaydı oluşturulur (geç gelse de, zamanında gelse de)
Ceza sadece geç kalanlara uygulanır — zamanında gelenlere ceza YOK
Vardiya yoksa → adhoc shift oluşturulur (status: "confirmed", type: "morning")
Anomali: mola dönüşü check-in yapılmazsa → kiosk ekranında uyarı (ekip arkadaşlarına görünür)

PDKS Parametrik Kesinti:
  - Geç kalma kesinti kuralları admin/muhasebe tarafından belirlenir
  - Fazla mesai çarpanı: ×1.5
  - Full-time: 45 saat/hafta, part-time: özel
```

## 5. FABRİKA ZİNCİRİ

```
Üretim → Kalite Kontrol (2 aşama) → LOT oluşturma → Sevkiyat → Şube Stok
- Tüm status değişiklikleri transaction + FOR UPDATE ile yapılır
- FIFO: LOT atama son kullanma tarihine göre (en eski önce)
- Kalite red → üretim geri döner, sevkiyata çıkamaz
- Sevkiyat onaylanmadan şube stoğuna eklenmez
```

## 6. SOFT DELETE KURALI

```
İş verisi asla hard DELETE yapılmaz:
  ✅ isActive: false + deletedAt: timestamp + deletedBy: userId
  
İstisna (hard delete yapılabilir):
  sessions, tokens, cache, eski notifications
```

## 7. DATA LOCK (Zaman Bazlı Kilitleme)

```
purchase_orders: 7 gün sonra kilitlenir
factory_production_outputs: 3 gün
branch_stock_movements: 7 gün
pdks_records: 3 gün
monthly_payroll: hemen kilitlenir
factory_quality_checks: onay anında
factory_shipments: teslim anında
customer_feedback: hemen

Kilitlenen kayıt değiştirilemez — change_request workflow başlatılmalı
```

## 8. YATIRICI (FRANCHISE SAHİBİ)

```
Yatırımcı = franchise sahibi (HQ çalışanı DEĞİL)
Her yatırımcı şubesi bağımsız İK yönetir
HQ Muhasebe yatırımcı şubesinin maaşlarına karışmaz
Yatırımcı kendi şubesinin verilerini görür — diğer şubeleri GÖREMEZ
Yatırımcı HQ iç verilerine erişemez
```

## 9. MR. DOBODY

```
Pattern bazlı bildirim + onaylı otonom aksiyon
Dobody her dashboard'da widget olarak bulunur
3 mod: auto (arka plan), action (onaylı aksiyon), info (bilgilendirme)
Kendi karar ALMAZ — önerir, kullanıcı onaylar
Girdi güvenliği: role scope'una göre veri erişimi
```

## 10. DENETİM SİSTEMİ

```
Denetim raporu gönderilir: Supervisor + Supervisor Buddy + Yatırımcı
Denetçi (Coach/Trainer) eksikler için aksiyon maddesi oluşturur
Aksiyon → deadline + sorumlu + SLA
Aksiyonlar kapanmadan denetim "Açık" kalır
SLA aşılırsa → otomatik escalation (CGO'ya)
Tüm denetim geçmişi sonsuza kadar arşivlenir
```

---

## KRİTİK: ÇİFT YETKİ SİSTEMİ

İki ayrı yetki kontrolü var — HER İKİSİ de güncellenmelidir:

1. `shared/module-manifest.ts` → Yeni sistem (modül bazlı, requireManifestAccess)
2. `shared/schema/schema-02.ts` → Eski PERMISSIONS map (ensurePermission, hasPermission)

Manifest'e rol eklerken schema-02.ts'deki PERMISSIONS haritasını da kontrol et!
Aksi halde manifest izin verir ama eski kontrol 403 döner.
