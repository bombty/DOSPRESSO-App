import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Wrench, Zap, Clock } from "lucide-react";

interface TeknikDashboardProps {
  openFaults: number;
  totalFaults: number;
  faults?: any[];
  isLoading: boolean;
}

export function TeknikDashboard({
  openFaults,
  totalFaults,
  faults,
  isLoading,
}: TeknikDashboardProps) {
  const criticalFaults = faults?.filter(f => f.priority === "kritik") || [];
  const highFaults = faults?.filter(f => f.priority === "yuksek") || [];

  return (
    <div className="space-y-3 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Wrench className="h-6 w-6 text-blue-900" />
        <h2 className="text-lg md:text-2xl font-bold text-blue-900">Teknik Paneli</h2>
      </div>

      {/* Alert Stats */}
      <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
        <Card className="border-l-4 border-l-red-600">
          <CardContent className="pt-3 pb-3 text-center">
            <div className="flex justify-center mb-1">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="text-lg md:text-2xl font-bold text-red-700">{openFaults}</div>
            <p className="text-xs md:text-sm text-muted-foreground">Açık Arızalar</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-600">
          <CardContent className="pt-3 pb-3 text-center">
            <div className="flex justify-center mb-1">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-lg md:text-2xl font-bold text-orange-700">{criticalFaults.length}</div>
            <p className="text-xs md:text-sm text-muted-foreground">Kritik</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-600">
          <CardContent className="pt-3 pb-3 text-center">
            <div className="flex justify-center mb-1">
              <Zap className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="text-lg md:text-2xl font-bold text-yellow-700">{highFaults.length}</div>
            <p className="text-xs md:text-sm text-muted-foreground">Yüksek</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-600">
          <CardContent className="pt-3 pb-3 text-center">
            <div className="flex justify-center mb-1">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-lg md:text-2xl font-bold text-blue-700">
              {totalFaults - openFaults}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">Kapanan</p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Faults */}
      {criticalFaults.length > 0 && (
        <Card className="border-l-4 border-l-red-600">
          <CardHeader>
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Kritik Arızalar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalFaults.slice(0, 5).map((fault) => (
                <div key={fault.id} className="p-3 bg-red-50 dark:bg-red-950/30 rounded border-l-4 border-red-600">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-red-900 dark:text-red-100">
                        {fault.equipmentName || `Equipment ${fault.equipmentId}`}
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-300 mt-1">{fault.description}</p>
                    </div>
                    <Badge className="bg-red-600 text-white">KRİTİK</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* High Priority Faults */}
      {highFaults.length > 0 && (
        <Card className="border-l-4 border-l-yellow-600">
          <CardHeader>
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              Yüksek Öncelikli Arızalar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {highFaults.slice(0, 5).map((fault) => (
                <div key={fault.id} className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded border-l-4 border-yellow-600">
                  <p className="font-semibold text-sm text-yellow-900 dark:text-yellow-100">
                    {fault.equipmentName || `Equipment ${fault.equipmentId}`}
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">{fault.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && <Skeleton className="h-64 w-full" />}
    </div>
  );
}
