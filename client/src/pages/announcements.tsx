import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isHQRole, insertAnnouncementSchema, type Announcement, type InsertAnnouncement, type Branch } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListSkeleton } from "@/components/list-skeleton";
import { EmptyState } from "@/components/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Megaphone, Plus, AlertCircle, Calendar, User, Image, Eye, Users, X, Pencil, Trash2, Layout } from "lucide-react";
import BannerEditor from "./banner-editor";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ConfirmDeleteDialog, useConfirmDelete } from "@/components/confirm-delete-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ObjectUploader } from "@/components/ObjectUploader";

const priorityLabels: Record<string, string> = {
  normal: "Normal",
  urgent: "Acil",
};

const categoryLabels: Record<string, string> = {
  general: "Genel",
  new_product: "Yeni Ürün",
  policy: "Politika",
  campaign: "Kampanya",
  urgent: "Acil",
  training: "Eğitim",
  event: "Etkinlik",
};

type AnnouncementWithUser = Announcement & {
  createdBy: {
    fullName: string;
  };
};

type ReadStatus = {
  readCount: number;
  totalTargetUsers: number;
  readers: { userId: number; username: string; readAt: string }[];
};

export default function Announcements() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [bannerImageUrl, setBannerImageUrl] = useState<string>("");
  const [readStatusDialogOpen, setReadStatusDialogOpen] = useState(false);
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<number | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementWithUser | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementWithUser | null>(null);
  const { deleteState, requestDelete, cancelDelete, confirmDelete } = useConfirmDelete();
  const [markedAsRead, setMarkedAsRead] = useState<Set<number>>(new Set());

  const isHQ = user?.role && isHQRole(user.role as any);

  const { data: announcements, isLoading, isError, refetch } = useQuery<AnnouncementWithUser[]>({
    queryKey: ['/api/announcements'],
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ['/api/branches'],
  });

  const { data: readStatus } = useQuery<ReadStatus>({
    queryKey: [`/api/announcements/${selectedAnnouncementId}/read-status`],
    enabled: readStatusDialogOpen && isHQ && !!selectedAnnouncementId,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (announcementId: number) => {
      await apiRequest('POST', `/api/announcements/${announcementId}/read`, {});
    },
    onSuccess: (_, announcementId) => {
      setMarkedAsRead(prev => {
        const newSet = new Set(prev);
        newSet.add(announcementId);
        return newSet;
      });
      queryClient.invalidateQueries({ queryKey: ['/api/announcements/unread-count'] });
    },
  });

  const isUserTargeted = (announcement: AnnouncementWithUser, currentUser: typeof user): boolean => {
    if (!currentUser) return false;
    const hasRoleTargeting = announcement.targetRoles && announcement.targetRoles.length > 0;
    const hasBranchTargeting = announcement.targetBranches && announcement.targetBranches.length > 0;
    if (!hasRoleTargeting && !hasBranchTargeting) return true;
    if (hasRoleTargeting && !hasBranchTargeting) {
      return announcement.targetRoles!.includes(currentUser.role as string);
    }
    if (!hasRoleTargeting && hasBranchTargeting) {
      return currentUser.branchId ? announcement.targetBranches!.includes(currentUser.branchId) : false;
    }
    const roleMatch = announcement.targetRoles!.includes(currentUser.role as string);
    const branchMatch = currentUser.branchId ? announcement.targetBranches!.includes(currentUser.branchId) : false;
    return roleMatch && branchMatch;
  };

  useEffect(() => {
    if (!announcements || !user) return;
    const toMark = announcements.filter(a => 
      !markedAsRead.has(a.id) && isUserTargeted(a, user)
    );
    if (toMark.length > 0 && !markAsReadMutation.isPending) {
      const first = toMark[0];
      markAsReadMutation.mutate(first.id);
    }
  }, [announcements, user, markedAsRead, markAsReadMutation.isPending]);

  const handleViewReadStatus = (announcementId: number) => {
    setSelectedAnnouncementId(announcementId);
    setReadStatusDialogOpen(true);
  };

  const handleOpenDetail = (announcement: AnnouncementWithUser) => {
    setSelectedAnnouncement(announcement);
    setDetailDialogOpen(true);
  };

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
      bannerTitle: null,
      bannerSubtitle: null,
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
      toast({
        title: "Başarılı",
        description: "Duyuru yayınlandı",
      });
      setIsCreateDialogOpen(false);
      form.reset();
      setBannerImageUrl("");
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Duyuru yayınlanamadı",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertAnnouncement }) => {
      await apiRequest('PATCH', `/api/admin/announcements/${id}`, { 
        ...data, 
        bannerImageUrl: bannerImageUrl || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/announcements/banners'] });
      toast({ title: "Başarılı", description: "Duyuru güncellendi" });
      setIsEditDialogOpen(false);
      setEditingAnnouncement(null);
      form.reset();
      setBannerImageUrl("");
    },
    onError: () => {
      toast({ title: "Hata", description: "Duyuru güncellenemedi", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/admin/announcements/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/announcements/banners'] });
      toast({ title: "Başarılı", description: "Duyuru silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Duyuru silinemedi", variant: "destructive" });
    },
  });

  const handleSubmit = (data: InsertAnnouncement) => {
    const submitData = {
      ...data,
      targetRoles: data.targetRoles && data.targetRoles.length > 0 ? data.targetRoles : null,
      targetBranches: data.targetBranches && data.targetBranches.length > 0 ? data.targetBranches : null,
    };
    createMutation.mutate(submitData);
  };

  const handleEditSubmit = (data: InsertAnnouncement) => {
    if (!editingAnnouncement) return;
    const submitData = {
      ...data,
      targetRoles: data.targetRoles && data.targetRoles.length > 0 ? data.targetRoles : null,
      targetBranches: data.targetBranches && data.targetBranches.length > 0 ? data.targetBranches : null,
    };
    updateMutation.mutate({ id: editingAnnouncement.id, data: submitData });
  };

  const handleEditClick = (announcement: AnnouncementWithUser, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAnnouncement(announcement);
    setBannerImageUrl(announcement.bannerImageUrl || "");
    form.reset({
      title: announcement.title,
      message: announcement.message,
      priority: announcement.priority,
      category: announcement.category,
      targetRoles: announcement.targetRoles || [],
      targetBranches: announcement.targetBranches || [],
      expiresAt: announcement.expiresAt,
      bannerImageUrl: announcement.bannerImageUrl,
      bannerTitle: announcement.bannerTitle,
      bannerSubtitle: announcement.bannerSubtitle,
      showOnDashboard: announcement.showOnDashboard || false,
      isPinned: announcement.isPinned || false,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    requestDelete(id, "");
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
              Duyurular
            </h1>
            <p className="text-muted-foreground mt-1" data-testid="text-page-description">
              Şirket geneli duyuru ve bildirimler
            </p>
          </div>
          {isHQ && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Layout className="w-4 h-4 mr-2" />
                  Banner Düzenleyici
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden">
                <BannerEditor />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isHQ && (
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              form.reset();
              setBannerImageUrl("");
            }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-announcement">
                <Plus className="w-4 h-4 mr-2" />
                Yeni Duyuru
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
              <DialogHeader className="p-6 pb-2 shrink-0">
                <DialogTitle>Yeni Duyuru Yayınla</DialogTitle>
                <DialogDescription>
                  Duyuru bilgilerini doldurun ve banner görseli ekleyin
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
                  <div className="flex-1 max-h-[55vh] overflow-y-auto px-6">
                    <div className="space-y-4 pb-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Başlık</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Duyuru başlığı" data-testid="input-title" />
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
                          <FormLabel>Mesaj</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Duyuru içeriği..."
                              rows={3}
                              data-testid="input-message"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Image className="w-4 h-4" />
                          <FormLabel className="text-base font-medium">Banner Görseli</FormLabel>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" type="button" className="h-7 text-xs">
                              Banner Editörü
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl h-[80vh] p-0 overflow-hidden">
                            <BannerEditor />
                          </DialogContent>
                        </Dialog>
                      </div>
                      
                      {bannerImageUrl ? (
                        <div className="relative">
                          <img 
                            src={bannerImageUrl} 
                            alt="Banner önizleme" 
                            className="w-full h-32 object-cover rounded-lg"
                            loading="lazy"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8"
                            onClick={() => setBannerImageUrl("")}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <ObjectUploader
                          maxFileSize={5 * 1024 * 1024}
                          maxNumberOfFiles={1}
                          onGetUploadParameters={async () => {
                            const response = await apiRequest('POST', '/api/object-storage/presigned-url', {
                              filename: `banner-${Date.now()}.jpg`,
                              contentType: 'image/jpeg'
                            });
                            const data = await response.json();
                            return { method: 'PUT', url: data.url };
                          }}
                          onComplete={(result) => {
                            if (result.successful.length > 0) {
                              const uploadedUrl = result.successful[0].uploadURL || '';
                              setBannerImageUrl(uploadedUrl);
                              toast({ title: "Başarılı", description: "Banner yüklendi" });
                            }
                          }}
                        >
                          <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors">
                            <Image className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                              Banner görseli yüklemek için tıklayın
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              PNG, JPG (max 5MB)
                            </p>
                          </div>
                        </ObjectUploader>
                      )}

                      <FormField
                        control={form.control}
                        name="showOnDashboard"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <FormLabel>Dashboard'da göster</FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value || false}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Öncelik</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-priority">
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
                            <Select onValueChange={field.onChange} defaultValue={field.value || "general"}>
                              <FormControl>
                                <SelectTrigger data-testid="select-category">
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
                      name="targetRoles"
                      render={({ field }) => {
                        const roles = [
                          { value: "supervisor", label: "Supervisor" },
                          { value: "barista", label: "Barista" },
                          { value: "stajyer", label: "Stajyer" },
                          { value: "coach", label: "Coach (HQ)" },
                          { value: "muhasebe", label: "Muhasebe (HQ)" },
                          { value: "teknik", label: "Teknik (HQ)" },
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
                                    data-testid={`badge-role-${role.value}`}
                                  >
                                    {role.label}
                                  </Badge>
                                );
                              })}
                            </div>
                            <FormDescription>
                              Rol seçmezsen tüm rollere gönderilir
                            </FormDescription>
                            <FormMessage />
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
                            <ScrollArea className="max-h-32 border rounded-lg p-2">
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
                                      data-testid={`badge-branch-${branch.id}`}
                                    >
                                      {branch.name}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </ScrollArea>
                            <FormDescription>
                              Şube seçmezsen tüm şubelere gönderilir
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="expiresAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Son Geçerlilik Tarihi (Opsiyonel)</FormLabel>
                          <FormControl>
                            <Input 
                              type="datetime-local"
                              value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                              onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
                              data-testid="input-expires-at"
                            />
                          </FormControl>
                          <FormDescription>
                            Boş bırakılırsa duyuru süresiz aktif kalır
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    </div>
                  </div>
                  <DialogFooter className="p-6 pt-4 border-t shrink-0">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreateDialogOpen(false)}
                      data-testid="button-cancel"
                    >
                      İptal
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending}
                      data-testid="button-submit"
                    >
                      {createMutation.isPending ? "Yayınlanıyor..." : "Yayınla"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isError ? (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold">Bir hata oluştu</h3>
          <p className="text-muted-foreground mt-2">Veriler yüklenirken sorun oluştu.</p>
          <Button onClick={() => refetch()} className="mt-4" data-testid="button-retry">Tekrar Dene</Button>
        </div>
      ) : isLoading ? (
        <ListSkeleton count={6} variant="card" />
      ) : announcements && announcements.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {announcements.map((announcement) => {
            const isUrgent = announcement.priority === 'urgent';
            const isActive = announcement.publishedAt && (!announcement.expiresAt || new Date(announcement.expiresAt) > new Date());
            const hasBanner = !!announcement.bannerImageUrl;

            return (
              <Card 
                key={announcement.id}
                className={`overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 ${
                  isUrgent ? 'ring-2 ring-destructive' : ''
                } ${!isActive ? 'opacity-60' : ''}`}
                onClick={() => handleOpenDetail(announcement)}
                data-testid={`card-announcement-${announcement.id}`}
              >
                {hasBanner ? (
                  <div className="relative h-36 overflow-hidden">
                    <img 
                      src={announcement.bannerImageUrl!} 
                      alt={announcement.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="text-white font-semibold line-clamp-2" data-testid={`text-title-${announcement.id}`}>
                        {announcement.title}
                      </h3>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Badge 
                        variant={isUrgent ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {priorityLabels[announcement.priority]}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className={`h-36 flex items-center justify-center ${
                    isUrgent ? 'bg-destructive/10' : 'bg-primary/5'
                  }`}>
                    <div className="text-center p-4">
                      {isUrgent ? (
                        <AlertCircle className="w-10 h-10 mx-auto text-destructive mb-2" />
                      ) : (
                        <Megaphone className="w-10 h-10 mx-auto text-primary mb-2" />
                      )}
                      <h3 className="font-semibold line-clamp-2 text-sm" data-testid={`text-title-${announcement.id}`}>
                        {announcement.title}
                      </h3>
                    </div>
                  </div>
                )}

                <CardContent className="p-3">
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {announcement.message}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {announcement.publishedAt 
                          ? format(new Date(announcement.publishedAt), "d MMM yyyy", { locale: tr })
                          : "Taslak"}
                      </span>
                    </div>
                    
                    <Badge variant="outline" className="text-xs">
                      {categoryLabels[announcement.category] || announcement.category}
                    </Badge>
                  </div>

                  {isHQ && (
                    <div className="flex gap-1 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewReadStatus(announcement.id);
                        }}
                        data-testid={`button-read-status-${announcement.id}`}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Okuma
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleEditClick(announcement, e)}
                        data-testid={`button-edit-${announcement.id}`}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDeleteClick(announcement.id, e)}
                        data-testid={`button-delete-${announcement.id}`}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-8">
          <div className="text-center">
            <Megaphone className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Henüz duyuru yok</h3>
            <p className="text-sm text-muted-foreground">
              {isHQ ? "Yeni duyuru oluşturmak için yukarıdaki butonu kullanın." : "Yeni duyurular burada görüntülenecek."}
            </p>
          </div>
        </Card>
      )}

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
          {selectedAnnouncement && (
            <>
              {selectedAnnouncement.bannerImageUrl && (
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={selectedAnnouncement.bannerImageUrl} 
                    alt={selectedAnnouncement.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                </div>
              )}
              <div className="p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h2 className="text-xl font-bold" data-testid="text-detail-title">
                    {selectedAnnouncement.title}
                  </h2>
                  <div className="flex gap-2">
                    <Badge variant={selectedAnnouncement.priority === 'urgent' ? "destructive" : "secondary"}>
                      {priorityLabels[selectedAnnouncement.priority]}
                    </Badge>
                    <Badge variant="outline">
                      {categoryLabels[selectedAnnouncement.category] || selectedAnnouncement.category}
                    </Badge>
                  </div>
                </div>

                <p className="text-muted-foreground whitespace-pre-wrap mb-6" data-testid="text-detail-message">
                  {selectedAnnouncement.message}
                </p>

                <div className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-4">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>{selectedAnnouncement.createdBy?.fullName || "Bilinmeyen"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {selectedAnnouncement.publishedAt 
                        ? format(new Date(selectedAnnouncement.publishedAt), "d MMMM yyyy HH:mm", { locale: tr })
                        : "Taslak"}
                    </span>
                  </div>
                </div>

                {selectedAnnouncement.expiresAt && (
                  <div className="text-sm text-muted-foreground mt-2">
                    <span className="font-medium">Son geçerlilik: </span>
                    {format(new Date(selectedAnnouncement.expiresAt), "d MMMM yyyy", { locale: tr })}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={readStatusDialogOpen} onOpenChange={setReadStatusDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Okuma Durumu
            </DialogTitle>
          </DialogHeader>
          {readStatus ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Okuyan</span>
                <span className="text-xl font-bold">
                  {readStatus.readCount} / {readStatus.totalTargetUsers}
                </span>
              </div>
              {readStatus.readers.length > 0 && (
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {readStatus.readers?.map((reader, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{reader.username}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(reader.readAt), "d MMM HH:mm", { locale: tr })}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center p-8">
              <Skeleton className="h-20 w-full" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          form.reset();
          setBannerImageUrl("");
          setEditingAnnouncement(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 shrink-0">
            <DialogTitle>Duyuru Düzenle</DialogTitle>
            <DialogDescription>
              Duyuru bilgilerini güncelleyin
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 max-h-[55vh] overflow-y-auto px-6">
                <div className="space-y-4 pb-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Başlık</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Duyuru başlığı" data-testid="input-edit-title" />
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
                        <FormLabel>Mesaj</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Duyuru içeriği..." rows={3} data-testid="input-edit-message" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Image className="w-4 h-4" />
                        <FormLabel className="text-base font-medium">Banner Görseli</FormLabel>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" type="button" className="h-7 text-xs">
                            Banner Editörü
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl h-[80vh] p-0 overflow-hidden">
                          <BannerEditor />
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    {bannerImageUrl ? (
                      <div className="relative">
                        <img src={bannerImageUrl} alt="Banner önizleme" className="w-full h-32 object-cover rounded-lg" loading="lazy" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8"
                          onClick={() => setBannerImageUrl("")}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <ObjectUploader
                        maxFileSize={5 * 1024 * 1024}
                        maxNumberOfFiles={1}
                        onGetUploadParameters={async () => {
                          const response = await apiRequest('POST', '/api/object-storage/presigned-url', {
                            filename: `banner-${Date.now()}.jpg`,
                            contentType: 'image/jpeg'
                          });
                          const data = await response.json();
                          return { method: 'PUT', url: data.url };
                        }}
                        onComplete={(result) => {
                          if (result.successful.length > 0) {
                            setBannerImageUrl(result.successful[0].uploadURL || '');
                          }
                        }}
                      >
                        <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors">
                          <Image className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Banner görseli yüklemek için tıklayın</p>
                        </div>
                      </ObjectUploader>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Öncelik</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-edit-priority">
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
                              <SelectTrigger data-testid="select-edit-category">
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
                </div>
              </div>
              <DialogFooter className="p-6 pt-4 border-t shrink-0">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} data-testid="button-edit-cancel">
                  İptal
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-edit-submit">
                  {updateMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteState.open}
        onOpenChange={(open) => !open && cancelDelete()}
        onConfirm={() => {
          const id = confirmDelete();
          if (id) deleteMutation.mutate(id as number);
        }}
        title="Silmek istediğinize emin misiniz?"
        description="Bu duyuru silinecektir. Bu işlem geri alınamaz."
      />
    </div>
  );
}
