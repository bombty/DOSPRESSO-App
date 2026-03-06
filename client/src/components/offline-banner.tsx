import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { WifiOff, Wifi } from "lucide-react";

const BANNER_HEIGHT = "36px";

export function OfflineBanner() {
  const { isOnline, wasOffline } = useNetworkStatus();

  const showBanner = !isOnline || wasOffline;

  return (
    <>
      {showBanner && <div style={{ height: BANNER_HEIGHT }} />}
      {showBanner && (
        <div
          className={`fixed top-0 left-0 right-0 z-[9999] px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium transition-colors duration-300 ${
            !isOnline
              ? "bg-destructive text-destructive-foreground"
              : "bg-green-600 text-white"
          }`}
          style={{ height: BANNER_HEIGHT }}
          data-testid="offline-banner"
          role="alert"
        >
          {!isOnline ? (
            <>
              <WifiOff className="h-4 w-4 shrink-0" />
              <span>Internet baglantisi yok — Verileriniz kaydedildi, baglanti gelince otomatik gonderilecek</span>
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4 shrink-0" />
              <span>Internet baglantisi geri geldi — Bekleyen veriler gonderiliyor...</span>
            </>
          )}
        </div>
      )}
    </>
  );
}
