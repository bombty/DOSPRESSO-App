import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Wrench, Zap, Clock, CheckCircle, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import { Progress } from "@/components/ui/progress";
import { GaugeCard, KPICard } from "./shared-dashboard-components";

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
  const closedFaults = totalFaults - openFaults;
  const resolutionRate = totalFaults > 0 ? Math.round((closedFaults / totalFaults) * 100) : 0;
  const systemHealth = Math.max(0, 100 - (openFaults * 5) - (criticalFaults.length * 15));

  // Equipment fault distribution
  const equipmentStats = faults?.reduce((acc: any[], f: any) => {
    const eq = acc.find((e: any) => e.name === (f.equipmentName || 'Unknown'));
    if (eq) eq.faults++;
    else acc.push({ name: f.equipmentName || 'Unknown', faults: 1 });
    return acc;
  }, [])?.sort((a: any, b: any) => b.faults - a.faults).slice(0, 5) || [];

  return (
    <div className="space-y-3 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Wrench className="h-6 w-6 text-blue-900" />
        <h2 className="text-lg md:text-2xl font-bold text-blue-900">Teknik Paneli</h2>
      </div>

      {/* System Health Gauges */}
      {!isLoading && (
        <div className="grid gap-0.5 grid-cols-3">
          {[
            { label: 'Çözüm', value: resolutionRate, icon: CheckCircle, color: resolutionRate >= 70 ? 'green' : 'yellow' },
            { label: 'Sistem', value: systemHealth, icon: Zap, color: systemHealth >= 70 ? 'green' : systemHealth >= 40 ? 'yellow' : 'red' },
            { label: 'Açık', value: openFaults, icon: TrendingDown, color: 'green', isValue: true }
          ].map((gauge) => (
            <Card key={gauge.label}>
              <CardContent className="pt-1.5 pb-1.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-semibold">{gauge.label}</span>
                  <gauge.icon className={`h-2.5 w-2.5 text-${gauge.color}-600`} />
                </div>
                <div className={`text-base font-bold text-${gauge.color}-700`}>{gauge.value}{!gauge.isValue ? '%' : ''}</div>
                {!gauge.isValue && <Progress value={gauge.value} className="h-1" />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Equipment Fault Distribution */}
      {!isLoading && equipmentStats.length > 0 && (
        <Card className="hidden md:block">
          <CardHeader>
            <CardTitle className="text-sm">Ekipman Arıza Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={equipmentStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Bar dataKey="faults" fill="#dc2626" name="Arızalar" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Alert Stats */}
      <div className="grid gap-0.5 grid-cols-4">
        <Card className="border-l-4 border-l-red-600">
          <CardContent className="pt-1.5 pb-1.5 text-center">
            <div className="flex justify-center mb-0.5">
              <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
            </div>
            <div className="text-sm font-bold text-red-700">{openFaults}</div>
            <p className="text-xs text-muted-foreground">Açık</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-600">
          <CardContent className="pt-1.5 pb-1.5 text-center">
            <div className="flex justify-center mb-0.5">
              <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />
            </div>
            <div className="text-sm font-bold text-orange-700">{criticalFaults.length}</div>
            <p className="text-xs text-muted-foreground">Kritik</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-600">
          <CardContent className="pt-1.5 pb-1.5 text-center">
            <div className="flex justify-center mb-0.5">
              <Zap className="h-3.5 w-3.5 text-yellow-600" />
            </div>
            <div className="text-sm font-bold text-yellow-700">{highFaults.length}</div>
            <p className="text-xs text-muted-foreground">Yüksek</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-600">
          <CardContent className="pt-1.5 pb-1.5 text-center">
            <div className="flex justify-center mb-0.5">
              <Clock className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div className="text-sm font-bold text-blue-700">
              {totalFaults - openFaults}
            </div>
            <p className="text-xs text-muted-foreground">Kapanan</p>
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
