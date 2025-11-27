import { useState, useRef, useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface UniversalQRScannerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UniversalQRScanner({ isOpen, onOpenChange }: UniversalQRScannerProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [scanMessage, setScanMessage] = useState('');
  const containerId = "universal-qr-scanner-container";

  useEffect(() => {
    if (!isOpen) {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (e) {
          console.log("Scanner already cleared");
        }
        scannerRef.current = null;
      }
      return;
    }

    // Small delay to ensure DOM is ready after Dialog renders
    const timer = setTimeout(() => {
      const container = document.getElementById(containerId);
      if (!container) {
        console.log("[QR Scanner] Container not ready yet");
        return;
      }

      setScanStatus('scanning');
      setScanMessage('');
      
      try {
        const scanner = new Html5QrcodeScanner(
          containerId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          false
        );

        scanner.render(
          (decodedText) => {
            console.log("[QR Scanner] Decoded:", decodedText);
            handleQRData(decodedText);
            scanner.pause();
          },
          (error) => {
            // Ignore errors - scanner will retry
          }
        );

        scannerRef.current = scanner;
      } catch (error) {
        console.error("[QR Scanner] Initialization error:", error);
        setScanStatus('error');
        setScanMessage('Scanner başlatılamadı');
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (e) {
          console.log("Cleanup: Scanner already cleared");
        }
      }
    };
  }, [isOpen]);

  const handleQRData = (qrData: string) => {
    console.log("[QR Handler] Processing:", qrData);
    
    // Parse QR code format: "type:id" or "type:id:extra"
    const parts = qrData.split(':');
    const type = parts[0]?.toLowerCase();
    const id = parts[1];

    if (!type || !id) {
      setScanStatus('error');
      setScanMessage('Invalid QR code format');
      toast({
        title: "Hata",
        description: "QR kod formatı geçersiz",
        variant: "destructive",
      });
      setTimeout(() => {
        setScanStatus('scanning');
        setScanMessage('');
        if (scannerRef.current) {
          try {
            scannerRef.current.resume();
          } catch (e) {
            console.log("Already resumed");
          }
        }
      }, 2000);
      return;
    }

    try {
      if (type === 'shift' || type === 'branch') {
        // Shift check-in
        setScanStatus('success');
        setScanMessage('Vardiya kodu algılandı...');
        toast({
          title: "Başarılı",
          description: `Vardiya #${id} için giriş yapılıyor...`,
        });
        
        setTimeout(() => {
          onOpenChange(false);
          setLocation('/vardiyalar');
        }, 1500);
      } else if (type === 'equipment') {
        // Equipment detail
        setScanStatus('success');
        setScanMessage('Ekipman kodu algılandı...');
        toast({
          title: "Başarılı",
          description: `Ekipman #${id} detayları yükleniyor...`,
        });
        
        setTimeout(() => {
          onOpenChange(false);
          setLocation(`/ekipman/${id}`);
        }, 1500);
      } else {
        setScanStatus('error');
        setScanMessage(`Bilinmeyen kod türü: ${type}`);
        toast({
          title: "Hata",
          description: `Bilinmeyen kod türü: ${type}`,
          variant: "destructive",
        });
        
        setTimeout(() => {
          setScanStatus('scanning');
          setScanMessage('');
          if (scannerRef.current) {
            try {
              scannerRef.current.resume();
            } catch (e) {
              console.log("Already resumed");
            }
          }
        }, 2000);
      }
    } catch (error) {
      console.error("[QR Handler] Error:", error);
      setScanStatus('error');
      setScanMessage('İşlem yapılırken hata oluştu');
      toast({
        title: "Hata",
        description: "İşlem yapılırken hata oluştu",
        variant: "destructive",
      });
    }
  };

  const resumeScanning = () => {
    setScanStatus('scanning');
    setScanMessage('');
    if (scannerRef.current) {
      try {
        scannerRef.current.resume();
      } catch (e) {
        console.log("Already active");
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Kod Tara
          </DialogTitle>
          <DialogDescription>
            Vardiya veya ekipman QR kodunu tarayın
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scanner Container */}
          <div className="border rounded-lg overflow-hidden bg-black/5">
            <div id={containerId} style={{ width: '100%' }} />
          </div>

          {/* Status Messages */}
          {scanStatus === 'success' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <p className="text-sm font-medium text-green-700 dark:text-green-300">{scanMessage}</p>
            </div>
          )}

          {scanStatus === 'error' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-sm font-medium text-red-700 dark:text-red-300">{scanMessage}</p>
            </div>
          )}

          {scanStatus === 'scanning' && (
            <div className="text-center text-sm text-muted-foreground">
              Kamera kalibre ediliyor... Lütfen QR kodunu kameraya gösterin.
            </div>
          )}

          {/* Resume Button */}
          {scanStatus === 'error' && (
            <Button onClick={resumeScanning} variant="outline" className="w-full">
              Tekrar Tara
            </Button>
          )}

          {/* Close Button */}
          <Button 
            onClick={() => onOpenChange(false)} 
            variant="ghost" 
            className="w-full"
          >
            Kapat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
