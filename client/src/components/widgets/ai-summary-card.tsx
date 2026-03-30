import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  TrendingUp, 
  Building2,
  ChevronRight
} from "lucide-react";

export function AISummaryCard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const isHQ = user && isHQRole(user.role as any);

  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ["/api/branches"],
    staleTime: 300000,
    enabled: !!user && isHQ,
  });

  const { data: analytics } = useQuery<any>({
    queryKey: ["/api/analytics/summary"],
    enabled: !!user && isHQ,
  });

  if (!isHQ || (user?.role !== 'ceo' && user?.role !== 'cgo')) return null;

  const healthyBranches = branches.filter((b: any) => (b.healthScore || 0) >= 80).length;
  const totalBranches = branches.length;
  const avgHealth = totalBranches > 0 
    ? Math.round(branches.reduce((sum: number, b: any) => sum + (b.healthScore || 0), 0) / totalBranches)
    : 0;

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={() => setLocation("/ceo-command-center")}
      className="w-full p-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg hover-elevate text-left"
      data-testid="ai-summary-card"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-card/20 flex items-center justify-center">
            <Brain className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm">AI Control Tower</span>
        </div>
        <ChevronRight className="w-4 h-4 text-white/70" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-white/70" />
          <div>
            <p className="text-xs text-white/70">Şube Sağlığı</p>
            <p className="text-lg font-bold">
              {healthyBranches}/{totalBranches}
              <span className="text-xs ml-1 text-white/80">sağlıklı</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-white/70" />
          <div>
            <p className="text-xs text-white/70">Ort. Skor</p>
            <div className="flex items-center gap-1">
              {totalBranches === 0 ? (
                <p className="text-sm text-white/60">Henüz değerlendirme yok</p>
              ) : avgHealth === 0 ? (
                <>
                  <p className="text-lg font-bold">0%</p>
                  <Badge variant="secondary" className="text-[8px] h-4 bg-card/20 text-white/60 border-0">Henüz değerlendirme yok</Badge>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold">{avgHealth}%</p>
                  {avgHealth >= 80 && <Badge variant="secondary" className="text-[8px] h-4 bg-card/20 text-white border-0">İyi</Badge>}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.button>
  );
}
