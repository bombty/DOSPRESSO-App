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
import { ListSkeleton } from "@/components/list-skeleton";
import { EmptyState } from "@/components/empty-state";
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
import { BookOpen, Eye, Plus, CheckCircle, XCircle, Link2, Sparkles, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

export default function KnowledgeBase() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeBaseArticle | null>(null);
  const [aiTopic, setAiTopic] = useState("");
  const isHQ = user?.role && isHQRole(user.role as any);

  // Redirect non-HQ users away
  if (user && !isHQ) {
    setLocation("/");
    return null;
  }

  const { data: articles, isLoading, isError, refetch } = useQuery<KnowledgeBaseArticle[]>({
    queryKey: ["/api/knowledge-base"],
  });

  const form = useForm<InsertKnowledgeBaseArticle>({
    resolver: zodResolver(insertKnowledgeBaseArticleSchema),
    defaultValues: {
      title: "",
      category: "procedure",
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

  const aiDraftMutation = useMutation({
    mutationFn: async ({ topic, category }: { topic: string; category: string }) => {
      const res = await apiRequest("POST", "/api/knowledge-base/generate-draft", { topic, category });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Taslak oluşturulamadı");
      }
      return res.json();
    },
    onSuccess: (data: { title: string; content: string; tags: string[] }) => {
      form.setValue("title", data.title);
      form.setValue("content", data.content);
      form.setValue("tags", data.tags);
      setAiTopic("");
      toast({ title: "Başarılı", description: "AI taslak oluşturuldu" });
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message || "Taslak oluşturulamadı", variant: "destructive" });
    },
  });

  const categoryLabels: Record<string, string> = {
    all: "Tümü",
    recipe: "Tarifler",
    procedure: "Prosedürler",
    training: "Eğitim",
    // Eski kategoriler için fallback (mevcut veritabanı uyumluluğu)
    sop: "Prosedürler",
    maintenance: "Prosedürler",
  };

  const categoryDescriptions: Record<string, string> = {
    all: "Tüm bilgi bankası içeriklerini görüntüleyin. Tarifler, prosedürler ve eğitim materyallerinin tamamına buradan erişebilirsiniz.",
    recipe: "İçecek ve yiyecek tarifleri. Malzeme ölçüleri, hazırlama adımları ve sunum önerileri bu bölümde yer almaktadır.",
    procedure: "Standart operasyon prosedürleri (SOP) ve bakım kılavuzları. Günlük işleyiş, açılış-kapanış ve ekipman bakım talimatları burada bulunur.",
    training: "Eğitim materyalleri ve kurslar. Yeni personel oryantasyonu, kariyer gelişimi ve sertifikasyon içerikleri bu kategoride yer alır.",
  };

  const filteredArticles = articles?.filter((article) => {
    if (selectedCategory === "all") return true;
    if (selectedCategory === "procedure") {
      // Prosedürler sekmesi: procedure, sop ve maintenance kategorilerini göster
      return ["procedure", "sop", "maintenance"].includes(article.category);
    }
    return article.category === selectedCategory;
  });

  // İlgili makaleleri bul - aynı kategori veya ortak etiketler
  const getRelatedArticles = (article: KnowledgeBaseArticle) => {
    if (!articles) return [];
    
    const procedureCategories = ["procedure", "sop", "maintenance"];
    const articleCategories = procedureCategories.includes(article.category) 
      ? procedureCategories 
      : [article.category];
    
    return articles
      .filter(a => a.id !== article.id && a.isPublished)
      .map(a => {
        let score = 0;
        // Aynı kategori +2 puan
        if (articleCategories.includes(a.category)) score += 2;
        // Ortak etiketler için her biri +1 puan
        const sharedTags = (article.tags || []).filter(tag => (a.tags || []).includes(tag));
        score += sharedTags.length;
        return { article: a, score, sharedTags };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3); // En fazla 3 ilgili makale
  };

  
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Bilgi Bankası</h1>
          <p className="text-muted-foreground mt-1">Tarifler, prosedürler ve eğitim dokümanları</p>
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
            
            {/* AI Taslak Oluşturucu */}
            <div className="p-3 bg-muted/50 rounded-md border border-dashed mb-2">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">AI Taslak Oluşturucu</span>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Konu girin (örn: Latte Art Teknikleri)"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  className="flex-1"
                  data-testid="input-ai-topic"
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={aiDraftMutation.isPending || aiTopic.trim().length < 3}
                  onClick={() => aiDraftMutation.mutate({ topic: aiTopic, category: form.getValues("category") })}
                  data-testid="button-generate-draft"
                >
                  {aiDraftMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  <span className="ml-1">{aiDraftMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Önce kategori seçin, sonra konu girin. AI sizin için taslak oluşturacak.
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="w-full space-y-2 sm:space-y-3">
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
                          <SelectItem value="recipe">Tarif</SelectItem>
                          <SelectItem value="procedure">Prosedür</SelectItem>
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
          <TabsTrigger value="recipe" data-testid="tab-recipe">Tarifler</TabsTrigger>
          <TabsTrigger value="procedure" data-testid="tab-procedure">Prosedürler</TabsTrigger>
          <TabsTrigger value="training" data-testid="tab-training">Eğitim</TabsTrigger>
        </TabsList>

        <div className="mt-4 p-3 bg-muted/50 rounded-md" data-testid="text-category-description">
          <p className="text-sm text-muted-foreground">
            {categoryDescriptions[selectedCategory]}
          </p>
        </div>

        <TabsContent value={selectedCategory} className="mt-4">
          {isLoading ? (
            <ListSkeleton count={4} variant="card" showHeader={false} />
          ) : (
            <div className="grid gap-2 sm:gap-3 md:grid-cols-2">
              {filteredArticles?.map((article) => (
                <Card key={article.id} data-testid={`card-article-${article.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          {article.title}
                        </CardTitle>
                      </div>
                      <Badge variant="secondary">
                        {categoryLabels[article.category]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 sm:gap-4">
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={article.isPublished ? "default" : "outline"}>
                          {article.isPublished ? "Yayında" : "Taslak"}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedArticle(article)}
                          data-testid={`button-detail-${article.id}`}
                        >
                          <BookOpen className="h-4 w-4 mr-1" />
                          Detay
                        </Button>
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
                <div className="col-span-2">
                  <EmptyState 
                    icon={BookOpen}
                    title="Makale bulunamadı"
                    description="Bu kategoride henüz makale yok."
                  />
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Makale Detay Dialogu */}
      <Dialog open={!!selectedArticle} onOpenChange={(open) => !open && setSelectedArticle(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          {selectedArticle && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  {selectedArticle.title}
                </DialogTitle>
                <div className="flex items-center gap-2 pt-2">
                  <Badge variant="secondary">{categoryLabels[selectedArticle.category]}</Badge>
                  <Badge variant={selectedArticle.isPublished ? "default" : "outline"}>
                    {selectedArticle.isPublished ? "Yayında" : "Taslak"}
                  </Badge>
                </div>
              </DialogHeader>
              <ScrollArea className="max-h-[50vh]">
                <div className="prose prose-sm dark:prose-invert max-w-none p-1">
                  <p className="whitespace-pre-wrap">{selectedArticle.content}</p>
                </div>
              </ScrollArea>
              
              {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2">
                  {selectedArticle.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              )}

              {/* İlgili İçerikler Bölümü */}
              {getRelatedArticles(selectedArticle).length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                    <Link2 className="h-4 w-4" />
                    İlgili İçerikler
                  </h4>
                  <div className="grid gap-2">
                    {getRelatedArticles(selectedArticle).map(({ article: relatedArticle, sharedTags }) => (
                      <Card 
                        key={relatedArticle.id} 
                        className="cursor-pointer hover-elevate"
                        onClick={() => setSelectedArticle(relatedArticle)}
                        data-testid={`card-related-${relatedArticle.id}`}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{relatedArticle.title}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                {relatedArticle.content}
                              </p>
                            </div>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {categoryLabels[relatedArticle.category]}
                            </Badge>
                          </div>
                          {sharedTags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {sharedTags.map((tag, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
