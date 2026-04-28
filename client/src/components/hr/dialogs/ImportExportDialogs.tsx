/**
 * Import/Export Dialogs — Toplu personel içe/dışa aktarım
 * Extracted from ik.tsx for maintainability
 */
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { type User, isHQRole } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import {
  Download, Upload, FileSpreadsheet, CheckCircle, XCircle,
  SkipForward, AlertCircle, RotateCcw, Eye, Info, Undo2, FileDown, Copy,
  AlertTriangle, ChevronDown, Clock, Edit, File, UserX
} from "lucide-react";
import { format } from "date-fns";
import { ROLE_LABELS } from "@/lib/turkish-labels";

export function ExportEmployeesDialog({
  open,
  onOpenChange,
  branches,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: { id: number; name: string }[];
}) {
  const { toast } = useToast();
  const [scope, setScope] = useState("all");
  const [selectedBranches, setSelectedBranches] = useState<number[]>([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [titleFilter, setTitleFilter] = useState("");
  const [hireDateFrom, setHireDateFrom] = useState("");
  const [hireDateTo, setHireDateTo] = useState("");
  const [exportType, setExportType] = useState("list");
  const [isExporting, setIsExporting] = useState(false);

  const regularBranches = branches.filter(b => b.id !== 23 && b.id !== 24);

  const { data: titlesData } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/admin/titles"],
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/hr/employees/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          scope,
          branchIds: scope === "branch" ? selectedBranches : undefined,
          roleFilter: roleFilter || undefined,
          statusFilter: statusFilter || undefined,
          titleFilter: titleFilter || undefined,
          hireDateFrom: hireDateFrom || undefined,
          hireDateTo: hireDateTo || undefined,
          exportType,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Export hatası");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dospresso_personel_${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({ title: "Başarılı", description: "Excel dosyası indirildi" });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Excel Dışa Aktar
          </DialogTitle>
          <DialogDescription>Personel verilerini Excel olarak indirin</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Kapsam</label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger data-testid="select-export-scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="hq">Merkez (HQ)</SelectItem>
                <SelectItem value="factory">Fabrika</SelectItem>
                <SelectItem value="branch">Şubeler</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scope === "branch" && (
            <div>
              <label className="text-sm font-medium">Şubeler</label>
              <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1 mt-1">
                {regularBranches.map((branch) => (
                  <label key={branch.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={selectedBranches.includes(branch.id)}
                      onCheckedChange={(checked) => {
                        setSelectedBranches(prev =>
                          checked ? [...prev, branch.id] : prev.filter(id => id !== branch.id)
                        );
                      }}
                    />
                    {branch.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Rol Filtre</label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger data-testid="select-export-role">
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_roles">Tümü</SelectItem>
                  {Object.entries(ROLE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Durum</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-export-status">
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_statuses">Tümü</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Unvan Filtre</label>
            <Select value={titleFilter} onValueChange={setTitleFilter}>
              <SelectTrigger data-testid="select-export-title">
                <SelectValue placeholder="Tümü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_titles">Tümü</SelectItem>
                {titlesData?.map((t) => (
                  <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">İşe Giriş Başlangıç</label>
              <Input
                type="date"
                value={hireDateFrom}
                onChange={(e) => setHireDateFrom(e.target.value)}
                data-testid="input-hire-date-from"
              />
            </div>
            <div>
              <label className="text-sm font-medium">İşe Giriş Bitiş</label>
              <Input
                type="date"
                value={hireDateTo}
                onChange={(e) => setHireDateTo(e.target.value)}
                data-testid="input-hire-date-to"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Export Tipi</label>
            <Select value={exportType} onValueChange={setExportType}>
              <SelectTrigger data-testid="select-export-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="list">Liste Export (tek sayfa)</SelectItem>
                <SelectItem value="detailed">Tam Detay (7 sayfa)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {exportType === "detailed" ? "Personel, istihdam, izinler, maaş, disiplin, özlük belgeleri ve ayrılışlar ayrı sayfalarda" : "Tüm personel bilgileri tek sayfada"}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={handleExport} disabled={isExporting} data-testid="button-do-export">
            {isExporting ? "İndiriliyor..." : "Excel İndir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function classifyError(err: any): "unauthorized" | "forbidden" | "network" | "generic" {
  const msg = err?.message || "";
  const status = err?.status || err?.statusCode;
  if (status === 401 || msg.includes("401")) return "unauthorized";
  if (status === 403 || msg.includes("403")) return "forbidden";
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("ERR_")) return "network";
  return "generic";
}

function BatchDetailSkeleton() {
  return (
    <div className="space-y-4 mt-4" data-testid="skeleton-batch-detail">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-2 border rounded-md text-center space-y-1">
            <Skeleton className="h-6 w-10 mx-auto" />
            <Skeleton className="h-3 w-14 mx-auto" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-40" />
      </div>
    </div>
  );
}

export function BatchDetailSheet({
  batchId,
  open,
  onOpenChange,
  onDownloadErrorReport,
  userRole,
}: {
  batchId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownloadErrorReport: (batchId: number) => void | Promise<void>;
  userRole?: string;
}) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showRollbackConfirm, setShowRollbackConfirm] = useState(false);

  const { data: detail, isLoading, error } = useQuery<{ batch: any; results: any[] }>({
    queryKey: ["/api/hr/employees/import/batches", batchId],
    enabled: open && batchId !== null,
  });

  useEffect(() => {
    if (error) {
      const errType = classifyError(error);
      if (errType === "unauthorized") {
        toast({ title: "Oturum Süresi Doldu", description: "Lütfen tekrar giriş yapın.", variant: "destructive" });
        setLocation("/login");
      }
    }
  }, [error]);

  const rollbackMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/hr/employees/import/${id}/rollback`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Geri Alındı", description: data.message || `${data.rolledBack} kayıt geri alındı.` });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/employees/import/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/employees/import/batches", batchId] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setShowRollbackConfirm(false);
    },
    onError: (err: any) => {
      const errType = classifyError(err);
      if (errType === "unauthorized") {
        toast({ title: "Oturum Süresi Doldu", description: "Lütfen tekrar giriş yapın.", variant: "destructive" });
        setLocation("/login");
      } else if (errType === "forbidden") {
        toast({ title: "Yetkisiz İşlem", description: "Geri alma yetkiniz yok.", variant: "destructive" });
      } else if (errType === "network") {
        toast({ title: "Bağlantı Hatası", description: "Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.", variant: "destructive" });
      } else {
        toast({ title: "Hata", description: err.message || "Geri alma sırasında hata oluştu.", variant: "destructive" });
      }
      setShowRollbackConfirm(false);
    },
  });

  const handleDownloadSkipped = async () => {
    try {
      if (!detail?.results) return;
      const skipped = detail.results.filter((r: any) => r.status === "skip");
      if (skipped.length === 0) {
        toast({ title: "Bilgi", description: "Atlanan satır bulunamadı." });
        return;
      }
      const csvHeader = "Satır No;Personel ID;Mesaj\n";
      const csvRows = skipped.map((r: any) => `${r.rowNumber};"${r.employeeId || ""}";"${(r.message || "").replace(/"/g, '""')}"`).join("\n");
      const blob = new Blob(["\uFEFF" + csvHeader + csvRows], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `atlanan_satirlar_batch_${batchId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast({ title: "İndirme Hatası", description: "Atlanan satırlar dosyası oluşturulurken hata oluştu.", variant: "destructive" });
    }
  };

  const handleDownloadErrorReport = async (id: number) => {
    try {
      await onDownloadErrorReport(id);
    } catch {
      toast({ title: "İndirme Hatası", description: "Hata raporu indirilemedi.", variant: "destructive" });
    }
  };

  const batch = detail?.batch;
  const results = detail?.results || [];

  const modeLabels: Record<string, string> = {
    upsert: "Upsert",
    append: "AddOnly",
    update: "UpdateOnly",
    deactivate_missing: "DeactivateMissing",
  };

  const statusLabel = (status: string) => {
    if (status === "completed") return { text: "Tamamlandı", variant: "default" as const };
    if (status === "failed") return { text: "Hata", variant: "destructive" as const };
    if (status === "rolled_back") return { text: "Geri Alındı", variant: "outline" as const };
    if (status === "reverted") return { text: "Geri Alındı", variant: "outline" as const };
    if (status === "processing") return { text: "İşleniyor", variant: "secondary" as const };
    return { text: status, variant: "secondary" as const };
  };

  const canRollback = batch && batch.status === "completed" && !batch.rolledBackAt
    && (userRole === "admin" || isHQRole(userRole as any))
    && differenceInDays(new Date(), new Date(batch.createdAt)) <= 7;

  const daysLeft = batch ? 7 - differenceInDays(new Date(), new Date(batch.createdAt)) : 0;

  const errorBanner = (() => {
    if (!error) return null;
    const errType = classifyError(error);
    if (errType === "unauthorized") return null;
    const msg = errType === "forbidden"
      ? "Bu batch detayını görüntüleme yetkiniz yok."
      : errType === "network"
        ? "Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin."
        : "Detay yüklenirken hata oluştu. Lütfen tekrar deneyin.";
    return (
      <div className="flex items-center gap-2 p-3 mt-4 rounded-md bg-destructive/10 text-destructive text-sm" data-testid="batch-detail-error">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        <span>{msg}</span>
      </div>
    );
  })();

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto" data-testid="sheet-batch-detail">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Import Detayı #{batchId}
            </SheetTitle>
            <SheetDescription>Import işlemi detayları ve aksiyon seçenekleri</SheetDescription>
          </SheetHeader>

          {isLoading && <BatchDetailSkeleton />}

          {errorBanner}

          {batch && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">Batch ID</p>
                  <p className="text-sm font-medium" data-testid="text-batch-id">{batch.id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">Tarih</p>
                  <p className="text-sm" data-testid="text-batch-date">
                    {batch.createdAt ? format(new Date(batch.createdAt), "dd.MM.yyyy HH:mm") : "-"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">Mod</p>
                  <Badge variant="outline" className="text-[10px]" data-testid="text-batch-mode">{modeLabels[batch.mode] || batch.mode}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">Eşleştirme Anahtarı</p>
                  <p className="text-sm" data-testid="text-batch-matchkey">{batch.matchKey || "username"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">Durum</p>
                  <Badge variant={statusLabel(batch.status).variant} data-testid="text-batch-status">{statusLabel(batch.status).text}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">Dosya</p>
                  <p className="text-sm truncate" title={batch.fileName || "-"} data-testid="text-batch-filename">{batch.fileName || "-"}</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-[11px] text-muted-foreground">İşlemi Yapan</p>
                  <p className="text-sm" data-testid="text-batch-createdby">{batch.createdByName || "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                <Card className="p-2 text-center">
                  <p className="text-lg font-bold text-green-600" data-testid="stat-created">{batch.createdCount ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Oluşturulan</p>
                </Card>
                <Card className="p-2 text-center">
                  <p className="text-lg font-bold text-blue-600" data-testid="stat-updated">{batch.updatedCount ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Güncellenen</p>
                </Card>
                <Card className="p-2 text-center">
                  <p className="text-lg font-bold text-muted-foreground" data-testid="stat-skipped">{batch.skippedCount ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Atlanan</p>
                </Card>
                <Card className="p-2 text-center">
                  <p className={`text-lg font-bold ${(batch.errorCount ?? 0) > 0 ? "text-red-600" : "text-muted-foreground"}`} data-testid="stat-errors">{batch.errorCount ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Hata</p>
                </Card>
              </div>

              {(batch.deactivatedCount ?? 0) > 0 && (
                <Card className="p-2 text-center">
                  <p className="text-lg font-bold text-orange-600" data-testid="stat-deactivated">{batch.deactivatedCount}</p>
                  <p className="text-[10px] text-muted-foreground">Deaktif Edilen</p>
                </Card>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium">Raporlar</p>
                <div className="flex flex-wrap gap-2">
                  {(batch.errorCount ?? 0) > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadErrorReport(batch.id)}
                      data-testid="button-download-error-report"
                    >
                      <FileDown className="mr-1 h-3 w-3" />
                      Hata Raporu İndir
                    </Button>
                  )}
                  {(batch.skippedCount ?? 0) > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownloadSkipped}
                      data-testid="button-download-skipped"
                    >
                      <FileDown className="mr-1 h-3 w-3" />
                      Atlanan Satırlar İndir
                    </Button>
                  )}
                  {(batch.errorCount ?? 0) === 0 && (batch.skippedCount ?? 0) === 0 && (
                    <p className="text-xs text-muted-foreground">İndirilecek rapor yok.</p>
                  )}
                </div>
              </div>

              {results.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">İşlem Detayları ({results.length} satır)</p>
                  <div className="max-h-52 overflow-y-auto border rounded-md">
                    <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[11px] w-14">Satır</TableHead>
                          <TableHead className="text-[11px]">Durum</TableHead>
                          <TableHead className="text-[11px]">Mesaj</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.map((r: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs py-1">{r.rowNumber}</TableCell>
                            <TableCell className="text-xs py-1">
                              <Badge
                                variant={r.status === "error" ? "destructive" : r.status === "create" ? "default" : r.status === "update" ? "secondary" : "outline"}
                                className="text-[10px]"
                              >
                                {r.status === "error" ? "Hata" : r.status === "create" ? "Yeni" : r.status === "update" ? "Güncellendi" : r.status === "skip" ? "Atlandı" : r.status === "deactivate" ? "Deaktif" : r.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs py-1 text-muted-foreground max-w-[200px] truncate" title={r.message}>{r.message || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </div>
                  </div>
                </div>
              )}

              {canRollback && (
                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Bu importu geri almak için <strong>{daysLeft} gün</strong> kaldı.
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowRollbackConfirm(true)}
                    disabled={rollbackMutation.isPending}
                    data-testid="button-rollback-batch"
                  >
                    <Undo2 className="mr-1 h-3 w-3" />
                    Bu İmportu Geri Al
                  </Button>
                </div>
              )}

              {(batch.status === "rolled_back" || batch.status === "reverted") && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-muted text-sm text-muted-foreground">
                  <RotateCcw className="h-4 w-4 flex-shrink-0" />
                  <span>Bu import {batch.rolledBackAt ? format(new Date(batch.rolledBackAt), "dd.MM.yyyy HH:mm") + " tarihinde" : ""} geri alınmıştır.</span>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={showRollbackConfirm} onOpenChange={setShowRollbackConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>İmportu Geri Al</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem, batch #{batchId} ile yapılan tüm değişiklikleri geri alacaktır:
              oluşturulan kayıtlar silinecek, güncellenen kayıtlar önceki haline döndürülecek.
              Bu işlem geri alınamaz. Devam etmek istiyor musunuz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rollbackMutation.isPending} data-testid="button-rollback-cancel">İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => batchId && rollbackMutation.mutate(batchId)}
              disabled={rollbackMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-rollback-confirm"
            >
              {rollbackMutation.isPending ? "Geri alınıyor..." : "Evet, Geri Al"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function BatchListSkeleton() {
  return (
    <div className="space-y-1 py-1" data-testid="skeleton-batch-list">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 py-2 px-1">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function ImportBatchHistory({ onDownloadErrorReport, userRole }: { onDownloadErrorReport: (batchId: number) => void | Promise<void>; userRole?: string }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const { data: batches, isLoading, error: fetchError } = useQuery<any[]>({
    queryKey: ["/api/hr/employees/import/batches"],
    enabled: expanded,
  });

  useEffect(() => {
    if (fetchError) {
      const errType = classifyError(fetchError);
      if (errType === "unauthorized") {
        toast({ title: "Oturum Süresi Doldu", description: "Lütfen tekrar giriş yapın.", variant: "destructive" });
        setLocation("/login");
      } else if (errType === "network") {
        toast({ title: "Bağlantı Hatası", description: "Sunucuya ulaşılamadı.", variant: "destructive" });
      }
    }
  }, [fetchError]);

  const modeLabels: Record<string, string> = {
    upsert: "Upsert",
    append: "AddOnly",
    update: "UpdateOnly",
    deactivate_missing: "DeactivateMissing",
  };

  const statusBadge = (status: string) => {
    if (status === "completed") return <Badge variant="default" className="text-[10px]">Tamamlandı</Badge>;
    if (status === "failed") return <Badge variant="destructive" className="text-[10px]">Hata</Badge>;
    if (status === "rolled_back" || status === "reverted") return <Badge variant="outline" className="text-[10px]">Geri Alındı</Badge>;
    return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
  };

  const fetchErrorBanner = (() => {
    if (!fetchError) return null;
    const errType = classifyError(fetchError);
    if (errType === "unauthorized") return null;
    const msg = errType === "forbidden"
      ? "Import geçmişini görüntüleme yetkiniz yok."
      : errType === "network"
        ? "Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin."
        : "Geçmiş yüklenirken hata oluştu.";
    return (
      <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-xs" data-testid="batch-list-error">
        <AlertCircle className="h-3 w-3 flex-shrink-0" />
        <span>{msg}</span>
      </div>
    );
  })();

  return (
    <div className="border rounded-md">
      <button
        type="button"
        className="flex items-center justify-between gap-2 w-full p-3 text-sm font-medium text-left hover-elevate rounded-md"
        onClick={() => setExpanded(!expanded)}
        data-testid="button-toggle-batch-history"
      >
        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Geçmiş Importlar
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <div className="px-3 pb-3">
          {isLoading ? (
            <BatchListSkeleton />
          ) : fetchErrorBanner ? (
            fetchErrorBanner
          ) : !batches || batches.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2" data-testid="text-no-batch-history">Henüz import geçmişi yok.</p>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Tarih</TableHead>
                    <TableHead className="text-xs">Mod</TableHead>
                    <TableHead className="text-xs">MatchKey</TableHead>
                    <TableHead className="text-xs text-center">Created</TableHead>
                    <TableHead className="text-xs text-center">Updated</TableHead>
                    <TableHead className="text-xs text-center">Skipped</TableHead>
                    <TableHead className="text-xs text-center">Errors</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((b: any) => (
                    <TableRow
                      key={b.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => setSelectedBatchId(b.id)}
                      data-testid={`row-batch-${b.id}`}
                    >
                      <TableCell className="text-xs py-1 whitespace-nowrap">
                        {b.createdAt ? new Date(b.createdAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "-"}
                      </TableCell>
                      <TableCell className="text-xs py-1">
                        <Badge variant="outline" className="text-[10px]">{modeLabels[b.mode] || b.mode}</Badge>
                      </TableCell>
                      <TableCell className="text-xs py-1">
                        <span className="text-[10px] text-muted-foreground">{b.matchKey || "username"}</span>
                      </TableCell>
                      <TableCell className="text-xs py-1 text-center">
                        <span className="text-green-600">{b.createdCount ?? "-"}</span>
                      </TableCell>
                      <TableCell className="text-xs py-1 text-center">
                        <span className="text-blue-600">{b.updatedCount ?? "-"}</span>
                      </TableCell>
                      <TableCell className="text-xs py-1 text-center">
                        <span className="text-muted-foreground">{b.skippedCount ?? "-"}</span>
                      </TableCell>
                      <TableCell className="text-xs py-1 text-center">
                        <span className={b.errorCount > 0 ? "text-red-600 font-medium" : "text-muted-foreground"}>{b.errorCount ?? "-"}</span>
                      </TableCell>
                      <TableCell className="text-xs py-1">{statusBadge(b.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </div>
          )}
        </div>
      )}

      <BatchDetailSheet
        batchId={selectedBatchId}
        open={selectedBatchId !== null}
        onOpenChange={(open) => { if (!open) setSelectedBatchId(null); }}
        onDownloadErrorReport={onDownloadErrorReport}
        userRole={userRole}
      />
    </div>
  );
}

export function ImportEmployeesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<"upload" | "preview" | "review" | "config" | "dryrun" | "result">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState("upsert");
  const [matchKey, setMatchKey] = useState("username");
  const [dryRunResult, setDryRunResult] = useState<any>(null);
  const [applyResult, setApplyResult] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deactivateConfirmation, setDeactivateConfirmation] = useState("");
  const [continueWithValid, setContinueWithValid] = useState(false);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [validationResult, setValidationResult] = useState<any>(null);
  const [reviewFilter, setReviewFilter] = useState<"all" | "error" | "warning" | "duplicate" | "conflict">("all");
  const [skipInvalid, setSkipInvalid] = useState(false);

  const SYSTEM_FIELD_LABELS: Record<string, string> = {
    username: "Kullanıcı Adı",
    firstName: "Ad",
    lastName: "Soyad",
    email: "E-posta",
    role: "Rol",
    branchId: "Şube ID",
    tckn: "TC Kimlik No",
    gender: "Cinsiyet",
    maritalStatus: "Medeni Hal",
    hireDate: "İşe Giriş",
    probationEndDate: "Deneme Bitiş",
    birthDate: "Doğum Tarihi",
    phoneNumber: "Telefon",
    homePhone: "Ev Telefon",
    emergencyContactName: "Acil Kişi",
    emergencyContactPhone: "Acil Telefon",
    address: "Adres",
    city: "Şehir",
    department: "Departman",
    employmentType: "Çalışma Tipi",
    weeklyHours: "Haftalık Saat",
    educationLevel: "Eğitim Seviye",
    educationStatus: "Eğitim Durum",
    educationInstitution: "Eğitim Kurum",
    militaryStatus: "Askerlik",
    contractType: "Sözleşme Tipi",
    numChildren: "Çocuk Sayısı",
    disabilityLevel: "Engel Durumu",
    netSalary: "Net Maaş",
    mealAllowance: "Yemek Yardımı",
    transportAllowance: "Ulaşım Yardımı",
    bonusBase: "Prim Matrah",
    notes: "Notlar",
    password: "Şifre",
    titleName: "Ünvan",
    titleId: "Ünvan ID",
    category: "Kategori",
  };
  const REQUIRED_IMPORT_FIELDS = ["username", "firstName", "lastName"];

  const toBackendMapping = (mapping: Record<string, string>): Record<string, string> => {
    const result: Record<string, string> = {};
    for (const [sysField, excelHeader] of Object.entries(mapping)) {
      if (excelHeader === "__skip__") {
        const headers = previewData?.headers || [];
        const autoH = headers.find((h: any) => h.mappedTo === sysField);
        if (autoH) result[autoH.header] = "__skip__";
      } else {
        result[excelHeader] = sysField;
      }
    }
    return result;
  };

  const unmappedRequiredFields = REQUIRED_IMPORT_FIELDS.filter(f => columnMapping[f] === "__skip__");
  const hasRequiredFieldIssue = unmappedRequiredFields.length > 0;

  const resetState = () => {
    setStep("upload");
    setFile(null);
    setMode("upsert");
    setMatchKey("username");
    setDryRunResult(null);
    setApplyResult(null);
    setPreviewData(null);
    setDeactivateConfirmation("");
    setContinueWithValid(false);
    setColumnMapping({});
    setValidationResult(null);
    setReviewFilter("all");
    setSkipInvalid(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", f);
      const response = await fetch("/api/hr/employees/import/preview", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Dosya okunamadı");
      }
      const data = await response.json();
      setPreviewData(data);
      const initialMapping: Record<string, string> = {};
      data.headers?.forEach((h: any) => {
        if (h.mappedTo && data.systemFields?.includes(h.mappedTo)) {
          initialMapping[h.mappedTo] = h.header;
        }
      });
      setColumnMapping(initialMapping);
      setStep("preview");
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDryRun = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", mode);
      formData.append("matchKey", matchKey);
      if (Object.keys(columnMapping).length > 0) {
        formData.append("columnMapping", JSON.stringify(toBackendMapping(columnMapping)));
      }

      const response = await fetch("/api/hr/employees/import/dry-run", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Simülasyon hatası");
      }

      const result = await response.json();
      setDryRunResult(result);
      setStep("dryrun");
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", mode);
      formData.append("matchKey", matchKey);
      formData.append("continueWithValid", String(continueWithValid));
      if (Object.keys(columnMapping).length > 0) {
        formData.append("columnMapping", JSON.stringify(toBackendMapping(columnMapping)));
      }
      if (mode === "deactivate_missing") {
        formData.append("deactivateConfirmation", deactivateConfirmation);
      }

      const response = await fetch("/api/hr/employees/import/apply", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Import hatası");
      }

      const result = await response.json();

      if (result.blocked) {
        toast({
          title: "Hatalı Satırlar",
          description: result.message,
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      setApplyResult(result);
      setStep("result");
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch("/api/hr/employees/import/template", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Şablon indirilemedi");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "dospresso_import_sablonu.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    }
  };

  const handleDownloadErrorReport = async (batchId: number) => {
    try {
      const response = await fetch(`/api/hr/employees/import/batches/${batchId}/error-report`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Rapor indirilemedi");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `import_hata_raporu_${batchId}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetState(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Excel İçe Aktar
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Excel dosyası seçin veya şablon indirin"}
            {step === "preview" && "Dosya önizleme ve kolon eşleştirme"}
            {step === "review" && "Veri doğrulama sonuçlarını inceleyin"}
            {step === "config" && "Import ayarlarını yapılandırın"}
            {step === "dryrun" && "Simülasyon sonuçlarını inceleyin"}
            {step === "result" && "Import tamamlandı"}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3">Excel dosyanızı (.xlsx) seçin</p>
              <Input
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="max-w-xs mx-auto"
                data-testid="input-import-file"
                disabled={isProcessing}
              />
              {isProcessing && <p className="text-xs text-muted-foreground mt-2">Dosya okunuyor...</p>}
            </div>
            <Button variant="outline" onClick={handleDownloadTemplate} className="w-full" data-testid="button-download-template">
              <Download className="mr-2 h-4 w-4" />
              Import Şablonu İndir
            </Button>
            <ImportBatchHistory onDownloadErrorReport={handleDownloadErrorReport} userRole={authUser?.role} />
          </div>
        )}

        {step === "preview" && previewData && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">{file?.name}</span>
              <Badge variant="secondary">{previewData.totalRows} satır</Badge>
            </div>

            <div>
              <label className="text-sm font-medium">Kolon Eşleştirme</label>
              <p className="text-xs text-muted-foreground mb-1">Her alan için hangi Excel kolonunun eşleşeceğini seçin. İstemediğiniz alanları atlayabilirsiniz.</p>
              {hasRequiredFieldIssue && (
                <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/30 rounded-md mt-1 mb-1" data-testid="text-required-field-warning">
                  <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                  <span className="text-xs text-destructive">
                    Zorunlu alanlar atlanamaz: {unmappedRequiredFields.map(f => SYSTEM_FIELD_LABELS[f] || f).join(", ")}
                  </span>
                </div>
              )}
              <div className="max-h-48 overflow-y-auto border rounded-md mt-1">
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Sistem Alanı</TableHead>
                      <TableHead className="text-xs">Excel Kolonu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.systemFields?.map((sf: string, i: number) => {
                      const currentExcelCol = columnMapping[sf] || "";
                      const isRequired = REQUIRED_IMPORT_FIELDS.includes(sf);
                      const autoHeader = previewData.headers?.find((h: any) => h.mappedTo === sf);
                      const isAutoMapped = autoHeader && currentExcelCol === autoHeader.header;
                      return (
                        <TableRow key={i}>
                          <TableCell className="text-xs py-1 whitespace-nowrap">
                            <span className="flex items-center gap-1">
                              {SYSTEM_FIELD_LABELS[sf] || sf}
                              {isRequired && <span className="text-destructive">*</span>}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs py-1">
                            <div className="flex items-center gap-1">
                              <Select
                                value={currentExcelCol || "__none__"}
                                onValueChange={(val) => {
                                  setColumnMapping(prev => {
                                    const next = { ...prev };
                                    if (val === "__none__") {
                                      delete next[sf];
                                    } else {
                                      next[sf] = val;
                                    }
                                    return next;
                                  });
                                }}
                              >
                                <SelectTrigger className="h-7 text-xs" data-testid={`select-column-map-${i}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__skip__">
                                    <span className="text-muted-foreground">Atla (import etme)</span>
                                  </SelectItem>
                                  <SelectItem value="__none__">
                                    <span className="text-muted-foreground">— Eşleşme yok —</span>
                                  </SelectItem>
                                  {previewData.headers?.map((h: any) => (
                                    <SelectItem key={h.header} value={h.header}>{h.header}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {!isAutoMapped && currentExcelCol && currentExcelCol !== "__skip__" && currentExcelCol !== "__none__" && (
                                <Badge variant="outline" className="text-[10px]">manuel</Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              </div>
            </div>

            {previewData.previewRows?.length > 0 && (
              <div>
                <label className="text-sm font-medium">Veri Önizleme (ilk 5 satır)</label>
                <div className="max-h-32 overflow-auto border rounded-md mt-1">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {previewData.headers?.map((h: any, i: number) => (
                          <TableHead key={i} className="text-xs whitespace-nowrap">{h.header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.previewRows.map((row: any, ri: number) => (
                        <TableRow key={ri}>
                          {previewData.headers?.map((h: any, ci: number) => (
                            <TableCell key={ci} className="text-xs py-1 whitespace-nowrap max-w-[120px] truncate">
                              {row[h.header]?.toString() || ""}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => { setStep("upload"); setPreviewData(null); setFile(null); }}>Geri</Button>
              <Button
                onClick={async () => {
                  if (!file) return;
                  setIsProcessing(true);
                  try {
                    const formData = new FormData();
                    formData.append("file", file);
                    if (Object.keys(columnMapping).length > 0) {
                      formData.append("columnMapping", JSON.stringify(toBackendMapping(columnMapping)));
                    }
                    const response = await fetch("/api/hr/employees/import/validate", {
                      method: "POST",
                      credentials: "include",
                      body: formData,
                    });
                    if (!response.ok) {
                      const errBody = await response.json().catch(() => ({}));
                      const fakeErr = { status: response.status, message: errBody.message || "Doğrulama hatası" };
                      const errType = classifyError(fakeErr);
                      if (errType === "unauthorized") {
                        toast({ title: "Oturum Süresi Doldu", description: "Lütfen tekrar giriş yapın.", variant: "destructive" });
                        window.location.href = "/login";
                        return;
                      }
                      if (errType === "forbidden") {
                        toast({ title: "Yetki Hatası", description: fakeErr.message, variant: "destructive" });
                        return;
                      }
                      throw new Error(fakeErr.message);
                    }
                    const data = await response.json();
                    setValidationResult(data);
                    setReviewFilter("all");
                    setSkipInvalid(false);
                    setStep("review");
                  } catch (error: any) {
                    const errType = classifyError(error);
                    if (errType === "network") {
                      toast({ title: "Bağlantı Hatası", description: "Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin.", variant: "destructive" });
                    } else {
                      toast({ title: "Hata", description: error.message || "Doğrulama sırasında hata oluştu", variant: "destructive" });
                    }
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                disabled={isProcessing || hasRequiredFieldIssue}
                data-testid="button-validate-preview"
              >
                {isProcessing ? "Doğrulanıyor..." : "Doğrula ve Devam"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "review" && validationResult && (() => {
          const s = validationResult.summary;
          const filteredRows = reviewFilter === "all"
            ? validationResult.previewRows
            : validationResult.previewRows?.filter((r: any) => r.status === reviewFilter);
          const canProceed = !validationResult.hasBlockingErrors || skipInvalid;
          const STATUS_LABELS: Record<string, { label: string; className: string }> = {
            valid: { label: "Geçerli", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
            error: { label: "Hata", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
            warning: { label: "Uyarı", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
            duplicate: { label: "Tekrar", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
            conflict: { label: "Çakışma", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
          };
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2" data-testid="review-summary-grid">
                <Card data-testid="card-review-total">
                  <CardContent className="p-2 text-center">
                    <div className="text-lg font-bold" data-testid="text-review-total">{validationResult.totalRows}</div>
                    <div className="text-[10px] text-muted-foreground">Toplam</div>
                  </CardContent>
                </Card>
                <Card data-testid="card-review-valid">
                  <CardContent className="p-2 text-center">
                    <CheckCircle className="h-4 w-4 mx-auto text-green-500 mb-0.5" />
                    <div className="text-lg font-bold text-green-600" data-testid="text-review-valid">{s.valid}</div>
                    <div className="text-[10px] text-muted-foreground">Geçerli</div>
                  </CardContent>
                </Card>
                <Card data-testid="card-review-errors">
                  <CardContent className="p-2 text-center">
                    <XCircle className="h-4 w-4 mx-auto text-red-500 mb-0.5" />
                    <div className="text-lg font-bold text-red-600" data-testid="text-review-errors">{s.errors}</div>
                    <div className="text-[10px] text-muted-foreground">Hata</div>
                  </CardContent>
                </Card>
                <Card data-testid="card-review-warnings">
                  <CardContent className="p-2 text-center">
                    <AlertTriangle className="h-4 w-4 mx-auto text-yellow-500 mb-0.5" />
                    <div className="text-lg font-bold text-yellow-600" data-testid="text-review-warnings">{s.warnings}</div>
                    <div className="text-[10px] text-muted-foreground">Uyarı</div>
                  </CardContent>
                </Card>
                <Card data-testid="card-review-duplicates">
                  <CardContent className="p-2 text-center">
                    <Copy className="h-4 w-4 mx-auto text-orange-500 mb-0.5" />
                    <div className="text-lg font-bold text-orange-600" data-testid="text-review-duplicates">{s.duplicates}</div>
                    <div className="text-[10px] text-muted-foreground">Tekrar</div>
                  </CardContent>
                </Card>
                <Card data-testid="card-review-conflicts">
                  <CardContent className="p-2 text-center">
                    <AlertCircle className="h-4 w-4 mx-auto text-purple-500 mb-0.5" />
                    <div className="text-lg font-bold text-purple-600" data-testid="text-review-conflicts">{s.conflicts}</div>
                    <div className="text-[10px] text-muted-foreground">Çakışma</div>
                  </CardContent>
                </Card>
              </div>

              {validationResult.hasBlockingErrors && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md">
                  <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-medium text-destructive">{s.errors} satırda hata tespit edildi</p>
                    <p className="text-muted-foreground mt-0.5">Hatalı satırlar düzeltilmeden import yapılamaz. "Hatalı satırları atla" seçeneği ile geçerli satırlarla devam edebilirsiniz.</p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-1">
                {([
                  ["all", `Tümü (${validationResult.previewRows?.length || 0})`],
                  ["error", `Hatalar (${s.errors})`],
                  ["warning", `Uyarılar (${s.warnings})`],
                  ["duplicate", `Tekrarlar (${s.duplicates})`],
                  ["conflict", `Çakışmalar (${s.conflicts})`],
                ] as [string, string][]).map(([key, label]) => (
                  <Button
                    key={key}
                    size="sm"
                    variant={reviewFilter === key ? "default" : "outline"}
                    onClick={() => setReviewFilter(key as any)}
                    data-testid={`button-review-filter-${key}`}
                  >
                    {label}
                  </Button>
                ))}
              </div>

              <div className="max-h-52 overflow-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-12">Satır</TableHead>
                      <TableHead className="text-xs w-16">Durum</TableHead>
                      <TableHead className="text-xs">Kullanıcı Adı</TableHead>
                      <TableHead className="text-xs">Ad Soyad</TableHead>
                      <TableHead className="text-xs">Detay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows?.length > 0 ? filteredRows.map((row: any, i: number) => {
                      const st = STATUS_LABELS[row.status] || STATUS_LABELS.valid;
                      const detail = [
                        ...(row.errors || []),
                        ...(row.warnings || []),
                        row.duplicateInfo,
                        row.conflictInfo,
                      ].filter(Boolean).join("; ");
                      return (
                        <TableRow key={i} data-testid={`row-review-${row.rowNumber}`}>
                          <TableCell className="text-xs py-1">{row.rowNumber}</TableCell>
                          <TableCell className="text-xs py-1">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${st.className}`} data-testid={`badge-status-${row.rowNumber}`}>
                              {st.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs py-1" data-testid={`text-username-${row.rowNumber}`}>{row.data?.username || "-"}</TableCell>
                          <TableCell className="text-xs py-1">
                            {[row.data?.firstName, row.data?.lastName].filter(Boolean).join(" ") || "-"}
                          </TableCell>
                          <TableCell className="text-xs py-1 max-w-[200px] truncate" title={detail} data-testid={`text-detail-${row.rowNumber}`}>
                            {detail || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    }) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-xs text-center text-muted-foreground py-4">
                          Bu filtrede gösterilecek satır yok
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {validationResult.totalRows > 20 && (
                <p className="text-[10px] text-muted-foreground text-center">İlk 20 satır gösteriliyor (toplam {validationResult.totalRows})</p>
              )}

              {validationResult.hasBlockingErrors && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="skipInvalidRows"
                    checked={skipInvalid}
                    onChange={(e) => setSkipInvalid(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                    data-testid="checkbox-skip-invalid"
                  />
                  <label htmlFor="skipInvalidRows" className="text-sm">
                    Hatalı satırları atlayarak geçerli satırlarla devam et
                  </label>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setStep("preview")} data-testid="button-review-back">Geri</Button>
                <Button
                  onClick={() => {
                    if (skipInvalid) setContinueWithValid(true);
                    setStep("config");
                  }}
                  disabled={!canProceed}
                  data-testid="button-review-continue"
                >
                  Ayarlara Devam
                </Button>
              </DialogFooter>
            </div>
          );
        })()}

        {step === "config" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">{file?.name}</span>
              {previewData && <Badge variant="secondary">{previewData.totalRows} satır</Badge>}
            </div>

            <div>
              <label className="text-sm font-medium">Import Modu</label>
              <Select value={mode} onValueChange={(v) => { setMode(v); if (v !== "deactivate_missing") setDeactivateConfirmation(""); }}>
                <SelectTrigger data-testid="select-import-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upsert">Ekle + Güncelle (Upsert) - Varsayılan</SelectItem>
                  <SelectItem value="append">Sadece Ekle (Append)</SelectItem>
                  <SelectItem value="update">Sadece Güncelle (Update)</SelectItem>
                  <SelectItem value="deactivate_missing">Eksikleri Deaktif Et (YÜKSEK RİSK)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {mode === "append" && "Sadece yeni personel ekler, mevcut olanları atlar"}
                {mode === "update" && "Sadece mevcut personelleri günceller, yeni kayıt eklemez"}
                {mode === "upsert" && "Yeni ekler, mevcut olanları günceller (varsayılan)"}
                {mode === "deactivate_missing" && "Dosyada bulunmayan tüm aktif personelleri deaktif eder + upsert uygular"}
              </p>
            </div>

            {mode === "deactivate_missing" && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs">
                    <p className="font-medium text-red-600">YÜKSEK RİSKLİ İŞLEM</p>
                    <p className="text-muted-foreground">Dosyada yer almayan tüm aktif personeller deaktif edilecektir. Admin kullanıcılar korunur.</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium">Onaylamak için "DEACTIVATE" yazın:</label>
                  <Input
                    value={deactivateConfirmation}
                    onChange={(e) => setDeactivateConfirmation(e.target.value)}
                    placeholder="DEACTIVATE"
                    className="mt-1"
                    data-testid="input-deactivate-confirmation"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Eşleştirme Anahtarı</label>
              <Select value={matchKey} onValueChange={setMatchKey}>
                <SelectTrigger data-testid="select-match-key">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="username">Kullanıcı Adı</SelectItem>
                  <SelectItem value="email">E-posta</SelectItem>
                  <SelectItem value="employeeId">Personel ID</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Mevcut kullanıcıların hangi alana göre eşleştirileceğini belirler
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="continueWithValid"
                checked={continueWithValid}
                onChange={(e) => setContinueWithValid(e.target.checked)}
                className="h-4 w-4 rounded border-input"
                data-testid="checkbox-continue-with-valid"
              />
              <label htmlFor="continueWithValid" className="text-sm">
                Hatalı satırları atlayarak geçerli satırlarla devam et
              </label>
            </div>

            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Admin koruması aktif</p>
                  <p>Admin kullanıcılar import ile asla değiştirilemez veya silinemez.</p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("review")}>Geri</Button>
              <Button
                onClick={handleDryRun}
                disabled={isProcessing || hasRequiredFieldIssue || (mode === "deactivate_missing" && deactivateConfirmation !== "DEACTIVATE")}
                data-testid="button-dry-run"
              >
                {isProcessing ? "Simüle ediliyor..." : "Simülasyon Çalıştır"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "dryrun" && dryRunResult && (
          <div className="space-y-4">
            <div className={`grid grid-cols-2 ${dryRunResult.toDeactivate > 0 ? "sm:grid-cols-5" : "sm:grid-cols-4"} gap-3`}>
              <Card>
                <CardContent className="p-3 text-center">
                  <CheckCircle className="h-5 w-5 mx-auto text-green-500 mb-1" />
                  <div className="text-lg font-bold">{dryRunResult.toCreate}</div>
                  <div className="text-xs text-muted-foreground">Eklenecek</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <Edit className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                  <div className="text-lg font-bold">{dryRunResult.toUpdate}</div>
                  <div className="text-xs text-muted-foreground">Güncellenecek</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <SkipForward className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
                  <div className="text-lg font-bold">{dryRunResult.toSkip}</div>
                  <div className="text-xs text-muted-foreground">Atlanacak</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <XCircle className="h-5 w-5 mx-auto text-red-500 mb-1" />
                  <div className="text-lg font-bold">{dryRunResult.toError}</div>
                  <div className="text-xs text-muted-foreground">Hatalı</div>
                </CardContent>
              </Card>
              {dryRunResult.toDeactivate > 0 && (
                <Card>
                  <CardContent className="p-3 text-center">
                    <UserX className="h-5 w-5 mx-auto text-orange-500 mb-1" />
                    <div className="text-lg font-bold text-orange-600">{dryRunResult.toDeactivate}</div>
                    <div className="text-xs text-muted-foreground">Deaktif</div>
                  </CardContent>
                </Card>
              )}
            </div>

            {dryRunResult.toDeactivate > 0 && dryRunResult.deactivateTargets?.length > 0 && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                <p className="text-xs font-medium text-red-600 mb-1">Deaktif Edilecek Personeller ({dryRunResult.toDeactivate} kişi):</p>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                  {dryRunResult.deactivateTargets.map((t: any, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs">{t.username}</Badge>
                  ))}
                  {dryRunResult.toDeactivate > 50 && (
                    <Badge variant="secondary" className="text-xs">+{dryRunResult.toDeactivate - 50} daha</Badge>
                  )}
                </div>
              </div>
            )}

            {dryRunResult.columnMapping?.length > 0 && (
              <details className="border rounded-md">
                <summary className="p-2 text-sm font-medium cursor-pointer">Kolon Eşleştirme Detayı</summary>
                <div className="px-3 pb-3">
                  <div className="flex flex-wrap gap-1">
                    {dryRunResult.columnMapping.map((cm: any, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">{cm.header} → {cm.mappedTo}</Badge>
                    ))}
                  </div>
                </div>
              </details>
            )}

            <div className="max-h-48 overflow-y-auto border rounded-md">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Satır</TableHead>
                    <TableHead className="w-20">Durum</TableHead>
                    <TableHead>Açıklama</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dryRunResult.results?.map((r: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{r.rowNumber}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "create" ? "default" : r.status === "update" ? "secondary" : r.status === "error" ? "destructive" : "outline"}>
                          {r.status === "create" ? "Ekle" : r.status === "update" ? "Güncelle" : r.status === "skip" ? "Atla" : r.status === "deactivate" ? "Deaktif" : "Hata"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{r.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </div>

            <DialogFooter className="flex-wrap gap-2">
              <Button variant="outline" onClick={() => setStep("config")}>Geri</Button>
              <Button
                onClick={handleApply}
                disabled={isProcessing || (dryRunResult.toCreate === 0 && dryRunResult.toUpdate === 0 && dryRunResult.toDeactivate === 0)}
                variant={dryRunResult.toDeactivate > 0 ? "destructive" : "default"}
                data-testid="button-apply-import"
              >
                {isProcessing ? "Uygulanıyor..." : dryRunResult.toDeactivate > 0 ? "Deaktif Et ve Uygula" : "Onayla ve Uygula"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "result" && applyResult && (
          <div className="space-y-4">
            <div className="text-center p-4">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
              <h3 className="text-lg font-semibold">Import Tamamlandı</h3>
              <p className="text-sm text-muted-foreground">Batch ID: {applyResult.batchId}</p>
            </div>

            <div className={`grid grid-cols-2 ${applyResult.deactivatedCount > 0 ? "sm:grid-cols-5" : "sm:grid-cols-4"} gap-3`}>
              <div className="text-center p-2 bg-green-500/10 rounded-md">
                <div className="text-lg font-bold text-green-600">{applyResult.createdCount}</div>
                <div className="text-xs text-muted-foreground">Eklendi</div>
              </div>
              <div className="text-center p-2 bg-blue-500/10 rounded-md">
                <div className="text-lg font-bold text-blue-600">{applyResult.updatedCount}</div>
                <div className="text-xs text-muted-foreground">Güncellendi</div>
              </div>
              <div className="text-center p-2 bg-yellow-500/10 rounded-md">
                <div className="text-lg font-bold text-yellow-600">{applyResult.skippedCount}</div>
                <div className="text-xs text-muted-foreground">Atlandı</div>
              </div>
              <div className="text-center p-2 bg-red-500/10 rounded-md">
                <div className="text-lg font-bold text-red-600">{applyResult.errorCount}</div>
                <div className="text-xs text-muted-foreground">Hata</div>
              </div>
              {applyResult.deactivatedCount > 0 && (
                <div className="text-center p-2 bg-orange-500/10 rounded-md">
                  <div className="text-lg font-bold text-orange-600">{applyResult.deactivatedCount}</div>
                  <div className="text-xs text-muted-foreground">Deaktif</div>
                </div>
              )}
            </div>

            {applyResult.errorCount > 0 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleDownloadErrorReport(applyResult.batchId)}
                data-testid="button-download-error-report"
              >
                <Download className="mr-2 h-4 w-4" />
                Hata Raporu İndir (Excel)
              </Button>
            )}

            <p className="text-xs text-muted-foreground text-center">
              Bu importu 7 gün içinde geri alabilirsiniz.
            </p>

            <DialogFooter>
              <Button onClick={() => { resetState(); onOpenChange(false); }} data-testid="button-close-import">
                Kapat
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
