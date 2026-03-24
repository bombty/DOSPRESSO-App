import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUpDown, Building2 } from "lucide-react";
import EmptyStateCard from "./EmptyStateCard";

export interface BranchRow {
  branchId: number;
  name: string;
  healthScore: number | null;
  staffCount: number;
  attendanceRate: number | null;
  taskCompletionRate: number | null;
  customerRating: number | null;
  slaBreaches: number;
  faultCount: number;
}

interface BranchComparisonTableProps {
  data: BranchRow[];
  onBranchClick?: (branchId: number) => void;
  className?: string;
}

type SortKey = keyof BranchRow;

function fmt(val: number | null, suffix = ""): string {
  if (val === null || val === undefined) return "—";
  return `${val}${suffix}`;
}

function healthColor(score: number | null): string {
  if (score === null) return "bg-muted text-muted-foreground";
  if (score >= 80) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  if (score >= 60) return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
}

export default function BranchComparisonTable({ data, onBranchClick, className }: BranchComparisonTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("healthScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  if (!data.length) {
    return (
      <EmptyStateCard
        icon={<Building2 className="h-10 w-10" />}
        title="Şube karşılaştırma"
        description="Şube verisi henüz yok"
        className={className}
      />
    );
  }

  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey] ?? -1;
    const bv = b[sortKey] ?? -1;
    return sortDir === "desc" ? (bv > av ? 1 : -1) : (av > bv ? 1 : -1);
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const cols: { key: SortKey; label: string }[] = [
    { key: "healthScore", label: "Sağlık" },
    { key: "staffCount", label: "Personel" },
    { key: "attendanceRate", label: "Devam" },
    { key: "taskCompletionRate", label: "Görev" },
    { key: "customerRating", label: "Müşteri" },
    { key: "slaBreaches", label: "SLA" },
    { key: "faultCount", label: "Arıza" },
  ];

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Şube Karşılaştırma</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <table className="w-full text-xs" data-testid="branch-comparison-table">
            <thead>
              <tr className="border-b">
                <th className="text-left px-3 py-2 font-medium">Şube</th>
                {cols.map((c) => (
                  <th
                    key={c.key}
                    className="px-2 py-2 font-medium cursor-pointer whitespace-nowrap"
                    onClick={() => toggleSort(c.key)}
                  >
                    <span className="inline-flex items-center gap-0.5">
                      {c.label}
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr
                  key={row.branchId}
                  className="border-b last:border-0 hover-elevate cursor-pointer"
                  onClick={() => onBranchClick?.(row.branchId)}
                  data-testid={`branch-row-${row.branchId}`}
                >
                  <td className="px-3 py-2 font-medium whitespace-nowrap">{row.name}</td>
                  <td className="px-2 py-2 text-center">
                    <Badge variant="secondary" className={`text-xs ${healthColor(row.healthScore)}`}>
                      {fmt(row.healthScore)}
                    </Badge>
                  </td>
                  <td className="px-2 py-2 text-center">{row.staffCount}</td>
                  <td className="px-2 py-2 text-center">{fmt(row.attendanceRate, "%")}</td>
                  <td className="px-2 py-2 text-center">{fmt(row.taskCompletionRate, "%")}</td>
                  <td className="px-2 py-2 text-center">{fmt(row.customerRating, "★")}</td>
                  <td className="px-2 py-2 text-center">{row.slaBreaches}</td>
                  <td className="px-2 py-2 text-center">{row.faultCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
