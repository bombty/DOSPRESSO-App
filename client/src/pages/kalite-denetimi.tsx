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
import { CheckCircle2, XCircle, Clock, FileSearch, Plus } from "lucide-react";
import { format } from "date-fns";

const CreateAuditFormSchema = z.object({
  branchId: z.coerce.number({ required_error: "Şube seçimi gerekli" }),
  templateId: z.coerce.number().optional(),
  auditDate: z.string().min(1, "Denetim tarihi gerekli"),
  notes: z.string().optional(),
});

type CreateAuditFormValues = z.infer<typeof CreateAuditFormSchema>;

interface QualityAudit {
  id: number;
  branchId: number;
  templateId: number | null;
  auditorId: string;
  auditDate: string;
  totalScore: number | null;
  maxScore: number | null;
  passingScore: number | null;
  status: "pending" | "in_progress" | "completed" | "failed";
  notes: string | null;
  createdAt: string;
}

interface AuditTemplate {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
}

interface Branch {
  id: number;
  name: string;
  shortName: string;
}

export default function KaliteDenetimi() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const isHQ = user?.role && isHQRole(user.role as any);
  const canCreateAudit = user?.role === 'coach' || user?.role === 'admin';

  const { data: audits, isLoading: auditsLoading } = useQuery<QualityAudit[]>({
    queryKey: ["/api/quality-audits"],
  });

  const { data: templates } = useQuery<AuditTemplate[]>({
    queryKey: ["/api/audit-templates"],
    enabled: canCreateAudit,
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    enabled: canCreateAudit,
  });

  const form = useForm<CreateAuditFormValues>({
    resolver: zodResolver(CreateAuditFormSchema),
    defaultValues: {
      branchId: user?.branchId || undefined,
      auditDate: new Date().toISOString().split('T')[0],
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateAuditFormValues) => {
      await apiRequest("POST", "/api/quality-audits", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quality-audits"] });
      toast({ title: "Başarılı", description: "Kalite denetimi oluşturuldu" });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Denetim oluşturulurken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge data-testid={`badge-status-completed`} className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"><CheckCircle2 className="w-3 h-3 mr-1" />Tamamlandı</Badge>;
      case "failed":
        return <Badge data-testid={`badge-status-failed`} variant="destructive"><XCircle className="w-3 h-3 mr-1" />Başarısız</Badge>;
      case "in_progress":
        return <Badge data-testid={`badge-status-in-progress`} className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"><Clock className="w-3 h-3 mr-1" />Devam Ediyor</Badge>;
      default:
        return <Badge data-testid={`badge-status-pending`} variant="outline"><Clock className="w-3 h-3 mr-1" />Bekliyor</Badge>;
    }
  };

  const getScorePercentage = (audit: QualityAudit) => {
    if (!audit.totalScore || !audit.maxScore) return null;
    return Math.round((audit.totalScore / audit.maxScore) * 100);
  };

  if (auditsLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-kalite-denetimi">Kalite Denetimi</h1>
          <p className="text-muted-foreground mt-1">Şube kalite denetimlerini takip edin ve yönetin</p>
        </div>
        {canCreateAudit && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-audit">
                <Plus className="w-4 h-4 mr-2" />
                Yeni Denetim
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni Kalite Denetimi</DialogTitle>
                <DialogDescription>Şube için yeni bir kalite denetimi başlatın</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
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
                    name="templateId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Şablon (Opsiyonel)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger data-testid="select-template">
                              <SelectValue placeholder="Şablon seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {templates?.map((template) => (
                              <SelectItem key={template.id} value={template.id.toString()} data-testid={`option-template-${template.id}`}>
                                {template.name}
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
                    name="auditDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Denetim Tarihi</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-audit-date" />
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
                          <Textarea {...field} placeholder="Denetim notları..." rows={3} data-testid="textarea-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} data-testid="button-cancel">
                      İptal
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-audit">
                      {createMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!audits || audits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileSearch className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground" data-testid="text-no-audits">Henüz denetim bulunmuyor</p>
            {canCreateAudit && (
              <Button onClick={() => setIsCreateDialogOpen(true)} className="mt-4" data-testid="button-create-first-audit">
                <Plus className="w-4 h-4 mr-2" />
                İlk Denetimi Oluştur
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
          {audits.map((audit) => {
            const scorePercentage = getScorePercentage(audit);
            return (
              <Card key={audit.id} data-testid={`card-audit-${audit.id}`} className="hover-elevate">
                <CardContent className="p-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium" data-testid={`text-audit-id-${audit.id}`}>
                          Denetim #{audit.id}
                        </h3>
                        <p className="text-xs text-muted-foreground" data-testid={`text-audit-date-${audit.id}`}>
                          {format(new Date(audit.auditDate), "dd MMM")}
                        </p>
                      </div>
                      {getStatusBadge(audit.status)}
                    </div>
                    {scorePercentage !== null && (
                      <div className="text-xs">
                        <p className="text-muted-foreground">
                          {audit.totalScore}/{audit.maxScore} ({scorePercentage}%)
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
