# Agent Ownership Matrix

**Amaç**: Replit Agent ile Claude (IT danışman) arasında dosya çakışmalarını önlemek  
**Geçerlilik**: 28 Nis 2026 pilot ve sonrası  
**Kural**: Bu tablo dışı bir alana yazma — önce karşı agent'a sor.

---

## 1. Path Bazlı Sahiplik

| Path | Sahip | Yazabilen | Notlar |
|---|---|---|---|
| `shared/schema/*.ts` | **Claude** | Replit Agent (sadece ekleme, silme yapmaz) | Migration'lı değişiklik Claude'da |
| `server/routes/*.ts` | **Replit Agent** | Claude (sadece bug fix) | API surface area Replit Agent'da |
| `server/services/*.ts` | **Paylaşımlı** | İkisi (önce uyarı) | Domain logic, Pazartesi öncesi konuş |
| `client/src/pages/**` | **Replit Agent** | Claude (sadece UI fix) | UI/UX Replit Agent'da |
| `client/src/components/**` | **Replit Agent** | Claude (read-only) | Reusable component'ler |
| `client/src/hooks/**` | **Replit Agent** | Claude (read-only) | |
| `scripts/pilot/*` | **Replit Agent** | Claude (review only) | Pilot uygulama scripts |
| `scripts/migration/*` | **Claude** | Replit Agent (read-only) | Migration sahipliği |
| `docs/pilot/*` | **Replit Agent** | Claude (komentaryon) | Pilot dokümantasyonu |
| `docs/role-flows/*` | **Replit Agent** | Yalnızca Replit Agent | Task #112 çıktısı |
| `docs/architecture/*` | **Claude** | Replit Agent (read-only) | Mimari kararlar Claude'da |
| `docs/sprints/*` | **Claude** | Replit Agent (durum güncellemesi) | Sprint planları Claude'da |
| `docs/AGENT-OWNERSHIP.md` | **Replit Agent** | Claude (öneriyle) | Bu dosya |
| `replit.md` | **Replit Agent** | Yalnızca Replit Agent | Agent state file |
| `package.json` | **HİÇBİRİ** | Sadece insan onayı | İkisi de paket eklerken sormalı |
| `vite.config.ts` | **HİÇBİRİ** | Sadece insan onayı | Build config |
| `drizzle.config.ts` | **HİÇBİRİ** | Sadece insan onayı | DB config |
| `tsconfig.json` | **HİÇBİRİ** | Sadece insan onayı | TypeScript config |
| `.env.example` | **Paylaşımlı** | İkisi | Yeni env eklerken karşıya bildir |
| `.gitignore` | **Paylaşımlı** | İkisi | Yeni ignore eklerken karşıya bildir |

---

## 2. Çakışma Protokolü

### Senaryo A — Aynı Anda Aynı Dosya
1. Geç gelen agent commit etmeden önce `git pull` yapar
2. Çakışma varsa → en kritik değişikliği koru, diğeri rebase
3. Belirsizse → 30 dk bekle, karşı agent commit'lemiş mi kontrol et

### Senaryo B — Sahip Olmayan Agent Sahipli Dosyaya Yazmak Zorunda
1. **Önce sor**: Replit Agent → Claude (Aslan üzerinden WhatsApp)
2. **Onay alındıktan sonra yaz**: commit message'a `[Owner: Claude approved]` ekle
3. **Bilgilendir**: Karşı agent'ı yapılan değişiklikten haberdar et

### Senaryo C — Acil Durum (Pilot KIRMIZI)
- Sahiplik kuralı askıya alınır
- Hangi agent uygunsa fix yapar
- 24 saat içinde gerekçe `docs/pilot/emergency-fixes.md`'e yazılır

---

## 3. Commit Mesajı Konvansiyonu

Her agent commit'inde kendi imzası:
```
<konu>: <kısa açıklama>

[Agent: Replit Agent]
[Owner: <ilgili-path-sahibi>]

<detay>
```

Örnek:
```
docs: pilot success criteria 4 sayısal eşik

[Agent: Replit Agent]
[Owner: Replit Agent]

Aslan onaylı 4 eşik (login, task, error, smoke).
```

---

## 4. Push Sırası (Race Condition Önleme)

| Saat | Push Yetkisi |
|---|---|
| 08:00-12:00 | Replit Agent öncelikli |
| 12:00-16:00 | Claude öncelikli |
| 16:00-20:00 | Replit Agent öncelikli |
| 20:00-08:00 | Sadece KIRMIZI durumda |

**Force push yasak** (her iki agent için). Conflict çözümü `git rebase` ile.

---

## 5. Branch Stratejisi

- `main`: Tek branch, hem Claude hem Replit Agent push eder
- Feature branch: Her ikisi açabilir, isim formatı:
  - Replit Agent: `replit-agent/<konu>`
  - Claude: `claude/<konu>`
- Merge: Hızlı kalmak için `main`'e doğrudan push (PR kullanılmıyor pilot süresince)

---

## 6. Acil Durum İletişimi

| Durum | Kanal | Süre |
|---|---|---|
| Push çakışması | WhatsApp pilot grubu | 5 dk içinde |
| Schema break | WhatsApp + Aslan'a CC | 15 dk içinde |
| Production hata | WhatsApp KIRMIZI tag | 5 dk içinde |
| Soru/öneri | Asenkron (WhatsApp pilot grubu) | Aynı gün |

---

## 7. Yetki Çekişmeleri

Karar mercii **Aslan**. İki agent çelişirse:
1. Her iki agent çözüm önerisini WhatsApp'a yazar
2. Aslan 1 saat içinde karar verir
3. Karar bu dosyaya **istisna** olarak eklenir

**İstisnalar listesi** (bu dosya kök bölümünde tutulur):
- (henüz yok — pilot başladıkça eklenir)

---

## 8. Pazartesi 09:00 Öncesi Hazır Olması

- [ ] Bu dosya iki agent tarafından okundu (Aslan onayı)
- [ ] Çakışma protokolü test edildi (varsa Pazar gece)
- [ ] WhatsApp pilot grupları hazır (push çakışma alarmı için)
- [ ] Force push GitHub branch protection ile engellendi (opsiyonel ama önerilir)

**Sorumlu**: Aslan (final onay), iki agent (uyum)
