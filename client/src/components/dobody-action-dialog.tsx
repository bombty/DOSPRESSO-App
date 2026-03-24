import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, ListTodo, CheckCircle2, AlertTriangle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DobodyActionDialogProps {
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

export function DobodyActionDialog({ open, onOpenChange, suggestion }: DobodyActionDialogProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [sendNotification, setSendNotification] = useState(true);
  const [createTask, setCreateTask] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resultDetails, setResultDetails] = useState<any>(null);

  const { data: templates } = useQuery<ActionTemplate[]>({
    queryKey: ["/api/notification-templates"],
    staleTime: 60000,
  });

  useEffect(() => {
    if (suggestion && open) {
      setSuccess(false);
      setResultDetails(null);

      const defaultMsg = suggestion.message || "";
      setMessage("");

      const tmpl = detectTemplate(defaultMsg, templates || []);
      setSelectedTemplate(tmpl?.key || "generic_reminder");

      if (tmpl) {
        const defaults = tmpl.defaultActionType;
        setSendNotification(defaults === "send_notification" || defaults === "both");
        setCreateTask(defaults === "create_task" || defaults === "both");
      } else {
        setSendNotification(true);
        setCreateTask(false);
      }
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
      toast({ title: "Aksiyon Gönderildi", description: "İşlem başarıyla tamamlandı." });
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

    const subActions: string[] = [];
    if (sendNotification) subActions.push("send_notification");
    if (createTask) subActions.push("create_task");

    actionMutation.mutate({
      actionType: "dobody_action",
      targetUserId: suggestion.targetUserId || undefined,
      message,
      title: suggestion.title || undefined,
      templateKey: selectedTemplate,
      templateVariables: {
        details: suggestion.message || "",
        branchName: suggestion.branchName || "",
      },
      subActions,
      payload: {
        branchId: suggestion.branchId || suggestion.payload?.branchId,
        details: suggestion.message,
        suggestionId: suggestion.id,
        ...(suggestion.payload || {}),
      },
      suggestionId: suggestion.id,
    });
  };

  if (!suggestion) return null;

  const branchName = suggestion.branchName || suggestion.payload?.branchName || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="dialog-dobody-action">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-action-dialog-title">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Aksiyon Al
          </DialogTitle>
          <DialogDescription>
            Mr. Dobody uyarısına hızlıca müdahale edin
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4 py-4" data-testid="action-success-panel">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Aksiyon Tamamlandı</p>
                {resultDetails?.details && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {resultDetails.details.recipientName && `Alıcı: ${resultDetails.details.recipientName}`}
                    {resultDetails.details.branch && ` (${resultDetails.details.branch})`}
                  </p>
                )}
              </div>
              {resultDetails?.notificationSent && (
                <Badge variant="secondary" data-testid="badge-notif-sent">Bildirim Gönderildi</Badge>
              )}
              {resultDetails?.taskCreated && (
                <Badge variant="secondary" data-testid="badge-task-created">Görev Oluşturuldu</Badge>
              )}
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
          <div className="space-y-4" data-testid="action-form-panel">
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
                  <SelectTrigger data-testid="select-action-template">
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
              <label className="text-xs font-medium">Mesaj</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Boş bırakırsanız seçilen şablonun mesajı kullanılır..."
                className="resize-none text-sm min-h-[80px]"
                data-testid="textarea-action-message"
              />
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium">Aksiyonlar</p>
              <div className="flex items-center justify-between" data-testid="toggle-send-notification">
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
              <div className="flex items-center justify-between" data-testid="toggle-create-task">
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
            </div>

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={actionMutation.isPending || (!sendNotification && !createTask)}
              data-testid="button-submit-action"
            >
              {actionMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Aksiyon Gönder
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
