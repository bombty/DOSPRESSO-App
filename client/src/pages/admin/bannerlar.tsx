import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Redirect, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ObjectUploader } from "@/components/ObjectUploader";
import { 
  Image, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Edit, 
  Calendar,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Users,
  Upload,
  X
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ConfirmDeleteDialog, useConfirmDelete } from "@/components/confirm-delete-dialog";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";

const ROLE_OPTIONS = [
  { value: "all", label: "Tüm Kullanıcılar" },
  { value: "admin", label: "Admin" },
  { value: "muhasebe", label: "Muhasebe" },
  { value: "teknik", label: "Teknik" },
  { value: "destek", label: "Destek" },
  { value: "coach", label: "Coach" },
  { value: "satinalma", label: "Satın Alma" },
  { value: "yatirimci_hq", label: "Yatırımcı HQ" },
  { value: "fabrika", label: "Fabrika" },
  { value: "supervisor", label: "Supervisor" },
  { value: "supervisor_buddy", label: "Supervisor Buddy" },
  { value: "barista", label: "Barista" },
];

export default function AdminBannerlar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createDialog, setCreateDialog] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const { deleteState, requestDelete, cancelDelete, confirmDelete } = useConfirmDelete();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    imageUrl: "",
    linkUrl: "",
    targetRoles: [] as string[],
    startDate: "",
    endDate: "",
    isActive: true,
  });

  const { data: banners = [], isLoading, isError, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/banners"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("POST", "/api/admin/banners", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
      setCreateDialog(false);
      resetForm();
      toast({ title: "Banner oluşturuldu" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Banner oluşturulamadı", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/admin/banners/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
      setEditingBanner(null);
      resetForm();
      toast({ title: "Banner güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Banner güncellenemedi", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/admin/banners/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
      toast({ title: "Banner silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Banner silinemedi", variant: "destructive" });
    },
  });

  if (user?.role !== "admin") {
    return <Redirect to="/" />;
  }

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      imageUrl: "",
      linkUrl: "",
      targetRoles: [],
      startDate: "",
      endDate: "",
      isActive: true,
    });
  };

  const handleEdit = (banner: any) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || "",
      description: banner.description || "",
      imageUrl: banner.imageUrl || "",
      linkUrl: banner.linkUrl || "",
      targetRoles: banner.targetRoles || [],
      startDate: banner.startDate ? format(new Date(banner.startDate), "yyyy-MM-dd'T'HH:mm") : "",
      endDate: banner.endDate ? format(new Date(banner.endDate), "yyyy-MM-dd'T'HH:mm") : "",
      isActive: banner.isActive !== false,
    });
  };

  const handleSubmit = () => {
    if (!formData.startDate || !formData.endDate) {
      toast({ title: "Hata", description: "Başlangıç ve bitiş tarihi zorunludur", variant: "destructive" });
      return;
    }
    
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      toast({ title: "Hata", description: "Geçersiz tarih formatı", variant: "destructive" });
      return;
    }
    
    const data = {
      ...formData,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      targetRoles: formData.targetRoles.length > 0 && !formData.targetRoles.includes("all") 
        ? formData.targetRoles 
        : null,
    };

    if (editingBanner) {
      updateMutation.mutate({ id: editingBanner.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleRoleToggle = (role: string) => {
    if (role === "all") {
      setFormData(prev => ({ ...prev, targetRoles: [] }));
    } else {
      setFormData(prev => ({
        ...prev,
        targetRoles: prev.targetRoles.includes(role)
          ? prev.targetRoles.filter(r => r !== role)
          : [...prev.targetRoles, role]
      }));
    }
  };

  const isFormValid = formData.title && formData.startDate && formData.endDate;

  const getBannerStatus = (banner: any) => {
    const now = new Date();
    const start = new Date(banner.startDate);
    const end = new Date(banner.endDate);
    
    if (!banner.isActive) return { label: "Pasif", color: "bg-muted text-muted-foreground" };
    if (now < start) return { label: "Planlandı", color: "bg-blue-500/10 text-blue-600" };
    if (now > end) return { label: "Süresi Dolmuş", color: "bg-orange-500/10 text-orange-600" };
    return { label: "Aktif", color: "bg-green-500/10 text-green-600" };
  };

  
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/admin">
            <Button variant="ghost" size="icon" data-testid="button-back-admin">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Image className="h-5 w-5" />
              Banner Yönetimi
            </h1>
            <p className="text-sm text-muted-foreground">
              {banners.length} banner
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/duyuru-studio">
            <Button variant="outline" data-testid="button-banner-editor">
              <Image className="h-4 w-4 mr-2" />
              Duyuru Stüdyosu
            </Button>
          </Link>
          <Button onClick={() => setCreateDialog(true)} data-testid="button-create-banner">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Banner
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Yükleniyor...</p>
          ) : banners.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Image className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Henüz banner oluşturulmamış</p>
                <Button 
                  variant="outline" 
                  className="mt-4" 
                  onClick={() => setCreateDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  İlk Banner'ı Oluştur
                </Button>
              </CardContent>
            </Card>
          ) : (
            banners.map((banner: any) => {
              const status = getBannerStatus(banner);
              return (
                <Card key={banner.id} data-testid={`banner-card-${banner.id}`}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {banner.imageUrl && (
                        <div className="w-24 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                          <img 
                            src={banner.imageUrl} 
                            alt={banner.title} 
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-medium text-sm">{banner.title}</h3>
                            {banner.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                {banner.description}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className={status.color}>
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(banner.startDate), "dd MMM", { locale: tr })} - {format(new Date(banner.endDate), "dd MMM yyyy", { locale: tr })}
                          </span>
                          {banner.targetRoles?.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {banner.targetRoles.length} rol
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleEdit(banner)}
                          data-testid={`button-edit-banner-${banner.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive"
                          onClick={() => requestDelete(banner.id, banner.title || "")}
                          data-testid={`button-delete-banner-${banner.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Create/Edit Dialog */}
      <Dialog open={createDialog || !!editingBanner} onOpenChange={(open) => {
        if (!open) {
          setCreateDialog(false);
          setEditingBanner(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingBanner ? "Banner Düzenle" : "Yeni Banner Oluştur"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Başlık *</Label>
              <Input
                id="title"
                placeholder="Banner başlığı"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                data-testid="input-banner-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea
                id="description"
                placeholder="Kısa açıklama"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                data-testid="input-banner-description"
              />
            </div>

            <div className="space-y-2">
              <Label>Banner Görseli</Label>
              {formData.imageUrl ? (
                <div className="relative">
                  <div className="aspect-[3/1] w-full rounded-lg overflow-hidden bg-muted border">
                    <img 
                      src={formData.imageUrl} 
                      alt="Banner önizleme" 
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={() => setFormData(prev => ({ ...prev, imageUrl: "" }))}
                    data-testid="button-remove-banner-image"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <ObjectUploader
                  onGetUploadParameters={async () => {
                    const response = await fetch("/api/objects/upload", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                    });
                    const data = await response.json();
                    return { method: "PUT" as const, url: data.url };
                  }}
                  onComplete={(result) => {
                    if (result.successful && result.successful[0]) {
                      setFormData(prev => ({ ...prev, imageUrl: result.successful[0].uploadURL }));
                    }
                  }}
                  buttonClassName="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Görsel Yükle
                </ObjectUploader>
              )}
              <p className="text-xs text-muted-foreground">
                Önerilen boyut: 1200x400px (3:1 oran). Otomatik olarak cihaza göre boyutlanır.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkUrl">Bağlantı URL (opsiyonel)</Label>
              <Input
                id="linkUrl"
                placeholder="https://example.com veya /sayfa"
                value={formData.linkUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, linkUrl: e.target.value }))}
                data-testid="input-banner-link"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Başlangıç Tarihi *</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  data-testid="input-banner-start"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Bitiş Tarihi *</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  data-testid="input-banner-end"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Hedef Kitle</Label>
              <div className="flex flex-wrap gap-2">
                {ROLE_OPTIONS.map(role => (
                  <Badge
                    key={role.value}
                    variant={
                      role.value === "all" 
                        ? (formData.targetRoles.length === 0 ? "default" : "outline")
                        : (formData.targetRoles.includes(role.value) ? "default" : "outline")
                    }
                    className="cursor-pointer"
                    onClick={() => handleRoleToggle(role.value)}
                  >
                    {role.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Aktif</Label>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                data-testid="switch-banner-active"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setCreateDialog(false);
                setEditingBanner(null);
                resetForm();
              }}
            >
              İptal
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!isFormValid || createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-banner"
            >
              {(createMutation.isPending || updateMutation.isPending) ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
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
        description={`"${deleteState.itemName || ''}" banner silinecektir. Bu işlem geri alınamaz.`}
      />
    </div>
  );
}
