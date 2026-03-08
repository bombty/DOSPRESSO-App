import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { TrendingUp, Users, Clock } from "lucide-react";

interface AnalyticsData {
  weeklyHours: number;
  employeeCount: number;
  shiftsCompleted: number;
  avgShiftLength: number;
  trend: Array<{ day: string; hours: number }>;
}

export function AnalyticsCard() {
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics/dashboard"],
  });

  if (isLoading || !analytics) return null;

  const trend = analytics.trend || [];

  return (
    <Card className="border-primary/20 bg-primary/5 dark:bg-blue-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2 text-primary">
            <TrendingUp className="h-4 w-4" />
            Haftalık Özet
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Bu Hafta
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <div className="p-2 bg-background/50 rounded border border-primary/10">
            <p className="text-xs text-muted-foreground">Saatler</p>
            <p className="text-lg font-bold text-primary">{analytics.weeklyHours}</p>
            <p className="text-xs text-muted-foreground">saat</p>
          </div>
          <div className="p-2 bg-background/50 rounded border border-primary/10">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> Personel
            </p>
            <p className="text-lg font-bold text-primary">{analytics.employeeCount}</p>
            <p className="text-xs text-muted-foreground">kişi</p>
          </div>
          <div className="p-2 bg-background/50 rounded border border-primary/10">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Vardiya
            </p>
            <p className="text-lg font-bold text-primary">{analytics.shiftsCompleted}</p>
            <p className="text-xs text-muted-foreground">tamamlandı</p>
          </div>
        </div>

        {/* Trend Chart */}
        {trend.length > 0 && (
          <div className="border-t border-primary/10 pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Saatler Trendi</p>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--primary) / 0.1)" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "4px",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke="hsl(var(--primary))"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Average Info */}
        <div className="text-xs text-muted-foreground text-center p-2 bg-background/50 rounded border border-primary/10">
          Ort. Vardiya Süresi: <span className="font-semibold text-foreground">{(analytics.avgShiftLength ?? 0).toFixed(1)} saat</span>
        </div>
      </CardContent>
    </Card>
  );
}
