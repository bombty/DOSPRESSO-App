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
              DOSPRESSO Kahve Franchise Yönetim Sistemi ("Platform"), 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu sıfatıyla hareket etmektedir. Bu politika, platformun kişisel verilerin işlenmesine ilişkin ilke ve kurallarını belirler.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">2. Toplanan Kişisel Veriler</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Platform üzerinden aşağıdaki kişisel veriler toplanmaktadır:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside pl-2">
              <li>Kimlik bilgileri (ad, soyad, T.C. kimlik numarası)</li>
              <li>İletişim bilgileri (e-posta, telefon numarası)</li>
              <li>Çalışma bilgileri (görev, şube, vardiya, performans verileri)</li>
              <li>Konum verileri (QR yoklama sistemi için)</li>
              <li>Görsel veriler (görev doğrulama fotoğrafları, profil fotoğrafları)</li>
              <li>Eğitim verileri (akademi ilerleme, sertifikalar, sınav sonuçları)</li>
              <li>Giriş-çıkış kayıtları ve oturum bilgileri</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">3. Verilerin İşlenmesi Amacı</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside pl-2">
              <li>Franchise operasyonlarının yönetimi ve koordinasyonu</li>
              <li>Personel yönetimi, vardiya planlama ve performans takibi</li>
              <li>Eğitim ve sertifikasyon süreçlerinin yönetimi</li>
              <li>Ekipman bakım ve arıza takibi</li>
              <li>Kalite kontrol ve denetim süreçlerinin yürütülmesi</li>
              <li>Yasal yükümlülüklerin yerine getirilmesi</li>
              <li>İş sağlığı ve güvenliği önlemlerinin alınması</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">4. Verilerin Hukuki Dayanağı</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Kişisel verileriniz, KVKK'nın 5. ve 6. maddelerinde belirtilen; açık rızanız, sözleşmenin ifası, hukuki yükümlülük, meşru menfaat ve iş sağlığı-güvenliği hukuki sebeplerine dayanarak işlenmektedir.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">5. Verilerin Aktarılması</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Kişisel verileriniz, yukarıda belirtilen amaçlar doğrultusunda; iş ortaklarına, tedarikçi firmalarına, yasal olarak yetkili kamu kurum ve kuruluşlarına ve özel kişilere KVKK'nın 8. ve 9. maddelerinde belirtilen koşullara uygun olarak aktarılabilir. Yurt dışına veri aktarımı yapılması halinde KVKK'daki güvencelere uyulur.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">6. Veri Saklama Süresi</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Kişisel verileriniz, işleme amacının gerektirdiği süre boyunca ve yasal zorunluluklar çerçevesinde saklanır. İş ilişkisinin sona ermesinden sonra yasal saklama sürelerine uygun olarak muhafaza edilir ve sürelerin dolmasının ardından silinir, yok edilir veya anonim hale getirilir.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">7. Veri Güvenliği Önlemleri</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Platform, kişisel verilerinizin güvenliğini sağlamak amacıyla:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside pl-2">
              <li>SSL/TLS şifreleme ile veri iletişimi sağlanır</li>
              <li>Rol bazlı erişim kontrolü (RBAC) ile yetkilendirme yapılır</li>
              <li>Düzenli yedekleme ve felaket kurtarma planları uygulanır</li>
              <li>Erişim logları tutulur ve denetlenir</li>
              <li>Çalışanlara veri güvenliği eğitimleri verilir</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">8. Yapay Zeka (AI) Kullanımı</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Platform, operasyonel verimliliği artırmak amacıyla yapay zeka teknolojileri kullanmaktadır. AI tarafından işlenen veriler:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside pl-2">
              <li>Görev fotoğrafı doğrulaması (AI Vision)</li>
              <li>Performans analizi ve öneriler</li>
              <li>Bilgi bankası semantik arama</li>
              <li>Eğitim içeriği öncelendirme</li>
            </ul>
            <p className="text-xs text-muted-foreground leading-relaxed">
              AI tarafından yapılan değerlendirmeler nihai karar niteliğinde değildir ve insan denetimi altındadır.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">9. İlgili Kişi Hakları (KVKK Madde 11)</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              KVKK'nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside pl-2">
              <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
              <li>Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme</li>
              <li>Kişisel verilerinizin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme</li>
              <li>Yurt içinde veya yurt dışında kişisel verilerin aktarıldığı üçüncü kişileri bilme</li>
              <li>Kişisel verilerin eksik veya yanlış işlenmiş olması halinde bunların düzeltilmesini isteme</li>
              <li>KVKK'nın 7. maddesinde öngörülen koşullar çerçevesinde kişisel verilerin silinmesini veya yok edilmesini isteme</li>
              <li>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme</li>
              <li>Kişisel verilerin kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız halinde zararın giderilmesini talep etme</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">10. Başvuru Yöntemi</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Yukarıda belirtilen haklarınızı kullanmak için; yazılı olarak veya Kişisel Verileri Koruma Kurulu tarafından belirlenen diğer yöntemlerle başvurabilirsiniz. Başvurularınız en geç 30 gün içinde ücretsiz olarak sonuçlandırılacaktır.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">11. Çerez (Cookie) Politikası</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Platform, kullanıcı deneyimini iyileştirmek ve güvenlik amacıyla oturum çerezleri kullanmaktadır. Bu çerezler oturum yönetimine ilişkin zorunlu çerezlerdir ve platformun doğru çalışması için gereklidir.
            </p>
          </section>

          <div className="pt-4 border-t">
            <p className="text-[10px] text-muted-foreground text-center">
              Bu politika DOSPRESSO Franchise Yönetim Platformu kullanıcıları için hazırlanmıştır.
              <br />
              6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca düzenlenmiştir.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
