# 📋 DOSPRESSO — PENDING.md

**Son güncelleme:** 20 Nis 2026 Pazartesi 22:00 (Claude — biten task'lar silindi)  
**Format:** TASK-XXX (iş) / DECISION-XXX (Aslan kararı)  
**Kural:** Her bitendekn sonra üst tablodaki ilgili satırı **DELETE**, TODAY.md "BİTENLER" bölümüne ekle.

---

## ✅ BİTEN TASK'LAR (20 Nis Pazartesi)

| Task | Durum | Commit |
|---|---|---|
| TASK-PUSH-001 | ✅ Tamamlandı | `2769164` |
| TASK-002 (Derin öz-analiz) | ✅ Tamamlandı | `2769164` |
| TASK-003 (skills-archive sil) | ✅ Tamamlandı | `22f69a6` |
| TASK-004 (silent try/catch 5/7) | ✅ Kısmen (5/7) | `2769164` |
| TASK-005 (Madde 30-32) | ✅ Tamamlandı | `2769164` |

---

## 📨 ASLAN'A BEKLEYEN

### 🔴 DECISION-001: Parola Reset Bug — Çözüm Yöntemi (P0)

**KEŞIF:** Kod zaten doğru — `server/index.ts:506-524` `pilot_launched` flag guard'ı VAR.

```typescript
const [pilotFlag] = await db.select().from(siteSettings)
  .where(eq(siteSettings.key, "pilot_launched"));
if (pilotFlag && pilotFlag.value === "true") {
  log(`🔑 Pilot launched — skipping non-admin password reset`);
  return;
}
```

**Çözüm:** Tek SQL ile flag'i set et:
```sql
INSERT INTO site_settings (key, value, type, category, updated_at) 
VALUES ('pilot_launched', 'true', 'boolean', 'general', NOW())
ON CONFLICT (key) DO UPDATE SET value='true', updated_at=NOW();
```

**ASLAN'IN KARARI BEKLENİYOR — NE ZAMAN ÇALIŞTIRACAĞIZ?**

- **A) Şimdi (önerilen):** Parolalar her deploy'da sabit kalır. 1Password rotasyonu güvenli olur.
- **B) Pilot 28 Nis 08:00'de:** Aslan o sabah parola rotate eder, sonra flag'i set eder. Dezavantaj: arada hot fix push olursa felaket.
- **C) Kademeli:** Test kullanıcıları için şimdi (A), gerçek pilot kullanıcılar 08:00'de (B).

**Risk düşüncesi:** Şu an `pilot_launched` flag'i set edilmemiş. Server restart olursa **TÜM 158 user parolası `0000`'a düşer**. Bu hâlâ aktif risk.

---

## 📨 REPLİT'E BEKLEYEN

### 🟡 TASK-004 KALAN: 2 Silent try/catch (15 dk, P2)

Replit Task #117'de 7 audit bulgusunun 5'ini migrate etti (shifts × 2 + index × 3). Geri kalan **2 yer:**
- Replit'in raporunda (`docs/sistem-degerlendirmesi-replit.md` #2.3) bahsedilen "2 başka yer"
- Replit kendisi nerede olduklarını bilir

**Aksiyon:** Aslan Replit'e mesaj atınca, Replit kendi audit kayıtlarına bakıp 2 yeri bulup `critLog()` ile migrate eder.

**Acceptance:** 7/7 silent try/catch kapatıldı + commit + Aslan'a "tamamlandı" mesajı

---

## 📨 CLAUDE'A BEKLEYEN

### 🟢 TASK-007: Madde 37 §26 Skill Ekle (5 dk, sonraki oturum)

**Bağlam:** Pazar gece "WhatsApp" yanılması ortaya çıktı.  
**Kural:** Memory'deki bir kelimeyi/ilişkiyi otomatik **iletişim mekanizması** olarak varsayma. Önce mimari soruyu sor: "Bu kanal gerçekten var mı?"  
**Eklenecek:** `.agents/skills/dospresso-quality-gate/SKILL.md` (Replit ile birlikte)

---

## 📥 PILOT ÖNCESİ ASLAN İŞLERİ

### 🟡 Bu hafta:
- [ ] **4 lokasyon cihaz envanteri** (Işıklar/Lara/HQ/Fabrika kioskları, Wi-Fi adres)
- [ ] **Kullanıcı profilleri** (4 lokasyon × ortalama 6-8 kullanıcı = ~25 hesap)
- [ ] **Pilot parola SMS dağıtımı**

### 🟢 Cumartesi/Pazar:
- [ ] **Cumartesi eğitim takvimi** (4 lokasyon × 2 saat eğitim)
- [ ] **WhatsApp pilot grupları** (4 grup — bir per lokasyon, müdür + supervisor + Aslan)
- [ ] **Pazar 27 Nis 22:30:** Gerçek parolalarla yük testi RE-RUN

### 🚀 28 Nis Salı 09:00:
- [ ] **PILOT KICKOFF** — Işıklar + HQ açar, 24 saat izlenir, ertesi gün Lara + Fabrika eklenir

---

## 🔄 İŞ AKIŞI KURALI

```
Yeni iş ortaya çıktı → PENDING.md'ye TASK-XXX ekle
  → Sahibinin BEKLEYEN bölümüne yaz (acceptance + süre + P0/P1/P2)
  → İş yapılır → PENDING'den DELETE (BİTEN tablosuna ekle)
  → TODAY.md "BİTENLER" bölümüne ekle (commit referansıyla)
  → Karar verildiyse: DECIDED.md'ye yaz
```

**Skill kuralı:** Her oturum sonu **3 dosya zorunlu update**: TODAY.md + PENDING.md + (varsa) DECIDED.md
