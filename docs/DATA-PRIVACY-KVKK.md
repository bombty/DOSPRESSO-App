# DOSPRESSO — Veri Gizliliği ve KVKK Uyumu
**Kişisel Verilerin Korunması Kanunu (KVKK) — Türkiye**

---

## Sistemde Saklanan Kişisel Veriler

| Veri | Tablo | Hassasiyet | Erişim |
|------|-------|------------|--------|
| Ad, soyad | users | Normal | Herkes (kendi adı) |
| TCKN (TC Kimlik) | users.tckn | YÜKSEK | Sadece İK |
| Telefon | users.phoneNumber | Orta | İK + yönetici |
| Adres | users.address | YÜKSEK | Sadece İK |
| Doğum tarihi | users.birthDate | Orta | İK |
| Banka bilgisi | (henüz yok) | YÜKSEK | Sadece muhasebe |
| Maaş bilgisi | users.netSalary | YÜKSEK | İK + muhasebe |
| Sağlık bilgisi | leave_requests (sick) | YÜKSEK | İK |
| Fotoğraf | users.profileImageUrl | Normal | Sistem içi |
| Konum | kiosk check-in (GPS) | Orta | Sistem |
| Çalışma saatleri | pdks_records | Normal | İK + yönetici |

## KVKK Temel Kuralları

```
1. Amaç Sınırlılığı — Veri sadece toplandığı amaç için kullanılır
2. Veri Minimizasyonu — Gereksiz veri toplanmaz
3. Doğruluk — Veriler güncel tutulur
4. Saklama Süresi — İhtiyaç kalmadığında silinir/anonimleştirilir
5. Güvenlik — Yetkisiz erişim engellenir
6. Şeffaflık — Çalışan hangi verilerinin toplandığını bilir
```

## Teknik Önlemler (Mevcut)

```
✅ Role-based access control (21 rol)
✅ Session-based authentication
✅ Branch scope isolation (şube izolasyonu)
✅ Soft delete (veri gerçekten silinmez, isActive=false)
✅ Audit trail (data_change_log)
✅ Data lock (zaman bazlı kilitleme)
```

## Eksik / İyileştirilmesi Gereken

```
⚠️ TCKN şifreleme (şu an plain text) — şifrelenebilir
⚠️ Maaş bilgisi şifreleme — şifrelenebilir
⚠️ Veri silme talebi mekanizması (KVKK hakkı) — henüz yok
⚠️ Veri dışa aktarım talebi — henüz yok
⚠️ Çerez onay mekanizması — henüz yok (session cookie)
⚠️ Gizlilik politikası sayfası — henüz yok
⚠️ Log saklama süresi politikası — tanımsız
```

## Dobody ve KVKK
```
Dobody kişisel veri İÇEREN öneri oluşturmamalı:
  ❌ "Ahmet'in maaşı 25.000 TL, ortalama altında"
  ✅ "Bu pozisyondaki personel maaş ortalaması bütçenin altında"

Dobody scope kuralları KVKK ile uyumlu olmalı:
  Her rol sadece yetkili olduğu veriyi görür
```
