import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertChecklistSchema, type Checklist, type InsertChecklist, type ChecklistTask } from "@shared/schema";
import { FileText, Plus } from "lucide-react";

export default function Checklists() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: checklists, isLoading } = useQuery<Checklist[]>({
    queryKey: ["/api/checklists"],
  });

  const { data: checklistTasks } = useQuery<ChecklistTask[]>({
    queryKey: ["/api/checklist-tasks"],
  });

  const form = useForm<InsertChecklist>({
    resolver: zodResolver(insertChecklistSchema),
    defaultValues: {
      title: "",
      description: "",
      frequency: "daily",
      category: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertChecklist) => {
      await apiRequest("/api/checklists", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklists"] });
      toast({ title: "Başarılı", description: "Checklist oluşturuldu" });
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
        description: "Checklist oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const getTasksForChecklist = (checklistId: number) => {
    return checklistTasks?.filter(task => task.checklistId === checklistId) || [];
  };

  const frequencyLabels: Record<string, string> = {
    daily: "Günlük",
    weekly: "Haftalık",
    monthly: "Aylık",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Checklistler</h1>
          <p className="text-muted-foreground mt-1">Görev şablonlarını ve rutin kontrolleri yönetin</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-checklist">
              <Plus className="mr-2 h-4 w-4" />
              Yeni Checklist
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Checklist Oluştur</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Başlık</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Örn: Açılış Checklist" data-testid="input-checklist-title" />
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
                        <Textarea {...field} value={field.value || ""} placeholder="Checklist açıklaması" data-testid="input-checklist-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sıklık</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-frequency">
                            <SelectValue placeholder="Sıklık seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Günlük</SelectItem>
                          <SelectItem value="weekly">Haftalık</SelectItem>
                          <SelectItem value="monthly">Aylık</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="Örn: Açılış, Kapanış, Temizlik" data-testid="input-checklist-category" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    İptal
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-checklist">
                    {createMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {checklists?.map((checklist) => {
            const tasks = getTasksForChecklist(checklist.id);
            return (
              <Card key={checklist.id} data-testid={`card-checklist-${checklist.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {checklist.title}
                      </CardTitle>
                      {checklist.description && (
                        <CardDescription className="mt-2">{checklist.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary">{frequencyLabels[checklist.frequency]}</Badge>
                      {checklist.category && (
                        <Badge variant="outline">{checklist.category}</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {tasks.length > 0 ? (
                    <Accordion type="single" collapsible>
                      <AccordionItem value="tasks">
                        <AccordionTrigger>
                          {tasks.length} görev görüntüle
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2">
                            {tasks.map((task, index) => (
                              <div
                                key={task.id}
                                className="flex items-start gap-3 p-2 rounded-md bg-muted/50"
                                data-testid={`checklist-task-${task.id}`}
                              >
                                <span className="text-sm font-medium text-muted-foreground min-w-[2rem]">
                                  {index + 1}.
                                </span>
                                <p className="text-sm flex-1">{task.taskDescription}</p>
                                {task.requiresPhoto && (
                                  <Badge variant="outline" className="text-xs">
                                    Fotoğraf Gerekli
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Bu checklist için henüz görev eklenmemiş
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {(!checklists || checklists.length === 0) && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  Henüz checklist yok. Yeni checklist oluşturmak için yukarıdaki butonu kullanın.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
