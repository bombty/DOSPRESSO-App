# TEST MATRIX — DOSPRESSO

Rol bazlı modül erişimi, kritik işlem listesi, kapalı işlemler ve smoke test adımları. Pilot Day-1 öncesi her pilot kullanıcının kendi rolüyle bu matriste işaretli adımları çalıştırması beklenir.

Son güncelleme: 2 Mayıs 2026  
Kaynak kararlar: `docs/DECISIONS.md`

---

## Hatırlatmalar

- **Kiosk insan personel değildir** (`DECISIONS.md` md. 1-2). PDKS / İK / bordro listelerinde görünmez.
- **CEO / Aslan reçete tarafında tam yetkilidir** (md. 19-20). Rol değişikliği YOK; `ceo` rolüne reçete tarafında doğrudan yetki tanımlandı.
- **Sema / `gida_muhendisi` besin/alerjen/gramaj onayında aktif** (md. 21). Hammadde/oran/keyblend YETKİSİ YOK.
- **Ümit / `sef` reçete editleyemez** (md. 22). Kategori bazlı üretim planlama + takip yapar.
- **Eren / `fabrika_mudur` reçete + gıda bilgilerini görür ama değiştiremez** (md. 23). Üretim planlama, takip, sevkiyat hazırlığı yetkili.
- **Müdür sadece kendi şubesini yönetir** (md. 3). Cross-branch yetki YOK.
- **Yatırımcı sadece kendi şubesini görür** (md. 4). HQ / network düzeyi veri YOK.
- **Supervisor personel silemez** (md. 5).

---

## Rol Matrisi

### `admin`

| Alan | Detay |
|---|---|
| **Görebileceği modüller** | Tümü (HQ, branch, factory, akademi, CRM, finans, ayarlar, audit). |
| **Kritik işlemler** | Sistem ayarları, rol/yetki yönetimi, modül flag, kullanıcı yönetimi, cross-branch görünüm. |
| **Yapmaması gerekenler** | Hard delete kullanıcı (md. 8). Pilot kayıtlarını DB'den silme. Live DB'de manuel SQL UPDATE/DELETE owner GO olmadan. |
| **Smoke test** | 1) Login → dashboard açılır. 2) HQ + bir branch + factory dashboard arası geçiş yapar. 3) `module_flags` listesini görür. 4) Audit log son 50 kaydı görür. |

### `ceo` (Aslan)

| Alan | Detay |
|---|---|
| **Görebileceği modüller** | Komuta Merkezi (CEO Mission Control), HQ + tüm branch + factory dashboard'ları, finans, CRM, akademi, **reçete**, üretim, kalite. |
| **Kritik işlemler** | Reçete oluşturma + düzenleme + hammadde/adım CRUD, oran/miktar değiştirme, keyblend, gramaj onayı, besin/alerjen onayı + hesaplama, reçete kilit/aç. Stratejik KPI inceleme. |
| **Yapmaması gerekenler** | Operasyonel kiosk işlem (CEO kioska login olmaz — kiosk operasyonel personel rolüdür). Direkt DB write (her şey UI üzerinden). |
| **Smoke test** | 1) Login → CEO Mission Control yüklenir. 2) `Reçeteler` → bir reçete aç → `Düzenle` görünür. 3) Reçete besin değer onay paneli (`/api/factory/ingredient-nutrition/pending`) erişilir (200). 4) `calculate-nutrition` butonu görünür ve çağrı 200 döner. |

### `cgo`

| Alan | Detay |
|---|---|
| **Görebileceği modüller** | Operasyonel HQ + tüm branch dashboard'ları, mağaza/üretim performansı, kalite, denetim, eğitim. |
| **Kritik işlemler** | Operasyonel KPI inceleme, denetim atama, gap detection takibi, CRM iletişim. |
| **Yapmaması gerekenler** | Reçete edit (CEO yetkisi). Finans onayı (CFO/finans rolü). |
| **Smoke test** | 1) Login → CGO Mission Control yüklenir. 2) Tüm şubeler listesi görünür. 3) Bir şubenin denetim sayfası açılır. |

### `gida_muhendisi` (Sema)

| Alan | Detay |
|---|---|
| **Görebileceği modüller** | Reçete listesi (read), hammadde besin değer paneli, alerjen yönetimi, gramaj onay paneli, etiket önizleme. |
| **Kritik işlemler** | Hammadde besin değer onayı (`/api/factory/ingredient-nutrition/:id/onay`), reçete gramaj onayı, alerjen tanımlama/güncelleme, besin değer hesaplama tetikleme. |
| **Yapmaması gerekenler** | **Hammadde ekle/sil/değiştir** (md. 21). **Oran/miktar değiştir** (md. 21). **Keyblend yönetimi** (md. 21). Reçete temel CRUD (CEO/`recete_gm` yetkisi). |
| **Smoke test** | 1) Login → reçete listesi görünür. 2) Bekleyen besin onay panelinde kayıt varsa onaylar (200). 3) Reçete sayfasında "hammadde ekle" butonu **görünmez** veya 403 verir. 4) Alerjen düzenle butonu çalışır. |

### `sef` (Ümit)

| Alan | Detay |
|---|---|
| **Görebileceği modüller** | Üretim planlama (kendi kategorisi), üretim takibi, kendi atandığı reçeteler (read-only), günlük üretim raporu. |
| **Kritik işlemler** | Üretim planı oluşturma/güncelleme (kendi kategorisi), üretim batch başlatma, üretim ilerlemesi takibi, kalite gözlemi. |
| **Yapmaması gerekenler** | **Reçete edit** (md. 22). Besin/alerjen onayı (`gida_muhendisi` yetkisi). Reçete hammadde CRUD. |
| **Smoke test** | 1) Login → üretim planlama sayfası açılır. 2) Kendi kategorisindeki reçeteler listelenir. 3) Reçete sayfasına gider → `Düzenle` butonu **görünmez** veya 403. 4) Bugünün üretim planı yeni satır eklenir. |

### `fabrika_mudur` (Eren)

| Alan | Detay |
|---|---|
| **Görebileceği modüller** | Fabrika Mission Control, üretim planlama (tüm kategoriler), üretim takibi, sevkiyat, kalite, ekipman, fabrika personel devamı, **reçete + besin/alerjen (read-only)**. |
| **Kritik işlemler** | Üretim planı onay, sevkiyat hazırlık, vardiya planlama, kalite eskalasyon, ekipman arıza takibi. |
| **Yapmaması gerekenler** | **Reçete edit** (md. 23). **Besin/alerjen değişikliği** (md. 23). Hammadde besin onay (`gida_muhendisi` yetkisi). |
| **Smoke test** | 1) Login → Fabrika Mission Control yüklenir. 2) Üretim planı görünür. 3) Reçete listesi açılır (read). 4) Reçete `Düzenle` butonu **yok** veya 403. 5) Sevkiyat hazırlık sayfası çalışır. |

### `mudur` (şube müdürü)

| Alan | Detay |
|---|---|
| **Görebileceği modüller** | **Sadece kendi şubesi** — branch dashboard, PDKS (kendi şube), günlük tasks, branch CRM, branch envanter, branch finans (sınırlı). |
| **Kritik işlemler** | Şube günlük operasyon takibi, görev atama (sub-staff), PDKS izleme, devamsızlık eskalasyonu. |
| **Yapmaması gerekenler** | **Başka şube verisi görme** (md. 3). HQ/network düzeyi rapor. Personel silme (supervisor da silemez, mudur de silemez). |
| **Smoke test** | 1) Login → kendi şube dashboard'ı yüklenir. 2) Branch ID'sini değiştirmeye çalış → 403. 3) PDKS'de kendi şube personeli listelenir. 4) Bugünün görev listesi görünür. |

### `supervisor`

| Alan | Detay |
|---|---|
| **Görebileceği modüller** | Mudur ile aynı kapsam (kendi şube), ek olarak supervisor dashboard widget'ları (PDKS yoklama/devamsızlık, branch_score_detail). |
| **Kritik işlemler** | Vardiya yönetimi, günlük plan, görev koordinasyonu, kalite kontrol, müşteri şikayeti yönetimi. |
| **Yapmaması gerekenler** | **Personel silme** (md. 5). Personel deaktif etme (sadece mudur+ rolü). |
| **Smoke test** | 1) Login → supervisor dashboard yüklenir. 2) PDKS yoklama widget'ı bugünün listesini gösterir. 3) Devamsızlık widget'ı çalışır. 4) Personel listesinde "sil" butonu **görünmez** veya 403. |

### `barista`

| Alan | Detay |
|---|---|
| **Görebileceği modüller** | Kendi günlük görevleri, eğitim modülü (akademi), kendi profil, CRM (sınırlı — müşteri etkileşimi kaydı). |
| **Kritik işlemler** | Görev tamamlama check, eğitim quiz, kendi vardiya görüntüleme, müşteri etkileşim notu. |
| **Yapmaması gerekenler** | Yönetimsel modüller (PDKS yönetimi, finans, rapor). Diğer çalışan verisi. |
| **Smoke test** | 1) Login → kendi görevler listesi yüklenir. 2) Bir görevi tamamlandı işaretle. 3) Akademi modülü açılır. 4) Diğer şubenin verisine erişim **yok**. |

### `sube_kiosk`

| Alan | Detay |
|---|---|
| **Görebileceği modüller** | **Sadece kiosk PIN giriş ekranı.** PIN ile login → personel kendi vardiya başlat/bitir → logout. Hiçbir yönetimsel ekran yok. |
| **Kritik işlemler** | PIN ile shift-start, PIN ile shift-end, vardiya geçmişi (kendi). |
| **Yapmaması gerekenler** | **Personel listesinde görünmek** (md. 1-2). İK/bordro/performans hesabına dahil olmak. Web login. |
| **Smoke test** | 1) Kiosk URL'sine git → PIN giriş ekranı. 2) Geçerli personel PIN ile shift-start (201). 3) Aynı PIN ile shift-end (200). 4) `users WHERE role='sube_kiosk'` → İK personel listesinde **görünmez**. 5) Soft-deleted/inactive personel PIN bilse bile login **olamamalı** (401). |

### `yatirimci_branch`

| Alan | Detay |
|---|---|
| **Görebileceği modüller** | **Sadece kendi şubesi** — branch dashboard (sınırlı KPI), günlük ciro, ürün satışı, branch CRM özet. |
| **Kritik işlemler** | Read-only şube performans inceleme. |
| **Yapmaması gerekenler** | **Başka şube verisi** (md. 4). Operasyonel düzenleme (personel/PDKS/görev). HQ/network düzeyi. |
| **Smoke test** | 1) Login → kendi şube dashboard yüklenir. 2) Şube ID'sini değiştirmeye çalış → 403. 3) HQ dashboard URL'sine git → 403. 4) Personel listesi/düzenleme **yok**. |

### `muhasebe_ik`

| Alan | Detay |
|---|---|
| **Görebileceği modüller** | İK modülü, bordro, PDKS aylık özet, izin yönetimi, personel dosya, finans (muhasebe sekmesi). |
| **Kritik işlemler** | Bordro hazırlama, izin onayı, personel dosya güncelleme, ay sonu PDKS özet kapanış. |
| **Yapmaması gerekenler** | Reçete/üretim modülleri. Kiosk/cross-branch operasyonel düzenleme. |
| **Smoke test** | 1) Login → İK modülü açılır. 2) PDKS aylık özet çalışır. 3) İzin onay paneli açılır. 4) Personel dosya görüntüleme + güncelleme. |

### `satinalma`

| Alan | Detay |
|---|---|
| **Görebileceği modüller** | Satın alma modülü, hammadde stok seviyesi, tedarikçi yönetimi, satın alma siparişi, fatura takibi. |
| **Kritik işlemler** | PO oluşturma/güncelleme, tedarikçi tanımlama, fiyat güncelleme, gelen mal kabul. |
| **Yapmaması gerekenler** | Reçete formülü değiştirme. Hammadde besin değer onayı (`gida_muhendisi`). |
| **Smoke test** | 1) Login → satın alma dashboard. 2) Açık PO'lar listelenir. 3) Yeni PO oluşturma formu açılır. 4) Tedarikçi listesi düzenlenebilir. |

---

## Smoke Test Genel Kuralları

1. **Pilot test kayıtları** her zaman `notes='PILOT_PRE_DAY1_TEST_2026_04_29'` (veya tarih güncellemesi) ile işaretlenir, gerçek operasyon kayıtlarından ayrıştırılır (`docs/runbooks/kiosk-pdks-test.md`).
2. **Hassas veri (PIN, password, token) test raporunda asla yazılmaz** — sadece "PIN ile login OK" / "PIN ile login FAIL (beklenen)" şeklinde durum raporlanır.
3. **Cross-rol test** owner istemediği sürece yapılmaz; her pilot kullanıcı sadece kendi rolüyle test eder.
4. **Negatif test** (yapmaması gereken işlemi denemek) HTTP 403 / UI'da buton yokluğu / route guard ile sonuçlanır — başka bir şey çıkarsa hata.

---

## Bilinen Yan Etkiler / Geçici Davranışlar

- **Reçete detay sayfası spinner** (`DECISIONS.md` md. 28): Nadiren spinner'da kalma. Geçici çözüm: hard refresh. Backend 200 dönüyor; UX iyileştirmesi post-pilot.
- **`shift_attendance.check_out_time` UPDATE eksiği** (md. 15): Kiosk shift-end `check_out_time` alanını güncellemiyor; bordro `pdks_daily_summary` üzerinden okunduğu için maaş etkilenmez ama kayıt bütünlüğü açık.
- **HQ kiosk PIN plaintext** (md. 14): HQ kiosk PIN'leri henüz hash'lenmedi; pilot sonrası ele alınacak.

---

> Bu matris değişikliği için: önce `docs/DECISIONS.md`'de ilgili karar maddesi güncellenir, sonra bu matris yansıtılır. Owner GO olmadan rol davranışı (yetki) değişmez.
