import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Store, Plus, CheckCircle2, Clock, AlertCircle, FileText } from "lucide-react";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";

const CreateOnboardingFormSchema = z.object({
  branchId: z.coerce.number({ required_error: "Şube seçimi gerekli" }),
  franchiseeName: z.string().min(1, "Franchise ismi gerekli"),
  contactPerson: z.string().min(1, "İletişim kişisi gerekli"),
  contactPhone: z.string().min(1, "Telefon gerekli"),
  contactEmail: z.string().email("Geçerli bir email adresi girin"),
  expectedOpeningDate: z.string().min(1, "Açılış tarihi gerekli"),
  notes: z.string().optional(),
});

type CreateOnboardingFormValues = z.infer<typeof CreateOnboardingFormSchema>;

interface FranchiseOnboarding {
  id: number;
  branchId: number;
  franchiseeName: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  status: "planning" | "construction" | "training" | "ready" | "opened";
  expectedOpeningDate: string;
  actualOpeningDate: string | null;
  completionPercentage: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Branch {
  id: number;
  name: string;
  shortName: string;
}

export default function FranchiseAcilis() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const isHQ = user?.role && isHQRole(user.role as any);
  const canManageOnboarding = isHQ;

  const { data: onboardingProcesses, isLoading } = useQuery<FranchiseOnboarding[]>({
    queryKey: ["/api/franchise-onboarding"],
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    enabled: canManageOnboarding,
  });

  const form = useForm<CreateOnboardingFormValues>({
    resolver: zodResolver(CreateOnboardingFormSchema),
    defaultValues: {
      branchId: undefined,
      franchiseeName: "",
      contactPerson: "",
      contactPhone: "",
      contactEmail: "",
      expectedOpeningDate: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateOnboardingFormValues) => {
      await apiRequest("POST", "/api/franchise-onboarding", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/franchise-onboarding"] });
      toast({ title: "Başarılı", description: "Franchise açılış süreci başlatıldı" });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Açılış süreci oluşturulurken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string, onboardingId?: number) => {
    const testId = onboardingId ? `badge-status-${onboardingId}` : "badge-status";
    switch (status) {
      case "opened":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" data-testid={testId}><CheckCircle2 className="w-3 h-3 mr-1" />Açıldı</Badge>;
      case "ready":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" data-testid={testId}><CheckCircle2 className="w-3 h-3 mr-1" />Hazır</Badge>;
      case "training":
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100" data-testid={testId}><Clock className="w-3 h-3 mr-1" />Eğitim</Badge>;
      case "construction":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100" data-testid={testId}><AlertCircle className="w-3 h-3 mr-1" />İnşaat</Badge>;
      default:
        return <Badge variant="outline" data-testid={testId}><Clock className="w-3 h-3 mr-1" />Planlama</Badge>;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      planning: "Planlama",
      construction: "İnşaat",
      training: "Eğitim",
      ready: "Hazır",
      opened: "Açıldı",
    };
    return labels[status] || status;
  };

  if (isLoading) {
    return (
      <div className="p-6 grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="p-3 flex flex-col gap-3 sm:gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-franchise-acilis">Franchise Açılış Yönetimi</h1>
          <p className="text-muted-foreground mt-1">Yeni franchise açılış süreçlerini takip edin</p>
        </div>
        {canManageOnboarding && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-onboarding">
                <Plus className="w-4 h-4 mr-2" />
                Yeni Açılış Süreci
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni Franchise Açılış Süreci</DialogTitle>
                <DialogDescription>Yeni bir franchise açılış süreci başlatın</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="branchId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Şube</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger data-testid="select-branch">
                              <SelectValue placeholder="Şube seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {branches?.map((branch) => (
                              <SelectItem key={branch.id} value={branch.id.toString()} data-testid={`option-branch-${branch.id}`}>
                                {branch.name} ({branch.shortName})
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
                    name="franchiseeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Franchise İsmi</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Franchise sahibinin adı" data-testid="input-franchisee-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <FormField
                      control={form.control}
                      name="contactPerson"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>İletişim Kişisi</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ad Soyad" data-testid="input-contact-person" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefon</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="0555 123 45 67" data-testid="input-contact-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="ornek@email.com" data-testid="input-contact-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expectedOpeningDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Planlanan Açılış Tarihi</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-expected-opening-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notlar</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Önemli notlar..." rows={3} data-testid="textarea-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} data-testid="button-cancel">
                      İptal
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-onboarding">
                      {createMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!onboardingProcesses || onboardingProcesses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Store className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground" data-testid="text-no-onboarding">Henüz açılış süreci bulunmuyor</p>
            {canManageOnboarding && (
              <Button onClick={() => setIsCreateDialogOpen(true)} className="mt-4" data-testid="button-create-first-onboarding">
                <Plus className="w-4 h-4 mr-2" />
                İlk Açılış Sürecini Başlat
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2 sm:gap-3">
          {onboardingProcesses.map((process) => {
            const expectedDate = new Date(process.expectedOpeningDate);
            const progress = process.completionPercentage || 0;

            return (
              <Card key={process.id} data-testid={`card-onboarding-${process.id}`} className="hover-elevate">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg flex items-center gap-2" data-testid={`text-franchisee-name-${process.id}`}>
                        <Store className="w-5 h-5" />
                        {process.franchiseeName}
                      </CardTitle>
                      <CardDescription data-testid={`text-contact-info-${process.id}`}>
                        {process.contactPerson} • {process.contactPhone}
                      </CardDescription>
                    </div>
                    {getStatusBadge(process.status, process.id)}
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
                  <div className="flex flex-col gap-3 sm:gap-4 gap-2 sm:gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">Şube ID</p>
                      <p className="font-medium" data-testid={`text-branch-id-${process.id}`}>{process.branchId}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Planlanan Açılış</p>
                      <p className="font-medium" data-testid={`text-expected-date-${process.id}`}>
                        {format(expectedDate, "dd MMM yyyy")}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Durum</p>
                      <p className="font-medium" data-testid={`text-status-${process.id}`}>
                        {getStatusLabel(process.status)}
                      </p>
                    </div>
                  </div>

                  {progress > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Tamamlanma</span>
                        <span className="text-sm font-medium" data-testid={`text-progress-${process.id}`}>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}

                  {process.notes && (
                    <div className="p-3 bg-muted rounded-md">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 mt-0.5 text-muted-foreground" />
                        <p className="text-sm" data-testid={`text-notes-${process.id}`}>{process.notes}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
