# DOSPRESSO Academy V2 - Kullanıcı Akışları & Next Best Action

> Source of Truth: Bu dosya tüm kullanıcı akışlarını ve NBA motor kurallarını tanımlar.
> Son güncelleme: 2026-02-22

---

## 1. Stajyer Onboarding Akışı (Gün 1-14)

### Ön Koşullar
- Personel sisteme eklendi (`users` tablosu, role = `stajyer`)
- Şubeye atandı (`branchId` ayarlandı)
- Supervisor veya Mentor atandı

### Tetiklenme
Yeni personel ilk kez sisteme giriş yaptığında → otomatik olarak 14 günlük onboarding paketi atanır.

### Gün Gün Program

#### Hafta 1: Temel Oryantasyon (Gün 1-7)

| Gün | Konu | İçerik Tipi | Zorunlu | Onaylayan |
|-----|------|-------------|---------|-----------|
| 1 | Hoş Geldin & Şirket Kültürü | module | Evet | Supervisor |
| 1 | HACCP & Hijyen Temelleri | module + quiz | Evet | Otomatik |
| 2 | Kişisel Hijyen & Apron Kullanımı | module + practical | Evet | Mentor |
| 2 | Depo & Soğuk Zincir Kuralları | module + quiz | Evet | Otomatik |
| 3 | Bar Tanıtımı & Ekipman Tanıma | module | Evet | Mentor |
| 3 | POS Sistemi Temelleri | module + practical | Evet | Supervisor |
| 4 | Espresso Makinesi Kullanımı | module + practical | Evet | Mentor |
| 4 | Süt Buharlaştırma (Temel) | module + practical | Evet | Mentor |
| 5 | Filtre Kahve & Americano | recipe + practical | Evet | Mentor |
| 5 | Açılış Prosedürü | module + checklist | Evet | Supervisor |
| 6 | Kapanış Prosedürü | module + checklist | Evet | Supervisor |
| 6 | Müşteri İletişimi Temelleri | module | Evet | Otomatik |
| 7 | Hafta 1 Tekrar Quizi | quiz (20 soru) | Evet | Otomatik |
| 7 | Mentor Gözlem Raporu | practical | Evet | Mentor |

#### Hafta 2: Uygulama & Pekiştirme (Gün 8-14)

| Gün | Konu | İçerik Tipi | Zorunlu | Onaylayan |
|-----|------|-------------|---------|-----------|
| 8 | Latte & Cappuccino Hazırlama | recipe + practical | Evet | Mentor |
| 8 | Sıcak Çikolata & Chai | recipe + practical | Evet | Mentor |
| 9 | Soğuk İçecekler (Iced Latte, Cold Brew) | recipe + practical | Evet | Mentor |
| 9 | Blender Kullanımı & Smoothie | recipe + practical | Evet | Mentor |
| 10 | Kasa İşlemleri & Ödeme Tipleri | module + practical | Evet | Supervisor |
| 10 | Sipariş Yönetimi (Yoğun Dönem) | module + practical | Evet | Mentor |
| 11 | Stok Kontrolü & Kayıp Önleme | module + quiz | Evet | Otomatik |
| 11 | Temizlik Prosedürleri (Günlük/Haftalık) | module + checklist | Evet | Supervisor |
| 12 | Denetim Altında Bağımsız Çalışma (Sabah) | practical | Evet | Supervisor |
| 13 | Denetim Altında Bağımsız Çalışma (Akşam) | practical | Evet | Supervisor |
| 14 | **Gate-0 Sınavı** | gate_exam + practical | Evet | Supervisor + Sistem |

### Günlük Akış (Staff Perspektifi)
```
1. Stajyer uygulamayı açar
2. "Benim Yolum" tab'ı açılır
3. Üst banner: "Onboarding — Gün 5/14" + ilerleme çubuğu
4. Bugünkü adımlar listesi:
   ☐ Filtre Kahve & Americano (Reçete) — 20 dk
   ☐ Pratik: 3 Americano hazırla (Mentor onayı bekliyor)
   ☐ Açılış Prosedürü (Checklist) — 15 dk
5. Adıma tıklar → modül/quiz/checklist açılır
6. Tamamladıkça ✓ işaretlenir
7. Pratik adımlar → Mentor'a bildirim gider → Mentor onaylar
8. Gün sonunda tüm adımlar tamamlandı → "Gün 5 tamamlandı!" bildirimi
```

### Gate-0 Sınav Akışı (Gün 14)
```
1. Sistem otomatik tetikler: "Gate-0 sınavın hazır!"
2. Stajyer → Benim Yolum'da "Gate-0 Sınavı" kartını görür
3. Quiz bölümü: 20 soru, 30 dakika süre
4. Pratik bölüm: Supervisor 10 maddelik gözlem listesini doldurur
5. Devam kontrolü: Sistem otomatik hesaplar (14 günde katılım oranı)
6. Sonuç:
   - 3 bileşen de geçildi → ✅ "Tebrikler! Bar Buddy seviyesine terfi ettiniz!"
   - Herhangi biri başarısız → ⚠️ "7 gün ek süre, tekrar Gate-0"
   - İkinci başarısızlık → 🔴 Coach'a bildirim + inceleme
```

---

## 2. Bar Buddy → Barista Geçiş Akışı

### Ön Koşullar
- Bar Buddy olarak minimum 30 gün
- Tüm zorunlu Bar Buddy modülleri tamamlanmış
- Composite score >= 70

### Tetiklenme
Supervisor, personelin profilinden "Terfi Talebi" oluşturur → Coach onayı → Gate-1 sınavı aktifleşir.

### Akış
```
1. Supervisor → Personel Profili → "Barista Terfi Talebi" butonuna tıklar
2. Sistem kontrol eder:
   - ✅ 30 gün dolmuş mu?
   - ✅ Zorunlu modüller tamamlanmış mı?
   - ✅ Composite score >= 70?
3. Kontrol geçtiyse → Coach'a talep bildirimi
4. Coach onaylarsa → Gate-1 sınavı personelin "Benim Yolum"unda aktifleşir
5. Personel Gate-1'i tamamlar:
   - Quiz: 30 soru, min %80
   - Pratik: Trainer ile 5 farklı içecek hazırlama
   - KPI: Son 30 gün fire < %5
6. Tüm bileşenler geçildi → Otomatik terfi: barista role
7. Rozet verilir: "Barista Sertifikası" 🏆
```

---

## 3. Barista → Supervisor Buddy Geçiş Akışı

### Ön Koşullar
- Barista olarak minimum 90 gün
- Tüm zorunlu Barista modülleri tamamlanmış
- Composite score >= 75
- Manager değerlendirme notu >= 4/5

### Akış
```
1. Supervisor/Coach → Terfi talebi oluşturur
2. Sistem ön kontrolleri yapar
3. Coach + CGO onayı gerekli
4. Gate-2 aktifleşir:
   - Kapsamlı quiz: 40 soru, min %85
   - 1 hafta asistan vardiya yönetimi (Supervisor gözlemi)
   - KPI: Performans skoru > 75
5. Tüm bileşenler geçildi → supervisor_buddy role'e terfi
```

---

## 4. Coach/Trainer Yönetim Akışları

### 4a. İçerik Paketi Oluşturma (Coach)
```
1. Coach → İçerik Yönetimi tab'ına gider
2. "Yeni Paket Oluştur" butonuna tıklar
3. Paket bilgilerini girer:
   - Ad: "Barista Onboarding Paketi"
   - Hedef rol: stajyer
   - Süre: 14 gün
4. Günlük adımları sürükle-bırak ile düzenler:
   - Gün 1: [HACCP Modülü] + [Hijyen Quiz]
   - Gün 2: [Bar Tanıtımı] + [Pratik: Ekipman]
   - ...
5. Her adım için ayarlar: zorunlu/opsiyonel, süre, geçme notu
6. "Yayınla" → Tüm şubelerde aktif olur
```

### 4b. Ekip İlerlemesi Takibi (Coach/Trainer)
```
1. Coach → Ekip İlerlemesi tab'ına gider
2. Personel listesi: seviye, ilerleme %, son aktivite, uyarılar
3. Kırmızı uyarılar:
   - 🔴 "Ahmet: Gate-0 başarısız, 2. deneme hakkı"
   - 🟡 "Fatma: 3 gündür aktivite yok"
   - 🟠 "Mehmet: Fire oranı %8, eğitim önerildi"
4. Personele tıklar → detaylı ilerleme sayfası
5. "Modül Ata" butonu → ek modüller atayabilir
```

### 4c. Gate Onaylama (Coach)
```
1. Coach → Onay Bekleyenler tab'ına gider
2. Terfi talepleri listesi
3. Talebe tıklar → detayları inceler:
   - Supervisor notu
   - Mevcut ilerleme
   - KPI özeti
4. "Onayla" veya "Reddet" (ret nedeni zorunlu)
5. Onay → Gate sınavı personele açılır
```

---

## 5. Next Best Action (NBA) Motor Kuralları

### Prensip
Kullanıcı hiçbir zaman "ne yapmalıyım?" diye sormamalı. Sistem her zaman sıralı bir "şimdi bunu yap" listesi sunar.

### Önceliklendirme Sırası (yüksekten düşüğe)

```
Öncelik 1: ZORUNLU & BUGÜN VADESİ DOLAN
  → Onboarding adımları (bugünkü gün)
  → Vadesi bugün olan atanmış modüller
  → Tamamlanmamış checklist'ler

Öncelik 2: ZORUNLU & GECİKMİŞ
  → Dünden kalan tamamlanmamış adımlar
  → Gecikmiş quiz tekrarları (cooldown bitmiş)

Öncelik 3: KPI SİNYALİ ÖNERİSİ
  → Fire oranı yüksek → "Fire Azaltma Eğitimi"
  → Soğuk zincir ihlali → "Soğuk Zincir Protokolü"
  → Geç gelen checklist → "Zaman Yönetimi"
  → Düşük quiz skoru → ilgili modülün tekrarı

Öncelik 4: SEVİYE GELİŞİM (sonraki gate'e hazırlık)
  → Mevcut seviyenin tamamlanmamış zorunlu modülleri
  → prerequisiteModuleIds sırasına göre

Öncelik 5: ÖNERİLEN (isteğe bağlı)
  → Rol bazlı opsiyonel modüller
  → Reçete keşfi
  → Gelişmiş beceriler

Öncelik 6: TEKRAR / TAZELENDİRME
  → Sertifikası süresi dolmak üzere olan modüller
  → 90 günden uzun süredir tekrar edilmeyen kritik modüller
```

### NBA Hesaplama Algoritması (Rule-Based)

```typescript
function calculateNextBestActions(userId: string): ActionItem[] {
  const actions: ActionItem[] = [];
  const user = getUser(userId);
  const progress = getUserCareerProgress(userId);
  const today = new Date();

  // 1. Onboarding aktif mi?
  const onboarding = getActiveOnboarding(userId);
  if (onboarding && onboarding.status !== 'completed') {
    const dayNumber = diffDays(onboarding.startDate, today);
    const todaySteps = getOnboardingStepsForDay(onboarding.templateId, dayNumber);
    const completedSteps = getCompletedSteps(onboarding.id);
    
    // Bugünün tamamlanmamış adımları → Öncelik 1
    todaySteps
      .filter(step => !completedSteps.includes(step.id))
      .forEach(step => actions.push({
        priority: 1,
        type: step.contentType,
        contentId: step.trainingModuleId,
        title: step.title,
        reason: `Onboarding Gün ${dayNumber} — zorunlu adım`,
        estimatedMinutes: step.estimatedDuration,
      }));

    // Dünden kalan adımlar → Öncelik 2
    const yesterdaySteps = getOnboardingStepsForDay(onboarding.templateId, dayNumber - 1);
    yesterdaySteps
      .filter(step => !completedSteps.includes(step.id))
      .forEach(step => actions.push({
        priority: 2,
        type: step.contentType,
        contentId: step.trainingModuleId,
        title: step.title,
        reason: 'Dünden kalan — tamamla',
      }));
  }

  // 2. KPI sinyalleri
  const kpiSignals = evaluateKPISignals(userId);
  kpiSignals.forEach(signal => actions.push({
    priority: 3,
    type: 'kpi_training',
    contentId: signal.recommendedModuleId,
    title: signal.moduleName,
    reason: signal.reason, // "Fire oranı %8 — hedef <%5"
  }));

  // 3. Seviye gelişim modülleri
  const currentLevel = progress.currentCareerLevelId;
  const requiredModules = getRequiredModulesForLevel(currentLevel);
  const completedModules = progress.completedModuleIds || [];
  requiredModules
    .filter(m => !completedModules.includes(m.id))
    .filter(m => prerequisitesMet(m, completedModules))
    .forEach(m => actions.push({
      priority: 4,
      type: 'module',
      contentId: m.id,
      title: m.title,
      reason: `${getLevelName(currentLevel)} seviyesi — zorunlu modül`,
    }));

  // 4. Önerilen (opsiyonel)
  const roleModules = getModulesForRole(user.role);
  roleModules
    .filter(m => !completedModules.includes(m.id))
    .filter(m => !m.isRequired)
    .slice(0, 3)
    .forEach(m => actions.push({
      priority: 5,
      type: 'module',
      contentId: m.id,
      title: m.title,
      reason: 'Önerilen gelişim modülü',
    }));

  return actions.sort((a, b) => a.priority - b.priority);
}
```

### KPI Sinyal → İçerik Eşleştirme Kuralları

| KPI Sinyali | Eşik | Tetiklenen Modül | Bildirim |
|-------------|-------|-----------------|----------|
| Fire/zayi oranı > %5 | Son 30 gün | "Kayıp Önleme & Stok Yönetimi" | Coach + personel |
| Soğuk zincir ihlali | Herhangi bir olay | "Soğuk Zincir Protokolü" | Supervisor + Coach |
| Geç checklist tamamlama > %20 | Son 14 gün | "Zaman Yönetimi & Prosedürler" | Supervisor |
| Quiz skoru < %60 | Son deneme | İlgili modülün tekrarı | Otomatik |
| Müşteri şikayeti (ürün) | Herhangi bir olay | İlgili ürün reçetesi tekrarı | Trainer |
| Devamsızlık > %10 | Son 30 gün | Coach bildirim (eğitim değil) | Coach + HR |
| Gate başarısızlığı | Herhangi bir Gate | Başarısız bileşenlerin tekrarı | Coach + Supervisor |

---

## 6. Bildirim Akışları

### Otomatik Bildirimler

| Olay | Kime | Kanal | Zamanlama |
|------|------|-------|-----------|
| Yeni personel eklendi | Supervisor | In-app + email | Anında |
| Onboarding gün adımı tamamlanmadı | Stajyer + Mentor | In-app | Gün sonunda |
| Gate-0 hazır | Stajyer + Supervisor | In-app + email | Gün 14 sabahı |
| Gate başarısız | Coach + Supervisor | In-app + email | Anında |
| Gate başarılı (terfi) | Tüm ilgililer | In-app + email | Anında |
| KPI sinyali tetiklendi | Coach + personel | In-app | Günlük kontrol |
| 3 gün aktivite yok | Coach + Supervisor | In-app | Günlük kontrol |
| Sertifika süresi doluyor | Personel + Trainer | In-app | 14 gün kala |
| Terfi talebi oluşturuldu | Coach | In-app + email | Anında |

---

## 7. My Path Ekran Durumları

### Durum 1: Onboarding Aktif (Stajyer)
```
┌──────────────────────────────────────────┐
│ 🎯 Onboarding — Gün 5/14                │
│ ████████░░░░░░░░░░░░ %36                 │
│                                          │
│ Bugünkü Adımlar (3/5 tamamlandı)         │
│ ✅ Espresso Makinesi Kullanımı     20dk  │
│ ✅ Pratik: 3 espresso hazırla      10dk  │
│ ✅ Süt Buharlaştırma (Temel)       15dk  │
│ ☐ Pratik: Latte hazırlama          10dk  │
│   └─ Mentor onayı bekliyor              │
│ ☐ Günlük Quiz                       5dk  │
│                                          │
│ Sonraki Gate: Gate-0 (9 gün kaldı)       │
│ Mentor: Ayşe B. (Barista)               │
└──────────────────────────────────────────┘
```

### Durum 2: Rol Eğitimi Aktif (Bar Buddy)
```
┌──────────────────────────────────────────┐
│ 🏅 Bar Buddy — Seviye 2                 │
│ ████████████░░░░░░░░ %60                 │
│ Composite Score: 78/100                  │
│                                          │
│ Öncelikli Adımlar                        │
│ 🔴 Gecikmiş: Soğuk İçecekler Quiz  5dk  │
│ 🟡 KPI: Fire Azaltma Eğitimi      20dk  │
│   └─ Fire oranınız %7 (hedef <%5)       │
│ ☐ Latte Art Giriş                  30dk  │
│ ☐ Pratik: 5 Farklı İçecek Hazırlama     │
│                                          │
│ Sonraki Gate: Gate-1 → Barista           │
│ Gerekli: 4/8 zorunlu modül tamamlandı    │
│ Minimum 30 gün: 18 gün kaldı            │
└──────────────────────────────────────────┘
```

### Durum 3: Gate Hazır
```
┌──────────────────────────────────────────┐
│ 🎓 Gate-1 Sınavı HAZIR!                 │
│                                          │
│ Tüm ön koşulları tamamladınız:           │
│ ✅ 8/8 zorunlu modül tamamlandı          │
│ ✅ 30+ gün Bar Buddy olarak             │
│ ✅ Composite Score: 82 (min: 70)         │
│                                          │
│ Sınav bileşenleri:                       │
│ ☐ Quiz: 30 soru (min %80)          30dk  │
│ ☐ Pratik: 5 içecek (Trainer ile)   60dk  │
│ ☐ KPI kontrolü (otomatik)               │
│                                          │
│ [Sınava Başla]                           │
└──────────────────────────────────────────┘
```
