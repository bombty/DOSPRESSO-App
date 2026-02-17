import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Wrench, ShieldCheck, AlertTriangle, Phone, Building2, Activity, CalendarDays, X } from "lucide-react";

interface QREquipmentDetailProps {
  equipmentId: string | number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return "-"; }
}

function formatCurrency(value: string | number | null | undefined): string {
  if (value == null) return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "-";
  return num.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";
}

function getHealthColor(score: number): string {
  if (score > 80) return "bg-green-500";
  if (score > 50) return "bg-yellow-500";
  return "bg-red-500";
}

function getHealthLabel(score: number): string {
  if (score > 80) return "İyi";
  if (score > 50) return "Orta";
  return "Kritik";
}

function getStatusBadge(status: string | null) {
  if (!status) return <Badge variant="outline">-</Badge>;
  const map: Record<string, { variant: "default" | "destructive" | "secondary" | "outline"; label: string }> = {
    open: { variant: "destructive", label: "Açık" },
    in_progress: { variant: "default", label: "İşlemde" },
    resolved: { variant: "secondary", label: "Çözüldü" },
    closed: { variant: "outline", label: "Kapatıldı" },
    pending: { variant: "outline", label: "Beklemede" },
  };
  const m = map[status] || { variant: "outline" as const, label: status };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

function getPriorityBadge(priority: string | null) {
  if (!priority) return null;
  const map: Record<string, { variant: "default" | "destructive" | "secondary" | "outline"; label: string }> = {
    critical: { variant: "destructive", label: "Kritik" },
    high: { variant: "destructive", label: "Yüksek" },
    medium: { variant: "default", label: "Orta" },
    low: { variant: "secondary", label: "Düşük" },
  };
  const m = map[priority] || { variant: "outline" as const, label: priority };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

export function QREquipmentDetail({ equipmentId, open, onOpenChange }: QREquipmentDetailProps) {
  const { data, isLoading, error } = useQuery<{
    equipment: any;
    faults: any[];
    maintenanceLogs: any[];
    healthScore: number;
  }>({
    queryKey: ["/api/qr/equipment", equipmentId],
    queryFn: async () => {
      const res = await fetch(`/api/qr/equipment/${equipmentId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Ekipman bilgisi alınamadı");
      return res.json();
    },
    enabled: !!equipmentId && open,
  });

  const eq = data?.equipment;
  const warrantyDaysLeft = eq?.warrantyEndDate
    ? Math.ceil((new Date(eq.warrantyEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="title-equipment-detail">
            <Wrench className="h-5 w-5" />
            Ekipman Detayı
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-3" data-testid="loading-equipment-detail">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {error && (
          <div className="text-center py-6 text-destructive" data-testid="error-equipment-detail">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Ekipman bilgisi yüklenemedi</p>
          </div>
        )}

        {data && eq && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Cihaz Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Tip</span>
                  <span className="font-medium text-right" data-testid="text-equipment-type">{eq.equipmentType || "-"}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Model</span>
                  <span className="font-medium text-right" data-testid="text-equipment-model">{eq.modelNo || "-"}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Seri No</span>
                  <span className="font-medium text-right" data-testid="text-equipment-serial">{eq.serialNumber || "-"}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Şube</span>
                  <span className="font-medium text-right" data-testid="text-equipment-branch">{eq.branchName || "-"}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Sağlık Durumu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-md flex items-center justify-center text-white font-bold text-sm ${getHealthColor(data.healthScore)}`} data-testid="badge-health-score">
                    {data.healthScore}
                  </div>
                  <div>
                    <p className="font-medium" data-testid="text-health-label">{getHealthLabel(data.healthScore)}</p>
                    <p className="text-xs text-muted-foreground">
                      {data.faults.filter((f: any) => f.status !== "resolved" && f.status !== "closed").length} açık arıza
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Garanti Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Satın Alma</span>
                  <span className="font-medium" data-testid="text-purchase-date">{formatDate(eq.purchaseDate)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Garanti Bitiş</span>
                  <span className="font-medium" data-testid="text-warranty-end">{formatDate(eq.warrantyEndDate)}</span>
                </div>
                {warrantyDaysLeft !== null && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Kalan Gün</span>
                    <Badge variant={warrantyDaysLeft > 0 ? "secondary" : "destructive"} data-testid="badge-warranty-days">
                      {warrantyDaysLeft > 0 ? `${warrantyDaysLeft} gün` : "Süresi dolmuş"}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {data.faults.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Son Arızalar
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Tarih</TableHead>
                        <TableHead className="text-xs">Açıklama</TableHead>
                        <TableHead className="text-xs">Durum</TableHead>
                        <TableHead className="text-xs">Öncelik</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.faults.slice(0, 5).map((fault: any) => (
                        <TableRow key={fault.id} data-testid={`row-fault-${fault.id}`}>
                          <TableCell className="text-xs whitespace-nowrap">{formatDate(fault.createdAt)}</TableCell>
                          <TableCell className="text-xs max-w-[120px] truncate">{fault.description || "-"}</TableCell>
                          <TableCell className="text-xs">{getStatusBadge(fault.status)}</TableCell>
                          <TableCell className="text-xs">{getPriorityBadge(fault.priority || fault.priorityLevel)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {data.maintenanceLogs.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Bakım Geçmişi
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Tarih</TableHead>
                        <TableHead className="text-xs">Tip</TableHead>
                        <TableHead className="text-xs">Teknisyen</TableHead>
                        <TableHead className="text-xs">Notlar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.maintenanceLogs.slice(0, 5).map((log: any) => (
                        <TableRow key={log.id} data-testid={`row-maintenance-${log.id}`}>
                          <TableCell className="text-xs whitespace-nowrap">{formatDate(log.performedAt)}</TableCell>
                          <TableCell className="text-xs">{log.maintenanceType || "-"}</TableCell>
                          <TableCell className="text-xs">{log.performedBy || "-"}</TableCell>
                          <TableCell className="text-xs max-w-[120px] truncate">{log.description || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {(eq.serviceCompany || eq.servicePhone || eq.serviceContactName) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Servis Bilgileri
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {eq.serviceCompany && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Firma</span>
                      <span className="font-medium" data-testid="text-service-company">{eq.serviceCompany}</span>
                    </div>
                  )}
                  {eq.servicePhone && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Telefon</span>
                      <a href={`tel:${eq.servicePhone}`} className="font-medium text-primary" data-testid="text-service-phone">{eq.servicePhone}</a>
                    </div>
                  )}
                  {eq.serviceContactName && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">İlgili Kişi</span>
                      <span className="font-medium" data-testid="text-service-contact">{eq.serviceContactName}</span>
                    </div>
                  )}
                  {eq.serviceEmail && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">E-posta</span>
                      <a href={`mailto:${eq.serviceEmail}`} className="font-medium text-primary" data-testid="text-service-email">{eq.serviceEmail}</a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-equipment-detail"
            >
              <X className="h-4 w-4 mr-2" />
              Kapat
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
