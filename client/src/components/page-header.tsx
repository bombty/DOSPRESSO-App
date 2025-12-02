import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import dospressoLogo from "@assets/IMG_5044_1764674613097.jpeg";
import { useState, useEffect } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: any;
  showBack?: boolean;
  backPath?: string;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
  notificationCount?: number;
}

export function PageHeader({ 
  title, 
  subtitle,
  icon: Icon,
  showBack = true, 
  backPath,
  actions,
  tabs,
  notificationCount = 0
}: PageHeaderProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (backPath) {
      setLocation(backPath);
    } else {
      window.history.back();
    }
  };

  return (
    <div className="sticky top-0 z-40 bg-background border-b">
      {/* Logo Bar - Centered */}
      <div className="px-3 py-2 border-b bg-white dark:bg-slate-950 flex items-center justify-center">
        <img 
          src={dospressoLogo} 
          alt="DOSPRESSO" 
          className="h-10 object-contain"
          data-testid="img-dospresso-logo"
        />
      </div>
      
      {/* Header Content */}
      <div className="flex items-center justify-between px-3 py-2 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {showBack && (
            <Button
              onClick={handleBack}
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          {Icon && <Icon className="w-5 h-5 text-primary shrink-0" />}
          <div className="min-w-0">
            <h1 className="text-base font-semibold truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Actions and Mailbox */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mailbox Icon with Badge */}
          <div className="relative">
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

          {actions && (
            <div className="flex items-center gap-1">
              {actions}
            </div>
          )}
        </div>
      </div>
      {tabs && (
        <div className="px-3 pb-2 overflow-x-auto">
          {tabs}
        </div>
      )}
    </div>
  );
}
