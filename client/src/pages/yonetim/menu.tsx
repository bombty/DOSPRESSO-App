import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ConfirmDeleteDialog, useConfirmDelete } from "@/components/confirm-delete-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { invalidateMenuCache } from "@/components/app-sidebar";
import { ROLE_LABELS } from "@/lib/turkish-labels";
import { 
  type MenuSection, 
  type MenuItem, 
  type MenuVisibilityRule,
  type InsertMenuSection,
  type InsertMenuItem,
  type InsertMenuVisibilityRule,
  type User,
  type Branch,
  insertMenuSectionSchema,
  insertMenuItemSchema,
  insertMenuVisibilityRuleSchema,
  UserRole,
  isHQRole,
} from "@shared/schema";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  GripVertical, 
  Plus, 
  Edit, 
  Trash2, 
  X,
  Eye,
  Home,
  Users,
  Calendar,
  Clipboard,
  Settings,
  BarChart,
  Package,
  MessageSquare,
  FileText,
  Users2,
  Wrench,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  BookOpen,
  Briefcase,
  Clock,
  Bell,
  CheckSquare,
  HelpCircle,
  Award,
  Coffee
} from "lucide-react";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";

// Icon options for selection
const lucideIconOptions = [
  { value: "Home", label: "Home" },
  { value: "Users", label: "Users" },
  { value: "Calendar", label: "Calendar" },
  { value: "Clipboard", label: "Clipboard" },
  { value: "Settings", label: "Settings" },
  { value: "BarChart", label: "BarChart" },
  { value: "Package", label: "Package" },
  { value: "MessageSquare", label: "MessageSquare" },
  { value: "FileText", label: "FileText" },
  { value: "Users2", label: "Users2" },
  { value: "Wrench", label: "Wrench" },
  { value: "ShoppingCart", label: "ShoppingCart" },
  { value: "DollarSign", label: "DollarSign" },
  { value: "TrendingUp", label: "TrendingUp" },
  { value: "BookOpen", label: "BookOpen" },
  { value: "Briefcase", label: "Briefcase" },
  { value: "Clock", label: "Clock" },
  { value: "Bell", label: "Bell" },
  { value: "CheckSquare", label: "CheckSquare" },
  { value: "HelpCircle", label: "HelpCircle" },
  { value: "Award", label: "Award" },
  { value: "Coffee", label: "Coffee" },
];

// Role options for visibility rules
const ALL_ROLES = Object.values(UserRole);

// Sortable Section Component
function SortableSection({ 
  section, 
  items,
  onEditSection,
  onDeleteSection,
  onEditItem,
  onDeleteItem,
  onManageVisibility,
  onDragItemEnd,
}: { 
  section: MenuSection; 
  items: MenuItem[];
  onEditSection: (section: MenuSection) => void;
  onDeleteSection: (id: number) => void;
  onEditItem: (item: MenuItem) => void;
  onDeleteItem: (id: number) => void;
  onManageVisibility: (itemId: number) => void;
  onDragItemEnd: (event: DragEndEvent, sectionId: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: section.id 
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <Card ref={setNodeRef} style={style} className="mb-4">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <div className="flex items-center gap-2 flex-1">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing" data-testid={`drag-section-${section.id}`}>
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg">{section.titleTr}</CardTitle>
          <Badge variant="outline" className="text-xs">{section.scope}</Badge>
        </div>
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onEditSection(section)}
            data-testid={`button-section-edit-${section.id}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onDeleteSection(section.id)}
            data-testid={`button-section-delete-${section.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground py-3">Bu bölümde öğe yok</div>
        ) : (
          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragEnd={(e) => onDragItemEnd(e, section.id)}
          >
            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-3 sm:gap-4">
                {items.map(item => (
                  <SortableItem 
                    key={item.id} 
                    item={item}
                    onEdit={onEditItem}
                    onDelete={onDeleteItem}
                    onManageVisibility={onManageVisibility}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}

// Sortable Item Component
function SortableItem({
  item,
  onEdit,
  onDelete,
  onManageVisibility,
}: {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: number) => void;
  onManageVisibility: (itemId: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: item.id 
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className="flex items-center gap-2 p-3 bg-muted/40 rounded-md"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing" data-testid={`drag-item-${item.id}`}>
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 flex items-center gap-2">
        <span className="text-sm font-medium">{item.titleTr}</span>
        <span className="text-xs text-muted-foreground">{item.path}</span>
        {!item.isActive && <Badge variant="secondary" className="text-xs">Pasif</Badge>}
      </div>
      <div className="flex gap-1">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onManageVisibility(item.id)}
          data-testid={`button-visibility-${item.id}`}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onEdit(item)}
          data-testid={`button-item-edit-${item.id}`}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onDelete(item.id)}
          data-testid={`button-item-delete-${item.id}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function AdminMenuManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isAddSectionDialogOpen, setIsAddSectionDialogOpen] = useState(false);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<MenuSection | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [visibilityItemId, setVisibilityItemId] = useState<number | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const { deleteState: sectionDeleteState, requestDelete: requestSectionDelete, cancelDelete: cancelSectionDelete, confirmDelete: confirmSectionDelete } = useConfirmDelete();
  const { deleteState: itemDeleteState, requestDelete: requestItemDelete, cancelDelete: cancelItemDelete, confirmDelete: confirmItemDelete } = useConfirmDelete();
  const { deleteState: ruleDeleteState, requestDelete: requestRuleDelete, cancelDelete: cancelRuleDelete, confirmDelete: confirmRuleDelete } = useConfirmDelete();

  // TanStack Query - Fetch all menu data
  const { data: menuData, isLoading, isError, refetch } = useQuery<{
    sections: MenuSection[];
    items: MenuItem[];
    rules: MenuVisibilityRule[];
  }>({
    queryKey: ["/api/admin/menu"],
  });

  const sections = menuData?.sections || [];
  const items = menuData?.items || [];
  const rules = menuData?.rules || [];

  // Fetch users for user search (only when searching)
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users", userSearchQuery],
    enabled: userSearchQuery.length >= 2,
  });

  // Fetch branches for branch selector
  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  // Sensors for drag-drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Section Form
  const sectionForm = useForm<InsertMenuSection>({
    resolver: zodResolver(insertMenuSectionSchema),
    defaultValues: {
      slug: "",
      titleTr: "",
      scope: "both",
      icon: "",
      sortOrder: 0,
    },
  });

  // Item Form
  const itemForm = useForm<InsertMenuItem>({
    resolver: zodResolver(insertMenuItemSchema),
    defaultValues: {
      sectionId: 0,
      titleTr: "",
      path: "",
      icon: "",
      moduleKey: "",
      scope: "both",
      sortOrder: 0,
      isActive: true,
    },
  });

  // Extended schema for visibility rule form (supports multi-role selection)
  const visibilityRuleFormSchema = z.object({
    ruleType: z.enum(["role", "user", "branch"]),
    roles: z.array(z.string()).optional(),
    userId: z.string().optional(),
    branchId: z.number().optional(),
    allow: z.boolean(),
  });

  // Visibility Rule Form
  const ruleForm = useForm<z.infer<typeof visibilityRuleFormSchema>>({
    resolver: zodResolver(visibilityRuleFormSchema),
    defaultValues: {
      ruleType: "role",
      roles: [],
      userId: "",
      branchId: undefined,
      allow: true,
    },
  });

  const ruleType = ruleForm.watch("ruleType");

  // ===== MUTATIONS =====

  // Section Mutations
  const createSectionMutation = useMutation({
    mutationFn: (data: InsertMenuSection) => apiRequest("POST", "/api/admin/menu/sections", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menu"] });
      invalidateMenuCache();
      toast({ title: "Başarılı", description: "Bölüm oluşturuldu" });
      setIsAddSectionDialogOpen(false);
      sectionForm.reset();
    },
    onError: () => {
      toast({ title: "Hata", description: "Bölüm oluşturulamadı", variant: "destructive" });
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertMenuSection> }) => 
      apiRequest("PATCH", `/api/admin/menu/sections/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menu"] });
      invalidateMenuCache();
      toast({ title: "Başarılı", description: "Bölüm güncellendi" });
      setEditingSection(null);
      sectionForm.reset();
    },
    onError: () => {
      toast({ title: "Hata", description: "Bölüm güncellenemedi", variant: "destructive" });
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/menu/sections/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menu"] });
      invalidateMenuCache();
      toast({ title: "Başarılı", description: "Bölüm silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Bölüm silinemedi", variant: "destructive" });
    },
  });

  const reorderSectionsMutation = useMutation({
    mutationFn: (sectionIds: number[]) => 
      apiRequest("PATCH", "/api/admin/menu/sections/order", { sectionIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menu"] });
      invalidateMenuCache();
    },
    onError: () => {
      toast({ title: "Hata", description: "Sıralama güncellenemedi", variant: "destructive" });
    },
  });

  // Item Mutations
  const createItemMutation = useMutation({
    mutationFn: (data: InsertMenuItem) => apiRequest("POST", "/api/admin/menu/items", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menu"] });
      invalidateMenuCache();
      toast({ title: "Başarılı", description: "Öğe oluşturuldu" });
      setIsAddItemDialogOpen(false);
      itemForm.reset();
    },
    onError: () => {
      toast({ title: "Hata", description: "Öğe oluşturulamadı", variant: "destructive" });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertMenuItem> }) => 
      apiRequest("PATCH", `/api/admin/menu/items/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menu"] });
      invalidateMenuCache();
      toast({ title: "Başarılı", description: "Öğe güncellendi" });
      setEditingItem(null);
      itemForm.reset();
    },
    onError: () => {
      toast({ title: "Hata", description: "Öğe güncellenemedi", variant: "destructive" });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/menu/items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menu"] });
      invalidateMenuCache();
      toast({ title: "Başarılı", description: "Öğe silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Öğe silinemedi", variant: "destructive" });
    },
  });

  const reorderItemsMutation = useMutation({
    mutationFn: (itemIds: number[]) => 
      apiRequest("PATCH", "/api/admin/menu/items/order", { itemIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menu"] });
      invalidateMenuCache();
    },
    onError: () => {
      toast({ title: "Hata", description: "Sıralama güncellenemedi", variant: "destructive" });
    },
  });

  // Visibility Rule Mutations
  const createRuleMutation = useMutation({
    mutationFn: (data: InsertMenuVisibilityRule) => 
      apiRequest("POST", "/api/admin/menu/visibility-rules", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menu"] });
      invalidateMenuCache();
      toast({ title: "Başarılı", description: "Kural eklendi" });
      ruleForm.reset();
    },
    onError: () => {
      toast({ title: "Hata", description: "Kural eklenemedi", variant: "destructive" });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/menu/visibility-rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menu"] });
      invalidateMenuCache();
      toast({ title: "Başarılı", description: "Kural silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Kural silinemedi", variant: "destructive" });
    },
  });

  // ===== HANDLERS =====

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id && over?.id) {
      const oldIndex = sections.findIndex(s => s.id === active.id);
      const newIndex = sections.findIndex(s => s.id === over.id);
      const newSections = arrayMove(sections, oldIndex, newIndex);
      const sectionIds = newSections.map(s => s.id);
      reorderSectionsMutation.mutate(sectionIds);
    }
  };

  const handleItemDragEnd = (event: DragEndEvent, sectionId: number) => {
    const { active, over } = event;
    if (active.id !== over?.id && over?.id) {
      const sectionItems = items.filter(i => i.sectionId === sectionId);
      const oldIndex = sectionItems.findIndex(i => i.id === active.id);
      const newIndex = sectionItems.findIndex(i => i.id === over.id);
      const newItems = arrayMove(sectionItems, oldIndex, newIndex);
      const itemIds = newItems.map(i => i.id);
      reorderItemsMutation.mutate(itemIds);
    }
  };

  const onSectionSubmit = (data: InsertMenuSection) => {
    if (editingSection) {
      updateSectionMutation.mutate({ id: editingSection.id, data });
    } else {
      createSectionMutation.mutate(data);
    }
  };

  const onItemSubmit = (data: InsertMenuItem) => {
    if (editingItem) {
      updateItemMutation.mutate({ id: editingItem.id, data });
    } else {
      createItemMutation.mutate(data);
    }
  };

  const onRuleSubmit = (data: z.infer<typeof visibilityRuleFormSchema>) => {
    if (!visibilityItemId) return;

    if (data.ruleType === 'role' && data.roles && data.roles.length > 0) {
      data.roles.forEach((role: string) => {
        createRuleMutation.mutate({
          menuItemId: visibilityItemId,
          ruleType: 'role',
          role,
          userId: null,
          branchId: data.branchId || null,
          allow: data.allow,
        });
      });
      toast({ title: "Başarılı", description: `${data.roles.length} rol kuralı eklendi` });
      ruleForm.reset({ ruleType: "role", roles: [], allow: true });
    } else if (data.ruleType === 'user' && data.userId) {
      createRuleMutation.mutate({
        menuItemId: visibilityItemId,
        ruleType: 'user',
        role: null,
        userId: data.userId,
        branchId: data.branchId || null,
        allow: data.allow,
      });
    } else if (data.ruleType === 'branch' && data.branchId) {
      createRuleMutation.mutate({
        menuItemId: visibilityItemId,
        ruleType: 'branch',
        role: null,
        userId: null,
        branchId: data.branchId,
        allow: data.allow,
      });
    }
  };

  const handleEditSection = (section: MenuSection) => {
    setEditingSection(section);
    sectionForm.reset({
      slug: section.slug,
      titleTr: section.titleTr,
      scope: section.scope,
      icon: section.icon || "",
      sortOrder: section.sortOrder,
    });
    setIsAddSectionDialogOpen(true);
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    itemForm.reset({
      sectionId: item.sectionId,
      titleTr: item.titleTr,
      path: item.path,
      icon: item.icon || "",
      moduleKey: item.moduleKey || "",
      scope: item.scope,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });
    setIsAddItemDialogOpen(true);
  };

  const handleCloseSection = () => {
    setIsAddSectionDialogOpen(false);
    setEditingSection(null);
    sectionForm.reset();
  };

  const handleCloseItem = () => {
    setIsAddItemDialogOpen(false);
    setEditingItem(null);
    itemForm.reset();
  };

  const currentRules = visibilityItemId ? rules.filter(r => r.menuItemId === visibilityItemId) : [];

  if (!user || !isHQRole(user.role as any)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="p-6">
          <h2 className="text-xl font-bold">Yetkisiz Erişim</h2>
          <p className="text-muted-foreground">Bu sayfaya erişim yetkiniz yok.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 flex flex-col gap-3 sm:gap-4">
      <div className="flex justify-between items-center flex-wrap gap-2 sm:gap-3">
        <h1 className="text-3xl font-bold">Menü Yönetimi</h1>
        <div className="flex gap-2">
          <Button 
            onClick={() => {
              setEditingSection(null);
              sectionForm.reset();
              setIsAddSectionDialogOpen(true);
            }}
            data-testid="button-section-add"
          >
            <Plus className="h-4 w-4 mr-1" />
            Bölüm Ekle
          </Button>
          <Button 
            onClick={() => {
              setEditingItem(null);
              itemForm.reset();
              setIsAddItemDialogOpen(true);
            }}
            data-testid="button-item-add"
          >
            <Plus className="h-4 w-4 mr-1" />
            Öğe Ekle
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="w-full space-y-2 sm:space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : sections.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Henüz menü bölümü eklenmemiş. Başlamak için "Bölüm Ekle" butonuna tıklayın.</p>
        </Card>
      ) : (
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCenter} 
          onDragEnd={handleSectionDragEnd}
        >
          <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
            {sections.map(section => (
              <SortableSection 
                key={section.id} 
                section={section} 
                items={items.filter(i => i.sectionId === section.id).sort((a, b) => a.sortOrder - b.sortOrder)}
                onEditSection={handleEditSection}
                onDeleteSection={(id) => {
                  const section = sections.find(s => s.id === id);
                  requestSectionDelete(id, section?.titleTr || "Bölüm");
                }}
                onEditItem={handleEditItem}
                onDeleteItem={(id) => {
                  const item = items.find(i => i.id === id);
                  requestItemDelete(id, item?.titleTr || "Öğe");
                }}
                onManageVisibility={(itemId) => {
                  setVisibilityItemId(itemId);
                  ruleForm.reset({
                    ruleType: "role",
                    roles: [],
                    userId: "",
                    branchId: undefined,
                    allow: true,
                  });
                }}
                onDragItemEnd={handleItemDragEnd}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {/* Section Add/Edit Dialog */}
      <Dialog open={isAddSectionDialogOpen} onOpenChange={handleCloseSection}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSection ? "Bölümü Düzenle" : "Yeni Bölüm Ekle"}
            </DialogTitle>
          </DialogHeader>
          <Form {...sectionForm}>
            <form onSubmit={sectionForm.handleSubmit(onSectionSubmit)} className="w-full space-y-2 sm:space-y-3">
              <FormField
                control={sectionForm.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="gorevler" data-testid="input-section-slug" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={sectionForm.control}
                name="titleTr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Başlık (TR)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Görevler" data-testid="input-section-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={sectionForm.control}
                name="scope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kapsam</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-section-scope">
                          <SelectValue placeholder="Kapsam seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="hq">Merkez</SelectItem>
                        <SelectItem value="branch">Şube</SelectItem>
                        <SelectItem value="both">Her İkisi</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={sectionForm.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>İkon</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-section-icon">
                          <SelectValue placeholder="İkon seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {lucideIconOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={sectionForm.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sıra</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCloseSection}>
                  İptal
                </Button>
                <Button 
                  type="submit" 
                  data-testid="button-section-save"
                  disabled={createSectionMutation.isPending || updateSectionMutation.isPending}
                >
                  {createSectionMutation.isPending || updateSectionMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Item Add/Edit Dialog */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={handleCloseItem}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Öğeyi Düzenle" : "Yeni Öğe Ekle"}
            </DialogTitle>
          </DialogHeader>
          <Form {...itemForm}>
            <form onSubmit={itemForm.handleSubmit(onItemSubmit)} className="w-full space-y-2 sm:space-y-3">
              <FormField
                control={itemForm.control}
                name="sectionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bölüm</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-item-section">
                          <SelectValue placeholder="Bölüm seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sections.map(section => (
                          <SelectItem key={section.id} value={section.id.toString()}>
                            {section.titleTr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={itemForm.control}
                name="titleTr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Başlık (TR)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Görev Listesi" data-testid="input-item-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={itemForm.control}
                name="path"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Yol (Path)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="/gorevler" data-testid="input-item-path" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={itemForm.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>İkon</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-item-icon">
                          <SelectValue placeholder="İkon seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {lucideIconOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={itemForm.control}
                name="moduleKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modül Anahtarı (Opsiyonel)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="tasks" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={itemForm.control}
                name="scope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kapsam</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Kapsam seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="hq">Merkez</SelectItem>
                        <SelectItem value="branch">Şube</SelectItem>
                        <SelectItem value="both">Her İkisi</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={itemForm.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sıra</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={itemForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <FormLabel>Aktif</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCloseItem}>
                  İptal
                </Button>
                <Button 
                  type="submit" 
                  data-testid="button-item-save"
                  disabled={createItemMutation.isPending || updateItemMutation.isPending}
                >
                  {createItemMutation.isPending || updateItemMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Visibility Rules Dialog */}
      <Dialog open={!!visibilityItemId} onOpenChange={() => {
        setVisibilityItemId(null);
        setUserSearchQuery("");
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Görünürlük Kuralları</DialogTitle>
            <DialogDescription>
              Bu menü öğesinin hangi rollere/kullanıcılara görüneceğini ayarlayın
            </DialogDescription>
          </DialogHeader>
          
          <div className="w-full space-y-2 sm:space-y-3">
            {/* Existing Rules */}
            <div>
              <h3 className="text-sm font-medium mb-2">Mevcut Kurallar</h3>
              {currentRules.length === 0 ? (
                <div className="text-sm text-muted-foreground py-2" data-testid="text-no-rules">Henüz kural eklenmemiş</div>
              ) : (
                <div className="flex flex-col gap-3 sm:gap-4">
                  {currentRules.map(rule => (
                    <div key={rule.id} className="flex items-center justify-between p-2 bg-muted/40 rounded-md" data-testid={`rule-${rule.id}`}>
                      <div className="flex items-center gap-2">
                        <Badge variant={rule.allow ? "default" : "secondary"}>
                          {rule.allow ? "İzin Ver" : "Reddet"}
                        </Badge>
                        <span className="text-sm">
                          {rule.ruleType === 'role' && `Rol: ${ROLE_LABELS[rule.role || ''] || rule.role}`}
                          {rule.ruleType === 'user' && `Kullanıcı ID: ${rule.userId}`}
                          {rule.ruleType === 'branch' && `Şube ID: ${rule.branchId}`}
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => requestRuleDelete(rule.id, "Kural")}
                        data-testid={`button-delete-rule-${rule.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Rule Form */}
            <div>
              <h3 className="text-sm font-medium mb-2">Yeni Kural Ekle</h3>
              <Form {...ruleForm}>
                <form onSubmit={ruleForm.handleSubmit(onRuleSubmit)} className="w-full space-y-2 sm:space-y-3">
                  <FormField
                    control={ruleForm.control}
                    name="ruleType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kural Tipi</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-rule-type">
                              <SelectValue placeholder="Kural tipi seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="role">Rol</SelectItem>
                            <SelectItem value="user">Kullanıcı</SelectItem>
                            <SelectItem value="branch">Şube</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {ruleType === "role" && (
                    <>
                      <FormField
                        control={ruleForm.control}
                        name="roles"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Roller (Çoklu Seçim)</FormLabel>
                            <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto border rounded-md p-3">
                              {ALL_ROLES.map(role => (
                                <div key={role} className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={field.value?.includes(role)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      field.onChange(
                                        checked
                                          ? [...current, role]
                                          : current.filter(r => r !== role)
                                      );
                                    }}
                                    data-testid={`checkbox-role-${role}`}
                                  />
                                  <label className="text-sm cursor-pointer" onClick={() => {
                                    const current = field.value || [];
                                    const isChecked = current.includes(role);
                                    field.onChange(
                                      isChecked
                                        ? current.filter(r => r !== role)
                                        : [...current, role]
                                    );
                                  }}>
                                    {ROLE_LABELS[role]}
                                  </label>
                                </div>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={ruleForm.control}
                        name="branchId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Şube (Opsiyonel)</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(value === "all" ? undefined : parseInt(value))}
                              value={field.value?.toString() || "all"}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-branch">
                                  <SelectValue placeholder="Şube seç (tümü)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="all">Tüm Şubeler</SelectItem>
                                {branches?.map(branch => (
                                  <SelectItem key={branch.id} value={branch.id.toString()}>
                                    {branch.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  {ruleType === "user" && (
                    <>
                      <FormItem>
                        <FormLabel>Kullanıcı Ara</FormLabel>
                        <Input
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          placeholder="Ad veya email..."
                          data-testid="input-user-search"
                        />
                        {userSearchQuery.length > 0 && userSearchQuery.length < 2 && (
                          <p className="text-xs text-muted-foreground">En az 2 karakter girin</p>
                        )}
                      </FormItem>
                      {users && users.length > 0 && (
                        <FormField
                          control={ruleForm.control}
                          name="userId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Kullanıcı Seç</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-user">
                                    <SelectValue placeholder="Kullanıcı seç" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {users.map(user => (
                                    <SelectItem key={user.id} value={user.id}>
                                      {user.firstName} {user.lastName} ({user.email || user.username})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      <FormField
                        control={ruleForm.control}
                        name="branchId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Şube (Opsiyonel)</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(value === "all" ? undefined : parseInt(value))}
                              value={field.value?.toString() || "all"}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-branch">
                                  <SelectValue placeholder="Şube seç (tümü)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="all">Tüm Şubeler</SelectItem>
                                {branches?.map(branch => (
                                  <SelectItem key={branch.id} value={branch.id.toString()}>
                                    {branch.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  {ruleType === "branch" && (
                    <FormField
                      control={ruleForm.control}
                      name="branchId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Şube</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                            value={field.value?.toString() || ""}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-branch">
                                <SelectValue placeholder="Şube seç" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {branches?.map(branch => (
                                <SelectItem key={branch.id} value={branch.id.toString()}>
                                  {branch.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={ruleForm.control}
                    name="allow"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-md border p-3">
                        <div>
                          <FormLabel>İzin Ver</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-allow"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={createRuleMutation.isPending}
                      data-testid="button-add-rule"
                    >
                      {createRuleMutation.isPending ? "Ekleniyor..." : "Kural Ekle"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={sectionDeleteState.open}
        onOpenChange={(open) => !open && cancelSectionDelete()}
        onConfirm={() => {
          const id = confirmSectionDelete();
          if (id !== null) deleteSectionMutation.mutate(id as number);
        }}
        title="Bölümü Sil"
        description={`"${sectionDeleteState.itemName || ''}" bölümünü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
      />

      <ConfirmDeleteDialog
        open={itemDeleteState.open}
        onOpenChange={(open) => !open && cancelItemDelete()}
        onConfirm={() => {
          const id = confirmItemDelete();
          if (id !== null) deleteItemMutation.mutate(id as number);
        }}
        title="Öğeyi Sil"
        description={`"${itemDeleteState.itemName || ''}" öğesini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
      />

      <ConfirmDeleteDialog
        open={ruleDeleteState.open}
        onOpenChange={(open) => !open && cancelRuleDelete()}
        onConfirm={() => {
          const id = confirmRuleDelete();
          if (id !== null) deleteRuleMutation.mutate(id as number);
        }}
        title="Kuralı Sil"
        description="Bu kuralı silmek istediğinize emin misiniz?"
      />
    </div>
  );
}
