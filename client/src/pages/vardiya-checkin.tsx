import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { QrCode, Camera, CheckCircle, XCircle, Clock } from "lucide-react";
import type { ShiftAttendance } from "@shared/schema";

export default function VardiyaCheckin() {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedQR, setScannedQR] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const { data: activeAttendance, isLoading } = useQuery<ShiftAttendance | null>({
    queryKey: ["/api/shift-attendance"],
  });

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      setIsScanning(true);
      const html5QrCode = new Html5Qrcode("qr-reader-checkin");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          try {
            setScannedQR(decodedText);
            
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

            if (!activeAttendance) {
              checkInMutation.mutate({ qrCode: decodedText });
            } else {
              toast({
                title: "Uyarı",
                description: "Zaten aktif vardiya var. Çıkış yapmak için butonu kullanın.",
                variant: "destructive",
              });
            }
          } catch (error: any) {
            toast({
              title: "Hata",
              description: error.message || "QR kod işlenemedi",
              variant: "destructive",
            });
          }
        },
        (errorMessage) => {
          console.log("Scanning...", errorMessage);
        }
      );
    } catch (error: any) {
      console.error("Camera error:", error);
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
    } catch (error) {
      console.error("Error stopping scanner:", error);
    }
  };

  const checkInMutation = useMutation({
    mutationFn: async ({ qrCode }: { qrCode: string }) => {
      return apiRequest("POST", "/api/shift-attendance/check-in", { qrCode });
    },
    onSuccess: (data: any) => {
      toast({
        title: "✅ Giriş Başarılı",
        description: `Vardiyaya giriş yapıldı: ${data.shift?.title || 'Vardiya'}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-attendance"] });
      setScannedQR(null);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Giriş yapılamadı. QR kod geçersiz veya süresi dolmuş olabilir.",
        variant: "destructive",
      });
      setScannedQR(null);
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async ({ qrCode }: { qrCode: string }) => {
      if (!activeAttendance) throw new Error("Aktif vardiya bulunamadı");
      return apiRequest("POST", "/api/shift-attendance/check-out", { qrCode });
    },
    onSuccess: () => {
      toast({
        title: "✅ Çıkış Başarılı",
        description: "Vardiyadan çıkış yapıldı",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-attendance"] });
      setScannedQR(null);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Çıkış yapılamadı. QR kod geçersiz veya süresi dolmuş olabilir.",
        variant: "destructive",
      });
      setScannedQR(null);
    },
  });

  const handleCheckOut = async () => {
    if (!scannedQR) {
      toast({
        title: "Hata",
        description: "Lütfen önce QR kodu okutun",
        variant: "destructive",
      });
      return;
    }
    checkOutMutation.mutate({ qrCode: scannedQR });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-2">
        <QrCode className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Vardiya Giriş/Çıkış (QR)</h1>
      </div>

      {activeAttendance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Aktif Vardiya
            </CardTitle>
            <CardDescription>
              Vardiyaya giriş yaptınız
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Başlangıç</p>
                <p className="font-medium" data-testid="text-checkin-time">
                  {activeAttendance.checkInTime 
                    ? new Date(activeAttendance.checkInTime).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Durum</p>
                <Badge variant="default" data-testid="badge-shift-status">
                  Devam Ediyor
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Çıkış yapmak için QR kodu okutun:</p>
              {!isScanning && !scannedQR && (
                <Button
                  onClick={startScanning}
                  className="w-full"
                  variant="outline"
                  data-testid="button-scan-checkout"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  QR Kodu Oku (Çıkış)
                </Button>
              )}
              
              {scannedQR && (
                <Button
                  onClick={handleCheckOut}
                  disabled={checkOutMutation.isPending}
                  className="w-full"
                  variant="destructive"
                  data-testid="button-confirm-checkout"
                >
                  {checkOutMutation.isPending ? "Çıkış yapılıyor..." : "Çıkışı Onayla"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!activeAttendance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Vardiya Girişi
            </CardTitle>
            <CardDescription>
              Vardiyaya giriş yapmak için QR kodu okutun
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isScanning && (
              <Button
                onClick={startScanning}
                className="w-full"
                data-testid="button-start-scan"
              >
                <Camera className="mr-2 h-4 w-4" />
                QR Kodu Oku (Giriş)
              </Button>
            )}

            {isScanning && (
              <div className="space-y-4">
                <div 
                  id="qr-reader-checkin" 
                  className="rounded-lg overflow-hidden border"
                  data-testid="qr-scanner-view"
                />
                <Button
                  onClick={stopScanning}
                  variant="outline"
                  className="w-full"
                  data-testid="button-stop-scan"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Taramayı Durdur
                </Button>
              </div>
            )}

            {checkInMutation.isPending && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Giriş yapılıyor...</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Nasıl Kullanılır?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              1
            </span>
            <p className="text-sm text-muted-foreground">
              Vardiya giriş saatinde, yöneticinizden vardiya QR kodunu isteyin
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              2
            </span>
            <p className="text-sm text-muted-foreground">
              "QR Kodu Oku" butonuna tıklayın ve kamerayı QR koduna doğrultun
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              3
            </span>
            <p className="text-sm text-muted-foreground">
              Vardiya bittiğinde, çıkış yapmak için aynı QR kodu tekrar okutun
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
