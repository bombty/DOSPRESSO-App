// ═══════════════════════════════════════════════════════════════════
// Sprint 52 (Aslan 13 May 2026) — B2B Toptan Müşteriler
// ═══════════════════════════════════════════════════════════════════
// Franchise dışı toptan müşteriler (restoran, otel, cafe vb.)
// Samet, CGO, CEO, Admin yönetir.
// Mr. Dobody AI yardımcı ile hızlı ekleme.
// ═══════════════════════════════════════════════════════════════════

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Briefcase,
  Plus,
  Search,
  Edit,
  Bot,
  Sparkles,
  Loader2,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  Wand2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  B2B_COMPANY_TYPES,
  B2B_COMPANY_TYPE_LABELS,
  type B2bCompanyType,
} from "@shared/schema/schema-31-fabrika-refactor";

interface B2bCustomer {
  id: number;
  code: string;
  name: string;
  companyType: string | null;
  taxNumber: string | null;
  taxOffice: string | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  creditLimit: string;
  paymentTermDays: number;
  discountRate: string;
  status: string;
  notes: string | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  aktif: { label: "Aktif", color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
  pasif: { label: "Pasif", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  blokeli: { label: "Blokeli", color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
};

export default function B2bCustomersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showAiHelper, setShowAiHelper] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);

  const { data: customerData, isLoading } = useQuery<{ customers: B2bCustomer[]; count: number }>({
    queryKey: ["/api/b2b-customers", search, statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("companyType", typeFilter);
      const res = await fetch(`/api/b2b-customers?${params}`);
      return res.json();
    },
  });

  const customers = customerData?.customers || [];

  const formatPrice = (val: string | null) => {
    if (!val) return "—";
    const n = parseFloat(val);
    if (isNaN(n)) return "—";
    return `${n.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺`;
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-blue-600" />
            B2B Toptan Müşteriler
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Franchise dışı satış kanalı • <strong>{customers.length}</strong> müşteri
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setShowAiHelper(true)}
            className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
            data-testid="btn-ai-helper"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Mr. Dobody Yardım
          </Button>
          <Button onClick={() => setShowManualAdd(true)} data-testid="btn-manual-add">
            <Plus className="w-4 h-4 mr-2" />
            Manuel Ekle
          </Button>
        </div>
      </div>

      {/* Filtreler */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Ad, kod, vergi no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue placeholder="Durum" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            <SelectItem value="aktif">Aktif</SelectItem>
            <SelectItem value="pasif">Pasif</SelectItem>
            <SelectItem value="blokeli">Blokeli</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger><SelectValue placeholder="Tip" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Tipler</SelectItem>
            {B2B_COMPANY_TYPES.map(t => (
              <SelectItem key={t} value={t}>{B2B_COMPANY_TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Liste */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{customers.length} müşteri</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Yükleniyor...</div>
          ) : customers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium mb-1">Henüz B2B müşteri yok</p>
              <p className="text-xs">
                Mr. Dobody ile hızlı ekle veya manuel kayıt yap
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kod</TableHead>
                    <TableHead>Ad</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Şehir</TableHead>
                    <TableHead>İletişim</TableHead>
                    <TableHead className="text-right">Kredi Limit</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-center">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c) => {
                    const statusInfo = STATUS_LABELS[c.status] || { label: c.status, color: "" };
                    return (
                      <TableRow key={c.id} data-testid={`row-customer-${c.id}`}>
                        <TableCell className="font-mono text-xs">{c.code}</TableCell>
                        <TableCell>
                          <div className="font-medium">{c.name}</div>
                          {c.taxNumber && (
                            <div className="text-xs text-muted-foreground">VKN: {c.taxNumber}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {c.companyType && (
                            <Badge variant="outline" className="text-xs">
                              {B2B_COMPANY_TYPE_LABELS[c.companyType as B2bCompanyType] || c.companyType}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{c.city || "—"}</TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            {c.phone && (
                              <div className="text-xs flex items-center gap-1">
                                <Phone className="w-3 h-3" />{c.phone}
                              </div>
                            )}
                            {c.email && (
                              <div className="text-xs flex items-center gap-1">
                                <Mail className="w-3 h-3" />{c.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatPrice(c.creditLimit)}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mr. Dobody AI Dialog */}
      <B2bAiHelperDialog open={showAiHelper} onOpenChange={setShowAiHelper} />

      {/* Manuel Ekle Dialog */}
      <B2bManualAddDialog open={showManualAdd} onOpenChange={setShowManualAdd} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// AI Helper Dialog
// ═══════════════════════════════════════════════════════════════════
function B2bAiHelperDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"input" | "suggestion" | "saved">("input");
  const [name, setName] = useState("");
  const [context, setContext] = useState("");
  const [suggestion, setSuggestion] = useState<any>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const suggestMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/b2b-customers/ai-suggest", { name, context });
      return res.json();
    },
    onSuccess: (data) => {
      setSuggestion(data.suggestion);
      setDuplicateWarning(data.duplicateWarning);
      setForm({
        name: data.suggestion.name || name,
        companyType: data.suggestion.companyType || "",
        city: data.suggestion.city || "",
        creditLimit: data.suggestion.creditLimit?.toString() || "0",
        paymentTermDays: data.suggestion.paymentTermDays || 30,
        discountRate: data.suggestion.discountRate?.toString() || "0",
        email: data.suggestion.email || "",
        phone: "",
        taxNumber: "",
        taxOffice: "",
        notes: data.suggestion.notes || "",
      });
      setStep("suggestion");
    },
    onError: (err: any) => {
      toast({ title: "AI öneri alınamadı", description: err.message, variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/b2b-customers", form);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "🎉 Müşteri eklendi", description: "Mr. Dobody yardımıyla başarıyla kayıt" });
      queryClient.invalidateQueries({ queryKey: ["/api/b2b-customers"] });
      setStep("saved");
      setTimeout(() => {
        onOpenChange(false);
        setStep("input");
        setName("");
        setContext("");
      }, 2500);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            Mr. Dobody — B2B Müşteri Asistanı
          </DialogTitle>
          <DialogDescription>
            Müşteri adını yaz, AI bilgi tahminleri yapsın
          </DialogDescription>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-4">
            <div>
              <Label>Müşteri Adı *</Label>
              <Input
                placeholder="Örn: Yorum Restoran"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label>Bağlam (opsiyonel)</Label>
              <Textarea
                placeholder="Örn: İstanbul'da otel restoranı, haftalık 200kg sipariş..."
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
              <Button
                onClick={() => suggestMutation.mutate()}
                disabled={!name.trim() || suggestMutation.isPending}
                className="bg-gradient-to-r from-blue-600 to-purple-600"
              >
                {suggestMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />AI düşünüyor...</>
                ) : (
                  <><Wand2 className="w-4 h-4 mr-2" />AI Öner</>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "suggestion" && suggestion && (
          <div className="space-y-3">
            {suggestion.reasoning && (
              <div className="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded">
                💭 {suggestion.reasoning}
              </div>
            )}
            {duplicateWarning && (
              <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-300 rounded p-2 text-sm flex gap-2 items-center">
                <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" />
                <span>"{duplicateWarning.existingName}" zaten kayıtlı</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Ad *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Tip</Label>
                <Select value={form.companyType} onValueChange={(v) => setForm({ ...form, companyType: v })}>
                  <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
                  <SelectContent>
                    {B2B_COMPANY_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{B2B_COMPANY_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Şehir</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <Label>Vergi No</Label>
                <Input value={form.taxNumber} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })} />
              </div>
              <div>
                <Label>Vergi Dairesi</Label>
                <Input value={form.taxOffice} onChange={(e) => setForm({ ...form, taxOffice: e.target.value })} />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>E-posta</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>Kredi Limit (₺)</Label>
                <Input type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} />
              </div>
              <div>
                <Label>Vade (gün)</Label>
                <Input type="number" value={form.paymentTermDays} onChange={(e) => setForm({ ...form, paymentTermDays: parseInt(e.target.value) || 30 })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("input")}>Geri</Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="bg-gradient-to-r from-green-600 to-emerald-600"
              >
                {createMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Kaydediliyor...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 mr-2" />Onayla ve Kaydet</>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "saved" && (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-3 text-green-600" />
            <h3 className="text-lg font-semibold">Müşteri Eklendi!</h3>
            <p className="text-sm text-muted-foreground mt-1">Liste güncellendi</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Manuel Ekle Dialog (kısa)
// ═══════════════════════════════════════════════════════════════════
function B2bManualAddDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    companyType: "",
    taxNumber: "",
    taxOffice: "",
    contactPerson: "",
    email: "",
    phone: "",
    city: "",
    creditLimit: "0",
    paymentTermDays: 30,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/b2b-customers", form);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Müşteri eklendi" });
      queryClient.invalidateQueries({ queryKey: ["/api/b2b-customers"] });
      onOpenChange(false);
      setForm({
        name: "", companyType: "", taxNumber: "", taxOffice: "",
        contactPerson: "", email: "", phone: "", city: "",
        creditLimit: "0", paymentTermDays: 30,
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Yeni B2B Müşteri</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Ad *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Tip</Label>
            <Select value={form.companyType} onValueChange={(v) => setForm({ ...form, companyType: v })}>
              <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
              <SelectContent>
                {B2B_COMPANY_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{B2B_COMPANY_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Şehir</Label>
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div>
            <Label>Vergi No</Label>
            <Input value={form.taxNumber} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })} />
          </div>
          <div>
            <Label>Vergi Dairesi</Label>
            <Input value={form.taxOffice} onChange={(e) => setForm({ ...form, taxOffice: e.target.value })} />
          </div>
          <div>
            <Label>Telefon</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <Label>E-posta</Label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!form.name.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
