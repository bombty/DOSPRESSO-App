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
        addToQueue({
          ...queueData,
          description: options.queueDescription,
        });
        toast({
          title: "İnternet bağlantısı yok",
          description: `${options.queueDescription} — internet gelince otomatik gönderilecek`,
        });
        window.dispatchEvent(new CustomEvent("offline-queue-change"));
      } else {
        if (options.onError) {
          options.onError(error, variables);
        } else {
          toast({
            title: "Hata",
            description: error.message || "İşlem başarısız",
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
    addToQueue({
      ...queueData,
      description,
    });
    toast({
      title: "İnternet bağlantısı yok",
      description: `${description} — internet gelince otomatik gönderilecek`,
    });
    window.dispatchEvent(new CustomEvent("offline-queue-change"));
    return true;
  }
  if (fallbackErrorHandler) {
    fallbackErrorHandler(error);
  }
  return false;
}
