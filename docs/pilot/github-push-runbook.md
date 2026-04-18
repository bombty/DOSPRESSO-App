# GitHub Push Runbook — Token SPOF Çözümü

**Sorun**: Push'lar Aslan'ın anlık token'ına bağlı → 30+ dakika bekleme  
**Çözüm**: `GITHUB_TOKEN` Replit Secret olarak kalıcı saklanır, hem Aslan hem agent push edebilir  
**Önerilen tip**: GitHub Fine-grained Personal Access Token

---

## 1. Token Üretimi (Aslan Yapacak — 5 Dakika)

### Adım 1: GitHub'a Git
- https://github.com/settings/personal-access-tokens/new
- "Fine-grained personal access tokens" sekmesi

### Adım 2: Token Konfigürasyonu

| Alan | Değer |
|---|---|
| **Token name** | `dospresso-replit-agent-2026` |
| **Expiration** | Custom — 90 gün (28 Tem 2026) |
| **Repository access** | "Only select repositories" → `bombty/DOSPRESSO-App` |
| **Repository permissions** | |
| └─ Contents | **Read and write** |
| └─ Metadata | Read-only (otomatik) |
| └─ Pull requests | Read and write (opsiyonel — PR oluşturmak için) |
| └─ Diğer izinler | YOK (minimum yetki principle) |

### Adım 3: Tokenı Kopyala
- "Generate token" → **`github_pat_xxxxx`** ile başlayan string
- ⚠️ **Sadece 1 kez gösterilir** — kopyala, saklamadan önce sayfayı kapama

---

## 2. Replit Secret Olarak Ekleme (1 Dakika)

### Yöntem A — Replit Web UI (Önerilen)
1. Replit projesi aç → sol panel → "🔒 Secrets" sekmesi
2. "+ New Secret" → 
   - **Key**: `GITHUB_TOKEN`
   - **Value**: `github_pat_xxxxx...` (kopyalanan token)
3. "Add Secret" → kayıt anında tüm workflow'lara enjekte edilir

### Yöntem B — Shell (Manuel)
```bash
# DİKKAT: Token shell history'ye yazılmasın
read -s GITHUB_TOKEN_TMP
# (paste token, Enter)
```
Sonra Replit web UI'dan ekle.

---

## 3. Kullanım (Push Yapma)

### Yöntem A — Remote URL'i Bir Kez Yapılandır
```bash
git remote set-url origin "https://x-access-token:${GITHUB_TOKEN}@github.com/bombty/DOSPRESSO-App.git"
git push origin main
```

### Yöntem B — credential helper (Persist Etmez)
```bash
git -c credential.helper= -c http.extraHeader="AUTHORIZATION: bearer ${GITHUB_TOKEN}" push origin main
```

### Yöntem C — Tek Seferlik
```bash
GITHUB_TOKEN=$GITHUB_TOKEN git push https://x-access-token:${GITHUB_TOKEN}@github.com/bombty/DOSPRESSO-App.git main
```

**Önerilen**: Yöntem A (remote'u bir kez kur, sonraki push'lar `git push origin main` ile çalışır).

---

## 4. Doğrulama

```bash
# Token'ın geçerli olduğunu kontrol
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: token ${GITHUB_TOKEN}" \
  https://api.github.com/repos/bombty/DOSPRESSO-App
# Beklenen: 200

# Push'un işe yaradığını kontrol
git log --oneline origin/main..HEAD
# Beklenen: boş (her şey push edildi)
```

---

## 5. Güvenlik & Rotasyon

| Kural | Detay |
|---|---|
| **Asla commit etme** | `.env` veya kod içinde plaintext yazma |
| **Asla logla** | `echo $GITHUB_TOKEN` Pazartesi günü kazara screen-share'de görülebilir |
| **90 günde bir rotasyon** | 28 Tem 2026 — yeni token, eskisini revoke et |
| **Acil revoke** | Şüpheli kullanım → GitHub settings → Revoke butonu |
| **Erişim** | Sadece Aslan + IT bilir; ekibe söylenmez |

---

## 6. Acil Durum: Token Kaybedildi

1. **Hemen revoke**: https://github.com/settings/personal-access-tokens
2. Bu runbook'tan yeni token üret (Adım 1)
3. Replit Secrets'tan eskisini sil + yenisini ekle
4. Tüm aktif agent oturumları için: workflow restart (yeni env değişkeni alır)

---

## 7. Pazartesi 09:00 Öncesi Hazır Olması Gerekenler

- [ ] Token üretildi (Aslan)
- [ ] Replit Secret olarak eklendi (`GITHUB_TOKEN`)
- [ ] Test push yapıldı (`git push origin main` boş bir commit ile)
- [ ] Agent oturumu workflow restart yapıldı
- [ ] Eski OAuth token'ı revoke edildi (varsa)

**Sorumlu**: Aslan (token üretimi) + IT (Replit Secret + test)
