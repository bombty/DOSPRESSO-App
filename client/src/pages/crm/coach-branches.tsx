import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Phone, MapPin, TrendingUp, Users, Star, ChevronRight, AlertTriangle } from "lucide-react";

interface Branch {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  healthScore?: number;
  employeeCount?: number;
}

export default function CoachBranches() {
  const { data: branches, isLoading } = useQuery<Branch[]>({
    queryKey: ['/api/branches'],
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const activeBranches = branches?.filter(b => b.isActive) || [];
  const avgHealthScore = activeBranches.length > 0
    ? Math.round(activeBranches.reduce((sum, b) => sum + (b.healthScore || 80), 0) / activeBranches.length)
    : 0;

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" data-testid="text-coach-branches-title">Şube Takibi</h2>
          <p className="text-sm text-muted-foreground">Sorumlu olduğunuz şubelerin durumu</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card data-testid="stat-total-branches">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeBranches.length}</p>
                <p className="text-xs text-muted-foreground">Aktif Şube</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-avg-health">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgHealthScore}%</p>
                <p className="text-xs text-muted-foreground">Ort. Sağlık</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-total-employees">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeBranches.reduce((sum, b) => sum + (b.employeeCount || 5), 0)}</p>
                <p className="text-xs text-muted-foreground">Toplam Personel</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-alerts">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeBranches.filter(b => (b.healthScore || 80) < 70).length}</p>
                <p className="text-xs text-muted-foreground">Dikkat Gereken</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Şube Listesi</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {activeBranches.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Henüz atanmış şube yok</p>
            </div>
          ) : (
            <div className="divide-y">
              {activeBranches.map((branch) => {
                const healthScore = branch.healthScore || 80;
                const healthColor = healthScore >= 80 ? "text-green-500" : healthScore >= 60 ? "text-yellow-500" : "text-red-500";
                
                return (
                  <div 
                    key={branch.id} 
                    className="p-4 flex items-center justify-between hover-elevate cursor-pointer"
                    data-testid={`branch-row-${branch.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{branch.name}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          {branch.address && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {branch.address.substring(0, 30)}...
                            </span>
                          )}
                          {branch.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {branch.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`text-lg font-bold ${healthColor}`}>{healthScore}%</div>
                        <p className="text-xs text-muted-foreground">Sağlık Puanı</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
