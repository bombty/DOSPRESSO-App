import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileWarning,
  TrendingUp,
  Building2,
  Target,
} from "lucide-react";

interface BranchStats {
  branchId: number;
  branchName: string;
  total: number;
  open: number;
  inProgress: number;
  overdue: number;
  closed: number;
  avgResolutionDays: number;
  onTimeRate: number;
  critical: number;
  high: number;
  medium: number;
}

interface ReportData {
  branches: BranchStats[];
  totals: {
    total: number;
    open: number;
    inProgress: number;
    overdue: number;
    closed: number;
    critical: number;
    high: number;
    medium: number;
  };
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
const STATUS_COLORS = {
  open: '#3b82f6',
  inProgress: '#f97316',
  overdue: '#ef4444',
  closed: '#22c55e',
};

export default function CapaRaporlari() {
  const { data: report, isLoading } = useQuery<ReportData>({
    queryKey: ['/api/corrective-actions/reports/branch-performance'],
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const totals = report?.totals || { total: 0, open: 0, inProgress: 0, overdue: 0, closed: 0, critical: 0, high: 0, medium: 0 };
  const branches = report?.branches || [];

  const statusData = [
    { name: 'Açık', value: totals.open, color: STATUS_COLORS.open },
    { name: 'Devam Eden', value: totals.inProgress, color: STATUS_COLORS.inProgress },
    { name: 'Gecikmiş', value: totals.overdue, color: STATUS_COLORS.overdue },
    { name: 'Kapalı', value: totals.closed, color: STATUS_COLORS.closed },
  ];

  const priorityData = [
    { name: 'Kritik', value: totals.critical, color: '#ef4444' },
    { name: 'Yüksek', value: totals.high, color: '#f97316' },
    { name: 'Orta', value: totals.medium, color: '#eab308' },
  ];

  const closureRate = totals.total > 0 ? Math.round((totals.closed / totals.total) * 100) : 0;

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3">
        <FileWarning className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-page-title">CAPA Performans Raporu</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Toplam Aksiyon</span>
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="text-total-count">{totals.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-sm text-muted-foreground">Gecikmiş</span>
            </div>
            <p className="text-2xl font-bold mt-2 text-red-600" data-testid="text-overdue-count">{totals.overdue}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Kapalı</span>
            </div>
            <p className="text-2xl font-bold mt-2 text-green-600" data-testid="text-closed-count">{totals.closed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Kapatma Orani</span>
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="text-closure-rate">{closureRate}%</p>
            <Progress value={closureRate} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Durum Dagilimi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusData.map((entry, index) => (
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
            <CardTitle className="text-base">Oncelik Dagilimi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Sube Bazli Performans
          </CardTitle>
        </CardHeader>
        <CardContent>
          {branches.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Henuz CAPA verisi bulunmuyor</p>
          ) : (
            <>
              <div className="h-80 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={branches.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="branchName" type="category" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="closed" name="Kapalı" stackId="a" fill="#22c55e" />
                    <Bar dataKey="inProgress" name="Devam Eden" stackId="a" fill="#f97316" />
                    <Bar dataKey="open" name="Açık" stackId="a" fill="#3b82f6" />
                    <Bar dataKey="overdue" name="Gecikmiş" stackId="a" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Şube</th>
                      <th className="text-center py-2 px-3">Toplam</th>
                      <th className="text-center py-2 px-3">Açık</th>
                      <th className="text-center py-2 px-3">Devam</th>
                      <th className="text-center py-2 px-3">Gecikmiş</th>
                      <th className="text-center py-2 px-3">Kapalı</th>
                      <th className="text-center py-2 px-3">Ort. Çözüm</th>
                      <th className="text-center py-2 px-3">Zamanında</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branches.map(branch => (
                      <tr key={branch.branchId} className="border-b hover-elevate">
                        <td className="py-2 px-3 font-medium">{branch.branchName}</td>
                        <td className="text-center py-2 px-3">{branch.total}</td>
                        <td className="text-center py-2 px-3">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">{branch.open}</Badge>
                        </td>
                        <td className="text-center py-2 px-3">
                          <Badge variant="outline" className="bg-orange-50 text-orange-700">{branch.inProgress}</Badge>
                        </td>
                        <td className="text-center py-2 px-3">
                          <Badge variant="destructive">{branch.overdue}</Badge>
                        </td>
                        <td className="text-center py-2 px-3">
                          <Badge variant="outline" className="bg-green-50 text-green-700">{branch.closed}</Badge>
                        </td>
                        <td className="text-center py-2 px-3">
                          {branch.avgResolutionDays > 0 ? `${branch.avgResolutionDays} gun` : '-'}
                        </td>
                        <td className="text-center py-2 px-3">
                          {branch.onTimeRate > 0 ? (
                            <Badge variant={branch.onTimeRate >= 80 ? 'default' : branch.onTimeRate >= 50 ? 'secondary' : 'destructive'}>
                              {branch.onTimeRate}%
                            </Badge>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
