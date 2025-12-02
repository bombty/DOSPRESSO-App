import { ArrowLeft, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: any;
  showBack?: boolean;
  backPath?: string;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
}

export function PageHeader({ 
  title, 
  subtitle,
  icon: Icon,
  showBack = true, 
  backPath,
  actions,
  tabs
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
        {actions && (
          <div className="flex items-center gap-1 shrink-0">
            {actions}
          </div>
        )}
      </div>
      {tabs && (
        <div className="px-3 pb-2 overflow-x-auto">
          {tabs}
        </div>
      )}
    </div>
  );
}
