import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, Award, Star, Calendar, Target, 
  Sparkles, Download, Trophy, Medal, ArrowUp, ArrowDown,
  Loader2, MessageSquare, ThumbsUp, ClipboardCheck, Users,
  Minus, BarChart3, Clock, CalendarRange, History
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  createPDFWithHeader,
  addSection,
  addKeyValue,
  addParagraph,
  savePDF,
  checkPageBreak,
  sanitizeText
} from "@/lib/pdfHelper";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, AreaChart, Area
} from "recharts";
import { ErrorState } from "../components/error-state";
import { CompactKPIStrip } from "@/components/compact-kpi-strip";
import { LoadingState } from "../components/loading-state";

type PeriodType = "monthly" | "quarterly" | "yearly" | "all";

const PERIOD_LABELS: Record<PeriodType, string> = {
  monthly: "Aylık",
  quarterly: "3 Aylık",
  yearly: "Yıllık",
  all: "Tüm Geçmiş"
};

const PERIOD_DESCRIPTIONS: Record<PeriodType, string> = {
  monthly: "Prim ve uyarı değerlendirmesi",
  quarterly: "Trend analizi ve gelişim takibi",
  yearly: "Kariyer değerlendirmesi",
  all: "Toplam ilerleme grafi\u011fi"
};

export default function MyPerformancePage() {
  const { toast } = useToast();
  const [activePeriod, setActivePeriod] = useState<PeriodType>("monthly");
  const [aiTips, setAiTips] = useState<string[]>([]);
  const [generatingTips, setGeneratingTips] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const { data: user, isError, refetch, isLoading } = useQuery({
    queryKey: ["/api/user"],
  });

  const { data: periodData, isLoading: periodLoading } = useQuery<any>({
    queryKey: [`/api/my-performance/periods?period=${activePeriod}`],
  });

  const { data: myPerformance } = useQuery({
    queryKey: ["/api/my-performance"],
  });

  const perf = myPerformance as any;
  const totalScore = perf?.totalScore || 0;
  const rank = perf?.rank;

  const radarData = perf ? [
    { subject: "Devam", value: (perf.attendanceScore || 0) * 5, fullMark: 100 },
    { subject: "Checklist", value: (perf.checklistScore || 0) * 5, fullMark: 100 },
    { subject: "Görevler", value: (perf.taskScore || 0) * 6.67, fullMark: 100 },
    { subject: "Müşteri", value: (perf.customerRatingScore || 0) * 6.67, fullMark: 100 },
    { subject: "Yonetici", value: (perf.managerRatingScore || 0) * 5, fullMark: 100 },
  ] : [];

  const generateAITips = async () => {
    setGeneratingTips(true);
    try {
      const response = await apiRequest("POST", "/api/my-performance/ai-tips", {
        performance: myPerformance
      });
      const data = await response.json();
      setAiTips(data.tips || []);
      toast({ title: "Başarılı", description: "AI önerileri oluşturuldu" });
    } catch (error) {
      console.error("AI tips error:", error);
      setAiTips([
        "Devam puanınızı artırmak için mesai saatlerine dikkat edin.",
        "Checklist görevlerini zamanında tamamlayın.",
        "Müşteri memnuniyeti için güler yüzlü hizmet verin.",
        "Ekip çalışmasına katılım sağlayın.",
        "Eğitim programlarını tamamlayın."
      ]);
      toast({ title: "Bilgi", description: "Genel öneriler yüklendi" });
    } finally {
      setGeneratingTips(false);
    }
  };

  const generatePersonalReport = async () => {
    setGeneratingPDF(true);
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const { doc, yPos: startY } = await createPDFWithHeader({
        title: "Kişisel Performans Raporum",
        subtitle: `${(user as any)?.firstName} ${(user as any)?.lastName}`,
        branchName: (user as any)?.branchName,
        orientation: "portrait"
      });

      let yPos = startY;
      yPos = addSection(doc, "Kişisel Bilgiler", yPos);
      yPos = addKeyValue(doc, "Ad Soyad", `${(user as any)?.firstName || ""} ${(user as any)?.lastName || ""}`, yPos);
      yPos = addKeyValue(doc, "Pozisyon", (user as any)?.role || "-", yPos);
      yPos = addKeyValue(doc, "Şube", (user as any)?.branchName || "-", yPos);
      yPos += 5;

      yPos = checkPageBreak(doc, yPos, 80);
      yPos = addSection(doc, "Performans Puanları", yPos);
      yPos = addKeyValue(doc, "Toplam Puan", `${perf?.totalScore?.toFixed(1) || 0} / 100`, yPos);
      yPos = addKeyValue(doc, "Devam Puanı", `${perf?.attendanceScore?.toFixed(1) || 0} / 20`, yPos);
      yPos = addKeyValue(doc, "Checklist Puanı", `${perf?.checklistScore?.toFixed(1) || 0} / 20`, yPos);
      yPos = addKeyValue(doc, "Görev Puanı", `${perf?.taskScore?.toFixed(1) || 0} / 15`, yPos);
      yPos = addKeyValue(doc, "Müşteri Puanı", `${perf?.customerRatingScore?.toFixed(1) || 0} / 15`, yPos);
      yPos = addKeyValue(doc, "Yönetici Puanı", `${perf?.managerRatingScore?.toFixed(1) || 0} / 20`, yPos);
      yPos += 5;

      if (perf?.rank) {
        yPos = checkPageBreak(doc, yPos, 40);
        yPos = addSection(doc, "Sıralama", yPos);
        yPos = addKeyValue(doc, "Bu Ay Sırası", `${perf.rank}. sirada`, yPos);
        yPos = addKeyValue(doc, "Toplam Personel", `${perf.totalEmployees || "-"} kisi`, yPos);
        yPos += 5;
      }

      if (aiTips.length > 0) {
        yPos = checkPageBreak(doc, yPos, 60);
        yPos = addSection(doc, "Gelişim Önerileri", yPos);
        for (const tip of aiTips) {
          yPos = addParagraph(doc, `${sanitizeText(tip)}`, yPos);
        }
      }

      savePDF(doc, `kisisel-performans-${currentYear}-${currentMonth}.pdf`);
      toast({ title: "Başarılı", description: "PDF raporu indirildi" });
    } catch (error) {
      console.error("PDF error:", error);
      toast({ title: "Hata", description: "PDF oluşturulamadı", variant: "destructive" });
    } finally {
      setGeneratingPDF(false);
    }
  };

  useEffect(() => {
    if (myPerformance && aiTips.length === 0) {
      generateAITips();
    }
  }, [myPerformance]);

  
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-my-performance">
            <TrendingUp className="h-6 w-6" />
            Performansim
          </h1>
          <p className="text-muted-foreground">
            Kişisel performans takibi ve AI önerileri
          </p>
        </div>
        
        <Button 
          onClick={generatePersonalReport}
          disabled={generatingPDF || isLoading}
          data-testid="button-download-report"
        >
          {generatingPDF ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Raporumu İndir
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          <CompactKPIStrip
            items={[
              { label: "Toplam Puan", value: totalScore.toFixed(1), icon: <Trophy className={`h-4 w-4 ${totalScore >= 70 ? "text-green-500" : totalScore >= 50 ? "text-yellow-500" : "text-red-500"}`} />, color: totalScore >= 70 ? "success" : totalScore >= 50 ? "warning" : "danger", testId: "card-total-score" },
              { label: "Sıralama", value: rank || "-", icon: <Medal className="h-4 w-4 text-blue-500" />, color: "info", testId: "card-ranking", subtitle: rank && rank <= 3 ? "İlk 3'te!" : undefined },
              { label: "Müşteri Puanı", value: perf?.customerRatingAvg?.toFixed(1) || "-", icon: <Star className="h-4 w-4 text-yellow-500" />, color: "warning", testId: "card-customer-score" },
              { label: "Checklist", value: `${perf?.checklistCompletion?.toFixed(0) || 0}%`, icon: <ClipboardCheck className="h-4 w-4 text-purple-500" />, color: "info", testId: "card-checklist-score" },
            ]}
            desktopRenderer={
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className={totalScore >= 70 ? "border-green-500" : totalScore >= 50 ? "border-yellow-500" : "border-red-500"} data-testid="card-total-score">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center">
                      <Trophy className={`h-8 w-8 mb-2 ${totalScore >= 70 ? "text-green-500" : totalScore >= 50 ? "text-yellow-500" : "text-red-500"}`} />
                      <p className="text-3xl font-bold" data-testid="text-total-score">{totalScore.toFixed(1)}</p>
                      <p className="text-sm text-muted-foreground">Toplam Puan</p>
                      <Progress value={totalScore} className="h-2 mt-2 w-full" />
                    </div>
                  </CardContent>
                </Card>
                <Card data-testid="card-ranking">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center">
                      <Medal className="h-8 w-8 mb-2 text-blue-500" />
                      <p className="text-3xl font-bold" data-testid="text-rank">{rank || "-"}</p>
                      <p className="text-sm text-muted-foreground">Sıralama</p>
                      {rank && rank <= 3 && (
                        <Badge className="mt-2">İlk 3'te!</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card data-testid="card-customer-score">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center">
                      <Star className="h-8 w-8 mb-2 text-yellow-500" />
                      <p className="text-3xl font-bold">{perf?.customerRatingAvg?.toFixed(1) || "-"}</p>
                      <p className="text-sm text-muted-foreground">Müşteri Puanı</p>
                    </div>
                  </CardContent>
                </Card>
                <Card data-testid="card-checklist-score">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center">
                      <ClipboardCheck className="h-8 w-8 mb-2 text-purple-500" />
                      <p className="text-3xl font-bold">{perf?.checklistCompletion?.toFixed(0) || 0}%</p>
                      <p className="text-sm text-muted-foreground">Checklist</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            }
          />

          <Tabs defaultValue="periods" className="space-y-4">
            <TabsList className="flex flex-wrap">
              <TabsTrigger value="periods" data-testid="tab-periods">
                <CalendarRange className="mr-2 h-4 w-4" />
                Periyodlar
              </TabsTrigger>
              <TabsTrigger value="scores" data-testid="tab-scores">
                <Target className="mr-2 h-4 w-4" />
                Puanlarim
              </TabsTrigger>
              <TabsTrigger value="tips" data-testid="tab-tips">
                <Sparkles className="mr-2 h-4 w-4" />
                AI Önerileri
              </TabsTrigger>
            </TabsList>

            <TabsContent value="periods">
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {(["monthly", "quarterly", "yearly", "all"] as PeriodType[]).map(p => (
                    <Button
                      key={p}
                      variant={activePeriod === p ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActivePeriod(p)}
                      data-testid={`button-period-${p}`}
                    >
                      {p === "monthly" && <Clock className="mr-1.5 h-3.5 w-3.5" />}
                      {p === "quarterly" && <CalendarRange className="mr-1.5 h-3.5 w-3.5" />}
                      {p === "yearly" && <Calendar className="mr-1.5 h-3.5 w-3.5" />}
                      {p === "all" && <History className="mr-1.5 h-3.5 w-3.5" />}
                      {PERIOD_LABELS[p]}
                    </Button>
                  ))}
                </div>

                <p className="text-sm text-muted-foreground">{PERIOD_DESCRIPTIONS[activePeriod]}</p>

                <PeriodContent data={periodData} period={activePeriod} />
              </div>
            </TabsContent>

            <TabsContent value="scores">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Performans Radarı</CardTitle>
                    <CardDescription>Kategorilere göre puan dağılımı</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="subject" />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} />
                          <Radar
                            name="Puan"
                            dataKey="value"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            fillOpacity={0.5}
                          />
                          <Tooltip />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Kategori Detayları</CardTitle>
                    <CardDescription>Her kategorideki puanınız</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ScoreBar label="Devam" value={perf?.attendanceScore || 0} max={20} color="bg-green-500" />
                    <ScoreBar label="Checklist" value={perf?.checklistScore || 0} max={20} color="bg-blue-500" />
                    <ScoreBar label="Görevler" value={perf?.taskScore || 0} max={15} color="bg-yellow-500" />
                    <ScoreBar label="Müşteri" value={perf?.customerRatingScore || 0} max={15} color="bg-purple-500" />
                    <ScoreBar label="Yönetici" value={perf?.managerRatingScore || 0} max={20} color="bg-pink-500" />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="tips">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    AI Gelişim Önerileri
                  </CardTitle>
                  <CardDescription>
                    Performansınızı artırmak için kişiselleştirilmiş öneriler
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {generatingTips ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span>AI önerileri hazırlanıyor...</span>
                    </div>
                  ) : aiTips.length > 0 ? (
                    <div className="space-y-3">
                      {aiTips.map((tip, index) => (
                        <div 
                          key={index}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                          data-testid={`tip-item-${index}`}
                        >
                          <div className="rounded-full bg-primary/10 p-2">
                            <ThumbsUp className="h-4 w-4 text-primary" />
                          </div>
                          <p className="text-sm">{tip}</p>
                        </div>
                      ))}
                      <Button 
                        variant="outline" 
                        className="w-full mt-4"
                        onClick={generateAITips}
                        disabled={generatingTips}
                        data-testid="button-refresh-tips"
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Yeni Öneriler Al
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>Henüz öneri oluşturulmadı</p>
                      <Button 
                        className="mt-4"
                        onClick={generateAITips}
                        disabled={generatingTips}
                        data-testid="button-generate-tips"
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        AI Önerilerini Al
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function TrendBadge({ value }: { value: number | null }) {
  if (value === null || value === undefined) return null;
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) {
    return (
      <Badge variant="secondary" className="text-xs" data-testid="badge-trend-neutral">
        <Minus className="w-3 h-3 mr-1" />
        Değişim yok
      </Badge>
    );
  }
  if (rounded > 0) {
    return (
      <Badge variant="default" className="text-xs bg-green-600" data-testid="badge-trend-up">
        <ArrowUp className="w-3 h-3 mr-1" />
        +{rounded} puan
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="text-xs" data-testid="badge-trend-down">
      <ArrowDown className="w-3 h-3 mr-1" />
      {rounded} puan
    </Badge>
  );
}

function PeriodContent({ data, period }: { data: any; period: PeriodType }) {
  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          Yükleniyor...
        </CardContent>
      </Card>
    );
  }

  if (!data.current && data.chartData?.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Henüz veri yok</p>
          <p className="text-sm mt-1">Bu periyod için performans verisi bulunamadı</p>
        </CardContent>
      </Card>
    );
  }

  const currentScore = data.current?.totalScore || data.current?.finalScore || 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="card-period-score">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              <p className="text-sm text-muted-foreground mb-1">{PERIOD_LABELS[period]} Puan</p>
              <p className={`text-4xl font-bold ${currentScore >= 70 ? 'text-green-600 dark:text-green-400' : currentScore >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`} data-testid="text-period-score">
                {currentScore.toFixed(1)}
              </p>
              <Progress value={currentScore} className="h-2 mt-3 w-full" />
              <div className="mt-2">
                <TrendBadge value={data.trend} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-period-previous">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              <p className="text-sm text-muted-foreground mb-1">Önceki Periyod</p>
              {data.previous ? (
                <>
                  <p className="text-3xl font-bold text-muted-foreground" data-testid="text-previous-score">
                    {(data.previous.totalScore || data.previous.finalScore || 0).toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {period === "quarterly" && data.previous.quarter ? `Q${data.previous.quarter} ${data.previous.year}` : ""}
                    {period === "yearly" && data.previous.year ? `${data.previous.year}` : ""}
                    {period === "monthly" ? "Geçen ay" : ""}
                  </p>
                </>
              ) : (
                <p className="text-lg text-muted-foreground">-</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-period-summary">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              <p className="text-sm text-muted-foreground mb-1">Genel Ortalama</p>
              <p className="text-3xl font-bold" data-testid="text-avg-score">
                {(data.summary?.avgScore || 0).toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {data.summary?.totalMonths || 0} aylık veri
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {data.chartData && data.chartData.length > 0 && (
        <Card data-testid="card-period-chart">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              {PERIOD_LABELS[period]} Performans Trendi
            </CardTitle>
            <CardDescription>
              {period === "monthly" ? "Son 12 aylık skor değişimi" : ""}
              {period === "quarterly" ? "Çeyreklik ortalama skorlar" : ""}
              {period === "yearly" ? "Yıllık skor trendi" : ""}
              {period === "all" ? "Tüm zaman performans geçmişi" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.chartData}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    formatter={(value: any) => [`${Number(value).toFixed(1)}`, ""]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="score"
                    name="Toplam Skor"
                    stroke="#3b82f6"
                    fill="url(#scoreGradient)"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {data.chartData && data.chartData.length > 1 && data.chartData[0]?.attendance !== undefined && (
        <Card data-testid="card-category-trend">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Kategori Bazlı Trend</CardTitle>
            <CardDescription>Alt skorların zaman içindeki değişimi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="attendance" name="Devam" stroke="#22c55e" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="checklist" name="Checklist" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="task" name="Görev" stroke="#eab308" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="customer" name="Müşteri" stroke="#a855f7" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="manager" name="Yönetici" stroke="#ec4899" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const percentage = (value / max) * 100;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">{value.toFixed(1)} / {max}</span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
