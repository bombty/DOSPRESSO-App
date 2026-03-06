import { useState, useEffect, useRef, useCallback, createContext, useContext, type ReactNode } from "react";

interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
}

const PING_INTERVAL = 30000;
const RECONNECT_BANNER_DURATION = 3000;

const NetworkStatusContext = createContext<NetworkStatus>({ isOnline: true, wasOffline: false });

export function NetworkStatusProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const wasOfflineRef = useRef(false);
  const isOnlineRef = useRef(navigator.onLine);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleOnline = useCallback(() => {
    isOnlineRef.current = true;
    setIsOnline(true);
    if (wasOfflineRef.current) {
      setWasOffline(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setWasOffline(false);
      }, RECONNECT_BANNER_DURATION);
    }
    wasOfflineRef.current = false;
  }, []);

  const handleOffline = useCallback(() => {
    isOnlineRef.current = false;
    setIsOnline(false);
    wasOfflineRef.current = true;
    setWasOffline(false);
  }, []);

  useEffect(() => {
    const pingHealth = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const res = await fetch("/api/health", {
          method: "HEAD",
          cache: "no-store",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok && !isOnlineRef.current) {
          handleOnline();
        }
      } catch {
        if (isOnlineRef.current) {
          handleOffline();
        }
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    pingRef.current = setInterval(pingHealth, PING_INTERVAL);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (pingRef.current) clearInterval(pingRef.current);
    };
  }, [handleOnline, handleOffline]);

  return (
    <NetworkStatusContext.Provider value={{ isOnline, wasOffline }}>
      {children}
    </NetworkStatusContext.Provider>
  );
}

export function useNetworkStatus(): NetworkStatus {
  return useContext(NetworkStatusContext);
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message === "Failed to fetch") return true;
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("network") || msg.includes("failed to fetch") || msg.includes("net::")) return true;
  }
  return false;
}
