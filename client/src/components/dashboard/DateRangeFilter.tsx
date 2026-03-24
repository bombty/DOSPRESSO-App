import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Calendar as CalendarIcon } from "lucide-react";

export type PeriodType = "today" | "this_week" | "this_month" | "last_month" | "last_quarter" | "last_6months" | "last_year" | "custom";

interface PeriodOption {
  value: PeriodType;
  label: string;
}

const DEFAULT_PERIODS: PeriodOption[] = [
  { value: "today", label: "Bugün" },
  { value: "this_week", label: "Bu Hafta" },
  { value: "this_month", label: "Bu Ay" },
  { value: "last_month", label: "Geçen Ay" },
  { value: "last_quarter", label: "Son 3 Ay" },
  { value: "last_6months", label: "Son 6 Ay" },
  { value: "last_year", label: "Son 1 Yıl" },
];

interface DateRangeFilterProps {
  period: PeriodType;
  onPeriodChange: (period: PeriodType, startDate?: string, endDate?: string) => void;
  periods?: PeriodOption[];
  className?: string;
}

export function getDateRange(period: PeriodType, customStart?: string, customEnd?: string): { startDate: string; endDate: string } {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  switch (period) {
    case "today":
      return { startDate: today, endDate: today };
    case "this_week": {
      const d = new Date(now);
      const day = d.getDay() || 7;
      d.setDate(d.getDate() - day + 1);
      return { startDate: d.toISOString().split("T")[0], endDate: today };
    }
    case "this_month": {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: d.toISOString().split("T")[0], endDate: today };
    }
    case "last_month": {
      const d1 = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const d2 = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: d1.toISOString().split("T")[0], endDate: d2.toISOString().split("T")[0] };
    }
    case "last_quarter": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return { startDate: d.toISOString().split("T")[0], endDate: today };
    }
    case "last_6months": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      return { startDate: d.toISOString().split("T")[0], endDate: today };
    }
    case "last_year": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return { startDate: d.toISOString().split("T")[0], endDate: today };
    }
    case "custom":
      return { startDate: customStart || today, endDate: customEnd || today };
    default:
      return { startDate: today, endDate: today };
  }
}

export default function DateRangeFilter({ period, onPeriodChange, periods, className }: DateRangeFilterProps) {
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const options = periods || DEFAULT_PERIODS;

  return (
    <ScrollArea className={`w-full ${className || ""}`}>
      <div className="flex items-center gap-1.5 pb-1" data-testid="date-range-filter">
        {options.map((opt) => (
          <Button
            key={opt.value}
            variant={period === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => onPeriodChange(opt.value)}
            className="whitespace-nowrap"
            data-testid={`period-${opt.value}`}
          >
            {opt.label}
          </Button>
        ))}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={period === "custom" ? "default" : "outline"}
              size="sm"
              className="whitespace-nowrap"
              data-testid="period-custom"
            >
              <CalendarIcon className="h-3.5 w-3.5 mr-1" />
              Özel
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 space-y-2" align="end">
            <div>
              <label className="text-xs text-muted-foreground">Başlangıç</label>
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                data-testid="input-custom-start"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Bitiş</label>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                data-testid="input-custom-end"
              />
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={() => {
                if (customStart && customEnd) onPeriodChange("custom", customStart, customEnd);
              }}
              data-testid="button-apply-custom"
            >
              Uygula
            </Button>
          </PopoverContent>
        </Popover>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
