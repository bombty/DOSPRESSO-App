import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import type { EquipmentFault } from "@shared/schema";

export default function FaultDashboard() {
  const { data: faults = [] } = useQuery<EquipmentFault[]>({
    queryKey: ["/api/faults"],
  });

  const criticalFaults = faults.filter(f => f.priority === "kritik" && f.status !== "çözüldü");
  const highFaults = faults.filter(f => f.priority === "yuksek" && f.status !== "çözüldü");
  const resolvedFaults = faults.filter(f => f.status === "çözüldü");
  const pendingFaults = faults.filter(f => f.status === "beklemede" || f.status === "yeni");

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "kritik":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "yuksek":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "normal":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "beklemede":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "devam_ediyor":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "çözüldü":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Arıza Panosu</h1>
        <p className="text-muted-foreground mt-2">Ekipman arızalarının gerçek zamanlı izlenmesi</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Kritik Arızalar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalFaults.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Acil müdahale gerekli</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" />
              Yüksek Öncelik
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{highFaults.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Kısa sürede çözülmeli</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              Beklemedeki
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingFaults.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Atanmayı bekleyen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Çözülmüş
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolvedFaults.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Toplam çözülen</p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Faults Alert */}
      {criticalFaults.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
          <CardHeader>
            <CardTitle className="text-red-900 dark:text-red-200 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Kritik Arızalar - Acil Dikkat Gerekli
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalFaults.map((fault) => (
                <div key={fault.id} className="flex items-center justify-between p-2 bg-white dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                  <div>
                    <p className="font-medium text-sm">{fault.equipmentName}</p>
                    <p className="text-xs text-muted-foreground">{fault.description}</p>
                  </div>
                  <Badge className={getPriorityColor(fault.priority)}>Kritik</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Faults */}
      <Card>
        <CardHeader>
          <CardTitle>Son Arızalar</CardTitle>
          <CardDescription>En son bildirilen ekipman arızaları</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {faults.slice(0, 10).map((fault) => (
              <div key={fault.id} className="flex items-center justify-between p-3 border rounded hover:bg-muted transition-colors">
                <div className="flex-1">
                  <p className="font-medium text-sm">{fault.equipmentName}</p>
                  <p className="text-xs text-muted-foreground mt-1">{fault.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(parseISO(fault.createdAt.toString()), "dd MMM HH:mm", { locale: tr })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge className={getPriorityColor(fault.priority)}>
                    {fault.priority === "kritik" ? "Kritik" : fault.priority === "yuksek" ? "Yüksek" : "Normal"}
                  </Badge>
                  <Badge className={getStatusColor(fault.status)}>
                    {fault.status === "beklemede" ? "Beklemede" : fault.status === "devam_ediyor" ? "Devam Ediyor" : "Çözüldü"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
