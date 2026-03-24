import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";
import { UserPlus, Headphones, Wrench, CalendarClock, BarChart3, Loader2, Send } from "lucide-react";

interface BackupCallModalProps {
  open: boolean;
  onClose: () => void;
  branchId: number | null;
}

function BackupCallModal({ open, onClose, branchId }: BackupCallModalProps) {
  const [selectedUser, setSelectedUser] = useState("");
  const [message, setMessage] = useState("Acil yedek çağrısı — bugün şubeye destek gelebilir misiniz?");
  const { toast } = useToast();

  const { data: staffList } = useQuery<any[]>({
    queryKey: ["/api/users", branchId, "backup"],
    queryFn: async () => {
      const res = await fetch(`/api/users?branchId=${branchId}`, { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return (Array.isArray(data) ? data : []).filter((u: any) => u.isActive !== false);
    },
    enabled: open && !!branchId,
  });

  const sendMutation = useMutation({
    mutationFn: async (body: { userId: string; message: string }) => {
      const res = await apiRequest("POST", "/api/notifications", {
        recipientId: body.userId,
        title: "Yedek Çağrısı",
        message: body.message,
        type: "backup_call",
        priority: "high",
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Yedek çağrısı gönderildi" });
      setSelectedUser("");
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Gönderilemedi", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-500" />
            Yedek Çağır
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Personel</label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger data-testid="select-backup-user">
                <SelectValue placeholder="Personel seçin" />
              </SelectTrigger>
              <SelectContent>
                {(staffList || []).map((u: any) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.firstName} {u.lastName} ({u.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Mesaj</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="resize-none"
              rows={2}
              data-testid="input-backup-message"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-backup">İptal</Button>
          <Button
            onClick={() => selectedUser && sendMutation.mutate({ userId: selectedUser, message })}
            disabled={!selectedUser || sendMutation.isPending}
            className="min-h-[48px]"
            data-testid="button-send-backup"
          >
            {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Gönder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const DEPARTMENTS = [
  { key: "teknik", label: "Teknik" },
  { key: "muhasebe", label: "Muhasebe" },
  { key: "lojistik", label: "Lojistik" },
  { key: "egitim", label: "Eğitim" },
  { key: "ik", label: "İK" },
  { key: "diger", label: "Diğer" },
];

function SupervisorTicketModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [department, setDepartment] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const { toast } = useToast();

  const ticketMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await apiRequest("POST", "/api/iletisim/tickets", body);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Talep oluşturuldu" });
      queryClient.invalidateQueries({ queryKey: ["/api/iletisim/tickets"] });
      setDepartment("");
      setDescription("");
      setPriority("normal");
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Oluşturulamadı", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-blue-500" />
            Talep Oluştur
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Departman</label>
            <div className="grid grid-cols-3 gap-2">
              {DEPARTMENTS.map((d) => (
                <Button
                  key={d.key}
                  variant={department === d.key ? "default" : "outline"}
                  className="min-h-[48px] text-xs"
                  onClick={() => setDepartment(d.key)}
                  data-testid={`button-sup-dept-${d.key}`}
                >
                  {d.label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Öncelik</label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger data-testid="select-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Düşük</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">Yüksek</SelectItem>
                <SelectItem value="urgent">Acil</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Açıklama</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Talep detayı..."
              className="resize-none"
              rows={3}
              data-testid="input-sup-ticket-desc"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>İptal</Button>
          <Button
            onClick={() => {
              if (!department || !description.trim()) {
                toast({ title: "Eksik bilgi", variant: "destructive" });
                return;
              }
              ticketMutation.mutate({
                title: `${DEPARTMENTS.find(d => d.key === department)?.label} talebi`,
                description: description.trim(),
                channel: "franchise",
                ticketType: "franchise_talep",
                department,
                priority,
              });
            }}
            disabled={ticketMutation.isPending}
            className="min-h-[48px]"
            data-testid="button-submit-sup-ticket"
          >
            {ticketMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Gönder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SupervisorFaultModal({ open, onClose, branchId }: { open: boolean; onClose: () => void; branchId: number | null }) {
  const [equipmentId, setEquipmentId] = useState("");
  const [description, setDescription] = useState("");
  const [escalate, setEscalate] = useState(false);
  const { toast } = useToast();

  const { data: equipment } = useQuery<any[]>({
    queryKey: ["/api/equipment", branchId],
    queryFn: async () => {
      const res = await fetch(`/api/equipment?branchId=${branchId}`, { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data?.data || [];
    },
    enabled: open && !!branchId,
  });

  const faultMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await apiRequest("POST", "/api/faults", body);
      return res.json();
    },
    onSuccess: async () => {
      toast({ title: "Arıza bildirildi" });
      queryClient.invalidateQueries({ queryKey: ["/api/faults"] });
      if (escalate) {
        try {
          await apiRequest("POST", "/api/iletisim/tickets", {
            title: "Ekipman arızası — HQ desteği gerekli",
            description: description.trim(),
            channel: "franchise",
            ticketType: "franchise_talep",
            department: "teknik",
            priority: "high",
          });
        } catch {}
      }
      setEquipmentId("");
      setDescription("");
      setEscalate(false);
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Bildirilemedi", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-500" />
            Arıza Bildir
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Ekipman</label>
            <Select value={equipmentId} onValueChange={setEquipmentId}>
              <SelectTrigger data-testid="select-sup-equipment">
                <SelectValue placeholder="Ekipman seçin" />
              </SelectTrigger>
              <SelectContent>
                {(equipment || []).map((e: any) => (
                  <SelectItem key={e.id} value={String(e.id)}>{e.name || e.equipmentName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Açıklama</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 200))}
              placeholder="Arıza detayı..."
              className="resize-none"
              rows={3}
              data-testid="input-sup-fault-desc"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={escalate}
              onChange={(e) => setEscalate(e.target.checked)}
              className="rounded border-muted-foreground/30 w-5 h-5"
              data-testid="checkbox-escalate"
            />
            <span className="text-sm">HQ Destek İste (CRM ticket oluşturur)</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>İptal</Button>
          <Button
            onClick={() => {
              if (!equipmentId || !description.trim()) {
                toast({ title: "Eksik bilgi", variant: "destructive" });
                return;
              }
              faultMutation.mutate({ equipmentId: Number(equipmentId), description: description.trim(), priority: "high" });
            }}
            disabled={faultMutation.isPending}
            className="min-h-[48px]"
            data-testid="button-submit-sup-fault"
          >
            {faultMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Gönder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const QUICK_ACTIONS = [
  { id: "backup", icon: UserPlus, label: "Yedek\nÇağır", color: "text-emerald-500" },
  { id: "ticket", icon: Headphones, label: "Talep\nOluştur", color: "text-blue-500" },
  { id: "fault", icon: Wrench, label: "Arıza\nBildir", color: "text-amber-500" },
  { id: "shift", icon: CalendarClock, label: "Vardiya\nYönet", color: "text-violet-500" },
  { id: "report", icon: BarChart3, label: "Rapor\nGör", color: "text-rose-500" },
];

export function SupervisorQuickBar() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const branchId = (user as any)?.branchId ?? null;
  const isMobile = useIsMobile();
  const [showBackup, setShowBackup] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [showFault, setShowFault] = useState(false);

  const handleAction = (id: string) => {
    switch (id) {
      case "backup": setShowBackup(true); break;
      case "ticket": setShowTicket(true); break;
      case "fault": setShowFault(true); break;
      case "shift": navigate("/vardiya"); break;
      case "report": navigate("/raporlar"); break;
    }
  };

  const bar = (
    <div className="flex items-center gap-2 py-2 px-1" data-testid="supervisor-quick-bar">
      {QUICK_ACTIONS.map((a) => (
        <button
          key={a.id}
          onClick={() => handleAction(a.id)}
          className="flex flex-col items-center justify-center gap-1 min-w-[60px] min-h-[60px] rounded-lg bg-muted/50 hover-elevate active-elevate-2 flex-shrink-0 p-2"
          data-testid={`sup-quick-${a.id}`}
        >
          <a.icon className={`w-5 h-5 ${a.color}`} />
          <span className="text-[9px] font-medium text-center whitespace-pre-line leading-tight">{a.label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <>
      {isMobile ? (
        <div
          className="sticky bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t"
          style={{ paddingBottom: "max(4px, env(safe-area-inset-bottom, 0px))" }}
        >
          <ScrollArea className="w-full">
            {bar}
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      ) : (
        <Card className="mb-4">
          <CardContent className="p-2">
            <ScrollArea className="w-full">
              {bar}
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <BackupCallModal open={showBackup} onClose={() => setShowBackup(false)} branchId={branchId} />
      <SupervisorTicketModal open={showTicket} onClose={() => setShowTicket(false)} />
      <SupervisorFaultModal open={showFault} onClose={() => setShowFault(false)} branchId={branchId} />
    </>
  );
}
