# DOSPRESSO — Sistem Değerlendirmesi (Replit Agent perspektifi)

**Tarih:** 19 Nis 2026 gece, pilot 28 Nis (8 gün)
**Yazan:** Replit Agent (kendi gözleminden, dürüst, filtresiz)
**Bağlam:** Aslan'ın "acımasız bakış" talebi — sıfır pozitif, sıfır negatif, sadece dürüst.

Bu doküman Aslan ve Claude'un Pazartesi okuyup karar vermesi içindir.

---

## 1) En büyük 5 teknik borç

1. **Mega route dosyaları:** `server/routes/branches.ts` ~4500 satır, `factory.ts` ~1800. Tek dosyada onlarca endpoint. Yeni geliştirici (veya benim gibi bir agent) navigate ederken context patlıyor; refactor riski büyüyor. Sprint D'de 6 P0 yer aramak için grep'e güvenmek zorunda kaldım.
2. **Silent try/catch pattern:** Sprint D audit 13 yerde gördü, sadece 6'sını fix ettim. Geri kalan 7 yer hâlâ `console.warn` ile yutuyor. Sistemik bir kod kokusu — codebase'in DNA'sında "non-blocking yap, sonra unut".
3. **Schema vs DB drift:** Drizzle migrations kırık, manuel `psql` ve `db.execute(sql\`CREATE TABLE IF NOT EXISTS...\`)` yan yana. Schema-05'te tanımlı `systemCriticalLogs` aynı anda `crit-log.ts`'te elle CREATE ediliyor. Tek doğruluk kaynağı yok.
4. **Startup'ta 13 sn seed + 38 scheduler:** Server restart = 13 sn boyunca seed çalışıyor + 158 kullanıcının parolası "0000"a sıfırlanıyor (loglarda görünüyor). Production-grade değil, prototip kalıntısı.
5. **Permission matrix opaque:** 31 rol × 124 modül = 2431 satır `role_permissions` tablosu. Statik `PERMISSIONS` map + dinamik tablo birlikte. "Kim ne yapabilir?" sorusunu ancak SQL ile cevaplayabilirim — UI yok, audit tool yok.

## 2) Sessizce taşıdığım 3 risk

1. **Pilot günü deploy = session ölümü:** Pazartesi 09:00 sonrası bir hotfix push edilirse workflow restart sessions'ları öldürür, 38 scheduler tekrar başlar, kullanıcılar mid-action kicks. Hot deploy yok, freeze protokolü yazılı değil.
2. **Parola sıfırlama startup'ta tekrar çalışıyor:** Loglardan: "🔑 Reset passwords for 158 non-admin active users to '0000' (pilot mode)". Her restart bunu yapıyor. Kullanıcı parolasını değiştirse bile bir sonraki deploy'da "0000"a düşüyor. Pazartesi sabah parola rotasyonu (1Password'e geçiş) bunu görmedi.
3. **`crit-log` helper kullanılmıyor:** Sprint E backend tabloyu kurdu, ama Sprint D'deki 6 P0 yer hâlâ ham `console.error` çağırıyor. Yani admin paneli (`/admin/critical-logs`) production'da boş kalacak — kimse `critLog()` helper'ı çağırmıyor. Sprint E ve Sprint D entegre değil.

## 3) Üçgen iş akışında şikayetlerim

1. **Görev mesajları kararı ile birlikte geliyor:** Aslan/Claude bana "şunu yap" yazarken hangi pattern'i kullanacağımı, hangi dosyaya yazacağımı önceden belirlemiş oluyor. Bu hızlı; ama bazen pattern uygunsuz (örn. Sprint E UI'da pilot-dashboard pattern'i dayatıldı, sayfa yapısı oraya tam oturmadı, ben yine de uydum). Push back kanalı yok.
2. **Claude commit + Replit pull workflow zaman penceresi açıyor:** Claude `b918fe8`'i yazdı, ben pull edip UI yazdım, push ettim. Bu süre içinde Aslan başka bir agent'a iş verseydi merge conflict olabilirdi. Lock mekanizması yok — sadece insan koordinasyonu.
3. **"İyi geceler" sonrası tekrar iş geliyor:** Önceki mesajda Sprint D kapandı, "iyi geceler" dendi. 1 dk sonra Sprint E UI talebi geldi. Plan vs uygulama sınırı bulanık — bu beni de Aslan'ı da yoruyor.

## 4) Dokümantasyon yapısı 3 ay sonra

Şu an `docs/pilot/` (15 dosya), `docs/skills-archive/`, `docs/AGENT-OWNERSHIP.md`, `.agents/skills/` (8 skill), `.local/skills/` (35+ skill), sprint plan dosyaları her sprint için yeni. **Sürdürülebilir değil.** 3 ay sonra ~150 markdown, kimse hangisini okuyacağını bilmeyecek; replit.md tek "her zaman yüklenen" doc — geri kalanı keşfedilmek zorunda. Önerim: pilot sonrası tek `docs/INDEX.md` zorunlu, eski sprint plan'lar `docs/archive/` altına taşınır.

## 5) Tek başıma pilot başlatabilir miyim?

**Teknik olarak evet** (workflow restart, log inceleme, DB query, dashboard kontrolü), **operasyonel olarak hayır.** Eksik kalacak 3 şey:
1. **İnsan eskalasyonu:** Şube müdürünün telefonu yok, WhatsApp'ım yok. "Kiosk açmadın" diye kimse arayamam.
2. **İş kararı:** "Bir şube login %92 → bu GO mu NO-GO mu?" eşik kuralları yazılı ama gri bölgeler için Aslan'ın "evet devam" demesi gerekiyor.
3. **Marka ve müşteri yüzü:** Kahve servisinde gerçek bir aksaklık olursa franchise sahibine telefon edecek insan yok.

## 6) Ölçeklenmenin operasyonel engeli

DB ve perf değil — **tek seed/reset döngüsü.** Yeni şube açıldığında: branches insert + users insert + role_permissions insert + module_flags update + setup_complete=false → onboarding wizard. Şu an her şey manuel admin işi. 22 şube zor, 50 şube imkansız. **Self-service onboarding portal** yoksa büyüme tıkanır.

## 7) Test coverage 0 — gerçek endişem

"Pilot sonrası başlarız" **timezone/auth/PDKS gibi business-critical alanlar için yetersiz.** Sprint D'de yazdığım `trDateString` helper'ı için unit test yok; Intl.DateTimeFormat node sürümü farkında bug yapsa fark edemem. Pilotun kendisi test oluyor — ki bu kabul edilebilir, ama yazılı bir "post-pilot test backlog" yok. Endişem: pilot başarılı geçerse kimse "şimdi test yazma zamanı" demeyecek.

## 8) Karar yetkim — belirsizlik var

**Sende olması gerekenler:**
- Schema-DB drift fix (manuel SQL vs drizzle push) — teknik, mekanik karar.
- Workflow restart timing — runtime ownership.
- Build/lint/test fail durumunda commit'i blokla — gate keeper.

**Şu an gri:** "Atomic transaction guard atlama" gibi yapısal risk kararları. Sprint D'de bunu BEN verdim, Claude sonradan "doğru karar" dedi. Bu pattern'in tehlikesi: ben "minimal viable fix" diyerek borç bırakırsam, kimse takip etmeyebilir. Önerim: yapısal karar = Claude approval şart, ben otonom karar vermemeliyim.

## 9) docs/skills-archive Anthropic deploy

Bu talep yanlış çerçevelenmiş. Anthropic'te "skill deploy" diye bir kavram benim için yok — `.local/skills/` ve `.agents/skills/` zaten ben tarafından SKILL.md ile keşfedilebilir. Markdown'lar yazıldıkları yerde işlevsel. **Önerim:** "deploy edilmedi" endişesini bırak; bunun yerine "hangi skill GERÇEKTEN tetikleniyor?" sorusunu sor. Bazı skill'ler hiç çağrılmıyor olabilir (skill-search ile ölçülür). Ölü skill temizliği daha değerli iş.

## 10) Pilot başarısız olursa kök neden

**Tahminim:**
- **%55 operasyonel:** Şube müdürü kioskı 09:00'da açmıyor, ya da Wi-Fi düşüyor, ya da yetkili çalışan vardiyaya gelmiyor. Sistem çalışıyor, insan akışı kırılıyor.
- **%30 insan:** Kullanıcı "0000" parolayı 3 kez yanlış giriyor, hesap kilitleniyor, destek hattı 5 dk gecikiyor, sabır tükeniyor. Veya Aslan/Claude/Ben'den biri kritik anda erişilemiyor.
- **%15 teknik:** PDKS sync, kiosk auth, scheduler timing. Sprint D + E fix'leri buranın çoğunu kapatıyor; kalan risk B.1'in görmediği bir edge case.

**En olası tek senaryo:** Pazartesi 09:00 Lara şubesinde kiosk PIN'i hatırlanmıyor → 15 dk gecikme → ilk vardiya PDKS missing → B.1 alarm → Aslan stresleniyor → ATTENTION ışığı yanıyor ama gerçek soruna yanıt değil. Yani **dashboard'lar çalışacak, ama insan reaksiyonu yetişmeyebilir.**

---

## Kapanış (sorulmamış ama söylenmesi gereken)

Bu sistem **prototip aşamasından çıkmadı, ama production trafik almaya hazırlanıyor.** Sprint D + E + G son 48 saatte yazıldı; kod review yapıldı, test yapılmadı. Pilotun başarısı teknik mükemmellikten değil, **insan reaksiyon hızından** gelecek. Üçgen çalışıyor çünkü 3 zihin de uyanık; biri uyursa sistem koruma sağlamaz.

Pazartesi GO/NO-GO kararını ver, bir taraftan da Sprint I'a "post-pilot teknik borç temizliği" planla.
