import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Star, 
  MessageSquare, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Filter,
  Plus,
  ExternalLink,
  Send,
  TrendingUp,
  TrendingDown,
  Building2,
  QrCode,
  Instagram,
  MapPin,
  Users,
  Sparkles,
  Brush,
  Package,
  User
} from "lucide-react";
import { format } from "date-fns";
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
  externalReviewUrl?: string;
}

interface FeedbackStats {
  statusCounts: Record<string, number>;
  sourceCounts: Record<string, number>;
  avgRating: number;
  avgService: number;
  avgCleanliness: number;
  avgProduct: number;
  avgStaff: number;
  totalCount: number;
  slaBreachedCount: number;
}

interface Branch {
  id: number;
  name: string;
  city: string;
}

const sourceLabels: Record<string, { label: string; icon: any; color: string }> = {
  qr_code: { label: 'QR Kod', icon: QrCode, color: 'bg-blue-500' },
  google: { label: 'Google', icon: MapPin, color: 'bg-red-500' },
  instagram: { label: 'Instagram', icon: Instagram, color: 'bg-pink-500' },
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
  critical: { label: 'Kritik', color: 'text-red-600 bg-red-100' },
  high: { label: 'Yüksek', color: 'text-orange-600 bg-orange-100' },
  medium: { label: 'Orta', color: 'text-yellow-600 bg-yellow-100' },
  low: { label: 'Düşük', color: 'text-green-600 bg-green-100' },
};

export default function MisafirMemnuniyeti() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showAddExternalDialog, setShowAddExternalDialog] = useState(false);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [filters, setFilters] = useState({ status: '', source: '', branchId: '', priority: '' });
  const [responseContent, setResponseContent] = useState('');
  const [responseType, setResponseType] = useState('defense');

  const [externalForm, setExternalForm] = useState({
    branchId: '',
    source: 'google',
    rating: 3,
    comment: '',
    customerName: '',
    externalReviewUrl: '',
  });

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.source) params.append('source', filters.source);
    if (filters.branchId) params.append('branchId', filters.branchId);
    if (filters.priority) params.append('priority', filters.priority);
    return params.toString();
  };

  const { data: feedbacks = [], isLoading } = useQuery<Feedback[]>({
    queryKey: ['/api/customer-feedback', filters.status, filters.source, filters.branchId, filters.priority],
    queryFn: async () => {
      const params = buildQueryParams();
      const url = params ? `/api/customer-feedback?${params}` : '/api/customer-feedback';
      const res = await fetch(url, { credentials: 'include' });
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

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['/api/branches'],
  });

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
      toast({ title: "Yanıt eklendi" });
    },
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

  const addExternalMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/customer-feedback/external', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer-feedback'] });
      setShowAddExternalDialog(false);
      setExternalForm({ branchId: '', source: 'google', rating: 3, comment: '', customerName: '', externalReviewUrl: '' });
      toast({ title: "Harici yorum eklendi" });
    },
  });

  const StarDisplay = ({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} ${
            star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );

  const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-2 text-sm">
            {trend >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span className={trend >= 0 ? 'text-green-500' : 'text-red-500'}>
              {Math.abs(trend)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Misafir Memnuniyeti</h1>
          <p className="text-muted-foreground">Müşteri geri bildirimleri ve değerlendirmeler</p>
        </div>
        <Button onClick={() => setShowAddExternalDialog(true)} data-testid="button-add-external">
          <Plus className="mr-2 h-4 w-4" />
          Harici Yorum Ekle
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Toplam"
          value={stats?.totalCount || 0}
          icon={MessageSquare}
          color="bg-blue-500"
        />
        <StatCard
          title="Ortalama Puan"
          value={stats?.avgRating?.toFixed(1) || '-'}
          icon={Star}
          color="bg-yellow-500"
        />
        <StatCard
          title="Yeni"
          value={stats?.statusCounts?.new || 0}
          icon={AlertTriangle}
          color="bg-red-500"
        />
        <StatCard
          title="İnceleniyor"
          value={stats?.statusCounts?.in_progress || 0}
          icon={Clock}
          color="bg-orange-500"
        />
        <StatCard
          title="Çözüldü"
          value={stats?.statusCounts?.resolved || 0}
          icon={CheckCircle2}
          color="bg-green-500"
        />
        <StatCard
          title="SLA Aşılan"
          value={stats?.slaBreachedCount || 0}
          icon={XCircle}
          color="bg-red-600"
        />
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Geri Bildirimler</TabsTrigger>
          <TabsTrigger value="analytics">Analitik</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filters.status || "_all"} onValueChange={(v) => setFilters({ ...filters, status: v === "_all" ? "" : v })}>
                  <SelectTrigger className="w-[140px]" data-testid="filter-status">
                    <SelectValue placeholder="Durum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Tümü</SelectItem>
                    {Object.entries(statusLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filters.source || "_all"} onValueChange={(v) => setFilters({ ...filters, source: v === "_all" ? "" : v })}>
                  <SelectTrigger className="w-[140px]" data-testid="filter-source">
                    <SelectValue placeholder="Kaynak" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Tümü</SelectItem>
                    {Object.entries(sourceLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filters.priority || "_all"} onValueChange={(v) => setFilters({ ...filters, priority: v === "_all" ? "" : v })}>
                  <SelectTrigger className="w-[140px]" data-testid="filter-priority">
                    <SelectValue placeholder="Öncelik" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Tümü</SelectItem>
                    {Object.entries(priorityLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {branches.length > 0 && (
                  <Select value={filters.branchId || "_all"} onValueChange={(v) => setFilters({ ...filters, branchId: v === "_all" ? "" : v })}>
                    <SelectTrigger className="w-[160px]" data-testid="filter-branch">
                      <SelectValue placeholder="Şube" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">Tüm Şubeler</SelectItem>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {isLoading ? (
                    <p className="text-center text-muted-foreground py-8">Yükleniyor...</p>
                  ) : feedbacks.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Geri bildirim bulunamadı</p>
                  ) : (
                    feedbacks.map((fb) => {
                      const sourceInfo = sourceLabels[fb.source] || sourceLabels.qr_code;
                      const statusInfo = statusLabels[fb.status] || statusLabels.new;
                      const priorityInfo = priorityLabels[fb.priority] || priorityLabels.medium;
                      const SourceIcon = sourceInfo.icon;

                      return (
                        <Card
                          key={fb.id}
                          className="hover-elevate cursor-pointer"
                          onClick={() => {
                            setSelectedFeedback(fb);
                            setShowDetailDialog(true);
                          }}
                          data-testid={`feedback-card-${fb.id}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                  <div className={`p-1 rounded ${sourceInfo.color}`}>
                                    <SourceIcon className="h-3 w-3 text-white" />
                                  </div>
                                  <span className="font-medium">{fb.branchName}</span>
                                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                                  <span className={`text-xs px-2 py-0.5 rounded ${priorityInfo.color}`}>
                                    {priorityInfo.label}
                                  </span>
                                  {fb.slaBreached && (
                                    <Badge variant="destructive" className="text-xs">SLA Aşıldı</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mb-2">
                                  <StarDisplay rating={fb.rating} />
                                  <span className="text-sm text-muted-foreground">
                                    {format(new Date(fb.feedbackDate), 'dd MMM yyyy HH:mm', { locale: tr })}
                                  </span>
                                </div>
                                {fb.comment && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">{fb.comment}</p>
                                )}
                              </div>
                              {fb.externalReviewUrl && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(fb.externalReviewUrl, '_blank');
                                  }}
                                  data-testid={`button-external-link-${fb.id}`}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Kategori Ortalamaları</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Hizmet', value: stats?.avgService, icon: Sparkles },
                  { label: 'Temizlik', value: stats?.avgCleanliness, icon: Brush },
                  { label: 'Ürün', value: stats?.avgProduct, icon: Package },
                  { label: 'Personel', value: stats?.avgStaff, icon: User },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      <span>{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StarDisplay rating={Math.round(item.value || 0)} size="sm" />
                      <span className="font-medium">{item.value?.toFixed(1) || '-'}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Kaynak Dağılımı</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(stats?.sourceCounts || {}).map(([source, count]) => {
                  const info = sourceLabels[source] || sourceLabels.qr_code;
                  const Icon = info.icon;
                  const total = stats?.totalCount || 1;
                  const percentage = Math.round((count / total) * 100);
                  return (
                    <div key={source} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{info.label}</span>
                        </div>
                        <span>{count} ({percentage}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${info.color}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Geri Bildirim Detayı</DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{selectedFeedback.branchName}</span>
              </div>
              <div className="flex items-center gap-4">
                <StarDisplay rating={selectedFeedback.rating} size="md" />
                <Badge variant={statusLabels[selectedFeedback.status]?.variant}>
                  {statusLabels[selectedFeedback.status]?.label}
                </Badge>
              </div>
              {selectedFeedback.comment && (
                <div>
                  <Label className="text-sm text-muted-foreground">Yorum</Label>
                  <p className="mt-1">{selectedFeedback.comment}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {selectedFeedback.serviceRating && (
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span>Hizmet: {selectedFeedback.serviceRating}/5</span>
                  </div>
                )}
                {selectedFeedback.cleanlinessRating && (
                  <div className="flex items-center gap-2">
                    <Brush className="h-4 w-4" />
                    <span>Temizlik: {selectedFeedback.cleanlinessRating}/5</span>
                  </div>
                )}
                {selectedFeedback.productRating && (
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>Ürün: {selectedFeedback.productRating}/5</span>
                  </div>
                )}
                {selectedFeedback.staffRating && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Personel: {selectedFeedback.staffRating}/5</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetailDialog(false);
                    setShowResponseDialog(true);
                  }}
                  data-testid="button-add-response"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Yanıt Ekle
                </Button>
                {selectedFeedback.status !== 'resolved' && (
                  <Button
                    onClick={() => updateStatusMutation.mutate({ id: selectedFeedback.id, status: 'resolved' })}
                    data-testid="button-resolve"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Çözüldü
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yanıt/Savunma Ekle</DialogTitle>
            <DialogDescription>
              Geri bildirime yanıt veya iç not ekleyin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Yanıt Türü</Label>
              <Select value={responseType} onValueChange={setResponseType}>
                <SelectTrigger data-testid="select-response-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="defense">Savunma</SelectItem>
                  <SelectItem value="reply">Yanıt</SelectItem>
                  <SelectItem value="internal_note">İç Not</SelectItem>
                  <SelectItem value="customer_contact">Müşteri İletişimi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>İçerik</Label>
              <Textarea
                value={responseContent}
                onChange={(e) => setResponseContent(e.target.value)}
                placeholder="Yanıtınızı yazın..."
                className="min-h-[120px]"
                data-testid="input-response-content"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResponseDialog(false)}>
              İptal
            </Button>
            <Button
              onClick={() => {
                if (selectedFeedback && responseContent) {
                  addResponseMutation.mutate({
                    id: selectedFeedback.id,
                    responseType,
                    content: responseContent,
                  });
                }
              }}
              disabled={!responseContent || addResponseMutation.isPending}
              data-testid="button-submit-response"
            >
              Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddExternalDialog} onOpenChange={setShowAddExternalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Harici Yorum Ekle</DialogTitle>
            <DialogDescription>
              Google veya Instagram'dan manuel yorum girişi
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Şube *</Label>
              <Select
                value={externalForm.branchId}
                onValueChange={(v) => setExternalForm({ ...externalForm, branchId: v })}
              >
                <SelectTrigger data-testid="select-external-branch">
                  <SelectValue placeholder="Şube seçin" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kaynak *</Label>
              <Select
                value={externalForm.source}
                onValueChange={(v) => setExternalForm({ ...externalForm, source: v })}
              >
                <SelectTrigger data-testid="select-external-source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="in_person">Yüz Yüze</SelectItem>
                  <SelectItem value="phone">Telefon</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Puan *</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setExternalForm({ ...externalForm, rating: star })}
                    className="focus:outline-none"
                    data-testid={`star-external-${star}`}
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= externalForm.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Müşteri Adı</Label>
              <Input
                value={externalForm.customerName}
                onChange={(e) => setExternalForm({ ...externalForm, customerName: e.target.value })}
                placeholder="Opsiyonel"
                data-testid="input-external-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Yorum Linki</Label>
              <Input
                value={externalForm.externalReviewUrl}
                onChange={(e) => setExternalForm({ ...externalForm, externalReviewUrl: e.target.value })}
                placeholder="https://..."
                data-testid="input-external-url"
              />
            </div>
            <div className="space-y-2">
              <Label>Yorum</Label>
              <Textarea
                value={externalForm.comment}
                onChange={(e) => setExternalForm({ ...externalForm, comment: e.target.value })}
                placeholder="Müşteri yorumu..."
                data-testid="input-external-comment"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddExternalDialog(false)}>
              İptal
            </Button>
            <Button
              onClick={() => {
                if (externalForm.branchId) {
                  addExternalMutation.mutate({
                    ...externalForm,
                    branchId: parseInt(externalForm.branchId),
                  });
                }
              }}
              disabled={!externalForm.branchId || addExternalMutation.isPending}
              data-testid="button-submit-external"
            >
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
