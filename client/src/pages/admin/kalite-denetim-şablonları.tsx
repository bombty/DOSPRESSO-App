import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Redirect, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Edit2, Trash2, Eye, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

interface AuditTemplate {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
  items: AuditTemplateItem[];
}

interface AuditTemplateItem {
  id: number;
  templateId: number;
  itemText: string;
  itemType: string;
  weight: number;
  requiresPhoto: boolean;
  sortOrder: number;
  maxPoints: number;
}

const CreateTemplateSchema = z.object({
  title: z.string().min(3, "Başlık en az 3 karakter olmalı").max(200, "Başlık çok uzun"),
  description: z.string().max(500, "Açıklama çok uzun").optional(),
  category: z.string().max(100, "Kategori çok uzun").optional(),
});

type CreateTemplateFormValues = z.infer<typeof CreateTemplateSchema>;

export default function AdminKaliteDenetimSablonlari() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AuditTemplate | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  if (user?.role !== "admin" && user?.role !== "coach") {
    return <Redirect to="/" />;
  }

  const form = useForm<CreateTemplateFormValues>({
    resolver: zodResolver(CreateTemplateSchema),
    defaultValues: { title: "", description: "", category: "" },
  });

  const { data: templates, isLoading } = useQuery<AuditTemplate[]>({
    queryKey: ["/api/audit-templates"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateTemplateFormValues) => {
      const response = await apiRequest("POST", "/api/audit-templates", {
        template: { ...data, isActive: true },
        items: [],
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audit-templates"] });
      toast({ title: "Başarılı", description: "Şablon oluşturuldu" });
      form.reset();
      setIsCreating(false);
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message || "Şablon oluşturulamadı", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/audit-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audit-templates"] });
      toast({ title: "Başarılı", description: "Şablon silindi" });
      setSelectedTemplate(null);
      setDeleteConfirmId(null);
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const handleCreate = form.handleSubmit((data) => createMutation.mutate(data));

  return (
    <div className="flex h-screen w-full flex-col">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="icon" data-testid="button-back" aria-label="Geri dön">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Kalite Denetim Şablonları</h1>
              <p className="text-sm text-muted-foreground">Denetim şablonlarını yönet ve özelleştir</p>
            </div>
          </div>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-template">
                <Plus className="h-4 w-4 mr-2" />
                Yeni Şablon
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="dialog-new-template">
              <DialogHeader>
                <DialogTitle>Yeni Denetim Şablonu</DialogTitle>
                <DialogDescription>Yeni bir denetim şablonu oluştur</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={handleCreate} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Başlık</FormLabel>
                        <FormControl>
                          <Input placeholder="Şablon başlığı" data-testid="input-template-title" {...field} />
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
                          <Textarea placeholder="Açıklama (isteğe bağlı)" data-testid="textarea-template-desc" {...field} />
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
                        <FormControl>
                          <Input placeholder="Kategori (isteğe bağlı)" data-testid="input-template-category" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreating(false)} data-testid="button-cancel">
                      İptal
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                      {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Oluştur
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !templates || templates.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Henüz şablon yok</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {templates.map((template) => (
              <Card key={template.id} data-testid={`card-template-${template.id}`} className="hover-elevate cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base" data-testid={`text-template-title-${template.id}`}>{template.title}</CardTitle>
                      {template.description && (
                        <CardDescription className="mt-1">{template.description}</CardDescription>
                      )}
                    </div>
                    <Badge variant={template.isActive ? "default" : "secondary"} data-testid={`badge-status-${template.id}`}>
                      {template.isActive ? "Aktif" : "Pasif"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      <span data-testid={`text-item-count-${template.id}`}>{template.items?.length || 0} madde</span>
                    </div>
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedTemplate(template)}
                        data-testid={`button-view-${template.id}`}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Görüntüle
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid={`button-delete-${template.id}`}
                        onClick={() => setDeleteConfirmId(template.id)}
                        aria-label={`Şablonu sil: ${template.title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog 
          open={!!deleteConfirmId} 
          onOpenChange={(open) => {
            if (!open && !deleteMutation.isPending) {
              setDeleteConfirmId(null);
            }
          }}
        >
          <DialogContent data-testid="dialog-delete-confirm">
            <DialogHeader>
              <DialogTitle>Şablonu Sil?</DialogTitle>
              <DialogDescription>Bu işlem geri alınamaz. Şablonu silmek istediğinizden emin misiniz?</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setDeleteConfirmId(null)} 
                disabled={deleteMutation.isPending}
                data-testid="button-cancel-delete"
              >
                İptal
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (deleteConfirmId) {
                    deleteMutation.mutate(deleteConfirmId);
                  }
                }}
                disabled={deleteMutation.isPending}
                data-testid="button-confirm-delete"
              >
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Sil
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Template Detail Dialog */}
        {selectedTemplate && (
          <Dialog open={!!selectedTemplate} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
            <DialogContent className="max-h-screen max-w-2xl" data-testid="dialog-template-detail">
              <DialogHeader>
                <DialogTitle data-testid="text-template-detail-title">{selectedTemplate.title}</DialogTitle>
                <DialogDescription>{selectedTemplate.description || "Detay yok"}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {selectedTemplate.items && selectedTemplate.items.length > 0 ? (
                  selectedTemplate.items.map((item, idx) => (
                    <Card key={item.id} className="bg-muted/50" data-testid={`card-item-${item.id}`}>
                      <CardContent className="pt-4">
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium" data-testid={`text-item-text-${item.id}`}>{idx + 1}. {item.itemText}</span>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Badge variant="outline" data-testid={`badge-weight-${item.id}`}>
                              Ağırlık: %{Number(item.weight || 0).toFixed(2)}
                            </Badge>
                            {item.requiresPhoto && (
                              <Badge variant="outline" data-testid={`badge-photo-${item.id}`}>Fotoğraf Gerekli</Badge>
                            )}
                            <Badge variant="outline" data-testid={`badge-max-points-${item.id}`}>Max: {item.maxPoints} puan</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Henüz madde yok</p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
