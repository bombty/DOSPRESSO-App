import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
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
import { KeyRound, AlertTriangle, Users, Shield, Loader2 } from "lucide-react";

/**
 * Admin Şifre Yönetimi
 * Şube veya kullanıcı bazlı toplu/tekil şifre sıfırlama
 *
 * Yetki: admin, ceo, cgo, adminhq
 */

const ALLOWED_ROLES = ["admin", "ceo", "cgo", "adminhq"];

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

  // Şube listesi (kullanıcı sayısı dahil)
  const { data: branchData, isLoading: branchesLoading } = useQuery<{ branches: BranchInfo[] }>({
    queryKey: ["/api/admin/branches-for-password-reset"],
    queryFn: async () => {
      const res = await fetch("/api/admin/branches-for-password-reset", { credentials: "include" });
      if (!res.ok) throw new Error("Şube listesi alınamadı");
      return res.json();
    },
    enabled: !!user && ALLOWED_ROLES.includes(user.role),
  });

  // Sıfırlama mutation
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
      toast({
        title: "✅ Şifreler sıfırlandı",
        description: data.message,
      });
      setShowConfirmDialog(false);
      setSelectedBranchId("");
      setConfirmText("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/branches-for-password-reset"] });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
          Şube bazlı veya tekil kullanıcı şifre sıfırlama
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
