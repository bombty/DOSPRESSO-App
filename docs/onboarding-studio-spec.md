# Onboarding Studio Spec

## Problem
Onboarding görünür değil. Coach "onboarding bilgisi"ni sisteme nereden yükleyeceğini ve employee'de nasıl göründüğünü ön izlemesini istiyor.

## Çözüm: Coach Console > Onboarding Studio

### Ekranlar
1) Template List
- Stajyer 14 Gün (v1, v2...)
- Bar Buddy 4 Hafta
- Barista 6 Hafta
- Supervisor Buddy / Supervisor

2) Template Editor
- Gün/Gate yapısı
- Her gün: görev listesi (modül, quiz, pratik checklist)
- Gate: quiz + pratik + KPI sinyali (3 katman)

3) Assignment Screen
- Şube seç
- Rol seç
- Başlangıç tarihi
- Template versiyonu seç
- Publish

4) Preview (zorunlu)
- Employee Preview: My Path'te nasıl görünüyor
- Supervisor Preview: onay akışı nasıl görünüyor

### MVP İçerik Modeli
- template_id, version
- day_index, tasks[]
- gate_rules (min_score, required_practice, required_kpi_signal)
- prerequisites
