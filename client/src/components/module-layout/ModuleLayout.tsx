import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { ModuleSidebar, type SidebarSection } from "./ModuleSidebar";
import { KPIStrip, type KPIMetric } from "./KPIStrip";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ModuleLayoutProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  kpiMetrics?: KPIMetric[];
  kpiLoading?: boolean;
  sidebarSections: SidebarSection[];
  activeView: string;
  onViewChange: (view: string) => void;
  children: React.ReactNode;
}

export function ModuleLayout({
  title,
  description,
  icon,
  kpiMetrics,
  kpiLoading,
  sidebarSections,
  activeView,
  onViewChange,
  children,
}: ModuleLayoutProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleViewChange = (view: string) => {
    onViewChange(view);
    setSheetOpen(false);
  };

  return (
    <div className="flex flex-col h-full" data-testid="module-layout">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button size="icon" variant="ghost" data-testid="mobile-sidebar-toggle">
                    <Menu />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[240px] p-0">
                  <div className="pt-12">
                    <ModuleSidebar
                      sections={sidebarSections}
                      activeView={activeView}
                      onViewChange={handleViewChange}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            {icon && <span className="text-primary">{icon}</span>}
            <div>
              <h1 className="text-xl font-semibold">{title}</h1>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:block w-[200px] border-r shrink-0">
          <ModuleSidebar
            sections={sidebarSections}
            activeView={activeView}
            onViewChange={onViewChange}
          />
        </div>

        <div className="flex-1 overflow-auto">
          <div className="p-4">
            {kpiMetrics && kpiMetrics.length > 0 && (
              <KPIStrip metrics={kpiMetrics} isLoading={kpiLoading} />
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export { KPIStrip, type KPIMetric } from "./KPIStrip";
export { ModuleSidebar, type SidebarSection, type SidebarItem } from "./ModuleSidebar";
