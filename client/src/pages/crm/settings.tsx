import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListSkeleton } from "@/components/list-skeleton";
import { Clock, Bell, Users, Settings } from "lucide-react";

interface FormSetting {
  id: number;
  branchId: number;
  isActive: boolean;
  [key: string]: any;
}

interface CRMSettingsData {
  formSettings: FormSetting[];
  slaThresholds: {
    defaultResponseHours: number;
    escalationHours: number;
    criticalResponseHours: number;
  };
  notificationRules: {
    lowRatingThreshold: number;
    autoAssignEnabled: boolean;
    escalationEnabled: boolean;
  };
  responsibilityMatrix: {
    temizlik: string;
    hizmet: string;
    urun: string;
    personel: string;
    guler_yuzluluk: string;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  temizlik: "Temizlik",
  hizmet: "Hizmet",
  urun: "Ürün",
  personel: "Personel",
  guler_yuzluluk: "Güler Yüzlülük",
};

const ROLE_LABELS: Record<string, string> = {
  supervisor: "Süpervizör",
  kalite_kontrol: "Kalite Kontrol",
  mudur: "Müdür",
  bireysel: "Bireysel",
};

export default function CRMSettings() {
  const { data, isLoading } = useQuery<CRMSettingsData>({
    queryKey: ["/api/crm/settings"],
  });

  if (isLoading) {
    return (
      <div className="p-4">
        <ListSkeleton count={4} variant="card" showHeader />
      </div>
    );
  }

  const sla = data?.slaThresholds;
  const notifications = data?.notificationRules;
  const matrix = data?.responsibilityMatrix;
  const forms = data?.formSettings || [];
  const activeForms = forms.filter((f) => f.isActive).length;
  const inactiveForms = forms.filter((f) => !f.isActive).length;

  return (
    <div className="p-3 flex flex-col gap-3 sm:gap-4" data-testid="crm-settings-page">
      <div>
        <h1 className="text-2xl font-bold" data-testid="heading-settings">Ayarlar</h1>
        <p className="text-sm text-muted-foreground">CRM sistem ayarları</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Card data-testid="card-sla-thresholds">
          <CardHeader className="flex flex-row items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-lg">SLA Eşikleri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Varsayılan Yanıt Süresi</span>
                <span className="text-sm font-medium" data-testid="text-default-response">{sla?.defaultResponseHours ?? "-"} saat</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Eskalasyon Süresi</span>
                <span className="text-sm font-medium" data-testid="text-escalation">{sla?.escalationHours ?? "-"} saat</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Kritik Yanıt Süresi</span>
                <span className="text-sm font-medium" data-testid="text-critical-response">{sla?.criticalResponseHours ?? "-"} saat</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-notification-rules">
          <CardHeader className="flex flex-row items-center gap-2">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-lg">Bildirim Kuralları</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Düşük Puan Eşiği</span>
                <span className="text-sm font-medium" data-testid="text-low-rating-threshold">{notifications?.lowRatingThreshold ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Otomatik Atama</span>
                <Badge variant={notifications?.autoAssignEnabled ? "default" : "secondary"} data-testid="badge-auto-assign">
                  {notifications?.autoAssignEnabled ? "Aktif" : "Pasif"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Eskalasyon</span>
                <Badge variant={notifications?.escalationEnabled ? "default" : "secondary"} data-testid="badge-escalation">
                  {notifications?.escalationEnabled ? "Aktif" : "Pasif"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-responsibility-matrix">
          <CardHeader className="flex flex-row items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-lg">Sorumluluk Matrisi</CardTitle>
          </CardHeader>
          <CardContent>
            {matrix ? (
              <div className="flex flex-col gap-3">
                {Object.entries(matrix).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between" data-testid={`row-matrix-${key}`}>
                    <span className="text-sm text-muted-foreground">{CATEGORY_LABELS[key] || key}</span>
                    <Badge variant="outline" data-testid={`badge-responsible-${key}`}>
                      {ROLE_LABELS[value] || value}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Veri yok</p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-form-settings">
          <CardHeader className="flex flex-row items-center gap-2">
            <Settings className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-lg">Form Ayarları</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Toplam Form</span>
                <span className="text-sm font-medium" data-testid="text-total-forms">{forms.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Aktif</span>
                <Badge className="bg-success/10 text-success" data-testid="badge-active-forms">{activeForms}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pasif</span>
                <Badge variant="secondary" data-testid="badge-inactive-forms">{inactiveForms}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}