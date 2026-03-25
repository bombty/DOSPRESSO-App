import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompactKPIStrip } from "@/components/shared/UnifiedKPI";
import { Badge } from "@/components/ui/badge";
import { ListSkeleton } from "@/components/list-skeleton";
import {
  Users,
  Building2,
  Factory,
  Briefcase,
  UserCheck,
  Clock,
  BarChart3,
  ArrowLeft,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
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
import { ROLE_LABELS } from "@/lib/turkish-labels";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(220 70% 50%)",
  "hsl(340 65% 47%)",
  "hsl(30 80% 55%)",
  "hsl(160 60% 45%)",
  "hsl(280 60% 50%)",
];

interface BranchStat {
  branchId: number;
  branchName: string;
  totalEmployees: number;
  roleBreakdown: Record<string, number>;
  fullTime: number;
  partTime: number;
}

interface PersonnelStats {
  totalEmployees: number;
  hqEmployees: number;
  factoryEmployees: number;
  branchEmployees: number;
  totalRoleBreakdown: Record<string, number>;
  employmentTypeBreakdown: { fullTime: number; partTime: number; other: number };
  branchStats: BranchStat[];
}

export default function HQPersonelIstatistikleri() {
  const { user } = useAuth();

  const { data: stats, isLoading, isError, refetch } = useQuery<PersonnelStats>({
    queryKey: ["/api/hq-personnel-stats"],
    enabled: !!user && (isHQRole(user.role as any) || user.role === "admin"),
  });

  const branchChartData = useMemo(() => {
    if (!stats) return [];
    return stats.branchStats
      .sort((a, b) => b.totalEmployees - a.totalEmployees)
      .map((b) => ({
        name: b.branchName.length > 12 ? b.branchName.substring(0, 12) + "..." : b.branchName,
        fullName: b.branchName,
        total: b.totalEmployees,
        fullTime: b.fullTime,
        partTime: b.partTime,
      }));
  }, [stats]);

  const roleChartData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.totalRoleBreakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([role, count]) => ({
        name: ROLE_LABELS[role] || role,
        value: count,
      }));
  }, [stats]);

  const categoryChartData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Şube Personeli", value: stats.branchEmployees },
      { name: "HQ Personeli", value: stats.hqEmployees },
      { name: "Fabrika Personeli", value: stats.factoryEmployees },
    ];
  }, [stats]);

  const employmentChartData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Tam Zamanlı", value: stats.employmentTypeBreakdown.fullTime },
      { name: "Yarı Zamanlı", value: stats.employmentTypeBreakdown.partTime },
      { name: "Belirlenmemiş", value: stats.employmentTypeBreakdown.other },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const belirlenmemisInfo = useMemo(() => {
    if (!stats) return null;
    const otherCount = stats.employmentTypeBreakdown.other;
    const total = stats.employmentTypeBreakdown.fullTime + stats.employmentTypeBreakdown.partTime + otherCount;
    if (total === 0 || otherCount === 0) return null;
    if (otherCount / total > 0.5) return otherCount;
    return null;
  }, [stats]);

  if (!user || (!isHQRole(user.role as any) && user.role !== "admin")) {
    
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Bu sayfaya erişim yetkiniz yok.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <ListSkeleton count={4} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Veri yüklenemedi.</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 space-y-4 max-w-7xl mx-auto" data-testid="hq-personel-stats-page">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/ik">
          <Button variant="ghost" size="icon" data-testid="button-back-ik">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            HQ Personel İstatistikleri
          </h1>
          <p className="text-sm text-muted-foreground">Tüm şubeler arası karşılaştırmalı personel verileri</p>
        </div>
      </div>

      <CompactKPIStrip
        items={[
          { label: "Toplam Personel", value: stats.totalEmployees, icon: <Users className="h-4 w-4 text-muted-foreground" />, testId: "stat-total-employees" },
          { label: "Şube Personeli", value: stats.branchEmployees, icon: <Building2 className="h-4 w-4 text-muted-foreground" />, color: "info", testId: "stat-branch-employees" },
          { label: "HQ Personeli", value: stats.hqEmployees, icon: <Briefcase className="h-4 w-4 text-muted-foreground" />, testId: "stat-hq-employees" },
          { label: "Fabrika Personeli", value: stats.factoryEmployees, icon: <Factory className="h-4 w-4 text-muted-foreground" />, testId: "stat-factory-employees" },
        ]}
        desktopGridClass="md:grid-cols-2 lg:grid-cols-4"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card data-testid="chart-branch-comparison">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Şube Bazlı Personel Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                    labelFormatter={(label, payload) => {
                      const item = payload?.[0]?.payload;
                      return item?.fullName || label;
                    }}
                  />
                  <Bar dataKey="fullTime" name="Tam Zamanlı" fill="hsl(var(--chart-1))" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="partTime" name="Yarı Zamanlı" fill="hsl(var(--chart-2))" stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="chart-role-distribution">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rol Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {roleChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="chart-category-distribution">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Kategori Dağılımı (HQ / Şube / Fabrika)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {categoryChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="chart-employment-type">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Çalışma Türü Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={employmentChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {employmentChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {belirlenmemisInfo !== null && (
              <div className="flex items-start gap-2 mt-3 p-3 rounded-md bg-muted/50 text-sm text-muted-foreground" data-testid="info-belirlenmemis">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{belirlenmemisInfo} personelin çalışma türü henüz belirlenmemiş. Doğru dağılım için personel kayıtlarını güncelleyin.</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="table-branch-details">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Şube Detay Tablosu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium">Şube</th>
                  <th className="text-center py-2 px-2 font-medium">Toplam</th>
                  <th className="text-center py-2 px-2 font-medium">Tam Zamanlı</th>
                  <th className="text-center py-2 px-2 font-medium">Yarı Zamanlı</th>
                  <th className="text-left py-2 px-2 font-medium">Rol Dağılımı</th>
                </tr>
              </thead>
              <tbody>
                {stats.branchStats
                  .sort((a, b) => b.totalEmployees - a.totalEmployees)
                  .map((branch) => (
                    <tr key={branch.branchId} className="border-b last:border-0" data-testid={`row-branch-${branch.branchId}`}>
                      <td className="py-2 px-2 font-medium">{branch.branchName}</td>
                      <td className="py-2 px-2 text-center">
                        <Badge variant="secondary">{branch.totalEmployees}</Badge>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className="text-muted-foreground">{branch.fullTime}</span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className="text-muted-foreground">{branch.partTime}</span>
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(branch.roleBreakdown)
                            .sort((a, b) => b[1] - a[1])
                            .map(([role, count]) => (
                              <Badge key={role} variant="outline" className="text-[10px]">
                                {ROLE_LABELS[role] || role}: {count}
                              </Badge>
                            ))}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}