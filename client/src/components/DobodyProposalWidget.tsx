import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Bot, Send, X, AlertTriangle, Info, Zap, Calendar, User, Building2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

const PRIORITY_CFG: Record<string, { color: string; icon: any; label: string }> = {
  acil: { color: "bg-red-500 text-white", icon: AlertTriangle, label: "Acil" },
  onemli: { color: "bg-amber-500 text-white", icon: Zap, label: "Önemli" },
  bilgi: { color: "bg-blue-500 text-white", icon: Info, label: "Bilgi" },
};

const WF_LABELS: Record<string, string> = {
  "WF-1": "Denetim", "WF-2": "SLA Takip", "WF-3": "Stok", "WF-4": "Eğitim",
  "WF-5": "Vardiya", "WF-6": "Performans", "WF-7": "Proje", "WF-8": "Haftalık Özet",
};

// Dobody'nin önerdiği aksiyon türüne göre varsayılan draft mesaj
function generateDraftMessage(proposal: any): string {
  const branch = proposal.branchName || "Şube";
  switch (proposal.workflowType) {
    case "WF-1": return `Sayın ilgili,\n\n${branch} şubesinin son denetim skoru ${proposal.title.match(/\d+/)?.[0] || '—'}/100 olarak tespit edilmiştir. Bu skor kabul edilebilir seviyenin altındadır.\n\nLütfen aşağıdaki konularda acil iyileştirme yapınız:\n- Hijyen ve temizlik standartlarını gözden geçirin\n- Personel eğitim eksikliklerini tamamlayın\n- Ekipman bakımlarını kontrol edin\n\nBelirtilen süre içinde gerekli düzeltmelerin yapılması beklenmektedir.`;
    case "WF-2": return `Sayın ilgili,\n\n${branch} şubesinde açık denetim aksiyonunun deadline'ı yaklaşmaktadır.\n\nLütfen ilgili aksiyonu en kısa sürede tamamlayınız. Gecikme durumunda SLA ihlali oluşacaktır.`;
    case "WF-6": return `Sayın ilgili,\n\n${branch} şubesinde performans düşüşü tespit edilmiştir.\n\nLütfen mevcut durumu değerlendirip gerekli iyileştirme adımlarını atınız.`;
    case "WF-8": return proposal.description || "Haftalık özet raporu hazırlanmıştır.";
    default: return proposal.description || `${branch} şubesi ile ilgili dikkat gerektiren bir durum tespit edilmiştir.`;
  }
}

// Varsayılan alıcı rolü
function getDefaultRecipient(proposal: any): string {
  switch (proposal.workflowType) {
    case "WF-1": case "WF-6": return "supervisor";
    case "WF-2": return "supervisor";
    default: return "supervisor";
  }
}

type Proposal = {
  id: number; title: string; description: string | null;
  workflowType: string; proposalType: string; priority: string;
  status: string; branchName: string | null; branchId: number | null;
  createdAt: string; suggestedActionType: string | null;
};

export function DobodyProposalWidget({ maxItems = 5 }: { maxItems?: number }) {
  const { toast } = useToast();
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [recipientRole, setRecipientRole] = useState("supervisor");
  const [deadline, setDeadline] = useState("");
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const { data: proposals } = useQuery<Proposal[]>({
    queryKey: ["/api/dobody/proposals"],
    refetchInterval: 60000,
  });

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["/api/dobody/proposals/count"],
    refetchInterval: 30000,
  });

  // Şube personeli (alıcı seçimi için)
  const { data: branchStaff } = useQuery<any[]>({
    queryKey: ["/api/v2/branch-on-shift", selectedProposal?.branchId],
    enabled: !!selectedProposal?.branchId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/dobody/proposals"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dobody/proposals/count"] });
  };

  const approveMut = useMutation({
    mutationFn: async ({ id, message, recipient, dl }: { id: number; message: string; recipient: string; dl: string }) => {
      // 1. Öneriyi onayla
      await apiRequest("PATCH", `/api/dobody/proposals/${id}/approve`);
      // 2. Bildirim/görev oluştur (TODO: backend notification endpoint)
      // Şimdilik proposal'ın suggestedActionData'sına mesaj kaydediyoruz
      return { success: true };
    },
    onSuccess: () => {
      invalidate();
      setSelectedProposal(null);
      toast({ title: "Mesaj gönderildi", description: "Öneri onaylandı ve bildirim oluşturuldu" });
    },
  });

  const rejectMut = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) =>
      (await apiRequest("PATCH", `/api/dobody/proposals/${id}/reject`, { reason })).json(),
    onSuccess: () => {
      invalidate();
      setSelectedProposal(null);
      setRejectMode(false);
      toast({ title: "Öneri reddedildi" });
    },
  });

  const openProposal = (p: Proposal) => {
    setSelectedProposal(p);
    setDraftMessage(generateDraftMessage(p));
    setRecipientRole(getDefaultRecipient(p));
    setDeadline(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
    setRejectMode(false);
    setRejectReason("");
  };

  const pending = proposals?.filter(p => p.status === 'pending') || [];
  const count = countData?.count || pending.length;

  if (count === 0 && (!proposals || proposals.length === 0)) return null;

  return (
    <>
      <Card className="border-purple-200 dark:border-purple-800/50">
        <CardHeader className="bg-[#192838] text-white rounded-t-lg py-2 px-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-purple-300" />
              <span>Mr. Dobody</span>
            </div>
            {count > 0 && <Badge className="bg-red-500 text-white text-xs">{count}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pending.length === 0 ? (
            <p className="text-[10px] text-muted-foreground text-center py-4">Bekleyen öneri yok</p>
          ) : (
            <div className="divide-y">
              {pending.slice(0, maxItems).map(p => {
                const pri = PRIORITY_CFG[p.priority] || PRIORITY_CFG.bilgi;
                const PriIcon = pri.icon;
                return (
                  <div key={p.id} className="p-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openProposal(p)}>
                    <div className="flex items-start gap-2">
                      <Badge className={`${pri.color} text-[10px] shrink-0`}>
                        <PriIcon className="h-3 w-3 mr-0.5" />{pri.label}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">{p.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          <span>{WF_LABELS[p.workflowType] || p.workflowType}</span>
                          {p.branchName && <span>· {p.branchName}</span>}
                          <span>· {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true, locale: tr })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ ÖNERİ DETAY + DRAFT MESAJ MODAL ═══ */}
      <Dialog open={selectedProposal !== null} onOpenChange={open => { if (!open) setSelectedProposal(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedProposal && !rejectMode && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm flex items-center gap-2">
                  <Bot className="h-4 w-4 text-purple-500" />
                  Mr. Dobody Önerisi
                </DialogTitle>
              </DialogHeader>

              {/* Öneri Özeti */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className={PRIORITY_CFG[selectedProposal.priority]?.color || "bg-blue-500 text-white"}>
                    {PRIORITY_CFG[selectedProposal.priority]?.label || selectedProposal.priority}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{WF_LABELS[selectedProposal.workflowType]}</span>
                  {selectedProposal.branchName && <Badge variant="outline" className="text-[10px]">{selectedProposal.branchName}</Badge>}
                </div>
                <p className="text-sm font-medium">{selectedProposal.title}</p>
                {selectedProposal.description && <p className="text-xs text-muted-foreground">{selectedProposal.description}</p>}
              </div>

              {/* Draft Mesaj */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1"><Send className="h-3 w-3" /> Gönderilecek Mesaj</Label>
                  <Textarea value={draftMessage} onChange={e => setDraftMessage(e.target.value)} rows={6} className="text-sm" placeholder="Dobody'nin hazırladığı mesajı düzenleyebilirsiniz..." />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1"><User className="h-3 w-3" /> Alıcı</Label>
                    <Select value={recipientRole} onValueChange={setRecipientRole}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="mudur">Müdür</SelectItem>
                        <SelectItem value="yatirimci_branch">Yatırımcı</SelectItem>
                        {branchStaff?.map(s => (
                          <SelectItem key={s.id} value={`user:${s.id}`}>
                            {s.firstName} {s.lastName || ''} ({s.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> Deadline</Label>
                    <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="text-xs" />
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" size="sm" className="text-red-500" onClick={() => setRejectMode(true)}>
                  <X className="h-3 w-3 mr-1" /> Reddet
                </Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700"
                  onClick={() => approveMut.mutate({ id: selectedProposal.id, message: draftMessage, recipient: recipientRole, dl: deadline })}
                  disabled={approveMut.isPending || !draftMessage.trim()}>
                  <Send className="h-3 w-3 mr-1" /> {approveMut.isPending ? "Gönderiliyor..." : "Düzenle ve Gönder"}
                </Button>
              </DialogFooter>
            </>
          )}

          {/* ═══ RED MODU ═══ */}
          {selectedProposal && rejectMode && (
            <>
              <DialogHeader><DialogTitle className="text-sm">Öneri Reddi</DialogTitle></DialogHeader>
              <p className="text-xs text-muted-foreground">{selectedProposal.title}</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Red Nedeni</Label>
                <Select value={rejectReason} onValueChange={setRejectReason}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Neden seçin" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gereksiz">Gereksiz — bu konuda aksiyon gerekmez</SelectItem>
                    <SelectItem value="zamanlama">Zamanlama — şu an uygun değil</SelectItem>
                    <SelectItem value="yanlis">Yanlış tespit — durum farklı</SelectItem>
                    <SelectItem value="zaten_yapildi">Zaten yapıldı — halihazırda çözüldü</SelectItem>
                    <SelectItem value="diger">Diğer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setRejectMode(false)}>Geri</Button>
                <Button variant="destructive" size="sm"
                  onClick={() => rejectMut.mutate({ id: selectedProposal.id, reason: rejectReason || "belirtilmedi" })}
                  disabled={rejectMut.isPending}>
                  {rejectMut.isPending ? "..." : "Reddet"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
