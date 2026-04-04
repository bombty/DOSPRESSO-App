# DOSPRESSO — Checklist (Günlük Kontrol Listesi) Sistemi
**Açılış/kapanış/vardiya devir checklisti, otomatik atama, skor entegrasyonu**

---

## Checklist Akışı
```
Admin/Coach checklist şablonu oluşturur
  → Görevler (tasks) eklenir
  → Atama kapsamı belirlenir (şube/rol/kişi)
  → Günlük otomatik oluşturma (checklist_completions)
  → Personel dolduruyor (task_completions)
  → Supervisor onaylıyor
  → Skor hesaplanıyor
```

## DB Tabloları
```
checklists                 — checklist şablonları (başlık, kategori, frekans)
checklist_tasks            — görev maddeleri (metin, sıra, zorunluluk)
checklist_assignments      — atamalar (şube, rol, kişi bazlı)
checklist_completions      — günlük tamamlama kayıtları (tarih, durum, skor)
checklist_task_completions  — görev bazlı tamamlama (tik/fotoğraf/not)
checklist_ratings          — derecelendirme (supervisor puanı)
shift_checklists           — vardiya devir checklisti
```

## Checklist Tipleri
```
opening    — açılış checklisti (sabah, şube açılırken)
closing    — kapanış checklisti (akşam, şube kapanırken)
shift      — vardiya devir (vardiya değişiminde)
daily      — günlük rutin (temizlik, stok kontrol)
weekly     — haftalık (derin temizlik, ekipman bakım)
custom     — özel (kampanya hazırlık, denetim öncesi)
```

## Skor Etkisi
- Checklist tamamlama oranı → composite score boyutu
- Zamanında tamamlanmayan → şube skoru düşer
- Supervisor etkiler, barista bireysel olarak

## Bilinen Sorun
```
checklist_completions günlük otomatik oluşturma YOK
Kullanıcı /api/checklists/my-daily çağırdığında liste gelir
  ama completion kaydı oluşturmaz
Manuel POST /api/checklist-completions/start gerekli
```

## Dosya Konumları
```
shared/schema/schema-02.ts — checklist tabloları
server/routes/ — checklist API
```
