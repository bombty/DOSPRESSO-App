import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ListSkeleton } from "@/components/list-skeleton";
import {
  DollarSign, TrendingUp, TrendingDown, FileText, Plus, Building,
  Calendar, ArrowLeft, BarChart3, PieChart as PieChartIcon, Loader2,
  Receipt, Wallet, Users, Coffee, Brain, Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient as qc } from "@/lib/queryClient";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from "recharts";

const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const reportFormSchema = z.object({
  reportType: z.string().min(1, "Rapor tipi seçiniz"),
  period: z.string().min(1, "Dönem seçiniz"),
  branchId: z.string().optional(),
  revenue: z.string().min(1, "Gelir giriniz"),
  expenses: z.string().min(1, "Gider giriniz"),
  customerCount: z.string().optional(),
  averageTicket: z.string().optional(),
  notes: z.string().optional(),
});

type ReportFormValues = z.infer<typeof reportFormSchema>;

function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value || 0);
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(num);
}

export default function MuhasebeRaporlama() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [reportTypeFilter, setReportTypeFilter] = useState("monthly");
  const [dialogOpen, setDialogOpen] = useState(false);

  const isAuthorized = user?.role && (user.role === 'admin' || user.role === 'muhasebe_ik' || user.role === 'ceo' || isHQRole(user.role as any));

  const { data: branches } = useQuery<any[]>({
    queryKey: ["/api/branches"],
    enabled: !!isAuthorized,
  });

  const { data: reports, isLoading } = useQuery<any[]>({
    queryKey: ["/api/management-reports", { reportType: reportTypeFilter, year: selectedYear, branchId: selectedBranch }],
    enabled: !!isAuthorized,
  });

  const { data: summary } = useQuery<any>({
    queryKey: ["/api/management-reports/summary", { year: selectedYear }],
    enabled: !!isAuthorized,
  });

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      reportType: "monthly",
      period: "",
      branchId: "",
      revenue: "",
      expenses: "",
      customerCount: "",
      averageTicket: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: ReportFormValues) => {
      const data: any = {
        reportType: values.reportType,
        period: values.period,
        revenue: values.revenue,
        expenses: values.expenses,
        notes: values.notes || null,
      };
      if (values.branchId && values.branchId !== "all") data.branchId = parseInt(values.branchId);
      if (values.customerCount) data.customerCount = parseInt(values.customerCount);
      if (values.averageTicket) data.averageTicket = values.averageTicket;
      return apiRequest("POST", "/api/management-reports", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/management-reports"] });
      toast({ title: "Başarılı", description: "Rapor kaydedildi" });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const monthlyChartData = useMemo(() => {
    if (!summary?.monthlyData) return [];
    return summary.monthlyData.map((d: any) => ({
      name: MONTHS[d.month - 1]?.substring(0, 3) || '',
      Gelir: d.revenue,
      Gider: d.expenses,
      Kar: d.profit,
    }));
  }, [summary]);

  const branchRevenueData = useMemo(() => {
    if (!summary?.branchRevenue || !branches) return [];
    return Object.entries(summary.branchRevenue)
      .map(([branchId, revenue]) => {
        const branch = (branches as any[])?.find((b: any) => b.id.toString() === branchId);
        return {
          name: branch?.name?.substring(0, 12) || `Şube ${branchId}`,
          revenue: revenue as number,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [summary, branches]);

  const periodOptions = useMemo(() => {
    const type = form.watch("reportType");
    const year = selectedYear;
    if (type === "monthly") {
      return MONTHS.map((m, i) => ({
        value: `${year}-${String(i + 1).padStart(2, '0')}`,
        label: `${m} ${year}`,
      }));
    } else if (type === "quarterly") {
      return [
        { value: `${year}-Q1`, label: `1. Çeyrek ${year}` },
        { value: `${year}-Q2`, label: `2. Çeyrek ${year}` },
        { value: `${year}-Q3`, label: `3. Çeyrek ${year}` },
        { value: `${year}-Q4`, label: `4. Çeyrek ${year}` },
      ];
    } else {
      return [{ value: year, label: `${year} Yılı` }];
    }
  }, [form.watch("reportType"), selectedYear]);

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Bu sayfaya erişim yetkiniz yok.</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 space-y-4 max-w-7xl mx-auto" data-testid="muhasebe-raporlama-page">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Muhasebe Yönetim Raporlama
          </h1>
          <p className="text-sm text-muted-foreground">Aylık, çeyreklik ve yıllık mali raporlar</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'muhasebe_ik') && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-new-report">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Yeni Rapor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Yeni Rapor Girişi</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((values) => createMutation.mutate(values))} className="space-y-3">
                  <FormField control={form.control} name="reportType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rapor Tipi</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-report-type">
                            <SelectValue placeholder="Seçiniz" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="monthly">Aylık</SelectItem>
                          <SelectItem value="quarterly">Çeyreklik</SelectItem>
                          <SelectItem value="yearly">Yıllık</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="period" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dönem</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-period">
                            <SelectValue placeholder="Dönem seçiniz" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {periodOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="branchId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Şube (Opsiyonel)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-report-branch">
                            <SelectValue placeholder="Genel" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">Genel (Tüm Şirket)</SelectItem>
                          {(branches as any[])?.map((b: any) => (
                            <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="revenue" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gelir (TL)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" data-testid="input-revenue" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="expenses" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gider (TL)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" data-testid="input-expenses" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="customerCount" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Müşteri Sayısı</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" data-testid="input-customers" {...field} />
                        </FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="averageTicket" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ort. Adisyon (TL)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" data-testid="input-avg-ticket" {...field} />
                        </FormControl>
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notlar</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Ek notlar..." data-testid="input-notes" className="resize-none" {...field} />
                      </FormControl>
                    </FormItem>
                  )} />

                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-report">
                      {createMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                      Kaydet
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[90px]" data-testid="select-year">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026].map(y => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
          <SelectTrigger className="w-[150px]" data-testid="select-branch-filter">
            <Building className="mr-1.5 h-3.5 w-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Şubeler</SelectItem>
            {(branches as any[])?.map(b => (
              <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card data-testid="stat-total-revenue">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Toplam Gelir</span>
              </div>
              <p className="text-lg font-bold mt-1">{formatCurrency(summary.totalRevenue)}</p>
            </CardContent>
          </Card>
          <Card data-testid="stat-total-expenses">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">Toplam Gider</span>
              </div>
              <p className="text-lg font-bold mt-1">{formatCurrency(summary.totalExpenses)}</p>
            </CardContent>
          </Card>
          <Card data-testid="stat-total-profit">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Net Kar</span>
              </div>
              <p className={`text-lg font-bold mt-1 ${summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.totalProfit)}
              </p>
            </CardContent>
          </Card>
          <Card data-testid="stat-report-count">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Rapor Sayısı</span>
              </div>
              <p className="text-lg font-bold mt-1">{summary.reportCount}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="overview" data-testid="tab-overview" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <BarChart3 className="h-3.5 w-3.5" />
            Genel Bakış
          </TabsTrigger>
          <TabsTrigger value="reports" data-testid="tab-reports" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <FileText className="h-3.5 w-3.5" />
            Raporlar
          </TabsTrigger>
          <TabsTrigger value="branches" data-testid="tab-branches" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Building className="h-3.5 w-3.5" />
            Şube Karşılaştırma
          </TabsTrigger>
          <TabsTrigger value="ai-analysis" data-testid="tab-ai-analysis" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Brain className="h-3.5 w-3.5" />
            AI Analiz
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Aylık Gelir / Gider Trendi</CardTitle>
                <CardDescription className="text-xs">{selectedYear} yılı aylık mali veriler</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                      <Tooltip
                        contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="Gelir" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="Gider" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="Kar" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Şube Bazlı Gelir</CardTitle>
                <CardDescription className="text-xs">En yüksek gelirli ilk 10 şube</CardDescription>
              </CardHeader>
              <CardContent>
                {branchRevenueData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">Henüz veri yok</div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={branchRevenueData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={50} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                        <Tooltip
                          contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Bar dataKey="revenue" name="Gelir" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-sm font-medium">Girilen Raporlar</CardTitle>
                <Select value={reportTypeFilter} onValueChange={setReportTypeFilter}>
                  <SelectTrigger className="w-[120px]" data-testid="select-report-type-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Aylık</SelectItem>
                    <SelectItem value="quarterly">Çeyreklik</SelectItem>
                    <SelectItem value="yearly">Yıllık</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ListSkeleton count={5} />
              ) : !(reports as any[])?.length ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <FileText className="mx-auto h-10 w-10 mb-3 opacity-50" />
                  <p>Henüz rapor girilmemiş</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dönem</TableHead>
                        <TableHead>Şube</TableHead>
                        <TableHead className="text-right">Gelir</TableHead>
                        <TableHead className="text-right">Gider</TableHead>
                        <TableHead className="text-right">Net Kar</TableHead>
                        <TableHead className="text-center">Müşteri</TableHead>
                        <TableHead className="text-center">Ort. Adisyon</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(reports as any[])?.map((r: any) => {
                        const profit = (parseFloat(r.revenue) || 0) - (parseFloat(r.expenses) || 0);
                        const branchName = (branches as any[])?.find((b: any) => b.id === r.branchId)?.name || 'Genel';
                        return (
                          <TableRow key={r.id} data-testid={`row-report-${r.id}`}>
                            <TableCell className="font-medium text-sm">{r.period}</TableCell>
                            <TableCell className="text-xs">{branchName}</TableCell>
                            <TableCell className="text-right text-sm text-green-600 dark:text-green-400">
                              {formatCurrency(r.revenue)}
                            </TableCell>
                            <TableCell className="text-right text-sm text-red-600 dark:text-red-400">
                              {formatCurrency(r.expenses)}
                            </TableCell>
                            <TableCell className={`text-right font-semibold text-sm ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {formatCurrency(profit)}
                            </TableCell>
                            <TableCell className="text-center text-xs">
                              {r.customerCount || '-'}
                            </TableCell>
                            <TableCell className="text-center text-xs">
                              {r.averageTicket ? formatCurrency(r.averageTicket) : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branches">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Şube Karlılık Karşılaştırması</CardTitle>
              <CardDescription className="text-xs">{selectedYear} yılı şube bazlı gelir ve karlılık</CardDescription>
            </CardHeader>
            <CardContent>
              {branchRevenueData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Building className="mx-auto h-10 w-10 mb-3 opacity-50" />
                  <p>Henüz şube bazlı rapor girilmemiş</p>
                  <p className="text-xs mt-1">Rapor girişi yapıldıkça şube karşılaştırması burada görünecek</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {branchRevenueData.map((branch, i) => (
                    <div key={i} className="flex items-center gap-3" data-testid={`branch-revenue-row-${i}`}>
                      <span className="text-xs font-medium w-28 truncate">{branch.name}</span>
                      <div className="flex-1">
                        <div className="h-6 bg-muted rounded-md overflow-hidden">
                          <div
                            className="h-full rounded-md"
                            style={{
                              width: `${(branch.revenue / Math.max(...branchRevenueData.map(b => b.revenue))) * 100}%`,
                              backgroundColor: COLORS[i % COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-bold w-24 text-right">{formatCurrency(branch.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-analysis">
          <AIAnalysisSection year={selectedYear} summary={summary} branches={branches} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AIAnalysisSection({ year, summary, branches }: { year: string; summary: any; branches: any[] }) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(v);

  const runAnalysis = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest('POST', '/api/management-reports/ai-analysis', { year });
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (err: any) {
      toast({ title: 'Hata', description: 'AI analizi yapılamadı', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              <div>
                <CardTitle className="text-sm font-medium">AI Mali Analiz</CardTitle>
                <CardDescription className="text-xs">{year} yılı verilerine dayalı yapay zeka analizi</CardDescription>
              </div>
            </div>
            <Button
              onClick={runAnalysis}
              disabled={isLoading || !summary}
              data-testid="btn-run-ai-analysis"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Analiz Ediliyor...
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  AI Analizi Çalıştır
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!summary && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <Brain className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>Analiz için önce mali rapor girişi yapılmalı</p>
            </div>
          )}
          {summary && !analysis && !isLoading && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <Sparkles className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>Yapay zeka destekli mali analiz almak için butona tıklayın</p>
              <div className="mt-3 grid grid-cols-2 gap-3 max-w-sm mx-auto text-xs">
                <div className="p-2 rounded-md bg-muted/50">
                  <p className="font-medium">Toplam Gelir</p>
                  <p className="text-foreground">{formatCurrency(summary.totalRevenue)}</p>
                </div>
                <div className="p-2 rounded-md bg-muted/50">
                  <p className="font-medium">Net Kar</p>
                  <p className="text-foreground">{formatCurrency(summary.totalProfit)}</p>
                </div>
              </div>
            </div>
          )}
          {isLoading && (
            <div className="text-center py-8">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-500" />
              <p className="text-sm text-muted-foreground mt-2">AI mali verileri analiz ediyor...</p>
            </div>
          )}
          {analysis && !isLoading && (
            <div className="prose prose-sm dark:prose-invert max-w-none" data-testid="ai-analysis-result">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{analysis}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}