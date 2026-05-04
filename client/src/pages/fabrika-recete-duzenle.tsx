import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft, Save, Plus, Trash2, Lock, Unlock, GripVertical,
  ChevronsUpDown, Check, AlertTriangle, Pencil, Upload, FileSpreadsheet, Download, Undo2, History,
  Calculator, RefreshCw, ChevronDown, ChevronRight, Link2, Unlink, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { canonicalIngredientName } from "@shared/lib/ingredient-canonical";

type IngredientNameOption = { name: string; hasNutrition: boolean };

const CATEGORIES = [
  { value: "cookie", label: "Kurabiye" },
  { value: "cinnamon_roll", label: "Cinnamon Roll" },
  { value: "donut", label: "Donut" },
  { value: "borek_pogaca", label: "Börek/Poğaça" },
  { value: "kek_pasta", label: "Kek/Pasta" },
  { value: "tuzlu_hamur", label: "Tuzlu Hamur İşi" },
  { value: "konsantre", label: "Konsantre" },
  { value: "cikolata_toz", label: "Çikolata Toz" },
  { value: "baz_toz_surup", label: "Baz Toz/Şurup" },
  { value: "ozel_karisim", label: "Özel Karışım" },
];

const OUTPUT_TYPES = [
  { value: "mamul", label: "Mamül (Bitmiş Ürün)" },
  { value: "yari_mamul", label: "Yarı Mamül" },
];

export default function FabrikaReceteDuzenle() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isNew = !id || id === "yeni";

  // P7.2 (29 Nis 2026 — pilot rol matrisi):
  //   - ceo (Aslan) reçete tam yetkili (RECIPE_EDIT_ROLES'a EKLENDİ)
  //   - sef (Ümit) reçete editleyemez (RECIPE_EDIT_ROLES'tan ÇIKARILDI)
  //   - gida_muhendisi (Sema) sadece besin/alerjen/TGK alanlarını düzenler
  //     → sayfaya erişebilir ama temel reçete alanları salt-okunur
  //   - fabrika_mudur (Eren) görür ama düzenleyemez
  const canEdit = ["admin", "recete_gm", "ceo"].includes(user?.role || "");
  // Task #184 + P7.2 + TGK-340: gida_muhendisi besin/alerjen/TGK düzenleyebilir.
  const canEditNutrition = ["admin", "gida_muhendisi", "recete_gm", "ceo"].includes(user?.role || "");
  // TGK-340 fix: gida_muhendisi sayfaya girebilmeli (TGK kartı için) — tam yetki olmadan
  if (!canEdit && !canEditNutrition) {
    return <div className="p-8 text-center"><p>Düzenleme yetkiniz yok</p></div>;
  }

  const [form, setForm] = useState({
    name: "", code: "", description: "", category: "cookie",
    outputType: "mamul", baseBatchOutput: 1, outputUnit: "adet",
    totalWeightGrams: 0, prepTimeMinutes: 0, productionTimeMinutes: 0,
    cleaningTimeMinutes: 0, requiredWorkers: 1, equipmentKwh: 0,
    waterConsumptionLt: 0, expectedOutputCount: 0, expectedUnitWeight: 0,
    expectedWasteKg: 0, expectedLossGrams: 0, wasteTolerance: 5,
    recipeType: "OPEN", technicalNotes: "", bakersPercentage: "",
    equipmentDescription: "",
    storageConditions: "", manufacturerInfo: "", shelfLifeDays: "" as string | number,
  });
  const [tgkAllergens, setTgkAllergens] = useState<string[]>([]);

  const [ingredients, setIngredients] = useState<any[]>([]);
  const [steps, setSteps] = useState<any[]>([]);
  const [newIngredient, setNewIngredient] = useState({ refId: "", name: "", amount: "", unit: "gr", category: "ana", type: "normal" });
  const [newStep, setNewStep] = useState({ title: "", content: "", timerSeconds: "", tips: "" });
  const [nameComboOpen, setNameComboOpen] = useState(false);
  const [confirmNewName, setConfirmNewName] = useState<string | null>(null);

  // R-5A: Malzeme/Adım düzenle-sil dialog state'leri
  const [editIngredient, setEditIngredient] = useState<any | null>(null);
  const [deleteIngredient, setDeleteIngredient] = useState<any | null>(null);
  const [editStep, setEditStep] = useState<any | null>(null);
  const [deleteStep, setDeleteStep] = useState<any | null>(null);

  // Hammadde değiştirme: arama metni + lokal seçim id'si.
  // editIngredient.rawMaterialId zaten ing'den geldiği için onu doğrudan kullanıyoruz,
  // ama tip uniformluğu için string'e çeviriyoruz.
  const [inventorySearch, setInventorySearch] = useState("");

  // Modal her açıldığında arama kutusunu sıfırla
  useEffect(() => {
    if (editIngredient) {
      setInventorySearch("");
    }
  }, [editIngredient?.id]);

  // R-5B: Maliyet hesaplama state'leri
  const [costResult, setCostResult] = useState<any | null>(null);
  const [missingExpanded, setMissingExpanded] = useState(false);

  // Task #152: Onay diyalogunda isteğe bağlı besin değer + alerjen formu
  const EMPTY_NUTRITION = {
    energyKcal: "", fatG: "", saturatedFatG: "",
    carbohydrateG: "", sugarG: "", proteinG: "", saltG: "",
  };
  const ALLERGEN_OPTIONS = [
    "gluten", "süt", "yumurta", "soya", "fındık", "yer fıstığı",
    "susam", "kereviz", "hardal", "sülfitler", "yumuşakçalar",
    "kabuklular", "lupin", "balık",
  ];
  const [newNutrition, setNewNutrition] = useState({ ...EMPTY_NUTRITION });
  const [newAllergens, setNewAllergens] = useState<string[]>([]);
  const [existingNutritionLoaded, setExistingNutritionLoaded] = useState(false);
  // Task #165: Mevcut bir malzemenin besin değerlerini düzenleme modu (yeni
  // malzeme eklemeden sadece besin/alerjen güncellemek için).
  const [editNutritionName, setEditNutritionName] = useState<string | null>(null);
  // Task #185: Besin değer değişim geçmişi diyaloğu
  const [historyName, setHistoryName] = useState<string | null>(null);
  const [historyRows, setHistoryRows] = useState<any[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  useEffect(() => {
    if (!historyName) { setHistoryRows(null); return; }
    let cancelled = false;
    setHistoryLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/factory/ingredient-nutrition/${encodeURIComponent(historyName)}/history`,
          { credentials: "include" }
        );
        if (!res.ok) {
          if (!cancelled) setHistoryRows([]);
          return;
        }
        const data = await res.json();
        if (!cancelled) setHistoryRows(Array.isArray(data) ? data : []);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [historyName]);
  const toggleAllergen = (a: string) =>
    setNewAllergens(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  const resetNutritionForm = () => {
    setNewNutrition({ ...EMPTY_NUTRITION });
    setNewAllergens([]);
    setExistingNutritionLoaded(false);
  };

  // Task #165: Onay diyalogu açıldığında mevcut besin değer kaydı varsa
  // input'lara önyükle ki kullanıcı yazım hatasını / değerleri düzeltebilsin.
  const dialogIngredientName = confirmNewName ?? editNutritionName ?? null;
  useEffect(() => {
    if (!dialogIngredientName) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/factory/ingredient-nutrition/${encodeURIComponent(dialogIngredientName)}`,
          { credentials: "include" }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data) {
          const s = (v: unknown) => v == null ? "" : String(v);
          setNewNutrition({
            energyKcal: s(data.energyKcal),
            fatG: s(data.fatG),
            saturatedFatG: s(data.saturatedFatG),
            carbohydrateG: s(data.carbohydrateG),
            sugarG: s(data.sugarG),
            proteinG: s(data.proteinG),
            saltG: s(data.saltG),
          });
          setNewAllergens(Array.isArray(data.allergens) ? data.allergens : []);
          setExistingNutritionLoaded(true);
        } else {
          setExistingNutritionLoaded(false);
        }
      } catch {
        // sessizce yoksay — yine de boş formla devam edilebilir
      }
    })();
    return () => { cancelled = true; };
  }, [dialogIngredientName]);

  // Task #160: Bulk import state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkParseError, setBulkParseError] = useState<string | null>(null);
  const [bulkUnknown, setBulkUnknown] = useState<string[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Task #182: Son içe aktarma snapshot bilgisi (geri al butonu)
  const { data: latestSnapshot } = useQuery<{
    id: number; ingredientCount: number; reason: string | null;
    createdBy: string | null; createdAt: string; restoredAt: string | null;
  } | null>({
    queryKey: ["/api/factory/recipes", id, "ingredients/snapshots/latest"],
    enabled: !isNew && !!id,
  });
  const [confirmUndo, setConfirmUndo] = useState(false);

  // R-5C: Reçete alerjen + ingredient bazlı alerjen verisi
  // Backend: GET /api/quality/allergens/recipes/:id (mevcut, factory-allergens.ts)
  const { data: allergenData } = useQuery<{
    allergens: string[];
    isVerified: boolean;
    verificationReason: string | null;
    matchedCount: number;
    ingredientCount: number;
    ingredients: Array<{ name: string; allergens: string[]; matched: boolean }>;
  }>({
    queryKey: ["/api/quality/allergens/recipes", id],
    enabled: !isNew && !!id,
  });

  // İsim → alerjen[] map (ingredient satırında hızlı erişim)
  const ingredientAllergenMap = (() => {
    const m = new Map<string, string[]>();
    if (allergenData?.ingredients) {
      for (const ing of allergenData.ingredients) {
        if (ing.matched && ing.allergens?.length) {
          m.set(ing.name.toLowerCase().trim(), ing.allergens);
        }
      }
    }
    return m;
  })();

  // Task #194: Yedek geçmişi diyalogu
  type SnapshotRow = {
    id: number; ingredientCount: number; reason: string | null;
    createdBy: string | null; createdAt: string; restoredAt: string | null;
    createdByFirstName: string | null; createdByLastName: string | null;
    createdByEmail: string | null;
  };
  // P7.2: ceo (Aslan) snapshot yönetimi yapabilir.
  const canManageSnapshots = ["admin", "recete_gm", "ceo"].includes(user?.role || "");
  const [historyOpen, setHistoryOpen] = useState(false);
  const { data: snapshotHistory = [], isLoading: snapshotHistoryLoading } = useQuery<SnapshotRow[]>({
    queryKey: ["/api/factory/recipes", id, "ingredients/snapshots"],
    enabled: !isNew && !!id && historyOpen,
  });
  const [restoreTarget, setRestoreTarget] = useState<SnapshotRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SnapshotRow | null>(null);
  const [confirmCleanup, setConfirmCleanup] = useState(false);
  const [cleanupDays, setCleanupDays] = useState(30);

  const restoreSpecificMutation = useMutation({
    mutationFn: async (snap: SnapshotRow) => {
      const res = await apiRequest(
        "POST",
        `/api/factory/recipes/${id}/ingredients/snapshots/${snap.id}/restore`,
      );
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/factory/recipes", id] });
      qc.invalidateQueries({ queryKey: ["/api/factory/recipes", id, "ingredients/snapshots"] });
      qc.invalidateQueries({ queryKey: ["/api/factory/recipes", id, "ingredients/snapshots/latest"] });
      toast({ title: "Geri yüklendi", description: `${data?.restoredCount ?? 0} malzeme önceki haline döndürüldü` });
      setRestoreTarget(null);
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err?.message || "Geri yükleme başarısız", variant: "destructive" });
    },
  });

  const deleteSnapshotMutation = useMutation({
    mutationFn: async (snap: SnapshotRow) => {
      const res = await apiRequest(
        "DELETE",
        `/api/factory/recipes/${id}/ingredients/snapshots/${snap.id}`,
      );
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/factory/recipes", id, "ingredients/snapshots"] });
      qc.invalidateQueries({ queryKey: ["/api/factory/recipes", id, "ingredients/snapshots/latest"] });
      toast({ title: "Yedek silindi" });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err?.message || "Silme başarısız", variant: "destructive" });
    },
  });

  const cleanupMutation = useMutation({
    mutationFn: async (days: number) => {
      const res = await apiRequest(
        "POST",
        `/api/factory/recipes/${id}/ingredients/snapshots/cleanup`,
        { olderThanDays: days },
      );
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/factory/recipes", id, "ingredients/snapshots"] });
      qc.invalidateQueries({ queryKey: ["/api/factory/recipes", id, "ingredients/snapshots/latest"] });
      toast({ title: "Temizlendi", description: `${data?.deleted ?? 0} eski yedek silindi` });
      setConfirmCleanup(false);
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err?.message || "Temizlik başarısız", variant: "destructive" });
    },
  });

  // Inventory list for the ingredient-edit modal. Backend /api/inventory uses
  // Drizzle like() which is case-sensitive, so we fetch once and filter client
  // side with TR locale + diacritic stripping.
  const { data: inventoryItems = [], isFetching: inventoryFetching } = useQuery<any[]>({
    queryKey: ["/api/inventory", "all-active"],
    queryFn: async () => {
      const res = await fetch(`/api/inventory`, { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!editIngredient,
    staleTime: 5 * 60 * 1000,
  });

  const filteredInventoryItems = useMemo(() => {
    const q = inventorySearch.trim();
    if (q.length < 2) return [];
    const norm = (s: string) =>
      s.toLocaleLowerCase("tr").normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    const nq = norm(q);
    return inventoryItems
      .filter((it: any) => norm(it.name || "").includes(nq) || norm(it.code || "").includes(nq))
      .slice(0, 30);
  }, [inventoryItems, inventorySearch]);

  // ─────────────────────────────────────────────────────────
  // R-5A: Malzeme + Adım Düzenle/Sil Mutations
  // Backend: server/routes/factory-recipes.ts (commit d631ed2)
  // - PATCH /api/factory/recipes/:recipeId/ingredients/:id
  // - DELETE /api/factory/recipes/:recipeId/ingredients/:id
  // - PATCH /api/factory/recipes/:recipeId/steps/:id
  // - DELETE /api/factory/recipes/:recipeId/steps/:id
  // ─────────────────────────────────────────────────────────
  const editIngredientMutation = useMutation({
    mutationFn: async (payload: { ingredientId: number; data: any }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/factory/recipes/${id}/ingredients/${payload.ingredientId}`,
        payload.data,
      );
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/factory/recipes", id] });
      toast({ title: "Güncellendi", description: "Malzeme düzenlendi" });
      setEditIngredient(null);
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err?.message || "Düzenleme başarısız", variant: "destructive" });
    },
  });

  const deleteIngredientMutation = useMutation({
    mutationFn: async (ingredientId: number) => {
      const res = await apiRequest(
        "DELETE",
        `/api/factory/recipes/${id}/ingredients/${ingredientId}`,
      );
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/factory/recipes", id] });
      toast({ title: "Silindi", description: "Malzeme silindi" });
      setDeleteIngredient(null);
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err?.message || "Silme başarısız", variant: "destructive" });
    },
  });

  const editStepMutation = useMutation({
    mutationFn: async (payload: { stepId: number; data: any }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/factory/recipes/${id}/steps/${payload.stepId}`,
        payload.data,
      );
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/factory/recipes", id] });
      toast({ title: "Güncellendi", description: "Adım düzenlendi" });
      setEditStep(null);
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err?.message || "Düzenleme başarısız", variant: "destructive" });
    },
  });

  const deleteStepMutation = useMutation({
    mutationFn: async (stepId: number) => {
      const res = await apiRequest(
        "DELETE",
        `/api/factory/recipes/${id}/steps/${stepId}`,
      );
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/factory/recipes", id] });
      toast({ title: "Silindi", description: "Adım silindi" });
      setDeleteStep(null);
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err?.message || "Silme başarısız", variant: "destructive" });
    },
  });

  // R-5B: Maliyet hesaplama (recalc-cost)
  // Backend: POST /api/factory/recipes/:id/recalc-cost (commit 4716ebb)
  // Yetki: admin, recete_gm, sef, gida_muhendisi, ceo
  const recalcCostMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/factory/recipes/${id}/recalc-cost`,
      );
      return await res.json();
    },
    onSuccess: (data: any) => {
      setCostResult(data);
      qc.invalidateQueries({ queryKey: ["/api/factory/recipes", id] });
      const cov = data?.coverage?.percent ?? 0;
      const desc = cov < 100
        ? `Birim maliyet: ${data?.costs?.unitCost} TL (kapsam %${Math.round(cov)})`
        : `Birim maliyet: ${data?.costs?.unitCost} TL (tam kapsam)`;
      toast({ title: "Maliyet hesaplandı", description: desc });
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err?.message || "Maliyet hesaplanamadı", variant: "destructive" });
    },
  });

  // TGK-340: Besin değeri hesaplama (pilot)
  const [calcNutrResult, setCalcNutrResult] = useState<any | null>(null);
  const calcNutritionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/factory/recipes/${id}/calculate-nutrition`,
      );
      return await res.json();
    },
    onSuccess: (data: any) => {
      setCalcNutrResult(data);
      qc.invalidateQueries({ queryKey: ["/api/factory/recipes", id] });
      toast({ title: "Besin değerleri hesaplandı", description: `${data?.ingredientCount ?? 0} malzeme kullanıldı` });
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err?.message || "Hesaplama başarısız", variant: "destructive" });
    },
  });

  const undoMutation = useMutation({
    mutationFn: async () => {
      if (!latestSnapshot) throw new Error("Snapshot yok");
      const res = await apiRequest(
        "POST",
        `/api/factory/recipes/${id}/ingredients/snapshots/${latestSnapshot.id}/restore`,
      );
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/factory/recipes", id] });
      qc.invalidateQueries({ queryKey: ["/api/factory/recipes", id, "ingredients/snapshots/latest"] });
      toast({
        title: "Geri alındı",
        description: `${data?.restoredCount ?? 0} malzeme önceki haline döndürüldü`,
      });
      setConfirmUndo(false);
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err?.message || "Geri alma başarısız", variant: "destructive" });
    },
  });

  // Task #193: Adımlar için son içe aktarma snapshot bilgisi (geri al butonu)
  const { data: latestStepSnapshot } = useQuery<{
    id: number; stepCount: number; reason: string | null;
    createdBy: string | null; createdAt: string; restoredAt: string | null;
  } | null>({
    queryKey: ["/api/factory/recipes", id, "steps/snapshots/latest"],
    enabled: !isNew && !!id,
  });
  const [confirmStepUndo, setConfirmStepUndo] = useState(false);
  const undoStepsMutation = useMutation({
    mutationFn: async () => {
      if (!latestStepSnapshot) throw new Error("Snapshot yok");
      const res = await apiRequest(
        "POST",
        `/api/factory/recipes/${id}/steps/snapshots/${latestStepSnapshot.id}/restore`,
      );
      return res.json();
    },
    onSuccess: (data: { restoredCount?: number } | undefined) => {
      qc.invalidateQueries({ queryKey: ["/api/factory/recipes", id] });
      qc.invalidateQueries({ queryKey: ["/api/factory/recipes", id, "steps/snapshots/latest"] });
      toast({
        title: "Geri alındı",
        description: `${data?.restoredCount ?? 0} adım önceki haline döndürüldü`,
      });
      setConfirmStepUndo(false);
    },
    onError: (err: Error) => {
      toast({ title: "Hata", description: err?.message || "Geri alma başarısız", variant: "destructive" });
    },
  });

  // Task #177: Toplu kayıt sonrası eksik besin değerlerini anında doldurma
  type BulkIngredientPayload = {
    refId: string; name: string; amount: number; unit: string;
    ingredientCategory: string; ingredientType: string;
  };
  type RowNutrition = {
    energyKcal: string; fatG: string; saturatedFatG: string;
    carbohydrateG: string; sugarG: string; proteinG: string; saltG: string;
    allergens: string[];
  };
  const emptyRowNutrition = (): RowNutrition => ({
    energyKcal: "", fatG: "", saturatedFatG: "",
    carbohydrateG: "", sugarG: "", proteinG: "", saltG: "",
    allergens: [],
  });
  const [missingNutritionList, setMissingNutritionList] = useState<string[]>([]);
  const [lastBulkPayload, setLastBulkPayload] = useState<BulkIngredientPayload[] | null>(null);
  const [bulkNutritionRows, setBulkNutritionRows] = useState<Record<string, RowNutrition>>({});
  const [bulkNutritionSubmitting, setBulkNutritionSubmitting] = useState(false);
  const [bulkNutritionError, setBulkNutritionError] = useState<string | null>(null);

  // Kanonik malzeme isim listesi (auto-complete için)
  const { data: ingredientNames = [] } = useQuery<IngredientNameOption[]>({
    queryKey: ["/api/factory/ingredient-names"],
  });

  const isCanonicalName = (raw: string) => {
    const norm = raw.trim().toLocaleLowerCase("tr");
    return ingredientNames.some(o => o.name.toLocaleLowerCase("tr") === norm);
  };

  // Load existing recipe
  const { data: recipe } = useQuery<any>({
    queryKey: ["/api/factory/recipes", id],
    enabled: !isNew,
  });

  useEffect(() => {
    if (recipe) {
      setForm({
        name: recipe.name || "", code: recipe.code || "",
        description: recipe.description || "", category: recipe.category || "cookie",
        outputType: recipe.outputType || recipe.output_type || "mamul",
        baseBatchOutput: recipe.baseBatchOutput || recipe.base_batch_output || 1,
        outputUnit: recipe.outputUnit || recipe.output_unit || "adet",
        totalWeightGrams: recipe.totalWeightGrams || recipe.total_weight_grams || 0,
        prepTimeMinutes: recipe.prepTimeMinutes || recipe.prep_time_minutes || 0,
        productionTimeMinutes: recipe.productionTimeMinutes || recipe.production_time_minutes || 0,
        cleaningTimeMinutes: recipe.cleaningTimeMinutes || recipe.cleaning_time_minutes || 0,
        requiredWorkers: recipe.requiredWorkers || recipe.required_workers || 1,
        equipmentKwh: Number(recipe.equipmentKwh || recipe.equipment_kwh || 0),
        waterConsumptionLt: Number(recipe.waterConsumptionLt || recipe.water_consumption_lt || 0),
        expectedOutputCount: recipe.expectedOutputCount || recipe.expected_output_count || 0,
        expectedUnitWeight: Number(recipe.expectedUnitWeight || recipe.expected_unit_weight || 0),
        expectedWasteKg: Number(recipe.expectedWasteKg || recipe.expected_waste_kg || 0),
        expectedLossGrams: Number(recipe.expectedLossGrams || recipe.expected_loss_grams || 0),
        wasteTolerance: Number(recipe.wasteTolerancePct || recipe.waste_tolerance_pct || 5),
        recipeType: recipe.recipeType || recipe.recipe_type || "OPEN",
        technicalNotes: recipe.technicalNotes || recipe.technical_notes || "",
        bakersPercentage: recipe.bakersPercentage || recipe.bakers_percentage || "",
        equipmentDescription: recipe.equipmentDescription || recipe.equipment_description || "",
        storageConditions: recipe.storageConditions || recipe.storage_conditions || "",
        manufacturerInfo: recipe.manufacturerInfo || recipe.manufacturer_info || "",
        shelfLifeDays: recipe.shelfLifeDays || recipe.shelf_life_days || "",
      });
      if (Array.isArray(recipe.mayContainAllergens)) setTgkAllergens(recipe.mayContainAllergens);
      else if (Array.isArray(recipe.may_contain_allergens)) setTgkAllergens(recipe.may_contain_allergens);
      if (recipe.ingredients) setIngredients(recipe.ingredients);
      if (recipe.steps) setSteps(recipe.steps);
    }
  }, [recipe]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        baseBatchOutput: Number(form.baseBatchOutput),
        totalWeightGrams: Number(form.totalWeightGrams),
        prepTimeMinutes: Number(form.prepTimeMinutes),
        productionTimeMinutes: Number(form.productionTimeMinutes),
        cleaningTimeMinutes: Number(form.cleaningTimeMinutes),
        requiredWorkers: Number(form.requiredWorkers),
        equipmentKwh: String(form.equipmentKwh),
        waterConsumptionLt: String(form.waterConsumptionLt),
        expectedOutputCount: Number(form.expectedOutputCount),
        expectedUnitWeight: String(form.expectedUnitWeight),
        expectedWasteKg: String(form.expectedWasteKg),
        expectedLossGrams: String(form.expectedLossGrams),
        wasteTolerancePct: String(form.wasteTolerance),
        storageConditions: form.storageConditions || null,
        manufacturerInfo: form.manufacturerInfo || null,
        mayContainAllergens: tgkAllergens.length > 0 ? tgkAllergens : null,
        shelfLifeDays: form.shelfLifeDays !== "" ? Number(form.shelfLifeDays) : null,
      };

      if (isNew) {
        return apiRequest("POST", "/api/factory/recipes", payload);
      } else {
        return apiRequest("PATCH", `/api/factory/recipes/${id}`, payload);
      }
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["/api/factory/recipes"] });
      toast({ title: isNew ? "Reçete oluşturuldu" : "Reçete güncellendi" });
      if (isNew && data?.id) navigate(`/fabrika/receteler/${data.id}`);
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const commitAddIngredient = async (withNutrition = false) => {
    if (!id || isNew) return;
    try {
      type NutritionFields = {
        energyKcal: number | null; fatG: number | null; saturatedFatG: number | null;
        carbohydrateG: number | null; sugarG: number | null;
        proteinG: number | null; saltG: number | null;
        allergens: string[];
      };
      type IngredientPayload = {
        refId: string; name: string; amount: number; unit: string;
        ingredientCategory: string; ingredientType: string;
        nutrition?: NutritionFields;
      };
      const payload: IngredientPayload = {
        refId: newIngredient.refId,
        name: newIngredient.name,
        amount: parseFloat(newIngredient.amount),
        unit: newIngredient.unit,
        ingredientCategory: newIngredient.category,
        ingredientType: newIngredient.type,
      };
      if (withNutrition) {
        const numOrNull = (v: string) => v.trim() === "" ? null : Number(v);
        const nutrition = {
          energyKcal: numOrNull(newNutrition.energyKcal),
          fatG: numOrNull(newNutrition.fatG),
          saturatedFatG: numOrNull(newNutrition.saturatedFatG),
          carbohydrateG: numOrNull(newNutrition.carbohydrateG),
          sugarG: numOrNull(newNutrition.sugarG),
          proteinG: numOrNull(newNutrition.proteinG),
          saltG: numOrNull(newNutrition.saltG),
          allergens: newAllergens,
        };
        const hasAny = Object.entries(nutrition).some(([k, v]) =>
          k === "allergens" ? (v as string[]).length > 0 : v != null
        );
        if (hasAny) payload.nutrition = nutrition;
      }
      await apiRequest("POST", `/api/factory/recipes/${id}/ingredients`, payload);
      qc.invalidateQueries({ queryKey: ["/api/factory/recipes", id] });
      qc.invalidateQueries({ queryKey: ["/api/factory/ingredient-names"] });
      setNewIngredient({ refId: "", name: "", amount: "", unit: "gr", category: "ana", type: "normal" });
      setNewNutrition({ ...EMPTY_NUTRITION });
      setNewAllergens([]);
      toast({ title: "Malzeme eklendi" });
    } catch { toast({ title: "Hata", variant: "destructive" }); }
  };

  // ── BULK IMPORT (Excel/CSV) ──────────────────────────────────────────────
  // Beklenen sütunlar (TSV/CSV): refId, name, amount, unit, category?, type?
  // Excel'den yapıştırma genelde TAB ile gelir; CSV virgül/noktalı virgül olabilir.
  type BulkRow = {
    refId: string;
    name: string;
    amount: string;
    unit: string;
    category: string;
    type: string;
    isCanonical: boolean;
    error?: string;
  };

  const detectDelimiter = (sample: string): string => {
    if (sample.includes("\t")) return "\t";
    const semi = (sample.match(/;/g) || []).length;
    const com = (sample.match(/,/g) || []).length;
    return semi > com ? ";" : ",";
  };

  const HEADER_KEYS = ["refid", "ref", "kod", "name", "isim", "malzeme", "ad", "amount", "miktar", "unit", "birim", "category", "kategori", "type", "tip"];
  const looksLikeHeader = (cells: string[]): boolean => {
    return cells.some(c => HEADER_KEYS.includes(c.trim().toLocaleLowerCase("tr")));
  };

  const parseBulk = (text: string): { rows: BulkRow[]; error: string | null } => {
    const trimmed = text.trim();
    if (!trimmed) return { rows: [], error: "Veri boş" };
    const lines = trimmed.split(/\r?\n/).filter(l => l.trim());
    if (lines.length === 0) return { rows: [], error: "Veri boş" };

    const delim = detectDelimiter(lines[0]);
    const split = (line: string) => line.split(delim).map(c => c.trim().replace(/^"(.*)"$/, "$1"));

    let startIdx = 0;
    const firstCells = split(lines[0]);
    if (looksLikeHeader(firstCells)) startIdx = 1;

    const rows: BulkRow[] = [];
    for (let i = startIdx; i < lines.length; i++) {
      const cells = split(lines[i]);
      const refId = cells[0] || "";
      const name = cells[1] || "";
      const amount = cells[2] || "";
      const unit = cells[3] || "gr";
      const category = cells[4] || "ana";
      const type = cells[5] || "normal";

      let error: string | undefined;
      if (!refId) error = "refId eksik";
      else if (!name) error = "isim eksik";
      else if (!amount || isNaN(parseFloat(amount))) error = "miktar geçersiz";

      rows.push({
        refId, name, amount, unit, category, type,
        isCanonical: name ? isCanonicalName(name) : true,
        error,
      });
    }
    return { rows, error: rows.length === 0 ? "Geçerli satır bulunamadı" : null };
  };

  const parsedBulk = parseBulk(bulkText);
  const bulkRows = parsedBulk.rows;
  const bulkRowErrors = bulkRows.filter(r => r.error);
  const bulkUnknownPreview = Array.from(new Set(bulkRows.filter(r => !r.error && !r.isCanonical).map(r => r.name)));

  const handleBulkFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setBulkText(String(reader.result || ""));
      setBulkParseError(null);
      setBulkUnknown([]);
    };
    reader.readAsText(file);
  };

  const submitBulk = async (force: boolean) => {
    if (!id || isNew) return;
    if (bulkRowErrors.length > 0) {
      toast({ title: "Hatalı satırlar var", description: `${bulkRowErrors.length} satırda hata var`, variant: "destructive" });
      return;
    }
    const ingredientsPayload: BulkIngredientPayload[] = bulkRows.map(r => ({
      refId: r.refId,
      name: r.name,
      amount: parseFloat(r.amount),
      unit: r.unit,
      ingredientCategory: r.category,
      ingredientType: r.type,
    }));
    const payload = { ingredients: ingredientsPayload, allowUnknown: force };

    setBulkSubmitting(true);
    try {
      const url = `/api/factory/recipes/${id}/ingredients/bulk${force ? "?force=true" : ""}`;
      const res = await apiRequest("POST", url, payload);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 400 && Array.isArray(data?.unknownIngredients) && data.unknownIngredients.length > 0) {
          setBulkUnknown(data.unknownIngredients);
          setBulkParseError(null);
          return;
        }
        throw new Error(data?.error || data?.message || "Toplu içe aktarma başarısız");
      }
      // Task #195: Eksik besin değer rozetinin sayısı, sunucu cevabıyla
      // eşzamanlı olarak hemen güncellensin diye `ingredients` state'ini ve
      // `/api/factory/ingredient-names` cache'ini optimistik güncelliyoruz.
      // İnvalide etmeden önce uygulamak şart: refetch tamamlanana kadar
      // ekrandaki rozet bir an önceki duruma karşılık gelmesin.
      const missing: string[] = Array.isArray(data?.missingNutrition) ? data.missingNutrition : [];
      const missingSet = new Set(missing.map(m => String(m).toLocaleLowerCase("tr")));
      const serverIngredients: any[] = Array.isArray(data?.ingredients) ? data.ingredients : [];
      if (serverIngredients.length > 0) {
        setIngredients(serverIngredients);
      }
      qc.setQueryData<IngredientNameOption[]>(["/api/factory/ingredient-names"], (prev) => {
        const merged = new Map<string, IngredientNameOption>();
        for (const item of prev || []) {
          merged.set(item.name.toLocaleLowerCase("tr"), { name: item.name, hasNutrition: item.hasNutrition });
        }
        for (const ing of serverIngredients) {
          const nm = String(ing?.name || "").trim();
          if (!nm) continue;
          const key = nm.toLocaleLowerCase("tr");
          const existing = merged.get(key);
          // Sunucu missingNutrition listesinde yoksa nutrition kaydı vardır.
          const hasNutrition = !missingSet.has(key);
          merged.set(key, { name: existing?.name || nm, hasNutrition });
        }
        return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name, "tr"));
      });

      qc.invalidateQueries({ queryKey: ["/api/factory/recipes", id] });
      qc.invalidateQueries({ queryKey: ["/api/factory/ingredient-names"] });
      qc.invalidateQueries({ queryKey: ["/api/factory/recipes", id, "ingredients/snapshots/latest"] });
      toast({
        title: "Malzemeler içe aktarıldı",
        description: `${payload.ingredients.length} malzeme kaydedildi${data?.unknownIngredients?.length ? ` (${data.unknownIngredients.length} yeni isim)` : ""}`,
      });
      setBulkOpen(false);
      setBulkText("");
      setBulkUnknown([]);
      setBulkParseError(null);

      // Task #177: Eksik besin değer kayıtları varsa anında doldurma diyaloğu aç
      if (missing.length > 0) {
        const initial: Record<string, RowNutrition> = {};
        for (const n of missing) initial[n] = emptyRowNutrition();
        setBulkNutritionRows(initial);
        setMissingNutritionList(missing);
        setLastBulkPayload(ingredientsPayload);
        setBulkNutritionError(null);
      }
    } catch (e: any) {
      setBulkParseError(e?.message || "Hata");
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Task #177 + #196: Eksik besin değerlerini ayrı nutrition-bulk endpoint'ine
  // gönder. Reçete malzemelerini sil/yeniden ekleme yapmaz; sadece eksik
  // nutrition kayıtlarını `onConflictDoNothing` ile yazar.
  const submitBulkNutrition = async () => {
    if (!id || isNew) return;
    if (!canEditNutrition) {
      setBulkNutritionError("Besin değer kaydetme yetkiniz yok (sadece admin / gıda mühendisi / recete_gm).");
      return;
    }
    const numOrNull = (v: string) => v.trim() === "" ? null : Number(v);
    const hasAny = (n: RowNutrition) =>
      n.energyKcal.trim() !== "" || n.fatG.trim() !== "" || n.saturatedFatG.trim() !== "" ||
      n.carbohydrateG.trim() !== "" || n.sugarG.trim() !== "" || n.proteinG.trim() !== "" ||
      n.saltG.trim() !== "" || n.allergens.length > 0;

    // missingNutritionList sunucudan gelen kanonikleştirilmiş isimleri tutar.
    // Kullanıcının doldurduğu satırları nutrition-bulk payload'ına çeviriyoruz.
    const items: Array<Record<string, unknown>> = [];
    const filledCanonicals = new Set<string>();
    for (const name of missingNutritionList) {
      const row = bulkNutritionRows[name];
      if (!row || !hasAny(row)) continue;
      const canonical = canonicalIngredientName(name);
      if (!canonical || filledCanonicals.has(canonical)) continue;
      filledCanonicals.add(canonical);
      items.push({
        ingredientName: canonical,
        energyKcal: numOrNull(row.energyKcal),
        fatG: numOrNull(row.fatG),
        saturatedFatG: numOrNull(row.saturatedFatG),
        carbohydrateG: numOrNull(row.carbohydrateG),
        sugarG: numOrNull(row.sugarG),
        proteinG: numOrNull(row.proteinG),
        saltG: numOrNull(row.saltG),
        allergens: row.allergens,
      });
    }
    if (items.length === 0) {
      setMissingNutritionList([]);
      setLastBulkPayload(null);
      setBulkNutritionRows({});
      return;
    }

    setBulkNutritionSubmitting(true);
    setBulkNutritionError(null);
    try {
      const res = await apiRequest(
        "POST",
        `/api/factory/ingredient-nutrition/bulk`,
        { items },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Besin değerleri kaydedilemedi");
      }
      // Task #196: Yeni endpoint cevabı { written, skipped } döndürür.
      //   - written = bu istekte yeni eklenen kanonik isimler
      //   - skipped = mevcut kayıt nedeniyle (onConflictDoNothing) atlananlar
      // Her iki durumda da nutrition kaydı artık var; rozeti hasNutrition:true yap.
      const written: string[] = Array.isArray(data?.written) ? data.written : [];
      const skipped: string[] = Array.isArray(data?.skipped) ? data.skipped : [];
      const persistedCanonicals = new Set(
        [...written, ...skipped].map(m => canonicalIngredientName(m)),
      );
      // Sunucunun ne yazdığı ne de mevcut bulduğu (yani sessizce reddettiği)
      // doldurulmuş kanonikler — yetki/validation hatası göstergesi.
      const stillMissingCanonicals = new Set(
        Array.from(filledCanonicals).filter(c => !persistedCanonicals.has(c)),
      );

      // Task #195: Optimistik olarak ingredient-names cache'inde rozeti güncelle.
      qc.setQueryData<IngredientNameOption[]>(["/api/factory/ingredient-names"], (prev) => {
        if (!prev) return prev;
        return prev.map(item => {
          const canonical = canonicalIngredientName(item.name);
          if (filledCanonicals.has(canonical) && !stillMissingCanonicals.has(canonical)) {
            return { ...item, hasNutrition: true };
          }
          return item;
        });
      });

      qc.invalidateQueries({ queryKey: ["/api/factory/recipes", id] });
      qc.invalidateQueries({ queryKey: ["/api/factory/ingredient-names"] });

      if (stillMissingCanonicals.size > 0) {
        setBulkNutritionError(
          `Sunucu ${stillMissingCanonicals.size} malzemenin besin değerini yazmadı (muhtemelen yetki). Listeyi kontrol edin.`,
        );
        // Diyaloğu açık bırak; kullanıcı görsün
        return;
      }

      toast({
        title: "Besin değerleri kaydedildi",
        description: skipped.length > 0
          ? `${written.length} yeni kayıt eklendi, ${skipped.length} mevcut kayıt korundu`
          : `${written.length} malzeme için kayıt eklendi`,
      });
      setMissingNutritionList([]);
      setLastBulkPayload(null);
      setBulkNutritionRows({});
    } catch (e: any) {
      setBulkNutritionError(e?.message || "Hata");
    } finally {
      setBulkNutritionSubmitting(false);
    }
  };

  const updateBulkNutritionRow = (name: string, patch: Partial<RowNutrition>) => {
    setBulkNutritionRows(prev => ({
      ...prev,
      [name]: { ...(prev[name] || emptyRowNutrition()), ...patch },
    }));
  };
  const toggleBulkRowAllergen = (name: string, a: string) => {
    setBulkNutritionRows(prev => {
      const row = prev[name] || emptyRowNutrition();
      const allergens = row.allergens.includes(a)
        ? row.allergens.filter(x => x !== a)
        : [...row.allergens, a];
      return { ...prev, [name]: { ...row, allergens } };
    });
  };

  const addIngredient = async () => {
    if (!id || isNew) return;
    if (!newIngredient.name.trim()) return;
    if (!isCanonicalName(newIngredient.name)) {
      // Yeni isim — onay diyalogunda kullanıcıyı uyar
      resetNutritionForm();
      setConfirmNewName(newIngredient.name.trim());
      return;
    }
    await commitAddIngredient();
  };

  const addStep = async () => {
    if (!id || isNew) return;
    try {
      await apiRequest("POST", `/api/factory/recipes/${id}/steps/bulk`, {
        steps: [{
          stepNumber: steps.length + 1,
          title: newStep.title,
          content: newStep.content,
          timerSeconds: newStep.timerSeconds ? parseInt(newStep.timerSeconds) : null,
          tips: newStep.tips || null,
        }],
      });
      qc.invalidateQueries({ queryKey: ["/api/factory/recipes", id] });
      qc.invalidateQueries({ queryKey: ["/api/factory/recipes", id, "steps/snapshots/latest"] });
      setNewStep({ title: "", content: "", timerSeconds: "", tips: "" });
      toast({ title: "Adım eklendi" });
    } catch { toast({ title: "Hata", variant: "destructive" }); }
  };

  const f = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/fabrika/receteler")}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-bold">{isNew ? "Yeni Reçete Oluştur" : `Reçete Düzenle: ${form.name}`}</h1>
        <div className="ml-auto">
          <Button onClick={() => saveMutation.mutate()} disabled={!form.name || !form.code || saveMutation.isPending}>
            <Save className="w-4 h-4 mr-1" /> {isNew ? "Oluştur" : "Kaydet"}
          </Button>
        </div>
      </div>

      {/* TEMEL BİLGİLER */}
      <Card className="mb-4">
        <CardHeader className="pb-3"><CardTitle className="text-base">Temel Bilgiler</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Reçete Adı *</Label><Input value={form.name} onChange={e => f("name", e.target.value)} placeholder="Cinnabon Full Revizyon" /></div>
            <div><Label>Kod *</Label><Input value={form.code} onChange={e => f("code", e.target.value)} placeholder="CIN-001" /></div>
            <div><Label>Kategori</Label>
              <Select value={form.category} onValueChange={v => f("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Çıktı Tipi</Label>
              <Select value={form.outputType} onValueChange={v => f("outputType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{OUTPUT_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2"><Label>Açıklama</Label><Textarea value={form.description} onChange={e => f("description", e.target.value)} rows={2} /></div>
          </div>
        </CardContent>
      </Card>

      {/* ÜRETİM PARAMETRELERİ */}
      <Card className="mb-4">
        <CardHeader className="pb-3"><CardTitle className="text-base">Üretim Parametreleri</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><Label>Batch Çıktısı</Label><Input type="number" value={form.baseBatchOutput} onChange={e => f("baseBatchOutput", e.target.value)} /></div>
            <div><Label>Birim</Label><Input value={form.outputUnit} onChange={e => f("outputUnit", e.target.value)} /></div>
            <div><Label>Toplam Ağırlık (gr)</Label><Input type="number" value={form.totalWeightGrams} onChange={e => f("totalWeightGrams", e.target.value)} /></div>
            <div><Label>Birim Ağırlık (gr)</Label><Input type="number" step="0.1" value={form.expectedUnitWeight} onChange={e => f("expectedUnitWeight", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div><Label>Ön Hazırlık (dk)</Label><Input type="number" value={form.prepTimeMinutes} onChange={e => f("prepTimeMinutes", e.target.value)} /></div>
            <div><Label>Üretim (dk)</Label><Input type="number" value={form.productionTimeMinutes} onChange={e => f("productionTimeMinutes", e.target.value)} /></div>
            <div><Label>Temizlik (dk)</Label><Input type="number" value={form.cleaningTimeMinutes} onChange={e => f("cleaningTimeMinutes", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <div><Label>Personel Sayısı</Label><Input type="number" value={form.requiredWorkers} onChange={e => f("requiredWorkers", e.target.value)} /></div>
            <div><Label>Enerji (KWh/batch)</Label><Input type="number" step="0.1" value={form.equipmentKwh} onChange={e => f("equipmentKwh", e.target.value)} /></div>
            <div><Label>Su (lt/batch)</Label><Input type="number" step="0.1" value={form.waterConsumptionLt} onChange={e => f("waterConsumptionLt", e.target.value)} /></div>
            <div><Label>Fire Tolerans %</Label><Input type="number" step="0.1" value={form.wasteTolerance} onChange={e => f("wasteTolerance", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div><Label>Beklenen Fire (kg)</Label><Input type="number" step="0.1" value={form.expectedWasteKg} onChange={e => f("expectedWasteKg", e.target.value)} /></div>
            <div><Label>Beklenen Zayi (gr)</Label><Input type="number" step="0.1" value={form.expectedLossGrams} onChange={e => f("expectedLossGrams", e.target.value)} /></div>
          </div>
          <div className="mt-3"><Label>Ekipman Açıklaması</Label><Input value={form.equipmentDescription} onChange={e => f("equipmentDescription", e.target.value)} placeholder="Spiral mikser + şoklama dolabı" /></div>
        </CardContent>
      </Card>

      {/* R-5C: ALERJEN ÖZET KARTI (sadece kayıtlı reçete) */}
      {!isNew && allergenData && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Alerjenler
                {allergenData.allergens.length > 0 && (
                  <Badge variant="outline" className="ml-1">{allergenData.allergens.length}</Badge>
                )}
              </CardTitle>
              {allergenData.isVerified ? (
                <Badge className="bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-700 dark:border-emerald-600 gap-1">
                  <Check className="w-3 h-3" />
                  Doğrulandı
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-400">
                  <AlertTriangle className="w-3 h-3" />
                  Tahmini
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {allergenData.allergens.length === 0 ? (
              <p className="text-sm text-muted-foreground">Bu reçete alerjen içermiyor.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {allergenData.allergens.map((a) => (
                    <Badge
                      key={a}
                      variant="secondary"
                      className="capitalize"
                      data-testid={`recipe-allergen-${a}`}
                    >
                      {a}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Toplam {allergenData.matchedCount} / {allergenData.ingredientCount} malzemenin alerjen verisi eşleşti.
                  {!allergenData.isVerified && allergenData.verificationReason && (
                    <span className="block mt-1">⚠️ {allergenData.verificationReason}</span>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* R-5B: MALİYET KARTI (sadece kayıtlı reçete) */}
      {!isNew && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Maliyet Hesaplama
              </CardTitle>
              <Button
                size="sm"
                onClick={() => recalcCostMutation.mutate()}
                disabled={recalcCostMutation.isPending}
                data-testid="button-recalc-cost"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 mr-1", recalcCostMutation.isPending && "animate-spin")} />
                {recalcCostMutation.isPending ? "Hesaplanıyor..." : "Maliyeti Yeniden Hesapla"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!costResult && (
              <p className="text-sm text-muted-foreground">
                "Maliyeti Yeniden Hesapla" butonuna basarak güncel hammadde fiyatlarına göre maliyet hesaplaması yapılır.
                Sonuç burada görünür ve <strong>factory_recipes</strong> tablosuna kaydedilir + audit log yazılır.
              </p>
            )}
            {costResult && (
              <div className="space-y-3">
                {/* Maliyet Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <div className="border rounded-md p-2.5">
                    <div className="text-[10px] uppercase text-muted-foreground tracking-wide">Hammadde</div>
                    <div className="text-base font-bold mt-0.5" data-testid="cost-raw-material">
                      {costResult.costs?.rawMaterialCost} <span className="text-xs font-normal">TL</span>
                    </div>
                  </div>
                  <div className="border rounded-md p-2.5">
                    <div className="text-[10px] uppercase text-muted-foreground tracking-wide">İşçilik</div>
                    <div className="text-base font-bold mt-0.5" data-testid="cost-labor">
                      {costResult.costs?.laborCost} <span className="text-xs font-normal">TL</span>
                    </div>
                  </div>
                  <div className="border rounded-md p-2.5">
                    <div className="text-[10px] uppercase text-muted-foreground tracking-wide">Enerji</div>
                    <div className="text-base font-bold mt-0.5" data-testid="cost-energy">
                      {costResult.costs?.energyCost} <span className="text-xs font-normal">TL</span>
                    </div>
                  </div>
                  <div className="border rounded-md p-2.5 bg-muted/50">
                    <div className="text-[10px] uppercase text-muted-foreground tracking-wide">Batch Toplamı</div>
                    <div className="text-base font-bold mt-0.5" data-testid="cost-batch">
                      {costResult.costs?.totalBatchCost} <span className="text-xs font-normal">TL</span>
                    </div>
                  </div>
                  <div className="border-2 border-primary rounded-md p-2.5 bg-primary/5">
                    <div className="text-[10px] uppercase text-primary tracking-wide font-semibold">Birim Maliyet</div>
                    <div className="text-lg font-bold mt-0.5 text-primary" data-testid="cost-unit">
                      {costResult.costs?.unitCost} <span className="text-xs font-normal">TL</span>
                    </div>
                  </div>
                </div>

                {/* Önceki değerlerle karşılaştırma */}
                {costResult.previousCosts && Number(costResult.previousCosts.unitCost) > 0 && (
                  <div className="text-xs text-muted-foreground border-t pt-2">
                    <span className="font-medium">Önceki birim maliyet:</span> {costResult.previousCosts.unitCost} TL →{" "}
                    <span className="font-medium">Yeni:</span> {costResult.costs?.unitCost} TL
                    {(() => {
                      const oldUC = Number(costResult.previousCosts.unitCost);
                      const newUC = Number(costResult.costs?.unitCost);
                      if (oldUC > 0) {
                        const delta = ((newUC - oldUC) / oldUC) * 100;
                        const sign = delta > 0 ? "+" : "";
                        const color = delta > 0 ? "text-orange-600" : "text-green-600";
                        return <span className={cn("ml-2 font-semibold", color)}>({sign}{delta.toFixed(1)}%)</span>;
                      }
                      return null;
                    })()}
                  </div>
                )}

                {/* Coverage uyarısı */}
                {costResult.coverage && costResult.coverage.percent < 100 && (
                  <div className="border border-orange-200 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-900 rounded-md p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
                      <span className="font-medium">Eksik hammadde fiyatı tespit edildi</span>
                      <Badge variant="outline" className="ml-auto" data-testid="coverage-badge">
                        Kapsam %{Math.round(costResult.coverage.percent)}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {costResult.coverage.resolved} / {costResult.coverage.total} malzemenin fiyatı bulundu.
                      {" "}
                      <strong>{costResult.coverage.missingCount}</strong> malzemenin fiyatı eksik veya birimi uyumsuz.
                      Maliyet hesabı kısmi olarak yapıldı, gerçek maliyet daha yüksek olabilir.
                    </div>
                    {costResult.missing && costResult.missing.length > 0 && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setMissingExpanded((p) => !p)}
                          className="h-7 px-2"
                          data-testid="button-toggle-missing"
                        >
                          {missingExpanded ? <ChevronDown className="w-3.5 h-3.5 mr-1" /> : <ChevronRight className="w-3.5 h-3.5 mr-1" />}
                          Eksik malzemeleri {missingExpanded ? "gizle" : "göster"} ({costResult.missing.length})
                        </Button>
                        {missingExpanded && (
                          <div className="space-y-1 mt-1">
                            {costResult.missing.map((m: any, idx: number) => (
                              <div key={idx} className="text-xs flex items-center gap-2 py-1 border-b border-orange-200/50 last:border-0">
                                {m.code && <Badge variant="outline" className="font-mono text-[10px]">{m.code}</Badge>}
                                <span className="flex-1">{m.name}</span>
                                <Badge variant="secondary" className="text-[10px]">
                                  {m.reason === "no_price" && "Fiyat yok"}
                                  {m.reason === "no_inventory" && "Envanter yok"}
                                  {m.reason === "unit_mismatch" && "Birim uyumsuz"}
                                </Badge>
                                {m.detail && <span className="text-muted-foreground text-[10px]">{m.detail}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                    <div className="text-[11px] text-muted-foreground pt-1 border-t border-orange-200/50">
                      💡 Eksik hammadde fiyatları için satınalma sorumlusuyla iletişime geçin (Samet).
                    </div>
                  </div>
                )}

                {/* Tam kapsam ✅ */}
                {costResult.coverage && costResult.coverage.percent >= 100 && (
                  <div className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1.5 border-t pt-2">
                    <Check className="w-3.5 h-3.5" />
                    Tüm {costResult.coverage.total} malzemenin fiyatı bulundu — maliyet hesabı tam kapsamlı.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TGK-340: TGK UYUM KARTI (Türk Gıda Kodeksi — pilot) */}
      {!isNew && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Etiket Bilgileri (TGK 2017/2284)
                <Badge variant="outline" className="text-[10px]">Türk Gıda Kodeksi</Badge>
              </CardTitle>
              {canEditNutrition && (
                <Button
                  size="sm"
                  onClick={() => calcNutritionMutation.mutate()}
                  disabled={calcNutritionMutation.isPending}
                  data-testid="button-calculate-nutrition"
                >
                  <Calculator className={cn("w-3.5 h-3.5 mr-1", calcNutritionMutation.isPending && "animate-spin")} />
                  {calcNutritionMutation.isPending ? "Hesaplanıyor..." : "Besin Değerleri Hesapla"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {calcNutrResult && (
              <div className="border rounded-md p-3 bg-muted/30 space-y-2 text-sm" data-testid="tgk-nutrition-result">
                <div className="font-medium text-xs text-muted-foreground uppercase tracking-wide">
                  Hesaplanan Besin Değerleri (100 gr başına)
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 text-center">
                  {[
                    { label: "Enerji", unit: "kcal", val: calcNutrResult.per100g?.energyKcal },
                    { label: "Yağ", unit: "g", val: calcNutrResult.per100g?.fatG },
                    { label: "Doy. Yağ", unit: "g", val: calcNutrResult.per100g?.saturatedFatG },
                    { label: "Karb.", unit: "g", val: calcNutrResult.per100g?.carbohydrateG },
                    { label: "Şeker", unit: "g", val: calcNutrResult.per100g?.sugarG },
                    { label: "Protein", unit: "g", val: calcNutrResult.per100g?.proteinG },
                    { label: "Tuz", unit: "g", val: calcNutrResult.per100g?.saltG },
                  ].map(item => (
                    <div key={item.label} className="border rounded-md p-1.5">
                      <div className="text-[10px] text-muted-foreground">{item.label}</div>
                      <div className="font-semibold text-sm">{item.val != null ? Number(item.val).toFixed(1) : "—"}</div>
                      <div className="text-[10px] text-muted-foreground">{item.unit}</div>
                    </div>
                  ))}
                </div>
                <div className="text-[11px] text-muted-foreground border-t pt-2">
                  Kapsam: {calcNutrResult.ingredientCount ?? 0} malzeme,{" "}
                  {calcNutrResult.coveredCount ?? 0} eşleşti (%{calcNutrResult.coveragePct ?? 0} kapsam).
                  {(calcNutrResult.coveragePct ?? 0) < 100 && (
                    <span className="text-orange-600 dark:text-orange-400"> Eksik malzeme besin değerleri gıda mühendisi tarafından girilmeli.</span>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Üretici / Dağıtıcı Bilgisi</Label>
                <Textarea
                  value={form.manufacturerInfo}
                  onChange={e => f("manufacturerInfo", e.target.value)}
                  rows={2}
                  placeholder="Dospresso Gıda San. Tic. A.Ş. — Organize Sanayi Bölgesi..."
                  disabled={!canEditNutrition}
                  data-testid="input-tgk-manufacturer-info"
                />
              </div>
              <div>
                <Label className="text-sm">Saklama Koşulları</Label>
                <Textarea
                  value={form.storageConditions}
                  onChange={e => f("storageConditions", e.target.value)}
                  rows={2}
                  placeholder="+2°C ~ +8°C arası buzdolabında saklayın..."
                  disabled={!canEditNutrition}
                  data-testid="input-tgk-storage-conditions"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm">Raf Ömrü (gün)</Label>
              <Input
                type="number"
                value={form.shelfLifeDays}
                onChange={e => f("shelfLifeDays", e.target.value)}
                placeholder="7"
                className="w-32"
                disabled={!canEditNutrition}
                data-testid="input-tgk-shelf-life"
              />
            </div>

            <div>
              <Label className="text-sm mb-2 block">İçerebilir Alerjenler (çapraz kontaminasyon)</Label>
              {!canEditNutrition && (
                <Badge variant="outline" className="text-[10px] mb-2">
                  <Lock className="w-3 h-3 mr-1" /> salt-okunur
                </Badge>
              )}
              <div className="flex flex-wrap gap-1.5">
                {ALLERGEN_OPTIONS.map(a => {
                  const selected = tgkAllergens.includes(a);
                  return (
                    <Badge
                      key={a}
                      variant={selected ? "default" : "outline"}
                      className={cn("cursor-pointer capitalize", !canEditNutrition && "opacity-50 pointer-events-none")}
                      onClick={() => {
                        if (!canEditNutrition) return;
                        setTgkAllergens(prev =>
                          prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
                        );
                      }}
                      data-testid={`badge-tgk-allergen-${a}`}
                    >
                      {a}
                    </Badge>
                  );
                })}
              </div>
              {tgkAllergens.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {tgkAllergens.length} alerjen seçili — etiket üzerinde "İçerebilir" alanında gösterilecek.
                </p>
              )}
            </div>

            <p className="text-xs text-muted-foreground border-t pt-2">
              Bu bilgiler "Türk Gıda Kodeksi Etiketleme Yönetmeliği" kapsamında ürün etiketine aktarılır.
              TGK alanlarını düzenlemek için gıda mühendisi yetkisi gereklidir.
            </p>
          </CardContent>
        </Card>
      )}

      {/* MALZEMELER (sadece kayıtlı reçete) */}
      {!isNew && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base">Malzemeler ({ingredients.length})</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {latestSnapshot && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmUndo(true)}
                    disabled={undoMutation.isPending}
                    title={`${latestSnapshot.ingredientCount} malzemeli son yedeğe dön (${new Date(latestSnapshot.createdAt).toLocaleString("tr-TR")})`}
                    data-testid="button-undo-bulk-import"
                  >
                    <Undo2 className="w-3.5 h-3.5 mr-1" /> Son İçe Aktarmayı Geri Al
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setHistoryOpen(true)}
                  data-testid="button-open-snapshot-history"
                  title="Tüm yedek geçmişini görüntüle"
                >
                  <History className="w-3.5 h-3.5 mr-1" /> Yedek Geçmişi
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setBulkOpen(true); setBulkUnknown([]); setBulkParseError(null); }}
                  data-testid="button-open-bulk-import"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Toplu İçe Aktar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Task #166: Reçetedeki malzemelerden besin değer kaydı olmayanları göster */}
            {(() => {
              const nutritionMap = new Map<string, boolean>();
              for (const opt of ingredientNames) {
                nutritionMap.set(opt.name.toLocaleLowerCase("tr"), opt.hasNutrition);
              }
              const missing: string[] = [];
              for (const ing of ingredients) {
                const nm = String(ing?.name || "").trim();
                if (!nm) continue;
                const key = nm.toLocaleLowerCase("tr");
                const has = nutritionMap.get(key);
                // hasNutrition === true ise kayıt var; aksi halde (false veya
                // undefined / yani lookup'ta yok) eksik kabul ediyoruz —
                // sessizce gözden kaçmamasın.
                if (has !== true && !missing.includes(nm)) missing.push(nm);
              }
              if (missing.length === 0) return null;
              return (
                <div
                  className="mb-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs"
                  data-testid="warning-missing-nutrition"
                >
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-destructive" />
                  <div className="flex-1">
                    <div className="font-medium text-destructive">
                      {missing.length} malzemenin besin değer kaydı eksik
                    </div>
                    <div className="text-muted-foreground mb-1">
                      Aşağıdaki malzemeler için <span className="font-mono">factory_ingredient_nutrition</span> tablosunda hâlâ kayıt yok. Gıda mühendisi ekranından veya tek tek ekleme akışında "şimdi gir" diyaloğundan tamamlayın.
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {missing.map(m => (
                        <Badge
                          key={m}
                          variant="outline"
                          className="text-[10px]"
                          data-testid={`badge-missing-nutrition-${m}`}
                        >
                          {m}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
            {ingredients.map((ing: any, idx: number) => (
              <div key={ing.id || idx} className="flex items-center gap-2 py-1.5 border-b last:border-0">
                <Badge variant="outline" className="font-mono text-xs">{ing.refId || ing.ref_id}</Badge>
                <span className="flex-1 text-sm">
                  {ing.name}
                  {/* R-5C: Inline alerjen rozetleri */}
                  {(() => {
                    const algs = ingredientAllergenMap.get(ing.name?.toLowerCase().trim());
                    if (!algs || algs.length === 0) return null;
                    return (
                      <span className="inline-flex flex-wrap gap-1 ml-2 align-middle" data-testid={`ing-allergens-${ing.id || idx}`}>
                        {algs.slice(0, 4).map((a) => (
                          <Badge key={a} variant="outline" className="text-[9px] px-1 py-0 h-4 capitalize border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-400">
                            {a}
                          </Badge>
                        ))}
                        {algs.length > 4 && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">+{algs.length - 4}</Badge>
                        )}
                      </span>
                    );
                  })()}
                </span>
                <span className="text-sm font-mono font-bold">{ing.amount} {ing.unit}</span>
                <Badge variant="secondary" className="text-[10px]">{ing.ingredientCategory || ing.ingredient_category}</Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    resetNutritionForm();
                    setEditNutritionName(ing.name);
                  }}
                  title={canEditNutrition ? "Besin değerlerini düzenle" : "Besin değerlerini görüntüle (salt-okunur)"}
                  data-testid={`button-edit-nutrition-${ing.id || idx}`}
                >
                  {canEditNutrition ? <Pencil className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setHistoryName(ing.name)}
                  title="Besin değer değişiklik geçmişini göster"
                  data-testid={`button-nutrition-history-${ing.id || idx}`}
                >
                  <History className="w-3.5 h-3.5" />
                </Button>
                {/* R-5A: Malzeme düzenle (amount, unit, kategori) */}
                {ing.id && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditIngredient(ing)}
                    title="Malzemeyi düzenle (miktar, birim, kategori)"
                    data-testid={`button-edit-ingredient-${ing.id}`}
                  >
                    <Pencil className="w-3.5 h-3.5 text-blue-600" />
                  </Button>
                )}
                {/* R-5A: Malzeme sil */}
                {ing.id && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeleteIngredient(ing)}
                    title="Malzemeyi sil"
                    data-testid={`button-delete-ingredient-${ing.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            <div className="grid grid-cols-6 gap-2 mt-3 pt-3 border-t">
              <Input placeholder="0001" value={newIngredient.refId} onChange={e => setNewIngredient(p => ({ ...p, refId: e.target.value }))} data-testid="input-ingredient-refid" />
              <div className="col-span-2">
                <Popover open={nameComboOpen} onOpenChange={setNameComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={nameComboOpen}
                      className="w-full justify-between font-normal"
                      data-testid="combobox-ingredient-name"
                    >
                      <span className={cn("truncate", !newIngredient.name && "text-muted-foreground")}>
                        {newIngredient.name || "Malzeme seç veya yaz..."}
                      </span>
                      {newIngredient.name && !isCanonicalName(newIngredient.name) ? (
                        <AlertTriangle className="ml-2 h-3.5 w-3.5 shrink-0 text-destructive" />
                      ) : (
                        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Ara veya yeni isim yaz..."
                        value={newIngredient.name}
                        onValueChange={(v) => setNewIngredient(p => ({ ...p, name: v }))}
                        data-testid="input-ingredient-name-search"
                      />
                      <CommandList>
                        <CommandEmpty>
                          <div className="p-2 text-xs">
                            <div className="text-destructive font-medium flex items-center gap-1 mb-1">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Listede yok — yeni malzeme!
                            </div>
                            <div className="text-muted-foreground">
                              Eklenirse besin değer tablosuna ayrıca kayıt yapılmalıdır.
                            </div>
                          </div>
                        </CommandEmpty>
                        <CommandGroup heading={`Kanonik liste (${ingredientNames.length})`}>
                          {ingredientNames.map(opt => (
                            <CommandItem
                              key={opt.name}
                              value={opt.name}
                              onSelect={(val) => {
                                setNewIngredient(p => ({ ...p, name: val }));
                                setNameComboOpen(false);
                              }}
                              data-testid={`option-ingredient-${opt.name}`}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-3.5 w-3.5",
                                  newIngredient.name === opt.name ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span className="flex-1 truncate">{opt.name}</span>
                              {!opt.hasNutrition && (
                                <Badge variant="outline" className="ml-2 text-[10px]">besin yok</Badge>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <Input type="number" placeholder="5000" value={newIngredient.amount} onChange={e => setNewIngredient(p => ({ ...p, amount: e.target.value }))} data-testid="input-ingredient-amount" />
              <Input placeholder="gr" value={newIngredient.unit} onChange={e => setNewIngredient(p => ({ ...p, unit: e.target.value }))} data-testid="input-ingredient-unit" />
              <Button size="sm" onClick={addIngredient} disabled={!newIngredient.refId || !newIngredient.name || !newIngredient.amount} data-testid="button-add-ingredient">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            {newIngredient.name && !isCanonicalName(newIngredient.name) && (
              <div className="mt-2 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs" data-testid="warning-new-ingredient-name">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-destructive" />
                <div>
                  <div className="font-medium text-destructive">Yeni malzeme: "{newIngredient.name}"</div>
                  <div className="text-muted-foreground">
                    Bu isim kanonik listede yok. Eklerseniz besin değer tablosuna (factory_ingredient_nutrition) ayrıca bir kayıt eklemeniz gerekir.
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ADIMLAR (sadece kayıtlı reçete) */}
      {!isNew && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base">Üretim Adımları ({steps.length})</CardTitle>
              {latestStepSnapshot && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmStepUndo(true)}
                  disabled={undoStepsMutation.isPending}
                  title={`${latestStepSnapshot.stepCount} adımlı son yedeğe dön (${new Date(latestStepSnapshot.createdAt).toLocaleString("tr-TR")})`}
                  data-testid="button-undo-steps-bulk-import"
                >
                  <Undo2 className="w-3.5 h-3.5 mr-1" /> Son İçe Aktarmayı Geri Al
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {steps.map((s: any, idx: number) => (
              <div key={s.id || idx} className="flex items-start gap-2 py-2 border-b last:border-0">
                <Badge className="mt-0.5 shrink-0">{s.stepNumber || s.step_number || idx + 1}</Badge>
                <div className="flex-1">
                  <div className="font-medium text-sm">{s.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{s.content}</div>
                </div>
                {(s.timerSeconds || s.timer_seconds) && (
                  <Badge variant="outline" className="text-xs shrink-0">⏱ {Math.round((s.timerSeconds || s.timer_seconds) / 60)}dk</Badge>
                )}
                {/* R-5A: Adım düzenle */}
                {s.id && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditStep(s)}
                    title="Adımı düzenle"
                    data-testid={`button-edit-step-${s.id}`}
                  >
                    <Pencil className="w-3.5 h-3.5 text-blue-600" />
                  </Button>
                )}
                {/* R-5A: Adım sil */}
                {s.id && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeleteStep(s)}
                    title="Adımı sil"
                    data-testid={`button-delete-step-${s.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            <div className="space-y-2 mt-3 pt-3 border-t">
              <Input placeholder="Adım başlığı" value={newStep.title} onChange={e => setNewStep(p => ({ ...p, title: e.target.value }))} />
              <Textarea placeholder="Adım açıklaması ({0001} gibi malzeme referansları kullanın)" rows={2} value={newStep.content} onChange={e => setNewStep(p => ({ ...p, content: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" placeholder="Timer (saniye)" value={newStep.timerSeconds} onChange={e => setNewStep(p => ({ ...p, timerSeconds: e.target.value }))} />
                <Input placeholder="İpucu (opsiyonel)" value={newStep.tips} onChange={e => setNewStep(p => ({ ...p, tips: e.target.value }))} />
              </div>
              <Button size="sm" onClick={addStep} disabled={!newStep.title || !newStep.content}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Adım Ekle
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TEKNİK NOTLAR */}
      <Card className="mb-4">
        <CardHeader className="pb-3"><CardTitle className="text-base">Teknik Notlar</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div><Label>Baker's Yüzdeler</Label><Textarea rows={3} value={form.bakersPercentage} onChange={e => f("bakersPercentage", e.target.value)} placeholder="Un: %100 | Şeker: %12 | Tuz: %1.8..." /></div>
            <div><Label>Teknik Notlar (Markdown)</Label><Textarea rows={4} value={form.technicalNotes} onChange={e => f("technicalNotes", e.target.value)} placeholder="Detaylı teknik notlar..." /></div>
          </div>
        </CardContent>
      </Card>

      {/* YENİ MALZEME İSMİ ONAY / BESİN DEĞER DÜZENLEME DİYALOĞU
          - confirmNewName: yeni malzeme ekleme akışı (Task #152)
          - editNutritionName: mevcut bir malzemenin besin değerini güncelleme (Task #165) */}
      <AlertDialog
        open={!!dialogIngredientName}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmNewName(null);
            setEditNutritionName(null);
            resetNutritionForm();
          }
        }}
      >
        <AlertDialogContent data-testid="dialog-confirm-new-ingredient" className="max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {editNutritionName ? (
                <>
                  <Pencil className="h-4 w-4" />
                  Besin Değerlerini Düzenle
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Yeni Malzeme Tespit Edildi
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <div>
                  <span className="font-mono font-semibold">"{dialogIngredientName}"</span>
                  {editNutritionName
                    ? " için kayıtlı besin/alerjen bilgilerini güncelliyorsunuz."
                    : " kanonik malzeme listesinde bulunmuyor."}
                </div>
                <div>
                  {existingNutritionLoaded
                    ? "Mevcut kayıt önyüklendi. Düzeltmek istediğiniz değerleri değiştirip kaydedin."
                    : (editNutritionName
                        ? "Bu malzeme için henüz bir besin değer kaydı yok — yeni kayıt oluşturulacak."
                        : "İsterseniz besin değer ve alerjen bilgilerini hemen şimdi girebilirsiniz; bu sayede ayrıca gıda mühendisi ekranına gerek kalmaz. Boş bırakırsanız sadece reçete malzemesi eklenir.")}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 border rounded-md p-3">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <span>Besin Değerleri (100 gr başına — opsiyonel)</span>
              {!canEditNutrition && (
                <Badge variant="outline" className="text-[10px]" data-testid="badge-nutrition-readonly">
                  <Lock className="w-3 h-3 mr-1" /> salt-okunur (gıda mühendisi gerekli)
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Enerji (kcal)</Label>
                <Input
                  type="number" step="0.1" inputMode="decimal"
                  value={newNutrition.energyKcal}
                  onChange={e => setNewNutrition(p => ({ ...p, energyKcal: e.target.value }))}
                  disabled={!canEditNutrition} readOnly={!canEditNutrition} data-testid="input-nutrition-kcal"
                />
              </div>
              <div>
                <Label className="text-xs">Yağ (g)</Label>
                <Input
                  type="number" step="0.1" inputMode="decimal"
                  value={newNutrition.fatG}
                  onChange={e => setNewNutrition(p => ({ ...p, fatG: e.target.value }))}
                  disabled={!canEditNutrition} readOnly={!canEditNutrition} data-testid="input-nutrition-fat"
                />
              </div>
              <div>
                <Label className="text-xs">Doymuş Yağ (g)</Label>
                <Input
                  type="number" step="0.1" inputMode="decimal"
                  value={newNutrition.saturatedFatG}
                  onChange={e => setNewNutrition(p => ({ ...p, saturatedFatG: e.target.value }))}
                  disabled={!canEditNutrition} readOnly={!canEditNutrition} data-testid="input-nutrition-sfat"
                />
              </div>
              <div>
                <Label className="text-xs">Karbonhidrat (g)</Label>
                <Input
                  type="number" step="0.1" inputMode="decimal"
                  value={newNutrition.carbohydrateG}
                  onChange={e => setNewNutrition(p => ({ ...p, carbohydrateG: e.target.value }))}
                  disabled={!canEditNutrition} readOnly={!canEditNutrition} data-testid="input-nutrition-carb"
                />
              </div>
              <div>
                <Label className="text-xs">Şeker (g)</Label>
                <Input
                  type="number" step="0.1" inputMode="decimal"
                  value={newNutrition.sugarG}
                  onChange={e => setNewNutrition(p => ({ ...p, sugarG: e.target.value }))}
                  disabled={!canEditNutrition} readOnly={!canEditNutrition} data-testid="input-nutrition-sugar"
                />
              </div>
              <div>
                <Label className="text-xs">Protein (g)</Label>
                <Input
                  type="number" step="0.1" inputMode="decimal"
                  value={newNutrition.proteinG}
                  onChange={e => setNewNutrition(p => ({ ...p, proteinG: e.target.value }))}
                  disabled={!canEditNutrition} readOnly={!canEditNutrition} data-testid="input-nutrition-protein"
                />
              </div>
              <div>
                <Label className="text-xs">Tuz (g)</Label>
                <Input
                  type="number" step="0.1" inputMode="decimal"
                  value={newNutrition.saltG}
                  onChange={e => setNewNutrition(p => ({ ...p, saltG: e.target.value }))}
                  disabled={!canEditNutrition} readOnly={!canEditNutrition} data-testid="input-nutrition-salt"
                />
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5">
                Alerjenler (AB/TR 14)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ALLERGEN_OPTIONS.map(a => {
                  const selected = newAllergens.includes(a);
                  return (
                    <Badge
                      key={a}
                      variant={selected ? "default" : "outline"}
                      className={cn("toggle-elevate", canEditNutrition ? "cursor-pointer" : "cursor-not-allowed opacity-60")}
                      onClick={() => { if (canEditNutrition) toggleAllergen(a); }}
                      data-testid={`badge-allergen-${a}`}
                    >
                      {selected && <Check className="w-3 h-3 mr-1" />}
                      {a}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-new-ingredient">Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-new-ingredient"
              disabled={!!editNutritionName && !canEditNutrition}
              onClick={async () => {
                if (editNutritionName) {
                  // Sadece besin değer güncelleme akışı (Task #165)
                  const numOrNull = (v: string) => v.trim() === "" ? null : Number(v);
                  try {
                    await apiRequest("PUT", `/api/factory/ingredient-nutrition/${encodeURIComponent(editNutritionName)}`, {
                      energyKcal: numOrNull(newNutrition.energyKcal),
                      fatG: numOrNull(newNutrition.fatG),
                      saturatedFatG: numOrNull(newNutrition.saturatedFatG),
                      carbohydrateG: numOrNull(newNutrition.carbohydrateG),
                      sugarG: numOrNull(newNutrition.sugarG),
                      proteinG: numOrNull(newNutrition.proteinG),
                      saltG: numOrNull(newNutrition.saltG),
                      allergens: newAllergens,
                    });
                    qc.invalidateQueries({ queryKey: ["/api/factory/ingredient-names"] });
                    toast({ title: "Besin değerleri güncellendi" });
                  } catch (e: any) {
                    toast({ title: "Hata", description: e?.message, variant: "destructive" });
                  }
                  setEditNutritionName(null);
                  resetNutritionForm();
                } else {
                  setConfirmNewName(null);
                  await commitAddIngredient(true);
                }
              }}
            >
              {editNutritionName
                ? (existingNutritionLoaded ? "Güncelle" : "Kaydet")
                : (existingNutritionLoaded ? "Güncelle ve ekle" : "Yine de ekle")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* TOPLU İÇE AKTARMA DİYALOĞU */}
      <Dialog open={bulkOpen} onOpenChange={(open) => { if (!bulkSubmitting) setBulkOpen(open); }}>
        <DialogContent className="max-w-3xl" data-testid="dialog-bulk-import">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" /> Malzemeleri Toplu İçe Aktar
            </DialogTitle>
            <DialogDescription>
              Excel'den yapıştırın veya CSV dosyası yükleyin. Sütunlar:
              <span className="font-mono"> refId, ad, miktar, birim, kategori, tip</span>.
              Mevcut tüm malzemeler silinip yenileri ile değiştirilir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="bulk-file" className="cursor-pointer inline-flex items-center gap-1.5 text-sm border rounded-md px-3 py-1.5 hover-elevate">
                <Upload className="w-3.5 h-3.5" /> CSV Dosyası Seç
              </Label>
              <input
                id="bulk-file"
                type="file"
                accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleBulkFile(file);
                  e.target.value = "";
                }}
                data-testid="input-bulk-file"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const headers = ["refId", "ad", "miktar", "birim", "kategori", "tip"];
                  const rows = [
                    ["0001", "Un", "5000", "gr", "ana", "normal"],
                    ["0002", "Şeker", "800", "gr", "ana", "normal"],
                    ["0003", "Tuz", "20", "gr", "ana", "normal"],
                    ["0004", "Su", "2500", "ml", "ana", "normal"],
                  ];
                  const escape = (v: string) => /[",;\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
                  const csv = [headers, ...rows].map(r => r.map(escape).join(";")).join("\r\n");
                  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "recete-malzeme-sablonu.csv";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                data-testid="button-bulk-download-template"
              >
                <Download className="w-3.5 h-3.5 mr-1" /> Şablon indir
              </Button>
              <span className="text-xs text-muted-foreground">veya aşağıya yapıştırın (Excel'den TAB, CSV'de virgül/noktalı virgül)</span>
            </div>

            <Textarea
              rows={8}
              value={bulkText}
              onChange={(e) => { setBulkText(e.target.value); setBulkUnknown([]); setBulkParseError(null); }}
              placeholder={"refId\tad\tmiktar\tbirim\tkategori\ttip\n0001\tUn\t5000\tgr\tana\tnormal\n0002\tŞeker\t800\tgr\tana\tnormal"}
              className="font-mono text-xs"
              data-testid="textarea-bulk-paste"
            />

            {bulkText.trim() && (
              <div className="border rounded-md max-h-64 overflow-auto" data-testid="preview-bulk-rows">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1">#</th>
                      <th className="text-left px-2 py-1">refId</th>
                      <th className="text-left px-2 py-1">Ad</th>
                      <th className="text-right px-2 py-1">Miktar</th>
                      <th className="text-left px-2 py-1">Birim</th>
                      <th className="text-left px-2 py-1">Kat.</th>
                      <th className="text-left px-2 py-1">Tip</th>
                      <th className="text-left px-2 py-1">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkRows.map((r, i) => (
                      <tr key={i} className={cn("border-t", r.error && "bg-destructive/5")}>
                        <td className="px-2 py-1 text-muted-foreground">{i + 1}</td>
                        <td className="px-2 py-1 font-mono">{r.refId}</td>
                        <td className={cn("px-2 py-1", !r.error && !r.isCanonical && "text-destructive font-medium")}>
                          {r.name}
                          {!r.error && !r.isCanonical && (
                            <AlertTriangle className="inline-block ml-1 h-3 w-3" />
                          )}
                        </td>
                        <td className="px-2 py-1 text-right font-mono">{r.amount}</td>
                        <td className="px-2 py-1">{r.unit}</td>
                        <td className="px-2 py-1">{r.category}</td>
                        <td className="px-2 py-1">{r.type}</td>
                        <td className="px-2 py-1">
                          {r.error ? (
                            <Badge variant="destructive" className="text-[10px]">{r.error}</Badge>
                          ) : !r.isCanonical ? (
                            <Badge variant="outline" className="text-[10px] border-destructive/50 text-destructive">yeni isim</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">OK</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap gap-3 text-xs">
              <span data-testid="text-bulk-total">Toplam: <strong>{bulkRows.length}</strong></span>
              <span className="text-destructive" data-testid="text-bulk-errors">Hatalı: <strong>{bulkRowErrors.length}</strong></span>
              <span className="text-destructive" data-testid="text-bulk-unknown">Kanonik-dışı: <strong>{bulkUnknownPreview.length}</strong></span>
            </div>

            {bulkUnknown.length > 0 && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs space-y-2" data-testid="block-server-unknown">
                <div className="font-medium text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Sunucu uyarısı: {bulkUnknown.length} kanonik-dışı malzeme tespit edildi
                </div>
                <div className="flex flex-wrap gap-1">
                  {bulkUnknown.map(n => (
                    <Badge key={n} variant="outline" className="text-[10px] border-destructive/50 text-destructive">{n}</Badge>
                  ))}
                </div>
                <div className="text-muted-foreground">
                  "Yine de devam et" derseniz bu isimler kaydedilir; besin değer tablosuna ayrıca eklenmesi gerekir.
                </div>
              </div>
            )}

            {bulkParseError && (
              <div className="text-xs text-destructive" data-testid="text-bulk-error">{bulkParseError}</div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setBulkOpen(false)} disabled={bulkSubmitting} data-testid="button-bulk-cancel">
              Vazgeç
            </Button>
            {bulkUnknown.length > 0 ? (
              <Button
                variant="destructive"
                onClick={() => submitBulk(true)}
                disabled={bulkSubmitting || bulkRows.length === 0 || bulkRowErrors.length > 0}
                data-testid="button-bulk-force"
              >
                Yine de devam et ({bulkRows.length})
              </Button>
            ) : (
              <Button
                onClick={() => submitBulk(false)}
                disabled={bulkSubmitting || bulkRows.length === 0 || bulkRowErrors.length > 0}
                data-testid="button-bulk-submit"
              >
                <Save className="w-3.5 h-3.5 mr-1" /> İçe Aktar ({bulkRows.length})
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task #182: Geri al onay diyalogu */}
      <AlertDialog open={confirmUndo} onOpenChange={(o) => { if (!undoMutation.isPending) setConfirmUndo(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Son içe aktarmayı geri al?</AlertDialogTitle>
            <AlertDialogDescription>
              {latestSnapshot
                ? `Mevcut malzemeler silinecek ve ${latestSnapshot.ingredientCount} malzemeli yedek (${new Date(latestSnapshot.createdAt).toLocaleString("tr-TR")}) geri yüklenecek. Şu anki hali de yedeklenecek, böylece geri alma da geri alınabilir.`
                : "Yedek bulunamadı."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={undoMutation.isPending} data-testid="button-undo-cancel">Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); undoMutation.mutate(); }}
              disabled={undoMutation.isPending || !latestSnapshot}
              data-testid="button-undo-confirm"
            >
              {undoMutation.isPending ? "Geri alınıyor..." : "Evet, geri al"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Task #193: Adımlar için geri al onay diyaloğu */}
      <AlertDialog open={confirmStepUndo} onOpenChange={(o) => { if (!undoStepsMutation.isPending) setConfirmStepUndo(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Son adım içe aktarmasını geri al?</AlertDialogTitle>
            <AlertDialogDescription>
              {latestStepSnapshot
                ? `Mevcut adımlar silinecek ve ${latestStepSnapshot.stepCount} adımlı yedek (${new Date(latestStepSnapshot.createdAt).toLocaleString("tr-TR")}) geri yüklenecek. Şu anki hali de yedeklenecek, böylece geri alma da geri alınabilir.`
                : "Yedek bulunamadı."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={undoStepsMutation.isPending} data-testid="button-undo-steps-cancel">Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); undoStepsMutation.mutate(); }}
              disabled={undoStepsMutation.isPending || !latestStepSnapshot}
              data-testid="button-undo-steps-confirm"
            >
              {undoStepsMutation.isPending ? "Geri alınıyor..." : "Evet, geri al"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* Task #194: Yedek geçmişi diyalogu */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-3xl" data-testid="dialog-snapshot-history">
          <DialogHeader>
            <DialogTitle>Malzeme Yedek Geçmişi</DialogTitle>
            <DialogDescription>
              Bu reçete için alınmış tüm JSON yedekler. Herhangi birini geri yükleyebilir
              {canManageSnapshots ? ", eski kayıtları silebilirsiniz." : "siniz."}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            {snapshotHistoryLoading ? (
              <div className="text-sm text-muted-foreground p-4 text-center" data-testid="text-snapshot-history-loading">Yükleniyor...</div>
            ) : snapshotHistory.length === 0 ? (
              <div className="text-sm text-muted-foreground p-4 text-center" data-testid="text-history-empty">Henüz yedek alınmamış</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-background border-b">
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">Tarih</th>
                    <th className="py-2 pr-2 font-medium">Kullanıcı</th>
                    <th className="py-2 pr-2 font-medium text-right">Malzeme</th>
                    <th className="py-2 pr-2 font-medium">Neden</th>
                    <th className="py-2 pr-2 font-medium">Durum</th>
                    <th className="py-2 pr-2 font-medium text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshotHistory.map((s) => {
                    const userName = [s.createdByFirstName, s.createdByLastName].filter(Boolean).join(" ").trim()
                      || s.createdByEmail || s.createdBy || "—";
                    const reasonLabel = s.reason === "pre_restore" ? "Geri yükleme öncesi"
                      : s.reason === "bulk_import" ? "Toplu içe aktarma"
                      : (s.reason || "—");
                    return (
                      <tr key={s.id} className="border-b" data-testid={`row-snapshot-${s.id}`}>
                        <td className="py-2 pr-2 whitespace-nowrap" data-testid={`text-snapshot-date-${s.id}`}>
                          {new Date(s.createdAt).toLocaleString("tr-TR")}
                        </td>
                        <td className="py-2 pr-2" data-testid={`text-snapshot-user-${s.id}`}>{userName}</td>
                        <td className="py-2 pr-2 text-right tabular-nums" data-testid={`text-snapshot-count-${s.id}`}>{s.ingredientCount}</td>
                        <td className="py-2 pr-2" data-testid={`text-snapshot-reason-${s.id}`}>{reasonLabel}</td>
                        <td className="py-2 pr-2">
                          {s.restoredAt ? (
                            <Badge variant="secondary" className="text-[10px]" data-testid={`badge-snapshot-restored-${s.id}`}>Geri yüklendi</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]" data-testid={`badge-snapshot-active-${s.id}`}>Aktif</Badge>
                          )}
                        </td>
                        <td className="py-2 pr-2">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRestoreTarget(s)}
                              disabled={!!s.restoredAt || restoreSpecificMutation.isPending}
                              data-testid={`button-restore-snapshot-${s.id}`}
                            >
                              <Undo2 className="w-3 h-3 mr-1" /> Geri Yükle
                            </Button>
                            {canManageSnapshots && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteTarget(s)}
                                disabled={deleteSnapshotMutation.isPending}
                                data-testid={`button-delete-snapshot-${s.id}`}
                              >
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
            {canManageSnapshots ? (
              <div className="flex items-center gap-2 flex-wrap">
                <Label htmlFor="cleanup-days" className="text-xs whitespace-nowrap">Eski yedekleri temizle:</Label>
                <Input
                  id="cleanup-days"
                  type="number"
                  min={1}
                  max={3650}
                  className="w-20 h-9"
                  value={cleanupDays}
                  onChange={(e) => setCleanupDays(Math.max(1, Number(e.target.value) || 30))}
                  data-testid="input-cleanup-days"
                />
                <span className="text-xs text-muted-foreground">günden eski</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmCleanup(true)}
                  disabled={cleanupMutation.isPending || snapshotHistory.length === 0}
                  data-testid="button-cleanup-snapshots"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Temizle
                </Button>
              </div>
            ) : <div />}
            <Button variant="outline" onClick={() => setHistoryOpen(false)} data-testid="button-close-snapshot-history">Kapat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task #194: Belirli yedeği geri yükleme onayı */}
      <AlertDialog open={!!restoreTarget} onOpenChange={(o) => { if (!o && !restoreSpecificMutation.isPending) setRestoreTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bu yedeği geri yükle?</AlertDialogTitle>
            <AlertDialogDescription>
              {restoreTarget
                ? `Mevcut malzemeler silinecek ve ${restoreTarget.ingredientCount} malzemeli yedek (${new Date(restoreTarget.createdAt).toLocaleString("tr-TR")}) geri yüklenecek. Mevcut hâl de yeni bir yedek olarak saklanır.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoreSpecificMutation.isPending} data-testid="button-restore-snapshot-cancel">Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); if (restoreTarget) restoreSpecificMutation.mutate(restoreTarget); }}
              disabled={restoreSpecificMutation.isPending || !restoreTarget}
              data-testid="button-restore-snapshot-confirm"
            >
              {restoreSpecificMutation.isPending ? "Geri yükleniyor..." : "Evet, geri yükle"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Task #194: Tek yedek silme onayı */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o && !deleteSnapshotMutation.isPending) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bu yedeği sil?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `${new Date(deleteTarget.createdAt).toLocaleString("tr-TR")} tarihli, ${deleteTarget.ingredientCount} malzemeli yedek kalıcı olarak silinecek. Bu işlem geri alınamaz.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSnapshotMutation.isPending} data-testid="button-delete-snapshot-cancel">Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); if (deleteTarget) deleteSnapshotMutation.mutate(deleteTarget); }}
              disabled={deleteSnapshotMutation.isPending || !deleteTarget}
              data-testid="button-delete-snapshot-confirm"
            >
              {deleteSnapshotMutation.isPending ? "Siliniyor..." : "Evet, sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Task #194: Toplu temizleme onayı */}
      <AlertDialog open={confirmCleanup} onOpenChange={(o) => { if (!cleanupMutation.isPending) setConfirmCleanup(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eski yedekleri temizle?</AlertDialogTitle>
            <AlertDialogDescription>
              {cleanupDays} günden eski tüm malzeme yedekleri kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cleanupMutation.isPending} data-testid="button-cleanup-cancel">Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); cleanupMutation.mutate(cleanupDays); }}
              disabled={cleanupMutation.isPending}
              data-testid="button-cleanup-confirm"
            >
              {cleanupMutation.isPending ? "Temizleniyor..." : "Evet, temizle"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Task #177: Toplu kayıt sonrası eksik besin değer doldurma diyaloğu */}
      <Dialog
        open={missingNutritionList.length > 0}
        onOpenChange={(open) => {
          if (!open && !bulkNutritionSubmitting) {
            setMissingNutritionList([]);
            setLastBulkPayload(null);
            setBulkNutritionRows({});
            setBulkNutritionError(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl" data-testid="dialog-bulk-missing-nutrition">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Eksik Besin Değerlerini Doldur ({missingNutritionList.length})
            </DialogTitle>
            <DialogDescription>
              {canEditNutrition
                ? "Aşağıdaki malzemeler için besin değer kaydı yok. Şimdi doldurursanız ekran arkası temizliğine gerek kalmaz. Boş bırakılan satırlar atlanır."
                : "Aşağıdaki malzemelerin besin değer kaydı eksik. Yazma yetkiniz olmadığı için form salt-okunurdur — gıda mühendisinden tamamlamasını isteyin."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-auto">
            {missingNutritionList.map((name) => {
              const row = bulkNutritionRows[name] || emptyRowNutrition();
              return (
                <div
                  key={name}
                  className="border rounded-md p-3 space-y-2"
                  data-testid={`row-missing-nutrition-${name}`}
                >
                  <div className="font-medium text-sm flex items-center gap-2">
                    <span className="font-mono">{name}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <Label className="text-xs">Enerji (kcal)</Label>
                      <Input
                        type="number" step="0.1" inputMode="decimal"
                        value={row.energyKcal}
                        readOnly={!canEditNutrition}
                        onChange={e => updateBulkNutritionRow(name, { energyKcal: e.target.value })}
                        data-testid={`input-bulk-nutrition-kcal-${name}`}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Yağ (g)</Label>
                      <Input
                        type="number" step="0.1" inputMode="decimal"
                        value={row.fatG}
                        readOnly={!canEditNutrition}
                        onChange={e => updateBulkNutritionRow(name, { fatG: e.target.value })}
                        data-testid={`input-bulk-nutrition-fat-${name}`}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Doymuş Yağ (g)</Label>
                      <Input
                        type="number" step="0.1" inputMode="decimal"
                        value={row.saturatedFatG}
                        readOnly={!canEditNutrition}
                        onChange={e => updateBulkNutritionRow(name, { saturatedFatG: e.target.value })}
                        data-testid={`input-bulk-nutrition-sfat-${name}`}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Karbonhidrat (g)</Label>
                      <Input
                        type="number" step="0.1" inputMode="decimal"
                        value={row.carbohydrateG}
                        readOnly={!canEditNutrition}
                        onChange={e => updateBulkNutritionRow(name, { carbohydrateG: e.target.value })}
                        data-testid={`input-bulk-nutrition-carb-${name}`}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Şeker (g)</Label>
                      <Input
                        type="number" step="0.1" inputMode="decimal"
                        value={row.sugarG}
                        readOnly={!canEditNutrition}
                        onChange={e => updateBulkNutritionRow(name, { sugarG: e.target.value })}
                        data-testid={`input-bulk-nutrition-sugar-${name}`}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Protein (g)</Label>
                      <Input
                        type="number" step="0.1" inputMode="decimal"
                        value={row.proteinG}
                        readOnly={!canEditNutrition}
                        onChange={e => updateBulkNutritionRow(name, { proteinG: e.target.value })}
                        data-testid={`input-bulk-nutrition-protein-${name}`}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Tuz (g)</Label>
                      <Input
                        type="number" step="0.1" inputMode="decimal"
                        value={row.saltG}
                        readOnly={!canEditNutrition}
                        onChange={e => updateBulkNutritionRow(name, { saltG: e.target.value })}
                        data-testid={`input-bulk-nutrition-salt-${name}`}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1.5">
                      Alerjenler
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ALLERGEN_OPTIONS.map(a => {
                        const selected = row.allergens.includes(a);
                        return (
                          <Badge
                            key={a}
                            variant={selected ? "default" : "outline"}
                            className={cn("toggle-elevate", canEditNutrition ? "cursor-pointer" : "cursor-not-allowed opacity-70")}
                            onClick={() => { if (canEditNutrition) toggleBulkRowAllergen(name, a); }}
                            data-testid={`badge-bulk-allergen-${name}-${a}`}
                          >
                            {selected && <Check className="w-3 h-3 mr-1" />}
                            {a}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {bulkNutritionError && (
            <div className="text-xs text-destructive" data-testid="text-bulk-nutrition-error">
              {bulkNutritionError}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setMissingNutritionList([]);
                setLastBulkPayload(null);
                setBulkNutritionRows({});
                setBulkNutritionError(null);
              }}
              disabled={bulkNutritionSubmitting}
              data-testid="button-bulk-nutrition-skip"
            >
              Atla ve kapat
            </Button>
            <Button
              onClick={() => submitBulkNutrition()}
              disabled={bulkNutritionSubmitting || !canEditNutrition}
              title={canEditNutrition ? undefined : "Besin değer yazma yetkiniz yok"}
              data-testid="button-bulk-nutrition-save"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              {bulkNutritionSubmitting ? "Kaydediliyor..." : "Kaydet ve gönder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task #185 — Besin değer geçmişi diyaloğu */}
      <Dialog open={!!historyName} onOpenChange={(o) => { if (!o) setHistoryName(null); }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" data-testid="dialog-nutrition-history">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Besin Değer Geçmişi — <span className="font-mono">{historyName}</span>
            </DialogTitle>
            <DialogDescription>
              Bu malzemenin besin değer / alerjen kayıtlarında yapılan tüm değişiklikler.
              Kim, ne zaman, neyi değiştirdi.
            </DialogDescription>
          </DialogHeader>

          {historyLoading && (
            <div className="text-sm text-muted-foreground text-center py-8" data-testid="text-history-loading">
              Yükleniyor...
            </div>
          )}

          {!historyLoading && historyRows && historyRows.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8" data-testid="text-history-empty">
              Bu malzeme için henüz bir değişiklik kaydı yok.
            </div>
          )}

          {!historyLoading && historyRows && historyRows.length > 0 && (
            <div className="space-y-3">
              {historyRows.map((row: any) => {
                const before = row.before || {};
                const after = row.after || {};
                const FIELDS: Array<[string, string]> = [
                  ["energyKcal", "Kcal"], ["fatG", "Yağ"], ["saturatedFatG", "Doymuş Yağ"],
                  ["carbohydrateG", "Karb"], ["sugarG", "Şeker"], ["proteinG", "Protein"],
                  ["saltG", "Tuz"],
                ];
                const changes: Array<{ label: string; old: any; nw: any }> = [];
                for (const [k, lbl] of FIELDS) {
                  const o = before?.[k] ?? null;
                  const n = after?.[k] ?? null;
                  if (String(o ?? "") !== String(n ?? "")) {
                    changes.push({ label: lbl, old: o, nw: n });
                  }
                }
                const oldAll = Array.isArray(before?.allergens) ? before.allergens.join(",") : "";
                const newAll = Array.isArray(after?.allergens) ? after.allergens.join(",") : "";
                if (oldAll !== newAll) {
                  changes.push({ label: "Alerjenler", old: oldAll || "—", nw: newAll || "—" });
                }
                const date = row.changedAt ? new Date(row.changedAt) : null;
                return (
                  <div
                    key={row.id}
                    className="border rounded-md p-3 space-y-2"
                    data-testid={`row-history-${row.id}`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={row.action === "create" ? "default" : "secondary"}>
                          {row.action}
                        </Badge>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {row.source}
                        </Badge>
                        {row.changedByRole && (
                          <Badge variant="outline" className="text-[10px]">{row.changedByRole}</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {date ? date.toLocaleString("tr-TR") : "—"}
                      </div>
                    </div>
                    <div className="text-xs">
                      <span className="text-muted-foreground">Değiştiren: </span>
                      <span className="font-medium" data-testid={`text-history-user-${row.id}`}>
                        {row.changedByName?.trim() || row.changedBy || "—"}
                      </span>
                    </div>
                    {row.note && (
                      <div className="text-xs text-muted-foreground italic">{row.note}</div>
                    )}
                    {changes.length === 0 ? (
                      <div className="text-xs text-muted-foreground">
                        {row.action === "create" ? "İlk kayıt oluşturuldu." : "Görünür alanlarda değişiklik yok."}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {changes.map((c, i) => (
                          <div
                            key={i}
                            className="text-xs flex items-center gap-2 border rounded-sm px-2 py-1"
                            data-testid={`change-${row.id}-${c.label}`}
                          >
                            <span className="font-medium">{c.label}:</span>
                            <span className="font-mono text-muted-foreground line-through">
                              {c.old == null || c.old === "" ? "—" : String(c.old)}
                            </span>
                            <span>→</span>
                            <span className="font-mono">
                              {c.nw == null || c.nw === "" ? "—" : String(c.nw)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setHistoryName(null)} data-testid="button-close-history">
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* R-5A: Malzeme Düzenle Dialog */}
      <Dialog open={!!editIngredient} onOpenChange={(open) => !open && setEditIngredient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Malzeme Düzenle</DialogTitle>
            <DialogDescription>
              {editIngredient?.name} ({editIngredient?.refId || editIngredient?.ref_id})
            </DialogDescription>
          </DialogHeader>
          {editIngredient && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Miktar</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editIngredient.amount || ""}
                    onChange={(e) => setEditIngredient({ ...editIngredient, amount: e.target.value })}
                    data-testid="input-edit-ingredient-amount"
                  />
                </div>
                <div>
                  <Label>Birim</Label>
                  <Select
                    value={editIngredient.unit || "gr"}
                    onValueChange={(v) => setEditIngredient({ ...editIngredient, unit: v })}
                  >
                    <SelectTrigger data-testid="select-edit-ingredient-unit"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gr">gr</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="lt">lt</SelectItem>
                      <SelectItem value="adet">adet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Kategori</Label>
                <Select
                  value={editIngredient.ingredientCategory || editIngredient.ingredient_category || "ana"}
                  onValueChange={(v) => setEditIngredient({ ...editIngredient, ingredientCategory: v })}
                >
                  <SelectTrigger data-testid="select-edit-ingredient-category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ana">Ana Malzeme</SelectItem>
                    <SelectItem value="katki">Katkı / Improver</SelectItem>
                    <SelectItem value="lezzet">Lezzet / Aroma</SelectItem>
                    <SelectItem value="kaplama">Kaplama</SelectItem>
                    <SelectItem value="dolgu">Dolgu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Hammadde (envanter) eşleştirme — "BEYAZ ÇİKOLATA"yı başka ürünle değiştirme */}
              <div>
                <Label>Hammadde Eşleştirme</Label>
                <div className="mt-1 space-y-2">
                  {(editIngredient.inventoryCode || editIngredient.inventoryName) ? (
                    <div
                      className="flex items-center gap-2 text-xs p-2 bg-muted/50 rounded"
                      data-testid="text-edit-ingredient-current-inventory"
                    >
                      <Link2 className="h-3 w-3 text-emerald-500 shrink-0" />
                      <span className="truncate">
                        Mevcut: {editIngredient.inventoryCode && (
                          <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                            {editIngredient.inventoryCode}
                          </strong>
                        )}
                        {editIngredient.inventoryName && (
                          <> — {editIngredient.inventoryName}</>
                        )}
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded flex items-center gap-2">
                      <Unlink className="h-3 w-3 shrink-0" />
                      <span>Henüz envanter ürünü ile eşleşmemiş</span>
                    </div>
                  )}
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      className="pl-7"
                      placeholder="Hammadde ara (en az 2 karakter, kod veya isim)..."
                      value={inventorySearch}
                      onChange={(e) => setInventorySearch(e.target.value)}
                      data-testid="input-edit-ingredient-inventory-search"
                    />
                  </div>
                  {inventorySearch.trim().length >= 2 && (
                    <div
                      className="max-h-40 overflow-y-auto border rounded space-y-0.5 p-1"
                      data-testid="list-edit-ingredient-inventory-results"
                    >
                      {inventoryFetching && inventoryItems.length === 0 ? (
                        <div className="text-xs text-muted-foreground p-2 text-center">
                          Yükleniyor...
                        </div>
                      ) : filteredInventoryItems.length === 0 ? (
                        <div className="text-xs text-muted-foreground p-2 text-center">
                          Sonuç bulunamadı
                        </div>
                      ) : (
                        filteredInventoryItems.map((item: any) => {
                          const isSelected = Number(editIngredient.rawMaterialId) === Number(item.id);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              className={cn(
                                "w-full text-left text-xs px-2 py-1.5 rounded hover-elevate",
                                isSelected && "bg-primary/10",
                              )}
                              onClick={() =>
                                setEditIngredient({
                                  ...editIngredient,
                                  rawMaterialId: item.id,
                                  inventoryCode: item.code,
                                  inventoryName: item.name,
                                  // Birim boşsa envanterden gelen birimi al, gr fallback en son
                                  unit: editIngredient.unit || item.unit || "gr",
                                })
                              }
                              data-testid={`button-select-inventory-${item.id}`}
                            >
                              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                                {item.code}
                              </span>
                              {" — "}
                              <span>{item.name}</span>
                              {item.unit && (
                                <span className="text-muted-foreground ml-1">({item.unit})</span>
                              )}
                              {isSelected && (
                                <Check className="inline-block h-3 w-3 ml-1 text-emerald-500" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                  {editIngredient.rawMaterialId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-amber-600 dark:text-amber-400 h-7"
                      onClick={() =>
                        setEditIngredient({
                          ...editIngredient,
                          rawMaterialId: null,
                          inventoryCode: null,
                          inventoryName: null,
                        })
                      }
                      data-testid="button-clear-ingredient-inventory"
                    >
                      <Unlink className="h-3 w-3 mr-1" /> Eşleşmeyi Kaldır
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <Label>Notlar (opsiyonel)</Label>
                <Textarea
                  rows={2}
                  value={editIngredient.notes || ""}
                  onChange={(e) => setEditIngredient({ ...editIngredient, notes: e.target.value })}
                  data-testid="input-edit-ingredient-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditIngredient(null)}>İptal</Button>
            <Button
              onClick={() => {
                if (!editIngredient?.id) return;
                // Miktar boş veya geçersizse mutation'ı engelle
                const amountStr = String(editIngredient.amount ?? "").trim();
                const amountNum = Number(amountStr);
                if (!amountStr || !Number.isFinite(amountNum) || amountNum <= 0) {
                  toast({
                    title: "Geçersiz miktar",
                    description: "Miktar 0'dan büyük bir sayı olmalı",
                    variant: "destructive",
                  });
                  return;
                }
                // Birim boşsa güvenli fallback
                const safeUnit = (editIngredient.unit || "").trim() || "gr";
                // rawMaterialId: undefined gönderirsek backend dokunmaz; null ise eşleşmeyi kaldırır.
                // NaN ihtimaline karşı Number.isFinite guard ile koruyoruz; geçersiz değer
                // yanlışlıkla envanter eşleşmesini bozmasın diye undefined'a düşüyor.
                const rawMaterialIdRaw = editIngredient.rawMaterialId;
                let rawMaterialIdPayload: number | null | undefined;
                if (rawMaterialIdRaw === null || rawMaterialIdRaw === "") {
                  rawMaterialIdPayload = null;
                } else if (rawMaterialIdRaw === undefined) {
                  rawMaterialIdPayload = undefined;
                } else {
                  const n = Number(rawMaterialIdRaw);
                  rawMaterialIdPayload = Number.isFinite(n) ? n : undefined;
                }
                editIngredientMutation.mutate({
                  ingredientId: editIngredient.id,
                  data: {
                    amount: amountStr,
                    unit: safeUnit,
                    ingredientCategory:
                      editIngredient.ingredientCategory || editIngredient.ingredient_category,
                    notes: editIngredient.notes,
                    ...(rawMaterialIdPayload !== undefined
                      ? { rawMaterialId: rawMaterialIdPayload }
                      : {}),
                  },
                });
              }}
              disabled={editIngredientMutation.isPending}
              data-testid="button-save-edit-ingredient"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              {editIngredientMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* R-5A: Malzeme Sil Onay Dialog */}
      <AlertDialog open={!!deleteIngredient} onOpenChange={(open) => !open && setDeleteIngredient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Malzemeyi sil?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteIngredient?.name}</strong> ({deleteIngredient?.amount} {deleteIngredient?.unit}) silinecek.
              Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteIngredient?.id) deleteIngredientMutation.mutate(deleteIngredient.id);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-ingredient"
            >
              {deleteIngredientMutation.isPending ? "Siliniyor..." : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* R-5A: Adım Düzenle Dialog */}
      <Dialog open={!!editStep} onOpenChange={(open) => !open && setEditStep(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adım Düzenle</DialogTitle>
            <DialogDescription>
              Adım #{editStep?.stepNumber || editStep?.step_number}
            </DialogDescription>
          </DialogHeader>
          {editStep && (
            <div className="space-y-3">
              <div>
                <Label>Başlık</Label>
                <Input
                  value={editStep.title || ""}
                  onChange={(e) => setEditStep({ ...editStep, title: e.target.value })}
                  data-testid="input-edit-step-title"
                />
              </div>
              <div>
                <Label>Açıklama</Label>
                <Textarea
                  rows={4}
                  value={editStep.content || ""}
                  onChange={(e) => setEditStep({ ...editStep, content: e.target.value })}
                  data-testid="input-edit-step-content"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Timer (saniye)</Label>
                  <Input
                    type="number"
                    value={editStep.timerSeconds || editStep.timer_seconds || ""}
                    onChange={(e) => setEditStep({ ...editStep, timerSeconds: e.target.value })}
                    data-testid="input-edit-step-timer"
                  />
                </div>
                <div>
                  <Label>İpucu</Label>
                  <Input
                    value={editStep.tips || ""}
                    onChange={(e) => setEditStep({ ...editStep, tips: e.target.value })}
                    data-testid="input-edit-step-tips"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditStep(null)}>İptal</Button>
            <Button
              onClick={() => {
                if (!editStep?.id) return;
                editStepMutation.mutate({
                  stepId: editStep.id,
                  data: {
                    title: editStep.title,
                    content: editStep.content,
                    timerSeconds: editStep.timerSeconds || editStep.timer_seconds || null,
                    tips: editStep.tips,
                  },
                });
              }}
              disabled={editStepMutation.isPending}
              data-testid="button-save-edit-step"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              {editStepMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* R-5A: Adım Sil Onay Dialog */}
      <AlertDialog open={!!deleteStep} onOpenChange={(open) => !open && setDeleteStep(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Adımı sil?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>Adım #{deleteStep?.stepNumber || deleteStep?.step_number}: {deleteStep?.title}</strong> silinecek.
              Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteStep?.id) deleteStepMutation.mutate(deleteStep.id);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-step"
            >
              {deleteStepMutation.isPending ? "Siliniyor..." : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
