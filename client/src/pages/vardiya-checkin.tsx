import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { QrCode, Camera, CheckCircle, XCircle, Clock, MapPin, User } from "lucide-react";
import type { ShiftAttendance } from "@shared/schema";
import Uppy from "@uppy/core";
import AwsS3 from "@uppy/aws-s3";

export default function VardiyaCheckin() {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedQR, setScannedQR] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null); // S3 URL
  const [location, setLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { data: activeAttendance, isLoading } = useQuery<ShiftAttendance | null>({
    queryKey: ["/api/shift-attendance"],
  });

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

  // Get user location
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
          setLocation(loc);
          setIsGettingLocation(false);
          resolve(loc);
        },
        (error) => {
          setIsGettingLocation(false);
          
          // Normalize geolocation errors
          if (error.code === 1) { // PERMISSION_DENIED
            reject(new Error("Konum izni reddedildi. Lütfen tarayıcı ayarlarından konum iznini verin."));
          } else if (error.code === 2) { // POSITION_UNAVAILABLE
            reject(new Error("Konum bilgisi alınamıyor. GPS sinyali zayıf olabilir."));
          } else if (error.code === 3) { // TIMEOUT
            reject(new Error("Konum alınması zaman aşımına uğradı. Tekrar deneyin."));
          } else {
            reject(new Error("Konum alınamadı. Lütfen konum servislerini aktif edin."));
          }
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  // Capture photo from camera
  const capturePhoto = async (): Promise<string> => {
    try {
      setIsCapturingPhoto(true);
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 }
      });
      
      streamRef.current = stream;
      
      if (!videoRef.current || !canvasRef.current) {
        throw new Error("Video/Canvas element not found");
      }
      
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      
      // Wait for video to stabilize (3 seconds for better quality)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
      }
      
      // Stop camera
      stream.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      
      // Convert to data URL (base64)
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      
      // Upload to Object Storage via backend
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
      
      setCapturedPhoto(url);
      setIsCapturingPhoto(false);
      return url;
    } catch (error) {
      setIsCapturingPhoto(false);
      
      // Normalize browser errors
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error("Kamera izni reddedildi. Lütfen tarayıcı ayarlarından kamera iznini verin.");
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        throw new Error("Kamera bulunamadı. Cihazınızın kamera erişimi olduğundan emin olun.");
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        throw new Error("Kamera kullanılamıyor. Başka bir uygulama kamerayı kullanıyor olabilir.");
      } else {
        throw new Error(error.message || "Fotoğraf çekilemedi");
      }
    }
  };

  const startScanning = async () => {
    try {
      setIsScanning(true);
      
      // Wait for DOM to render the scanner div
      await new Promise(resolve => setTimeout(resolve, 100));
      
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

            // Check if user wants to check in or check out
            if (!activeAttendance) {
              checkInMutation.mutate({ qrCode: decodedText });
            } else {
              // User has active attendance, so check out
              checkOutMutation.mutate({ qrCode: decodedText });
            }
          } catch (error) {
            toast({
              title: "Hata",
              description: error.message || "QR kod işlenemedi",
              variant: "destructive",
            });
          }
        },
        (errorMessage) => {
        }
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
    } catch (error) {
    }
  };

  const checkInMutation = useMutation({
    mutationFn: async ({ qrCode }: { qrCode: string }) => {
      // Photo and location are REQUIRED - fail fast if either fails
      try {
        const photoUrl = await capturePhoto();
        const loc = await getLocation();
        
        return apiRequest("POST", "/api/shift-attendance/check-in", {
          qrData: qrCode,
          photoUrl,
          latitude: loc.latitude,
          longitude: loc.longitude,
        });
      } catch (error) {
        // Re-throw with clear user message (errors already normalized in capturePhoto/getLocation)
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Giriş Başarılı",
        description: "Vardiyaya giriş yapıldı. Dress code analizi yapılıyor...",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-attendance"] });
      setScannedQR(null);
      setCapturedPhoto(null);
      setLocation(null);
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Giriş yapılamadı. QR kod geçersiz veya süresi dolmuş olabilir.",
        variant: "destructive",
      });
      setScannedQR(null);
      setCapturedPhoto(null);
      setLocation(null);
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async ({ qrCode }: { qrCode: string }) => {
      if (!activeAttendance) throw new Error("Aktif vardiya bulunamadı");
      
      // Photo and location are REQUIRED for check-out too
      try {
        const photoUrl = await capturePhoto();
        const loc = await getLocation();
        
        return apiRequest("POST", "/api/shift-attendance/check-out", {
          qrCode,
          photoUrl,
          latitude: loc.latitude,
          longitude: loc.longitude,
        });
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "✅ Çıkış Başarılı",
        description: "Vardiyadan çıkış yapıldı",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-attendance"] });
      setScannedQR(null);
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Çıkış yapılamadı. QR kod geçersiz veya süresi dolmuş olabilir.",
        variant: "destructive",
      });
      setScannedQR(null);
    },
  });


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto p-3 grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
      {/* Hidden video and canvas elements for photo capture */}
      <video ref={videoRef} className="hidden" autoPlay playsInline />
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="flex items-center gap-2">
        <QrCode className="h-4 w-4" />
        <h1 className="text-2xl font-bold">Vardiya Giriş/Çıkış (QR)</h1>
      </div>
      
      {/* Status indicators */}
      {(isCapturingPhoto || isGettingLocation) && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              {isCapturingPhoto && (
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-blue-600 animate-pulse" />
                  <span className="text-sm font-medium">Fotoğraf çekiliyor...</span>
                </div>
              )}
              {isGettingLocation && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-600 animate-pulse" />
                  <span className="text-sm font-medium">Konum alınıyor...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Captured data display */}
      {(capturedPhoto || location) && (
        <Card>
          <CardContent className="pt-6 grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
            {capturedPhoto && (
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle className="h-4 w-4" />
                <span>Fotoğraf çekildi ✓</span>
              </div>
            )}
            {location && (
              <div className="flex items-center gap-2 text-sm text-success">
                <MapPin className="h-4 w-4" />
                <span>Konum alındı ✓</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeAttendance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              Aktif Vardiya
            </CardTitle>
            <CardDescription>
              Vardiyaya giriş yaptınız
            </CardDescription>
          </CardHeader>
          <CardContent className="w-full space-y-2 sm:space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
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

            <div className="flex flex-col gap-3 sm:gap-4">
              <p className="text-sm text-muted-foreground">Çıkış yapmak için QR kodu okutun:</p>
              {!isScanning && (
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

              {isScanning && (
                <div className="w-full space-y-2 sm:space-y-3">
                  <div 
                    id="qr-reader-checkin" 
                    className="rounded-lg overflow-hidden border"
                    data-testid="qr-scanner-view-checkout"
                  />
                  <Button
                    onClick={stopScanning}
                    variant="outline"
                    className="w-full"
                    data-testid="button-stop-scan-checkout"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Taramayı Durdur
                  </Button>
                </div>
              )}

              {checkOutMutation.isPending && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Çıkış yapılıyor...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!activeAttendance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Vardiya Girişi
            </CardTitle>
            <CardDescription>
              Vardiyaya giriş yapmak için QR kodu okutun
            </CardDescription>
          </CardHeader>
          <CardContent className="w-full space-y-2 sm:space-y-3">
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
              <div className="w-full space-y-2 sm:space-y-3">
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
        <CardContent className="flex flex-col gap-3 sm:gap-4">
          <div className="flex items-start gap-2">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              1
            </span>
            <p className="text-sm text-muted-foreground">
              Vardiya giriş saatinde, yöneticinizden vardiya QR kodunu isteyin
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              2
            </span>
            <p className="text-sm text-muted-foreground">
              "QR Kodu Oku" butonuna tıklayın ve kamerayı QR koduna doğrultun
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
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
