import { useState, useEffect, useCallback, useRef } from "react";
import {
  getQueueSize,
  getQueueItems,
  processQueue,
  addToQueue as rawAddToQueue,
  removeFromQueue,
  clearQueue,
  cleanExpiredItems,
  type QueuedMutation,
  type ProcessResult,
} from "@/lib/offline-queue";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useToast } from "@/hooks/use-toast";

export function useOfflineQueue() {
  const [queueSize, setQueueSize] = useState(getQueueSize);
  const [isProcessing, setIsProcessing] = useState(false);
  const { isOnline } = useNetworkStatus();
  const { toast } = useToast();
  const processedRef = useRef(false);

  useEffect(() => {
    const update = () => setQueueSize(getQueueSize());
    window.addEventListener("offline-queue-change", update);
    return () => window.removeEventListener("offline-queue-change", update);
  }, []);

  useEffect(() => {
    cleanExpiredItems();
  }, []);

  const doProcess = useCallback(async () => {
    if (isProcessing) return;
    const size = getQueueSize();
    if (size === 0) return;

    setIsProcessing(true);
    toast({
      title: "Bekleyen veriler gönderiliyor...",
      description: `${size} öğe sıraya alındı`,
    });

    try {
      const result: ProcessResult = await processQueue((current, total) => {
        setQueueSize(total - current);
      });

      if (result.succeeded > 0 && result.failed === 0) {
        toast({
          title: "Tüm veriler başarıyla gönderildi",
          description: `${result.succeeded} öğe gönderildi`,
        });
      } else if (result.failed > 0) {
        toast({
          title: `${result.succeeded} gönderildi, ${result.failed} hâlâ bekliyor`,
          description: "İnternet bağlantınızı kontrol edin",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Kuyruk işlenemedi",
        description: "Daha sonra tekrar denenecek",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setQueueSize(getQueueSize());
    }
  }, [isProcessing, toast]);

  useEffect(() => {
    if (isOnline && !processedRef.current && getQueueSize() > 0) {
      processedRef.current = true;
      const timer = setTimeout(() => {
        doProcess();
      }, 1500);
      return () => clearTimeout(timer);
    }
    if (!isOnline) {
      processedRef.current = false;
    }
  }, [isOnline, doProcess]);

  const addItem = useCallback(
    (
      mutation: Omit<QueuedMutation, "id" | "timestamp" | "retryCount" | "status" | "maxRetries"> & { maxRetries?: number }
    ) => {
      const id = rawAddToQueue(mutation);
      setQueueSize(getQueueSize());
      return id;
    },
    []
  );

  return {
    queueSize,
    isProcessing,
    queueItems: getQueueItems,
    addToQueue: addItem,
    removeFromQueue: useCallback((id: string) => {
      removeFromQueue(id);
      setQueueSize(getQueueSize());
    }, []),
    clearQueue: useCallback(() => {
      clearQueue();
      setQueueSize(0);
    }, []),
    processQueue: doProcess,
  };
}
