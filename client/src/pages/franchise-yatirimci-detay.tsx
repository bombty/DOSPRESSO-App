import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
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
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  Edit,
  Mail,
  MapPin,
  Percent,
  Phone,
  Plus,
  FileText,
  Users,
  Star,
  TrendingUp,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { tr } from "date-fns/locale";

interface InvestorBranch {
  id: number;
  branchId: number;
  branchName: string | null;
  ownershipPercentage: string | null;
}

interface InvestorNote {
  id: number;
  title: string | null;
  content: string | null;
  noteType: string | null;
  createdAt: string | null;
  createdByFirstName: string | null;
  createdByLastName: string | null;
}

interface InvestorDetail {
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
  branches: InvestorBranch[];
  notes_list?: InvestorNote[];
}

interface BranchPerformance {
  branchId: number;
  branchName: string | null;
  healthScore: number | null;
  avgRating: number;
  staffCount: number;
  ownershipPercentage: string | null;
}

interface PerformanceData {
  branches: BranchPerformance[];
  totalStaff: number;
  avgHealth: number;
}

const NOTE_TYPES: Record<string, string> = {
  meeting: "Toplantı",
  phone_call: "Telefon",
  email: "E-posta",
  visit: "Ziyaret",
  contract: "Sözleşme",
  other: "Diğer",
};

export default function FranchiseYatirimciDetay() {
  const [, params] = useRoute("/franchise-yatirimcilar/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const investorId = params?.id;

  const [editOpen, setEditOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteType, setNoteType] = useState("meeting");
  const [editData, setEditData] = useState<Record<string, any>>({});

  const { data: investor, isLoading, isError, refetch } = useQuery<InvestorDetail>({
    queryKey: ["/api/franchise/investors", investorId],
    queryFn: async () => {
      const res = await fetch(`/api/franchise/investors/${investorId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Yatırımcı bulunamadı");
      return res.json();
    },
    enabled: !!investorId,
  });

  const { data: performance, isLoading: perfLoading } = useQuery<PerformanceData>({
    queryKey: ["/api/franchise/investors", investorId, "performance"],
    queryFn: async () => {
      const res = await fetch(`/api/franchise/investors/${investorId}/performance`, { credentials: "include" });
      if (!res.ok) throw new Error("Performans verisi yüklenemedi");
      return res.json();
    },
    enabled: !!investorId,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/franchise/investors/${investorId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/franchise/investors", investorId] });
      toast({ title: "Başarılı", description: "Yatırımcı güncellendi" });
      setEditOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/franchise/investors/${investorId}/notes`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/franchise/investors", investorId] });
      toast({ title: "Başarılı", description: "Not eklendi" });
      setNoteOpen(false);
      setNoteTitle("");
      setNoteContent("");
      setNoteType("meeting");
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const openEdit = () => {
    if (!investor) return;
    setEditData({
      fullName: investor.fullName,
      phone: investor.phone || "",
      email: investor.email || "",
      companyName: investor.companyName || "",
      taxNumber: investor.taxNumber || "",
      contractStart: investor.contractStart || "",
      contractEnd: investor.contractEnd || "",
      investmentAmount: investor.investmentAmount || "",
      monthlyRoyaltyRate: investor.monthlyRoyaltyRate || "5",
      status: investor.status || "active",
    });
    setEditOpen(true);
  };

  const getRemainingTime = (contractEnd: string | null) => {
    if (!contractEnd) return null;
    const end = new Date(contractEnd);
    const now = new Date();
    const days = differenceInDays(end, now);
    if (days < 0) return "Süresi dolmuş";
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    if (years > 0) return `${years} yıl ${months} ay`;
    if (months > 0) return `${months} ay`;
    return `${days} gün`;
  };

  if (isError) {
    return <ErrorState title="Yatırımcı bulunamadı" onRetry={refetch} />;
  }

  if (isLoading || !investor) {
    return (
      <div className="p-4 flex flex-col gap-4" data-testid="loading-investor-detail">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const notes = Array.isArray(investor.notes_list) ? investor.notes_list :
    Array.isArray((investor as any).notes) && typeof (investor as any).notes[0] === "object" ? (investor as any).notes : [];

  return (
    <div className="p-4 flex flex-col gap-4" data-testid="page-investor-detail">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/franchise-yatirimcilar")} data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold" data-testid="text-investor-name">{investor.fullName}</h1>
            {investor.companyName && (
              <p className="text-sm text-muted-foreground" data-testid="text-investor-company">{investor.companyName}</p>
            )}
          </div>
        </div>
        {user?.role === "admin" && (
          <Button variant="outline" onClick={openEdit} data-testid="button-edit-investor">
            <Edit className="w-4 h-4 mr-2" />
            Düzenle
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card data-testid="card-general-info">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Genel Bilgiler
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span data-testid="text-detail-phone">{investor.phone || "Belirtilmemiş"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span data-testid="text-detail-email">{investor.email || "Belirtilmemiş"}</span>
            </div>
            {investor.taxNumber && (
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span data-testid="text-detail-tax">Vergi No: {investor.taxNumber}</span>
              </div>
            )}
            <div className="pt-1">
              {investor.status === "active" ? (
                <Badge className="bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-300">Aktif</Badge>
              ) : (
                <Badge variant="secondary">{investor.status}</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-contract-info">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Sözleşme Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">Başlangıç:</span>
                <p className="font-medium" data-testid="text-detail-contract-start">
                  {investor.contractStart ? format(new Date(investor.contractStart), "dd.MM.yyyy") : "—"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Bitiş:</span>
                <p className="font-medium" data-testid="text-detail-contract-end">
                  {investor.contractEnd ? format(new Date(investor.contractEnd), "dd.MM.yyyy") : "—"}
                </p>
              </div>
            </div>
            {investor.contractEnd && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span data-testid="text-detail-remaining">Kalan: {getRemainingTime(investor.contractEnd)}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-muted-foreground" />
              <span data-testid="text-detail-royalty">Royalty: %{Number(investor.monthlyRoyaltyRate ?? 0).toFixed(1)}</span>
            </div>
            {investor.investmentAmount && (
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <span data-testid="text-detail-investment">
                  Yatırım: {Number(investor.investmentAmount ?? 0).toLocaleString("tr-TR")} TL
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-branch-performance">
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Şube Performansı
          </CardTitle>
          {performance && (
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span data-testid="text-avg-health">Ort: {Number(performance.avgHealth ?? 0)}/100</span>
              <span data-testid="text-total-staff">
                <Users className="w-3 h-3 inline mr-1" />
                {Number(performance.totalStaff ?? 0)} personel
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {perfLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : performance && performance.branches.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-branch-performance">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Şube</th>
                    <th className="py-2 pr-4">Skor</th>
                    <th className="py-2 pr-4">Puan</th>
                    <th className="py-2 pr-4">Personel</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.branches.map((b) => (
                    <tr key={b.branchId} className="border-b last:border-0" data-testid={`row-branch-${b.branchId}`}>
                      <td className="py-2 pr-4 font-medium">{b.branchName || `#${b.branchId}`}</td>
                      <td className="py-2 pr-4">
                        <span className={Number(b.healthScore ?? 0) >= 80 ? "text-green-600 dark:text-green-400" : Number(b.healthScore ?? 0) >= 60 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}>
                          {Number(b.healthScore ?? 0)}/100
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <Star className="w-3 h-3 inline mr-1 text-yellow-500" />
                        {Number(b.avgRating ?? 0).toFixed(1)}/5
                      </td>
                      <td className="py-2 pr-4">{Number(b.staffCount ?? 0)} kişi</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center" data-testid="text-no-branches">
              Bağlı şube bulunmuyor
            </p>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-meeting-notes">
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Toplantı Notları
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setNoteOpen(true)} data-testid="button-add-note">
            <Plus className="w-4 h-4 mr-1" />
            Not Ekle
          </Button>
        </CardHeader>
        <CardContent>
          {notes.length > 0 ? (
            <div className="flex flex-col gap-3" data-testid="notes-list">
              {notes.map((note: InvestorNote) => (
                <div key={note.id} className="border rounded-md p-3" data-testid={`note-${note.id}`}>
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {NOTE_TYPES[note.noteType || "meeting"] || note.noteType}
                      </Badge>
                      <span className="font-medium text-sm" data-testid={`text-note-title-${note.id}`}>
                        {note.title || "Başlıksız"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground" data-testid={`text-note-date-${note.id}`}>
                      {note.createdAt ? format(new Date(note.createdAt), "d MMM yyyy", { locale: tr }) : "—"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid={`text-note-content-${note.id}`}>
                    {note.content || "—"}
                  </p>
                  {(note.createdByFirstName || note.createdByLastName) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Yazan: {note.createdByFirstName} {note.createdByLastName}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center" data-testid="text-no-notes">
              Henüz not eklenmemiş
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent data-testid="dialog-add-note">
          <DialogHeader>
            <DialogTitle>Not Ekle</DialogTitle>
            <DialogDescription>Yatırımcıyla ilgili not veya toplantı kaydı ekleyin</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <Label>Başlık</Label>
              <Input
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Not başlığı"
                data-testid="input-note-title"
              />
            </div>
            <div>
              <Label>Tür</Label>
              <Select value={noteType} onValueChange={setNoteType}>
                <SelectTrigger data-testid="select-note-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(NOTE_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>İçerik</Label>
              <Textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Toplantıda neler görüşüldü..."
                rows={4}
                data-testid="textarea-note-content"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!noteTitle.trim() || !noteContent.trim() || addNoteMutation.isPending}
              onClick={() => {
                addNoteMutation.mutate({
                  title: noteTitle.trim(),
                  content: noteContent.trim(),
                  noteType,
                });
              }}
              data-testid="button-submit-note"
            >
              {addNoteMutation.isPending ? "Kaydediliyor..." : "Not Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-investor">
          <DialogHeader>
            <DialogTitle>Yatırımcı Düzenle</DialogTitle>
            <DialogDescription>Bilgileri güncelleyin</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <Label>Ad Soyad</Label>
              <Input
                value={editData.fullName || ""}
                onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
                data-testid="input-edit-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telefon</Label>
                <Input
                  value={editData.phone || ""}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  data-testid="input-edit-phone"
                />
              </div>
              <div>
                <Label>E-posta</Label>
                <Input
                  value={editData.email || ""}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  data-testid="input-edit-email"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Şirket Adı</Label>
                <Input
                  value={editData.companyName || ""}
                  onChange={(e) => setEditData({ ...editData, companyName: e.target.value })}
                  data-testid="input-edit-company"
                />
              </div>
              <div>
                <Label>Vergi No</Label>
                <Input
                  value={editData.taxNumber || ""}
                  onChange={(e) => setEditData({ ...editData, taxNumber: e.target.value })}
                  data-testid="input-edit-tax"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sözleşme Başlangıç</Label>
                <Input
                  type="date"
                  value={editData.contractStart || ""}
                  onChange={(e) => setEditData({ ...editData, contractStart: e.target.value })}
                  data-testid="input-edit-contract-start"
                />
              </div>
              <div>
                <Label>Sözleşme Bitiş</Label>
                <Input
                  type="date"
                  value={editData.contractEnd || ""}
                  onChange={(e) => setEditData({ ...editData, contractEnd: e.target.value })}
                  data-testid="input-edit-contract-end"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Yatırım Tutarı</Label>
                <Input
                  type="number"
                  value={editData.investmentAmount || ""}
                  onChange={(e) => setEditData({ ...editData, investmentAmount: e.target.value })}
                  data-testid="input-edit-investment"
                />
              </div>
              <div>
                <Label>Royalty (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editData.monthlyRoyaltyRate || ""}
                  onChange={(e) => setEditData({ ...editData, monthlyRoyaltyRate: e.target.value })}
                  data-testid="input-edit-royalty"
                />
              </div>
            </div>
            <div>
              <Label>Durum</Label>
              <Select value={editData.status || "active"} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                <SelectTrigger data-testid="select-edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Pasif</SelectItem>
                  <SelectItem value="suspended">Askıda</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={updateMutation.isPending}
              onClick={() => updateMutation.mutate(editData)}
              data-testid="button-submit-edit"
            >
              {updateMutation.isPending ? "Kaydediliyor..." : "Güncelle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
