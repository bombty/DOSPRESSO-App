import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Wrench, Headphones, Clock, CheckCircle2, Loader2 } from "lucide-react";

interface QuickFaultModalProps {
  open: boolean;
  onClose: () => void;
  branchId: number | null;
}

function QuickFaultModal({ open, onClose, branchId }: QuickFaultModalProps) {
  const [equipmentId, setEquipmentId] = useState("");
  const [description, setDescription] = useState("");
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
    mutationFn: async (body: { equipmentId: number; description: string; priority: string }) => {
      const res = await apiRequest("POST", "/api/faults", body);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Arıza bildirildi", description: "Supervisor'a bildirim gönderildi." });
      queryClient.invalidateQueries({ queryKey: ["/api/faults"] });
      setEquipmentId("");
      setDescription("");
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Arıza bildirilemedi", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!equipmentId || !description.trim()) {
      toast({ title: "Eksik bilgi", description: "Ekipman ve açıklama gerekli.", variant: "destructive" });
      return;
    }
    faultMutation.mutate({ equipmentId: Number(equipmentId), description: description.trim(), priority: "normal" });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-500" />
            Hızlı Arıza Bildir
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Ekipman</label>
            <Select value={equipmentId} onValueChange={setEquipmentId}>
              <SelectTrigger data-testid="select-equipment">
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
              placeholder="Arıza detayını kısaca yazın..."
              className="resize-none"
              rows={3}
              data-testid="input-fault-description"
            />
            <p className="text-[10px] text-muted-foreground text-right mt-1">{description.length}/200</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-fault">İptal</Button>
          <Button
            onClick={handleSubmit}
            disabled={faultMutation.isPending}
            className="min-h-[48px]"
            data-testid="button-submit-fault"
          >
            {faultMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Gönder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface QuickTicketModalProps {
  open: boolean;
  onClose: () => void;
}

const DEPARTMENTS = [
  { key: "teknik", label: "Teknik", color: "text-blue-500" },
  { key: "muhasebe", label: "Muhasebe", color: "text-emerald-500" },
  { key: "lojistik", label: "Lojistik", color: "text-amber-500" },
  { key: "egitim", label: "Eğitim", color: "text-violet-500" },
  { key: "ik", label: "İK", color: "text-rose-500" },
  { key: "diger", label: "Diğer", color: "text-gray-500" },
];

function QuickTicketModal({ open, onClose }: QuickTicketModalProps) {
  const [department, setDepartment] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const ticketMutation = useMutation({
    mutationFn: async (body: { title: string; description: string; channel: string; ticketType: string; department: string }) => {
      const res = await apiRequest("POST", "/api/iletisim/tickets", body);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Talep oluşturuldu", description: "HQ'ya iletildi." });
      queryClient.invalidateQueries({ queryKey: ["/api/iletisim/tickets"] });
      setDepartment("");
      setDescription("");
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Talep oluşturulamadı", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!department || !description.trim()) {
      toast({ title: "Eksik bilgi", description: "Departman ve açıklama gerekli.", variant: "destructive" });
      return;
    }
    ticketMutation.mutate({
      title: `${DEPARTMENTS.find(d => d.key === department)?.label || department} talebi`,
      description: description.trim(),
      channel: "franchise",
      ticketType: "franchise_talep",
      department,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-blue-500" />
            Hızlı Talep Oluştur
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
                  data-testid={`button-dept-${d.key}`}
                >
                  {d.label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Açıklama</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Talebi kısaca açıklayın..."
              className="resize-none"
              rows={3}
              data-testid="input-ticket-description"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-ticket">İptal</Button>
          <Button
            onClick={handleSubmit}
            disabled={ticketMutation.isPending}
            className="min-h-[48px]"
            data-testid="button-submit-ticket"
          >
            {ticketMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Gönder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BaristaQuickActions() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const branchId = (user as any)?.branchId ?? null;
  const [showFault, setShowFault] = useState(false);
  const [showTicket, setShowTicket] = useState(false);

  const { data: pdksData } = useQuery<any>({
    queryKey: ["/api/pdks/my-status"],
    queryFn: async () => {
      const res = await fetch("/api/pdks/my-status", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60_000,
  });

  const { data: ticketData } = useQuery<any>({
    queryKey: ["/api/iletisim/tickets", "my-count"],
    queryFn: async () => {
      const res = await fetch("/api/iletisim/tickets?channel=franchise&status=acik&limit=100", { credentials: "include" });
      if (!res.ok) return { count: 0 };
      const data = await res.json();
      const arr = Array.isArray(data) ? data : data?.data || [];
      return { count: arr.length };
    },
    staleTime: 5 * 60_000,
  });

  const { data: faultData } = useQuery<any>({
    queryKey: ["/api/faults", "my-recent"],
    queryFn: async () => {
      const res = await fetch("/api/faults?limit=1", { credentials: "include" });
      if (!res.ok) return null;
      const data = await res.json();
      const arr = Array.isArray(data) ? data : data?.data || [];
      return arr[0] || null;
    },
    staleTime: 5 * 60_000,
  });

  const isActive = !!pdksData?.activeSession;
  const checkInTime = pdksData?.activeSession?.checkIn
    ? new Date(pdksData.activeSession.checkIn).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
    : null;
  const openTicketCount = ticketData?.count ?? 0;
  const lastFaultDays = faultData?.createdAt
    ? Math.floor((Date.now() - new Date(faultData.createdAt).getTime()) / 86400000)
    : null;

  const actions = [
    {
      id: "pdks",
      icon: Clock,
      title: isActive ? "Vardiya Aktif" : "Giriş / Çıkış",
      subtitle: isActive ? `Giriş: ${checkInTime}` : "Kiosk'tan giriş yapın",
      badge: isActive ? "AKTİF" : undefined,
      badgeColor: "bg-emerald-500",
      borderColor: "border-l-emerald-500",
      onClick: () => { navigate(`/sube/kiosk/${branchId || ""}`); },
    },
    {
      id: "fault",
      icon: Wrench,
      title: "Arıza Bildir",
      subtitle: lastFaultDays != null ? `Son arıza: ${lastFaultDays} gün önce` : "Ekipman arızası bildirin",
      borderColor: "border-l-amber-500",
      onClick: () => setShowFault(true),
    },
    {
      id: "ticket",
      icon: Headphones,
      title: "Talep Oluştur",
      subtitle: "HQ'ya destek talebi gönderin",
      badge: openTicketCount > 0 ? `${openTicketCount} açık` : undefined,
      badgeColor: "bg-blue-500",
      borderColor: "border-l-blue-500",
      onClick: () => setShowTicket(true),
    },
  ];

  return (
    <>
      <div className="space-y-2" data-testid="barista-quick-actions">
        {actions.map((a) => (
          <Card
            key={a.id}
            className={`hover-elevate cursor-pointer border-l-4 rounded-none rounded-r-md ${a.borderColor}`}
            onClick={a.onClick}
            data-testid={`quick-action-${a.id}`}
          >
            <CardContent className="p-3 flex items-center gap-3 min-h-[80px]">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <a.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">{a.title}</span>
                  {a.badge && (
                    <Badge className={`text-[9px] h-4 text-white ${a.badgeColor}`}>
                      {a.badge}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{a.subtitle}</p>
              </div>
              {a.id === "pdks" && isActive && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
            </CardContent>
          </Card>
        ))}
      </div>

      <QuickFaultModal open={showFault} onClose={() => setShowFault(false)} branchId={branchId} />
      <QuickTicketModal open={showTicket} onClose={() => setShowTicket(false)} />
    </>
  );
}
