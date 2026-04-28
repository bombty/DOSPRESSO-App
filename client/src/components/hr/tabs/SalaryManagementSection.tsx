/**
 * SalaryManagementSection — Maaş Yönetimi
 * Extracted from ik.tsx for maintainability
 */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type User } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { Edit, Star, Users } from "lucide-react";
import { format } from "date-fns";
import { ROLE_LABELS } from "@/lib/turkish-labels";

export default function SalaryManagementSection({ employees, branches }: { employees: User[]; branches: { id: number; name: string }[] }) {
  const { toast } = useToast();
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Personel maaş ve yan hak verileri
  const { data: employeesWithSalary = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/employees-with-salary'],
  });

  // Bordro parametreleri
  const { data: payrollParams } = useQuery<any[]>({
    queryKey: ['/api/payroll/parameters'],
    staleTime: 1800000,
  });

  const currentParams = payrollParams?.find((p: any) => p.isActive) || payrollParams?.[0];

  // Filtreleme
  const filteredEmployees = employeesWithSalary.filter((emp: any) => {
    if (branchFilter !== "all" && emp.branch_id?.toString() !== branchFilter) return false;
    if (searchQuery && !`${emp.first_name} ${emp.last_name}`.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR'))) return false;
    return true;
  });

  // Maaş güncelleme mutation
  const updateSalaryMutation = useMutation({
    mutationFn: async ({ userId, netSalary }: { userId: string; netSalary: number }) => {
      return apiRequest("PATCH", `/api/users/${userId}/salary`, { netSalary });
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Maaş güncellendi" });
      queryClient.invalidateQueries({ queryKey: ['/api/employees-with-salary'] });
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  // Yan hak güncelleme mutation
  const updateBenefitsMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.benefitId) {
        return apiRequest("PATCH", `/api/employee-benefits/${data.benefitId}`, data);
      } else {
        return apiRequest("POST", "/api/employee-benefits", data);
      }
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Yan haklar güncellendi" });
      queryClient.invalidateQueries({ queryKey: ['/api/employees-with-salary'] });
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const mealBenefitLabels: Record<string, string> = {
    none: "Yok",
    card: "Yemek Kartı",
    cash: "Nakit",
    workplace: "İşyerinde Yemek",
  };

  const transportBenefitLabels: Record<string, string> = {
    none: "Yok",
    card: "Ulaşım Kartı",
    cash: "Nakit",
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return (value / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + " TL";
  };

  return (
    <div className="space-y-4">
      {/* Özet Kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Toplam Personel</p>
            <p className="text-2xl font-bold">{employeesWithSalary.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Maaş Tanımlı</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {employeesWithSalary.filter((e: any) => e.net_salary > 0).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Yemek Yardımı</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {employeesWithSalary.filter((e: any) => e.meal_benefit_type && e.meal_benefit_type !== 'none').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Asgari Ücret</p>
            <p className="text-2xl font-bold">{currentParams ? formatCurrency(currentParams.minimumWageNet) : "-"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtreler */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium">Ara</label>
              <Input
                placeholder="İsim ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-salary-search"
              />
            </div>
            <div className="w-[200px]">
              <label className="text-sm font-medium">Şube</label>
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger data-testid="select-salary-branch">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Şubeler</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personel Listesi */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Personel Maaş & Yan Haklar
          </CardTitle>
          <CardDescription>Personel bazlı maaş ve yan hak bilgileri</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ListSkeleton count={3} variant="row" />
          ) : filteredEmployees.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Personel bulunamadı"
              description="Bu kriterlere uyan personel bulunamadı."
              data-testid="empty-state-salary-employees"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Personel</TableHead>
                    <TableHead>Şube</TableHead>
                    <TableHead className="text-right">Net Maaş</TableHead>
                    <TableHead>Yemek</TableHead>
                    <TableHead>Ulaşım</TableHead>
                    <TableHead>Prim</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp: any) => (
                    <TableRow key={emp.id} data-testid={`salary-row-${emp.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{emp.first_name} {emp.last_name}</p>
                          <p className="text-xs text-muted-foreground">{ROLE_LABELS[emp.role] || emp.role}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{emp.branch_name || "HQ"}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {emp.net_salary > 0 ? formatCurrency(emp.net_salary) : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {emp.meal_benefit_type && emp.meal_benefit_type !== 'none' ? (
                          <div>
                            <Badge variant="secondary">{mealBenefitLabels[emp.meal_benefit_type]}</Badge>
                            {emp.meal_benefit_amount > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatCurrency(emp.meal_benefit_amount)}/gün
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {emp.transport_benefit_type && emp.transport_benefit_type !== 'none' ? (
                          <div>
                            <Badge variant="secondary">{transportBenefitLabels[emp.transport_benefit_type]}</Badge>
                            {emp.transport_benefit_amount > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatCurrency(emp.transport_benefit_amount)}/gün
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {emp.bonus_eligible ? (
                          <Badge variant="default">{emp.bonus_percentage || 0}%</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setIsEditDialogOpen(true);
                          }}
                          data-testid={`button-edit-salary-${emp.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <SalaryEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        employee={selectedEmployee}
        currentParams={currentParams}
        onUpdateSalary={(data) => updateSalaryMutation.mutate(data)}
        onUpdateBenefits={(data) => updateBenefitsMutation.mutate(data)}
        isPending={updateSalaryMutation.isPending || updateBenefitsMutation.isPending}
      />
    </div>
  );
}

// Maaş Düzenleme Dialog
function SalaryEditDialog({
  open,
  onOpenChange,
  employee,
  currentParams,
  onUpdateSalary,
  onUpdateBenefits,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: any;
  currentParams: any;
  onUpdateSalary: (data: { userId: string; netSalary: number }) => void;
  onUpdateBenefits: (data: any) => void;
  isPending: boolean;
}) {
  const [netSalary, setNetSalary] = useState("");
  const [mealBenefitType, setMealBenefitType] = useState("none");
  const [mealBenefitAmount, setMealBenefitAmount] = useState("");
  const [transportBenefitType, setTransportBenefitType] = useState("none");
  const [transportBenefitAmount, setTransportBenefitAmount] = useState("");
  const [bonusEligible, setBonusEligible] = useState(true);
  const [bonusPercentage, setBonusPercentage] = useState("");

  useEffect(() => {
    if (employee) {
      setNetSalary(employee.net_salary ? (employee.net_salary / 100).toString() : "");
      setMealBenefitType(employee.meal_benefit_type || "none");
      setMealBenefitAmount(employee.meal_benefit_amount ? (employee.meal_benefit_amount / 100).toString() : "");
      setTransportBenefitType(employee.transport_benefit_type || "none");
      setTransportBenefitAmount(employee.transport_benefit_amount ? (employee.transport_benefit_amount / 100).toString() : "");
      setBonusEligible(employee.bonus_eligible !== false);
      setBonusPercentage(employee.bonus_percentage?.toString() || "0");
    }
  }, [employee]);

  const handleSaveSalary = () => {
    const salary = Math.round(parseFloat(netSalary || "0") * 100);
    onUpdateSalary({ userId: employee.id, netSalary: salary });
  };

  const handleSaveBenefits = () => {
    onUpdateBenefits({
      userId: employee.id,
      benefitId: employee.benefit_id,
      mealBenefitType,
      mealBenefitAmount: Math.round(parseFloat(mealBenefitAmount || "0") * 100),
      transportBenefitType,
      transportBenefitAmount: Math.round(parseFloat(transportBenefitAmount || "0") * 100),
      bonusEligible,
      bonusPercentage,
      effectiveFrom: new Date().toISOString().split('T')[0],
    });
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Maaş & Yan Haklar</DialogTitle>
          <DialogDescription>
            {employee.first_name} {employee.last_name} - {ROLE_LABELS[employee.role] || employee.role}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Maaş Bilgisi */}
          <div className="p-4 border rounded-lg space-y-3">
            <h4 className="font-medium">Maaş Bilgisi</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Net Maaş (TL)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={netSalary}
                  onChange={(e) => setNetSalary(e.target.value)}
                  placeholder="0.00"
                  data-testid="input-edit-net-salary"
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={handleSaveSalary} 
                  disabled={isPending}
                  className="w-full sm:w-auto"
                  data-testid="button-save-salary"
                >
                  Maaş Kaydet
                </Button>
              </div>
            </div>
            {currentParams && (
              <p className="text-xs text-muted-foreground">
                Asgari Ücret: {((currentParams.minimumWageNet || 0) / 100).toLocaleString('tr-TR')} TL
              </p>
            )}
          </div>

          {/* Yemek Yardımı */}
          <div className="p-4 border rounded-lg space-y-3">
            <h4 className="font-medium">Yemek Yardımı</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Tip</label>
                <Select value={mealBenefitType} onValueChange={setMealBenefitType}>
                  <SelectTrigger data-testid="select-meal-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Yok</SelectItem>
                    <SelectItem value="card">Yemek Kartı</SelectItem>
                    <SelectItem value="cash">Nakit</SelectItem>
                    <SelectItem value="workplace">İşyerinde</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Günlük Tutar (TL)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={mealBenefitAmount}
                  onChange={(e) => setMealBenefitAmount(e.target.value)}
                  disabled={mealBenefitType === "none" || mealBenefitType === "workplace"}
                  placeholder="0.00"
                  data-testid="input-meal-amount"
                />
              </div>
            </div>
          </div>

          {/* Ulaşım Yardımı */}
          <div className="p-4 border rounded-lg space-y-3">
            <h4 className="font-medium">Ulaşım Yardımı</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Tip</label>
                <Select value={transportBenefitType} onValueChange={setTransportBenefitType}>
                  <SelectTrigger data-testid="select-transport-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Yok</SelectItem>
                    <SelectItem value="card">Ulaşım Kartı</SelectItem>
                    <SelectItem value="cash">Nakit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Günlük Tutar (TL)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={transportBenefitAmount}
                  onChange={(e) => setTransportBenefitAmount(e.target.value)}
                  disabled={transportBenefitType === "none"}
                  placeholder="0.00"
                  data-testid="input-transport-amount"
                />
              </div>
            </div>
          </div>

          {/* Prim */}
          <div className="p-4 border rounded-lg space-y-3">
            <h4 className="font-medium">Prim/Bonus</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="bonus-eligible"
                  checked={bonusEligible}
                  onCheckedChange={(checked) => setBonusEligible(checked === true)}
                  data-testid="checkbox-bonus-eligible"
                />
                <label htmlFor="bonus-eligible" className="text-sm">Prim hakkı var</label>
              </div>
              <div>
                <label className="text-sm font-medium">Prim Oranı (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={bonusPercentage}
                  onChange={(e) => setBonusPercentage(e.target.value)}
                  disabled={!bonusEligible}
                  placeholder="0"
                  data-testid="input-bonus-percentage"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button 
            onClick={handleSaveBenefits} 
            disabled={isPending}
            data-testid="button-save-benefits"
          >
            {isPending ? "Kaydediliyor..." : "Yan Hakları Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
