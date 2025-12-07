import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Smartphone, CheckCircle, AlertCircle, Loader2, MapPin } from "lucide-react";
import type { ShiftAttendance, Branch } from "@shared/schema";

export default function NFCGiris() {
  const [isScanning, setIsScanning] = useState(false);
  const [location, setLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [nfcSupported, setNfcSupported] = useState(true);
  const [scannedData, setScannedData] = useState<string | null>(null);

  const { data: branch } = useQuery<Branch | null>({
    queryKey: ["/api/branch"],
  });

  const { data: activeAttendance } = useQuery<ShiftAttendance | null>({
    queryKey: ["/api/shift-attendance"],
  });

  const checkInMutation = useMutation({
    mutationFn: async (data: { method: string; location: {latitude: number; longitude: number} }) =>
      apiRequest("POST", "/api/shift-attendance/check-in", data),
    onSuccess: (result) => {
      toast({ title: "Başarılı", description: "Vardiya başladı ✓" });
      setScannedData(null);
      queryClient.invalidateQueries({ queryKey: ["/api/shift-attendance"] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Vardiya başlatılamadı", variant: "destructive" });
    },
  });

  useEffect(() => {
    // Check NFC support
    if (!("NDEFReader" in window)) {
      setNfcSupported(false);
      toast({ title: "NFC Desteklenmiyor", description: "Lütfen QR kod giriş yöntemini kullanın", variant: "destructive" });
      return;
    }

    // Start NFC scanning
    const startNFCScan = async () => {
      try {
        setIsScanning(true);
        const reader = new NDEFReader();
        
        await reader.scan();

        reader.addEventListener("reading", async ({ message, serialNumber }) => {
          console.log("NFC Tag detected:", serialNumber);
          setScannedData(serialNumber);
          
          // Get location
          try {
            const position = await new Promise<GeolocationCoordinates>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(
                (pos) => resolve(pos.coords),
                (err) => reject(err),
                { enableHighAccuracy: true, timeout: 10000 }
              );
            });
            
            setLocation({ latitude: position.latitude, longitude: position.longitude });
            
            // Check in with location
            await checkInMutation.mutateAsync({
              method: "nfc",
              location: { latitude: position.latitude, longitude: position.longitude },
            });
          } catch (err) {
            toast({ title: "Konum Hatası", description: "Konum alınamadı", variant: "destructive" });
          }
        });

        reader.addEventListener("readingerror", () => {
          toast({ title: "NFC Hata", description: "Tag okunamadı, tekrar deneyin", variant: "destructive" });
        });
      } catch (error) {
        console.error("NFC Error:", error);
        toast({ title: "NFC Hatası", description: "NFC izni reddedildi", variant: "destructive" });
        setNfcSupported(false);
      }
    };

    startNFCScan();
  }, []);

  if (!nfcSupported) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              NFC Desteklenmiyor
            </CardTitle>
            <CardDescription>
              Bu cihaz NFC'yi desteklemediği için QR kod yöntemini kullanın
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => window.location.href = "/vardiya-checkin"}>
              QR Kod ile Giriş
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted p-4">
      <div className="max-w-md mx-auto pt-8">
        <Card className="border-primary/20">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Smartphone className="h-6 w-6 text-primary" />
              NFC ile Vardiya Giriş
            </CardTitle>
            <CardDescription>
              Telefonunuzu şubedeki NFC etiketine yaklaştırın
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Status */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-3">
                <div className={`h-3 w-3 rounded-full ${isScanning ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'}`} />
                <span className="text-sm font-medium">
                  {isScanning ? "NFC Aranıyor..." : "NFC Taraması Başlamadı"}
                </span>
              </div>
            </div>

            {/* Scanned Data */}
            {scannedData && (
              <div className="border border-green-200 rounded-lg p-3 bg-green-50 dark:bg-green-950">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900 dark:text-green-100">
                    NFC Okundu!
                  </span>
                </div>
                <p className="text-xs text-green-700 dark:text-green-200 mt-1">
                  {scannedData}
                </p>
              </div>
            )}

            {/* Location */}
            {location && (
              <div className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-950">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <span className="text-xs text-blue-700 dark:text-blue-200">
                    Konum: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </span>
                </div>
              </div>
            )}

            {/* Loading State */}
            {checkInMutation.isPending && (
              <div className="flex items-center justify-center gap-2 p-4 border rounded-lg bg-primary/5">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Vardiya başlatılıyor...</span>
              </div>
            )}

            {/* Branch Info */}
            {branch && (
              <div className="text-center pt-2">
                <Badge variant="outline" className="text-xs">
                  {branch.name}
                </Badge>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-muted p-3 rounded-lg text-sm text-muted-foreground space-y-1">
              <p className="font-medium">Talimatlar:</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li>Telefonunuzu NFC etiketine yaklaştırın</li>
                <li>Konum izni verin (otomatik olarak istenir)</li>
                <li>Vardiya otomatik olarak başlayacaktır</li>
              </ul>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.location.href = "/vardiya-checkin"}
            >
              QR Kod ile Giriş Yap
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
