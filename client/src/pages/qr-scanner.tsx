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
    console.log("QR Scanner component mounted");
    return () => {
      console.log("QR Scanner component unmounting");
      if (scannerRef.current) {
        scannerRef.current.stop().catch((err) => {
          console.error("Error stopping scanner:", err);
        });
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      setError(null);
      console.log("Starting QR scanner...");
      
      // Check if QR reader container exists
      const container = document.getElementById("qr-reader");
      if (!container) {
        const errMsg = "QR reader container not found in DOM";
        console.error(errMsg);
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

      console.log("Html5Qrcode instance created, starting camera...");

      const cameras = await Html5Qrcode.getCameras();
      console.log("Available cameras:", cameras);

      if (!cameras || cameras.length === 0) {
        const errMsg = "Kamera bulunamadı";
        console.error(errMsg);
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
          console.log("QR decoded:", decodedText);
          try {
            let pathname = decodedText;
            
            // Handle absolute URLs
            try {
              const url = new URL(decodedText);
              pathname = url.pathname;
            } catch {
              // Relative URL or path - use as is
            }
            
            console.log("Parsed pathname:", pathname);

            // Auto-detect QR type and route accordingly
            if (pathname.startsWith('/ekipman/') || pathname.startsWith('/equipment/')) {
              // Equipment fault report QR
              const equipmentId = pathname.split(/\/ekipman\/|\/equipment\//)[1];
              console.log("Equipment ID extracted:", equipmentId);
              if (equipmentId && !isNaN(parseInt(equipmentId))) {
                setLastQRType('equipment');
                toast({
                  title: "Başarılı",
                  description: "Arıza bildirimi sayfasına yönlendiriliyorsunuz...",
                });
                html5QrCode.stop().then(() => {
                  setLocation(`/ariza-yeni?equipmentId=${equipmentId}`);
                }).catch((err) => {
                  console.error("Error stopping scanner:", err);
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
                  console.error("Error stopping scanner:", err);
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
                }).catch((err) => {
                  console.error("Error stopping scanner:", err);
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
                  console.error("Error stopping scanner:", err);
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
                  console.error("Error stopping scanner:", err);
                });
              } else {
                toast({
                  title: "Hata",
                  description: "Geçersiz ekipman QR kodu",
                  variant: "destructive",
                });
              }
            } else {
              console.warn("Unknown QR type:", decodedText);
              toast({
                title: "Hata",
                description: "QR kod tipi tanınamadı",
                variant: "destructive",
              });
            }
          } catch (error) {
            console.error("Error processing QR:", error);
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
      console.log("Scanner started successfully");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "QR tarayıcı başlatılamadı";
      console.error("QR scanner error:", err);
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
    console.log("Stopping QR scanner...");
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .then(() => {
          setIsScanning(false);
          setError(null);
          console.log("Scanner stopped");
        })
        .catch((err: Error) => {
          console.error("Stop error:", err);
          setError(err.message);
        });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6">
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
        <CardContent className="grid grid-cols-1 gap-4">
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md flex items-start gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
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
