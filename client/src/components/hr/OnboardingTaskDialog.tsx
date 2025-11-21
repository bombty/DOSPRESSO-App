import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { insertEmployeeOnboardingTaskSchema } from "@shared/schema";
import { Plus } from "lucide-react";

interface OnboardingTaskDialogProps {
  onboardingId: number;
  userId: string;
}

const createTaskSchema = insertEmployeeOnboardingTaskSchema.extend({
  taskType: z.enum(["document_upload", "training", "orientation", "system_access", "meet_team"]),
  taskName: z.string().min(1, "Görev adı gereklidir"),
  priority: z.enum(["low", "medium", "high"]),
});

type CreateTaskFormData = z.infer<typeof createTaskSchema>;

export function OnboardingTaskDialog({ onboardingId, userId }: OnboardingTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreateTaskFormData>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      onboardingId,
      taskType: "orientation",
      taskName: "",
      description: "",
      dueDate: "",
      priority: "medium",
      status: "pending",
      notes: "",
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: CreateTaskFormData) => {
      return apiRequest("POST", "/api/onboarding-tasks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding-tasks", onboardingId] });
      queryClient.invalidateQueries({ queryKey: ["/api/employee-onboarding", userId] });
      setOpen(false);
      form.reset();
      toast({
        title: "Görev oluşturuldu",
        description: "Onboarding görevi başarıyla eklendi",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Görev oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateTaskFormData) => {
    createTaskMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-create-onboarding-task">
          <Plus className="h-4 w-4 mr-2" />
          Görev Ekle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg" data-testid="dialog-create-onboarding-task">
        <DialogHeader>
          <DialogTitle>Yeni Onboarding Görevi</DialogTitle>
          <DialogDescription>
            Onboarding süreci için yeni görev ekleyin
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="taskType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Görev Türü *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-task-type">
                        <SelectValue placeholder="Seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="document_upload">Belge Yükle</SelectItem>
                      <SelectItem value="training">Eğitim</SelectItem>
                      <SelectItem value="orientation">Oryantasyon</SelectItem>
                      <SelectItem value="system_access">Sistem Erişimi</SelectItem>
                      <SelectItem value="meet_team">Takımla Tanışma</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="taskName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Görev Adı *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Örn: İş sözleşmesi imzala" data-testid="input-task-name" />
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
                  <FormLabel>Açıklama</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} placeholder="Görev detaylarını yazın" rows={3} data-testid="textarea-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bitiş Tarihi</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} type="date" data-testid="input-due-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Öncelik</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-priority">
                          <SelectValue placeholder="Seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Düşük</SelectItem>
                        <SelectItem value="medium">Orta</SelectItem>
                        <SelectItem value="high">Yüksek</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel">
                İptal
              </Button>
              <Button type="submit" disabled={createTaskMutation.isPending} data-testid="button-submit">
                Oluştur
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
