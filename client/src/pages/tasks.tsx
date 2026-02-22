import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyStatePreset } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { QuickTaskModal } from "@/components/quick-task-modal";
import { type Task, type Branch, type User, isHQRole as checkIsHQRole, type TaskStatus, type TaskPriority, hasPermission, type UserRoleType } from "@shared/schema";
import { Check, Clock, AlertCircle, CheckCircle2, PlayCircle, Search, X, Calendar, ChevronDown, Filter, XCircle, ArrowUp, ArrowDown, Eye, EyeOff, Building2, Send, Star, BarChart3 } from "lucide-react";
import { format } from "date-fns";

export default function Tasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  
  const [filterBranchId, setFilterBranchId] = useState<number | null>(null);
  const [filterAssigneeId, setFilterAssigneeId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | null>(null);
  const [filterPriority, setFilterPriority] = useState<TaskPriority | null>(null);
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>();
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>();
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'createdAt',
    direction: 'desc',
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [assignmentFilter, setAssignmentFilter] = useState<"bana_atanan" | "atadiklarim" | null>(null);
  const [branchPopoverOpen, setBranchPopoverOpen] = useState(false);
  const [ratingTaskId, setRatingTaskId] = useState<number | null>(null);
  const [ratingScore, setRatingScore] = useState(0);
  const tasksContainerRef = useRef<HTMLDivElement>(null);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkDescription, setBulkDescription] = useState("");
  const [bulkPriority, setBulkPriority] = useState<string>("orta");
  const [bulkDueDate, setBulkDueDate] = useState("");
  const [bulkRoleFilter, setBulkRoleFilter] = useState("");
  const [bulkBranchIds, setBulkBranchIds] = useState<number[]>([]);
  const [bulkScheduledDate, setBulkScheduledDate] = useState("");
  const [bulkScheduledTime, setBulkScheduledTime] = useState("");
  const [showFairnessDialog, setShowFairnessDialog] = useState(false);
  const [fairnessPeriod, setFairnessPeriod] = useState(30);

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: branches, isLoading: isBranchesLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const isHQ = user?.role && checkIsHQRole(user.role as any);
  const canAssignTasks = user?.role ? hasPermission(user.role as UserRoleType, 'tasks', 'create') : false;

  const filteredTasksForStats = useMemo(() => {
    if (!tasks) return [];
    
    let filtered = [...tasks];
    
    // Branch-level filtering: non-HQ users only see their branch tasks
    if (user?.role && !isHQRole(user.role as any)) {
      if (user.branchId) {
        filtered = filtered.filter(task => task.branchId === user.branchId);
      }
    }
    
    // Branch filter (HQ only)
    if (filterBranchId !== null) {
      filtered = filtered.filter(t => Number(t.branchId) === Number(filterBranchId));
    }
    
    // Assignment direction filter (compare as strings due to type mismatch)
    if (assignmentFilter === "bana_atanan") {
      filtered = filtered.filter(t => t.assignedToId?.toString() === user?.id?.toString());
    } else if (assignmentFilter === "atadiklarim") {
      filtered = filtered.filter(t => t.assignedById?.toString() === user?.id?.toString());
    }
    
    return filtered;
  }, [tasks, user, filterBranchId, assignmentFilter]);

  const overdueTasks = useMemo(() => {
    const now = new Date();
    return filteredTasksForStats.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'onaylandi');
  }, [filteredTasksForStats]);


  const { data: allUsers, isLoading: isAllUsersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: fairnessData, isLoading: isFairnessLoading } = useQuery<any>({
    queryKey: ["/api/tasks/fairness-report", fairnessPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/fairness-report?days=${fairnessPeriod}`, { credentials: 'include' });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: showFairnessDialog,
  });

  // Handle URL parameters for status filter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get('status');
    
    if (statusParam) {
      const validStatuses: TaskStatus[] = ['beklemede', 'devam_ediyor', 'foto_bekleniyor', 'incelemede', 'onaylandi', 'reddedildi', 'gecikmiş'];
      if (validStatuses.includes(statusParam as TaskStatus)) {
        setFilterStatus(statusParam as TaskStatus);
        setFilterOpen(true);
      }
    }
  }, []);


  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterBranchId(null);
    setFilterAssigneeId(null);
    setFilterStatus(null);
    setFilterPriority(null);
    setFilterDateFrom(undefined);
    setFilterDateTo(undefined);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (filterBranchId !== null) count++;
    if (filterAssigneeId !== null) count++;
    if (filterStatus !== null) count++;
    if (filterPriority !== null) count++;
    if (filterDateFrom || filterDateTo) count++;
    return count;
  }, [searchQuery, filterBranchId, filterAssigneeId, filterStatus, filterPriority, filterDateFrom, filterDateTo]);



  const bulkAssignMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/tasks/bulk", data);
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setShowBulkDialog(false);
      setBulkDescription("");
      setBulkPriority("orta");
      setBulkDueDate("");
      setBulkRoleFilter("");
      setBulkBranchIds([]);
      setBulkScheduledDate("");
      setBulkScheduledTime("");
      toast({ title: "Başarılı", description: `${data.created || 0} görev oluşturuldu` });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Toplu görev oluşturulamadı", variant: "destructive" });
    },
  });

  const stats = useMemo(() => {
    if (!filteredTasksForStats) return { beklemede: 0, devamEden: 0, tamamlanmayan: 0, tamamlanan: 0 };
    
    return {
      beklemede: filteredTasksForStats.filter(t => t.status === 'beklemede').length,
      devamEden: filteredTasksForStats.filter(t => t.status === 'devam_ediyor').length,
      tamamlanmayan: filteredTasksForStats.filter(t => t.status === 'gecikmiş').length,
      tamamlanan: filteredTasksForStats.filter(t => t.status === 'onaylandi').length,
    };
  }, [filteredTasksForStats]);

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    
    let filtered = [...tasks];
    
    // Branch-level filtering: non-HQ users only see their branch tasks
    if (user?.role && !isHQRole(user.role as any)) {
      if (user.branchId) {
        filtered = filtered.filter(task => task.branchId === user.branchId);
      }
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(task => 
        task.description?.toLowerCase().includes(query)
      );
    }
    
    
    // Branch filter (HQ only)
    if (filterBranchId !== null) {
      filtered = filtered.filter(t => Number(t.branchId) === Number(filterBranchId));
    }
    
    // Assignee filter
    if (filterAssigneeId !== null) {
      filtered = filtered.filter(t => t.assignedToId?.toString() === filterAssigneeId?.toString());
    }
    
    // Status filter
    if (filterStatus !== null) {
      filtered = filtered.filter(t => t.status === filterStatus);
    }
    
    // Priority filter
    if (filterPriority !== null) {
      filtered = filtered.filter(t => t.priority === filterPriority);
    }
    
    // Assignment direction filter (compare as strings due to type mismatch)
    if (assignmentFilter === "bana_atanan") {
      filtered = filtered.filter(t => t.assignedToId?.toString() === user?.id?.toString());
    } else if (assignmentFilter === "atadiklarim") {
      filtered = filtered.filter(t => t.assignedById?.toString() === user?.id?.toString());
    }
    
    // Date range filter (due date)
    if (filterDateFrom) {
      filtered = filtered.filter(t => {
        if (!t.dueDate) return false;
        return new Date(t.dueDate) >= filterDateFrom;
      });
    }
    
    if (filterDateTo) {
      filtered = filtered.filter(t => {
        if (!t.dueDate) return false;
        return new Date(t.dueDate) <= filterDateTo;
      });
    }

    if (activeTab === "onay_bekleyen") {
      filtered = filtered.filter(t => t.status === "onay_bekliyor");
    } else if (activeTab === "zamanlanmis") {
      filtered = filtered.filter(t => t.status === "zamanlanmis");
    }
    
    // Sorting
    filtered.sort((a, b) => {
      const { key, direction } = sortConfig;
      let aVal, bVal: any;
      
      if (key === 'createdAt' || key === 'dueDate') {
        aVal = a[key] ? new Date(a[key] as Date).getTime() : 0;
        bVal = b[key] ? new Date(b[key] as Date).getTime() : 0;
      } else if (key === 'priority') {
        const priorityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
        aVal = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        bVal = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      } else {
        aVal = a[key as keyof Task] || '';
        bVal = b[key as keyof Task] || '';
      }
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filtered;
  }, [tasks, searchQuery, activeTab, user, filterBranchId, filterAssigneeId, filterStatus, filterPriority, filterDateFrom, filterDateTo, sortConfig, assignmentFilter]);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 pb-24 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-semibold" data-testid="text-page-title">Tasklar</h1>
        <div className="flex flex-wrap gap-2">
          {isHQ && (
            <Button size="sm" variant="outline" onClick={() => setShowFairnessDialog(true)} data-testid="button-fairness-report">
              <BarChart3 className="h-4 w-4 mr-2" />
              Dağılım Raporu
            </Button>
          )}
          {isHQ && canAssignTasks && (
            <Button size="sm" variant="outline" onClick={() => setShowBulkDialog(true)} data-testid="button-bulk-assign">
              <Send className="h-4 w-4 mr-2" />
              Toplu Atama
            </Button>
          )}
        </div>
        {canAssignTasks && (
          <QuickTaskModal trigger={<Button size="sm" data-testid="button-add-task">Yeni Görev Ekle</Button>} />
        )}
      </div>

      {/* Assignment Direction Filter + Branch Selector */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={assignmentFilter === "bana_atanan" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setAssignmentFilter(assignmentFilter === "bana_atanan" ? null : "bana_atanan");
            setFilterBranchId(null);
          }}
          data-testid="button-filter-assigned-to-me"
        >
          Bana Atanan
        </Button>
        {canAssignTasks && (
          <Button
            variant={assignmentFilter === "atadiklarim" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setAssignmentFilter(assignmentFilter === "atadiklarim" ? null : "atadiklarim");
              setFilterBranchId(null);
            }}
            data-testid="button-filter-assigned-by-me"
          >
            Atadıklarım
          </Button>
        )}
        
        {isHQ && branches && branches.length > 0 && (
          <Popover open={branchPopoverOpen} onOpenChange={setBranchPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={filterBranchId !== null ? "default" : "outline"}
                size="sm"
                data-testid="button-branch-filter"
              >
                <Building2 className="h-4 w-4 mr-1" />
                {filterBranchId !== null
                  ? `Şube: ${branches.find(b => b.id === filterBranchId)?.name || ''}`
                  : 'Şubeler'}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full max-w-56 p-2" align="start">
              <div className="flex flex-col gap-1">
                <Button
                  variant={filterBranchId === null ? "secondary" : "ghost"}
                  size="sm"
                  className="justify-start"
                  onClick={() => {
                    setFilterBranchId(null);
                    setAssignmentFilter(null);
                    setBranchPopoverOpen(false);
                  }}
                  data-testid="command-branch-all"
                >
                  <Check className={`h-4 w-4 mr-2 ${filterBranchId === null ? 'opacity-100' : 'opacity-0'}`} />
                  Tümü
                </Button>
                {branches.map((branch) => (
                  <Button
                    key={branch.id}
                    variant={filterBranchId === branch.id ? "secondary" : "ghost"}
                    size="sm"
                    className="justify-start"
                    onClick={() => {
                      setFilterBranchId(branch.id);
                      setAssignmentFilter(null);
                      setBranchPopoverOpen(false);
                    }}
                    data-testid={`command-branch-${branch.id}`}
                  >
                    <Check className={`h-4 w-4 mr-2 ${filterBranchId === branch.id ? 'opacity-100' : 'opacity-0'}`} />
                    {branch.name}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {overdueTasks.length > 0 && (
          <Card 
            data-testid="card-stat-overdue" 
            className={`border-destructive cursor-pointer hover-elevate transition-all ${filterStatus === 'gecikmiş' ? 'ring-2 ring-destructive' : ''}`}
            onClick={() => {
              setFilterStatus(filterStatus === 'gecikmiş' ? null : 'gecikmiş');
              setFilterOpen(false);
            }}
          >
            <CardContent className="p-3">
              <div className="flex flex-col items-center text-center gap-1.5">
                <div className="h-4 w-4 rounded-full bg-destructive/10 dark:bg-destructive/5/20 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-destructive dark:text-red-500" />
                </div>
                <p className="text-xs text-muted-foreground">Gecikmiş</p>
                <p className="text-lg font-bold text-destructive">{overdueTasks.length}</p>
              </div>
            </CardContent>
          </Card>
        )}
        
        <Card 
          data-testid="card-stat-beklemede"
          className={`cursor-pointer hover-elevate transition-all ${filterStatus === 'beklemede' ? 'ring-2 ring-warning' : ''}`}
          onClick={() => {
            setFilterStatus(filterStatus === 'beklemede' ? null : 'beklemede');
            setFilterOpen(false);
          }}
        >
          <CardContent className="p-3">
            <div className="flex flex-col items-center text-center gap-1.5">
              <div className="h-4 w-4 rounded-full bg-warning/20 dark:bg-warning/5/20 flex items-center justify-center">
                <Clock className="h-4 w-4 text-warning dark:text-warning" />
              </div>
              <p className="text-xs text-muted-foreground">Bekleyen</p>
              <p className="text-lg font-bold">{stats.beklemede}</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          data-testid="card-stat-devam-eden"
          className={`cursor-pointer hover-elevate transition-all ${filterStatus === 'devam_ediyor' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => {
            setFilterStatus(filterStatus === 'devam_ediyor' ? null : 'devam_ediyor');
            setFilterOpen(false);
          }}
        >
          <CardContent className="p-3">
            <div className="flex flex-col items-center text-center gap-1.5">
              <div className="h-4 w-4 rounded-full bg-primary/10 dark:bg-primary/5/20 flex items-center justify-center">
                <PlayCircle className="h-4 w-4 text-primary dark:text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground">Devam Eden</p>
              <p className="text-lg font-bold">{stats.devamEden}</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          data-testid="card-stat-tamamlanmayan"
          className={`cursor-pointer hover-elevate transition-all ${filterStatus === 'reddedildi' ? 'ring-2 ring-destructive' : ''}`}
          onClick={() => {
            setFilterStatus(filterStatus === 'reddedildi' ? null : 'reddedildi');
            setFilterOpen(false);
          }}
        >
          <CardContent className="p-3">
            <div className="flex flex-col items-center text-center gap-1.5">
              <div className="h-4 w-4 rounded-full bg-destructive/10 dark:bg-destructive/5/20 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-destructive dark:text-red-500" />
              </div>
              <p className="text-xs text-muted-foreground">Tamamlanmayan</p>
              <p className="text-lg font-bold">{stats.tamamlanmayan}</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          data-testid="card-stat-tamamlanan"
          className={`cursor-pointer hover-elevate transition-all ${filterStatus === 'onaylandi' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => {
            setFilterStatus(filterStatus === 'onaylandi' ? null : 'onaylandi');
            setFilterOpen(false);
          }}
        >
          <CardContent className="p-3">
            <div className="flex flex-col items-center text-center gap-1.5">
              <div className="h-4 w-4 rounded-full bg-success/10 dark:bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-success dark:text-green-500" />
              </div>
              <p className="text-xs text-muted-foreground">Tamamlanan</p>
              <p className="text-lg font-bold">{stats.tamamlanan}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Collapsible open={filterOpen} onOpenChange={setFilterOpen}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <CardTitle>Filtreler</CardTitle>
                {activeFilterCount > 0 && (
                  <Badge variant="default" data-testid="badge-active-filters">
                    {activeFilterCount}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    data-testid="button-clear-filters"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Filtreleri Temizle
                  </Button>
                )}
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" data-testid="button-toggle-filters">
                    <ChevronDown className={`h-4 w-4 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      placeholder="Görev ara..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-7 h-8 text-sm"
                      data-testid="input-filter-search"
                    />
                  </div>
                </div>

                {isHQ && (
                  <Select
                    value={filterBranchId?.toString() || "all"}
                    onValueChange={(value) => setFilterBranchId(value === "all" ? null : Number(value))}
                  >
                    <SelectTrigger className="h-8 text-xs" data-testid="select-filter-branch">
                      <SelectValue placeholder="Şube" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm şubeler</SelectItem>
                      {branches?.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id.toString()}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Select
                  value={filterAssigneeId || "all"}
                  onValueChange={(value) => setFilterAssigneeId(value === "all" ? null : value)}
                >
                  <SelectTrigger className="h-8 text-xs" data-testid="select-filter-assignee">
                    <SelectValue placeholder="Kişi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm kişiler</SelectItem>
                    {allUsers?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filterStatus || "all"}
                  onValueChange={(value) => setFilterStatus(value === "all" ? null : (value as TaskStatus))}
                >
                  <SelectTrigger className="h-8 text-xs" data-testid="select-filter-status">
                    <SelectValue placeholder="Durum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm durumlar</SelectItem>
                    <SelectItem value="beklemede">Beklemede</SelectItem>
                    <SelectItem value="devam_ediyor">Devam Ediyor</SelectItem>
                    <SelectItem value="foto_bekleniyor">Fotoğraf Bekleniyor</SelectItem>
                    <SelectItem value="incelemede">İncelemede</SelectItem>
                    <SelectItem value="ek_bilgi_bekleniyor">Ek Bilgi Bekleniyor</SelectItem>
                    <SelectItem value="tamamlandi">Tamamlandı</SelectItem>
                    <SelectItem value="onaylandi">Onaylandı</SelectItem>
                    <SelectItem value="reddedildi">Reddedildi</SelectItem>
                    <SelectItem value="gecikmiş">Gecikmiş</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filterPriority || "all"}
                  onValueChange={(value) => setFilterPriority(value === "all" ? null : (value as TaskPriority))}
                >
                  <SelectTrigger className="h-8 text-xs" data-testid="select-filter-priority">
                    <SelectValue placeholder="Öncelik" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm öncelikler</SelectItem>
                    <SelectItem value="düşük">Düşük</SelectItem>
                    <SelectItem value="orta">Orta</SelectItem>
                    <SelectItem value="yüksek">Yüksek</SelectItem>
                    <SelectItem value="acil">Acil</SelectItem>
                    <SelectItem value="kritik">Kritik</SelectItem>
                  </SelectContent>
                </Select>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs justify-start"
                      data-testid="button-filter-date-from"
                    >
                      <Calendar className="mr-1 h-3 w-3" />
                      {filterDateFrom ? format(filterDateFrom, "dd/MM") : "Başlangıç"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={filterDateFrom}
                      onSelect={setFilterDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs justify-start"
                      data-testid="button-filter-date-to"
                    >
                      <Calendar className="mr-1 h-3 w-3" />
                      {filterDateTo ? format(filterDateTo, "dd/MM") : "Bitiş"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={filterDateTo}
                      onSelect={setFilterDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col gap-3 sm:gap-4" ref={tasksContainerRef}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
          <TabsList data-testid="tabs-task-filter">
            <TabsTrigger value="all" data-testid="tab-all">Tümü</TabsTrigger>
            <TabsTrigger value="onay_bekleyen" data-testid="tab-pending-approval">Onay Bekleyen</TabsTrigger>
            {isHQ && <TabsTrigger value="zamanlanmis" data-testid="tab-scheduled">Zamanlanmış</TabsTrigger>}
          </TabsList>
          
        </div>

        {/* Dynamic filtered list header */}
        {filterStatus && (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg" data-testid="filter-header">
            <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
              filterStatus === 'gecikmiş' ? 'bg-destructive/10' :
              filterStatus === 'beklemede' ? 'bg-warning/20' :
              filterStatus === 'devam_ediyor' ? 'bg-primary/10' :
              filterStatus === 'reddedildi' ? 'bg-destructive/10' :
              filterStatus === 'onaylandi' ? 'bg-success/10' :
              'bg-muted'
            }`}>
              {filterStatus === 'gecikmiş' ? <AlertCircle className="h-4 w-4 text-destructive" /> :
               filterStatus === 'beklemede' ? <Clock className="h-4 w-4 text-warning" /> :
               filterStatus === 'devam_ediyor' ? <PlayCircle className="h-4 w-4 text-primary" /> :
               filterStatus === 'reddedildi' ? <AlertCircle className="h-4 w-4 text-destructive" /> :
               filterStatus === 'onaylandi' ? <CheckCircle2 className="h-4 w-4 text-success" /> :
               <Filter className="h-4 w-4" />}
            </div>
            <span className="font-medium">
              {filterStatus === 'gecikmiş' ? 'Gecikmiş Tasklar' :
               filterStatus === 'beklemede' ? 'Bekleyen Tasklar' :
               filterStatus === 'devam_ediyor' ? 'Devam Eden Tasklar' :
               filterStatus === 'reddedildi' ? 'Tamamlanmayan Tasklar' :
               filterStatus === 'onaylandi' ? 'Tamamlanan Tasklar' :
               'Filtrelenmiş Tasklar'}
            </span>
            <Badge variant="outline">{filteredTasks.length}</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilterStatus(null)}
              className="ml-auto"
              data-testid="button-clear-status-filter"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Temizle
            </Button>
          </div>
        )}

        {["all", "onay_bekleyen", "zamanlanmis"].map((tabValue) => (
          <TabsContent key={tabValue} value={tabValue} className="w-full space-y-2 sm:space-y-3">
            {isLoading ? (
              <ListSkeleton count={3} variant="row" showHeader={false} />
            ) : (
              <div className="flex flex-col gap-3 sm:gap-4">
                {/* Sortable Column Headers - Desktop only */}
                <Card className="hidden lg:block">
                  <CardContent className="py-2 px-3">
                    <div className="grid grid-cols-5 gap-2 sm:gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (sortConfig.key === 'description') {
                            setSortConfig({ key: 'description', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' });
                          } else {
                            setSortConfig({ key: 'description', direction: 'asc' });
                          }
                        }}
                        className="justify-start h-8 px-2 font-medium"
                        data-testid="button-sort-description"
                      >
                        Görev
                        {sortConfig.key === 'description' && (
                          sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                        )}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (sortConfig.key === 'createdAt') {
                            setSortConfig({ key: 'createdAt', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' });
                          } else {
                            setSortConfig({ key: 'createdAt', direction: 'desc' });
                          }
                        }}
                        className="justify-start h-8 px-2 font-medium"
                        data-testid="button-sort-createdat"
                      >
                        Oluşturulma
                        {sortConfig.key === 'createdAt' && (
                          sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                        )}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (sortConfig.key === 'status') {
                            setSortConfig({ key: 'status', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' });
                          } else {
                            setSortConfig({ key: 'status', direction: 'asc' });
                          }
                        }}
                        className="justify-start h-8 px-2 font-medium"
                        data-testid="button-sort-status"
                      >
                        Durum
                        {sortConfig.key === 'status' && (
                          sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                        )}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (sortConfig.key === 'priority') {
                            setSortConfig({ key: 'priority', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' });
                          } else {
                            setSortConfig({ key: 'priority', direction: 'desc' });
                          }
                        }}
                        className="justify-start h-8 px-2 font-medium"
                        data-testid="button-sort-priority"
                      >
                        Öncelik
                        {sortConfig.key === 'priority' && (
                          sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                        )}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (sortConfig.key === 'dueDate') {
                            setSortConfig({ key: 'dueDate', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' });
                          } else {
                            setSortConfig({ key: 'dueDate', direction: 'desc' });
                          }
                        }}
                        className="justify-start h-8 px-2 font-medium"
                        data-testid="button-sort-duedate"
                      >
                        Son Tarih
                        {sortConfig.key === 'dueDate' && (
                          sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-col gap-3 sm:gap-4">
                  {filteredTasks?.map((task) => {
                    const assigner = allUsers?.find(u => u.id === task.assignedById);
                    const branch = branches?.find(b => b.id === task.branchId);
                    
                    return (
                    <Link key={task.id} href={`/gorev-detay/${task.id}`} data-testid={`link-task-${task.id}`}>
                    <Card 
                      data-testid={`card-task-${task.id}`}
                      className="hover-elevate cursor-pointer"
                    >
                      <CardContent className="p-3">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-medium line-clamp-2 flex-1">{task.description}</h3>
                            <div className="flex flex-wrap gap-1 items-center">
                              <Badge
                                variant={
                                  task.status === "onaylandi"
                                    ? "default"
                                    : task.status === "reddedildi" || task.status === "gecikmiş" || task.status === "basarisiz"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className="text-xs whitespace-nowrap"
                                data-testid={`badge-task-status-${task.id}`}
                              >
                                {task.status === "beklemede" && "Beklemede"}
                                {task.status === "devam_ediyor" && "Devam"}
                                {task.status === "foto_bekleniyor" && "Foto"}
                                {task.status === "incelemede" && "İncele"}
                                {task.status === "onaylandi" && "Onaylı"}
                                {task.status === "reddedildi" && "Reddedildi"}
                                {task.status === "gecikmiş" && "Gecikmiş"}
                                {task.status === "basarisiz" && "Başarısız"}
                                {task.status === "ek_bilgi_bekleniyor" && "Ek Bilgi"}
                                {task.status === "tamamlandi" && "Tamamlandı"}
                                {task.status === "onay_bekliyor" && "Onay Bekliyor"}
                                {task.status === "cevap_bekliyor" && "Cevap Bekliyor"}
                                {task.status === "sure_uzatma_talebi" && "Süre Uzatma"}
                              </Badge>
                              {task.priority && (
                                <Badge
                                  variant={
                                    task.priority === "kritik" || task.priority === "acil"
                                      ? "destructive"
                                      : task.priority === "yüksek" || task.priority === "orta"
                                      ? "secondary"
                                      : "outline"
                                  }
                                  className="text-xs whitespace-nowrap"
                                  data-testid={`badge-task-priority-${task.id}`}
                                >
                                  {task.priority === "kritik" && "Kritik"}
                                  {task.priority === "acil" && "Acil"}
                                  {task.priority === "yüksek" && "Yüksek"}
                                  {task.priority === "orta" && "Orta"}
                                  {task.priority === "düşük" && "Düşük"}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-1 text-xs text-muted-foreground">
                            {task.assignedToId && (
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate text-[10px]">
                                  {allUsers?.find(u => u.id === task.assignedToId)?.firstName}
                                </p>
                                <p className="text-[9px] text-muted-foreground">Atanan</p>
                              </div>
                            )}
                            {assigner && (
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate text-[10px]">
                                  {assigner.firstName}
                                </p>
                                <p className="text-[9px] text-muted-foreground">Atayan</p>
                              </div>
                            )}
                            {branch && (
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate text-[10px]">{branch.name}</p>
                                <p className="text-[9px] text-muted-foreground">Şube</p>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between text-xs gap-2">
                            <p className="text-muted-foreground">
                              {new Date(task.createdAt!).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                            </p>
                            {task.status === "onaylandi" ? (
                              <RatingDisplay taskId={task.id} onRateClick={() => setRatingTaskId(task.id)} canRate={user?.id === task.assignedById} />
                            ) : !task.acknowledgedAt && task.status !== "basarisiz" ? (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <EyeOff className="h-3 w-3" />
                                <span>Görülmedi</span>
                              </div>
                            ) : task.acknowledgedAt ? (
                              <div className="flex items-center gap-1 text-success">
                                <Eye className="h-3 w-3" />
                                <span>Görüldü</span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    </Link>
                    );
                  })}
                {(!filteredTasks || filteredTasks.length === 0) && !isLoading && (
                  <EmptyStatePreset preset="tasks" />
                )}
                </div>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Rating Dialog */}
      <Dialog open={!!ratingTaskId} onOpenChange={(open) => !open && setRatingTaskId(null)}>
        <DialogContent data-testid="dialog-task-rating">
          <DialogHeader>
            <DialogTitle>Görevi Puanla</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">Atayan kişi olarak bu görevi değerlendirin</p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-3">Puanını seç (1-5)</p>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    onClick={() => setRatingScore(score)}
                    className="p-2 hover-elevate"
                    data-testid={`button-rating-star-${score}`}
                  >
                    <Star
                      className={`h-6 w-6 ${score <= ratingScore ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (ratingTaskId && ratingScore > 0) {
                    apiRequest("POST", `/api/tasks/${ratingTaskId}/rate`, { score: ratingScore })
                      .then(() => {
                        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
                        toast({ title: "Başarılı", description: "Görev değerlendirildi" });
                        setRatingTaskId(null);
                        setRatingScore(0);
                      })
                      .catch(() => {
                        toast({ title: "Hata", description: "Değerlendirme yapılamadı", variant: "destructive" });
                      });
                  }
                }}
                disabled={ratingScore === 0}
                className="flex-1"
                data-testid="button-confirm-rating"
              >
                Onayla
              </Button>
              <Button
                onClick={() => setRatingTaskId(null)}
                variant="outline"
                className="flex-1"
                data-testid="button-cancel-rating"
              >
                İptal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Toplu Görev Atama</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Görev Açıklaması</label>
              <Textarea
                placeholder="Görev açıklaması..."
                value={bulkDescription}
                onChange={(e) => setBulkDescription(e.target.value)}
                className="min-h-[60px]"
                data-testid="input-bulk-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1">Öncelik</label>
                <Select value={bulkPriority} onValueChange={setBulkPriority}>
                  <SelectTrigger data-testid="select-bulk-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="düşük">Düşük</SelectItem>
                    <SelectItem value="orta">Orta</SelectItem>
                    <SelectItem value="yüksek">Yüksek</SelectItem>
                    <SelectItem value="acil">Acil</SelectItem>
                    <SelectItem value="kritik">Kritik</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Son Tarih</label>
                <Input
                  type="date"
                  value={bulkDueDate}
                  onChange={(e) => setBulkDueDate(e.target.value)}
                  data-testid="input-bulk-due-date"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Hedef Rol</label>
              <Select value={bulkRoleFilter} onValueChange={setBulkRoleFilter}>
                <SelectTrigger data-testid="select-bulk-role">
                  <SelectValue placeholder="Rol seçin..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stajyer">Stajyer</SelectItem>
                  <SelectItem value="bar_buddy">Bar Buddy</SelectItem>
                  <SelectItem value="barista">Barista</SelectItem>
                  <SelectItem value="supervisor_buddy">Supervisor Buddy</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="mudur">Müdür</SelectItem>
                  <SelectItem value="yatirimci_branch">Yatırımcı</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Hedef Şubeler (İsteğe Bağlı)</label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-md">
                {branches?.map((branch) => (
                  <Badge
                    key={branch.id}
                    variant={bulkBranchIds.includes(branch.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      setBulkBranchIds(prev =>
                        prev.includes(branch.id)
                          ? prev.filter(id => id !== branch.id)
                          : [...prev, branch.id]
                      );
                    }}
                    data-testid={`badge-bulk-branch-${branch.id}`}
                  >
                    {branch.name}
                  </Badge>
                ))}
              </div>
              {bulkBranchIds.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {bulkBranchIds.length} şube seçili
                </p>
              )}
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium block mb-1">Zamanlanmış İletim (İsteğe Bağlı)</label>
              <p className="text-xs text-muted-foreground mb-2">
                Belirtilen tarih ve saatte görevler otomatik olarak iletilecektir.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="date"
                  value={bulkScheduledDate}
                  onChange={(e) => setBulkScheduledDate(e.target.value)}
                  data-testid="input-bulk-scheduled-date"
                />
                <Input
                  type="time"
                  value={bulkScheduledTime}
                  onChange={(e) => setBulkScheduledTime(e.target.value)}
                  data-testid="input-bulk-scheduled-time"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>İptal</Button>
            <Button
              onClick={() => {
                if (!bulkDescription.trim() || !bulkRoleFilter) {
                  toast({ title: "Hata", description: "Açıklama ve hedef rol zorunludur", variant: "destructive" });
                  return;
                }
                const payload: any = {
                  description: bulkDescription,
                  priority: bulkPriority,
                  roleFilter: bulkRoleFilter,
                };
                if (bulkDueDate) payload.dueDate = new Date(bulkDueDate).toISOString();
                if (bulkBranchIds.length > 0) payload.branchIds = bulkBranchIds;
                if (bulkScheduledDate && bulkScheduledTime) {
                  payload.scheduledDeliveryAt = new Date(`${bulkScheduledDate}T${bulkScheduledTime}`).toISOString();
                }
                bulkAssignMutation.mutate(payload);
              }}
              disabled={bulkAssignMutation.isPending || !bulkDescription.trim() || !bulkRoleFilter}
              data-testid="button-bulk-create"
            >
              <Send className="h-4 w-4 mr-2" />
              {bulkAssignMutation.isPending ? "Oluşturuluyor..." : "Toplu Görev Oluştur"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showFairnessDialog} onOpenChange={setShowFairnessDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-fairness-title">Görev Dağılım Raporu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {[7, 30, 90].map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant={fairnessPeriod === d ? "default" : "outline"}
                  onClick={() => setFairnessPeriod(d)}
                  data-testid={`button-fairness-period-${d}`}
                >
                  {d} Gün
                </Button>
              ))}
            </div>

            {isFairnessLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : fairnessData?.report?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-fairness-empty">
                Bu dönemde görev verisi bulunamadı.
              </p>
            ) : (
              fairnessData?.report?.map((group: any) => {
                const isFair = group.spread <= Math.max(group.avgTasks * 0.3, 2);
                return (
                  <Card key={group.role} data-testid={`card-fairness-role-${group.role}`}>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-sm font-medium capitalize">
                        {group.role}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={isFair ? "secondary" : "destructive"} data-testid={`badge-fairness-${group.role}`}>
                          {isFair ? "Dengeli" : "Dengesiz"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Ort: {group.avgTasks} | Fark: {group.spread}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {group.members.map((member: any) => {
                        const barWidth = group.maxTasks > 0 ? (member.totalTasks / group.maxTasks) * 100 : 0;
                        const isAboveAvg = member.totalTasks > group.avgTasks * 1.2;
                        const isBelowAvg = member.totalTasks < group.avgTasks * 0.8;
                        return (
                          <div key={member.userId} className="space-y-1" data-testid={`row-fairness-member-${member.userId}`}>
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-medium truncate max-w-[140px]">{member.name || "İsimsiz"}</span>
                              <div className="flex items-center gap-3 text-muted-foreground">
                                <span>Toplam: <span className="font-semibold text-foreground">{member.totalTasks}</span></span>
                                <span>Tamamlanan: {member.completedTasks}</span>
                                {member.overdueCount > 0 && (
                                  <span className="text-destructive">Gecikmiş: {member.overdueCount}</span>
                                )}
                              </div>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isAboveAvg ? "bg-destructive" : isBelowAvg ? "bg-yellow-500" : "bg-primary"
                                }`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RatingDisplay({ taskId, onRateClick, canRate }: { taskId: number; onRateClick: () => void; canRate: boolean }) {
  const { data: taskRating } = useQuery<{ rawRating?: number }>({
    queryKey: [`/api/tasks/${taskId}/rating`],
  });

  const rating = taskRating?.rawRating;
  if (rating) {
    return (
      <div className="flex items-center gap-1">
        <span className="font-medium text-[10px]">{rating}/5</span>
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-2.5 w-2.5 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
          />
        ))}
      </div>
    );
  }

  if (!canRate) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  return (
    <Button
      onClick={(e) => {
        e.stopPropagation();
        onRateClick();
      }}
      size="sm"
      variant="outline"
      className="h-6 px-2 text-[10px]"
      data-testid="button-rate-now"
    >
      Puanla
    </Button>
  );
}
