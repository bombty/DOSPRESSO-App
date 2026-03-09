import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Edit,
  Trash2,
  Send,
  Loader2,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

interface ManagementModule {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  level: string | null;
  estimatedDuration: number | null;
  targetRoles: string[] | null;
  status: string | null;
  rejectionReason: string | null;
  isPublished: boolean | null;
  createdBy: string | null;
  createdAt: string | null;
  isActive: boolean | null;
  questionCount: number;
  creatorName: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof Clock }> = {
  draft: { label: "Taslak", variant: "secondary", icon: FileText },
  pending_review: { label: "Onay Bekliyor", variant: "outline", icon: Clock },
  approved: { label: "Onaylı", variant: "default", icon: CheckCircle },
  rejected: { label: "Reddedildi", variant: "destructive", icon: XCircle },
};

const CATEGORY_LABELS: Record<string, string> = {
  kultur: "Kültür & Hikaye",
  "soft-skills": "Soft Skills",
  hijyen: "Temizlik & Hijyen",
  istasyon: "İstasyon Eğitimi",
  yonetim: "Yönetim",
  hammadde: "Hammadde",
  urun: "Ürün Eğitimi",
  depo: "Depo & FIFO",
  misafir: "Misafir Ağırlama",
  magaza: "Mağaza Düzeni",
  davranis: "Davranış Kodeksleri",
  machine: "Makine Kullanımı",
  genel: "Genel",
  general: "Genel",
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Başlangıç",
  intermediate: "Orta",
  advanced: "İleri",
};

export default function AcademyContentManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectModuleId, setRejectModuleId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteModuleId, setDeleteModuleId] = useState<number | null>(null);

  const { data: modules, isLoading, isError, refetch } = useQuery<ManagementModule[]>({
    queryKey: ["/api/academy/modules/management"],
  });

  const statusMutation = useMutation({
    mutationFn: async ({ moduleId, status, rejectionReason }: { moduleId: number; status: string; rejectionReason?: string }) => {
      return apiRequest("PATCH", `/api/academy/modules/${moduleId}/status`, { status, rejectionReason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/academy/modules/management"] });
      toast({ title: "Statü güncellendi" });
      setRejectDialogOpen(false);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (moduleId: number) => {
      return apiRequest("DELETE", `/api/academy/modules/${moduleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/academy/modules/management"] });
      toast({ title: "Modül silindi" });
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const canApprove = user?.role && ["coach", "admin", "cgo", "academy_coach"].includes(user.role);
  const canDelete = user?.role && ["admin", "cgo"].includes(user.role);

  const filteredModules = (modules || []).filter((m) => {
    if (searchQuery && !m.title.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR'))) return false;
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    if (categoryFilter !== "all" && m.category !== categoryFilter) return false;
    return true;
  });

  const statusCounts = (modules || []).reduce((acc, m) => {
    const s = m.status || "draft";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categories = [...new Set((modules || []).map((m) => m.category).filter(Boolean))] as string[];

  if (isLoading) {

  return (
      <div className="space-y-4 p-4" data-testid="content-management-loading">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 max-w-6xl mx-auto" data-testid="content-management">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold" data-testid="text-content-title">İçerik Yönetimi</h2>
          <Badge variant="secondary" data-testid="badge-total-count">{modules?.length || 0} modül</Badge>
        </div>
        <Button
          onClick={() => setLocation("/akademi-modul-editor/new")}
          data-testid="button-create-module"
        >
          <Plus className="h-4 w-4 mr-2" />
          Yeni Modül
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
          const count = statusCounts[key] || 0;
          return (
            <Badge
              key={key}
              variant={statusFilter === key ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}
              data-testid={`filter-status-${key}`}
            >
              {config.label} ({count})
            </Badge>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Modül ara..."
            className="pl-9"
            data-testid="input-search-modules"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]" data-testid="select-category-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Kategoriler</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {CATEGORY_LABELS[cat] || cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredModules.length === 0 ? (
        <Card data-testid="no-modules-found">
          <CardContent className="p-6 text-center">
            <BookOpen className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="font-medium">Modül bulunamadı</p>
            <p className="text-sm text-muted-foreground mt-1">Filtrelerinizi değiştirin veya yeni bir modül oluşturun.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground uppercase">
            <div className="col-span-3">Başlık</div>
            <div className="col-span-2">Kategori / Zorluk</div>
            <div className="col-span-2">Hedef Roller</div>
            <div className="col-span-1">Sorular</div>
            <div className="col-span-1">Statü</div>
            <div className="col-span-1">Oluşturan</div>
            <div className="col-span-2 text-right">Aksiyonlar</div>
          </div>

          {filteredModules.map((mod) => {
            const statusInfo = STATUS_CONFIG[mod.status || "draft"] || STATUS_CONFIG.draft;
            const StatusIcon = statusInfo.icon;
            return (
              <Card key={mod.id} data-testid={`module-row-${mod.id}`}>
                <CardContent className="p-3">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    <div className="col-span-3 min-w-0">
                      <p className="font-medium text-sm truncate" data-testid={`text-module-title-${mod.id}`}>{mod.title}</p>
                      {mod.description && (
                        <p className="text-xs text-muted-foreground truncate">{mod.description}</p>
                      )}
                      {mod.rejectionReason && mod.status === "rejected" && (
                        <div className="flex items-start gap-1 mt-1">
                          <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-destructive">{mod.rejectionReason}</p>
                        </div>
                      )}
                    </div>
                    <div className="col-span-2">
                      <Badge variant="outline" className="mr-1">
                        {CATEGORY_LABELS[mod.category || ""] || mod.category || "Genel"}
                      </Badge>
                      <Badge variant="secondary">
                        {LEVEL_LABELS[mod.level || "beginner"] || mod.level}
                      </Badge>
                    </div>
                    <div className="col-span-2">
                      {mod.targetRoles && mod.targetRoles.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {mod.targetRoles.slice(0, 2).map((role) => (
                            <Badge key={role} variant="outline" className="text-xs">{role}</Badge>
                          ))}
                          {mod.targetRoles.length > 2 && (
                            <Badge variant="outline" className="text-xs">+{mod.targetRoles.length - 2}</Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Tüm roller</span>
                      )}
                    </div>
                    <div className="col-span-1">
                      <div className="flex items-center gap-1">
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm" data-testid={`text-question-count-${mod.id}`}>{mod.questionCount}</span>
                      </div>
                    </div>
                    <div className="col-span-1">
                      <Badge variant={statusInfo.variant} data-testid={`badge-status-${mod.id}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <div className="col-span-1">
                      <span className="text-xs text-muted-foreground" data-testid={`text-creator-${mod.id}`}>
                        {mod.creatorName || "-"}
                      </span>
                    </div>
                    <div className="col-span-2 flex justify-end gap-1 flex-wrap">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setLocation(`/akademi-modul-editor/${mod.id}`)}
                        data-testid={`button-edit-module-${mod.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {canApprove && mod.status === "pending_review" && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => statusMutation.mutate({ moduleId: mod.id, status: "approved" })}
                            disabled={statusMutation.isPending}
                            data-testid={`button-approve-module-${mod.id}`}
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setRejectModuleId(mod.id);
                              setRejectDialogOpen(true);
                            }}
                            data-testid={`button-reject-module-${mod.id}`}
                          >
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                      {mod.status === "draft" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => statusMutation.mutate({ moduleId: mod.id, status: "pending_review" })}
                          disabled={statusMutation.isPending}
                          data-testid={`button-submit-review-${mod.id}`}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setDeleteModuleId(mod.id);
                            setDeleteDialogOpen(true);
                          }}
                          data-testid={`button-delete-module-${mod.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modülü Reddet</DialogTitle>
            <DialogDescription>Red sebebini belirtin. Bu bilgi modülü oluşturana iletilecektir.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Red sebebi..."
            rows={3}
            data-testid="input-rejection-reason"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!rejectionReason.trim()) {
                  toast({ title: "Red sebebi zorunludur", variant: "destructive" });
                  return;
                }
                if (rejectModuleId) {
                  statusMutation.mutate({ moduleId: rejectModuleId, status: "rejected", rejectionReason });
                }
              }}
              disabled={statusMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {statusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reddet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modülü Sil</DialogTitle>
            <DialogDescription>Bu modülü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteModuleId) {
                  deleteMutation.mutate(deleteModuleId);
                }
              }}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
