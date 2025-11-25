import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, CheckCircle2, Zap } from "lucide-react";
import { format, parseISO, differenceInHours } from "date-fns";
import { tr } from "date-fns/locale";
import type { EquipmentFault } from "@shared/schema";

export default function SLADashboard() {
  const { data: faults = [] } = useQuery<EquipmentFault[]>({
    queryKey: ["/api/faults"],
  });

  // Filter faults by SLA status
  const breachedFaults = faults.filter(f => f.slaBreached && f.currentStage !== "kapatildi");
  const atRiskFaults = faults.filter(f => {
    if (f.slaBreached || f.currentStage === "kapatildi") return false;
    if (!f.createdAt) return false;
    const hoursSinceCreation = differenceInHours(new Date(), new Date(f.createdAt));
    // At risk: critical faults open > 2 hours, or high priority > 4 hours
    return (f.priority === "kritik" && hoursSinceCreation > 2) ||
           (f.priority === "yuksek" && hoursSinceCreation > 4);
  });
  const healthyFaults = faults.filter(f => 
    !f.slaBreached && 
    f.currentStage !== "kapatildi" &&
    !atRiskFaults.find(af => af.id === f.id)
  );
  const resolvedFaults = faults.filter(f => f.currentStage === "kapatildi");

  const getTimeSinceCreation = (createdAt: any) => {
    if (!createdAt) return "-";
    const hours = differenceInHours(new Date(), new Date(createdAt));
    if (hours < 1) return "< 1 saat";
    if (hours < 24) return `${hours} saat`;
    return `${Math.floor(hours / 24)} gün`;
  };

  const getSLAStatus = (fault: EquipmentFault) => {
    if (fault.slaBreached) return { label: "SLA İhlali", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" };
    if (!fault.createdAt) return { label: "Bilinmiyor", color: "bg-gray-100 text-gray-800" };
    
    const hoursSinceCreation = differenceInHours(new Date(), new Date(fault.createdAt));
    if (fault.priority === "kritik" && hoursSinceCreation > 1.5) {
      return { label: "Risk Altında", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" };
    }
    if (fault.priority === "yuksek" && hoursSinceCreation > 3.5) {
      return { label: "Risk Altında", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" };
    }
    return { label: "Sağlıklı", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" };
  };

  const getSLAThreshold = (priority: string | null) => {
    if (priority === "kritik") return "2 saat";
    if (priority === "yuksek") return "4 saat";
    return "24 saat";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">
          SLA Durumu
        </h1>
        <p className="text-muted-foreground mt-1">
          Arıza çözüm süresi hedeflerini izleyin ve SLA ihlallerini yönetin
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              SLA İhlali
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{breachedFaults.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Acil müdahale gerekli</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-600" />
              Risk Altında
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{atRiskFaults.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Çok yakında sınıra ulaşacak</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-green-600" />
              Sağlıklı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{healthyFaults.length}</div>
            <p className="text-xs text-muted-foreground mt-1">SLA içinde çözülüyor</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              Çözüldü
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{resolvedFaults.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Toplam çözülen</p>
          </CardContent>
        </Card>
      </div>

      {/* SLA Breached Faults */}
      {breachedFaults.length > 0 && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              SLA İhlali Yapan Arızalar ({breachedFaults.length})
            </CardTitle>
            <CardDescription className="text-red-700 dark:text-red-300">
              Bu arızaların yanıt süresi hedefi aşılmıştır - hemen harekete geçilmesi gerekiyor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {breachedFaults.map((fault) => (
                <div
                  key={fault.id}
                  className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-red-300 dark:border-red-700"
                  data-testid={`sla-breach-fault-${fault.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">Arıza #{fault.id}</p>
                      <p className="text-xs text-muted-foreground mt-1">{fault.equipmentName}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="destructive">{fault.priority === "kritik" ? "Kritik" : "Yüksek"}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {getTimeSinceCreation(fault.createdAt)} önce açıldı (Limit: {getSLAThreshold(fault.priority)})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* At Risk Faults */}
      {atRiskFaults.length > 0 && (
        <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950">
          <CardHeader>
            <CardTitle className="text-orange-600 dark:text-orange-400 flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Risk Altında Olan Arızalar ({atRiskFaults.length})
            </CardTitle>
            <CardDescription className="text-orange-700 dark:text-orange-300">
              Bu arızalar SLA sınırına yaklaşıyor - derhal atama ve müdahale gerekli
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {atRiskFaults.map((fault) => (
                <div
                  key={fault.id}
                  className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-orange-300 dark:border-orange-700"
                  data-testid={`at-risk-fault-${fault.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">Arıza #{fault.id}</p>
                      <p className="text-xs text-muted-foreground mt-1">{fault.equipmentName}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                          {fault.priority === "kritik" ? "Kritik" : "Yüksek"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {getTimeSinceCreation(fault.createdAt)} (Limit: {getSLAThreshold(fault.priority)})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Healthy Faults */}
      {healthyFaults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              SLA İçinde Olan Arızalar ({healthyFaults.length})
            </CardTitle>
            <CardDescription>Çözüm süresi hedefi içinde kalan arızalar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {healthyFaults.slice(0, 10).map((fault) => (
                <div
                  key={fault.id}
                  className="flex items-center justify-between p-2 text-sm bg-green-50 dark:bg-green-950 rounded"
                  data-testid={`healthy-fault-${fault.id}`}
                >
                  <span>
                    Arıza #{fault.id} - {fault.equipmentName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {getTimeSinceCreation(fault.createdAt)} (Limit: {getSLAThreshold(fault.priority)})
                  </span>
                </div>
              ))}
              {healthyFaults.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  +{healthyFaults.length - 10} daha
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {faults.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Henüz arıza yok</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
