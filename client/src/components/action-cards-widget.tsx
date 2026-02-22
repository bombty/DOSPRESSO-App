import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
import { Input } from "@/components/ui/input";
import {
  ClipboardCheck, Camera, FileText, CheckCircle, Clock, Send,
  RefreshCw, Loader2, AlertCircle, Zap
} from "lucide-react";

interface ActionCard {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string | null;
  evidenceType: string;
  evidenceData: string | null;
  photoUrl: string | null;
  tags: string[];
  triggerName: string | null;
  completedAt: string | null;
}

const evidenceIcons: Record<string, any> = {
  photo: Camera,
  form: FileText,
  approval: CheckCircle,
  none: ClipboardCheck,
};

export function ActionCardsWidget() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation("dashboard");
  const [submitDialog, setSubmitDialog] = useState<ActionCard | null>(null);
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [formData, setFormData] = useState("");

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    beklemede: { label: t("statusPending"), variant: "outline" },
    incelemede: { label: t("statusSubmitted"), variant: "secondary" },
    onaylandi: { label: t("statusApproved"), variant: "default" },
    reddedildi: { label: "Reddedildi", variant: "destructive" },
  };

  const evidenceLabels: Record<string, string> = {
    photo: t("uploadPhoto"),
    form: t("fillForm"),
    approval: t("requestApproval"),
    none: t("complete"),
  };

  const { data: actionCards = [], isLoading } = useQuery<ActionCard[]>({
    queryKey: ["/api/action-cards/today"],
    enabled: !!user,
    refetchInterval: 60000,
  });

  const generateMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/action-cards/generate"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/action-cards/today"] });
      toast({ title: t("tasksGenerated") });
    },
    onError: () => {
      toast({ title: t("common:error"), description: t("tasksGenerateFailed"), variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async ({ id, evidenceType }: { id: number; evidenceType: string }) => {
      return apiRequest("POST", `/api/action-cards/${id}/submit`, {
        evidenceType,
        photoUrl: photoUrl || undefined,
        evidenceData: formData || undefined,
        notes: notes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/action-cards/today"] });
      setSubmitDialog(null);
      setNotes("");
      setPhotoUrl("");
      setFormData("");
      toast({ title: t("common:success"), description: t("evidenceSubmitted") });
    },
    onError: () => {
      toast({ title: t("common:error"), description: t("evidenceSubmitFailed"), variant: "destructive" });
    },
  });

  if (!user) return null;

  const pendingCards = actionCards.filter(c => c.status === "beklemede");
  const submittedCards = actionCards.filter(c => c.status !== "beklemede");
  const completionRate = actionCards.length > 0
    ? Math.round((submittedCards.length / actionCards.length) * 100)
    : 0;

  if (actionCards.length === 0 && !isLoading) {
    return null;
  }

  return (
    <>
      <Card data-testid="card-action-cards-widget">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-5 w-5 text-yellow-500" />
            {t("todaysTasks")}
            {actionCards.length > 0 && (
              <Badge variant="secondary">{pendingCards.length}/{actionCards.length}</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            {completionRate > 0 && (
              <Badge variant={completionRate === 100 ? "default" : "outline"}>
                %{completionRate}
              </Badge>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              data-testid="button-refresh-action-cards"
            >
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {actionCards.map((card) => {
                const EvidenceIcon = evidenceIcons[card.evidenceType] || ClipboardCheck;
                const isRejected = card.status === "reddedildi";
                const isDone = card.status !== "beklemede" && !isRejected;
                const canSubmit = card.status === "beklemede" || isRejected;
                const statusInfo = statusConfig[card.status] || statusConfig.beklemede;

                return (
                  <div
                    key={card.id}
                    className={`flex items-center gap-3 p-3 rounded-md border transition-colors ${
                      isDone ? "bg-muted/30 opacity-70" : isRejected ? "border-destructive/30" : "hover-elevate"
                    }`}
                    data-testid={`action-card-${card.id}`}
                  >
                    <div className={`flex-shrink-0 p-2 rounded-md ${isDone ? "bg-green-500/10" : isRejected ? "bg-red-500/10" : "bg-primary/10"}`}>
                      <EvidenceIcon className={`h-4 w-4 ${isDone ? "text-green-600" : isRejected ? "text-red-600" : "text-primary"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isDone ? "line-through text-muted-foreground" : ""}`}>
                        {card.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge variant={statusInfo.variant} className="text-[10px]">
                          {statusInfo.label}
                        </Badge>
                        {card.dueDate && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            {new Date(card.dueDate).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                        {card.tags?.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {canSubmit && (
                      <Button
                        size="sm"
                        variant={isRejected ? "destructive" : "default"}
                        onClick={() => setSubmitDialog(card)}
                        data-testid={`button-submit-card-${card.id}`}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        {isRejected ? "Tekrar Gönder" : (evidenceLabels[card.evidenceType] || t("send"))}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!submitDialog} onOpenChange={(v) => !v && setSubmitDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{submitDialog?.title}</DialogTitle>
            <DialogDescription>{submitDialog?.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {submitDialog?.evidenceType === "photo" && (
              <div>
                <label className="text-sm font-medium">{t("photoUrl")}</label>
                <Input
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder={t("photoUrlPlaceholder")}
                  data-testid="input-photo-url"
                />
              </div>
            )}

            {submitDialog?.evidenceType === "form" && (
              <div>
                <label className="text-sm font-medium">{t("formData")}</label>
                <Textarea
                  value={formData}
                  onChange={(e) => setFormData(e.target.value)}
                  placeholder={t("formDataPlaceholder")}
                  rows={4}
                  data-testid="input-form-data"
                />
              </div>
            )}

            {submitDialog?.evidenceType === "approval" && (
              <div className="p-3 bg-muted/50 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">{t("approvalNote")}</p>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">{t("notesOptional")}</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("notesPlaceholder")}
                rows={2}
                data-testid="input-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitDialog(null)}>{t("common:cancel")}</Button>
            <Button
              onClick={() => submitDialog && submitMutation.mutate({
                id: submitDialog.id,
                evidenceType: submitDialog.evidenceType,
              })}
              disabled={submitMutation.isPending}
              data-testid="button-confirm-submit"
            >
              {submitMutation.isPending ? t("sending") : t("send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
