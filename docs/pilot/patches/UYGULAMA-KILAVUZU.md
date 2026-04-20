# Patch Uygulama Kılavuzu (Replit Agent → Claude → GitHub)

## Üretilen Patch'ler (20.04.2026 / Pilot öncesi)

| Sıra | Dosya | Boyut | İçerik |
|---|---|---|---|
| 1 | `0001-Add-detailed-documentation-for-system-modules-and-ro.patch` | 71 KB | m05-Görev model dökümanı + ilk envanter (3 dosya) |
| 2 | `0002-Add-comprehensive-system-inventory-documentation.patch` | 254 KB | Envanter genişletme: 1724 endpoint + 450 tablo + 320 sayfa |

## Aslan'ın Uygulama Adımları

```bash
# 1) Local repo'da, ana branch'te:
cd ~/dospresso
git checkout main
git pull origin main

# 2) Patch'leri sırayla uygula:
git am < /path/to/0001-Add-detailed-documentation-for-system-modules-and-ro.patch
git am < /path/to/0002-Add-comprehensive-system-inventory-documentation.patch

# 3) Uygulama doğrulaması:
git log --oneline -3
# Şunları görmeli:
#  XXXXXXX Add comprehensive system inventory documentation
#  XXXXXXX Add detailed documentation for system modules and roles

# 4) Push:
git push origin main
```

## Çakışma Olursa

Eğer `git am` "patch does not apply" hatası verirse:
```bash
git am --abort
git apply --3way 0001-*.patch
git add docs/
git commit -m "Add detailed documentation for system modules and roles"
# Sonra 0002 için aynısı
```

## Doğrulama Checklist (Push sonrası)

- [ ] `docs/sistem-100/envanter/04-tum-endpoints.md` 1724 satır endpoint
- [ ] `docs/sistem-100/envanter/05-tum-tablolar.md` 450 tablo
- [ ] `docs/sistem-100/envanter/06-tum-pages.md` 320 sayfa
- [ ] `docs/sistem-100/moduller/m05-gorev.md` ~750 satır model
- [ ] GitHub Actions yeşil

## Notlar

- Bu patch'ler **sadece dokümantasyon** içerir (kod, schema, route değişikliği yok).
- Workflow restart sonrası `Start application` çalışıyor (Neon WebSocket geçici hatası restart'la geçti).
- Bir sonraki adım: kullanıcı m05 model dökümanını onaylarsa kalan 11 modül + 31 rol oturum oturum üretilecek.
