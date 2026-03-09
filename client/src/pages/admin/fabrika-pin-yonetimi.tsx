import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Lock, 
  Plus, 
  RefreshCw,
  Key,
  User,
  CheckCircle,
  XCircle,
  UnlockIcon,
  Trash2
} from "lucide-react";
import { ConfirmDeleteDialog, useConfirmDelete } from "@/components/confirm-delete-dialog";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

interface StaffUser {
  id: number;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
  role: string;
}

interface PinRecord {
  id: number;
  userId: number;
  isActive: boolean;
  pinFailedAttempts: number | null;
  pinLockedUntil: string | null;
  createdAt: string;
  user?: StaffUser;
}

export default function AdminFabrikaPinYonetimi() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const { deleteState, requestDelete, cancelDelete, confirmDelete } = useConfirmDelete();
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const { data: staff = [], isLoading: loadingStaff, isError, refetch } = useQuery<StaffUser[]>({
    queryKey: ['/api/factory/staff'],
  });

  const { data: pins = [], isLoading: loadingPins, refetch: refetchPins } = useQuery<PinRecord[]>({
    queryKey: ['/api/factory/pins'],
  });

  const staffWithPins = staff.map(s => {
    const pinRecord = pins.find(p => p.userId === s.id);
    return { ...s, pinRecord };
  });

  const createPinMutation = useMutation({
    mutationFn: async (data: { userId: number; pin: string }) => {
      const res = await apiRequest('POST', '/api/factory/pins', data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "PIN oluşturuldu" });
      queryClient.invalidateQueries({ queryKey: ['/api/factory/pins'] });
      setCreateDialogOpen(false);
      setSelectedUser(null);
      setNewPin("");
      setConfirmPin("");
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const resetPinMutation = useMutation({
    mutationFn: async (data: { userId: number; pin: string }) => {
      const res = await apiRequest('PATCH', `/api/factory/pins/${data.userId}`, { pin: data.pin });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "PIN sıfırlandı" });
      queryClient.invalidateQueries({ queryKey: ['/api/factory/pins'] });
      setCreateDialogOpen(false);
      setSelectedUser(null);
      setNewPin("");
      setConfirmPin("");
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const unlockMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest('POST', `/api/factory/pins/${userId}/unlock`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Hesap kilidi kaldırıldı" });
      queryClient.invalidateQueries({ queryKey: ['/api/factory/pins'] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const deletePinMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest('DELETE', `/api/factory/pins/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "PIN silindi" });
      queryClient.invalidateQueries({ queryKey: ['/api/factory/pins'] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateOrReset = (user: StaffUser, hasPin: boolean) => {
    setSelectedUser(user);
    setNewPin("");
    setConfirmPin("");
    setCreateDialogOpen(true);
  };

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

    const hasPin = pins.some(p => p.userId === selectedUser.id);
    if (hasPin) {
      resetPinMutation.mutate({ userId: selectedUser.id, pin: newPin });
    } else {
      createPinMutation.mutate({ userId: selectedUser.id, pin: newPin });
    }
  };

  const isLoading = loadingStaff || loadingPins;

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      admin: "Admin",
      ceo: "CEO",
      cgo: "CGO",
      muhasebe_ik: "Muhasebe & İK",
      satinalma: "Satın Alma",
      coach: "Coach",
      marketing: "Marketing",
      trainer: "Trainer (Eğitmen)",
      kalite_kontrol: "Kalite Kontrol",
      fabrika_mudur: "Fabrika Müdürü",
      muhasebe: "Muhasebe",
      teknik: "Teknik",
      destek: "Destek",
      fabrika: "Fabrika",
      yatirimci_hq: "Yatırımcı HQ",
      stajyer: "Stajyer",
      bar_buddy: "Bar Buddy",
      barista: "Barista",
      supervisor_buddy: "Supervisor Buddy",
      supervisor: "Supervisor",
      mudur: "Müdür",
      yatirimci_branch: "Yatırımcı",
      fabrika_operator: "Fabrika Operatör",
      fabrika_sorumlu: "Fabrika Sorumlu",
      fabrika_personel: "Fabrika Personel",
    };
    return roleMap[role] || role;
  };

  
  if (loadingStaff) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Lock className="h-8 w-8 text-amber-500" />
          <div>
            <h1 className="text-2xl font-bold">Fabrika PIN Yönetimi</h1>
            <p className="text-muted-foreground">Personel giriş PIN'lerini yönetin</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
          <RefreshCw className="h-4 w-4 mr-2" />
          Yenile
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fabrika Personeli</CardTitle>
          <CardDescription>{staff.length} personel kayıtlı</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
          ) : staffWithPins.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Personel</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>PIN Durumu</TableHead>
                  <TableHead>Hesap Durumu</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffWithPins.map((user) => {
                  const isLocked = user.pinRecord?.pinLockedUntil && new Date(user.pinRecord.pinLockedUntil) > new Date();
                  
                  return (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.profileImageUrl || undefined} />
                            <AvatarFallback>
                              {user.firstName?.[0]}{user.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.firstName} {user.lastName}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getRoleLabel(user.role)}</Badge>
                      </TableCell>
                      <TableCell>
                        {user.pinRecord ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-green-600">PIN Tanımlı</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span className="text-red-600">PIN Yok</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isLocked ? (
                          <Badge className="bg-red-600">
                            Kilitli
                          </Badge>
                        ) : user.pinRecord?.pinFailedAttempts && user.pinRecord.pinFailedAttempts > 0 ? (
                          <Badge variant="secondary">
                            {user.pinRecord.pinFailedAttempts} başarısız deneme
                          </Badge>
                        ) : (
                          <Badge className="bg-green-600">Aktif</Badge>
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
                            onClick={() => handleCreateOrReset(user, !!user.pinRecord)}
                            data-testid={`button-pin-${user.id}`}
                          >
                            <Key className="h-4 w-4 mr-1" />
                            {user.pinRecord ? "PIN Sıfırla" : "PIN Oluştur"}
                          </Button>
                          {user.pinRecord && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => requestDelete(user.id, `${user.firstName} ${user.lastName}`)}
                              disabled={deletePinMutation.isPending}
                              data-testid={`button-delete-${user.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Fabrika personeli bulunamadı</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedUser && pins.some(p => p.userId === selectedUser.id) ? "PIN Sıfırla" : "PIN Oluştur"}
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
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
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
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="****"
                className="text-center text-2xl tracking-widest"
                data-testid="input-confirm-pin"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                İptal
              </Button>
              <Button 
                onClick={handleSave}
                disabled={createPinMutation.isPending || resetPinMutation.isPending || newPin.length !== 4 || confirmPin.length !== 4}
                className="bg-amber-600 hover:bg-amber-700"
                data-testid="button-save-pin"
              >
                <Key className="h-4 w-4 mr-2" />
                Kaydet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteState.open}
        onOpenChange={(open) => !open && cancelDelete()}
        onConfirm={() => {
          const id = confirmDelete();
          if (id) deletePinMutation.mutate(id as number);
        }}
        title="Silmek istediğinize emin misiniz?"
        description={`"${deleteState.itemName || ''}" kullanıcısının PIN'i silinecektir. Bu işlem geri alınamaz.`}
      />
    </div>
  );
}
