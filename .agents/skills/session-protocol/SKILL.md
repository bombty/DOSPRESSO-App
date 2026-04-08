---
name: session-protocol
description: DOSPRESSO oturum sonu zorunlu protokolü (Çalışma Sistemi v2.0). Her oturum sonunda 5 adım sırasıyla uygulanmalıdır. "Bu oturumda hiçbir skill değişmedi" demek neredeyse imkansızdır.
---

# DOSPRESSO Çalışma Sistemi v2.0 — Oturum Sonu Protokolü

## ZORUNLU — Her Oturum Sonunda (5 Adım, Sırasıyla)

"Bu oturumda hiçbir skill değişmedi" demek neredeyse **IMKANSIZDIR**.
- Kod yazdıysan → en az `dospresso-architecture` güncellenmeli (sayılar değişti)
- Bug çözdüysen → `dospresso-debug-guide` güncellenmeli
- Yeni kontrol gerekiyorsa → `dospresso-quality-gate` güncellenmeli
- Workflow değiştiyse → bu dosya (`session-protocol`) güncellenmeli

---

## Adım 1 — Devir Teslim Yaz + Push

```bash
git add -A
git commit -m "fix/feat: [konu] — [özet]"
git push origin main
```

> Not: Token gerektiren durumlarda AGENTS.md §1 "Push Komutu" bölümüne bakın.
> Token'ı doğrudan komuta gömmeyin — repo push reject eder.

Commit mesajı formatı:
- `fix:` → hotfix (typo, import, SQL ALTER TABLE)
- `feat:` → yeni özellik (IT sprint commit pull)
- `docs:` → sadece skill/döküman güncelleme

---

## Adım 2 — 4 Skill Dosyasını Güncelle

| Skill | Ne Zaman Güncellenir? | Örnek Değişiklik |
|---|---|---|
| `dospresso-architecture` | Tablo/endpoint/rol/sayfa sayısı değişti | "27 Roles" → "29 Roles" |
| `dospresso-debug-guide` | Yeni bug tespit edilip çözüldü | §17 Drizzle kolon uyuşmazlığı |
| `dospresso-quality-gate` | Yeni kontrol maddesi gerekti | Madde 19: Schema-DB sync |
| `session-protocol` | Workflow'un kendisi değişti | Bu adımlar güncellenirse |

### Güncelleme Kontrol Listesi:

**dospresso-architecture:**
- [ ] Rol sayısı doğru mu? (şu an: 29)
- [ ] `pages/` sayısı doğru mu? (şu an: 278)
- [ ] `routes/` sayısı doğru mu? (şu an: 94)
- [ ] Schema dosyası sayısı doğru mu? (şu an: 16)
- [ ] Yeni tablolar "New Tables" bölümünde mi?
- [ ] Yeni route dosyaları "New Route Files" bölümünde mi?
- [ ] Yeni modül "Completed Modules" bölümünde mi?

**dospresso-debug-guide:**
- [ ] Yeni hata tipi Quick Triage tablosuna eklendi mi?
- [ ] İlgili §N bölümü yazıldı mı?

**dospresso-quality-gate:**
- [ ] Yeni madde eklendi mi?
- [ ] Başlık ve description'daki rakam güncellendi mi?
- [ ] Rapor şablonundaki sıra güncellendi mi?

---

## Adım 3 — GitHub docs/ Güncelle

```bash
# Değişiklik varsa:
git add docs/
git commit -m "docs: [konu] güncellendi"
git push origin main
```

| Dosya | Ne Zaman? |
|---|---|
| `docs/CALISMA-SISTEMI.md` | Süreç/workflow değişikliği |
| `docs/BUSINESS-RULES.md` | Yeni iş kuralı keşfi |
| `docs/sprint-planlar/` | Sprint tamamlandı veya değişti |

---

## Adım 4 — Memory Güncelle (replit.md)

`replit.md` dosyasına şunları yaz:
- Son başarılı commit hash
- Kritik keşifler (DB mismatch, route sorunu, yeni kural)
- Bekleyen maddeler listesi

---

## Adım 5 — Replit Talimatı Hazırla

Bir sonraki oturum başına bağlam notu:

```
Sprint: R-X
Son commit: [hash]
Bekleyen sorunlar:
  - [sorun 1]
  - [sorun 2]
Test edilmesi gereken endpoint'ler:
  - POST /api/factory/[endpoint]
  - GET /api/[module]/[endpoint]
Önemli dosyalar:
  - server/routes/[router].ts
  - client/src/pages/[page].tsx
```

---

## Sık Atlanan Hatalar

1. **Architecture sayıları güncellenmez** → Bir sonraki oturum yanlış bilgiyle başlar
2. **Debug-guide'a §N eklenmez** → Aynı bug sonraki sprintte tekrar zaman alır
3. **Quality-gate madde eklenmez** → Aynı kontrol atlanmaya devam eder
4. **Commit mesajı genel kalır** → IT danışman ne yapıldığını anlamaz
5. **Bekleyen maddeler yazılmaz** → Oturum kapandığında kaybolur

---

## Güncel Sistem Durumu (08.04.2026 itibarıyla)

| Metrik | Değer |
|---|---|
| Roller | 29 |
| Sayfalar | 278 |
| Route dosyaları | 94 |
| Schema dosyaları | 16 |
| Quality Gate maddeleri | 19 |
| Debug guide bölümleri | §17 |
| Son Sprint | R-4 (tamamlandı) |
| Bekleyen | product_recipes→factory_recipes migration (12 kayıt) |
