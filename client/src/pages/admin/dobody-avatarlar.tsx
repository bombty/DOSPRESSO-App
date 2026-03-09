import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  X,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Clock,
  Users,
  Layers,
} from "lucide-react";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";

const CATEGORIES = [
  { value: "all", label: "Tümü" },
  { value: "general", label: "Genel" },
  { value: "greeting", label: "Karşılama" },
  { value: "morning", label: "Günaydın" },
  { value: "thinking", label: "Düşünen" },
  { value: "coffee", label: "Kahve" },
  { value: "celebrating", label: "Kutlama" },
  { value: "error", label: "Hata" },
  { value: "search", label: "Arama" },
];

const CATEGORY_OPTIONS = CATEGORIES.filter((c) => c.value !== "all");

const TIME_PRESETS = [
  { value: "all_day", label: "Tüm Gün", start: null, end: null },
  { value: "morning", label: "Sabah (06:00-11:30)", start: "06:00", end: "11:30" },
  { value: "afternoon", label: "Öğle (11:30-17:00)", start: "11:30", end: "17:00" },
  { value: "evening", label: "Akşam (17:00-22:00)", start: "17:00", end: "22:00" },
  { value: "night", label: "Gece (22:00-06:00)", start: "22:00", end: "06:00" },
  { value: "custom", label: "Özel", start: null, end: null },
];

const ALL_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "ceo", label: "CEO" },
  { value: "cgo", label: "CGO" },
  { value: "muhasebe_ik", label: "Muhasebe/IK" },
  { value: "satinalma", label: "Satınalma" },
  { value: "coach", label: "Koç" },
  { value: "marketing", label: "Pazarlama" },
  { value: "trainer", label: "Eğitmen" },
  { value: "kalite_kontrol", label: "Kalite Kontrol" },
  { value: "gida_muhendisi", label: "Gıda Mühendisi" },
  { value: "fabrika_mudur", label: "Fabrika Müdür" },
  { value: "mudur", label: "Şube Müdürü" },
  { value: "supervisor", label: "Supervisor" },
  { value: "supervisor_buddy", label: "Supervisor Buddy" },
  { value: "barista", label: "Barista" },
  { value: "bar_buddy", label: "Bar Buddy" },
  { value: "stajyer", label: "Stajyer" },
  { value: "fabrika_operator", label: "Fabrika Operatör" },
  { value: "fabrika_sorumlu", label: "Fabrika Sorumlu" },
  { value: "fabrika_personel", label: "Fabrika Personel" },
];

interface DobodyAvatar {
  id: number;
  imageUrl: string;
  label: string | null;
  category: string;
  isActive: boolean;
  sortOrder: number;
  timeStart: string | null;
  timeEnd: string | null;
  roles: string[] | null;
  createdAt: string;
}

function getTimePresetKey(start: string | null, end: string | null): string {
  if (!start || !end) return "all_day";
  const preset = TIME_PRESETS.find((p) => p.start === start && p.end === end);
  return preset ? preset.value : "custom";
}

function getTimeLabel(start: string | null, end: string | null): string {
  if (!start || !end) return "Tüm Gün";
  const preset = TIME_PRESETS.find((p) => p.start === start && p.end === end);
  return preset ? preset.label : `${start}-${end}`;
}

function getRolesLabel(roles: string[] | null): string {
  if (!roles || roles.length === 0) return "Tüm Roller";
  if (roles.length <= 2) {
    return roles
      .map((r) => ALL_ROLES.find((ar) => ar.value === r)?.label || r)
      .join(", ");
  }
  return `${roles.length} rol`;
}

export default function AdminDobodyAvatarlar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState("all");
  const [uploadDialog, setUploadDialog] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState<DobodyAvatar | null>(null);
  const [bulkDialog, setBulkDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const { deleteState, requestDelete, cancelDelete, confirmDelete } = useConfirmDelete();

  const [uploadForm, setUploadForm] = useState({
    imageUrl: "",
    label: "",
    category: "general",
    timePreset: "all_day",
    timeStart: "",
    timeEnd: "",
    allRoles: true,
    roles: [] as string[],
  });

  const [editForm, setEditForm] = useState({
    label: "",
    category: "general",
    timePreset: "all_day",
    timeStart: "",
    timeEnd: "",
    allRoles: true,
    roles: [] as string[],
  });

  const [bulkForm, setBulkForm] = useState({
    category: "",
    timePreset: "all_day",
    timeStart: "",
    timeEnd: "",
    allRoles: true,
    roles: [] as string[],
    applyCategory: false,
    applyTime: false,
    applyRoles: false,
  });

  if (user?.role !== "admin") {
    return <Redirect to="/" />;
  }

  const { data: avatars = [], isLoading, isError, refetch } = useQuery<DobodyAvatar[]>({
    queryKey: ["/api/admin/dobody/avatars"],
  });

  const filteredAvatars =
    activeCategory === "all"
      ? avatars
      : avatars.filter((a) => a.category === activeCategory);

  const activeCount = avatars.filter((a) => a.isActive).length;
  const totalCount = avatars.length;

  const uploadMutation = useMutation({
    mutationFn: (data: {
      imageUrl: string;
      label?: string;
      category: string;
      timeStart?: string | null;
      timeEnd?: string | null;
      roles?: string[] | null;
    }) => apiRequest("POST", "/api/admin/dobody/avatars/upload", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dobody/avatars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dobody/avatars"] });
      toast({ title: "Avatar eklendi" });
      setUploadDialog(false);
      setUploadForm({
        imageUrl: "",
        label: "",
        category: "general",
        timePreset: "all_day",
        timeStart: "",
        timeEnd: "",
        allRoles: true,
        roles: [],
      });
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
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        label?: string | null;
        category?: string;
        timeStart?: string | null;
        timeEnd?: string | null;
        roles?: string[] | null;
      };
    }) => apiRequest("PATCH", `/api/admin/dobody/avatars/${id}`, data),
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

  const bulkMutation = useMutation({
    mutationFn: (data: { ids: number[]; update: Record<string, any> }) =>
      apiRequest("PATCH", "/api/admin/dobody/avatars/bulk-update", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dobody/avatars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dobody/avatars"] });
      toast({ title: "Toplu güncelleme başarılı" });
      setBulkDialog(false);
      setSelectedIds(new Set());
    },
    onError: () => {
      toast({ title: "Hata", description: "Toplu güncelleme başarısız", variant: "destructive" });
    },
  });

  function resolveTimeValues(form: {
    timePreset: string;
    timeStart: string;
    timeEnd: string;
  }): { timeStart: string | null; timeEnd: string | null } {
    if (form.timePreset === "all_day") {
      return { timeStart: null, timeEnd: null };
    }
    if (form.timePreset === "custom") {
      return {
        timeStart: form.timeStart || null,
        timeEnd: form.timeEnd || null,
      };
    }
    const preset = TIME_PRESETS.find((p) => p.value === form.timePreset);
    return {
      timeStart: preset?.start || null,
      timeEnd: preset?.end || null,
    };
  }

  const handleUploadSubmit = () => {
    if (!uploadForm.imageUrl) {
      toast({ title: "Hata", description: "Lütfen bir görsel yükleyin", variant: "destructive" });
      return;
    }
    const { timeStart, timeEnd } = resolveTimeValues(uploadForm);
    uploadMutation.mutate({
      imageUrl: uploadForm.imageUrl,
      label: uploadForm.label || undefined,
      category: uploadForm.category,
      timeStart,
      timeEnd,
      roles: uploadForm.allRoles ? null : uploadForm.roles.length > 0 ? uploadForm.roles : null,
    });
  };

  const handleEditSubmit = () => {
    if (!editingAvatar) return;
    const { timeStart, timeEnd } = resolveTimeValues(editForm);
    updateMutation.mutate({
      id: editingAvatar.id,
      data: {
        label: editForm.label || null,
        category: editForm.category,
        timeStart,
        timeEnd,
        roles: editForm.allRoles ? null : editForm.roles.length > 0 ? editForm.roles : null,
      },
    });
  };

  const handleBulkSubmit = () => {
    if (selectedIds.size === 0) return;
    const update: Record<string, any> = {};
    if (bulkForm.applyCategory && bulkForm.category) {
      update.category = bulkForm.category;
    }
    if (bulkForm.applyTime) {
      const { timeStart, timeEnd } = resolveTimeValues(bulkForm);
      update.timeStart = timeStart;
      update.timeEnd = timeEnd;
    }
    if (bulkForm.applyRoles) {
      update.roles = bulkForm.allRoles
        ? null
        : bulkForm.roles.length > 0
        ? bulkForm.roles
        : null;
    }
    if (Object.keys(update).length === 0) {
      toast({ title: "Uyarı", description: "En az bir alan seçin", variant: "destructive" });
      return;
    }
    bulkMutation.mutate({ ids: Array.from(selectedIds), update });
  };

  const handleDeleteConfirm = () => {
    if (deleteState.itemId) {
      deleteMutation.mutate(deleteState.itemId as number);
      confirmDelete();
    }
  };

  const openEdit = (avatar: DobodyAvatar) => {
    setEditingAvatar(avatar);
    const presetKey = getTimePresetKey(avatar.timeStart, avatar.timeEnd);
    setEditForm({
      label: avatar.label || "",
      category: avatar.category,
      timePreset: presetKey,
      timeStart: avatar.timeStart || "",
      timeEnd: avatar.timeEnd || "",
      allRoles: !avatar.roles || avatar.roles.length === 0,
      roles: avatar.roles || [],
    });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredAvatars.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAvatars.map((a) => a.id)));
    }
  };

  const getCategoryLabel = (value: string) =>
    CATEGORIES.find((c) => c.value === value)?.label || value;

  const TimeRoleFields = ({
    form,
    setForm,
    prefix,
  }: {
    form: {
      timePreset: string;
      timeStart: string;
      timeEnd: string;
      allRoles: boolean;
      roles: string[];
    };
    setForm: (updater: (prev: any) => any) => void;
    prefix: string;
  }) => (
    <>
      <div className="space-y-2">
        <Label className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          Zaman Aralığı
        </Label>
        <Select
          value={form.timePreset}
          onValueChange={(v) => {
            const preset = TIME_PRESETS.find((p) => p.value === v);
            setForm((prev: any) => ({
              ...prev,
              timePreset: v,
              timeStart: preset?.start || prev.timeStart,
              timeEnd: preset?.end || prev.timeEnd,
            }));
          }}
        >
          <SelectTrigger data-testid={`select-${prefix}-time-preset`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.timePreset === "custom" && (
          <div className="flex items-center gap-2">
            <Input
              type="time"
              value={form.timeStart}
              onChange={(e) =>
                setForm((prev: any) => ({ ...prev, timeStart: e.target.value }))
              }
              data-testid={`input-${prefix}-time-start`}
            />
            <span className="text-sm text-muted-foreground">-</span>
            <Input
              type="time"
              value={form.timeEnd}
              onChange={(e) =>
                setForm((prev: any) => ({ ...prev, timeEnd: e.target.value }))
              }
              data-testid={`input-${prefix}-time-end`}
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          Gösterilecek Roller
        </Label>
        <div className="flex items-center gap-2">
          <Switch
            checked={form.allRoles}
            onCheckedChange={(checked) =>
              setForm((prev: any) => ({ ...prev, allRoles: checked, roles: checked ? [] : prev.roles }))
            }
            data-testid={`switch-${prefix}-all-roles`}
          />
          <span className="text-sm">Tüm Roller</span>
        </div>
        {!form.allRoles && (
          <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto border rounded-md p-2">
            {ALL_ROLES.map((role) => (
              <label
                key={role.value}
                className="flex items-center gap-1.5 text-xs cursor-pointer"
              >
                <Checkbox
                  checked={form.roles.includes(role.value)}
                  onCheckedChange={(checked) => {
                    setForm((prev: any) => ({
                      ...prev,
                      roles: checked
                        ? [...prev.roles, role.value]
                        : prev.roles.filter((r: string) => r !== role.value),
                    }));
                  }}
                  data-testid={`checkbox-${prefix}-role-${role.value}`}
                />
                {role.label}
              </label>
            ))}
          </div>
        )}
      </div>
    </>
  );

  
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

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
        <div className="flex items-center gap-2 flex-wrap">
          {selectedIds.size > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                setBulkForm({
                  category: "",
                  timePreset: "all_day",
                  timeStart: "",
                  timeEnd: "",
                  allRoles: true,
                  roles: [],
                  applyCategory: false,
                  applyTime: false,
                  applyRoles: false,
                });
                setBulkDialog(true);
              }}
              data-testid="button-bulk-edit"
            >
              <Layers className="h-4 w-4 mr-1" />
              Toplu Düzenle ({selectedIds.size})
            </Button>
          )}
          <Button onClick={() => setUploadDialog(true)} data-testid="button-add-avatar">
            <Plus className="h-4 w-4 mr-1" />
            Avatar Ekle
          </Button>
        </div>
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

      {filteredAvatars.length > 0 && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={selectAll} data-testid="button-select-all">
            {selectedIds.size === filteredAvatars.length ? "Seçimi Kaldır" : "Tümünü Seç"}
          </Button>
          {selectedIds.size > 0 && (
            <span className="text-xs text-muted-foreground">
              {selectedIds.size} seçili
            </span>
          )}
        </div>
      )}

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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3" data-testid="grid-avatars">
          {filteredAvatars.map((avatar) => (
            <Card
              key={avatar.id}
              className={`relative ${!avatar.isActive ? "opacity-50" : ""} ${
                selectedIds.has(avatar.id) ? "ring-2 ring-primary" : ""
              }`}
              data-testid={`card-avatar-${avatar.id}`}
            >
              <CardContent className="p-2 space-y-1.5">
                <div
                  className="aspect-square relative bg-muted/30 rounded-md overflow-hidden flex items-center justify-center cursor-pointer"
                  onClick={() => toggleSelect(avatar.id)}
                >
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
                  {selectedIds.has(avatar.id) && (
                    <div className="absolute top-1 left-1">
                      <div className="h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-primary-foreground text-xs font-bold">
                          &#10003;
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-xs" data-testid={`badge-category-${avatar.id}`}>
                    {getCategoryLabel(avatar.category)}
                  </Badge>
                  {(avatar.timeStart || avatar.timeEnd) && (
                    <Badge variant="outline" className="text-xs" data-testid={`badge-time-${avatar.id}`}>
                      <Clock className="h-2.5 w-2.5 mr-0.5" />
                      {getTimeLabel(avatar.timeStart, avatar.timeEnd)}
                    </Badge>
                  )}
                  {avatar.roles && avatar.roles.length > 0 && (
                    <Badge variant="outline" className="text-xs" data-testid={`badge-roles-${avatar.id}`}>
                      <Users className="h-2.5 w-2.5 mr-0.5" />
                      {getRolesLabel(avatar.roles)}
                    </Badge>
                  )}
                </div>

                {avatar.label && (
                  <p className="text-xs text-muted-foreground truncate" data-testid={`text-label-${avatar.id}`}>
                    {avatar.label}
                  </p>
                )}

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
        <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="dialog-upload-avatar">
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

            <TimeRoleFields
              form={uploadForm}
              setForm={setUploadForm}
              prefix="upload"
            />
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
        <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-avatar">
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

              <TimeRoleFields
                form={editForm}
                setForm={setEditForm}
                prefix="edit"
              />
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

      <Dialog open={bulkDialog} onOpenChange={setBulkDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="dialog-bulk-edit">
          <DialogHeader>
            <DialogTitle>Toplu Düzenle ({selectedIds.size} avatar)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={bulkForm.applyCategory}
                  onCheckedChange={(c) =>
                    setBulkForm((prev) => ({ ...prev, applyCategory: !!c }))
                  }
                  data-testid="checkbox-bulk-apply-category"
                />
                <Label>Kategori Değiştir</Label>
              </div>
              {bulkForm.applyCategory && (
                <Select
                  value={bulkForm.category}
                  onValueChange={(v) => setBulkForm((prev) => ({ ...prev, category: v }))}
                >
                  <SelectTrigger data-testid="select-bulk-category">
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={bulkForm.applyTime}
                  onCheckedChange={(c) =>
                    setBulkForm((prev) => ({ ...prev, applyTime: !!c }))
                  }
                  data-testid="checkbox-bulk-apply-time"
                />
                <Label>Zaman Aralığı Değiştir</Label>
              </div>
              {bulkForm.applyTime && (
                <div className="pl-6 space-y-2">
                  <Select
                    value={bulkForm.timePreset}
                    onValueChange={(v) => {
                      const preset = TIME_PRESETS.find((p) => p.value === v);
                      setBulkForm((prev) => ({
                        ...prev,
                        timePreset: v,
                        timeStart: preset?.start || prev.timeStart,
                        timeEnd: preset?.end || prev.timeEnd,
                      }));
                    }}
                  >
                    <SelectTrigger data-testid="select-bulk-time-preset">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_PRESETS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {bulkForm.timePreset === "custom" && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={bulkForm.timeStart}
                        onChange={(e) =>
                          setBulkForm((prev) => ({ ...prev, timeStart: e.target.value }))
                        }
                        data-testid="input-bulk-time-start"
                      />
                      <span className="text-sm text-muted-foreground">-</span>
                      <Input
                        type="time"
                        value={bulkForm.timeEnd}
                        onChange={(e) =>
                          setBulkForm((prev) => ({ ...prev, timeEnd: e.target.value }))
                        }
                        data-testid="input-bulk-time-end"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={bulkForm.applyRoles}
                  onCheckedChange={(c) =>
                    setBulkForm((prev) => ({ ...prev, applyRoles: !!c }))
                  }
                  data-testid="checkbox-bulk-apply-roles"
                />
                <Label>Roller Değiştir</Label>
              </div>
              {bulkForm.applyRoles && (
                <div className="pl-6 space-y-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={bulkForm.allRoles}
                      onCheckedChange={(checked) =>
                        setBulkForm((prev) => ({
                          ...prev,
                          allRoles: checked,
                          roles: checked ? [] : prev.roles,
                        }))
                      }
                      data-testid="switch-bulk-all-roles"
                    />
                    <span className="text-sm">Tüm Roller</span>
                  </div>
                  {!bulkForm.allRoles && (
                    <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto border rounded-md p-2">
                      {ALL_ROLES.map((role) => (
                        <label
                          key={role.value}
                          className="flex items-center gap-1.5 text-xs cursor-pointer"
                        >
                          <Checkbox
                            checked={bulkForm.roles.includes(role.value)}
                            onCheckedChange={(checked) => {
                              setBulkForm((prev) => ({
                                ...prev,
                                roles: checked
                                  ? [...prev.roles, role.value]
                                  : prev.roles.filter((r) => r !== role.value),
                              }));
                            }}
                            data-testid={`checkbox-bulk-role-${role.value}`}
                          />
                          {role.label}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialog(false)} data-testid="button-cancel-bulk">
              İptal
            </Button>
            <Button
              onClick={handleBulkSubmit}
              disabled={bulkMutation.isPending}
              data-testid="button-submit-bulk"
            >
              {bulkMutation.isPending ? "Uygulanıyor..." : "Uygula"}
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
