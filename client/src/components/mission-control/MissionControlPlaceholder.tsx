import { Rocket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardModeToggle } from "./DashboardModeToggle";

export function MissionControlPlaceholder() {
  return (
    <div className="space-y-4 p-4" data-testid="mission-control-placeholder">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Mission Control</h1>
        </div>
        <DashboardModeToggle />
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Rocket className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold" data-testid="mc-placeholder-title">Mission Control</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Yeni nesil dashboard deneyimi yakında burada. Rol bazlı widget'lar,
              Mr. Dobody AI rehberliği ve kişiselleştirilebilir düzen ile tanışın.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
