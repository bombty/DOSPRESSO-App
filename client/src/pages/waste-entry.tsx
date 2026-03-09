import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2, Camera, Plus, Trash2, Loader2 } from "lucide-react";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

const RESPONSIBILITY_SCOPES = [
  { value: "demand", labelTr: "Talep", labelEn: "Demand" },
  { value: "merchandising", labelTr: "Mağazacılık", labelEn: "Merchandising" },
  { value: "marketing", labelTr: "Pazarlama", labelEn: "Marketing" },
  { value: "recipe_quality", labelTr: "Reçete Kalitesi", labelEn: "Recipe Quality" },
  { value: "production_defect", labelTr: "Üretim Hatası", labelEn: "Production Defect" },
  { value: "prep_error", labelTr: "Hazırlık Hatası", labelEn: "Prep Error" },
  { value: "logistics_cold_chain", labelTr: "Lojistik / Soğuk Zincir", labelEn: "Logistics / Cold Chain" },
  { value: "storage", labelTr: "Depolama", labelEn: "Storage" },
  { value: "expiry", labelTr: "Son Kullanma", labelEn: "Expiry" },
  { value: "unknown", labelTr: "Bilinmiyor", labelEn: "Unknown" },
];

const UNITS = [
  { value: "adet", label: "Adet" },
  { value: "kg", label: "Kg" },
  { value: "lt", label: "Lt" },
  { value: "paket", label: "Paket" },
];

export default function WasteEntry() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation("common");
  const { toast } = useToast();
  const lang = i18n.language?.startsWith("en") ? "en" : "tr";

  const [categoryId, setCategoryId] = useState<string>("");
  const [reasonId, setReasonId] = useState<string>("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("adet");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [responsibilityScope, setResponsibilityScope] = useState("unknown");
  const [notes, setNotes] = useState("");
  const [productGroup, setProductGroup] = useState("");
  const [lotId, setLotId] = useState("");
  const [supplierBatch, setSupplierBatch] = useState("");
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);
  const [validationIssues, setValidationIssues] = useState<any[]>([]);

  const { data: categories = [], isLoading: categoriesLoading, isError, refetch } = useQuery<any[]>({
    queryKey: ["/api/waste/categories"],
  });

  const { data: reasons = [], isLoading: reasonsLoading } = useQuery<any[]>({
    queryKey: ["/api/waste/reasons", categoryId],
    queryFn: async () => {
      const url = categoryId
        ? `/api/waste/reasons?categoryId=${categoryId}`
        : "/api/waste/reasons";
      const res = await fetch(url, { credentials: "include" });
      return res.json();
    },
    enabled: true,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/waste/events", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: t("waste.eventCreated", { defaultValue: "Kayıt oluşturuldu" }),
        description: data.warnings?.length > 0
          ? data.warnings.map((w: any) => w.message).join(", ")
          : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/waste/events"] });
      resetForm();
    },
    onError: (error: any) => {
      if (error?.issues) {
        setValidationIssues(error.issues);
      }
      toast({
        title: t("waste.eventError", { defaultValue: "Hata oluştu" }),
        description: error?.message || "Kayıt oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  function resetForm() {
    setCategoryId("");
    setReasonId("");
    setQuantity("");
    setUnit("adet");
    setEstimatedCost("");
    setResponsibilityScope("unknown");
    setNotes("");
    setProductGroup("");
    setLotId("");
    setSupplierBatch("");
    setEvidencePhotos([]);
    setValidationIssues([]);
  }

  async function handleSubmit() {
    setValidationIssues([]);
    try {
      const res = await apiRequest("POST", "/api/waste/events", {
        categoryId: Number(categoryId),
        reasonId: Number(reasonId),
        quantity,
        unit,
        estimatedCost: estimatedCost || null,
        responsibilityScope,
        notes,
        productGroup: productGroup || null,
        lotId: lotId || null,
        supplierBatch: supplierBatch || null,
        evidencePhotos,
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.issues) {
          setValidationIssues(data.issues);
        }
        toast({ title: "Hata", description: data.message || "Kayıt oluşturulamadı", variant: "destructive" });
        return;
      }
      toast({
        title: t("waste.eventCreated", { defaultValue: "Kayıt oluşturuldu" }),
        description: data.warnings?.length > 0
          ? data.warnings.map((w: any) => w.message).join("; ")
          : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/waste/events"] });
      resetForm();
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "Beklenmeyen hata", variant: "destructive" });
    }
  }

  function handlePhotoUrlAdd() {
    const url = prompt(t("waste.enterPhotoUrl", { defaultValue: "Fotoğraf URL'sini girin:" }));
    if (url && url.trim()) {
      setEvidencePhotos([...evidencePhotos, url.trim()]);
    }
  }

  const isLoading = categoriesLoading || reasonsLoading;
  const blockingIssues = validationIssues.filter((i) => i.severity === "block");
  const warningIssues = validationIssues.filter((i) => i.severity === "warn");

  if (isLoading) {
    
  if (categoriesLoading) return <LoadingState />;

  return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" data-testid="text-waste-entry-title">
            <AlertTriangle className="h-5 w-5" />
            {t("waste.newEntry", { defaultValue: "Yeni Zai/Fire Kaydı" })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("waste.category", { defaultValue: "Kategori" })}</Label>
              <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setReasonId(""); }} data-testid="select-category">
                <SelectTrigger data-testid="select-category-trigger">
                  <SelectValue placeholder={t("waste.selectCategory", { defaultValue: "Kategori seçin" })} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)} data-testid={`option-category-${c.id}`}>
                      {lang === "en" && c.nameEn ? c.nameEn : c.nameTr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("waste.reason", { defaultValue: "Neden" })}</Label>
              <Select value={reasonId} onValueChange={setReasonId} data-testid="select-reason">
                <SelectTrigger data-testid="select-reason-trigger">
                  <SelectValue placeholder={t("waste.selectReason", { defaultValue: "Neden seçin" })} />
                </SelectTrigger>
                <SelectContent>
                  {reasons
                    .filter((r: any) => !categoryId || r.categoryId === Number(categoryId))
                    .map((r: any) => (
                      <SelectItem key={r.id} value={String(r.id)} data-testid={`option-reason-${r.id}`}>
                        {lang === "en" && r.nameEn ? r.nameEn : r.nameTr}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t("waste.quantity", { defaultValue: "Miktar" })}</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                data-testid="input-quantity"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("waste.unit", { defaultValue: "Birim" })}</Label>
              <Select value={unit} onValueChange={setUnit} data-testid="select-unit">
                <SelectTrigger data-testid="select-unit-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("waste.estimatedCost", { defaultValue: "Tahmini Maliyet (₺)" })}</Label>
              <Input
                type="number"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                placeholder="0.00"
                data-testid="input-cost"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("waste.responsibilityScope", { defaultValue: "Sorumluluk Alanı" })}</Label>
              <Select value={responsibilityScope} onValueChange={setResponsibilityScope} data-testid="select-scope">
                <SelectTrigger data-testid="select-scope-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESPONSIBILITY_SCOPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {lang === "en" ? s.labelEn : s.labelTr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("waste.productGroup", { defaultValue: "Ürün / Ürün Grubu" })}</Label>
              <Input
                value={productGroup}
                onChange={(e) => setProductGroup(e.target.value)}
                placeholder={t("waste.productGroupPlaceholder", { defaultValue: "Ör: Latte, Croissant" })}
                data-testid="input-product-group"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("waste.lotId", { defaultValue: "Lot Numarası" })}</Label>
              <Input
                value={lotId}
                onChange={(e) => setLotId(e.target.value)}
                placeholder={t("waste.lotIdPlaceholder", { defaultValue: "Opsiyonel" })}
                data-testid="input-lot-id"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("waste.supplierBatch", { defaultValue: "Tedarikçi Partisi" })}</Label>
              <Input
                value={supplierBatch}
                onChange={(e) => setSupplierBatch(e.target.value)}
                placeholder={t("waste.supplierBatchPlaceholder", { defaultValue: "Opsiyonel" })}
                data-testid="input-supplier-batch"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("waste.notes", { defaultValue: "Açıklama (min 10 karakter)" })}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("waste.notesPlaceholder", { defaultValue: "Detaylı açıklama yazın..." })}
              className="min-h-[80px]"
              data-testid="textarea-notes"
            />
            <span className="text-xs text-muted-foreground">{notes.length}/10</span>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              {t("waste.evidencePhotos", { defaultValue: "Kanıt Fotoğrafları" })}
            </Label>
            <div className="flex flex-wrap gap-2">
              {evidencePhotos.map((url, i) => (
                <div key={i} className="relative group">
                  <Badge variant="secondary" className="pr-6" data-testid={`badge-photo-${i}`}>
                    {t("waste.photo", { defaultValue: "Fotoğraf" })} {i + 1}
                    <button
                      className="absolute right-1 top-1/2 -translate-y-1/2"
                      onClick={() => setEvidencePhotos(evidencePhotos.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePhotoUrlAdd}
                data-testid="button-add-photo"
              >
                <Plus className="h-4 w-4 mr-1" />
                {t("waste.addPhoto", { defaultValue: "Fotoğraf Ekle" })}
              </Button>
            </div>
          </div>

          {blockingIssues.length > 0 && (
            <div className="rounded-md border border-destructive p-3 space-y-1" data-testid="validation-errors">
              {blockingIssues.map((issue, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{issue.message}</span>
                </div>
              ))}
            </div>
          )}

          {warningIssues.length > 0 && (
            <div className="rounded-md border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10 p-3 space-y-1" data-testid="validation-warnings">
              {warningIssues.map((issue, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{issue.message}</span>
                </div>
              ))}
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!categoryId || !reasonId || !quantity || createMutation.isPending}
            data-testid="button-submit-waste"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {createMutation.isPending
              ? t("waste.submitting", { defaultValue: "Kaydediliyor..." })
              : t("waste.submit", { defaultValue: "Kaydet" })}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
