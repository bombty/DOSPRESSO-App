import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, Award, Star, Calendar, Target, 
  Sparkles, Download, Trophy, Medal, ArrowUp, ArrowDown,
  Loader2, MessageSquare, ThumbsUp, ClipboardCheck, Users
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
  CartesianGrid, Tooltip, Legend
} from "recharts";

const MONTHS = [
  "Ocak", "Subat", "Mart", "Nisan", "Mayis", "Haziran",
  "Temmuz", "Agustos", "Eylul", "Ekim", "Kasim", "Aralik"
];

export default function MyPerformancePage() {
  const { toast } = useToast();
  const [aiTips, setAiTips] = useState<string[]>([]);
  const [generatingTips, setGeneratingTips] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["/api/user"],
  });

  const { data: myPerformance, isLoading } = useQuery({
    queryKey: ["/api/my-performance"],
  });

  const { data: monthlyHistory } = useQuery({
    queryKey: ["/api/my-performance/history"],
  });

  const radarData = myPerformance ? [
    { subject: "Devam", value: ((myPerformance as any).attendanceScore || 0) * 5, fullMark: 100 },
    { subject: "Checklist", value: ((myPerformance as any).checklistScore || 0) * 5, fullMark: 100 },
    { subject: "Gorevler", value: ((myPerformance as any).taskScore || 0) * 6.67, fullMark: 100 },
    { subject: "Musteri", value: ((myPerformance as any).customerRatingScore || 0) * 6.67, fullMark: 100 },
    { subject: "Yonetici", value: ((myPerformance as any).managerRatingScore || 0) * 5, fullMark: 100 },
  ] : [];

  const historyData = (monthlyHistory as any[])?.map((h: any) => ({
    month: MONTHS[h.month - 1]?.substring(0, 3) || "",
    puan: h.totalScore?.toFixed(1) || 0,
    siralama: h.rank || "-"
  })) || [];

  const generateAITips = async () => {
    setGeneratingTips(true);
    try {
      const response = await apiRequest("POST", "/api/my-performance/ai-tips", {
        performance: myPerformance
      });
      const data = await response.json();
      setAiTips(data.tips || []);
      toast({ title: "Basarili", description: "AI onerileri olusturuldu" });
    } catch (error) {
      console.error("AI tips error:", error);
      setAiTips([
        "Devam puaninizi artirmak icin mesai saatlerine dikkat edin.",
        "Checklist gorevlerini zamaninda tamamlayin.",
        "Musteri memnuniyeti icin guler yuzlu hizmet verin.",
        "Ekip calismasina katilim saglayin.",
        "Egitim programlarini tamamlayin."
      ]);
      toast({ title: "Bilgi", description: "Genel oneriler yuklendi" });
    } finally {
      setGeneratingTips(false);
    }
  };

  const generatePersonalReport = async () => {
    setGeneratingPDF(true);
    try {
      const perf = myPerformance as any;
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const { doc, yPos: startY } = await createPDFWithHeader({
        title: "Kisisel Performans Raporum",
        subtitle: `${(user as any)?.firstName} ${(user as any)?.lastName}`,
        branchName: (user as any)?.branchName,
        orientation: "portrait"
      });

      let yPos = startY;

      // Personal info
      yPos = addSection(doc, "Kisisel Bilgiler", yPos);
      yPos = addKeyValue(doc, "Ad Soyad", `${(user as any)?.firstName || ""} ${(user as any)?.lastName || ""}`, yPos);
      yPos = addKeyValue(doc, "Pozisyon", (user as any)?.role || "-", yPos);
      yPos = addKeyValue(doc, "Sube", (user as any)?.branchName || "-", yPos);
      yPos += 5;

      // Performance scores
      yPos = checkPageBreak(doc, yPos, 80);
      yPos = addSection(doc, "Performans Puanlari", yPos);
      yPos = addKeyValue(doc, "Toplam Puan", `${perf?.totalScore?.toFixed(1) || 0} / 100`, yPos);
      yPos = addKeyValue(doc, "Devam Puani", `${perf?.attendanceScore?.toFixed(1) || 0} / 20`, yPos);
      yPos = addKeyValue(doc, "Checklist Puani", `${perf?.checklistScore?.toFixed(1) || 0} / 20`, yPos);
      yPos = addKeyValue(doc, "Gorev Puani", `${perf?.taskScore?.toFixed(1) || 0} / 15`, yPos);
      yPos = addKeyValue(doc, "Musteri Puani", `${perf?.customerRatingScore?.toFixed(1) || 0} / 15`, yPos);
      yPos = addKeyValue(doc, "Yonetici Puani", `${perf?.managerRatingScore?.toFixed(1) || 0} / 20`, yPos);
      yPos += 5;

      // Ranking
      if (perf?.rank) {
        yPos = checkPageBreak(doc, yPos, 40);
        yPos = addSection(doc, "Siralama", yPos);
        yPos = addKeyValue(doc, "Bu Ay Sirasi", `${perf.rank}. sirada`, yPos);
        yPos = addKeyValue(doc, "Toplam Personel", `${perf.totalEmployees || "-"} kisi`, yPos);
        yPos += 5;
      }

      // AI Tips
      if (aiTips.length > 0) {
        yPos = checkPageBreak(doc, yPos, 60);
        yPos = addSection(doc, "Gelisim Onerileri", yPos);
        for (const tip of aiTips) {
          yPos = addParagraph(doc, `• ${tip}`, yPos);
        }
      }

      savePDF(doc, `kisisel-performans-${currentYear}-${currentMonth}.pdf`);
      toast({ title: "Basarili", description: "PDF raporu indirildi" });
    } catch (error) {
      console.error("PDF error:", error);
      toast({ title: "Hata", description: "PDF olusturulamadi", variant: "destructive" });
    } finally {
      setGeneratingPDF(false);
    }
  };

  useEffect(() => {
    if (myPerformance && aiTips.length === 0) {
      generateAITips();
    }
  }, [myPerformance]);

  const perf = myPerformance as any;
  const totalScore = perf?.totalScore || 0;
  const rank = perf?.rank;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Performansim
          </h1>
          <p className="text-muted-foreground">
            Kisisel performans takibi ve AI onerileri
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
          Raporumu Indir
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          {/* Score Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className={totalScore >= 70 ? "border-green-500" : totalScore >= 50 ? "border-yellow-500" : "border-red-500"}>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <Trophy className={`h-8 w-8 mb-2 ${totalScore >= 70 ? "text-green-500" : totalScore >= 50 ? "text-yellow-500" : "text-red-500"}`} />
                  <p className="text-3xl font-bold">{totalScore.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground">Toplam Puan</p>
                  <Progress value={totalScore} className="h-2 mt-2 w-full" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <Medal className="h-8 w-8 mb-2 text-blue-500" />
                  <p className="text-3xl font-bold">{rank || "-"}</p>
                  <p className="text-sm text-muted-foreground">Siralama</p>
                  {rank && rank <= 3 && (
                    <Badge className="mt-2">Ilk 3'te!</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <Star className="h-8 w-8 mb-2 text-yellow-500" />
                  <p className="text-3xl font-bold">
                    {perf?.customerRatingAvg?.toFixed(1) || "-"}
                  </p>
                  <p className="text-sm text-muted-foreground">Musteri Puani</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <ClipboardCheck className="h-8 w-8 mb-2 text-purple-500" />
                  <p className="text-3xl font-bold">
                    {perf?.checklistCompletion?.toFixed(0) || 0}%
                  </p>
                  <p className="text-sm text-muted-foreground">Checklist</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="scores" className="space-y-4">
            <TabsList>
              <TabsTrigger value="scores" data-testid="tab-scores">
                <Target className="mr-2 h-4 w-4" />
                Puanlarim
              </TabsTrigger>
              <TabsTrigger value="history" data-testid="tab-history">
                <Calendar className="mr-2 h-4 w-4" />
                Gecmis
              </TabsTrigger>
              <TabsTrigger value="tips" data-testid="tab-tips">
                <Sparkles className="mr-2 h-4 w-4" />
                AI Onerileri
              </TabsTrigger>
            </TabsList>

            <TabsContent value="scores">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Performans Radari</CardTitle>
                    <CardDescription>Kategorilere gore puan dagilimi</CardDescription>
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
                    <CardTitle>Kategori Detaylari</CardTitle>
                    <CardDescription>Her kategorideki puaniniz</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ScoreBar 
                      label="Devam" 
                      value={perf?.attendanceScore || 0} 
                      max={20} 
                      color="bg-green-500"
                    />
                    <ScoreBar 
                      label="Checklist" 
                      value={perf?.checklistScore || 0} 
                      max={20} 
                      color="bg-blue-500"
                    />
                    <ScoreBar 
                      label="Gorevler" 
                      value={perf?.taskScore || 0} 
                      max={15} 
                      color="bg-yellow-500"
                    />
                    <ScoreBar 
                      label="Musteri" 
                      value={perf?.customerRatingScore || 0} 
                      max={15} 
                      color="bg-purple-500"
                    />
                    <ScoreBar 
                      label="Yonetici" 
                      value={perf?.managerRatingScore || 0} 
                      max={20} 
                      color="bg-pink-500"
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Aylik Performans Gecmisi</CardTitle>
                  <CardDescription>Son 6 aylik puan degisimi</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    {historyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={historyData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="puan" 
                            name="Toplam Puan"
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            dot={{ fill: "#3b82f6" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Gecmis veri bulunamadi
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tips">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    AI Gelisim Onerileri
                  </CardTitle>
                  <CardDescription>
                    Performansinizi artirmak icin kisisellestirilmis oneriler
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {generatingTips ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span>AI onerileri hazirlaniyor...</span>
                    </div>
                  ) : aiTips.length > 0 ? (
                    <div className="space-y-3">
                      {aiTips.map((tip, index) => (
                        <div 
                          key={index}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
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
                        Yeni Oneriler Al
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>Henuz oneri olusturulmadi</p>
                      <Button 
                        className="mt-4"
                        onClick={generateAITips}
                        disabled={generatingTips}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        AI Onerilerini Al
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
