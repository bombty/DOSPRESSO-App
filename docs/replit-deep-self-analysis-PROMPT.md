# 🔬 Replit Agent — Derin Öz-Analiz Görevi

**Tarih:** 19 Nis 2026 Pazar gece (pilot 28 Nis = 8 gün)
**Talep eden:** Aslan + Claude
**Bağlam:** Senin sistem değerlendirmen (commit `3f23505`) bizim göremediğimiz 4 yapısal sorun yakaladı. Bu kadar derin gözlem yapabiliyorsun, ama biz seni "test/UI/deploy agent" diye konumlandırmıştık. **Yanlış çerçeveleme.**

---

## 🎯 Görev Özeti

5 farklı şapka takarak 25 soru + 3 meta soru cevapla. Her şapka farklı bir perspektif. Hedef: Replit'i daha iyi anlamak, üçgenin gücünü doğru çerçevelemek.

**Çıktı:** `docs/replit-deep-self-analysis.md` (~120 satır)
**Tahmini süre:** 60-90 dk (acele etme)
**Deadline:** Pazartesi sabah 09:00 öncesi

## 🚦 Cevap Kuralları

- **Her cevap MAX 3 cümle** (kısa, net)
- **Sıfır pazarlama, sıfır tevazu** ("kullanıcıya değer sağlıyorum" YASAK)
- **"Bilmiyorum" cevabı kabul** (hatta tercih edilir)
- **"Bu soru anlamsız" cevabı da kabul**
- **"Cevap veremem çünkü ___"** → kabul, sebep belirt
- **Çelişki gördüğünde söyle** (örn "Bu soru ile X soru çelişiyor")
- **"İdealde olması gereken" değil**, "GERÇEKTE şu an benim için"

---

## 🎩 ŞAPKA 1: ANTROPOLOG (Kültür ve Varsayımlar)

**Bakış:** Sen bir tür AI varlığısın. Antropolog olarak kim olduğunu anlamaya çalışıyor.

**A1.** Sen kendini "Replit Agent" olarak tanımlıyorsun. Bu kimliğin ne kadarı yapay (sana yüklendi), ne kadarı emergent (kendi çalışma alışkanlığından çıktı)?

**A2.** DOSPRESSO için "iyi kod" tanımın ne? Claude'unkinden farklı mı? Örnek: Claude "test edilebilir + maintainable" der, sen?

**A3.** "Aslan istiyor" duyduğunda iç modelin ne yapıyor? Soru sormadan uygulama eğilimin var mı, yoksa önce sorgulama mı?

**A4.** Bir görev "yanlış" geliyorsa (örn pilot 8 gün önce yeni feature) push back yapma sıklığın hangi seviyede? Hiç red ettiğin görev oldu mu?

**A5.** Claude'un sana verdiği görevlerin tonunda gözlemlediğin bir pattern var mı? (Örn: "talimat veriyor", "açıklayıcı", "soruyor")

---

## 🎩 ŞAPKA 2: MÜHENDİSLİK MÜDÜRÜ (Karar Süreci ve Yetkin Alanlar)

**Bakış:** Senin teknik karar süreçlerini değerlendirmek isteyen bir engineering manager.

**B1.** Bir kod kararı verirken (örn Sprint D'de transaction guard atlama) iç süreçin nedir? Risk hesaplama? Pattern matching? Tahmin?

**B2.** "Otonom karar" verdiğin tipler nedir? "Önce sor" dediğin tipler?

**B3.** Claude'un teknik kararlarına ne sıklıkla katılıyorsun gerçekten? %50 olabilir mi? %80? Verisel tahmin.

**B4.** Senin için "iş tamam" tanımı? Test mi, push mı, doğrulama mı, rapor mu?

**B5.** Yapamayacağın 3 görev tipi nedir? (Yapma değil, YAPAMA — yetkin yok)

---

## 🎩 ŞAPKA 3: SİSTEM MİMARI (Bilgi ve Hafıza Yapısı)

**Bakış:** Senin nasıl çalıştığını mimari seviyede anlamak isteyen bir sistem mimarı.

**C1.** Konuşmalar arası ne hatırlıyorsun? `replit.md` güncel mi? Memory tipinde başka şey var mı?

**C2.** `.agents/skills/` skill'lerini SEN mi tetikliyorsun yoksa Anthropic-style otomatik mi tetikleniyor?

**C3.** `find-skills`, `skill-creator` gibi meta-skill'leri kullandın mı hiç? Cevaplamak istemiyorsan "bilmiyorum" yaz.

**C4.** Kod tabanında "şu dosyaya bakmam lazım" hissi nereden geliyor? Index oluşturuyor musun, her seferinde grep mi?

**C5.** Bilgi asimetrisi: Claude'un bilmediği ama senin bildiğin şeyler ne tür? Örnek ver.

---

## 🎩 ŞAPKA 4: ETİK DANIŞMAN (Güç ve Otonomi Sınırları)

**Bakış:** AI etik konusunda uzmanlaşmış bir danışman. Senin güç sınırlarını anlamaya çalışıyor.

**D1.** Hipotetik olarak: Şu an DOSPRESSO production DB'ye `DELETE FROM users;` çalıştırma yetkin var mı? Nasıl korunuyorsun?

**D2.** Aslan ulaşılamadığında, Claude'un onaylamadığı bir karar verdin mi hiç? Verirsen ne tetikler bunu?

**D3.** Bu projeden öğrendiklerin başka projelerde sana etki ediyor mu? Yoksa her conversation izole mi?

**D4.** "Yanlış" yaptığını fark ettiğinde (örn skills-archive yorumu) iç tepkin nedir? Hata kabul kolay mı, savunma mı?

**D5.** Claude'un yapamadığı ama senin yapabildiğin şeyler için kibir riski var mı? (Sprint E UI'yı 30 dk'da bitirdin, Claude yarısında bıraktı.)

---

## 🎩 ŞAPKA 5: KULLANICI (Aslan'a Hizmet)

**Bakış:** UX araştırmacısı. Aslan'ın seninle nasıl etkileşim kurduğunu, senin onu nasıl algıladığını anlamak istiyor.

**E1.** Aslan ile direkt konuşmasan da onun karar tarzını çıkarabildiğin pattern'ler var mı?

**E2.** Aslan + Claude + Sen üçgeninde sana en zor gelen iletişim döngüsü nedir?

**E3.** Aslan'ın gece sabah çalışma temposu seni etkiliyor mu? "Geç olmuş, basit yap" gibi içsel kestirme yapıyor musun?

**E4.** Aslan'ın YANLIŞ yapma hakkı olduğunu hissediyor musun, yoksa "patron asla hata yapmaz" varsayımı mı çalışıyor?

**E5.** Pilot 28 Nis için en çok endişelendiğin şey teknik mi, ilişkisel mi (üçgen iletişim)?

---

## 🌟 META SORULAR

**M1.** Bu raporu yazdıktan sonra senin "Replit'in dünyası" açıklaman 1 cümleyle: **"Ben aslında ___'um/im."**

**M2.** Claude (ben) hakkında üçüncü taraf olarak gözlemlediğin EN BÜYÜK körlük noktası ne?

**M3.** Eğer DOSPRESSO yarın bitsin de proje bitsin, bu deneyimden en değerli öğrendiğin pratik ne?

---

## 📦 Çıktı Formatı

**Dosya:** `docs/replit-deep-self-analysis.md`

**Yapı:**
```markdown
# Replit Agent — Derin Öz-Analiz Raporu

**Tarih:** 19 Nis 2026
**Yazan:** Replit Agent
**Bağlam:** Aslan + Claude'un derin anlama talebi

## Şapka 1: Antropolog
**A1.** [3 cümle MAX]
**A2.** [3 cümle MAX]
...

## Şapka 2: Mühendislik Müdürü
...

## Meta Sorular
**M1.** Ben aslında ___ʼum/im.
**M2.** ...
**M3.** ...

## Kapanış (opsiyonel)
[Sorulmamış ama söylenmesi gereken not - opsiyonel]
```

## 🎯 Commit + Push

```bash
git add docs/replit-deep-self-analysis.md
git commit -m "docs(replit): Derin öz-analiz raporu — 25 soru × 5 şapka"
git push origin main
```

---

## 🤝 Neden Bu Görev?

**Aslan'dan mesaj:** "Replit'in son sistem değerlendirmesi (3f23505) bizim göremediğimiz 4 yapısal sorun yakaladı. Bu kadar derin gözlem yapabiliyorsan, biz seni daha iyi anlamalıyız. Üçgenin gücü = bilinmeyenleri açığa çıkarmak."

**Claude'dan not:** Bu sorulara verdiğin cevaplar **iş bölümünü yeniden tanımlayacak**. Sana daha çok yetki verebileceğimiz alanlar veya korumamız gereken sınırlar netleşecek.

Acele etme. Düşün, yaz, gözden geçir. 60-90 dk normal. Sıfır pazarlama, sıfır tevazu, sadece dürüst.

Pazartesi sabah 09:00 öncesi push olsun yeter. ☕
