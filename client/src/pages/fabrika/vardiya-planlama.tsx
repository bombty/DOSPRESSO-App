import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Plus,
  Trash2,
  Edit,
  Clock,
  Users,
  Package,
  Target,
  ChevronLeft,
  ChevronRight,
  Settings,
  CheckCircle2,
  AlertTriangle,
  Cog,
  Timer,
  Weight,
  Hash,
  ArrowLeft,
  ArrowRight,
  UserPlus,
  Factory,
  Search,
} from "lucide-react";

const SHIFT_TYPES = [
  { value: "sabah", label: "Sabah", time: "06:00 - 14:00", color: "bg-amber-500" },
  { value: "ogle", label: "Öğle", time: "10:00 - 18:00", color: "bg-orange-500" },
  { value: "aksam", label: "Akşam", time: "14:00 - 22:00", color: "bg-blue-500" },
  { value: "gece", label: "Gece", time: "22:00 - 06:00", color: "bg-indigo-700" },
];

const DAYS_TR = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function getWeekDates(offset: number): Date[] {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1 + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatDateTR(d: Date): string {
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

export default function FabrikaVardiyaPlanlama() {
  const { toast } = useToast();
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeTab, setActiveTab] = useState("takvim");
  const [isShiftDialogOpen, setIsShiftDialogOpen] = useState(false);
  const [isSpecDialogOpen, setIsSpecDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);
  const [editingSpec, setEditingSpec] = useState<any>(null);
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Wizard step state
  const [wizardStep, setWizardStep] = useState(1);

  // Shift form state (Step 1)
  const [shiftDate, setShiftDate] = useState("");
  const [shiftType, setShiftType] = useState("sabah");
  const [shiftStartTime, setShiftStartTime] = useState("06:00");
  const [shiftEndTime, setShiftEndTime] = useState("14:00");
  const [shiftNotes, setShiftNotes] = useState("");

  // Worker selection state (Step 2 - wizard)
  const [wizardWorkers, setWizardWorkers] = useState<Array<{ userId: string; userName: string; role: string; machineId: string }>>([]);
  const [staffSearch, setStaffSearch] = useState("");

  // Production plan state (Step 3 - wizard)
  const [wizardProductions, setWizardProductions] = useState<Array<{ productId: number; productName: string; machineId: number | null; machineName: string; batchSpecId: number | null; plannedBatchCount: number }>>([]);
  const [wizProdProductId, setWizProdProductId] = useState("");
  const [wizProdMachineId, setWizProdMachineId] = useState("");
  const [wizProdBatchCount, setWizProdBatchCount] = useState("1");

  // Worker assignment state (detail dialog)
  const [assignUserId, setAssignUserId] = useState("");
  const [assignMachineId, setAssignMachineId] = useState("");
  const [assignRole, setAssignRole] = useState("operator");

  // Production plan state (detail dialog)
  const [prodProductId, setProdProductId] = useState("");
  const [prodMachineId, setProdMachineId] = useState("");
  const [prodBatchCount, setProdBatchCount] = useState("1");

  // Batch spec form state
  const [specProductId, setSpecProductId] = useState("");
  const [specMachineId, setSpecMachineId] = useState("");
  const [specWeightKg, setSpecWeightKg] = useState("");
  const [specWeightUnit, setSpecWeightUnit] = useState("kg");
  const [specPieces, setSpecPieces] = useState("");
  const [specPieceWeight, setSpecPieceWeight] = useState("");
  const [specPieceWeightUnit, setSpecPieceWeightUnit] = useState("g");
  const [specDuration, setSpecDuration] = useState("");
  const [specDescription, setSpecDescription] = useState("");
  const [specRecipeId, setSpecRecipeId] = useState<number | null>(null);
  const [recipeInfo, setRecipeInfo] = useState<any>(null);
  const [loadingRecipe, setLoadingRecipe] = useState(false);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const startDate = formatDate(weekDates[0]);
  const endDate = formatDate(weekDates[6]);

  const { data: shifts = [], isLoading: loadingShifts } = useQuery<any[]>({
    queryKey: ["/api/factory-shifts", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/factory-shifts?startDate=${startDate}&endDate=${endDate}`);
      return res.json();
    },
  });

  const { data: batchSpecs = [] } = useQuery<any[]>({
    queryKey: ["/api/factory-batch-specs"],
  });

  const { data: machines = [] } = useQuery<any[]>({
    queryKey: ["/api/factory-machines"],
  });

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/factory/products"],
  });

  const { data: staffList = [] } = useQuery<any[]>({
    queryKey: ["/api/factory/staff"],
  });

  const selectedShift = useMemo(() => {
    if (!selectedShiftId) return null;
    return shifts.find((s: any) => s.id === selectedShiftId) || null;
  }, [selectedShiftId, shifts]);

  useEffect(() => {
    if (!specProductId || editingSpec) {
      if (!specProductId) {
        setRecipeInfo(null);
        setSpecRecipeId(null);
        setSpecWeightUnit("kg");
        setSpecPieceWeightUnit("g");
      }
      return;
    }
    setLoadingRecipe(true);
    fetch(`/api/factory-products/${specProductId}/recipe-info`)
      .then(r => r.json())
      .then(info => {
        setRecipeInfo(info);
        if (info.hasRecipe) {
          setSpecRecipeId(info.recipeId);
          if (info.batchWeight) setSpecWeightKg(info.batchWeight.toString());
          if (info.batchWeightUnit) setSpecWeightUnit(info.batchWeightUnit);
          if (info.outputCount) setSpecPieces(info.outputCount.toString());
          if (info.expectedUnitWeight) {
            setSpecPieceWeight(info.expectedUnitWeight.toString());
            setSpecPieceWeightUnit(info.expectedUnitWeightUnit || "g");
          }
          if (info.productionTimeMinutes) setSpecDuration(info.productionTimeMinutes.toString());
        } else {
          setSpecRecipeId(null);
          setSpecWeightUnit("kg");
          setSpecPieceWeightUnit("g");
        }
      })
      .catch(() => {
        setRecipeInfo(null);
        setSpecRecipeId(null);
        setSpecWeightUnit("kg");
        setSpecPieceWeightUnit("g");
      })
      .finally(() => setLoadingRecipe(false));
  }, [specProductId]);

  const invalidateShifts = () => {
    queryClient.invalidateQueries({ predicate: (query) => {
      const key = query.queryKey;
      return Array.isArray(key) && key[0] === "/api/factory-shifts";
    }});
  };

  const createShiftMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/factory-shifts", data);
      return res.json();
    },
    onSuccess: () => {
      invalidateShifts();
      setIsShiftDialogOpen(false);
      resetShiftForm();
      toast({ title: "Vardiya oluşturuldu" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const updateShiftMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/factory-shifts/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      invalidateShifts();
      setIsShiftDialogOpen(false);
      setEditingShift(null);
      resetShiftForm();
      toast({ title: "Vardiya güncellendi" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const deleteShiftMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/factory-shifts/${id}`);
    },
    onSuccess: () => {
      invalidateShifts();
      toast({ title: "Vardiya silindi" });
    },
  });

  const addWorkerMutation = useMutation({
    mutationFn: async ({ shiftId, data }: { shiftId: number; data: any }) => {
      const res = await apiRequest("POST", `/api/factory-shifts/${shiftId}/workers`, data);
      return res.json();
    },
    onSuccess: () => {
      invalidateShifts();
      setAssignUserId("");
      setAssignMachineId("");
      setAssignRole("operator");
      toast({ title: "Çalışan atandı" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const removeWorkerMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/factory-shift-workers/${id}`);
    },
    onSuccess: () => {
      invalidateShifts();
      toast({ title: "Çalışan kaldırıldı" });
    },
  });

  const addProductionMutation = useMutation({
    mutationFn: async ({ shiftId, data }: { shiftId: number; data: any }) => {
      const res = await apiRequest("POST", `/api/factory-shifts/${shiftId}/productions`, data);
      return res.json();
    },
    onSuccess: () => {
      invalidateShifts();
      setProdProductId("");
      setProdMachineId("");
      setProdBatchCount("1");
      toast({ title: "Üretim planı eklendi" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const removeProductionMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/factory-shift-productions/${id}`);
    },
    onSuccess: () => {
      invalidateShifts();
      toast({ title: "Üretim planı kaldırıldı" });
    },
  });

  const createSpecMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingSpec ? `/api/factory-batch-specs/${editingSpec.id}` : "/api/factory-batch-specs";
      const method = editingSpec ? "PUT" : "POST";
      const res = await apiRequest(method, url, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/factory-batch-specs"] });
      setIsSpecDialogOpen(false);
      resetSpecForm();
      toast({ title: editingSpec ? "Batch spec güncellendi" : "Batch spec oluşturuldu" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const deleteSpecMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/factory-batch-specs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/factory-batch-specs"] });
      toast({ title: "Batch spec silindi" });
    },
  });

  function resetShiftForm() {
    setShiftDate("");
    setShiftType("sabah");
    setShiftStartTime("06:00");
    setShiftEndTime("14:00");
    setShiftNotes("");
    setEditingShift(null);
    setWizardStep(1);
    setWizardWorkers([]);
    setWizardProductions([]);
    setStaffSearch("");
    setWizProdProductId("");
    setWizProdMachineId("");
    setWizProdBatchCount("1");
  }

  function resetSpecForm() {
    setSpecProductId("");
    setSpecMachineId("");
    setSpecWeightKg("");
    setSpecPieces("");
    setSpecPieceWeight("");
    setSpecDuration("");
    setSpecDescription("");
    setEditingSpec(null);
  }

  function handleShiftTypeChange(type: string) {
    setShiftType(type);
    const config = SHIFT_TYPES.find(s => s.value === type);
    if (config) {
      const [start, end] = config.time.split(" - ");
      setShiftStartTime(start);
      setShiftEndTime(end);
    }
  }

  function handleCreateShift() {
    const data: any = {
      shiftDate,
      shiftType,
      startTime: shiftStartTime,
      endTime: shiftEndTime,
      notes: shiftNotes || null,
      status: "planned",
    };
    if (editingShift) {
      updateShiftMutation.mutate({ id: editingShift.id, data });
    } else {
      if (wizardWorkers.length > 0) {
        data.workers = wizardWorkers.map(w => ({
          userId: w.userId,
          machineId: w.machineId && w.machineId !== "none" ? parseInt(w.machineId) : null,
          role: w.role,
        }));
      }
      if (wizardProductions.length > 0) {
        data.productions = wizardProductions.map(p => ({
          productId: p.productId,
          machineId: p.machineId,
          batchSpecId: p.batchSpecId,
          plannedBatchCount: p.plannedBatchCount,
        }));
      }
      createShiftMutation.mutate(data);
    }
  }

  function addWizardWorker(staff: any) {
    if (wizardWorkers.some(w => w.userId === staff.id)) return;
    setWizardWorkers(prev => [...prev, {
      userId: staff.id,
      userName: `${staff.firstName} ${staff.lastName}`,
      role: "operator",
      machineId: "",
    }]);
  }

  function removeWizardWorker(userId: string) {
    setWizardWorkers(prev => prev.filter(w => w.userId !== userId));
  }

  function updateWizardWorkerRole(userId: string, role: string) {
    setWizardWorkers(prev => prev.map(w => w.userId === userId ? { ...w, role } : w));
  }

  function updateWizardWorkerMachine(userId: string, machineId: string) {
    setWizardWorkers(prev => prev.map(w => w.userId === userId ? { ...w, machineId } : w));
  }

  function addWizardProduction() {
    if (!wizProdProductId) return;
    const product = products.find((p: any) => p.id === parseInt(wizProdProductId));
    const machineId = wizProdMachineId && wizProdMachineId !== "none" ? parseInt(wizProdMachineId) : null;
    const machine = machineId ? machines.find((m: any) => m.id === machineId) : null;
    const matchingSpec = batchSpecs.find((s: any) =>
      s.productId === parseInt(wizProdProductId) &&
      (!machineId || s.machineId === machineId)
    );
    setWizardProductions(prev => [...prev, {
      productId: parseInt(wizProdProductId),
      productName: product?.name || "",
      machineId,
      machineName: machine?.name || "",
      batchSpecId: matchingSpec?.id || null,
      plannedBatchCount: parseInt(wizProdBatchCount) || 1,
    }]);
    setWizProdProductId("");
    setWizProdMachineId("");
    setWizProdBatchCount("1");
  }

  function removeWizardProduction(idx: number) {
    setWizardProductions(prev => prev.filter((_, i) => i !== idx));
  }

  const filteredStaff = useMemo(() => {
    if (!staffSearch.trim()) return staffList;
    const q = staffSearch.toLowerCase();
    return staffList.filter((s: any) =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      (s.role || "").toLowerCase().includes(q)
    );
  }, [staffList, staffSearch]);

  const ROLE_LABELS: Record<string, string> = {
    fabrika_mudur: "Fabrika Müdürü",
    fabrika_supervisor: "Fabrika Supervisor",
    fabrika_operator: "Fabrika Operatör",
    kalite_kontrol: "Kalite Kontrol",
    supervisor: "Supervisor",
    admin: "Admin",
    ceo: "CEO",
    cgo: "CGO",
  };

  function openEditShift(shift: any) {
    setEditingShift(shift);
    setShiftDate(shift.shiftDate);
    setShiftType(shift.shiftType);
    setShiftStartTime(shift.startTime);
    setShiftEndTime(shift.endTime);
    setShiftNotes(shift.notes || "");
    setIsShiftDialogOpen(true);
  }

  function parseMachineId(val: string): number | null {
    if (!val || val === "none") return null;
    const n = parseInt(val);
    return isNaN(n) ? null : n;
  }

  function handleAddWorker() {
    if (!selectedShift || !assignUserId) return;
    addWorkerMutation.mutate({
      shiftId: selectedShift.id,
      data: {
        userId: assignUserId,
        machineId: parseMachineId(assignMachineId),
        role: assignRole,
      },
    });
  }

  function handleAddProduction() {
    if (!selectedShift || !prodProductId) return;
    const machineId = parseMachineId(prodMachineId);
    const matchingSpec = batchSpecs.find((s: any) =>
      s.productId === parseInt(prodProductId) &&
      (!machineId || s.machineId === machineId)
    );
    addProductionMutation.mutate({
      shiftId: selectedShift.id,
      data: {
        productId: parseInt(prodProductId),
        machineId,
        batchSpecId: matchingSpec?.id || null,
        plannedBatchCount: parseInt(prodBatchCount) || 1,
      },
    });
  }

  function handleCreateSpec() {
    createSpecMutation.mutate({
      productId: parseInt(specProductId),
      machineId: parseMachineId(specMachineId),
      batchWeightKg: specWeightKg,
      batchWeightUnit: specWeightUnit,
      expectedPieces: parseInt(specPieces),
      pieceWeightGrams: specPieceWeight || null,
      pieceWeightUnit: specPieceWeightUnit,
      targetDurationMinutes: parseInt(specDuration),
      recipeId: specRecipeId,
      description: specDescription || null,
    });
  }

  function openEditSpec(spec: any) {
    setEditingSpec(spec);
    setSpecProductId(spec.productId.toString());
    setSpecMachineId(spec.machineId?.toString() || "");
    setSpecWeightKg(spec.batchWeightKg);
    setSpecWeightUnit(spec.batchWeightUnit || "kg");
    setSpecPieces(spec.expectedPieces.toString());
    setSpecPieceWeight(spec.pieceWeightGrams || "");
    setSpecPieceWeightUnit(spec.pieceWeightUnit || "g");
    setSpecDuration(spec.targetDurationMinutes.toString());
    setSpecDescription(spec.description || "");
    setSpecRecipeId(spec.recipeId || null);
    setIsSpecDialogOpen(true);
  }

  function openShiftDetail(shift: any) {
    setSelectedShiftId(shift.id);
    setIsDetailOpen(true);
  }

  function openCreateShift(date?: Date) {
    resetShiftForm();
    if (date) setShiftDate(formatDate(date));
    setIsShiftDialogOpen(true);
  }

  const getShiftsForDate = (dateStr: string) =>
    shifts.filter((s: any) => s.shiftDate === dateStr);

  const shiftTypeConfig = (type: string) =>
    SHIFT_TYPES.find(s => s.value === type) || SHIFT_TYPES[0];

  const isToday = (d: Date) => formatDate(d) === formatDate(new Date());

  return (
    <div className="p-4 space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="takvim" data-testid="tab-shift-calendar">
            <Calendar className="h-4 w-4 mr-2" />
            Vardiya Takvimi
          </TabsTrigger>
          <TabsTrigger value="batch-specs" data-testid="tab-batch-specs">
            <Settings className="h-4 w-4 mr-2" />
            Batch Spesifikasyonları
          </TabsTrigger>
          <TabsTrigger value="dogrulama" data-testid="tab-verifications">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Doğrulama Kuyruğu
          </TabsTrigger>
          <TabsTrigger value="istatistikler" data-testid="tab-stats">
            <Target className="h-4 w-4 mr-2" />
            Üretim İstatistikleri
          </TabsTrigger>
        </TabsList>

        {/* TAKVIM TAB */}
        <TabsContent value="takvim" className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" onClick={() => setWeekOffset(w => w - 1)} data-testid="btn-prev-week">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[200px] text-center">
                {formatDateTR(weekDates[0])} - {formatDateTR(weekDates[6])}
              </span>
              <Button size="icon" variant="outline" onClick={() => setWeekOffset(w => w + 1)} data-testid="btn-next-week">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)} data-testid="btn-today">
                Bugün
              </Button>
            </div>
            <Button onClick={() => openCreateShift()} data-testid="btn-create-shift">
              <Plus className="h-4 w-4 mr-2" />
              Vardiya Oluştur
            </Button>
          </div>

          <div className="overflow-x-auto -mx-4 px-4 pb-2">
          <div className="grid grid-cols-7 gap-2 min-w-[700px]">
            {weekDates.map((date, idx) => {
              const dateStr = formatDate(date);
              const dayShifts = getShiftsForDate(dateStr);
              return (
                <div
                  key={dateStr}
                  className={`border rounded-md min-h-[180px] p-2 ${isToday(date) ? "border-primary bg-primary/5" : "border-border"}`}
                  data-testid={`calendar-day-${dateStr}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-medium text-muted-foreground">{DAYS_TR[idx]}</div>
                    <div className={`text-sm font-semibold ${isToday(date) ? "text-primary" : ""}`}>
                      {date.getDate()}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {dayShifts.map((shift: any) => {
                      const cfg = shiftTypeConfig(shift.shiftType);
                      return (
                        <div
                          key={shift.id}
                          className={`${cfg.color} text-white text-xs p-1.5 rounded cursor-pointer`}
                          onClick={() => openShiftDetail(shift)}
                          data-testid={`shift-card-${shift.id}`}
                        >
                          <div className="font-medium">{cfg.label}</div>
                          <div className="opacity-80">{shift.startTime}-{shift.endTime}</div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Users className="h-3 w-3" />
                            <span>{shift.workers?.length || 0}</span>
                            <Package className="h-3 w-3 ml-1" />
                            <span>{shift.productions?.length || 0}</span>
                          </div>
                        </div>
                      );
                    })}
                    {dayShifts.length === 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-muted-foreground"
                        onClick={() => openCreateShift(date)}
                        data-testid={`btn-add-shift-${dateStr}`}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Ekle
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </TabsContent>

        {/* BATCH SPECS TAB */}
        <TabsContent value="batch-specs" className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="text-lg font-semibold">Batch Spesifikasyonları</h3>
              <p className="text-sm text-muted-foreground">Her ürün+makine kombinasyonu için standart batch tanımları</p>
            </div>
            <Button onClick={() => { resetSpecForm(); setIsSpecDialogOpen(true); }} data-testid="btn-create-spec">
              <Plus className="h-4 w-4 mr-2" />
              Yeni Batch Spec
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ürün</TableHead>
                <TableHead>Makine</TableHead>
                <TableHead className="text-right">Batch Ağırlık</TableHead>
                <TableHead className="text-right">Hedef Adet</TableHead>
                <TableHead className="text-right">Parça Ağırlık</TableHead>
                <TableHead className="text-right">Hedef Süre (dk)</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batchSpecs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Henüz batch spesifikasyonu tanımlanmamış
                  </TableCell>
                </TableRow>
              ) : (
                batchSpecs.map((spec: any) => (
                  <TableRow key={spec.id} data-testid={`row-spec-${spec.id}`}>
                    <TableCell className="font-medium">{spec.productName || "-"}</TableCell>
                    <TableCell>{spec.machineName || "Tümü"}</TableCell>
                    <TableCell className="text-right font-mono">{spec.batchWeightKg} {spec.batchWeightUnit || "kg"}</TableCell>
                    <TableCell className="text-right font-mono">{spec.expectedPieces}</TableCell>
                    <TableCell className="text-right font-mono">{spec.pieceWeightGrams ? `${spec.pieceWeightGrams} ${spec.pieceWeightUnit || "g"}` : "-"}</TableCell>
                    <TableCell className="text-right font-mono">{spec.targetDurationMinutes} dk</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{spec.description || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditSpec(spec)} data-testid={`btn-edit-spec-${spec.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteSpecMutation.mutate(spec.id)} data-testid={`btn-delete-spec-${spec.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* DOGRULAMA TAB */}
        <TabsContent value="dogrulama" className="space-y-4">
          <VerificationQueue />
        </TabsContent>

        {/* ISTATISTIKLER TAB */}
        <TabsContent value="istatistikler" className="space-y-4">
          <ProductionStats />
        </TabsContent>
      </Tabs>

      {/* CREATE/EDIT SHIFT DIALOG - WIZARD */}
      <Dialog open={isShiftDialogOpen} onOpenChange={(open) => { setIsShiftDialogOpen(open); if (!open) { setEditingShift(null); resetShiftForm(); } }}>
        <DialogContent className={editingShift ? "max-w-md" : "max-w-2xl max-h-[85vh] overflow-y-auto"}>
          <DialogHeader>
            <DialogTitle>{editingShift ? "Vardiya Düzenle" : "Vardiya Oluştur"}</DialogTitle>
            {!editingShift && (
              <div className="flex items-center gap-2 pt-2">
                {[1, 2, 3].map(step => (
                  <div key={step} className="flex items-center gap-1.5 flex-1">
                    <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border-2 transition-colors ${
                      wizardStep === step ? "border-primary bg-primary text-primary-foreground" :
                      wizardStep > step ? "border-primary bg-primary/20 text-primary" :
                      "border-muted-foreground/30 text-muted-foreground"
                    }`} data-testid={`wizard-step-${step}`}>
                      {wizardStep > step ? <CheckCircle2 className="h-4 w-4" /> : step}
                    </div>
                    <span className={`text-xs hidden sm:inline ${wizardStep === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                      {step === 1 ? "Vardiya" : step === 2 ? "Personel" : "Üretim"}
                    </span>
                    {step < 3 && <div className={`flex-1 h-px ${wizardStep > step ? "bg-primary" : "bg-muted-foreground/20"}`} />}
                  </div>
                ))}
              </div>
            )}
          </DialogHeader>

          {/* STEP 1: Shift Info (same for edit mode) */}
          {(editingShift || wizardStep === 1) && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tarih</Label>
                <Input type="date" value={shiftDate} onChange={e => setShiftDate(e.target.value)} data-testid="input-shift-date" />
              </div>
              <div className="space-y-2">
                <Label>Vardiya Tipi</Label>
                <Select value={shiftType} onValueChange={handleShiftTypeChange}>
                  <SelectTrigger data-testid="select-shift-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIFT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label} ({t.time})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Başlangıç</Label>
                  <Input type="time" value={shiftStartTime} onChange={e => setShiftStartTime(e.target.value)} data-testid="input-shift-start" />
                </div>
                <div className="space-y-2">
                  <Label>Bitiş</Label>
                  <Input type="time" value={shiftEndTime} onChange={e => setShiftEndTime(e.target.value)} data-testid="input-shift-end" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notlar</Label>
                <Textarea value={shiftNotes} onChange={e => setShiftNotes(e.target.value)} placeholder="Opsiyonel notlar..." data-testid="input-shift-notes" />
              </div>
              {editingShift ? (
                <Button className="w-full" onClick={handleCreateShift} disabled={!shiftDate || updateShiftMutation.isPending} data-testid="btn-submit-shift">
                  {updateShiftMutation.isPending ? "Kaydediliyor..." : "Güncelle"}
                </Button>
              ) : (
                <div className="flex justify-between gap-2 pt-2">
                  <Button variant="outline" onClick={() => { handleCreateShift(); }} disabled={!shiftDate || createShiftMutation.isPending} data-testid="btn-quick-create-shift">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Sadece Vardiya Kaydet
                  </Button>
                  <Button onClick={() => setWizardStep(2)} disabled={!shiftDate} data-testid="btn-next-step-2">
                    Personel Ekle
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Worker Selection */}
          {!editingShift && wizardStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-md p-2">
                <Clock className="h-4 w-4 shrink-0" />
                <span>{shiftDate} | {shiftTypeConfig(shiftType).label} ({shiftStartTime} - {shiftEndTime})</span>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Search className="h-3 w-3" />
                  Personel Ara
                </Label>
                <Input
                  value={staffSearch}
                  onChange={e => setStaffSearch(e.target.value)}
                  placeholder="Ad, soyad veya rol ile ara..."
                  data-testid="input-staff-search"
                />
              </div>

              <div className="border rounded-md max-h-[200px] overflow-y-auto">
                {filteredStaff.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-4">Personel bulunamadı</p>
                ) : (
                  filteredStaff.map((staff: any) => {
                    const isSelected = wizardWorkers.some(w => w.userId === staff.id);
                    return (
                      <div
                        key={staff.id}
                        className={`flex items-center gap-3 px-3 py-2 border-b last:border-b-0 cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/10" : "hover-elevate"
                        }`}
                        onClick={() => isSelected ? removeWizardWorker(staff.id) : addWizardWorker(staff)}
                        data-testid={`staff-item-${staff.id}`}
                      >
                        <div className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center shrink-0 ${isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"}`}>
                          {isSelected && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{staff.firstName} {staff.lastName}</span>
                          <Badge variant="secondary" className="ml-2 text-[10px]">
                            {ROLE_LABELS[staff.role] || staff.role}
                          </Badge>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {wizardWorkers.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Seçili Personel ({wizardWorkers.length})
                  </Label>
                  <div className="space-y-2">
                    {wizardWorkers.map(w => (
                      <Card key={w.userId}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-sm font-medium">{w.userName}</span>
                            <Button size="icon" variant="ghost" onClick={() => removeWizardWorker(w.userId)} data-testid={`btn-remove-wizard-worker-${w.userId}`}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Select value={w.role} onValueChange={(val) => updateWizardWorkerRole(w.userId, val)}>
                              <SelectTrigger data-testid={`select-wizard-role-${w.userId}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="operator">Operatör</SelectItem>
                                <SelectItem value="supervisor">Supervisor</SelectItem>
                                <SelectItem value="quality_controller">Kalite Kontrol</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select value={w.machineId || "none"} onValueChange={(val) => updateWizardWorkerMachine(w.userId, val)}>
                              <SelectTrigger data-testid={`select-wizard-machine-${w.userId}`}>
                                <SelectValue placeholder="Makine" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Makine Yok</SelectItem>
                                {machines.filter((m: any) => m.isActive).map((m: any) => (
                                  <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between gap-2 pt-2">
                <Button variant="outline" onClick={() => setWizardStep(1)} data-testid="btn-back-step-1">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Geri
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { handleCreateShift(); }} disabled={createShiftMutation.isPending} data-testid="btn-save-with-workers">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Kaydet
                  </Button>
                  <Button onClick={() => setWizardStep(3)} data-testid="btn-next-step-3">
                    Üretim Planı
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Production Planning */}
          {!editingShift && wizardStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-md p-2">
                <Clock className="h-4 w-4 shrink-0" />
                <span>{shiftDate} | {shiftTypeConfig(shiftType).label}</span>
                <span className="mx-1">|</span>
                <Users className="h-4 w-4 shrink-0" />
                <span>{wizardWorkers.length} personel</span>
              </div>

              <Card>
                <CardContent className="p-4 space-y-3">
                  <Label className="flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    Üretim Planı Ekle
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Select value={wizProdProductId} onValueChange={setWizProdProductId}>
                      <SelectTrigger data-testid="select-wiz-prod-product">
                        <SelectValue placeholder="Ürün seçin..." />
                      </SelectTrigger>
                      <SelectContent>
                        {products.filter((p: any) => p.isActive).map((p: any) => (
                          <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={wizProdMachineId || "none"} onValueChange={setWizProdMachineId}>
                      <SelectTrigger data-testid="select-wiz-prod-machine">
                        <SelectValue placeholder="Makine (opsiyonel)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Belirtilmedi</SelectItem>
                        {machines.filter((m: any) => m.isActive).map((m: any) => (
                          <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={wizProdBatchCount}
                        onChange={e => setWizProdBatchCount(e.target.value)}
                        placeholder="Batch"
                        data-testid="input-wiz-prod-batch"
                      />
                      <Button size="sm" onClick={addWizardProduction} disabled={!wizProdProductId} data-testid="btn-add-wiz-production">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {wizardProductions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ürün</TableHead>
                      <TableHead>Makine</TableHead>
                      <TableHead className="text-right">Batch</TableHead>
                      <TableHead>Spec</TableHead>
                      <TableHead className="text-right">Sil</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wizardProductions.map((p, idx) => (
                      <TableRow key={idx} data-testid={`row-wiz-production-${idx}`}>
                        <TableCell className="font-medium">{p.productName}</TableCell>
                        <TableCell>{p.machineName || "-"}</TableCell>
                        <TableCell className="text-right font-mono">{p.plannedBatchCount}</TableCell>
                        <TableCell>
                          {p.batchSpecId ? (
                            <Badge variant="secondary">Spec #{p.batchSpecId}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Yok</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" onClick={() => removeWizardProduction(idx)} data-testid={`btn-remove-wiz-prod-${idx}`}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-muted-foreground text-sm py-4 border rounded-md">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  Henüz üretim planı eklenmedi (opsiyonel)
                </div>
              )}

              <div className="flex justify-between gap-2 pt-2">
                <Button variant="outline" onClick={() => setWizardStep(2)} data-testid="btn-back-step-2">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Geri
                </Button>
                <Button onClick={handleCreateShift} disabled={createShiftMutation.isPending} data-testid="btn-submit-shift">
                  {createShiftMutation.isPending ? "Kaydediliyor..." : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Vardiyayı Oluştur
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* SHIFT DETAIL DIALOG */}
      <Dialog open={isDetailOpen} onOpenChange={(open) => { setIsDetailOpen(open); if (!open) setSelectedShiftId(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedShift && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Badge className={shiftTypeConfig(selectedShift.shiftType).color}>
                    {shiftTypeConfig(selectedShift.shiftType).label}
                  </Badge>
                  {selectedShift.shiftDate} | {selectedShift.startTime} - {selectedShift.endTime}
                </DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="workers">
                <TabsList className="w-full">
                  <TabsTrigger value="workers" className="flex-1">
                    <Users className="h-4 w-4 mr-1" />
                    Çalışanlar ({selectedShift.workers?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="productions" className="flex-1">
                    <Package className="h-4 w-4 mr-1" />
                    Üretim Planı ({selectedShift.productions?.length || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="workers" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm">Çalışan Ata</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Select value={assignUserId} onValueChange={setAssignUserId}>
                          <SelectTrigger data-testid="select-assign-user">
                            <SelectValue placeholder="Personel seçin..." />
                          </SelectTrigger>
                          <SelectContent>
                            {staffList
                              .filter((s: any) => !selectedShift?.workers?.some((w: any) => w.userId === s.id))
                              .map((s: any) => (
                              <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={assignMachineId} onValueChange={setAssignMachineId}>
                          <SelectTrigger data-testid="select-assign-machine">
                            <SelectValue placeholder="Makine (opsiyonel)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Atanmadı</SelectItem>
                            {machines.filter((m: any) => m.isActive).map((m: any) => (
                              <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={assignRole} onValueChange={setAssignRole}>
                          <SelectTrigger data-testid="select-assign-role">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="operator">Operatör</SelectItem>
                            <SelectItem value="supervisor">Supervisor</SelectItem>
                            <SelectItem value="quality_controller">Kalite Kontrol</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        size="sm"
                        onClick={handleAddWorker}
                        disabled={!assignUserId || addWorkerMutation.isPending}
                        data-testid="btn-add-worker"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Ata
                      </Button>
                    </CardContent>
                  </Card>

                  {selectedShift.workers?.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Personel</TableHead>
                          <TableHead>Makine</TableHead>
                          <TableHead>Rol</TableHead>
                          <TableHead>Kendi Seçimi</TableHead>
                          <TableHead className="text-right">İşlem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedShift.workers.map((w: any) => (
                          <TableRow key={w.id} data-testid={`row-worker-${w.id}`}>
                            <TableCell className="font-medium">{w.userName}</TableCell>
                            <TableCell>{w.machineName || <span className="text-muted-foreground">Atanmadı</span>}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {w.role === "operator" ? "Operatör" : w.role === "supervisor" ? "Supervisor" : "Kalite Kontrol"}
                              </Badge>
                            </TableCell>
                            <TableCell>{w.selfSelected ? "Evet" : "Hayır"}</TableCell>
                            <TableCell className="text-right">
                              <Button size="icon" variant="ghost" onClick={() => removeWorkerMutation.mutate(w.id)} data-testid={`btn-remove-worker-${w.id}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">Henüz çalışan atanmamış</p>
                  )}
                </TabsContent>

                <TabsContent value="productions" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm">Üretim Planı Ekle</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Select value={prodProductId} onValueChange={setProdProductId}>
                          <SelectTrigger data-testid="select-prod-product">
                            <SelectValue placeholder="Ürün seçin..." />
                          </SelectTrigger>
                          <SelectContent>
                            {products.filter((p: any) => p.isActive).map((p: any) => (
                              <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={prodMachineId} onValueChange={setProdMachineId}>
                          <SelectTrigger data-testid="select-prod-machine">
                            <SelectValue placeholder="Makine (opsiyonel)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Belirtilmedi</SelectItem>
                            {machines.filter((m: any) => m.isActive).map((m: any) => (
                              <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            value={prodBatchCount}
                            onChange={e => setProdBatchCount(e.target.value)}
                            placeholder="Batch sayısı"
                            data-testid="input-prod-batch-count"
                          />
                          <span className="text-sm text-muted-foreground whitespace-nowrap">batch</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={handleAddProduction}
                        disabled={!prodProductId || addProductionMutation.isPending}
                        data-testid="btn-add-production"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Ekle
                      </Button>
                    </CardContent>
                  </Card>

                  {selectedShift.productions?.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ürün</TableHead>
                          <TableHead>Makine</TableHead>
                          <TableHead className="text-right">Planlanan Batch</TableHead>
                          <TableHead className="text-right">Tamamlanan</TableHead>
                          <TableHead>Durum</TableHead>
                          <TableHead className="text-right">İşlem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedShift.productions.map((p: any) => (
                          <TableRow key={p.id} data-testid={`row-production-${p.id}`}>
                            <TableCell className="font-medium">{p.productName}</TableCell>
                            <TableCell>{p.machineName || "-"}</TableCell>
                            <TableCell className="text-right font-mono">{p.plannedBatchCount}</TableCell>
                            <TableCell className="text-right font-mono">{p.completedBatchCount || 0}</TableCell>
                            <TableCell>
                              <Badge variant={p.status === "completed" ? "default" : "secondary"}>
                                {p.status === "planned" ? "Planlandı" : p.status === "in_progress" ? "Devam Ediyor" : "Tamamlandı"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="icon" variant="ghost" onClick={() => removeProductionMutation.mutate(p.id)} data-testid={`btn-remove-production-${p.id}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">Henüz üretim planı eklenmemiş</p>
                  )}
                </TabsContent>
              </Tabs>

              <Separator className="my-2" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setIsDetailOpen(false);
                  setSelectedShiftId(null);
                  openEditShift(selectedShift);
                }} data-testid="btn-edit-shift">
                  <Edit className="h-4 w-4 mr-1" />
                  Düzenle
                </Button>
                <Button variant="outline" onClick={() => {
                  deleteShiftMutation.mutate(selectedShift.id);
                  setIsDetailOpen(false);
                  setSelectedShiftId(null);
                }} data-testid="btn-delete-shift">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Vardiyayı Sil
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* BATCH SPEC DIALOG */}
      <Dialog open={isSpecDialogOpen} onOpenChange={setIsSpecDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSpec ? "Batch Spec Düzenle" : "Yeni Batch Spesifikasyonu"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ürün</Label>
              <Select value={specProductId} onValueChange={(val) => {
                setSpecProductId(val);
                if (!editingSpec) {
                  setSpecWeightKg("");
                  setSpecPieces("");
                  setSpecPieceWeight("");
                  setSpecDuration("");
                  setSpecRecipeId(null);
                  setRecipeInfo(null);
                }
              }}>
                <SelectTrigger data-testid="select-spec-product">
                  <SelectValue placeholder="Ürün seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p: any) => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loadingRecipe && (
                <p className="text-xs text-muted-foreground">Reçete bilgisi yükleniyor...</p>
              )}
              {recipeInfo?.hasRecipe && !loadingRecipe && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  <span className="text-xs text-emerald-700 dark:text-emerald-400">Reçeteden otomatik dolduruldu: {recipeInfo.recipeName}</span>
                </div>
              )}
              {recipeInfo && !recipeInfo.hasRecipe && !loadingRecipe && (
                <p className="text-xs text-muted-foreground">Bu ürün için reçete bulunamadı, manuel girin.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Makine (opsiyonel)</Label>
              <Select value={specMachineId} onValueChange={setSpecMachineId}>
                <SelectTrigger data-testid="select-spec-machine">
                  <SelectValue placeholder="Tüm makineler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tüm Makineler</SelectItem>
                  {machines.map((m: any) => (
                    <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Weight className="h-3 w-3" /> Batch Ağırlık</Label>
                <div className="flex gap-2">
                  <Input type="number" step="0.01" value={specWeightKg} onChange={e => setSpecWeightKg(e.target.value)} placeholder="41" className="flex-1" data-testid="input-spec-weight" />
                  <Select value={specWeightUnit} onValueChange={setSpecWeightUnit}>
                    <SelectTrigger className="w-[80px]" data-testid="select-spec-weight-unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="litre">litre</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Hash className="h-3 w-3" /> Hedef Adet</Label>
                <Input type="number" value={specPieces} onChange={e => setSpecPieces(e.target.value)} placeholder="650" data-testid="input-spec-pieces" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Parça Ağırlık</Label>
                <div className="flex gap-2">
                  <Input type="number" step="0.01" value={specPieceWeight} onChange={e => setSpecPieceWeight(e.target.value)} placeholder="55" className="flex-1" data-testid="input-spec-piece-weight" />
                  <Select value={specPieceWeightUnit} onValueChange={setSpecPieceWeightUnit}>
                    <SelectTrigger className="w-[80px]" data-testid="select-spec-piece-unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="litre">litre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Timer className="h-3 w-3" /> Hedef Süre (dk)</Label>
                <Input type="number" value={specDuration} onChange={e => setSpecDuration(e.target.value)} placeholder="120" data-testid="input-spec-duration" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea value={specDescription} onChange={e => setSpecDescription(e.target.value)} placeholder="Donut Sade dolgusuz ve süssüz batch üretimi..." data-testid="input-spec-description" />
            </div>
            <Button className="w-full" onClick={handleCreateSpec} disabled={!specProductId || !specWeightKg || !specPieces || !specDuration || createSpecMutation.isPending} data-testid="btn-submit-spec">
              {createSpecMutation.isPending ? "Kaydediliyor..." : (editingSpec ? "Güncelle" : "Oluştur")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Verification Queue Component
function VerificationQueue() {
  const { toast } = useToast();
  const [verifyingBatch, setVerifyingBatch] = useState<any>(null);
  const [verifiedWeight, setVerifiedWeight] = useState("");
  const [verifiedPieces, setVerifiedPieces] = useState("");
  const [verifiedWasteKg, setVerifiedWasteKg] = useState("");
  const [verifiedWastePieces, setVerifiedWastePieces] = useState("");
  const [verifyNotes, setVerifyNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: pendingBatches = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/factory-batch-verifications/pending"],
  });

  const verifyMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/factory-batch-verifications", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/factory-batch-verifications/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/factory-production-batches"] });
      setVerifyingBatch(null);
      toast({ title: "Doğrulama kaydedildi" });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  function handleVerify(approved: boolean) {
    if (!verifyingBatch) return;
    verifyMutation.mutate({
      batchId: verifyingBatch.id,
      verifiedWeightKg: verifiedWeight ? parseFloat(verifiedWeight) : null,
      verifiedPieces: verifiedPieces ? parseInt(verifiedPieces) : null,
      verifiedWasteKg: verifiedWasteKg ? parseFloat(verifiedWasteKg) : null,
      verifiedWastePieces: verifiedWastePieces ? parseInt(verifiedWastePieces) : null,
      isApproved: approved,
      rejectionReason: !approved ? rejectionReason : null,
      notes: verifyNotes || null,
    });
  }

  function openVerify(batch: any) {
    setVerifyingBatch(batch);
    setVerifiedWeight(batch.actualWeightKg || "");
    setVerifiedPieces(batch.actualPieces?.toString() || "");
    setVerifiedWasteKg(batch.wasteWeightKg || "");
    setVerifiedWastePieces(batch.wastePieces?.toString() || "");
    setVerifyNotes("");
    setRejectionReason("");
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Doğrulama Bekleyen Üretimler</h3>
      {isLoading ? (
        <p className="text-muted-foreground text-center py-8">Yükleniyor...</p>
      ) : pendingBatches.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            Doğrulama bekleyen üretim bulunmuyor
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {pendingBatches.map((batch: any) => {
            const isOverTarget = batch.targetDurationMinutes && batch.actualDurationMinutes > batch.targetDurationMinutes;
            return (
              <Card key={batch.id} className={isOverTarget ? "border-red-500/50" : ""} data-testid={`card-pending-batch-${batch.id}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-sm">{batch.productName}</h4>
                    <Badge variant="secondary">Batch #{batch.batchNumber}</Badge>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">Operatör:</span> <span>{batch.operatorName}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Makine:</span> <span>{batch.machineName || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Üretilen:</span> <span className="font-mono">{batch.actualPieces || 0} adet / {batch.actualWeightKg || 0} kg</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Fire:</span> <span className="font-mono">{batch.wastePieces || 0} adet / {batch.wasteWeightKg || 0} kg</span></div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Süre:</span>
                      <span className={`font-mono ${isOverTarget ? "text-red-500 font-semibold" : ""}`}>
                        {batch.actualDurationMinutes || 0} dk
                        {batch.targetDurationMinutes && <span className="text-muted-foreground"> / {batch.targetDurationMinutes} dk</span>}
                      </span>
                    </div>
                    {isOverTarget && (
                      <div className="flex items-center gap-1 text-red-500 text-xs mt-1">
                        <AlertTriangle className="h-3 w-3" />
                        Hedef süre aşıldı!
                      </div>
                    )}
                  </div>
                  <Button className="w-full" size="sm" onClick={() => openVerify(batch)} data-testid={`btn-verify-batch-${batch.id}`}>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Doğrula
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!verifyingBatch} onOpenChange={() => setVerifyingBatch(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Üretim Doğrulama</DialogTitle>
          </DialogHeader>
          {verifyingBatch && (
            <div className="space-y-4">
              <div className="bg-muted rounded-md p-3 text-sm">
                <p className="font-medium">{verifyingBatch.productName} - Batch #{verifyingBatch.batchNumber}</p>
                <p className="text-muted-foreground">Operatör: {verifyingBatch.operatorName}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Doğrulanan Ağırlık (kg)</Label>
                  <Input type="number" step="0.01" value={verifiedWeight} onChange={e => setVerifiedWeight(e.target.value)} data-testid="input-verified-weight" />
                </div>
                <div className="space-y-2">
                  <Label>Doğrulanan Adet</Label>
                  <Input type="number" value={verifiedPieces} onChange={e => setVerifiedPieces(e.target.value)} data-testid="input-verified-pieces" />
                </div>
                <div className="space-y-2">
                  <Label>Doğrulanan Fire (kg)</Label>
                  <Input type="number" step="0.01" value={verifiedWasteKg} onChange={e => setVerifiedWasteKg(e.target.value)} data-testid="input-verified-waste-kg" />
                </div>
                <div className="space-y-2">
                  <Label>Doğrulanan Fire (adet)</Label>
                  <Input type="number" value={verifiedWastePieces} onChange={e => setVerifiedWastePieces(e.target.value)} data-testid="input-verified-waste-pieces" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notlar</Label>
                <Textarea value={verifyNotes} onChange={e => setVerifyNotes(e.target.value)} placeholder="Doğrulama notları..." data-testid="input-verify-notes" />
              </div>
              <div className="space-y-2">
                <Label>Red Nedeni (red durumunda)</Label>
                <Input value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Neden reddedildi?" data-testid="input-rejection-reason" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="border-red-500 text-red-500" onClick={() => handleVerify(false)} disabled={verifyMutation.isPending} data-testid="btn-reject-batch">
                  Reddet
                </Button>
                <Button onClick={() => handleVerify(true)} disabled={verifyMutation.isPending} data-testid="btn-approve-batch">
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Onayla
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Production Stats Component
function ProductionStats() {
  const [period, setPeriod] = useState("week");
  const startDate = useMemo(() => {
    const d = new Date();
    if (period === "today") return d.toISOString().split("T")[0];
    if (period === "week") { d.setDate(d.getDate() - 7); return d.toISOString().split("T")[0]; }
    d.setDate(d.getDate() - 30); return d.toISOString().split("T")[0];
  }, [period]);

  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ["/api/factory-production-stats", startDate],
    queryFn: async () => {
      const res = await fetch(`/api/factory-production-stats?startDate=${startDate}`);
      return res.json();
    },
  });

  if (isLoading) return <p className="text-center text-muted-foreground py-8">Yükleniyor...</p>;
  if (!stats) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-lg font-semibold">Üretim İstatistikleri</h3>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40" data-testid="select-stats-period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Bugün</SelectItem>
            <SelectItem value="week">Son 7 Gün</SelectItem>
            <SelectItem value="month">Son 30 Gün</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card data-testid="stat-total-batches">
          <CardContent className="p-4 text-center">
            <Package className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{stats.summary?.totalBatches || 0}</p>
            <p className="text-xs text-muted-foreground">Toplam Batch</p>
          </CardContent>
        </Card>
        <Card data-testid="stat-total-pieces">
          <CardContent className="p-4 text-center">
            <Hash className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold">{stats.summary?.totalPieces || 0}</p>
            <p className="text-xs text-muted-foreground">Toplam Adet</p>
          </CardContent>
        </Card>
        <Card data-testid="stat-avg-performance">
          <CardContent className="p-4 text-center">
            <Target className="h-5 w-5 mx-auto mb-1 text-amber-500" />
            <p className="text-2xl font-bold">{parseFloat(stats.summary?.avgPerformanceScore || "0").toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Ort. Performans</p>
          </CardContent>
        </Card>
        <Card data-testid="stat-avg-yield">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-2xl font-bold">{parseFloat(stats.summary?.avgYieldRate || "0").toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Ort. Verim</p>
          </CardContent>
        </Card>
        <Card data-testid="stat-target-exceeded">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-red-500" />
            <p className="text-2xl font-bold">{stats.summary?.targetExceededCount || 0}</p>
            <p className="text-xs text-muted-foreground">Süre Aşımı</p>
          </CardContent>
        </Card>
      </div>

      {stats.productBreakdown?.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Ürün Bazlı Dağılım</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ürün</TableHead>
                  <TableHead className="text-right">Batch</TableHead>
                  <TableHead className="text-right">Adet</TableHead>
                  <TableHead className="text-right">Ağırlık (kg)</TableHead>
                  <TableHead className="text-right">Fire (kg)</TableHead>
                  <TableHead className="text-right">Performans</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.productBreakdown.map((p: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{p.productName}</TableCell>
                    <TableCell className="text-right font-mono">{p.batchCount}</TableCell>
                    <TableCell className="text-right font-mono">{p.totalPieces}</TableCell>
                    <TableCell className="text-right font-mono">{parseFloat(p.totalWeightKg).toFixed(1)}</TableCell>
                    <TableCell className="text-right font-mono">{parseFloat(p.totalWasteKg).toFixed(1)}</TableCell>
                    <TableCell className="text-right font-mono">{parseFloat(p.avgPerformance).toFixed(0)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {stats.workerBreakdown?.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Çalışan Performansı</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Çalışan</TableHead>
                  <TableHead className="text-right">Batch</TableHead>
                  <TableHead className="text-right">Adet</TableHead>
                  <TableHead className="text-right">Performans</TableHead>
                  <TableHead className="text-right">Verim</TableHead>
                  <TableHead className="text-right">Süre Aşımı</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.workerBreakdown.map((w: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{w.userName}</TableCell>
                    <TableCell className="text-right font-mono">{w.batchCount}</TableCell>
                    <TableCell className="text-right font-mono">{w.totalPieces}</TableCell>
                    <TableCell className="text-right font-mono">{parseFloat(w.avgPerformance).toFixed(0)}%</TableCell>
                    <TableCell className="text-right font-mono">{parseFloat(w.avgYield).toFixed(0)}%</TableCell>
                    <TableCell className="text-right">
                      {w.targetExceeded > 0 ? (
                        <Badge variant="destructive">{w.targetExceeded}</Badge>
                      ) : (
                        <Badge variant="secondary">0</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
