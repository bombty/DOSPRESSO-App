import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole } from "@shared/schema";
import { offlineErrorHandler } from "@/hooks/useOfflineMutation";
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
import { Switch } from "@/components/ui/switch";
import { type Task, type Branch, type User, isHQRole as checkIsHQRole, type TaskStatus, type TaskPriority, hasPermission, type UserRoleType } from "@shared/schema";
import { Check, Clock, AlertCircle, CheckCircle2, PlayCircle, Search, X, Calendar, ChevronDown, Filter, XCircle, ArrowUp, ArrowDown, Eye, EyeOff, Building2, Send, Star, BarChart3, Plus, Repeat, Camera, Trash2, Edit, ClipboardList, ListChecks, Settings2 } from "lucide-react";
import { format } from "date-fns";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";
import { CompactKPIStrip } from "@/components/shared/UnifiedKPI";
import { useModuleEnabled } from "@/hooks/use-module-flags";

const TEMPLATE_ROLES = ["admin", "ceo", "cgo", "coach", "trainer", "mudur", "supervisor"];

export default function Tasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [mainTab, setMainTab] = useState("bana-atanan");
  const [activeTab, setActiveTab] = useState("all");
  const { isEnabled: isBranchTasksEnabled } = useModuleEnabled("sube_gorevleri");
  
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
  const [showBulkArchiveDialog, setShowBulkArchiveDialog] = useState(false);
  const [selectedArchiveIds, setSelectedArchiveIds] = useState<number[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);

  const { data: tasks, isLoading, isError, refetch } = useQuery<Task[]>({
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

  const archivableTasks = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const terminalStates = ['onaylandi', 'basarisiz', 'iptal_edildi'];
    return overdueTasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < thirtyDaysAgo && !terminalStates.includes(t.status)
    );
  }, [overdueTasks]);


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



  const bulkArchiveMutation = useMutation({
    mutationFn: async (data: { taskIds: number[]; reason: string }) => {
      const response = await apiRequest("POST", "/api/tasks/bulk-archive", data);
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setShowBulkArchiveDialog(false);
      setSelectedArchiveIds([]);
      toast({ title: "Başarılı", description: `${data.archivedCount} görev arşivlendi` });
    },
    onError: (error: any, variables: any) => {
      offlineErrorHandler(error, { url: "/api/tasks/bulk-archive", method: "POST", body: variables }, "Toplu arşivleme", toast) ||
        toast({ title: "Hata", description: error.message || "Toplu arşivleme başarısız", variant: "destructive" });
    },
  });

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
    onError: (error: any, variables: any) => {
      offlineErrorHandler(error, { url: "/api/tasks/bulk", method: "POST", body: variables }, "Toplu görev oluşturma", toast) ||
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
      const query = searchQuery.toLocaleLowerCase('tr-TR');
      filtered = filtered.filter(task => 
        task.description?.toLocaleLowerCase('tr-TR').includes(query)
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
    } else if (activeTab === "all" && !showCompleted && !filterStatus) {
      const completedStatuses = ['onaylandi', 'iptal_edildi', 'reddedildi'];
      filtered = filtered.filter(t => !completedStatuses.includes(t.status as string));
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
  }, [tasks, searchQuery, activeTab, user, filterBranchId, filterAssigneeId, filterStatus, filterPriority, filterDateFrom, filterDateTo, sortConfig, assignmentFilter, showCompleted]);

  
  const canManageTemplates = user?.role ? TEMPLATE_ROLES.includes(user.role) : false;

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 pb-24 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold" data-testid="text-page-title">Görevler</h1>
        <div className="flex flex-wrap gap-2 items-center">
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
        {canAssignTasks && mainTab === "bana-atanan" && (
          <QuickTaskModal trigger={<Button size="sm" data-testid="button-add-task">Yeni Görev Ekle</Button>} />
        )}
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
        <div className="w-full overflow-x-auto">
          <TabsList data-testid="tabs-main-nav">
            <TabsTrigger value="bana-atanan" data-testid="tab-bana-atanan">
              <ClipboardList className="h-4 w-4 mr-1.5" />
              Bana Atanan
            </TabsTrigger>
            {isBranchTasksEnabled && (
              <TabsTrigger value="sube-gorevleri" data-testid="tab-sube-gorevleri">
                <ListChecks className="h-4 w-4 mr-1.5" />
                Şube Görevleri
              </TabsTrigger>
            )}
            {isBranchTasksEnabled && canManageTemplates && (
              <TabsTrigger value="tekrarlayan" data-testid="tab-tekrarlayan">
                <Settings2 className="h-4 w-4 mr-1.5" />
                Tekrarlayan Yönetimi
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="bana-atanan" className="space-y-4 mt-4">

      {/* Assignment Direction Filter + Branch Selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible">
        <Button
          variant={assignmentFilter === "bana_atanan" ? "default" : "outline"}
          size="sm"
          className="whitespace-nowrap flex-shrink-0"
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
            className="whitespace-nowrap flex-shrink-0"
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
                className="whitespace-nowrap flex-shrink-0"
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
                {(Array.isArray(branches) ? branches : []).map((branch) => (
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

      <CompactKPIStrip
        items={[
          ...(overdueTasks.length > 0 ? [{
            label: "Gecikmiş",
            value: overdueTasks.length,
            icon: <AlertCircle className="h-4 w-4 text-destructive" />,
            color: "danger" as const,
            active: filterStatus === 'gecikmiş',
            onClick: () => { setFilterStatus(filterStatus === 'gecikmiş' ? null : 'gecikmiş'); setFilterOpen(false); },
            testId: "card-stat-overdue",
          }] : []),
          { label: "Bekleyen", value: stats.beklemede, icon: <Clock className="h-4 w-4 text-warning" />, color: "warning" as const, active: filterStatus === 'beklemede', onClick: () => { setFilterStatus(filterStatus === 'beklemede' ? null : 'beklemede'); setFilterOpen(false); }, testId: "card-stat-beklemede" },
          { label: "Devam Eden", value: stats.devamEden, icon: <PlayCircle className="h-4 w-4 text-primary" />, color: "info" as const, active: filterStatus === 'devam_ediyor', onClick: () => { setFilterStatus(filterStatus === 'devam_ediyor' ? null : 'devam_ediyor'); setFilterOpen(false); }, testId: "card-stat-devam-eden" },
          { label: "Tamamlanmayan", value: stats.tamamlanmayan, icon: <AlertCircle className="h-4 w-4 text-destructive" />, color: "danger" as const, active: filterStatus === 'reddedildi', onClick: () => { setFilterStatus(filterStatus === 'reddedildi' ? null : 'reddedildi'); setFilterOpen(false); }, testId: "card-stat-tamamlanmayan" },
          { label: "Tamamlanan", value: stats.tamamlanan, icon: <CheckCircle2 className="h-4 w-4 text-success" />, color: "success" as const, active: filterStatus === 'onaylandi', onClick: () => { setFilterStatus(filterStatus === 'onaylandi' ? null : 'onaylandi'); setFilterOpen(false); }, testId: "card-stat-tamamlanan" },
        ]}
        desktopGridClass="md:grid-cols-2 lg:grid-cols-3"
      />

      {overdueTasks.length > 0 && archivableTasks.length > 0 && (user?.role === 'supervisor' || isHQRole(user?.role as any)) && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="destructive"
            data-testid="button-bulk-archive"
            onClick={() => {
              setSelectedArchiveIds(archivableTasks.map(t => t.id));
              setShowBulkArchiveDialog(true);
            }}
          >
            <XCircle className="h-3 w-3 mr-1" />
            Toplu Arşivle ({archivableTasks.length})
          </Button>
        </div>
      )}

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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="sm:col-span-2">
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
          <div className="w-full sm:w-auto overflow-x-auto">
            <TabsList data-testid="tabs-task-filter">
              <TabsTrigger value="all" data-testid="tab-all">Tümü</TabsTrigger>
              <TabsTrigger value="onay_bekleyen" data-testid="tab-pending-approval">Onay Bekleyen</TabsTrigger>
              {isHQ && <TabsTrigger value="zamanlanmis" data-testid="tab-scheduled">Zamanlanmış</TabsTrigger>}
            </TabsList>
          </div>
          {activeTab === "all" && !filterStatus && (
            <Button
              variant={showCompleted ? "secondary" : "outline"}
              size="sm"
              className="w-full sm:w-auto whitespace-nowrap"
              onClick={() => setShowCompleted(!showCompleted)}
              data-testid="button-toggle-completed"
            >
              {showCompleted ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {showCompleted ? "Tamamlananları Gizle" : "Tamamlananları Göster"}
            </Button>
          )}
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
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

                <div className="flex flex-col gap-2 sm:gap-4">
                  {filteredTasks?.map((task) => {
                    const assigner = allUsers?.find(u => u.id === task.assignedById);
                    const branch = branches?.find(b => b.id === task.branchId);
                    
                    return (
                    <Link key={task.id} href={`/gorev-detay/${task.id}`} data-testid={`link-task-${task.id}`}>
                    <Card 
                      data-testid={`card-task-${task.id}`}
                      className="hover-elevate cursor-pointer"
                    >
                      <CardContent className="p-2 sm:p-3">
                        <div className="flex flex-col gap-1.5 sm:gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-xs sm:text-sm font-medium line-clamp-1 sm:line-clamp-2 flex-1">{task.description}</h3>
                            <div className="flex flex-wrap gap-1 items-center shrink-0">
                              <Badge
                                variant={
                                  task.status === "onaylandi"
                                    ? "default"
                                    : task.status === "reddedildi" || task.status === "gecikmiş" || task.status === "basarisiz"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className="text-[10px] sm:text-xs whitespace-nowrap"
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
                                  className="text-[10px] sm:text-xs whitespace-nowrap"
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
                          
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-1 text-xs text-muted-foreground">
                            {task.assignedToId && (
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate text-[10px] sm:text-xs">
                                  {allUsers?.find(u => u.id === task.assignedToId)?.firstName}
                                </p>
                                <p className="text-[9px] sm:text-[11px] text-muted-foreground">Atanan</p>
                              </div>
                            )}
                            {assigner && (
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate text-[10px] sm:text-xs">
                                  {assigner.firstName}
                                </p>
                                <p className="text-[9px] sm:text-[11px] text-muted-foreground">Atayan</p>
                              </div>
                            )}
                            {branch && (
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate text-[10px] sm:text-xs">{branch.name}</p>
                                <p className="text-[9px] sm:text-[11px] text-muted-foreground">Şube</p>
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

      <Dialog open={showBulkArchiveDialog} onOpenChange={setShowBulkArchiveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Toplu Görev Arşivleme</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              30+ gün gecikmiş <strong>{selectedArchiveIds.length}</strong> görev "iptal edildi" olarak işaretlenecek.
              Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowBulkArchiveDialog(false)}
                data-testid="button-cancel-archive"
              >
                Vazgec
              </Button>
              <Button
                variant="destructive"
                disabled={bulkArchiveMutation.isPending}
                onClick={() => {
                  bulkArchiveMutation.mutate({
                    taskIds: selectedArchiveIds,
                    reason: "Gecikmiş görev toplu temizliği",
                  });
                }}
                data-testid="button-confirm-archive"
              >
                {bulkArchiveMutation.isPending ? "Arsivleniyor..." : `${selectedArchiveIds.length} Gorevi Arsivle`}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowBulkDialog(false)} className="w-full sm:w-auto">İptal</Button>
            <Button
              className="w-full sm:w-auto"
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

        </TabsContent>

        {isBranchTasksEnabled && (
          <TabsContent value="sube-gorevleri" className="mt-4">
            <BranchTasksTab />
          </TabsContent>
        )}

        {isBranchTasksEnabled && canManageTemplates && (
          <TabsContent value="tekrarlayan" className="mt-4">
            <RecurringTasksManagementTab />
          </TabsContent>
        )}
      </Tabs>

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
                      {group.members?.map((member: any) => {
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

function BranchTasksTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const today = new Date().toISOString().slice(0, 10);

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/branch-tasks/stats", { date: today }],
    queryFn: () => fetch(`/api/branch-tasks/stats?date=${today}`).then(r => { if (!r.ok) return {}; return r.json(); }),
  });

  const { data: categories } = useQuery<any[]>({
    queryKey: ["/api/branch-tasks/categories"],
  });

  const { data: instances, isLoading } = useQuery<any[]>({
    queryKey: ["/api/branch-tasks/instances", { date: today }],
    queryFn: () => fetch(`/api/branch-tasks/instances?date=${today}`).then(r => { if (!r.ok) return []; return r.json(); }),
  });

  const claimMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/branch-tasks/instances/${id}/claim`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branch-tasks/instances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/branch-tasks/stats"] });
      toast({ title: "Görev sahiplenildi" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const unclaimMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/branch-tasks/instances/${id}/unclaim`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branch-tasks/instances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/branch-tasks/stats"] });
      toast({ title: "Görev bırakıldı" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const [completingId, setCompletingId] = useState<number | null>(null);
  const [completionNote, setCompletionNote] = useState("");

  const completeMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note?: string }) =>
      apiRequest("POST", `/api/branch-tasks/instances/${id}/complete`, { completionNote: note || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branch-tasks/instances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/branch-tasks/stats"] });
      setCompletingId(null);
      setCompletionNote("");
      toast({ title: "Görev tamamlandı" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    if (!instances) return [];
    if (categoryFilter === "all") return instances;
    return instances.filter((i: any) => i.category === categoryFilter);
  }, [instances, categoryFilter]);

  const categoryColors: Record<string, string> = {
    temizlik: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    bakim: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    stok: "bg-green-500/10 text-green-700 dark:text-green-400",
    genel: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  };

  return (
    <div className="space-y-4">
      <CompactKPIStrip
        items={[
          { label: "Bekleyen", value: stats?.pending ?? 0, icon: <Clock className="h-4 w-4 text-warning" />, color: "warning" as const, testId: "card-branch-stat-pending" },
          { label: "Sahiplenilmiş", value: stats?.claimed ?? 0, icon: <PlayCircle className="h-4 w-4 text-primary" />, color: "info" as const, testId: "card-branch-stat-claimed" },
          { label: "Tamamlanan", value: stats?.completed ?? 0, icon: <CheckCircle2 className="h-4 w-4 text-success" />, color: "success" as const, testId: "card-branch-stat-completed" },
          { label: "Gecikmiş", value: stats?.overdue ?? 0, icon: <AlertCircle className="h-4 w-4 text-destructive" />, color: "danger" as const, testId: "card-branch-stat-overdue" },
        ]}
        desktopGridClass="md:grid-cols-2 lg:grid-cols-4"
      />

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible">
        <Button variant={categoryFilter === "all" ? "default" : "outline"} size="sm" className="flex-shrink-0" onClick={() => setCategoryFilter("all")} data-testid="chip-category-all">Tümü</Button>
        {categories?.map((cat: any) => (
          <Button key={cat.key} variant={categoryFilter === cat.key ? "default" : "outline"} size="sm" className="flex-shrink-0" onClick={() => setCategoryFilter(cat.key)} data-testid={`chip-category-${cat.key}`}>
            {cat.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <ListSkeleton count={4} variant="row" showHeader={false} />
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Bugün için şube görevi bulunmuyor.</CardContent></Card>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((task: any) => {
            const isMyClaim = task.claimed_by_user_id === user?.id;
            const isMyAssignment = task.assigned_to_user_id === user?.id;
            return (
              <Card key={task.id} data-testid={`card-branch-task-${task.id}`}>
                <CardContent className="p-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${categoryColors[task.category] || ""}`} data-testid={`badge-category-${task.id}`}>
                          {categories?.find((c: any) => c.key === task.category)?.label || task.category}
                        </Badge>
                        <span className="font-medium text-sm truncate">{task.title}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {task.is_overdue && task.status !== "completed" && (
                          <Badge variant="destructive" className="text-[10px]" data-testid={`badge-overdue-${task.id}`}>Gecikmiş</Badge>
                        )}
                        {task.status === "completed" && (
                          <Badge variant="default" className="text-[10px]" data-testid={`badge-completed-${task.id}`}>
                            <Check className="h-3 w-3 mr-0.5" />Tamamlandı
                          </Badge>
                        )}
                      </div>
                    </div>

                    {task.description && <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>}

                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-muted-foreground">
                        {task.status === "completed" && task.completed_first && (
                          <span>Tamamlayan: {task.completed_first} {task.completed_last}</span>
                        )}
                        {task.status === "claimed" && task.claimed_first && (
                          <span>Sahiplenen: {task.claimed_first} {task.claimed_last}</span>
                        )}
                        {task.status === "pending" && task.assigned_first && (
                          <span>Atanan: {task.assigned_first} {task.assigned_last}</span>
                        )}
                        {task.status === "pending" && !task.assigned_to_user_id && (
                          <span className="text-muted-foreground">Açık görev</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {task.status === "pending" && (!task.assigned_to_user_id || isMyAssignment) && (
                          <Button size="sm" onClick={() => claimMutation.mutate(task.id)} disabled={claimMutation.isPending} data-testid={`button-claim-${task.id}`}>
                            Sahiplen
                          </Button>
                        )}
                        {task.status === "claimed" && isMyClaim && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => unclaimMutation.mutate(task.id)} disabled={unclaimMutation.isPending} data-testid={`button-unclaim-${task.id}`}>
                              Bırak
                            </Button>
                            <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => setCompletingId(task.id)} data-testid={`button-complete-${task.id}`}>
                              Tamamla
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!completingId} onOpenChange={(open) => { if (!open) { setCompletingId(null); setCompletionNote(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Görevi Tamamla</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Textarea placeholder="Not ekle (isteğe bağlı)..." value={completionNote} onChange={(e) => setCompletionNote(e.target.value)} data-testid="input-completion-note" />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setCompletingId(null); setCompletionNote(""); }}>İptal</Button>
              <Button onClick={() => { if (completingId) completeMutation.mutate({ id: completingId, note: completionNote }); }} disabled={completeMutation.isPending} data-testid="button-confirm-complete">
                {completeMutation.isPending ? "Tamamlanıyor..." : "Tamamla"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RecurringTasksManagementTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isHQ = user?.role && checkIsHQRole(user.role as any);

  const { data: templates, isLoading } = useQuery<any[]>({
    queryKey: ["/api/branch-tasks/templates"],
  });

  const { data: categories } = useQuery<any[]>({
    queryKey: ["/api/branch-tasks/categories"],
  });

  const { data: branches } = useQuery<any[]>({
    queryKey: ["/api/branches"],
  });

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("genel");
  const [formRecurrence, setFormRecurrence] = useState("daily");
  const [formDayOfWeek, setFormDayOfWeek] = useState<number>(1);
  const [formDayOfMonth, setFormDayOfMonth] = useState<number>(1);
  const [formSpecificDate, setFormSpecificDate] = useState("");
  const [formPhotoRequired, setFormPhotoRequired] = useState(false);
  const [formBranchId, setFormBranchId] = useState<string>("all");

  const [overrideTemplateId, setOverrideTemplateId] = useState<number | null>(null);

  const { data: overrides } = useQuery<any[]>({
    queryKey: ["/api/branch-tasks/templates", overrideTemplateId, "overrides"],
    queryFn: () => fetch(`/api/branch-tasks/templates/${overrideTemplateId}/overrides`).then(r => { if (!r.ok) return []; return r.json(); }),
    enabled: !!overrideTemplateId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/branch-tasks/templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branch-tasks/templates"] });
      resetForm();
      toast({ title: "Şablon oluşturuldu" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/branch-tasks/templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branch-tasks/templates"] });
      resetForm();
      toast({ title: "Şablon güncellendi" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/branch-tasks/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branch-tasks/templates"] });
      toast({ title: "Şablon silindi" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const createOverrideMutation = useMutation({
    mutationFn: ({ templateId, branchId, reason }: { templateId: number; branchId: number; reason?: string }) =>
      apiRequest("POST", `/api/branch-tasks/templates/${templateId}/overrides`, { branchId, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branch-tasks/templates", overrideTemplateId, "overrides"] });
      toast({ title: "Şube için devre dışı bırakıldı" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const deleteOverrideMutation = useMutation({
    mutationFn: (overrideId: number) => apiRequest("DELETE", `/api/branch-tasks/overrides/${overrideId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branch-tasks/templates", overrideTemplateId, "overrides"] });
      toast({ title: "Şube için tekrar aktif edildi" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  function resetForm() {
    setShowDialog(false);
    setEditingId(null);
    setFormTitle("");
    setFormDescription("");
    setFormCategory("genel");
    setFormRecurrence("daily");
    setFormDayOfWeek(1);
    setFormDayOfMonth(1);
    setFormSpecificDate("");
    setFormPhotoRequired(false);
    setFormBranchId("all");
  }

  function openEdit(t: any) {
    setEditingId(t.id);
    setFormTitle(t.title);
    setFormDescription(t.description || "");
    setFormCategory(t.category);
    setFormRecurrence(t.recurrence_type);
    setFormDayOfWeek(t.day_of_week ?? 1);
    setFormDayOfMonth(t.day_of_month ?? 1);
    setFormSpecificDate(t.specific_date || "");
    setFormPhotoRequired(t.photo_required || false);
    setFormBranchId(t.branch_id ? String(t.branch_id) : "all");
    setShowDialog(true);
  }

  function handleSubmit() {
    if (!formTitle.trim()) {
      toast({ title: "Hata", description: "Başlık zorunludur", variant: "destructive" });
      return;
    }
    const data: any = {
      title: formTitle,
      description: formDescription || null,
      category: formCategory,
      recurrenceType: formRecurrence,
      photoRequired: formPhotoRequired,
      branchId: formBranchId === "all" ? null : Number(formBranchId),
    };
    if (formRecurrence === "weekly") data.dayOfWeek = formDayOfWeek;
    if (formRecurrence === "monthly") data.dayOfMonth = formDayOfMonth;
    if (formRecurrence === "once") data.specificDate = formSpecificDate;

    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  }

  const recurrenceLabel = (t: any) => {
    switch (t.recurrence_type) {
      case "daily": return "Her gün";
      case "weekly": {
        const days = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
        return `Her ${days[t.day_of_week] || ""}`;
      }
      case "monthly": return `Her ayın ${t.day_of_month}'i`;
      case "once": return `Tek seferlik: ${t.specific_date || ""}`;
      default: return t.recurrence_type;
    }
  };

  const categoryColors: Record<string, string> = {
    temizlik: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    bakim: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    stok: "bg-green-500/10 text-green-700 dark:text-green-400",
    genel: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  };

  const grouped = useMemo(() => {
    if (!templates) return {};
    const g: Record<string, any[]> = {};
    templates.forEach((t: any) => {
      const cat = t.category || "genel";
      if (!g[cat]) g[cat] = [];
      g[cat].push(t);
    });
    return g;
  }, [templates]);

  const dayOptions = [
    { value: 0, label: "Pazar" }, { value: 1, label: "Pazartesi" }, { value: 2, label: "Salı" },
    { value: 3, label: "Çarşamba" }, { value: 4, label: "Perşembe" }, { value: 5, label: "Cuma" }, { value: 6, label: "Cumartesi" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold" data-testid="text-recurring-title">Tekrarlayan Görev Şablonları</h2>
        <Button size="sm" onClick={() => { resetForm(); setShowDialog(true); }} data-testid="button-new-template">
          <Plus className="h-4 w-4 mr-1" />Yeni Şablon
        </Button>
      </div>

      {isLoading ? (
        <ListSkeleton count={3} variant="row" showHeader={false} />
      ) : Object.keys(grouped).length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Henüz şablon oluşturulmamış.</CardContent></Card>
      ) : (
        Object.entries(grouped).map(([catKey, items]) => (
          <div key={catKey} className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground capitalize" data-testid={`text-group-${catKey}`}>
              {categories?.find((c: any) => c.key === catKey)?.label || catKey}
            </h3>
            {(Array.isArray(items) ? items : []).map((t: any) => (
              <Card key={t.id} data-testid={`card-template-${t.id}`}>
                <CardContent className="p-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${categoryColors[t.category] || ""}`}>
                          {categories?.find((c: any) => c.key === t.category)?.label || t.category}
                        </Badge>
                        <span className="font-medium text-sm truncate">{t.title}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant="secondary" className="text-[10px]">
                          <Repeat className="h-3 w-3 mr-0.5" />{recurrenceLabel(t)}
                        </Badge>
                        {!t.branch_id && <Badge variant="outline" className="text-[10px]">HQ Şablonu</Badge>}
                      </div>
                    </div>
                    {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-muted-foreground">
                        {t.assigned_to_user_id ? "Atanmış" : "Açık görev"}
                        {t.photo_required && " | Fotoğraf gerekli"}
                      </div>
                      <div className="flex items-center gap-1">
                        {!t.branch_id && isHQ && (
                          <Button size="sm" variant="outline" onClick={() => setOverrideTemplateId(overrideTemplateId === t.id ? null : t.id)} data-testid={`button-overrides-${t.id}`}>
                            Şube Durumları
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => openEdit(t)} data-testid={`button-edit-template-${t.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(t.id)} data-testid={`button-delete-template-${t.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {overrideTemplateId === t.id && (
                      <div className="mt-2 border-t pt-2 space-y-2">
                        <p className="text-xs font-medium">Şube Durumları</p>
                        {branches?.map((b: any) => {
                          const ov = overrides?.find((o: any) => o.branch_id === b.id);
                          return (
                            <div key={b.id} className="flex items-center justify-between gap-2 text-xs" data-testid={`row-override-${b.id}`}>
                              <span>{b.name}</span>
                              <div className="flex items-center gap-2">
                                <span className={ov ? "text-destructive" : "text-success"}>{ov ? "Devre Dışı" : "Aktif"}</span>
                                <Switch
                                  checked={!ov}
                                  onCheckedChange={(checked) => {
                                    if (!checked) {
                                      createOverrideMutation.mutate({ templateId: t.id, branchId: b.id });
                                    } else if (ov) {
                                      deleteOverrideMutation.mutate(ov.id);
                                    }
                                  }}
                                  data-testid={`switch-override-${b.id}`}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))
      )}

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Şablonu Düzenle" : "Yeni Şablon Oluştur"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Başlık</label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Görev başlığı..." data-testid="input-template-title" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Açıklama (isteğe bağlı)</label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Açıklama..." data-testid="input-template-description" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1">Kategori</label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger data-testid="select-template-category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories?.map((c: any) => (
                      <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Tekrar Tipi</label>
                <Select value={formRecurrence} onValueChange={setFormRecurrence}>
                  <SelectTrigger data-testid="select-template-recurrence"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Günlük</SelectItem>
                    <SelectItem value="weekly">Haftalık</SelectItem>
                    <SelectItem value="monthly">Aylık</SelectItem>
                    <SelectItem value="once">Tek Seferlik</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formRecurrence === "weekly" && (
              <div>
                <label className="text-sm font-medium block mb-1">Gün</label>
                <Select value={String(formDayOfWeek)} onValueChange={(v) => setFormDayOfWeek(Number(v))}>
                  <SelectTrigger data-testid="select-template-dow"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {dayOptions.map((d) => (
                      <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {formRecurrence === "monthly" && (
              <div>
                <label className="text-sm font-medium block mb-1">Ayın Günü</label>
                <Input type="number" min={1} max={31} value={formDayOfMonth} onChange={(e) => setFormDayOfMonth(Number(e.target.value))} data-testid="input-template-dom" />
              </div>
            )}
            {formRecurrence === "once" && (
              <div>
                <label className="text-sm font-medium block mb-1">Tarih</label>
                <Input type="date" value={formSpecificDate} onChange={(e) => setFormSpecificDate(e.target.value)} data-testid="input-template-date" />
              </div>
            )}
            {isHQ && (
              <div>
                <label className="text-sm font-medium block mb-1">Şube</label>
                <Select value={formBranchId} onValueChange={setFormBranchId}>
                  <SelectTrigger data-testid="select-template-branch"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Şubeler (HQ)</SelectItem>
                    {branches?.map((b: any) => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={formPhotoRequired} onCheckedChange={setFormPhotoRequired} data-testid="switch-photo-required" />
              <label className="text-sm">Fotoğraf zorunlu</label>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={resetForm}>İptal</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-template">
              {(createMutation.isPending || updateMutation.isPending) ? "Kaydediliyor..." : editingId ? "Güncelle" : "Oluştur"}
            </Button>
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
