# DOSPRESSO Proje & Cowork Sistemi v2 — Tasarım Planı
**Tarih:** 4 Nisan 2026 | **Durum:** Plan aşaması

## VİZYON
HQ ve sahadan herkesin (iç + dış paydaş) ortak çalışabildiği, her projenin
başından sonuna görsel olarak takip edilebildiği, görev paylaşımı ve iletişimin
tek platformda yapıldığı bir proje yönetim sistemi.

## MEVCUT DURUM
- 2 ayrı proje sistemi (standart + franchise) → BİRLEŞTİRİLMELİ
- franchise_collaborators tablosunda accessToken VAR ama kullanılmıyor
- 10 DB tablosu (project_tasks, members, milestones, phases, risks, comments, budget_lines, dependencies, vendors)
- 15 fazlı yeni şube açılış sistemi mevcut ama timeline yok
- Frontend: 5,739 satır kod (ama ölü)

## HEDEF MİMARİ

### A. Birleşik Proje Sistemi
```
projects tablosu → projectType: "standard" | "franchise" | "internal"
├── standard: HQ/şube arası genel proje
├── franchise: Yeni şube açılış projesi (15 fazlı)
└── internal: HQ departman arası iç proje (IT, pazarlama, vs)
```

### B. Proje İçi Yapı (6 tab)
```
Her projenin içinde:
├── 📊 Dashboard — KPI'lar, ilerleme, kritik görevler, timeline mini
├── 📋 Görevler — Kanban (Todo/Devam/İnceleme/Tamamlandı) + Liste görünümü
├── 📅 Timeline — Gantt chart (fazlar + görevler + milestones)
├── 👥 Ekip — Üyeler + roller + iş yükü + dış paydaşlar
├── 💬 İletişim — Proje içi mesajlaşma (Cowork tarzı)
└── 📁 Dosyalar — Paylaşılan dökümanlar, fotoğraflar
```

### C. Proje Rolleri
```
Proje bazlı roller (sistem rolünden bağımsız):
├── 🏆 Proje Lideri — Tam yetki, görev atama, üye yönetimi
├── ✏️ Editör — Görev oluşturma/düzenleme, yorum
├── 🔧 Katkıda Bulunan — Atanan görevleri tamamlama, yorum
├── 👁️ İzleyici — Sadece görüntüleme
└── 🔗 Dış Paydaş — Link ile sınırlı erişim (usta, mimar, vs)
```

### D. Dış Paydaş Erişimi
```
Akış:
1. Proje lideri "Dış Paydaş Davet Et" butonuna tıklar
2. İsim, rol, uzmanlık, telefon/email girer
3. Sistem benzersiz accessToken üretir
4. Link oluşturulur: dospressohq.replit.app/proje-erisim/{token}
5. Dış paydaş linke tıklar → sadece o projeyi görür
   - Atanan görevlerini görür
   - Durumunu günceller (tamamlandı/engel var)
   - Yorum/fotoğraf ekler
   - Başka hiçbir sisteme erişemez
6. Proje bitince token deaktif olur
```

### E. Yeni Şube Açılış Projesi (Franchise)
```
Otomatik 15 faz şablonu:
1. Şirket Kurulumu & Yasal Belgeler
2. Sözleşmeler & Hukuki İşlemler
3. İnşaat & Tasarım
4. Ekipman & Teknoloji
5. Ödemeler & Finansman
6. Personel & Eğitim
7. Açılış Hazırlığı & Test
8. Şirket Kurulumu (operasyonel)
9. Sözleşmeler & Hukuki (fazla 2)
10. İnşaat & Dekorasyon
11. Ekipman Yönetimi
12. Ödemeler & Bütçe
13. Personel Eğitim (fazla 2)
14. Açılış Testi
15. İlk Müşteri & Go-Live

Her fazda:
├── Otomatik görevler (checklist)
├── Sorumlu atama
├── Başlangıç/bitiş tarihi
├── Fotoğraf gereksinimi (inşaat, dekorasyon)
├── Onay mekanizması (faz tamamlama onayı)
└── Otomatik sonraki faz başlatma
```

### F. Timeline/Gantt Görünümü
```
┌──────────────────────────────────────────────────────────┐
│ Nis 2026                   May 2026                     │
│ 1   8   15  22  29 │ 6   13  20  27 │                  │
│ ▓▓▓▓▓▓▓▓░░░░░░░░░░░│                │ Şirket Kurulumu  │
│          ▓▓▓▓▓▓▓▓▓▓│▓▓▓░░░░░░░░░░░░│ İnşaat & Tasarım │
│                     │   ▓▓▓▓▓▓▓▓▓▓▓▓│ Ekipman          │
│          ★          │        ★       │ Milestones       │
└──────────────────────────────────────────────────────────┘
```

### G. Kanban Görev Görünümü
```
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ Yapılacak│ │ Devam   │ │İnceleme │ │Tamamlandı│
├─────────┤ ├─────────┤ ├─────────┤ ├─────────┤
│ Ruhsat   │ │ İnşaat  │ │ Elektrik│ │ Sözleşme│
│ başvurusu│ │ denetimi│ │ tesisat │ │ imza    │
│ @Mimar   │ │ @Usta   │ │ @CGO    │ │ @Admin  │
│ 15 Nis   │ │ 10 Nis  │ │ 18 Nis  │ │ 5 Nis   │
└─────────┘ └─────────┘ └─────────┘ └─────────┘
```

## UYGULAMA PLANI (Öncelik sırasına göre)

### Sprint 1 (2-3 gün): Proje Dashboard + Kanban
- [ ] projects tablosunu kullan (zaten 10 tablo var)
- [ ] Proje detay sayfası yeniden tasarla (6 tab)
- [ ] Kanban görev görünümü (drag-drop opsiyonel, basit status toggle yeterli)
- [ ] Proje dashboard (KPI, ilerleme, kritik görevler)

### Sprint 2 (1-2 gün): Timeline + Ekip Yönetimi
- [ ] Basit timeline görünümü (CSS-based Gantt, kütüphane gereksiz)
- [ ] Ekip yönetimi (rol atama, iş yükü görünümü)
- [ ] Proje içi mesajlaşma (project_comments genişletmesi)

### Sprint 3 (1-2 gün): Dış Paydaş + Franchise Birleştirme
- [ ] /proje-erisim/:token route (dış paydaş limited view)
- [ ] franchise_projects → projects birleştirme (veya adapter)
- [ ] Yeni şube proje şablonu otomatik oluşturma
- [ ] Bildirim entegrasyonu (görev atandığında, deadline yaklaşınca)

### Sprint 4 (1 gün): Polish
- [ ] Dosya paylaşımı tab'ı
- [ ] Risk yönetimi iyileştirme
- [ ] Tedarikçi bağlantısı
- [ ] Mobil optimizasyon

## TEKNİK NOTLAR
- Mevcut 10 tablo YETERLİ — yeni tablo gerek yok
- franchise_collaborators.accessToken zaten var — link sistemi için kullanılacak
- project_task_dependencies tablosu var — Gantt bağımlılık gösterebilir
- project_budget_lines tablosu var — bütçe takibi için hazır
- API'ler branches.ts'te — ayrı projects-routes.ts'e taşınmalı
