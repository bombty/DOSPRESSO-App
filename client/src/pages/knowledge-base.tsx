import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertKnowledgeBaseArticleSchema, type KnowledgeBaseArticle, type InsertKnowledgeBaseArticle, isHQRole } from "@shared/schema";
import { BookOpen, Eye, Plus, CheckCircle, XCircle } from "lucide-react";

export default function KnowledgeBase() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const isHQ = user?.role && isHQRole(user.role as any);

  // Redirect non-HQ users away
  if (user && !isHQ) {
    setLocation("/");
    return null;
  }

  const { data: articles, isLoading } = useQuery<KnowledgeBaseArticle[]>({
    queryKey: ["/api/knowledge-base"],
  });

  const form = useForm<InsertKnowledgeBaseArticle>({
    resolver: zodResolver(insertKnowledgeBaseArticleSchema),
    defaultValues: {
      title: "",
      category: "sop",
      content: "",
      tags: [],
      attachmentUrls: [],
      isPublished: false,
      viewCount: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertKnowledgeBaseArticle) => {
      await apiRequest("POST", "/api/knowledge-base", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
      toast({ title: "Başarılı", description: "Makale oluşturuldu" });
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
        description: "Makale oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async ({ id, publish }: { id: number; publish: boolean }) => {
      const endpoint = publish ? `/api/knowledge-base/${id}/publish` : `/api/knowledge-base/${id}/unpublish`;
      await apiRequest(endpoint, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
      toast({ title: "Başarılı", description: "Makale durumu güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "İşlem başarısız", variant: "destructive" });
    },
  });

  const categoryLabels: Record<string, string> = {
    all: "Tümü",
    sop: "Standart Operasyon Prosedürleri",
    recipe: "Tarifler",
    maintenance: "Bakım",
    training: "Eğitim",
  };

  const filteredArticles = articles?.filter(
    (article) => selectedCategory === "all" || article.category === selectedCategory
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Bilgi Bankası</h1>
          <p className="text-muted-foreground mt-1">SOP'lar, tarifler ve bakım dokümanları</p>
        </div>
        {isHQ && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-article">
                <Plus className="mr-2 h-4 w-4" />
                Yeni Makale
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Yeni Bilgi Bankası Makalesi</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Başlık</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Makale başlığı" data-testid="input-article-title" />
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Kategori seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sop">SOP</SelectItem>
                          <SelectItem value="recipe">Tarif</SelectItem>
                          <SelectItem value="maintenance">Bakım</SelectItem>
                          <SelectItem value="training">Eğitim</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>İçerik</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Makale içeriği"
                          className="min-h-[200px]"
                          data-testid="input-article-content"
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
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-published"
                        />
                      </FormControl>
                      <FormLabel className="font-normal">Yayınla</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    İptal
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-article">
                    {createMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">Tümü</TabsTrigger>
          <TabsTrigger value="sop" data-testid="tab-sop">SOP</TabsTrigger>
          <TabsTrigger value="recipe" data-testid="tab-recipe">Tarifler</TabsTrigger>
          <TabsTrigger value="maintenance" data-testid="tab-maintenance">Bakım</TabsTrigger>
          <TabsTrigger value="training" data-testid="tab-training">Eğitim</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredArticles?.map((article) => (
                <Card key={article.id} data-testid={`card-article-${article.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <BookOpen className="h-5 w-5" />
                          {article.title}
                        </CardTitle>
                      </div>
                      <Badge variant="secondary">
                        {categoryLabels[article.category]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {article.content}
                    </p>
                    {article.tags && article.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {article.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        {article.viewCount || 0} görüntüleme
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={article.isPublished ? "default" : "outline"}>
                          {article.isPublished ? "Yayında" : "Taslak"}
                        </Badge>
                        {isHQ && (article.isPublished ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => publishMutation.mutate({ id: article.id, publish: false })}
                            disabled={publishMutation.isPending}
                            data-testid={`button-unpublish-${article.id}`}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Yayından Kaldır
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => publishMutation.mutate({ id: article.id, publish: true })}
                            disabled={publishMutation.isPending}
                            data-testid={`button-publish-${article.id}`}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Yayınla
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!filteredArticles || filteredArticles.length === 0) && (
                <Card className="col-span-2">
                  <CardContent className="py-8">
                    <p className="text-center text-muted-foreground">
                      Bu kategoride henüz makale yok.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
