import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { UserRole } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDroppable
} from "@dnd-kit/core";
import { 
  useSortable, 
  SortableContext, 
  verticalListSortingStrategy,
  arrayMove 
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { 
  Shield, 
  Users, 
  ArrowLeft, 
  Building2, 
  Coffee,
  Save,
  LayoutDashboard,
  ClipboardList,
  GraduationCap,
  Wrench,
  BarChart3,
  Calendar,
  MessageSquare,
  Settings,
  FileText,
  ChevronRight,
  Calculator,
  Package,
  FolderKanban,
  Plus,
  X,
  Eye,
  Lock,
  Globe,
  GripVertical,
  Factory,
  Star,
  Pencil,
  Check
} from "lucide-react";
import { Link, Redirect } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_LABELS } from "@/lib/turkish-labels";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";

type PermissionAction = {
  id: number;
  moduleKey: string;
  actionKey: string;
  labelTr: string;
  description: string | null;
};

type RoleGrant = {
  id: number;
  actionId: number;
  scope: string;
  isActive: boolean;
  moduleKey: string;
  actionKey: string;
  labelTr: string;
};

const SCOPE_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  self: { label: "Kendisi", icon: Lock, color: "text-orange-500" },
  branch: { label: "Şubesi", icon: Building2, color: "text-blue-500" },
  global: { label: "Tümü", icon: Globe, color: "text-green-500" },
};

// Base ROLE_GROUPS with all roles organized by category
const ROLE_GROUPS_BASE = {
  yonetim: { 
    label: "Yönetim", 
    color: "bg-red-500", 
    roles: ["admin", "ceo", "cgo"], 
    scope: "admin" 
  },
  hq: { 
    label: "HQ Departmanları", 
    color: "bg-blue-500", 
    roles: ["muhasebe_ik", "muhasebe", "satinalma", "coach", "marketing", "trainer", "kalite_kontrol", "teknik", "destek", "yatirimci_hq"],
    scope: "hq"
  },
  fabrika: { 
    label: "Fabrika", 
    color: "bg-orange-500", 
    roles: ["fabrika", "fabrika_mudur", "fabrika_operator", "fabrika_sorumlu", "fabrika_personel"], 
    scope: "hq" 
  },
  sube: { 
    label: "Şube Rolleri", 
    color: "bg-green-500", 
    roles: ["mudur", "supervisor", "supervisor_buddy", "barista", "bar_buddy", "stajyer", "yatirimci_branch"], 
    scope: "branch" 
  },
};

// Safety mechanism: ensure all UserRole values are in ROLE_GROUPS
const allRolesInGroups = Object.values(ROLE_GROUPS_BASE).flatMap(group => group.roles);
const allUserRoles = Object.values(UserRole);
const uncategorizedRoles = allUserRoles.filter(role => !allRolesInGroups.includes(role));

// Build final ROLE_GROUPS with uncategorized roles added if any
const ROLE_GROUPS = {
  ...ROLE_GROUPS_BASE,
  ...(uncategorizedRoles.length > 0 && {
    uncategorized: {
      label: "Kategorize Edilmemiş",
      color: "bg-gray-500",
      roles: uncategorizedRoles,
      scope: "hq" as const
    }
  })
};


const MODULE_GROUPS = [
  {
    name: "Operasyonlar",
    icon: LayoutDashboard,
    modules: [
      { key: "dashboard", label: "Dashboard" },
      { key: "tasks", label: "Görevler" },
      { key: "checklists", label: "Checklistler" },
      { key: "branches", label: "Şubeler" },
      { key: "canli_takip", label: "Canlı Takip" },
      { key: "qr_tara", label: "QR Tara" },
      { key: "nfc_giris", label: "NFC Giriş" },
    ]
  },
  {
    name: "Ekipman & Arıza",
    icon: Wrench,
    modules: [
      { key: "equipment", label: "Ekipman" },
      { key: "faults", label: "Arıza Yönetimi" },
      { key: "equipment_analytics", label: "Ekipman Analitik" },
    ]
  },
  {
    name: "Kalite & Denetim",
    icon: Shield,
    modules: [
      { key: "quality_audit", label: "Kalite Denetimi" },
      { key: "audit_templates", label: "Denetim Şablonları" },
      { key: "capa", label: "CAPA Yönetimi" },
      { key: "denetimler", label: "Denetimler" },
      { key: "misafir_memnuniyeti", label: "Misafir Memnuniyeti" },
      { key: "sikayetler", label: "Şikayetler" },
    ]
  },
  {
    name: "Akademi Paketi",
    icon: GraduationCap,
    modules: [
      { key: "academy.general", label: "Genel Eğitimler" },
      { key: "academy.hq", label: "HQ Yönetim Paneli" },
      { key: "academy.analytics", label: "Analitik & Raporlar" },
      { key: "academy.badges", label: "Rozetler & Başarılar" },
      { key: "academy.certificates", label: "Sertifikalar" },
      { key: "academy.leaderboard", label: "Sıralama" },
      { key: "academy.quizzes", label: "Quizler & Sınavlar" },
      { key: "academy.learning_paths", label: "Öğrenme Yolları" },
      { key: "academy.ai", label: "AI Asistan" },
      { key: "academy.social", label: "Sosyal & Takımlar" },
      { key: "academy.supervisor", label: "Supervisor Görünümü" },
      { key: "bilgi_bankasi", label: "Bilgi Bankası" },
    ]
  },
  {
    name: "Vardiya & İK",
    icon: Calendar,
    modules: [
      { key: "shifts", label: "Vardiyalar" },
      { key: "shift_planning", label: "Vardiya Planlama" },
      { key: "hr", label: "İK Yönetimi" },
      { key: "attendance", label: "Devam Takibi" },
      { key: "leave_requests", label: "İzin Talepleri" },
      { key: "personel_onboarding", label: "Personel Onboarding" },
      { key: "mesai_talepleri", label: "Mesai Talepleri" },
    ]
  },
  {
    name: "Muhasebe & Mali",
    icon: Calculator,
    modules: [
      { key: "accounting", label: "Muhasebe" },
    ]
  },
  {
    name: "Raporlar",
    icon: BarChart3,
    modules: [
      { key: "reports", label: "Performans" },
      { key: "e2e_reports", label: "E2E Raporlar" },
      { key: "cash_reports", label: "Kasa Raporları" },
      { key: "hr_reports", label: "İK Raporları" },
    ]
  },
  {
    name: "Kayıp & Eşya",
    icon: Package,
    modules: [
      { key: "lost_found", label: "Kayıp Eşya" },
      { key: "lost_found_hq", label: "Kayıp Eşya (HQ)" },
    ]
  },
  {
    name: "Projeler",
    icon: FolderKanban,
    modules: [
      { key: "projects", label: "Projeler" },
      { key: "new_branch_projects", label: "Yeni Şube Açılış" },
      { key: "kampanya_yonetimi", label: "Kampanya Yönetimi" },
    ]
  },
  {
    name: "Fabrika",
    icon: Package,
    modules: [
      { key: "factory_kiosk", label: "Fabrika Kiosk" },
      { key: "factory_dashboard", label: "Fabrika Dashboard" },
      { key: "factory_quality", label: "Kalite Kontrol" },
      { key: "factory_analytics", label: "Performans Analitik" },
      { key: "factory_ai_reports", label: "AI Raporlar" },
      { key: "factory_stations", label: "İstasyon Yönetimi" },
      { key: "factory_waste_reasons", label: "Fire Sebepleri" },
      { key: "factory_pins", label: "PIN Yönetimi" },
      { key: "factory_uretim_planlama", label: "Üretim Planlama" },
      { key: "factory_vardiya_uyumluluk", label: "Vardiya Uyumluluk" },
    ]
  },
  {
    name: "Destek & İletişim",
    icon: MessageSquare,
    modules: [
      { key: "support", label: "Destek Talepleri" },
      { key: "hq_destek", label: "HQ Destek" },
      { key: "notifications", label: "Bildirimler" },
      { key: "announcements", label: "Duyurular" },
      { key: "messages", label: "Mesajlar" },
      { key: "ai_asistan", label: "AI Asistan" },
    ]
  },
  {
    name: "Yönetim & Admin",
    icon: Settings,
    modules: [
      { key: "settings", label: "Ayarlar" },
      { key: "bulk_data", label: "Toplu Veri Yönetimi" },
      { key: "users", label: "Kullanıcılar" },
      { key: "menu_management", label: "Menü Yönetimi" },
      { key: "content_management", label: "İçerik Yönetimi" },
      { key: "admin_panel", label: "Admin Panel" },
      { key: "authorization", label: "Yetkilendirme" },
      { key: "banner_editor", label: "Banner Editörü" },
      { key: "aktivite_loglari", label: "Aktivite Logları" },
      { key: "email_ayarlari", label: "Email Ayarları" },
      { key: "ai_ayarlari", label: "Yapay Zeka Ayarları" },
      { key: "yedekleme", label: "Yedekleme" },
    ]
  },
];

// 9 Mega Module Konfigürasyonu - Dashboard kartları için (Fabrika ayrı)
const MEGA_MODULE_CONFIG = [
  { id: "operations", title: "Operasyonlar", icon: ClipboardList, color: "bg-green-500" },
  { id: "equipment", title: "Ekipman & Bakım", icon: Wrench, color: "bg-orange-500" },
  { id: "hr", title: "Personel & İK", icon: Users, color: "bg-pink-500" },
  { id: "training", title: "Eğitim & Akademi", icon: GraduationCap, color: "bg-blue-500" },
  { id: "kitchen", title: "Mutfak & Reçeteler", icon: Coffee, color: "bg-amber-600" },
  { id: "factory", title: "Fabrika & Üretim", icon: Factory, color: "bg-indigo-600" },
  { id: "reports", title: "Raporlar & Analitik", icon: BarChart3, color: "bg-cyan-500" },
  { id: "newshop", title: "Yeni Mağaza Açılışı", icon: FolderKanban, color: "bg-violet-600" },
  { id: "admin", title: "Yönetim & Ayarlar", icon: Shield, color: "bg-slate-600" },
];

// Varsayılan modül-mega modül eşleştirmeleri (9 mega modül)
const DEFAULT_MODULE_MEGA_MAPPING: Record<string, string[]> = {
  "operations": ["dashboard", "tasks", "checklists", "branches", "lost_found", "lost_found_hq", "canli_takip", "qr_tara", "nfc_giris"],
  "equipment": ["equipment", "faults", "equipment_analytics"],
  "hr": ["shifts", "shift_planning", "hr", "attendance", "leave_requests", "accounting", "personel_onboarding", "mesai_talepleri"],
  "training": ["academy.general", "academy.hq", "academy.analytics", "academy.badges", "academy.certificates", "academy.leaderboard", "academy.quizzes", "academy.learning_paths", "academy.ai", "academy.social", "academy.supervisor", "bilgi_bankasi"],
  "kitchen": ["recipes", "menu", "tarifler"],
  "factory": ["factory_kiosk", "factory_dashboard", "factory_quality", "factory_analytics", "factory_ai_reports", "factory_stations", "factory_waste_reasons", "factory_pins", "factory_compliance", "factory_uretim_planlama", "factory_vardiya_uyumluluk"],
  "reports": ["reports", "e2e_reports", "cash_reports", "hr_reports", "quality_audit", "audit_templates", "capa", "denetimler", "misafir_memnuniyeti", "sikayetler"],
  "newshop": ["projects", "new_branch_projects", "kampanya_yonetimi"],
  "admin": ["settings", "bulk_data", "users", "menu_management", "content_management", "admin_panel", "authorization", "support", "hq_destek", "notifications", "announcements", "messages", "ai_asistan", "banner_editor", "aktivite_loglari", "email_ayarlari", "ai_ayarlari", "yedekleme"],
};

// Draggable Module Item Component with inline edit
function DraggableModuleItem({ 
  id, 
  label, 
  megaModuleId,
  onLabelChange 
}: { 
  id: string; 
  label: string; 
  megaModuleId: string;
  onLabelChange?: (id: string, newLabel: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const hasSavedRef = useRef(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data: { megaModuleId } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = useCallback(() => {
    if (hasSavedRef.current) return;
    hasSavedRef.current = true;
    if (editValue.trim() && editValue.trim() !== label && onLabelChange) {
      onLabelChange(id, editValue.trim());
    }
    setIsEditing(false);
  }, [editValue, label, id, onLabelChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(label);
      setIsEditing(false);
    }
  };

  const startEditing = () => {
    setEditValue(label); // Reset to current label when starting edit
    hasSavedRef.current = false;
    setIsEditing(true);
  };

  
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-2 py-1.5 rounded-md border bg-background text-xs cursor-move hover-elevate group"
      data-testid={`draggable-module-${id}`}
    >
      <div {...attributes} {...listeners}>
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>
      {isEditing ? (
        <div className="flex items-center gap-1 flex-1">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="h-5 text-xs py-0 px-1"
            autoFocus
            data-testid={`input-edit-module-${id}`}
          />
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-5 w-5"
            onMouseDown={(e) => e.preventDefault()} // Prevent blur from firing
            onClick={handleSave}
            data-testid={`button-save-module-${id}`}
          >
            <Check className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <>
          <span className="truncate flex-1">{label}</span>
          {onLabelChange && (
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                startEditing();
              }}
              data-testid={`button-edit-module-${id}`}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}

// Droppable Mega Module Container with title editing
function DroppableMegaModule({ 
  megaModule, 
  modules, 
  allModuleLabels,
  customTitle,
  onTitleChange,
  onModuleLabelChange
}: { 
  megaModule: typeof MEGA_MODULE_CONFIG[0]; 
  modules: string[];
  allModuleLabels: Record<string, string>;
  customTitle?: string;
  onTitleChange?: (megaModuleId: string, newTitle: string) => void;
  onModuleLabelChange?: (moduleId: string, newLabel: string) => void;
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(customTitle || megaModule.title);
  const hasSavedRef = useRef(false);
  const { setNodeRef, isOver } = useDroppable({
    id: megaModule.id,
  });

  const Icon = megaModule.icon;
  const displayTitle = customTitle || megaModule.title;

  const handleSaveTitle = useCallback(() => {
    if (hasSavedRef.current) return;
    hasSavedRef.current = true;
    if (titleValue.trim() && titleValue.trim() !== displayTitle && onTitleChange) {
      onTitleChange(megaModule.id, titleValue.trim());
    }
    setIsEditingTitle(false);
  }, [titleValue, displayTitle, megaModule.id, onTitleChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      setTitleValue(displayTitle);
      setIsEditingTitle(false);
    }
  };

  const startEditing = () => {
    setTitleValue(displayTitle); // Reset to current title when starting edit
    hasSavedRef.current = false;
    setIsEditingTitle(true);
  };

  return (
    <Card 
      ref={setNodeRef}
      className={`transition-all ${isOver ? 'ring-2 ring-primary ring-offset-2' : ''}`}
      data-testid={`droppable-mega-${megaModule.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 group">
          <div className={`p-1.5 rounded-md ${megaModule.color}`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <div className="flex items-center gap-1">
                <Input
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleSaveTitle}
                  className="h-6 text-sm font-semibold py-0 px-1"
                  autoFocus
                  data-testid={`input-edit-mega-title-${megaModule.id}`}
                />
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onMouseDown={(e) => e.preventDefault()} // Prevent blur from firing
                  onClick={handleSaveTitle}
                  data-testid={`button-save-mega-title-${megaModule.id}`}
                >
                  <Check className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <CardTitle className="text-sm truncate">{displayTitle}</CardTitle>
                {onTitleChange && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    onClick={startEditing}
                    data-testid={`button-edit-mega-title-${megaModule.id}`}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
            <CardDescription className="text-xs">{modules.length} modül</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1.5 min-h-[100px]">
          <SortableContext items={modules} strategy={verticalListSortingStrategy}>
            {modules.map((moduleId) => (
              <DraggableModuleItem
                key={moduleId}
                id={moduleId}
                label={allModuleLabels[moduleId] || moduleId}
                megaModuleId={megaModule.id}
                onLabelChange={onModuleLabelChange}
              />
            ))}
          </SortableContext>
          {modules.length === 0 && (
            <div className="flex items-center justify-center h-[80px] text-xs text-muted-foreground border border-dashed rounded-md">
              Modül sürükleyip bırakın
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

type RoleTemplate = {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  domain: string;
  baseRole: string;
  permissions: Record<string, string[]>;
  isDefault: boolean;
  isSystem: boolean;
  isDeletable: boolean;
  isActive: boolean;
};

type TitleItem = {
  id: number;
  name: string;
  scope: string;
  isSystem: boolean;
  isDeletable: boolean;
  isActive: boolean;
};

function RoleTemplatesTab() {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ displayName: "", description: "", domain: "hq", baseRole: "" });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", displayName: "", description: "", domain: "hq", baseRole: "", permissions: {} as Record<string, string[]> });

  const { data: templates = [], isLoading, isError, refetch } = useQuery<RoleTemplate[]>({
    queryKey: ["/api/role-templates"],
  });

  const handleCreate = () => {
    if (!createForm.name.trim()) {
      toast({ title: "Hata", description: "Rol adı gerekli", variant: "destructive" });
      return;
    }
    if (!createForm.displayName.trim()) {
      toast({ title: "Hata", description: "Görünen ad gerekli", variant: "destructive" });
      return;
    }
    createMutation.mutate(createForm);
  };

  const createMutation = useMutation({
    mutationFn: (data: typeof createForm) => apiRequest("POST", "/api/role-templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/role-templates"] });
      setIsCreateOpen(false);
      setCreateForm({ name: "", displayName: "", description: "", domain: "hq", baseRole: "", permissions: {} });
      toast({ title: "Rol şablonu oluşturuldu" });
    },
    onError: (e: Error) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number; displayName: string; description: string; domain: string }) =>
      apiRequest("PATCH", `/api/role-templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/role-templates"] });
      setEditingId(null);
      toast({ title: "Rol şablonu güncellendi" });
    },
    onError: (e: Error) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/role-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/role-templates"] });
      toast({ title: "Rol şablonu silindi" });
    },
    onError: (e: Error) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const startEdit = (t: RoleTemplate) => {
    setEditingId(t.id);
    setEditForm({ displayName: t.displayName, description: t.description || "", domain: t.domain, baseRole: t.baseRole });
  };

  const domainLabels: Record<string, string> = { hq: "Merkez", branch: "Şube", factory: "Fabrika" };

  if (isLoading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Yükleniyor...</p></div>;

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Rol Şablonları</h2>
          <p className="text-sm text-muted-foreground">Sistem ve özel rolleri yönetin</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-role-template">
          <Plus className="h-4 w-4 mr-1" />
          Yeni Rol Ekle
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {templates.map((t) => (
          <Card key={t.id} data-testid={`card-role-template-${t.id}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Shield className="h-4 w-4 flex-shrink-0" />
                  <CardTitle className="text-sm truncate" data-testid={`text-role-name-${t.id}`}>{t.displayName}</CardTitle>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Badge variant="secondary" className="text-[10px]">{domainLabels[t.domain] || t.domain}</Badge>
                  {t.isSystem && <Badge variant="outline" className="text-[10px]"><Lock className="h-2.5 w-2.5 mr-0.5" />Sistem</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-3">
              {editingId === t.id ? (
                <div className="space-y-2">
                  <Input
                    value={editForm.displayName}
                    onChange={(e) => setEditForm(p => ({ ...p, displayName: e.target.value }))}
                    placeholder="Görünen ad"
                    data-testid={`input-edit-role-name-${t.id}`}
                  />
                  <Input
                    value={editForm.description}
                    onChange={(e) => setEditForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Açıklama"
                    data-testid={`input-edit-role-desc-${t.id}`}
                  />
                  <Select value={editForm.domain} onValueChange={(v) => setEditForm(p => ({ ...p, domain: v }))}>
                    <SelectTrigger data-testid={`select-edit-domain-${t.id}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hq">Merkez</SelectItem>
                      <SelectItem value="branch">Şube</SelectItem>
                      <SelectItem value="factory">Fabrika</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1 justify-end">
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>İptal</Button>
                    <Button size="sm" onClick={() => { if (!editForm.displayName.trim()) { toast({ title: "Hata", description: "Görünen ad gerekli", variant: "destructive" }); return; } updateMutation.mutate({ id: t.id, displayName: editForm.displayName, description: editForm.description, domain: editForm.domain }); }} disabled={updateMutation.isPending || !editForm.displayName.trim()} data-testid={`button-save-role-${t.id}`}>
                      Kaydet
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{t.description || "Açıklama yok"}</p>
                  <div className="flex items-center gap-1 flex-wrap mb-2">
                    {Object.keys(t.permissions || {}).slice(0, 4).map(mod => (
                      <Badge key={mod} variant="secondary" className="text-[10px]">{mod}</Badge>
                    ))}
                    {Object.keys(t.permissions || {}).length > 4 && (
                      <Badge variant="secondary" className="text-[10px]">+{Object.keys(t.permissions).length - 4}</Badge>
                    )}
                  </div>
                  <div className="flex gap-1 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(t)} data-testid={`button-edit-role-${t.id}`}>
                      <Pencil className="h-3 w-3 mr-1" />
                      Düzenle
                    </Button>
                    {t.isDeletable && !t.isSystem && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(t.id)} data-testid={`button-delete-role-${t.id}`}>
                        <X className="h-3 w-3 mr-1" />
                        Sil
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Yeni Rol Şablonu</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Rol Adı (Sistem) *</Label>
              <Input value={createForm.name} onChange={(e) => setCreateForm(p => ({ ...p, name: e.target.value }))} placeholder="ornek_rol" data-testid="input-create-role-name" />
            </div>
            <div>
              <Label>Görünen Ad *</Label>
              <Input value={createForm.displayName} onChange={(e) => setCreateForm(p => ({ ...p, displayName: e.target.value }))} placeholder="Örnek Rol" data-testid="input-create-role-display" />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Input value={createForm.description} onChange={(e) => setCreateForm(p => ({ ...p, description: e.target.value }))} placeholder="Rol açıklaması" data-testid="input-create-role-desc" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Alan</Label>
                <Select value={createForm.domain} onValueChange={(v) => setCreateForm(p => ({ ...p, domain: v }))}>
                  <SelectTrigger data-testid="select-create-domain"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hq">Merkez</SelectItem>
                    <SelectItem value="branch">Şube</SelectItem>
                    <SelectItem value="factory">Fabrika</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Temel Rol</Label>
                <Input value={createForm.baseRole} onChange={(e) => setCreateForm(p => ({ ...p, baseRole: e.target.value }))} placeholder="admin, supervisor..." data-testid="input-create-base-role" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>İptal</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending || !createForm.name.trim() || !createForm.displayName.trim()} data-testid="button-submit-create-role">
              {createMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TitlesTab() {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editScope, setEditScope] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createScope, setCreateScope] = useState("all");
  const [filterScope, setFilterScope] = useState<string>("all_filter");

  const { data: titlesData = [], isLoading } = useQuery<TitleItem[]>({
    queryKey: ["/api/admin/titles"],
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; scope: string }) => apiRequest("POST", "/api/admin/titles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/titles"] });
      setIsCreateOpen(false);
      setCreateName("");
      setCreateScope("all");
      toast({ title: "Ünvan oluşturuldu" });
    },
    onError: (e: Error) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number; name: string; scope: string }) =>
      apiRequest("PATCH", `/api/admin/titles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/titles"] });
      setEditingId(null);
      toast({ title: "Ünvan güncellendi" });
    },
    onError: (e: Error) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/titles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/titles"] });
      toast({ title: "Ünvan silindi" });
    },
    onError: (e: Error) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const scopeLabels: Record<string, string> = { hq: "Merkez", branch: "Şube", factory: "Fabrika", all: "Tümü" };
  const scopeColors: Record<string, string> = { hq: "bg-blue-500/10 text-blue-600", branch: "bg-green-500/10 text-green-600", factory: "bg-orange-500/10 text-orange-600", all: "bg-purple-500/10 text-purple-600" };

  const filteredTitles = filterScope === "all_filter" ? titlesData : titlesData.filter(t => t.scope === filterScope);

  if (isLoading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Yükleniyor...</p></div>;

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Ünvan Yönetimi</h2>
          <p className="text-sm text-muted-foreground">Personel ünvanlarını ekleyin ve düzenleyin</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterScope} onValueChange={setFilterScope}>
            <SelectTrigger className="w-[130px]" data-testid="select-filter-scope">
              <SelectValue placeholder="Filtrele" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_filter">Tüm Kapsamlar</SelectItem>
              <SelectItem value="hq">Merkez</SelectItem>
              <SelectItem value="branch">Şube</SelectItem>
              <SelectItem value="factory">Fabrika</SelectItem>
              <SelectItem value="all">Genel</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-title">
            <Plus className="h-4 w-4 mr-1" />
            Yeni Ünvan
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        {Object.entries(scopeLabels).map(([scope, label]) => {
          const scopeTitles = filteredTitles.filter(t => t.scope === scope);
          if (scopeTitles.length === 0) return null;
          return (
            <div key={scope} className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className={`text-xs ${scopeColors[scope] || ""}`}>{label}</Badge>
                <span className="text-xs text-muted-foreground">{scopeTitles.length} ünvan</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {scopeTitles.map(t => (
                  <Card key={t.id} data-testid={`card-title-${t.id}`}>
                    <CardContent className="p-3">
                      {editingId === t.id ? (
                        <div className="space-y-2">
                          <Input value={editName} onChange={(e) => setEditName(e.target.value)} data-testid={`input-edit-title-${t.id}`} />
                          <Select value={editScope} onValueChange={setEditScope}>
                            <SelectTrigger data-testid={`select-edit-scope-${t.id}`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hq">Merkez</SelectItem>
                              <SelectItem value="branch">Şube</SelectItem>
                              <SelectItem value="factory">Fabrika</SelectItem>
                              <SelectItem value="all">Genel</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>İptal</Button>
                            <Button size="sm" onClick={() => updateMutation.mutate({ id: t.id, name: editName, scope: editScope })} disabled={updateMutation.isPending || !editName.trim()} data-testid={`button-save-title-${t.id}`}>
                              Kaydet
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Star className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                            <span className="text-sm truncate" data-testid={`text-title-name-${t.id}`}>{t.name}</span>
                            {t.isSystem && <Lock className="h-3 w-3 flex-shrink-0 text-muted-foreground" />}
                          </div>
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <Button size="icon" variant="ghost" onClick={() => { setEditingId(t.id); setEditName(t.name); setEditScope(t.scope); }} data-testid={`button-edit-title-${t.id}`}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            {t.isDeletable && !t.isSystem && (
                              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(t.id)} data-testid={`button-delete-title-${t.id}`}>
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
        {filteredTitles.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Star className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Bu kapsamda ünvan bulunamadı</p>
          </div>
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Yeni Ünvan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Ünvan Adı *</Label>
              <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Örn: Kıdemli Barista" data-testid="input-create-title-name" />
            </div>
            <div>
              <Label>Kapsam</Label>
              <Select value={createScope} onValueChange={setCreateScope}>
                <SelectTrigger data-testid="select-create-title-scope"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hq">Merkez</SelectItem>
                  <SelectItem value="branch">Şube</SelectItem>
                  <SelectItem value="factory">Fabrika</SelectItem>
                  <SelectItem value="all">Genel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>İptal</Button>
            <Button onClick={() => createMutation.mutate({ name: createName, scope: createScope })} disabled={createMutation.isPending || !createName.trim()} data-testid="button-submit-create-title">
              {createMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type PermissionState = Record<string, { view: boolean; edit: boolean }>;

export default function AdminYetkilendirme() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<PermissionState>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [isNewRoleDialogOpen, setIsNewRoleDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleScope, setNewRoleScope] = useState<"admin" | "hq" | "branch">("hq");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  
  // Yeni modül ekleme state'leri
  const [isNewModuleDialogOpen, setIsNewModuleDialogOpen] = useState(false);
  const [newModuleKey, setNewModuleKey] = useState("");
  const [newModuleLabel, setNewModuleLabel] = useState("");
  const [newModuleMegaModule, setNewModuleMegaModule] = useState<string>("operations");
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("permissions");
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  
  // Mega module mappings state - now synced with backend API
  const [moduleMappings, setModuleMappings] = useState<Record<string, string[]>>(DEFAULT_MODULE_MEGA_MAPPING);
  const [megaModuleTitles, setMegaModuleTitles] = useState<Record<string, string>>({});
  const [customModuleLabels, setCustomModuleLabels] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  // Fetch mega module data from backend API
  const { data: megaModuleData, isLoading: megaModuleLoading } = useQuery<{
    configs: Array<{ megaModuleId: string; megaModuleName: string; megaModuleNameTr: string }>;
    items: Array<{ megaModuleId: string; subModuleId: string; subModuleName: string; subModuleNameTr: string }>;
  }>({
    queryKey: ["/api/admin/mega-modules"],
    enabled: user?.role === "admin",
  });
  
  // Initialize state from API data when loaded
  useEffect(() => {
    if (megaModuleData) {
      // Build module mappings from items
      const newMappings: Record<string, string[]> = {};
      MEGA_MODULE_CONFIG.forEach(m => { newMappings[m.id] = []; });
      
      megaModuleData.items.forEach(item => {
        if (newMappings[item.megaModuleId]) {
          newMappings[item.megaModuleId].push(item.subModuleId);
        }
      });
      
      // Only update if we have data from API
      const hasData = Object.values(newMappings).some(arr => arr.length > 0);
      if (hasData) {
        setModuleMappings(newMappings);
      }
      
      // Build mega module titles from configs
      const newTitles: Record<string, string> = {};
      megaModuleData.configs.forEach(c => {
        if (c.megaModuleNameTr) {
          newTitles[c.megaModuleId] = c.megaModuleNameTr;
        }
      });
      setMegaModuleTitles(newTitles);
      
      // Build custom module labels from items
      const newLabels: Record<string, string> = {};
      megaModuleData.items.forEach(item => {
        if (item.subModuleNameTr) {
          newLabels[item.subModuleId] = item.subModuleNameTr;
        }
      });
      setCustomModuleLabels(newLabels);
    }
  }, [megaModuleData]);
  
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );
  
  // Build all module labels from API data (customModuleLabels) - dynamically from DB
  const allModuleLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    // First, add all modules from moduleMappings (from API)
    Object.values(moduleMappings).flat().forEach(modId => {
      labels[modId] = customModuleLabels[modId] || modId;
    });
    // Also include any from MODULE_GROUPS as fallback for legacy
    MODULE_GROUPS.forEach(group => {
      group.modules.forEach(mod => {
        if (!labels[mod.key]) {
          labels[mod.key] = customModuleLabels[mod.key] || mod.label;
        }
      });
    });
    return labels;
  }, [customModuleLabels, moduleMappings]);
  
  // Save mega module configs to backend API
  const saveMegaModuleConfigs = async (titles: Record<string, string>) => {
    const configs = MEGA_MODULE_CONFIG.map(m => ({
      megaModuleId: m.id,
      megaModuleName: m.title,
      megaModuleNameTr: titles[m.id] || m.title,
      icon: m.icon.name || "LayoutDashboard",
      color: m.color,
      sortOrder: MEGA_MODULE_CONFIG.indexOf(m),
      isActive: true,
    }));
    await apiRequest("POST", "/api/admin/mega-modules/config", { configs });
  };
  
  // Get default module labels from MODULE_GROUPS
  const getDefaultModuleLabel = (modId: string): string => {
    for (const group of MODULE_GROUPS) {
      const mod = group.modules.find(m => m.key === modId);
      if (mod) return mod.label;
    }
    return modId;
  };
  
  // Save mega module items to backend API
  const saveMegaModuleItems = async (mappings: Record<string, string[]>, labels: Record<string, string>) => {
    const items: Array<{
      megaModuleId: string;
      subModuleId: string;
      subModulePath: string;
      subModuleName: string;
      subModuleNameTr: string;
      icon: string;
      sortOrder: number;
      isActive: boolean;
    }> = [];
    
    Object.entries(mappings).forEach(([megaId, moduleIds]) => {
      moduleIds.forEach((modId, index) => {
        const defaultLabel = getDefaultModuleLabel(modId);
        items.push({
          megaModuleId: megaId,
          subModuleId: modId,
          subModulePath: `/${modId.replace(/\./g, "/")}`,
          subModuleName: defaultLabel,
          subModuleNameTr: labels[modId] || defaultLabel,
          icon: "FileText",
          sortOrder: index,
          isActive: true,
        });
      });
    });
    
    await apiRequest("POST", "/api/admin/mega-modules/items", { items });
  };
  
  // Handler for mega module title change
  const handleMegaTitleChange = async (megaModuleId: string, newTitle: string) => {
    const previousTitles = { ...megaModuleTitles };
    const updated = { ...megaModuleTitles, [megaModuleId]: newTitle };
    setMegaModuleTitles(updated);
    
    try {
      await saveMegaModuleConfigs(updated);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/mega-modules"] });
      toast({
        title: "Başlık güncellendi",
        description: `"${newTitle}" olarak kaydedildi`,
      });
    } catch (error) {
      setMegaModuleTitles(previousTitles); // Rollback
      toast({
        title: "Hata",
        description: "Başlık kaydedilemedi",
        variant: "destructive",
      });
    }
  };
  
  // Handler for module label change
  const handleModuleLabelChange = async (moduleId: string, newLabel: string) => {
    const previousLabels = { ...customModuleLabels };
    const updated = { ...customModuleLabels, [moduleId]: newLabel };
    setCustomModuleLabels(updated);
    
    try {
      await saveMegaModuleItems(moduleMappings, updated);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/mega-modules"] });
      toast({
        title: "Modül adı güncellendi",
        description: `"${newLabel}" olarak kaydedildi`,
      });
    } catch (error) {
      setCustomModuleLabels(previousLabels); // Rollback
      toast({
        title: "Hata",
        description: "Modül adı kaydedilemedi",
        variant: "destructive",
      });
    }
  };
  
  // Handle drag end - move or reorder modules
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveModuleId(null);
    
    if (!over) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Find source mega module
    let actualSourceId: string | null = null;
    for (const [megaId, modules] of Object.entries(moduleMappings)) {
      if (modules.includes(activeId)) {
        actualSourceId = megaId;
        break;
      }
    }
    
    if (!actualSourceId) return;
    
    // Determine target mega module
    let targetMegaId: string | null = null;
    
    // Check if dropping directly on a mega module container
    if (MEGA_MODULE_CONFIG.find(m => m.id === overId)) {
      targetMegaId = overId;
    } else {
      // Check over.data for megaModuleId
      const overData = over.data.current as { megaModuleId?: string } | undefined;
      if (overData?.megaModuleId) {
        targetMegaId = overData.megaModuleId;
      } else {
        // Search through mappings
        for (const [megaId, modules] of Object.entries(moduleMappings)) {
          if (modules.includes(overId)) {
            targetMegaId = megaId;
            break;
          }
        }
      }
    }
    
    if (!targetMegaId) return;
    
    // Same mega module - reorder within
    if (actualSourceId === targetMegaId) {
      const modules = moduleMappings[actualSourceId];
      const oldIndex = modules.indexOf(activeId);
      const newIndex = modules.indexOf(overId);
      
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const previousMappings = { ...moduleMappings };
        const newMappings = { ...moduleMappings };
        newMappings[actualSourceId] = arrayMove(moduleMappings[actualSourceId], oldIndex, newIndex);
        setModuleMappings(newMappings);
        
        // Save to backend API with rollback on failure
        saveMegaModuleItems(newMappings, customModuleLabels).then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/admin/mega-modules"] });
          toast({ title: "Sıralama güncellendi" });
        }).catch(() => {
          setModuleMappings(previousMappings); // Rollback
          toast({ title: "Hata", description: "Değişiklikler kaydedilemedi", variant: "destructive" });
        });
      }
      return;
    }
    
    // Move module from source to target
    const previousMappings = { ...moduleMappings };
    const newMappings = { ...moduleMappings };
    newMappings[actualSourceId] = moduleMappings[actualSourceId].filter(id => id !== activeId);
    newMappings[targetMegaId!] = [...moduleMappings[targetMegaId!], activeId];
    setModuleMappings(newMappings);
    
    // Get the current label for toast message
    const moduleLabel = customModuleLabels[activeId] || getDefaultModuleLabel(activeId);
    
    // Save to backend API with rollback on failure
    saveMegaModuleItems(newMappings, customModuleLabels).then(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/mega-modules"] });
      toast({
        title: "Modül taşındı",
        description: `${moduleLabel} başarıyla taşındı`,
      });
    }).catch(() => {
      setModuleMappings(previousMappings); // Rollback
      toast({ title: "Hata", description: "Değişiklikler kaydedilemedi", variant: "destructive" });
    });
  };
  
  const handleDragStart = (event: DragStartEvent) => {
    setActiveModuleId(event.active.id as string);
  };
  
  // Reset mappings to default (also resets titles and labels)
  const handleResetMappings = async () => {
    setIsSaving(true);
    try {
      setModuleMappings(DEFAULT_MODULE_MEGA_MAPPING);
      setMegaModuleTitles({});
      setCustomModuleLabels({});
      
      // Save defaults to backend API
      await saveMegaModuleConfigs({});
      await saveMegaModuleItems(DEFAULT_MODULE_MEGA_MAPPING, {});
      queryClient.invalidateQueries({ queryKey: ["/api/admin/mega-modules"] });
      
      toast({ title: "Varsayılana sıfırlandı", description: "Tüm başlıklar ve modül isimleri sıfırlandı" });
    } catch (error) {
      toast({ title: "Hata", description: "Sıfırlama işlemi başarısız", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Fetch all granular permission actions grouped by module
  const { data: permissionActions = {} } = useQuery<Record<string, PermissionAction[]>>({
    queryKey: ["/api/admin/permission-actions"],
    enabled: user?.role === "admin",
  });

  // Fetch role-specific grants
  const { data: roleGrants = [], refetch: refetchGrants } = useQuery<RoleGrant[]>({
    queryKey: ["/api/admin/role-grants", selectedRole],
    queryFn: async () => {
      if (!selectedRole) return [];
      const response = await fetch(`/api/admin/role-grants/${encodeURIComponent(selectedRole)}`);
      if (!response.ok) throw new Error('Failed to fetch role grants');
      return response.json();
    },
    enabled: user?.role === "admin" && !!selectedRole,
  });

  // Mutation for updating grants
  const updateGrantMutation = useMutation({
    mutationFn: (data: { role: string; actionId: number; scope: string; isActive?: boolean }) =>
      apiRequest("POST", "/api/admin/role-grants", data),
    onSuccess: () => {
      refetchGrants();
      // Invalidate all menu/dashboard caches for immediate sync
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-modules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/me/menu"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-menu"] });
      toast({ title: "İzin güncellendi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "İzin güncellenemedi", variant: "destructive" });
    },
  });

  // Mutation for removing grants
  const removeGrantMutation = useMutation({
    mutationFn: (data: { role: string; actionId: number }) =>
      apiRequest("DELETE", `/api/admin/role-grants/${data.role}/${data.actionId}`),
    onSuccess: () => {
      refetchGrants();
      // Invalidate all menu/dashboard caches for immediate sync
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-modules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/me/menu"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-menu"] });
      toast({ title: "İzin kaldırıldı" });
    },
    onError: () => {
      toast({ title: "Hata", description: "İzin kaldırılamadı", variant: "destructive" });
    },
  });

  // Get current grant for an action
  const getActionGrant = (actionId: number): RoleGrant | undefined => {
    return roleGrants.find(g => g.actionId === actionId);
  };

  // Handle scope change for an action
  const handleScopeChange = (actionId: number, scope: string) => {
    if (!selectedRole) return;
    updateGrantMutation.mutate({ role: selectedRole, actionId, scope });
  };

  // Handle removing a grant
  const handleRemoveGrant = (actionId: number) => {
    if (!selectedRole) return;
    removeGrantMutation.mutate({ role: selectedRole, actionId });
  };

  // Check if module has granular actions
  const hasGranularActions = (moduleKey: string): boolean => {
    return !!permissionActions[moduleKey] && permissionActions[moduleKey].length > 0;
  };

  const { data: rolePermissions = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/role-permissions", selectedRole],
    queryFn: async () => {
      const response = await fetch(`/api/admin/role-permissions?role=${encodeURIComponent(selectedRole || '')}`);
      if (!response.ok) throw new Error('Failed to fetch permissions');
      return response.json();
    },
    enabled: user?.role === "admin" && !!selectedRole,
  });

  useEffect(() => {
    if (selectedRole) {
      // Initialize all modules with default view=false, edit=false
      // Use moduleMappings (from API/DB) as primary source
      const defaultPermissions: PermissionState = {};
      
      // Add all modules from moduleMappings (dynamically from DB)
      Object.values(moduleMappings).flat().forEach((modId) => {
        defaultPermissions[modId] = { view: false, edit: false };
      });
      
      // Fallback: also add from MODULE_GROUPS for any legacy modules
      MODULE_GROUPS.forEach((group) => {
        group.modules.forEach((mod) => {
          if (!defaultPermissions[mod.key]) {
            defaultPermissions[mod.key] = { view: false, edit: false };
          }
        });
      });
      
      // Override with loaded permissions
      if (rolePermissions.length > 0) {
        rolePermissions.forEach((perm: any) => {
          const actions = perm.actions || [];
          defaultPermissions[perm.module] = {
            view: actions.includes('view') || perm.canView || false,
            edit: actions.includes('edit') || perm.canEdit || false,
          };
        });
      }
      
      setPermissions(defaultPermissions);
      setHasChanges(false);
    }
  }, [rolePermissions, selectedRole]);

  const saveMutation = useMutation({
    mutationFn: (data: { role: string; permissions: PermissionState }) => {
      // Convert {view, edit} format to {actions} format for storage
      const updates = Object.entries(data.permissions).map(([module, perms]) => ({
        role: data.role,
        module,
        actions: [
          ...(perms.view ? ['view'] : []),
          ...(perms.edit ? ['edit'] : []),
        ],
      }));
      return apiRequest("PUT", "/api/admin/role-permissions", updates);
    },
    onSuccess: () => {
      // Invalidate permission queries
      queryClient.invalidateQueries({ queryKey: ["/api/admin/role-permissions"] });
      // Invalidate all sidebar-menu caches so users see updated menus
      queryClient.invalidateQueries({ queryKey: ["sidebar-menu"] });
      // CRITICAL: Invalidate dashboard modules so mega-module cards update immediately
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-modules"] });
      // Invalidate user menu for sidebar sync
      queryClient.invalidateQueries({ queryKey: ["/api/me/menu"] });
      // Invalidate mega-module mapping for complete sync
      queryClient.invalidateQueries({ queryKey: ["/api/mega-module-mapping"] });
      setHasChanges(false);
      toast({ title: "Yetkiler kaydedildi", description: "Menü ve dashboard değişiklikleri hemen yansıtıldı." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Yetkiler kaydedilemedi", variant: "destructive" });
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: (data: { roleName: string; scope: string; description: string }) =>
      apiRequest("POST", "/api/admin/roles", data),
    onSuccess: () => {
      toast({ title: "Rol oluşturuldu" });
      setIsNewRoleDialogOpen(false);
      setNewRoleName("");
      setNewRoleScope("hq");
      setNewRoleDescription("");
      window.location.reload();
    },
    onError: (err) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const createModuleMutation = useMutation({
    mutationFn: (data: { moduleKey: string; label: string; megaModuleId: string }) =>
      apiRequest("POST", "/api/admin/mega-modules/add-module", data),
    onSuccess: () => {
      toast({ title: "Modül eklendi" });
      setIsNewModuleDialogOpen(false);
      setNewModuleKey("");
      setNewModuleLabel("");
      setNewModuleMegaModule("operations");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/mega-modules"] });
    },
    onError: (err: Error) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  if (user?.role !== "admin") {
    return <Redirect to="/" />;
  }

  const handleToggle = (moduleKey: string, type: "view" | "edit") => {
    setPermissions(prev => {
      const current = prev[moduleKey] || { view: false, edit: false };
      const updated = { ...current, [type]: !current[type] };
      if (type === "view" && !updated.view) {
        updated.edit = false;
      }
      if (type === "edit" && updated.edit) {
        updated.view = true;
      }
      return { ...prev, [moduleKey]: updated };
    });
    setHasChanges(true);
  };

  const getPermission = (moduleKey: string, type: "view" | "edit") => {
    return permissions[moduleKey]?.[type] ?? false;
  };

  const handleSave = () => {
    if (selectedRole) {
      saveMutation.mutate({ role: selectedRole, permissions });
    }
  };

  const handleCreateRole = () => {
    if (!newRoleName.trim()) {
      toast({ title: "Hata", description: "Rol adı gerekli", variant: "destructive" });
      return;
    }
    createRoleMutation.mutate({ roleName: newRoleName.trim().toLocaleLowerCase('tr-TR'), scope: newRoleScope, description: newRoleDescription });
  };

  const handleCreateModule = () => {
    if (!newModuleKey.trim()) {
      toast({ title: "Hata", description: "Modül anahtarı gerekli", variant: "destructive" });
      return;
    }
    if (!newModuleLabel.trim()) {
      toast({ title: "Hata", description: "Modül adı gerekli", variant: "destructive" });
      return;
    }
    createModuleMutation.mutate({ 
      moduleKey: newModuleKey.trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, '_'), 
      label: newModuleLabel.trim(), 
      megaModuleId: newModuleMegaModule 
    });
  };

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    setPermissions({});
    setHasChanges(false);
    setShowPermissions(true);
  };

  const handleBackToRoles = () => {
    setShowPermissions(false);
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Tab Header */}
      <div className="p-3 border-b flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Link href="/admin">
            <Button variant="ghost" size="icon" data-testid="button-back-admin">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="font-semibold">Yetkilendirme & Modül Yönetimi</h1>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
          <TabsList>
            <TabsTrigger value="permissions" data-testid="tab-permissions">
              <Shield className="h-4 w-4 mr-1.5" />
              Rol Yetkileri
            </TabsTrigger>
            <TabsTrigger value="modules" data-testid="tab-modules">
              <LayoutDashboard className="h-4 w-4 mr-1.5" />
              Modül Düzenleme
            </TabsTrigger>
            <TabsTrigger value="role-templates" data-testid="tab-role-templates">
              <Users className="h-4 w-4 mr-1.5" />
              Roller
            </TabsTrigger>
            <TabsTrigger value="titles" data-testid="tab-titles">
              <Star className="h-4 w-4 mr-1.5" />
              Ünvanlar
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* Permissions Tab Content */}
      {activeTab === "permissions" && (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Rol Listesi - Mobilde tam ekran, masaüstünde sidebar */}
          <div className={`${showPermissions ? 'hidden md:block' : 'block'} w-full md:w-56 md:border-r bg-muted/30 p-3 space-y-4 md:h-full overflow-auto`}>
            <div className="flex items-center gap-2 justify-between">
              <h2 className="font-semibold text-sm">Roller</h2>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={() => setIsNewRoleDialogOpen(true)}
                data-testid="button-new-role"
                title="Yeni Rol Ekle"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="h-[calc(100vh-200px)] md:h-[calc(100%-60px)]">
              <div className="space-y-4">
                {Object.entries(ROLE_GROUPS).map(([groupKey, group]) => (
                  <div key={groupKey}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${group.color}`} />
                      <span className="text-xs font-medium text-muted-foreground">{group.label}</span>
                    </div>
                    <div className="space-y-1">
                      {group.roles.map(role => (
                        <button
                          key={role}
                          onClick={() => handleRoleSelect(role)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
                            selectedRole === role 
                              ? "bg-primary text-primary-foreground" 
                              : "hover:bg-muted"
                          }`}
                          data-testid={`button-role-${role}`}
                        >
                          <span>{ROLE_LABELS[role] || role}</span>
                          <ChevronRight className="h-4 w-4 md:hidden" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* İzin Ayarları - Mobilde tam ekran, masaüstünde ana alan */}
          <div className={`${showPermissions ? 'block' : 'hidden md:block'} flex-1 p-4 overflow-auto`}>
          {selectedRole ? (
            <>
              <div className="flex items-center justify-between mb-4 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 md:hidden flex-shrink-0" 
                    onClick={handleBackToRoles}
                    data-testid="button-back-roles"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-0">
                    <h1 className="text-lg md:text-xl font-semibold flex items-center gap-2">
                      <Shield className="h-5 w-5 flex-shrink-0 hidden md:block" />
                      <span className="truncate">{ROLE_LABELS[selectedRole]} Yetkileri</span>
                    </h1>
                    <p className="text-xs md:text-sm text-muted-foreground hidden md:block">
                      Bu rol için sayfa ve modül erişim izinlerini ayarlayın
                    </p>
                  </div>
                </div>
                {hasChanges && (
                  <Button 
                    onClick={handleSave} 
                    disabled={saveMutation.isPending} 
                    size="sm"
                    className="flex-shrink-0"
                    data-testid="button-save-permissions"
                  >
                    <Save className="h-4 w-4 mr-1 md:mr-2" />
                    <span className="hidden md:inline">{saveMutation.isPending ? "Kaydediliyor..." : "Kaydet"}</span>
                    <span className="md:hidden">Kaydet</span>
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                {MEGA_MODULE_CONFIG.map((megaModule) => {
                  // Get modules for this mega-module from DB-synced moduleMappings
                  const moduleIds = moduleMappings[megaModule.id] || [];
                  
                  // Check if all modules in group have view permission
                  const allModulesEnabled = moduleIds.length > 0 && moduleIds.every(modId => getPermission(modId, "view"));
                  const someModulesEnabled = moduleIds.some(modId => getPermission(modId, "view"));
                  
                  // Toggle all modules in group
                  const handleGroupToggle = () => {
                    const newValue = !allModulesEnabled;
                    moduleIds.forEach(modId => {
                      setPermissions(prev => ({
                        ...prev,
                        [modId]: { view: newValue, edit: newValue ? (prev[modId]?.edit || false) : false }
                      }));
                    });
                    setHasChanges(true);
                  };
                  
                  const MegaIcon = megaModule.icon;
                  const displayTitle = megaModuleTitles[megaModule.id] || megaModule.title;
                  
                  return (
                  <Card key={megaModule.id}>
                    <CardHeader className="py-2 md:py-3">
                      <CardTitle className="text-sm flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <MegaIcon className="h-4 w-4" />
                          {displayTitle}
                          <Badge variant="secondary" className="text-[10px] px-1.5">
                            {moduleIds.filter(modId => getPermission(modId, "view")).length}/{moduleIds.length}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground">Tümü</span>
                          <Switch
                            checked={allModulesEnabled}
                            onCheckedChange={handleGroupToggle}
                            className="scale-75"
                            data-testid={`switch-group-${megaModule.id}`}
                          />
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 pb-2 md:pb-4">
                      <div className="space-y-1 md:space-y-2">
                        {moduleIds.map((modId, idx) => (
                          <div key={modId}>
                            {idx > 0 && <Separator className="my-1 md:my-2" />}
                            <div className="flex items-center justify-between py-1">
                              <span className="text-xs md:text-sm">{allModuleLabels[modId] || modId}</span>
                              <div className="flex items-center gap-2 md:gap-4">
                                <div className="flex items-center gap-1 md:gap-2">
                                  <span className="text-[10px] md:text-xs text-muted-foreground">Gör</span>
                                  <Switch
                                    checked={getPermission(modId, "view")}
                                    onCheckedChange={() => handleToggle(modId, "view")}
                                    className="scale-75 md:scale-100"
                                    data-testid={`switch-${modId}-view`}
                                  />
                                </div>
                                <div className="flex items-center gap-1 md:gap-2">
                                  <span className="text-[10px] md:text-xs text-muted-foreground">Düz</span>
                                  <Switch
                                    checked={getPermission(modId, "edit")}
                                    onCheckedChange={() => handleToggle(modId, "edit")}
                                    disabled={!getPermission(modId, "view")}
                                    className="scale-75 md:scale-100"
                                    data-testid={`switch-${modId}-edit`}
                                  />
                                </div>
                              </div>
                            </div>
                          
                            {/* Detaylı İzinler Accordion */}
                            {hasGranularActions(modId) && (
                              <Accordion type="single" collapsible className="mt-1">
                                <AccordionItem value={modId} className="border-none">
                                  <AccordionTrigger className="py-1 text-xs text-muted-foreground hover:no-underline" data-testid={`accordion-${modId}`}>
                                    <div className="flex items-center gap-1">
                                      <Eye className="h-3 w-3" />
                                      Detaylı İzinler ({permissionActions[modId]?.length || 0})
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="pb-1 pt-2">
                                    <div className="space-y-2 pl-2 border-l-2 border-muted">
                                      {permissionActions[modId]?.map((action) => {
                                        const grant = getActionGrant(action.id);
                                        return (
                                          <div key={action.id} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded bg-muted/30">
                                            <div className="flex-1 min-w-0">
                                              <p className="text-xs font-medium truncate">{action.labelTr}</p>
                                              {action.description && (
                                                <p className="text-[10px] text-muted-foreground truncate">{action.description}</p>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                              {grant ? (
                                                <>
                                                  <RadioGroup
                                                    value={grant.scope}
                                                    onValueChange={(v) => handleScopeChange(action.id, v)}
                                                    className="flex gap-1"
                                                  >
                                                    {Object.entries(SCOPE_LABELS).map(([scope, { label, icon: Icon, color }]) => (
                                                      <div key={scope} className="flex items-center">
                                                        <RadioGroupItem
                                                          value={scope}
                                                          id={`${action.id}-${scope}`}
                                                          className="peer sr-only"
                                                        />
                                                        <Label
                                                          htmlFor={`${action.id}-${scope}`}
                                                          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] cursor-pointer border transition-colors ${
                                                            grant.scope === scope 
                                                              ? `${color} border-current bg-current/10` 
                                                              : "border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground"
                                                          }`}
                                                          data-testid={`scope-${action.actionKey}-${scope}`}
                                                        >
                                                          <Icon className="h-2.5 w-2.5" />
                                                          <span className="hidden sm:inline">{label}</span>
                                                        </Label>
                                                      </div>
                                                    ))}
                                                  </RadioGroup>
                                                  <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-5 w-5 text-destructive hover:text-destructive"
                                                    onClick={() => handleRemoveGrant(action.id)}
                                                    data-testid={`remove-grant-${action.actionKey}`}
                                                  >
                                                    <X className="h-3 w-3" />
                                                  </Button>
                                                </>
                                              ) : (
                                                <div className="flex gap-1">
                                                  {Object.entries(SCOPE_LABELS).map(([scope, { label, icon: Icon, color }]) => (
                                                    <Button
                                                      key={scope}
                                                      size="sm"
                                                      variant="outline"
                                                      className="h-5 px-1.5 text-[10px]"
                                                      onClick={() => handleScopeChange(action.id, scope)}
                                                      data-testid={`add-grant-${action.actionKey}-${scope}`}
                                                    >
                                                      <Icon className={`h-2.5 w-2.5 mr-0.5 ${color}`} />
                                                      <span className="hidden sm:inline">{label}</span>
                                                    </Button>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              </Accordion>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="hidden md:flex h-full items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Yetkileri düzenlemek için bir rol seçin</p>
              </div>
            </div>
          )}
          </div>
        </div>
      )}
      
      {/* Modules Tab Content - Drag & Drop Mega Module Management */}
      {activeTab === "modules" && (
        <div className="flex-1 overflow-auto p-4">
          <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">Mega Modül Düzenleme</h2>
              <p className="text-sm text-muted-foreground">
                Modülleri sürükleyerek farklı mega modüller arasında taşıyabilirsiniz
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setIsNewModuleDialogOpen(true)} data-testid="button-add-module">
                <Plus className="h-4 w-4 mr-1" />
                Yeni Modül Ekle
              </Button>
              <Button variant="outline" onClick={handleResetMappings} data-testid="button-reset-mappings">
                Varsayılana Sıfırla
              </Button>
            </div>
          </div>
          
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            onDragStart={handleDragStart}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {MEGA_MODULE_CONFIG.map((megaModule) => (
                <DroppableMegaModule
                  key={megaModule.id}
                  megaModule={megaModule}
                  modules={moduleMappings[megaModule.id] || []}
                  allModuleLabels={allModuleLabels}
                  customTitle={megaModuleTitles[megaModule.id]}
                  onTitleChange={handleMegaTitleChange}
                  onModuleLabelChange={handleModuleLabelChange}
                />
              ))}
            </div>
            
            <DragOverlay>
              {activeModuleId ? (
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border bg-background text-xs shadow-lg">
                  <GripVertical className="h-3 w-3 text-muted-foreground" />
                  <span>{allModuleLabels[activeModuleId] || activeModuleId}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {/* Role Templates Tab Content */}
      {activeTab === "role-templates" && (
        <RoleTemplatesTab />
      )}

      {/* Titles Tab Content */}
      {activeTab === "titles" && (
        <TitlesTab />
      )}

      {/* Rol Ekle Modal */}
      <Dialog open={isNewRoleDialogOpen} onOpenChange={setIsNewRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Rol Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rol Adı</Label>
              <Input
                placeholder="örn: lead_barista, quality_manager"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                data-testid="input-role-name"
              />
            </div>
            <div>
              <Label>Rol Kapsamı</Label>
              <Select value={newRoleScope} onValueChange={(v) => setNewRoleScope(v as "admin" | "hq" | "branch")}>
                <SelectTrigger data-testid="select-role-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="hq">HQ</SelectItem>
                  <SelectItem value="branch">Şube</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Açıklama (İsteğe Bağlı)</Label>
              <Input
                placeholder="Rol için açıklama girin"
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                data-testid="input-role-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewRoleDialogOpen(false)}>İptal</Button>
            <Button onClick={handleCreateRole} disabled={createRoleMutation.isPending} data-testid="button-create-role">
              {createRoleMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Yeni Modül Ekle Modal */}
      <Dialog open={isNewModuleDialogOpen} onOpenChange={setIsNewModuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Modül Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Modül Anahtarı *</Label>
              <Input
                placeholder="örn: kampanya_analiz, stok_yonetimi"
                value={newModuleKey}
                onChange={(e) => setNewModuleKey(e.target.value)}
                data-testid="input-module-key"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Sistem tarafından kullanılacak benzersiz anahtar (küçük harf, alt çizgi)
              </p>
            </div>
            <div>
              <Label>Modül Adı *</Label>
              <Input
                placeholder="örn: Kampanya Analiz, Stok Yönetimi"
                value={newModuleLabel}
                onChange={(e) => setNewModuleLabel(e.target.value)}
                data-testid="input-module-label"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Kullanıcıya görünecek ad
              </p>
            </div>
            <div>
              <Label>Mega Modül</Label>
              <Select value={newModuleMegaModule} onValueChange={setNewModuleMegaModule}>
                <SelectTrigger data-testid="select-mega-module">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEGA_MODULE_CONFIG.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewModuleDialogOpen(false)}>İptal</Button>
            <Button onClick={handleCreateModule} disabled={createModuleMutation.isPending} data-testid="button-create-module">
              {createModuleMutation.isPending ? "Ekleniyor..." : "Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
