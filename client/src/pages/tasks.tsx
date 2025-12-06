import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { isHQRole } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ObjectUploader } from "@/components/ObjectUploader";
import { QuickTaskModal } from "@/components/quick-task-modal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema, type Task, type InsertTask, type Branch, type User, isHQRole as checkIsHQRole, type TaskStatus, type TaskPriority } from "@shared/schema";
import { Camera, Check, Clock, AlertCircle, CheckCircle2, PlayCircle, Search, X, ThumbsUp, ThumbsDown, Calendar, User as UserIcon, ChevronDown, Filter, XCircle, ArrowUp, ArrowDown, Eye, EyeOff, Building2, Send, Star } from "lucide-react";
import { StarRating } from "@/components/star-rating";
import { format } from "date-fns";

export default function Tasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
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
  const [taskNotes, setTaskNotes] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState<"bana_atanan" | "atadiklarim" | null>(null);
  const [branchPopoverOpen, setBranchPopoverOpen] = useState(false);
  const tasksContainerRef = useRef<HTMLDivElement>(null);

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: branches, isLoading: isBranchesLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const isHQ = user?.role && checkIsHQRole(user.role as any);

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

  // Handle URL parameter for deep linking to specific task (from notifications)
  useEffect(() => {
    if (!tasks || tasks.length === 0) return;
    
    const params = new URLSearchParams(window.location.search);
    const taskIdParam = params.get('taskId');
    
    if (taskIdParam) {
      const taskId = parseInt(taskIdParam);
      const foundTask = tasks.find(t => t.id === taskId);
      if (foundTask) {
        setSelectedTask(foundTask);
        // Clear the URL parameter after opening the drawer
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [tasks]);

  // Auto-acknowledge task when drawer opens
  useEffect(() => {
    if (selectedTask && user) {
      const isAssignee = user.id === selectedTask.assignedToId;
      const canAutoAck = isAssignee && !selectedTask.acknowledgedAt && selectedTask.status !== "onaylandi" && selectedTask.status !== "basarisiz";
      
      if (canAutoAck) {
        acknowledgeMutation.mutate(selectedTask.id);
      }
    }
  }, [selectedTask?.id, user?.id]);

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


  const completeMutation = useMutation({
    mutationFn: async ({ taskId, photoUrl }: { taskId: number; photoUrl?: string }) => {
      await apiRequest("POST", `/api/tasks/${taskId}/complete`, { photoUrl, notes: taskNotes || undefined });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Başarılı", description: "Görev tamamlandı olarak işaretlendi" });
      setTaskNotes("");
      setSelectedTask(null);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Yetkisiz",
          description: "Oturumunuz sonlandı. Tekrar giriş yapılıyor...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Hata",
        description: "Görev tamamlanamadı",
        variant: "destructive",
      });
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (taskId: number) => {
      await apiRequest("PATCH", `/api/tasks/${taskId}/acknowledge`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: () => {
      // Silently fail - don't interrupt user
    },
  });

  const startTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      await apiRequest("POST", `/api/tasks/${taskId}/start`, { notes: taskNotes || undefined });
    },
    onSuccess: async (_data, taskId) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      const updatedTasks = queryClient.getQueryData<Task[]>(["/api/tasks"]);
      const updatedTask = updatedTasks?.find(t => t.id === taskId);
      if (updatedTask) {
        setSelectedTask(updatedTask);
      }
      setTaskNotes("");
      toast({ title: "Başarılı", description: "Görev başlatıldı" });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message || "Görev başlatılamadı",
        variant: "destructive",
      });
    },
  });

  const verifyTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      await apiRequest(`/api/tasks/${taskId}/verify`, "POST", {});
    },
    onSuccess: async (_data, taskId) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      const updatedTasks = queryClient.getQueryData<Task[]>(["/api/tasks"]);
      const updatedTask = updatedTasks?.find(t => t.id === taskId);
      if (updatedTask) {
        setSelectedTask(updatedTask);
      }
      toast({ title: "Başarılı", description: "Görev onaylandı" });
      setTimeout(() => setSelectedTask(null), 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message || "Görev onaylanamadı",
        variant: "destructive",
      });
    },
  });

  const rejectTaskMutation = useMutation({
    mutationFn: async ({ taskId, reason }: { taskId: number; reason?: string }) => {
      await apiRequest(`/api/tasks/${taskId}/reject`, "POST", { reason });
    },
    onSuccess: async (_data, { taskId }) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      const updatedTasks = queryClient.getQueryData<Task[]>(["/api/tasks"]);
      const updatedTask = updatedTasks?.find(t => t.id === taskId);
      if (updatedTask) {
        setSelectedTask(updatedTask);
      }
      toast({ title: "Başarılı", description: "Görev reddedildi" });
      setTimeout(() => setSelectedTask(null), 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message || "Görev reddedilemedi",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParams = async () => {
    const response = await fetch("/api/objects/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json();
    return { method: "PUT" as const, url: data.url };
  };

  const handleUploadComplete = (taskId: number) => (result: { successful: Array<{ uploadURL: string }> }) => {
    if (result.successful && result.successful[0]) {
      const photoUrl = result.successful[0].uploadURL;
      completeMutation.mutate({ taskId, photoUrl });
    }
  };

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
    <div className="flex flex-col gap-3 sm:gap-4 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">Tasklar</h1>
        <QuickTaskModal trigger={<Button size="sm" data-testid="button-add-task">Yeni Görev Ekle</Button>} />
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
            <PopoverContent className="w-56 p-2" align="start">
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
                    <SelectItem value="low">Düşük</SelectItem>
                    <SelectItem value="medium">Orta</SelectItem>
                    <SelectItem value="high">Yüksek</SelectItem>
                    <SelectItem value="critical">Kritik</SelectItem>
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

      <Tabs defaultValue="all" className="w-full flex flex-col gap-3 sm:gap-4" ref={tasksContainerRef}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
          <TabsList data-testid="tabs-task-filter">
            <TabsTrigger value="all" data-testid="tab-all">Tümü</TabsTrigger>
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

        {["all"].map((tabValue) => (
          <TabsContent key={tabValue} value={tabValue} className="w-full space-y-2 sm:space-y-3">
            {isLoading ? (
              <div className="flex flex-col gap-3 sm:gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
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
                    <Card 
                      key={task.id} 
                      data-testid={`card-task-${task.id}`}
                      className="hover-elevate cursor-pointer"
                      onClick={() => setSelectedTask(task)}
                    >
                      <CardContent className="p-3">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-medium line-clamp-2 flex-1">{task.description}</h3>
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
                            </Badge>
                          </div>
                          
                          {/* Tamamlanan görev bilgileri */}
                          {task.status === "onaylandi" && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                              {assigner && (
                                <span>Atayan: <span className="font-medium">{assigner.firstName} {assigner.lastName}</span></span>
                              )}
                              {branch && (
                                <span>({branch.name})</span>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              {new Date(task.createdAt!).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                            </p>
                            {!task.acknowledgedAt && task.status !== "onaylandi" && task.status !== "basarisiz" && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <EyeOff className="h-3 w-3" />
                                <span>Görülmedi</span>
                              </div>
                            )}
                            {task.acknowledgedAt && (
                              <div className="flex items-center gap-1 text-xs text-success">
                                <Eye className="h-3 w-3" />
                                <span>Görüldü</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    );
                  })}
                {(!filteredTasks || filteredTasks.length === 0) && !isLoading && (
                  <Card>
                    <CardContent className="py-8">
                      <p className="text-center text-muted-foreground">
                        Henüz görev yok. Yeni görev eklemek için yukarıdaki butonu kullanın.
                      </p>
                    </CardContent>
                  </Card>
                )}
                </div>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Task Detail Drawer */}
      <Drawer open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DrawerContent data-testid="drawer-task-detail">
          <div className="mx-auto w-full max-w-2xl">
            <DrawerHeader>
              <DrawerTitle className="text-left" data-testid="text-task-detail-title">
                Görev Detayları
              </DrawerTitle>
            </DrawerHeader>
            
            {selectedTask && (
              <div className="px-3 pb-4 grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
                {/* Task Description */}
                <div>
                  <h3 className="font-semibold text-lg mb-2">{selectedTask.description}</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={
                        selectedTask.status === "onaylandi"
                          ? "default"
                          : selectedTask.status === "reddedildi"
                          ? "destructive"
                          : "secondary"
                      }
                      data-testid="badge-task-detail-status"
                    >
                      {selectedTask.status === "beklemede" && "Beklemede"}
                      {selectedTask.status === "devam_ediyor" && "Devam Ediyor"}
                      {selectedTask.status === "foto_bekleniyor" && "Fotoğraf Bekleniyor"}
                      {selectedTask.status === "incelemede" && "İncelemede"}
                      {selectedTask.status === "onaylandi" && "Onaylandı"}
                      {selectedTask.status === "reddedildi" && "Reddedildi"}
                      {selectedTask.status === "gecikmiş" && "Gecikmiş"}
                    </Badge>
                    {selectedTask.priority && (
                      <Badge variant="outline" data-testid="badge-task-detail-priority">
                        Öncelik: {selectedTask.priority === "düşük" ? "Düşük" : selectedTask.priority === "orta" ? "Orta" : "Yüksek"}
                      </Badge>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Task Info */}
                <div className="space-y-3">
                  {selectedTask.dueDate && (
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Teslim Tarihi</p>
                        <p className="font-medium">
                          {new Date(selectedTask.dueDate).toLocaleDateString("tr-TR")}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Tüm görevler için ortak bilgiler */}
                  <div className="space-y-2">
                    {selectedTask.assignedToId && (
                      <div>
                        <p className="text-sm text-muted-foreground">Atanan Kişi</p>
                        <p className="font-medium">
                          {(() => {
                            const assignee = allUsers?.find(u => u.id === selectedTask.assignedToId);
                            return assignee ? `${assignee.firstName} ${assignee.lastName}` : "Bilinmiyor";
                          })()}
                        </p>
                      </div>
                    )}
                    {selectedTask.assignedById && (
                      <div>
                        <p className="text-sm text-muted-foreground">Atayan Kişi</p>
                        <p className="font-medium">
                          {(() => {
                            const assigner = allUsers?.find(u => u.id === selectedTask.assignedById);
                            return assigner ? `${assigner.firstName} ${assigner.lastName}` : "Bilinmiyor";
                          })()}
                        </p>
                      </div>
                    )}
                    {branches && selectedTask.branchId && (
                      <div>
                        <p className="text-sm text-muted-foreground">Şube</p>
                        <p className="font-medium">{branches.find(b => b.id === selectedTask.branchId)?.name || `Şube ${selectedTask.branchId}`}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Tamamlanan görev ek bilgileri */}
                  {selectedTask.status === "onaylandi" && (() => {
                    // eslint-disable-next-line react-hooks/rules-of-hooks
                    const { data: rating } = useQuery<any>({
                      queryKey: [`/api/tasks/${selectedTask.id}/rating`],
                    });
                    
                    return (
                      <div className="space-y-2 pt-2 border-t">
                        {selectedTask.completedAt && (
                          <div>
                            <p className="text-sm text-muted-foreground">Tamamlanan Tarih</p>
                            <p className="font-medium">{new Date(selectedTask.completedAt).toLocaleDateString("tr-TR")}</p>
                          </div>
                        )}
                        {rating && (
                          <div>
                            <p className="text-sm text-muted-foreground">Aldığı Puan</p>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{rating.score || 0}/5</span>
                              <div className="flex items-center gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${i < (rating.score || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Photo Preview */}
                {selectedTask.photoUrl && (
                  <>
                    <Separator />
                    <div>
                      <p className="font-medium mb-2">Yüklenen Fotoğraf</p>
                      <img
                        src={selectedTask.photoUrl}
                        alt="Görev fotoğrafı"
                        className="rounded-md w-full max-h-96 object-contain border"
                        data-testid="img-task-detail-photo"
                      />
                    </div>
                  </>
                )}

                {/* AI Analysis */}
                {selectedTask.aiAnalysis && (
                  <>
                    <Separator />
                    <div>
                      <p className="font-medium mb-2">AI Analizi</p>
                      <div className="bg-muted p-3 rounded-md grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                        {selectedTask.aiScore !== null && selectedTask.aiScore !== undefined && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Skor:</span>
                            <Badge variant={selectedTask.aiScore >= 70 ? "default" : "destructive"} data-testid="badge-ai-score">
                              {selectedTask.aiScore}/100
                            </Badge>
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-ai-analysis">
                          {selectedTask.aiAnalysis}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Notes Section - Quick action, no completion */}
                {(selectedTask.status === "beklemede" || selectedTask.status === "devam_ediyor") && (
                  <>
                    <Separator />
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">Not Ekle</label>
                      <Textarea
                        placeholder="Bu görev için bir not yazınız..."
                        value={taskNotes}
                        onChange={(e) => setTaskNotes(e.target.value)}
                        className="resize-none"
                        data-testid="textarea-task-notes"
                      />
                      <Button
                        onClick={() => {
                          if (taskNotes.trim()) {
                            apiRequest("POST", `/api/tasks/${selectedTask.id}/note`, { note: taskNotes }).then(() => {
                              queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
                              setTaskNotes("");
                              toast({ title: "Başarılı", description: "Not eklendi" });
                            }).catch(() => {
                              toast({ title: "Hata", description: "Not eklenemedi", variant: "destructive" });
                            });
                          }
                        }}
                        disabled={!taskNotes.trim()}
                        size="sm"
                        className="w-full"
                        data-testid="button-add-drawer-note"
                      >
                        <Send className="h-3 w-3 mr-2" />
                        Not Ekle
                      </Button>
                    </div>
                  </>
                )}

                {/* Photo Upload - Quick action only, not for completion */}
                {selectedTask.status === "devam_ediyor" && (
                  <>
                    <Separator />
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={10485760}
                      onGetUploadParameters={handleGetUploadParams}
                      onComplete={() => {
                        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
                        toast({ title: "Başarılı", description: "Fotoğraf yüklendi" });
                      }}
                      buttonClassName="w-full"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Fotoğraf Yükle
                    </ObjectUploader>
                  </>
                )}

                {/* Action Buttons - Start Task Only */}
                <Separator />
                <div className="flex flex-col gap-2">
                  {/* Start Task - Branch users can start tasks */}
                  {(selectedTask.status === "beklemede" || selectedTask.status === "reddedildi") && (
                    <Button
                      onClick={() => startTaskMutation.mutate(selectedTask.id)}
                      disabled={startTaskMutation.isPending}
                      className="w-full"
                      data-testid="button-start-task"
                    >
                      <PlayCircle className="mr-2 h-4 w-4" />
                      {startTaskMutation.isPending ? "Başlatılıyor..." : "Görevi Başlat"}
                    </Button>
                  )}

                  {/* HQ Actions - Verify and Reject */}
                  {isHQ && (selectedTask.status === "incelemede" || selectedTask.status === "foto_bekleniyor") && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => verifyTaskMutation.mutate(selectedTask.id)}
                        disabled={verifyTaskMutation.isPending}
                        className="flex-1"
                        variant="default"
                        data-testid="button-verify-task"
                      >
                        <ThumbsUp className="mr-2 h-4 w-4" />
                        {verifyTaskMutation.isPending ? "Onaylanıyor..." : "Onayla"}
                      </Button>
                      <Button
                        onClick={() => {
                          const reason = prompt("Red nedeni (opsiyonel):");
                          rejectTaskMutation.mutate({ taskId: selectedTask.id, reason: reason || undefined });
                        }}
                        disabled={rejectTaskMutation.isPending}
                        className="flex-1"
                        variant="destructive"
                        data-testid="button-reject-task"
                      >
                        <ThumbsDown className="mr-2 h-4 w-4" />
                        {rejectTaskMutation.isPending ? "Reddediliyor..." : "Reddet"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <DrawerFooter className="flex flex-row gap-2">
              <Link href={`/gorev-detay/${selectedTask?.id}`} className="flex-1">
                <Button variant="default" className="w-full" data-testid="button-goto-task-detail">
                  Detay Sayfası
                </Button>
              </Link>
              <DrawerClose asChild>
                <Button variant="outline" data-testid="button-close-drawer">
                  <X className="mr-2 h-4 w-4" />
                  Kapat
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
