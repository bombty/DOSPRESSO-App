import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

const quickTaskSchema = z.object({
  description: z.string().min(1, "Görev açıklaması gereklidir").max(500),
  priority: z.enum(["dusuk", "orta", "yuksek"]),
  dueDate: z.string().optional(),
});

type QuickTaskFormData = z.infer<typeof quickTaskSchema>;

interface QuickTaskModalProps {
  trigger?: React.ReactNode;
}

export function QuickTaskModal({ trigger }: QuickTaskModalProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<QuickTaskFormData>({
    resolver: zodResolver(quickTaskSchema),
    defaultValues: {
      description: "",
      priority: "orta",
      dueDate: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: QuickTaskFormData) => {
      await apiRequest("POST", "/api/tasks", {
        description: data.description,
        priority: data.priority,
        status: "beklemede",
        branchId: user?.branchId,
        dueDate: data.dueDate || null,
      });
    },
    onSuccess: () => {
      toast({
        title: "✅ Görev Oluşturuldu",
        description: "Yeni görev başarıyla oluşturuldu",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      form.reset();
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message || "Görev oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    createMutation.mutate(data);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline" data-testid="button-quick-task">
            <Plus className="h-4 w-4 mr-1" />
            Hızlı Görev
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Hızlı Görev Oluştur</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Görev Açıklaması</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Görev açıklamasını girin..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      data-testid="input-task-description"
                    />
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
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-priority">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="dusuk">Düşük</SelectItem>
                      <SelectItem value="orta">Orta</SelectItem>
                      <SelectItem value="yuksek">Yüksek</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Son Tarih (İsteğe Bağlı)</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      data-testid="input-due-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1"
                data-testid="button-submit-task"
              >
                {createMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                data-testid="button-cancel-task"
              >
                İptal
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
