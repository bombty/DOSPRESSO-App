import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushPermissionBanner() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const { data: vapidData } = useQuery<{ publicKey: string }>({
    queryKey: ['/api/push/vapid-key'],
    retry: false,
  });

  const subscribeMutation = useMutation({
    mutationFn: async (sub: PushSubscriptionJSON) => {
      await apiRequest('POST', '/api/push/subscribe', {
        endpoint: sub.endpoint,
        keys: sub.keys,
        deviceInfo: navigator.userAgent.substring(0, 200),
      });
    },
  });

  useEffect(() => {
    if (dismissed) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!vapidData?.publicKey) return;
    if (localStorage.getItem('push_dismissed') === 'true') return;

    const timer = setTimeout(async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!sub) {
          setVisible(true);
        }
      } catch {
        setVisible(true);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [vapidData, dismissed]);

  const handleAllow = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setVisible(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData!.publicKey),
      });

      await subscribeMutation.mutateAsync(sub.toJSON());
      setVisible(false);
      localStorage.setItem('push_subscribed', 'true');
    } catch (err) {
      console.error('[Push] Subscribe error:', err);
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem('push_dismissed', 'true');
  };

  if (!visible) return null;

  return (
    <div
      data-testid="banner-push-permission"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-md border bg-card p-4 shadow-lg md:left-auto md:right-4"
    >
      <div className="flex items-start gap-3">
        <Bell className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-medium">Bildirimleri Aç</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Kritik uyarılar, görev atamaları ve önemli güncellemeler için anlık bildirim alın.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              data-testid="button-push-allow"
              size="sm"
              onClick={handleAllow}
              disabled={subscribeMutation.isPending}
            >
              {subscribeMutation.isPending ? 'Kaydediliyor...' : 'İzin Ver'}
            </Button>
            <Button
              data-testid="button-push-dismiss"
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
            >
              Şimdi Değil
            </Button>
          </div>
        </div>
        <Button
          data-testid="button-push-close"
          size="icon"
          variant="ghost"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
