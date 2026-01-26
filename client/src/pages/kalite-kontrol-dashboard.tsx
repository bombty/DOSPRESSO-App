import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  Star, 
  MessageSquare, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Send,
  TrendingUp,
  TrendingDown,
  Building2,
  QrCode,
  Users,
  Sparkles,
  Timer,
  Award,
  Target,
  Calendar,
  Reply,
  Eye
} from "lucide-react";
import { format, differenceInHours, differenceInMinutes, isToday, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

interface Feedback {
  id: number;
  branchId: number;
  branchName: string;
  source: string;
  rating: number;
  serviceRating?: number;
  cleanlinessRating?: number;
  productRating?: number;
  staffRating?: number;
  staffId?: string;
  comment?: string;
  customerName?: string;
  isAnonymous: boolean;
  priority: string;
  status: string;
  slaBreached: boolean;
  responseDeadline?: string;
  feedbackDate: string;
  reviewedAt?: string;
  resolvedAt?: string;
  feedbackType?: string;
}

interface FeedbackStats {
  statusCounts: Record<string, number>;
  sourceCounts: Record<string, number>;
  avgRating: number;
  totalCount: number;
  slaBreachedCount: number;
}

interface PerformanceMetrics {
  totalResponded: number;
  totalPending: number;
  avgResponseTime: number;
  onTimeRate: number;
  todayResponded: number;
  todayPending: number;
  weeklyScore: number;
}

const sourceLabels: Record<string, { label: string; icon: any; color: string }> = {
  qr_code: { label: 'QR Kod', icon: QrCode, color: 'bg-blue-500' },
  google: { label: 'Google', icon: Building2, color: 'bg-red-500' },
  instagram: { label: 'Instagram', icon: Sparkles, color: 'bg-pink-500' },
  in_person: { label: 'Yüz Yüze', icon: Users, color: 'bg-green-500' },
  phone: { label: 'Telefon', icon: MessageSquare, color: 'bg-purple-500' },
  email: { label: 'E-posta', icon: Send, color: 'bg-orange-500' },
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  new: { label: 'Yeni', variant: 'destructive' },
  in_progress: { label: 'İnceleniyor', variant: 'default' },
  awaiting_response: { label: 'Yanıt Bekliyor', variant: 'secondary' },
  resolved: { label: 'Çözüldü', variant: 'outline' },
  closed: { label: 'Kapatıldı', variant: 'outline' },
};

const priorityLabels: Record<string, { label: string; color: string }> = {
  critical: { label: 'Kritik', color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
  high: { label: 'Yüksek', color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' },
  medium: { label: 'Orta', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' },
  low: { label: 'Düşük', color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
};

export default function KaliteKontrolDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [responseContent, setResponseContent] = useState('');
  const [responseType, setResponseType] = useState('resolution');
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const { data: feedbacks = [], isLoading } = useQuery<Feedback[]>({
    queryKey: ['/api/customer-feedback', 'pending'],
    queryFn: async () => {
      const res = await fetch('/api/customer-feedback?status=new,in_progress,awaiting_response', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const { data: stats } = useQuery<FeedbackStats>({
    queryKey: ['/api/customer-feedback/stats/summary'],
    queryFn: async () => {
      const res = await fetch('/api/customer-feedback/stats/summary', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const { data: allFeedbacks = [] } = useQuery<Feedback[]>({
    queryKey: ['/api/customer-feedback', 'all'],
    queryFn: async () => {
      const res = await fetch('/api/customer-feedback', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const calculatePerformance = (): PerformanceMetrics => {
    const resolved = allFeedbacks.filter(f => f.status === 'resolved' || f.status === 'closed');
    const pending = allFeedbacks.filter(f => ['new', 'in_progress', 'awaiting_response'].includes(f.status));
    
    const todayResolved = resolved.filter(f => f.resolvedAt && isToday(parseISO(f.resolvedAt)));
    const todayPending = pending.filter(f => isToday(parseISO(f.feedbackDate)));
    
    const onTimeResolved = resolved.filter(f => !f.slaBreached);
    const onTimeRate = resolved.length > 0 ? (onTimeResolved.length / resolved.length) * 100 : 100;
    
    let totalResponseHours = 0;
    resolved.forEach(f => {
      if (f.resolvedAt && f.feedbackDate) {
        const hours = differenceInHours(parseISO(f.resolvedAt), parseISO(f.feedbackDate));
        totalResponseHours += hours;
      }
    });
    const avgResponseTime = resolved.length > 0 ? totalResponseHours / resolved.length : 0;
    
    const weeklyScore = Math.min(100, Math.round(onTimeRate * 0.6 + (100 - Math.min(avgResponseTime, 48) / 48 * 100) * 0.4));
    
    return {
      totalResponded: resolved.length,
      totalPending: pending.length,
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
      onTimeRate: Math.round(onTimeRate),
      todayResponded: todayResolved.length,
      todayPending: todayPending.length,
      weeklyScore
    };
  };

  const performance = calculatePerformance();

  const addResponseMutation = useMutation({
    mutationFn: async (data: { id: number; responseType: string; content: string }) => {
      return apiRequest('POST', `/api/customer-feedback/${data.id}/response`, {
        responseType: data.responseType,
        content: data.content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer-feedback'] });
      setShowResponseDialog(false);
      setResponseContent('');
      setSelectedFeedback(null);
      toast({ title: "Yanıt başarıyla eklendi" });
    },
    onError: () => {
      toast({ title: "Yanıt eklenemedi", variant: "destructive" });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (data: { id: number; status: string }) => {
      return apiRequest('PATCH', `/api/customer-feedback/${data.id}/status`, { status: data.status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer-feedback'] });
      toast({ title: "Durum güncellendi" });
    },
  });

  const handleQuickResolve = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setShowResponseDialog(true);
  };

  const handleSubmitResponse = () => {
    if (!selectedFeedback || !responseContent.trim()) return;
    
    addResponseMutation.mutate({
      id: selectedFeedback.id,
      responseType,
      content: responseContent
    });
  };

  const getRemainingTime = (deadline: string | undefined) => {
    if (!deadline) return null;
    const deadlineDate = parseISO(deadline);
    const now = new Date();
    const minutes = differenceInMinutes(deadlineDate, now);
    
    if (minutes < 0) return { text: 'SLA Aşıldı', urgent: true };
    if (minutes < 60) return { text: `${minutes} dk`, urgent: true };
    if (minutes < 1440) return { text: `${Math.floor(minutes / 60)} saat`, urgent: minutes < 120 };
    return { text: `${Math.floor(minutes / 1440)} gün`, urgent: false };
  };

  const sortedFeedbacks = [...feedbacks].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const pA = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
    const pB = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;
    if (pA !== pB) return pA - pB;
    
    if (a.slaBreached && !b.slaBreached) return -1;
    if (!a.slaBreached && b.slaBreached) return 1;
    
    return new Date(a.feedbackDate).getTime() - new Date(b.feedbackDate).getTime();
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Kalite Kontrol Paneli
          </h1>
          <p className="text-muted-foreground">Müşteri geri bildirimlerini takip edin ve yanıtlayın</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Calendar className="h-4 w-4 mr-2" />
          {format(new Date(), 'd MMMM yyyy', { locale: tr })}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{performance.todayPending}</p>
                <p className="text-xs text-muted-foreground">Bugün Bekleyen</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{performance.todayResponded}</p>
                <p className="text-xs text-muted-foreground">Bugün Yanıtlanan</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Timer className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{performance.avgResponseTime} saat</p>
                <p className="text-xs text-muted-foreground">Ort. Yanıt Süresi</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">%{performance.onTimeRate}</p>
                <p className="text-xs text-muted-foreground">Zamanında Yanıt</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/20">
                <Award className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{performance.weeklyScore}</p>
                <p className="text-xs text-muted-foreground">Haftalık Skor</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Bekleyen Geri Bildirimler
            </CardTitle>
            <CardDescription>Öncelik sırasına göre listeleniyor</CardDescription>
          </div>
          <Badge variant="secondary" className="text-lg">
            {performance.totalPending} bekleyen
          </Badge>
        </CardHeader>
        <CardContent>
          {sortedFeedbacks.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500 opacity-50" />
              <p className="text-lg font-medium">Tebrikler!</p>
              <p className="text-muted-foreground">Bekleyen geri bildirim bulunmuyor</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {sortedFeedbacks.map((feedback) => {
                  const remaining = getRemainingTime(feedback.responseDeadline);
                  const sourceInfo = sourceLabels[feedback.source] || { label: feedback.source, icon: MessageSquare, color: 'bg-gray-500' };
                  const SourceIcon = sourceInfo.icon;
                  const priorityInfo = priorityLabels[feedback.priority] || priorityLabels.medium;
                  const statusInfo = statusLabels[feedback.status] || statusLabels.new;
                  
                  return (
                    <Card 
                      key={feedback.id} 
                      className={`hover-elevate cursor-pointer ${feedback.slaBreached ? 'border-red-500 border-2' : ''}`}
                      data-testid={`feedback-card-${feedback.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <Badge className={priorityInfo.color}>
                                {priorityInfo.label}
                              </Badge>
                              <Badge variant={statusInfo.variant}>
                                {statusInfo.label}
                              </Badge>
                              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white ${sourceInfo.color}`}>
                                <SourceIcon className="h-3 w-3" />
                                {sourceInfo.label}
                              </div>
                              {feedback.slaBreached && (
                                <Badge variant="destructive" className="animate-pulse">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  SLA Aşıldı
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm mb-1">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{feedback.branchName}</span>
                              <span className="text-muted-foreground">•</span>
                              <div className="flex items-center">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${star <= feedback.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                                  />
                                ))}
                              </div>
                            </div>
                            
                            {feedback.comment && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                "{feedback.comment}"
                              </p>
                            )}
                            
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(parseISO(feedback.feedbackDate), 'd MMM HH:mm', { locale: tr })}
                              </span>
                              {remaining && (
                                <span className={`flex items-center gap-1 ${remaining.urgent ? 'text-red-500 font-medium' : ''}`}>
                                  <Timer className="h-3 w-3" />
                                  {remaining.text}
                                </span>
                              )}
                              {!feedback.isAnonymous && feedback.customerName && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {feedback.customerName}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <Button 
                              size="sm" 
                              onClick={(e) => { e.stopPropagation(); handleQuickResolve(feedback); }}
                              data-testid={`respond-button-${feedback.id}`}
                            >
                              <Reply className="h-4 w-4 mr-1" />
                              Yanıtla
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => { e.stopPropagation(); setSelectedFeedback(feedback); setShowDetailDialog(true); }}
                              data-testid={`view-button-${feedback.id}`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Detay
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performans Özeti
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Zamanında Yanıtlama Oranı</span>
                <span className="font-medium">%{performance.onTimeRate}</span>
              </div>
              <Progress value={performance.onTimeRate} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Haftalık Performans Skoru</span>
                <span className="font-medium">{performance.weeklyScore}/100</span>
              </div>
              <Progress value={performance.weeklyScore} className="h-2" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{performance.totalResponded}</p>
                <p className="text-xs text-muted-foreground">Toplam Yanıtlanan</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{stats?.slaBreachedCount || 0}</p>
                <p className="text-xs text-muted-foreground">SLA İhlali</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Geri Bildirime Yanıt Ver</DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium">{selectedFeedback.branchName}</span>
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3 w-3 ${star <= selectedFeedback.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>
                {selectedFeedback.comment && (
                  <p className="text-sm text-muted-foreground">"{selectedFeedback.comment}"</p>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Yanıt Türü</label>
                <Select value={responseType} onValueChange={setResponseType}>
                  <SelectTrigger data-testid="response-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resolution">Çözüm</SelectItem>
                    <SelectItem value="clarification">Açıklama</SelectItem>
                    <SelectItem value="defense">Savunma</SelectItem>
                    <SelectItem value="apology">Özür</SelectItem>
                    <SelectItem value="followup">Takip</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Yanıt İçeriği</label>
                <Textarea 
                  value={responseContent}
                  onChange={(e) => setResponseContent(e.target.value)}
                  placeholder="Yanıtınızı buraya yazın..."
                  className="min-h-[120px]"
                  data-testid="response-content-textarea"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResponseDialog(false)}>
              İptal
            </Button>
            <Button 
              onClick={handleSubmitResponse}
              disabled={!responseContent.trim() || addResponseMutation.isPending}
              data-testid="submit-response-button"
            >
              <Send className="h-4 w-4 mr-2" />
              {addResponseMutation.isPending ? 'Gönderiliyor...' : 'Yanıtı Gönder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Geri Bildirim Detayı</DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Şube</label>
                  <p className="font-medium">{selectedFeedback.branchName}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Kaynak</label>
                  <p className="font-medium">{sourceLabels[selectedFeedback.source]?.label || selectedFeedback.source}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Genel Puan</label>
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${star <= selectedFeedback.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Tarih</label>
                  <p className="font-medium">{format(parseISO(selectedFeedback.feedbackDate), 'd MMMM yyyy HH:mm', { locale: tr })}</p>
                </div>
              </div>
              
              {selectedFeedback.serviceRating && (
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 bg-muted rounded">
                    <p className="text-lg font-bold">{selectedFeedback.serviceRating}</p>
                    <p className="text-xs text-muted-foreground">Hizmet</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <p className="text-lg font-bold">{selectedFeedback.cleanlinessRating || '-'}</p>
                    <p className="text-xs text-muted-foreground">Temizlik</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <p className="text-lg font-bold">{selectedFeedback.productRating || '-'}</p>
                    <p className="text-xs text-muted-foreground">Ürün</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <p className="text-lg font-bold">{selectedFeedback.staffRating || '-'}</p>
                    <p className="text-xs text-muted-foreground">Personel</p>
                  </div>
                </div>
              )}
              
              {selectedFeedback.comment && (
                <div>
                  <label className="text-xs text-muted-foreground">Yorum</label>
                  <p className="mt-1 p-3 bg-muted rounded-lg">{selectedFeedback.comment}</p>
                </div>
              )}
              
              {!selectedFeedback.isAnonymous && selectedFeedback.customerName && (
                <div>
                  <label className="text-xs text-muted-foreground">Müşteri</label>
                  <p className="font-medium">{selectedFeedback.customerName}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Kapat
            </Button>
            <Button onClick={() => { setShowDetailDialog(false); handleQuickResolve(selectedFeedback!); }}>
              <Reply className="h-4 w-4 mr-2" />
              Yanıtla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
