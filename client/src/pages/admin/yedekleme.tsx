import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Database, 
  ArrowLeft, 
  Download, 
  Upload, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  HardDrive,
  RefreshCw,
  Calendar,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Activity,
  Server,
  RotateCcw
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface RestorePoint {
  backupId: string;
  timestamp: string;
  type: string;
}

interface BackupStatusData {
  lastBackup: {
    id: number;
    backupId: string;
    timestamp: string;
    success: boolean;
    backupType: string;
    durationMs: number;
    errorMessage: string | null;
    skippedTables: string[];
    failedTables: string[];
    errorSummary: string | null;
    tablesExported: number;
  } | null;
  minutesAgo: number | null;
  schedule: string;
  retention: { hourly: number; daily: number; manual: string };
  recentHistory: Array<{
    id: number;
    backupId: string;
    timestamp: string;
    success: boolean;
    backupType: string;
    durationMs: number;
    skippedCount: number;
    failedCount: number;
  }>;
}

export default function AdminYedekleme() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedRestorePoint, setSelectedRestorePoint] = useState<string | null>(null);

  if (user?.role !== "admin") {
    return <Redirect to="/" />;
  }

  const { data: backupStatusData } = useQuery<BackupStatusData>({
    queryKey: ["/api/system/backup-status"],
    refetchInterval: 60000,
  });

  const { data: restorePoints, isLoading: isLoadingPoints } = useQuery<RestorePoint[]>({
    queryKey: ["/api/system/restore-points"],
  });

  const backupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/system/backup");
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Yedekleme Tamamlandı", description: data.message || "Yedek başarıyla oluşturuldu" });
      queryClient.invalidateQueries({ queryKey: ["/api/system/restore-points"] });
      queryClient.invalidateQueries({ queryKey: ["/api/system/backup-status"] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Yedekleme sırasında hata oluştu", variant: "destructive" });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (backupId: string) => {
      const res = await apiRequest("POST", "/api/system/restore", { backupId });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Geri Yükleme Tamamlandı", description: `${data.tablesRestored?.length || 0} tablo, ${data.totalRecords || 0} kayıt geri yüklendi` });
      setSelectedRestorePoint(null);
      setIsRestoring(false);
    },
    onError: (error: any) => {
      toast({ title: "Geri Yükleme Hatası", description: error.message || "Geri yükleme sırasında hata oluştu", variant: "destructive" });
      setIsRestoring(false);
    },
  });

  const handleRestore = (backupId: string) => {
    if (!confirm("Bu geri yükleme noktasına dönmek istediğinizden emin misiniz? Bu işlem mevcut verilerin üzerine yazacaktır.")) return;
    setIsRestoring(true);
    setSelectedRestorePoint(backupId);
    restoreMutation.mutate(backupId);
  };

  const securityFeatures = [
    { label: "RBAC Yetkilendirme", status: "active", icon: Lock, description: "14 rol bazlı erişim kontrolü" },
    { label: "API Rate Limiting", status: "active", icon: Shield, description: "200 istek/dk genel, 20 istek/dk giriş" },
    { label: "Transaction Güvenliği", status: "active", icon: ShieldCheck, description: "Atomik fabrika işlemleri" },
    { label: "Otomatik Yedekleme", status: "active", icon: HardDrive, description: "53+ kritik tablo koruması" },
    { label: "Oturum Güvenliği", status: "active", icon: Activity, description: "Session tabanlı kimlik doğrulama" },
  ];

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Link href="/admin">
          <Button variant="ghost" size="icon" data-testid="button-back-admin">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Database className="h-5 w-5" />
            Yedekleme & Güvenlik
          </h1>
          <p className="text-sm text-muted-foreground">
            Sistem güvenliği ve yedekleme yönetimi
          </p>
        </div>
        <Button 
          onClick={() => backupMutation.mutate()} 
          disabled={backupMutation.isPending}
          data-testid="button-manual-backup"
        >
          {backupMutation.isPending ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Yedekleniyor...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Manuel Yedekle
            </>
          )}
        </Button>
      </div>

      <Card data-testid="card-backup-status">
        <CardContent className="p-4">
          {!backupStatusData ? (
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ) : (
          <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${backupStatusData.lastBackup?.success ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                {backupStatusData.lastBackup?.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" data-testid="icon-backup-success" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" data-testid="icon-backup-fail" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Son Yedekleme</p>
                {backupStatusData.lastBackup ? (
                  <div>
                    <p className="font-semibold" data-testid="text-backup-ago">
                      {backupStatusData.minutesAgo !== null
                        ? backupStatusData.minutesAgo < 60
                          ? `${backupStatusData.minutesAgo} dk önce`
                          : `${Math.round(backupStatusData.minutesAgo / 60)} saat önce`
                        : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground" data-testid="text-backup-time">
                      {format(new Date(backupStatusData.lastBackup.timestamp), "dd MMM yyyy HH:mm:ss", { locale: tr })}
                    </p>
                  </div>
                ) : (
                  <p className="font-semibold text-muted-foreground">Henüz yedek yok</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {backupStatusData.lastBackup && (
                <Badge variant="secondary" data-testid="badge-backup-type">
                  {backupStatusData.lastBackup.backupType === 'hourly' ? 'Saatlik' :
                   backupStatusData.lastBackup.backupType === 'daily' ? 'Günlük' :
                   backupStatusData.lastBackup.backupType === 'manual' ? 'Manuel' : backupStatusData.lastBackup.backupType}
                </Badge>
              )}
              <Badge variant={backupStatusData.lastBackup?.success ? "secondary" : "destructive"} data-testid="badge-backup-status">
                {backupStatusData.lastBackup?.success ? 'Başarılı' : 'Başarısız'}
              </Badge>
              {(backupStatusData.lastBackup?.skippedTables?.length ?? 0) > 0 && (
                <Badge variant="outline" data-testid="badge-skipped-tables">
                  {backupStatusData.lastBackup!.skippedTables.length} tablo atlandı
                </Badge>
              )}
              {(backupStatusData.lastBackup?.tablesExported ?? 0) > 0 && (
                <span className="text-xs text-muted-foreground" data-testid="text-tables-exported">
                  {backupStatusData.lastBackup!.tablesExported} tablo
                </span>
              )}
            </div>
          </div>
          {backupStatusData.lastBackup?.errorSummary && (
            <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded p-2" data-testid="text-error-summary">
              {backupStatusData.lastBackup.errorSummary}
            </div>
          )}
          <div className="mt-3 pt-3 border-t flex items-center justify-between gap-2 flex-wrap text-xs text-muted-foreground">
            <span>Zamanlama: Saatlik (RPO ≤ 1 saat)</span>
            <span>Saklama: {backupStatusData.retention.hourly} saatlik / {backupStatusData.retention.daily} günlük</span>
            <span>{restorePoints?.length || 0} geri yükleme noktası</span>
          </div>
          </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Güvenlik Durumu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {securityFeatures.map((feature, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border"
                data-testid={`security-feature-${index}`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <feature.icon className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{feature.label}</p>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-green-500/10 text-green-700">
                  Aktif
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Geri Yükleme Noktaları (Zaman Makinesi)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingPoints ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : restorePoints && restorePoints.length > 0 ? (
            <div className="space-y-2">
              {restorePoints.map((point) => (
                <div
                  key={point.backupId}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  data-testid={`restore-point-${point.backupId}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Calendar className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{point.backupId}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{format(new Date(point.timestamp), "dd MMM yyyy HH:mm", { locale: tr })}</span>
                        <span>-</span>
                        <span>{point.type === "auto" ? "Otomatik" : "Manuel"}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore(point.backupId)}
                    disabled={isRestoring}
                    data-testid={`button-restore-${point.backupId}`}
                  >
                    {isRestoring && selectedRestorePoint === point.backupId ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Geri Yükle
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Henüz geri yükleme noktası bulunmuyor</p>
              <p className="text-xs mt-1">Manuel yedekleme yaparak ilk geri yükleme noktanızı oluşturun</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
