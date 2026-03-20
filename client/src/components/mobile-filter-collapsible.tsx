import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Filter, ChevronDown, ChevronUp } from "lucide-react";

interface MobileFilterCollapsibleProps {
  children: React.ReactNode;
  activeFilterCount?: number;
  className?: string;
}

export function MobileFilterCollapsible({
  children,
  activeFilterCount = 0,
  className = "",
}: MobileFilterCollapsibleProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={`md:hidden ${className}`}>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between"
          onClick={() => setOpen(!open)}
          data-testid="button-mobile-filter-toggle"
        >
          <span className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5" />
            Filtreler
            {activeFilterCount > 0 && (
              <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {activeFilterCount}
              </span>
            )}
          </span>
          {open ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </Button>
        {open && <div className="mt-2">{children}</div>}
      </div>
      <div className="hidden md:block">{children}</div>
    </>
  );
}
