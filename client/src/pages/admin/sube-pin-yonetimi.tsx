import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { KeyRound, Check, AlertTriangle, Loader2, QrCode, Lock, Unlock } from "lucide-react";
import { LoadingState } from "@/components/loading-state";

export default function SubePinYonetimi() {
  const { toast } = useToast();
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [pinDialog, setPinDialog] = useState<{ open: boolean; user: any } | null>(null);
  const [newPin, setNewPin] = useState("");

  const { data: branches, isLoading: branchesLoading } = useQuery<any[]>({
    queryKey: ["/api/branches"],
    staleTime: 300000,
    queryFn: async () => {
      const res = await fetch("/api/branches", { credentials: "include" });
      return res.json();
    },
  });

  const { data: staffData, isLoading: staffLoading, refetch } = useQuery<any>({
    queryKey: ["/api/branches/kiosk/staff", selectedBranch],
    queryFn: async () => {
      const res = await fetch(`/api/branches/${selectedBranch}/kiosk/staff`, { credentials: "include" });
      return res.json();
    },
    enabled: !!selectedBranch,
  });

  const setPinMutation = useMutation({
    mutationFn: async ({ userId, pin }: { userId: string; pin: string }) => {
      const res = await apiRequest("POST", `/api/branches/${selectedBranch}/kiosk/set-pin`, { userId, pin });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "PIN ayarlandı" });
      setPinDialog(null);
      setNewPin("");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/branches/kiosk/staff", selectedBranch] });
    },
    onError: (e: any) => toast({ title: "Hata", description: e.message, variant: "destructive" }),
  });

  const staff: any[] = Array.isArray(staffData) ? staffData : (staffData?.staff || []);

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4" data-testid="sube-pin-yonetimi">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-[#ef4444]" />
          Şube Kiosk PIN Yönetimi
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Personellere kiosk girişi için 4 haneli PIN tanımlayın
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-full sm:w-72" data-testid="select-branch">
              <SelectValue placeholder="Şube seçin..." />
            </SelectTrigger>
            <SelectContent>
              {branchesLoading ? (
                <SelectItem value="loading" disabled>Yükleniyor...</SelectItem>
              ) : (
                Array.isArray(branches) && (Array.isArray(branches) ? branches : []).map((b: any) => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedBranch && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Personel Listesi</span>
              {staff.length > 0 && (
                <div className="flex gap-2 text-xs font-normal">
                  <span className="text-green-600 dark:text-green-400">
                    {staff.filter((s: any) => s.hasPin).length} PIN tanımlı
                  </span>
                  <span className="text-muted-foreground">
                    {staff.filter((s: any) => !s.hasPin).length} eksik
                  </span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {staffLoading ? (
              <LoadingState />
            ) : staff.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Bu şubede personel bulunamadı</p>
            ) : (
              <div className="space-y-2">
                {staff.map((s: any) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card"
                    data-testid={`staff-row-${s.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium flex-shrink-0">
                        {s.firstName?.[0]}{s.lastName?.[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.firstName} {s.lastName}</p>
                        <p className="text-xs text-muted-foreground">{s.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {s.hasPin ? (
                        <Badge variant="outline" className="text-green-600 border-green-500/30 gap-1">
                          <Check className="h-3 w-3" />
                          PIN var
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-500/30 gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          PIN yok
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant={s.hasPin ? "outline" : "default"}
                        className={s.hasPin ? "" : "bg-[#ef4444] hover:bg-[#dc2626]"}
                        onClick={() => { setPinDialog({ open: true, user: s }); setNewPin(""); }}
                        data-testid={`btn-set-pin-${s.id}`}
                      >
                        <KeyRound className="h-3.5 w-3.5 mr-1" />
                        {s.hasPin ? "PIN Değiştir" : "PIN Ata"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* PIN Dialog */}
      <Dialog open={!!pinDialog?.open} onOpenChange={() => { setPinDialog(null); setNewPin(""); }}>
        <DialogContent className="max-w-sm" data-testid="dialog-set-pin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-[#ef4444]" />
              PIN {pinDialog?.user?.hasPin ? "Değiştir" : "Ata"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <div className="w-9 h-9 rounded-full bg-background flex items-center justify-center text-sm font-medium">
                {pinDialog?.user?.firstName?.[0]}{pinDialog?.user?.lastName?.[0]}
              </div>
              <div>
                <p className="font-medium text-sm">{pinDialog?.user?.firstName} {pinDialog?.user?.lastName}</p>
                <p className="text-xs text-muted-foreground">{pinDialog?.user?.role}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">4 haneli PIN</p>
              <Input
                type="number"
                inputMode="numeric"
                maxLength={4}
                placeholder="1234"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.slice(0, 4))}
                className="text-center text-2xl font-mono tracking-widest h-14"
                data-testid="input-pin"
              />
              <p className="text-xs text-muted-foreground mt-1.5">Personele güvenli şekilde iletmeyi unutmayın</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPinDialog(null); setNewPin(""); }}>
              İptal
            </Button>
            <Button
              disabled={newPin.length !== 4 || setPinMutation.isPending}
              onClick={() => pinDialog && setPinMutation.mutate({ userId: pinDialog.user.id, pin: newPin })}
              data-testid="btn-confirm-pin"
            >
              {setPinMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              PIN Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
