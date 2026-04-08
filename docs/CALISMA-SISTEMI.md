---
name: dospresso-session-protocol
description: Master working protocol for DOSPRESSO development. Defines how Claude, Replit, and Aslan work together. Session start/end checklists, skill update rules, documentation standards, and project goals. READ THIS FIRST in every session.
---

# DOSPRESSO Çalışma Sistemi v2.0 | 8 Nisan 2026

## OTURUM BAŞI (Otomatik — hatırlatma gerekmez)

1. Devir teslim oku: `ls -t docs/DEVIR-TESLIM-*.md | head -1`
2. Git pull: `git pull --rebase origin main`
3. 4 skill dosyasını oku (architecture, quality-gate, debug-guide, bu dosya)
4. Aslan'a sor: "Replit'ten yeni commit/rapor var mı?"

## OTURUM SONU (Otomatik — ASLA atlanmaz)

### Adım 1: Devir Teslim Yaz + Push
`docs/DEVIR-TESLIM-[TARİH].md` → yapılanlar, sorunlar, sıradaki

### Adım 2: SKILL DOSYALARI GÜNCELLE (ZORUNLU!)
Her oturum sonunda 4 skill dosyası kontrol edilir ve GÜNCELLENİR:

| Skill | Ne Zaman Güncellenir |
|-------|---------------------|
| architecture | Tablo/endpoint/rol/sayfa sayısı değişti. Yeni modül eklendi. Yeni mimari pattern. |
| quality-gate | Yeni kontrol maddesi gerekti. Yeni modül için check. |
| debug-guide | Yeni bug pattern tespit edildi. Yeni debugging prosedürü. |
| session-protocol | Workflow değişikliği. Yeni kural. |

**KURAL: "Bu oturumda hiçbir skill değişmedi" durumu NADİRDİR.** 
Eğer kod yazdıysan, muhtemelen en az architecture güncellenmelidir.

### Adım 3: GitHub docs/ Güncelle
| Dosya | Ne Zaman |
|-------|----------|
| DEVIR-TESLIM-*.md | Her oturum sonu (yeni dosya) |
| CALISMA-SISTEMI.md | Workflow değişince |
| BUSINESS-RULES.md | Yeni iş kuralı eklenince |
| DESIGN-SYSTEM.md | Tasarım token değişince |
| *-PLAN.md dosyaları | Sprint tamamlanınca "TAMAMLANDI" işaretle |
| docs/00-*.md temel kurallar | Nadiren değişir |

### Adım 4: Memory Güncelle
Son commit hash, devir teslim dosya adı, kritik keşifler.

### Adım 5: Replit Talimatı Hazırla
DB migration, seed, test → /mnt/user-data/outputs/

## GÜNCELLENECEK SAYILAR (Her oturum sonu kontrol)

Bu sayıları architecture skill'de güncel tut:
- Tablo sayısı: `ls shared/schema/schema-*.ts | wc -l` + grep pgTable count
- Endpoint sayısı: `grep -r "router\.\(get\|post\|patch\|delete\)" server/ --include="*.ts" | wc -l`
- Sayfa sayısı: `find client/src/pages -name "*.tsx" | wc -l`
- Rol sayısı: `grep -c "\":" shared/schema/schema-01.ts` (UserRole enum)
- Route dosyası: `ls server/routes/*.ts | wc -l`

## REPLİT KOORDİNASYON

### İş Bölümü
- Claude: Kod yazma, mimari, büyük feature → GitHub push
- Replit: DB migration, seed, test, rapor → push yapmaz (genelde)
- Replit küçük fix yapabilir (typo, missing mapping) → push eder

### Replit Raporlarından Öğrenme (KRİTİK!)
Replit raporu geldiğinde:
1. Yeni keşifleri skill dosyalarına yansıt
2. DB gerçek sayılarını architecture'a yaz
3. Bug pattern'larını debug-guide'a ekle
4. Yanlış varsayımlarımı düzelt (örn: 734 vs 4 gecikmiş)

### Agent Maliyet Optimizasyonu
Claude TÜM kodu yazar → Replit sadece DB + test
SQL migration Claude tarafından yazılır → Replit kopyala-yapıştır

## PROJE HEDEFLERİ

### Pilot (~Nisan 2026): Fabrika + HQ + Işıklar + Lara
### Kısa Vade: PDKS Excel, Dobody CRM, Fabrika F2
### Orta Vade: Motor birleştirme, SGK entegrasyon, 55 şube ölçeklendirme

## MALİYET OPTİMİZASYONU — Replit Agent Kullanımı

### Replit'e SADECE bunlar gönderilir:
1. `git pull` + `npm run build` (sunucu ortamı)
2. DB migration SQL'leri (CREATE TABLE, ALTER TABLE, INSERT seed)
3. API endpoint test (curl ile gerçek session)
4. Frontend sayfa açılma kontrolü
5. Kısa rapor: BUILD/DB/API/FRONTEND ✅/❌

### Claude BURADAN yapar (Replit'e göndermez):
1. Kod doğrulama (grep, route kontrol, yetki analiz)
2. Skill dosyaları güncelleme (4 skill)
3. Sayısal kontrol (tablo, sayfa, route, rol sayımı)
4. Denetim raporu hazırlama
5. Doküman yazma/güncelleme

### Replit talimat formatı (KISA):
```
# [Başlık] — DB + Test
## Commit: [hash]
git pull --rebase origin main && npm run build

## DB:
[SQL komutları]

## TEST:
[curl komutları + beklenen sonuç]

## RAPOR (5 satır):
BUILD: ✅/❌
DB: ✅/❌
API: ✅/❌
FRONTEND: ✅/❌
PUSH: hayır
```
