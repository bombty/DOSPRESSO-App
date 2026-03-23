import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

export interface SidebarItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
  hidden?: boolean;
}

interface ModuleSidebarProps {
  sections: SidebarSection[];
  activeView: string;
  onViewChange: (view: string) => void;
}

export function ModuleSidebar({ sections, activeView, onViewChange }: ModuleSidebarProps) {
  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        {sections.map((section) => {
          const visibleItems = section.items.filter((i) => !i.hidden);
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.title}>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-2">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left",
                      activeView === item.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover-elevate"
                    )}
                    data-testid={`sidebar-item-${item.id}`}
                  >
                    {item.icon && <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>}
                    <span className="truncate flex-1">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-[18px] justify-center">
                        {item.badge}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
