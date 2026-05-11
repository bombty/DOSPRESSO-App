import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { KeyRound, AlertTriangle, Users, Shield, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { ROLE_LABELS } from "@/lib/turkish-labels";

/**
 * Admin Şifre Yönetimi
 * - Şube bazlı toplu şifre sıfırlama
 * - Şifre sıfırlama yetkisi olan rolleri yönetme
 *
 * Yetki: admin, ceo, cgo, adminhq
 */

const ALLOWED_ROLES = ["admin", "ceo", "cgo", "adminhq"];

// Seçilebilir tüm roller (kiosk/ghost roller hariç)
const SELECTABLE_ROLES = [
  "admin", "ceo", "cgo", "coach", "trainer",
  "muhasebe_ik", "muhasebe", "satinalma", "marketing",
  "teknik", "destek", "fabrika_mudur", "mudur", "supervisor",
  "kalite_kontrol", "gida_muhendisi",
];

interface BranchInfo {
  id: number;
  name: string;
  user_count: number;
}

export default function AdminSifreYonetimiPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [confirmText, setConfirmText] = useState<string>("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [localRoles, setLocalRoles] = useState<string[] | null>(null);

  // Şube listesi
  const { data: branchData, isLoading: branchesLoading } = useQuery<{ branches: BranchInfo[] }>({
    queryKey: ["/api/admin/branches-for-password-reset"],
    queryFn: async () => {
      const res = await fetch("/api/admin/branches-for-password-reset", { credentials: "include" });
      if (!res.ok) throw new Error("Şube listesi alınamadı");
      return res.json();
    },
    enabled: !!user && ALLOWED_ROLES.includes(user.role),
  });

  // Şifre sıfırlama rolleri
  const { data: rolesData, isLoading: rolesLoading } = useQuery<{ roles: string[] }>({
    queryKey: ["/api/admin/password-reset-roles"],
    queryFn: async () => {
      const res = await fetch("/api/admin/password-reset-roles", { credentials: "include" });
      if (!res.ok) throw new Error("Roller alınamadı");
      return res.json();
    },
    enabled: !!user && ALLOWED_ROLES.includes(user.role),
  });

  const activeRoles: string[] = localRoles ?? rolesData?.roles ?? [];

  // Toplu sıfırlama mutation
  const resetMutation = useMutation({
    mutationFn: async ({ branchId, confirm }: { branchId: number; confirm: string }) => {
      const res = await fetch("/api/admin/reset-branch-passwords", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId, confirmText: confirm }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Sıfırlama başarısız");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Şifreler sıfırlandı", description: data.message });
      setShowConfirmDialog(false);
      setSelectedBranchId("");
      setConfirmText("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/branches-for-password-reset"] });
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  // Rol güncelleme mutation
  const updateRolesMutation = useMutation({
    mutationFn: async (roles: string[]) => {
      return apiRequest("PUT", "/api/admin/password-reset-roles", { roles });
    },
    onSuccess: (data: any) => {
      toast({ title: "Yetkilendirme güncellendi", description: `${data.roles?.length} rol aktif` });
      setLocalRoles(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/password-reset-roles"] });
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const toggleRole = (role: string) => {
    const current = localRoles ?? rolesData?.roles ?? [];
    setLocalRoles(
      current.includes(role) ? current.filter(r => r !== role) : [...current, role]
    );
  };

  const hasUnsavedChanges = localRoles !== null;

  if (authLoading) return <div className="p-6">Yükleniyor...</div>;
  if (!user) return <Redirect to="/login" />;
  if (!ALLOWED_ROLES.includes(user.role)) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">Bu sayfa için yetkiniz bulunmamaktadır.</CardContent>
        </Card>
      </div>
    );
  }

  const branches = branchData?.branches || [];
  const selectedBranch = branches.find(b => String(b.id) === selectedBranchId);
  const canSubmit = selectedBranchId && confirmText === "SIFIRLA";

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Başlık */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <KeyRound className="h-8 w-8" />
          Şifre Yönetimi
        </h1>
        <p className="text-muted-foreground mt-1">
          Şube bazlı şifre sıfırlama ve rol yetkilendirme
        </p>
      </div>

      {/* Bilgi Kutusu */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Nasıl çalışır?</AlertTitle>
        <AlertDescription>
          Şube seçin → Onay metni "SIFIRLA" yazın → Sıfırla butonuna basın.
          Seçilen şubedeki tüm aktif çalışanların şifresi <strong>"0000"</strong> olarak sıfırlanır
          (admin kullanıcısı hariç). Tüm işlemler kayıt altına alınır.
        </AlertDescription>
      </Alert>

      {/* ─── Şifre Sıfırlama Yetkilendirme ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Şifre Sıfırlama Yetkisi
          </CardTitle>
          <CardDescription>
            Aşağıdaki roller personel profilinden şifre sıfırlayabilir.
            Değişiklik sadece server yeniden başlatılana kadar geçerlidir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {rolesLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor...
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {SELECTABLE_ROLES.map(role => {
                const isActive = activeRoles.includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    data-testid={`toggle-role-${role}`}
                    onClick={() => toggleRole(role)}
                    className={[
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover-elevate",
                    ].join(" ")}
                  >
                    {isActive
                      ? <CheckCircle2 className="h-3.5 w-3.5" />
                      : <XCircle className="h-3.5 w-3.5" />}
                    {ROLE_LABELS[role] ?? role}
                  </button>
                );
              })}
            </div>
          )}

          {hasUnsavedChanges && (
            <Alert variant="default" className="border-yellow-500">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="flex items-center justify-between gap-4">
                <span>Kaydedilmemiş değişiklikler var.</span>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLocalRoles(null)}
                  >
                    İptal
                  </Button>
                  <Button
                    size="sm"
                    disabled={updateRolesMutation.isPending || activeRoles.length === 0}
                    onClick={() => updateRolesMutation.mutate(activeRoles)}
                    data-testid="button-save-roles"
                  >
                    {updateRolesMutation.isPending
                      ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Kaydediliyor...</>
                      : "Kaydet"}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <p className="text-xs text-muted-foreground">
            Aktif: {activeRoles.map(r => ROLE_LABELS[r] ?? r).join(", ")}
          </p>
        </CardContent>
      </Card>

      {/* Şube Bazlı Sıfırlama */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Şube Bazlı Toplu Sıfırlama
          </CardTitle>
          <CardDescription>
            Bir şubedeki tüm aktif çalışanların şifresini "0000" olarak sıfırlar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="branch">Şube Seç</Label>
            <Select
              value={selectedBranchId}
              onValueChange={setSelectedBranchId}
              disabled={branchesLoading}
            >
              <SelectTrigger id="branch" data-testid="select-branch">
                <SelectValue placeholder={branchesLoading ? "Yükleniyor..." : "Şube seçin..."} />
              </SelectTrigger>
              <SelectContent>
                {branches.map(b => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                    <Badge variant="secondary" className="ml-2">
                      {b.user_count} kullanıcı
                    </Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedBranch && (
            <Alert variant="default" className="border-yellow-500">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertTitle>Dikkat</AlertTitle>
              <AlertDescription>
                <strong>{selectedBranch.name}</strong> şubesindeki <strong>{selectedBranch.user_count}</strong> aktif
                çalışanın şifresi <strong>"0000"</strong> olarak sıfırlanacak. Bu işlem geri alınamaz.
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={() => setShowConfirmDialog(true)}
            disabled={!selectedBranchId || resetMutation.isPending}
            variant="destructive"
            className="w-full"
            data-testid="button-open-confirm"
          >
            {resetMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sıfırlanıyor...</>
            ) : (
              <><KeyRound className="h-4 w-4 mr-2" /> Şifreleri Sıfırla</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Onay Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Onay Gerekli
            </DialogTitle>
            <DialogDescription>
              <strong>{selectedBranch?.name}</strong> şubesindeki{" "}
              <strong>{selectedBranch?.user_count}</strong> çalışanın şifresi{" "}
              <strong>"0000"</strong> olarak sıfırlanacak.
              <br /><br />
              Onaylamak için aşağıya <strong>SIFIRLA</strong> yazın:
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder="SIFIRLA"
              autoFocus
              data-testid="input-confirm"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                setConfirmText("");
              }}
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              disabled={!canSubmit || resetMutation.isPending}
              onClick={() => {
                if (selectedBranchId && confirmText === "SIFIRLA") {
                  resetMutation.mutate({
                    branchId: parseInt(selectedBranchId, 10),
                    confirm: confirmText,
                  });
                }
              }}
              data-testid="button-confirm-reset"
            >
              {resetMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sıfırlanıyor...</>
              ) : (
                <>Evet, Sıfırla</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
