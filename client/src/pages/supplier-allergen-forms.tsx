/**
 * Tedarikçi Alerjen Kontrol Formu (0011.A.FR.GG.36/Rev.1)
 *
 * Aslan 7 May 2026 — DOSPRESSO'nun resmi alerjen formu PDF'inden sisteme entegre.
 * TGK 26.01.2017/29960 EK-1 uyumlu.
 *
 * 14 alerjen × 3 kolon (ürün içi / aynı hat / fabrika içi)
 * 15 önleyici faaliyet checklist
 * 3 doğrulama sorusu
 *
 * Route: /supplier-allergen-forms (liste)
 *        /supplier-allergen-forms/new (yeni)
 *        /supplier-allergen-forms/:id (detay/düzenle)
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingState } from "@/components/loading-state";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft, FileText, Plus, Save, Send, CheckCircle2, XCircle,
  AlertTriangle, ShieldCheck, Clock, Eye,
} from "lucide-react";

interface FormTemplate {
  formCode: string;
  revision: string;
  legalBasis: string;
  allergens: Array<{ key: string; label: string; excluded: string | null }>;
  preventiveActions: Array<{ key: string; label: string }>;
  columns: Array<{ key: 'col1' | 'col2' | 'col3'; label: string; description: string }>;
}

interface SAForm {
  id: number;
  formCode: string;
  formDate: string;
  supplierName: string;
  productName: string;
  factoryName: string | null;
  filledBy: string | null;
  filledByTitle: string | null;
  contactPhone: string | null;
  allergenMatrix: Record<string, { col1: 'evet' | 'hayir' | null; col2: 'evet' | 'hayir' | null; col3: 'evet' | 'hayir' | null }>;
  preventiveActionsRequired: boolean;
  preventiveActions: Record<string, boolean | null>;
  labelIncludesAllergens: boolean | null;
  specIncludesAllergens: boolean | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submittedAt: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  notes: string | null;
}

const STATUS_CONFIG = {
  draft: { label: 'Taslak', color: 'bg-muted text-muted-foreground', icon: FileText },
  submitted: { label: 'Onay Bekliyor', color: 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100', icon: Clock },
  approved: { label: 'Onaylı', color: 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100', icon: CheckCircle2 },
  rejected: { label: 'Reddedildi', color: 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100', icon: XCircle },
};

// ════════════════════════════════════════════════════════════
// LİSTE SAYFASI
// ════════════════════════════════════════════════════════════
export default function SupplierAllergenForms() {
  const [, params] = useRoute("/supplier-allergen-forms/:id");
  const [, isNewRoute] = useRoute("/supplier-allergen-forms/new");
  
  if (params?.id === "new" || isNewRoute) {
    return <SAFormEditor />;
  }
  if (params?.id) {
    return <SAFormEditor formId={parseInt(params.id, 10)} />;
  }
  return <SAFList />;
}

function SAFList() {
  const [, navigate] = useLocation();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  const { data: forms = [], isLoading } = useQuery<SAForm[]>({
    queryKey: ['/api/supplier-allergen-forms', filterStatus],
    queryFn: async () => {
      const url = filterStatus === "all"
        ? '/api/supplier-allergen-forms'
        : `/api/supplier-allergen-forms?status=${filterStatus}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Liste yüklenemedi");
      return res.json();
    },
  });
  
  if (isLoading) return <LoadingState />;
  
  const counts = {
    all: forms.length,
    draft: forms.filter(f => f.status === 'draft').length,
    submitted: forms.filter(f => f.status === 'submitted').length,
    approved: forms.filter(f => f.status === 'approved').length,
    rejected: forms.filter(f => f.status === 'rejected').length,
  };
  
  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl space-y-4 pb-20">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-purple-600" />
            Tedarikçi Alerjen Kontrol Formları
          </h1>
          <p className="text-sm text-muted-foreground">
            Form 0011.A.FR.GG.36/Rev.1 • TGK 26.01.2017/29960 EK-1 uyumlu • 14 alerjen × 3 kolon
          </p>
        </div>
        <Button onClick={() => navigate('/supplier-allergen-forms/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Form
        </Button>
      </div>
      
      {/* Status Filter */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {(['all', 'draft', 'submitted', 'approved', 'rejected'] as const).map(s => (
          <Button
            key={s}
            size="sm"
            variant={filterStatus === s ? "default" : "ghost"}
            onClick={() => setFilterStatus(s)}
            className="text-xs h-7"
          >
            {s === 'all' ? 'Tümü' : STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.label}
            <Badge variant="secondary" className="ml-1.5 h-4 text-[10px] px-1">
              {counts[s as keyof typeof counts]}
            </Badge>
          </Button>
        ))}
      </div>
      
      {/* Form Listesi */}
      {forms.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {filterStatus === "all" ? "Henüz form oluşturulmadı" : `Bu durumda form yok`}
            </p>
            <Button className="mt-4" onClick={() => navigate('/supplier-allergen-forms/new')}>
              İlk Formu Oluştur
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {forms.map(f => {
            const sc = STATUS_CONFIG[f.status];
            const SIcon = sc.icon;
            return (
              <Card key={f.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/supplier-allergen-forms/${f.id}`)}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3 flex-wrap">
                    <SIcon className="h-5 w-5 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{f.productName}</span>
                        <Badge variant="outline" className="text-[10px]">{f.supplierName}</Badge>
                        <Badge className={`text-[10px] ${sc.color}`}>{sc.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Form #{f.id} • {new Date(f.formDate).toLocaleDateString('tr-TR')}
                        {f.filledBy && ` • ${f.filledBy}`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// FORM EDITOR (Yeni / Düzenle)
// ════════════════════════════════════════════════════════════
function SAFormEditor({ formId }: { formId?: number }) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const { data: template } = useQuery<FormTemplate>({
    queryKey: ['/api/supplier-allergen-forms/template'],
  });
  
  const { data: existing } = useQuery<SAForm>({
    queryKey: [`/api/supplier-allergen-forms/${formId}`],
    enabled: !!formId,
  });
  
  // Form state
  const [supplierName, setSupplierName] = useState(existing?.supplierName || '');
  const [productName, setProductName] = useState(existing?.productName || '');
  const [factoryName, setFactoryName] = useState(existing?.factoryName || '');
  const [filledBy, setFilledBy] = useState(existing?.filledBy || (user as any)?.firstName || '');
  const [filledByTitle, setFilledByTitle] = useState(existing?.filledByTitle || '');
  const [contactPhone, setContactPhone] = useState(existing?.contactPhone || '');
  const [allergenMatrix, setAllergenMatrix] = useState<any>(existing?.allergenMatrix || {});
  const [preventiveActions, setPreventiveActions] = useState<any>(existing?.preventiveActions || {});
  const [labelIncludesAllergens, setLabelIncludesAllergens] = useState<boolean | null>(existing?.labelIncludesAllergens ?? null);
  const [specIncludesAllergens, setSpecIncludesAllergens] = useState<boolean | null>(existing?.specIncludesAllergens ?? null);
  const [notes, setNotes] = useState(existing?.notes || '');
  
  // Kolon 2/3'te EVET varsa önleyici faaliyetler zorunlu
  const requiresPreventive = Object.values(allergenMatrix).some((v: any) => v?.col2 === 'evet' || v?.col3 === 'evet');
  
  const setAllergenCell = (allergenKey: string, col: 'col1' | 'col2' | 'col3', value: 'evet' | 'hayir') => {
    setAllergenMatrix({
      ...allergenMatrix,
      [allergenKey]: { ...(allergenMatrix[allergenKey] || {}), [col]: value },
    });
  };
  
  const saveMutation = useMutation({
    mutationFn: async (asDraft: boolean) => {
      const payload = {
        supplierName, productName, factoryName, filledBy, filledByTitle, contactPhone,
        allergenMatrix, preventiveActions, preventiveActionsRequired: requiresPreventive,
        labelIncludesAllergens, specIncludesAllergens, notes,
      };
      const url = formId ? `/api/supplier-allergen-forms/${formId}` : '/api/supplier-allergen-forms';
      const method = formId ? 'PUT' : 'POST';
      const res = await apiRequest(method, url, payload);
      const saved = await res.json();
      if (!asDraft && saved.id) {
        await apiRequest('POST', `/api/supplier-allergen-forms/${saved.id}/submit`);
      }
      return saved;
    },
    onSuccess: (data, asDraft) => {
      queryClient.invalidateQueries({ queryKey: ['/api/supplier-allergen-forms'] });
      toast({ title: asDraft ? "Taslak kaydedildi" : "✅ Onaya gönderildi" });
      navigate(`/supplier-allergen-forms/${data.id}`);
    },
    onError: (err: any) => toast({ title: "Kayıt hatası", description: err.message, variant: "destructive" }),
  });
  
  if (!template) return <LoadingState />;
  
  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-5xl space-y-4 pb-20">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/supplier-allergen-forms')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Liste
        </Button>
      </div>
      
      <div>
        <h1 className="text-2xl font-bold">Tedarikçi Alerjen Kontrol Formu</h1>
        <p className="text-xs text-muted-foreground">
          {template.formCode} • Rev. {template.revision} • {template.legalBasis}
        </p>
      </div>
      
      {/* Tedarikçi & Ürün Bilgileri */}
      <Card>
        <CardHeader><CardTitle className="text-base">Tedarikçi & Ürün</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Tedarikçi Adı *</Label>
            <Input value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Örn: Puratos" />
          </div>
          <div>
            <Label className="text-xs">Ürün Adı *</Label>
            <Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="Örn: Beyaz Çikolatalı Vanilya Aromalı Dolgu" />
          </div>
          <div>
            <Label className="text-xs">Fabrika Adı</Label>
            <Input value={factoryName} onChange={e => setFactoryName(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Form Dolduran</Label>
            <Input value={filledBy} onChange={e => setFilledBy(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Ünvan</Label>
            <Input value={filledByTitle} onChange={e => setFilledByTitle(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">İrtibat Telefonu</Label>
            <Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
          </div>
        </CardContent>
      </Card>
      
      {/* 14 Alerjen × 3 Kolon Matrisi */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">14 Alerjen × 3 Kolon Kontrol Matrisi</CardTitle>
          <CardDescription className="text-xs">
            <strong>Kolon 1:</strong> Ürün içerisinde &nbsp;•&nbsp;
            <strong>Kolon 2:</strong> Aynı üretim hattında &nbsp;•&nbsp;
            <strong>Kolon 3:</strong> Fabrika içerisinde
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border">
              <thead>
                <tr className="bg-muted">
                  <th className="text-left p-2 border">Alerjen</th>
                  <th className="text-center p-2 border">Kolon 1</th>
                  <th className="text-center p-2 border">Kolon 2</th>
                  <th className="text-center p-2 border">Kolon 3</th>
                </tr>
              </thead>
              <tbody>
                {template.allergens.map(a => (
                  <tr key={a.key} className="border-t">
                    <td className="p-2 border align-top">
                      <div className="font-medium">{a.label}</div>
                      {a.excluded && <div className="text-[9px] text-muted-foreground italic mt-1">Hariç: {a.excluded.slice(0, 80)}{a.excluded.length > 80 ? '...' : ''}</div>}
                    </td>
                    {(['col1', 'col2', 'col3'] as const).map(col => {
                      const val = allergenMatrix[a.key]?.[col];
                      return (
                        <td key={col} className="p-1 border text-center">
                          <div className="flex gap-1 justify-center">
                            <Button size="sm" variant={val === 'evet' ? 'destructive' : 'outline'} className="h-6 px-2 text-[10px]" onClick={() => setAllergenCell(a.key, col, 'evet')}>E</Button>
                            <Button size="sm" variant={val === 'hayir' ? 'default' : 'outline'} className="h-6 px-2 text-[10px]" onClick={() => setAllergenCell(a.key, col, 'hayir')}>H</Button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">⚠️ Boş alan kesinlikle bırakılmamalıdır.</p>
        </CardContent>
      </Card>
      
      {/* 15 Önleyici Faaliyet (Kolon 2/3'te EVET varsa zorunlu) */}
      {requiresPreventive && (
        <Card className="border-amber-300 bg-amber-50/30 dark:bg-amber-950/10">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              15 Önleyici Faaliyet (Kolon 2 veya 3 EVET olduğu için zorunlu)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {template.preventiveActions.map(pa => (
              <div key={pa.key} className="flex items-start gap-2 p-1.5 hover:bg-muted/30 rounded">
                <Checkbox
                  checked={preventiveActions[pa.key] === true}
                  onCheckedChange={c => setPreventiveActions({ ...preventiveActions, [pa.key]: c === true })}
                  className="mt-0.5"
                />
                <Label className="text-xs cursor-pointer flex-1">
                  <span className="font-medium">{pa.key}</span> {pa.label}
                </Label>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      
      {/* 3 Doğrulama Sorusu */}
      <Card>
        <CardHeader><CardTitle className="text-base">Doğrulama Soruları</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">2. Ürün ambalajı/etiketinde alerjenler yer alıyor mu?</Label>
            <div className="flex gap-2 mt-1">
              <Button size="sm" variant={labelIncludesAllergens === true ? 'default' : 'outline'} onClick={() => setLabelIncludesAllergens(true)}>EVET</Button>
              <Button size="sm" variant={labelIncludesAllergens === false ? 'default' : 'outline'} onClick={() => setLabelIncludesAllergens(false)}>HAYIR</Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">3. Spesifikasyonlarda alerjenler yer alıyor mu?</Label>
            <div className="flex gap-2 mt-1">
              <Button size="sm" variant={specIncludesAllergens === true ? 'default' : 'outline'} onClick={() => setSpecIncludesAllergens(true)}>EVET</Button>
              <Button size="sm" variant={specIncludesAllergens === false ? 'default' : 'outline'} onClick={() => setSpecIncludesAllergens(false)}>HAYIR</Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">Notlar</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>
      
      {/* Aksiyonlar */}
      <div className="flex gap-2 flex-wrap sticky bottom-4 bg-background p-3 border rounded shadow-lg">
        <Button variant="outline" onClick={() => saveMutation.mutate(true)} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          Taslak Kaydet
        </Button>
        <Button onClick={() => saveMutation.mutate(false)} disabled={saveMutation.isPending || !supplierName || !productName}>
          <Send className="h-4 w-4 mr-2" />
          Onaya Gönder
        </Button>
        {existing?.status === 'submitted' && ['admin', 'ceo', 'cgo', 'kalite_kontrol', 'kalite_yoneticisi'].includes(user?.role || '') && (
          <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={async () => {
            await apiRequest('POST', `/api/supplier-allergen-forms/${existing.id}/approve`);
            queryClient.invalidateQueries({ queryKey: ['/api/supplier-allergen-forms'] });
            toast({ title: "✅ Form onaylandı" });
            navigate('/supplier-allergen-forms');
          }}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Onayla
          </Button>
        )}
      </div>
    </div>
  );
}
