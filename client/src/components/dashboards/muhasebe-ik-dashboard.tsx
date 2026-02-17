import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  CreditCard,
  Briefcase,
  Factory,
  MapPin,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

interface BranchStat {
  branchId: number;
  branchName: string;
  employeeCount: number;
  roles: Record<string, number>;
}

interface MuhasebeIKData {
  focusBranches: BranchStat[];
  totalFocusEmployees: number;
  totalAllEmployees: number;
  pendingLeaves: number;
  focusPendingLeaves: number;
  pendingOvertimes: number;
  payrollCount: number;
  payrollTotal: number;
}

const BRANCH_ICONS: Record<number, any> = {
  5: MapPin,
  23: Building2,
  24: Factory,
};

const BRANCH_COLORS: Record<number, string> = {
  5: "bg-amber-500",
  23: "bg-blue-600",
  24: "bg-purple-600",
};

export function MuhasebeIKDashboard() {
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<MuhasebeIKData>({
    queryKey: ["/api/hq-dashboard/muhasebe-ik"],
  });

  const quickActions = [
    { label: "Mali Yönetim", icon: TrendingUp, path: "/mali-yonetim", color: "bg-emerald-700" },
    { label: "Personel Listesi", icon: Users, path: "/ik", color: "bg-blue-500" },
    { label: "İzin Talepleri", icon: Calendar, path: "/izin-talepleri", color: "bg-green-500" },
    { label: "Bordro", icon: DollarSign, path: "/muhasebe", color: "bg-emerald-600" },
    { label: "Satınalma", icon: CreditCard, path: "/satinalma", color: "bg-indigo-500" },
    { label: "Raporlar", icon: FileText, path: "/muhasebe-raporlama", color: "bg-teal-500" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  const focusBranches = data?.focusBranches || [];

  return (
    <div className="space-y-3" data-testid="muhasebe-ik-dashboard">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/50 flex-wrap">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-base font-semibold" data-testid="text-muhasebe-title">Muhasebe & İK Paneli</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="default" className="gap-1.5" onClick={() => setLocation('/hq/kiosk')} data-testid="button-hq-kiosk">
            <Clock className="w-3.5 h-3.5" />
            HQ Kiosk
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setLocation('/mali-yonetim')} data-testid="button-mali-yonetim">
            <TrendingUp className="w-3.5 h-3.5" />
            Mali Yönetim
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200/50 dark:border-blue-800/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-blue-500/10">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Sorumlu Personel</p>
                <p className="text-lg font-bold" data-testid="text-focus-employees">{data?.totalFocusEmployees || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-200/50 dark:border-green-800/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-green-500/10">
                <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">İzin Bekleyen</p>
                <p className="text-lg font-bold" data-testid="text-pending-leaves">{data?.focusPendingLeaves || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200/50 dark:border-orange-800/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-orange-500/10">
                <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Mesai Bekleyen</p>
                <p className="text-lg font-bold" data-testid="text-pending-overtimes">{data?.pendingOvertimes || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200/50 dark:border-emerald-800/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-emerald-500/10">
                <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Bordro</p>
                <p className="text-lg font-bold" data-testid="text-payroll-count">{data?.payrollCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {focusBranches.map((branch) => {
          const BranchIcon = BRANCH_ICONS[branch.branchId] || Building2;
          const bgColor = BRANCH_COLORS[branch.branchId] || "bg-gray-500";
          const topRoles = Object.entries(branch.roles)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, 3);

          return (
            <Card key={branch.branchId} className="overflow-visible" data-testid={`branch-card-${branch.branchId}`}>
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <div className={`p-1 rounded ${bgColor} text-white`}>
                    <BranchIcon className="w-3 h-3" />
                  </div>
                  <span className="truncate">{branch.branchName}</span>
                  <Badge variant="secondary" className="ml-auto text-[10px] shrink-0">
                    {branch.employeeCount} kişi
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="space-y-1 mt-1">
                  {topRoles.map(([role, count]) => (
                    <div key={role} className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground capitalize truncate">{role.replace(/_/g, ' ')}</span>
                      <span className="font-medium">{count as number}</span>
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 text-[11px] gap-1"
                  onClick={() => setLocation(`/ik?branch=${branch.branchId}`)}
                  data-testid={`btn-branch-detail-${branch.branchId}`}
                >
                  Personel Detay
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-0 bg-gradient-to-r from-slate-50/80 to-emerald-50/50 dark:from-slate-900/50 dark:to-emerald-900/30">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-xs font-semibold text-slate-600 dark:text-slate-400">Hızlı Erişim</CardTitle>
        </CardHeader>
        <CardContent className="py-1 px-3 pb-3">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="ghost"
                size="sm"
                className="w-full h-auto py-2 px-2 flex flex-col items-center gap-1"
                onClick={() => setLocation(action.path)}
                data-testid={`btn-quick-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className={`p-1.5 rounded-md ${action.color} text-white`}>
                  <action.icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 text-center leading-tight">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] text-muted-foreground">
          Toplam sistem personeli: {data?.totalAllEmployees || 0} | Tüm bekleyen izinler: {data?.pendingLeaves || 0}
        </p>
        <Button variant="ghost" size="sm" className="text-[10px] h-auto p-0 gap-1" onClick={() => setLocation('/merkez-dashboard')} data-testid="btn-all-branches">
          Tüm Şubeler
          <ArrowRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
