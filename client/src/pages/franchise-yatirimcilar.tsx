import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import {
  Building2,
  Plus,
  Calendar,
  Percent,
  MapPin,
  Phone,
  Mail,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface InvestorBranch {
  id: number;
  branchId: number;
  branchName: string | null;
  ownershipPercentage: string | null;
}

interface Investor {
  id: number;
  userId: string | null;
  fullName: string;
  phone: string | null;
  email: string | null;
  companyName: string | null;
  taxNumber: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  contractRenewalReminder: boolean | null;
  investmentAmount: string | null;
  monthlyRoyaltyRate: string | null;
  notes: string | null;
  status: string | null;
  createdAt: string | null;
  branches: InvestorBranch[];
  avgRating: number;
}

interface Branch {
  id: number;
  name: string;
}

export default function FranchiseYatirimcilar() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    companyName: "",
    taxNumber: "",
    contractStart: "",
    contractEnd: "",
    investmentAmount: "",
    monthlyRoyaltyRate: "5",
    notes: "",
    branchIds: [] as string[],
  });

  const { data: investors, isLoading, isError, refetch } = useQuery<Investor[]>({
    queryKey: ["/api/franchise/investors"],
  });

  const { data: allBranches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    enabled: createOpen,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/franchise/investors", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/franchise/investors"] });
      toast({ title: "Başarılı", description: "Yatırımcı oluşturuldu" });
      setCreateOpen(false);
      setFormData({
        fullName: "", phone: "", email: "", companyName: "", taxNumber: "",
        contractStart: "", contractEnd: "", investmentAmount: "",
        monthlyRoyaltyRate: "5", notes: "", branchIds: [],
      });
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-300" data-testid="badge-status-active">Aktif</Badge>;
      case "inactive":
        return <Badge variant="secondary" data-testid="badge-status-inactive">Pasif</Badge>;
      case "suspended":
        return <Badge variant="destructive" data-testid="badge-status-suspended">Askıda</Badge>;
      default:
        return <Badge variant="outline" data-testid="badge-status-unknown">{status || "Belirsiz"}</Badge>;
    }
  };

  const getRemainingTime = (contractEnd: string | null) => {
    if (!contractEnd) return null;
    const end = new Date(contractEnd);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    if (diff < 0) return "Süresi dolmuş";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    if (years > 0) return `${years} yıl ${months} ay`;
    if (months > 0) return `${months} ay`;
    return `${days} gün`;
  };

  if (isError) {
    return <ErrorState title="Yatırımcılar yüklenemedi" onRetry={refetch} />;
  }

  if (isLoading) {
    return (
      <div className="p-4 flex flex-col gap-4" data-testid="loading-investors">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const investorList = Array.isArray(investors) ? investors : [];

  return (
    <div className="p-4 flex flex-col gap-4" data-testid="page-franchise-investors">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold" data-testid="heading-investors">
            <Building2 className="inline-block w-6 h-6 mr-2 align-text-bottom" />
            Franchise Yatırımcıları
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {investorList.length} yatırımcı kayıtlı
          </p>
        </div>
        {user?.role === "admin" && (
          <Button onClick={() => setCreateOpen(true)} data-testid="button-new-investor">
            <Plus className="w-4 h-4 mr-2" />
            Yeni Yatırımcı
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="investors-grid">
        {investorList.length > 0 ? (
          investorList.map((inv) => (
            <Card
              key={inv.id}
              className="cursor-pointer hover-elevate"
              onClick={() => setLocation(`/franchise-yatirimcilar/${inv.id}`)}
              data-testid={`card-investor-${inv.id}`}
            >
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate" data-testid={`text-name-${inv.id}`}>
                      {inv.fullName}
                    </h3>
                    {inv.companyName && (
                      <p className="text-sm text-muted-foreground truncate" data-testid={`text-company-${inv.id}`}>
                        {inv.companyName}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {getStatusBadge(inv.status)}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                {inv.branches.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Şubeler:</p>
                    <div className="flex flex-wrap gap-1">
                      {inv.branches?.map((b) => (
                        <Badge key={b.id} variant="outline" className="text-xs" data-testid={`badge-branch-${b.branchId}`}>
                          <MapPin className="w-3 h-3 mr-1" />
                          {b.branchName || `Şube #${b.branchId}`}
                        </Badge>
                      ))}
                    </div>
                    {inv.avgRating > 0 && (
                      <p className="text-xs text-muted-foreground mt-1" data-testid={`text-rating-${inv.id}`}>
                        Ort. Puan: {Number(inv.avgRating ?? 0).toFixed(1)}/5
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {inv.contractStart && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span data-testid={`text-contract-start-${inv.id}`}>
                        {format(new Date(inv.contractStart), "MMM yyyy", { locale: tr })}
                      </span>
                    </div>
                  )}
                  {inv.contractEnd && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span data-testid={`text-contract-end-${inv.id}`}>
                        {getRemainingTime(inv.contractEnd)}
                      </span>
                    </div>
                  )}
                  {inv.monthlyRoyaltyRate && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Percent className="w-3 h-3" />
                      <span data-testid={`text-royalty-${inv.id}`}>
                        Royalty: %{Number(inv.monthlyRoyaltyRate ?? 0).toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground" data-testid="text-empty-investors">
              Henüz yatırımcı kaydı bulunmuyor
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-create-investor">
          <DialogHeader>
            <DialogTitle>Yeni Yatırımcı</DialogTitle>
            <DialogDescription>Franchise yatırımcı bilgilerini girin</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <Label>Ad Soyad *</Label>
              <Input
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Yatırımcı adı soyadı"
                data-testid="input-investor-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telefon</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0532 xxx xx xx"
                  data-testid="input-investor-phone"
                />
              </div>
              <div>
                <Label>E-posta</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  data-testid="input-investor-email"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Şirket Adı</Label>
                <Input
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  data-testid="input-investor-company"
                />
              </div>
              <div>
                <Label>Vergi No</Label>
                <Input
                  value={formData.taxNumber}
                  onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                  data-testid="input-investor-tax"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sözleşme Başlangıç</Label>
                <Input
                  type="date"
                  value={formData.contractStart}
                  onChange={(e) => setFormData({ ...formData, contractStart: e.target.value })}
                  data-testid="input-contract-start"
                />
              </div>
              <div>
                <Label>Sözleşme Bitiş</Label>
                <Input
                  type="date"
                  value={formData.contractEnd}
                  onChange={(e) => setFormData({ ...formData, contractEnd: e.target.value })}
                  data-testid="input-contract-end"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Yatırım Tutarı (TL)</Label>
                <Input
                  type="number"
                  value={formData.investmentAmount}
                  onChange={(e) => setFormData({ ...formData, investmentAmount: e.target.value })}
                  data-testid="input-investment-amount"
                />
              </div>
              <div>
                <Label>Royalty Oranı (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.monthlyRoyaltyRate}
                  onChange={(e) => setFormData({ ...formData, monthlyRoyaltyRate: e.target.value })}
                  data-testid="input-royalty-rate"
                />
              </div>
            </div>
            <div>
              <Label>Şubeler</Label>
              <Select
                value=""
                onValueChange={(val) => {
                  if (val && !formData.branchIds.includes(val)) {
                    setFormData({ ...formData, branchIds: [...formData.branchIds, val] });
                  }
                }}
              >
                <SelectTrigger data-testid="select-branches">
                  <SelectValue placeholder="Şube ekle" />
                </SelectTrigger>
                <SelectContent>
                  {(Array.isArray(allBranches) ? allBranches : []).map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.branchIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.branchIds?.map((id) => {
                    const br = allBranches?.find((b) => String(b.id) === id);
                    return (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => setFormData({ ...formData, branchIds: formData.branchIds.filter((x) => x !== id) })}
                        data-testid={`badge-selected-branch-${id}`}
                      >
                        {br?.name || `#${id}`} x
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <Label>Notlar</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                data-testid="textarea-investor-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!formData.fullName.trim() || createMutation.isPending}
              onClick={() => {
                createMutation.mutate({
                  fullName: formData.fullName.trim(),
                  phone: formData.phone || undefined,
                  email: formData.email || undefined,
                  companyName: formData.companyName || undefined,
                  taxNumber: formData.taxNumber || undefined,
                  contractStart: formData.contractStart || undefined,
                  contractEnd: formData.contractEnd || undefined,
                  investmentAmount: formData.investmentAmount || undefined,
                  monthlyRoyaltyRate: formData.monthlyRoyaltyRate || undefined,
                  notes: formData.notes || undefined,
                  branchIds: formData.branchIds?.map(Number),
                });
              }}
              data-testid="button-submit-investor"
            >
              {createMutation.isPending ? "Kaydediliyor..." : "Yatırımcı Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
