import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDeleteDialog, useConfirmDelete } from "@/components/confirm-delete-dialog";
import {
  Bot,
  Plus,
  Trash2,
  Edit,
  Upload,
  Eye,
  EyeOff,
  X,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

const CATEGORIES = [
  { value: "all", label: "Tümü" },
  { value: "general", label: "Genel" },
  { value: "greeting", label: "Karşılama" },
  { value: "thinking", label: "Düşünen" },
  { value: "coffee", label: "Kahve" },
  { value: "celebrating", label: "Kutlama" },
  { value: "error", label: "Hata" },
  { value: "search", label: "Arama" },
];

const CATEGORY_OPTIONS = CATEGORIES.filter((c) => c.value !== "all");

interface DobodyAvatar {
  id: number;
  imageUrl: string;
  label: string | null;
  category: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export default function AdminDobodyAvatarlar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState("all");
  const [uploadDialog, setUploadDialog] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState<DobodyAvatar | null>(null);
  const { deleteState, requestDelete, cancelDelete, confirmDelete } = useConfirmDelete();

  const [uploadForm, setUploadForm] = useState({
    imageUrl: "",
    label: "",
    category: "general",
  });

  const [editForm, setEditForm] = useState({
    label: "",
    category: "general",
  });

  if (user?.role !== "admin") {
    return <Redirect to="/" />;
  }

  const { data: avatars = [], isLoading } = useQuery<DobodyAvatar[]>({
    queryKey: ["/api/admin/dobody/avatars"],
  });

  const filteredAvatars =
    activeCategory === "all"
      ? avatars
      : avatars.filter((a) => a.category === activeCategory);

  const activeCount = avatars.filter((a) => a.isActive).length;
  const totalCount = avatars.length;

  const uploadMutation = useMutation({
    mutationFn: (data: { imageUrl: string; label?: string; category: string }) =>
      apiRequest("POST", "/api/admin/dobody/avatars/upload", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dobody/avatars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dobody/avatars"] });
      toast({ title: "Avatar eklendi" });
      setUploadDialog(false);
      setUploadForm({ imageUrl: "", label: "", category: "general" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Avatar eklenemedi", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/dobody/avatars/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dobody/avatars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dobody/avatars"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { label?: string | null; category?: string } }) =>
      apiRequest("PATCH", `/api/admin/dobody/avatars/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dobody/avatars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dobody/avatars"] });
      toast({ title: "Avatar güncellendi" });
      setEditingAvatar(null);
    },
    onError: () => {
      toast({ title: "Hata", description: "Güncellenemedi", variant: "destructive" });
    },
  });

  const sortMutation = useMutation({
    mutationFn: ({ id, sortOrder }: { id: number; sortOrder: number }) =>
      apiRequest("PATCH", `/api/admin/dobody/avatars/${id}`, { sortOrder }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dobody/avatars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dobody/avatars"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/admin/dobody/avatars/${id}?hard=true`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dobody/avatars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dobody/avatars"] });
      toast({ title: "Avatar silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Silinemedi", variant: "destructive" });
    },
  });

  const handleUploadSubmit = () => {
    if (!uploadForm.imageUrl) {
      toast({ title: "Hata", description: "Lütfen bir görsel yükleyin", variant: "destructive" });
      return;
    }
    uploadMutation.mutate({
      imageUrl: uploadForm.imageUrl,
      label: uploadForm.label || undefined,
      category: uploadForm.category,
    });
  };

  const handleEditSubmit = () => {
    if (!editingAvatar) return;
    updateMutation.mutate({
      id: editingAvatar.id,
      data: {
        label: editForm.label || null,
        category: editForm.category,
      },
    });
  };

  const handleDeleteConfirm = () => {
    if (deleteState.itemId) {
      deleteMutation.mutate(deleteState.itemId as number);
      confirmDelete();
    }
  };

  const openEdit = (avatar: DobodyAvatar) => {
    setEditingAvatar(avatar);
    setEditForm({
      label: avatar.label || "",
      category: avatar.category,
    });
  };

  const getCategoryLabel = (value: string) =>
    CATEGORIES.find((c) => c.value === value)?.label || value;

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Bot className="h-5 w-5" />
            Mr. Dobody Avatarları
          </h1>
          <p className="text-sm text-muted-foreground" data-testid="text-avatar-stats">
            {activeCount} aktif / {totalCount} toplam avatar
          </p>
        </div>
        <Button onClick={() => setUploadDialog(true)} data-testid="button-add-avatar">
          <Plus className="h-4 w-4 mr-1" />
          Avatar Ekle
        </Button>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="flex flex-wrap h-auto gap-1" data-testid="tabs-category-filter">
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value} data-testid={`tab-category-${cat.value}`}>
              {cat.label}
              {cat.value !== "all" && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {avatars.filter((a) => a.category === cat.value).length}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-md" />
          ))}
        </div>
      ) : filteredAvatars.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Bot className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground" data-testid="text-no-avatars">
              Bu kategoride avatar bulunamadı
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3" data-testid="grid-avatars">
          {filteredAvatars.map((avatar) => (
            <Card
              key={avatar.id}
              className={`relative group ${!avatar.isActive ? "opacity-50" : ""}`}
              data-testid={`card-avatar-${avatar.id}`}
            >
              <CardContent className="p-2 space-y-2">
                <div className="aspect-square relative bg-muted/30 rounded-md overflow-hidden flex items-center justify-center">
                  <img
                    src={avatar.imageUrl}
                    alt={avatar.label || `Avatar ${avatar.id}`}
                    className="w-full h-full object-contain"
                    loading="lazy"
                    data-testid={`img-avatar-${avatar.id}`}
                  />
                  {!avatar.isActive && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                      <EyeOff className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <Badge variant="secondary" className="text-xs" data-testid={`badge-category-${avatar.id}`}>
                    {getCategoryLabel(avatar.category)}
                  </Badge>
                  {avatar.label && (
                    <p className="text-xs text-muted-foreground truncate" data-testid={`text-label-${avatar.id}`}>
                      {avatar.label}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-1">
                  <Switch
                    checked={avatar.isActive}
                    onCheckedChange={(checked) =>
                      toggleMutation.mutate({ id: avatar.id, isActive: checked })
                    }
                    data-testid={`switch-active-${avatar.id}`}
                  />
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        sortMutation.mutate({
                          id: avatar.id,
                          sortOrder: Math.max(0, avatar.sortOrder - 1),
                        })
                      }
                      data-testid={`button-sort-up-${avatar.id}`}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        sortMutation.mutate({
                          id: avatar.id,
                          sortOrder: avatar.sortOrder + 1,
                        })
                      }
                      data-testid={`button-sort-down-${avatar.id}`}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(avatar)}
                      data-testid={`button-edit-${avatar.id}`}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        requestDelete(avatar.id, avatar.label || `Avatar #${avatar.id}`)
                      }
                      data-testid={`button-delete-${avatar.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
        <DialogContent data-testid="dialog-upload-avatar">
          <DialogHeader>
            <DialogTitle>Yeni Avatar Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Görsel</Label>
              {uploadForm.imageUrl ? (
                <div className="relative aspect-square max-w-[200px] mx-auto bg-muted/30 rounded-md overflow-hidden">
                  <img
                    src={uploadForm.imageUrl}
                    alt="Preview"
                    className="w-full h-full object-contain"
                    data-testid="img-upload-preview"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => setUploadForm((prev) => ({ ...prev, imageUrl: "" }))}
                    data-testid="button-remove-upload-image"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <ObjectUploader
                  maxWidthOrHeight={400}
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
                      setUploadForm((prev) => ({
                        ...prev,
                        imageUrl: result.successful[0].uploadURL,
                      }));
                    }
                  }}
                  buttonClassName="w-full"
                  testId="dobody-avatar"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  PNG Yükle
                </ObjectUploader>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-label">Etiket (opsiyonel)</Label>
              <Input
                id="upload-label"
                value={uploadForm.label}
                onChange={(e) => setUploadForm((prev) => ({ ...prev, label: e.target.value }))}
                placeholder="Kahve Tutan, Düşünen..."
                data-testid="input-upload-label"
              />
            </div>

            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select
                value={uploadForm.category}
                onValueChange={(v) => setUploadForm((prev) => ({ ...prev, category: v }))}
              >
                <SelectTrigger data-testid="select-upload-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value} data-testid={`select-item-${cat.value}`}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialog(false)} data-testid="button-cancel-upload">
              İptal
            </Button>
            <Button
              onClick={handleUploadSubmit}
              disabled={!uploadForm.imageUrl || uploadMutation.isPending}
              data-testid="button-submit-upload"
            >
              {uploadMutation.isPending ? "Ekleniyor..." : "Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingAvatar} onOpenChange={(open) => !open && setEditingAvatar(null)}>
        <DialogContent data-testid="dialog-edit-avatar">
          <DialogHeader>
            <DialogTitle>Avatar Düzenle</DialogTitle>
          </DialogHeader>
          {editingAvatar && (
            <div className="space-y-4">
              <div className="aspect-square max-w-[150px] mx-auto bg-muted/30 rounded-md overflow-hidden">
                <img
                  src={editingAvatar.imageUrl}
                  alt={editingAvatar.label || "Avatar"}
                  className="w-full h-full object-contain"
                  data-testid="img-edit-preview"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-label">Etiket</Label>
                <Input
                  id="edit-label"
                  value={editForm.label}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, label: e.target.value }))}
                  placeholder="Kahve Tutan, Düşünen..."
                  data-testid="input-edit-label"
                />
              </div>

              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select
                  value={editForm.category}
                  onValueChange={(v) => setEditForm((prev) => ({ ...prev, category: v }))}
                >
                  <SelectTrigger data-testid="select-edit-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAvatar(null)} data-testid="button-cancel-edit">
              İptal
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={updateMutation.isPending}
              data-testid="button-submit-edit"
            >
              {updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteState.open}
        onOpenChange={(open) => !open && cancelDelete()}
        onConfirm={handleDeleteConfirm}
        title="Avatar Sil"
        description={`"${deleteState.itemName}" avatarını kalıcı olarak silmek istediğinize emin misiniz?`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
