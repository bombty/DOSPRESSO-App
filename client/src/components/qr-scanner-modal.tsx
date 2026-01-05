import { useState, useRef, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { QrCode, X, Camera, MapPin } from "lucide-react";

interface QRScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QRScannerModal({ open, onOpenChange }: QRScannerModalProps) {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const capturePhoto = async (): Promise<string> => {
    try {
      setIsCapturingPhoto(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 }
      });
      streamRef.current = stream;
      if (!videoRef.current || !canvasRef.current) {
        throw new Error("Video/Canvas element not found");
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      await new Promise(resolve => setTimeout(resolve, 3000));
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
      }
      stream.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      const response = await fetch("/api/upload/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataUrl,
          filename: `checkin-${Date.now()}.jpg`,
        }),
      });
      if (!response.ok) {
        throw new Error("Fotoğraf yüklenemedi");
      }
      const { url } = await response.json();
      setIsCapturingPhoto(false);
      return url;
    } catch (error) {
      setIsCapturingPhoto(false);
      throw new Error(error.message || "Fotoğraf çekilemedi");
    }
  };

  const getLocation = (): Promise<{latitude: number; longitude: number}> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Konum servisi desteklenmiyor"));
        return;
      }
      setIsGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setIsGettingLocation(false);
          resolve(loc);
        },
        (error) => {
          setIsGettingLocation(false);
          reject(new Error("Konum alınamadı"));
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const startScanning = async () => {
    try {
      setIsScanning(true);
      await new Promise(resolve => setTimeout(resolve, 100));
      const html5QrCode = new Html5Qrcode("qr-reader-modal");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          try {
            if (!decodedText.startsWith("shift:")) {
              toast({
                title: "Hata",
                description: "Bu bir vardiya QR kodu değil",
                variant: "destructive",
              });
              return;
            }

            await html5QrCode.stop();
            setIsScanning(false);

            try {
              const photoUrl = await capturePhoto();
              const loc = await getLocation();
              
              // Check-in işlemi
              await apiRequest("POST", "/api/shift-attendance/check-in", {
                qrData: decodedText,
                photoUrl,
                latitude: loc.latitude,
                longitude: loc.longitude,
              });

              toast({
                title: "Giriş Başarılı",
                description: "Vardiyaya giriş yapıldı",
              });
              queryClient.invalidateQueries({ queryKey: ["/api/shift-attendance"] });
              onOpenChange(false);
            } catch (error) {
              toast({
                title: "Hata",
                description: error.message || "Giriş yapılamadı",
                variant: "destructive",
              });
            }
          } catch (error) {
            toast({
              title: "Hata",
              description: error.message || "QR kod işlenemedi",
              variant: "destructive",
            });
          }
        },
        () => {}
      );
    } catch (error) {
      toast({
        title: "Kamera Hatası",
        description: "Kameraya erişilemedi. Lütfen izinleri kontrol edin.",
        variant: "destructive",
      });
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        setIsScanning(false);
      }
    } catch (error) {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <video ref={videoRef} className="hidden" autoPlay playsInline />
        <canvas ref={canvasRef} className="hidden" />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Hızlı QR Giriş/Çıkış
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          {(isCapturingPhoto || isGettingLocation) && (
            <Card className="bg-primary/10 dark:bg-blue-950 border-primary/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  {isCapturingPhoto && (
                    <>
                      <Camera className="h-4 w-4 text-primary animate-pulse" />
                      <span className="text-xs font-medium">Fotoğraf çekiliyor...</span>
                    </>
                  )}
                  {isGettingLocation && (
                    <>
                      <MapPin className="h-4 w-4 text-primary animate-pulse" />
                      <span className="text-xs font-medium">Konum alınıyor...</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div
            id="qr-reader-modal"
            className="w-full rounded-lg overflow-hidden bg-muted"
            style={{ minHeight: "300px" }}
          />

          <div className="flex gap-2">
            {!isScanning ? (
              <Button onClick={startScanning} className="flex-1" data-testid="button-qr-start">
                <QrCode className="h-4 w-4 mr-2" />
                QR Tara
              </Button>
            ) : (
              <Button
                onClick={stopScanning}
                variant="destructive"
                className="flex-1"
                data-testid="button-qr-stop"
              >
                <X className="h-4 w-4 mr-2" />
                Durdur
              </Button>
            )}
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              data-testid="button-qr-close"
            >
              Kapat
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
