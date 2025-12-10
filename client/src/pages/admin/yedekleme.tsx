import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Calendar
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface BackupInfo {
  id: string;
  name: string;
  size: string;
  createdAt: string;
  type: "auto" | "manual";
  status: "completed" | "in_progress" | "failed";
}

const mockBackups: BackupInfo[] = [
  { id: "1", name: "backup_2024-12-10_03-00.sql", size: "45.2 MB", createdAt: new Date().toISOString(), type: "auto", status: "completed" },
  { id: "2", name: "backup_2024-12-09_03-00.sql", size: "44.8 MB", createdAt: new Date(Date.now() - 86400000).toISOString(), type: "auto", status: "completed" },
  { id: "3", name: "backup_manual_2024-12-08.sql", size: "44.5 MB", createdAt: new Date(Date.now() - 172800000).toISOString(), type: "manual", status: "completed" },
  { id: "4", name: "backup_2024-12-08_03-00.sql", size: "44.1 MB", createdAt: new Date(Date.now() - 259200000).toISOString(), type: "auto", status: "completed" },
];

export default function AdminYedekleme() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isBackingUp, setIsBackingUp] = useState(false);

  if (user?.role !== "admin") {
    return <Redirect to="/" />;
  }

  const backups = mockBackups;

  const handleManualBackup = async () => {
    setIsBackingUp(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsBackingUp(false);
    toast({ title: "Yedekleme tamamlandı", description: "Manuel yedek başarıyla oluşturuldu" });
  };

  const storageUsed = 178.6;
  const storageTotal = 500;
  const storagePercent = (storageUsed / storageTotal) * 100;

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Database className="h-5 w-5" />
            Yedekleme Yönetimi
          </h1>
          <p className="text-sm text-muted-foreground">
            Veritabanı yedeklerini yönetin
          </p>
        </div>
        <Button 
          onClick={handleManualBackup} 
          disabled={isBackingUp}
          data-testid="button-manual-backup"
        >
          {isBackingUp ? (
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

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Son Yedek</p>
                <p className="font-semibold">Bugün 03:00</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Otomatik Yedek</p>
                <p className="font-semibold">Her gün 03:00</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Depolama Kullanımı
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{storageUsed} MB kullanılıyor</span>
              <span className="text-muted-foreground">{storageTotal} MB</span>
            </div>
            <Progress value={storagePercent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              %{storagePercent.toFixed(1)} dolu - {(storageTotal - storageUsed).toFixed(1)} MB boş alan
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Yedek Geçmişi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {backups.map((backup) => (
              <div
                key={backup.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                data-testid={`backup-item-${backup.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${backup.status === "completed" ? "bg-green-500/10" : "bg-yellow-500/10"}`}>
                    {backup.status === "completed" ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{backup.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{backup.size}</span>
                      <span>•</span>
                      <span>{format(new Date(backup.createdAt), "dd MMM yyyy HH:mm", { locale: tr })}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={backup.type === "auto" ? "secondary" : "outline"}>
                    {backup.type === "auto" ? "Otomatik" : "Manuel"}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
