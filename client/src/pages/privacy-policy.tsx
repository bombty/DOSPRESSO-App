import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto p-3 max-w-3xl pb-24">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => window.history.back()}
        className="mb-3"
        data-testid="button-back"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Geri
      </Button>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold" data-testid="text-privacy-title">
              DOSPRESSO Gizlilik ve Kisisel Verilerin Korunmasi Politikasi
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Son guncelleme: 11 Subat 2026
          </p>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">1. Veri Sorumlusu</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              DOSPRESSO Kahve Franchise Yonetim Sistemi ("Platform"), 6698 say\u0131l\u0131 Kisisel Verilerin Korunmas\u0131 Kanunu ("KVKK") kapsam\u0131nda veri sorumlusu s\u0131fat\u0131yla hareket etmektedir. Bu politika, platformun kisisel verilerin islenmesine iliskin ilke ve kurallar\u0131n\u0131 belirler.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">2. Toplanan Kisisel Veriler</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Platform uzerinden asag\u0131daki kisisel veriler toplanmaktad\u0131r:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside pl-2">
              <li>Kimlik bilgileri (ad, soyad, T.C. kimlik numarasi)</li>
              <li>Iletisim bilgileri (e-posta, telefon numaras\u0131)</li>
              <li>Calisma bilgileri (gorev, sube, vardiya, performans verileri)</li>
              <li>Konum verileri (QR yoklama sistemi icin)</li>
              <li>Gorsel veriler (gorev dogrulama fotograflar\u0131, profil fotograflar\u0131)</li>
              <li>Egitim verileri (akademi ilerleme, sertifikalar, s\u0131nav sonuclar\u0131)</li>
              <li>Giris-c\u0131k\u0131s kay\u0131tlar\u0131 ve oturum bilgileri</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">3. Verilerin Islenmesi Amac\u0131</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Kisisel verileriniz asag\u0131daki amaclarla islenmektedir:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside pl-2">
              <li>Franchise operasyonlar\u0131n\u0131n yonetimi ve koordinasyonu</li>
              <li>Personel yonetimi, vardiya planlama ve performans takibi</li>
              <li>Egitim ve sertifikasyon sureclerinin yonetimi</li>
              <li>Ekipman bak\u0131m ve ar\u0131za takibi</li>
              <li>Kalite kontrol ve denetim sureclerinin yurutulmesi</li>
              <li>Yasal yukumluluklerin yerine getirilmesi</li>
              <li>Is sagligi ve guvenligi onlemlerinin al\u0131nmas\u0131</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">4. Verilerin Hukuki Dayanag\u0131</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Kisisel verileriniz, KVKK'n\u0131n 5. ve 6. maddelerinde belirtilen; ac\u0131k r\u0131zan\u0131z, sozlesmenin ifas\u0131, hukuki yukumluluk, mesru menfaat ve is sagligi-guvenligi hukuki sebeplerine dayanarak islenmektedir.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">5. Verilerin Aktar\u0131lmas\u0131</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Kisisel verileriniz, yukar\u0131da belirtilen amaclar dogrultusunda; is ortaklar\u0131na, tedarikci firmalar\u0131na, yasal olarak yetkili kamu kurum ve kuruluslar\u0131na ve ozel kisilere KVKK'n\u0131n 8. ve 9. maddelerinde belirtilen kosullara uygun olarak aktar\u0131labilir. Yurt dis\u0131na veri aktar\u0131m\u0131 yap\u0131lmas\u0131 halinde KVKK'daki guvencelere uyulur.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">6. Veri Saklama Suresi</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Kisisel verileriniz, isleme amac\u0131n\u0131n gerektirdigi sure boyunca ve yasal zorunluluklar cercevesinde saklan\u0131r. Is iliskisinin sona ermesinden sonra yasal saklama surelerine uygun olarak muhafaza edilir ve surelerin dolmas\u0131n\u0131n ard\u0131ndan silinir, yok edilir veya anonim hale getirilir.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">7. Veri Guvenlig\u0131 Onlemleri</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Platform, kisisel verilerinizin guvenligini saglamak amaciyla:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside pl-2">
              <li>SSL/TLS sifreleme ile veri iletisimi saglan\u0131r</li>
              <li>Rol bazl\u0131 erisim kontrolu (RBAC) ile yetkilendirme yap\u0131l\u0131r</li>
              <li>Duzeni yedekleme ve felaket kurtarma planlari uygulan\u0131r</li>
              <li>Erisim loglar\u0131 tutulur ve denetlenir</li>
              <li>Calisanlara veri guvenligi egitimleri verilir</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">8. Yapay Zeka (AI) Kullan\u0131m\u0131</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Platform, operasyonel verimliligi artirmak amaciyla yapay zeka teknolojileri kullanmaktad\u0131r. AI tarafindan islenen veriler:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside pl-2">
              <li>Gorev fotograf\u0131 dogrulamasi (AI Vision)</li>
              <li>Performans analizi ve oneriler</li>
              <li>Bilgi bankasi semantic arama</li>
              <li>Egitim icerigi onelendirme</li>
            </ul>
            <p className="text-xs text-muted-foreground leading-relaxed">
              AI taraf\u0131ndan yap\u0131lan degerlendirmeler nihai karar niteliginde degildir ve insan denetimi alt\u0131ndad\u0131r.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">9. Ilgili Kisi Haklar\u0131 (KVKK Madde 11)</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              KVKK'n\u0131n 11. maddesi uyar\u0131nca asag\u0131daki haklara sahipsiniz:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside pl-2">
              <li>Kisisel verilerinizin islenip islenmedigini ogrenme</li>
              <li>Kisisel verileriniz islenm\u0131sse buna iliskin bilgi talep etme</li>
              <li>Kisisel verilerinizin islenme amac\u0131n\u0131 ve bunlar\u0131n amac\u0131na uygun kullan\u0131l\u0131p kullan\u0131lmad\u0131g\u0131n\u0131 ogrenme</li>
              <li>Yurt icinde veya yurt d\u0131s\u0131nda kisisel verilerin aktar\u0131ld\u0131g\u0131 ucuncu kisileri bilme</li>
              <li>Kisisel verilerin eksik veya yanl\u0131s islenm\u0131s olmas\u0131 halinde bunlar\u0131n duzeltilmesini isteme</li>
              <li>KVKK'n\u0131n 7. maddesinde ongorulen kosullar cercevesinde kisisel verilerin silinmesini veya yok edilmesini isteme</li>
              <li>Islenen verilerin munc\u0131has\u0131ran otomatik sistemler vas\u0131tas\u0131yla analiz edilmesi suretiyle aley\u0127inize bir sonucun ortaya c\u0131kmas\u0131na itiraz etme</li>
              <li>Kisisel verilerin kanuna ayk\u0131r\u0131 olarak islenmesi sebebiyle zarara ugraman\u0131z halinde zarar\u0131n giderilmesini talep etme</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">10. Basvuru Yontemi</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Yukar\u0131da belirtilen haklar\u0131n\u0131z\u0131 kullanmak icin; yaz\u0131l\u0131 olarak veya Kisisel Verileri Koruma Kurulu taraf\u0131ndan belirlenen diger yontemlerle basvurabilirsiniz. Basvurular\u0131n\u0131z en gec 30 gun icinde ucretsiz olarak sonucland\u0131r\u0131lacakt\u0131r.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">11. Cerez (Cookie) Politikas\u0131</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Platform, kullan\u0131c\u0131 deneyimini iyilestirmek ve guvenlik amac\u0131yla oturum cerezleri kullanmaktad\u0131r. Bu cerezler oturum yonetimine iliskin zorunlu cerezlerdir ve platform\u0131n dogru cal\u0131smas\u0131 icin gereklidir.
            </p>
          </section>

          <div className="pt-4 border-t">
            <p className="text-[10px] text-muted-foreground text-center">
              Bu politika DOSPRESSO Franchise Yonetim Platformu kullan\u0131c\u0131lar\u0131 icin hazirlanm\u0131st\u0131r.
              <br />
              6698 say\u0131l\u0131 Kisisel Verilerin Korunmas\u0131 Kanunu (KVKK) uyar\u0131nca duzenlenmistir.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
