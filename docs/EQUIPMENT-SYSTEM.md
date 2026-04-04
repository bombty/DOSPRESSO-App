# DOSPRESSO — Ekipman ve Bakım Sistemi
**9 sidebar modül: Dashboard, Liste, Katalog, Arıza, Servis, Bakım Takvimi, Bilgi Bankası, Ayarlar, Analitik**

---

## Ekipman Yaşam Döngüsü
```
Satın Alma → Katalog Kaydı → Şubeye Atama → Aktif Kullanım
  → Periyodik Bakım (takvim) → Arıza Bildirimi → Servis Takip
  → Onarım/Değişim → Tekrar Kullanım veya Hurda
```

## DB Tabloları
```
equipment                 — ekipman envanter (şube, tip, seri no, durum)
equipment_catalog         — ürün katalogu (marka, model, teknik özellik)
equipment_faults          — arıza bildirimleri (açık/çözüldü/beklemede)
equipment_service_requests — servis talepleri
equipment_maintenance_logs — bakım geçmişi
equipment_calibrations    — kalibrasyon kayıtları
equipment_comments        — ekipman yorumları
equipment_knowledge       — bilgi bankası makaleleri
equipment_troubleshooting_steps — arıza giderme adımları
fault_service_tracking    — servis takip (dış servis)
fault_stage_transitions   — arıza durum geçişleri
maintenance_schedules     — periyodik bakım takvimi
maintenance_logs          — bakım logları
knowledge_base_articles   — bilgi bankası
```

## Arıza Akışı
```
Bildirim (herhangi personel) → Fotoğraf + açıklama
  → Supervisor onay → Teknik'e yönlendirme
  → Dahili çözüm VEYA dış servis talebi
  → Servis takip (tarih, maliyet, sonuç)
  → Çözüm → Kapatma
```

## Skor Etkisi
- Arıza çözüm süresi → şube operasyon skoruna etki
- Bakım uyumu (zamanında yapılan/planlanan) → ekipman skoru

## Dosya Konumları
```
shared/schema/schema-02.ts, schema-03.ts, schema-11.ts — ekipman tabloları
server/routes/equipment.ts — API'ler
client/src/pages/ekipman-mega.tsx — ana sayfa (9 sidebar)
client/src/pages/equipment-detail.tsx — ekipman detay
```
