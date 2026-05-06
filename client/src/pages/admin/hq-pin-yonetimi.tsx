import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Lock,
  RefreshCw,
  Key,
  User,
  CheckCircle,
  XCircle,
  UnlockIcon,
  Shield,
} from "lucide-react";
import { ErrorState } from "../../components/error-state";
import { LoadingState } from "../../components/loading-state";

interface HQUserPinStatus {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  branchId: number | null;
  hasPin: boolean;
  pinIsActive: boolean;
  pinFailedAttempts: number;
  pinLockedUntil: string | null;
  pinCreatedAt: string | null;
}

const HQ_ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  ceo: "CEO",
  cgo: "CGO",
  coach: "Coach",
  trainer: "Trainer",
  muhasebe: "Muhasebe",
  muhasebe_ik: "Muhasebe & İK",
  satinalma: "Satın Alma",
  teknik: "Teknik",
  marketing: "Marketing",
  destek: "Destek",
  kalite_kontrol: "Kalite Kontrol",
  kalite: "Kalite",
};

export default function AdminHqPinYonetimi() {
  const { toast } = useToast();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<HQUserPinStatus | null>(null);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const { data: users = [], isLoading, isError, refetch } = useQuery<HQUserPinStatus[]>({
    queryKey: ["/api/admin/hq-users-pin-status"],
  });

  const resetPinMutation = useMutation({
    mutationFn: async (data: { userId: string; pin: string }) => {
      const res = await apiRequest("POST", `/api/admin/hq-pin-reset/${data.userId}`, { pin: data.pin });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "PIN güncellendi" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hq-users-pin-status"] });
      setResetDialogOpen(false);
      setSelectedUser(null);
      setNewPin("");
      setConfirmPin("");
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const unlockMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", `/api/admin/hq-pin-unlock/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Hesap kilidi kaldırıldı" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hq-users-pin-status"] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!selectedUser) return;
    if (newPin.length !== 4) {
      toast({ title: "Hata", description: "PIN 4 haneli olmalı", variant: "destructive" });
      return;
    }
    if (newPin !== confirmPin) {
      toast({ title: "Hata", description: "PIN'ler eşleşmiyor", variant: "destructive" });
      return;
    }
    resetPinMutation.mutate({ userId: selectedUser.id, pin: newPin });
  };

  const withPin = users.filter(u => u.hasPin).length;
  const withoutPin = users.filter(u => !u.hasPin).length;
  const locked = users.filter(u => u.pinLockedUntil && new Date(u.pinLockedUntil) > new Date()).length;

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold">HQ PIN Yönetimi</h1>
            <p className="text-muted-foreground">Merkez ofis kullanıcıları kiosk giriş PIN'leri</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
          <RefreshCw className="h-4 w-4 mr-2" />
          Yenile
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{withPin}</div>
            <div className="text-sm text-muted-foreground">PIN Tanımlı</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{withoutPin}</div>
            <div className="text-sm text-muted-foreground">PIN Yok</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600">{locked}</div>
            <div className="text-sm text-muted-foreground">Kilitli</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>HQ Kullanıcıları</CardTitle>
          <CardDescription>{users.length} kullanıcı</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>HQ kullanıcısı bulunamadı</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kullanıcı</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>PIN</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const isLocked = user.pinLockedUntil && new Date(user.pinLockedUntil) > new Date();
                  return (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>
                              {user.firstName?.[0]}{user.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.firstName} {user.lastName}</div>
                            <div className="text-xs text-muted-foreground">@{user.username}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" data-testid={`badge-role-${user.id}`}>
                          {HQ_ROLE_LABELS[user.role] || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.hasPin ? (
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-600">Tanımlı</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span className="text-sm text-red-600">Yok</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isLocked ? (
                          <Badge variant="destructive" data-testid={`badge-status-${user.id}`}>Kilitli</Badge>
                        ) : user.pinFailedAttempts > 0 ? (
                          <Badge variant="secondary" data-testid={`badge-status-${user.id}`}>
                            {user.pinFailedAttempts} hatalı deneme
                          </Badge>
                        ) : user.hasPin ? (
                          <Badge className="bg-green-600" data-testid={`badge-status-${user.id}`}>Aktif</Badge>
                        ) : (
                          <Badge variant="outline" data-testid={`badge-status-${user.id}`}>—</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isLocked && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => unlockMutation.mutate(user.id)}
                              disabled={unlockMutation.isPending}
                              data-testid={`button-unlock-${user.id}`}
                            >
                              <UnlockIcon className="h-4 w-4 mr-1" />
                              Kilidi Aç
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setNewPin("");
                              setConfirmPin("");
                              setResetDialogOpen(true);
                            }}
                            data-testid={`button-pin-${user.id}`}
                          >
                            <Key className="h-4 w-4 mr-1" />
                            {user.hasPin ? "PIN Sıfırla" : "PIN Oluştur"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.hasPin ? "PIN Sıfırla" : "PIN Oluştur"}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.firstName} {selectedUser?.lastName} için yeni PIN belirleyin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Yeni PIN (4 haneli)</label>
              <Input
                type="password"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="****"
                className="text-center text-2xl tracking-widest"
                data-testid="input-new-pin"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">PIN Tekrar</label>
              <Input
                type="password"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="****"
                className="text-center text-2xl tracking-widest"
                data-testid="input-confirm-pin"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
                İptal
              </Button>
              <Button
                onClick={handleSave}
                disabled={resetPinMutation.isPending || newPin.length !== 4 || confirmPin.length !== 4}
                data-testid="button-save-pin"
              >
                <Lock className="h-4 w-4 mr-2" />
                Kaydet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
