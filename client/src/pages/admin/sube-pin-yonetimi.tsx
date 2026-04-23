import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, HttpError } from "@/lib/queryClient";
import { KeyRound, Check, AlertTriangle, Loader2, ShieldAlert, ExternalLink } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { isHQRole, type UserRoleType } from "@shared/schema";

const HQ_BRANCH_ID = 23;
const POLICY_DOC_PATH = "/docs/pilot/hq-kiosk-pin-politikasi.md";

type DialogStep = "warning" | "pin";

interface SetPinVars {
  userId: string;
  pin: string;
  force?: boolean;
  reason?: string;
}

type SetPinPayload =
  | { userId: string; pin: string }
  | { userId: string; pin: string; force: true; reason: string };

interface PinDialogState {
  user: any;
  step: DialogStep;
  isHqOverride: boolean;
}

function parseHttpErrorBody(err: unknown): { message?: string; code?: string; targetRole?: string } | null {
  if (!(err instanceof HttpError)) return null;
  const raw = err.message.replace(/^\d+:\s*/, "");
  try {
    return JSON.parse(raw);
  } catch {
    return { message: raw };
  }
}

export default function SubePinYonetimi() {
  const { toast } = useToast();
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [pinDialog, setPinDialog] = useState<PinDialogState | null>(null);
  const [newPin, setNewPin] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

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

  const branchIdNum = useMemo(() => Number(selectedBranch), [selectedBranch]);
  const isHqBranch = branchIdNum === HQ_BRANCH_ID;

  const setPinMutation = useMutation({
    mutationFn: async ({ userId, pin, force, reason }: SetPinVars) => {
      const payload: SetPinPayload = force
        ? { userId, pin, force: true, reason: reason ?? "" }
        : { userId, pin };
      const res = await apiRequest("POST", `/api/branches/${selectedBranch}/kiosk/set-pin`, payload);
      return res.json();
    },
    onSuccess: (_data, vars) => {
      toast({
        title: "PIN ayarlandı",
        description: vars.force ? "Override audit kaydına işlendi." : undefined,
      });
      setPinDialog(null);
      setNewPin("");
      setOverrideReason("");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/branches/kiosk/staff", selectedBranch] });
    },
    onError: (e: unknown) => {
      const body = parseHttpErrorBody(e);
      if (body?.code === "HQ_USER_BRANCH_PIN_BLOCKED") {
        toast({
          title: "HQ kullanıcısı için PIN engellendi",
          description: (
            <div className="space-y-1">
              <p>{body.message ?? "Bu işlem politika gereği engellendi."}</p>
              <a
                href={POLICY_DOC_PATH}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-2"
                data-testid="link-hq-policy-toast"
              >
                HQ Kiosk PIN Politikası
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ),
          variant: "destructive",
        });
        // Akışı warning ekranına geri çek
        if (pinDialog) {
          setPinDialog({ ...pinDialog, step: "warning", isHqOverride: true });
        }
        return;
      }
      const msg = body?.message || (e instanceof Error ? e.message : "PIN kaydedilemedi");
      toast({ title: "Hata", description: msg, variant: "destructive" });
    },
  });

  const staff: any[] = Array.isArray(staffData) ? staffData : (staffData?.staff || []);

  const openPinDialogFor = (user: any) => {
    const targetIsHq = !!user?.role && isHQRole(user.role as UserRoleType);
    const needsHqOverride = targetIsHq && !isHqBranch;
    setPinDialog({
      user,
      step: needsHqOverride ? "warning" : "pin",
      isHqOverride: needsHqOverride,
    });
    setNewPin("");
    setOverrideReason("");
  };

  const closeDialog = () => {
    setPinDialog(null);
    setNewPin("");
    setOverrideReason("");
  };

  const submitPin = () => {
    if (!pinDialog) return;
    setPinMutation.mutate({
      userId: pinDialog.user.id,
      pin: newPin,
      force: pinDialog.isHqOverride || undefined,
      reason: pinDialog.isHqOverride ? overrideReason.trim() : undefined,
    });
  };

  const reasonOk = !pinDialog?.isHqOverride || overrideReason.trim().length >= 10;

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
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span>Personel Listesi</span>
              {staff.length > 0 && (
                <div className="flex gap-2 text-xs font-normal flex-wrap">
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
                {staff.map((s: any) => {
                  const targetIsHq = !!s.role && isHQRole(s.role as UserRoleType);
                  const showHqWarn = targetIsHq && !isHqBranch;
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card flex-wrap"
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
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                        {showHqWarn && (
                          <Badge variant="outline" className="text-amber-600 border-amber-500/40 gap-1" data-testid={`badge-hq-warn-${s.id}`}>
                            <ShieldAlert className="h-3 w-3" />
                            HQ rol
                          </Badge>
                        )}
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
                          onClick={() => openPinDialogFor(s)}
                          data-testid={`btn-set-pin-${s.id}`}
                        >
                          <KeyRound className="h-3.5 w-3.5 mr-1" />
                          {s.hasPin ? "PIN Değiştir" : "PIN Ata"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* PIN Dialog */}
      <Dialog open={!!pinDialog} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-md" data-testid="dialog-set-pin">
          {pinDialog?.step === "warning" ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-amber-600">
                  <ShieldAlert className="h-5 w-5" />
                  HQ Kullanıcısına Şube PIN'i
                </DialogTitle>
                <DialogDescription>
                  Bu işlem politika gereği engellidir. Devam etmek için gerekçe gerekli.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2 text-sm" data-testid="hq-warning-body">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <div className="w-9 h-9 rounded-full bg-background flex items-center justify-center text-sm font-medium">
                    {pinDialog?.user?.firstName?.[0]}{pinDialog?.user?.lastName?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">{pinDialog?.user?.firstName} {pinDialog?.user?.lastName}</p>
                    <p className="text-xs text-muted-foreground">
                      Rol: <span className="font-mono">{pinDialog?.user?.role}</span>
                    </p>
                  </div>
                </div>
                <div className="rounded-md border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2">
                  <p className="font-medium text-amber-700 dark:text-amber-300">
                    HQ rolündeki kullanıcılar için yalnızca Branch 23 (HQ) PIN açılabilir.
                  </p>
                  <p className="text-muted-foreground">
                    İstisnai durumda override yapılabilir. Override işlemi audit kaydına alınır
                    ve gerekçe (en az 10 karakter) zorunludur.
                  </p>
                  <a
                    href={POLICY_DOC_PATH}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2"
                    data-testid="link-hq-policy"
                  >
                    HQ Kiosk PIN Politikası dokümanını aç
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Override gerekçesi</label>
                  <Textarea
                    rows={3}
                    placeholder="Örn: Pilot şube ziyareti için geçici kiosk erişimi (Onay: ...)"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    data-testid="input-override-reason"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {overrideReason.trim().length}/10 karakter
                  </p>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={closeDialog} data-testid="btn-warning-cancel">
                  Vazgeç
                </Button>
                <Button
                  variant="destructive"
                  disabled={overrideReason.trim().length < 10}
                  onClick={() => setPinDialog({ ...pinDialog, step: "pin" })}
                  data-testid="btn-warning-continue"
                >
                  Anladım, devam et
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-[#ef4444]" />
                  PIN {pinDialog?.user?.hasPin ? "Değiştir" : "Ata"}
                </DialogTitle>
                {pinDialog?.isHqOverride && (
                  <DialogDescription className="text-amber-600 dark:text-amber-400">
                    HQ override aktif — bu işlem audit'lenecek.
                  </DialogDescription>
                )}
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
                {pinDialog?.isHqOverride && (
                  <div className="rounded-md border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 p-2 text-xs">
                    <p className="font-medium text-amber-700 dark:text-amber-300 mb-0.5">Gerekçe:</p>
                    <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-override-reason-summary">
                      {overrideReason.trim()}
                    </p>
                  </div>
                )}
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
              <DialogFooter className="gap-2">
                {pinDialog?.isHqOverride && (
                  <Button
                    variant="outline"
                    onClick={() => pinDialog && setPinDialog({ ...pinDialog, step: "warning" })}
                    data-testid="btn-back-warning"
                  >
                    Geri
                  </Button>
                )}
                <Button variant="outline" onClick={closeDialog}>
                  İptal
                </Button>
                <Button
                  disabled={newPin.length !== 4 || setPinMutation.isPending || !reasonOk}
                  onClick={submitPin}
                  data-testid="btn-confirm-pin"
                >
                  {setPinMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  PIN Kaydet
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
