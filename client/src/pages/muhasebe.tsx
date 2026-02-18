import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ListSkeleton } from "@/components/list-skeleton";
import { EmptyState } from "@/components/empty-state";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Calculator, 
  Settings, 
  TrendingUp, 
  Users, 
  Calendar,
  Edit,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Info,
  ArrowRight,
  Percent,
  Banknote,
  Receipt,
  Utensils,
  Bus,
  FileText,
  Clock,
  Plus,
  Search,
  Download,
  Check,
  XCircle,
  Loader2,
  Brain,
  RefreshCw,
  ArrowUpDown,
  ShieldCheck,
  BarChart3,
  Building2,
  Award,
  Package
} from "lucide-react";
import UrunKarti from "./satinalma/urun-karti";

interface SalaryScale {
  id: number;
  locationType: string;
  positionName: string;
  level: number;
  baseSalary: string;
  cashRegisterBonus: string;
  performanceBonus: string;
  bonusCalculationType: string;
  totalSalary: string;
  isActive: boolean;
}

interface PayrollParameters {
  id: number;
  year: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  minimumWageGross: number;
  minimumWageNet: number;
  sgkEmployeeRate: number;
  sgkEmployerRate: number;
  unemploymentEmployeeRate: number;
  unemploymentEmployerRate: number;
  stampTaxRate: number;
  taxBracket1Limit: number;
  taxBracket1Rate: number;
  taxBracket2Limit: number;
  taxBracket2Rate: number;
  taxBracket3Limit: number;
  taxBracket3Rate: number;
  taxBracket4Limit: number;
  taxBracket4Rate: number;
  taxBracket5Rate: number;
  mealAllowanceTaxExemptDaily: number;
  mealAllowanceSgkExemptDaily: number;
  transportAllowanceExemptDaily: number;
  workingDaysPerMonth: number;
  workingHoursPerDay: number;
  overtimeMultiplier: string;
  notes?: string;
}

interface AiRegulationSuggestion {
  field: string;
  fieldLabel: string;
  currentValue: number;
  suggestedValue: number;
  reason: string;
}

interface AiRegulationResult {
  status: 'up_to_date' | 'needs_update';
  summary: string;
  changes: AiRegulationSuggestion[];
  source: string;
  confidence: 'high' | 'medium' | 'low';
  notes: string;
  parameterId: number;
  checkedAt: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  role: string;
  net_salary: number;
  meal_allowance: number;
  transport_allowance: number;
  bonus_base: number;
  bonus_type: string;
  bonus_percentage: number;
  branch_name?: string;
  branch_id?: number;
}

interface PayrollRecord {
  id: number;
  user_id: string;
  branch_id?: number;
  period_year: number;
  period_month: number;
  base_salary: number;
  overtime_minutes: number;
  overtime_amount: number;
  bonus_type: string;
  bonus_amount: number;
  undertime_minutes: number;
  undertime_deduction: number;
  meal_allowance: number;
  transport_allowance: number;
  total_net_payable: number;
  gross_salary: number;
  sgk_employee: number;
  sgk_employer: number;
  income_tax: number;
  stamp_tax: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'paid';
  first_name?: string;
  last_name?: string;
  branch_name?: string;
  created_at?: string;
}

interface PayrollCalculation {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    branchName?: string;
    branchId?: number;
  };
  period: { year: number; month: number };
  baseSalary: number;
  overtimeMinutes: number;
  overtimeAmount: number;
  bonusType: string;
  bonusBase: number;
  bonusPercentage: string;
  bonusAmount: number;
  undertimeMinutes: number;
  undertimeDeduction: number;
  mealAllowance: number;
  transportAllowance: number;
  totalNetPayable: number;
  grossSalary: number;
  sgkEmployee: number;
  sgkEmployer: number;
  unemploymentEmployee: number;
  unemploymentEmployer: number;
  incomeTax: number;
  stampTax: number;
}

function formatCurrency(value: number): string {
  return (value / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(value: number): string {
  return (value / 10).toFixed(1);
}

const MONTHS = [
  { value: 1, label: "Ocak" },
  { value: 2, label: "Şubat" },
  { value: 3, label: "Mart" },
  { value: 4, label: "Nisan" },
  { value: 5, label: "Mayıs" },
  { value: 6, label: "Haziran" },
  { value: 7, label: "Temmuz" },
  { value: 8, label: "Ağustos" },
  { value: 9, label: "Eylül" },
  { value: 10, label: "Ekim" },
  { value: 11, label: "Kasım" },
  { value: 12, label: "Aralık" },
];

function StokTab() {
  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [category, setCategory] = useState("all");

  const { data: inventoryItems = [], isLoading, isError, refetch } = useQuery<any[]>({
    queryKey: ['/api/inventory'],
  });

  if (selectedProductId) {
    return (
      <UrunKarti
        productId={selectedProductId}
        onBack={() => setSelectedProductId(null)}
      />
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <Card className="border-red-500/30 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6 pb-6 px-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-red-900 dark:text-red-300">Stok verileri yüklenemedi</p>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">Veriler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.</p>
              </div>
              <Button
                onClick={() => refetch()}
                size="sm"
                variant="outline"
                data-testid="button-stok-retry"
              >
                Tekrar Dene
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stokCategories = [
    { value: "all", label: "Tümü" },
    { value: "hammadde", label: "Hammadde" },
    { value: "yarimamul", label: "Yarı Mamul" },
    { value: "mamul", label: "Mamül Ürün" },
    { value: "ambalaj", label: "Ambalaj" },
    { value: "ekipman", label: "Ekipman" },
    { value: "sube_ekipman", label: "Şube Ekipman" },
    { value: "sube_malzeme", label: "Şube Malzeme" },
    { value: "konsantre", label: "Konsantre" },
    { value: "diger", label: "Diğer" },
  ];

  const filtered = inventoryItems.filter((item: any) => {
    const matchesSearch = item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.code?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || item.category === category;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ürün ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-stok-search"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[150px]" data-testid="select-stok-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {stokCategories.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Kod</th>
                <th className="px-4 py-2 text-left font-medium">Ürün Adı</th>
                <th className="px-4 py-2 text-left font-medium">Kategori</th>
                <th className="px-4 py-2 text-right font-medium">Stok</th>
                <th className="px-4 py-2 text-right font-medium">Birim Fiyat</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Ürün bulunamadı
                  </td>
                </tr>
              ) : (
                filtered.map((item: any) => {
                  const isLow = parseFloat(item.currentStock || '0') <= parseFloat(item.minimumStock || '0');
                  return (
                    <tr
                      key={item.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => setSelectedProductId(item.id)}
                      data-testid={`row-stok-${item.id}`}
                    >
                      <td className="px-4 py-2 font-mono text-xs">{item.code}</td>
                      <td className="px-4 py-2 font-medium">{item.name}</td>
                      <td className="px-4 py-2">
                        <Badge variant="secondary">{stokCategories.find(c => c.value === item.category)?.label || item.category}</Badge>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className={isLow ? 'text-red-500 font-medium' : ''}>
                          {parseFloat(item.currentStock || '0').toLocaleString('tr-TR')} {item.unit}
                        </span>
                        {isLow && <AlertCircle className="h-3 w-3 inline ml-1 text-red-500" />}
                      </td>
                      <td className="px-4 py-2 text-right">
                        ₺{parseFloat(item.unitCost || '0').toLocaleString('tr-TR')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Muhasebe() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [editingParam, setEditingParam] = useState<PayrollParameters | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [calcGross, setCalcGross] = useState<string>("");
  const [calcNet, setCalcNet] = useState<string>("");
  const [calcCumulativeTaxBase, setCalcCumulativeTaxBase] = useState<string>("0");
  const [calcResult, setCalcResult] = useState<any>(null);
  
  // Bordro tab state
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [payrollCalc, setPayrollCalc] = useState<PayrollCalculation | null>(null);
  const [aiCheckResult, setAiCheckResult] = useState<AiRegulationResult | null>(null);
  const [isAiCheckDialogOpen, setIsAiCheckDialogOpen] = useState(false);
  const [selectedAiChanges, setSelectedAiChanges] = useState<Set<number>>(new Set());

  const canEdit = user?.role === 'admin' || user?.role === 'muhasebe' || user?.role === 'muhasebe_ik';
  
  // Check if user has access to accounting module
  const { data: hasAccess = false, isLoading: isLoadingAccess } = useQuery<boolean>({
    queryKey: ['/api/muhasebe/access'],
  });

  const { data: parameters = [], isLoading } = useQuery<PayrollParameters[]>({
    queryKey: ['/api/payroll/parameters'],
  });

  // Employees for payroll
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['/api/employees-with-salary'],
  });

  // Payroll records for selected period - read year/month from queryKey context
  const { data: payrollRecords = [], isLoading: isLoadingRecords } = useQuery<PayrollRecord[]>({
    queryKey: ['/api/payroll/records', selectedYear, selectedMonth],
    queryFn: async ({ queryKey }) => {
      const [, year, month] = queryKey as [string, number, number];
      const response = await apiRequest("GET", `/api/payroll/records?year=${year}&month=${month}`);
      return response.json();
    },
  });

  // ALL MUTATIONS MUST BE DECLARED BEFORE ANY EARLY RETURNS (React hooks rule)
  // Calculate payroll mutation
  const calculateMutation = useMutation({
    mutationFn: async (params: { userId: string; year: number; month: number }) => {
      const response = await apiRequest("POST", '/api/payroll/calculate-employee', {
        userId: params.userId,
        year: params.year,
        month: params.month,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setPayrollCalc(data);
    },
    onError: () => {
      toast({ title: "Bordro hesaplanamadı", variant: "destructive" });
    },
  });

  // Save payroll record mutation with period in variables
  const saveMutation = useMutation({
    mutationFn: async (params: { calc: PayrollCalculation; year: number; month: number }) => {
      return apiRequest("POST", '/api/payroll/records', {
        userId: params.calc.employee.id,
        branchId: params.calc.employee.branchId || null,
        periodYear: params.year,
        periodMonth: params.month,
        baseSalary: params.calc.baseSalary,
        overtimeMinutes: params.calc.overtimeMinutes,
        overtimeRate: "1.5",
        overtimeAmount: params.calc.overtimeAmount,
        bonusType: params.calc.bonusType,
        bonusBase: params.calc.bonusBase || params.calc.baseSalary,
        bonusPercentage: params.calc.bonusPercentage || "0",
        bonusAmount: params.calc.bonusAmount,
        undertimeMinutes: params.calc.undertimeMinutes,
        undertimeDeduction: params.calc.undertimeDeduction,
        mealAllowance: params.calc.mealAllowance,
        transportAllowance: params.calc.transportAllowance,
        totalNetPayable: params.calc.totalNetPayable,
        grossSalary: params.calc.grossSalary,
        sgkEmployee: params.calc.sgkEmployee,
        sgkEmployer: params.calc.sgkEmployer,
        unemploymentEmployee: params.calc.unemploymentEmployee || 0,
        unemploymentEmployer: params.calc.unemploymentEmployer || 0,
        incomeTax: params.calc.incomeTax,
        stampTax: params.calc.stampTax,
        status: 'draft',
      });
    },
    onSuccess: (_, variables) => {
      toast({ title: "Bordro kaydedildi" });
      setPayrollCalc(null);
      setSelectedEmployeeId("");
      queryClient.invalidateQueries({ queryKey: ['/api/payroll/records', variables.year, variables.month] });
    },
    onError: (err: any) => {
      toast({ title: err.message || "Bordro kaydedilemedi", variant: "destructive" });
    },
  });

  // Approve payroll mutation with period in variables
  const approveMutation = useMutation({
    mutationFn: async (params: { recordId: number; year: number; month: number }) => {
      return apiRequest("PATCH", `/api/payroll/records/${params.recordId}/approve`);
    },
    onSuccess: (_, variables) => {
      toast({ title: "Bordro onaylandı" });
      queryClient.invalidateQueries({ queryKey: ['/api/payroll/records', variables.year, variables.month] });
    },
    onError: () => {
      toast({ title: "Onaylama başarısız", variant: "destructive" });
    },
  });

  // Mark as paid mutation with period in variables
  const payMutation = useMutation({
    mutationFn: async (params: { recordId: number; year: number; month: number }) => {
      return apiRequest("PATCH", `/api/payroll/records/${params.recordId}/pay`);
    },
    onSuccess: (_, variables) => {
      toast({ title: "Ödendi olarak işaretlendi" });
      queryClient.invalidateQueries({ queryKey: ['/api/payroll/records', variables.year, variables.month] });
    },
    onError: () => {
      toast({ title: "İşlem başarısız", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PayrollParameters) => {
      const payload = {
        minimumWageGross: data.minimumWageGross,
        minimumWageNet: data.minimumWageNet,
        sgkEmployeeRate: data.sgkEmployeeRate,
        sgkEmployerRate: data.sgkEmployerRate,
        unemploymentEmployeeRate: data.unemploymentEmployeeRate,
        unemploymentEmployerRate: data.unemploymentEmployerRate,
        stampTaxRate: data.stampTaxRate,
        taxBracket1Limit: data.taxBracket1Limit,
        taxBracket1Rate: data.taxBracket1Rate,
        taxBracket2Limit: data.taxBracket2Limit,
        taxBracket2Rate: data.taxBracket2Rate,
        taxBracket3Limit: data.taxBracket3Limit,
        taxBracket3Rate: data.taxBracket3Rate,
        taxBracket4Limit: data.taxBracket4Limit,
        taxBracket4Rate: data.taxBracket4Rate,
        taxBracket5Rate: data.taxBracket5Rate,
        mealAllowanceTaxExemptDaily: data.mealAllowanceTaxExemptDaily,
        mealAllowanceSgkExemptDaily: data.mealAllowanceSgkExemptDaily,
        transportAllowanceExemptDaily: data.transportAllowanceExemptDaily,
        workingDaysPerMonth: data.workingDaysPerMonth,
        workingHoursPerDay: data.workingHoursPerDay,
        overtimeMultiplier: data.overtimeMultiplier,
        isActive: data.isActive,
        notes: data.notes,
      };
      return apiRequest("PATCH", `/api/payroll/parameters/${editingParam?.id}`, payload);
    },
    onSuccess: () => {
      toast({ title: "Parametreler güncellendi" });
      setIsEditDialogOpen(false);
      setEditingParam(null);
      queryClient.invalidateQueries({ queryKey: ['/api/payroll/parameters'] });
    },
    onError: () => {
      toast({ title: "Güncelleme başarısız", variant: "destructive" });
    },
  });

  const aiCheckMutation = useMutation({
    mutationFn: async (parameterId: number) => {
      const response = await apiRequest("POST", "/api/payroll/ai-regulation-check", { parameterId });
      return response.json();
    },
    onSuccess: (data: AiRegulationResult) => {
      setAiCheckResult(data);
      setIsAiCheckDialogOpen(true);
      if (data.changes && data.changes.length > 0) {
        setSelectedAiChanges(new Set(data.changes.map((_: any, i: number) => i)));
      } else {
        setSelectedAiChanges(new Set());
      }
    },
    onError: (error: any) => {
      toast({ title: "AI Kontrol Hatası", description: error.message || "Mevzuat kontrolü yapılamadı", variant: "destructive" });
    },
  });

  const applyAiSuggestionsMutation = useMutation({
    mutationFn: async ({ parameterId, changes }: { parameterId: number; changes: AiRegulationSuggestion[] }) => {
      const response = await apiRequest("POST", "/api/payroll/apply-ai-suggestions", { parameterId, changes });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "AI önerileri başarıyla uygulandı" });
      queryClient.invalidateQueries({ queryKey: ['/api/payroll/parameters'] });
      setIsAiCheckDialogOpen(false);
      setAiCheckResult(null);
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Öneriler uygulanamadı", variant: "destructive" });
    },
  });

  // EARLY RETURNS - After all hooks are declared
  if (isLoadingAccess) {
    return (
      <div className="h-screen flex items-center justify-center p-4">
        <ListSkeleton count={1} variant="card" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Yetkisiz Erişim
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Bu modüle erişim izniniz yok. Erişim talep etmek için yöneticiye başvurunuz.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper functions - after early returns is OK
  const currentYearParams = parameters.find(p => p.year === selectedYear);
  const activeParams = parameters.find(p => p.isActive);
  
  const calculateEmployeePayroll = () => {
    if (!selectedEmployeeId) {
      toast({ title: "Personel seçin", variant: "destructive" });
      return;
    }
    calculateMutation.mutate({ userId: selectedEmployeeId, year: selectedYear, month: selectedMonth });
  };

  const savePayrollRecord = () => {
    if (!payrollCalc) return;
    saveMutation.mutate({ calc: payrollCalc, year: selectedYear, month: selectedMonth });
  };

  const calculatePayroll = async () => {
    if (!calcGross && !calcNet) {
      toast({ title: "Brüt veya net maaş girin", variant: "destructive" });
      return;
    }

    try {
      // Convert TL to kuruş (multiply by 100 and round to avoid floating point errors)
      const grossKurus = calcGross ? Math.round(parseFloat(calcGross) * 100) : undefined;
      const netKurus = calcNet ? Math.round(parseFloat(calcNet) * 100) : undefined;
      const cumulativeKurus = Math.round(parseFloat(calcCumulativeTaxBase || "0") * 100);

      const response = await fetch('/api/payroll/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          grossSalary: grossKurus,
          netSalary: netKurus,
          year: selectedYear,
          cumulativeTaxBase: cumulativeKurus,
        }),
      });

      if (!response.ok) throw new Error('Hesaplama hatası');
      
      const result = await response.json();
      setCalcResult(result);
    } catch {
      toast({ title: "Hesaplama hatası", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <ListSkeleton count={3} variant="card" showHeader />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Calculator className="h-6 w-6 text-emerald-600" />
            <h1 className="text-xl font-bold">Muhasebe & Bordro</h1>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-[120px]" data-testid="select-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="bordro" className="w-full">
          <TabsList className="flex flex-wrap gap-1 h-auto p-1 w-full">
            <TabsTrigger value="bordro" data-testid="tab-bordro" className="flex-1 min-w-[80px] text-xs sm:text-sm px-2 py-1.5">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Bordro</span>
            </TabsTrigger>
            <TabsTrigger value="salaries" data-testid="tab-salaries" className="flex-1 min-w-[80px] text-xs sm:text-sm px-2 py-1.5">
              <Banknote className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Maaşlar</span>
            </TabsTrigger>
            <TabsTrigger value="parameters" data-testid="tab-parameters" className="flex-1 min-w-[80px] text-xs sm:text-sm px-2 py-1.5">
              <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Parametreler</span>
            </TabsTrigger>
            <TabsTrigger value="calculator" data-testid="tab-calculator" className="flex-1 min-w-[80px] text-xs sm:text-sm px-2 py-1.5">
              <Calculator className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Hesaplama</span>
            </TabsTrigger>
            <TabsTrigger value="stok" data-testid="tab-stok" className="flex-1 min-w-[80px] text-xs sm:text-sm px-2 py-1.5">
              <Package className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Stok</span>
            </TabsTrigger>
            <TabsTrigger value="reports" data-testid="tab-reports" className="flex-1 min-w-[80px] text-xs sm:text-sm px-2 py-1.5">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Raporlar</span>
            </TabsTrigger>
          </TabsList>

          {/* BORDRO TAB */}
          <TabsContent value="bordro" className="space-y-4 mt-4">
            {/* Period Selection */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Dönem ve Personel Seçimi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Yıl</Label>
                    <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                      <SelectTrigger data-testid="select-bordro-year">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2026">2026</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Ay</Label>
                    <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                      <SelectTrigger data-testid="select-bordro-month">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map(m => (
                          <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Personel</Label>
                    <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId} disabled={employees.length === 0}>
                      <SelectTrigger data-testid="select-bordro-employee">
                        <SelectValue placeholder={employees.length === 0 ? "Personel yükleniyor..." : "Personel seçin..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.first_name} {emp.last_name} {emp.branch_name ? `(${emp.branch_name})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button 
                  onClick={calculateEmployeePayroll} 
                  disabled={!selectedEmployeeId || calculateMutation.isPending || employees.length === 0}
                  className="w-full"
                  data-testid="button-calculate-employee-payroll"
                >
                  {calculateMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Hesaplanıyor...</>
                  ) : (
                    <><Calculator className="h-4 w-4 mr-2" /> Bordro Hesapla</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Calculation Result */}
            {payrollCalc && (
              <Card className="border-green-200 dark:border-green-800">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      {payrollCalc.employee.firstName} {payrollCalc.employee.lastName} - {MONTHS[selectedMonth - 1]?.label} {selectedYear}
                    </span>
                    <Badge>{payrollCalc.bonusType === 'kasa_primi' ? 'Kasa Primi' : 'Normal Prim'}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-xs text-muted-foreground">Net Maaş</div>
                      <div className="text-lg font-bold">{formatCurrency(payrollCalc.baseSalary)} TL</div>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-xs text-muted-foreground">Mesai ({Math.round(payrollCalc.overtimeMinutes / 60)} saat)</div>
                      <div className="text-lg font-bold text-green-600">+{formatCurrency(payrollCalc.overtimeAmount)} TL</div>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <div className="text-xs text-muted-foreground">Prim</div>
                      <div className="text-lg font-bold text-purple-600">+{formatCurrency(payrollCalc.bonusAmount)} TL</div>
                    </div>
                    {payrollCalc.undertimeDeduction > 0 && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="text-xs text-muted-foreground">Eksik Çalışma Kesintisi</div>
                        <div className="text-lg font-bold text-red-600">-{formatCurrency(payrollCalc.undertimeDeduction)} TL</div>
                      </div>
                    )}
                  </div>

                  {(payrollCalc.mealAllowance > 0 || payrollCalc.transportAllowance > 0) && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Yemek Yardımı:</span>
                        <span>+{formatCurrency(payrollCalc.mealAllowance)} TL</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Ulaşım Yardımı:</span>
                        <span>+{formatCurrency(payrollCalc.transportAllowance)} TL</span>
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-primary/10">
                      <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Ödenecek Net</div>
                        <div className="text-2xl font-bold">{formatCurrency(payrollCalc.totalNetPayable)} TL</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/50">
                      <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Hesaplanan Brüt</div>
                        <div className="text-xl font-medium">{formatCurrency(payrollCalc.grossSalary)} TL</div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SGK İşçi:</span>
                      <span className="text-red-600">-{formatCurrency(payrollCalc.sgkEmployee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SGK İşveren:</span>
                      <span>{formatCurrency(payrollCalc.sgkEmployer)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gelir Vergisi:</span>
                      <span className="text-red-600">-{formatCurrency(payrollCalc.incomeTax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Damga Vergisi:</span>
                      <span className="text-red-600">-{formatCurrency(payrollCalc.stampTax)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={savePayrollRecord} 
                      disabled={saveMutation.isPending}
                      className="flex-1"
                      data-testid="button-save-payroll"
                    >
                      {saveMutation.isPending ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Kaydediliyor...</>
                      ) : (
                        <><Save className="h-4 w-4 mr-2" /> Taslak Olarak Kaydet</>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setPayrollCalc(null)}
                      data-testid="button-cancel-payroll"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Existing Records */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {MONTHS[selectedMonth - 1]?.label} {selectedYear} Bordro Kayıtları
                </CardTitle>
                <CardDescription>
                  {payrollRecords.length} kayıt bulundu
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingRecords ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : payrollRecords.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Bu dönem için bordro kaydı yok.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {payrollRecords.map((record) => (
                      <div 
                        key={record.id} 
                        className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                        data-testid={`payroll-record-${record.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-medium">{record.first_name} {record.last_name}</div>
                            <div className="text-sm text-muted-foreground">{record.branch_name || 'Merkez'}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-bold">{formatCurrency(record.total_net_payable)} TL</div>
                            <div className="text-xs text-muted-foreground">Net Ödeme</div>
                          </div>
                          <Badge 
                            variant={
                              record.status === 'paid' ? 'default' :
                              record.status === 'approved' ? 'secondary' :
                              record.status === 'pending_approval' ? 'outline' : 'outline'
                            }
                          >
                            {record.status === 'paid' ? 'Ödendi' :
                             record.status === 'approved' ? 'Onaylı' :
                             record.status === 'pending_approval' ? 'Onay Bekliyor' : 'Taslak'}
                          </Badge>
                          {record.status === 'draft' && canEdit && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => approveMutation.mutate({ recordId: record.id, year: selectedYear, month: selectedMonth })}
                              disabled={approveMutation.isPending}
                              data-testid={`button-approve-${record.id}`}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          {record.status === 'approved' && canEdit && (
                            <Button 
                              size="sm"
                              onClick={() => payMutation.mutate({ recordId: record.id, year: selectedYear, month: selectedMonth })}
                              disabled={payMutation.isPending}
                              data-testid={`button-pay-${record.id}`}
                            >
                              <Banknote className="h-4 w-4 mr-1" />
                              Ödendi
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* MAAŞ AYARLARI TAB */}
          <TabsContent value="salaries" className="space-y-4 mt-4">
            <SalarySettingsSection employees={employees} canEdit={canEdit} />
          </TabsContent>

          <TabsContent value="parameters" className="space-y-4 mt-4">
            {currentYearParams ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={currentYearParams.isActive ? "default" : "secondary"}>
                      {currentYearParams.isActive ? "Aktif" : "Pasif"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Yürürlük: {new Date(currentYearParams.effectiveFrom).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => aiCheckMutation.mutate(currentYearParams.id)}
                        disabled={aiCheckMutation.isPending}
                        data-testid="button-ai-regulation-check"
                      >
                        {aiCheckMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Brain className="h-4 w-4 mr-2" />
                        )}
                        {aiCheckMutation.isPending ? "Kontrol Ediliyor..." : "AI ile Mevzuat Kontrol"}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => { 
                          setEditingParam({ ...currentYearParams }); 
                          setIsEditDialogOpen(true); 
                        }}
                        data-testid="button-edit-params"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Düzenle
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-green-600" />
                        Asgari Ücret
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Brüt:</span>
                        <span className="font-medium">{formatCurrency(currentYearParams.minimumWageGross)} TL</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Net:</span>
                        <span className="font-medium">{formatCurrency(currentYearParams.minimumWageNet)} TL</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Percent className="h-4 w-4 text-blue-600" />
                        SGK & İşsizlik
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-xs text-muted-foreground font-medium mb-1">İşçi Payı</div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SGK:</span>
                        <span className="font-medium">%{formatPercent(currentYearParams.sgkEmployeeRate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">İşsizlik:</span>
                        <span className="font-medium">%{formatPercent(currentYearParams.unemploymentEmployeeRate)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-muted-foreground">Toplam İşçi:</span>
                        <span className="font-bold">%{formatPercent(currentYearParams.sgkEmployeeRate + currentYearParams.unemploymentEmployeeRate)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground font-medium mt-2 mb-1">İşveren Payı</div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SGK:</span>
                        <span className="font-medium">%{formatPercent(currentYearParams.sgkEmployerRate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">İşsizlik:</span>
                        <span className="font-medium">%{formatPercent(currentYearParams.unemploymentEmployerRate)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-muted-foreground">Toplam İşveren:</span>
                        <span className="font-bold">%{formatPercent(currentYearParams.sgkEmployerRate + currentYearParams.unemploymentEmployerRate)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-orange-600" />
                        Damga Vergisi
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Oran:</span>
                        <span className="font-medium">Binde {(currentYearParams.stampTaxRate / 100).toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Asgari ücret tutarına kadar istisna uygulanır
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="md:col-span-2 lg:col-span-3">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                        Gelir Vergisi Dilimleri (Kümülatif)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <div className="text-xs text-muted-foreground">1. Dilim</div>
                          <div className="font-medium">%{formatPercent(currentYearParams.taxBracket1Rate)}</div>
                          <div className="text-xs">0 - {formatCurrency(currentYearParams.taxBracket1Limit)} TL</div>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="text-xs text-muted-foreground">2. Dilim</div>
                          <div className="font-medium">%{formatPercent(currentYearParams.taxBracket2Rate)}</div>
                          <div className="text-xs">{formatCurrency(currentYearParams.taxBracket1Limit)} - {formatCurrency(currentYearParams.taxBracket2Limit)} TL</div>
                        </div>
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                          <div className="text-xs text-muted-foreground">3. Dilim</div>
                          <div className="font-medium">%{formatPercent(currentYearParams.taxBracket3Rate)}</div>
                          <div className="text-xs">{formatCurrency(currentYearParams.taxBracket2Limit)} - {formatCurrency(currentYearParams.taxBracket3Limit)} TL</div>
                        </div>
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                          <div className="text-xs text-muted-foreground">4. Dilim</div>
                          <div className="font-medium">%{formatPercent(currentYearParams.taxBracket4Rate)}</div>
                          <div className="text-xs">{formatCurrency(currentYearParams.taxBracket3Limit)} - {formatCurrency(currentYearParams.taxBracket4Limit)} TL</div>
                        </div>
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <div className="text-xs text-muted-foreground">5. Dilim</div>
                          <div className="font-medium">%{formatPercent(currentYearParams.taxBracket5Rate)}</div>
                          <div className="text-xs">{formatCurrency(currentYearParams.taxBracket4Limit)} TL üzeri</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Utensils className="h-4 w-4 text-amber-600" />
                        Yemek Parası Muafiyeti
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Vergi Muaf (Günlük):</span>
                        <span className="font-medium">{formatCurrency(currentYearParams.mealAllowanceTaxExemptDaily)} TL</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SGK Muaf (Nakit):</span>
                        <span className="font-medium">{formatCurrency(currentYearParams.mealAllowanceSgkExemptDaily)} TL</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Yemek kartı ile SGK muafiyeti sınırsızdır
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Bus className="h-4 w-4 text-cyan-600" />
                        Ulaşım Yardımı
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Muaf Limit (Günlük):</span>
                        <span className="font-medium">{formatCurrency(currentYearParams.transportAllowanceExemptDaily)} TL</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-indigo-600" />
                        Çalışma Parametreleri
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Aylık Gün:</span>
                        <span className="font-medium">{currentYearParams.workingDaysPerMonth} gün</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Günlük Saat:</span>
                        <span className="font-medium">{currentYearParams.workingHoursPerDay} saat</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fazla Mesai:</span>
                        <span className="font-medium">x{currentYearParams.overtimeMultiplier}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {currentYearParams.notes && (
                  <Card className="border-yellow-200 dark:border-yellow-800">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-yellow-600 mt-0.5" />
                        <p className="text-sm text-muted-foreground">{currentYearParams.notes}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{selectedYear} yılı için bordro parametreleri bulunamadı.</p>
                  {canEdit && (
                    <Button className="mt-4" data-testid="button-add-params">
                      Parametre Ekle
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="calculator" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Maaş Hesaplama
                </CardTitle>
                <CardDescription>
                  Brüt veya net maaş girerek detaylı bordro hesabı yapın
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="grossSalary">Brüt Maaş (TL)</Label>
                    <Input
                      id="grossSalary"
                      type="number"
                      step="0.01"
                      placeholder="Brüt maaş girin..."
                      value={calcGross}
                      onChange={(e) => { setCalcGross(e.target.value); setCalcNet(""); }}
                      data-testid="input-gross-salary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="netSalary">Net Maaş (TL)</Label>
                    <Input
                      id="netSalary"
                      type="number"
                      step="0.01"
                      placeholder="Net maaş girin..."
                      value={calcNet}
                      onChange={(e) => { setCalcNet(e.target.value); setCalcGross(""); }}
                      data-testid="input-net-salary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cumulativeTaxBase">Kümülatif Vergi Matrahı (TL)</Label>
                    <Input
                      id="cumulativeTaxBase"
                      type="number"
                      step="0.01"
                      placeholder="Yıl başından itibaren toplam..."
                      value={calcCumulativeTaxBase}
                      onChange={(e) => setCalcCumulativeTaxBase(e.target.value)}
                      data-testid="input-cumulative-tax-base"
                    />
                    <p className="text-xs text-muted-foreground">
                      Yıl başından bu aya kadar biriken vergi matrahı
                    </p>
                  </div>
                </div>
                <Button onClick={calculatePayroll} className="w-full" data-testid="button-calculate">
                  <Calculator className="h-4 w-4 mr-2" />
                  Hesapla
                </Button>

                {calcResult && (
                  <div className="mt-6 space-y-4">
                    <Separator />
                    <h3 className="font-semibold flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Hesaplama Sonucu
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="bg-green-50 dark:bg-green-900/20">
                        <CardContent className="pt-4">
                          <div className="text-sm text-muted-foreground">Brüt Maaş</div>
                          <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                            {formatCurrency(calcResult.grossSalary)} TL
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-blue-50 dark:bg-blue-900/20">
                        <CardContent className="pt-4">
                          <div className="text-sm text-muted-foreground">Net Maaş</div>
                          <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                            {formatCurrency(calcResult.netSalary)} TL
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Kesinti Detayları</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>SGK İşçi Payı (%14):</span>
                          <span className="text-red-600">-{formatCurrency(calcResult.sgkEmployee)} TL</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>İşsizlik Sigortası (%1):</span>
                          <span className="text-red-600">-{formatCurrency(calcResult.unemploymentEmployee)} TL</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-sm">
                          <span>Gelir Vergisi Matrahı:</span>
                          <span>{formatCurrency(calcResult.taxBase)} TL</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Gelir Vergisi ({calcResult.taxBracket}. dilim):</span>
                          <span className="text-red-600">-{formatCurrency(calcResult.incomeTax)} TL</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Damga Vergisi:</span>
                          <span className="text-red-600">-{formatCurrency(calcResult.stampTax)} TL</span>
                        </div>
                        {calcResult.minimumWageExemption > 0 && (
                          <div className="flex justify-between text-sm text-green-600">
                            <span>Asgari Ücret İstisnası:</span>
                            <span>+{formatCurrency(calcResult.minimumWageExemption)} TL</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between font-bold">
                          <span>Toplam Kesinti:</span>
                          <span className="text-red-600">-{formatCurrency(calcResult.totalDeductions)} TL</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-muted/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">İşveren Maliyeti</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Brüt Maaş:</span>
                          <span>{formatCurrency(calcResult.grossSalary)} TL</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>SGK İşveren Payı (%20.5):</span>
                          <span>+{formatCurrency(calcResult.sgkEmployer)} TL</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>İşsizlik İşveren Payı (%2):</span>
                          <span>+{formatCurrency(calcResult.unemploymentEmployer)} TL</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                          <span>Toplam Maliyet:</span>
                          <span className="text-primary">{formatCurrency(calcResult.employerCost)} TL</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stok" className="space-y-4 mt-4">
            <StokTab />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6 pb-4">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <TrendingUp className="h-10 w-10 text-primary" />
                    <div>
                      <p className="font-medium">Yönetim & Mali Raporlama</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Gelir/gider takibi, şube karşılaştırması, AI analiz ve dönemsel raporlar
                      </p>
                    </div>
                    <Link href="/muhasebe-raporlama">
                      <Button data-testid="button-open-reporting">
                        <FileText className="mr-2 h-4 w-4" />
                        Raporlama Modülüne Git
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {(user?.role === 'ceo' || user?.role === 'cgo') && (
              <Card>
                <CardContent className="pt-6 pb-4">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <BarChart3 className="h-10 w-10 text-primary" />
                    <div>
                      <p className="font-medium">CEO Komuta Merkezi</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Üst yönetim için mali KPI'lar, performans metrikleri ve stratejik analizler
                      </p>
                    </div>
                    <Link href="/ceo-command-center">
                      <Button data-testid="button-open-ceo-center">
                        <Building2 className="mr-2 h-4 w-4" />
                        CEO Paneline Git
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
              )}
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Hızlı Bordro Özeti</CardTitle>
                <CardDescription className="text-xs">Seçili yıl: {selectedYear}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {payrollRecords && payrollRecords.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Toplam Kayıt:</span>
                      <span className="font-medium">{payrollRecords.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Onaylanan:</span>
                      <span className="font-medium">{payrollRecords.filter((r: any) => r.status === 'approved').length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Ödenen:</span>
                      <span className="font-medium">{payrollRecords.filter((r: any) => r.status === 'paid').length}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-3">Bu dönem için bordro kaydı yok</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bordro Parametrelerini Düzenle - {editingParam?.year}</DialogTitle>
            <DialogDescription>
              Vergi dilimleri, SGK oranları ve muafiyet limitlerini güncelleyin.
            </DialogDescription>
          </DialogHeader>
          
          {editingParam && (
            <div className="grid gap-4 py-4">
              <h4 className="font-medium flex items-center gap-2"><Banknote className="h-4 w-4" /> Asgari Ücret</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Brüt Asgari Ücret (TL)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(editingParam.minimumWageGross / 100).toFixed(2)}
                    onChange={(e) => setEditingParam({ ...editingParam, minimumWageGross: Math.round(parseFloat(e.target.value || "0") * 100) })}
                    data-testid="input-edit-min-wage-gross"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Net Asgari Ücret (TL)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(editingParam.minimumWageNet / 100).toFixed(2)}
                    onChange={(e) => setEditingParam({ ...editingParam, minimumWageNet: Math.round(parseFloat(e.target.value || "0") * 100) })}
                    data-testid="input-edit-min-wage-net"
                  />
                </div>
              </div>

              <Separator />
              <h4 className="font-medium flex items-center gap-2"><Percent className="h-4 w-4" /> SGK & İşsizlik Oranları (%)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SGK İşçi Payı (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={(editingParam.sgkEmployeeRate / 10).toFixed(1)}
                    onChange={(e) => setEditingParam({ ...editingParam, sgkEmployeeRate: Math.round(parseFloat(e.target.value || "0") * 10) })}
                    data-testid="input-edit-sgk-employee"
                  />
                </div>
                <div className="space-y-2">
                  <Label>SGK İşveren Payı (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={(editingParam.sgkEmployerRate / 10).toFixed(1)}
                    onChange={(e) => setEditingParam({ ...editingParam, sgkEmployerRate: Math.round(parseFloat(e.target.value || "0") * 10) })}
                    data-testid="input-edit-sgk-employer"
                  />
                </div>
                <div className="space-y-2">
                  <Label>İşsizlik İşçi Payı (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={(editingParam.unemploymentEmployeeRate / 10).toFixed(1)}
                    onChange={(e) => setEditingParam({ ...editingParam, unemploymentEmployeeRate: Math.round(parseFloat(e.target.value || "0") * 10) })}
                    data-testid="input-edit-unemployment-employee"
                  />
                </div>
                <div className="space-y-2">
                  <Label>İşsizlik İşveren Payı (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={(editingParam.unemploymentEmployerRate / 10).toFixed(1)}
                    onChange={(e) => setEditingParam({ ...editingParam, unemploymentEmployerRate: Math.round(parseFloat(e.target.value || "0") * 10) })}
                    data-testid="input-edit-unemployment-employer"
                  />
                </div>
              </div>

              <Separator />
              <h4 className="font-medium flex items-center gap-2"><Receipt className="h-4 w-4" /> Damga Vergisi</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Damga Vergisi Oranı (Binde)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(editingParam.stampTaxRate / 100).toFixed(2)}
                    onChange={(e) => setEditingParam({ ...editingParam, stampTaxRate: Math.round(parseFloat(e.target.value || "0") * 100) })}
                    data-testid="input-edit-stamp-tax"
                  />
                </div>
              </div>

              <Separator />
              <h4 className="font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Gelir Vergisi Dilimleri</h4>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>1. Dilim Oran (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={(editingParam.taxBracket1Rate / 10).toFixed(1)}
                    onChange={(e) => setEditingParam({ ...editingParam, taxBracket1Rate: Math.round(parseFloat(e.target.value || "0") * 10) })}
                    data-testid="input-edit-tax-rate-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>1. Dilim Üst Sınır (TL)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(editingParam.taxBracket1Limit / 100).toFixed(2)}
                    onChange={(e) => setEditingParam({ ...editingParam, taxBracket1Limit: Math.round(parseFloat(e.target.value || "0") * 100) })}
                    data-testid="input-edit-tax-limit-1"
                  />
                </div>
                <div />
                <div className="space-y-2">
                  <Label>2. Dilim Oran (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={(editingParam.taxBracket2Rate / 10).toFixed(1)}
                    onChange={(e) => setEditingParam({ ...editingParam, taxBracket2Rate: Math.round(parseFloat(e.target.value || "0") * 10) })}
                    data-testid="input-edit-tax-rate-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label>2. Dilim Üst Sınır (TL)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(editingParam.taxBracket2Limit / 100).toFixed(2)}
                    onChange={(e) => setEditingParam({ ...editingParam, taxBracket2Limit: Math.round(parseFloat(e.target.value || "0") * 100) })}
                    data-testid="input-edit-tax-limit-2"
                  />
                </div>
                <div />
                <div className="space-y-2">
                  <Label>3. Dilim Oran (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={(editingParam.taxBracket3Rate / 10).toFixed(1)}
                    onChange={(e) => setEditingParam({ ...editingParam, taxBracket3Rate: Math.round(parseFloat(e.target.value || "0") * 10) })}
                    data-testid="input-edit-tax-rate-3"
                  />
                </div>
                <div className="space-y-2">
                  <Label>3. Dilim Üst Sınır (TL)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(editingParam.taxBracket3Limit / 100).toFixed(2)}
                    onChange={(e) => setEditingParam({ ...editingParam, taxBracket3Limit: Math.round(parseFloat(e.target.value || "0") * 100) })}
                    data-testid="input-edit-tax-limit-3"
                  />
                </div>
                <div />
                <div className="space-y-2">
                  <Label>4. Dilim Oran (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={(editingParam.taxBracket4Rate / 10).toFixed(1)}
                    onChange={(e) => setEditingParam({ ...editingParam, taxBracket4Rate: Math.round(parseFloat(e.target.value || "0") * 10) })}
                    data-testid="input-edit-tax-rate-4"
                  />
                </div>
                <div className="space-y-2">
                  <Label>4. Dilim Üst Sınır (TL)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(editingParam.taxBracket4Limit / 100).toFixed(2)}
                    onChange={(e) => setEditingParam({ ...editingParam, taxBracket4Limit: Math.round(parseFloat(e.target.value || "0") * 100) })}
                    data-testid="input-edit-tax-limit-4"
                  />
                </div>
                <div />
                <div className="space-y-2">
                  <Label>5. Dilim Oran (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={(editingParam.taxBracket5Rate / 10).toFixed(1)}
                    onChange={(e) => setEditingParam({ ...editingParam, taxBracket5Rate: Math.round(parseFloat(e.target.value || "0") * 10) })}
                    data-testid="input-edit-tax-rate-5"
                  />
                </div>
              </div>

              <Separator />
              <h4 className="font-medium flex items-center gap-2"><Utensils className="h-4 w-4" /> Yemek & Ulaşım Muafiyetleri (Günlük TL)</h4>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Yemek Vergi Muafiyeti</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(editingParam.mealAllowanceTaxExemptDaily / 100).toFixed(2)}
                    onChange={(e) => setEditingParam({ ...editingParam, mealAllowanceTaxExemptDaily: Math.round(parseFloat(e.target.value || "0") * 100) })}
                    data-testid="input-edit-meal-tax"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Yemek SGK Muafiyeti</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(editingParam.mealAllowanceSgkExemptDaily / 100).toFixed(2)}
                    onChange={(e) => setEditingParam({ ...editingParam, mealAllowanceSgkExemptDaily: Math.round(parseFloat(e.target.value || "0") * 100) })}
                    data-testid="input-edit-meal-sgk"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ulaşım Muafiyeti</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(editingParam.transportAllowanceExemptDaily / 100).toFixed(2)}
                    onChange={(e) => setEditingParam({ ...editingParam, transportAllowanceExemptDaily: Math.round(parseFloat(e.target.value || "0") * 100) })}
                    data-testid="input-edit-transport"
                  />
                </div>
              </div>

              <Separator />
              <h4 className="font-medium flex items-center gap-2"><Clock className="h-4 w-4" /> Çalışma Parametreleri</h4>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Aylık Gün</Label>
                  <Input
                    type="number"
                    value={editingParam.workingDaysPerMonth}
                    onChange={(e) => setEditingParam({ ...editingParam, workingDaysPerMonth: parseInt(e.target.value || "30") })}
                    data-testid="input-edit-working-days"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Günlük Saat</Label>
                  <Input
                    type="number"
                    value={editingParam.workingHoursPerDay}
                    onChange={(e) => setEditingParam({ ...editingParam, workingHoursPerDay: parseInt(e.target.value || "8") })}
                    data-testid="input-edit-working-hours"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fazla Mesai Çarpanı</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingParam.overtimeMultiplier}
                    onChange={(e) => setEditingParam({ ...editingParam, overtimeMultiplier: e.target.value || "1.5" })}
                    data-testid="input-edit-overtime"
                  />
                </div>
              </div>

              <Separator />
              <div className="flex items-center gap-3">
                <Label>Durum:</Label>
                <Button
                  variant={editingParam.isActive ? "default" : "outline"}
                  onClick={() => setEditingParam({ ...editingParam, isActive: !editingParam.isActive })}
                  data-testid="button-toggle-active"
                >
                  {editingParam.isActive ? "Aktif" : "Pasif"}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} data-testid="button-cancel-edit">
              <X className="h-4 w-4 mr-2" />
              İptal
            </Button>
            <Button 
              onClick={() => editingParam && updateMutation.mutate(editingParam)}
              disabled={updateMutation.isPending}
              data-testid="button-save-params"
            >
              <Save className="h-4 w-4 mr-2" />
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAiCheckDialogOpen} onOpenChange={setIsAiCheckDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Mevzuat Kontrol Sonuçları
            </DialogTitle>
            <DialogDescription>
              Yapay zeka tarafından güncel Türk bordro mevzuatı ile karşılaştırma yapılmıştır
            </DialogDescription>
          </DialogHeader>
          {aiCheckResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {aiCheckResult.status === 'up_to_date' ? (
                  <Badge variant="default" data-testid="badge-ai-status-ok">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    Güncel
                  </Badge>
                ) : (
                  <Badge variant="destructive" data-testid="badge-ai-status-update">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Güncelleme Gerekli
                  </Badge>
                )}
                <Badge variant="secondary">
                  Güven: {aiCheckResult.confidence === 'high' ? 'Yüksek' : aiCheckResult.confidence === 'medium' ? 'Orta' : 'Düşük'}
                </Badge>
              </div>

              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm" data-testid="text-ai-summary">{aiCheckResult.summary}</p>
                </CardContent>
              </Card>

              {aiCheckResult.changes && aiCheckResult.changes.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Önerilen Değişiklikler</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (selectedAiChanges.size === aiCheckResult.changes.length) {
                          setSelectedAiChanges(new Set());
                        } else {
                          setSelectedAiChanges(new Set(aiCheckResult.changes.map((_: any, i: number) => i)));
                        }
                      }}
                      data-testid="button-toggle-all-changes"
                    >
                      {selectedAiChanges.size === aiCheckResult.changes.length ? "Hiçbirini Seçme" : "Tümünü Seç"}
                    </Button>
                  </div>
                  {aiCheckResult.changes.map((change: AiRegulationSuggestion, index: number) => {
                    const isMonetary = ['minimumWageGross', 'minimumWageNet', 'taxBracket1Limit', 'taxBracket2Limit', 'taxBracket3Limit', 'taxBracket4Limit', 'mealAllowanceTaxExemptDaily', 'mealAllowanceSgkExemptDaily', 'transportAllowanceExemptDaily'].includes(change.field);
                    const isRate = ['sgkEmployeeRate', 'sgkEmployerRate', 'unemploymentEmployeeRate', 'unemploymentEmployerRate'].includes(change.field);
                    const isStampTax = change.field === 'stampTaxRate';
                    const isTaxRate = change.field.includes('taxBracket') && change.field.includes('Rate');

                    const formatValue = (val: number) => {
                      if (isMonetary) return `${(val / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`;
                      if (isRate) return `%${(val / 10).toFixed(1)}`;
                      if (isStampTax) return `%${(val / 10000).toFixed(4)}`;
                      if (isTaxRate) return `%${(val / 100).toFixed(0)}`;
                      return val.toString();
                    };

                    return (
                      <Card
                        key={index}
                        className={`cursor-pointer transition-colors ${selectedAiChanges.has(index) ? 'border-primary' : ''}`}
                        onClick={() => {
                          const next = new Set(selectedAiChanges);
                          if (next.has(index)) next.delete(index);
                          else next.add(index);
                          setSelectedAiChanges(next);
                        }}
                        data-testid={`card-ai-change-${index}`}
                      >
                        <CardContent className="pt-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedAiChanges.has(index)}
                                onChange={() => {}}
                                className="rounded"
                                data-testid={`checkbox-ai-change-${index}`}
                              />
                              <span className="font-medium text-sm">{change.fieldLabel}</span>
                            </div>
                            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-muted-foreground line-through">{formatValue(change.currentValue)}</span>
                            <ArrowRight className="h-3 w-3" />
                            <span className="font-medium text-primary">{formatValue(change.suggestedValue)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{change.reason}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {aiCheckResult.source && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Kaynak: {aiCheckResult.source}
                </div>
              )}

              {aiCheckResult.notes && (
                <Card>
                  <CardContent className="pt-3">
                    <p className="text-xs text-muted-foreground">{aiCheckResult.notes}</p>
                  </CardContent>
                </Card>
              )}

              <Separator />

              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                AI önerileri referans amaçlıdır. Uygulamadan önce Resmi Gazete ve SGK genelgelerinden teyit ediniz.
              </p>
            </div>
          )}
          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setIsAiCheckDialogOpen(false)} data-testid="button-close-ai-dialog">
              Kapat
            </Button>
            {aiCheckResult?.changes && aiCheckResult.changes.length > 0 && selectedAiChanges.size > 0 && (
              <Button
                onClick={() => {
                  const selectedChanges = aiCheckResult.changes.filter((_: any, i: number) => selectedAiChanges.has(i));
                  applyAiSuggestionsMutation.mutate({
                    parameterId: aiCheckResult.parameterId,
                    changes: selectedChanges,
                  });
                }}
                disabled={applyAiSuggestionsMutation.isPending}
                data-testid="button-apply-ai-suggestions"
              >
                {applyAiSuggestionsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                {selectedAiChanges.size} Değişikliği Uygula
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Maaş Ayarları Bölümü Component
function SalarySettingsSection({ employees, canEdit }: { employees: Employee[]; canEdit: boolean }) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formValues, setFormValues] = useState({
    netSalary: 0,
    mealAllowance: 0,
    transportAllowance: 0,
    bonusBase: 0,
    bonusType: "normal",
    bonusPercentage: 0,
  });

  const [editingScaleId, setEditingScaleId] = useState<number | null>(null);
  const [scaleEditValues, setScaleEditValues] = useState({
    baseSalary: "",
    cashRegisterBonus: "",
    performanceBonus: "",
    bonusCalculationType: "",
    totalSalary: "",
  });

  const { data: salaryScales = [] } = useQuery<SalaryScale[]>({ queryKey: ['/api/salary-scales'] });

  const fabrikaScales = salaryScales.filter(s => s.locationType === 'fabrika');
  const subeScales = salaryScales.filter(s => s.locationType === 'sube');

  const formatScaleCurrency = (value: string) => {
    const num = parseFloat(value || "0");
    return num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleScaleEdit = (scale: SalaryScale) => {
    setEditingScaleId(scale.id);
    setScaleEditValues({
      baseSalary: parseFloat(scale.baseSalary).toString(),
      cashRegisterBonus: parseFloat(scale.cashRegisterBonus).toString(),
      performanceBonus: parseFloat(scale.performanceBonus).toString(),
      bonusCalculationType: scale.bonusCalculationType,
      totalSalary: parseFloat(scale.totalSalary).toString(),
    });
  };

  const updateScaleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof scaleEditValues }) => {
      const res = await apiRequest("PUT", `/api/salary-scales/${id}`, {
        baseSalary: data.baseSalary,
        cashRegisterBonus: data.cashRegisterBonus,
        performanceBonus: data.performanceBonus,
        bonusCalculationType: data.bonusCalculationType,
        totalSalary: data.totalSalary,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/salary-scales'] });
      toast({ title: "Maaş skalası güncellendi" });
      setEditingScaleId(null);
    },
    onError: (error: any) => {
      toast({ title: "Güncelleme başarısız", description: error.message, variant: "destructive" });
    },
  });

  const handleScaleSave = () => {
    if (editingScaleId === null) return;
    updateScaleMutation.mutate({ id: editingScaleId, data: scaleEditValues });
  };

  const renderScaleTable = (scales: SalaryScale[], title: string, showCashRegister: boolean) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid={`table-salary-scale-${showCashRegister ? 'sube' : 'fabrika'}`}>
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Pozisyon / Seviye</th>
                  <th className="px-4 py-2 text-right font-medium">Temel Maaş</th>
                  {showCashRegister && <th className="px-4 py-2 text-right font-medium">Kasa Primi</th>}
                  <th className="px-4 py-2 text-right font-medium">Performans Primi</th>
                  <th className="px-4 py-2 text-center font-medium">Yemek Parası</th>
                  <th className="px-4 py-2 text-right font-medium">Toplam</th>
                  {canEdit && <th className="px-4 py-2 text-center font-medium">İşlem</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {scales.length === 0 ? (
                  <tr>
                    <td colSpan={showCashRegister ? 7 : 6} className="px-4 py-8 text-center text-muted-foreground">
                      Veri bulunamadı
                    </td>
                  </tr>
                ) : (
                  scales.map((scale) => {
                    const isEditing = editingScaleId === scale.id;
                    return (
                      <tr key={scale.id} data-testid={`row-salary-scale-${scale.id}`}>
                        <td className="px-4 py-2 font-medium">{scale.positionName}</td>
                        <td className="px-4 py-2 text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={scaleEditValues.baseSalary}
                              onChange={(e) => setScaleEditValues({ ...scaleEditValues, baseSalary: e.target.value })}
                              className="w-28 text-right ml-auto"
                              data-testid={`input-scale-base-salary-${scale.id}`}
                            />
                          ) : (
                            <span data-testid={`text-scale-base-salary-${scale.id}`}>{formatScaleCurrency(scale.baseSalary)} TL</span>
                          )}
                        </td>
                        {showCashRegister && (
                          <td className="px-4 py-2 text-right">
                            {isEditing ? (
                              <Input
                                type="number"
                                step="0.01"
                                value={scaleEditValues.cashRegisterBonus}
                                onChange={(e) => setScaleEditValues({ ...scaleEditValues, cashRegisterBonus: e.target.value })}
                                className="w-28 text-right ml-auto"
                                data-testid={`input-scale-cash-bonus-${scale.id}`}
                              />
                            ) : (
                              <span data-testid={`text-scale-cash-bonus-${scale.id}`}>{formatScaleCurrency(scale.cashRegisterBonus)} TL</span>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-2 text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={scaleEditValues.performanceBonus}
                              onChange={(e) => setScaleEditValues({ ...scaleEditValues, performanceBonus: e.target.value })}
                              className="w-28 text-right ml-auto"
                              data-testid={`input-scale-perf-bonus-${scale.id}`}
                            />
                          ) : (
                            <span data-testid={`text-scale-perf-bonus-${scale.id}`}>{formatScaleCurrency(scale.performanceBonus)} TL</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={scaleEditValues.bonusCalculationType}
                              onChange={(e) => setScaleEditValues({ ...scaleEditValues, bonusCalculationType: e.target.value })}
                              className="w-28 text-right mx-auto"
                              placeholder="300"
                              data-testid={`input-scale-meal-${scale.id}`}
                            />
                          ) : (
                            <Badge variant="secondary" data-testid={`badge-scale-meal-${scale.id}`}>
                              Günlük 300 ₺
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right font-medium">
                          {isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={scaleEditValues.totalSalary}
                              onChange={(e) => setScaleEditValues({ ...scaleEditValues, totalSalary: e.target.value })}
                              className="w-28 text-right ml-auto"
                              data-testid={`input-scale-total-${scale.id}`}
                            />
                          ) : (
                            <span data-testid={`text-scale-total-${scale.id}`}>{formatScaleCurrency(scale.totalSalary)} TL</span>
                          )}
                        </td>
                        {canEdit && (
                          <td className="px-4 py-2 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={handleScaleSave}
                                  disabled={updateScaleMutation.isPending}
                                  data-testid={`button-save-scale-${scale.id}`}
                                >
                                  {updateScaleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setEditingScaleId(null)}
                                  data-testid={`button-cancel-scale-${scale.id}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleScaleEdit(scale)}
                                data-testid={`button-edit-scale-${scale.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const formatCurrency = (valueInKurus: number) => {
    return (valueInKurus / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const updateCompensationMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: typeof formValues }) => {
      const res = await apiRequest("PUT", `/api/users/${userId}/compensation`, {
        netSalary: data.netSalary,
        mealAllowance: data.mealAllowance,
        transportAllowance: data.transportAllowance,
        bonusBase: data.bonusBase,
        bonusType: data.bonusType,
        bonusPercentage: data.bonusPercentage.toString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees-with-salary'] });
      toast({ title: "Maaş bilgileri güncellendi" });
      setEditingEmployee(null);
    },
    onError: (error: any) => {
      toast({ title: "Güncelleme başarısız", description: error.message, variant: "destructive" });
    },
  });

  const filteredEmployees = employees.filter(emp => {
    const name = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  const handleEdit = (emp: Employee) => {
    if (!canEdit) return;
    setEditingEmployee(emp);
    setFormValues({
      netSalary: emp.net_salary || 0,
      mealAllowance: emp.meal_allowance || 0,
      transportAllowance: emp.transport_allowance || 0,
      bonusBase: emp.bonus_base || 0,
      bonusType: emp.bonus_type || "normal",
      bonusPercentage: parseFloat(String(emp.bonus_percentage)) || 0,
    });
  };

  const handleSave = () => {
    if (!editingEmployee) return;
    updateCompensationMutation.mutate({ userId: editingEmployee.id, data: formValues });
  };

  return (
    <div className="space-y-4">
      {renderScaleTable(fabrikaScales, "Fabrika Maaş Tablosu", false)}
      {renderScaleTable(subeScales, "Şube Maaş Tablosu", true)}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Personel Maaş Ayarları
          </CardTitle>
          <CardDescription>
            Net maaş, yemek yardımı, ulaşım yardımı ve prim ayarlarını düzenleyin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Personel ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-employee"
            />
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Personel</th>
                    <th className="px-4 py-2 text-left font-medium">Şube</th>
                    <th className="px-4 py-2 text-right font-medium">Net Maaş</th>
                    <th className="px-4 py-2 text-right font-medium">Yemek</th>
                    <th className="px-4 py-2 text-right font-medium">Ulaşım</th>
                    <th className="px-4 py-2 text-right font-medium">Prim Türü</th>
                    <th className="px-4 py-2 text-right font-medium">%</th>
                    <th className="px-4 py-2 text-center font-medium">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        {searchTerm ? "Sonuç bulunamadı" : "Personel yükleniyor..."}
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr key={emp.id} className="hover-elevate" data-testid={`row-employee-${emp.id}`}>
                        <td className="px-4 py-2">
                          <div className="font-medium">{emp.first_name} {emp.last_name}</div>
                          <div className="text-xs text-muted-foreground">{emp.role}</div>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">{emp.branch_name || '-'}</td>
                        <td className="px-4 py-2 text-right font-medium">
                          {emp.net_salary > 0 ? `${formatCurrency(emp.net_salary)} TL` : '-'}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {emp.meal_allowance > 0 ? `${formatCurrency(emp.meal_allowance)} TL` : '-'}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {emp.transport_allowance > 0 ? `${formatCurrency(emp.transport_allowance)} TL` : '-'}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Badge variant="secondary" className="text-[10px]">
                            {emp.bonus_type === 'kasa_primi' ? 'Kasa' : emp.bonus_type === 'satis_primi' ? 'Satış' : emp.bonus_type === 'sabit_prim' ? 'Sabit' : 'Normal'}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-right">
                          {parseFloat(String(emp.bonus_percentage)) > 0 ? `%${emp.bonus_percentage}` : '-'}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {canEdit && (
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => handleEdit(emp)}
                              data-testid={`button-edit-salary-${emp.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingEmployee} onOpenChange={(open) => !open && setEditingEmployee(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Maaş Bilgilerini Düzenle</DialogTitle>
            <DialogDescription>
              {editingEmployee?.first_name} {editingEmployee?.last_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-green-600" />
                Net Maaş (TL)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={(formValues.netSalary / 100).toFixed(2)}
                onChange={(e) => setFormValues({ ...formValues, netSalary: Math.round(parseFloat(e.target.value || "0") * 100) })}
                data-testid="input-net-salary"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Utensils className="h-4 w-4 text-orange-600" />
                Yemek Yardımı (TL)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={(formValues.mealAllowance / 100).toFixed(2)}
                onChange={(e) => setFormValues({ ...formValues, mealAllowance: Math.round(parseFloat(e.target.value || "0") * 100) })}
                data-testid="input-meal-allowance"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Bus className="h-4 w-4 text-blue-600" />
                Ulaşım Yardımı (TL)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={(formValues.transportAllowance / 100).toFixed(2)}
                onChange={(e) => setFormValues({ ...formValues, transportAllowance: Math.round(parseFloat(e.target.value || "0") * 100) })}
                data-testid="input-transport-allowance"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                Prim Matrahı (TL)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={(formValues.bonusBase / 100).toFixed(2)}
                onChange={(e) => setFormValues({ ...formValues, bonusBase: Math.round(parseFloat(e.target.value || "0") * 100) })}
                data-testid="input-bonus-base"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-600" />
                Prim Türü
              </Label>
              <Select value={formValues.bonusType} onValueChange={(v) => setFormValues({ ...formValues, bonusType: v })}>
                <SelectTrigger data-testid="select-bonus-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal Prim</SelectItem>
                  <SelectItem value="kasa_primi">Kasa Primi</SelectItem>
                  <SelectItem value="satis_primi">Satış Primi</SelectItem>
                  <SelectItem value="sabit_prim">Sabit Prim</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-indigo-600" />
                Prim Yüzdesi (%)
              </Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formValues.bonusPercentage}
                onChange={(e) => setFormValues({ ...formValues, bonusPercentage: parseFloat(e.target.value || "0") })}
                data-testid="input-bonus-percentage"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEmployee(null)} data-testid="button-cancel-salary">
              <X className="h-4 w-4 mr-2" />
              İptal
            </Button>
            <Button 
              onClick={handleSave}
              disabled={updateCompensationMutation.isPending}
              data-testid="button-save-salary"
            >
              {updateCompensationMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
