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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageCropper } from "@/components/ImageCropper";
import { 
  Megaphone, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Edit, 
  Calendar,
  Eye,
  EyeOff,
  Pin,
  Image as ImageIcon,
  Upload,
  X,
  Users,
  Tag,
  AlertCircle,
  ShoppingBag,
  BookOpen,
  PartyPopper,
  FileText,
  Sparkles,
  Loader
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ConfirmDeleteDialog, useConfirmDelete } from "@/components/confirm-delete-dialog";

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

const CATEGORY_OPTIONS = [
  { value: "general", label: "Genel", icon: Megaphone, color: "bg-blue-500/10 text-blue-600" },
  { value: "new_product", label: "Yeni Ürün", icon: ShoppingBag, color: "bg-green-500/10 text-green-600" },
  { value: "policy", label: "Politika", icon: FileText, color: "bg-purple-500/10 text-purple-600" },
  { value: "campaign", label: "Kampanya", icon: PartyPopper, color: "bg-orange-500/10 text-orange-600" },
  { value: "urgent", label: "Acil", icon: AlertCircle, color: "bg-red-500/10 text-red-600" },
  { value: "training", label: "Eğitim", icon: BookOpen, color: "bg-cyan-500/10 text-cyan-600" },
  { value: "event", label: "Etkinlik", icon: Calendar, color: "bg-pink-500/10 text-pink-600" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Düşük" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "Yüksek" },
  { value: "urgent", label: "Acil" },
];

type Announcement = {
  id: number;
  title: string;
  message: string;
  summary?: string;
  category?: string;
  priority?: string;
  targetRoles?: string[];
  targetBranches?: number[];
  bannerImageUrl?: string;
  bannerTitle?: string;
  bannerSubtitle?: string;
  showOnDashboard?: boolean;
  bannerPriority?: number;
  isPinned?: boolean;
  publishedAt?: string;
  expiresAt?: string;
  createdAt?: string;
};

export default function AdminDuyurular() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createDialog, setCreateDialog] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const { deleteState, requestDelete, cancelDelete, confirmDelete } = useConfirmDelete();
  const [activeTab, setActiveTab] = useState("all");
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState<string>("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    summary: "",
    category: "general",
    priority: "normal",
    targetRoles: [] as string[],
    targetBranches: [] as number[],
    bannerImageUrl: "",
    bannerTitle: "",
    bannerSubtitle: "",
    showOnDashboard: false,
    bannerPriority: 0,
    isPinned: false,
    expiresAt: "",
  });

  const allowedRoles = ["admin", "coach", "destek"];
  if (!allowedRoles.includes(user?.role || "")) {
    return <Redirect to="/" />;
  }

  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ["/api/admin/announcements"],
  });

  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ["/api/branches"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("POST", "/api/admin/announcements", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      setCreateDialog(false);
      resetForm();
      toast({ title: "Duyuru oluşturuldu" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Duyuru oluşturulamadı", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/admin/announcements/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      setEditingAnnouncement(null);
      resetForm();
      toast({ title: "Duyuru güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Duyuru güncellenemedi", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/admin/announcements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({ title: "Duyuru silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Duyuru silinemedi", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      message: "",
      summary: "",
      category: "general",
      priority: "normal",
      targetRoles: [],
      targetBranches: [],
      bannerImageUrl: "",
      bannerTitle: "",
      bannerSubtitle: "",
      showOnDashboard: false,
      bannerPriority: 0,
      isPinned: false,
      expiresAt: "",
    });
    setAiPrompt("");
  };

  const handleImageCrop = (croppedImage: string) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = croppedImage;

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          setFormData(prev => ({ ...prev, bannerImageUrl: croppedImage }));
        }
      }, "image/jpeg");
    };
  };

  const handleGenerateImage = async () => {
    if (!aiPrompt.trim()) {
      toast({ title: "Hata", description: "Lütfen görsel açıklaması girin", variant: "destructive" });
      return;
    }

    setIsGeneratingImage(true);
    try {
      const response = await apiRequest("POST", "/api/ai/generate-image", { prompt: aiPrompt });
      const data = await response.json();
      
      if (!data.imageUrl) {
        toast({ title: "Hata", description: "Görsel URL'si alınamadı", variant: "destructive" });
        return;
      }
      
      setFormData(prev => ({ ...prev, bannerImageUrl: data.imageUrl }));
      setAiPrompt("");
      
      if (data.warning) {
        toast({ 
          title: "Uyarı", 
          description: "Görsel geçici olarak kaydedildi. Object Storage yapılandırılmamış, görsel 1 saat içinde silinebilir.", 
          variant: "destructive" 
        });
      } else {
        toast({ title: "Başarılı", description: "Banner görseli oluşturuldu ve kaydedildi" });
      }
    } catch (error: any) {
      const errorMessage = error?.message || "Görsel oluşturulamadı";
      toast({ title: "Hata", description: errorMessage, variant: "destructive" });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title || "",
      message: announcement.message || "",
      summary: announcement.summary || "",
      category: announcement.category || "general",
      priority: announcement.priority || "normal",
      targetRoles: announcement.targetRoles || [],
      targetBranches: announcement.targetBranches || [],
      bannerImageUrl: announcement.bannerImageUrl || "",
      bannerTitle: announcement.bannerTitle || "",
      bannerSubtitle: announcement.bannerSubtitle || "",
      showOnDashboard: announcement.showOnDashboard || false,
      bannerPriority: announcement.bannerPriority || 0,
      isPinned: announcement.isPinned || false,
      expiresAt: announcement.expiresAt ? format(new Date(announcement.expiresAt), "yyyy-MM-dd'T'HH:mm") : "",
    });
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.message) {
      toast({ title: "Hata", description: "Başlık ve mesaj zorunludur", variant: "destructive" });
      return;
    }

    const data = {
      ...formData,
      targetRoles: formData.targetRoles.length > 0 && !formData.targetRoles.includes("all") 
        ? formData.targetRoles 
        : null,
      targetBranches: formData.targetBranches.length > 0 ? formData.targetBranches : null,
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
    };

    if (editingAnnouncement) {
      updateMutation.mutate({ id: editingAnnouncement.id, data });
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

  const getCategoryInfo = (category: string) => {
    return CATEGORY_OPTIONS.find(c => c.value === category) || CATEGORY_OPTIONS[0];
  };

  const getStatus = (announcement: Announcement) => {
    const now = new Date();
    const published = announcement.publishedAt ? new Date(announcement.publishedAt) : null;
    const expires = announcement.expiresAt ? new Date(announcement.expiresAt) : null;
    
    if (expires && now > expires) return { label: "Süresi Dolmuş", color: "bg-gray-500/10 text-gray-500" };
    if (published && now < published) return { label: "Planlandı", color: "bg-blue-500/10 text-blue-600" };
    return { label: "Aktif", color: "bg-green-500/10 text-green-600" };
  };

  const filteredAnnouncements = activeTab === "all" 
    ? announcements 
    : announcements.filter(a => a.category === activeTab);

  const isFormValid = formData.title && formData.message;

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Link href="/admin">
            <Button variant="ghost" size="icon" data-testid="button-back-admin">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Duyuru Yönetimi
            </h1>
            <p className="text-sm text-muted-foreground">
              {announcements.length} duyuru
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateDialog(true)} data-testid="button-create-announcement">
          <Plus className="h-4 w-4 mr-2" />
          Yeni Duyuru
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full overflow-x-auto flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="all" className="text-xs">Tümü</TabsTrigger>
          {CATEGORY_OPTIONS.map(cat => (
            <TabsTrigger key={cat.value} value={cat.value} className="text-xs">
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Yükleniyor...</p>
          ) : filteredAnnouncements.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Henüz duyuru oluşturulmamış</p>
                <Button 
                  variant="outline" 
                  className="mt-4" 
                  onClick={() => setCreateDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  İlk Duyuruyu Oluştur
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredAnnouncements.map((announcement) => {
              const categoryInfo = getCategoryInfo(announcement.category || "general");
              const status = getStatus(announcement);
              const CategoryIcon = categoryInfo.icon;
              return (
                <Card key={announcement.id} data-testid={`announcement-card-${announcement.id}`}>
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      {announcement.bannerImageUrl && (
                        <div className="w-20 h-14 rounded-md overflow-hidden bg-muted flex-shrink-0">
                          <img 
                            src={announcement.bannerImageUrl} 
                            alt={announcement.title} 
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-sm">{announcement.title}</h3>
                            {announcement.isPinned && (
                              <Pin className="h-3 w-3 text-amber-500" />
                            )}
                            {announcement.showOnDashboard && (
                              <ImageIcon className="h-3 w-3 text-blue-500" />
                            )}
                          </div>
                          <Badge variant="outline" className={status.color}>
                            {status.label}
                          </Badge>
                        </div>
                        {announcement.summary && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {announcement.summary}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                          <Badge variant="outline" className={`${categoryInfo.color} text-xs`}>
                            <CategoryIcon className="h-3 w-3 mr-1" />
                            {categoryInfo.label}
                          </Badge>
                          {announcement.createdAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(announcement.createdAt), "dd MMM yyyy", { locale: tr })}
                            </span>
                          )}
                          {(announcement.targetRoles?.length || 0) > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {announcement.targetRoles?.length} rol
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleEdit(announcement)}
                          data-testid={`button-edit-announcement-${announcement.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive"
                          onClick={() => requestDelete(announcement.id, announcement.title || "")}
                          data-testid={`button-delete-announcement-${announcement.id}`}
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

      <Dialog open={createDialog || !!editingAnnouncement} onOpenChange={(open) => {
        if (!open) {
          setCreateDialog(false);
          setEditingAnnouncement(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {editingAnnouncement ? "Duyuru Düzenle" : "Yeni Duyuru Oluştur"}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4 -mr-4">
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="content">İçerik</TabsTrigger>
              <TabsTrigger value="banner">Banner</TabsTrigger>
              <TabsTrigger value="targeting">Hedefleme</TabsTrigger>
            </TabsList>
            
            <TabsContent value="content" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Başlık *</Label>
                <Input
                  id="title"
                  placeholder="Duyuru başlığı"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  data-testid="input-announcement-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="summary">Özet</Label>
                <Input
                  id="summary"
                  placeholder="Kısa özet (liste görünümünde gösterilir)"
                  value={formData.summary}
                  onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                  data-testid="input-announcement-summary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Mesaj *</Label>
                <Textarea
                  id="message"
                  placeholder="Duyuru içeriği"
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  rows={6}
                  data-testid="input-announcement-message"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Kategori</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
                  >
                    <SelectTrigger data-testid="select-announcement-category">
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <span className="flex items-center gap-2">
                            <cat.icon className="h-4 w-4" />
                            {cat.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="priority">Öncelik</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(val) => setFormData(prev => ({ ...prev, priority: val }))}
                  >
                    <SelectTrigger data-testid="select-announcement-priority">
                      <SelectValue placeholder="Öncelik seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map(p => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiresAt">Bitiş Tarihi (opsiyonel)</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                  onClick={(e) => e.stopPropagation()}
                  data-testid="input-announcement-expires"
                />
                <p className="text-xs text-muted-foreground">
                  Boş bırakılırsa duyuru süresiz olarak görünür
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Sabitle</Label>
                  <p className="text-xs text-muted-foreground">Liste başında göster</p>
                </div>
                <Switch
                  checked={formData.isPinned}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPinned: checked }))}
                  data-testid="switch-announcement-pinned"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="banner" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Dashboard'da Banner Göster</Label>
                  <p className="text-xs text-muted-foreground">Ana sayfada kaydırmalı banner olarak gösterilir</p>
                </div>
                <Switch
                  checked={formData.showOnDashboard}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, showOnDashboard: checked }))}
                  data-testid="switch-show-on-dashboard"
                />
              </div>

              {formData.showOnDashboard && (
                <>
                  <div className="space-y-2">
                    <Label>Banner Görseli</Label>
                    {formData.bannerImageUrl ? (
                      <div className="relative">
                        <div className="aspect-[3/1] w-full rounded-lg overflow-hidden bg-muted border">
                          <img 
                            src={formData.bannerImageUrl} 
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
                          onClick={() => setFormData(prev => ({ ...prev, bannerImageUrl: "" }))}
                          data-testid="button-remove-banner-image"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
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
                              const imageUrl = result.successful[0].uploadURL;
                              setCropperImage(imageUrl);
                              setCropperOpen(true);
                            }
                          }}
                          buttonClassName="w-full"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Görsel Yükle ve Kırp
                        </ObjectUploader>
                        
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t"></div>
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="px-2 bg-background text-muted-foreground">Veya</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="aiPrompt">AI ile Görsel Oluştur</Label>
                          <div className="flex gap-2">
                            <Input
                              id="aiPrompt"
                              placeholder="Örn: Kahveli masaüstü, modern tasarım, sıcak renkler"
                              value={aiPrompt}
                              onChange={(e) => setAiPrompt(e.target.value)}
                              disabled={isGeneratingImage}
                              data-testid="input-ai-prompt"
                            />
                            <Button
                              type="button"
                              size="icon"
                              onClick={handleGenerateImage}
                              disabled={isGeneratingImage || !aiPrompt.trim()}
                              data-testid="button-generate-image"
                            >
                              {isGeneratingImage ? (
                                <Loader className="h-4 w-4 animate-spin" />
                              ) : (
                                <Sparkles className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            DALL-E ile banner görseli oluştur
                          </p>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Önerilen boyut: 1200x400px (3:1 oran)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bannerTitle">Banner Başlığı</Label>
                    <Input
                      id="bannerTitle"
                      placeholder="Görsel üzerinde gösterilecek başlık"
                      value={formData.bannerTitle}
                      onChange={(e) => setFormData(prev => ({ ...prev, bannerTitle: e.target.value }))}
                      data-testid="input-banner-title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bannerSubtitle">Banner Alt Başlık</Label>
                    <Input
                      id="bannerSubtitle"
                      placeholder="Görsel üzerinde gösterilecek alt başlık"
                      value={formData.bannerSubtitle}
                      onChange={(e) => setFormData(prev => ({ ...prev, bannerSubtitle: e.target.value }))}
                      data-testid="input-banner-subtitle"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bannerPriority">Banner Sıralaması</Label>
                    <Input
                      id="bannerPriority"
                      type="number"
                      min={0}
                      max={100}
                      placeholder="0-100 arası (yüksek = önce gösterilir)"
                      value={formData.bannerPriority}
                      onChange={(e) => setFormData(prev => ({ ...prev, bannerPriority: parseInt(e.target.value) || 0 }))}
                      data-testid="input-banner-priority"
                    />
                  </div>
                </>
              )}
            </TabsContent>
            
            <TabsContent value="targeting" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Hedef Roller</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Boş bırakılırsa tüm kullanıcılara gösterilir
                </p>
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

              <div className="space-y-2">
                <Label>Hedef Şubeler</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Boş bırakılırsa tüm şubelere gösterilir
                </p>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {branches.map((branch: any) => (
                    <Badge
                      key={branch.id}
                      variant={formData.targetBranches.includes(branch.id) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          targetBranches: prev.targetBranches.includes(branch.id)
                            ? prev.targetBranches.filter(b => b !== branch.id)
                            : [...prev.targetBranches, branch.id]
                        }));
                      }}
                    >
                      {branch.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
          </ScrollArea>
          
          <DialogFooter className="mt-4 flex-shrink-0 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => {
                setCreateDialog(false);
                setEditingAnnouncement(null);
                resetForm();
              }}
            >
              İptal
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!isFormValid || createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-announcement"
            >
              {(createMutation.isPending || updateMutation.isPending) ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImageCropper
        open={cropperOpen}
        imageSrc={cropperImage}
        onClose={() => {
          setCropperOpen(false);
          setCropperImage("");
        }}
        onCropComplete={handleImageCrop}
      />

      <ConfirmDeleteDialog
        open={deleteState.open}
        onOpenChange={(open) => !open && cancelDelete()}
        onConfirm={() => {
          const id = confirmDelete();
          if (id) deleteMutation.mutate(id as number);
        }}
        title="Silmek istediğinize emin misiniz?"
        description={`"${deleteState.itemName || ''}" duyurusu silinecektir. Bu işlem geri alınamaz.`}
      />
    </div>
  );
}
