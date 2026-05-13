// ═══════════════════════════════════════════════════════════════════
// Sprint 50 (Aslan 13 May 2026) — Supplier AI Helper Dialog
// ═══════════════════════════════════════════════════════════════════
// Mr. Dobody'den tedarikçi kart oluşturma asistanı
// Açık modal: isim yaz → AI öneri → Düzenle/Onay → Kayıt
// ═══════════════════════════════════════════════════════════════════

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Wand2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Suggestion {
  name?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  categories?: string[];
  iso22000Certified?: boolean;
  haccpCertified?: boolean;
  halalCertified?: boolean;
  notes?: string;
  confidence?: "high" | "medium" | "low";
  reasoning?: string;
}

interface SupplierAiHelperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
}

export function SupplierAiHelperDialog({
  open,
  onOpenChange,
  initialName,
}: SupplierAiHelperDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<"input" | "suggestion" | "saved">("input");
  const [name, setName] = useState(initialName || "");
  const [context, setContext] = useState("");
  const [category, setCategory] = useState("");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);

  // Form editable fields (suggestion'dan)
  const [form, setForm] = useState({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    iso22000Certified: false,
    haccpCertified: false,
    halalCertified: false,
    notes: "",
  });

  const suggestMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/suppliers/ai-suggest", {
        name,
        context: context || undefined,
        category: category || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.suggestion) {
        setSuggestion(data.suggestion);
        setDuplicateWarning(data.duplicateWarning);
        // Form'u öneri ile doldur
        setForm({
          name: data.suggestion.name || name,
          contactPerson: data.suggestion.contactPerson || "",
          email: data.suggestion.email || "",
          phone: data.suggestion.phone || "",
          address: data.suggestion.address || "",
          city: data.suggestion.city || "",
          iso22000Certified: !!data.suggestion.iso22000Certified,
          haccpCertified: !!data.suggestion.haccpCertified,
          halalCertified: !!data.suggestion.halalCertified,
          notes: data.suggestion.notes || "",
        });
        setStep("suggestion");
      }
    },
    onError: (err: any) => {
      toast({ title: "AI öneri alınamadı", description: err.message, variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/suppliers/ai-create", {
        ...form,
        categories: suggestion?.categories || [],
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "🎉 Tedarikçi oluşturuldu",
        description: "Mr. Dobody yardımıyla kayıt başarılı",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setStep("saved");
      setTimeout(() => {
        onOpenChange(false);
        // State sıfırla
        setStep("input");
        setName("");
        setContext("");
        setSuggestion(null);
        setDuplicateWarning(null);
      }, 2500);
    },
    onError: (err: any) => {
      toast({ title: "Kayıt başarısız", description: err.message, variant: "destructive" });
    },
  });

  const confidenceColor = (c?: string) => {
    if (c === "high") return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300";
    if (c === "medium") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300";
    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            Mr. Dobody — Tedarikçi Asistanı
          </DialogTitle>
          <DialogDescription>
            Tedarikçi adını yaz, Mr. Dobody iletişim ve sertifika bilgilerini önersin
          </DialogDescription>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-4">
            <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 rounded-md p-3 text-sm space-y-1">
              <p className="flex items-center gap-2 font-medium">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Nasıl çalışır?
              </p>
              <ol className="list-decimal pl-5 text-xs space-y-0.5 text-muted-foreground">
                <li>Tedarikçi adını yaz</li>
                <li>Opsiyonel: bağlam ekle (kategori, lokasyon, vs.)</li>
                <li>"AI Öner" — Mr. Dobody form alanlarını tahmin eder</li>
                <li>Önerileri düzenle/onayla → DB'ye kaydedilir</li>
              </ol>
            </div>

            <div>
              <Label htmlFor="ai-name">Tedarikçi Adı *</Label>
              <Input
                id="ai-name"
                placeholder="Örn: Kalealtı Aromaları"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-supplier-name"
              />
            </div>

            <div>
              <Label htmlFor="ai-context">Ek Bağlam (opsiyonel)</Label>
              <Textarea
                id="ai-context"
                placeholder="Örn: İstanbul'da, gıda aroması, geçen yıl bir miktar ürün aldık..."
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="ai-category">Kategori İpucu (opsiyonel)</Label>
              <Input
                id="ai-category"
                placeholder="Örn: aroma_verici, yag, un_nisasta"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                İptal
              </Button>
              <Button
                onClick={() => suggestMutation.mutate()}
                disabled={!name.trim() || suggestMutation.isPending}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                data-testid="btn-ai-suggest"
              >
                {suggestMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    AI düşünüyor...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    AI Öner
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "suggestion" && suggestion && (
          <div className="space-y-4">
            {/* AI Confidence */}
            <div className="flex items-center justify-between p-3 rounded-md bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">AI Önerileri</span>
              </div>
              {suggestion.confidence && (
                <Badge className={confidenceColor(suggestion.confidence)}>
                  {suggestion.confidence === "high" ? "Yüksek güven" :
                   suggestion.confidence === "medium" ? "Orta güven" : "Düşük güven"}
                </Badge>
              )}
            </div>

            {suggestion.reasoning && (
              <div className="text-xs text-muted-foreground italic px-1">
                💭 {suggestion.reasoning}
              </div>
            )}

            {duplicateWarning && (
              <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-300 rounded-md p-2.5 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" />
                <span>
                  "<strong>{duplicateWarning.existingName}</strong>" zaten kayıtlı (ID #{duplicateWarning.existingId}). Farklı bir isim mi?
                </span>
              </div>
            )}

            {/* Edit form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label>Ad *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  data-testid="input-edit-name"
                />
              </div>
              <div>
                <Label>İletişim Kişisi</Label>
                <Input
                  value={form.contactPerson}
                  onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                  placeholder="Yetkili kişi"
                />
              </div>
              <div>
                <Label>Şehir</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div>
                <Label>E-posta</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Adres</Label>
                <Textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Sertifikalar</Label>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={form.iso22000Certified}
                    onCheckedChange={(c) => setForm({ ...form, iso22000Certified: !!c })}
                  />
                  ISO 22000
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={form.haccpCertified}
                    onCheckedChange={(c) => setForm({ ...form, haccpCertified: !!c })}
                  />
                  HACCP
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={form.halalCertified}
                    onCheckedChange={(c) => setForm({ ...form, halalCertified: !!c })}
                  />
                  Helal
                </label>
              </div>
            </div>

            {suggestion.categories && suggestion.categories.length > 0 && (
              <div>
                <Label>Kategoriler</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {suggestion.categories.map((cat, idx) => (
                    <Badge key={idx} variant="outline">{cat}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label>Notlar</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep("input")}>
                Geri
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!form.name.trim() || createMutation.isPending}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                data-testid="btn-confirm-create"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Onayla ve Kaydet
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "saved" && (
          <div className="py-8 text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold">Tedarikçi Eklendi!</h3>
            <p className="text-sm text-muted-foreground">
              Mr. Dobody yardımıyla yeni tedarikçi oluşturuldu.<br/>
              Tedarikçi listesi güncellendi.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
