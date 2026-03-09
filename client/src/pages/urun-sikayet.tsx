import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  AlertTriangle,
  CheckCircle2,
  Search,
  Clock,
  XCircle,
  Package,
  User,
  MapPin,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

interface ProductComplaint {
  id: number;
  branchId: number;
  reportedById: number;
  assignedToId: number | null;
  productName: string;
  batchNumber: string | null;
  complaintType: string;
  severity: string;
  description: string;
  status: string;
  resolution: string | null;
  photoUrls: string | null;
  resolvedById: number | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  branchName: string;
  reporterName: string;
}

const COMPLAINT_TYPES = [
  { value: "taste", label: "Tat Sorunu" },
  { value: "appearance", label: "Görünüm" },
  { value: "packaging", label: "Ambalaj" },
  { value: "freshness", label: "Tazelik" },
  { value: "foreign_object", label: "Yabancı Madde" },
  { value: "other", label: "Diğer" },
];

const SEVERITY_LEVELS = [
  { value: "low", label: "Düşük" },
  { value: "medium", label: "Orta" },
  { value: "high", label: "Yüksek" },
  { value: "critical", label: "Kritik" },
];

const BRANCH_STAFF_ROLES = [
  "supervisor",
  "barista",
  "stajyer",
  "bar_buddy",
  "supervisor_buddy",
  "yatirimci_branch",
];

function getSeverityBadgeClass(severity: string) {
  switch (severity) {
    case "critical":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    case "high":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
    case "medium":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    case "low":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    default:
      return "";
  }
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "new":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "investigating":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    case "resolved":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "rejected":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    default:
      return "";
  }
}

function getSeverityLabel(severity: string) {
  return SEVERITY_LEVELS.find((s) => s.value === severity)?.label || severity;
}

function getComplaintTypeLabel(type: string) {
  return COMPLAINT_TYPES.find((t) => t.value === type)?.label || type;
}

function getStatusLabel(status: string) {
  switch (status) {
    case "new":
      return "Yeni";
    case "investigating":
      return "İnceleniyor";
    case "resolved":
      return "Çözüldü";
    case "rejected":
      return "Reddedildi";
    default:
      return status;
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "new":
      return <Clock className="h-3 w-3" />;
    case "investigating":
      return <Search className="h-3 w-3" />;
    case "resolved":
      return <CheckCircle2 className="h-3 w-3" />;
    case "rejected":
      return <XCircle className="h-3 w-3" />;
    default:
      return null;
  }
}

export default function UrunSikayet() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [productName, setProductName] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [complaintType, setComplaintType] = useState("");
  const [severity, setSeverity] = useState("");
  const [description, setDescription] = useState("");
  const [resolutionTexts, setResolutionTexts] = useState<Record<number, string>>({});

  const isKaliteKontrol = user?.role === "kalite_kontrol" || user?.role === "admin";
  const isBranchStaff = BRANCH_STAFF_ROLES.includes(user?.role || "");

  const { data: complaints, isLoading, isError, refetch } = useQuery<ProductComplaint[]>({
    queryKey: ["/api/product-complaints", statusFilter],
    queryFn: async () => {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/product-complaints${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      productName: string;
      batchNumber: string;
      complaintType: string;
      severity: string;
      description: string;
    }) => {
      await apiRequest("POST", "/api/product-complaints", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-complaints"] });
      toast({ title: "Başarılı", description: "Şikayet başarıyla oluşturuldu" });
      setDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Şikayet oluşturulurken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      resolution,
    }: {
      id: number;
      status: string;
      resolution?: string;
    }) => {
      await apiRequest("PATCH", `/api/product-complaints/${id}`, {
        status,
        resolution,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/product-complaints"] });
      toast({ title: "Başarılı", description: "Şikayet güncellendi" });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Şikayet güncellenirken hata oluştu",
        variant: "destructive",
      });
    },
  });

  function resetForm() {
    setProductName("");
    setBatchNumber("");
    setComplaintType("");
    setSeverity("");
    setDescription("");
  }

  function handleSubmit() {
    if (!productName || !complaintType || !severity || !description) {
      toast({
        title: "Hata",
        description: "Lütfen zorunlu alanları doldurun",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({
      productName,
      batchNumber,
      complaintType,
      severity,
      description,
    });
  }

  function handleStatusUpdate(id: number, status: string) {
    const resolution = resolutionTexts[id];
    updateMutation.mutate({ id, status, resolution });
  }

  
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            Ürün Şikayetleri
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isKaliteKontrol
              ? "Tüm şubelerden gelen ürün şikayetlerini yönetin"
              : "Şubenizden ürün kalite şikayeti bildirin"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isKaliteKontrol && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
                <SelectValue placeholder="Durum Filtresi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="new">Yeni</SelectItem>
                <SelectItem value="investigating">İnceleniyor</SelectItem>
                <SelectItem value="resolved">Çözüldü</SelectItem>
                <SelectItem value="rejected">Reddedildi</SelectItem>
              </SelectContent>
            </Select>
          )}

          {(isBranchStaff || isKaliteKontrol) && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-complaint">
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Şikayet
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Yeni Ürün Şikayeti</DialogTitle>
                  <DialogDescription>
                    Ürün kalitesi ile ilgili şikayetinizi bildirin
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ürün Adı *</label>
                    <Input
                      data-testid="input-product-name"
                      placeholder="Ürün adını girin"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Parti Numarası</label>
                    <Input
                      data-testid="input-batch-number"
                      placeholder="Parti numarası (opsiyonel)"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Şikayet Türü *</label>
                    <Select value={complaintType} onValueChange={setComplaintType}>
                      <SelectTrigger data-testid="select-complaint-type">
                        <SelectValue placeholder="Şikayet türü seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPLAINT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ciddiyet *</label>
                    <Select value={severity} onValueChange={setSeverity}>
                      <SelectTrigger data-testid="select-severity">
                        <SelectValue placeholder="Ciddiyet seviyesi seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {SEVERITY_LEVELS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Açıklama *</label>
                    <Textarea
                      data-testid="input-description"
                      placeholder="Şikayetinizi detaylı olarak açıklayın"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    İptal
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={createMutation.isPending}
                    data-testid="button-submit-complaint"
                  >
                    {createMutation.isPending ? "Gönderiliyor..." : "Gönder"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : !complaints?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              Henüz şikayet bulunmuyor
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Yeni bir ürün şikayeti eklemek için yukarıdaki butonu kullanın
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {complaints.map((complaint) => (
            <Card key={complaint.id} data-testid={`card-complaint-${complaint.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold">
                    {complaint.productName}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {complaint.branchName}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {complaint.reporterName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {complaint.createdAt
                        ? format(new Date(complaint.createdAt), "dd MMM yyyy HH:mm", {
                            locale: tr,
                          })
                        : "-"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={`text-xs no-default-hover-elevate no-default-active-elevate ${getSeverityBadgeClass(complaint.severity)}`}
                    data-testid={`badge-severity-${complaint.id}`}
                  >
                    {complaint.severity === "critical" && (
                      <AlertTriangle className="h-3 w-3 mr-1" />
                    )}
                    {getSeverityLabel(complaint.severity)}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={`text-xs no-default-hover-elevate no-default-active-elevate ${getStatusBadgeClass(complaint.status)}`}
                    data-testid={`badge-status-${complaint.id}`}
                  >
                    {getStatusIcon(complaint.status)}
                    <span className="ml-1">{getStatusLabel(complaint.status)}</span>
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {getComplaintTypeLabel(complaint.complaintType)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm" data-testid={`text-description-${complaint.id}`}>
                  {complaint.description}
                </p>
                {complaint.batchNumber && (
                  <p className="text-xs text-muted-foreground">
                    Parti No: {complaint.batchNumber}
                  </p>
                )}
                {complaint.resolution && (
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Çözüm:</p>
                    <p className="text-sm">{complaint.resolution}</p>
                  </div>
                )}

                {isKaliteKontrol &&
                  complaint.status !== "resolved" &&
                  complaint.status !== "rejected" && (
                    <div className="border-t pt-3 space-y-3">
                      <Textarea
                        data-testid={`input-resolution-${complaint.id}`}
                        placeholder="Çözüm notunu yazın..."
                        value={resolutionTexts[complaint.id] || ""}
                        onChange={(e) =>
                          setResolutionTexts((prev) => ({
                            ...prev,
                            [complaint.id]: e.target.value,
                          }))
                        }
                        rows={2}
                      />
                      <div className="flex flex-wrap gap-2">
                        {complaint.status === "new" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleStatusUpdate(complaint.id, "investigating")
                            }
                            disabled={updateMutation.isPending}
                            data-testid={`button-investigate-${complaint.id}`}
                          >
                            <Search className="h-3 w-3 mr-1" />
                            İncele
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() =>
                            handleStatusUpdate(complaint.id, "resolved")
                          }
                          disabled={updateMutation.isPending}
                          data-testid={`button-resolve-${complaint.id}`}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Çözüldü
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleStatusUpdate(complaint.id, "rejected")
                          }
                          disabled={updateMutation.isPending}
                          data-testid={`button-reject-${complaint.id}`}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Reddet
                        </Button>
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
