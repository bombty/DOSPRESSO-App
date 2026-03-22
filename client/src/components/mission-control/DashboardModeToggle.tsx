import { useState, useEffect } from "react";
import { useDashboardMode } from "@/hooks/useDashboardMode";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LayoutDashboard, Rocket, X, Sparkles } from "lucide-react";

const HINT_STORAGE_KEY = "dospresso-mc-hint-dismissed";

export function DashboardModeToggle() {
  const { mode, setMode, isSaving } = useDashboardMode();
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(HINT_STORAGE_KEY);
    if (!dismissed) {
      setShowHint(true);
    }
  }, []);

  const dismissHint = () => {
    setShowHint(false);
    localStorage.setItem(HINT_STORAGE_KEY, "true");
  };

  const handleModeSwitch = (newMode: "classic" | "mission-control") => {
    setMode(newMode);
    if (showHint) dismissHint();
  };

  return (
    <div className="flex flex-col items-end gap-2" data-testid="dashboard-mode-toggle-wrapper">
      <div className="flex items-center gap-1.5 border rounded-lg p-1 bg-muted/40 shadow-sm" data-testid="dashboard-mode-toggle">
        <Button
          size="sm"
          variant={mode === "classic" ? "default" : "ghost"}
          className="h-8 px-3 text-xs gap-1.5"
          onClick={() => handleModeSwitch("classic")}
          disabled={isSaving || mode === "classic"}
          data-testid="toggle-classic"
        >
          <LayoutDashboard className="h-4 w-4" />
          Klasik
        </Button>
        <Button
          size="sm"
          variant={mode === "mission-control" ? "default" : "ghost"}
          className="h-8 px-3 text-xs gap-1.5"
          onClick={() => handleModeSwitch("mission-control")}
          disabled={isSaving || mode === "mission-control"}
          data-testid="toggle-mission-control"
        >
          <Rocket className="h-4 w-4" />
          Mission Control
        </Button>
      </div>

      {showHint && (
        <Card className="max-w-xs animate-in fade-in slide-in-from-top-2 duration-300" data-testid="mc-hint-card">
          <CardContent className="p-3 flex gap-2 items-start">
            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">Yeni: Mission Control</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                KPI kartlari, hizli erisim ve Dobody rehberligi ile dashboard deneyiminizi yükseltin.
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 shrink-0"
              onClick={dismissHint}
              data-testid="mc-hint-dismiss"
            >
              <X className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
