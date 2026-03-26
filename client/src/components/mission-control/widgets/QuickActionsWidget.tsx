import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Zap, Building2, MessageSquare, BarChart3, Factory,
  GraduationCap, Package, Wrench, ShoppingCart, ClipboardList,
  Users, Settings, FileText, Plus, Truck, Shield,
} from "lucide-react";
import { useLocation } from "wouter";

const iconMap: Record<string, any> = {
  Building2, MessageSquare, BarChart3, Factory,
  GraduationCap, Package, Wrench, ShoppingCart, ClipboardList,
  Users, Settings, FileText, Plus, Truck, Shield, Zap,
};

interface QuickAction {
  label: string;
  path: string;
  iconName?: string;
  icon?: string;
  color?: string;
}

interface Props {
  data: QuickAction[] | null;
}

export function QuickActionsWidget({ data }: Props) {
  const [, setLocation] = useLocation();
  if (!data || !Array.isArray(data) || data.length === 0) return null;
  return (
    <Card data-testid="widget-quick-actions">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold">Hızlı İşlemler</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {data.map((action, i) => {
            const iconKey = action.iconName || action.icon;
            const Icon = iconKey ? iconMap[iconKey] : Zap;
            return (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="text-[11px] gap-1"
                onClick={() => setLocation(action.path)}
                data-testid={`quick-action-${i}`}
              >
                {Icon && <Icon className="w-3 h-3" />}
                {action.label}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
