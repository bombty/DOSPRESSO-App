import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wrench, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Search,
  Building2,
  Calendar,
  ChevronRight,
  Filter,
  TrendingUp
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface Fault {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  branchId?: number;
  branchName?: string;
  equipmentId?: number;
  equipmentName?: string;
  assignedToId?: string;
  assignedToName?: string;
  reportedAt: string;
  resolvedAt?: string;
  slaDeadline?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: "Açık", color: "bg-red-500/10 text-red-500", icon: <AlertTriangle className="h-3 w-3" /> },
  in_progress: { label: "İşlemde", color: "bg-yellow-500/10 text-yellow-500", icon: <Clock className="h-3 w-3" /> },
  pending_parts: { label: "Parça Bekliyor", color: "bg-orange-500/10 text-orange-500", icon: <Wrench className="h-3 w-3" /> },
  resolved: { label: "Çözüldü", color: "bg-green-500/10 text-green-500", icon: <CheckCircle2 className="h-3 w-3" /> },
  closed: { label: "Kapatıldı", color: "bg-gray-500/10 text-gray-500", icon: <CheckCircle2 className="h-3 w-3" /> }
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: "Kritik", color: "bg-red-500 text-white" },
  high: { label: "Yüksek", color: "bg-orange-500 text-white" },
  medium: { label: "Orta", color: "bg-yellow-500 text-black" },
  low: { label: "Düşük", color: "bg-green-500 text-white" }
};

export default function TeknikAriza() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("active");

  const { data: faults, isLoading } = useQuery<Fault[]>({
    queryKey: ['/api/faults'],
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const allFaults = faults || [];
  const activeFaults = allFaults.filter(f => ['open', 'in_progress', 'pending_parts'].includes(f.status));
  const resolvedFaults = allFaults.filter(f => ['resolved', 'closed'].includes(f.status));
  
  const displayFaults = (activeTab === "active" ? activeFaults : resolvedFaults)
    .filter(f => {
      const matchesSearch = f.title?.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR')) ||
        f.branchName?.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR')) ||
        f.equipmentName?.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR'));
      const matchesStatus = statusFilter === "all" || f.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

  const criticalCount = activeFaults.filter(f => f.priority === 'critical').length;
  const avgResolutionTime = resolvedFaults.length > 0 ? 
    Math.round(resolvedFaults.reduce((sum, f) => {
      if (f.resolvedAt && f.reportedAt) {
        return sum + (new Date(f.resolvedAt).getTime() - new Date(f.reportedAt).getTime()) / (1000 * 60 * 60);
      }
      return sum;
    }, 0) / resolvedFaults.length) : 0;

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" data-testid="text-teknik-ariza-title">Arıza Takibi</h2>
          <p className="text-sm text-muted-foreground">Teknik ekip arıza yönetimi</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card data-testid="stat-active-faults">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeFaults.length}</p>
                <p className="text-xs text-muted-foreground">Aktif Arıza</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-critical">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Wrench className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{criticalCount}</p>
                <p className="text-xs text-muted-foreground">Kritik</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-resolved">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{resolvedFaults.length}</p>
                <p className="text-xs text-muted-foreground">Çözülen</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-avg-time">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgResolutionTime}s</p>
                <p className="text-xs text-muted-foreground">Ort. Çözüm</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Arıza, şube veya ekipman ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-faults"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40" data-testid="select-status-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active" data-testid="tab-active-faults">
            Aktif Arızalar ({activeFaults.length})
          </TabsTrigger>
          <TabsTrigger value="resolved" data-testid="tab-resolved-faults">
            Çözülenler ({resolvedFaults.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {displayFaults.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Wrench className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Arıza kaydı bulunamadı</p>
                </div>
              ) : (
                <div className="divide-y">
                  {displayFaults.map((fault) => {
                    const status = STATUS_CONFIG[fault.status] || STATUS_CONFIG.open;
                    const priority = PRIORITY_CONFIG[fault.priority] || PRIORITY_CONFIG.medium;
                    const isOverdue = fault.slaDeadline && new Date(fault.slaDeadline) < new Date();
                    
                    return (
                      <div 
                        key={fault.id} 
                        className="p-4 hover-elevate cursor-pointer"
                        data-testid={`fault-row-${fault.id}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{fault.title}</span>
                              <Badge className={priority.color}>{priority.label}</Badge>
                              <Badge className={status.color} variant="secondary">
                                {status.icon}
                                <span className="ml-1">{status.label}</span>
                              </Badge>
                              {isOverdue && (
                                <Badge variant="destructive">SLA Aşıldı</Badge>
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                              {fault.description}
                            </p>
                            
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              {fault.branchName && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {fault.branchName}
                                </span>
                              )}
                              {fault.equipmentName && (
                                <span className="flex items-center gap-1">
                                  <Wrench className="h-3 w-3" />
                                  {fault.equipmentName}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(fault.reportedAt), "d MMM yyyy HH:mm", { locale: tr })}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resolved" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {displayFaults.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Wrench className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Çözülen arıza bulunamadı</p>
                </div>
              ) : (
                <div className="divide-y">
                  {displayFaults.map((fault) => {
                    const status = STATUS_CONFIG[fault.status] || STATUS_CONFIG.open;
                    const priority = PRIORITY_CONFIG[fault.priority] || PRIORITY_CONFIG.medium;
                    
                    return (
                      <div 
                        key={fault.id} 
                        className="p-4 hover-elevate cursor-pointer"
                        data-testid={`fault-resolved-${fault.id}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{fault.title}</span>
                              <Badge className={priority.color}>{priority.label}</Badge>
                              <Badge className={status.color} variant="secondary">
                                {status.icon}
                                <span className="ml-1">{status.label}</span>
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                              {fault.description}
                            </p>
                            
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              {fault.branchName && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {fault.branchName}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(fault.reportedAt), "d MMM yyyy HH:mm", { locale: tr })}
                              </span>
                              {fault.resolvedAt && (
                                <span className="flex items-center gap-1 text-green-600">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {format(new Date(fault.resolvedAt), "d MMM yyyy HH:mm", { locale: tr })}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
