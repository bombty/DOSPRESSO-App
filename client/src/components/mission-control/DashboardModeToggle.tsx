import { useDashboardMode } from "@/hooks/useDashboardMode";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Rocket } from "lucide-react";

export function DashboardModeToggle() {
  const { mode, setMode, isSaving } = useDashboardMode();

  return (
    <div className="flex items-center gap-1 border rounded-md p-0.5 bg-muted/30" data-testid="dashboard-mode-toggle">
      <Button
        size="sm"
        variant={mode === "classic" ? "default" : "ghost"}
        className="h-7 px-2.5 text-xs gap-1.5"
        onClick={() => setMode("classic")}
        disabled={isSaving || mode === "classic"}
        data-testid="toggle-classic"
      >
        <LayoutDashboard className="h-3.5 w-3.5" />
        Klasik
      </Button>
      <Button
        size="sm"
        variant={mode === "mission-control" ? "default" : "ghost"}
        className="h-7 px-2.5 text-xs gap-1.5"
        onClick={() => setMode("mission-control")}
        disabled={isSaving || mode === "mission-control"}
        data-testid="toggle-mission-control"
      >
        <Rocket className="h-3.5 w-3.5" />
        Mission Control
      </Button>
    </div>
  );
}
