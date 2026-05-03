# Ay Sonu Puantaj Simülasyonu — 2026-05 (READ-ONLY)

**Çalıştırma tarihi:** 2026-05-03T00:55:42.785Z
**Task:** #287 (B4) — Pilot ay sonu öncesi kuru çalıştırma.
**Hedef:** Veri eksiklerini, hesap anomalilerini ve hata pattern'lerini owner GO/NO-GO kararından önce görünür kılmak.
**DB Yazma:** YOK (read-only guard aktif).

## 1. Veri Sağlığı Özeti

| Metrik | Değer |
|---|---|
| Aktif personel (approved + !deleted) | 175 |
| pdks_records (2026-05) | 0 |
| shift_attendance (2026-05) | 0 |
| shift_attendance check_out NULL | 0 |
| leave_requests overlap (approved) | 0 |
| pdks_daily_summary satırı | 0 |
| pdks_monthly_stats önceden üretilmiş | 0 |
| Beklenen iş günü (Pzt-Cum) | 21 |

## 2. Global Anomaliler

- A5: 144 aktif personel için employee_salaries kaydı yok — bordro hesaplanamaz.
- A6: employee_salaries.base_salary birim tutarsızlığı — schema "kuruş" (×100) diyor ama data TL gibi (min=29500, max=70000). Script TL kabul ediyor; gerçek bordrodan önce şema yorumu netleşmeli.

## 3. Toplam Tahmin

| Metrik | Değer |
|---|---|
| Toplam çalışılan gün | 0 |
| Toplam fazla mesai | 0s 0d |
| Ücretsiz izin (gün) | 0 |
| Raporlu izin (gün) | 0 |
| Yıllık/personel izin (gün) | 0 |
| Devamsız (gün) | 0 |
| Maaş bilgisi olan personel | 31 / 175 |
| Anomali bayrağı olan personel | 144 |
| Tahmini toplam brüt (mesai dahil, kesintiler hariç) | 0,00 ₺ |

## 4. Personel Bazlı Detay

| Ad Soyad | Şube | Rol | Çalışılan | F.Mesai | Üc.İzin | Rap.İzin | Yıl.İzin | Devamsız | Brüt | Tahmini Brüt | Anomali |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Admin DOSPRESSO | — | admin | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Admin HQ | — | admin | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Test HQ Superuser | — | admin | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Berkan Bozdağ | Antalya Lara | bar_buddy | 0 | 0s 0d | 0 | 0 | 0 | 0 | 31.000,00 ₺ | 0,00 ₺ | — |
| Efe Yüksel | Antalya Lara | bar_buddy | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Gül Demir | Antalya Lara | bar_buddy | 0 | 0s 0d | 0 | 0 | 0 | 0 | 31.000,00 ₺ | 0,00 ₺ | — |
| Adem Kara | Konya Bosna | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Ahmet Hamit Doğan | Işıklar | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | 31.000,00 ₺ | 0,00 ₺ | — |
| Ali Demirci | Antalya Beachpark | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Ateş Güney Yılmaz | Işıklar | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | 32.000,00 ₺ | 0,00 ₺ | — |
| Aylin Yılmaz | Gaziantep Üniversite | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Ayten Erbaş | Kilis | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Basri Şen | Işıklar | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | 35.000,00 ₺ | 0,00 ₺ | — |
| Berk Aydın | Gaziantep İbrahimli | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Berna Baş | Nizip | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Burak Yalçın | Antalya Markantalya | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Burcu Öz | Gaziantep İbnisina | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Büşra Tok | Konya Bosna | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Can Akar | Antalya Mallof | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Cihan Kolakan | Işıklar | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | 32.000,00 ₺ | 0,00 ₺ | — |
| Cihan Yılmaz | Samsun Atakum | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Deniz Ayvazoğlu | Antalya Lara | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Dilara Jennefer Elmas | Antalya Lara | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | 31.000,00 ₺ | 0,00 ₺ | — |
| Doruk Baş | Konya Meram | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Duygu Kaya | Antalya Mallof | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Ebru Şen | Gaziantep İbrahimli | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Efe Kadir Kocakaya | Işıklar | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | 31.000,00 ₺ | 0,00 ₺ | — |
| Emre Kaplan | Gaziantep İbnisina | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Eren Demir | Antalya Lara | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | 31.000,00 ₺ | 0,00 ₺ | — |
| Esra Koç | Antalya Beachpark | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Filiz Kılıç | Düzce | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Fuat Aksoy | Düzce | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Fırat Aksu | Şanlıurfa | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Gamze Sarıkaya | Siirt | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Gizem Aktaş | Antalya Markantalya | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Gönül Arslan | Batman | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Hande Yavaş | Samsun Marina | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Hatice Güler | Batman | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Havva Demirci | Şanlıurfa | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Hülya Tüzün | Işıklar | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | 31.000,00 ₺ | 0,00 ₺ | — |
| Hüseyin Çınar | Konya Bosna | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Kemal Hüseyinoğlu | Işıklar | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | 32.000,00 ₺ | 0,00 ₺ | — |
| Kenan Güneş | Kilis | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Kerem Demir | Antalya Beachpark | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Koray Yıldırım | Düzce | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Levent Taş | Samsun Atakum | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Mehmet Şahin | Antalya Mallof | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Mert Candan | Samsun Marina | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Merve Arı | Gaziantep Üniversite | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Nergiz Güven | Şanlıurfa | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Neslihan Kurt | Samsun Atakum | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Nur Özkan | Antalya Markantalya | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Onur Kılıç | Gaziantep İbrahimli | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Orhan Uysal | Samsun Marina | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Osman Koç | Siirt | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Recep Çetin | Siirt | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Reyhan Şimşek | Konya Bosna | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Rukiye Akın | Nizip | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Seda Doğru | Gaziantep İbnisina | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Sedat Aslan | Konya Meram | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Selin Çelik | Antalya Mallof | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Selma Bulut | Kilis | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Sibel Kaçar | Samsun Atakum | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Sinan Yurt | Nizip | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Sinem Kurt | Gaziantep İbrahimli | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Suat Şahin | Kilis | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Süleyman Olgun | Işıklar | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | 32.000,00 ₺ | 0,00 ₺ | — |
| Talat Çakır | Nizip | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Tarık Polat | Antalya Markantalya | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Tolga Güler | Gaziantep İbnisina | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Tuba Bal | Samsun Marina | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Tuğba Akçay | Konya Meram | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Tülay Kaplan | Siirt | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Uğur Tekin | Gaziantep Üniversite | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Veysel Hüseyinoğlu | Antalya Lara | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | 31.000,00 ₺ | 0,00 ₺ | — |
| Yaren Çetin | Konya Meram | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Yasin Güven | Gaziantep Üniversite | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Yusuf Tekin | Şanlıurfa | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| İbrahim Demir | Batman | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| İpek Sarı | Antalya Beachpark | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| İsmail Sivri | Işıklar | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | 31.000,00 ₺ | 0,00 ₺ | — |
| Şule Doğan | Düzce | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Şükrü Öz | Batman | barista | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Ali CEO | — | ceo | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Aslan CEO | — | ceo | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Utku CGO | — | cgo | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Utku Dernek | Merkez Ofis (HQ) | cgo | 0 | 0s 0d | 0 | 0 | 0 | 0 | 59.000,00 ₺ | 0,00 ₺ | — |
| Ece Trainer | — | coach | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Yavuz Coach | — | coach | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Yavuz Kolakan | Merkez Ofis (HQ) | coach | 0 | 0s 0d | 0 | 0 | 0 | 0 | 46.000,00 ₺ | 0,00 ₺ | — |
| Ayşe Kaya | — | destek | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Eren Elmas | Fabrika | fabrika_mudur | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Arife Yıldırım | Fabrika | fabrika_operator | 0 | 0s 0d | 0 | 0 | 0 | 0 | 29.500,00 ₺ | 0,00 ₺ | — |
| Büşra Doğmuş | Fabrika | fabrika_operator | 0 | 0s 0d | 0 | 0 | 0 | 0 | 31.000,00 ₺ | 0,00 ₺ | — |
| Fabrika Kiosk | Fabrika | fabrika_operator | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Filiz Karali | Fabrika | fabrika_operator | 0 | 0s 0d | 0 | 0 | 0 | 0 | 30.500,00 ₺ | 0,00 ₺ | — |
| Galip Can Boran | Fabrika | fabrika_operator | 0 | 0s 0d | 0 | 0 | 0 | 0 | 31.500,00 ₺ | 0,00 ₺ | — |
| Hatice Kocabaş | Fabrika | fabrika_operator | 0 | 0s 0d | 0 | 0 | 0 | 0 | 31.000,00 ₺ | 0,00 ₺ | — |
| Leyla Sönmez | Fabrika | fabrika_operator | 0 | 0s 0d | 0 | 0 | 0 | 0 | 30.000,00 ₺ | 0,00 ₺ | — |
| Mihrican Veziroğlu | Fabrika | fabrika_operator | 0 | 0s 0d | 0 | 0 | 0 | 0 | 31.000,00 ₺ | 0,00 ₺ | — |
| Mustafa Can Horzum | Fabrika | fabrika_operator | 0 | 0s 0d | 0 | 0 | 0 | 0 | 39.000,00 ₺ | 0,00 ₺ | — |
| Ümüt Koşar | Fabrika | fabrika_operator | 0 | 0s 0d | 0 | 0 | 0 | 0 | 70.000,00 ₺ | 0,00 ₺ | — |
| Sema Gıda Mühendisi | — | gida_muhendisi | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Sema Reçete GM | Fabrika | gida_muhendisi | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Diana Marketing | — | marketing | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Dıana Nayfonova | Merkez Ofis (HQ) | marketing | 0 | 0s 0d | 0 | 0 | 0 | 0 | 37.000,00 ₺ | 0,00 ₺ | — |
| Ahmet Altın | Siirt | mudur | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Andre Müdür | Antalya Lara | mudur | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Arda Bulut | Gaziantep İbnisina | mudur | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Celal Öztürk | Samsun Marina | mudur | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Erdal Polat | Kilis | mudur | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Erdem Yıldız | Işıklar | mudur | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Hakan Tunç | Antalya Mallof | mudur | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Harun Karadağ | Samsun Atakum | mudur | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Kaan Yıldız | Gaziantep Üniversite | mudur | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Kadir Özdemir | Konya Bosna | mudur | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Murat Güneş | Gaziantep İbrahimli | mudur | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Necdet Aydın | Düzce | mudur | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Nihat Erdoğan | Konya Meram | mudur | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Ramazan Çelik | Batman | mudur | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Remzi Gün | Nizip | mudur | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Serkan Karataş | Antalya Beachpark | mudur | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Veysel Turan | Şanlıurfa | mudur | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Volkan Arslan | Antalya Markantalya | mudur | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Mahmut Altunay | Merkez Ofis (HQ) | muhasebe_ik | 0 | 0s 0d | 0 | 0 | 0 | 0 | 49.000,00 ₺ | 0,00 ₺ | — |
| Mahmut İK | — | muhasebe_ik | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Samet Satinalma | — | satinalma | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Şevket Samet Kara | Merkez Ofis (HQ) | satinalma | 0 | 0s 0d | 0 | 0 | 0 | 0 | 37.000,00 ₺ | 0,00 ₺ | — |
| Ümit Usta | Fabrika | sef | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Alican Erkenekli | Antalya Lara | stajyer | 0 | 0s 0d | 0 | 0 | 0 | 0 | 33.000,00 ₺ | 0,00 ₺ | — |
| Yağız Törer | Antalya Lara | stajyer | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Şahin Berker Ersürmeli | Antalya Lara | stajyer | 0 | 0s 0d | 0 | 0 | 0 | 0 | 33.000,00 ₺ | 0,00 ₺ | — |
| Antalya Beachpark Kiosk | Antalya Beachpark | sube_kiosk | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Antalya Lara Kiosk | Antalya Lara | sube_kiosk | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Antalya Mallof Kiosk | Antalya Mallof | sube_kiosk | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Antalya Markantalya Kiosk | Antalya Markantalya | sube_kiosk | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Batman Kiosk | Batman | sube_kiosk | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Düzce Kiosk | Düzce | sube_kiosk | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Gaziantep Üniversite Kiosk | Gaziantep Üniversite | sube_kiosk | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Gaziantep İbnisina Kiosk | Gaziantep İbnisina | sube_kiosk | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Gaziantep İbrahimli Kiosk | Gaziantep İbrahimli | sube_kiosk | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Işıklar Kiosk | Işıklar | sube_kiosk | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Kilis Kiosk | Kilis | sube_kiosk | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Konya Bosna Kiosk | Konya Bosna | sube_kiosk | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Konya Meram Kiosk | Konya Meram | sube_kiosk | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Nizip Kiosk | Nizip | sube_kiosk | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Samsun Atakum Kiosk | Samsun Atakum | sube_kiosk | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Samsun Marina Kiosk | Samsun Marina | sube_kiosk | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Siirt Kiosk | Siirt | sube_kiosk | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Şanlıurfa Kiosk | Şanlıurfa | sube_kiosk | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Atiye Kar | Fabrika | supervisor | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Ayşegül Bozkurt | Düzce | supervisor | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Dilan Keskin | Gaziantep Üniversite | supervisor | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Elif Gürbüz | Konya Bosna | supervisor | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Fatma Akın | Gaziantep İbnisina | supervisor | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Gülay Sezer | Samsun Atakum | supervisor | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Hacer Yıldırım | Gaziantep İbrahimli | supervisor | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Hatun Özkan | Nizip | supervisor | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Müzeyyen Akar | Kilis | supervisor | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Nadide Öztürk | Şanlıurfa | supervisor | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Pelin Doğan | Antalya Markantalya | supervisor | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Pınar Alp | Samsun Marina | supervisor | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Senem Yıldız | Antalya Mallof | supervisor | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Sevim Yılmaz | Siirt | supervisor | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Zehra Yurt | Antalya Beachpark | supervisor | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Özlem Kaya | Batman | supervisor | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Şeyma Avcı | Konya Meram | supervisor | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Deniz Halil Çolak | Antalya Lara | supervisor_buddy | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Murat Demir | — | teknik | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Ece Öz | Merkez Ofis (HQ) | trainer | 0 | 0s 0d | 0 | 0 | 0 | 0 | 42.000,00 ₺ | 0,00 ₺ | — |
| Halil Özkan | Antalya Mallof | yatirimci_branch | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Halil Özkan | Işıklar | yatirimci_branch | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Halil Özkan | Gaziantep İbrahimli | yatirimci_branch | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Halil Özkan | Konya Meram | yatirimci_branch | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |
| Mehmet Özkan | — | yatirimci_hq | 0 | 0s 0d | 0 | 0 | 0 | 0 | — | — | 1× |

## 5. Anomali Detayları

### Admin DOSPRESSO (admin, —)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Admin HQ (admin, —)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Test HQ Superuser (admin, —)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Efe Yüksel (bar_buddy, Antalya Lara)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Adem Kara (barista, Konya Bosna)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Ali Demirci (barista, Antalya Beachpark)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Aylin Yılmaz (barista, Gaziantep Üniversite)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Ayten Erbaş (barista, Kilis)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Berk Aydın (barista, Gaziantep İbrahimli)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Berna Baş (barista, Nizip)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Burak Yalçın (barista, Antalya Markantalya)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Burcu Öz (barista, Gaziantep İbnisina)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Büşra Tok (barista, Konya Bosna)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Can Akar (barista, Antalya Mallof)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Cihan Yılmaz (barista, Samsun Atakum)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Deniz Ayvazoğlu (barista, Antalya Lara)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Doruk Baş (barista, Konya Meram)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Duygu Kaya (barista, Antalya Mallof)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Ebru Şen (barista, Gaziantep İbrahimli)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Emre Kaplan (barista, Gaziantep İbnisina)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Esra Koç (barista, Antalya Beachpark)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Filiz Kılıç (barista, Düzce)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Fuat Aksoy (barista, Düzce)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Fırat Aksu (barista, Şanlıurfa)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Gamze Sarıkaya (barista, Siirt)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Gizem Aktaş (barista, Antalya Markantalya)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Gönül Arslan (barista, Batman)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Hande Yavaş (barista, Samsun Marina)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Hatice Güler (barista, Batman)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Havva Demirci (barista, Şanlıurfa)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Hüseyin Çınar (barista, Konya Bosna)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Kenan Güneş (barista, Kilis)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Kerem Demir (barista, Antalya Beachpark)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Koray Yıldırım (barista, Düzce)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Levent Taş (barista, Samsun Atakum)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Mehmet Şahin (barista, Antalya Mallof)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Mert Candan (barista, Samsun Marina)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Merve Arı (barista, Gaziantep Üniversite)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Nergiz Güven (barista, Şanlıurfa)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Neslihan Kurt (barista, Samsun Atakum)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Nur Özkan (barista, Antalya Markantalya)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Onur Kılıç (barista, Gaziantep İbrahimli)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Orhan Uysal (barista, Samsun Marina)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Osman Koç (barista, Siirt)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Recep Çetin (barista, Siirt)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Reyhan Şimşek (barista, Konya Bosna)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Rukiye Akın (barista, Nizip)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Seda Doğru (barista, Gaziantep İbnisina)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Sedat Aslan (barista, Konya Meram)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Selin Çelik (barista, Antalya Mallof)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Selma Bulut (barista, Kilis)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Sibel Kaçar (barista, Samsun Atakum)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Sinan Yurt (barista, Nizip)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Sinem Kurt (barista, Gaziantep İbrahimli)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Suat Şahin (barista, Kilis)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Talat Çakır (barista, Nizip)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Tarık Polat (barista, Antalya Markantalya)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Tolga Güler (barista, Gaziantep İbnisina)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Tuba Bal (barista, Samsun Marina)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Tuğba Akçay (barista, Konya Meram)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Tülay Kaplan (barista, Siirt)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Uğur Tekin (barista, Gaziantep Üniversite)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Yaren Çetin (barista, Konya Meram)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Yasin Güven (barista, Gaziantep Üniversite)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Yusuf Tekin (barista, Şanlıurfa)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### İbrahim Demir (barista, Batman)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### İpek Sarı (barista, Antalya Beachpark)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Şule Doğan (barista, Düzce)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Şükrü Öz (barista, Batman)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Ali CEO (ceo, —)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Aslan CEO (ceo, —)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Utku CGO (cgo, —)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Ece Trainer (coach, —)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Yavuz Coach (coach, —)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Ayşe Kaya (destek, —)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Eren Elmas (fabrika_mudur, Fabrika)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Fabrika Kiosk (fabrika_operator, Fabrika)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Sema Gıda Mühendisi (gida_muhendisi, —)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Sema Reçete GM (gida_muhendisi, Fabrika)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Diana Marketing (marketing, —)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Ahmet Altın (mudur, Siirt)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Andre Müdür (mudur, Antalya Lara)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Arda Bulut (mudur, Gaziantep İbnisina)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Celal Öztürk (mudur, Samsun Marina)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Erdal Polat (mudur, Kilis)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Erdem Yıldız (mudur, Işıklar)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Hakan Tunç (mudur, Antalya Mallof)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Harun Karadağ (mudur, Samsun Atakum)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Kaan Yıldız (mudur, Gaziantep Üniversite)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Kadir Özdemir (mudur, Konya Bosna)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Murat Güneş (mudur, Gaziantep İbrahimli)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Necdet Aydın (mudur, Düzce)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Nihat Erdoğan (mudur, Konya Meram)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Ramazan Çelik (mudur, Batman)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Remzi Gün (mudur, Nizip)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Serkan Karataş (mudur, Antalya Beachpark)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Veysel Turan (mudur, Şanlıurfa)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Volkan Arslan (mudur, Antalya Markantalya)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Mahmut İK (muhasebe_ik, —)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Samet Satinalma (satinalma, —)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Ümit Usta (sef, Fabrika)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Yağız Törer (stajyer, Antalya Lara)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Antalya Beachpark Kiosk (sube_kiosk, Antalya Beachpark)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Antalya Lara Kiosk (sube_kiosk, Antalya Lara)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Antalya Mallof Kiosk (sube_kiosk, Antalya Mallof)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Antalya Markantalya Kiosk (sube_kiosk, Antalya Markantalya)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Batman Kiosk (sube_kiosk, Batman)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Düzce Kiosk (sube_kiosk, Düzce)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Gaziantep Üniversite Kiosk (sube_kiosk, Gaziantep Üniversite)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Gaziantep İbnisina Kiosk (sube_kiosk, Gaziantep İbnisina)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Gaziantep İbrahimli Kiosk (sube_kiosk, Gaziantep İbrahimli)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Işıklar Kiosk (sube_kiosk, Işıklar)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Kilis Kiosk (sube_kiosk, Kilis)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Konya Bosna Kiosk (sube_kiosk, Konya Bosna)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Konya Meram Kiosk (sube_kiosk, Konya Meram)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Nizip Kiosk (sube_kiosk, Nizip)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Samsun Atakum Kiosk (sube_kiosk, Samsun Atakum)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Samsun Marina Kiosk (sube_kiosk, Samsun Marina)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Siirt Kiosk (sube_kiosk, Siirt)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Şanlıurfa Kiosk (sube_kiosk, Şanlıurfa)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Atiye Kar (supervisor, Fabrika)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Ayşegül Bozkurt (supervisor, Düzce)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Dilan Keskin (supervisor, Gaziantep Üniversite)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Elif Gürbüz (supervisor, Konya Bosna)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Fatma Akın (supervisor, Gaziantep İbnisina)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Gülay Sezer (supervisor, Samsun Atakum)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Hacer Yıldırım (supervisor, Gaziantep İbrahimli)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Hatun Özkan (supervisor, Nizip)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Müzeyyen Akar (supervisor, Kilis)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Nadide Öztürk (supervisor, Şanlıurfa)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Pelin Doğan (supervisor, Antalya Markantalya)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Pınar Alp (supervisor, Samsun Marina)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Senem Yıldız (supervisor, Antalya Mallof)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Sevim Yılmaz (supervisor, Siirt)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Zehra Yurt (supervisor, Antalya Beachpark)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Özlem Kaya (supervisor, Batman)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Şeyma Avcı (supervisor, Konya Meram)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Deniz Halil Çolak (supervisor_buddy, Antalya Lara)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Murat Demir (teknik, —)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Halil Özkan (yatirimci_branch, Antalya Mallof)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Halil Özkan (yatirimci_branch, Işıklar)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Halil Özkan (yatirimci_branch, Gaziantep İbrahimli)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Halil Özkan (yatirimci_branch, Konya Meram)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

### Mehmet Özkan (yatirimci_hq, —)
- P4: employee_salaries kaydı yok — brüt maaş bilinmiyor.

## 6. GO / NO-GO Karar Şablonu

**🔴 NO-GO:** Aşağıdaki blocker(lar) çözülmeden gerçek ay sonu çalıştırılmamalı:

- Ay içinde PDKS kaydı yok — Excel import çalıştırılmalı.
- Maaş bilgisi olan personel oranı 17.7% < %90.
- A5: 144 aktif personel için employee_salaries kaydı yok — bordro hesaplanamaz.

## 7. Kaynak & Yöntem

- **Engine:** `server/lib/pdks-engine.ts` `getMonthClassification` fonksiyonu (production ile birebir mantık).
- **Veri kaynakları:** `users`, `employee_salaries`, `pdks_records`, `scheduled_offs`, `leave_requests`, `shifts`, `public_holidays`, `shift_attendance`, `pdks_daily_summary`, `pdks_monthly_stats`.
- **Brüt tahmin formülü:** `baseSalary × (workedDays + sickLeaveDays + annualLeaveDays) / expectedWorkDays + overtimeHours × hourlyRate × 1.5` (kuruş→TL).
- **Hourly rate:** `baseSalary / (weeklyHours × 4.33)`.
- **Kapsam dışı:** Vergi/SGK/asgari ücret istisnası/diğer kesintiler — gerçek bordro hesaplayıcısının işi (`monthly_payrolls`).
- **Yeniden çalıştır:** `tsx scripts/pilot/pdks-monthly-simulation.ts --year=2026 --month=5`
