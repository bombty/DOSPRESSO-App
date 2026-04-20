# Pilot Bordro / Skor / Sistem Donmuş Kararları

**Tarih:** 21 Nisan 2026
**Karar Mercii:** Aslan (CEO)
**Geçerlilik:** Pilot süresince (28 Nis - 4 May 2026 + 1 hafta uzatma opsiyonu)

> Bu doküman pilot süresince **DEĞİŞMEYECEK** sistem ayarlarını listeler. Operasyonel kafa karışıklığı olmaması için tüm pilot ekibe paylaşılır.

---

## Karar Listesi (Aslan Onay Bekliyor)

### KARAR 1 — Bordro DataSource: Kiosk
- **Karar:** Pilot süresince bordro **sadece kiosk verisinden** hesaplanır. PDKS Excel import devre dışı.
- **Gerekçe:** Çift veri kaynağı çakışma riski. Kiosk gerçek zamanlı + GPS doğrulamalı.
- **Kod etkisi:** `pdks_excel_import_enabled=false`, `payroll dataSource` server-side "kiosk" zorla
- **Sorumlu:** Mahmut (muhasebe_ik)
- **Aslan onay:** [ ] Onaylandı  /  [ ] Değişiklik istedi: ___________

### KARAR 2 — Bordro DRY_RUN Modu (Mayıs Bordrosu)
- **Karar:** Pilot ilk ay sonu (Mayıs 31) Mahmut bordroyu **DRY_RUN modunda** çalıştırır. Gerçek SGK bildirimi YAPILMAZ.
- **Gerekçe:** Pilot test verisidir, SGK'ya yanlış bildirim cezaya yol açar. Pilot başarılıysa Haziran'dan itibaren gerçek mod.
- **Kod etkisi:** `payroll_force_dry_run=true`, monthly_payroll `is_dry_run=true` flag
- **Sorumlu:** Mahmut + IT Danışman
- **Aslan onay:** [ ] Onaylandı  /  [ ] Değişiklik istedi: ___________

### KARAR 3 — Skor Sıfırlama Pazar 22:30
- **Karar:** Pilot başlamadan önce (27 Nis Pazar 22:30) `launch-reset.ts` çalıştırılır:
  - SİLİNECEK: `employee_performance_scores`, `factory_worker_scores`, `branch_quality_audits` (pilot başlangıç tarihinden eski olanlar)
  - SIFIRLANACAK: `monthly_employee_performance` (pilot başlangıç tarihinden sonra yeniden hesaplanır)
  - **KORUNACAK:** `monthly_snapshots` (geçmiş trend kanıtı için, dashboard filtrelemesinde "Pilot Başlangıcı: 28 Nis" filtresi zorunlu)
- **Gerekçe:** Pilot temiz başlangıç + geçmiş başarı kayıtları kanıt olarak kalır
- **Kod etkisi:** `launch-reset.ts` test edilmeli, doküman yazılmalı
- **Sorumlu:** IT Danışman
- **Aslan onay:** [ ] Onaylandı  /  [ ] Değişiklik istedi: ___________

### KARAR 4 — Skor Görünüm: Pilot İlk Hafta Banner
- **Karar:** Pilot ilk hafta (28 Nis - 4 May) kiosk barista ekranında **skor görünür ama banner ile uyarı**:
  > "📊 Pilot ilk hafta — skorlar toplama dönemi. Gerçek değerlendirme 5 May'dan sonra başlar."
- **Gerekçe:** Day-1 demotivasyon önleme (0/100 skor görmek)
- **Kod etkisi:** `pilot_score_display_mode='banner'` (5 May 00:00 → 'normal')
- **Sorumlu:** IT Danışman
- **Aslan onay:** [ ] Onaylandı  /  [ ] Değişiklik istedi: ___________

### KARAR 5 — Personel Rotasyon YASAK
- **Karar:** Pilot süresince **hiçbir personel pilot lokasyonlar arası rotasyon YAPMAZ**. Yeni personel alımı YOK.
- **Gerekçe:** Skor formül farkı (şube vs fabrika), eğitim eksikliği, kafa karışıklığı önleme
- **Operasyonel etki:** Hastalık/acil çıkış olursa Coach + Şube Müdürü direkt iletişim, manuel çözüm
- **Sorumlu:** Coach (yavuz) + tüm şube müdürleri
- **Aslan onay:** [ ] Onaylandı  /  [ ] Değişiklik istedi: ___________

### KARAR 6 — Mola Eşiği: 90 → 120 Dakika (Geçici)
- **Karar:** Pilot ilk hafta mola alarm eşiği **90 dk → 120 dk**. 5 May'dan sonra 90 dk'ya geri döner.
- **Gerekçe:** Day-1 öğle yemeği + ek mola + sigara + tuvalet → kolayca 90 dk geçer, supervisor spam bildirim
- **Kod etkisi:** `break_alert_threshold_minutes=120` (5 May → 90)
- **Sorumlu:** IT Danışman + supervisor
- **Aslan onay:** [ ] Onaylandı  /  [ ] Değişiklik istedi: ___________

### KARAR 7 — Yeni Modül / Yeni Rol Açma YASAK
- **Karar:** Pilot süresince **hiçbir yeni modül aktivasyonu, yeni rol oluşturma, yeni branch ekleme YAPILMAZ**.
- **Gerekçe:** Sistem kararlılığı, eğitim eksikliği, test edilmemiş feature riski
- **İstisna:** Aslan + IT Danışman + Replit Agent oybirliği ile acil bug fix (release ek değil sadece düzeltme)
- **Aslan onay:** [ ] Onaylandı  /  [ ] Değişiklik istedi: ___________

### KARAR 8 — GPS Manuel Bypass Yetkisi
- **Karar:** Kiosk shift-start GPS başarısızsa **supervisor PIN'i ile manuel onay** mümkün. Audit log zorunlu.
- **Gerekçe:** Tablet GPS izni vermezse veya konum yanlışsa vardiya başlamaz, blocker
- **Kod etkisi:** Yeni endpoint `kiosk/shift-start-manual-approve`
- **Limit:** Pilot ilk gün max %5 manuel bypass alarmı (aşılırsa Mr. Dobody → Coach)
- **Sorumlu:** IT Danışman + Coach
- **Aslan onay:** [ ] Onaylandı  /  [ ] Değişiklik istedi: ___________

---

## Karar Özet Tablosu

| # | Karar | Etki | Aslan Onay |
|---|-------|------|------------|
| 1 | Bordro DataSource: kiosk | Tek otorite | [ ] |
| 2 | Bordro DRY_RUN | SGK koruma | [ ] |
| 3 | Skor reset Pazar 22:30 | Temiz başlangıç | [ ] |
| 4 | Skor banner ilk hafta | Demotivasyon önleme | [ ] |
| 5 | Personel rotasyon YASAK | Sistem stabilite | [ ] |
| 6 | Mola eşiği 90 → 120 dk | Spam önleme | [ ] |
| 7 | Yeni modül/rol/branch YASAK | Kararlılık | [ ] |
| 8 | GPS manuel bypass + audit | Day-1 blocker önleme | [ ] |

---

## Onay Süreci

1. **21 Nis Pazartesi (bugün):** Doküman Aslan'a sunulur
2. **22 Nis Salı 18:00 deadline:** Aslan onay verir veya değişiklik ister
3. **23 Nis Çarşamba:** IT Danışman görev paketini başlatır (`IT-DANISMAN-GOREV-PAKETI.md`)
4. **26 Nis Cumartesi 12:00:** IT Danışman teslimat
5. **26 Nis Cumartesi 14:00-18:00:** Aslan + Replit Agent + IT Danışman smoke test
6. **27 Nis Pazar 18:00:** Coach vardiya planı tamam
7. **27 Nis Pazar 22:30:** DB izolasyon + skor reset
8. **28 Nis Pazartesi 08:00:** adminhq parola rotasyon
9. **28 Nis Pazartesi 09:00:** PİLOT GO-LIVE 🚀

---

## Pilot Sonrası (5 May Sonrası) — Otomatik Geri Alınacaklar

- [ ] `pilot_mode=false`
- [ ] `pilot_score_display_mode='normal'`
- [ ] `break_alert_threshold_minutes=90`
- [ ] `pdks_excel_import_enabled=true` (eğer Aslan onaylarsa)
- [ ] `payroll_force_dry_run=false` (Haziran bordrosu gerçek mod)
- [ ] Personel rotasyon yasağı kaldırılır (Aslan onayı sonrası)
- [ ] Yeni modül aktivasyon değerlendirme (kademeli)

---

**Sahip:** Aslan (CEO, karar verici) → Replit Agent (dokümantasyon) → IT Danışman (yürütme)
**Versiyon:** v1.0 / 21 Nis 2026
