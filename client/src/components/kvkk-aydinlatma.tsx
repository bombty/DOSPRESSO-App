// ═══════════════════════════════════════════════════════════════════
// Sprint 12 P-22 (7 May 2026) — KVKK Aydınlatma Metni Component
// ═══════════════════════════════════════════════════════════════════
// 
// TGK + KVKK gereği şube/HQ/fabrika kiosklarında çalışan kişiye
// "verilerinin işlendiği" net şekilde duyurulmalı.
// 
// Davranış:
// 1. İlk kiosk açılışında full-screen modal otomatik açılır
// 2. Kullanıcı "Anladım, Devam Et" butonuna basana kadar kiosk kullanılamaz
// 3. localStorage'a "dospresso-kvkk-accepted-v1" yazılır
// 4. Sonraki açılışlarda modal otomatik açılmaz
// 5. Footer'da küçük "🛡️ KVKK Aydınlatma" linki her zaman görünür
// 
// Mevzuat:
// - 6698 sayılı KVKK (RG 07.04.2016 / 29677)
// - Aydınlatma Yükümlülüğü Tebliği (RG 10.03.2018 / 30356)
// 
// Bu metin docs/KVKK-VERI-ISLEME-POLITIKASI.md v1.0'dan uyarlanmıştır.
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Shield, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const KVKK_VERSION = "v1.0";
const STORAGE_KEY = "dospresso-kvkk-accepted-v1";

interface KvkkAydinlatmaProps {
  /** 'sube' | 'hq' | 'fabrika' — hangi kiosk türü için bağlam */
  context: "sube" | "hq" | "fabrika";
  /** Manuel kontrol için (override autoOpen) */
  forceOpen?: boolean;
  onClose?: () => void;
}

/**
 * KVKK Aydınlatma Metni — Modal + Footer Link
 * 
 * Kullanım:
 * ```tsx
 * <KvkkAydinlatma context="sube" />
 * ```
 * 
 * İlk açılışta otomatik modal, sonra footer link.
 */
export function KvkkAydinlatma({ context, forceOpen, onClose }: KvkkAydinlatmaProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(true); // Default true to avoid flash

  useEffect(() => {
    // İlk render'da localStorage kontrol
    const accepted = localStorage.getItem(STORAGE_KEY);
    const wasAccepted = accepted === KVKK_VERSION;
    setHasAccepted(wasAccepted);
    
    // Eğer kabul edilmemişse otomatik aç
    if (!wasAccepted) {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (forceOpen !== undefined) {
      setIsOpen(forceOpen);
    }
  }, [forceOpen]);

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, KVKK_VERSION);
    setHasAccepted(true);
    setIsOpen(false);
    onClose?.();
  };

  const handleClose = () => {
    // Eğer ilk açılışsa kapatılamaz
    if (!hasAccepted) return;
    setIsOpen(false);
    onClose?.();
  };

  // Bağlama göre özel metin parçaları
  const contextText = {
    sube: {
      title: "Şube Personeli",
      data: "vardiya bilgisi, mesai başlangıç/bitiş saati, kiosk üzerinden yapılan işlemler, çalışma saati performans verileri",
      purpose: "PDKS (puantaj), bordro hesabı, yasal SGK bildirimi, vardiya planlama",
    },
    hq: {
      title: "Genel Müdürlük Personeli",
      data: "kiosk giriş/çıkış kayıtları, sistem üzerindeki yetkili işlemler, audit trail (kim ne yaptı)",
      purpose: "yasal denetim (audit log), iş performans takibi, güvenlik (yetkilendirme)",
    },
    fabrika: {
      title: "Fabrika Personeli",
      data: "vardiya kayıtları, üretim kayıtları (hangi reçete üretildi), kalite kontrol verileri",
      purpose: "PDKS, üretim takibi, izlenebilirlik (lot tracing), gıda güvenliği uyumu",
    },
  }[context];

  return (
    <>
      {/* MODAL — full screen, sticky on first open */}
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
          onPointerDownOutside={(e) => !hasAccepted && e.preventDefault()}
          onEscapeKeyDown={(e) => !hasAccepted && e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <Shield className="h-8 w-8 text-primary" />
              KVKK Kişisel Veri Aydınlatma Metni
              <Badge variant="outline">{KVKK_VERSION}</Badge>
            </DialogTitle>
            <DialogDescription>
              Bu kioskayı kullanmadan önce lütfen okuyun.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm leading-relaxed py-2">
            <p className="font-semibold text-base">
              Sayın <span className="text-primary">{contextText.title}</span>,
            </p>

            <p>
              <strong>DOSPRESSO Coffee &amp; Donut</strong> olarak, 6698 sayılı
              Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında kişisel
              verilerinizin işlenmesi hakkında sizi bilgilendirmek istiyoruz.
            </p>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-base flex items-center gap-2">
                📋 İşlenen Veriler
              </h3>
              <p>
                Bu kiosk üzerinden işlenen veriler: {contextText.data}.
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-base flex items-center gap-2">
                🎯 İşlenme Amaçları
              </h3>
              <p>
                Verileriniz şu amaçlarla işlenir: {contextText.purpose}.
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-base flex items-center gap-2">
                ⏰ Saklama Süreleri
              </h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Bordro/PDKS verileri:</strong> 10 yıl (5510 sayılı SGK Kanunu m.86)</li>
                <li><strong>Audit log (denetim kayıtları):</strong> 10 yıl (TTK m.82)</li>
                <li><strong>Müşteri geri bildirimi:</strong> 5 yıl (TBK m.146)</li>
                <li><strong>Operasyonel kayıtlar:</strong> 2 yıl</li>
              </ul>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 space-y-3 border border-blue-200 dark:border-blue-900">
              <h3 className="font-semibold text-base flex items-center gap-2">
                ⚖️ KVKK Madde 11 — Haklarınız
              </h3>
              <p>Aşağıdaki haklara sahipsiniz:</p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
                <li>İşlenmişse buna ilişkin bilgi talep etme</li>
                <li>İşlenme amacını ve uygun kullanılıp kullanılmadığını öğrenme</li>
                <li>Eksik/yanlış işlenmişse düzeltilmesini isteme</li>
                <li>Kanun şartlarına göre silinmesini/yok edilmesini isteme</li>
                <li>Aktarıldığı 3. kişilere bildirilmesini isteme</li>
                <li>Otomatik analizle aleyhinize sonuç çıkmasına itiraz etme</li>
                <li>Zarara uğramışsanız tazminat talep etme</li>
              </ul>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 space-y-2 border border-amber-200 dark:border-amber-900">
              <h3 className="font-semibold text-base flex items-center gap-2">
                📞 İletişim
              </h3>
              <p className="text-xs">
                <strong>Veri Sorumlusu:</strong> DOSPRESSO Coffee &amp; Donut<br />
                <strong>Adres:</strong> Antalya, Türkiye<br />
                <strong>E-posta:</strong> kvkk@dospresso.com<br />
                <strong>Detaylı politika:</strong> dospresso.com/kvkk
              </p>
            </div>

            <p className="text-xs text-muted-foreground italic">
              Bu metin DOSPRESSO KVKK Veri İşleme Politikası v1.0'dan
              uyarlanmıştır. Mevzuat gereği bilgilendirme yükümlülüğü
              kapsamında görüntülenmektedir (Aydınlatma Yükümlülüğü Tebliği,
              RG 10.03.2018/30356).
            </p>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              size="lg"
              onClick={handleAccept}
              className="w-full sm:w-auto"
              data-testid="button-kvkk-accept"
            >
              ✓ Anladım, Devam Et
            </Button>
            {hasAccepted && (
              <Button
                size="lg"
                variant="outline"
                onClick={handleClose}
                className="w-full sm:w-auto"
                data-testid="button-kvkk-close"
              >
                Kapat
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * KVKK Footer Link — kiosk sayfalarının altında küçük şekilde gösterilir
 * 
 * Tıklandığında modal'ı yeniden açar.
 */
export function KvkkFooterLink({ context }: { context: "sube" | "hq" | "fabrika" }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        data-testid="link-kvkk-footer"
      >
        <Shield className="h-3 w-3" />
        <span>KVKK Aydınlatma</span>
        <ExternalLink className="h-3 w-3" />
      </button>

      {showModal && (
        <KvkkAydinlatma
          context={context}
          forceOpen={true}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
