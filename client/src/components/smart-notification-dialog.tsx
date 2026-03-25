import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Send, ListTodo, CheckCircle2, AlertTriangle, Sparkles, Users, FileText, RefreshCw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SmartNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestion: {
    id: string;
    message: string;
    actionType?: string;
    actionLabel?: string;
    priority?: string;
    targetUserId?: string;
    payload?: Record<string, any>;
    branchId?: number;
    branchName?: string;
    title?: string;
    category?: string;
    severity?: string;
  } | null;
}

interface ActionTemplate {
  key: string;
  labelTr: string;
  defaultActionType: string;
}

export function SmartNotificationDialog({ open, onOpenChange, suggestion }: SmartNotificationDialogProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [sendNotification, setSendNotification] = useState(true);
  const [createTask, setCreateTask] = useState(false);
  const [createCrmTicket, setCreateCrmTicket] = useState(true);
  const [success, setSuccess] = useState(false);
  const [resultDetails, setResultDetails] = useState<any>(null);
  const [aiGenerated, setAiGenerated] = useState(false);

  const { data: templates } = useQuery<ActionTemplate[]>({
    queryKey: ["/api/notification-templates"],
    staleTime: 60000,
  });

  const branchId = suggestion?.branchId || suggestion?.payload?.branchId;
  const { data: recipientPreview } = useQuery<Array<{ name: string; role: string }>>({
    queryKey: ["/api/branch-recipients", branchId],
    queryFn: async () => {
      if (!branchId) return [];
      const res = await fetch(`/api/branches/${branchId}/recipients`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!branchId && open,
    staleTime: 30000,
  });

  const aiGenerateMutation = useMutation({
    mutationFn: async (params: {
      templateKey: string;
      branchName: string;
      details: string;
      severity?: string;
    }) => {
      const res = await apiRequest("POST", "/api/dobody/generate-message", params);
      return res.json();
    },
    onSuccess: (data) => {
      if (data?.message) {
        setMessage(data.message);
        setAiGenerated(true);
      }
    },
    onError: () => {
      const fallbackText = suggestion
        ? `Sayın ilgili, ${suggestion.branchName || suggestion.payload?.branchName || "şube"} ile ilgili: ${suggestion.message || suggestion.title || "Kontrol edilmesi gereken bir durum tespit edilmiştir."}. Gerekli aksiyonların alınmasını rica ederiz.`
        : "";
      if (fallbackText && !message) {
        setMessage(fallbackText);
      }
      toast({
        title: "AI metin üretilemedi",
        description: "Şablona dayalı metin kullanılacak",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (suggestion && open) {
      setSuccess(false);
      setResultDetails(null);
      setMessage("");
      setAiGenerated(false);

      const tmpl = detectTemplate(suggestion.message || "", templates || []);
      const templateKey = tmpl?.key || "generic_reminder";
      setSelectedTemplate(templateKey);

      if (tmpl) {
        const defaults = tmpl.defaultActionType;
        setSendNotification(defaults === "send_notification" || defaults === "both");
        setCreateTask(defaults === "create_task" || defaults === "both");
      } else {
        setSendNotification(true);
        setCreateTask(false);
      }
      setCreateCrmTicket(true);

      const branchName = suggestion.branchName || suggestion.payload?.branchName || "";
      aiGenerateMutation.mutate({
        templateKey,
        branchName,
        details: suggestion.message || "",
        severity: suggestion.severity || suggestion.priority || "",
      });
    }
  }, [suggestion, open, templates]);

  const actionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/quick-action", payload);
      return res.json();
    },
    onSuccess: (data) => {
      setSuccess(true);
      setResultDetails(data);
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hq-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coach-summary"] });
      toast({ title: "Aksiyon Tamamlandı", description: "Bildirim ve ilgili işlemler başarıyla gönderildi." });
    },
    onError: (err: any) => {
      toast({
        title: "Hata",
        description: err?.message || "Aksiyon gönderilemedi",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!suggestion) return;
    if (!sendNotification && !createTask) {
      toast({ title: "Uyarı", description: "En az bir aksiyon seçmelisiniz.", variant: "destructive" });
      return;
    }
    if (!message.trim()) {
      toast({ title: "Uyarı", description: "Mesaj alanı boş olamaz.", variant: "destructive" });
      return;
    }

    const subActions: string[] = [];
    if (sendNotification) subActions.push("send_notification");
    if (createTask) subActions.push("create_task");

    actionMutation.mutate({
      actionType: "dobody_action",
      targetUserId: suggestion.targetUserId || undefined,
      message: message.trim(),
      title: suggestion.title || undefined,
      templateKey: selectedTemplate,
      templateVariables: {
        details: suggestion.message || "",
        branchName: suggestion.branchName || suggestion.payload?.branchName || "",
      },
      subActions,
      createCrmTicket,
      payload: {
        branchId: suggestion.branchId || suggestion.payload?.branchId,
        details: suggestion.message,
        suggestionId: suggestion.id,
        severity: suggestion.severity || suggestion.priority || "high",
        ...(suggestion.payload || {}),
      },
      suggestionId: suggestion.id,
    });
  };

  const handleRegenerate = () => {
    if (!suggestion) return;
    const branchName = suggestion.branchName || suggestion.payload?.branchName || "";
    aiGenerateMutation.mutate({
      templateKey: selectedTemplate,
      branchName,
      details: suggestion.message || "",
      severity: suggestion.severity || suggestion.priority || "",
    });
  };

  if (!suggestion) return null;

  const branchName = suggestion.branchName || suggestion.payload?.branchName || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="dialog-smart-notification">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-smart-notif-title">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Akıllı Bildirim Gönder
          </DialogTitle>
          <DialogDescription>
            AI destekli profesyonel uyarı metni oluşturun ve onaylayarak gönderin
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4 py-4" data-testid="smart-notif-success-panel">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Aksiyon Tamamlandı</p>
                {resultDetails?.details && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {resultDetails.details.recipientName && `Alıcılar: ${resultDetails.details.recipientName}`}
                    {resultDetails.details.branch && ` (${resultDetails.details.branch})`}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {resultDetails?.notificationSent && (
                  <Badge variant="secondary" data-testid="badge-notif-sent">
                    Bildirim Gönderildi ({resultDetails.recipientCount || 1} kişi)
                  </Badge>
                )}
                {resultDetails?.taskCreated && (
                  <Badge variant="secondary" data-testid="badge-task-created">Görev Oluşturuldu</Badge>
                )}
                {resultDetails?.crmTicketCreated && (
                  <Badge variant="secondary" data-testid="badge-crm-ticket-created">
                    CRM Ticket: {resultDetails.crmTicketNumber}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-success"
            >
              Kapat
            </Button>
          </div>
        ) : (
          <div className="space-y-4" data-testid="smart-notif-form-panel">
            <div className="rounded-md bg-muted/30 p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Uyarı Detayı</p>
              <p className="text-sm">{suggestion.message}</p>
              {branchName && (
                <Badge variant="secondary" className="text-[10px] mt-1" data-testid="badge-branch-name">
                  {branchName}
                </Badge>
              )}
            </div>

            {templates && templates.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Mesaj Şablonu</label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger data-testid="select-template">
                    <SelectValue placeholder="Şablon seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.key} value={t.key} data-testid={`template-option-${t.key}`}>
                        {t.labelTr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-xs font-medium flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  AI Uyarı Metni
                </label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRegenerate}
                  disabled={aiGenerateMutation.isPending}
                  data-testid="button-regenerate-ai"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${aiGenerateMutation.isPending ? "animate-spin" : ""}`} />
                  Yeniden Oluştur
                </Button>
              </div>
              {aiGenerateMutation.isPending ? (
                <div className="space-y-2 p-4 rounded-md border border-dashed" data-testid="ai-loading">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Metin hazırlanıyor...
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : (
                <Textarea
                  value={message}
                  onChange={(e) => { setMessage(e.target.value); setAiGenerated(false); }}
                  placeholder="Mesaj metni..."
                  className="resize-none text-sm min-h-[120px]"
                  data-testid="textarea-smart-message"
                />
              )}
              {aiGenerated && message && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5" />
                  AI tarafından oluşturuldu — düzenleyebilirsiniz
                </p>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium flex items-center gap-1">
                <Users className="h-3 w-3" />
                Alıcılar
              </p>
              <div className="rounded-md bg-muted/20 p-2 space-y-1">
                {recipientPreview && recipientPreview.length > 0 ? (
                  <div className="space-y-1">
                    {recipientPreview.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs" data-testid={`recipient-preview-${i}`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                        <span className="font-medium">{r.name}</span>
                        <span className="text-muted-foreground">({r.role})</span>
                      </div>
                    ))}
                  </div>
                ) : suggestion?.payload?.branchNames ? (
                  <p className="text-xs text-muted-foreground">
                    {suggestion.payload.branchNames.length} şubenin Supervisor ve Yatırımcılarına toplu bildirim gönderilecektir.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Bildirim otomatik olarak şube Supervisor ve Yatırımcısına gönderilecektir.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium">Aksiyonlar</p>
              <div className="flex items-center justify-between gap-2" data-testid="toggle-send-notification">
                <div className="flex items-center gap-2">
                  <Send className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm">Bildirim Gönder</span>
                </div>
                <Switch
                  checked={sendNotification}
                  onCheckedChange={setSendNotification}
                  data-testid="switch-send-notification"
                />
              </div>
              <div className="flex items-center justify-between gap-2" data-testid="toggle-create-task">
                <div className="flex items-center gap-2">
                  <ListTodo className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm">Görev Oluştur</span>
                </div>
                <Switch
                  checked={createTask}
                  onCheckedChange={setCreateTask}
                  data-testid="switch-create-task"
                />
              </div>
              <div className="flex items-center justify-between gap-2" data-testid="toggle-crm-ticket">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm">CRM Uygunsuzluk Kaydı Oluştur</span>
                </div>
                <Switch
                  checked={createCrmTicket}
                  onCheckedChange={setCreateCrmTicket}
                  data-testid="switch-crm-ticket"
                />
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={actionMutation.isPending || aiGenerateMutation.isPending || (!sendNotification && !createTask)}
              data-testid="button-confirm-send"
            >
              {actionMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Onayla ve Gönder
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function detectTemplate(message: string, templates: ActionTemplate[]): ActionTemplate | null {
  const msg = message.toLowerCase();
  if (msg.includes('stok') && (msg.includes('sayım') || msg.includes('düşük'))) {
    return templates.find(t => t.key === 'overdue_stock_count') || null;
  }
  if (msg.includes('performans') || msg.includes('skor')) {
    return templates.find(t => t.key === 'low_performance') || null;
  }
  if (msg.includes('checklist') || msg.includes('tamamlanma')) {
    return templates.find(t => t.key === 'missing_checklist') || null;
  }
  if (msg.includes('bakım')) {
    return templates.find(t => t.key === 'maintenance_overdue') || null;
  }
  if (msg.includes('eğitim') || msg.includes('modül')) {
    return templates.find(t => t.key === 'training_overdue') || null;
  }
  if (msg.includes('arıza')) {
    return templates.find(t => t.key === 'fault_unresolved') || null;
  }
  if (msg.includes('müşteri') || msg.includes('memnuniyet')) {
    return templates.find(t => t.key === 'low_customer_rating') || null;
  }
  return templates.find(t => t.key === 'generic_reminder') || null;
}
