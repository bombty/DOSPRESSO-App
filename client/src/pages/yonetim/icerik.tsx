import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPageContentSchema, type PageContent, type InsertPageContent } from "@shared/schema";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

export default function ContentManagement() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState<PageContent | null>(null);
  const [previewContent, setPreviewContent] = useState<PageContent | null>(null);

  // Fetch all content
  const { data: contents = [], isLoading } = useQuery<PageContent[]>({
    queryKey: ["/api/admin/page-content"],
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Create form
  const createForm = useForm<InsertPageContent>({
    resolver: zodResolver(insertPageContentSchema),
    defaultValues: {
      slug: "",
      title: "",
      content: "",
      publishedAt: null,
    },
  });

  // Edit form
  const editForm = useForm<Partial<InsertPageContent>>({
    resolver: zodResolver(insertPageContentSchema.partial()),
    defaultValues: {},
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertPageContent) =>
      apiRequest("POST", "/api/admin/page-content", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/page-content"] });
      toast({ title: "Başarılı", description: "İçerik oluşturuldu" });
      setCreateDialogOpen(false);
      createForm.reset();
    },
    onError: () => {
      toast({ title: "Hata", description: "İçerik oluşturulamadı", variant: "destructive" });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ slug, data }: { slug: string; data: Partial<InsertPageContent> }) =>
      apiRequest(`/api/admin/page-content/${slug}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/page-content"] });
      toast({ title: "Başarılı", description: "İçerik güncellendi" });
      setEditContent(null);
      editForm.reset();
    },
    onError: () => {
      toast({ title: "Hata", description: "İçerik güncellenemedi", variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (slug: string) =>
      apiRequest(`/api/admin/page-content/${slug}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/page-content"] });
      toast({ title: "Başarılı", description: "İçerik silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "İçerik silinemedi", variant: "destructive" });
    },
  });

  // Publish/Unpublish toggle
  const togglePublishMutation = useMutation({
    mutationFn: async ({ slug, publish }: { slug: string; publish: boolean }) =>
      apiRequest(`/api/admin/page-content/${slug}`, "PATCH", {
        publishedAt: publish ? new Date().toISOString() : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/page-content"] });
      toast({ title: "Başarılı", description: "Yayın durumu güncellendi" });
    },
  });

  // Open edit dialog
  const handleEdit = (content: PageContent) => {
    setEditContent(content);
    editForm.reset({
      slug: content.slug,
      title: content.title,
      content: content.content,
      publishedAt: content.publishedAt ? new Date(content.publishedAt).toISOString() : null,
    });
  };

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">İçerik Yönetimi</h1>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-content">
              <Plus className="w-4 h-4 mr-2" /> Yeni İçerik
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Yeni İçerik Oluştur</DialogTitle>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField control={createForm.control} name="slug" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug (URL)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="welcome-message" data-testid="input-slug" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Başlık</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Hoş Geldiniz" data-testid="input-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="content" render={({ field }) => (
                  <FormItem>
                    <FormLabel>İçerik (Markdown)</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={10} placeholder="# Başlık\n\nİçerik buraya..." data-testid="textarea-content" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createForm.control} name="publishedAt" render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormLabel>Yayınla</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value !== null}
                        onCheckedChange={(checked) => field.onChange(checked ? new Date().toISOString() : null)}
                        data-testid="switch-publish"
                      />
                    </FormControl>
                  </FormItem>
                )} />
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)} data-testid="button-cancel-create">
                    İptal
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-create">
                    {createMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content List */}
      {isLoading ? (
        <div className="text-center py-8" data-testid="text-loading">Yükleniyor...</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>İçerikler</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Slug</TableHead>
                  <TableHead>Başlık</TableHead>
                  <TableHead>Versiyon</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Son Güncelleme</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center" data-testid="text-no-content">
                      Henüz içerik yok
                    </TableCell>
                  </TableRow>
                ) : (
                  contents.map((content) => (
                    <TableRow key={content.id} data-testid={`row-content-${content.id}`}>
                      <TableCell className="font-mono text-sm" data-testid={`text-slug-${content.id}`}>{content.slug}</TableCell>
                      <TableCell data-testid={`text-title-${content.id}`}>{content.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" data-testid={`badge-version-${content.id}`}>v{content.version}</Badge>
                      </TableCell>
                      <TableCell>
                        {content.publishedAt ? (
                          <Badge variant="default" data-testid={`badge-published-${content.id}`}>Yayında</Badge>
                        ) : (
                          <Badge variant="secondary" data-testid={`badge-draft-${content.id}`}>Taslak</Badge>
                        )}
                      </TableCell>
                      <TableCell data-testid={`text-updated-${content.id}`}>
                        {format(new Date(content.updatedAt), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="icon" variant="ghost" onClick={() => setPreviewContent(content)} data-testid={`button-preview-${content.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(content)} data-testid={`button-edit-${content.id}`}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`"${content.title}" içeriğini silmek istediğinizden emin misiniz?`)) {
                                deleteMutation.mutate(content.slug);
                              }
                            }}
                            data-testid={`button-delete-${content.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Switch
                            checked={content.publishedAt !== null}
                            onCheckedChange={(checked) => togglePublishMutation.mutate({ slug: content.slug, publish: checked })}
                            data-testid={`switch-publish-${content.id}`}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      {editContent && (
        <Dialog open={true} onOpenChange={() => setEditContent(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>İçerik Düzenle</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit((data) => updateMutation.mutate({ slug: editContent.slug, data }))} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField control={editForm.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Başlık</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="content" render={({ field }) => (
                  <FormItem>
                    <FormLabel>İçerik (Markdown)</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={10} data-testid="textarea-edit-content" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setEditContent(null)} data-testid="button-cancel-edit">
                    İptal
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-edit">
                    {updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* Preview Dialog */}
      {previewContent && (
        <Dialog open={true} onOpenChange={() => setPreviewContent(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{previewContent.title}</DialogTitle>
            </DialogHeader>
            <div className="prose prose-sm max-w-none dark:prose-invert" data-testid="div-preview-content">
              <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                {previewContent.content}
              </ReactMarkdown>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
