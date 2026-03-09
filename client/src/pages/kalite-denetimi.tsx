import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole } from "@shared/schema";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListSkeleton } from "@/components/list-skeleton";
import { EmptyState } from "@/components/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileSearch, 
  Plus, 
  BarChart3, 
  ClipboardCheck, 
  AlertTriangle, 
  TrendingUp,
  Building2,
  Calendar,
  Target,
  ArrowRight,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

const CreateAuditFormSchema = z.object({
  branchId: z.coerce.number({ required_error: "Şube seçimi gerekli" }),
  templateId: z.coerce.number({ required_error: "Şablon seçimi gerekli" }),
  auditDate: z.string().min(1, "Denetim tarihi gerekli"),
  notes: z.string().optional(),
});

type CreateAuditFormValues = z.infer<typeof CreateAuditFormSchema>;

interface AuditInstance {
  id: number;
  branchId: number;
  templateId: number | null;
  auditorId: string;
  auditDate: string;
  totalScore: number | null;
  maxScore: number | null;
  percentageScore: number | null;
  grade: string | null;
  status: "draft" | "in_progress" | "completed" | "cancelled";
  notes: string | null;
  createdAt: string;
  branch?: { id: number; name: string };
  auditor?: { id: string; firstName: string; lastName: string };
  template?: { title: string };
}

interface AuditTemplate {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
}

interface Branch {
  id: number;
  name: string;
  shortName: string;
}

interface DashboardStats {
  statusCounts: Record<string, number>;
  scoreStats: { avgScore: number | null; minScore: number | null; maxScore: number | null; totalAudits: number };
  capaCounts: Record<string, number>;
}

interface TrendData {
  month: string;
  avgScore: number;
  auditCount: number;
}

interface BranchComparison {
  branchId: number;
  branchName: string;
  avgScore: number;
  auditCount: number;
  passRate: number;
}

interface CorrectiveAction {
  id: number;
  auditInstanceId: number;
  branchId: number;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "pending_review" | "closed" | "escalated";
  assignedTo: string | null;
  dueDate: string | null;
  createdAt: string;
  branch?: { id: number; name: string };
  auditor?: { id: string; firstName: string; lastName: string };
}

const CHART_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function KaliteDenetimi() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Filters for audits tab
  const [filterBranch, setFilterBranch] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const isHQ = user?.role && isHQRole(user.role as any);
  const canCreateAudit = user?.role === 'coach' || user?.role === 'admin' || isHQ;

  // Dashboard analytics
  const { data: dashboardStats, isLoading: statsLoading, isError, refetch } = useQuery<DashboardStats>({
    queryKey: ["/api/audits/analytics/dashboard"],
  });

  // Trend data
  const { data: trendData, isLoading: trendLoading } = useQuery<TrendData[]>({
    queryKey: ["/api/audits/analytics/trends"],
  });

  // Branch comparison (HQ only)
  const { data: branchComparison } = useQuery<BranchComparison[]>({
    queryKey: ["/api/audits/analytics/branch-comparison"],
    enabled: !!isHQ || user?.role === 'admin',
  });

  // Audit instances
  const { data: audits, isLoading: auditsLoading } = useQuery<AuditInstance[]>({
    queryKey: ["/api/audits"],
  });

  // Corrective actions (CAPAs)
  const { data: capas, isLoading: capasLoading } = useQuery<CorrectiveAction[]>({
    queryKey: ["/api/corrective-actions"],
  });

  const { data: templates } = useQuery<AuditTemplate[]>({
    queryKey: ["/api/audit-templates"],
    enabled: !!canCreateAudit,
  });

  // Always fetch branches for filters
  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const form = useForm<CreateAuditFormValues>({
    resolver: zodResolver(CreateAuditFormSchema),
    defaultValues: {
      branchId: user?.branchId || undefined,
      auditDate: new Date().toISOString().split('T')[0],
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateAuditFormValues) => {
      return await apiRequest("POST", "/api/audits", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/audits/analytics/dashboard"] });
      toast({ title: "Başarılı", description: "Denetim başlatıldı" });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Denetim oluşturulurken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge data-testid="badge-status-completed" className="bg-success/10 text-success"><CheckCircle2 className="w-3 h-3 mr-1" />Tamamlandı</Badge>;
      case "cancelled":
        return <Badge data-testid="badge-status-cancelled" variant="destructive"><XCircle className="w-3 h-3 mr-1" />İptal</Badge>;
      case "in_progress":
        return <Badge data-testid="badge-status-in-progress" className="bg-primary/10 text-primary"><Clock className="w-3 h-3 mr-1" />Devam Ediyor</Badge>;
      default:
        return <Badge data-testid="badge-status-draft" variant="outline"><FileText className="w-3 h-3 mr-1" />Taslak</Badge>;
    }
  };

  const getGradeBadge = (grade: string | null, score: number | null) => {
    if (!grade || score === null) return null;
    const colors: Record<string, string> = {
      'A': 'bg-green-500',
      'B': 'bg-blue-500',
      'C': 'bg-yellow-500',
      'D': 'bg-orange-500',
      'F': 'bg-red-500',
    };
    
  if (statsLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
      <Badge className={`${colors[grade] || 'bg-gray-500'} text-white`}>
        {grade} ({score}%)
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      'critical': 'bg-red-500 text-white',
      'high': 'bg-orange-500 text-white',
      'medium': 'bg-yellow-500 text-black',
      'low': 'bg-gray-500 text-white',
    };
    const labels: Record<string, string> = {
      'critical': 'Kritik',
      'high': 'Yüksek',
      'medium': 'Orta',
      'low': 'Düşük',
    };
    return <Badge className={colors[priority]}>{labels[priority]}</Badge>;
  };

  const getCapaStatusBadge = (status: string) => {
    const styles: Record<string, { className: string; label: string }> = {
      'open': { className: 'bg-blue-100 text-blue-700', label: 'Açık' },
      'in_progress': { className: 'bg-yellow-100 text-yellow-700', label: 'İşlemde' },
      'pending_review': { className: 'bg-purple-100 text-purple-700', label: 'İncelemede' },
      'closed': { className: 'bg-green-100 text-green-700', label: 'Kapatıldı' },
      'escalated': { className: 'bg-red-100 text-red-700', label: 'Eskalasyon' },
      'overdue': { className: 'bg-orange-100 text-orange-700', label: 'Gecikmiş' },
    };
    const style = styles[status.toLowerCase()] || styles['open'];
    return <Badge className={style.className}>{style.label}</Badge>;
  };

  // Calculate stats from dashboard data
  const totalAudits = dashboardStats?.scoreStats?.totalAudits || 0;
  const avgScore = dashboardStats?.scoreStats?.avgScore || 0;
  const completedCount = dashboardStats?.statusCounts?.completed || 0;
  const inProgressCount = dashboardStats?.statusCounts?.in_progress || 0;
  const openCapas = Object.entries(dashboardStats?.capaCounts || {}).reduce((sum, [status, count]) => status.toLowerCase() !== 'closed' ? sum + count : sum, 0);

  // Prepare pie chart data for CAPA status
  const capaStatusLabels: Record<string, string> = {
    'open': 'Açık',
    'in_progress': 'İşlemde',
    'pending_review': 'İncelemede',
    'closed': 'Kapatıldı',
    'escalated': 'Eskalasyon',
    'overdue': 'Gecikmiş',
  };
  const capaPieData = Object.entries(dashboardStats?.capaCounts || {}).map(([status, count]) => ({
    name: capaStatusLabels[status.toLowerCase()] || status,
    value: count,
  }));

  // Filter audits based on selected filters
  const filteredAudits = audits?.filter(audit => {
    if (filterBranch !== "all" && audit.branchId !== parseInt(filterBranch)) return false;
    if (filterStatus !== "all" && audit.status !== filterStatus) return false;
    return true;
  }) || [];

  if (statsLoading || auditsLoading) {
    return (
      <div className="p-4 space-y-4">
        <ListSkeleton count={4} variant="card" showHeader />
      </div>
    );
  }

  return (
    <div className="p-3 flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="heading-kalite-denetimi">Kalite Kontrol</h1>
          <p className="text-sm text-muted-foreground">Şube denetimleri ve düzeltici aksiyonlar</p>
        </div>
        {canCreateAudit && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-audit">
                <Plus className="w-4 h-4 mr-2" />
                Yeni Denetim
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni Kalite Denetimi</DialogTitle>
                <DialogDescription>Şube için yeni bir kalite denetimi başlatın</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="branchId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Şube</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger data-testid="select-branch">
                              <SelectValue placeholder="Şube seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {branches?.map((branch) => (
                              <SelectItem key={branch.id} value={branch.id.toString()} data-testid={`option-branch-${branch.id}`}>
                                {branch.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="templateId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Denetim Şablonu</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger data-testid="select-template">
                              <SelectValue placeholder="Şablon seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {templates?.filter(t => t.isActive).map((template) => (
                              <SelectItem key={template.id} value={template.id.toString()} data-testid={`option-template-${template.id}`}>
                                {template.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="auditDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Denetim Tarihi</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-audit-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notlar (Opsiyonel)</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Denetim notları..." rows={3} data-testid="textarea-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} data-testid="button-cancel">
                      İptal
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-audit">
                      {createMutation.isPending ? "Başlatılıyor..." : "Denetimi Başlat"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">
            <BarChart3 className="w-4 h-4 mr-1 hidden sm:inline" />
            Özet
          </TabsTrigger>
          <TabsTrigger value="audits" data-testid="tab-audits">
            <ClipboardCheck className="w-4 h-4 mr-1 hidden sm:inline" />
            Denetimler
          </TabsTrigger>
          <TabsTrigger value="capa" data-testid="tab-capa">
            <AlertTriangle className="w-4 h-4 mr-1 hidden sm:inline" />
            CAPA
          </TabsTrigger>
          {(isHQ || user?.role === 'admin') && (
            <TabsTrigger value="templates" data-testid="tab-templates">
              <FileText className="w-4 h-4 mr-1 hidden sm:inline" />
              Şablonlar
            </TabsTrigger>
          )}
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card data-testid="card-total-audits">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Toplam Denetim</p>
                    <p className="text-2xl font-bold">{totalAudits}</p>
                  </div>
                  <ClipboardCheck className="w-8 h-8 text-primary opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-avg-score">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Ortalama Skor</p>
                    <p className="text-2xl font-bold">{Number(avgScore).toFixed(1)}%</p>
                  </div>
                  <Target className="w-8 h-8 text-green-500 opacity-20" />
                </div>
                <Progress value={Number(avgScore)} className="mt-2 h-1" />
              </CardContent>
            </Card>

            <Card data-testid="card-in-progress">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Devam Eden</p>
                    <p className="text-2xl font-bold">{inProgressCount}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-open-capas">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Açık CAPA</p>
                    <p className="text-2xl font-bold">{openCapas}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500 opacity-20" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Score Trend Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Skor Trendi
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trendData && trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="avgScore" 
                        stroke="#22c55e" 
                        strokeWidth={2}
                        name="Ortalama Skor"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    <p>Henüz trend verisi yok</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CAPA Status Pie Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  CAPA Durumları
                </CardTitle>
              </CardHeader>
              <CardContent>
                {capaPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={capaPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {capaPieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    <p>Henüz CAPA verisi yok</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Branch Comparison Chart (HQ Only) */}
          {(isHQ || user?.role === 'admin') && branchComparison && branchComparison.length > 0 && (
            <Card data-testid="card-branch-comparison">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Şube Karşılaştırması
                </CardTitle>
                <CardDescription>Ortalama denetim skorları</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={branchComparison} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <YAxis dataKey="branchName" type="category" tick={{ fontSize: 11 }} width={75} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        `${Number(value).toFixed(1)}%`, 
                        name === 'avgScore' ? 'Ortalama Skor' : 'Geçiş Oranı'
                      ]}
                    />
                    <Bar dataKey="avgScore" fill="#3b82f6" name="Ortalama Skor" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Risk Analysis Section (HQ Only) */}
          {(isHQ || user?.role === 'admin') && branchComparison && branchComparison.length > 0 && (
            <Card data-testid="card-risk-analysis">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Risk Analizi
                </CardTitle>
                <CardDescription>Dikkat gerektiren şubeler</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {branchComparison
                  .filter(b => Number(b.avgScore) < 70)
                  .sort((a, b) => Number(a.avgScore) - Number(b.avgScore))
                  .slice(0, 5)
                  .map((branch) => {
                    const score = Number(branch.avgScore);
                    const riskLevel = score < 50 ? 'critical' : score < 60 ? 'high' : score < 70 ? 'medium' : 'low';
                    const riskColors: Record<string, string> = {
                      critical: 'bg-red-500',
                      high: 'bg-orange-500',
                      medium: 'bg-yellow-500',
                      low: 'bg-green-500',
                    };
                    const riskLabels: Record<string, string> = {
                      critical: 'Kritik',
                      high: 'Yüksek',
                      medium: 'Orta',
                      low: 'Düşük',
                    };
                    return (
                      <div key={branch.branchId} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`risk-branch-${branch.branchId}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-8 rounded ${riskColors[riskLevel]}`} />
                          <div>
                            <p className="font-medium text-sm">{branch.branchName}</p>
                            <p className="text-xs text-muted-foreground">{branch.auditCount} denetim</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`${riskColors[riskLevel]} text-white`}>{riskLabels[riskLevel]}</Badge>
                          <span className="text-lg font-bold">{score.toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                {branchComparison.filter(b => Number(b.avgScore) < 70).length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500 opacity-50" />
                    <p>Tüm şubeler hedef skorun üzerinde</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent Audits Quick List */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Son Denetimler</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("audits")} data-testid="button-view-all-audits">
                  Tümünü Gör <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {audits && audits.length > 0 ? (
                audits.slice(0, 5).map((audit) => (
                  <Link key={audit.id} href={`/denetim/${audit.id}`}>
                    <div className="flex items-center justify-between p-2 rounded-md hover-elevate cursor-pointer" data-testid={`row-audit-${audit.id}`}>
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-sm font-medium">{audit.branch?.name || `Şube #${audit.branchId}`}</p>
                          <p className="text-xs text-muted-foreground">
                            {audit.auditor ? `${audit.auditor.firstName} ${audit.auditor.lastName}` : 'Denetçi atanmamış'} · {format(new Date(audit.auditDate), "d MMM yyyy", { locale: tr })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getGradeBadge(audit.grade, audit.percentageScore)}
                        {getStatusBadge(audit.status)}
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileSearch className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>Henüz denetim bulunmuyor</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audits Tab */}
        <TabsContent value="audits" className="space-y-4 mt-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[140px]">
                  <Select value={filterBranch} onValueChange={setFilterBranch}>
                    <SelectTrigger data-testid="filter-branch">
                      <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Şube" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Şubeler</SelectItem>
                      {branches?.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id.toString()}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger data-testid="filter-status">
                      <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Durum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Durumlar</SelectItem>
                      <SelectItem value="draft">Taslak</SelectItem>
                      <SelectItem value="in_progress">Devam Ediyor</SelectItem>
                      <SelectItem value="completed">Tamamlandı</SelectItem>
                      <SelectItem value="cancelled">İptal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(filterBranch !== "all" || filterStatus !== "all") && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setFilterBranch("all"); setFilterStatus("all"); }}
                    data-testid="button-clear-filters"
                  >
                    Filtreleri Temizle
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {filteredAudits.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileSearch className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground" data-testid="text-no-audits">
                  {audits && audits.length > 0 ? "Filtre sonucu bulunamadı" : "Henüz denetim bulunmuyor"}
                </p>
                {canCreateAudit && !audits?.length && (
                  <Button onClick={() => setIsCreateDialogOpen(true)} className="mt-4" data-testid="button-create-first-audit">
                    <Plus className="w-4 h-4 mr-2" />
                    İlk Denetimi Oluştur
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredAudits.map((audit) => (
                <Link key={audit.id} href={`/denetim/${audit.id}`}>
                  <Card className="hover-elevate cursor-pointer" data-testid={`card-audit-${audit.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <h3 className="font-medium" data-testid={`text-audit-branch-${audit.id}`}>
                              {audit.branch?.name || `Şube #${audit.branchId}`}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>{format(new Date(audit.auditDate), "d MMMM yyyy", { locale: tr })}</span>
                            <span>•</span>
                            <span>{audit.auditor ? `${audit.auditor.firstName} ${audit.auditor.lastName}` : 'Denetçi atanmamış'}</span>
                            {audit.template?.title && (
                              <>
                                <span>•</span>
                                <span>{audit.template.title}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {getStatusBadge(audit.status)}
                          {getGradeBadge(audit.grade, audit.percentageScore)}
                        </div>
                      </div>
                      {audit.percentageScore !== null && (
                        <div className="mt-3">
                          <Progress value={audit.percentageScore} className="h-2" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* CAPA Tab */}
        <TabsContent value="capa" className="space-y-4 mt-4">
          {!capas || capas.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
                <p className="text-muted-foreground" data-testid="text-no-capas">Düzeltici aksiyon bulunmuyor</p>
                <p className="text-xs text-muted-foreground mt-1">Denetim sonrası düzeltici aksiyonlar burada görünecek</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {capas.map((capa) => (
                <Link key={capa.id} href={`/capa/${capa.id}`}>
                  <Card className="hover-elevate cursor-pointer" data-testid={`card-capa-${capa.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="font-medium" data-testid={`text-capa-title-${capa.id}`}>
                            {capa.title || capa.description?.substring(0, 50) || `CAPA #${capa.id}`}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {capa.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Building2 className="w-3 h-3" />
                            <span>{capa.branch?.name || 'Belirtilmemiş'}</span>
                            {capa.dueDate && (
                              <>
                                <span>•</span>
                                <Calendar className="w-3 h-3" />
                                <span>{format(new Date(capa.dueDate), "d MMM", { locale: tr })}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {getPriorityBadge(capa.priority)}
                          {getCapaStatusBadge(capa.status)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4 mt-4">
          {(isHQ || user?.role === 'admin') ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Denetim Şablonları</h2>
                  <p className="text-sm text-muted-foreground">Kalite denetimi şablonlarını yönetin</p>
                </div>
                <Link href="/admin/kalite-denetim-sablonlari">
                  <Button data-testid="button-manage-templates">
                    <FileText className="w-4 h-4 mr-2" />
                    Şablonları Yönet
                  </Button>
                </Link>
              </div>

              {!templates || templates.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-3" />
                    <p className="text-muted-foreground">Henüz şablon oluşturulmamış</p>
                    <Link href="/admin/kalite-denetim-sablonlari">
                      <Button variant="outline" className="mt-4" data-testid="button-create-first-template">
                        <Plus className="w-4 h-4 mr-2" />
                        İlk Şablonu Oluştur
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {templates.map((template) => (
                    <Link key={template.id} href={`/admin/kalite-denetim-sablonu/${template.id}`}>
                      <Card className="hover-elevate cursor-pointer h-full" data-testid={`card-template-${template.id}`}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base" data-testid={`text-template-title-${template.id}`}>
                              {template.title}
                            </CardTitle>
                            <Badge variant={template.isActive ? "default" : "secondary"} data-testid={`badge-template-status-${template.id}`}>
                              {template.isActive ? "Aktif" : "Pasif"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {template.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
                          )}
                          {template.category && (
                            <Badge variant="outline" className="mt-2">{template.category}</Badge>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <AlertTriangle className="w-12 h-12 mx-auto text-yellow-500 opacity-50 mb-3" />
                <p className="text-muted-foreground">Şablon yönetimi için yetkiniz bulunmuyor</p>
                <p className="text-xs text-muted-foreground mt-1">Bu sayfa sadece HQ ve Admin kullanıcıları için görüntülenebilir</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
