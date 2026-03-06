import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { isNetworkError } from "@/hooks/useNetworkStatus";
import { addToQueue } from "@/lib/offline-queue";
import { useToast } from "@/hooks/use-toast";
import { useCallback } from "react";
import { NetworkError } from "@/lib/queryClient";

interface OfflineMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  queueDescription: string;
  getQueueData: (variables: TVariables) => {
    url: string;
    method: "POST" | "PUT" | "PATCH" | "DELETE";
    body: any;
  };
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  skipQueue?: boolean;
}

export function useOfflineMutation<TData = unknown, TVariables = unknown>(
  options: OfflineMutationOptions<TData, TVariables>
) {
  const { toast } = useToast();

  return useMutation<TData, Error, TVariables>({
    mutationFn: options.mutationFn,
    onSuccess: options.onSuccess,
    onError: (error, variables) => {
      if (!options.skipQueue && (isNetworkError(error) || error instanceof NetworkError)) {
        const queueData = options.getQueueData(variables);
        const id = addToQueue({
          ...queueData,
          description: options.queueDescription,
        });
        if (id) {
          toast({
            title: "Internet baglantisi yok",
            description: `${options.queueDescription} — internet gelince otomatik gonderilecek`,
          });
          window.dispatchEvent(new CustomEvent("offline-queue-change"));
        } else {
          toast({
            title: "Veri kaydedilemedi",
            description: "Cihaz depolama alani dolu. Lutfen bazi verileri temizleyin ve tekrar deneyin.",
            variant: "destructive",
          });
        }
      } else {
        if (options.onError) {
          options.onError(error, variables);
        } else {
          toast({
            title: "Hata",
            description: error.message || "Islem basarisiz",
            variant: "destructive",
          });
        }
      }
    },
  });
}

export function offlineErrorHandler(
  error: Error,
  queueData: { url: string; method: "POST" | "PUT" | "PATCH" | "DELETE"; body: any },
  description: string,
  toast: ReturnType<typeof useToast>["toast"],
  fallbackErrorHandler?: (error: Error) => void
): boolean {
  if (isNetworkError(error) || error instanceof NetworkError) {
    const id = addToQueue({
      ...queueData,
      description,
    });
    if (id) {
      toast({
        title: "Internet baglantisi yok",
        description: `${description} — internet gelince otomatik gonderilecek`,
      });
      window.dispatchEvent(new CustomEvent("offline-queue-change"));
    } else {
      toast({
        title: "Veri kaydedilemedi",
        description: "Cihaz depolama alani dolu. Lutfen bazi verileri temizleyin ve tekrar deneyin.",
        variant: "destructive",
      });
    }
    return id !== null;
  }
  if (fallbackErrorHandler) {
    fallbackErrorHandler(error);
  } else {
    toast({
      title: "Hata",
      description: error.message || "Islem basarisiz",
      variant: "destructive",
    });
  }
  return false;
}
