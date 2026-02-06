import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Ticket,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Timer,
  Star,
  ChevronRight
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from "recharts";

interface CRMOverview {
  openTickets: number;
  closedTickets: number;
  unassignedTickets: number;
  avgResolutionTime: number;
  slaCompliance: number;
  ticketsThisWeek: number;
  ticketsLastWeek: number;
  trendData: { date: string; opened: number; closed: number }[];
  priorityBreakdown: { priority: string; count: number }[];
  topAgents: { id: string; name: string; resolved: number; avgTime: number }[];
}

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  variant = "default",
  testId,
  onClick
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string; 
  icon: any;
  trend?: { value: number; positive: boolean };
  variant?: "default" | "warning" | "success" | "danger";
  testId: string;
  onClick?: () => void;
}) {
  const variantStyles = {
    default: "bg-card",
    warning: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800",
    success: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
    danger: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
  };

  const iconStyles = {
    default: "text-primary",
    warning: "text-orange-600 dark:text-orange-400",
    success: "text-green-600 dark:text-green-400",
    danger: "text-red-600 dark:text-red-400"
  };

  return (
    <Card 
      className={`${variantStyles[variant]} transition-all ${onClick ? 'cursor-pointer hover-elevate' : ''}`} 
      data-testid={testId}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            {trend && (
              <div className={`flex items-center gap-1 text-xs ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
                {trend.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{trend.positive ? '+' : ''}{trend.value}%</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg bg-background/50 ${iconStyles[variant]}`}>
              <Icon className="h-5 w-5" />
            </div>
            {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const PRIORITY_COLORS: Record<string, string> = {
  "kritik": "#ef4444",
  "yüksek": "#f97316",
  "orta": "#eab308",
  "düşük": "#22c55e"
};

export default function CRMDashboard() {
  const [, setLocation] = useLocation();
  const { data: overview, isLoading } = useQuery<CRMOverview>({
    queryKey: ["/api/crm/overview"],
  });

  const navigateToTickets = (filter?: string) => {
    if (filter) {
      setLocation(`/crm/talepler?filter=${filter}`);
    } else {
      setLocation('/crm/talepler');
    }
  };

  const navigateToSLA = () => {
    setLocation('/crm/sla');
  };

  const navigateToPerformance = () => {
    setLocation('/crm/performans');
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Veri yüklenemedi
      </div>
    );
  }

  const weeklyChange = overview.ticketsLastWeek > 0 
    ? Math.round(((overview.ticketsThisWeek - overview.ticketsLastWeek) / overview.ticketsLastWeek) * 100)
    : 0;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard
            title="Açık Talepler"
            value={overview.openTickets}
            icon={Ticket}
            variant={overview.openTickets > 10 ? "warning" : "default"}
            testId="stat-open-tickets"
            onClick={() => navigateToTickets('open')}
          />
          <StatCard
            title="Atanmamış"
            value={overview.unassignedTickets}
            icon={AlertTriangle}
            variant={overview.unassignedTickets > 5 ? "danger" : "default"}
            testId="stat-unassigned"
            onClick={() => navigateToTickets('unassigned')}
          />
          <StatCard
            title="Bu Hafta Çözülen"
            value={overview.closedTickets}
            icon={CheckCircle}
            trend={{ value: weeklyChange, positive: weeklyChange >= 0 }}
            variant="success"
            testId="stat-closed"
            onClick={() => navigateToTickets('closed')}
          />
          <StatCard
            title="Ort. Çözüm Süresi"
            value={`${overview.avgResolutionTime}s`}
            subtitle="saat"
            icon={Timer}
            testId="stat-avg-time"
            onClick={navigateToPerformance}
          />
          <StatCard
            title="SLA Uyumu"
            value={`${overview.slaCompliance}%`}
            icon={Clock}
            variant={overview.slaCompliance >= 90 ? "success" : overview.slaCompliance >= 70 ? "warning" : "danger"}
            testId="stat-sla"
            onClick={navigateToSLA}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card data-testid="chart-trend">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Talep Trendi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={overview.trendData}>
                    <defs>
                      <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }} 
                    />
                    <Area type="monotone" dataKey="opened" stroke="#f97316" fillOpacity={1} fill="url(#colorOpened)" name="Açılan" />
                    <Area type="monotone" dataKey="closed" stroke="#22c55e" fillOpacity={1} fill="url(#colorClosed)" name="Çözülen" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="chart-priority">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Öncelik Dağılımı</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-center">
                <ResponsiveContainer width="50%" height="100%">
                  <PieChart>
                    <Pie
                      data={overview.priorityBreakdown}
                      dataKey="count"
                      nameKey="priority"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {overview.priorityBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.priority] || '#888'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {overview.priorityBreakdown.map((item) => (
                    <div 
                      key={item.priority} 
                      className="flex items-center justify-between text-sm p-1.5 rounded-md cursor-pointer hover-elevate"
                      onClick={() => navigateToTickets(item.priority)}
                      data-testid={`priority-${item.priority}`}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: PRIORITY_COLORS[item.priority] || '#888' }}
                        />
                        <span className="capitalize">{item.priority}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary">{item.count}</Badge>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="table-top-agents">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              En Aktif Personel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overview.topAgents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Henüz veri yok</p>
              ) : (
                overview.topAgents.map((agent, index) => (
                  <div 
                    key={agent.id} 
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30 cursor-pointer hover-elevate"
                    data-testid={`agent-row-${index}`}
                    onClick={() => navigateToPerformance()}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                        index === 1 ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                        index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">Ort. {agent.avgTime}s çözüm</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="font-semibold text-lg">{agent.resolved}</p>
                        <p className="text-xs text-muted-foreground">çözülen</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
