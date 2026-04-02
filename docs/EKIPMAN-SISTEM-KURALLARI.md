# DOSPRESSO — Ekipman Sistem Kuralları v3

## SORUMLULUK AYIRIMI (HQ belirler, şube değiştiremez)
- maintenance_responsible: 'hq' | 'branch' 
- fault_protocol: 'hq_teknik' | 'branch'
- service_handled_by: 'hq' | 'branch'

## ARIZA AKIŞI
1. Ekipman seç (QR veya listeden)
2. Troubleshoot adımları tamamla (ZORUNLU)
3. Arıza formu doldur (açıklama + fotoğraf + öncelik)
4. fault_protocol=branch → şube teknik servis mail gönderir
   fault_protocol=hq_teknik → CGO'ya bildirim → onay → mail

## ROL ERİŞİMİ
- CGO: tümü yönetir
- Coach/Trainer: izler (read-only)
- Müdür/Supervisor: kendi şube (bildir + takip)
- Barista: bildir only

## BİLGİ BANKASI
- HQ cihaz tipi bazlı: kılavuz, troubleshoot, bakım
- Mr. Dobody AI ile içerik oluşturma
