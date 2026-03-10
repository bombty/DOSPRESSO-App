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
  User,
  Download,
  Printer,
  RefreshCw,
  Settings,
  Image,
  Eye,
  EyeOff,
  Languages,
  Save
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Upload, ImageIcon } from "lucide-react";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

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
  photoUrls?: string[];
  isSuspicious?: boolean;
  suspiciousReasons?: string[];
  distanceFromBranch?: number;
  feedbackLanguage?: string;
  feedbackType?: string;
  requiresContact?: boolean;
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

interface BranchQRData {
  token: string;
  url: string;
  qrCode: string;
  branchName: string;
}

interface FormSettings {
  id?: number;
  branchId: number;
  bannerUrl: string | null;
  logoUrl: string | null;
  primaryColor: string;
  backgroundColor: string;
  welcomeMessageTr: string;
  welcomeMessageEn: string;
  welcomeMessageZh: string;
  welcomeMessageAr: string;
  welcomeMessageDe: string;
  welcomeMessageKo: string;
  welcomeMessageFr: string;
  showServiceRating: boolean;
  showCleanlinessRating: boolean;
  showProductRating: boolean;
  showStaffRating: boolean;
  showStaffSelection: boolean;
  showPhotoUpload: boolean;
  showFeedbackTypeSelection: boolean;
  showContactPreference: boolean;
  showCommentField: boolean;
  requireComment: boolean;
  allowAnonymous: boolean;
  defaultAnonymous: boolean;
  requireLocationVerification: boolean;
  maxDistanceFromBranch: number;
  availableLanguages: string[];
  defaultLanguage: string;
  isActive: boolean;
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
  const [filters, setFilters] = useState({ status: '', source: '', branchId: '', priority: '', suspicious: '', feedbackType: '', requiresContact: '' });
  const [responseContent, setResponseContent] = useState('');
  const [responseType, setResponseType] = useState('defense');
  const [qrDataMap, setQrDataMap] = useState<Record<number, BranchQRData>>({});
  const [loadingQr, setLoadingQr] = useState<Record<number, boolean>>({});
  const [selectedSettingsBranchId, setSelectedSettingsBranchId] = useState<number | null>(null);
  const [formSettings, setFormSettings] = useState<FormSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

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
    if (filters.suspicious) params.append('suspicious', filters.suspicious);
    if (filters.feedbackType) params.append('feedbackType', filters.feedbackType);
    if (filters.requiresContact) params.append('requiresContact', filters.requiresContact);
    return params.toString();
  };

  const { data: feedbacks = [], isLoading, isError, refetch } = useQuery<Feedback[]>({
    queryKey: ['/api/customer-feedback', filters.status, filters.source, filters.branchId, filters.priority, filters.suspicious, filters.feedbackType, filters.requiresContact],
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

  const loadBranchQR = async (branchId: number) => {
    if (qrDataMap[branchId] || loadingQr[branchId]) return;
    
    setLoadingQr(prev => ({ ...prev, [branchId]: true }));
    try {
      const res = await fetch(`/api/branches/${branchId}/feedback-qr`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setQrDataMap(prev => ({ ...prev, [branchId]: data }));
      }
    } catch (error) {
      console.error("QR yüklenemedi:", error);
    } finally {
      setLoadingQr(prev => ({ ...prev, [branchId]: false }));
    }
  };

  const downloadQR = (branchId: number, branchName: string) => {
    const qrData = qrDataMap[branchId];
    if (!qrData) return;
    
    const link = document.createElement('a');
    link.download = `${branchName.replace(/\s+/g, '-')}-QR.png`;
    link.href = qrData.qrCode;
    link.click();
  };

  const printQR = (branchId: number, branchName: string) => {
    const qrData = qrDataMap[branchId];
    if (!qrData) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${branchName} - Müşteri Geri Bildirim QR Kodu</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 40px; }
              img { max-width: 300px; }
              h1 { font-size: 24px; margin-bottom: 20px; }
              p { font-size: 14px; color: #666; margin-top: 20px; }
            </style>
          </head>
          <body>
            <h1>DOSPRESSO ${branchName}</h1>
            <img src="${qrData.qrCode}" alt="QR Kod" />
            <p>Bu QR kodu okutarak görüşlerinizi bizimle paylaşın!</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const loadFormSettings = async (branchId: number) => {
    setSelectedSettingsBranchId(branchId);
    try {
      const res = await fetch(`/api/feedback-form-settings/branch/${branchId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setFormSettings(data);
      }
    } catch (error) {
      console.error("Form ayarları yüklenemedi:", error);
    }
  };

  const saveFormSettings = async () => {
    if (!selectedSettingsBranchId || !formSettings) return;
    
    setSavingSettings(true);
    try {
      const res = await fetch(`/api/feedback-form-settings/${selectedSettingsBranchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formSettings),
      });
      
      if (res.ok) {
        toast({ title: "Ayarlar kaydedildi" });
      } else {
        toast({ title: "Hata", description: "Ayarlar kaydedilemedi", variant: "destructive" });
      }
    } catch (error) {
      console.error("Ayarlar kaydedilemedi:", error);
      toast({ title: "Hata", description: "Ayarlar kaydedilemedi", variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  const updateFormSetting = <K extends keyof FormSettings>(key: K, value: FormSettings[K]) => {
    setFormSettings(prev => prev ? { ...prev, [key]: value } : null);
  };

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

  const StatCard = ({ title, value, icon: Icon, trend, color, subtitle }: any) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
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

  
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

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
          value={stats?.totalCount === 0 ? '-' : (Number(stats?.avgRating ?? 0).toFixed(1) || '-')}
          icon={Star}
          color="bg-yellow-500"
          subtitle={stats?.totalCount === 0 ? 'Henüz değerlendirme yok' : `(${stats?.totalCount || 0} değerlendirme)`}
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
          <TabsTrigger value="qr-codes">
            <QrCode className="h-4 w-4 mr-1" />
            Şube QR Kodları
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-1" />
            Form Ayarları
          </TabsTrigger>
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
                <Select value={filters.suspicious || "_all"} onValueChange={(v) => setFilters({ ...filters, suspicious: v === "_all" ? "" : v })}>
                  <SelectTrigger className="w-[140px]" data-testid="filter-suspicious">
                    <SelectValue placeholder="Şüpheli" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Tümü</SelectItem>
                    <SelectItem value="suspicious">Şüpheli</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.feedbackType || "_all"} onValueChange={(v) => setFilters({ ...filters, feedbackType: v === "_all" ? "" : v })}>
                  <SelectTrigger className="w-[140px]" data-testid="filter-feedback-type">
                    <SelectValue placeholder="Tür" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Tümü</SelectItem>
                    <SelectItem value="feedback">Geri Bildirim</SelectItem>
                    <SelectItem value="complaint">Şikayet</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.requiresContact || "_all"} onValueChange={(v) => setFilters({ ...filters, requiresContact: v === "_all" ? "" : v })}>
                  <SelectTrigger className="w-[140px]" data-testid="filter-requires-contact">
                    <SelectValue placeholder="Cevap" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Tümü</SelectItem>
                    <SelectItem value="true">Cevap Bekliyor</SelectItem>
                    <SelectItem value="false">Cevap Beklemiyor</SelectItem>
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
                    <p className="text-center text-muted-foreground py-8">Henüz geri bildirim bulunmuyor</p>
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
                                  {fb.isSuspicious && (
                                    <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Şüpheli
                                    </Badge>
                                  )}
                                  {fb.feedbackType === 'complaint' && (
                                    <Badge variant="destructive" className="text-xs">
                                      Şikayet
                                    </Badge>
                                  )}
                                  {fb.requiresContact && (
                                    <Badge variant="outline" className="text-xs border-blue-500 text-blue-600">
                                      Cevap Bekliyor
                                    </Badge>
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
                {stats?.totalCount === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">Henüz değerlendirme yok</p>
                    <p className="text-xs text-muted-foreground mt-1">(0 değerlendirme)</p>
                  </div>
                ) : (
                  [{label: 'Hizmet', value: stats?.avgService, icon: Sparkles},
                   {label: 'Temizlik', value: stats?.avgCleanliness, icon: Brush},
                   {label: 'Ürün', value: stats?.avgProduct, icon: Package},
                   {label: 'Personel', value: stats?.avgStaff, icon: User},
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                        <span>{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.value && item.value > 0 ? (
                          <>
                            <StarDisplay rating={Math.round(item.value)} size="sm" />
                            <span className="font-medium">{Number(item.value ?? 0).toFixed(1)}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
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

        <TabsContent value="qr-codes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Şube QR Kodları
              </CardTitle>
              <CardDescription>
                Her şube için özel QR kod oluşturun. Müşteriler bu kodu okutarak o şube hakkında geri bildirim verebilir.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {branches.map((branch) => (
                  <Card key={branch.id} className="overflow-hidden" data-testid={`qr-card-${branch.id}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col items-center text-center">
                        <h3 className="font-semibold mb-2">{branch.name}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{branch.city}</p>
                        
                        {qrDataMap[branch.id] ? (
                          <>
                            <img 
                              src={qrDataMap[branch.id].qrCode} 
                              alt={`${branch.name} QR Kod`}
                              className="w-40 h-40 mb-3"
                              loading="lazy"
                            />
                            <p className="text-xs text-muted-foreground mb-3 break-all max-w-full">
                              {qrDataMap[branch.id].url}
                            </p>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => downloadQR(branch.id, branch.name)}
                                data-testid={`button-download-qr-${branch.id}`}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                İndir
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => printQR(branch.id, branch.name)}
                                data-testid={`button-print-qr-${branch.id}`}
                              >
                                <Printer className="h-4 w-4 mr-1" />
                                Yazdır
                              </Button>
                            </div>
                          </>
                        ) : (
                          <Button 
                            onClick={() => loadBranchQR(branch.id)}
                            disabled={loadingQr[branch.id]}
                            data-testid={`button-generate-qr-${branch.id}`}
                          >
                            {loadingQr[branch.id] ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Yükleniyor...
                              </>
                            ) : (
                              <>
                                <QrCode className="h-4 w-4 mr-2" />
                                QR Kod Oluştur
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {branches.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Şube bulunamadı</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Geri Bildirim Formu Ayarları
              </CardTitle>
              <CardDescription>
                Her şube için geri bildirim formunu özelleştirin. Banner, soru seçimi, dil ayarları ve daha fazlası.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <Label className="mb-2 block">Şube Seçin</Label>
                  <div className="space-y-2">
                    {branches.map((branch) => (
                      <Button
                        key={branch.id}
                        variant={selectedSettingsBranchId === branch.id ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => loadFormSettings(branch.id)}
                        data-testid={`button-settings-branch-${branch.id}`}
                      >
                        <Building2 className="h-4 w-4 mr-2" />
                        {branch.name}
                      </Button>
                    ))}
                  </div>
                  {branches.length === 0 && (
                    <p className="text-sm text-muted-foreground">Şube bulunamadı</p>
                  )}
                </div>

                <div className="lg:col-span-2">
                  {formSettings ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">
                          {branches.find(b => b.id === selectedSettingsBranchId)?.name} Ayarları
                        </h3>
                        <Button onClick={saveFormSettings} disabled={savingSettings} data-testid="button-save-settings">
                          {savingSettings ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Kaydet
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="bannerUrl">Banner Görseli (16:9)</Label>
                          <div className="space-y-2">
                            {formSettings.bannerUrl && (
                              <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
                                <img 
                                  src={formSettings.bannerUrl} 
                                  alt="Banner" 
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-2 right-2"
                                  onClick={() => updateFormSetting('bannerUrl', null)}
                                  data-testid="button-remove-banner"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                            <ObjectUploader
                              maxWidthOrHeight={1920}
                              onGetUploadParameters={async () => {
                                const res = await fetch('/api/objects/generate-upload-url', {
                                  method: 'POST',
                                  credentials: 'include',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ prefix: 'feedback-banners' }),
                                });
                                const data = await res.json();
                                return { method: 'PUT', url: data.uploadUrl };
                              }}
                              onComplete={(result) => {
                                if (result.successful?.[0]?.uploadURL) {
                                  updateFormSetting('bannerUrl', result.successful[0].uploadURL);
                                }
                              }}
                              buttonClassName="w-full"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Banner Yükle
                            </ObjectUploader>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="logoUrl">Logo</Label>
                          <div className="space-y-2">
                            {formSettings.logoUrl && (
                              <div className="relative w-24 h-24 rounded-lg overflow-hidden border bg-muted mx-auto">
                                <img 
                                  src={formSettings.logoUrl} 
                                  alt="Logo" 
                                  className="w-full h-full object-contain p-2"
                                  loading="lazy"
                                />
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-1 right-1"
                                  onClick={() => updateFormSetting('logoUrl', null)}
                                  data-testid="button-remove-logo"
                                >
                                  <XCircle className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            <ObjectUploader
                              maxWidthOrHeight={512}
                              onGetUploadParameters={async () => {
                                const res = await fetch('/api/objects/generate-upload-url', {
                                  method: 'POST',
                                  credentials: 'include',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ prefix: 'feedback-logos' }),
                                });
                                const data = await res.json();
                                return { method: 'PUT', url: data.uploadUrl };
                              }}
                              onComplete={(result) => {
                                if (result.successful?.[0]?.uploadURL) {
                                  updateFormSetting('logoUrl', result.successful[0].uploadURL);
                                }
                              }}
                              buttonClassName="w-full"
                            >
                              <ImageIcon className="h-4 w-4 mr-2" />
                              Logo Yükle
                            </ObjectUploader>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="primaryColor">Ana Renk</Label>
                          <div className="flex gap-2">
                            <Input
                              id="primaryColor"
                              type="color"
                              value={formSettings.primaryColor}
                              onChange={(e) => updateFormSetting('primaryColor', e.target.value)}
                              className="w-14 h-9 p-1"
                              data-testid="input-primary-color"
                            />
                            <Input
                              value={formSettings.primaryColor}
                              onChange={(e) => updateFormSetting('primaryColor', e.target.value)}
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="backgroundColor">Arka Plan Rengi</Label>
                          <div className="flex gap-2">
                            <Input
                              id="backgroundColor"
                              type="color"
                              value={formSettings.backgroundColor}
                              onChange={(e) => updateFormSetting('backgroundColor', e.target.value)}
                              className="w-14 h-9 p-1"
                              data-testid="input-background-color"
                            />
                            <Input
                              value={formSettings.backgroundColor}
                              onChange={(e) => updateFormSetting('backgroundColor', e.target.value)}
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-medium flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Soru Görünürlük Ayarları
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-muted-foreground" />
                              <span>Hizmet Puanı</span>
                            </div>
                            <Switch
                              checked={formSettings.showServiceRating}
                              onCheckedChange={(v) => updateFormSetting('showServiceRating', v)}
                              data-testid="switch-service-rating"
                            />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <Brush className="h-4 w-4 text-muted-foreground" />
                              <span>Temizlik Puanı</span>
                            </div>
                            <Switch
                              checked={formSettings.showCleanlinessRating}
                              onCheckedChange={(v) => updateFormSetting('showCleanlinessRating', v)}
                              data-testid="switch-cleanliness-rating"
                            />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <span>Ürün Kalitesi Puanı</span>
                            </div>
                            <Switch
                              checked={formSettings.showProductRating}
                              onCheckedChange={(v) => updateFormSetting('showProductRating', v)}
                              data-testid="switch-product-rating"
                            />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span>Personel Puanı</span>
                            </div>
                            <Switch
                              checked={formSettings.showStaffRating}
                              onCheckedChange={(v) => updateFormSetting('showStaffRating', v)}
                              data-testid="switch-staff-rating"
                            />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>Personel Seçimi</span>
                            </div>
                            <Switch
                              checked={formSettings.showStaffSelection}
                              onCheckedChange={(v) => updateFormSetting('showStaffSelection', v)}
                              data-testid="switch-staff-selection"
                            />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <Image className="h-4 w-4 text-muted-foreground" />
                              <span>Fotoğraf Yükleme</span>
                            </div>
                            <Switch
                              checked={formSettings.showPhotoUpload}
                              onCheckedChange={(v) => updateFormSetting('showPhotoUpload', v)}
                              data-testid="switch-photo-upload"
                            />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                              <span>Şikayet/Geri Bildirim Seçimi</span>
                            </div>
                            <Switch
                              checked={formSettings.showFeedbackTypeSelection}
                              onCheckedChange={(v) => updateFormSetting('showFeedbackTypeSelection', v)}
                              data-testid="switch-feedback-type"
                            />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-muted-foreground" />
                              <span>Cevap Bekliyorum Seçeneği</span>
                            </div>
                            <Switch
                              checked={formSettings.showContactPreference}
                              onCheckedChange={(v) => updateFormSetting('showContactPreference', v)}
                              data-testid="switch-contact-preference"
                            />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-muted-foreground" />
                              <span>Yorum Alanı</span>
                            </div>
                            <Switch
                              checked={formSettings.showCommentField}
                              onCheckedChange={(v) => updateFormSetting('showCommentField', v)}
                              data-testid="switch-comment-field"
                            />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                              <span>Yorum Zorunlu</span>
                            </div>
                            <Switch
                              checked={formSettings.requireComment}
                              onCheckedChange={(v) => updateFormSetting('requireComment', v)}
                              data-testid="switch-require-comment"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-medium flex items-center gap-2">
                          <Languages className="h-4 w-4" />
                          Karşılama Mesajları
                        </h4>
                        <div className="grid grid-cols-1 gap-3">
                          <div className="space-y-1">
                            <Label className="text-sm">Türkçe</Label>
                            <Input
                              value={formSettings.welcomeMessageTr}
                              onChange={(e) => updateFormSetting('welcomeMessageTr', e.target.value)}
                              data-testid="input-welcome-tr"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm">English</Label>
                            <Input
                              value={formSettings.welcomeMessageEn}
                              onChange={(e) => updateFormSetting('welcomeMessageEn', e.target.value)}
                              data-testid="input-welcome-en"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm">Deutsch</Label>
                            <Input
                              value={formSettings.welcomeMessageDe}
                              onChange={(e) => updateFormSetting('welcomeMessageDe', e.target.value)}
                              data-testid="input-welcome-de"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-medium">Diğer Ayarlar</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <span>Anonim Gönderime İzin Ver</span>
                            <Switch
                              checked={formSettings.allowAnonymous}
                              onCheckedChange={(v) => updateFormSetting('allowAnonymous', v)}
                              data-testid="switch-allow-anonymous"
                            />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <span>Varsayılan Anonim</span>
                            <Switch
                              checked={formSettings.defaultAnonymous}
                              onCheckedChange={(v) => updateFormSetting('defaultAnonymous', v)}
                              data-testid="switch-default-anonymous"
                            />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <span>Konum Doğrulama Zorunlu</span>
                            <Switch
                              checked={formSettings.requireLocationVerification}
                              onCheckedChange={(v) => updateFormSetting('requireLocationVerification', v)}
                              data-testid="switch-require-location"
                            />
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <span>Form Aktif</span>
                            <Switch
                              checked={formSettings.isActive}
                              onCheckedChange={(v) => updateFormSetting('isActive', v)}
                              data-testid="switch-form-active"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Maksimum Uzaklık (metre)</Label>
                          <Input
                            type="number"
                            value={formSettings.maxDistanceFromBranch}
                            onChange={(e) => updateFormSetting('maxDistanceFromBranch', parseInt(e.target.value) || 500)}
                            data-testid="input-max-distance"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Varsayılan Dil</Label>
                          <Select
                            value={formSettings.defaultLanguage}
                            onValueChange={(v) => updateFormSetting('defaultLanguage', v)}
                          >
                            <SelectTrigger data-testid="select-default-language">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tr">Türkçe</SelectItem>
                              <SelectItem value="en">English</SelectItem>
                              <SelectItem value="de">Deutsch</SelectItem>
                              <SelectItem value="ar">العربية</SelectItem>
                              <SelectItem value="zh">中文</SelectItem>
                              <SelectItem value="ko">한국어</SelectItem>
                              <SelectItem value="fr">Français</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Şube Seçin</h3>
                      <p className="text-sm text-muted-foreground">
                        Form ayarlarını düzenlemek için soldaki listeden bir şube seçin
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
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
              <div className="flex items-center gap-4 flex-wrap">
                <StarDisplay rating={selectedFeedback.rating} size="md" />
                <Badge variant={statusLabels[selectedFeedback.status]?.variant}>
                  {statusLabels[selectedFeedback.status]?.label}
                </Badge>
                {selectedFeedback.feedbackType === 'complaint' && (
                  <Badge variant="destructive">Şikayet</Badge>
                )}
                {selectedFeedback.requiresContact && (
                  <Badge variant="outline" className="border-blue-500 text-blue-600">Cevap Bekliyor</Badge>
                )}
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
