import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DollarSign, 
  Building2, 
  Factory, 
  Users, 
  MessageSquare, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Brain,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Send,
  Loader2
} from "lucide-react";
import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RiskIndicator {
  status: 'healthy' | 'warning' | 'critical';
  score: number;
  trend: 'up' | 'down' | 'stable';
  message: string;
}

interface FinanceData {
  dailyRevenue: number;
  monthlyRevenue: number;
  cashFlow: number;
  variance: number;
  riskIndicator: RiskIndicator;
  topRisks: Array<{ name: string; impact: number; type: string }>;
}

interface FranchiseData {
  totalBranches: number;
  healthyBranches: number;
  warningBranches: number;
  criticalBranches: number;
  averageScore: number;
  riskIndicator: RiskIndicator;
  bottomPerformers: Array<{ name: string; score: number; issues: string[] }>;
}

interface FactoryData {
  dailyProduction: number;
  wastePercentage: number;
  qualityScore: number;
  equipmentUptime: number;
  riskIndicator: RiskIndicator;
  criticalIssues: Array<{ area: string; issue: string; severity: string }>;
}

interface HRData {
  totalEmployees: number;
  turnoverRate: number;
  trainingCompletion: number;
  satisfactionScore: number;
  riskIndicator: RiskIndicator;
  atRiskEmployees: Array<{ department: string; count: number; reason: string }>;
}

interface CustomerData {
  satisfactionScore: number;
  complaintCount: number;
  resolvedPercentage: number;
  npsScore: number;
  riskIndicator: RiskIndicator;
  topComplaints: Array<{ category: string; count: number; trend: string }>;
}

interface GrowthData {
  marketingROI: number;
  campaignPerformance: number;
  salesGrowth: number;
  newCustomers: number;
  riskIndicator: RiskIndicator;
  topCampaigns: Array<{ name: string; roi: number; status: string }>;
}

interface ManagerPerformance {
  id: string;
  name: string;
  department: string;
  score: number;
  metrics: Record<string, number>;
  trend: 'up' | 'down' | 'stable';
}

interface CommandCenterData {
  finance: FinanceData;
  franchise: FranchiseData;
  factory: FactoryData;
  hr: HRData;
  customer: CustomerData;
  growth: GrowthData;
  managers: ManagerPerformance[];
  lastUpdated: string;
}

function getRiskColor(status: 'healthy' | 'warning' | 'critical') {
  switch (status) {
    case 'healthy': return 'bg-green-500';
    case 'warning': return 'bg-yellow-500';
    case 'critical': return 'bg-red-500';
  }
}

function getRiskBadgeVariant(status: 'healthy' | 'warning' | 'critical') {
  switch (status) {
    case 'healthy': return 'default';
    case 'warning': return 'secondary';
    case 'critical': return 'destructive';
  }
}

function getRiskIcon(status: 'healthy' | 'warning' | 'critical') {
  switch (status) {
    case 'healthy': return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    case 'critical': return <AlertTriangle className="w-4 h-4 text-red-500" />;
  }
}

function getTrendIcon(trend: 'up' | 'down' | 'stable') {
  switch (trend) {
    case 'up': return <ArrowUpRight className="w-4 h-4 text-green-500" />;
    case 'down': return <ArrowDownRight className="w-4 h-4 text-red-500" />;
    case 'stable': return <Minus className="w-4 h-4 text-muted-foreground" />;
  }
}

function RiskPanel({ 
  title, 
  icon, 
  data, 
  children 
}: { 
  title: string; 
  icon: React.ReactNode; 
  data: { riskIndicator: RiskIndicator }; 
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getRiskIcon(data.riskIndicator.status)}
            {icon}
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {getTrendIcon(data.riskIndicator.trend)}
            <Badge variant={getRiskBadgeVariant(data.riskIndicator.status)} className="text-xs">
              {data.riskIndicator.score}%
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{data.riskIndicator.message}</p>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  );
}

function AIAssistant() {
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const { toast } = useToast();

  const askAI = async () => {
    if (!question.trim()) return;
    
    setIsLoading(true);
    const userQuestion = question;
    setQuestion("");
    setConversation(prev => [...prev, { role: 'user', content: userQuestion }]);
    
    try {
      const response = await apiRequest("POST", "/api/ceo/ai-assistant", { question: userQuestion });
      const data = await response.json();
      setConversation(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (error) {
      toast({
        title: "Hata",
        description: "AI yanıt veremedi. Lütfen tekrar deneyin.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">AI Asistan</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">Şirket hakkında her şeyi sorun</p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        <div className="flex-1 overflow-y-auto space-y-3 max-h-[300px]">
          {conversation.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              <Brain className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Örnek sorular:</p>
              <p className="text-xs mt-2">"Bu şirket bugün nereden kan kaybediyor?"</p>
              <p className="text-xs">"Hangi şube kâr düşürüyor?"</p>
              <p className="text-xs">"Kim iyi performans gösteriyor?"</p>
            </div>
          )}
          {conversation.map((msg, idx) => (
            <div 
              key={idx} 
              className={`p-3 rounded-lg text-sm ${
                msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground ml-8' 
                  : 'bg-muted mr-8'
              }`}
            >
              {msg.content}
            </div>
          ))}
          {isLoading && (
            <div className="bg-muted mr-8 p-3 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Textarea 
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Sorunuzu yazın..."
            className="resize-none"
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), askAI())}
            data-testid="input-ceo-ai-question"
          />
          <Button 
            size="icon" 
            onClick={askAI} 
            disabled={isLoading || !question.trim()}
            data-testid="button-ceo-ai-send"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CEOCommandCenter() {
  const { toast } = useToast();
  
  const { data, isLoading, refetch, isRefetching } = useQuery<CommandCenterData>({
    queryKey: ['/api/ceo/command-center'],
    refetchInterval: 60000, // Auto-refresh every minute
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', { 
      style: 'currency', 
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  // Fallback data for demo
  const commandData: CommandCenterData = data || {
    finance: {
      dailyRevenue: 125000,
      monthlyRevenue: 3750000,
      cashFlow: 450000,
      variance: -2.3,
      riskIndicator: { status: 'warning', score: 72, trend: 'down', message: 'Nakit akışında küçük sapma' },
      topRisks: [
        { name: 'Kira ödemeleri', impact: 15000, type: 'expense' },
        { name: 'Malzeme maliyeti artışı', impact: 8000, type: 'cost' }
      ]
    },
    franchise: {
      totalBranches: 24,
      healthyBranches: 18,
      warningBranches: 4,
      criticalBranches: 2,
      averageScore: 78,
      riskIndicator: { status: 'warning', score: 78, trend: 'stable', message: '2 şube acil müdahale bekliyor' },
      bottomPerformers: [
        { name: 'Kadıköy', score: 52, issues: ['Personel devir', 'Kalite'] },
        { name: 'Bakırköy', score: 58, issues: ['Satış düşüşü'] }
      ]
    },
    factory: {
      dailyProduction: 2450,
      wastePercentage: 3.2,
      qualityScore: 94,
      equipmentUptime: 97.5,
      riskIndicator: { status: 'healthy', score: 94, trend: 'up', message: 'Üretim hedeflerde' },
      criticalIssues: []
    },
    hr: {
      totalEmployees: 156,
      turnoverRate: 8.5,
      trainingCompletion: 82,
      satisfactionScore: 76,
      riskIndicator: { status: 'warning', score: 76, trend: 'down', message: 'Personel memnuniyeti düşüşte' },
      atRiskEmployees: [
        { department: 'Şubeler', count: 5, reason: 'Yüksek mesai' }
      ]
    },
    customer: {
      satisfactionScore: 88,
      complaintCount: 23,
      resolvedPercentage: 91,
      npsScore: 45,
      riskIndicator: { status: 'healthy', score: 88, trend: 'up', message: 'Müşteri memnuniyeti yükseliyor' },
      topComplaints: [
        { category: 'Bekleme süresi', count: 8, trend: 'down' },
        { category: 'Ürün kalitesi', count: 5, trend: 'stable' }
      ]
    },
    growth: {
      marketingROI: 3.2,
      campaignPerformance: 78,
      salesGrowth: 12.5,
      newCustomers: 342,
      riskIndicator: { status: 'healthy', score: 85, trend: 'up', message: 'Büyüme hedeflerin üstünde' },
      topCampaigns: [
        { name: 'Yaz Kampanyası', roi: 4.5, status: 'active' },
        { name: 'Sadakat Programı', roi: 3.8, status: 'active' }
      ]
    },
    managers: [
      { id: '1', name: 'Ahmet Y.', department: 'Satınalma', score: 92, metrics: { maliyet: 95, kalite: 90 }, trend: 'up' },
      { id: '2', name: 'Mehmet K.', department: 'Fabrika', score: 88, metrics: { fire: 85, duruş: 91 }, trend: 'stable' },
      { id: '3', name: 'Ayşe D.', department: 'İK', score: 75, metrics: { devir: 72, eğitim: 78 }, trend: 'down' },
      { id: '4', name: 'Fatma S.', department: 'Coach', score: 85, metrics: { kâr: 88, uyum: 82 }, trend: 'up' },
      { id: '5', name: 'Ali R.', department: 'Marketing', score: 91, metrics: { roi: 95, getiri: 87 }, trend: 'up' }
    ],
    lastUpdated: new Date().toISOString()
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-ceo-title">
            <Brain className="w-7 h-7 text-primary" />
            AI Control Tower
          </h1>
          <p className="text-sm text-muted-foreground">
            Son güncelleme: {new Date(commandData.lastUpdated).toLocaleTimeString('tr-TR')}
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => refetch()} 
          disabled={isRefetching}
          data-testid="button-refresh-command-center"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Yenile
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="overview" data-testid="tab-overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="managers" data-testid="tab-managers">Yöneticiler</TabsTrigger>
          <TabsTrigger value="ai" data-testid="tab-ai">AI Asistan</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <RiskPanel 
              title="Finance Radar" 
              icon={<DollarSign className="w-5 h-5 text-primary" />}
              data={commandData.finance}
            >
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Günlük Ciro</span>
                  <span className="font-medium">{formatCurrency(commandData.finance.dailyRevenue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Aylık Ciro</span>
                  <span className="font-medium">{formatCurrency(commandData.finance.monthlyRevenue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Nakit Akış</span>
                  <span className="font-medium">{formatCurrency(commandData.finance.cashFlow)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sapma</span>
                  <span className={`font-medium ${commandData.finance.variance < 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {commandData.finance.variance > 0 ? '+' : ''}{formatPercent(commandData.finance.variance)}
                  </span>
                </div>
                {commandData.finance.topRisks.length > 0 && (
                  <div className="pt-2 border-t mt-2">
                    <p className="text-xs font-medium mb-1">Riskler:</p>
                    {commandData.finance.topRisks.map((risk, i) => (
                      <div key={i} className="flex justify-between text-xs text-muted-foreground">
                        <span>{risk.name}</span>
                        <span className="text-red-500">-{formatCurrency(risk.impact)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </RiskPanel>

            <RiskPanel 
              title="Franchise Health" 
              icon={<Building2 className="w-5 h-5 text-primary" />}
              data={commandData.franchise}
            >
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Toplam Şube</span>
                  <span className="font-medium">{commandData.franchise.totalBranches}</span>
                </div>
                <div className="flex gap-2 text-xs">
                  <Badge variant="default" className="bg-green-500">{commandData.franchise.healthyBranches} Sağlıklı</Badge>
                  <Badge variant="secondary" className="bg-yellow-500 text-black">{commandData.franchise.warningBranches} İzle</Badge>
                  <Badge variant="destructive">{commandData.franchise.criticalBranches} Kritik</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ort. Skor</span>
                  <span className="font-medium">{commandData.franchise.averageScore}/100</span>
                </div>
                {commandData.franchise.bottomPerformers.length > 0 && (
                  <div className="pt-2 border-t mt-2">
                    <p className="text-xs font-medium mb-1">Düşük Performans:</p>
                    {commandData.franchise.bottomPerformers.map((branch, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{branch.name}</span>
                        <span className="text-red-500">{branch.score}/100</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </RiskPanel>

            <RiskPanel 
              title="Factory & Quality" 
              icon={<Factory className="w-5 h-5 text-primary" />}
              data={commandData.factory}
            >
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Günlük Üretim</span>
                  <span className="font-medium">{commandData.factory.dailyProduction} adet</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fire Oranı</span>
                  <span className={`font-medium ${commandData.factory.wastePercentage > 5 ? 'text-red-500' : 'text-green-500'}`}>
                    {formatPercent(commandData.factory.wastePercentage)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Kalite Skoru</span>
                  <span className="font-medium">{commandData.factory.qualityScore}/100</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ekipman Uptime</span>
                  <span className="font-medium">{formatPercent(commandData.factory.equipmentUptime)}</span>
                </div>
              </div>
            </RiskPanel>

            <RiskPanel 
              title="People & HR Pulse" 
              icon={<Users className="w-5 h-5 text-primary" />}
              data={commandData.hr}
            >
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Toplam Personel</span>
                  <span className="font-medium">{commandData.hr.totalEmployees}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Devir Oranı</span>
                  <span className={`font-medium ${commandData.hr.turnoverRate > 10 ? 'text-red-500' : 'text-green-500'}`}>
                    {formatPercent(commandData.hr.turnoverRate)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Eğitim Tamamlama</span>
                  <span className="font-medium">{formatPercent(commandData.hr.trainingCompletion)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Memnuniyet</span>
                  <span className="font-medium">{commandData.hr.satisfactionScore}/100</span>
                </div>
                {commandData.hr.atRiskEmployees.length > 0 && (
                  <div className="pt-2 border-t mt-2">
                    <p className="text-xs font-medium mb-1">Risk Altında:</p>
                    {commandData.hr.atRiskEmployees.map((dept, i) => (
                      <div key={i} className="text-xs text-muted-foreground">
                        {dept.department}: {dept.count} kişi - {dept.reason}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </RiskPanel>

            <RiskPanel 
              title="Customer Sentiment" 
              icon={<MessageSquare className="w-5 h-5 text-primary" />}
              data={commandData.customer}
            >
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Memnuniyet Skoru</span>
                  <span className="font-medium">{commandData.customer.satisfactionScore}/100</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Şikayet Sayısı</span>
                  <span className="font-medium">{commandData.customer.complaintCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Çözüm Oranı</span>
                  <span className="font-medium">{formatPercent(commandData.customer.resolvedPercentage)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">NPS Skoru</span>
                  <span className={`font-medium ${commandData.customer.npsScore >= 50 ? 'text-green-500' : 'text-yellow-500'}`}>
                    +{commandData.customer.npsScore}
                  </span>
                </div>
                {commandData.customer.topComplaints.length > 0 && (
                  <div className="pt-2 border-t mt-2">
                    <p className="text-xs font-medium mb-1">En Çok Şikayet:</p>
                    {commandData.customer.topComplaints.map((c, i) => (
                      <div key={i} className="flex justify-between text-xs text-muted-foreground">
                        <span>{c.category}</span>
                        <span>{c.count} adet</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </RiskPanel>

            <RiskPanel 
              title="Growth Engine" 
              icon={<TrendingUp className="w-5 h-5 text-primary" />}
              data={commandData.growth}
            >
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Marketing ROI</span>
                  <span className="font-medium">{commandData.growth.marketingROI}x</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Kampanya Performans</span>
                  <span className="font-medium">{formatPercent(commandData.growth.campaignPerformance)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Satış Büyümesi</span>
                  <span className="font-medium text-green-500">+{formatPercent(commandData.growth.salesGrowth)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Yeni Müşteri</span>
                  <span className="font-medium">{commandData.growth.newCustomers}</span>
                </div>
                {commandData.growth.topCampaigns.length > 0 && (
                  <div className="pt-2 border-t mt-2">
                    <p className="text-xs font-medium mb-1">Aktif Kampanyalar:</p>
                    {commandData.growth.topCampaigns.map((c, i) => (
                      <div key={i} className="flex justify-between text-xs text-muted-foreground">
                        <span>{c.name}</span>
                        <span className="text-green-500">{c.roi}x ROI</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </RiskPanel>
          </div>
        </TabsContent>

        <TabsContent value="managers" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Yönetici Performans Takibi</CardTitle>
              <p className="text-sm text-muted-foreground">Departman bazlı AI skorları ve trend analizi</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {commandData.managers.map((manager) => (
                  <div 
                    key={manager.id} 
                    className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                    data-testid={`card-manager-${manager.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        manager.score >= 85 ? 'bg-green-500' : 
                        manager.score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <p className="font-medium">{manager.name}</p>
                        <p className="text-xs text-muted-foreground">{manager.department}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <span className="text-lg font-bold">{manager.score}</span>
                          <span className="text-xs text-muted-foreground">/100</span>
                          {getTrendIcon(manager.trend)}
                        </div>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          {Object.entries(manager.metrics).map(([key, value]) => (
                            <span key={key}>{key}: {value}</span>
                          ))}
                        </div>
                      </div>
                      <Badge variant={manager.score >= 85 ? 'default' : manager.score >= 70 ? 'secondary' : 'destructive'}>
                        {manager.score >= 85 ? 'Yıldız' : manager.score >= 70 ? 'Normal' : 'Risk'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AIAssistant />
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Hızlı Sorgular</CardTitle>
                <p className="text-sm text-muted-foreground">Sık kullanılan sorular</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  "Bu şirket bugün nereden kan kaybediyor?",
                  "Hangi şube kârımı düşürüyor?",
                  "Hangi yöneticim zayıf performans gösteriyor?",
                  "Hangi tedarikçi kaliteyi bozuyor?",
                  "Personel devir hızı neden yüksek?",
                  "Marketing harcamalarının getirisi ne?",
                  "Müşteri şikayetlerinin ana kaynağı ne?",
                  "Fabrika üretim hedeflerini tutturuyor mu?"
                ].map((q, i) => (
                  <Button 
                    key={i} 
                    variant="outline" 
                    className="w-full justify-start text-left h-auto py-2 text-sm"
                    onClick={() => {
                      const input = document.querySelector('[data-testid="input-ceo-ai-question"]') as HTMLTextAreaElement;
                      if (input) {
                        input.value = q;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                      }
                    }}
                    data-testid={`button-quick-query-${i}`}
                  >
                    {q}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
