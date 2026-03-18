import { useState, useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, ChevronDown } from "lucide-react";

interface MobileFilterCollapseProps {
  children: React.ReactNode;
  activeFilterCount?: number;
  className?: string;
  testId?: string;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

export function MobileFilterCollapse({ children, activeFilterCount = 0, className = "", testId = "mobile-filter-collapse" }: MobileFilterCollapseProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(!isMobile);

  useEffect(() => {
    setOpen(!isMobile);
  }, [isMobile]);

  if (!isMobile) {
    return <div className={className}>{children}</div>;
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={className}>
      <CollapsibleTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full flex items-center justify-between gap-2 mb-2"
          data-testid={`${testId}-trigger`}
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>Filtreler</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
