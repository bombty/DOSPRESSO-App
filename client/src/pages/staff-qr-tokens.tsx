import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { QrCode, Plus, Copy, Trash2, RefreshCw, Users, Star, Eye, Loader2 } from "lucide-react";
import { ConfirmDeleteDialog, useConfirmDelete } from "@/components/confirm-delete-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { QRCodeSVG } from "qrcode.react";
import { ErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

export default function StaffQrTokensPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const { deleteState, requestDelete, cancelDelete, confirmDelete } = useConfirmDelete();
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");

  const { data: tokens, isLoading, isError, refetch } = useQuery({
    queryKey: ["/api/staff-qr-tokens"],
  });

  const { data: branches } = useQuery({
    queryKey: ["/api/branches"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/staff-qr-tokens", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-qr-tokens"] });
      setCreateDialogOpen(false);
      setSelectedBranchId("");
      setSelectedStaffId("");
      toast({ title: "Başarılı", description: "QR token oluşturuldu" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/staff-qr-tokens/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-qr-tokens"] });
      toast({ title: "Başarılı", description: "QR token silindi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!selectedBranchId || !selectedStaffId) {
      toast({ title: "Uyarı", description: "Şube ve personel seçin", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      branchId: parseInt(selectedBranchId),
      staffId: selectedStaffId,
    });
  };

  const copyToClipboard = (token: string) => {
    const url = `${window.location.origin}/personel-degerlendirme/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Kopyalandı", description: "Link panoya kopyalandı" });
  };

  const showQrCode = (token: any) => {
    setSelectedToken(token);
    setQrDialogOpen(true);
  };

  const filteredUsers = selectedBranchId
    ? (users as any[])?.filter((u: any) => u.branchId === parseInt(selectedBranchId) && u.isActive)
    : [];

  
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <QrCode className="h-6 w-6" />
            Personel QR Değerlendirme
          </h1>
          <p className="text-muted-foreground">
            Müşterilerin personeli değerlendirmesi için QR kodlar
          </p>
        </div>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-token">
              <Plus className="mr-2 h-4 w-4" />
              Yeni QR Oluştur
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni QR Token Oluştur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Şube</Label>
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                  <SelectTrigger data-testid="select-branch">
                    <SelectValue placeholder="Şube seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {(branches as any[])?.map((b: any) => (
                      <SelectItem key={b.id} value={b.id.toString()}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Personel</Label>
                <Select value={selectedStaffId} onValueChange={setSelectedStaffId} disabled={!selectedBranchId}>
                  <SelectTrigger data-testid="select-staff">
                    <SelectValue placeholder={selectedBranchId ? "Personel seçin" : "Önce şube seçin"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredUsers?.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.firstName} {u.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={createMutation.isPending}
                data-testid="button-confirm-create"
              >
                {createMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <QrCode className="mr-2 h-4 w-4" />
                )}
                QR Token Oluştur
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <QrCode className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{(tokens as any[])?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Toplam Token</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {(tokens as any[])?.filter((t: any) => t.isActive).length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Aktif Token</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Star className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">
                  {(tokens as any[])?.reduce((sum: number, t: any) => sum + (t.usageCount || 0), 0) || 0}
                </p>
                <p className="text-sm text-muted-foreground">Toplam Kullanim</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Eye className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">
                  {(tokens as any[])?.filter((t: any) => t.usageCount && t.usageCount > 0).length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Kullanilan</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tokens Table */}
      <Card>
        <CardHeader>
          <CardTitle>QR Token Listesi</CardTitle>
          <CardDescription>Personel değerlendirme QR kodları</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (tokens as any[])?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Henüz QR token oluşturulmamış
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Personel</TableHead>
                  <TableHead>Şube</TableHead>
                  <TableHead>Kullanim</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Son Kullanim</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(tokens as any[])?.map((token: any) => (
                  <TableRow key={token.id} data-testid={`row-token-${token.id}`}>
                    <TableCell className="font-medium">
                      {token.staff?.firstName} {token.staff?.lastName}
                    </TableCell>
                    <TableCell>{token.branch?.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{token.usageCount || 0} kez</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={token.isActive ? "default" : "secondary"}>
                        {token.isActive ? "Aktif" : "Pasif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {token.lastUsedAt
                        ? new Date(token.lastUsedAt).toLocaleDateString("tr-TR")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => showQrCode(token)}
                          data-testid={`button-view-qr-${token.id}`}
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => copyToClipboard(token.token)}
                          data-testid={`button-copy-${token.id}`}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="text-destructive"
                          onClick={() => requestDelete(token.id, "")}
                          data-testid={`button-delete-${token.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">
              {selectedToken?.staff?.firstName} {selectedToken?.staff?.lastName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            {selectedToken && (
              <>
                <div className="p-4 bg-white rounded-lg">
                  <QRCodeSVG
                    value={`${window.location.origin}/personel-degerlendirme/${selectedToken.token}`}
                    size={200}
                    level="H"
                  />
                </div>
                <p className="mt-4 text-sm text-muted-foreground text-center">
                  Müşteriler bu QR kodu tarayarak personeli değerlendirebilir
                </p>
                <Button
                  className="mt-4"
                  onClick={() => copyToClipboard(selectedToken.token)}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Linki Kopyala
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteState.open}
        onOpenChange={(open) => !open && cancelDelete()}
        onConfirm={() => {
          const id = confirmDelete();
          if (id) deleteMutation.mutate(id as number);
        }}
        title="Silmek istediğinize emin misiniz?"
        description="Bu QR token silinecektir. Bu işlem geri alınamaz."
      />
    </div>
  );
}
