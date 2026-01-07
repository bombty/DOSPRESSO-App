import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Redirect } from "wouter";
import { isHQRole, type Announcement, type Branch, insertAnnouncementSchema, type InsertAnnouncement } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  Plus, 
  FileText, 
  Send, 
  LayoutGrid, 
  Image as ImageIcon, 
  Calendar, 
  Eye, 
  Pencil, 
  Trash2,
  Megaphone,
  Clock
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import BannerEditor from "./banner-editor";
import { ObjectUploader } from "@/components/ObjectUploader";

type AnnouncementWithUser = Announcement & {
  createdBy: { fullName: string };
};

type BannerItem = {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
};

const priorityLabels: Record<string, string> = {
  normal: "Normal",
  urgent: "Acil",
};

const categoryLabels: Record<string, string> = {
  general: "Genel",
  new_product: "Yeni Ürün",
  policy: "Politika",
  campaign: "Kampanya",
  training: "Eğitim",
  event: "Etkinlik",
};

export default function IcerikStudyosu() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("drafts");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<BannerItem | null>(null);
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: "announcement" | "banner"; id: number } | null>(null);

  const isHQ = user?.role && isHQRole(user.role as any);

  if (!isHQ) {
    return <Redirect to="/" />;
  }

  const { data: announcements, isLoading: announcementsLoading } = useQuery<AnnouncementWithUser[]>({
    queryKey: ['/api/announcements'],
  });

  const { data: banners, isLoading: bannersLoading } = useQuery<BannerItem[]>({
    queryKey: ['/api/admin/banners'],
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ['/api/branches'],
  });

  const form = useForm<InsertAnnouncement>({
    resolver: zodResolver(insertAnnouncementSchema),
    defaultValues: {
      title: "",
      message: "",
      priority: "normal",
      category: "general",
      targetRoles: null,
      targetBranches: null,
      expiresAt: null,
      bannerImageUrl: null,
      showOnDashboard: false,
      isPinned: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertAnnouncement) => {
      await apiRequest('POST', '/api/announcements', { 
        ...data, 
        bannerImageUrl: bannerImageUrl || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/announcements/banners'] });
      toast({ title: "Başarılı", description: "Duyuru yayınlandı" });
      setIsPublishDialogOpen(false);
      form.reset();
      setBannerImageUrl("");
      setSelectedBanner(null);
    },
    onError: () => {
      toast({ title: "Hata", description: "Duyuru yayınlanamadı", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: "announcement" | "banner"; id: number }) => {
      const url = type === "announcement" 
        ? `/api/admin/announcements/${id}` 
        : `/api/admin/banners/${id}`;
      await apiRequest('DELETE', url, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/banners'] });
      queryClient.invalidateQueries({ queryKey: ['/api/announcements/banners'] });
      toast({ title: "Başarılı", description: "İçerik silindi" });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    },
    onError: () => {
      toast({ title: "Hata", description: "İçerik silinemedi", variant: "destructive" });
    },
  });

  const handlePublishFromBanner = (banner: BannerItem) => {
    setSelectedBanner(banner);
    setBannerImageUrl(banner.imageUrl);
    form.reset({
      title: banner.title,
      message: "",
      priority: "normal",
      category: "general",
      targetRoles: null,
      targetBranches: null,
      expiresAt: null,
      bannerImageUrl: banner.imageUrl,
      showOnDashboard: true,
      isPinned: false,
    });
    setIsPublishDialogOpen(true);
  };

  const handleSubmit = (data: InsertAnnouncement) => {
    const submitData = {
      ...data,
      targetRoles: data.targetRoles && data.targetRoles.length > 0 ? data.targetRoles : null,
      targetBranches: data.targetBranches && data.targetBranches.length > 0 ? data.targetBranches : null,
    };
    createMutation.mutate(submitData);
  };

  const handleDeleteClick = (type: "announcement" | "banner", id: number) => {
    setItemToDelete({ type, id });
    setDeleteDialogOpen(true);
  };

  const handleEditorComplete = () => {
    setIsEditorOpen(false);
    queryClient.invalidateQueries({ queryKey: ['/api/admin/banners'] });
    queryClient.invalidateQueries({ queryKey: ['/api/announcements/banners'] });
  };

  const publishedAnnouncements = announcements?.filter(a => a.publishedAt) || [];
  const carouselBanners = banners?.filter(b => b.isActive) || [];
  const draftBanners = banners?.filter(b => !b.isActive) || [];

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="text-page-title">
            İçerik Stüdyosu
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-description">
            Banner ve duyuru içeriklerini tek yerden yönetin
          </p>
        </div>

        <Button onClick={() => setIsEditorOpen(true)} data-testid="button-create-content">
          <Plus className="w-4 h-4 mr-2" />
          Yeni İçerik Oluştur
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="drafts" className="flex items-center gap-2" data-testid="tab-drafts">
            <FileText className="w-4 h-4" />
            Taslaklar
            {draftBanners.length > 0 && (
              <Badge variant="secondary" className="ml-1">{draftBanners.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="published" className="flex items-center gap-2" data-testid="tab-published">
            <Send className="w-4 h-4" />
            Yayınlanmış
            {publishedAnnouncements.length > 0 && (
              <Badge variant="secondary" className="ml-1">{publishedAnnouncements.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="carousel" className="flex items-center gap-2" data-testid="tab-carousel">
            <LayoutGrid className="w-4 h-4" />
            Carousel
            {carouselBanners.length > 0 && (
              <Badge variant="secondary" className="ml-1">{carouselBanners.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="drafts" className="space-y-4">
          {bannersLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}><Skeleton className="h-48 w-full" /></Card>
              ))}
            </div>
          ) : draftBanners.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {draftBanners.map((banner) => (
                <Card key={banner.id} className="overflow-hidden group">
                  <div className="relative h-32">
                    <img 
                      src={banner.imageUrl} 
                      alt={banner.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handlePublishFromBanner(banner)}
                        data-testid={`button-publish-${banner.id}`}
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Yayınla
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDeleteClick("banner", banner.id)}
                        data-testid={`button-delete-banner-${banner.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <Badge className="absolute top-2 left-2" variant="secondary">
                      <Clock className="w-3 h-3 mr-1" />
                      Taslak
                    </Badge>
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium truncate">{banner.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(banner.createdAt), "d MMM yyyy", { locale: tr })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Henüz taslak yok</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Yeni içerik oluşturmak için butonu kullanın
                </p>
                <Button onClick={() => setIsEditorOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  İçerik Oluştur
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="published" className="space-y-4">
          {announcementsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}><Skeleton className="h-48 w-full" /></Card>
              ))}
            </div>
          ) : publishedAnnouncements.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {publishedAnnouncements.map((announcement) => (
                <Card key={announcement.id} className="overflow-hidden">
                  {announcement.bannerImageUrl ? (
                    <div className="relative h-32">
                      <img 
                        src={announcement.bannerImageUrl} 
                        alt={announcement.title}
                        className="w-full h-full object-cover"
                      />
                      <Badge 
                        className="absolute top-2 right-2"
                        variant={announcement.priority === 'urgent' ? "destructive" : "default"}
                      >
                        {priorityLabels[announcement.priority]}
                      </Badge>
                    </div>
                  ) : (
                    <div className="h-32 flex items-center justify-center bg-primary/5">
                      <Megaphone className="w-10 h-10 text-primary" />
                    </div>
                  )}
                  <CardContent className="p-3">
                    <h3 className="font-medium truncate">{announcement.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {announcement.message}
                    </p>
                    <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(announcement.publishedAt!), "d MMM yyyy", { locale: tr })}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {categoryLabels[announcement.category] || announcement.category}
                      </Badge>
                    </div>
                    <div className="flex gap-1 mt-2">
                      <Button variant="ghost" size="sm" className="flex-1" data-testid={`button-view-${announcement.id}`}>
                        <Eye className="w-3 h-3 mr-1" />
                        Görüntüle
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteClick("announcement", announcement.id)}
                        data-testid={`button-delete-${announcement.id}`}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8">
              <div className="text-center">
                <Send className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Henüz yayınlanmış duyuru yok</h3>
                <p className="text-sm text-muted-foreground">
                  Taslakları yayınlayarak başlayın
                </p>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="carousel" className="space-y-4">
          {bannersLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}><Skeleton className="h-48 w-full" /></Card>
              ))}
            </div>
          ) : carouselBanners.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {carouselBanners.map((banner) => (
                <Card key={banner.id} className="overflow-hidden">
                  <div className="relative h-32">
                    <img 
                      src={banner.imageUrl} 
                      alt={banner.title}
                      className="w-full h-full object-cover"
                    />
                    <Badge className="absolute top-2 left-2 bg-green-500">
                      Aktif
                    </Badge>
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium truncate">{banner.title}</h3>
                    {banner.startDate && banner.endDate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(banner.startDate), "d MMM", { locale: tr })} - {format(new Date(banner.endDate), "d MMM yyyy", { locale: tr })}
                      </p>
                    )}
                    <div className="flex gap-1 mt-2">
                      <Button variant="ghost" size="icon" data-testid={`button-edit-carousel-${banner.id}`}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteClick("banner", banner.id)}
                        data-testid={`button-delete-carousel-${banner.id}`}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8">
              <div className="text-center">
                <LayoutGrid className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Carousel'da banner yok</h3>
                <p className="text-sm text-muted-foreground">
                  Banner Editör ile yeni carousel banner'ı oluşturun
                </p>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Banner Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden">
          <BannerEditor />
        </DialogContent>
      </Dialog>

      {/* Publish Dialog */}
      <Dialog open={isPublishDialogOpen} onOpenChange={(open) => {
        setIsPublishDialogOpen(open);
        if (!open) {
          form.reset();
          setBannerImageUrl("");
          setSelectedBanner(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 shrink-0">
            <DialogTitle>Duyuru Olarak Yayınla</DialogTitle>
            <DialogDescription>
              Banner'ı duyuru olarak yayınlamak için bilgileri tamamlayın
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 max-h-[55vh] overflow-y-auto px-6">
                <div className="space-y-4 pb-4">
                  {bannerImageUrl && (
                    <div className="relative rounded-lg overflow-hidden">
                      <img src={bannerImageUrl} alt="Banner" className="w-full h-32 object-cover" />
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Başlık</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Duyuru başlığı" data-testid="input-publish-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Açıklama</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Duyuru içeriği..." rows={3} data-testid="input-publish-message" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Öncelik</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-publish-priority">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="urgent">Acil</SelectItem>
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
                          <Select onValueChange={field.onChange} value={field.value || "general"}>
                            <FormControl>
                              <SelectTrigger data-testid="select-publish-category">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="general">Genel</SelectItem>
                              <SelectItem value="new_product">Yeni Ürün</SelectItem>
                              <SelectItem value="campaign">Kampanya</SelectItem>
                              <SelectItem value="policy">Politika</SelectItem>
                              <SelectItem value="training">Eğitim</SelectItem>
                              <SelectItem value="event">Etkinlik</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="showOnDashboard"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <FormLabel>Dashboard'da Göster</FormLabel>
                          <FormDescription className="text-xs">
                            Carousel'da banner olarak görünsün
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value || false} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetRoles"
                    render={({ field }) => {
                      const roles = [
                        { value: "supervisor", label: "Supervisor" },
                        { value: "barista", label: "Barista" },
                        { value: "stajyer", label: "Stajyer" },
                        { value: "coach", label: "Coach (HQ)" },
                      ];
                      const selectedRoles = field.value || [];
                      return (
                        <FormItem>
                          <FormLabel>Hedef Roller (Opsiyonel)</FormLabel>
                          <div className="flex flex-wrap gap-2 p-2 border rounded-lg min-h-[40px]">
                            {roles.map((role) => {
                              const isSelected = selectedRoles.includes(role.value);
                              return (
                                <Badge
                                  key={role.value}
                                  variant={isSelected ? "default" : "outline"}
                                  className="cursor-pointer"
                                  onClick={() => {
                                    if (isSelected) {
                                      field.onChange(selectedRoles.filter((r: string) => r !== role.value));
                                    } else {
                                      field.onChange([...selectedRoles, role.value]);
                                    }
                                  }}
                                >
                                  {role.label}
                                </Badge>
                              );
                            })}
                          </div>
                          <FormDescription>Boş bırakırsan herkese gönderilir</FormDescription>
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="targetBranches"
                    render={({ field }) => {
                      const selectedBranches = field.value || [];
                      return (
                        <FormItem>
                          <FormLabel>Hedef Şubeler (Opsiyonel)</FormLabel>
                          <ScrollArea className="max-h-24 border rounded-lg p-2">
                            <div className="flex flex-wrap gap-2">
                              {branches?.map((branch) => {
                                const isSelected = selectedBranches.includes(branch.id);
                                return (
                                  <Badge
                                    key={branch.id}
                                    variant={isSelected ? "default" : "outline"}
                                    className="cursor-pointer text-xs"
                                    onClick={() => {
                                      if (isSelected) {
                                        field.onChange(selectedBranches.filter((id: number) => id !== branch.id));
                                      } else {
                                        field.onChange([...selectedBranches, branch.id]);
                                      }
                                    }}
                                  >
                                    {branch.name}
                                  </Badge>
                                );
                              })}
                            </div>
                          </ScrollArea>
                          <FormDescription>Boş bırakırsan tüm şubelere gönderilir</FormDescription>
                        </FormItem>
                      );
                    }}
                  />
                </div>
              </div>
              <DialogFooter className="p-6 pt-4 border-t shrink-0">
                <Button type="button" variant="outline" onClick={() => setIsPublishDialogOpen(false)}>
                  İptal
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Yayınlanıyor..." : "Yayınla"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>İçeriği Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu içeriği silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => itemToDelete && deleteMutation.mutate(itemToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Siliniyor..." : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
