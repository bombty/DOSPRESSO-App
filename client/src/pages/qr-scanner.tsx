import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Html5Qrcode } from "html5-qrcode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Camera, XCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function QRScanner() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastQRType, setLastQRType] = useState<'shift' | 'equipment' | 'inventory' | 'audit' | null>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch((err) => {
        });
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      setError(null);
      
      // Check if QR reader container exists
      const container = document.getElementById("qr-reader");
      if (!container) {
        const errMsg = "QR reader container not found in DOM";
        setError(errMsg);
        toast({
          title: "Hata",
          description: errMsg,
          variant: "destructive",
        });
        return;
      }

      // Clear container
      container.innerHTML = "";

      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;


      const cameras = await Html5Qrcode.getCameras();

      if (!cameras || cameras.length === 0) {
        const errMsg = "Kamera bulunamadı";
        setError(errMsg);
        setHasPermission(false);
        toast({
          title: "Hata",
          description: errMsg,
          variant: "destructive",
        });
        return;
      }

      await html5QrCode.start(
        cameras[0].id,
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
                }).catch((err) => {
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
                }).catch((err) => {
                });
              } else {
                toast({
                  title: "Hata",
                  description: "Geçersiz vardiya QR kodu",
                  variant: "destructive",
                });
              }
            } else if (pathname.startsWith('/urun-karti/') || pathname.startsWith('/product/')) {
              const inventoryId = pathname.split(/\/urun-karti\/|\/product\//)[1];
              if (inventoryId && !isNaN(parseInt(inventoryId))) {
                setLastQRType('inventory');
                toast({
                  title: "Başarılı",
                  description: "Ürün kartı açılıyor...",
                });
                html5QrCode.stop().then(() => {
                  setLocation(`/satinalma?tab=urun-karti&itemId=${inventoryId}`);
                }).catch((err) => {
                });
              } else {
                toast({
                  title: "Hata",
                  description: "Geçersiz ürün kartı QR kodu",
                  variant: "destructive",
                });
              }
            } else if (pathname.startsWith('/inventory/')) {
              const inventoryId = pathname.split('/inventory/')[1];
              if (inventoryId) {
                setLastQRType('inventory');
                toast({
                  title: "Başarılı",
                  description: "Envanter sayfasına yönlendiriliyorsunuz...",
                });
                html5QrCode.stop().then(() => {
                  setLocation(`/satinalma?tab=urun-karti&itemId=${inventoryId}`);
                }).catch((err) => {
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
                }).catch((err) => {
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
                }).catch((err) => {
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
        () => {
          // Handle errors during scanning
        }
      );

      setIsScanning(true);
      setHasPermission(true);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "QR tarayıcı başlatılamadı";
      setError(errMsg);
      setHasPermission(false);
      setIsScanning(false);
      toast({
        title: "Hata",
        description: errMsg,
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
          setError(null);
        })
        .catch((err: Error) => {
          setError(err.message);
        });
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 sm:gap-3">
          <QrCode className="h-4 w-4" />
          QR Kod Tarayıcı
        </h1>
        <p className="text-muted-foreground mt-2">
          Ekipman QR kodlarını tarayarak hızlıca detay sayfasına ulaşın
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Kamera
          </CardTitle>
          <CardDescription>
            QR kod taramak için kamera iznine ihtiyacınız var
          </CardDescription>
        </CardHeader>
        <CardContent className="w-full space-y-2 sm:space-y-3">
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Hata</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          <div
            id="qr-reader"
            className="w-full rounded-lg overflow-hidden bg-muted min-h-[300px] flex items-center justify-center"
            data-testid="qr-reader-container"
          >
            {!isScanning && (
              <p className="text-muted-foreground">Taramaya başlamak için butona tıklayın</p>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:gap-3">
            {!isScanning ? (
              <Button
                onClick={startScanning}
                size="lg"
                className="w-full"
                data-testid="button-start-scanning"
              >
                <Camera className="mr-2 h-4 w-4" />
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
                <XCircle className="mr-2 h-4 w-4" />
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

          <div className="border-t pt-4 grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
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
