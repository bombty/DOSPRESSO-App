import { useState, useRef, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { QrCode, X, Camera, MapPin, Wrench, Package, Loader2, Play, Coffee, LogOut, Timer } from "lucide-react";
import { QREquipmentDetail } from "@/components/qr-equipment-detail";
import { QRInventoryDetail } from "@/components/qr-inventory-detail";

interface QRScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type QRType = "shift" | "equipment" | "inventory" | "kiosk" | "unknown";

interface DetectedQR {
  type: QRType;
  id: string | number;
  raw: string;
}

function detectQRType(text: string): DetectedQR {
  const trimmed = text.trim();

  // Kiosk display QR — JSON içinde branchId + token var
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed.branchId && parsed.token && parsed.nonce && parsed.timestamp) {
      return { type: "kiosk", id: parsed.branchId, raw: trimmed };
    }
  } catch {}

  if (trimmed.startsWith("shift:")) {
    return { type: "shift", id: trimmed, raw: trimmed };
  }

  const eqPathMatch = trimmed.match(/\/ekipman\/(\d+)/i) || trimmed.match(/\/equipment\/(\d+)/i);
  if (eqPathMatch) {
    return { type: "equipment", id: parseInt(eqPathMatch[1]), raw: trimmed };
  }

  const dospressoEqMatch = trimmed.match(/DOSPRESSO-EQ-(\d+)/i);
  if (dospressoEqMatch) {
    return { type: "equipment", id: parseInt(dospressoEqMatch[1]), raw: trimmed };
  }

  const serialMatch = trimmed.match(/ESPRESSO-B\d+-/i);
  if (serialMatch) {
    // Pass the full serial number string, not just trailing digits
    return { type: "equipment", id: trimmed, raw: trimmed };
  }

  const invPathMatch = trimmed.match(/\/inventory\/(\d+)/i) || trimmed.match(/\/envanter\/(\d+)/i) || trimmed.match(/\/stok\/(\d+)/i);
  if (invPathMatch) {
    return { type: "inventory", id: parseInt(invPathMatch[1]), raw: trimmed };
  }

  if (trimmed.startsWith("INV-")) {
    return { type: "inventory", id: trimmed, raw: trimmed };
  }

  const urlMatch = trimmed.match(/[?&]id=(\d+)/);
  if (urlMatch && (trimmed.includes("equipment") || trimmed.includes("ekipman"))) {
    return { type: "equipment", id: parseInt(urlMatch[1]), raw: trimmed };
  }
  if (urlMatch && (trimmed.includes("inventory") || trimmed.includes("envanter") || trimmed.includes("stok"))) {
    return { type: "inventory", id: parseInt(urlMatch[1]), raw: trimmed };
  }

  return { type: "unknown", id: trimmed, raw: trimmed };
}

export function QRScannerModal({ open, onOpenChange }: QRScannerModalProps) {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processedRef = useRef<boolean>(false);

  const [equipmentDetailId, setEquipmentDetailId] = useState<string | number | null>(null);
  const [equipmentDetailOpen, setEquipmentDetailOpen] = useState(false);
  const [inventoryDetailId, setInventoryDetailId] = useState<string | number | null>(null);
  const [inventoryDetailOpen, setInventoryDetailOpen] = useState(false);
  const [kioskQrData, setKioskQrData] = useState<any>(null);
  const [kioskActionOpen, setKioskActionOpen] = useState(false);
  const [kioskActionLoading, setKioskActionLoading] = useState(false);

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

  useEffect(() => {
    if (!open) {
      processedRef.current = false;
      setIsProcessing(false);
    }
  }, [open]);

  const stopScannerSilent = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current = null;
      }
    } catch {}
    setIsScanning(false);
  };

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
    } catch (error: any) {
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

  const handleKioskQR = async (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      await stopScannerSilent();
      onOpenChange(false);
      setKioskQrData(parsed);
      setKioskActionOpen(true);
    } catch {
      toast({ title: "Hata", description: "Kiosk QR okunamadı", variant: "destructive" });
    }
  };

  const handleKioskAction = async (action: string) => {
    if (!kioskQrData) return;
    setKioskActionLoading(true);
    try {
      await apiRequest("POST", "/api/kiosk/phone-checkin", { ...kioskQrData, action });
      const labels: Record<string, string> = {
        shift_start: "Vardiya başlatıldı",
        break_start: "Mola başlatıldı",
        break_end: "Mola bitirildi",
        shift_end: "Vardiya bitirildi",
      };
      toast({ title: "✓ " + (labels[action] || "İşlem tamamlandı") });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-attendance"] });
      setKioskActionOpen(false);
    } catch (error: any) {
      toast({ title: "Hata", description: error.message || "İşlem gerçekleştirilemedi", variant: "destructive" });
    } finally {
      setKioskActionLoading(false);
    }
  };

  const handleShiftQR = async (decodedText: string) => {
    try {
      const photoUrl = await capturePhoto();
      const loc = await getLocation();

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
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Giriş yapılamadı",
        variant: "destructive",
      });
    }
  };

  const handleEquipmentQR = async (id: number | string) => {
    // Accept both numeric IDs and string serial numbers
    if (typeof id === "string" && id.length === 0) {
      toast({
        title: "Hata",
        description: "Geçersiz ekipman ID",
        variant: "destructive",
      });
      return;
    }
    await stopScannerSilent();
    onOpenChange(false);
    setTimeout(() => {
      setEquipmentDetailId(id);
      setEquipmentDetailOpen(true);
    }, 200);
  };

  const handleInventoryQR = async (id: number | string) => {
    // Pass string IDs through (e.g., "INV-001", barcodes) to the backend for lookup
    await stopScannerSilent();
    onOpenChange(false);
    setTimeout(() => {
      setInventoryDetailId(id);
      setInventoryDetailOpen(true);
    }, 200);
  };

  const handleQRScanned = async (decodedText: string) => {
    if (processedRef.current) return;
    processedRef.current = true;
    setIsProcessing(true);

    const detected = detectQRType(decodedText);

    try {
      await stopScannerSilent();

      switch (detected.type) {
        case "kiosk":
          await handleKioskQR(detected.raw);
          break;
        case "shift":
          await handleShiftQR(decodedText);
          break;
        case "equipment":
          await handleEquipmentQR(detected.id);
          break;
        case "inventory":
          await handleInventoryQR(detected.id);
          break;
        default:
          toast({
            title: "Bilinmeyen QR Kod",
            description: "Bu QR kod tanınamadı. Lütfen geçerli bir QR kod tarayın.",
            variant: "destructive",
          });
          processedRef.current = false;
          break;
      }
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "QR kod işlenemedi",
        variant: "destructive",
      });
      processedRef.current = false;
    }
    setIsProcessing(false);
  };

  const startScanning = async () => {
    try {
      processedRef.current = false;
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
          await handleQRScanned(decodedText);
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
    await stopScannerSilent();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <video ref={videoRef} className="hidden" autoPlay playsInline />
          <canvas ref={canvasRef} className="hidden" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="title-qr-scanner">
              <QrCode className="h-5 w-5" />
              QR Kod Tarayıcı
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {isProcessing && (
              <Card className="bg-primary/10 dark:bg-blue-950 border-primary/30">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    <span className="text-xs font-medium">QR kod işleniyor...</span>
                  </div>
                </CardContent>
              </Card>
            )}

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

            <div className="text-xs text-muted-foreground text-center flex items-center justify-center gap-3 flex-wrap">
              <span className="flex items-center gap-1"><QrCode className="h-3 w-3" /> Vardiya</span>
              <span className="flex items-center gap-1"><Wrench className="h-3 w-3" /> Ekipman</span>
              <span className="flex items-center gap-1"><Package className="h-3 w-3" /> Envanter</span>
            </div>

            <div
              id="qr-reader-modal"
              className="w-full rounded-lg overflow-hidden bg-muted"
              style={{ minHeight: "300px" }}
            />

            <div className="flex gap-2">
              {!isScanning ? (
                <Button onClick={startScanning} className="flex-1" data-testid="button-qr-start" disabled={isProcessing}>
                  <QrCode className="h-4 w-4 mr-2" />
                  QR Tara
                </Button>
              ) : (
                <Button
                  onClick={stopScanning}
                  variant="destructive"
                  className="flex-1"
                  data-testid="button-qr-stop"
                  disabled={isProcessing}
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

      <QREquipmentDetail
        equipmentId={equipmentDetailId}
        open={equipmentDetailOpen}
        onOpenChange={(val) => {
          setEquipmentDetailOpen(val);
          if (!val) setEquipmentDetailId(null);
        }}
      />

      <QRInventoryDetail
        inventoryId={inventoryDetailId}
        open={inventoryDetailOpen}
        onOpenChange={(val) => {
          setInventoryDetailOpen(val);
          if (!val) setInventoryDetailId(null);
        }}
      />

      {/* Kiosk QR İşlem Seçimi */}
      <Dialog open={kioskActionOpen} onOpenChange={setKioskActionOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-[#ef4444]" />
              Kiosk İşlemi
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground text-center pb-2">Ne yapmak istiyorsunuz?</p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="h-16 flex-col gap-1 bg-green-600 hover:bg-green-700"
              onClick={() => handleKioskAction("shift_start")}
              disabled={kioskActionLoading}
              data-testid="btn-kiosk-shift-start"
            >
              <Play className="h-5 w-5" />
              <span className="text-xs">Vardiya Başlat</span>
            </Button>
            <Button
              className="h-16 flex-col gap-1 bg-amber-500 hover:bg-amber-600"
              onClick={() => handleKioskAction("break_start")}
              disabled={kioskActionLoading}
              data-testid="btn-kiosk-break-start"
            >
              <Coffee className="h-5 w-5" />
              <span className="text-xs">Mola Başlat</span>
            </Button>
            <Button
              className="h-16 flex-col gap-1 bg-blue-600 hover:bg-blue-700"
              onClick={() => handleKioskAction("break_end")}
              disabled={kioskActionLoading}
              data-testid="btn-kiosk-break-end"
            >
              <Play className="h-5 w-5" />
              <span className="text-xs">Molayı Bitir</span>
            </Button>
            <Button
              className="h-16 flex-col gap-1 bg-[#ef4444] hover:bg-[#dc2626]"
              onClick={() => handleKioskAction("shift_end")}
              disabled={kioskActionLoading}
              data-testid="btn-kiosk-shift-end"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-xs">Vardiya Bitir</span>
            </Button>
          </div>
          {kioskActionLoading && (
            <div className="flex justify-center pt-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
