import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QrCode, RefreshCw, WifiOff, CheckCircle2, Clock, ShieldCheck } from "lucide-react";

const QR_REFRESH_INTERVAL = 30;

interface QrPayload {
  userId: string;
  timestamp: number;
  nonce: string;
  hmac: string;
}

export default function QrCheckinGenerator() {
  const [qrPayload, setQrPayload] = useState<QrPayload | null>(null);
  const [countdown, setCountdown] = useState(QR_REFRESH_INTERVAL);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQr = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/qr-checkin/generate", { credentials: "include" });
      if (!res.ok) throw new Error("QR generation failed");
      const data: QrPayload = await res.json();
      setQrPayload(data);
      setCountdown(QR_REFRESH_INTERVAL);
    } catch (err) {
      console.error("QR fetch error:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchQr();
  }, [fetchQr]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchQr();
          return QR_REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchQr]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const progressPercent = (countdown / QR_REFRESH_INTERVAL) * 100;
  const isExpiring = countdown <= 5;

  if (!isOnline) {
    return (
      <Card data-testid="card-qr-offline">
        <CardContent className="flex flex-col items-center justify-center p-6 gap-3">
          <WifiOff className="w-12 h-12 text-destructive" />
          <p className="text-sm font-medium text-destructive">Bağlantı yok</p>
          <p className="text-xs text-muted-foreground text-center">
            QR kod oluşturmak için internet bağlantısı gerekli
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4" data-testid="qr-checkin-generator">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center p-6 gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="w-4 h-4" />
            <span>Guvenli QR Giris Kodu</span>
          </div>

          <div className="relative">
            {qrPayload ? (
              <div className={`p-3 bg-white dark:bg-white rounded-md transition-opacity ${isRefreshing ? "opacity-50" : ""}`}>
                <QRCodeSVG
                  value={JSON.stringify(qrPayload)}
                  size={220}
                  level="M"
                  data-testid="qr-code-svg"
                />
              </div>
            ) : (
              <div className="w-[220px] h-[220px] flex items-center justify-center bg-muted rounded-md">
                <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 w-full">
            <div className="relative w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-linear ${
                  isExpiring ? "bg-destructive" : "bg-primary"
                }`}
                style={{ width: `${progressPercent}%` }}
                data-testid="qr-progress-bar"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className={`text-sm font-mono font-medium ${isExpiring ? "text-destructive" : "text-muted-foreground"}`} data-testid="text-qr-countdown">
                {countdown}s
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchQr}
            disabled={isRefreshing}
            data-testid="button-refresh-qr"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Yenile
          </Button>

          <div className="text-center space-y-1">
            <p className="text-xs text-muted-foreground">
              Bu QR kodu kiosk tabletine okutarak vardiya islemlerinizi gerceklestirebilirsiniz
            </p>
            <Badge variant="secondary" className="text-[10px]">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Her 30 saniyede otomatik yenilenir
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
