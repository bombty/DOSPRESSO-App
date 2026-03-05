import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Announcement } from "@shared/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Megaphone, X, AlertCircle } from "lucide-react";

export function AnnouncementBanner() {
  const [dismissedIds, setDismissedIds] = useState<number[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('dismissedAnnouncements');
    if (stored) {
      try {
        setDismissedIds(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem('dismissedAnnouncements');
      }
    }
  }, []);

  const { data: announcements } = useQuery<Announcement[]>({
    queryKey: ['/api/announcements'],
  });

  const activeAnnouncements = announcements?.filter(a => {
    if (!a.publishedAt) return false;
    if (dismissedIds.includes(a.id)) return false;
    if (a.expiresAt) {
      const expiryDate = new Date(a.expiresAt);
      if (expiryDate < new Date()) return false;
    }
    return true;
  }) || [];

  const handleDismiss = (id: number) => {
    const newDismissed = [...dismissedIds, id];
    setDismissedIds(newDismissed);
    localStorage.setItem('dismissedAnnouncements', JSON.stringify(newDismissed));
  };

  if (activeAnnouncements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3" data-testid="container-announcement-banner">
      {activeAnnouncements.map((announcement) => {
        const isUrgent = announcement.priority === 'urgent';
        const Icon = isUrgent ? AlertCircle : Megaphone;
        
        return (
          <Alert 
            key={announcement.id} 
            variant={isUrgent ? "destructive" : "default"}
            data-testid={`alert-announcement-${announcement.id}`}
          >
            <Icon className="h-4 w-4" />
            <AlertTitle data-testid={`text-announcement-title-${announcement.id}`}>
              {announcement.title}
            </AlertTitle>
            <AlertDescription className="flex items-start justify-between gap-4">
              <span data-testid={`text-announcement-message-${announcement.id}`}>
                {announcement.message}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => handleDismiss(announcement.id)}
                data-testid={`button-dismiss-${announcement.id}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
