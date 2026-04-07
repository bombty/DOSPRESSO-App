---
name: dospresso-session-protocol
description: Master working protocol for DOSPRESSO development. Defines how Claude, Replit, and Aslan work together. Session start/end checklists, skill update rules, documentation standards, and project goals. READ THIS FIRST in every session.
---

# DOSPRESSO Çalışma Sistemi & Oturum Protokolü
## Versiyon: 1.0 | 7 Nisan 2026

---

## 1. ROLLER VE SORUMLULUKLAR

### Aslan (Product Owner)
- Karar verir: ne yapılacak, öncelik sırası, tasarım onayı
- Test eder: canlı sistemde (Replit üzerinden)
- Köprü kurar: Claude ↔ Replit arasında rapor taşır
- Vizyon belirler: franchise büyüme hedefleri, pilot plan

### Claude (IT Danışman / Yazılım Mimarı)
- Kod yazar: büyük feature, mimari kararlar, yeni modüller
- GitHub'a push eder: tüm kod değişiklikleri
- Doküman yazar: devir teslim, analiz, plan
- Skill dosyalarını günceller: her oturum sonunda
- Replit talimatı hazırlar: DB migration, seed, test

### Replit Agent (DevOps / Test)
- Git pull yapar: Claude'un push'larını çeker
- DB migration uygular: ALTER TABLE, CREATE TABLE, seed
- Test eder: API, UI, veri doğrulama
- Rapor verir: detaylı test sonuçları
- Küçük fix'ler: typo, import, enum, SQL düzeltmeleri
- Agent maliyetini düşük tutmak için: sadece DB + test + rapor

---

## 2. OTURUM BAŞI PROTOKOLÜ (Her seferinde, hatırlatma gerekmez)

Claude her oturumda şu adımları otomatik yapar:

### Adım 1: Devir Teslim Oku
```bash
ls -t docs/DEVIR-TESLIM-*.md | head -1  # En son tarihli
cat docs/DEVIR-TESLIM-[EN-SON-TARİH].md
```

### Adım 2: Git Pull
```bash
git pull --rebase origin main
git log --oneline -5
```

### Adım 3: Skill Dosyalarını Oku
Tüm /mnt/skills/user/*/SKILL.md dosyalarını oku.

### Adım 4: Sistem Durumu Kontrolü
```bash
wc -l shared/schema/schema-*.ts  # Tablo sayısı
ls server/routes/*.ts | wc -l     # Route sayısı
```

---

## 3. OTURUM SONU PROTOKOLÜ (Her seferinde, hatırlatma gerekmez)

### Adım 1: Devir Teslim Dokümanı Yaz + Push
- Dosya: `docs/DEVIR-TESLIM-[TARİH].md`
- İçerik: Yapılanlar, bilinen sorunlar, sıradaki adımlar
- Git push

### Adım 2: Skill Dosyalarını Güncelle
KURAL: Eğer bu oturumda aşağıdakilerden biri olduysa, ilgili skill güncellenmeli:

| Olay | Güncellenecek Skill |
|------|---------------------|
| Yeni tablo/kolon eklendi | dospresso-architecture |
| Yeni modül/route eklendi | dospresso-architecture |
| Rol/yetki değişti | dospresso-architecture |
| Yeni mimari pattern keşfedildi | dospresso-architecture |
| Yeni bug pattern tespit edildi | dospresso-debug-guide |
| Yeni kontrol maddesi gerekti | dospresso-quality-gate |
| Workflow değişikliği oldu | dospresso-session-protocol |
| Replit yeni bilgi keşfetti | İlgili skill dosyası |
| Tablo/endpoint sayısı değişti | dospresso-architecture |

### Adım 3: Memory Güncelle
- Son commit hash
- Devir teslim dosya adı
- Kritik keşifler (max 500 karakter)

### Adım 4: Replit Talimatı Hazırla
- /mnt/user-data/outputs/REPLIT-[GÖREV].md
- İçerik: git pull, DB migration SQL, seed komutları, test adımları, rapor formatı

---

## 4. SKILL DOSYALARI KURALLARI

### Nerede Yaşar
```
/mnt/skills/user/
├── dospresso-architecture/SKILL.md    → Mimari, sayılar, yapı
├── dospresso-quality-gate/SKILL.md    → Commit öncesi kontroller
├── dospresso-debug-guide/SKILL.md     → Bug çözme pattern'ları
└── dospresso-session-protocol/SKILL.md → Bu dosya (çalışma sistemi)
```

### Ne Zaman Güncellenir
- Her oturum sonunda (yukarıdaki tablo kurallarına göre)
- Replit yeni keşif raporladığında
- Aslan yeni iş kuralı söylediğinde

### Ne Yazılır / Yazılmaz
✅ Yazılır: Mimari kararlar, pattern'lar, kontrol listeleri, sayısal durum
❌ Yazılmaz: Geçici iş durumu (o devir teslimde olur), token/şifre, kişisel bilgi

### GitHub'daki docs/ ile İlişki
- Skill dosyaları = kalıcı referans (pattern + kural)
- docs/ dosyaları = detaylı plan + analiz + devir teslim
- Skill dosyası docs/'a referans verebilir: "Detay: docs/PDKS-EXCEL-IMPORT-PLAN.md"

---

## 5. GITHUB DOCS/ YÖNETİMİ

### Dosya Kategorileri
| Prefix | Amaç | Güncelleme |
|--------|-------|------------|
| DEVIR-TESLIM-*.md | Oturum özeti | Her oturum sonunda yeni dosya |
| *-PLAN.md | Sprint/feature planları | İlk yazılır, tamamlanınca arşiv |
| *-ANALIZ-*.md | Derin analiz raporları | İlk yazılır, referans olarak kalır |
| 00-*.md ~ 04-*.md | Temel kurallar (North Star, DoD) | Nadiren değişir |
| BUSINESS-RULES.md | İş kuralları | Yeni kural eklenince güncellenir |
| DESIGN-SYSTEM.md | Tasarım token'ları | Tasarım değişince güncellenir |

### Eski Devir Teslim Dosyaları
Silinmez — geçmiş referans olarak kalır.
Yeni oturumda sadece EN SON tarihli okunur.

---

## 6. REPLİT KOORDİNASYON KURALLARI

### Push Sırası
1. Claude kod yazar → build kontrol → git push
2. Aslan Replit'e talimat yapıştırır
3. Replit git pull → DB migration → test → rapor
4. Aslan raporu Claude'a yapıştırır
5. Claude yeni bilgileri skill'lere yansıtır

### Replit'in Push Yapma Durumu
- Genelde push YAPMAZ (sadece test + rapor)
- İstisna: Küçük fix (typo, missing path mapping, SQL fix) → push edebilir
- Push ederse: Claude sonraki oturumda git pull ile çeker

### Agent Maliyet Optimizasyonu
- Claude TÜM kodu yazar → Replit sadece DB + test
- SQL migration'lar Claude tarafından yazılır → Replit kopyala-yapıştır
- Test talimatları detaylı (curl komutları dahil) → Replit düşünmesine gerek yok

---

## 7. PROJE HEDEFLERİ VE YOL HARİTASI

### Genel Vizyon
DOSPRESSO: 25 şubeli (hedef 55) Türk kahve franchise yönetim platformu.
Tek platform: Operasyon + İK + Finans + Eğitim + CRM + Fabrika + AI Agent

### Pilot Hedefi (~Nisan 2026)
- Lokasyonlar: Fabrika + HQ + Işıklar + Lara
- Amaç: Kullanıcı alışkanlığı oluşturmak
- Kritik: Boş ekran olmamalı, temel akışlar çalışmalı

### Kısa Vadeli Hedefler (Nisan 2026)
1. DuyuruStudioV2 D-R2 (AI görsel + yayın akışı)
2. PDKS Excel Import (geçmiş veri aktarımı)
3. Dobody CRM entegrasyonu (ticket monitoring)
4. Kesinti config admin paneli (Operasyon → Ayarlar)
5. Uyum Merkezi aktivasyonu (audit skorlama)

### Orta Vadeli Hedefler (Mayıs-Haziran 2026)
1. Payroll motor birleştirme (Motor 1 + Motor 2)
2. Fabrika F2 (üretim↔vardiya, stok KPI)
3. Maliyet dashboard UI
4. SGK/e-fatura entegrasyonu araştırma
5. Kasa sistemi API entegrasyonu

### Uzun Vadeli Hedefler (2026 H2)
1. 55 şubeye ölçeklendirme
2. Mobil uygulama (React Native veya PWA)
3. Franchise satış/onboarding otomasyonu
4. AI otonom karar eşiği (%90 güven → onaysız aksiyon)
5. Bölge/cluster yönetimi
