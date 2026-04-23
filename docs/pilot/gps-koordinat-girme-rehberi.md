# GPS Koordinatları — Aslan için Kolay Rehber

**Amaç:** 4 pilot lokasyonun GPS koordinatlarını DB'ye girmek
**Süre:** 15 dakika
**Deadline:** 27 Nis Pazar öğle (smoke test öncesi)

---

## 📍 Google Maps'ten Koordinat Alma

**Yöntem 1: Tarayıcıda**
1. Google Maps aç → lokasyonu ara
2. Lokasyona **sağ tık** yap
3. En üstte koordinatlar görünür (örn. `36.8969° K, 30.7133° D`)
4. Üzerine tıklayınca clipboard'a kopyalanır

**Yöntem 2: Telefonda**
1. Google Maps aç → lokasyon
2. Uzun basın → kırmızı pin düşsün
3. Alt bilgi çubuğunda koordinat görünür

**Format:**
- Enlem (Latitude): 36.xxxx (Antalya ~36)
- Boylam (Longitude): 30.xxxx (Antalya ~30)

---

## ✍️ 4 Lokasyon Şablonu

Aşağıya koordinatları yaz, bana gönder, SQL UPDATE ile DB'ye girerim.

### Işıklar (branch_id = 5)
- Adres: Dospresso Işıklar (Antalya)
- Enlem (Lat): `36.____`
- Boylam (Lng): `30.____`
- Google Maps Link (opsiyonel): https://www.google.com/maps/...

### Lara (branch_id = 8)
- Adres: Dospresso Lara (Antalya)
- Enlem (Lat): `36.____`
- Boylam (Lng): `30.____`
- Google Maps Link (opsiyonel): https://www.google.com/maps/...

### HQ - Merkez Ofis (branch_id = 23)
- Adres: [Aslan'ın bildiği adres]
- Enlem (Lat): `36.____`
- Boylam (Lng): `30.____`
- Google Maps Link (opsiyonel): https://www.google.com/maps/...

### Fabrika (branch_id = 24)
- Adres: [Aslan'ın bildiği adres]
- Enlem (Lat): `36.____`
- Boylam (Lng): `30.____`
- Google Maps Link (opsiyonel): https://www.google.com/maps/...

---

## ⚙️ Hazır SQL (Claude dolduracak)

Koordinatları verince Claude bu SQL'i doldurur ve Replit çalıştırır:

```sql
BEGIN;

UPDATE branches
SET shift_corner_latitude  = 36.XXXX,
    shift_corner_longitude = 30.XXXX,
    updated_at = NOW()
WHERE id = 5;  -- Işıklar

UPDATE branches
SET shift_corner_latitude  = 36.XXXX,
    shift_corner_longitude = 30.XXXX,
    updated_at = NOW()
WHERE id = 8;  -- Lara

UPDATE branches
SET shift_corner_latitude  = 36.XXXX,
    shift_corner_longitude = 30.XXXX,
    updated_at = NOW()
WHERE id = 23; -- HQ

UPDATE branches
SET shift_corner_latitude  = 36.XXXX,
    shift_corner_longitude = 30.XXXX,
    updated_at = NOW()
WHERE id = 24; -- Fabrika

COMMIT;
```

---

## 🔴 Neden Kritik?

- **geo_radius = 50m** ayarlı (DB'de mevcut)
- Kiosk shift-start: tablet GPS konumu alır
- Sistem kontrol: tablet koordinatı ≤50m mesafede mi?
- **Koordinat NULL ise:** GPS check atlanır, vardiya yine açılır ama `is_location_verified = false` kaydeder
- **Pilot kritik değil ama iyi olması için:** Koordinatlar girilsin

## 🟢 S-GPS Fallback Var

Eğer tablet GPS izin vermezse bile, supervisor/müdür kendi PIN'iyle manuel onay verebilir. Yani koordinat girmezsen de pilot çalışır (sadece "konum doğrulanmadı" notu düşer).

---

## ✅ Kontrol Sorgusu (SQL çalıştırılınca)

```sql
SELECT id, name, shift_corner_latitude, shift_corner_longitude, geo_radius
FROM branches
WHERE id IN (5, 8, 23, 24);
```

Sonuç:
```
id | name      | lat     | lng     | radius
---+-----------+---------+---------+-------
 5 | Işıklar   | 36.XXXX | 30.XXXX | 50
 8 | Lara      | 36.XXXX | 30.XXXX | 50
23 | HQ        | 36.XXXX | 30.XXXX | 50
24 | Fabrika   | 36.XXXX | 30.XXXX | 50
```

Hepsi dolu → ✅ Pilot GPS hazır.

---

**Hazırlayan:** Claude (23 Nis 2026)
**Kullanım:** Aslan koordinatı doldurur → Claude SQL'i hazırlar → Replit çalıştırır
