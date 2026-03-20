import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { MobileFilterCollapsible } from "@/components/mobile-filter-collapsible";
import { CompactStatusBadge } from "@/components/compact-status-badge";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Timer,
  UserPlus,
  User,
  Tag,
  ArrowRight,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";

interface Complaint {
  id: number;
  type: "misafir" | "urun";
  branchId: number;
  branchName: string;
  status: string;
  priority: string;
  title: string;
  description: string | null;
  category: string | null;
  customerName: string | null;
  slaBreached: boolean;
  responseDeadline: string | null;
  assignedToId: number | null;
  createdAt: string;
  resolvedAt: string | null;
}

interface ComplaintDetail extends Complaint {
  assignedUser?: { id: number; firstName: string; lastName: string } | null;
  resolutionNotes?: string | null;
  resolution?: string | null;
}

interface Branch {
  id: number;
  name: string;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
}

const STATUS_FLOW: { key: string; label: string }[] = [
  { key: "new", label: "Açık" },
  { key: "assigned", label: "Atandı" },
  { key: "in_progress", label: "İşleniyor" },
  { key: "investigating", label: "İşleniyor" },
  { key: "resolved", label: "Çözüldü" },
  { key: "closed", label: "Kapatıldı" },
];

const STATUS_MAP: Record<string, string> = {
  new: "Açık",
  assigned: "Atandı",
  in_progress: "İşleniyor",
  investigating: "İşleniyor",
  resolved: "Çözüldü",
  closed: "Kapatıldı",
};

const CATEGORY_MAP: Record<string, string> = {
  teknik: "Teknik",
  technical: "Teknik",
  muhasebe: "Muhasebe",
  accounting: "Muhasebe",
  lojistik: "Lojistik",
  logistics: "Lojistik",
  ik: "İK",
  hr: "İK",
  genel: "Genel",
  general: "Genel",
  quality: "Kalite",
  kalite: "Kalite",
  service: "Hizmet",
  hizmet: "Hizmet",
  cleanliness: "Temizlik",
  temizlik: "Temizlik",
  product: "Ürün",
  urun: "Ürün",
  staff: "Personel",
  personel: "Personel",
  hygiene: "Hijyen",
  hijyen: "Hijyen",
  taste: "Tat/Lezzet",
  temperature: "Sıcaklık",
  packaging: "Ambalaj",
  foreign_object: "Yabancı Madde",
  allergen: "Alerjen",
  other: "Diğer",
  diger: "Diğer",
};

const CATEGORY_FILTER_OPTIONS = [
  { value: "all", label: "Tüm Kategoriler" },
  { value: "teknik", label: "Teknik" },
  { value: "muhasebe", label: "Muhasebe" },
  { value: "lojistik", label: "Lojistik" },
  { value: "ik", label: "İK" },
  { value: "genel", label: "Genel" },
  { value: "quality", label: "Kalite" },
  { value: "service", label: "Hizmet" },
  { value: "cleanliness", label: "Temizlik" },
  { value: "product", label: "Ürün" },
  { value: "staff", label: "Personel" },
  { value: "other", label: "Diğer" },
];

function getStatusStepIndex(status: string): number {
  const steps = ["new", "assigned", "in_progress", "resolved", "closed"];
  if (status === "investigating") return 2;
  const idx = steps.indexOf(status);
  return idx >= 0 ? idx : 0;
}

export default function CRMComplaints() {
  const { toast } = useToast();
  const [typeFilter, setTypeFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");

  const queryParams = new URLSearchParams();
  if (typeFilter !== "all") queryParams.set("type", typeFilter);
  if (branchFilter !== "all") queryParams.set("branchId", branchFilter);
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  if (priorityFilter !== "all") queryParams.set("priority", priorityFilter);
  if (startDate) queryParams.set("startDate", startDate);
  if (endDate) queryParams.set("endDate", endDate);

  const queryString = queryParams.toString();
  const complaintsUrl = `/api/crm/complaints${queryString ? `?${queryString}` : ""}`;

  const { data: complaints, isLoading, isError, refetch } = useQuery<Complaint[]>({
    queryKey: ["/api/crm/complaints", typeFilter, branchFilter, statusFilter, priorityFilter, startDate, endDate],
    queryFn: async () => {
      const res = await fetch(complaintsUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load complaints");
      return res.json();
    },
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/crm/branches"],
  });

  const { data: detail, isLoading: detailLoading } = useQuery<ComplaintDetail>({
    queryKey: ["/api/crm/complaints", selectedComplaint?.type, selectedComplaint?.id],
    enabled: !!selectedComplaint && detailOpen,
    queryFn: async () => {
      const res = await fetch(`/api/crm/complaints/${selectedComplaint!.type}/${selectedComplaint!.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: usersList } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: assignOpen,
  });

  const assignMutation = useMutation({
    mutationFn: async ({ type, id, assignedToId }: { type: string; id: number; assignedToId: number }) => {
      await apiRequest("PATCH", `/api/crm/complaints/${type}/${id}/assign`, { assignedToId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/complaints"] });
      toast({ title: "Başarılı", description: "Şikayet atandı" });
      setAssignOpen(false);
      setAssignUserId("");
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ type, id, resolutionNotes }: { type: string; id: number; resolutionNotes: string }) => {
      await apiRequest("PATCH", `/api/crm/complaints/${type}/${id}/resolve`, { resolutionNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/complaints"] });
      toast({ title: "Başarılı", description: "Şikayet çözümlendi" });
      setResolveOpen(false);
      setResolutionNotes("");
      setDetailOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const getTypeBadge = (type: string) => {
    if (type === "misafir") {
      return <Badge className="bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300" data-testid={`badge-type-${type}`}>Misafir</Badge>;
    }
    return <Badge className="bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300" data-testid={`badge-type-${type}`}>Ürün</Badge>;
  };

  const getCategoryBadge = (category: string | null) => {
    if (!category) return null;
    const displayName = CATEGORY_MAP[category.toLowerCase()] || category;
    const colorMap: Record<string, string> = {
      "Teknik": "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300",
      "Muhasebe": "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300",
      "Lojistik": "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300",
      "İK": "bg-pink-500/10 text-pink-600 dark:bg-pink-500/20 dark:text-pink-300",
      "Genel": "bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300",
      "Kalite": "bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300",
      "Hizmet": "bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-300",
      "Temizlik": "bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300",
      "Personel": "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300",
    };
    const colorClass = colorMap[displayName] || "bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300";
    return (
      <Badge className={colorClass} data-testid="badge-category">
        <Tag className="w-3 h-3 mr-1" />
        {displayName}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "critical":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Kritik</Badge>;
      case "high":
        return <Badge className="bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300"><AlertTriangle className="w-3 h-3 mr-1" />Yüksek</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-300">Orta</Badge>;
      default:
        return <Badge className="bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-300">Düşük</Badge>;
    }
  };

  const getStatusBadge = (status: string, slaBreached?: boolean) => {
    if (slaBreached) {
      return <CompactStatusBadge label="SLA Aşıldı" variant="destructive" icon={<AlertCircle className="w-3 h-3 mr-1" />} />;
    }
    switch (status) {
      case "resolved":
        return <CompactStatusBadge label="Çözüldü" className="bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-300" icon={<CheckCircle2 className="w-3 h-3 mr-1" />} />;
      case "in_progress":
      case "investigating":
        return <CompactStatusBadge label="İşleniyor" className="bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-300" icon={<Timer className="w-3 h-3 mr-1" />} />;
      case "assigned":
        return <CompactStatusBadge label="Atandı" className="bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300" icon={<User className="w-3 h-3 mr-1" />} />;
      case "closed":
        return <CompactStatusBadge label="Kapatıldı" variant="secondary" />;
      default:
        return <CompactStatusBadge label="Açık" variant="outline" icon={<Clock className="w-3 h-3 mr-1" />} />;
    }
  };

  const getSLAIndicator = (complaint: Complaint) => {
    if (complaint.status === "resolved" || complaint.status === "closed") return null;
    if (complaint.slaBreached) {
      return <Badge variant="destructive" data-testid={`badge-sla-${complaint.type}-${complaint.id}`}><AlertCircle className="w-3 h-3 mr-1" />SLA İhlali</Badge>;
    }
    if (complaint.responseDeadline) {
      const deadline = new Date(complaint.responseDeadline);
      const hoursRemaining = (deadline.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursRemaining < 0) {
        return <Badge variant="destructive" data-testid={`badge-sla-${complaint.type}-${complaint.id}`}><AlertCircle className="w-3 h-3 mr-1" />Süre Doldu</Badge>;
      }
      if (hoursRemaining < 4) {
        return (
          <Badge className="bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-300" data-testid={`badge-sla-${complaint.type}-${complaint.id}`}>
            <AlertTriangle className="w-3 h-3 mr-1" />{Math.round(hoursRemaining)}s kaldı
          </Badge>
        );
      }
      if (hoursRemaining < 12) {
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-300" data-testid={`badge-sla-${complaint.type}-${complaint.id}`}>
            <Clock className="w-3 h-3 mr-1" />{Math.round(hoursRemaining)}s kaldı
          </Badge>
        );
      }
      return (
        <Badge className="bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-300" data-testid={`badge-sla-${complaint.type}-${complaint.id}`}>
          <Clock className="w-3 h-3 mr-1" />{Math.round(hoursRemaining)}s kaldı
        </Badge>
      );
    }
    return null;
  };

  const getDeadlineText = (deadline: string | null) => {
    if (!deadline) return null;
    const d = new Date(deadline);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    if (diff < 0) return "Süre doldu";
    return formatDistanceToNow(d, { locale: tr, addSuffix: true });
  };

  const filteredComplaints = complaints?.filter((c) => {
    if (categoryFilter !== "all") {
      const cat = c.category?.toLowerCase() || "";
      if (cat !== categoryFilter && !cat.includes(categoryFilter)) return false;
    }
    return true;
  });

  const openDetail = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setDetailOpen(true);
  };

  const openAssign = () => {
    setAssignUserId("");
    setAssignOpen(true);
  };

  const openResolve = () => {
    setResolutionNotes("");
    setResolveOpen(true);
  };

  const StatusFlowIndicator = ({ status }: { status: string }) => {
    const steps = [
      { key: "new", label: "Açık" },
      { key: "assigned", label: "Atandı" },
      { key: "in_progress", label: "İşleniyor" },
      { key: "resolved", label: "Çözüldü" },
      { key: "closed", label: "Kapatıldı" },
    ];
    const currentIdx = getStatusStepIndex(status);

    return (
      <div className="flex items-center gap-1 flex-wrap" data-testid="status-flow">
        {steps.map((step, idx) => {
          const isActive = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <div key={step.key} className="flex items-center gap-1">
              <span
                className={`text-xs px-1.5 py-0.5 rounded-md ${
                  isCurrent
                    ? "bg-primary/10 text-primary font-medium"
                    : isActive
                    ? "text-muted-foreground"
                    : "text-muted-foreground/40"
                }`}
              >
                {step.label}
              </span>
              {idx < steps.length - 1 && (
                <ArrowRight className={`w-3 h-3 ${isActive ? "text-muted-foreground" : "text-muted-foreground/30"}`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-3 flex flex-col gap-3" data-testid="loading-complaints">
        <Skeleton className="h-8 w-64" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-40" />
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState message="Ticket verileri yüklenirken hata oluştu" onRetry={() => refetch()} />;
  }

  return (
    <div className="p-3 flex flex-col gap-3 sm:gap-4" data-testid="page-crm-complaints">
      <div>
        <h1 className="text-2xl font-bold" data-testid="heading-complaints">Ticket / Talepler</h1>
        <p className="text-sm text-muted-foreground mt-1">Şube geri bildirimleri ve ürün şikayetlerini tek panelden yönetin</p>
      </div>

      <MobileFilterCollapsible activeFilterCount={(typeFilter !== "all" ? 1 : 0) + (branchFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0) + (categoryFilter !== "all" ? 1 : 0) + (priorityFilter !== "all" ? 1 : 0) + (startDate ? 1 : 0) + (endDate ? 1 : 0)}>
      <div className="flex flex-wrap gap-2" data-testid="filter-bar">
        <div className="flex gap-1" data-testid="type-toggle">
          {[
            { value: "all", label: "Tümü" },
            { value: "misafir", label: "Misafir" },
            { value: "urun", label: "Ürün" },
          ].map((opt) => (
            <Button
              key={opt.value}
              variant={typeFilter === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(opt.value)}
              data-testid={`button-type-${opt.value}`}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-44" data-testid="select-branch-filter">
            <SelectValue placeholder="Şube Seçin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Şubeler</SelectItem>
            {branches?.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-status-filter">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            <SelectItem value="new">Açık</SelectItem>
            <SelectItem value="assigned">Atandı</SelectItem>
            <SelectItem value="in_progress">İşleniyor</SelectItem>
            <SelectItem value="resolved">Çözüldü</SelectItem>
            <SelectItem value="closed">Kapatıldı</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44" data-testid="select-category-filter">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40" data-testid="select-priority-filter">
            <SelectValue placeholder="Öncelik" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Öncelikler</SelectItem>
            <SelectItem value="critical">Kritik</SelectItem>
            <SelectItem value="high">Yüksek</SelectItem>
            <SelectItem value="medium">Orta</SelectItem>
            <SelectItem value="low">Düşük</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-40"
          data-testid="input-start-date"
        />
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-40"
          data-testid="input-end-date"
        />
      </div>
      </MobileFilterCollapsible>

      <div className="grid gap-2 sm:gap-3" data-testid="complaints-list">
        {filteredComplaints && filteredComplaints.length > 0 ? (
          filteredComplaints.map((c) => (
            <Card
              key={`${c.type}-${c.id}`}
              className="cursor-pointer hover-elevate"
              onClick={() => openDetail(c)}
              data-testid={`card-complaint-${c.type}-${c.id}`}
            >
              <CardContent className="p-4">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-sm text-muted-foreground" data-testid={`text-date-${c.type}-${c.id}`}>
                          {format(new Date(c.createdAt), "d MMM yyyy HH:mm", { locale: tr })}
                        </span>
                        {getTypeBadge(c.type)}
                        {getCategoryBadge(c.category)}
                        <span className="text-sm text-muted-foreground">{c.branchName}</span>
                      </div>
                      <h3 className="font-medium truncate" data-testid={`text-title-${c.type}-${c.id}`}>
                        {c.title || "Başlıksız"}
                      </h3>
                      {c.customerName && (
                        <p className="text-sm text-muted-foreground" data-testid={`text-customer-${c.type}-${c.id}`}>
                          {c.customerName}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex flex-wrap gap-1.5 sm:justify-end">
                        {getPriorityBadge(c.priority)}
                        {getStatusBadge(c.status, c.slaBreached)}
                        {getSLAIndicator(c)}
                      </div>
                      {c.responseDeadline && c.status !== "resolved" && c.status !== "closed" && (
                        <span className="text-xs text-muted-foreground" data-testid={`text-deadline-${c.type}-${c.id}`}>
                          Son tarih: {getDeadlineText(c.responseDeadline)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground" data-testid="text-empty">
              Şikayet bulunamadı
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={detailOpen} onOpenChange={(open) => { if (!open) setDetailOpen(false); }}>
        <DialogContent className="max-w-lg" data-testid="dialog-detail">
          <DialogHeader>
            <DialogTitle>Şikayet Detayı</DialogTitle>
            <DialogDescription>
              {selectedComplaint && `${selectedComplaint.type === "misafir" ? "Misafir" : "Ürün"} Şikayeti #${selectedComplaint.id}`}
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : detail ? (
            <div className="flex flex-col gap-3">
              <StatusFlowIndicator status={detail.status} />

              <div className="flex flex-wrap gap-2">
                {getTypeBadge(detail.type || (detail as any).complaintType)}
                {getCategoryBadge(detail.category || (detail as any).complaintCategory || (detail as any).complaintType)}
                {getPriorityBadge(detail.priority || (detail as any).severity)}
                {getStatusBadge(detail.status, detail.slaBreached)}
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium">Şube:</span>
                  <span className="ml-1" data-testid="text-detail-branch">{detail.branchName || (detail as any).branchName}</span>
                </div>
                <div>
                  <span className="font-medium">Tarih:</span>
                  <span className="ml-1" data-testid="text-detail-date">
                    {detail.createdAt && format(new Date(detail.createdAt), "d MMM yyyy HH:mm", { locale: tr })}
                  </span>
                </div>
                {detail.customerName && (
                  <div className="col-span-2">
                    <span className="font-medium">Müşteri:</span>
                    <span className="ml-1" data-testid="text-detail-customer">{detail.customerName}</span>
                  </div>
                )}
                {(detail.category || (detail as any).complaintCategory) && (
                  <div className="col-span-2">
                    <span className="font-medium">Kategori:</span>
                    <span className="ml-1" data-testid="text-detail-category">
                      {CATEGORY_MAP[(detail.category || (detail as any).complaintCategory || "").toLowerCase()] || detail.category || (detail as any).complaintCategory}
                    </span>
                  </div>
                )}
                {detail.responseDeadline && (
                  <div className="col-span-2">
                    <span className="font-medium">SLA Son Tarih:</span>
                    <span className="ml-1" data-testid="text-detail-deadline">
                      {format(new Date(detail.responseDeadline), "d MMM yyyy HH:mm", { locale: tr })}
                      {detail.status !== "resolved" && detail.status !== "closed" && (
                        <span className="text-muted-foreground ml-1">({getDeadlineText(detail.responseDeadline)})</span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {(detail.description || (detail as any).subject) && (
                <div>
                  <span className="text-sm font-medium">Açıklama:</span>
                  <p className="text-sm mt-1 text-muted-foreground" data-testid="text-detail-description">
                    {detail.description}
                  </p>
                </div>
              )}

              {detail.assignedUser && (
                <div className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded-md">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Atanan:</span>
                  <span data-testid="text-detail-assigned">
                    {detail.assignedUser.firstName} {detail.assignedUser.lastName}
                  </span>
                </div>
              )}

              {detail.resolvedAt && (
                <div className="p-3 bg-muted rounded-md">
                  <div className="text-sm font-medium mb-1">Çözüm</div>
                  <p className="text-sm" data-testid="text-detail-resolution">
                    {detail.resolutionNotes || detail.resolution || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(detail.resolvedAt), "d MMM yyyy HH:mm", { locale: tr })}
                  </p>
                </div>
              )}

              {detail.status !== "resolved" && detail.status !== "closed" && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button variant="outline" onClick={openAssign} data-testid="button-assign">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Ata
                  </Button>
                  <Button onClick={openResolve} data-testid="button-resolve">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Çözümlendi
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={(open) => { if (!open) setAssignOpen(false); }}>
        <DialogContent data-testid="dialog-assign">
          <DialogHeader>
            <DialogTitle>Şikayeti Ata</DialogTitle>
            <DialogDescription>Şikayeti çözümleyecek kişiyi seçin</DialogDescription>
          </DialogHeader>
          <Select value={assignUserId} onValueChange={setAssignUserId}>
            <SelectTrigger data-testid="select-assign-user">
              <SelectValue placeholder="Kişi seçin" />
            </SelectTrigger>
            <SelectContent>
              {usersList?.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.firstName} {u.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              disabled={!assignUserId || assignMutation.isPending}
              onClick={() => {
                if (!selectedComplaint || !assignUserId) return;
                assignMutation.mutate({
                  type: selectedComplaint.type,
                  id: selectedComplaint.id,
                  assignedToId: Number(assignUserId),
                });
              }}
              data-testid="button-submit-assign"
            >
              {assignMutation.isPending ? "Atanıyor..." : "Ata"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resolveOpen} onOpenChange={(open) => { if (!open) setResolveOpen(false); }}>
        <DialogContent data-testid="dialog-resolve">
          <DialogHeader>
            <DialogTitle>Şikayeti Çöz</DialogTitle>
            <DialogDescription>Çözüm notlarını girin</DialogDescription>
          </DialogHeader>
          <Textarea
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            placeholder="Şikayetin nasıl çözüldüğünü açıklayın..."
            rows={4}
            data-testid="textarea-resolution-notes"
          />
          <DialogFooter>
            <Button
              disabled={!resolutionNotes.trim() || resolveMutation.isPending}
              onClick={() => {
                if (!selectedComplaint || !resolutionNotes.trim()) {
                  toast({ title: "Hata", description: "Çözüm notu zorunludur", variant: "destructive" });
                  return;
                }
                resolveMutation.mutate({
                  type: selectedComplaint.type,
                  id: selectedComplaint.id,
                  resolutionNotes: resolutionNotes.trim(),
                });
              }}
              data-testid="button-submit-resolve"
            >
              {resolveMutation.isPending ? "Kaydediliyor..." : "Çözümlendi Olarak İşaretle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
