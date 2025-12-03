import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, AlertTriangle, Zap, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { EquipmentFault, Equipment } from "@shared/schema";

interface EquipmentWithHealth extends Equipment {
  healthScore: number;
}

export default function EquipmentAnalytics() {
  const { data: faults = [] } = useQuery<EquipmentFault[]>({
    queryKey: ["/api/faults"],
  });

  const { data: equipment = [] } = useQuery<EquipmentWithHealth[]>({
    queryKey: ["/api/equipment"],
  });

  // Calculate fault trends by priority
  const faultsByPriority = {
    kritik: faults.filter(f => f.priority === "kritik").length,
    yuksek: faults.filter(f => f.priority === "yuksek").length,
    normal: faults.filter(f => f.priority === "normal" || !f.priority).length,
  };

  // Calculate resolution rate
  const totalFaults = faults.length;
  const resolvedFaults = faults.filter(f => f.currentStage === "kapatildi").length;
  const resolutionRate = totalFaults > 0 ? Math.round((resolvedFaults / totalFaults) * 100) : 0;

  // Top problematic equipment
  const equipmentFaultCounts = equipment.map(eq => ({
    name: eq.name,
    faults: faults.filter(f => f.equipmentId === eq.id && f.currentStage !== "kapatildi").length,
    health: eq.healthScore || 100,
    id: eq.id,
  })).filter(e => e.faults > 0).sort((a, b) => b.faults - a.faults).slice(0, 8);

  // Health distribution
  const healthDistribution = [
    { name: "Sağlıklı (80+)", value: equipment.filter(e => (e.healthScore ?? 100) >= 80).length, color: "#10b981" },
    { name: "Uyarı (50-79)", value: equipment.filter(e => (e.healthScore ?? 100) >= 50 && (e.healthScore ?? 100) < 80).length, color: "#f59e0b" },
    { name: "Kritik (<50)", value: equipment.filter(e => (e.healthScore ?? 100) < 50).length, color: "#ef4444" },
  ];

  // Fault status distribution
  const faultStatusData = [
    { name: "Beklemede", value: faults.filter(f => f.currentStage === "bekliyor").length, color: "#6366f1" },
    { name: "İşleme Alındı", value: faults.filter(f => f.currentStage === "isleme_alindi").length, color: "#3b82f6" },
    { name: "Devam Ediyor", value: faults.filter(f => f.currentStage === "devam_ediyor").length, color: "#eab308" },
    { name: "Çözüldü", value: faults.filter(f => f.currentStage === "kapatildi").length, color: "#10b981" },
  ].filter(item => item.value > 0);

  const avgResolutionTime = resolvedFaults > 0 
    ? Math.round(
        faults
          .filter(f => f.currentStage === "kapatildi" && f.createdAt && f.resolvedAt)
          .reduce((sum, f) => {
            const created = new Date(f.createdAt!).getTime();
            const resolved = new Date(f.resolvedAt!).getTime();
            return sum + (resolved - created) / (1000 * 60 * 60); // Convert to hours
          }, 0) / resolvedFaults
      ) 
    : 0;

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">
          Ekipman Analitiği
        </h1>
        <p className="text-muted-foreground mt-1">Arıza trendleri, performans metrikleri ve ekipman güvenilirliği analizi</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Toplam Arızalar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalFaults}</div>
            <p className="text-xs text-muted-foreground mt-1">Tüm kayıtlar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              Çözüm Oranı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{resolutionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">{resolvedFaults} çözüldü</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-warning" />
              Ort. Çözüm Süresi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgResolutionTime.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground mt-1">Kapalı arızalar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Kritik Arızalar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{faultsByPriority.kritik}</div>
            <p className="text-xs text-muted-foreground mt-1">Acil müdahale</p>
          </CardContent>
        </Card>
      </div>

      {/* Fault Priority Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
        <Card>
          <CardHeader>
            <CardTitle>Arıza Öncelik Dağılımı</CardTitle>
            <CardDescription>Tüm arızaların öncelik seviyesine göre yüzdesi</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "Kritik", value: faultsByPriority.kritik, fill: "#ef4444" },
                    { name: "Yüksek", value: faultsByPriority.yuksek, fill: "#f59e0b" },
                    { name: "Normal", value: faultsByPriority.normal, fill: "#3b82f6" },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  dataKey="value"
                >
                  <Cell fill="#ef4444" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#3b82f6" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ekipman Sağlık Durumu</CardTitle>
            <CardDescription>Sağlık skoruna göre ekipman dağılımı</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={healthDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {healthDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Fault Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Arıza Durum Dağılımı</CardTitle>
          <CardDescription>Açık, işleme alınan ve çözülen arızaların sayısı</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={faultStatusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Problem Equipment */}
      <Card>
        <CardHeader>
          <CardTitle>En Çok Arıza Yapan Ekipmanlar</CardTitle>
          <CardDescription>Açık arızası en yüksek ekipmanlar</CardDescription>
        </CardHeader>
        <CardContent>
          {equipmentFaultCounts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Tüm ekipmanlar sağlıklı</p>
          ) : (
            <div className="flex flex-col gap-3 sm:gap-4">
              {equipmentFaultCounts.map((eq) => (
                <div key={eq.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm" data-testid={`text-equipment-${eq.id}`}>
                      {eq.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sağlık skoru: {eq.health}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive">{eq.faults} açık arıza</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
