/**
 * Employee Dialogs — Personel ekleme, düzenleme, uyarı, şifre sıfırlama
 * Extracted from ik.tsx for maintainability
 */
import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission, isHQRole, type User, type EmployeeWarning, insertUserSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Key, Eye } from "lucide-react";
import { format } from "date-fns";
import { ROLE_LABELS } from "@/lib/turkish-labels";

const warningTypeLabels: Record<string, string> = {
  verbal: "Sözlü Uyarı",
  written: "Yazılı Uyarı",
  final: "Son Uyarı",
};

const branchRoles = ["mudur", "supervisor", "supervisor_buddy", "barista", "bar_buddy", "stajyer"];
const hqRoles = ["ceo", "cgo", "muhasebe_ik", "muhasebe", "satinalma", "coach", "marketing", "trainer", "kalite_kontrol", "gida_muhendisi", "fabrika_mudur", "teknik", "destek", "yatirimci_hq"];
const factoryRoles = ["fabrika_operator", "fabrika_sorumlu", "fabrika_personel"];
const HQ_BRANCH_ID = 23;
const FACTORY_BRANCH_ID = 24;

function getRolesForBranch(branchId: number | undefined): string[] {
  if (branchId === HQ_BRANCH_ID) return hqRoles;
  if (branchId === FACTORY_BRANCH_ID) return factoryRoles;
  return branchRoles;
}

export function AddEmployeeDialog({
  open,
  onOpenChange,
  branches,
  userRole,
  userBranchId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: { id: number; name: string }[];
  userRole?: string;
  userBranchId?: number;
}) {
  const { toast } = useToast();

  const createEmployeeSchema = insertUserSchema.extend({
    username: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalı"),
    hashedPassword: z.string().min(6, "Şifre en az 6 karakter olmalı"),
    firstName: z.string().min(1, "Ad zorunludur"),
    lastName: z.string().min(1, "Soyad zorunludur"),
  });

  type CreateEmployeeForm = {
    username: string;
    hashedPassword: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    branchId?: number | null;
    hireDate: string;
    probationEndDate: string;
    birthDate: string;
    phoneNumber: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    notes: string;
    employmentType: string;
    weeklyHours: number;
  };

  const isSupervisor = userRole === "supervisor";
  const defaultCategory = isSupervisor ? "branch" : "hq";
  const [personnelCategory, setPersonnelCategory] = useState<"hq" | "factory" | "branch">(defaultCategory);

  const availableRoles = useMemo(() => {
    if (personnelCategory === "hq") return hqRoles;
    if (personnelCategory === "factory") return factoryRoles;
    return branchRoles;
  }, [personnelCategory]);

  const regularBranches = useMemo(() => {
    return branches.filter(b => b.id !== HQ_BRANCH_ID && b.id !== FACTORY_BRANCH_ID);
  }, [branches]);

  const form = useForm<CreateEmployeeForm>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      username: "",
      hashedPassword: "",
      email: "",
      firstName: "",
      lastName: "",
      role: isSupervisor ? "barista" : hqRoles[0] || "barista",
      branchId: isSupervisor ? userBranchId : undefined,
      hireDate: "",
      probationEndDate: "",
      birthDate: "",
      phoneNumber: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      notes: "",
      employmentType: "fulltime",
      weeklyHours: 45,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateEmployeeForm) => {
      const payload = { ...data };
      if (personnelCategory === "hq") {
        payload.branchId = HQ_BRANCH_ID;
      } else if (personnelCategory === "factory") {
        payload.branchId = FACTORY_BRANCH_ID;
      }
      return apiRequest("POST", "/api/employees", payload);
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Personel eklendi",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Personel eklenirken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const handleCategoryChange = (cat: "hq" | "factory" | "branch") => {
    setPersonnelCategory(cat);
    const roles = cat === "hq" ? hqRoles : cat === "factory" ? factoryRoles : branchRoles;
    form.setValue("role", roles[0] || "barista");
    if (cat === "branch") {
      form.setValue("branchId", regularBranches[0]?.id || undefined);
    } else {
      form.setValue("branchId", undefined);
    }
  };

  const onSubmit = (data: CreateEmployeeForm) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yeni Personel Ekle</DialogTitle>
          <DialogDescription>
            Yeni personel bilgilerini girin
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-2 sm:space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ad *</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-first-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Soyad *</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-last-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kullanıcı Adı *</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-username" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hashedPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şifre *</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} value={field.value || ""} data-testid="input-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-posta</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} value={field.value || ""} data-testid="input-email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isSupervisor && (
              <div>
                <FormLabel>Personel Kategorisi *</FormLabel>
                <div className="flex gap-2 mt-1">
                  <Button
                    type="button"
                    variant={personnelCategory === "hq" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => handleCategoryChange("hq")}
                    data-testid="button-category-hq"
                  >
                    <Building2 className="w-4 h-4 mr-1" />
                    Merkez (HQ)
                  </Button>
                  <Button
                    type="button"
                    variant={personnelCategory === "factory" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => handleCategoryChange("factory")}
                    data-testid="button-category-factory"
                  >
                    <Building2 className="w-4 h-4 mr-1" />
                    Fabrika
                  </Button>
                  <Button
                    type="button"
                    variant={personnelCategory === "branch" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => handleCategoryChange("branch")}
                    data-testid="button-category-branch"
                  >
                    <MapPin className="w-4 h-4 mr-1" />
                    Şube
                  </Button>
                </div>
              </div>
            )}

            <div className={`grid gap-2 sm:gap-3 ${personnelCategory === "branch" && !isSupervisor ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-role">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(ROLE_LABELS)
                          .filter(([key]) => availableRoles.includes(key))
                          .map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {personnelCategory === "branch" && !isSupervisor && (
                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Şube *</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value ? field.value.toString() : ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-branch">
                            <SelectValue placeholder="Şube seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {regularBranches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id.toString()}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {isSupervisor && (
                <input type="hidden" value={userBranchId || ""} />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              <FormField
                control={form.control}
                name="hireDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>İşe Giriş Tarihi</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} data-testid="input-hire-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="probationEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deneme Süresi Bitiş</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} data-testid="input-probation-end" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Doğum Tarihi</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} data-testid="input-birth-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefon</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} data-testid="input-phone" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <FormField
                control={form.control}
                name="employmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Çalışma Tipi</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || "fulltime"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-employment-type">
                          <SelectValue placeholder="Çalışma tipi seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="fulltime">Tam Zamanlı (45 saat)</SelectItem>
                        <SelectItem value="parttime">Yarı Zamanlı</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weeklyHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Haftalık Saat</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={10} 
                        max={45}
                        {...field} 
                        value={field.value || 45}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 45)}
                        data-testid="input-weekly-hours" 
                        disabled={form.watch("employmentType") === "fulltime"}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Tam zamanlı: 45 saat, Yarı zamanlı: 10-30 saat
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <FormField
                control={form.control}
                name="emergencyContactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Acil Durum Kişisi</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-emergency-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emergencyContactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Acil Durum Telefonu</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-emergency-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notlar</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ""} data-testid="textarea-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="w-full sm:w-auto" data-testid="button-submit-employee">
                {createMutation.isPending ? "Ekleniyor..." : "Personel Ekle"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Employee Dialog Component (continued in next message due to length)
export function EditEmployeeDialog({
  open,
  onOpenChange,
  employee,
  branches,
  userRole,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: User;
  branches: { id: number; name: string }[];
  userRole?: string;
}) {
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      firstName: employee.firstName || "",
      lastName: employee.lastName || "",
      email: employee.email || "",
      role: employee.role,
      branchId: employee.branchId,
      hireDate: employee.hireDate || "",
      probationEndDate: employee.probationEndDate || "",
      birthDate: employee.birthDate || "",
      phoneNumber: employee.phoneNumber || "",
      emergencyContactName: employee.emergencyContactName || "",
      emergencyContactPhone: employee.emergencyContactPhone || "",
      notes: employee.notes || "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return apiRequest("PUT", `/api/employees/${employee.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Personel bilgileri güncellendi",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Güncelleme sırasında hata oluştu",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: Record<string, unknown>) => {
    updateMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Personel Düzenle</DialogTitle>
          <DialogDescription>
            {employee.firstName} {employee.lastName} - Bilgileri Güncelle
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-2 sm:space-y-3">
            {userRole === "admin" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ad</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Soyad</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rol</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(ROLE_LABELS)
                              .filter(([key]) => key !== "admin")
                              .map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                  {label}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="branchId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Şube</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Şube seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {branches.map((branch) => (
                              <SelectItem key={branch.id} value={branch.id.toString()}>
                                {branch.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  <FormField
                    control={form.control}
                    name="hireDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>İşe Giriş Tarihi</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="probationEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deneme Süresi Bitiş</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="birthDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Doğum Tarihi</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {(userRole === "supervisor" || userRole === "coach") && (
              <>
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefon</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <FormField
                    control={form.control}
                    name="emergencyContactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Acil Durum Kişisi</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emergencyContactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Acil Durum Telefonu</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notlar</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormDescription>
                    {userRole === "coach" && "Eğitim ve gelişim notları"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={updateMutation.isPending} className="w-full sm:w-auto">
                {updateMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Warnings Dialog Component
export function WarningsDialog({
  open,
  onOpenChange,
  employee,
  warnings,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: User;
  warnings: EmployeeWarning[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Uyarı Geçmişi</DialogTitle>
          <DialogDescription>
            {employee.firstName} {employee.lastName} - Uyarı Kayıtları
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-2 sm:gap-3 max-h-[60vh] overflow-y-auto">
          {warnings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Uyarı kaydı bulunmuyor
            </p>
          ) : (
            warnings.map((warning) => (
              <Card key={warning.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {warningTypeLabels[warning.warningType] || warning.warningType}
                      </CardTitle>
                      <CardDescription>
                        {format(new Date(warning.issuedAt), "dd MMMM yyyy HH:mm")}
                      </CardDescription>
                    </div>
                    {warning.resolvedAt && (
                      <Badge variant="secondary">Çözüldü</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{warning.description}</p>
                  {warning.notes && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Not: {warning.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Add Warning Dialog Component
export function AddWarningDialog({
  open,
  onOpenChange,
  employee,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: User;
}) {
  const { toast } = useToast();

  const warningSchema = z.object({
    warningType: z.enum(["verbal", "written", "final"]),
    description: z.string().min(10, "Açıklama en az 10 karakter olmalı"),
    notes: z.string().optional(),
  });

  const form = useForm<z.infer<typeof warningSchema>>({
    resolver: zodResolver(warningSchema),
    defaultValues: {
      warningType: "verbal",
      description: "",
      notes: "",
    },
  });

  const createWarningMutation = useMutation({
    mutationFn: async (data: z.infer<typeof warningSchema>) => {
      return apiRequest("POST", `/api/employees/${employee.id}/warnings`, data);
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Uyarı kaydedildi",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/employees", employee.id, "warnings"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Uyarı eklenirken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof warningSchema>) => {
    createWarningMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Uyarı Ekle</DialogTitle>
          <DialogDescription>
            {employee.firstName} {employee.lastName} - Yeni Uyarı
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-2 sm:space-y-3">
            <FormField
              control={form.control}
              name="warningType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Uyarı Türü</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-warning-type">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="verbal">Sözlü Uyarı</SelectItem>
                      <SelectItem value="written">Yazılı Uyarı</SelectItem>
                      <SelectItem value="final">Son Uyarı</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Açıklama</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} data-testid="textarea-warning-description" />
                  </FormControl>
                  <FormDescription>
                    Uyarının nedeni ve detayları
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ek Notlar (Opsiyonel)</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ""} rows={2} data-testid="textarea-warning-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={createWarningMutation.isPending} className="w-full sm:w-auto" data-testid="button-submit-warning">
                {createWarningMutation.isPending ? "Kaydediliyor..." : "Uyarı Ekle"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


// Reset Password Dialog Component
export function ResetPasswordDialog({
  open,
  onOpenChange,
  employee,
  newPassword,
  setNewPassword,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: User;
  newPassword: string;
  setNewPassword: (password: string) => void;
}) {
  const { toast } = useToast();

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { newPassword: string }) => {
      return apiRequest("POST", `/api/employees/${employee.id}/reset-password`, data);
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Şifre başarıyla sıfırlandı",
      });
      onOpenChange(false);
      setNewPassword("");
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Şifre sıfırlanırken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast({
        title: "Hata",
        description: "Şifre en az 8 karakter olmalıdır",
        variant: "destructive",
      });
      return;
    }
    if (!/[A-Za-z]/.test(newPassword)) {
      toast({
        title: "Hata",
        description: "Şifre en az bir harf içermelidir",
        variant: "destructive",
      });
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      toast({
        title: "Hata",
        description: "Şifre en az bir rakam içermelidir",
        variant: "destructive",
      });
      return;
    }
    resetPasswordMutation.mutate({ newPassword });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Şifre Sıfırla</DialogTitle>
          <DialogDescription>
            {employee.firstName} {employee.lastName} - Yeni Şifre Belirle
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="w-full space-y-2 sm:space-y-3">
          <div className="flex flex-col gap-3 sm:gap-4">
            <label className="text-sm font-medium">Yeni Şifre</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="En az 8 karakter (harf ve rakam)"
              data-testid="input-new-password"
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              Şifre en az 8 karakter olmalı, en az bir harf ve bir rakam içermelidir
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button 
              type="submit" 
              disabled={resetPasswordMutation.isPending || newPassword.length < 8}
              data-testid="button-submit-reset-password"
            >
              {resetPasswordMutation.isPending ? "Sıfırlanıyor..." : "Şifreyi Sıfırla"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
