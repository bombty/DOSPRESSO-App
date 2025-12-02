import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import dospressoLogo from "@assets/IMG_5044_1764674613097.jpeg";

interface AppHeaderProps {
  notificationCount?: number;
}

export function AppHeader({ notificationCount = 0 }: AppHeaderProps) {
  return (
    <div className="sticky top-0 z-50 bg-background border-b">
      {/* Logo Bar - Centered */}
      <div className="px-3 py-3 border-b bg-white dark:bg-slate-950 flex items-center justify-between">
        {/* Empty left space */}
        <div className="w-8" />
        
        {/* Logo centered */}
        <img 
          src={dospressoLogo} 
          alt="DOSPRESSO" 
          className="h-10 object-contain"
          data-testid="img-dospresso-logo"
        />
        
        {/* Mailbox right */}
        <div className="relative w-8 flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            data-testid="button-mailbox"
          >
            <Mail className="w-4 h-4" />
          </Button>
          {notificationCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-red-600 hover:bg-red-700"
              data-testid="badge-notification-count"
            >
              {notificationCount}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
