import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Brain, 
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
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
      const res = await fetch(`/api/factory/ai-reports/rotation?period=${period}`, { credentials: 'include' });
      if (!res.ok) throw new Error("Rapor alınamadı");
      return res.json();
    },
  });

  const { data: errorReport, isLoading: loadingError, refetch: refetchError } = useQuery<AIReport>({
    queryKey: ['/api/factory/ai-reports/errors', period],
    queryFn: async () => {
      const res = await fetch(`/api/factory/ai-reports/errors?period=${period}`, { credentials: 'include' });
      if (!res.ok) throw new Error("Rapor alınamadı");
      return res.json();
    },
  });

  const { data: efficiencyReport, isLoading: loadingEfficiency, refetch: refetchEfficiency } = useQuery<AIReport>({
    queryKey: ['/api/factory/ai-reports/efficiency', period],
    queryFn: async () => {
      const res = await fetch(`/api/factory/ai-reports/efficiency?period=${period}`, { credentials: 'include' });
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
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!report || !report.content) {
      return (
        <div className="text-center py-8">
          <Brain className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-3">Henüz AI raporu oluşturulmamış</p>
          <Button 
            onClick={() => generateMutation.mutate(type)}
            disabled={generateMutation.isPending}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Oluşturuluyor...
              </>
            ) : (
              <>
                <Brain className="h-3.5 w-3.5 mr-1.5" />
                AI Raporu Oluştur
              </>
            )}
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="prose dark:prose-invert max-w-none">
          <div className="whitespace-pre-wrap text-sm">{report.content}</div>
        </div>
        
        {report.recommendations && report.recommendations.length > 0 && (
          <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="font-medium text-sm">AI Önerileri</span>
              </div>
              <ul className="space-y-1 text-sm">
                {report.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">{i + 1}.</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>Güncelleme: {new Date(report.generatedAt).toLocaleString('tr-TR')}</span>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => generateMutation.mutate(type)}
            disabled={generateMutation.isPending}
            className="h-7 px-2"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Yenile
          </Button>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: "rotation", label: "Rotasyon", icon: RotateCcw, color: "text-blue-500" },
    { id: "errors", label: "Hatalar", icon: AlertTriangle, color: "text-red-500" },
    { id: "efficiency", label: "Verimlilik", icon: TrendingUp, color: "text-green-500" },
  ];

  const getActiveReport = () => {
    switch (activeTab) {
      case "rotation": return { report: rotationReport, loading: loadingRotation };
      case "errors": return { report: errorReport, loading: loadingError };
      case "efficiency": return { report: efficiencyReport, loading: loadingEfficiency };
      default: return { report: undefined, loading: false };
    }
  };

  const { report, loading } = getActiveReport();

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-amber-500" />
          <h1 className="text-lg font-semibold">AI Üretim Raporları</h1>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-24 h-8 text-xs" data-testid="select-period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Günlük</SelectItem>
            <SelectItem value="weekly">Haftalık</SelectItem>
            <SelectItem value="monthly">Aylık</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-1.5 p-1 bg-muted/50 rounded-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                isActive 
                  ? "bg-background shadow-sm" 
                  : "hover:bg-background/50"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? tab.color : "text-muted-foreground"}`} />
              <span className={isActive ? "" : "text-muted-foreground"}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          {renderReport(report, loading, activeTab)}
        </CardContent>
      </Card>
    </div>
  );
}
