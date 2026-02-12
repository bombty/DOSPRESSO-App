import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Crown } from "lucide-react";
import { Link } from "wouter";

export function EmployeeOfMonthWidget({ branchId }: { branchId?: number }) {
  const currentDate = new Date();
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const { data: awards } = useQuery<any[]>({
    queryKey: ["/api/employee-of-month/awards", year],
  });

  const currentAward = awards?.find(
    (a: any) => a.month === month && a.year === year && (!branchId || a.branchId === branchId)
  );

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const previousAward = awards?.find(
    (a: any) => a.month === prevMonth && a.year === prevYear && (!branchId || a.branchId === branchId)
  );

  const displayAward = currentAward || previousAward;
  const displayMonth = currentAward ? month : prevMonth;
  const displayYear = currentAward ? year : prevYear;

  const MONTHS = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
  ];

  if (!displayAward) return null;

  return (
    <Link href="/ayin-elemani">
      <Card className="hover-elevate cursor-pointer" data-testid="widget-employee-of-month">
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs font-medium flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-yellow-500" />
            Ayın Elemanı
            <Badge variant="outline" className="text-[9px] ml-auto">
              {MONTHS[displayMonth - 1]} {displayYear}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-yellow-500/10 rounded-full p-1.5">
              <Crown className="h-4 w-4 text-yellow-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">
                {displayAward.employee?.firstName} {displayAward.employee?.lastName}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {displayAward.branch?.name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{displayAward.totalScore?.toFixed(1)}</p>
              <p className="text-[9px] text-muted-foreground">puan</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function EmployeeOfMonthBadge({ userId }: { userId: string }) {
  const year = new Date().getFullYear();

  const { data: awards } = useQuery<any[]>({
    queryKey: ["/api/employee-of-month/awards", year],
  });

  const userAwards = awards?.filter((a: any) => a.employeeId === userId) || [];

  if (userAwards.length === 0) return null;

  return (
    <Badge variant="outline" className="text-[10px] border-yellow-500/50 text-yellow-600 dark:text-yellow-400" data-testid="badge-employee-of-month">
      <Trophy className="h-3 w-3 mr-1 text-yellow-500" />
      {userAwards.length}x Ayın Elemanı
    </Badge>
  );
}