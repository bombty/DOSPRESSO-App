import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Trophy, Medal, Star, Award, Users, TrendingUp, Calculator,
  Calendar, Building, Crown, Sparkles, Target, Loader2, Download,
  Globe, BarChart3, ArrowLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { downloadEmployeeOfMonthCertificate } from "@/lib/pdfHelper";
import { Link } from "wouter";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from "recharts";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

const WEIGHT_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#a855f7", "#ec4899", "#ef4444"];

function getInitials(firstName?: string, lastName?: string) {
  return `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase();
}

export default function EmployeeOfMonthPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"company" | "branch">("company");

  const isHQ = user?.role && (isHQRole(user.role as any) || user.role === 'admin');

  const { data: branches, isError, refetch, isLoading } = useQuery({
    queryKey: ["/api/branches"],
    staleTime: 300000,
  });

  const { data: weights } = useQuery({
    queryKey: ["/api/employee-of-month/weights"],
  });

  const { data: rankings, isLoading: rankingsLoading } = useQuery({
    queryKey: ["/api/employee-of-month/rankings", selectedMonth, selectedYear, viewMode === "branch" ? selectedBranchId : "all"],
  });

  const { data: awards } = useQuery({
    queryKey: ["/api/employee-of-month/awards", selectedYear],
  });

  const calculateMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/employee-of-month/calculate", {
      month: selectedMonth,
      year: selectedYear,
      branchId: viewMode === "branch" && selectedBranchId !== "all" ? parseInt(selectedBranchId) : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-of-month/rankings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employee-of-month/awards"] });
      toast({ title: "Başarılı", description: "Hesaplama tamamlandı" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const weightData = weights ? [
    { name: "Devam", value: (weights as any).attendanceWeight, color: WEIGHT_COLORS[0] },
    { name: "Checklist", value: (weights as any).checklistWeight, color: WEIGHT_COLORS[1] },
    { name: "Görevler", value: (weights as any).taskWeight, color: WEIGHT_COLORS[2] },
    { name: "Müşteri", value: (weights as any).customerRatingWeight, color: WEIGHT_COLORS[3] },
    { name: "Yönetici", value: (weights as any).managerRatingWeight, color: WEIGHT_COLORS[4] },
    { name: "İzin Kesinti", value: (weights as any).leaveDeductionWeight, color: WEIGHT_COLORS[5] },
  ] : [];

  const topPerformers = (rankings as any[])?.slice(0, 3) || [];

  const yearlyAggregate = useMemo(() => {
    if (!(awards as any[])?.length) return [];
    const employeeScores: Record<string, { name: string; branch: string; totalScore: number; monthCount: number; awards: number }> = {};
    (awards as any[]).forEach((a: any) => {
      const key = a.employeeId;
      if (!employeeScores[key]) {
        employeeScores[key] = {
          name: `${a.employee?.firstName || ''} ${a.employee?.lastName || ''}`.trim(),
          branch: a.branch?.name || '',
          totalScore: 0,
          monthCount: 0,
          awards: 0,
        };
      }
      employeeScores[key].totalScore += a.totalScore || 0;
      employeeScores[key].monthCount += 1;
      employeeScores[key].awards += 1;
    });
    return Object.entries(employeeScores)
      .map(([id, data]) => ({
        employeeId: id,
        ...data,
        avgScore: data.totalScore / data.monthCount,
      }))
      .sort((a, b) => b.awards - a.awards || b.avgScore - a.avgScore);
  }, [awards]);

  const branchComparisonData = useMemo(() => {
    if (!(awards as any[])?.length || !(branches as any[])?.length) return [];
    const branchWins: Record<string, number> = {};
    (awards as any[]).forEach((a: any) => {
      const bName = a.branch?.name || 'Bilinmiyor';
      branchWins[bName] = (branchWins[bName] || 0) + 1;
    });
    return Object.entries(branchWins)
      .map(([name, wins]) => ({ name: name.length > 15 ? name.substring(0, 15) + '...' : name, wins }))
      .sort((a, b) => b.wins - a.wins);
  }, [awards, branches]);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;


  return (
    <div className="p-3 sm:p-4 space-y-4 max-w-7xl mx-auto" data-testid="employee-of-month-page">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/ik">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Ayın / Yılın Elemanı
          </h1>
          <p className="text-sm text-muted-foreground">
            Performans bazlı en iyi çalışan seçimi ve ödüllendirme
          </p>
        </div>
      </div>

      {isHQ && (
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "company" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("company")}
            data-testid="button-view-company"
          >
            <Globe className="h-3.5 w-3.5 mr-1.5" />
            Şirket Geneli
          </Button>
          <Button
            variant={viewMode === "branch" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("branch")}
            data-testid="button-view-branch"
          >
            <Building className="h-3.5 w-3.5 mr-1.5" />
            Şube Bazlı
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
          <SelectTrigger className="w-[130px]" data-testid="select-month">
            <Calendar className="mr-1.5 h-3.5 w-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="w-[90px]" data-testid="select-year">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026].map((y) => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {viewMode === "branch" && (
          <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
            <SelectTrigger className="w-[160px]" data-testid="select-branch">
              <Building className="mr-1.5 h-3.5 w-3.5" />
              <SelectValue placeholder="Tüm şubeler" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Şubeler</SelectItem>
              {(branches as any[])?.map((b: any) => (
                <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {isHQ && (
          <Button
            onClick={() => calculateMutation.mutate()}
            disabled={calculateMutation.isPending}
            size="sm"
            data-testid="button-calculate"
          >
            {calculateMutation.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Calculator className="mr-1.5 h-3.5 w-3.5" />
            )}
            Hesapla
          </Button>
        )}
      </div>

      {topPerformers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {topPerformers.map((performer: any, index: number) => {
            const medalColors = [
              "bg-yellow-500/10 border-yellow-500/50",
              "bg-muted border-muted-foreground/30",
              "bg-amber-700/10 border-amber-700/50",
            ];
            const iconColors = [
              "bg-yellow-500 text-white",
              "bg-muted text-muted-foreground",
              "bg-amber-700 text-white",
            ];
            return (
              <Card
                key={performer.employeeId}
                className={`${medalColors[index]} border`}
                data-testid={`card-winner-${index}`}
              >
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-2.5 ${iconColors[index]}`}>
                      {index === 0 ? <Crown className="h-5 w-5" /> :
                       index === 1 ? <Medal className="h-5 w-5" /> :
                       <Award className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={index === 0 ? "default" : "secondary"} className="text-[10px]">
                          {index + 1}. Sıra
                        </Badge>
                        <span className="text-2xl font-bold">{performer.totalScore?.toFixed(1)}</span>
                      </div>
                      <p className="font-semibold truncate">
                        {performer.employee?.firstName} {performer.employee?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{performer.branch?.name}</p>
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-xs">
                        {getInitials(performer.employee?.firstName, performer.employee?.lastName)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Tabs defaultValue="rankings" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="rankings" data-testid="tab-rankings" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <TrendingUp className="h-3.5 w-3.5" />
            Sıralama
          </TabsTrigger>
          <TabsTrigger value="weights" data-testid="tab-weights" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Target className="h-3.5 w-3.5" />
            Ağırlıklar
          </TabsTrigger>
          <TabsTrigger value="awards" data-testid="tab-awards" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Trophy className="h-3.5 w-3.5" />
            Geçmiş Ödüller
          </TabsTrigger>
          <TabsTrigger value="year" data-testid="tab-year" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Star className="h-3.5 w-3.5" />
            Yılın Elemanı
          </TabsTrigger>
          {isHQ && (
            <TabsTrigger value="analytics" data-testid="tab-analytics" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-3.5 w-3.5" />
              Analitik
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="rankings">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                {MONTHS[selectedMonth - 1]} {selectedYear} Sıralaması
                {viewMode === "company" && <Badge variant="outline" className="text-[10px]">Şirket Geneli</Badge>}
              </CardTitle>
              <CardDescription className="text-xs">
                {viewMode === "company" ? "Tüm şubelerden en iyi performans gösteren personel" : "Seçili şubedeki personel sıralaması"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (rankings as any[])?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="mx-auto h-10 w-10 mb-3 opacity-50" />
                  <p className="text-sm">Bu dönem için henüz hesaplama yapılmamış</p>
                  <p className="text-xs mt-1">Yukarıdaki "Hesapla" butonuna tıklayın</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Personel</TableHead>
                        <TableHead>Şube</TableHead>
                        <TableHead className="text-center">Devam</TableHead>
                        <TableHead className="text-center">Checklist</TableHead>
                        <TableHead className="text-center">Görev</TableHead>
                        <TableHead className="text-center">Müşteri</TableHead>
                        <TableHead className="text-center">Yönetici</TableHead>
                        <TableHead className="text-center">Kesinti</TableHead>
                        <TableHead className="text-right">Toplam</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(rankings as any[])?.map((r: any, index: number) => (
                        <TableRow key={r.employeeId} data-testid={`row-ranking-${r.employeeId}`}>
                          <TableCell>
                            {index < 3 ? (
                              <Badge variant={index === 0 ? "default" : "secondary"} className="text-[10px]">
                                {index + 1}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">{index + 1}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="text-[10px]">
                                  {getInitials(r.employee?.firstName, r.employee?.lastName)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm">
                                {r.employee?.firstName} {r.employee?.lastName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{r.branch?.name}</TableCell>
                          <TableCell className="text-center">
                            <ScoreCell value={r.attendanceScore} max={20} />
                          </TableCell>
                          <TableCell className="text-center">
                            <ScoreCell value={r.checklistScore} max={20} />
                          </TableCell>
                          <TableCell className="text-center">
                            <ScoreCell value={r.taskScore} max={15} />
                          </TableCell>
                          <TableCell className="text-center">
                            <ScoreCell value={r.customerRatingScore} max={15} />
                          </TableCell>
                          <TableCell className="text-center">
                            <ScoreCell value={r.managerRatingScore} max={20} />
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="destructive" className="text-[10px]">
                              -{r.leaveDeduction?.toFixed(1) || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-bold">{r.totalScore?.toFixed(1)}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weights">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Puanlama Ağırlıkları</CardTitle>
                <CardDescription className="text-xs">Her kategorinin toplam puana etkisi</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={weightData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: %${value}`}
                      >
                        {weightData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Kategori Detayları</CardTitle>
                <CardDescription className="text-xs">Puanlama kriterleri açıklaması</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {weightData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-sm font-medium">{item.name}</span>
                        <Badge variant="outline" className="text-[10px]">%{item.value}</Badge>
                      </div>
                      <Progress value={item.value} className="h-1.5 mt-1" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="awards">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                {selectedYear} Yılı Ayın Elemanları
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(awards as any[])?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="mx-auto h-10 w-10 mb-3 opacity-50" />
                  <p className="text-sm">Henüz ödül verilmemiş</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {MONTHS.map((monthName, monthIndex) => {
                    const award = (awards as any[])?.find(
                      (a: any) => a.month === monthIndex + 1 && a.year === selectedYear
                    );
                    return (
                      <Card
                        key={monthIndex}
                        className={award ? "border-yellow-500/50" : "opacity-40"}
                        data-testid={`card-award-${monthIndex}`}
                      >
                        <CardContent className="pt-3 pb-2 text-center">
                          <p className="text-xs font-medium text-muted-foreground">{monthName}</p>
                          {award ? (
                            <>
                              <Crown className="mx-auto h-5 w-5 text-yellow-500 my-1.5" />
                              <p className="font-semibold text-xs truncate">
                                {award.employee?.firstName}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {award.branch?.name}
                              </p>
                              <p className="text-xs font-bold mt-1">
                                {award.totalScore?.toFixed(1)} puan
                              </p>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="mt-1 h-6 text-[10px]"
                                onClick={() => downloadEmployeeOfMonthCertificate({
                                  employeeName: `${award.employee?.firstName || ''} ${award.employee?.lastName || ''}`.trim(),
                                  branchName: award.branch?.name || 'DOSPRESSO',
                                  monthYear: `${monthName} ${selectedYear}`,
                                  score: award.totalScore || 0,
                                  awardDate: new Date(award.createdAt || Date.now()),
                                  certificateNo: `EOM-${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-${award.id}`,
                                })}
                                data-testid={`button-certificate-${monthIndex}`}
                              >
                                <Download className="h-3 w-3 mr-0.5" />
                                Sertifika
                              </Button>
                            </>
                          ) : (
                            <div className="h-14 flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">-</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="year">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  {selectedYear} Yılın Elemanı Adayları
                </CardTitle>
                <CardDescription className="text-xs">
                  Yıl boyunca en çok "Ayın Elemanı" seçilen ve en yüksek ortalama puan alan personel
                </CardDescription>
              </CardHeader>
              <CardContent>
                {yearlyAggregate.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Star className="mx-auto h-10 w-10 mb-3 opacity-50" />
                    <p className="text-sm">Henüz yeterli veri yok</p>
                    <p className="text-xs mt-1">Aylık ödüller verildikçe yılın elemanı adayları burada görünecek</p>
                  </div>
                ) : (
                  <>
                    {yearlyAggregate.length > 0 && (
                      <Card className="border-yellow-500/50 bg-yellow-500/5 mb-4">
                        <CardContent className="pt-4 pb-3">
                          <div className="flex items-center gap-4">
                            <div className="bg-yellow-500 text-white rounded-full p-3">
                              <Crown className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                              <Badge className="mb-1">Yılın Elemanı Adayı</Badge>
                              <h3 className="text-lg font-bold">{yearlyAggregate[0].name}</h3>
                              <p className="text-sm text-muted-foreground">{yearlyAggregate[0].branch}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold">{yearlyAggregate[0].awards}</p>
                              <p className="text-xs text-muted-foreground">kez Ayın Elemanı</p>
                              <p className="text-sm font-medium mt-1">Ort: {(yearlyAggregate[0].avgScore ?? 0).toFixed(1)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">#</TableHead>
                          <TableHead>Personel</TableHead>
                          <TableHead>Şube</TableHead>
                          <TableHead className="text-center">Ödül Sayısı</TableHead>
                          <TableHead className="text-center">Toplam Puan</TableHead>
                          <TableHead className="text-right">Ortalama</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {yearlyAggregate.map((emp, index) => (
                          <TableRow key={emp.employeeId} data-testid={`row-yearly-${emp.employeeId}`}>
                            <TableCell>
                              {index < 3 ? (
                                <Badge variant={index === 0 ? "default" : "secondary"} className="text-[10px]">
                                  {index + 1}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">{index + 1}</span>
                              )}
                            </TableCell>
                            <TableCell className="font-medium text-sm">{emp.name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{emp.branch}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">
                                <Trophy className="h-3 w-3 mr-1" />
                                {emp.awards}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center text-sm">{(emp.totalScore ?? 0).toFixed(1)}</TableCell>
                            <TableCell className="text-right font-bold">{(emp.avgScore ?? 0).toFixed(1)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {isHQ && (
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Şube Bazlı Ödül Dağılımı</CardTitle>
                  <CardDescription className="text-xs">{selectedYear} yılında hangi şubeler kaç kez Ayın Elemanı çıkardı</CardDescription>
                </CardHeader>
                <CardContent>
                  {branchComparisonData.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">Henüz veri yok</div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={branchComparisonData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                          <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                          <Bar dataKey="wins" name="Ödül Sayısı" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Yıllık Performans Özeti</CardTitle>
                  <CardDescription className="text-xs">{selectedYear} yılı genel istatistikler</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 rounded-md bg-muted/30">
                      <Trophy className="mx-auto h-5 w-5 text-yellow-500 mb-1" />
                      <p className="text-xl font-bold">{(awards as any[])?.length || 0}</p>
                      <p className="text-xs text-muted-foreground">Toplam Ödül</p>
                    </div>
                    <div className="text-center p-3 rounded-md bg-muted/30">
                      <Users className="mx-auto h-5 w-5 text-blue-500 mb-1" />
                      <p className="text-xl font-bold">{yearlyAggregate.length}</p>
                      <p className="text-xs text-muted-foreground">Ödül Alan Personel</p>
                    </div>
                    <div className="text-center p-3 rounded-md bg-muted/30">
                      <Building className="mx-auto h-5 w-5 text-green-500 mb-1" />
                      <p className="text-xl font-bold">{branchComparisonData.length}</p>
                      <p className="text-xs text-muted-foreground">Ödül Çıkaran Şube</p>
                    </div>
                    <div className="text-center p-3 rounded-md bg-muted/30">
                      <Star className="mx-auto h-5 w-5 text-purple-500 mb-1" />
                      <p className="text-xl font-bold">
                        {yearlyAggregate.length > 0 ? (yearlyAggregate[0].avgScore ?? 0).toFixed(1) : '-'}
                      </p>
                      <p className="text-xs text-muted-foreground">En Yüksek Ort. Puan</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function ScoreCell({ value, max }: { value: number; max: number }) {
  const percentage = (value / max) * 100;
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs font-medium">{value?.toFixed(1) || 0}</span>
      <Progress value={percentage} className="h-1 w-10 mt-0.5" />
    </div>
  );
}