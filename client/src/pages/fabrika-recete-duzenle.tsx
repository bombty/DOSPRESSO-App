import { useState, useEffect } from "react";
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
  ChevronsUpDown, Check, AlertTriangle, Pencil, Upload, FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

  const canEdit = ["admin", "recete_gm", "sef"].includes(user?.role || "");
  // Task #184: Besin değer / alerjen düzenleme yalnızca gıda mühendisi + admin
  // + recete_gm yetkisindedir. Şef reçete malzemesi ekleyebilir ama besin değer
  // tablosunu güncelleyemez (form salt-okunur, kaydet butonu disable).
  const canEditNutrition = ["admin", "gida_muhendisi", "recete_gm"].includes(user?.role || "");
  if (!canEdit) {
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
  });

  const [ingredients, setIngredients] = useState<any[]>([]);
  const [steps, setSteps] = useState<any[]>([]);
  const [newIngredient, setNewIngredient] = useState({ refId: "", name: "", amount: "", unit: "gr", category: "ana", type: "normal" });
  const [newStep, setNewStep] = useState({ title: "", content: "", timerSeconds: "", tips: "" });
  const [nameComboOpen, setNameComboOpen] = useState(false);
  const [confirmNewName, setConfirmNewName] = useState<string | null>(null);

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
      });
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
    const payload = {
      ingredients: bulkRows.map(r => ({
        refId: r.refId,
        name: r.name,
        amount: parseFloat(r.amount),
        unit: r.unit,
        ingredientCategory: r.category,
        ingredientType: r.type,
      })),
      allowUnknown: force,
    };

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
      qc.invalidateQueries({ queryKey: ["/api/factory/recipes", id] });
      qc.invalidateQueries({ queryKey: ["/api/factory/ingredient-names"] });
      toast({
        title: "Malzemeler içe aktarıldı",
        description: `${payload.ingredients.length} malzeme kaydedildi${data?.unknownIngredients?.length ? ` (${data.unknownIngredients.length} yeni isim)` : ""}`,
      });
      setBulkOpen(false);
      setBulkText("");
      setBulkUnknown([]);
      setBulkParseError(null);
    } catch (e: any) {
      setBulkParseError(e?.message || "Hata");
    } finally {
      setBulkSubmitting(false);
    }
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

      {/* MALZEMELER (sadece kayıtlı reçete) */}
      {!isNew && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base">Malzemeler ({ingredients.length})</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setBulkOpen(true); setBulkUnknown([]); setBulkParseError(null); }}
                data-testid="button-open-bulk-import"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Toplu İçe Aktar
              </Button>
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
                <span className="flex-1 text-sm">{ing.name}</span>
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
            <CardTitle className="text-base">Üretim Adımları ({steps.length})</CardTitle>
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
    </div>
  );
}
