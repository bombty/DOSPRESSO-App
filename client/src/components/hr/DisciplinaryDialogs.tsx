import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertDisciplinaryReportSchema } from "@shared/schema";
import { Plus, MessageSquare, CheckCircle } from "lucide-react";

interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  branchId?: number;
}

interface CreateDisciplinaryDialogProps {
  userId: string;
  branchId: number;
}

interface CreateDisciplinaryWithSelectorProps {
  branchId: number;
}

const createDisciplinarySchema = insertDisciplinaryReportSchema.extend({
  reportType: z.enum(["verbal_warning", "written_warning", "suspension", "termination", "other"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  subject: z.string().min(1, "Konu gereklidir"),
  description: z.string().min(1, "Açıklama gereklidir"),
  incidentDate: z.string().min(1, "Olay tarihi gereklidir"),
});

type CreateDisciplinaryFormData = z.infer<typeof createDisciplinarySchema>;

export function CreateDisciplinaryDialog({ userId, branchId }: CreateDisciplinaryDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreateDisciplinaryFormData>({
    resolver: zodResolver(createDisciplinarySchema),
    defaultValues: {
      userId,
      branchId,
      reportType: "verbal_warning",
      severity: "low",
      subject: "",
      description: "",
      incidentDate: "",
      incidentTime: "",
      location: "",
      status: "pending",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateDisciplinaryFormData) => {
      return apiRequest("POST", "/api/disciplinary-reports", data);
    },
    onSuccess: () => {
      // Invalidate user-specific queries
      queryClient.invalidateQueries({ queryKey: ["/api/disciplinary-reports", userId] });
      // Invalidate all disciplinary report queries (exact: false for prefix match)
      queryClient.invalidateQueries({ queryKey: ["/api/disciplinary-reports"], exact: false });
      setOpen(false);
      form.reset();
      toast({
        title: "Disiplin kaydı oluşturuldu",
        description: "Kayıt başarıyla eklendi",
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Disiplin kaydı oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateDisciplinaryFormData) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-create-disciplinary">
          <Plus className="h-4 w-4 mr-2" />
          Kayıt Ekle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-disciplinary">
        <DialogHeader>
          <DialogTitle>Yeni Disiplin Kaydı</DialogTitle>
          <DialogDescription>
            Personel için disiplin kaydı oluşturun
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="reportType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kayıt Türü *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-report-type">
                          <SelectValue placeholder="Seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="verbal_warning">Sözlü Uyarı</SelectItem>
                        <SelectItem value="written_warning">Yazılı Uyarı</SelectItem>
                        <SelectItem value="suspension">Uzaklaştırma</SelectItem>
                        <SelectItem value="termination">İş Akdinin Feshi</SelectItem>
                        <SelectItem value="other">Diğer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Önem Derecesi *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-severity">
                          <SelectValue placeholder="Seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Düşük</SelectItem>
                        <SelectItem value="medium">Orta</SelectItem>
                        <SelectItem value="high">Yüksek</SelectItem>
                        <SelectItem value="critical">Kritik</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Konu *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Örn: Geç kalma" data-testid="input-subject" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Açıklama *</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Detaylı açıklama yazın" rows={4} data-testid="textarea-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="incidentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Olay Tarihi *</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="input-incident-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="incidentTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Olay Saati</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} type="time" data-testid="input-incident-time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Konum</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} placeholder="Örn: Şube ana kasa" data-testid="input-location" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel">
                İptal
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                Oluştur
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// New component with personnel selector for supervisors
const createDisciplinaryWithSelectorSchema = insertDisciplinaryReportSchema.extend({
  userId: z.string().min(1, "Personel seçimi zorunludur"),
  reportType: z.enum(["verbal_warning", "written_warning", "suspension", "termination", "other"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  subject: z.string().min(1, "Konu gereklidir"),
  description: z.string().min(1, "Açıklama gereklidir"),
  incidentDate: z.string().min(1, "Olay tarihi gereklidir"),
});

type CreateDisciplinaryWithSelectorFormData = z.infer<typeof createDisciplinaryWithSelectorSchema>;

export function CreateDisciplinaryDialogWithSelector({ branchId }: CreateDisciplinaryWithSelectorProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  // Fetch branch personnel
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users", { branchId }],
    enabled: open,
  });

  const form = useForm<CreateDisciplinaryWithSelectorFormData>({
    resolver: zodResolver(createDisciplinaryWithSelectorSchema),
    defaultValues: {
      userId: "",
      branchId,
      reportType: "verbal_warning",
      severity: "low",
      subject: "",
      description: "",
      incidentDate: "",
      incidentTime: "",
      location: "",
      status: "pending",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateDisciplinaryWithSelectorFormData) => {
      return apiRequest("POST", "/api/disciplinary-reports", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/disciplinary-reports"], exact: false });
      setOpen(false);
      form.reset();
      toast({
        title: "Disiplin kaydı oluşturuldu",
        description: "Kayıt başarıyla eklendi",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Disiplin kaydı oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateDisciplinaryWithSelectorFormData) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-create-disciplinary-with-selector">
          <Plus className="h-4 w-4 mr-2" />
          Kayıt Ekle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-disciplinary-selector">
        <DialogHeader>
          <DialogTitle>Yeni Disiplin Kaydı</DialogTitle>
          <DialogDescription>
            Personel için disiplin kaydı oluşturun
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Personnel Selector */}
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personel *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-personnel">
                        <SelectValue placeholder="Personel seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.firstName} {u.lastName} ({u.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="reportType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kayıt Türü *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-report-type-selector">
                          <SelectValue placeholder="Seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="verbal_warning">Sözlü Uyarı</SelectItem>
                        <SelectItem value="written_warning">Yazılı Uyarı</SelectItem>
                        <SelectItem value="suspension">Uzaklaştırma</SelectItem>
                        <SelectItem value="termination">İş Akdinin Feshi</SelectItem>
                        <SelectItem value="other">Diğer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Önem Derecesi *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-severity-selector">
                          <SelectValue placeholder="Seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Düşük</SelectItem>
                        <SelectItem value="medium">Orta</SelectItem>
                        <SelectItem value="high">Yüksek</SelectItem>
                        <SelectItem value="critical">Kritik</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Konu *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Örn: Geç kalma" data-testid="input-subject-selector" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Açıklama *</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Detaylı açıklama yazın" rows={4} data-testid="textarea-description-selector" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="incidentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Olay Tarihi *</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="input-incident-date-selector" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="incidentTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Olay Saati</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} type="time" data-testid="input-incident-time-selector" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Konum</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} placeholder="Örn: Şube ana kasa" data-testid="input-location-selector" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel-selector">
                İptal
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-selector">
                Oluştur
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface AddResponseDialogProps {
  reportId: number;
  userId: string;
}

const addResponseSchema = z.object({
  employeeResponse: z.string().min(1, "Yanıt metni gereklidir"),
});

type AddResponseFormData = z.infer<typeof addResponseSchema>;

export function AddResponseDialog({ reportId, userId }: AddResponseDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<AddResponseFormData>({
    resolver: zodResolver(addResponseSchema),
    defaultValues: {
      employeeResponse: "",
    },
  });

  const addResponseMutation = useMutation({
    mutationFn: async (data: AddResponseFormData) => {
      return apiRequest("POST", `/api/disciplinary-reports/${reportId}/response`, data);
    },
    onSuccess: () => {
      // Invalidate user-specific queries
      queryClient.invalidateQueries({ queryKey: ["/api/disciplinary-reports", userId] });
      // Invalidate all disciplinary report queries (exact: false for prefix match)
      queryClient.invalidateQueries({ queryKey: ["/api/disciplinary-reports"], exact: false });
      setOpen(false);
      form.reset();
      toast({
        title: "Yanıt eklendi",
        description: "Personel yanıtı başarıyla kaydedildi",
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Yanıt eklenemedi",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AddResponseFormData) => {
    addResponseMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid={`button-add-response-${reportId}`}>
          <MessageSquare className="h-4 w-4 mr-2" />
          Yanıt Ekle
        </Button>
      </DialogTrigger>
      <DialogContent data-testid={`dialog-add-response-${reportId}`}>
        <DialogHeader>
          <DialogTitle>Personel Yanıtı Ekle</DialogTitle>
          <DialogDescription>
            Personelin bu disiplin kaydı hakkındaki yazılı savunmasını ekleyin
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="employeeResponse"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Yanıt Metni *</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Personelin yazılı savunmasını girin" rows={6} data-testid="textarea-response" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel">
                İptal
              </Button>
              <Button type="submit" disabled={addResponseMutation.isPending} data-testid="button-submit">
                Kaydet
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface ResolveDialogProps {
  reportId: number;
  userId: string;
}

const resolveSchema = z.object({
  resolution: z.string().min(1, "Çözüm gereklidir"),
  actionTaken: z.enum(["verbal_warning", "written_warning", "suspension", "termination", "cleared"]),
  followUpRequired: z.boolean(),
  followUpDate: z.string().optional(),
});

type ResolveFormData = z.infer<typeof resolveSchema>;

export function ResolveDialog({ reportId, userId }: ResolveDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<ResolveFormData>({
    resolver: zodResolver(resolveSchema),
    defaultValues: {
      resolution: "",
      actionTaken: "verbal_warning",
      followUpRequired: false,
      followUpDate: "",
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (data: ResolveFormData) => {
      return apiRequest("POST", `/api/disciplinary-reports/${reportId}/resolve`, data);
    },
    onSuccess: () => {
      // Invalidate user-specific queries
      queryClient.invalidateQueries({ queryKey: ["/api/disciplinary-reports", userId] });
      // Invalidate all disciplinary report queries (exact: false for prefix match)
      queryClient.invalidateQueries({ queryKey: ["/api/disciplinary-reports"], exact: false });
      setOpen(false);
      form.reset();
      toast({
        title: "Kayıt çözümlendi",
        description: "Disiplin kaydı başarıyla çözümlendi",
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: error.message || "Kayıt çözümlenemedi",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ResolveFormData) => {
    resolveMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid={`button-resolve-${reportId}`}>
          <CheckCircle className="h-4 w-4 mr-2" />
          Çözümle
        </Button>
      </DialogTrigger>
      <DialogContent data-testid={`dialog-resolve-${reportId}`}>
        <DialogHeader>
          <DialogTitle>Disiplin Kaydını Çözümle</DialogTitle>
          <DialogDescription>
            Bu disiplin kaydını sonuçlandırın ve alınan aksiyonu belirtin
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="resolution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Çözüm *</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Kaydın nasıl çözümlendiğini açıklayın" rows={4} data-testid="textarea-resolution" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="actionTaken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alınan Aksiyon *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-action-taken">
                        <SelectValue placeholder="Seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="verbal_warning">Sözlü Uyarı</SelectItem>
                      <SelectItem value="written_warning">Yazılı Uyarı</SelectItem>
                      <SelectItem value="suspension">Uzaklaştırma</SelectItem>
                      <SelectItem value="termination">İş Akdi Feshi</SelectItem>
                      <SelectItem value="cleared">Temize Çıkarıldı</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="followUpRequired"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <input type="checkbox" checked={field.value} onChange={field.onChange} data-testid="checkbox-follow-up" className="mt-1" />
                  </FormControl>
                  <FormLabel>Takip gerekli mi?</FormLabel>
                </FormItem>
              )}
            />
            {form.watch("followUpRequired") && (
              <FormField
                control={form.control}
                name="followUpDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Takip Tarihi</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="input-follow-up-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel">
                İptal
              </Button>
              <Button type="submit" disabled={resolveMutation.isPending} data-testid="button-submit">
                Çözümle
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
