import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ClipboardCheck, Camera, FileText, CheckCircle, XCircle, Clock,
  Loader2, ShieldCheck, User, ExternalLink
} from "lucide-react";

interface EvidenceRecord {
  id: number;
  taskId: number;
  type: string;
  payloadJson: string | null;
  fileUrl: string | null;
  status: string;
  createdAt: string;
}

interface PendingCard {
  id: number;
  title: string;
  description: string;
  status: string;
  branchId: number | null;
  assignedToId: string;
  assigneeName: string | null;
  dueDate: string | null;
  evidenceType: string;
  evidenceData: string | null;
  photoUrl: string | null;
  triggerName: string | null;
  tags: string[];
  evidence: EvidenceRecord[];
  completedAt: string | null;
}

const evidenceIcons: Record<string, any> = {
  photo: Camera,
  form: FileText,
  approval: CheckCircle,
  approval_request: CheckCircle,
  none: ClipboardCheck,
};

export function PendingApprovalsPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [detailCard, setDetailCard] = useState<PendingCard | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const { data: pendingCards = [], isLoading } = useQuery<PendingCard[]>({
    queryKey: ["/api/action-cards/pending-approvals"],
    enabled: !!user,
    refetchInterval: 60000,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, note }: { id: number; note: string }) => {
      return apiRequest("POST", `/api/action-cards/${id}/approve`, { note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/action-cards/pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/action-cards/today"] });
      setDetailCard(null);
      setReviewNote("");
      toast({ title: "Onaylandı", description: "Görev başarıyla onaylandı" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Onaylama başarısız", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, note }: { id: number; note: string }) => {
      return apiRequest("POST", `/api/action-cards/${id}/reject`, { note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/action-cards/pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/action-cards/today"] });
      setDetailCard(null);
      setReviewNote("");
      toast({ title: "Reddedildi", description: "Görev reddedildi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Reddetme başarısız", variant: "destructive" });
    },
  });

  if (!user) return null;
  if (pendingCards.length === 0 && !isLoading) return null;

  return (
    <>
      <Card data-testid="card-pending-approvals">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5 text-blue-500" />
            Onay Bekleyenler
            {pendingCards.length > 0 && (
              <Badge variant="secondary">{pendingCards.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {pendingCards.map((card) => {
                const EvidenceIcon = evidenceIcons[card.evidenceType] || ClipboardCheck;

                return (
                  <div
                    key={card.id}
                    className="flex items-center gap-3 p-3 rounded-md border hover-elevate cursor-pointer"
                    onClick={() => setDetailCard(card)}
                    data-testid={`pending-approval-${card.id}`}
                  >
                    <div className="flex-shrink-0 p-2 rounded-md bg-blue-500/10">
                      <EvidenceIcon className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{card.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <User className="h-3 w-3" />
                          {card.assigneeName || "Bilinmiyor"}
                        </span>
                        {card.dueDate && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            {new Date(card.dueDate).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                        <Badge variant="outline" className="text-[10px]">
                          {card.evidenceType === "photo" ? "Fotoğraf" : card.evidenceType === "form" ? "Form" : "Onay"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={(e) => { e.stopPropagation(); approveMutation.mutate({ id: card.id, note: "" }); }}
                        disabled={approveMutation.isPending}
                        data-testid={`button-quick-approve-${card.id}`}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Onayla
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detailCard} onOpenChange={(v) => { if (!v) { setDetailCard(null); setReviewNote(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-500" />
              {detailCard?.title}
            </DialogTitle>
            <DialogDescription>
              {detailCard?.assigneeName} tarafından gönderildi
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-1">Görev Açıklaması</h4>
              <p className="text-sm text-muted-foreground">{detailCard?.description}</p>
            </div>

            {detailCard?.evidence && detailCard.evidence.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Kanıtlar</h4>
                <div className="space-y-2">
                  {detailCard.evidence.map((ev) => {
                    let payload: any = {};
                    try { payload = ev.payloadJson ? JSON.parse(ev.payloadJson) : {}; } catch {}

                    return (
                      <div key={ev.id} className="bg-muted/50 rounded-md p-3 text-sm space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {ev.type === "photo" ? "Fotoğraf" : ev.type === "form" ? "Form" : "Onay Talebi"}
                          </Badge>
                          <Badge variant={ev.status === "approved" ? "default" : ev.status === "rejected" ? "destructive" : "secondary"} className="text-[10px]">
                            {ev.status === "approved" ? "Onaylı" : ev.status === "rejected" ? "Reddedildi" : "Beklemede"}
                          </Badge>
                        </div>
                        {ev.fileUrl && (
                          <a href={ev.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" /> Dosyayı Görüntüle
                          </a>
                        )}
                        {payload.data && (
                          <div className="text-xs text-muted-foreground mt-1">
                            <pre className="whitespace-pre-wrap">{typeof payload.data === "string" ? payload.data : JSON.stringify(payload.data, null, 2)}</pre>
                          </div>
                        )}
                        {payload.notes && (
                          <p className="text-xs text-muted-foreground">Not: {payload.notes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {detailCard?.photoUrl && (
              <div>
                <h4 className="text-sm font-medium mb-1">Fotoğraf</h4>
                <a href={detailCard.photoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" /> Fotoğrafı Görüntüle
                </a>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">İnceleme Notu (Opsiyonel)</label>
              <Textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Onay veya ret sebebi..."
                rows={2}
                data-testid="input-review-note"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={() => detailCard && rejectMutation.mutate({ id: detailCard.id, note: reviewNote })}
              disabled={rejectMutation.isPending}
              data-testid="button-reject-evidence"
            >
              {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
              Reddet
            </Button>
            <Button
              onClick={() => detailCard && approveMutation.mutate({ id: detailCard.id, note: reviewNote })}
              disabled={approveMutation.isPending}
              data-testid="button-approve-evidence"
            >
              {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
              Onayla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
