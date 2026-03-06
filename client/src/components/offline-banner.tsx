import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineBanner() {
  const { isOnline, wasOffline } = useNetworkStatus();

  if (isOnline && !wasOffline) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-medium transition-colors duration-300 ${
        !isOnline
          ? "bg-destructive text-destructive-foreground"
          : "bg-green-600 text-white"
      }`}
      data-testid="offline-banner"
      role="alert"
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>İnternet bağlantısı yok — Değişiklikleriniz kaydedildi, bağlantı gelince otomatik gönderilecek</span>
        </>
      ) : (
        <>
          <Wifi className="h-4 w-4 shrink-0" />
          <span>İnternet bağlantısı geri geldi — Bekleyen veriler gönderiliyor...</span>
        </>
      )}
    </div>
  );
}
