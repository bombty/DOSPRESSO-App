import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, ChevronRight } from "lucide-react";

interface CurrentWinner {
  id: number;
  month: number;
  year: number;
  score: number;
  winnerId: string;
  winnerName: string;
  winnerPhoto: string | null;
  branchId: number;
  branchName: string;
}

const MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

export function EmployeeOfMonthWidget() {
  const [, setLocation] = useLocation();
  
  const { data: winner, isLoading } = useQuery<CurrentWinner | null>({
    queryKey: ["/api/employee-of-month/current-winner"],
  });

  if (isLoading) {
    return (
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-yellow-50/30 dark:from-amber-950/20 dark:to-yellow-950/10">
        <CardContent className="p-4">
          <div className="animate-pulse flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-200/50 dark:bg-amber-800/30" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-24 bg-amber-200/50 dark:bg-amber-800/30 rounded" />
              <div className="h-3 w-32 bg-amber-200/50 dark:bg-amber-800/30 rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!winner) {
    return null;
  }

  const initials = winner.winnerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card 
      className="border-amber-500/40 bg-gradient-to-br from-amber-50 to-yellow-50/50 dark:from-amber-950/30 dark:to-yellow-950/20 cursor-pointer hover-elevate"
      onClick={() => setLocation("/ayin-elemani")}
      data-testid="employee-of-month-widget"
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <span className="text-amber-700 dark:text-amber-400">Ayın Elemanı</span>
          <Badge variant="secondary" className="ml-auto bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs">
            {MONTH_NAMES[winner.month - 1]} {winner.year}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-12 w-12 border-2 border-amber-400/50">
              <AvatarImage src={winner.winnerPhoto || undefined} alt={winner.winnerName} />
              <AvatarFallback className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-0.5">
              <Star className="h-3 w-3 fill-current" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground truncate" data-testid="winner-name">
              {winner.winnerName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {winner.branchName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400" data-testid="winner-score">
                {winner.score}
              </p>
              <p className="text-[10px] text-muted-foreground">puan</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
