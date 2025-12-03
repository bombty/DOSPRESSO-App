import { useState, useMemo, useEffect } from "react";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema, type Task, type InsertTask, type Branch, type User, isHQRole as checkIsHQRole, type TaskStatus, type TaskPriority } from "@shared/schema";
import { Camera, Check, Clock, AlertCircle, CheckCircle2, PlayCircle, Search, X, ThumbsUp, ThumbsDown, Calendar, User as UserIcon, ChevronDown, Filter, XCircle, ArrowUp, ArrowDown } from "lucide-react";
import { format } from "date-fns";

export default function Tasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
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

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: branches, isLoading: isBranchesLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const form = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      description: "",
      status: "beklemede",
      branchId: user?.branchId || undefined,
      assignedToId: undefined,
    },
  });

  const selectedBranchId = form.watch("branchId");
  const isHQ = user?.role && checkIsHQRole(user.role as any);

  const overdueTasks = useMemo(() => {
    if (!tasks) return [];
    const now = new Date();
    return tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'onaylandi');
  }, [tasks]);

  const { data: employees, isLoading: isEmployeesLoading } = useQuery<User[]>({
    queryKey: ["/api/employees", isHQ ? { branchId: selectedBranchId } : {}],
    enabled: isHQ ? !!selectedBranchId : true,
  });

  const { data: allUsers, isLoading: isAllUsersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isHQ === true,
  });

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

  const createMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      await apiRequest("POST", "/api/tasks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Başarılı", description: "Görev oluşturuldu" });
      setIsAddDialogOpen(false);
      form.reset();
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
        description: "Görev oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async ({ taskId, photoUrl }: { taskId: number; photoUrl?: string }) => {
      await apiRequest(`/api/tasks/${taskId}/complete`, "POST", { photoUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Başarılı", description: "Görev tamamlandı olarak işaretlendi" });
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

  const startTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      await apiRequest(`/api/tasks/${taskId}/start`, "POST", {});
    },
    onSuccess: async (_data, taskId) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      const updatedTasks = queryClient.getQueryData<Task[]>(["/api/tasks"]);
      const updatedTask = updatedTasks?.find(t => t.id === taskId);
      if (updatedTask) {
        setSelectedTask(updatedTask);
      }
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
    if (!tasks) return { beklemede: 0, devamEden: 0, tamamlanmayan: 0, tamamlanan: 0 };
    
    return {
      beklemede: tasks.filter(t => t.status === 'beklemede').length,
      devamEden: tasks.filter(t => t.status === 'devam_ediyor').length,
      tamamlanmayan: tasks.filter(t => t.status === 'gecikmiş').length,
      tamamlanan: tasks.filter(t => t.status === 'onaylandi').length,
    };
  }, [tasks]);

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
    
    // Tab category filter
    if (activeTab !== 'all') {
      const categoryMap: Record<string, string> = {
        'acilis': 'açılış',
        'kapanis': 'kapanış',
        'gunluk': 'günlük kontrol'
      };
      const category = categoryMap[activeTab];
      if (category) {
        filtered = filtered.filter(task => 
          task.description?.toLowerCase().includes(category)
        );
      }
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
      let aVal: any, bVal: any;
      
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
  }, [tasks, searchQuery, activeTab, user, filterBranchId, filterAssigneeId, filterStatus, filterPriority, filterDateFrom, filterDateTo, sortConfig]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
      <h1 className="text-2xl font-semibold" data-testid="text-page-title">Açılış Çizelgeleri</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        {overdueTasks.length > 0 && (
          <Card data-testid="card-stat-overdue" className="border-destructive">
            <CardContent className="p-3">
              <div className="flex flex-col items-center text-center gap-1.5">
                <div className="h-4 w-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-500" />
                </div>
                <p className="text-xs text-muted-foreground">Gecikmiş</p>
                <p className="text-lg font-bold text-destructive">{overdueTasks.length}</p>
              </div>
            </CardContent>
          </Card>
        )}
        
        <Card data-testid="card-stat-beklemede">
          <CardContent className="p-3">
            <div className="flex flex-col items-center text-center gap-1.5">
              <div className="h-4 w-4 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
              </div>
              <p className="text-xs text-muted-foreground">Bekleyen</p>
              <p className="text-lg font-bold">{stats.beklemede}</p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-devam-eden">
          <CardContent className="p-3">
            <div className="flex flex-col items-center text-center gap-1.5">
              <div className="h-4 w-4 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <PlayCircle className="h-4 w-4 text-blue-600 dark:text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground">Devam Eden</p>
              <p className="text-lg font-bold">{stats.devamEden}</p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-tamamlanmayan">
          <CardContent className="p-3">
            <div className="flex flex-col items-center text-center gap-1.5">
              <div className="h-4 w-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-500" />
              </div>
              <p className="text-xs text-muted-foreground">Tamamlanmayan</p>
              <p className="text-lg font-bold">{stats.tamamlanmayan}</p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-tamamlanan">
          <CardContent className="p-3">
            <div className="flex flex-col items-center text-center gap-1.5">
              <div className="h-4 w-4 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
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
            <CardContent className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                  <label className="text-sm font-medium">Arama</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Görev ara..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-filter-search"
                    />
                  </div>
                </div>

                {isHQ && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                    <label className="text-sm font-medium">Şube</label>
                    <Select
                      value={filterBranchId?.toString() || "all"}
                      onValueChange={(value) => setFilterBranchId(value === "all" ? null : Number(value))}
                    >
                      <SelectTrigger data-testid="select-filter-branch">
                        <SelectValue placeholder="Tüm şubeler" />
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
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                  <label className="text-sm font-medium">Atanan Kişi</label>
                  <Select
                    value={filterAssigneeId || "all"}
                    onValueChange={(value) => setFilterAssigneeId(value === "all" ? null : value)}
                  >
                    <SelectTrigger data-testid="select-filter-assignee">
                      <SelectValue placeholder="Tüm kişiler" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm kişiler</SelectItem>
                      {(isHQ ? allUsers : employees)?.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.firstName} {user.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                  <label className="text-sm font-medium">Durum</label>
                  <Select
                    value={filterStatus || "all"}
                    onValueChange={(value) => setFilterStatus(value === "all" ? null : (value as TaskStatus))}
                  >
                    <SelectTrigger data-testid="select-filter-status">
                      <SelectValue placeholder="Tüm durumlar" />
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
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                  <label className="text-sm font-medium">Öncelik</label>
                  <Select
                    value={filterPriority || "all"}
                    onValueChange={(value) => setFilterPriority(value === "all" ? null : (value as TaskPriority))}
                  >
                    <SelectTrigger data-testid="select-filter-priority">
                      <SelectValue placeholder="Tüm öncelikler" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm öncelikler</SelectItem>
                      <SelectItem value="low">Düşük</SelectItem>
                      <SelectItem value="medium">Orta</SelectItem>
                      <SelectItem value="high">Yüksek</SelectItem>
                      <SelectItem value="critical">Kritik</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                  <label className="text-sm font-medium">Başlangıç Tarihi</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        data-testid="button-filter-date-from"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {filterDateFrom ? format(filterDateFrom, "dd/MM/yyyy") : "Seç"}
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
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                  <label className="text-sm font-medium">Bitiş Tarihi</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        data-testid="button-filter-date-to"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {filterDateTo ? format(filterDateTo, "dd/MM/yyyy") : "Seç"}
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
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
          <TabsList data-testid="tabs-task-filter">
            <TabsTrigger value="all" data-testid="tab-all">Tümü</TabsTrigger>
            <TabsTrigger value="acilis" data-testid="tab-acilis">Açılış</TabsTrigger>
            <TabsTrigger value="kapanis" data-testid="tab-kapanis">Kapanış</TabsTrigger>
            <TabsTrigger value="gunluk" data-testid="tab-gunluk">Günlük Kontrol</TabsTrigger>
          </TabsList>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-task">Yeni Çizelge Ekle</Button>
            </DialogTrigger>
              <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Görev Ekle</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Görev Açıklaması</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Görev açıklamasını girin" data-testid="input-task-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {isHQ && (
                  <FormField
                    control={form.control}
                    name="branchId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Şube</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(Number(value))}
                          value={field.value?.toString()}
                          disabled={isBranchesLoading}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-branch">
                              <SelectValue placeholder={isBranchesLoading ? "Yükleniyor..." : "Şube seçin"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {!branches || branches.length === 0 ? (
                              <SelectItem value="no-branches" disabled>
                                Henüz şube yok
                              </SelectItem>
                            ) : (
                              branches.map((branch) => (
                                <SelectItem key={branch.id} value={branch.id.toString()}>
                                  {branch.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="assignedToId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Atanan Kişi</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                        disabled={isEmployeesLoading || (isHQ && !selectedBranchId) || false}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-assignee">
                            <SelectValue 
                              placeholder={
                                isEmployeesLoading ? "Yükleniyor..." : 
                                (isHQ && !selectedBranchId) ? "Önce şube seçin" : 
                                "Çalışan seçin"
                              } 
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {!employees || employees.length === 0 ? (
                            <SelectItem value="no-employees" disabled>
                              Henüz çalışan yok
                            </SelectItem>
                          ) : (
                            employees.map((emp) => {
                              const roleLabels: Record<string, string> = {
                                admin: "Administrator",
                                muhasebe: "Muhasebe",
                                satinalma: "Satın Alma",
                                coach: "Koç",
                                teknik: "Teknik",
                                destek: "Destek",
                                fabrika: "Fabrika",
                                yatirimci_hq: "Yatırımcı HQ",
                                stajyer: "Stajyer",
                                bar_buddy: "Bar Buddy",
                                barista: "Barista",
                                supervisor_buddy: "Supervisor Buddy",
                                supervisor: "Supervisor",
                                yatirimci: "Yatırımcı",
                              };
                              return (
                                <SelectItem key={emp.id} value={emp.id}>
                                  {emp.firstName} {emp.lastName} - {roleLabels[emp.role] || emp.role}
                                </SelectItem>
                              );
                            })
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    İptal
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-task">
                    {createMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>

        {["all", "acilis", "kapanis", "gunluk"].map((tabValue) => (
          <TabsContent value="content" className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
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

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                  {filteredTasks?.map((task) => (
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
                                : task.status === "reddedildi" || task.status === "gecikmiş"
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
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(task.createdAt!).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
                <div className="grid grid-cols-2 gap-2 sm:gap-3 text-sm">
                  {selectedTask.dueDate && (
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Teslim Tarihi</p>
                        <p className="text-muted-foreground">
                          {new Date(selectedTask.dueDate).toLocaleDateString("tr-TR")}
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedTask.assignedToId && (
                    <div className="flex items-start gap-2">
                      <UserIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Atanan Kişi</p>
                        <p className="text-muted-foreground">ID: {selectedTask.assignedToId}</p>
                      </div>
                    </div>
                  )}
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

                {/* Action Buttons */}
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

                  {/* Photo Upload & Complete - For tasks in progress or waiting for photo */}
                  {(selectedTask.status === "devam_ediyor" || selectedTask.status === "foto_bekleniyor") && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                      <ObjectUploader
                        maxNumberOfFiles={1}
                        maxFileSize={10485760}
                        onGetUploadParameters={handleGetUploadParams}
                        onComplete={handleUploadComplete(selectedTask.id)}
                        buttonClassName="w-full"
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Fotoğraf Yükle ve Tamamla
                      </ObjectUploader>
                      <Button
                        variant="outline"
                        onClick={() => completeMutation.mutate({ taskId: selectedTask.id })}
                        disabled={completeMutation.isPending}
                        className="w-full"
                        data-testid="button-complete-task"
                      >
                        <Check className="mr-2 h-4 w-4" />
                        {completeMutation.isPending ? "Tamamlanıyor..." : "Fotoğrafsız Tamamla"}
                      </Button>
                    </div>
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
