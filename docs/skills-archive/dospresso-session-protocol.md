---
name: dospresso-session-protocol
description: DOSPRESSO Claude oturum protokolü. Her oturum başında ve sonunda yapılması zorunlu disiplin adımlarını tanımlar. Pilot hazırlık döneminde (Nisan 2026) skill güncellemesi, dashboard senkronizasyonu, ve commit disiplinini garanti eder. Use at the START of every Claude session and at the END before declaring work complete.
---

# DOSPRESSO Session Protocol

Her Claude oturumu, **disiplinli giriş + çıkış** ile çalışır. Bu skill bu disiplini garanti eder.

## OTURUM BAŞI — İlk 5 Dakika

### Adım 1: Bağlam Yükleme (3 dk)
```bash
cd /home/claude/dospresso  # Eğer varsa, yoksa git clone
git fetch origin && git pull --rebase origin main
git log --oneline -10  # Son commit'leri gör
cat docs/00-DASHBOARD.md | head -50  # Mevcut durum
```

### Adım 2: Skill Versiyonu Kontrolü (1 dk)
```bash
ls -la /mnt/skills/user/dospresso-*/SKILL.md
# Tarihleri kontrol et — son güncelleme ne zaman?
```

Eğer dashboard'da "Son Güncelleme" tarihinden sonra commit'ler varsa:
- Skill'lere yeni dersler eklendi mi kontrol et
- Yoksa, bu oturumun **EN ÖNEMLİ İŞİ** o güncellemeyi yapmak

### Adım 3: Tool Listesi (1 dk)
- Replit'in son raporu var mı? (attached_assets/ veya yeni commit'ler)
- Aktif task var mı?
- Pilot tarihi ne kadar yakın? (28 Nis sabit)

## OTURUM ESNASINDA — Her Sprint Sonrası

### Madde 37 §22: Build BOTH Backend + Frontend
Her kod değişikliğinden sonra:
```bash
npx esbuild server/index.ts --bundle --platform=node --format=esm --packages=external --outfile=/tmp/test.js
# ✅ Done in <2s

npx vite build
# ✅ built in <2m
```

### Madde 37 §24: SQL Yazmadan Önce Kolon Doğrulama
```bash
grep -A 30 "export const <table_name> = pgTable" shared/schema/schema-*.ts
```
Kolonu varsayma. ÖZELLİKLE LEFT JOIN + SELECT'te.

### Madde 37 §25: Replit Inisiyatif Kod Review
Replit kod yazdıysa:
```bash
git show <commit_hash> --stat
git diff HEAD~1 HEAD
```
Onaylanabilir mi? Sprint I'a not edilmeli mi?

## OTURUM SONU — Çıkıştan Önce ZORUNLU

### Adım 1: Memory Güncelle (gerekiyorsa)
Bu oturumda **yeni bir ders öğrenildi mi?** (örn yeni bug pattern, yeni kural, yeni preference)
```python
# memory_user_edits tool ile ekle
```

### Adım 2: Skill Güncelle (memory yetmez!)
Memory geçici, **skill kalıcı.** Yeni ders skill'e de eklenmeli:
- Bug pattern → `dospresso-debug-guide`
- Kalite kontrol kuralı → `dospresso-quality-gate`
- Yeni helper / endpoint / tablo → `dospresso-architecture`
- Disiplin/protokol değişikliği → `dospresso-session-protocol` (bu dosya)

**KRİTİK**: Skill'ler `/mnt/skills/user/` altında **read-only** mounted. Güncellemeyi:
1. `/home/claude/dospresso/.skills-update/` çalışma dizinine kopyala
2. Düzenle
3. Aslan'a "şu dosyaları skill yerine koymalısın" mesajı ver
4. Veya Replit'e devret (Madde 38 paslaşma)

### Adım 3: 00-DASHBOARD.md Güncelle (3 dk)
Her oturum sonu, eğer:
- Yeni sprint commit edildi → Aktif Sprint satırı güncelle
- Pilot hazırlık skoru değişti → güncelle
- Yeni risk veya engel ortaya çıktı → ekle
- Yeni Madde 37 alt kuralı → "Last Updated" tarihini değiştir

### Adım 4: Tüm Değişiklikleri Push Et
```bash
git status  # Local'de unstaged değişiklik kalmasın
git add docs/00-DASHBOARD.md  # En azından dashboard
git commit -m "docs(dashboard): <oturum özeti>"
git push "https://<TOKEN>@github.com/bombty/DOSPRESSO-App.git" HEAD:main
```

### Adım 5: Aslan'a Özet (1 paragraf)
Çıkmadan önce Aslan'a:
- Bu oturumda ne yapıldı (3-5 madde)
- Kalan iş ne (varsa)
- Replit'e devredilen iş varsa onun mesajı hazır mı
- Pilot için risk/engel var mı

## Pilot Hazırlık 2026 Özel Disiplin

### Feature Freeze (18 Nis - 28 Nis)
Yeni özellik YAZMA. İstisnalar (Aslan onayıyla):
- Bug fix altyapısı (örn task_escalation_log dedup tablosu)
- Pilot için zorunlu monitoring (örn pilot-dashboard, critical-logs)

### Pilot Şubeleri Bilinmeli
```typescript
const PILOT_BRANCH_IDS = [5, 8, 23, 24];  // Işıklar, Lara, HQ, Fabrika
```
Pilot ile ilgili her endpoint/sayfa bu sabit kullanmalı.

### Token Yönetimi
- GitHub token memory #19'da
- Token expire olursa Aslan yenisini verir
- Token ASLA dosya içine yazma — sadece komut satırında

### Replit Paslaşma (Madde 38)
- Backend → Claude
- Frontend UI → Replit
- Test + smoke → Replit
- Yarım iş → push + Replit'e net görev

## Disiplin Açığı Kontrol Listesi (Oturum Sonu)

Çıkmadan önce kendine sor:
- [ ] 00-DASHBOARD.md güncel mi?
- [ ] Skill'ler bu oturumda öğrenilen dersleri yansıtıyor mu?
- [ ] Memory güncellendi mi (önemli ders varsa)?
- [ ] Tüm commit'ler push edildi mi?
- [ ] Replit'e net görev mesajı verildi mi (varsa)?
- [ ] Aslan bir sonraki oturumda nereden devam edeceğini biliyor mu?

Eğer herhangi biri "hayır" → çıkmadan önce o işi tamamla.
