import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { HQ_SUPPORT_CATEGORY, type HQSupportCategoryType } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Users, MessageSquare, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";

const CATEGORY_LABELS: Record<HQSupportCategoryType, string> = {
  ariza: "Arıza",
  teknik: "Teknik",
  muhasebe: "Muhasebe",
  lojistik: "Lojistik",
  fabrika: "Fabrika",
  urun_uretim: "Ürün/Üretim",
  satinalma: "Satın Alma",
  coach: "Coach",
  destek: "Destek",
  genel: "Genel",
};

const assignmentSchema = z.object({
  userId: z.string().min(1, "Kullanıcı seçiniz"),
  category: z.string().min(1, "Kategori seçiniz"),
});

type AssignmentFormData = z.infer<typeof assignmentSchema>;

export default function AdminDestekAyarlari() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (user?.role !== "admin") {
    navigate("/");
    return null;
  }

  const { data: assignments = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/support-assignments"],
  });

  const { data: hqUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/hq-users"],
  });

  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      userId: "",
      category: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: AssignmentFormData) =>
      apiRequest("POST", "/api/admin/support-assignments", { userId: data.userId, category: data.category }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support-assignments"] });
      setDialogOpen(false);
      form.reset();
      toast({ title: "Atama oluşturuldu" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Atama oluşturulamadı", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/admin/support-assignments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support-assignments"] });
      toast({ title: "Atama silindi" });
    },
  });

  const groupedAssignments = Object.keys(CATEGORY_LABELS).reduce((acc, category) => {
    acc[category] = assignments.filter((a: any) => a.category === category);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Destek Kategori Atamaları</h1>
          <p className="text-sm text-muted-foreground">
            Hangi HQ personelinin hangi kategorilerden sorumlu olduğunu belirleyin
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-new-assignment">
          <Plus className="h-4 w-4 mr-2" />
          Yeni Atama
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-4">
          {Object.entries(CATEGORY_LABELS).map(([category, label]) => (
            <Card key={category}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {label}
                  <Badge variant="secondary" className="ml-auto">
                    {groupedAssignments[category]?.length || 0} kişi
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {groupedAssignments[category]?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Henüz atama yapılmamış</p>
                ) : (
                  <div className="space-y-2">
                    {groupedAssignments[category]?.map((assignment: any) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {assignment.user?.firstName} {assignment.user?.lastName}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {assignment.user?.role}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteMutation.mutate(assignment.id)}
                          data-testid={`button-delete-assignment-${assignment.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Kategori Ataması</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>HQ Personeli</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-assignment-user">
                          <SelectValue placeholder="Personel seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {hqUsers.map((u: any) => (
                          <SelectItem key={u.id} value={u.id.toString()}>
                            {u.firstName} {u.lastName} ({u.role})
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
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-assignment-category">
                          <SelectValue placeholder="Kategori seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
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
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  İptal
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-assignment">
                  {createMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
