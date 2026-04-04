# DOSPRESSO — Sistem Durumu
**Son güncelleme:** 4 Nisan 2026 | **Son commit:** 1c74f440

---

## Aktif Sprint
**Dobody-1: Proposal Altyapısı** (başlanmadı)

## Bekleyen Test
Sprint C+D → Replit'te test edilecek (denetim detay + aksiyon + trend)

---

## Modül Durumları

| Modül | Durum | Son Sprint | Not |
|-------|-------|------------|-----|
| Proje v2 | ✅ Çalışıyor | Sprint 1 (4 Nis) | 6 tab, portfolio dashboard |
| Denetim v2 | ✅ Çalışıyor | Sprint A-D (4 Nis) | Şablon + form + aksiyon + trend |
| Ekipman Mega | ✅ Çalışıyor | 3 Nis | 9 sidebar item |
| Sistem Atölyesi v3 | ✅ Çalışıyor | 3 Nis | 5 tab |
| Cowork | ✅ Çalışıyor | 3 Nis | 5 tab |
| Centrum v4 | ✅ Çalışıyor | Mart | 16 rol dashboard |
| Vardiya/PDKS | ✅ Çalışıyor | 3 Nis | Mimari fix tamamlandı |
| Dobody Proposal | ⏳ Planlandı | — | 8 workflow + scope güvenlik |
| Duyuru Düzenleme | 🔴 Bug var | — | Aslan raporladı, detay bekleniyor |
| Conversation Hub | 📋 Backlog | — | 3 kolon, 6 tab |

## Bilinen Bug'lar

| # | Bug | Dosya | Durum |
|---|-----|-------|-------|
| 1 | Kiosk token localStorage'a kaydedilmiyor | sube/kiosk.tsx loginMutation | ⚠️ Doğrulanmadı |
| 2 | module_flags unique constraint (production) | DB | ⚠️ Production'da fix gerekebilir |
| 3 | workshop_notes tablosu production'da yok | DB | ⚠️ CREATE IF NOT EXISTS gerekli |
| 4 | Duyuru düzenleme sorunları | ? | 🔴 Detay bekleniyor |

## Production Durumu

```
Dev ortam: ✅ Çalışıyor
Production: ⚠️ Son publish bekliyor (birkaç commit geride)
Admin şifre: 133200 (force reset)
Son production deploy notu: Publish sonrası /pilot-baslat → PDKS Backfill çalıştır
```

## Güncel Rakamlar

| Metrik | Değer |
|--------|-------|
| Toplam sayfa | 304+ |
| Backend endpoint | 1500+ |
| DB tablo | 358+ |
| Schema dosyası | 20 |
| Route dosyası | 42 |
| Rol sayısı | 21 |
| Şube (aktif) | 25 (hedef 55) |
| Service Worker | v20 |
