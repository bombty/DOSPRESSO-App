# DOSPRESSO Devir Teslim — 25 Nisan 2026 Gece Oturumu

**Pilot GO-LIVE:** 5 Mayıs Pazartesi 09:00 (10 gün kaldı)
**Önceki devir teslim:** `62b68e0` (24 Nis sabah, R-5 final)
**Bu oturum süresi:** ~5 saat yoğun çalışma

---

## ✅ Bu Oturumda Tamamlananlar

### A) PROPOSED Task Filtre (26 → 11 KABUL)
Aslan + Replit ortak değerlendirme:
- ✅ KABUL: 11 task (Faz 1: schema/data hijyen, Faz 2: onay bug-fix, Faz 3: Sema iş akışı + #237 yeni)
- ⏳ ERTELE R-6: 15 task (cila, performans, denetim eskalasyonu)
- ❌ RED: 0 task

**Yeni eklenen:** #237 — Admin için kiosk PIN sıfırlama endpoint + UI butonu (pilot Day-1 risk)

### B) Personel/Rol Düzenlemeleri (DB)
- ✅ Ece → `coach` rolü (eski: `trainer`)
- ✅ Eren → `branch_id=24` (Fabrika, eskiden boştu)
- ✅ Ümran (kalite_kontrol) → `is_active=false` (artık şirkette değil)
- ✅ Utku CGO rolüne kalite yetkileri eklendi (`schema-02.ts`):
  - `complaints`: ['view', 'create', 'edit']
  - `checklists`: ['view', 'edit']
  - `product_complaints`: ['view', 'create', 'edit', 'approve']
- ✅ Ali CEO durumu işlendi (Replit `681c40a` commit)

### C) Pilot Scope Hibrit C Uygulaması
**Karar:** 16 pilot-dışı şube `setup_complete=false` yapıldı.
- 🟢 Pilot aktif (4): Işıklar (#5), Antalya Lara (#8), Merkez Ofis HQ (#23), Fabrika (#24)
- 🟡 Hazırlık modu (16): Mallof, Markantalya, Beachpark, İbrahimli, İbnisina, Üniversite, Meram, Bosna, Marina, Atakum, Batman, Düzce, Siirt, Kilis, Şanlıurfa, Nizip
- Hazırlık moduna alınan şubelerin:
  - Yöneticileri login olunca Onboarding Wizard tetiklenir
  - Yavuz dashboard'unda KPI'lara dahil edilmez
  - Veriler korundu, aktif kalır (silme YOK)
- Aslan kademeli açacak: 12 May Antalya bölgesi → 19 May Gaziantep → vd.

### D) Schema Drift P0 Fix (#234)
- ✅ 11 eksik kolon eklendi (responded_at, notes, mentor_id, started_at, deleted_at, 5x onboarding_template_steps, 2x updated_at)
- ✅ 2 UNIQUE constraint eklendi (factory_recipe_versions, payroll_parameters)
- ✅ 2 trigger eklendi (updated_at otomatik güncelleme)
- ⏳ R-6'ya öteleneller: 40 tip/nullability drift, 40+ eksik FK, eksik perf index'leri

### E) Pilot Script Hijyeni (#214)
6 SQL script'te sabit ID'ler dinamik lookup'a çevrildi:
- 08-pdks-backfill (UUID → username)
- 09-gorev-sablonlari-seed (branch_id=24 → name='Fabrika', 6 INSERT)
- 12-kritik-blocker (4 sabit branch ID → 4 name lookup)
- 14-replit-v2-blocker (module_flags.id=247 → module_key+branch lookup)
- 19-test-employee-cleanup (UUID+branch=23 → username+name)
- 20-bos-recete-malzeme (id=13 → name='Donut' AND id != canonical, hem 0b hem son check)

**Test:** 6/6 BEGIN..ROLLBACK dry-run + ON_ERROR_STOP=1 → syntax+lookup PASS

**⚠️ Bonus bulgu:** Script #20 prod'da hiç koşmamış. 13 aktif reçete (id=2-13, 16) malzemesiz. Sema/RGM tarafından doldurulması lazım. Mevcut #124 follow-up bu işi kapsıyor.

### F) Yeni Skill: dospresso-roles-and-people (Replit yazdı, 147 satır)
**Path:** `.agents/skills/dospresso-roles-and-people/SKILL.md`
İçerik: HQ ekibi (Aslan, Yavuz, Utku, Ece, Mahmut, Samet, Sema, Diana, Ayşe, Murat, Mehmet, Ali) + Fabrika (Eren, Sema-RGM, Ümit) + pilot şubeler + yetki matrisi + bilinen sorunlar + güncelleme talimatı.

**Etki:** Bundan sonra her oturum başında Claude + Replit otomatik okuyacak, "Yavuz kim, Sema kim" sorularını tekrar etmeyeceğiz.

### G) Yavuz Brief (`docs/pilot/briefs/YAVUZ-BRIEF.md`, 219 satır)
10 bölüm: yetki, hazırlık, Komuta Merkezi rehberi, günlük rutin, eskalasyon, şube/franchise farkı, pilot sonrası, SSS, iletişim listesi, onay checklist.

---

## ⚠️ Bilinen Boşluklar (Aslan koordine etmeli)

### Pilot Day-1 Öncesi Acil
1. **Lara'da generic isimler** — "Lara Müdür" / "Lara Supervisor"
   - Aslan franchise sahibiyle iletişime geçecek
   - Gerçek isimler bu hafta içinde DB'ye yazılacak
2. **Ümit duplicate hesap** — `Umit` (sef) + `umit` (uretim_sefi)
   - Aslan fabrikada Ümit'e soracak: "PDKS'te hangi hesapla giriyorsun?"
   - Diğer hesap `is_active=false` yapılacak (uretim_sefi muhtemelen kalıcı)
3. **Sema iki hesap** — `sema` (gida_muhendisi) + `RGM` (recete_gm)
   - Pilot başında iki hesap kalsın
   - R-6'da rol konsolidasyonu (yeni task açıldı)

### Pilot Personel Brief'leri
- ⏳ **Sema brief** — deadline 2 Mayıs Cuma — 7 gün uzakta, henüz yazılmadı
  - 12 reçete alerjen+besin doldurma
  - Bonus bulgu: 13 reçete malzemesiz (script #20 koşmamış) → Sema'nın iş kapsamı genişledi
- ⏳ **Mahmut brief** — maliyet formülü onayı, PDKS Excel akışı
- ⏳ **Samet brief** — hammadde fiyat audit (R-5B coverage %22 → %90+)

### Pilot Hazırlık Dry-Run
- ⏳ 28 Nisan Pazar 18:00 öncesi smoke test scripti hazırlanmalı
- 4 pilot şubeyi tek tek uçtan uca test et: kiosk login → vardiya → satış → çıkış → rapor

---

## 📊 Replit'in Aktif İşi

KABUL listesinden devam ediyor:
- ✅ #234 (schema drift P0) — TAMAM
- ✅ #214 (pilot script lookup) — TAMAM
- ⏳ #215 (PDKS ↔ shift 42 eşleşmeyen vaka) — sıradaki
- ⏳ #231 (kanonik sözlük 30 malzeme)
- ⏳ #232 (seed pre-flight)
- ⏳ #219, #220 (onay bug-fix)
- ⏳ #227+#228 paketi (Sema iş akışı)
- ⏳ #217+#236 paketi (CSV export)
- ⏳ #237 (kiosk PIN sıfırlama)

---

## 🔢 Commit Listesi (Bu Oturum)

| Commit | İçerik | Sahibi |
|---|---|---|
| `9bad546` | Roller skill dosyası | Replit |
| `68ae1e2` | Personel rol güncellemeleri (Diana açıklaması, Ümran çıkışı) | Replit |
| `61c8754` | CGO kalite yetkileri | Replit |
| `681c40a` | Ali CEO partnership | Replit |
| `21fc618` | Hibrit C — 16 şube setup_complete=false | Replit |
| `1ad52bb` | Schema drift P0 fix | Replit |
| `428735d` | Yavuz brief (219 satır) | Claude |
| (#214) | Pilot script lookup hijyeni | Replit (lokal) |

---

## 🎯 Sıradaki Oturum İçin Aksiyon Listesi

### Aslan (sen)
1. **Lara franchise sahibiyle iletişim** — gerçek müdür/supervisor isimleri
2. **Ümit'le konuş** — fabrikada hangi hesabı kullanıyor
3. **Mahmut + Samet ile zaman ayır** — pilot öncesi formül + hammadde audit oturumu
4. **Yavuz brief'i Yavuz'a ilet** (PDF veya `/iletisim` link)

### Claude (taze oturum)
1. **Sema brief** (~10-15 dk) — 12 reçete alerjen+besin + bonus 13 malzemesiz reçete
2. **Mahmut + Samet brief'leri** (~10 dk her biri)
3. **Pilot dry-run senaryosu** — uçtan uca smoke test scripti
4. R-5B coverage audit — Samet ile çalışmadan önce mevcut hammadde fiyat tablosunu çıkar

### Replit
1. KABUL listesinden devam: #215 → #231 → #232 → #219 → #220
2. Faz 3 (#227+#228) Sema brief netleştikten sonra başla
3. #237 (kiosk PIN) — Faz 1 sonunda
4. R-6 backlog'a ekle: Sema rol konsolidasyonu

---

## 🔑 Token + Push Format

GitHub Personal Access Token + push formatı için **memory'deki bilgiyi kullan**.
**KRİTİK KURAL:** Token asla dosya içeriğine yazılmaz.

---

## 📌 Sistem Durumu (Anlık)

- **Pilot scope:** 4 aktif şube (Işıklar, Lara, HQ, Fabrika)
- **Hazırlık modunda:** 16 şube (setup_complete=false)
- **HQ ekibi:** 12 aktif kişi (Aslan, Yavuz, Utku, Ece, Mahmut, Samet, Sema, Diana, Ayşe, Murat, Mehmet, Ali)
- **Fabrika ekibi:** 3 aktif kişi (Eren, Sema-RGM, Ümit)
- **Aktif coach sayısı:** 2 (Yavuz + Ece)
- **Schema drift durumu:** P0 temiz, P1/P2 R-6'da
- **Pilot blocker:** 0 (sistem teknik olarak hazır)

---

## ⏰ Kapanış

Bu seans **çok verimli** geçti — 7+ büyük karar, 8 commit, 2 ana doküman (skill + brief).

**Pilot 10 gün uzakta. Sistem teknik olarak hazır. Kalan iş:**
- 3 brief (Sema, Mahmut, Samet)
- Dry-run scripti
- Aslan'ın saha koordinasyonu (Lara, Ümit, formül onayları)

İyi geceler ☕🌙
