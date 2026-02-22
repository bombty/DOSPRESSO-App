# Coach Console Spec (DOSPRESSO Academy V2)

## Amaç
Coach ekranı bir "yönetim konsolu"dur. Coach eğitim tüketmez; eğitim programı oluşturur, atar, izler, onaylar.

## Coach'ta OLMAMASI gerekenler (Employee UI ile karışmamalı)
- Eğitim tüketim akışı: "Başlat / İzle / Modül izle"
- Genel eğitim kataloğu (employee gibi gezinme)
- Rozet avı / streak gibi çalışan motivasyon ekranları

## Coach'ta OLMASI gereken ana modüller
1) Programlar (Templates)
- Onboarding Template oluştur / düzenle / versiyonla / yayınla
- Rol bazlı (Stajyer / Bar Buddy / Barista / Supervisor Buddy / Supervisor)

2) Atamalar (Assignments)
- Şube + Rol + Başlangıç tarihi → program ata
- Override: Şube bazında farklılaştırma

3) İzleme (Monitoring)
- İlerleme: kişi/şube/rol bazında
- Gate takılma: hangi gün/hangi sınavda takıldı
- KPI/Fire sinyali: tekrar eden hata temaları

4) Onay & Değerlendirme
- Onay kuyruğu: Supervisor/Coach onayı gereken sınavlar
- Pratik kanıtı: foto/video/checklist onayı (opsiyon)

5) İçerik Yönetimi (Content Library Admin)
- Modül prerequisite / pass rule / validity
- Modül eşleştirme: hangi gate hangi modülleri açar

## Bilgi Mimarisinde Kural
- Employee UI: My Path / Library / Achievements
- Coach UI: Console / Templates / Assignments / Insights / Approvals
