import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole, isBranchRole } from "@shared/schema";
import { AlertCircle, Search, CheckCircle2, Clock, XCircle, Eye, Star, Calendar, User, Building } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { ChecklistCompletion, User as UserType, Checklist, Branch } from "@shared/schema";

type CompletionWithDetails = ChecklistCompletion & { 
  user: UserType; 
  checklist: Checklist;
};

export default function ChecklistTrackingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filterBranchId, setFilterBranchId] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompletion, setSelectedCompletion] = useState<CompletionWithDetails | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewScore, setReviewScore] = useState<number>(100);
  const [reviewNote, setReviewNote] = useState("");

  const hasAccess = user && (isHQRole(user.role) || ['branch_manager', 'supervisor', 'shift_lead'].includes(user.role));
  if (!hasAccess) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h3 className="font-semibold text-lg">Yetkisiz Erişim</h3>
            <p className="text-muted-foreground">Bu sayfaya erişim yetkiniz yok.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['/api/branches'],
  });

  const effectiveBranchId = filterBranchId === "all" ? undefined : parseInt(filterBranchId);
  
  const { data: completions = [], isLoading } = useQuery<CompletionWithDetails[]>({
    queryKey: ['/api/checklist-completions/manager/all', filterDate, effectiveBranchId, filterStatus === "all" ? undefined : filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterDate) params.set('date', filterDate);
      if (effectiveBranchId) params.set('branchId', effectiveBranchId.toString());
      if (filterStatus !== "all") params.set('status', filterStatus);
      const res = await fetch(`/api/checklist-completions/manager/all?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const updateScoreMutation = useMutation({
    mutationFn: async ({ id, score, note }: { id: number; score: number; note: string }) => {
      return apiRequest('PUT', `/api/checklist-completions/${id}/review`, { score, reviewNote: note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-completions/manager/all'] });
      toast({ title: "Başarılı", description: "Puan güncellendi" });
      setReviewDialogOpen(false);
      setSelectedCompletion(null);
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const filteredCompletions = completions.filter((c) => {
    if (searchTerm) {
      const userName = `${c.user?.firstName || ''} ${c.user?.lastName || ''}`.toLowerCase();
      const checklistName = c.checklist?.title?.toLowerCase() || '';
      if (!userName.includes(searchTerm.toLowerCase()) && !checklistName.includes(searchTerm.toLowerCase())) {
        return false;
      }
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Tamamlandı</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Devam Ediyor</Badge>;
      case 'expired':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Süresi Doldu</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null || score === undefined) return "text-muted-foreground";
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const handleReview = (completion: CompletionWithDetails) => {
    setSelectedCompletion(completion);
    setReviewScore(completion.score || 100);
    setReviewNote("");
    setReviewDialogOpen(true);
  };

  const handleSubmitReview = () => {
    if (!selectedCompletion) return;
    updateScoreMutation.mutate({
      id: selectedCompletion.id,
      score: reviewScore,
      note: reviewNote,
    });
  };

  const completionsWithScore = completions.filter(c => c.score !== null && c.score !== undefined);
  const stats = {
    total: completions.length,
    submitted: completions.filter(c => c.status === 'submitted').length,
    inProgress: completions.filter(c => c.status === 'in_progress').length,
    expired: completions.filter(c => c.status === 'expired').length,
    avgScore: completionsWithScore.length > 0 
      ? completionsWithScore.reduce((sum, c) => sum + (c.score ?? 0), 0) / completionsWithScore.length
      : 0,
  };

  return (
    <div className="w-full space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-primary" />
            Checklist Takip Paneli
          </CardTitle>
          <CardDescription>
            Personelin checklist tamamlama durumlarını takip edin ve puanlayın
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Toplam</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-green-600">{stats.submitted}</div>
                <p className="text-xs text-muted-foreground">Tamamlandı</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
                <p className="text-xs text-muted-foreground">Devam Ediyor</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-blue-600">{Math.round(stats.avgScore)}</div>
                <p className="text-xs text-muted-foreground">Ort. Puan</p>
              </CardContent>
            </Card>
          </div>

          <Separator />

          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Tarih</Label>
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-40"
                data-testid="input-filter-date"
              />
            </div>

            {isHQRole(user.role) && (
              <div className="space-y-1">
                <Label className="text-xs">Şube</Label>
                <Select value={filterBranchId} onValueChange={setFilterBranchId}>
                  <SelectTrigger className="w-40" data-testid="select-filter-branch">
                    <SelectValue placeholder="Tüm Şubeler" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Şubeler</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Durum</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36" data-testid="select-filter-status">
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="submitted">Tamamlandı</SelectItem>
                  <SelectItem value="in_progress">Devam Ediyor</SelectItem>
                  <SelectItem value="expired">Süresi Doldu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px] space-y-1">
              <Label className="text-xs">Ara</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Personel veya checklist ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  data-testid="input-search"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Yükleniyor...
          </CardContent>
        </Card>
      ) : filteredCompletions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Henüz bu kriterlere uygun kayıt bulunmuyor
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredCompletions.map((completion) => (
            <Card key={completion.id} className="hover-elevate" data-testid={`card-completion-${completion.id}`}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex-1 min-w-[200px] space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {completion.user?.firstName} {completion.user?.lastName}
                      </span>
                      <Badge variant="outline" className="text-xs">{completion.user?.username}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{completion.checklist?.title || `Checklist #${completion.checklistId}`}</span>
                    </div>
                    {completion.startedAt && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Başlangıç: {format(new Date(completion.startedAt), "HH:mm", { locale: tr })}</span>
                        {completion.submittedAt && (
                          <span>- Bitiş: {format(new Date(completion.submittedAt), "HH:mm", { locale: tr })}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Tamamlanan</div>
                      <div className="font-semibold">
                        {completion.completedTasks || 0}/{completion.totalTasks || 0}
                      </div>
                    </div>
                    
                    {completion.score !== null && (
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Puan</div>
                        <div className={`font-bold text-lg ${getScoreColor(completion.score)}`}>
                          {completion.score}
                        </div>
                      </div>
                    )}

                    {getStatusBadge(completion.status)}

                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleReview(completion)}
                      data-testid={`button-review-${completion.id}`}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      İncele
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Checklist Puanlama
            </DialogTitle>
            <DialogDescription>
              {selectedCompletion?.user?.firstName} {selectedCompletion?.user?.lastName} - {selectedCompletion?.checklist?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Tamamlanan:</span>
                <span className="ml-2 font-medium">{selectedCompletion?.completedTasks || 0}/{selectedCompletion?.totalTasks || 0}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Sistem Puanı:</span>
                <span className={`ml-2 font-medium ${getScoreColor(selectedCompletion?.score || null)}`}>
                  {selectedCompletion?.score || 0}
                </span>
              </div>
              {selectedCompletion?.isLate && (
                <div className="col-span-2">
                  <Badge variant="destructive">Geç Başladı</Badge>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Yeni Puan (0-100)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={reviewScore}
                onChange={(e) => setReviewScore(parseInt(e.target.value) || 0)}
                data-testid="input-review-score"
              />
            </div>

            <div className="space-y-2">
              <Label>Not (İsteğe Bağlı)</Label>
              <Textarea
                placeholder="Değerlendirme notunuzu yazın..."
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={3}
                data-testid="input-review-note"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              İptal
            </Button>
            <Button 
              onClick={handleSubmitReview}
              disabled={updateScoreMutation.isPending}
              data-testid="button-submit-review"
            >
              Puanı Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
