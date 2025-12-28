import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RefreshCw, MapPin, Clock, Users, Wifi, WifiOff, Building2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface ActiveEmployee {
  userId: string;
  branchId: number;
  latitude?: number;
  longitude?: number;
  timestamp?: string;
  accuracy?: number;
  lastUpdate: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    profilePhotoUrl?: string;
  };
}

interface Branch {
  id: number;
  name: string;
}

export default function CanliTakip() {
  const { user } = useAuth();
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    enabled: user?.role === "admin" || user?.role === "coach",
  });

  const effectiveBranchId = user?.role === "admin" || user?.role === "coach" 
    ? selectedBranchId 
    : user?.branchId;

  const { data: activeEmployees = [], isLoading, refetch, dataUpdatedAt } = useQuery<ActiveEmployee[]>({
    queryKey: ["/api/tracking/branch", effectiveBranchId],
    enabled: !!effectiveBranchId,
    refetchInterval: autoRefresh ? 30000 : false,
  });

  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId && (user?.role === "admin" || user?.role === "coach")) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId, user?.role]);

  useEffect(() => {
    if (user?.branchId && user?.role !== "admin" && user?.role !== "coach") {
      setSelectedBranchId(user.branchId);
    }
  }, [user]);

  const getTimeSinceUpdate = (lastUpdate: string) => {
    const now = new Date();
    const update = new Date(lastUpdate);
    const diffMs = now.getTime() - update.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) return "Az önce";
    if (diffMinutes < 5) return `${diffMinutes} dk önce`;
    return `${diffMinutes} dk önce`;
  };

  const getStatusColor = (lastUpdate: string) => {
    const now = new Date();
    const update = new Date(lastUpdate);
    const diffMs = now.getTime() - update.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 2) return "bg-green-500";
    if (diffMinutes < 5) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Yönetici",
      manager: "Müdür",
      coach: "Koç",
      supervisor: "Vardiya Sorumlusu",
      barista: "Barista",
      kasaci: "Kasiyer",
      mutfak: "Mutfak",
      temizlik: "Temizlik",
      depo: "Depo",
    };
    return labels[role] || role;
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();
  };

  const currentBranch = branches.find(b => b.id === effectiveBranchId);

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Canlı Konum Takibi</h1>
          <p className="text-muted-foreground">Şubedeki aktif çalışanların anlık durumu</p>
        </div>
        
        <div className="flex items-center gap-2">
          {(user?.role === "admin" || user?.role === "coach") && (
            <Select
              value={selectedBranchId?.toString() || ""}
              onValueChange={(val) => setSelectedBranchId(parseInt(val))}
            >
              <SelectTrigger className="w-[200px]" data-testid="select-branch">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Şube seçin" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id.toString()}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            data-testid="button-toggle-auto-refresh"
          >
            {autoRefresh ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            data-testid="button-refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-active-count">{activeEmployees.length}</p>
                <p className="text-xs text-muted-foreground">Aktif Personel</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-online-count">
                  {activeEmployees.filter(e => {
                    const diffMs = Date.now() - new Date(e.lastUpdate).getTime();
                    return diffMs < 120000;
                  }).length}
                </p>
                <p className="text-xs text-muted-foreground">Çevrimiçi</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-idle-count">
                  {activeEmployees.filter(e => {
                    const diffMs = Date.now() - new Date(e.lastUpdate).getTime();
                    return diffMs >= 120000 && diffMs < 300000;
                  }).length}
                </p>
                <p className="text-xs text-muted-foreground">Beklemede</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium truncate" data-testid="text-branch-name">
                  {currentBranch?.name || "Şube seçilmedi"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {dataUpdatedAt ? format(new Date(dataUpdatedAt), "HH:mm:ss", { locale: tr }) : "--:--"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!effectiveBranchId ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Lütfen takip edilecek şubeyi seçin</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="h-8 w-8 mx-auto animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Yükleniyor...</p>
          </CardContent>
        </Card>
      ) : activeEmployees.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Şu anda aktif personel bulunmuyor</p>
            <p className="text-xs text-muted-foreground mt-1">
              Personel giriş yaptığında burada görünecektir
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {activeEmployees.map((employee) => (
            <Card key={employee.userId} className="hover-elevate" data-testid={`card-employee-${employee.userId}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(employee.user?.firstName, employee.user?.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <span 
                      className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${getStatusColor(employee.lastUpdate)}`}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" data-testid={`text-employee-name-${employee.userId}`}>
                      {employee.user?.firstName} {employee.user?.lastName}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {getRoleLabel(employee.user?.role || "")}
                    </Badge>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Son güncelleme
                    </span>
                    <span className="font-medium" data-testid={`text-last-update-${employee.userId}`}>
                      {getTimeSinceUpdate(employee.lastUpdate)}
                    </span>
                  </div>
                  
                  {employee.accuracy && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Doğruluk
                      </span>
                      <span className="font-medium">±{Math.round(employee.accuracy)}m</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="text-center text-xs text-muted-foreground">
        {autoRefresh ? (
          <span className="flex items-center justify-center gap-1">
            <Wifi className="h-3 w-3 text-green-500" />
            Otomatik yenileme aktif (30 saniyede bir)
          </span>
        ) : (
          <span className="flex items-center justify-center gap-1">
            <WifiOff className="h-3 w-3" />
            Otomatik yenileme kapalı
          </span>
        )}
      </div>
    </div>
  );
}
