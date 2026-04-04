# DOSPRESSO — Stok ve Envanter Sistemi
**Fabrika stok + şube stok + hammadde + tedarik zinciri**

---

## Stok Akışı
```
Tedarikçi → Hammadde Girişi (fabrika)
  → Üretim (hammadde → mamül)
  → Fabrika Stok (factory_inventory)
  → Sevkiyat (factory_shipments)
  → Şube Stok (branch_inventory)
  → Satış/Tüketim
  → Fire/İmha
```

## DB Tabloları
```
Fabrika Stok:
  factory_inventory        — fabrika stok durumu (ürün × miktar)
  production_lots          — LOT takip (üretim partisi, SKT)
  waste_lots               — fire/atık LOT'ları

Şube Stok:
  branch_inventory         — şube stok (ürün × miktar × şube)
  branch_stock_movements   — stok hareketleri (giriş/çıkış/transfer)

Genel Envanter:
  inventory                — ana envanter (birim, kategori, min/max seviye)
  inventory_movements      — hareket kayıtları (7 tip: giriş/çıkış/transfer/üretim/fire/iade/sayım)

Hammadde:
  raw_materials            — hammadde tanımları
  raw_material_price_history — fiyat geçmişi (tedarikçi bazlı)

Tedarik:
  suppliers                — tedarikçi bilgileri (durum: aktif/pasif/kara liste)
  product_suppliers        — ürün-tedarikçi bağlantısı (fiyat, lead time)
  purchase_orders          — satınalma siparişleri (taslak→onay→sipariş→teslim)
  purchase_order_items     — sipariş kalemleri
```

## Hareket Tipleri (inventory_movements)
```
giris              — dışarıdan stok girişi
cikis              — satış/tüketim
transfer           — şubeler arası transfer
uretim_giris       — üretimden gelen mamül
uretim_cikis       — üretime verilen hammadde
sayim_duzeltme     — fiziksel sayım farkı
fire               — fire/kayıp
iade               — müşteri veya tedarikçi iadesi
```

## FIFO Kuralı
- Sevkiyat ve tüketimde en eski SKT'li LOT önce kullanılır
- Sistem otomatik sıralar
- SKT geçmiş ürün sevkiyata/satışa çıkamaz

## Kritik Eşikler
```
minimum_stock_level — bu seviyenin altına düşünce uyarı
reorder_point       — yeniden sipariş noktası
maximum_stock_level — fazla stok uyarısı

Dobody WF-3: Stok kritik → sipariş önerisi
```

## Veri Kilidi
- branch_stock_movements: 7 gün sonra kilitlenir
- purchase_orders: 7 gün sonra kilitlenir

## Dosya Konumları
```
shared/schema/schema-09.ts  — envanter, tedarikçi, satınalma
shared/schema/schema-10.ts  — hammadde
shared/schema/schema-11.ts  — fire LOT
shared/schema/schema-12.ts  — sevkiyat, üretim LOT, şube stok
server/routes/operations.ts — stok API'leri
```
