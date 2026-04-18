# F03 — adminhq Parola Rotasyon Runbook

**Pazartesi 28 Nis 2026, 08:00-08:15 (15 dakika)**  
**Sorumlu**: IT (Aslan veya yetkili)  
**Onay**: Pre-pilot — Aslan onaylı (19 Nis 2026 dashboard kararı)

---

## 1. Önceki Durum (Tutarsızlık)

| Kaynak | Yazılı Parola | Durum |
|---|---|---|
| `replit.md` | `0000` | Pre-pilot dev convenience |
| IT task notları | `133200` | Eski rotasyon, geçerli mi belirsiz |
| DB gerçek hash | bcrypt('?') | Bilinmiyor — login deneyerek tespit |

**Sorun**: Plaintext parola birden fazla yerde, gerçek değer hangisi?  
**Risk**: Pre-pilot dev → pilot prod geçişinde **ZORUNLU rotasyon**.

---

## 2. Rotasyon Adımları (Sırayla)

### Adım 1: Mevcut Parolayı Doğrula (2 dk)
```bash
# Browser'dan login dene: adminhq + 0000
# Başarılı ise: replit.md doğru
# Başarısız ise: 133200 dene
# Her ikisi de başarısız ise: bcrypt hash sıfırla (Adım 5'e atla)
```

### Adım 2: Yeni Parola Belirle (1 dk)
- **Format**: Minimum 16 karakter, alfasayısal + özel karakter
- **Saklama**: 1Password "DOSPRESSO Pilot Vault"
- **Paylaşım**: Yalnızca IT + Aslan Bey (CC: yok)
- **Plaintext yazma**: HİÇBİR yere (md, txt, slack, email)

### Adım 3: DB'de Hash Güncelle (5 dk)
```typescript
// scripts/pilot/rotate-adminhq-password.ts
import bcrypt from 'bcrypt';
import { db } from '../../server/db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const NEW_PASSWORD = process.env.NEW_ADMIN_PASSWORD; // env'den oku
if (!NEW_PASSWORD || NEW_PASSWORD.length < 16) {
  throw new Error('NEW_ADMIN_PASSWORD env var missing or too short');
}

const hash = await bcrypt.hash(NEW_PASSWORD, 10);
await db.update(users)
  .set({
    password: hash,
    mustChangePassword: false, // pre-pilot migration zaten clear etmiş
    updatedAt: new Date(),
  })
  .where(eq(users.username, 'adminhq'));

console.log('✅ adminhq password rotated successfully');
```

Çalıştırma:
```bash
NEW_ADMIN_PASSWORD='<yeni-16-karakter-parola>' tsx scripts/pilot/rotate-adminhq-password.ts
```

### Adım 4: Doğrulama (3 dk)
```bash
# 1. Browser'dan adminhq + yeni parola ile login
# 2. Dashboard yüklenmeli (5 admin user görünmeli)
# 3. mustChangePassword dialog ÇIKMAMALI (pre-pilot migration nedeniyle)
```

DB doğrulama:
```sql
SELECT username, must_change_password, updated_at
FROM users
WHERE username = 'adminhq';
-- must_change_password = false olmalı
-- updated_at = bugün olmalı
```

### Adım 5: Acil Sıfırlama (Adım 1-4 başarısız ise)
```sql
-- Bcrypt hash'i sıfırlamak ve geçici parola atamak
UPDATE users
SET password = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- 'temp_pilot_2026' bcrypt
    must_change_password = false,
    updated_at = NOW()
WHERE username = 'adminhq';
```
Sonra Adım 3'ü tekrar çalıştır (gerçek parola ile).

---

## 3. Dokümantasyon Güncellemeleri (Adım 4 sonrası)

### `replit.md` Güncelleme
```markdown
## Session State (28.04.2026)
- adminhq parola: **REDACTED** (1Password — DOSPRESSO Pilot Vault)
- Rotasyon tarihi: 28 Nis 2026 08:00
- Sorumlu: <IT_isim>
```

### Önceki Plaintext Referansları Sil
```bash
grep -rn "0000\|133200" replit.md docs/ scripts/ 2>/dev/null
# Çıkan referansları **REDACTED** ile değiştir
```

---

## 4. Risk & Geri Alma

| Risk | Olasılık | Etki | Mitigasyon |
|---|---|---|---|
| Yeni parola unutuldu | DÜŞÜK | Yüksek | 1Password backup |
| Hash bozuk yazıldı | ÇOK DÜŞÜK | Yüksek | DB transaction + rollback |
| `must_change_password` true kaldı | DÜŞÜK | Orta | Adım 4 doğrulama |
| Pilot kullanıcılar etkilendi | ÇOK DÜŞÜK | Düşük | Sadece adminhq, diğer user'lar etkilenmez |

**Rollback**:
```sql
-- Pre-rotation backup'tan eski hash geri yükle
-- (Pazar 23:00 backup: /tmp/pilot-backup-2026-04-27.sql)
```

---

## 5. Tamamlama Onayı

- [ ] Yeni parola 1Password'e kaydedildi
- [ ] DB hash güncellendi
- [ ] Login testi başarılı
- [ ] mustChangePassword dialog çıkmadı
- [ ] replit.md güncellendi (REDACTED)
- [ ] Eski plaintext referansları temizlendi
- [ ] Slack #pilot-it kanalına bildirim

**İmza**: ____________ (IT)  **Tarih**: 28 Nis 2026
