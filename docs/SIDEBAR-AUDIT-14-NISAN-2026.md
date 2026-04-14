# DOSPRESSO Sidebar Audit — 14 Nisan 2026

## SORUN: 16 sayfa route var ama sidebar'dan erişilemiyor

### Kategori A — Blueprint'te TANIMLI ama hiçbir role ATANMAMIŞ (19 item)
| Sidebar ID | Path | Kim Görmeli |
|-----------|------|-------------|
| lost-found | /kayip-esya | mudur, supervisor, barista |
| lost-found-hq | /kayip-esya-hq | admin, ceo, cgo |
| onboarding-programs | /onboarding-programlar | admin, coach, trainer |
| product-complaints | /crm/ticket-talepler | admin, ceo, crm rolleri |
| qr-scan | /qr-tara | supervisor, mudur |
| branch-shift-tracking | /sube-vardiya-takibi | admin, muhasebe_ik |
| audit-analytics | (analitik) | coach, trainer, kalite |

### Kategori B — Ne Blueprint ne sidebar'da, ama route VAR (16 sayfa)
| Sayfa | Route | Kim Görmeli | Not |
|-------|-------|-------------|-----|
| Duyurular | /duyurular | Tüm HQ | BottomNav'da yok, sidebar'da yok |
| Canlı Takip | /canli-takip | CEO, CGO, Coach | Önceki sprint'te sidebar kaldırılmış |
| Denetimler | /denetimler | Coach, Trainer, Kalite | /kalite-denetimi ile aynı mı? |
| Görevler | /gorevler | Tüm roller | /task-takip sidebar'da var |
| Profil | /profil | Tüm roller | Bottom nav'da var |
| Mesajlar | /mesajlar | Tüm roller | /iletisim sidebar'da var |
| Benim Günum | /benim-gunum | Şube personeli | HomeScreen kartı var |
| Bordrom | /bordrom | Tüm personel | İK'dan ulaşılıyor |
| Vardiyalarım | /vardiyalarim | Şube personeli | Vardiyalar sidebar'da var |
| İletişim Merkezi | /iletisim-merkezi | Tüm roller | /iletisim ile aynı mı? |
| QC Dashboard | /kalite-kontrol-dashboard | Gıda müh, Kalite | Sidebar'da yok |
| HQ Fabrika Analitik | /hq-fabrika-analitik | CEO, CGO | Sidebar'da yok |
| Eğitim | /egitim | Coach, Trainer | Akademi sidebar'da var |
| Duyuru Studio | /duyuru-studio | Admin, CEO | Sidebar'da yok |
| Franchise Özet | /franchise-ozet | Yatırımcı | HomeScreen kartı var |
| PDKS Excel Import | /pdks-excel-import | Muhasebe | PDKS sidebar'da var |

### Kategori C — Sidebar item sayısı düşük roller
| Rol | Item | Eksik Olabilecekler |
|-----|:----:|---------------------|
| ceo | 7 | duyurular, canli-takip, subeler, ik |
| cgo | 7 | duyurular, canli-takip, fabrika |
| coach | 7 | denetimler, akademi, subeler |
| trainer | 7 | denetimler, akademi |
| barista | 5 | gorevler, profil |
| stajyer | 4 | profil |

## ÇÖZÜM ÖNERİSİ
Kategori B'deki çoğu sayfa alternatif yollarla erişilebilir (bottom nav, HomeScreen kart, tab). 
Gerçek sorun Kategori A: 19 blueprint item tanımlı ama atanmamış.
