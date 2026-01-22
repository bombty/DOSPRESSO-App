import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export function EnhancedAnalyticsCard() {
  const [, setLocation] = useLocation();

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="h-full min-h-[60px] bg-card text-xs font-medium"
      onClick={() => setLocation("/raporlar")}
      data-testid="button-special-report"
    >
      Özet Rapor
    </Button>
  );
}
