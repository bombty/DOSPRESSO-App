import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Brain, 
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Users,
  RotateCcw,
  Target,
  Loader2,
  Lightbulb
} from "lucide-react";

interface AIReport {
  type: string;
  content: string;
  generatedAt: string;
  recommendations: string[];
}

export default function FabrikaAIRaporlar() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("rotation");
  const [period, setPeriod] = useState("weekly");

  const { data: rotationReport, isLoading: loadingRotation, refetch: refetchRotation } = useQuery<AIReport>({
    queryKey: ['/api/factory/ai-reports/rotation', period],
    queryFn: async () => {
      const res = await fetch(`/api/factory/ai-reports/rotation?period=${period}`);
      if (!res.ok) throw new Error("Rapor alınamadı");
      return res.json();
    },
  });

  const { data: errorReport, isLoading: loadingError, refetch: refetchError } = useQuery<AIReport>({
    queryKey: ['/api/factory/ai-reports/errors', period],
    queryFn: async () => {
      const res = await fetch(`/api/factory/ai-reports/errors?period=${period}`);
      if (!res.ok) throw new Error("Rapor alınamadı");
      return res.json();
    },
  });

  const { data: efficiencyReport, isLoading: loadingEfficiency, refetch: refetchEfficiency } = useQuery<AIReport>({
    queryKey: ['/api/factory/ai-reports/efficiency', period],
    queryFn: async () => {
      const res = await fetch(`/api/factory/ai-reports/efficiency?period=${period}`);
      if (!res.ok) throw new Error("Rapor alınamadı");
      return res.json();
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (reportType: string) => {
      const res = await apiRequest('POST', `/api/factory/ai-reports/generate`, { type: reportType, period });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Rapor oluşturuldu" });
      if (activeTab === "rotation") refetchRotation();
      else if (activeTab === "errors") refetchError();
      else refetchEfficiency();
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const renderReport = (report: AIReport | undefined, isLoading: boolean, type: string) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!report || !report.content) {
      return (
        <div className="text-center py-12">
          <Brain className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Bu dönem için henüz AI raporu oluşturulmamış</p>
          <Button 
            onClick={() => generateMutation.mutate(type)}
            disabled={generateMutation.isPending}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Oluşturuluyor...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                AI Raporu Oluştur
              </>
            )}
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="prose dark:prose-invert max-w-none">
          <div className="whitespace-pre-wrap text-sm">{report.content}</div>
        </div>
        
        {report.recommendations && report.recommendations.length > 0 && (
          <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                AI Önerileri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {report.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">{i + 1}.</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Son güncelleme: {new Date(report.generatedAt).toLocaleString('tr-TR')}</span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => generateMutation.mutate(type)}
            disabled={generateMutation.isPending}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Yeniden Oluştur
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-amber-500" />
          <div>
            <h1 className="text-2xl font-bold">AI Üretim Raporları</h1>
            <p className="text-muted-foreground">Yapay zeka destekli analiz ve öneriler</p>
          </div>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40" data-testid="select-period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Günlük</SelectItem>
            <SelectItem value="weekly">Haftalık</SelectItem>
            <SelectItem value="monthly">Aylık</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover-elevate cursor-pointer" onClick={() => setActiveTab("rotation")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <RotateCcw className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Rotasyon Analizi</h3>
                <p className="text-sm text-muted-foreground">Personel dağılım optimizasyonu</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover-elevate cursor-pointer" onClick={() => setActiveTab("errors")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold">Hata Örüntüleri</h3>
                <p className="text-sm text-muted-foreground">Fire ve hata analizi</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover-elevate cursor-pointer" onClick={() => setActiveTab("efficiency")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">Verimlilik Raporu</h3>
                <p className="text-sm text-muted-foreground">Performans değerlendirmesi</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rotation" data-testid="tab-rotation">
            <RotateCcw className="h-4 w-4 mr-2" />
            Rotasyon
          </TabsTrigger>
          <TabsTrigger value="errors" data-testid="tab-errors">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Hata Örüntüleri
          </TabsTrigger>
          <TabsTrigger value="efficiency" data-testid="tab-efficiency">
            <TrendingUp className="h-4 w-4 mr-2" />
            Verimlilik
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="rotation" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-blue-500" />
                Personel Rotasyon Analizi
              </CardTitle>
              <CardDescription>
                İstasyonlar arası personel dağılımı ve optimizasyon önerileri
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderReport(rotationReport, loadingRotation, "rotation")}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="errors" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Hata ve Fire Örüntüleri
              </CardTitle>
              <CardDescription>
                Zaiyat nedenleri ve tekrarlayan hata analizleri
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderReport(errorReport, loadingError, "errors")}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="efficiency" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Verimlilik Değerlendirmesi
              </CardTitle>
              <CardDescription>
                İstasyon ve personel bazlı performans analizi
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderReport(efficiencyReport, loadingEfficiency, "efficiency")}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
