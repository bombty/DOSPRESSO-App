import { useState } from "react";
import { AgentActionCenter } from "@/components/agent-action-center";
import { AgentAdminPanel } from "@/components/agent-admin-panel";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  Settings,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Send,
  Moon,
  Cpu,
  BarChart3,
  Filter,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface AgentCenterStats {
  period: string;
  totalSuggestions: number;
  approved: number;
  rejected: number;
  pending: number;
  completed: number;
  expired: number;
  autoExecuted: number;
  skillBreakdown: Record<string, number>;
  tokenUsage: {
    dailyUsed: number;
    dailyLimit: number;
    dailyCallCount: number;
  };
  quietHours: {
    start: string;
    end: string;
    timezone: string;
  };
}

const SKILL_LABELS: Record<string, string> = {
  daily_coach: "Günlük Koç",
  team_tracker: "Ekip Takipçisi",
  stock_assistant: "Stok Asistanı",
  customer_watcher: "Müşteri Nöbetçisi",
  production_director: "Üretim Direktörü",
  food_safety: "Gıda Güvenliği",
  training_optimizer: "Eğitim Optimizasyonu",
  performance_coach: "Performans Koçu",
  legacy: "Klasik Agent",
};

export default function AgentMerkeziPage() {
  const [skillFilter, setSkillFilter] = useState<string>("all");

  const userQuery = useQuery<any>({
    queryKey: ["/api/me"],
  });

  const statsQuery = useQuery<AgentCenterStats>({
    queryKey: ["/api/agent-center/stats"],
    refetchInterval: 60000,
  });

  const user = userQuery.data;
  const isAdmin = user && ["admin", "ceo", "cgo"].includes(user.role);
  const stats = statsQuery.data;
  const isLoading = userQuery.isLoading || statsQuery.isLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (statsQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold">Bir hata oluştu</h3>
        <p className="text-muted-foreground mt-2">Veriler yüklenirken sorun oluştu.</p>
        <Button onClick={() => statsQuery.refetch()} className="mt-4" data-testid="button-retry">Tekrar Dene</Button>
      </div>
    );
  }

  const tokenPercent = stats
    ? Math.min(
        100,
        stats.tokenUsage.dailyLimit > 0
          ? Math.round(
              (stats.tokenUsage.dailyUsed / stats.tokenUsage.dailyLimit) * 100
            )
          : 0
      )
    : 0;

  const skillKeys = stats
    ? Object.keys(stats.skillBreakdown).filter(
        (k) => stats.skillBreakdown[k] > 0
      )
    : [];

  return (
    <div
      className="p-4 max-w-5xl mx-auto space-y-4"
      data-testid="page-agent-merkezi"
    >
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5" />
        <h1 className="text-xl font-bold">Agent Merkezi</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Mr. Dobody'nin operasyonel analizleri ve önerileri. Önerileri inceleyip
        onaylayabilir veya reddedebilirsiniz.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card data-testid="card-stat-total">
          <CardContent className="p-3 flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30">
              <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-lg font-bold" data-testid="text-stat-total">
                {stats?.totalSuggestions ?? 0}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Bu Hafta Toplam
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-pending">
          <CardContent className="p-3 flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/30">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div
                className="text-lg font-bold"
                data-testid="text-stat-pending"
              >
                {stats?.pending ?? 0}
              </div>
              <div className="text-[11px] text-muted-foreground">Bekleyen</div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-approved">
          <CardContent className="p-3 flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div
                className="text-lg font-bold"
                data-testid="text-stat-approved"
              >
                {stats?.approved ?? 0}
              </div>
              <div className="text-[11px] text-muted-foreground">Onaylanan</div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-rejected">
          <CardContent className="p-3 flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-red-100 dark:bg-red-900/30">
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <div
                className="text-lg font-bold"
                data-testid="text-stat-rejected"
              >
                {stats?.rejected ?? 0}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Reddedilen
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-auto">
          <CardContent className="p-3 flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30">
              <Send className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="text-lg font-bold" data-testid="text-stat-auto">
                {stats?.autoExecuted ?? 0}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Oto. Gönderilen
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-token">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">
                Token Kullanımı
              </span>
            </div>
            <Progress value={tokenPercent} className="h-1.5 mb-1" />
            <div
              className="text-[11px] text-muted-foreground"
              data-testid="text-token-usage"
            >
              {stats?.tokenUsage.dailyUsed ?? 0} /{" "}
              {stats?.tokenUsage.dailyLimit ?? 0} (bugün)
            </div>
          </CardContent>
        </Card>
      </div>

      {stats?.quietHours && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Moon className="h-3.5 w-3.5" />
          <span data-testid="text-quiet-hours">
            Sessiz saatler: {stats.quietHours.start} - {stats.quietHours.end} (
            {stats.quietHours.timezone})
          </span>
        </div>
      )}

      {skillKeys.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Button
            variant={skillFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSkillFilter("all")}
            data-testid="button-skill-filter-all"
          >
            Tümü
          </Button>
          {skillKeys.map((skillId) => (
            <Button
              key={skillId}
              variant={skillFilter === skillId ? "default" : "outline"}
              size="sm"
              onClick={() => setSkillFilter(skillId)}
              data-testid={`button-skill-filter-${skillId}`}
            >
              {SKILL_LABELS[skillId] || skillId}
              <Badge variant="secondary" className="ml-1">
                {stats!.skillBreakdown[skillId]}
              </Badge>
            </Button>
          ))}
        </div>
      )}

      {isAdmin ? (
        <Tabs defaultValue="oneriler">
          <TabsList>
            <TabsTrigger value="oneriler" data-testid="tab-oneriler">
              <Shield className="h-4 w-4 mr-1" />
              Öneriler
            </TabsTrigger>
            <TabsTrigger value="yonetim" data-testid="tab-yonetim">
              <Settings className="h-4 w-4 mr-1" />
              Yönetim
            </TabsTrigger>
          </TabsList>
          <TabsContent value="oneriler">
            <AgentActionCenter skillFilter={skillFilter} />
          </TabsContent>
          <TabsContent value="yonetim">
            <AgentAdminPanel />
          </TabsContent>
        </Tabs>
      ) : (
        <AgentActionCenter skillFilter={skillFilter} />
      )}
    </div>
  );
}
