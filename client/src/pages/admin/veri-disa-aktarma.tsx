import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  FileSpreadsheet, 
  Archive, 
  Building2, 
  Users, 
  ClipboardCheck,
  Wrench,
  AlertTriangle,
  Bell,
  Calendar,
  Package,
  Truck,
  ShoppingCart,
  GraduationCap,
  Activity,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExportTable {
  id: string;
  name: string;
  nameTr: string;
  description: string;
  icon: React.ReactNode;
  endpoint: string;
  category: string;
}

const EXPORT_TABLES: ExportTable[] = [
  {
    id: "branches",
    name: "Branches",
    nameTr: "Şubeler",
    description: "Tüm şube bilgileri",
    icon: <Building2 className="h-5 w-5" />,
    endpoint: "/api/export/branches",
    category: "Organizasyon"
  },
  {
    id: "users",
    name: "Users",
    nameTr: "Kullanıcılar",
    description: "Personel ve kullanıcı listesi",
    icon: <Users className="h-5 w-5" />,
    endpoint: "/api/export/users",
    category: "Organizasyon"
  },
  {
    id: "tasks",
    name: "Tasks",
    nameTr: "Görevler",
    description: "Tüm görev kayıtları",
    icon: <ClipboardCheck className="h-5 w-5" />,
    endpoint: "/api/export/tasks",
    category: "Operasyon"
  },
  {
    id: "equipment",
    name: "Equipment",
    nameTr: "Ekipmanlar",
    description: "Ekipman envanteri",
    icon: <Wrench className="h-5 w-5" />,
    endpoint: "/api/export/equipment",
    category: "Operasyon"
  },
  {
    id: "faults",
    name: "Faults",
    nameTr: "Arızalar",
    description: "Arıza kayıtları",
    icon: <AlertTriangle className="h-5 w-5" />,
    endpoint: "/api/export/faults",
    category: "Operasyon"
  },
  {
    id: "checklists",
    name: "Checklists",
    nameTr: "Checklistler",
    description: "Checklist tanımları",
    icon: <ClipboardCheck className="h-5 w-5" />,
    endpoint: "/api/export/checklists",
    category: "Operasyon"
  },
  {
    id: "checklist-assignments",
    name: "Checklist Assignments",
    nameTr: "Checklist Atamaları",
    description: "Checklist atama kayıtları",
    icon: <ClipboardCheck className="h-5 w-5" />,
    endpoint: "/api/export/checklist-assignments",
    category: "Operasyon"
  },
  {
    id: "announcements",
    name: "Announcements",
    nameTr: "Duyurular",
    description: "Duyuru geçmişi",
    icon: <Bell className="h-5 w-5" />,
    endpoint: "/api/export/announcements",
    category: "İletişim"
  },
  {
    id: "shifts",
    name: "Shifts",
    nameTr: "Vardiyalar",
    description: "Vardiya planları",
    icon: <Calendar className="h-5 w-5" />,
    endpoint: "/api/export/shifts",
    category: "İK"
  },
  {
    id: "leave-requests",
    name: "Leave Requests",
    nameTr: "İzin Talepleri",
    description: "İzin talep kayıtları",
    icon: <Calendar className="h-5 w-5" />,
    endpoint: "/api/export/leave-requests",
    category: "İK"
  },
  {
    id: "inventory",
    name: "Inventory",
    nameTr: "Stok",
    description: "Stok durumu",
    icon: <Package className="h-5 w-5" />,
    endpoint: "/api/export/inventory",
    category: "Satınalma"
  },
  {
    id: "suppliers",
    name: "Suppliers",
    nameTr: "Tedarikçiler",
    description: "Tedarikçi bilgileri",
    icon: <Truck className="h-5 w-5" />,
    endpoint: "/api/export/suppliers",
    category: "Satınalma"
  },
  {
    id: "purchase-orders",
    name: "Purchase Orders",
    nameTr: "Siparişler",
    description: "Satınalma siparişleri",
    icon: <ShoppingCart className="h-5 w-5" />,
    endpoint: "/api/export/purchase-orders",
    category: "Satınalma"
  },
  {
    id: "training-modules",
    name: "Training Modules",
    nameTr: "Eğitim Modülleri",
    description: "Eğitim içerikleri",
    icon: <GraduationCap className="h-5 w-5" />,
    endpoint: "/api/export/training-modules",
    category: "Eğitim"
  },
  {
    id: "training-progress",
    name: "Training Progress",
    nameTr: "Eğitim İlerlemesi",
    description: "Personel eğitim durumu",
    icon: <GraduationCap className="h-5 w-5" />,
    endpoint: "/api/export/training-progress",
    category: "Eğitim"
  },
  {
    id: "notifications",
    name: "Notifications",
    nameTr: "Bildirimler",
    description: "Bildirim geçmişi",
    icon: <Bell className="h-5 w-5" />,
    endpoint: "/api/export/notifications",
    category: "İletişim"
  },
  {
    id: "maintenance-logs",
    name: "Maintenance Logs",
    nameTr: "Bakım Kayıtları",
    description: "Ekipman bakım geçmişi",
    icon: <Wrench className="h-5 w-5" />,
    endpoint: "/api/export/maintenance-logs",
    category: "Operasyon"
  },
  {
    id: "performance-metrics",
    name: "Performance Metrics",
    nameTr: "Performans Metrikleri",
    description: "Performans verileri",
    icon: <Activity className="h-5 w-5" />,
    endpoint: "/api/export/performance-metrics",
    category: "Analitik"
  }
];

const CATEGORIES = ["Organizasyon", "Operasyon", "İK", "Satınalma", "Eğitim", "İletişim", "Analitik"];

export default function VeriDisaAktarma() {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (table: ExportTable) => {
    setDownloading(table.id);
    try {
      const response = await fetch(table.endpoint, {
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error("İndirme başarısız");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${table.id}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "İndirme Tamamlandı",
        description: `${table.nameTr} verisi başarıyla indirildi.`
      });
    } catch (error) {
      toast({
        title: "Hata",
        description: "Veri indirirken bir hata oluştu.",
        variant: "destructive"
      });
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadAll = async () => {
    setDownloading("all");
    try {
      const response = await fetch("/api/export/all", {
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error("İndirme başarısız");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "dospresso_veriler.zip";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "İndirme Tamamlandı",
        description: "Tüm veriler ZIP dosyası olarak indirildi."
      });
    } catch (error) {
      toast({
        title: "Hata",
        description: "Veriler indirirken bir hata oluştu.",
        variant: "destructive"
      });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Veri Dışa Aktarma</h1>
          <p className="text-muted-foreground">
            Sistem verilerini CSV veya ZIP formatında indirin
          </p>
        </div>
        <Button 
          size="lg" 
          onClick={handleDownloadAll}
          disabled={downloading !== null}
          data-testid="button-download-all"
        >
          {downloading === "all" ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Archive className="mr-2 h-5 w-5" />
          )}
          Tümünü İndir (ZIP)
        </Button>
      </div>

      {CATEGORIES.map(category => {
        const tables = EXPORT_TABLES.filter(t => t.category === category);
        if (tables.length === 0) return null;
        
        return (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{category}</CardTitle>
              <CardDescription>
                {tables.length} tablo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {tables.map(table => (
                  <Card 
                    key={table.id} 
                    className="hover-elevate cursor-pointer"
                    data-testid={`card-export-${table.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-md bg-primary/10 text-primary">
                            {table.icon}
                          </div>
                          <div>
                            <p className="font-medium">{table.nameTr}</p>
                            <p className="text-xs text-muted-foreground">
                              {table.description}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDownload(table)}
                          disabled={downloading !== null}
                          data-testid={`button-download-${table.id}`}
                        >
                          {downloading === table.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">CSV Formatı</p>
              <p className="text-sm text-muted-foreground">
                İndirilen dosyalar UTF-8 BOM ile kodlanmış CSV formatındadır. 
                Excel, Google Sheets ve diğer tablolama programlarında açabilirsiniz.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
