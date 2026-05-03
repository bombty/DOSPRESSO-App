import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import { 
  AlertTriangle, CheckCircle2, Clock, AlertCircle, XCircle,
  Calendar, User, Building2, FileText, TrendingUp,
  Filter, Search, ArrowUpRight, ChevronRight, Loader2, Camera, Image
} from "lucide-react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { tr } from "date-fns/locale";

type CorrectiveAction = {
  id: number;
  auditInstanceId: number;
  auditItemId: number;
  priority: string;
  status: string;
  actionType: string;
  description: string;
  actionSlaHours: number;
  dueDate: string;
  completedDate: string | null;
  closedDate: string | null;
  assignedToId: string | null;
  createdById: string;
  createdAt: string;
  auditInstance?: {
    id: number;
    branchId: number | null;
    branch?: { id: number; name: string };
  };
  assignedTo?: { id: string; firstName: string; lastName: string };
  createdBy?: { id: string; firstName: string; lastName: string };
};

type CapaStats = {
  total: number;
  open: number;
  inProgress: number;
  pendingReview: number;
  closed: number;
  overdue: number;
  avgResolutionHours: number | null;
};

const priorityColors: Record<string, string> = {
  critical: "bg-red-500 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-black",
  low: "bg-green-500 text-white",
};

const priorityLabels: Record<string, string> = {
  critical: "Kritik",
  high: "Yüksek",
  medium: "Orta",
  low: "Düşük",
};

const statusColors: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  PENDING_REVIEW: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  CLOSED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  ESCALATED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const statusLabels: Record<string, string> = {
  OPEN: "Açık",
  IN_PROGRESS: "Devam Ediyor",
  PENDING_REVIEW: "İnceleme Bekliyor",
  PENDING_VERIFICATION: "Doğrulama Bekliyor",
  CLOSED: "Kapatıldı",
  OVERDUE: "Gecikmiş",
  ESCALATED: "Eskalasyon",
};

const actionTypeLabels: Record<string, string> = {
  CORRECTIVE: "Düzeltici",
  IMMEDIATE: "Acil",
  MAINTENANCE: "Bakım",
  PREVENTIVE: "Önleyici",
  corrective_and_preventive: "Düzeltici ve Önleyici",
};

export default function AksiyonTakipPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedCapa, setSelectedCapa] = useState<CorrectiveAction | null>(null);
  const [updateNotes, setUpdateNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);

  const queryParams = new URLSearchParams();
  if (activeTab !== "all" && activeTab !== "overdue") {
    queryParams.set("status", activeTab.toUpperCase());
  }
  if (priorityFilter !== "all") {
    queryParams.set("priority", priorityFilter);
  }

  const { data: capas = [], isLoading, isError, refetch } = useQuery<CorrectiveAction[]>({
    queryKey: ['/api/corrective-actions', activeTab, priorityFilter],
    queryFn: () => fetch(`/api/corrective-actions?${queryParams}`, { credentials: 'include' }).then(res => {
      if (!res.ok) throw new Error('Aksiyonlar yüklenemedi');
      return res.json();
    }),
  });

  const filteredCapas = capas.filter(capa => {
    let matches = true;
    
    if (searchQuery) {
      const query = searchQuery.toLocaleLowerCase('tr-TR');
      matches = capa.description.toLocaleLowerCase('tr-TR').includes(query) ||
        capa.auditInstance?.branch?.name?.toLocaleLowerCase('tr-TR').includes(query) ||
        false;
    }
    
    if (activeTab === "overdue") {
      matches = matches && isPast(new Date(capa.dueDate)) && capa.status !== "CLOSED";
    }
    
    return matches;
  });

  const stats: CapaStats = {
    total: capas.length,
    open: capas.filter(c => c.status === "OPEN").length,
    inProgress: capas.filter(c => c.status === "IN_PROGRESS").length,
    pendingReview: capas.filter(c => c.status === "PENDING_REVIEW").length,
    closed: capas.filter(c => c.status === "CLOSED").length,
    overdue: capas.filter(c => isPast(new Date(c.dueDate)) && c.status !== "CLOSED").length,
    avgResolutionHours: null,
  };

  const updateCapaMutation = useMutation({
    mutationFn: async ({ id, status, notes, evidence }: { id: number; status: string; notes: string; evidence?: string }) => {
      return await apiRequest('PUT', `/api/corrective-actions/${id}`, { status, notes, evidence });
    },
    onSuccess: () => {
      toast({ title: "Aksiyon güncellendi", description: "Durum başarıyla değiştirildi." });
      queryClient.invalidateQueries({ queryKey: ['/api/corrective-actions'] });
      setSelectedCapa(null);
      setUpdateNotes("");
      setNewStatus("");
      setEvidenceUrl(null);
    },
    onError: (error) => {
      toast({ 
        title: "Hata", 
        description: error.message || "Aksiyon güncellenemedi",
        variant: "destructive"
      });
    },
  });

  const handleStatusUpdate = () => {
    if (!selectedCapa || !newStatus) return;
    
    if (newStatus === "CLOSED" && !evidenceUrl) {
      toast({ 
        title: "Fotoğraf Gerekli", 
        description: "Aksiyonu kapatmak için kanıt fotoğrafı yüklemeniz gerekiyor.",
        variant: "destructive"
      });
      return;
    }
    
    updateCapaMutation.mutate({
      id: selectedCapa.id,
      status: newStatus,
      notes: updateNotes,
      evidence: evidenceUrl || undefined,
    });
  };

  const handlePhotoUpload = (result: { successful: { uploadURL: string }[] }) => {
    if (result.successful?.[0]?.uploadURL) {
      setEvidenceUrl(result.successful[0].uploadURL);
      toast({ title: "Fotoğraf yüklendi", description: "Kanıt fotoğrafı başarıyla yüklendi." });
    }
  };

  const StatCard = ({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) => (
    <Card className="hover-elevate">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className={`p-2 rounded-full ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const CapaCard = ({ capa }: { capa: CorrectiveAction }) => {
    const isOverdue = isPast(new Date(capa.dueDate)) && capa.status !== "CLOSED";
    
    return (
      <Card 
        className={`hover-elevate cursor-pointer ${isOverdue ? 'border-red-500 border-2' : ''}`}
        onClick={() => setSelectedCapa(capa)}
        data-testid={`capa-card-${capa.id}`}
      >
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={priorityColors[capa.priority] || "bg-muted text-muted-foreground"}>
                {priorityLabels[capa.priority] || capa.priority}
              </Badge>
              <Badge variant="outline" className={statusColors[capa.status] || ""}>
                {statusLabels[capa.status] || capa.status}
              </Badge>
              <Badge variant="secondary">
                {actionTypeLabels[capa.actionType] || capa.actionType}
              </Badge>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </div>
          
          <p className="text-sm line-clamp-2 mb-3">{capa.description}</p>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            {capa.auditInstance?.branch && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {capa.auditInstance.branch.name}
              </span>
            )}
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
              <Clock className="h-3 w-3" />
              {isOverdue ? 'Gecikmiş: ' : ''}
              {formatDistanceToNow(new Date(capa.dueDate), { locale: tr, addSuffix: true })}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Aksiyon Takip Paneli</h1>
          <p className="text-muted-foreground">Denetimlerden açılan düzeltici aksiyonları takip edin</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard 
          title="Toplam" 
          value={stats.total} 
          icon={FileText} 
          color="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300" 
        />
        <StatCard 
          title="Açık" 
          value={stats.open} 
          icon={AlertCircle} 
          color="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300" 
        />
        <StatCard 
          title="Devam Eden" 
          value={stats.inProgress} 
          icon={Clock} 
          color="bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300" 
        />
        <StatCard 
          title="İnceleme" 
          value={stats.pendingReview} 
          icon={TrendingUp} 
          color="bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300" 
        />
        <StatCard 
          title="Kapatıldı" 
          value={stats.closed} 
          icon={CheckCircle2} 
          color="bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300" 
        />
        <StatCard 
          title="Gecikmiş" 
          value={stats.overdue} 
          icon={AlertTriangle} 
          color="bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300" 
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-lg">Düzeltici Aksiyonlar (CAPA)</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-[200px]"
                  data-testid="input-search-capa"
                />
              </div>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-priority-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Öncelik" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="critical">Kritik</SelectItem>
                  <SelectItem value="high">Yüksek</SelectItem>
                  <SelectItem value="medium">Orta</SelectItem>
                  <SelectItem value="low">Düşük</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all" data-testid="tab-all">Tümü ({stats.total})</TabsTrigger>
              <TabsTrigger value="open" data-testid="tab-open">Açık ({stats.open})</TabsTrigger>
              <TabsTrigger value="in_progress" data-testid="tab-in-progress">Devam ({stats.inProgress})</TabsTrigger>
              <TabsTrigger value="overdue" data-testid="tab-overdue" className="text-red-500">
                Gecikmiş ({stats.overdue})
              </TabsTrigger>
              <TabsTrigger value="closed" data-testid="tab-closed">Kapatıldı ({stats.closed})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              {isError ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                  <h3 className="text-lg font-semibold">Bir hata oluştu</h3>
                  <p className="text-muted-foreground mt-2">Veriler yüklenirken sorun oluştu.</p>
                  <Button onClick={() => refetch()} className="mt-4" data-testid="button-retry">Tekrar Dene</Button>
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredCapas.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Bu kriterlere uygun aksiyon bulunamadı.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCapas.map(capa => (
                    <CapaCard key={capa.id} capa={capa} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!selectedCapa} onOpenChange={(open) => !open && setSelectedCapa(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Aksiyon Detayı #{selectedCapa?.id}
            </DialogTitle>
            <DialogDescription>
              Düzeltici aksiyon detayları ve durum güncelleme
            </DialogDescription>
          </DialogHeader>
          
          {selectedCapa && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={priorityColors[selectedCapa.priority] || "bg-muted text-muted-foreground"}>
                  {priorityLabels[selectedCapa.priority] || selectedCapa.priority}
                </Badge>
                <Badge variant="outline" className={statusColors[selectedCapa.status] || ""}>
                  {statusLabels[selectedCapa.status] || selectedCapa.status}
                </Badge>
                <Badge variant="secondary">
                  {actionTypeLabels[selectedCapa.actionType] || selectedCapa.actionType}
                </Badge>
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm">{selectedCapa.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Şube</Label>
                  <p>{selectedCapa.auditInstance?.branch?.name || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">SLA</Label>
                  <p>{selectedCapa.actionSlaHours} saat</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Son Tarih</Label>
                  <p className={isPast(new Date(selectedCapa.dueDate)) && selectedCapa.status !== "CLOSED" ? 'text-red-500 font-medium' : ''}>
                    {format(new Date(selectedCapa.dueDate), "dd MMM yyyy HH:mm", { locale: tr })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Oluşturulma</Label>
                  <p>{format(new Date(selectedCapa.createdAt), "dd MMM yyyy", { locale: tr })}</p>
                </div>
              </div>

              {selectedCapa.status !== "CLOSED" && (
                <div className="space-y-3 pt-2 border-t">
                  <Label>Durum Güncelle</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger data-testid="select-new-status">
                      <SelectValue placeholder="Yeni durum seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN_PROGRESS">Devam Ediyor</SelectItem>
                      <SelectItem value="PENDING_REVIEW">İnceleme Bekliyor</SelectItem>
                      <SelectItem value="CLOSED">Kapatıldı</SelectItem>
                      <SelectItem value="ESCALATED">Eskalasyon</SelectItem>
                    </SelectContent>
                  </Select>

                  <Textarea 
                    placeholder="Güncelleme notu (opsiyonel)"
                    value={updateNotes}
                    onChange={(e) => setUpdateNotes(e.target.value)}
                    className="min-h-[80px]"
                    data-testid="textarea-update-notes"
                  />

                  {newStatus === "CLOSED" && (
                    <div className="space-y-2 pt-2 border-t">
                      <Label className="flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        Kanit Fotografı (Zorunlu)
                      </Label>
                      {evidenceUrl ? (
                        <div className="relative">
                          <img 
                            src={evidenceUrl} 
                            alt="Kanıt fotoğrafı" 
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => setEvidenceUrl(null)}
                            data-testid="button-remove-photo"
                          >
                            Kaldir
                          </Button>
                        </div>
                      ) : (
                        <ObjectUploader
                          onGetUploadParameters={async () => {
                            try {
                              const response = await apiRequest('POST', '/api/upload-url', {
                                fileName: `capa-evidence-${selectedCapa?.id}-${Date.now()}.jpg`,
                                fileType: 'image/jpeg',
                              });
                              const data = await response.json();
                              return data as { method: "PUT"; url: string };
                            } catch (err) {
                              toast({ title: 'Hata', description: 'Yuklemek icin URL alınamadı', variant: 'destructive' });
                              throw err;
                            }
                          }}
                          onComplete={handlePhotoUpload}
                          buttonClassName="w-full"
                        >
                          <div className="flex items-center gap-2 justify-center">
                            <Image className="h-4 w-4" />
                            Fotograf Yukle
                          </div>
                        </ObjectUploader>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Aksiyonu kapatmak için tamamlandığını gösteren bir fotoğraf yükleyin.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedCapa(null)}>
              Kapat
            </Button>
            {selectedCapa?.status !== "CLOSED" && (
              <Button 
                onClick={handleStatusUpdate}
                disabled={!newStatus || updateCapaMutation.isPending}
                data-testid="button-update-status"
              >
                {updateCapaMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Güncelle
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
