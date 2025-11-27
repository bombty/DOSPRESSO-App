import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Html5Qrcode } from "html5-qrcode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Camera, XCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function QRScanner() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [lastQRType, setLastQRType] = useState<'shift' | 'equipment' | 'inventory' | 'audit' | null>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          try {
            let pathname = decodedText;
            
            // Handle absolute URLs
            try {
              const url = new URL(decodedText);
              pathname = url.pathname;
            } catch {
              // Relative URL or path - use as is
            }
            
            // Auto-detect QR type and route accordingly
            if (pathname.startsWith('/ekipman/') || pathname.startsWith('/equipment/')) {
              // Equipment fault report QR
              const equipmentId = pathname.split(/\/ekipman\/|\/equipment\//)[1];
              if (equipmentId && !isNaN(parseInt(equipmentId))) {
                setLastQRType('equipment');
                toast({
                  title: "Başarılı",
                  description: "Arıza bildirimi sayfasına yönlendiriliyorsunuz...",
                });
                html5QrCode.stop().then(() => {
                  setLocation(`/ariza-yeni?equipmentId=${equipmentId}`);
                });
              } else {
                toast({
                  title: "Hata",
                  description: "Geçersiz ekipman QR kodu",
                  variant: "destructive",
                });
              }
            } else if (pathname.startsWith('/shift/')) {
              // Shift check-in/out QR
              const shiftId = pathname.split('/shift/')[1];
              if (shiftId) {
                setLastQRType('shift');
                toast({
                  title: "Başarılı",
                  description: "Vardiya giriş/çıkış işlemi yapılıyor...",
                });
                html5QrCode.stop().then(() => {
                  setLocation(`/vardiya-checkin?shiftId=${shiftId}`);
                });
              } else {
                toast({
                  title: "Hata",
                  description: "Geçersiz vardiya QR kodu",
                  variant: "destructive",
                });
              }
            } else if (pathname.startsWith('/inventory/')) {
              // Inventory/stock count QR
              const locationId = pathname.split('/inventory/')[1];
              if (locationId) {
                setLastQRType('inventory');
                toast({
                  title: "Başarılı",
                  description: "Envanter sayfasına yönlendiriliyorsunuz...",
                });
                html5QrCode.stop().then(() => {
                  setLocation(`/checklistler?type=inventory&locationId=${locationId}`);
                });
              } else {
                toast({
                  title: "Hata",
                  description: "Geçersiz envanter QR kodu",
                  variant: "destructive",
                });
              }
            } else if (pathname.startsWith('/audit/')) {
              // Audit/inspection QR
              const auditId = pathname.split('/audit/')[1];
              if (auditId) {
                setLastQRType('audit');
                toast({
                  title: "Başarılı",
                  description: "Denetim sayfasına yönlendiriliyorsunuz...",
                });
                html5QrCode.stop().then(() => {
                  setLocation(`/denetim/${auditId}`);
                });
              } else {
                toast({
                  title: "Hata",
                  description: "Geçersiz denetim QR kodu",
                  variant: "destructive",
                });
              }
            } else if (decodedText.match(/^DOSPRESSO-EQ-\d+$/)) {
              // Legacy equipment QR format (backwards compatibility)
              const match = decodedText.match(/DOSPRESSO-EQ-(\d+)$/);
              if (match && match[1]) {
                const equipmentId = match[1];
                setLastQRType('equipment');
                toast({
                  title: "Başarılı",
                  description: "Arıza bildirimi sayfasına yönlendiriliyorsunuz...",
                });
                html5QrCode.stop().then(() => {
                  setLocation(`/ariza-yeni?equipmentId=${equipmentId}`);
                });
              } else {
                toast({
                  title: "Hata",
                  description: "Geçersiz ekipman QR kodu",
                  variant: "destructive",
                });
              }
            } else {
              toast({
                title: "Hata",
                description: "QR kod tipi tanınamadı",
                variant: "destructive",
              });
            }
          } catch (error) {
            toast({
              title: "Hata",
              description: "QR kod okunamadı",
              variant: "destructive",
            });
          }
        },
        () => {}
      );

      setIsScanning(true);
      setHasPermission(true);
    } catch (err) {
      console.error("QR scanner error:", err);
      setHasPermission(false);
      toast({
        title: "Hata",
        description: "Kamera erişimi reddedildi",
        variant: "destructive",
      });
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .then(() => {
          setIsScanning(false);
        })
        .catch((err: Error) => {
          console.error("Stop error:", err);
        });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <QrCode className="h-8 w-8" />
          QR Kod Tarayıcı
        </h1>
        <p className="text-muted-foreground mt-2">
          Ekipman QR kodlarını tarayarak hızlıca detay sayfasına ulaşın
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Kamera
          </CardTitle>
          <CardDescription>
            QR kod taramak için kamera iznine ihtiyacınız var
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            id="qr-reader"
            className="w-full rounded-lg overflow-hidden"
            data-testid="qr-reader-container"
          />

          <div className="flex flex-col gap-4">
            {!isScanning ? (
              <Button
                onClick={startScanning}
                size="lg"
                className="w-full"
                data-testid="button-start-scanning"
              >
                <Camera className="mr-2 h-5 w-5" />
                Taramaya Başla
              </Button>
            ) : (
              <Button
                onClick={stopScanning}
                variant="destructive"
                size="lg"
                className="w-full"
                data-testid="button-stop-scanning"
              >
                <XCircle className="mr-2 h-5 w-5" />
                Taramayı Durdur
              </Button>
            )}

            {hasPermission === false && (
              <Badge variant="destructive" className="justify-center py-2">
                Kamera erişimi reddedildi. Tarayıcı ayarlarınızdan kamera iznini etkinleştirin.
              </Badge>
            )}

            {isScanning && (
              <Badge variant="outline" className="justify-center py-2">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                QR kod taranıyor...
              </Badge>
            )}
          </div>

          <div className="border-t pt-4 space-y-2">
            <p className="text-sm font-medium">Nasıl Kullanılır?</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>"Taramaya Başla" butonuna tıklayın</li>
              <li>Kamera iznini verin</li>
              <li>QR kodu kameranın görüş alanına getirin</li>
              <li>QR kod otomatik olarak okunacak ve ekipman sayfasına yönlendirileceksiniz</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
