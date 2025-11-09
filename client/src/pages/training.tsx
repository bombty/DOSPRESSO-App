import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  insertTrainingModuleSchema, 
  type TrainingModule, 
  type InsertTrainingModule 
} from "@shared/schema";
import { BookOpen, Plus, Play, Trash2 } from "lucide-react";

export default function Training() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const isAdminOrCoach = user?.role === 'admin' || user?.role === 'coach';

  const { data: modules, isLoading } = useQuery<TrainingModule[]>({
    queryKey: ["/api/training/modules"],
  });

  const form = useForm<InsertTrainingModule>({
    resolver: zodResolver(insertTrainingModuleSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "barista_basics",
      level: "beginner",
      estimatedDuration: 30,
      isPublished: false,
      requiredForRole: [],
      prerequisiteModuleIds: [],
      createdBy: user?.id || "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertTrainingModule) => {
      await apiRequest("/api/training/modules", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules"] });
      toast({ title: "Başarılı", description: "Eğitim modülü oluşturuldu" });
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
        description: "Modül oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/training/modules/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules"] });
      toast({ title: "Başarılı", description: "Modül silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Modül silinemedi", variant: "destructive" });
    },
  });

  const categoryLabels: Record<string, string> = {
    barista_basics: "Barista Temelleri",
    customer_service: "Müşteri Hizmetleri",
    equipment_training: "Ekipman Eğitimi",
    hygiene_safety: "Hijyen & Güvenlik",
    product_knowledge: "Ürün Bilgisi",
    management: "Yönetim",
  };

  const levelLabels: Record<string, string> = {
    beginner: "Başlangıç",
    intermediate: "Orta",
    advanced: "İleri",
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Eğitim Modülleri</h1>
          <p className="text-muted-foreground mt-1">Personel eğitim programları ve materyalleri</p>
        </div>
        {isAdminOrCoach && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-module">
                <Plus className="mr-2 h-4 w-4" />
                Yeni Modül
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Yeni Eğitim Modülü</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modül Başlığı</FormLabel>
                        <FormControl>
                          <Input placeholder="Ör: Espresso Hazırlama Teknikleri" {...field} data-testid="input-title" />
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
                          <Textarea 
                            placeholder="Modül içeriğini açıklayın..." 
                            value={field.value || ""}
                            onChange={field.onChange}
                            data-testid="input-description"
                          />
                        </FormControl>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value || "barista_basics"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue placeholder="Kategori seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(categoryLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seviye</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || "beginner"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-level">
                              <SelectValue placeholder="Seviye seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(levelLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="estimatedDuration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tahmini Süre (dakika)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="30" 
                            value={field.value || ""}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            data-testid="input-duration"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isPublished"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-published"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Hemen Yayınla
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsAddDialogOpen(false)}
                      data-testid="button-cancel"
                    >
                      İptal
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending}
                      data-testid="button-submit"
                    >
                      {createMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">Tümü</TabsTrigger>
          <TabsTrigger value="published" data-testid="tab-published">Yayında</TabsTrigger>
          <TabsTrigger value="draft" data-testid="tab-draft">Taslak</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules?.map((module) => (
              <Card key={module.id} className="hover-elevate" data-testid={`card-module-${module.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{module.title}</CardTitle>
                      <Badge variant={module.isPublished ? "default" : "secondary"} data-testid={`badge-status-${module.id}`}>
                        {module.isPublished ? "Yayında" : "Taslak"}
                      </Badge>
                    </div>
                    {isAdminOrCoach && (
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(module.id)}
                          data-testid={`button-delete-${module.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">{module.description || "Açıklama yok"}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" data-testid={`badge-category-${module.id}`}>
                      <BookOpen className="h-3 w-3 mr-1" />
                      {categoryLabels[module.category || "barista_basics"]}
                    </Badge>
                    <Badge variant="outline" data-testid={`badge-duration-${module.id}`}>
                      {module.estimatedDuration || 30} dk
                    </Badge>
                    <Badge variant="outline" data-testid={`badge-level-${module.id}`}>
                      {levelLabels[module.level || "beginner"]}
                    </Badge>
                  </div>

                  <div className="pt-2 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      data-testid={`button-view-${module.id}`}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Modülü Görüntüle
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="published" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules?.filter(m => m.isPublished).map((module) => (
              <Card key={module.id} className="hover-elevate" data-testid={`card-module-${module.id}`}>
                <CardHeader>
                  <CardTitle className="text-lg">{module.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">{module.description || "Açıklama yok"}</p>
                  <Badge variant="outline">
                    {categoryLabels[module.category || "barista_basics"]}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="draft" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules?.filter(m => !m.isPublished).map((module) => (
              <Card key={module.id} className="hover-elevate" data-testid={`card-module-${module.id}`}>
                <CardHeader>
                  <CardTitle className="text-lg">{module.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">{module.description || "Açıklama yok"}</p>
                  <Badge variant="outline">
                    {categoryLabels[module.category || "barista_basics"]}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
