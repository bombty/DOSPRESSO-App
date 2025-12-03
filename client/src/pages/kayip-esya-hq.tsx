import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, PackageCheck, Building2, MapPin, User, Calendar, Phone, Clock, Filter } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { LostFoundItem, Branch } from "@shared/schema";

const STATUS_LABELS: Record<string, string> = {
  bulunan: "Bulunan",
  teslim_edildi: "Teslim Edildi",
};

const STATUS_COLORS: Record<string, string> = {
  bulunan: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  teslim_edildi: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

type LostFoundItemEnriched = LostFoundItem & {
  foundByName: string;
  branchName: string;
  handoveredByName?: string | null;
};

function ItemSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </CardContent>
    </Card>
  );
}

export default function KayipEsyaHQPage() {
  const { user } = useAuth();
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const { data: items = [], isLoading } = useQuery<LostFoundItemEnriched[]>({
    queryKey: ["/api/lost-found/all"],
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const filteredItems = useMemo(() => {
    let result = items;
    if (selectedBranch !== "all") {
      result = result.filter(i => i.branchId === parseInt(selectedBranch));
    }
    if (selectedStatus !== "all") {
      result = result.filter(i => i.status === selectedStatus);
    }
    return result;
  }, [items, selectedBranch, selectedStatus]);

  const stats = useMemo(() => {
    const byBranch = new Map<number, { found: number; handedOver: number; branchName: string }>();
    items.forEach(item => {
      const existing = byBranch.get(item.branchId) || { found: 0, handedOver: 0, branchName: item.branchName };
      if (item.status === "bulunan") {
        existing.found++;
      } else {
        existing.handedOver++;
      }
      byBranch.set(item.branchId, existing);
    });
    return {
      totalFound: items.filter(i => i.status === "bulunan").length,
      totalHandedOver: items.filter(i => i.status === "teslim_edildi").length,
      byBranch: Array.from(byBranch.entries()).map(([id, data]) => ({ id, ...data })),
    };
  }, [items]);

  const formatDate = (date: any) => {
    if (!date) return "-";
    try {
      return format(new Date(date), "dd MMM yyyy HH:mm", { locale: tr });
    } catch {
      return "-";
    }
  };

  if (!user) return null;

  return (
    <div className="p-3 sm:p-4 max-w-6xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold" data-testid="text-page-title">
            Kayıp & Bulunan - Merkez Görünümü
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Tüm şubelerin bulunan eşya kayıtları
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        <Card className="hover-elevate">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-yellow-100 dark:bg-yellow-900">
                <Briefcase className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bekleyen</p>
                <p className="text-lg font-semibold" data-testid="text-stat-found">{stats.totalFound}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-green-100 dark:bg-green-900">
                <PackageCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Teslim Edildi</p>
                <p className="text-lg font-semibold" data-testid="text-stat-handover">{stats.totalHandedOver}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900">
                <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Aktif Şube</p>
                <p className="text-lg font-semibold" data-testid="text-stat-branches">
                  {stats.byBranch.filter(b => b.found > 0).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate hidden lg:block">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-purple-100 dark:bg-purple-900">
                <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Toplam</p>
                <p className="text-lg font-semibold" data-testid="text-stat-total">{items.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate hidden lg:block">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-orange-100 dark:bg-orange-900">
                <Filter className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Filtrelenen</p>
                <p className="text-lg font-semibold" data-testid="text-stat-filtered">{filteredItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-3 pb-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium">Kayıtlar</CardTitle>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-full sm:w-[150px] h-8 text-xs" data-testid="select-branch">
                  <SelectValue placeholder="Şube seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Şubeler</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={String(branch.id)}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs" data-testid="select-status">
                  <SelectValue placeholder="Durum seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  <SelectItem value="bulunan">Bulunan</SelectItem>
                  <SelectItem value="teslim_edildi">Teslim Edildi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {Array.from({ length: 6 }).map((_, i) => <ItemSkeleton key={i} />)}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Kayıt bulunamadı</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {filteredItems.map((item) => (
                <Card
                  key={item.id}
                  className={`hover-elevate ${item.status === "teslim_edildi" ? "opacity-70" : ""}`}
                  data-testid={`card-item-${item.id}`}
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.itemDescription}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Building2 className="h-3 w-3 flex-shrink-0 text-primary" />
                          <span className="font-medium text-primary">{item.branchName}</span>
                        </div>
                      </div>
                      <Badge className={STATUS_COLORS[item.status]}>
                        {STATUS_LABELS[item.status]}
                      </Badge>
                    </div>

                    {item.photoUrl && (
                      <img
                        src={item.photoUrl}
                        alt="Eşya fotoğrafı"
                        className="w-full h-20 object-cover rounded-md"
                      />
                    )}

                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{item.foundArea}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>Bulan: {item.foundByName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Bulunma: {item.foundDate} {item.foundTime}</span>
                      </div>
                    </div>

                    {item.status === "teslim_edildi" && (
                      <div className="p-2 bg-green-50 dark:bg-green-950 rounded-md text-xs space-y-1">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="font-medium">Alan: {item.ownerName}</span>
                        </div>
                        {item.ownerPhone && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{item.ownerPhone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>Teslim: {formatDate(item.handoverDate)}</span>
                        </div>
                        {item.handoveredByName && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>Teslim Eden: {item.handoveredByName}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {stats.byBranch.length > 0 && (
        <Card>
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-sm font-medium">Şube Özeti</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {stats.byBranch.map((branch) => (
                <div
                  key={branch.id}
                  className="p-2 border rounded-md text-xs"
                  data-testid={`branch-summary-${branch.id}`}
                >
                  <p className="font-medium truncate">{branch.branchName}</p>
                  <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3 text-yellow-500" />
                      {branch.found}
                    </span>
                    <span className="flex items-center gap-1">
                      <PackageCheck className="h-3 w-3 text-green-500" />
                      {branch.handedOver}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
